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
  localReviewCandidateV1,
  parseReviewFindingsV1,
  type LocalReviewCallResultV1,
  type LocalReviewCallV1,
  type LocalReviewConfigResultV1,
} from "./local-review-provider.js";
import { validateObservationLocationV1, type LocationValidationV1 } from "./location-validator.js";
import type { RawReviewObservationV1 } from "./raw-observation.js";
import { currentReviewProviderPolicyV1, decideReviewProviderV1 } from "./review-provider-decision.js";
import { providerForConfigV1, type ReviewPayloadV1, type ReviewProviderV2 } from "./review-provider.js";

export const LOCAL_REVIEW_ENGINE_ID = "engine:review-ollama" as const;
export const OPENAI_COMPATIBLE_REVIEW_ENGINE_ID = "engine:review-openai-compatible" as const;

/** The engine a report names: the provider the config chose, or Ollama when nothing is configured. */
function engineIdentityV1(config: LocalReviewConfigResultV1): { engine_id: string; binary_name: string } {
  return config.state === "loaded" && config.config.provider === "openai-compatible"
    ? { engine_id: OPENAI_COMPATIBLE_REVIEW_ENGINE_ID, binary_name: "openai-compatible" }
    : { engine_id: LOCAL_REVIEW_ENGINE_ID, binary_name: "ollama" };
}
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

export type LocalReviewPayloadV1 = ReviewPayloadV1;

/**
 * File names never sent to any model, whatever the operator configures: environment files, keys,
 * certificates, keystores, and credential stores. Matched case-insensitively on the file name, and
 * on every folder name for folders that hold secrets.
 */
const NEVER_SENT = /^(?:\.env.*|.*\.env|.*\.pem|.*\.key|id_rsa.*|id_dsa.*|id_ed25519.*|id_ecdsa.*|.*\.p12|.*\.pfx|.*\.jks|.*\.keystore|.*\.ppk|\.npmrc|\.pypirc|\.netrc|\.git-credentials|secrets?\..*|credentials.*)$/iu;
const NEVER_SENT_FOLDER = /^(?:\.ssh|\.aws|\.gnupg|credentials|secrets)$/iu;

/** True for a path whose file name, or any folder on the way to it, must never reach a model. */
export function isNeverSentPathV1(path: string): boolean {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return NEVER_SENT.test(name) || path.split("/").slice(0, -1).some((folder) => NEVER_SENT_FOLDER.test(folder));
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
 * numbered so the model can point at them. Files that are deleted, binary, unreadable, untracked,
 * secret-shaped by name, or past the size budget are left out and stay unreviewed. Every selected secret value is removed, and the
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
    // A file git doesn't track may be a local secret nobody meant to share, such as an un-ignored .env.
    if (file.change_kind === "untracked" || isNeverSentPathV1(file.path)) continue;
    const text = readText(file.path, limits.max_file_bytes);
    if (text === null) continue;
    const lines = text.split("\n");
    if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    const width = String(lines.length).length;
    // A path may hold control characters; keep it to one line so it can't fake a FILE header.
    const shownPath = file.path.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/gu, "?");
    const body: string[] = [`=== FILE: ${shownPath} (${file.change_kind}) ===`];
    body.push(`changed lines: ${file.changed_new_line_ranges.map(([start, end]) => (start === end ? `${start}` : `${start}-${end}`)).join(", ")}`);
    for (const [from, to] of mergeWindows(file.changed_new_line_ranges, limits.context_lines, lines.length)) {
      if (body.length > 2) body.push("...");
      for (let line = from; line <= to; line += 1) {
        body.push(`${String(line).padStart(width)}| ${lines[line - 1] ?? ""}`);
      }
    }
    // Escape any closing tag of the data fence, in any letter case or spacing.
    const section = redact(body.join("\n")).replace(/<\s*\/\s*diff\s*>/giu, "<\\/diff>");
    const size = Buffer.byteLength(section, "utf8") + 1;
    if (bytes + size > limits.max_payload_bytes) continue;
    bytes += size;
    sections.push(section);
    reviewed.push(file.path);
    lineCounts[file.path] = lines.length;
  }
  return { text: sections.join("\n"), reviewed_files: reviewed, line_counts: lineCounts };
}

