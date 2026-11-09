import type { GitChangedFile } from "../../git.js";
import {
  buildReviewAbsenceReportV1,
  buildReviewCommandReportV1,
  buildReviewReportV1,
  type FullReviewReportV1,
  type ReviewChangeV1,
  type ReviewCommandReportV1,
} from "./review-command.js";
import type { ReviewExecutionResultV1, ReviewExecutionStatusV1 } from "../engines/review/opencode-review-adapter.js";
import {
  callLocalReviewModelV1,
  localReviewCandidateV1,
  parseReviewFindingsV1,
  type LocalReviewCallResultV1,
  type LocalReviewCallV1,
  type LocalReviewConfigResultV1,
} from "./local-review-provider.js";
import { validateObservationLocationV1 } from "./location-validator.js";
import { currentReviewProviderPolicyV1, decideReviewProviderV1 } from "./review-provider-decision.js";

export const LOCAL_REVIEW_ENGINE_ID = "engine:review-ollama" as const;
export const LOCAL_REVIEW_PROFILE_ID = "profile:local-review" as const;
export const LOCAL_REVIEW_CAPSULE_ID = "capsule:local-review" as const;
const GROUP_ID = "group:working-tree";

/** The author of Ascout's own changes; a provider of the same family is not independent. */
export const LOCAL_REVIEW_AUTHOR_FAMILY = "claude" as const;

export const LOCAL_REVIEW_LIMITS = Object.freeze({
  max_payload_bytes: 120 * 1024,
  max_file_bytes: 1024 * 1024,
  context_lines: 10,
  timeout_ms: 10 * 60 * 1000,
  max_response_bytes: 1024 * 1024,
});

export interface LocalReviewPayloadV1 {
  readonly text: string;
  readonly reviewed_files: readonly string[];
  readonly line_counts: Readonly<Record<string, number>>;
}

function mergeWindows(ranges: readonly (readonly [number, number])[], context: number, lineCount: number): [number, number][] {
  const windows: [number, number][] = [];
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const from = Math.max(1, start - context);
    const to = Math.min(lineCount, end + context);
    const last = windows[windows.length - 1];
    if (last !== undefined && from <= last[1] + 1) {
      last[1] = Math.max(last[1], to);
    } else {
      windows.push([from, to]);
    }
  }
  return windows;
}

/**
 * The text the model reviews: for each changed text file, the changed lines with some context,
 * numbered so the model can point at them. Files that are deleted, binary, unreadable, or past the
 * size budget are left out and stay unreviewed. Every selected secret value is removed, and the
 * closing fence is escaped so file content cannot end the data block.
 */
export function buildLocalReviewPayloadV1(
  changedFiles: readonly GitChangedFile[],
  readText: (path: string, maxBytes: number) => string | null,
  redact: (text: string) => string,
  limits: Pick<typeof LOCAL_REVIEW_LIMITS, "max_payload_bytes" | "max_file_bytes" | "context_lines"> = LOCAL_REVIEW_LIMITS,
): LocalReviewPayloadV1 {
  const sections: string[] = [];
  const reviewed: string[] = [];
  const lineCounts: Record<string, number> = {};
  let bytes = 0;
  for (const file of [...changedFiles].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    if (file.change_kind === "deleted" || file.line_semantics !== "text" || file.changed_new_line_ranges.length === 0) continue;
    const text = readText(file.path, limits.max_file_bytes);
    if (text === null) continue;
    const lines = text.split("\n");
    if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    const width = String(lines.length).length;
    const body: string[] = [`=== FILE: ${file.path} (${file.change_kind}) ===`];
    body.push(`changed lines: ${file.changed_new_line_ranges.map(([start, end]) => (start === end ? `${start}` : `${start}-${end}`)).join(", ")}`);
    for (const [from, to] of mergeWindows(file.changed_new_line_ranges, limits.context_lines, lines.length)) {
      if (body.length > 2) body.push("...");
      for (let line = from; line <= to; line += 1) {
        body.push(`${String(line).padStart(width)}| ${lines[line - 1] ?? ""}`);
      }
    }
    const section = redact(body.join("\n")).replaceAll("</diff>", "<\\/diff>");
    const size = Buffer.byteLength(section, "utf8") + 1;
    if (bytes + size > limits.max_payload_bytes) continue;
    bytes += size;
    sections.push(section);
    reviewed.push(file.path);
    lineCounts[file.path] = lines.length;
  }
  return { text: sections.join("\n"), reviewed_files: reviewed, line_counts: lineCounts };
}

