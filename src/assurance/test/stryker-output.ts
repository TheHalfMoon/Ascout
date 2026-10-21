import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";
import { normalizeExternalMutationOutputV1, type NormalizedMutationObservationV1 } from "./mutation-adapter.js";

export const STRYKER_OUTPUT_LIMITS = Object.freeze({ bytes: 2 * 1024 * 1024, files: 256, mutants: 10_000, path: 300, id: 128, reason: 4096, depth: 128 });
export const STRYKER_MUTANT_STATUSES = ["Killed", "Survived", "Timeout", "NoCoverage", "CompileError", "RuntimeError", "Ignored", "Pending"] as const;
export type StrykerMutantStatusV1 = (typeof STRYKER_MUTANT_STATUSES)[number];
export interface StrykerSourceBindingV1 {
  readonly source_identity: string;
  readonly head_sha: string;
  readonly attempt_id: string;
}
export interface StrykerOutputInputV1 {
  readonly bytes: Uint8Array;
  readonly expected: StrykerSourceBindingV1 & { readonly report_sha256: string };
  readonly observed: StrykerSourceBindingV1;
  readonly complete: boolean;
  readonly process_exit_code: number | null;
}
export interface StrykerMutantObservationV1 {
  readonly mutant_id: string;
  readonly file_path: string;
  readonly producer_id: string;
  readonly status: StrykerMutantStatusV1;
  readonly status_reason: string | null;
}
export interface StrykerOutputObservationV1 {
  readonly attempt_id: string;
  readonly generated_count: number;
  readonly observation: NormalizedMutationObservationV1;
  readonly mutants: readonly StrykerMutantObservationV1[];
  readonly status_counts: Readonly<Record<StrykerMutantStatusV1, number>>;
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(field + " must be an object");
  }
  return value as Record<string, unknown>;
}

function identifier(value: unknown, field: string, max: number): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > max || !/^[A-Za-z0-9._:-]+$/u.test(value)) {
    throw new TypeError(field + " must be a bounded identifier");
  }
}

// Validate grammar before token discovery: malformed unterminated strings can
// otherwise make an unanchored token regex repeatedly scan the same suffixes.
// Retain duplicate-key checks because JSON.parse silently overwrites those keys.
function parseReport(text: string): unknown {
  const parsed: unknown = JSON.parse(text);
  const stack: ({ keys: Set<string>; needsKey: boolean } | null)[] = [];
  for (const token of text.matchAll(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\]:,]/gu)) {
    const value = token[0];
    if (value === "{" || value === "[") {
      stack.push(value === "{" ? { keys: new Set(), needsKey: true } : null);
      if (stack.length > STRYKER_OUTPUT_LIMITS.depth) throw new TypeError("report depth limit exceeded");
    } else if (value === "}" || value === "]") {
      stack.pop();
    } else {
      const current = stack[stack.length - 1];
      if (current && value === ",") current.needsKey = true;
      if (current?.needsKey && value.startsWith('"')) {
        const key: unknown = JSON.parse(value);
        if (typeof key !== "string") throw new TypeError("invalid JSON key");
        if (current.keys.has(key)) throw new TypeError("duplicate JSON key");
        current.keys.add(key);
        current.needsKey = false;
      }
    }
  }
  return parsed;
}