/**
 * A finding counts only if it names a start line inside one of its file's changed line ranges.
 * Anything else, such as no line or an untouched line, can't be promoted.
 */
export function findingOnChangedLinesV1(
  observation: RawReviewObservationV1,
  validation: LocationValidationV1,
  changedRanges: ReadonlyMap<string, readonly (readonly [number, number])[]>,
): LocationValidationV1 {
  if (validation.state !== "VALID" || observation.location_hint === null) return validation;
  const { path, start_line, end_line } = observation.location_hint;
  const end = end_line ?? start_line;
  const ranges = changedRanges.get(path) ?? [];
  if (start_line !== null && end !== null && ranges.some(([from, to]) => start_line <= to && end >= from)) return validation;
  return { ...validation, state: "LINE_OUT_OF_RANGE", reasons: Object.freeze(["finding is not on a changed line"]) };
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
  readonly exit_code: 1 | 4;
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
  /** Tests only: replaces the model call behind the configured provider. */
  readonly call?: (call: LocalReviewCallV1) => Promise<LocalReviewCallResultV1>;
  /** Tests only: replaces the provider built from the config. */
  readonly provider?: ReviewProviderV2;
  readonly signal?: AbortSignal;
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
      ...engineIdentityV1(input.config),
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
  const provider = input.provider ?? providerForConfigV1(config.config, input.call);
  // The one egress gate: nothing in E10a may leave loopback. Remote providers wait for E10c.
  if (provider.egress !== "NONE") {
    return notRun(input, "REFUSED", ["the review provider is not on loopback, and sending source off this machine is not allowed"]);
  }
  const reply = await provider.review(
    payload,
    { timeoutMs: LOCAL_REVIEW_LIMITS.timeout_ms, maxResponseBytes: LOCAL_REVIEW_LIMITS.max_response_bytes },
    input.signal,
  );
  if (!reply.ok) {
    const status: ReviewExecutionStatusV1 = reply.reason === "the model did not answer in time" ? "TIMEOUT" : "ERROR";
    return notRun(input, status, [reply.reason]);
  }
  const binding = {
    ...engineIdentityV1(config),
    observed_version: reply.version,
    profile_id: LOCAL_REVIEW_PROFILE_ID,
    capsule_id: LOCAL_REVIEW_CAPSULE_ID,
    head_sha: input.head_sha,
  };
  // A model can echo a secret back; remove every selected value before anything is reported.
  const parsed = parseReviewFindingsV1(reply.content, binding, input.redact);
  if (!parsed.well_formed) {
    return notRun(input, "ERROR", ["the local model's reply was not the expected findings object"], reply.version);
  }
  const context = { expected_head_sha: input.head_sha, known_files: payload.reviewed_files, file_line_counts: payload.line_counts };
  const changedRanges = new Map(input.changed_files.map((file) => [file.path, file.changed_new_line_ranges]));
  const review = buildReviewReportV1({
    target_id: input.target_id,
    head_sha: input.head_sha,
    profile_id: LOCAL_REVIEW_PROFILE_ID,
    capsule_id: LOCAL_REVIEW_CAPSULE_ID,
    groups: [{ group_id: GROUP_ID, files: input.changes.map((change) => change.path).sort() }],
    reviewed_files: payload.reviewed_files,
    entries: parsed.observations.map((observation) => ({ observation, validation: findingOnChangedLinesV1(observation, validateObservationLocationV1(observation, context), changedRanges) })),
  });
  const outcome: LocalReviewOutcomeV1 = review.counts.promotable > 0 ? "FINDINGS" : review.counts.complete ? "NO_FINDINGS" : "INCOMPLETE";
  // A model's silence is advice, never a completed review, so it doesn't exit 0 (A07).
  const exit_code = outcome === "FINDINGS" ? 1 : 4;
  const reason_text = {
    FINDINGS: "The local model reported findings. They are advisory and untrusted; check each one.",
    NO_FINDINGS: "The local model reported nothing it could place on the changed lines. That is advice, not a clean review, so the change still counts as unreviewed.",
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
