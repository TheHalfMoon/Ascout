import { describe, expect, it } from "vitest";

import { publishSelectorMisses } from "../benchmarks/misses-lib.mjs";

const evidence = {
  qualification_run_id: "33236015286",
  t076_aggregate_sha256: "b".repeat(64),
  t077_aggregate_sha256: "c".repeat(64),
  aggregate_artifact_digest: `sha256:${"d".repeat(64)}`,
};

const oracleIds = ["suite > oracle a", "suite > oracle b"];
const t075Evidence = "a".repeat(64);
const baselineIds = {
  full: "1".repeat(64),
  plain: "2".repeat(64),
  related: "3".repeat(64),
  ascout: "4".repeat(64),
};

function baseline(comparator: keyof typeof baselineIds) {
  return {
    baseline_id: baselineIds[comparator],
    metric: "selection_recall",
    case_id: "selection-case",
    case_revision: 2,
    comparator,
    cache_class: "cold",
    denominator: { kind: "frozen_oracle_test_ids", count: oracleIds.length },
    frozen_oracle_test_ids: [...oracleIds],
    reference_evidence_sha256: t075Evidence,
  };
}

function metric(comparator: keyof typeof baselineIds, observed: string[] | null) {
  if (observed === null) {
    return {
      baseline_id: baselineIds[comparator],
      comparator,
      available: false,
      reason: "required oracle membership evidence is unavailable for repeated cold observations",
      required_oracle_test_ids: null,
      observed_oracle_test_ids: null,
      numerator: null,
      denominator: oracleIds.length,
      recall: null,
    };
  }
  return {
    baseline_id: baselineIds[comparator],
    comparator,
    available: true,
    reason: null,
    required_oracle_test_ids: [...oracleIds],
    observed_oracle_test_ids: [...observed],
    numerator: observed.length,
    denominator: oracleIds.length,
    recall: observed.length / oracleIds.length,
  };
}

function aggregateMetric(comparator: keyof typeof baselineIds, observed: string[] | null) {
  return observed === null
    ? {
        baseline_ids: [],
        available_case_count: 0,
        unavailable_case_count: 1,
        numerator: 0,
        denominator: 0,
        recall: null,
      }
    : {
        baseline_ids: [baselineIds[comparator]],
        available_case_count: 1,
        unavailable_case_count: 0,
        numerator: observed.length,
        denominator: oracleIds.length,
        recall: observed.length / oracleIds.length,
      };
}

function aggregateFixture(): any {
  const observations = {
    full: [...oracleIds],
    plain: null,
    related: [...oracleIds],
    ascout: [oracleIds[0]!],
  } as const;
  return {
    schema_version: 1,
    task: "T076",
    case_set: [
      { case_id: "selection-case", case_revision: 2, t075_evidence_sha256: t075Evidence },
      { case_id: "gap-case", case_revision: 1, t075_evidence_sha256: "e".repeat(64) },
    ],
    metrics: {
      selection_recall: {
        full: aggregateMetric("full", observations.full as string[]),
        plain: aggregateMetric("plain", observations.plain),
        related: aggregateMetric("related", observations.related as string[]),
        ascout: aggregateMetric("ascout", observations.ascout as string[]),
      },
    },
    raw_cases: [
      {
        case_id: "selection-case",
        case_revision: 2,
        baselines: [baseline("full"), baseline("plain"), baseline("related"), baseline("ascout")],
        metrics: {
          selection_recall: {
            full: metric("full", observations.full as string[]),
            plain: metric("plain", observations.plain),
            related: metric("related", observations.related as string[]),
            ascout: metric("ascout", observations.ascout as string[]),
          },
        },
      },
      {
        case_id: "gap-case",
        case_revision: 1,
        baselines: [],
        metrics: { selection_recall: null },
      },
    ],
  };
}

function setAscoutObserved(input: any, observed: string[]) {
  const selection = input.raw_cases[0]!;
  selection.metrics.selection_recall!.ascout = metric("ascout", observed);
  input.metrics.selection_recall.ascout = aggregateMetric("ascout", observed);
}

