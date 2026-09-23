import {
  normalizeReviewFindingV1,
  type NormalizedReviewRecordV1,
} from "./finding-normalization.js";
import {
  validateObservationLocationV1,
  type LocationStateV1,
  type LocationValidationContextV1,
} from "./location-validator.js";
import {
  assertRawReviewObservationV1,
  type RawReviewObservationV1,
} from "./raw-observation.js";

export const BENCHMARK_CORPUS_VERSION = 1 as const;
export const BENCHMARK_CORPUS_ID = "corpus:review-v1" as const;

export const BENCHMARK_CASE_KINDS = [
  "SEEDED_DEFECT",
  "SAFE_CONTROL",
  "STALE_HEAD",
  "HALLUCINATED_LOCATION",
] as const;

export type BenchmarkCaseKindV1 =
  (typeof BENCHMARK_CASE_KINDS)[number];

export interface BenchmarkCaseV1 {
  readonly case_id: string;
  readonly kind: BenchmarkCaseKindV1;
  readonly observation: RawReviewObservationV1;
  readonly context: LocationValidationContextV1;
  readonly expected_state: LocationStateV1;
  readonly expected_promotable: boolean;
}

export interface BenchmarkCaseResultV1 {
  readonly case_id: string;
  readonly kind: BenchmarkCaseKindV1;
  readonly expected_state: LocationStateV1;
  readonly expected_promotable: boolean;
  readonly actual_state: LocationStateV1 | null;
  readonly actual_promotable: boolean;
  readonly record: NormalizedReviewRecordV1 | null;
  readonly passed: boolean;
  readonly reasons: readonly string[];
}

export interface BenchmarkReportV1 {
  readonly schema_version: 1;
  readonly corpus_id: string;
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly defect_recall: {
    readonly promoted: number;
    readonly total: number;
  };
  readonly control_precision: {
    readonly held: number;
    readonly total: number;
  };
  readonly results: readonly BenchmarkCaseResultV1[];
  readonly failures: readonly string[];
}

export interface BenchmarkCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

const HEAD_A = "e".repeat(40);
const HEAD_B = "f".repeat(40);

function benchmarkObservation(
  caseId: string,
  overrides: Partial<RawReviewObservationV1>,
  bindingOverrides: Partial<RawReviewObservationV1["execution_binding"]> = {},
): RawReviewObservationV1 {
  return {
    schema_version: 1,
    authority: "NONE_UNTRUSTED",
    observation_id: caseId,
    producer_class: "MODEL",
    severity_hint: "major",
    category_hint: "correctness",
    body: "Seeded benchmark observation.",
    location_hint: { path: "src/alpha.ts", start_line: 10, end_line: 12 },
    rule_id: null,
    confidence: 0.8,
    execution_binding: {
      engine_id: "engine:review-opencode-review",
      binary_name: "open-code-review",
      observed_version: "1.2.3",
      profile_id: "profile:benchmark-v1",
      capsule_id: "capsule:benchmark-v1",
      head_sha: HEAD_A,
      ...bindingOverrides,
    },
    ...overrides,
  };
}

function benchmarkContext(
  overrides: Partial<LocationValidationContextV1> = {},
): LocationValidationContextV1 {
  return {
    expected_head_sha: HEAD_A,
    known_files: ["src/alpha.ts", "src/beta.ts"],
    file_line_counts: { "src/alpha.ts": 50, "src/beta.ts": 30 },
    ...overrides,
  };
}

function benchmarkCase(
  caseId: string,
  kind: BenchmarkCaseKindV1,
  observation: RawReviewObservationV1,
  context: LocationValidationContextV1,
  expected_state: LocationStateV1,
  expected_promotable: boolean,
): BenchmarkCaseV1 {
  return Object.freeze({
    case_id: caseId,
    kind,
    observation,
    context,
    expected_state,
    expected_promotable,
  });
}