export type LocalReviewOutcomeV1 = "FINDINGS" | "NO_FINDINGS" | "INCOMPLETE";

export interface LocalReviewProviderReportV1 {
  readonly provider_identity: string;
  readonly model: string;
  readonly model_family: string;
  readonly independence: string;
  readonly server_version: string;
  readonly rejected_findings: number;
}

export type LocalReviewCommandReportV1 = FullReviewReportV1 & {
  readonly advisory: true;
  readonly satisfies_human_r1: false;
  readonly outcome: LocalReviewOutcomeV1;
  readonly exit_code: 0 | 1 | 4;
  readonly reason_text: string;
  readonly provider: LocalReviewProviderReportV1;
  readonly comparison: Readonly<{ kind: "working_tree_vs_head"; base_ref: string }>;
  readonly considered: "working_tree_and_index_only";
  readonly changes: readonly ReviewChangeV1[];
};

export type LocalReviewRunResultV1 =
  | { readonly kind: "review"; readonly report: LocalReviewCommandReportV1 }
  | { readonly kind: "not_run"; readonly report: ReviewCommandReportV1 }
  | { readonly kind: "error"; readonly message: string };

export interface LocalReviewRunInputV1 {
  readonly target_id: string;
  readonly head_sha: string;
  readonly config: LocalReviewConfigResultV1;
  readonly changed_files: readonly GitChangedFile[];
  readonly changes: readonly ReviewChangeV1[];
  readonly readText: (path: string, maxBytes: number) => string | null;
  readonly redact: (text: string) => string;
  readonly call?: (call: LocalReviewCallV1) => Promise<LocalReviewCallResultV1>;
}

function notRun(
  input: LocalReviewRunInputV1,
  status: ReviewExecutionStatusV1,
  reasons: readonly string[],
  observedVersion: string | null = null,
): LocalReviewRunResultV1 {
  const files = input.changes.map((change) => change.path).sort();
  const execution: ReviewExecutionResultV1 = {
    schema_version: 1,
    status,
    exit_code: null,
    raw_stdout: null,
    stderr_excerpt: null,
    duration_ms: null,
    timed_out: status === "TIMEOUT",
    reasons: Object.freeze([...reasons]),
    execution_identity: Object.freeze({
      engine_id: LOCAL_REVIEW_ENGINE_ID,
      binary_name: "ollama",
      observed_version: observedVersion,
      resolved_path: "loopback",
      profile_id: LOCAL_REVIEW_PROFILE_ID,
      capsule_id: LOCAL_REVIEW_CAPSULE_ID,
      head_sha: input.head_sha,
      argv: Object.freeze([]),
    }),
  };
  const absence = buildReviewAbsenceReportV1(input.target_id, input.head_sha, execution, [{ group_id: GROUP_ID, files }]);
  return { kind: "not_run", report: buildReviewCommandReportV1(absence, input.changes) };
}

/**
 * Runs one advisory review of the working-tree changes with the founder-authorized local model.
 * Every way it can fail to review leaves the changes unreviewed (exit 4); a config that exists but
 * is malformed is an error (exit 2), because the founder meant to configure something.
 */