describe("T078 selector-miss publication", () => {
  it("publishes every observed selector miss with no invented acceptance threshold", () => {
    const result = publishSelectorMisses(aggregateFixture(), evidence);

    expect(result.status).toBe("SELECTOR_MISSES_PUBLISHED");
    expect(result.threshold_policy.acceptance_threshold).toBeNull();
    expect(result.summary).toMatchObject({
      selection_case_count: 1,
      comparator_outcome_count: 4,
      published_selector_miss_count: 1,
      unavailable_outcome_count: 1,
    });
    expect(result.selector_misses).toEqual([
      {
        case_id: "selection-case",
        case_revision: 2,
        comparator: "ascout",
        baseline_id: baselineIds.ascout,
        t075_evidence_sha256: t075Evidence,
        reference_evidence_sha256: t075Evidence,
        oracle_test_id: oracleIds[1],
      },
    ]);
    expect(result.selector_unavailable).toHaveLength(1);
    expect(result.selector_unavailable[0]).toMatchObject({ comparator: "plain", required_oracle_test_ids: oracleIds });
  });

  it("emits one publication record for each missed frozen oracle id", () => {
    const input = aggregateFixture();
    setAscoutObserved(input, []);
    const result = publishSelectorMisses(input, evidence);

    expect(result.selector_misses.map((item: any) => item.oracle_test_id)).toEqual(oracleIds);
    expect(result.summary.comparators.ascout).toMatchObject({
      miss_case_count: 1,
      published_missed_oracle_test_count: 2,
    });
  });

  it("keeps unavailable selector evidence separate from hits and misses", () => {
    const input = aggregateFixture();
    const selection = input.raw_cases[0]!;
    selection.metrics.selection_recall!.ascout = metric("ascout", null);
    input.metrics.selection_recall.ascout = aggregateMetric("ascout", null);
    const result = publishSelectorMisses(input, evidence);

    expect(result.selector_misses).toEqual([]);
    expect(result.summary.comparators.ascout).toEqual({
      hit_case_count: 0,
      miss_case_count: 0,
      unavailable_case_count: 1,
      published_missed_oracle_test_count: 0,
    });
    expect(result.selector_unavailable.map((item: any) => item.comparator).sort()).toEqual(["ascout", "plain"]);
  });

  it("fails closed when the aggregate selection totals disagree with raw cases", () => {
    const input = aggregateFixture();
    input.metrics.selection_recall.ascout.numerator = 2;
    expect(() => publishSelectorMisses(input, evidence)).toThrow(/aggregate ascout selection metric disagrees/);
  });

  it("fails closed when metric oracle ids disagree with the frozen baseline", () => {
    const input = aggregateFixture();
    input.raw_cases[0]!.metrics.selection_recall!.ascout.required_oracle_test_ids = [oracleIds[0]!];
    expect(() => publishSelectorMisses(input, evidence)).toThrow(/metric\/baseline oracle IDs disagree/);
  });

  it("fails closed when an observed id is outside the frozen oracle", () => {
    const input = aggregateFixture();
    input.raw_cases[0]!.metrics.selection_recall!.ascout.observed_oracle_test_ids = ["not an oracle"];
    input.raw_cases[0]!.metrics.selection_recall!.ascout.numerator = 1;
    expect(() => publishSelectorMisses(input, evidence)).toThrow(/observed a non-oracle test ID/);
  });

  it("fails closed when baseline reference evidence is not bound to the T075 case", () => {
    const input = aggregateFixture();
    input.raw_cases[0]!.baselines.find((item: any) => item.comparator === "ascout")!.reference_evidence_sha256 = "f".repeat(64);
    expect(() => publishSelectorMisses(input, evidence)).toThrow(/reference evidence does not match the T075 case binding/);
  });

  it("fails closed when unavailable state carries observed membership", () => {
    const input = aggregateFixture();
    input.raw_cases[0]!.metrics.selection_recall!.plain.observed_oracle_test_ids = [];
    expect(() => publishSelectorMisses(input, evidence)).toThrow(/unavailable metric is inconsistent/);
  });

  it("requires exact source evidence for the published result", () => {
    expect(() => publishSelectorMisses(aggregateFixture(), { ...evidence, qualification_run_id: "run-1" })).toThrow(/qualification_run_id/);
    expect(() => publishSelectorMisses(aggregateFixture(), { ...evidence, aggregate_artifact_digest: "bad" })).toThrow(/aggregate_artifact_digest/);
  });
});