export const REVIEW_BENCHMARK_CORPUS_V1: readonly BenchmarkCaseV1[] =
  Object.freeze([
    benchmarkCase(
      "case:t13-01",
      "SEEDED_DEFECT",
      benchmarkObservation("case:t13-01", {
        body: "Null dereference on the error path.",
      }),
      benchmarkContext(),
      "VALID",
      true,
    ),
    benchmarkCase(
      "case:t13-02",
      "SEEDED_DEFECT",
      benchmarkObservation(
        "case:t13-02",
        {
          producer_class: "RULE",
          rule_id: "rule:no-unchecked-return",
          body: "Unchecked return value.",
          location_hint: { path: "src/beta.ts", start_line: 5, end_line: 5 },
        },
        {},
      ),
      benchmarkContext(),
      "VALID",
      true,
    ),
    benchmarkCase(
      "case:t13-03",
      "SEEDED_DEFECT",
      benchmarkObservation("case:t13-03", {
        producer_class: "MIXED",
        body: "Race between close and write.",
        location_hint: { path: "src/alpha.ts", start_line: 1, end_line: 50 },
      }),
      benchmarkContext(),
      "VALID",
      true,
    ),
    benchmarkCase(
      "case:t13-04",
      "SEEDED_DEFECT",
      benchmarkObservation("case:t13-04", {
        producer_class: "UNKNOWN",
        confidence: null,
        body: "Unbounded allocation from input length.",
        location_hint: { path: "src/beta.ts", start_line: 29, end_line: 30 },
      }),
      benchmarkContext(),
      "VALID",
      true,
    ),
    benchmarkCase(
      "case:t13-05",
      "SAFE_CONTROL",
      benchmarkObservation("case:t13-05", {
        body: "General remark with no location attached.",
        location_hint: null,
      }),
      benchmarkContext(),
      "NO_LOCATION",
      false,
    ),
    benchmarkCase(
      "case:t13-06",
      "SAFE_CONTROL",
      benchmarkObservation("case:t13-06", {
        severity_hint: "info",
        body: "Style nit with no location attached.",
        location_hint: null,
      }),
      benchmarkContext(),
      "NO_LOCATION",
      false,
    ),
    benchmarkCase(
      "case:t13-07",
      "SAFE_CONTROL",
      benchmarkObservation("case:t13-07", {
        producer_class: "RULE",
        rule_id: "rule:comment-style",
        body: "Comment style suggestion without location.",
        location_hint: null,
      }),
      benchmarkContext(),
      "NO_LOCATION",
      false,
    ),
    benchmarkCase(
      "case:t13-08",
      "STALE_HEAD",
      benchmarkObservation(
        "case:t13-08",
        {
          body: "Valid-looking observation from a stale run.",
        },
        { head_sha: HEAD_B },
      ),
      benchmarkContext(),
      "STALE_HEAD",
      false,
    ),
    benchmarkCase(
      "case:t13-09",
      "STALE_HEAD",
      benchmarkObservation(
        "case:t13-09",
        {
          body: "Stale observation pointing at a ghost path.",
          location_hint: { path: "src/ghost.ts", start_line: 1, end_line: 1 },
        },
        { head_sha: HEAD_B },
      ),
      benchmarkContext(),
      "STALE_HEAD",
      false,
    ),
    benchmarkCase(
      "case:t13-10",
      "HALLUCINATED_LOCATION",
      benchmarkObservation("case:t13-10", {
        body: "Observation points at a file outside the inventory.",
        location_hint: { path: "src/ghost.ts", start_line: 1, end_line: 1 },
      }),
      benchmarkContext(),
      "HALLUCINATED_PATH",
      false,
    ),
    benchmarkCase(
      "case:t13-11",
      "HALLUCINATED_LOCATION",
      benchmarkObservation("case:t13-11", {
        body: "Observation lines exceed the known file length.",
        location_hint: { path: "src/beta.ts", start_line: 29, end_line: 99 },
      }),
      benchmarkContext(),
      "LINE_OUT_OF_RANGE",
      false,
    ),
    benchmarkCase(
      "case:t13-12",
      "HALLUCINATED_LOCATION",
      benchmarkObservation("case:t13-12", {
        body: "Line counts unavailable so ranges stay unverified.",
      }),
      benchmarkContext({ file_line_counts: null }),
      "LINES_UNVERIFIED",
      false,
    ),
  ]);

