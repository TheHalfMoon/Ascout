import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

const AGENT_MAX_UTF8_BYTES = 16 * 1024;
const TASK_STATUSES = [
  "PASS",
  "FAIL",
  "FLAKY",
  "BLOCKED",
  "ERROR",
  "NOT_APPLICABLE",
  "NOT_RUN",
] as const;
const PRIORITY_DETAIL_PREFIXES = [
  "ERROR ",
  "FINDING ",
  "ADMISSION ",
  "GAP ",
  "OMITTED ",
] as const;
const RECORD_PREFIXES = [
  "ASCOUT_AGENT_V1 ",
  "SUMMARY ",
  "ERROR ",
  "FINDING ",
  "ADMISSION ",
  "GAP ",
  "TEST_CHANGE ",
  "EVIDENCE ",
  "OMITTED ",
] as const;

interface TruthTotals {
  readonly tasks: number;
  readonly findings: number;
  readonly exercise_gaps: number;
  readonly test_changes: number;
  readonly evidence: number;
}

interface ExpectedDetails {
  readonly errors: readonly Fields[];
  readonly findings: readonly Fields[];
  readonly admissions: readonly Fields[];
  readonly gaps: readonly Fields[];
  readonly testChanges: readonly Fields[];
  readonly evidence: readonly Fields[];
}

interface AgentProjectionCase {
  readonly id: string;
  readonly rendered: string;
  readonly repository_id: string;
  readonly head_sha: string;
  readonly stability: "stable" | "tree_drifted" | "unknown";
  readonly completeness: "complete" | "materially_incomplete" | "unknown_due_to_error";
  readonly exit_code: 0 | 1 | 2 | 3 | 4;
  readonly task_status_counts: Readonly<Record<(typeof TASK_STATUSES)[number], number>>;
  readonly truth_totals: TruthTotals;
  readonly expected: ExpectedDetails;
}

type Fields = Readonly<Record<string, string>>;

interface ParsedAgentProjection {
  readonly lines: readonly string[];
  readonly header: Fields;
  readonly summary: Fields;
  readonly errors: readonly Fields[];
  readonly findings: readonly Fields[];
  readonly admissions: readonly Fields[];
  readonly gaps: readonly Fields[];
  readonly testChanges: readonly Fields[];
  readonly evidence: readonly Fields[];
  readonly omitted: Fields;
}