function requirePath(path: string): void {
  if (path.length === 0 || path.length > STRYKER_OUTPUT_LIMITS.path ||
      /[\u0000-\u0020\u007f\\:%?#<>"|*]/u.test(path) || path.startsWith("/") ||
      path.split("/").some((segment) => segment === "" || segment === "." || segment === ".." || segment.endsWith(".") || segment.endsWith(" ") || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(segment))) {
    throw new TypeError("file path must use an original safe repository-relative spelling");
  }
}

export function translateStrykerOutputV1(input: StrykerOutputInputV1): StrykerOutputObservationV1 {
  if (!(input.bytes instanceof Uint8Array) || input.bytes.byteLength === 0 || input.bytes.byteLength > STRYKER_OUTPUT_LIMITS.bytes) {
    throw new TypeError("report byte limit exceeded or report empty");
  }
  // Copy once so the hash and parsed bytes cannot refer to different snapshots.
  const bytes = Uint8Array.from(input.bytes);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== input.expected.report_sha256) throw new TypeError("report digest mismatch");
  for (const field of ["source_identity", "head_sha", "attempt_id"] as const) {
    if (input.expected[field] !== input.observed[field]) throw new TypeError("source/attempt binding mismatch");
  }
  identifier(input.expected.attempt_id, "attempt binding", 128);
  if (typeof input.complete !== "boolean" ||
      (input.process_exit_code !== null && (!Number.isSafeInteger(input.process_exit_code) || input.process_exit_code < 0))) {
    throw new TypeError("completion and process exit must be explicit");
  }
  const root = object(parseReport(new TextDecoder("utf-8", { fatal: true }).decode(bytes)), "report");
  const framework = object(root.framework, "framework");
  if (root.schemaVersion !== "1.0" || framework.name !== "StrykerJS" || framework.version !== "10.0.0") {
    throw new TypeError("unsupported Stryker schema/version");
  }
  const files = Object.entries(object(root.files, "files"));
  if (files.length > STRYKER_OUTPUT_LIMITS.files) throw new TypeError("file count limit exceeded");
  const mutants: StrykerMutantObservationV1[] = [];
  const producerIds = new Set<string>();
  const counts: Record<StrykerMutantStatusV1, number> = { Killed: 0, Survived: 0, Timeout: 0, NoCoverage: 0, CompileError: 0, RuntimeError: 0, Ignored: 0, Pending: 0 };
  for (const [path, rawFile] of files) {
    requirePath(path);
    const file = object(rawFile, "file");
    if (!Array.isArray(file.mutants)) throw new TypeError("mutants must be an array");
    if (mutants.length + file.mutants.length > STRYKER_OUTPUT_LIMITS.mutants) throw new TypeError("mutant count limit exceeded");
    for (const rawMutant of file.mutants) {
      const mutant = object(rawMutant, "mutant");
      identifier(mutant.id, "mutant id", STRYKER_OUTPUT_LIMITS.id);
      if (producerIds.has(mutant.id)) throw new TypeError("duplicate producer mutant id");
      producerIds.add(mutant.id);
      if (!(STRYKER_MUTANT_STATUSES as readonly unknown[]).includes(mutant.status)) throw new TypeError("unknown mutant status");
      if (mutant.testsCompleted !== undefined && (!Number.isSafeInteger(mutant.testsCompleted) || (mutant.testsCompleted as number) < 0)) {
        throw new TypeError("testsCompleted must be a nonnegative safe integer");
      }
      const reason = mutant.statusReason;
      if (reason !== undefined && (typeof reason !== "string" || reason.length > STRYKER_OUTPUT_LIMITS.reason || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(reason))) {
        throw new TypeError("statusReason must be bounded text");
      }
      const status = mutant.status as StrykerMutantStatusV1;
      counts[status] += 1;
      mutants.push(Object.freeze({ mutant_id: path + "#" + mutant.id, file_path: path,
        producer_id: mutant.id, status, status_reason: reason === undefined ? null : reason as string }));
    }
  }
  mutants.sort((a, b) => {
    if (a.mutant_id < b.mutant_id) return -1;
    if (a.mutant_id > b.mutant_id) return 1;
    return 0;
  });
  const limitations = ["stryker:untrusted-report"];
  if (!input.complete) limitations.push("stryker:incomplete-report");
  for (const status of STRYKER_MUTANT_STATUSES) {
    if (status !== "Killed" && status !== "Survived" && counts[status] > 0) limitations.push("stryker:status:" + status);
  }
  const hasError = input.process_exit_code !== 0 || counts.CompileError > 0 || counts.RuntimeError > 0;
  const incomplete = !input.complete || mutants.length === 0 || counts.Ignored > 0 || counts.Pending > 0 || counts.Timeout > 0 || counts.NoCoverage > 0;
  let status: "ERROR" | "FAIL" | "NOT_RUN" | "PASS" = "PASS";
  if (hasError) status = "ERROR";
  else if (counts.Survived > 0) status = "FAIL";
  else if (incomplete) status = "NOT_RUN";
  const observation = normalizeExternalMutationOutputV1({ schema_version: 1, adapter_id: "stryker-json-10.0.0",
    kind: "mutation", source_identity: input.expected.source_identity, head_sha: input.expected.head_sha,
    status, mutation_ref: "stryker:" + input.expected.attempt_id, attempted_count: mutants.length - counts.Ignored - counts.Pending,
    killed_count: counts.Killed, survived_count: counts.Survived,
    survived_mutants: mutants.filter((mutant) => mutant.status === "Survived").map((mutant) => mutant.mutant_id),
    result_digest: digest, limitations });
  return Object.freeze({ attempt_id: input.expected.attempt_id, generated_count: mutants.length, observation,
    mutants: Object.freeze(mutants), status_counts: Object.freeze(counts) });
}
