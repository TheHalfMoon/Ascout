export const TEST_BENCHMARK_SCHEMA_VERSION = 1 as const;
export const TEST_BENCHMARK_MISS_CLASSES = [
  "seed-selection",
  "flake",
  "exercise",
  "mutation",
  "property",
  "browser",
] as const;
export const TEST_BENCHMARK_ENTRY_STATES = ["OBSERVED", "MISS"] as const;

export type TestBenchmarkMissClassV1 =
  (typeof TEST_BENCHMARK_MISS_CLASSES)[number];
export type TestBenchmarkEntryStateV1 =
  (typeof TEST_BENCHMARK_ENTRY_STATES)[number];

export interface TestBenchmarkClassEntryV1 {
  readonly class: TestBenchmarkMissClassV1;
  readonly state: TestBenchmarkEntryStateV1;
  readonly ref: string | null;
  readonly digest: string | null;
  readonly reason: string | null;
}

export interface ExternalTestBenchmarkInputV1 {
  readonly schema_version: typeof TEST_BENCHMARK_SCHEMA_VERSION;
  readonly adapter_id: string;
  readonly source_identity: string;
  readonly head_sha: string;
  readonly seed_refs: readonly string[];
  readonly entries: readonly TestBenchmarkClassEntryV1[];
  readonly limitations: readonly string[];
}

export interface NormalizedTestBenchmarkObservationV1 {
  readonly schema_version: typeof TEST_BENCHMARK_SCHEMA_VERSION;
  readonly scope: "TEST";
  readonly strategy: "OBSERVATION_ONLY";
  readonly authority: "NONE_UNTRUSTED";
  readonly canonical_status: "UNTRUSTED_OBSERVATION";
  readonly adapter_id: string;
  readonly source_identity: string;
  readonly head_sha: string;
  readonly seed_refs: readonly string[];
  readonly entries: readonly TestBenchmarkClassEntryV1[];
  readonly limitations: readonly string[];
  readonly blocking_reasons: readonly string[];
  readonly plan_visible_fields: readonly string[];
}

const PLAN_VISIBLE_FIELDS: readonly string[] = Object.freeze([
  "schema_version",
  "scope",
  "strategy",
  "authority",
  "canonical_status",
  "adapter_id",
  "source_identity",
  "head_sha",
  "seed_refs",
  "entries",
  "limitations",
  "blocking_reasons",
]);

const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

function requireText(value: string, field: string): void {
  if (
    value.length === 0 ||
    value.length > 512 ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    throw new TypeError(field + " must be bounded printable text");
  }
}

function requireIdentifier(value: string, field: string): void {
  requireText(value, field);
  if (!/^[A-Za-z0-9._:/-]+$/u.test(value)) {
    throw new TypeError(field + " contains unsupported characters");
  }
}

function requireClass(value: string): TestBenchmarkMissClassV1 {
  if (
    !TEST_BENCHMARK_MISS_CLASSES.includes(value as TestBenchmarkMissClassV1)
  ) {
    throw new TypeError("benchmark class is unsupported");
  }
  return value as TestBenchmarkMissClassV1;
}

function requireState(value: string): TestBenchmarkEntryStateV1 {
  if (!TEST_BENCHMARK_ENTRY_STATES.includes(value as TestBenchmarkEntryStateV1)) {
    throw new TypeError("benchmark entry state is unsupported");
  }
  return value as TestBenchmarkEntryStateV1;
}

function canonicalEntries(values: readonly string[], field: string): readonly string[] {
  for (const value of values) {
    requireText(value, field);
  }
  if (new Set(values).size !== values.length) {
    throw new TypeError(field + " must contain unique entries");
  }
  return [...values].sort();
}

function normalizeEntry(entry: TestBenchmarkClassEntryV1): TestBenchmarkClassEntryV1 {
  const missClass = requireClass(entry.class);
  const state = requireState(entry.state);
  if (state === "OBSERVED") {
    if (entry.ref === null || entry.digest === null || entry.reason !== null) {
      throw new TypeError("observed benchmark entries require ref and digest with no reason");
    }
    requireText(entry.ref, "benchmark ref");
    if (!DIGEST_PATTERN.test(entry.digest)) {
      throw new TypeError("benchmark digest must be a lowercase SHA-256 digest");
    }
    return { class: missClass, state, ref: entry.ref, digest: entry.digest, reason: null };
  }
  if (entry.ref !== null || entry.digest !== null || entry.reason === null) {
    throw new TypeError("missed benchmark entries require a reason with no ref or digest");
  }
  requireText(entry.reason, "benchmark miss reason");
  return { class: missClass, state, ref: null, digest: null, reason: entry.reason };
}

export function normalizeExternalTestBenchmarkV1(
  input: ExternalTestBenchmarkInputV1,
): NormalizedTestBenchmarkObservationV1 {
  if (input.schema_version !== TEST_BENCHMARK_SCHEMA_VERSION) {
    throw new TypeError("schema_version is unsupported");
  }
  requireIdentifier(input.adapter_id, "adapter_id");
  requireIdentifier(input.source_identity, "source_identity");
  if (!SHA_PATTERN.test(input.head_sha)) {
    throw new TypeError("head_sha must be a full lowercase Git object id");
  }
  const seedRefs = canonicalEntries(input.seed_refs, "seed_ref");
  if (seedRefs.length === 0) {
    throw new TypeError("benchmark requires explicit seed selection");
  }
  const entries = input.entries.map(normalizeEntry);
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.class)) {
      throw new TypeError("benchmark classes must appear exactly once");
    }
    seen.add(entry.class);
  }
  if (seen.size !== TEST_BENCHMARK_MISS_CLASSES.length) {
    throw new TypeError("benchmark must cover every miss class exactly once");
  }
  entries.sort((a, b) => (a.class < b.class ? -1 : a.class > b.class ? 1 : 0));
  const limitations = canonicalEntries(input.limitations, "limitation");
  const blockingReasons: string[] = [];
  for (const entry of entries) {
    if (entry.state === "MISS") {
      blockingReasons.push("benchmark-miss:" + entry.class + ":" + entry.reason);
    }
  }
  for (const limitation of limitations) {
    blockingReasons.push("benchmark:limitation:" + limitation);
  }
  return Object.freeze({
    schema_version: TEST_BENCHMARK_SCHEMA_VERSION,
    scope: "TEST" as const,
    strategy: "OBSERVATION_ONLY" as const,
    authority: "NONE_UNTRUSTED" as const,
    canonical_status: "UNTRUSTED_OBSERVATION" as const,
    adapter_id: input.adapter_id,
    source_identity: input.source_identity,
    head_sha: input.head_sha,
    seed_refs: Object.freeze([...seedRefs]),
    entries: Object.freeze(entries.map((entry) => Object.freeze({ ...entry }))),
    limitations: Object.freeze([...limitations]),
    blocking_reasons: Object.freeze([...new Set(blockingReasons)].sort()),
    plan_visible_fields: Object.freeze([...PLAN_VISIBLE_FIELDS]),
  });
}
