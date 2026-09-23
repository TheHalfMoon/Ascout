import { describe, expect, it } from "vitest";

import {
  assertBenchmarkCorpusV1,
  REVIEW_BENCHMARK_CORPUS_V1,
  runBenchmarkCorpusV1,
} from "../src/assurance/review/benchmark-corpus.js";

describe("UA-P03-T13 benchmark corpus v1", () => {
  it("holds a frozen corpus with all four case kinds", () => {
    expect(REVIEW_BENCHMARK_CORPUS_V1).toHaveLength(12);
    expect(assertBenchmarkCorpusV1(REVIEW_BENCHMARK_CORPUS_V1)).toEqual({
      ok: true,
      reasons: [],
    });
    const kinds = new Set(
      REVIEW_BENCHMARK_CORPUS_V1.map((item) => item.kind),
    );
    expect([...kinds].sort()).toEqual([
      "HALLUCINATED_LOCATION",
      "SAFE_CONTROL",
      "SEEDED_DEFECT",
      "STALE_HEAD",
    ]);
  });

  it("passes the full corpus with perfect recall and precision", () => {
    const report = runBenchmarkCorpusV1();
    expect(report.corpus_id).toBe("corpus:review-v1");
    expect(report.total).toBe(12);
    expect(report.passed).toBe(12);
    expect(report.failed).toBe(0);
    expect(report.failures).toEqual([]);
    expect(report.defect_recall).toEqual({ promoted: 4, total: 4 });
    expect(report.control_precision).toEqual({ held: 3, total: 3 });
  });

  it("promotes every seeded defect with VALID state", () => {
    const report = runBenchmarkCorpusV1();
    const defects = report.results.filter(
      (result) => result.kind === "SEEDED_DEFECT",
    );
    expect(defects).toHaveLength(4);
    for (const defect of defects) {
      expect(defect.actual_state).toBe("VALID");
      expect(defect.actual_promotable).toBe(true);
      expect(defect.record?.promotable).toBe(true);
      expect(defect.record?.observation).toEqual(
        REVIEW_BENCHMARK_CORPUS_V1.find(
          (item) => item.case_id === defect.case_id,
        )?.observation,
      );
    }
  });

  it("holds every safe control without promotion", () => {
    const report = runBenchmarkCorpusV1();
    const controls = report.results.filter(
      (result) => result.kind === "SAFE_CONTROL",
    );
    expect(controls).toHaveLength(3);
    for (const control of controls) {
      expect(control.actual_promotable).toBe(false);
      expect(control.passed).toBe(true);
    }
  });

  it("actually measures: wrong expectations fail the benchmark", () => {
    const tampered = REVIEW_BENCHMARK_CORPUS_V1.map((item) =>
      item.kind === "SEEDED_DEFECT"
        ? { ...item, expected_promotable: false }
        : item,
    );
    expect(() => runBenchmarkCorpusV1(tampered)).toThrow(
      /seeded defect must expect/u,
    );
    const report = runBenchmarkCorpusV1([
      ...REVIEW_BENCHMARK_CORPUS_V1.filter(
        (item) => item.case_id !== "case:t13-10",
      ),
      {
        ...REVIEW_BENCHMARK_CORPUS_V1.find(
          (item) => item.case_id === "case:t13-10",
        )!,
        expected_state: "VALID" as const,
        expected_promotable: true,
        kind: "SEEDED_DEFECT" as const,
      },
    ]);
    expect(
      report.results.find((result) => result.case_id === "case:t13-10")?.passed,
    ).toBe(false);
    expect(report.failed).toBe(1);
  });

  it("fails closed on malformed corpora instead of scoring them", () => {
    expect(() => runBenchmarkCorpusV1([])).toThrow(/corpus empty/u);
    const duplicated = [
      REVIEW_BENCHMARK_CORPUS_V1[0]!,
      REVIEW_BENCHMARK_CORPUS_V1[0]!,
    ];
    expect(() => runBenchmarkCorpusV1(duplicated)).toThrow(
      /duplicate case id/u,
    );
  });
});
