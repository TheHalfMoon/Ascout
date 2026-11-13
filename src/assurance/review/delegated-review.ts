import { createHash } from "node:crypto";
import { closeSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import type { GitChangedFile } from "../../git.js";
import { REVIEW_INSTRUCTIONS, parseReviewFindingsV1 } from "./local-review-provider.js";
import {
  buildLocalReviewPayloadV1,
  findingOnChangedLinesV1,
  LOCAL_REVIEW_CAPSULE_ID,
  LOCAL_REVIEW_PROFILE_ID,
  type LocalReviewCommandReportV1,
  type LocalReviewOutcomeV1,
} from "./local-review-run.js";
import { validateObservationLocationV1 } from "./location-validator.js";
import { buildReviewReportV1, type ReviewChangeV1 } from "./review-command.js";

/**
 * Delegated review (E10d): Ascout hands the review task to the operator's own agent and checks what
 * comes back. Ascout makes no network call in this mode. The task digest proves which task a findings
 * file answers, not who wrote it, so the model named in a findings file is asserted and unverified.
 */
export const DELEGATED_TASK_SCHEMA = "ascout.review-task/v1" as const;
export const DELEGATED_FINDINGS_SCHEMA = "ascout.review-findings/v1" as const;
export const DELEGATED_REVIEW_ENGINE_ID = "engine:review-delegated" as const;
export const DELEGATED_LIMITS = Object.freeze({ max_findings_bytes: 1024 * 1024, max_findings: 200 });

const SHA256 = /^[0-9a-f]{64}$/u;
const GROUP_ID = "group:working-tree";
const FINDINGS_KEYS = new Set(["schema", "task_sha256", "model", "model_family", "findings"]);
const FINDING_KEYS = new Set(["path", "start_line", "end_line", "severity", "category", "message"]);

export interface DelegatedTaskV1 {
  readonly schema: typeof DELEGATED_TASK_SCHEMA;
  readonly task_sha256: string;
  readonly repository_id: string;
  readonly head_sha: string;
  readonly tree_digest: string;
  readonly advisory: true;
  readonly satisfies_human_r1: false;
  readonly instructions: string;
  readonly reply_with: string;
  readonly reviewed_files: readonly string[];
  readonly changed_lines: Readonly<Record<string, readonly (readonly [number, number])[]>>;
  readonly line_counts: Readonly<Record<string, number>>;
  readonly payload: string;
}

export interface DelegatedSourceV1 {
  readonly repository_id: string;
  readonly head_sha: string;
  readonly tree_digest: string;
  readonly changed_files: readonly GitChangedFile[];
  readonly readText: (path: string, maxBytes: number) => string | null;
  readonly redact: (text: string) => string;
}

/** The digest of everything that defines a task; recomputed from the tree, never read from a file. */
function taskDigestV1(head: string, tree: string, files: readonly string[], payload: string): string {
  return createHash("sha256").update(JSON.stringify([DELEGATED_TASK_SCHEMA, head, tree, files, payload]), "utf8").digest("hex");
}

/** The task for the current source, or null when no changed file has text lines to review. */
export function buildDelegatedTaskV1(source: DelegatedSourceV1): DelegatedTaskV1 | null {
  const payload = buildLocalReviewPayloadV1(source.changed_files, source.readText, source.redact);
  if (payload.reviewed_files.length === 0) return null;
  const reviewed = new Set(payload.reviewed_files);
  const changedLines: Record<string, readonly (readonly [number, number])[]> = {};
  for (const file of source.changed_files) {
    if (reviewed.has(file.path)) changedLines[file.path] = file.changed_new_line_ranges;
  }
  return Object.freeze({
    schema: DELEGATED_TASK_SCHEMA,
    task_sha256: taskDigestV1(source.head_sha, source.tree_digest, payload.reviewed_files, payload.text),
    repository_id: source.repository_id,
    head_sha: source.head_sha,
    tree_digest: source.tree_digest,
    advisory: true as const,
    satisfies_human_r1: false as const,
    instructions: REVIEW_INSTRUCTIONS,
    reply_with: `Write a JSON file: {"schema":"${DELEGATED_FINDINGS_SCHEMA}","task_sha256":"<this task's task_sha256>","model":"<model name>","model_family":"<family>","findings":[...]}, with findings in the shape the instructions give. Then run ascout review --ingest <that file>.`,
    reviewed_files: Object.freeze([...payload.reviewed_files]),
    changed_lines: Object.freeze(changedLines),
    line_counts: Object.freeze({ ...payload.line_counts }),
    payload: payload.text,
  });
}

/** Path comparison follows the platform: Windows and macOS file systems ignore case. */
function samePathKey(path: string): string {
  return process.platform === "win32" || process.platform === "darwin" ? path.toLowerCase() : path;
}

/**
 * An export or findings path must be outside the repository: inside, it could change the source
 * fingerprint, be committed, or be written by the code under review. The nearest existing ancestor is
 * resolved, so a link inside the repository can't hide the real location.
 */
export function assertOutsideRepositoryV1(repositoryRoot: string, path: string, what: string): string {
  const absolute = resolve(path);
  let existing = absolute;
  const rest: string[] = [];
  for (;;) {
    try {
      existing = realpathSync.native(existing);
      break;
    } catch {
      const parent = dirname(existing);
      if (parent === existing) throw new Error(`the ${what} path can't be resolved`);
      rest.unshift(existing.slice(parent.length).replace(/^[\\/]/u, ""));
      existing = parent;
    }
  }
  const real = rest.length === 0 ? existing : join(existing, ...rest);
  const root = realpathSync.native(repositoryRoot);
  const fromRoot = relative(samePathKey(root), samePathKey(real));
  if (fromRoot === "" || (!fromRoot.startsWith("..") && !isAbsolute(fromRoot))) {
    throw new Error(`the ${what} path must be outside the repository`);
  }
  return real;
}

/** Where an export is recorded, so ingest can tell source drift from a findings file for another task. */
function exportRecordPath(repositoryRoot: string, taskSha: string): string {
  return join(repositoryRoot, ".ascout", "review-tasks", `${taskSha}.json`);
}

function assertPlainDirectory(path: string): void {
  try {
    const stat = lstatSync(path);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`${path} is not a plain folder`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

/**
 * Writes the task to a new owner-only file outside the repository, and records the export under
 * .ascout/ (which the source fingerprint leaves out). An existing file is never overwritten.
 */
export function exportDelegatedTaskV1(repositoryRoot: string, path: string, task: DelegatedTaskV1): string {
  const target = assertOutsideRepositoryV1(repositoryRoot, path, "export");
  const ascout = join(repositoryRoot, ".ascout");
  const records = join(ascout, "review-tasks");
  assertPlainDirectory(ascout);
  assertPlainDirectory(records);
  mkdirSync(records, { recursive: true });
  writeFileSync(target, `${JSON.stringify(task, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  writeFileSync(
    exportRecordPath(repositoryRoot, task.task_sha256),
    `${JSON.stringify({ task_sha256: task.task_sha256, head_sha: task.head_sha, tree_digest: task.tree_digest })}\n`,
  );
  return target;
}

export type DelegatedIngestResultV1 =
  | { readonly kind: "review"; readonly report: LocalReviewCommandReportV1 & { readonly delegated: DelegatedProvenanceV1 } }
  | { readonly kind: "drift"; readonly exported: { readonly head_sha: string; readonly tree_digest: string } }
  | { readonly kind: "error"; readonly message: string };

export interface DelegatedProvenanceV1 {
  readonly task_sha256: string;
  readonly model_identity: "asserted_unverified";
  readonly network: "none";
}

interface ParsedFindingsFileV1 {
  readonly task_sha256: string;
  readonly model: string;
  readonly model_family: string;
  readonly findings: readonly Record<string, unknown>[];
}

function plainString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/u.test(value);
}

/** A repository-relative path in the export's form: forward slashes, no "..", no root or drive. */
function safeRelativePath(path: string): boolean {
  if (path.includes("\\") || path.startsWith("/") || /^[A-Za-z]:/u.test(path)) return false;
  return path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

/** Reads and strictly checks a findings file. Every problem refuses the whole file. */
export function readDelegatedFindingsV1(repositoryRoot: string, path: string): ParsedFindingsFileV1 {
  const target = assertOutsideRepositoryV1(repositoryRoot, path, "findings");
  const before = lstatSync(target, { bigint: true });
  if (!before.isFile()) throw new Error("the findings file is not a regular file");
  if (before.size > BigInt(DELEGATED_LIMITS.max_findings_bytes)) throw new Error("the findings file is larger than 1 MiB");
  const descriptor = openSync(target, "r");
  let text: string;
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino || opened.size > BigInt(DELEGATED_LIMITS.max_findings_bytes)) {
      throw new Error("the findings file changed while it was being read");
    }
    text = readFileSync(descriptor, "utf8");
  } finally {
    closeSync(descriptor);
  }
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new Error("the findings file is not valid JSON");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("the findings file is not a JSON object");
  const file = value as Record<string, unknown>;
  for (const key of Object.keys(file)) {
    if (!FINDINGS_KEYS.has(key)) throw new Error(`the findings file has an unknown key: ${JSON.stringify(key.slice(0, 40))}`);
  }
  if (file.schema !== DELEGATED_FINDINGS_SCHEMA) throw new Error(`the findings file's schema must be ${DELEGATED_FINDINGS_SCHEMA}`);
  if (typeof file.task_sha256 !== "string" || !SHA256.test(file.task_sha256)) throw new Error("the findings file's task_sha256 is not a SHA-256");
  if (!plainString(file.model, 100) || !plainString(file.model_family, 50)) throw new Error("the findings file must name its model and model_family");
  if (!Array.isArray(file.findings)) throw new Error("the findings file's findings must be a list");
  if (file.findings.length > DELEGATED_LIMITS.max_findings) throw new Error(`the findings file has more than ${DELEGATED_LIMITS.max_findings} findings`);
  for (const finding of file.findings as unknown[]) {
    if (typeof finding !== "object" || finding === null || Array.isArray(finding)) throw new Error("a finding is not a JSON object");
    for (const key of Object.keys(finding)) {
      if (!FINDING_KEYS.has(key)) throw new Error(`a finding has an unknown key: ${JSON.stringify(key.slice(0, 40))}`);
    }
    const findingPath = (finding as Record<string, unknown>).path;
    if (findingPath !== undefined && (typeof findingPath !== "string" || !safeRelativePath(findingPath))) {
      throw new Error("a finding's path is not a plain repository-relative path");
    }
  }
  return { task_sha256: file.task_sha256, model: file.model, model_family: file.model_family, findings: file.findings as Record<string, unknown>[] };
}

function readExportRecord(repositoryRoot: string, taskSha: string): { readonly tree_digest: string; readonly head_sha: string } | null {
  try {
    const record = JSON.parse(readFileSync(exportRecordPath(repositoryRoot, taskSha), "utf8")) as { tree_digest?: unknown; head_sha?: unknown };
    return typeof record.tree_digest === "string" && typeof record.head_sha === "string" ? { tree_digest: record.tree_digest, head_sha: record.head_sha } : null;
  } catch {
    return null;
  }
}

/**
 * Checks a findings file against the task the current source defines, and reports it under the same
 * truth rules as any model review: findings on changed lines exit 1, anything else exits 4.
 */
export function ingestDelegatedFindingsV1(input: {
  readonly repositoryRoot: string;
  readonly path: string;
  readonly source: DelegatedSourceV1;
  readonly target_id: string;
  readonly changes: readonly ReviewChangeV1[];
}): DelegatedIngestResultV1 {
  let file: ParsedFindingsFileV1;
  try {
    file = readDelegatedFindingsV1(input.repositoryRoot, input.path);
  } catch (error) {
    return { kind: "error", message: `ascout review --ingest: ${(error as Error).message}` };
  }
  const task = buildDelegatedTaskV1(input.source);
  if (task === null || task.task_sha256 !== file.task_sha256) {
    const record = readExportRecord(input.repositoryRoot, file.task_sha256);
    if (record !== null && (record.tree_digest !== input.source.tree_digest || record.head_sha !== input.source.head_sha)) {
      // The source changed since this task was exported, so the findings answer a different source.
      return { kind: "drift", exported: record };
    }
    return { kind: "error", message: "ascout review --ingest: the findings file answers a different review task than the current source defines" };
  }
  const reviewed = new Set(task.reviewed_files);
  if (file.findings.some((finding) => typeof finding.path === "string" && !reviewed.has(finding.path))) {
    return { kind: "error", message: "ascout review --ingest: a finding names a file that was not in the exported task" };
  }
  const binding = {
    engine_id: DELEGATED_REVIEW_ENGINE_ID,
    binary_name: "delegated",
    observed_version: "unknown",
    profile_id: LOCAL_REVIEW_PROFILE_ID,
    capsule_id: LOCAL_REVIEW_CAPSULE_ID,
    head_sha: task.head_sha,
  };
  const parsed = parseReviewFindingsV1(JSON.stringify({ findings: file.findings }), binding, input.source.redact);
  const context = { expected_head_sha: task.head_sha, known_files: task.reviewed_files, file_line_counts: task.line_counts };
  const changedRanges = new Map(Object.entries(task.changed_lines));
  const review = buildReviewReportV1({
    target_id: input.target_id,
    head_sha: task.head_sha,
    profile_id: LOCAL_REVIEW_PROFILE_ID,
    capsule_id: LOCAL_REVIEW_CAPSULE_ID,
    groups: [{ group_id: GROUP_ID, files: input.changes.map((change) => change.path).sort() }],
    reviewed_files: task.reviewed_files,
    entries: parsed.observations.map((observation) => ({
      observation,
      validation: findingOnChangedLinesV1(observation, validateObservationLocationV1(observation, context), changedRanges),
    })),
  });
  const outcome: LocalReviewOutcomeV1 = review.counts.promotable > 0 ? "FINDINGS" : review.counts.complete ? "NO_FINDINGS" : "INCOMPLETE";
  const exit_code = outcome === "FINDINGS" ? 1 : 4;
  const reason_text = {
    FINDINGS: "The delegated reviewer reported findings. They are advisory and untrusted, and the model that wrote them is asserted, not verified; check each one.",
    NO_FINDINGS: "The delegated reviewer reported nothing it could place on the changed lines. That is advice, not a clean review, so the change still counts as unreviewed.",
    INCOMPLETE: "The delegated reviewer covered only part of the change, and the rest stays unreviewed.",
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
        provider_identity: `delegated:${file.model}`,
        model: file.model,
        model_family: file.model_family,
        independence: "ASSERTED_UNVERIFIED",
        server_version: "unknown",
        rejected_findings: parsed.rejected,
      }),
      comparison: Object.freeze({ kind: "working_tree_vs_head" as const, base_ref: task.head_sha }),
      considered: "working_tree_and_index_only" as const,
      changes: Object.freeze(input.changes.map((change) => Object.freeze({ ...change }))),
      delegated: Object.freeze({ task_sha256: task.task_sha256, model_identity: "asserted_unverified" as const, network: "none" as const }),
    }),
  };
}
