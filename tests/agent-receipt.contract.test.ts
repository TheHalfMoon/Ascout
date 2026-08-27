import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

const AGENT_MAX_UTF8_BYTES = 16 * 1024;
const PRIORITY_DETAIL_PREFIXES = [
  "ERROR task=",
  "FINDING id=",
  "ADMISSION task=",
  "GAP kind=",
  "OMITTED ",
] as const;

interface OmittedTotals {
  readonly tasks: number;
  readonly findings: number;
  readonly exercise_gaps: number;
  readonly test_changes: number;
  readonly evidence: number;
}

interface TruthTotals {
  readonly tasks: number;
  readonly findings: number;
  readonly exercise_gaps: number;
  readonly test_changes: number;
  readonly evidence: number;
}

interface RetainedDetailCounts extends TruthTotals {}

interface AgentProjectionCase {
  readonly id: string;
  readonly rendered: string;
  readonly repository_id: string;
  readonly head_sha: string;
  readonly stability: "stable" | "tree_drifted" | "unknown";
  readonly completeness: "complete" | "materially_incomplete" | "unknown_due_to_error";
  readonly exit_code: 0 | 1 | 2 | 3 | 4;
  readonly task_status_counts: Readonly<Record<string, number>>;
  readonly truth_totals: TruthTotals;
  readonly retained_detail_counts: RetainedDetailCounts;
  readonly omitted: OmittedTotals;
  readonly required_evidence_refs: readonly string[];
  readonly retained_evidence_ids: readonly string[];
}

