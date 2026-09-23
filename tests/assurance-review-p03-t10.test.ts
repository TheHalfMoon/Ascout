import { describe, expect, it } from "vitest";

import {
  mapReviewAbsenceV1,
  type ReviewAbsenceRecordV1,
} from "../src/assurance/review/absence-handling.js";
import type { CoverageGroupV1 } from "../src/assurance/review/coverage-accounting.js";
import type {
  ReviewExecutionResultV1,
  ReviewExecutionStatusV1,
} from "../src/assurance/engines/review/opencode-review-adapter.js";

const GROUPS: readonly CoverageGroupV1[] = [
  { group_id: "group:api", files: ["src/api/a.ts", "src/api/b.ts"] },
  { group_id: "group:ui", files: ["src/ui/c.ts"] },
];

function execution(
  status: ReviewExecutionStatusV1,
  reasons: readonly string[] = ["binary unreachable"],
): ReviewExecutionResultV1 {
  return {
    schema_version: 1,
    status,
    exit_code: null,
    raw_stdout: null,
    stderr_excerpt: null,
    duration_ms: null,
    timed_out: status === "TIMEOUT",
    reasons: [...reasons],
    execution_identity: {
      engine_id: "engine:review-opencode-review",
      binary_name: "open-code-review",
      observed_version: null,
      resolved_path: "/usr/local/bin/open-code-review",
      profile_id: "profile:t10",
      capsule_id: "capsule:t10",
      head_sha: "e".repeat(40),
      argv: [],
    },
  };
}

describe("UA-P03-T10 absence and timeout handling", () => {
  it("maps TIMEOUT to INCOMPLETE with preserved reasons and full unreviewed scope", () => {
    const record = mapReviewAbsenceV1(
      execution("TIMEOUT", ["execution timed out"]),
      GROUPS,
    );
    expect(record.outcome).toBe("INCOMPLETE");
    expect(record.execution_status).toBe("TIMEOUT");
    expect(record.complete).toBe(false);
    expect(record.reasons).toContain("engine: execution timed out");
    expect(
      record.reasons.some((reason) => reason.includes("never clean")),
    ).toBe(true);
    expect(record.unreviewed_files).toEqual([
      "src/api/a.ts",
      "src/api/b.ts",
      "src/ui/c.ts",
    ]);
    expect(record.unreviewed_groups).toEqual(["group:api", "group:ui"]);
  });

  it("maps never-started statuses to NOT_RUN without fabricating review", () => {
    const statuses: ReviewExecutionStatusV1[] = [
      "UNAVAILABLE",
      "NOT_QUALIFIED",
      "REFUSED",
    ];
    for (const status of statuses) {
      const record: ReviewAbsenceRecordV1 = mapReviewAbsenceV1(
        execution(status),
        GROUPS,
      );
      expect(record.outcome).toBe("NOT_RUN");
      expect(record.complete).toBe(false);
      expect(record.unreviewed_files).toHaveLength(3);
      expect(record).not.toHaveProperty("clean");
    }
  });

  it("maps ERROR to INCOMPLETE with engine reasons preserved", () => {
    const record = mapReviewAbsenceV1(
      execution("ERROR", ["review binary exited non-zero"]),
      GROUPS,
    );
    expect(record.outcome).toBe("INCOMPLETE");
    expect(record.reasons).toContain("engine: review binary exited non-zero");
    expect(record.complete).toBe(false);
  });

  it("rejects COMPLETED execution as out of the absence boundary", () => {
    expect(() => mapReviewAbsenceV1(execution("COMPLETED", []), GROUPS)).toThrow(
      /not an absence outcome/u,
    );
  });

  it("fails closed on malformed input instead of inventing an outcome", () => {
    expect(() => mapReviewAbsenceV1(execution("TIMEOUT"), [])).toThrow(
      /groups empty/u,
    );
    expect(() =>
      mapReviewAbsenceV1(execution("TIMEOUT"), [
        { group_id: "group:api", files: ["src/api/a.ts"] },
        { group_id: "group:api", files: ["src/api/b.ts"] },
      ]),
    ).toThrow(/duplicate group id/u);
    const bad = execution("TIMEOUT");
    expect(() =>
      mapReviewAbsenceV1(
        { ...bad, execution_identity: null as never },
        GROUPS,
      ),
    ).toThrow(/identity missing/u);
  });

  it("keeps unreviewed scope explicitly visible and deterministic", () => {
    const first = mapReviewAbsenceV1(execution("UNAVAILABLE"), GROUPS);
    const second = mapReviewAbsenceV1(execution("UNAVAILABLE"), [...GROUPS].reverse());
    expect(first).toEqual(second);
    expect(first.complete).toBe(false);
    expect(first.unreviewed_files).toEqual([
      "src/api/a.ts",
      "src/api/b.ts",
      "src/ui/c.ts",
    ]);
  });
});