function utf8Bytes(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function parseFields(text: string): Fields {
  const fields: Record<string, string> = {};
  for (const token of text.split(" ")) {
    const separator = token.indexOf("=");
    if (separator <= 0 || separator === token.length - 1) {
      throw new Error(`malformed agent field: ${token}`);
    }
    const key = token.slice(0, separator);
    const value = token.slice(separator + 1);
    if (Object.hasOwn(fields, key)) {
      throw new Error(`duplicate agent field: ${key}`);
    }
    fields[key] = value;
  }
  return fields;
}

function recordsWithPrefix(lines: readonly string[], prefix: string): readonly Fields[] {
  return lines
    .filter((line) => line.startsWith(prefix))
    .map((line) => parseFields(line.slice(prefix.length)));
}

function exactlyOneRecord(lines: readonly string[], prefix: string): Fields {
  const records = recordsWithPrefix(lines, prefix);
  if (records.length !== 1) {
    throw new Error(`expected exactly one ${prefix.trim()} record, observed ${records.length}`);
  }
  return records[0]!;
}

function parseAgentProjection(rendered: string): ParsedAgentProjection {
  const lines = rendered.split("\n");
  if (lines.length === 0 || lines.some((line) => line.length === 0)) {
    throw new Error("agent projection contains an empty record");
  }
  for (const line of lines) {
    if (!RECORD_PREFIXES.some((prefix) => line.startsWith(prefix))) {
      throw new Error(`unknown agent record: ${line}`);
    }
  }
  if (!lines[0]!.startsWith("ASCOUT_AGENT_V1 ")) {
    throw new Error("agent identity record must be first");
  }
  if (!lines[1]!.startsWith("SUMMARY ")) {
    throw new Error("agent summary record must be second");
  }

  return {
    lines,
    header: exactlyOneRecord(lines, "ASCOUT_AGENT_V1 "),
    summary: exactlyOneRecord(lines, "SUMMARY "),
    errors: recordsWithPrefix(lines, "ERROR "),
    findings: recordsWithPrefix(lines, "FINDING "),
    admissions: recordsWithPrefix(lines, "ADMISSION "),
    gaps: recordsWithPrefix(lines, "GAP "),
    testChanges: recordsWithPrefix(lines, "TEST_CHANGE "),
    evidence: recordsWithPrefix(lines, "EVIDENCE "),
    omitted: exactlyOneRecord(lines, "OMITTED "),
  };
}

function nonnegativeInteger(fields: Fields, key: string): number {
  const raw = fields[key];
  if (raw === undefined || !/^(?:0|[1-9]\d*)$/.test(raw)) {
    throw new Error(`invalid nonnegative integer field ${key}`);
  }
  return Number.parseInt(raw, 10);
}

function expectExactFields(actual: Fields, expected: Fields): void {
  expect(actual).toEqual(expected);
}

function expectWithinAgentBudget(candidate: AgentProjectionCase): void {
  expect(utf8Bytes(candidate.rendered)).toBeLessThanOrEqual(AGENT_MAX_UTF8_BYTES);
}

function expectPriorityOrder(parsed: ParsedAgentProjection): void {
  const positions = PRIORITY_DETAIL_PREFIXES.map((prefix) =>
    parsed.lines.findIndex((line) => line.startsWith(prefix)),
  );
  for (const position of positions) {
    expect(position).toBeGreaterThanOrEqual(0);
  }
  for (let index = 1; index < positions.length; index += 1) {
    expect(positions[index - 1]!).toBeLessThan(positions[index]!);
  }
}

function expectEvidenceLinkage(parsed: ParsedAgentProjection): void {
  const evidenceIds = parsed.evidence.map((record) => record.id);
  expect(evidenceIds.every((id): id is string => id !== undefined)).toBe(true);
  expect(new Set(evidenceIds).size).toBe(evidenceIds.length);

  const evidenceById = new Map(parsed.evidence.map((record) => [record.id, record]));
  const referencingRecords = [...parsed.errors, ...parsed.findings];
  for (const record of referencingRecords) {
    const evidenceId = record.evidence;
    const taskId = record.task;
    expect(evidenceId).toBeDefined();
    expect(taskId).toBeDefined();
    const evidence = evidenceById.get(evidenceId!);
    expect(evidence).toBeDefined();
    expect(evidence!.task).toBe(taskId);
  }
}

function retainedCounts(parsed: ParsedAgentProjection): TruthTotals {
  const taskIds = new Set([
    ...parsed.errors.map((record) => record.task),
    ...parsed.admissions.map((record) => record.task),
  ]);
  if (taskIds.has(undefined)) {
    throw new Error("task detail missing task id");
  }
  return {
    tasks: taskIds.size,
    findings: parsed.findings.length,
    exercise_gaps: parsed.gaps.length,
    test_changes: parsed.testChanges.length,
    evidence: parsed.evidence.length,
  };
}

function expectOmissionAccounting(
  candidate: AgentProjectionCase,
  parsed: ParsedAgentProjection,
): void {
  const retained = retainedCounts(parsed);
  for (const key of Object.keys(candidate.truth_totals) as (keyof TruthTotals)[]) {
    const omitted = nonnegativeInteger(parsed.omitted, key);
    expect(retained[key] + omitted).toBe(candidate.truth_totals[key]);
  }
  expect(Object.keys(parsed.omitted).sort()).toEqual(
    ["tasks", "findings", "exercise_gaps", "test_changes", "evidence"].sort(),
  );
}

function expectProjectionMatchesTruth(candidate: AgentProjectionCase): ParsedAgentProjection {
  expectWithinAgentBudget(candidate);
  const parsed = parseAgentProjection(candidate.rendered);

  expectExactFields(parsed.header, {
    repo: candidate.repository_id,
    head: candidate.head_sha,
    stability: candidate.stability,
  });

  const expectedSummary: Record<string, string> = {
    completeness: candidate.completeness,
    exit: String(candidate.exit_code),
    tasks: String(candidate.truth_totals.tasks),
    findings: String(candidate.truth_totals.findings),
    exercise_gaps: String(candidate.truth_totals.exercise_gaps),
    test_changes: String(candidate.truth_totals.test_changes),
    evidence: String(candidate.truth_totals.evidence),
  };
  for (const status of TASK_STATUSES) {
    expectedSummary[status] = String(candidate.task_status_counts[status]);
  }
  expectExactFields(parsed.summary, expectedSummary);

  const statusTotal = TASK_STATUSES.reduce(
    (sum, status) => sum + nonnegativeInteger(parsed.summary, status),
    0,
  );
  expect(statusTotal).toBe(candidate.truth_totals.tasks);

  expect(parsed.errors).toEqual(candidate.expected.errors);
  expect(parsed.findings).toEqual(candidate.expected.findings);
  expect(parsed.admissions).toEqual(candidate.expected.admissions);
  expect(parsed.gaps).toEqual(candidate.expected.gaps);
  expect(parsed.testChanges).toEqual(candidate.expected.testChanges);
  expect(parsed.evidence).toEqual(candidate.expected.evidence);

  expectEvidenceLinkage(parsed);
  expectOmissionAccounting(candidate, parsed);
  return parsed;
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
  truth_totals: { tasks: 3, findings: 1, exercise_gaps: 2, test_changes: 1, evidence: 2 },
  expected: {
    errors: [{ task: "test-error", reason: "launch_failed", evidence: "ev-error" }],
    findings: [
      { id: "finding-1", task: "test-error", severity: "major", evidence: "ev-finding" },
    ],
    admissions: [
      { task: "test-refused", state: "refused_changed_surface", authority: "vitest.config.ts" },
    ],
    gaps: [
      { kind: "NOT_EXERCISED", path: "src/a.ts", line: "12" },
      {
        kind: "UNRESOLVED",
        path: "src/b.ts",
        line: "9",
        reason: "coverage_mapping_unresolved",
      },
    ],
    testChanges: [
      { kind: "snapshot_deleted", path: "tests/__snapshots__/a.snap" },
    ],
    evidence: [
      { id: "ev-error", task: "test-error", kind: "stderr" },
      { id: "ev-finding", task: "test-error", kind: "test_result" },
    ],
  },
  rendered: [
    `ASCOUT_AGENT_V1 repo=remote:${"a".repeat(64)} head=${"b".repeat(40)} stability=stable`,
    "SUMMARY completeness=materially_incomplete exit=2 tasks=3 findings=1 exercise_gaps=2 test_changes=1 evidence=2 PASS=1 FAIL=0 FLAKY=0 BLOCKED=0 ERROR=1 NOT_APPLICABLE=0 NOT_RUN=1",
    "ERROR task=test-error reason=launch_failed evidence=ev-error",
    "FINDING id=finding-1 task=test-error severity=major evidence=ev-finding",
    "ADMISSION task=test-refused state=refused_changed_surface authority=vitest.config.ts",
    "GAP kind=NOT_EXERCISED path=src/a.ts line=12",
    "GAP kind=UNRESOLVED path=src/b.ts line=9 reason=coverage_mapping_unresolved",
    "TEST_CHANGE kind=snapshot_deleted path=tests/__snapshots__/a.snap",
    "EVIDENCE id=ev-error task=test-error kind=stderr",
    "EVIDENCE id=ev-finding task=test-error kind=test_result",
    "OMITTED tasks=1 findings=0 exercise_gaps=0 test_changes=0 evidence=0",
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
  truth_totals: { tasks: 82, findings: 20, exercise_gaps: 150, test_changes: 12, evidence: 27 },
  expected: {
    errors: [
      { task: "test-error", reason: "termination_failed", evidence: "ev-critical-error" },
    ],
    findings: [
      {
        id: "finding-critical",
        task: "test-error",
        severity: "major",
        evidence: "ev-critical-finding",
      },
      {
        id: "finding-secondary",
        task: "test-error",
        severity: "minor",
        evidence: "ev-secondary-finding",
      },
    ],
    admissions: [
      {
        task: "test-refused",
        state: "refused_changed_surface",
        authority: "package.json,vitest.config.ts",
      },
    ],
    gaps: [
      { kind: "NOT_EXERCISED", path: "src/critical.ts", line: "42" },
      {
        kind: "UNRESOLVED",
        path: "src/critical.ts",
        line: "43",
        reason: "coverage_mapping_unresolved",
      },
    ],
    testChanges: [{ kind: "test_file_deleted", path: "tests/legacy.test.ts" }],
    evidence: [
      { id: "ev-critical-error", task: "test-error", kind: "stderr" },
      { id: "ev-critical-finding", task: "test-error", kind: "test_result" },
      { id: "ev-secondary-finding", task: "test-error", kind: "test_result" },
    ],
  },
  rendered: [
    `ASCOUT_AGENT_V1 repo=local:${"c".repeat(64)} head=${"d".repeat(64)} stability=stable`,
    "SUMMARY completeness=materially_incomplete exit=4 tasks=82 findings=20 exercise_gaps=150 test_changes=12 evidence=27 PASS=80 FAIL=0 FLAKY=0 BLOCKED=0 ERROR=1 NOT_APPLICABLE=0 NOT_RUN=1",
    "ERROR task=test-error reason=termination_failed evidence=ev-critical-error",
    "FINDING id=finding-critical task=test-error severity=major evidence=ev-critical-finding",
    "FINDING id=finding-secondary task=test-error severity=minor evidence=ev-secondary-finding",
    "ADMISSION task=test-refused state=refused_changed_surface authority=package.json,vitest.config.ts",
    "GAP kind=NOT_EXERCISED path=src/critical.ts line=42",
    "GAP kind=UNRESOLVED path=src/critical.ts line=43 reason=coverage_mapping_unresolved",
    "TEST_CHANGE kind=test_file_deleted path=tests/legacy.test.ts",
    "EVIDENCE id=ev-critical-error task=test-error kind=stderr",
    "EVIDENCE id=ev-critical-finding task=test-error kind=test_result",
    "EVIDENCE id=ev-secondary-finding task=test-error kind=test_result",
    "OMITTED tasks=80 findings=18 exercise_gaps=148 test_changes=11 evidence=24",
  ].join("\n"),
};

describe("T066 bounded agent receipt contract", () => {
  it("fixes the default budget to 16 KiB of UTF-8 bytes", () => {
    expect(AGENT_MAX_UTF8_BYTES).toBe(16_384);
    const multibyteProbe = "界".repeat(6_000);
    expect(multibyteProbe.length).toBeLessThan(AGENT_MAX_UTF8_BYTES);
    expect(utf8Bytes(multibyteProbe)).toBeGreaterThan(AGENT_MAX_UTF8_BYTES);
  });

  it("parses compact records and preserves exact identity, status, admission, gap, test-change, and evidence truth", () => {
    const parsed = expectProjectionMatchesTruth(COMPACT_CASE);
    expect(parsed.admissions[0]).toEqual({
      task: "test-refused",
      state: "refused_changed_surface",
      authority: "vitest.config.ts",
    });
    expect(parsed.gaps.map((record) => record.kind)).toEqual([
      "NOT_EXERCISED",
      "UNRESOLVED",
    ]);
  });

  it("keeps critical detail ahead of omission accounting under pressure", () => {
    const parsed = expectProjectionMatchesTruth(PRESSURE_CASE);
    expectPriorityOrder(parsed);
    expect(parsed.omitted).toEqual({
      tasks: "80",
      findings: "18",
      exercise_gaps: "148",
      test_changes: "11",
      evidence: "24",
    });
  });

  it("rejects malformed or duplicated structured records instead of accepting matching substrings", () => {
    const duplicateSummary: AgentProjectionCase = {
      ...COMPACT_CASE,
      rendered: `${COMPACT_CASE.rendered}\nSUMMARY completeness=materially_incomplete exit=2`,
    };
    expect(() => expectProjectionMatchesTruth(duplicateSummary)).toThrow();

    const mislabeledAdmission: AgentProjectionCase = {
      ...COMPACT_CASE,
      rendered: COMPACT_CASE.rendered.replace(
        "ADMISSION task=test-refused state=refused_changed_surface authority=vitest.config.ts",
        "ADMISSION task=test-refused state=normal authority=vitest.config.ts",
      ),
    };
    expect(() => expectProjectionMatchesTruth(mislabeledAdmission)).toThrow();
  });

  it("rejects dishonest omission totals and evidence ownership/reference mismatches", () => {
    const dishonestOmissions: AgentProjectionCase = {
      ...PRESSURE_CASE,
      rendered: PRESSURE_CASE.rendered.replace("findings=18", "findings=0"),
    };
    expect(() => expectProjectionMatchesTruth(dishonestOmissions)).toThrow();

    const wrongEvidenceOwner: AgentProjectionCase = {
      ...COMPACT_CASE,
      rendered: COMPACT_CASE.rendered.replace(
        "EVIDENCE id=ev-error task=test-error kind=stderr",
        "EVIDENCE id=ev-error task=other-task kind=stderr",
      ),
    };
    expect(() => expectProjectionMatchesTruth(wrongEvidenceOwner)).toThrow();

    const danglingEvidence: AgentProjectionCase = {
      ...COMPACT_CASE,
      rendered: COMPACT_CASE.rendered.replace(
        "EVIDENCE id=ev-error task=test-error kind=stderr\n",
        "",
      ),
    };
    expect(() => expectProjectionMatchesTruth(danglingEvidence)).toThrow();
  });

  it("rejects an agent candidate whose UTF-8 encoding exceeds the budget", () => {
    const oversized: AgentProjectionCase = {
      ...COMPACT_CASE,
      rendered: `${COMPACT_CASE.rendered}\n${"界".repeat(6_000)}`,
    };
    expect(() => expectProjectionMatchesTruth(oversized)).toThrow();
  });
});