export async function runLocalReviewV1(input: LocalReviewRunInputV1): Promise<LocalReviewRunResultV1> {
  const { config } = input;
  if (config.state === "absent") {
    return notRun(input, "UNAVAILABLE", [`no local review provider is configured; the founder authorizes one in ${config.path}`]);
  }
  if (config.state === "invalid") {
    return { kind: "error", message: `The local review provider config at ${config.path} is invalid: ${config.reason}.` };
  }
  const candidate = localReviewCandidateV1(config.config);
  const decision = decideReviewProviderV1(candidate, currentReviewProviderPolicyV1(LOCAL_REVIEW_AUTHOR_FAMILY));
  if (decision.state !== "RUNNABLE_ADVISORY") {
    return notRun(input, "REFUSED", [`the review-provider decision was ${decision.state}: ${decision.reason_codes.join(", ")}`]);
  }
  const payload = buildLocalReviewPayloadV1(input.changed_files, input.readText, input.redact);
  if (payload.reviewed_files.length === 0) {
    return notRun(input, "NOT_QUALIFIED", ["no changed file has text lines the local model can review"]);
  }
  const call = input.call ?? callLocalReviewModelV1;
  const reply = await call({
    endpoint: config.config.endpoint,
    model: config.config.model,
    diff: payload.text,
    timeoutMs: LOCAL_REVIEW_LIMITS.timeout_ms,
    maxResponseBytes: LOCAL_REVIEW_LIMITS.max_response_bytes,
  });
  if (!reply.ok) {
    const status: ReviewExecutionStatusV1 = reply.reason === "the model did not answer in time" ? "TIMEOUT" : "ERROR";
    return notRun(input, status, [reply.reason]);
  }
  const binding = {
    engine_id: LOCAL_REVIEW_ENGINE_ID,
    binary_name: "ollama",
    observed_version: reply.version,
    profile_id: LOCAL_REVIEW_PROFILE_ID,
    capsule_id: LOCAL_REVIEW_CAPSULE_ID,
    head_sha: input.head_sha,
  };
  const parsed = parseReviewFindingsV1(reply.content, binding);
  if (!parsed.well_formed) {
    return notRun(input, "ERROR", ["the local model's reply was not the expected findings object"], reply.version);
  }
  const context = { expected_head_sha: input.head_sha, known_files: payload.reviewed_files, file_line_counts: payload.line_counts };
  const review = buildReviewReportV1({
    target_id: input.target_id,
    head_sha: input.head_sha,
    profile_id: LOCAL_REVIEW_PROFILE_ID,
    capsule_id: LOCAL_REVIEW_CAPSULE_ID,
    groups: [{ group_id: GROUP_ID, files: input.changes.map((change) => change.path).sort() }],
    reviewed_files: payload.reviewed_files,
    entries: parsed.observations.map((observation) => ({ observation, validation: validateObservationLocationV1(observation, context) })),
  });
  const outcome: LocalReviewOutcomeV1 = review.counts.promotable > 0 ? "FINDINGS" : review.counts.complete ? "NO_FINDINGS" : "INCOMPLETE";
  const exit_code = outcome === "FINDINGS" ? 1 : outcome === "NO_FINDINGS" ? 0 : 4;
  const reason_text = {
    FINDINGS: "The local model reported findings. They are advisory and untrusted; check each one.",
    NO_FINDINGS: "The local model reported nothing it could place in the changed lines. That is advice, not a clean review.",
    INCOMPLETE: "The local model reviewed only part of the change, and the rest stays unreviewed.",
  }[outcome];
  return {
    kind: "review",
    report: Object.freeze({
      ...review,
      advisory: true as const,
      satisfies_human_r1: false as const,
      outcome,
      exit_code,
      reason_text,
      provider: Object.freeze({
        provider_identity: candidate.provider_identity,
        model: config.config.model,
        model_family: config.config.model_family,
        independence: decision.independence,
        server_version: reply.version,
        rejected_findings: parsed.rejected,
      }),
      comparison: Object.freeze({ kind: "working_tree_vs_head" as const, base_ref: input.head_sha }),
      considered: "working_tree_and_index_only" as const,
      changes: Object.freeze(input.changes.map((change) => Object.freeze({ ...change }))),
    }),
  };
}