function utf8Bytes(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function expectOmittedTotalsConsistent(candidate: AgentProjectionCase): void {
  for (const key of Object.keys(candidate.truth_totals) as (keyof TruthTotals)[]) {
    expect(candidate.retained_detail_counts[key] + candidate.omitted[key]).toBe(
      candidate.truth_totals[key],
    );
  }
}

function expectEvidenceRefsResolvable(candidate: AgentProjectionCase): void {
  expect(new Set(candidate.retained_evidence_ids).size).toBe(
    candidate.retained_evidence_ids.length,
  );
  for (const evidenceId of candidate.required_evidence_refs) {
    expect(candidate.retained_evidence_ids).toContain(evidenceId);
    expect(candidate.rendered).toContain(`evidence=${evidenceId}`);
    expect(candidate.rendered).toContain(`EVIDENCE ${evidenceId}`);
  }
}

function expectIdentityAndSummaryPreserved(candidate: AgentProjectionCase): void {
  expect(candidate.rendered).toContain(`repo=${candidate.repository_id}`);
  expect(candidate.rendered).toContain(`head=${candidate.head_sha}`);
  expect(candidate.rendered).toContain(`stability=${candidate.stability}`);
  expect(candidate.rendered).toContain(`completeness=${candidate.completeness}`);
  expect(candidate.rendered).toContain(`exit=${candidate.exit_code}`);

  for (const [status, count] of Object.entries(candidate.task_status_counts)) {
    expect(candidate.rendered).toContain(`${status}=${count}`);
  }
}

function expectWithinAgentBudget(candidate: AgentProjectionCase): void {
  expect(utf8Bytes(candidate.rendered)).toBeLessThanOrEqual(AGENT_MAX_UTF8_BYTES);
}

function expectPriorityOrder(candidate: AgentProjectionCase): void {
  const lines = candidate.rendered.split("\n");
  const positions = PRIORITY_DETAIL_PREFIXES.map((prefix) =>
    lines.findIndex((line) => line.startsWith(prefix)),
  );
  for (const position of positions) {
    expect(position).toBeGreaterThanOrEqual(0);
  }
  for (let index = 1; index < positions.length; index += 1) {
    expect(positions[index - 1]!).toBeLessThan(positions[index]!);
  }
}

const COMPACT_CASE: AgentProjectionCase = {
  id: "compact-critical-truth",
  repository_id: `remote:${"a".repeat(64)}`,
  head_sha: "b".repeat(40),
  stability: "stable",
  completeness: "materially_incomplete",
  exit_code: 2,
  task_status_counts: {
    PASS: 1,
    FAIL: 0,
    FLAKY: 0,
    BLOCKED: 0,
    ERROR: 1,
    NOT_APPLICABLE: 0,
    NOT_RUN: 1,
  },
  truth_totals: {
    tasks: 3,
    findings: 1,
    exercise_gaps: 2,
    test_changes: 1,
    evidence: 2,
  },
  retained_detail_counts: {
    tasks: 3,
    findings: 1,
    exercise_gaps: 2,
    test_changes: 1,
    evidence: 2,
  },
  omitted: {
    tasks: 0,
    findings: 0,
    exercise_gaps: 0,
    test_changes: 0,
    evidence: 0,
  },
  required_evidence_refs: ["ev-error", "ev-finding"],
  retained_evidence_ids: ["ev-error", "ev-finding"],
  rendered: [
    `ASCOUT_AGENT_V1 repo=remote:${"a".repeat(64)} head=${"b".repeat(40)} stability=stable`,
    "SUMMARY completeness=materially_incomplete exit=2 PASS=1 FAIL=0 FLAKY=0 BLOCKED=0 ERROR=1 NOT_APPLICABLE=0 NOT_RUN=1",
    "ERROR task=test-error reason=launch_failed evidence=ev-error",
    "FINDING id=finding-1 severity=major evidence=ev-finding",
    "ADMISSION task=test-refused state=refused_changed_surface authority=vitest.config.ts",
    "GAP kind=NOT_EXERCISED path=src/a.ts line=12",
    "GAP kind=UNRESOLVED path=src/b.ts line=9 reason=coverage_mapping_unresolved",
    "TEST_CHANGE kind=snapshot_deleted path=tests/__snapshots__/a.snap",
    "EVIDENCE ev-error task=test-error kind=stderr",
    "EVIDENCE ev-finding task=test-error kind=test_result",
    "OMITTED tasks=0 findings=0 exercise_gaps=0 test_changes=0 evidence=0",
  ].join("\n"),
};

const PRESSURE_CASE: AgentProjectionCase = {
  id: "bounded-pressure-with-honest-omissions",
  repository_id: `local:${"c".repeat(64)}`,
  head_sha: "d".repeat(64),
  stability: "stable",
  completeness: "materially_incomplete",
  exit_code: 4,
  task_status_counts: {
    PASS: 80,
    FAIL: 0,
    FLAKY: 0,
    BLOCKED: 0,
    ERROR: 1,
    NOT_APPLICABLE: 0,
    NOT_RUN: 1,
  },
  truth_totals: {
    tasks: 82,
    findings: 20,
    exercise_gaps: 150,
    test_changes: 12,
    evidence: 27,
  },
  retained_detail_counts: {
    tasks: 2,
    findings: 2,
    exercise_gaps: 2,
    test_changes: 1,
    evidence: 2,
  },
  omitted: {
    tasks: 80,
    findings: 18,
    exercise_gaps: 148,
    test_changes: 11,
    evidence: 25,
  },
  required_evidence_refs: ["ev-critical-error", "ev-critical-finding"],
  retained_evidence_ids: ["ev-critical-error", "ev-critical-finding"],
  rendered: [
    `ASCOUT_AGENT_V1 repo=local:${"c".repeat(64)} head=${"d".repeat(64)} stability=stable`,
    "SUMMARY completeness=materially_incomplete exit=4 PASS=80 FAIL=0 FLAKY=0 BLOCKED=0 ERROR=1 NOT_APPLICABLE=0 NOT_RUN=1 findings=20 exercise_gaps=150 test_changes=12 evidence=27",
    "ERROR task=test-error reason=termination_failed evidence=ev-critical-error",
    "FINDING id=finding-critical severity=major evidence=ev-critical-finding",
    "ADMISSION task=test-refused state=refused_changed_surface authority=package.json,vitest.config.ts",
    "GAP kind=NOT_EXERCISED path=src/critical.ts line=42",
    "GAP kind=UNRESOLVED path=src/critical.ts line=43 reason=coverage_mapping_unresolved",
    "TEST_CHANGE kind=test_file_deleted path=tests/legacy.test.ts",
    "EVIDENCE ev-critical-error task=test-error kind=stderr",
    "EVIDENCE ev-critical-finding task=test-error kind=test_result",
    "OMITTED tasks=80 findings=18 exercise_gaps=148 test_changes=11 evidence=25",
  ].join("\n"),
};

describe("T066 bounded agent receipt contract", () => {
  it("fixes the default budget to 16 KiB of UTF-8 bytes", () => {
    expect(AGENT_MAX_UTF8_BYTES).toBe(16_384);

    const multibyteProbe = "界".repeat(6_000);
    expect(multibyteProbe.length).toBeLessThan(AGENT_MAX_UTF8_BYTES);
    expect(utf8Bytes(multibyteProbe)).toBeGreaterThan(AGENT_MAX_UTF8_BYTES);
  });

  it("preserves identity, task-status truth, admission, gaps, completeness, and resolvable evidence", () => {
    expectWithinAgentBudget(COMPACT_CASE);
    expectIdentityAndSummaryPreserved(COMPACT_CASE);
    expectEvidenceRefsResolvable(COMPACT_CASE);
    expectOmittedTotalsConsistent(COMPACT_CASE);

    expect(COMPACT_CASE.rendered).toContain("state=refused_changed_surface");
    expect(COMPACT_CASE.rendered).toContain("authority=vitest.config.ts");
    expect(COMPACT_CASE.rendered).toContain("kind=NOT_EXERCISED");
    expect(COMPACT_CASE.rendered).toContain("kind=UNRESOLVED");
    expect(COMPACT_CASE.rendered).toContain("TEST_CHANGE kind=snapshot_deleted");
  });

  it("keeps critical detail ahead of lower-priority omission accounting under pressure", () => {
    expectWithinAgentBudget(PRESSURE_CASE);
    expectIdentityAndSummaryPreserved(PRESSURE_CASE);
    expectEvidenceRefsResolvable(PRESSURE_CASE);
    expectOmittedTotalsConsistent(PRESSURE_CASE);
    expectPriorityOrder(PRESSURE_CASE);

    expect(PRESSURE_CASE.rendered).toContain("findings=20");
    expect(PRESSURE_CASE.rendered).toContain("exercise_gaps=150");
    expect(PRESSURE_CASE.rendered).toContain("test_changes=12");
    expect(PRESSURE_CASE.rendered).toContain("evidence=27");
    expect(PRESSURE_CASE.rendered).toContain(
      "OMITTED tasks=80 findings=18 exercise_gaps=148 test_changes=11 evidence=25",
    );
  });

  it("rejects omission accounting that makes missing detail look absent from run truth", () => {
    const dishonest: AgentProjectionCase = {
      ...PRESSURE_CASE,
      omitted: { ...PRESSURE_CASE.omitted, findings: 0 },
    };

    expect(() => expectOmittedTotalsConsistent(dishonest)).toThrow();
  });

  it("rejects a retained evidence reference that no longer resolves after truncation", () => {
    const dangling: AgentProjectionCase = {
      ...PRESSURE_CASE,
      retained_evidence_ids: ["ev-critical-error"],
    };

    expect(() => expectEvidenceRefsResolvable(dangling)).toThrow();
  });

  it("rejects an agent candidate whose UTF-8 encoding exceeds the budget", () => {
    const oversized: AgentProjectionCase = {
      ...COMPACT_CASE,
      rendered: `${COMPACT_CASE.rendered}\n${"界".repeat(6_000)}`,
    };

    expect(() => expectWithinAgentBudget(oversized)).toThrow();
  });
});