export function assertBenchmarkCorpusV1(
  cases: readonly BenchmarkCaseV1[],
): BenchmarkCheckV1 {
  const reasons: string[] = [];
  if (!Array.isArray(cases) || cases.length === 0) {
    return { ok: false, reasons: ["corpus empty"] };
  }
  const seen = new Set<string>();
  for (const item of cases) {
    if (typeof item.case_id !== "string" || !OPAQUE_ID.test(item.case_id)) {
      reasons.push("case id invalid");
      break;
    }
    if (seen.has(item.case_id)) {
      reasons.push("duplicate case id: " + item.case_id);
      break;
    }
    seen.add(item.case_id);
    if (!(BENCHMARK_CASE_KINDS as readonly string[]).includes(item.kind)) {
      reasons.push("case kind invalid: " + item.case_id);
      break;
    }
    const shape = assertRawReviewObservationV1(item.observation);
    if (!shape.ok) {
      reasons.push(
        "case observation shape invalid: " +
          item.case_id +
          ": " +
          shape.reasons.join("; "),
      );
      break;
    }
    if (item.observation.observation_id !== item.case_id) {
      reasons.push("case observation id mismatch: " + item.case_id);
      break;
    }
    if (
      item.kind === "SEEDED_DEFECT" &&
      (item.expected_state !== "VALID" || item.expected_promotable !== true)
    ) {
      reasons.push("seeded defect must expect VALID promotion: " + item.case_id);
      break;
    }
    if (
      item.kind !== "SEEDED_DEFECT" &&
      (item.expected_state === "VALID" || item.expected_promotable !== false)
    ) {
      reasons.push(
        "non-defect case must expect non-promotion: " + item.case_id,
      );
      break;
    }
  }
  return { ok: reasons.length === 0, reasons };
}

function runBenchmarkCaseV1(item: BenchmarkCaseV1): BenchmarkCaseResultV1 {
  try {
    const shape = assertRawReviewObservationV1(item.observation);
    if (!shape.ok) {
      return {
        case_id: item.case_id,
        kind: item.kind,
        expected_state: item.expected_state,
        expected_promotable: item.expected_promotable,
        actual_state: null,
        actual_promotable: false,
        record: null,
        passed: false,
        reasons: Object.freeze([
          "observation shape invalid: " + shape.reasons.join("; "),
        ]),
      };
    }
    const validation = validateObservationLocationV1(
      item.observation,
      item.context,
    );
    const record = normalizeReviewFindingV1(item.observation, {
      schema_version: 1,
      observation_id: item.observation.observation_id,
      state: validation.state,
      reasons: validation.reasons,
    });
    const passed =
      validation.state === item.expected_state &&
      record.promotable === item.expected_promotable;
    return {
      case_id: item.case_id,
      kind: item.kind,
      expected_state: item.expected_state,
      expected_promotable: item.expected_promotable,
      actual_state: validation.state,
      actual_promotable: record.promotable,
      record,
      passed,
      reasons: Object.freeze(
        passed
          ? [
              "matches expected state " +
                item.expected_state +
                " and promotable " +
                String(item.expected_promotable),
            ]
          : [
              "expected state " +
                item.expected_state +
                " but observed " +
                validation.state,
              "expected promotable " +
                String(item.expected_promotable) +
                " but observed " +
                String(record.promotable),
            ],
      ),
    };
  } catch (error) {
    return {
      case_id: item.case_id,
      kind: item.kind,
      expected_state: item.expected_state,
      expected_promotable: item.expected_promotable,
      actual_state: null,
      actual_promotable: false,
      record: null,
      passed: false,
      reasons: Object.freeze([
        "pipeline error: " +
          (error instanceof Error ? error.message : String(error)),
      ]),
    };
  }
}

export function runBenchmarkCorpusV1(
  cases: readonly BenchmarkCaseV1[] = REVIEW_BENCHMARK_CORPUS_V1,
): BenchmarkReportV1 {
  const check = assertBenchmarkCorpusV1(cases);
  if (!check.ok) {
    throw new TypeError(
      "invalid benchmark corpus: " + check.reasons.join("; "),
    );
  }
  const results = Object.freeze(
    [...cases]
      .sort((a, b) => (a.case_id < b.case_id ? -1 : a.case_id > b.case_id ? 1 : 0))
      .map((item) => runBenchmarkCaseV1(item)),
  );
  const passed = results.filter((result) => result.passed).length;
  const defects = results.filter(
    (result) => result.kind === "SEEDED_DEFECT",
  );
  const controls = results.filter(
    (result) => result.kind === "SAFE_CONTROL",
  );
  const failures = Object.freeze(
    results
      .filter((result) => !result.passed)
      .map(
        (result) =>
          result.case_id + ": " + result.reasons.join("; "),
      ),
  );
  return Object.freeze({
    schema_version: BENCHMARK_CORPUS_VERSION,
    corpus_id: BENCHMARK_CORPUS_ID,
    total: results.length,
    passed,
    failed: results.length - passed,
    defect_recall: Object.freeze({
      promoted: defects.filter((result) => result.actual_promotable).length,
      total: defects.length,
    }),
    control_precision: Object.freeze({
      held: controls.filter((result) => !result.actual_promotable).length,
      total: controls.length,
    }),
    results,
    failures,
  });
}
