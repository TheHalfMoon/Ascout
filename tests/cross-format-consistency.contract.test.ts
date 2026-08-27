import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import { buildReceipt, renderTerminalSummary } from "../src/receipt/build.js";
import {
  renderReceiptJson,
  validateReceiptForAcceptance,
} from "../src/receipt/json.js";
import type {
  ReceiptV1,
  SourceStateV1,
  TaskResultV1,
  TaskStatus,
  TaskStatusCountsV1,
} from "../src/receipt/model.js";

const AGENT_MAX_UTF8_BYTES = 16 * 1024;
const STATUS_ORDER: readonly TaskStatus[] = [
  "PASS",
  "FAIL",
  "FLAKY",
  "BLOCKED",
  "ERROR",
  "NOT_APPLICABLE",
  "NOT_RUN",
];
const AGENT_RECORD_PREFIXES = [
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

type Fields = Readonly<Record<string, string>>;

interface AdmissionTruth {
  readonly task_id: string;
  readonly state: TaskResultV1["execution_admission"];
  readonly changed_authority_paths: readonly string[];
}

interface CrossFormatTruth {
  readonly head_sha: string;
  readonly stability: ReceiptV1["stability"];
  readonly task_status_counts: TaskStatusCountsV1;
  readonly admissions: readonly AdmissionTruth[];
  readonly not_exercised_lines: number;
  readonly unresolved_lines: number;
  readonly finding_count: number;
  readonly completeness: ReceiptV1["summary"]["completeness"];
  readonly exit_code: ReceiptV1["summary"]["exit_code"];
}

interface MachineTruth {
  readonly repository_id: string;
  readonly evidence_ids: readonly string[];
  readonly test_changes: readonly string[];
}

interface ParsedAgentProjection {
  readonly header: Fields;
  readonly summary: Fields;
  readonly admissions: readonly Fields[];
  readonly gaps: readonly Fields[];
  readonly test_changes: readonly Fields[];
  readonly evidence: readonly Fields[];
  readonly omitted: Fields;
}

function sourceState(): SourceStateV1 {
  return {
    repository_id: `local:${"a".repeat(64)}`,
    repository_id_kind: "local_only",
    portable: false,
    head_sha: "b".repeat(40),
    detached: false,
    shallow: false,
    tree_digest_version: 1,
    tree_digest: "c".repeat(64),
    tracked_index_entry_count: 3,
    unstaged_changed_count: 3,
    included_untracked_count: 0,
  };
}

function passingTestTask(): TaskResultV1 {
  return {
    task_id: "test",
    task_type: "test",
    authorized_by: "discovery",
    source_path: "package.json",
    argv: ["vitest", "run"],
    argv_redacted: false,
    tool_name: "vitest",
    tool_version: "4.1.10",
    command_surface_changed: false,
    changed_authority_paths: [],
    execution_admission: "normal",
    status: "PASS",
    reason_code: null,
    reason_text: null,
    exit_code: 0,
    started_at: "2026-08-27T12:00:00.000Z",
    finished_at: "2026-08-27T12:00:01.000Z",
    duration_ms: 1000,
    observations: { runs: 1, failures: 0 },
    cache_state: "not_applicable",
    evidence_ids: ["test.e1"],
    artifact_refs: [],
    output_truncated: false,
  };
}

function refusedLintTask(): TaskResultV1 {
  return {
    task_id: "lint",
    task_type: "lint",
    authorized_by: "discovery",
    source_path: "package.json",
    argv: [],
    argv_redacted: false,
    tool_name: null,
    tool_version: null,
    command_surface_changed: true,
    changed_authority_paths: ["package.json"],
    execution_admission: "refused_changed_surface",
    status: "NOT_RUN",
    reason_code: "command_surface_changed",
    reason_text: "effective command or configuration authority changed in this invocation",
    exit_code: null,
    started_at: null,
    finished_at: null,
    duration_ms: null,
    observations: { runs: 0, failures: 0 },
    cache_state: "not_applicable",
    evidence_ids: [],
    artifact_refs: [],
    output_truncated: false,
  };
}

function receiptFixture(): ReceiptV1 {
  const source = sourceState();
  return buildReceipt({
    run: {
      run_id: "run-t067-cross-format",
      ascout_version: "0.1.0-m1",
      started_at: "2026-08-27T12:00:00.000Z",
      finished_at: "2026-08-27T12:00:02.000Z",
      config_digest: "d".repeat(64),
    },
    sourceStart: source,
    sourceEnd: { ...source },
    comparison: {
      kind: "working_tree_vs_head",
      base_ref: source.head_sha,
      includes_staged: true,
      includes_unstaged: true,
      includes_untracked_nonignored: true,
      changed_files: [
        {
          path: "package.json",
          change_kind: "modified",
          line_semantics: "text",
          changed_new_line_ranges: [[1, 1]],
          is_test_file: false,
          is_snapshot: false,
          is_command_surface: true,
        },
        {
          path: "src/a.ts",
          change_kind: "modified",
          line_semantics: "text",
          changed_new_line_ranges: [[1, 2]],
          is_test_file: false,
          is_snapshot: false,
          is_command_surface: false,
        },
        {
          path: "tests/old.test.ts",
          change_kind: "deleted",
          line_semantics: "deleted_only",
          changed_new_line_ranges: [],
          is_test_file: true,
          is_snapshot: false,
          is_command_surface: false,
        },
      ],
    },
    selection: {
      mode: "full",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: null,
      deselected_test_count: null,
      total_test_count: null,
      widened: false,
      widen_triggers: [],
      passes: [
        {
          ordinal: 1,
          mode: "full",
          scope: { kind: "repository", path: null },
          trigger: null,
          selected_test_count: null,
          deselected_test_count: null,
          total_test_count: null,
        },
      ],
      limitations: ["selection_counts_not_observed"],
    },
    tasks: [passingTestTask(), refusedLintTask()],
    exercise: {
      changed_executable_lines: 2,
      exercised_lines: 0,
      not_exercised_lines: 1,
      unresolved_lines: 1,
      changed_files_with_zero_exercised_lines: 1,
      records: [
        {
          path: "src/a.ts",
          line: 1,
          state: "NOT_EXERCISED",
          execution_count: 0,
          source_task_ids: ["test"],
        },
        {
          path: "src/a.ts",
          line: 2,
          state: "UNRESOLVED",
          execution_count: null,
          source_task_ids: ["test"],
          reason: "coverage_source_mapping_unresolved",
        },
      ],
    },
    testChanges: [
      {
        kind: "test_file_deleted",
        path: "tests/old.test.ts",
        source: "git_diff",
      },
    ],
    findings: [],
    evidence: [
      {
        evidence_id: "test.e1",
        run_id: "run-t067-cross-format",
        task_id: "test",
        sequence: 1,
        kind: "coverage",
        sha256: "e".repeat(64),
        artifact_id: null,
        redacted: false,
        truncated: false,
      },
    ],
    artifacts: [],
  });
}

function commonTruth(receipt: ReceiptV1): CrossFormatTruth {
  return {
    head_sha: receipt.source.start.head_sha,
    stability: receipt.stability,
    task_status_counts: { ...receipt.summary.task_status_counts },
    admissions: receipt.tasks
      .filter((task) => task.execution_admission !== "normal")
      .map((task) => ({
        task_id: task.task_id,
        state: task.execution_admission,
        changed_authority_paths: [...task.changed_authority_paths],
      })),
    not_exercised_lines: receipt.exercise.not_exercised_lines,
    unresolved_lines: receipt.exercise.unresolved_lines,
    finding_count: receipt.summary.finding_count,
    completeness: receipt.summary.completeness,
    exit_code: receipt.summary.exit_code,
  };
}

function machineTruth(receipt: ReceiptV1): MachineTruth {
  return {
    repository_id: receipt.source.start.repository_id,
    evidence_ids: receipt.evidence.map((evidence) => evidence.evidence_id),
    test_changes: receipt.test_changes.map((change) => `${change.kind}:${change.path}`),
  };
}

function parseTerminalTruth(summary: string): CrossFormatTruth {
  const lines = summary.split("\n");
  const sourceLine = lines.find((line) => line.startsWith("source "));
  const exerciseLine = lines.find((line) => line.startsWith("exercise: "));
  const completenessLine = lines.find((line) => line.startsWith("completeness="));
  const statusesLine = lines.find((line) => line.startsWith("statuses: "));
  if (
    sourceLine === undefined ||
    exerciseLine === undefined ||
    completenessLine === undefined ||
    statusesLine === undefined
  ) {
    throw new Error("terminal summary is missing canonical truth");
  }

  const source = /^source ([0-9a-f]{40}|[0-9a-f]{64}) \((?:remote|local_only)\) stability=(stable|tree_drifted|unknown)$/.exec(
    sourceLine,
  );
  const exercise = /^exercise: changed_executable=(\d+) exercised=(\d+) not_exercised=(\d+) unresolved=(\d+) zero_exercised_files=(\d+)$/.exec(
    exerciseLine,
  );
  const completeness = /^completeness=(complete|materially_incomplete|unknown_due_to_error) exit=([0-4]) findings=(\d+)$/.exec(
    completenessLine,
  );
  if (source === null || exercise === null || completeness === null) {
    throw new Error("terminal summary contains malformed canonical truth");
  }

  const statusTokens = statusesLine.slice("statuses: ".length).split(" ");
  if (statusTokens.length !== STATUS_ORDER.length) {
    throw new Error("terminal status record has the wrong arity");
  }
  const taskStatusCounts = {} as Record<TaskStatus, number>;
  for (const [index, status] of STATUS_ORDER.entries()) {
    const match = new RegExp(`^${status}=(\\d+)$`).exec(statusTokens[index] ?? "");
    if (match === null) throw new Error(`terminal status count missing ${status}`);
    taskStatusCounts[status] = Number.parseInt(match[1]!, 10);
  }

  const admissions: AdmissionTruth[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const task = /^  \[(?:PASS|FAIL|FLAKY|BLOCKED|ERROR|NOT_APPLICABLE|NOT_RUN)\] ([^ ]+) \([^)]*\) \[(refused|admitted)\](?: - .*)?$/.exec(
      lines[index]!,
    );
    if (task === null) continue;
    const authority = /^    changed authority: (.+)$/.exec(lines[index + 1] ?? "");
    if (authority === null) {
      throw new Error("terminal admission detail is missing changed authority paths");
    }
    admissions.push({
      task_id: task[1]!,
      state:
        task[2] === "refused"
          ? "refused_changed_surface"
          : "explicit_changed_surface_override",
      changed_authority_paths: authority[1]!.split(", "),
    });
  }

  return {
    head_sha: source[1]!,
    stability: source[2]! as ReceiptV1["stability"],
    task_status_counts: taskStatusCounts,
    admissions,
    not_exercised_lines: Number.parseInt(exercise[3]!, 10),
    unresolved_lines: Number.parseInt(exercise[4]!, 10),
    finding_count: Number.parseInt(completeness[3]!, 10),
    completeness: completeness[1]! as ReceiptV1["summary"]["completeness"],
    exit_code: Number.parseInt(completeness[2]!, 10) as ReceiptV1["summary"]["exit_code"],
  };
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
    if (Object.hasOwn(fields, key)) throw new Error(`duplicate agent field: ${key}`);
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
  if (Buffer.byteLength(rendered, "utf8") > AGENT_MAX_UTF8_BYTES) {
    throw new Error("agent projection exceeds 16 KiB UTF-8 budget");
  }
  const lines = rendered.split("\n");
  if (lines.some((line) => line.length === 0)) throw new Error("empty agent record");
  for (const line of lines) {
    if (!AGENT_RECORD_PREFIXES.some((prefix) => line.startsWith(prefix))) {
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
    header: exactlyOneRecord(lines, "ASCOUT_AGENT_V1 "),
    summary: exactlyOneRecord(lines, "SUMMARY "),
    admissions: recordsWithPrefix(lines, "ADMISSION "),
    gaps: recordsWithPrefix(lines, "GAP "),
    test_changes: recordsWithPrefix(lines, "TEST_CHANGE "),
    evidence: recordsWithPrefix(lines, "EVIDENCE "),
    omitted: exactlyOneRecord(lines, "OMITTED "),
  };
}

/**
 * T067 is contract-only. T069 owns the production bounded agent renderer.
 * This projection exists only to lock the T066 grammar against the same
 * semantically accepted ReceiptV1 used by terminal and JSON.
 */
function projectAgentContract(receipt: ReceiptV1): string {
  const representedTaskIds = new Set<string>();
  const lines: string[] = [
    `ASCOUT_AGENT_V1 repo=${receipt.source.start.repository_id} head=${receipt.source.start.head_sha} stability=${receipt.stability}`,
  ];
  const materialGaps = receipt.exercise.records.filter(
    (record) => record.state === "NOT_EXERCISED" || record.state === "UNRESOLVED",
  );
  lines.push(
    `SUMMARY completeness=${receipt.summary.completeness} exit=${receipt.summary.exit_code} tasks=${receipt.tasks.length} findings=${receipt.findings.length} exercise_gaps=${materialGaps.length} test_changes=${receipt.test_changes.length} evidence=${receipt.evidence.length} ${STATUS_ORDER.map((status) => `${status}=${receipt.summary.task_status_counts[status]}`).join(" ")}`,
  );

  for (const task of receipt.tasks) {
    if (task.status === "ERROR") {
      representedTaskIds.add(task.task_id);
      lines.push(`ERROR task=${task.task_id} reason=${task.reason_code ?? "unknown"}`);
    }
  }
  for (const finding of receipt.findings) {
    const evidence = finding.evidence_ids[0];
    const suffix = evidence === undefined ? "" : ` evidence=${evidence}`;
    lines.push(
      `FINDING id=${finding.finding_id} task=${finding.task_id} severity=${finding.severity}${suffix}`,
    );
  }
  for (const task of receipt.tasks) {
    if (task.execution_admission === "normal") continue;
    representedTaskIds.add(task.task_id);
    lines.push(
      `ADMISSION task=${task.task_id} state=${task.execution_admission} authority=${task.changed_authority_paths.join(",")}`,
    );
  }
  for (const record of materialGaps) {
    lines.push(
      record.state === "UNRESOLVED"
        ? `GAP kind=${record.state} path=${record.path} line=${record.line} reason=${record.reason}`
        : `GAP kind=${record.state} path=${record.path} line=${record.line}`,
    );
  }
  for (const change of receipt.test_changes) {
    lines.push(`TEST_CHANGE kind=${change.kind} path=${change.path}`);
  }
  for (const evidence of receipt.evidence) {
    lines.push(
      `EVIDENCE id=${evidence.evidence_id} task=${evidence.task_id} kind=${evidence.kind}`,
    );
  }
  lines.push(
    `OMITTED tasks=${receipt.tasks.length - representedTaskIds.size} findings=0 exercise_gaps=0 test_changes=0 evidence=0`,
  );
  return lines.join("\n");
}

function truthFromAgent(rendered: string): {
  readonly common: CrossFormatTruth;
  readonly machine: MachineTruth;
} {
  const parsed = parseAgentProjection(rendered);
  const expectedHeaderKeys = ["repo", "head", "stability"];
  expect(Object.keys(parsed.header).sort()).toEqual([...expectedHeaderKeys].sort());

  const expectedSummaryKeys = [
    "completeness",
    "exit",
    "tasks",
    "findings",
    "exercise_gaps",
    "test_changes",
    "evidence",
    ...STATUS_ORDER,
  ];
  expect(Object.keys(parsed.summary).sort()).toEqual([...expectedSummaryKeys].sort());
  expect(Object.keys(parsed.omitted).sort()).toEqual(
    ["tasks", "findings", "exercise_gaps", "test_changes", "evidence"].sort(),
  );

  const taskStatusCounts = {} as Record<TaskStatus, number>;
  for (const status of STATUS_ORDER) {
    const raw = parsed.summary[status];
    if (raw === undefined || !/^\d+$/.test(raw)) throw new Error(`invalid ${status} count`);
    taskStatusCounts[status] = Number.parseInt(raw, 10);
  }

  const admissions = parsed.admissions.map((record) => {
    expect(Object.keys(record).sort()).toEqual(["authority", "state", "task"].sort());
    if (
      record.task === undefined ||
      (record.state !== "refused_changed_surface" &&
        record.state !== "explicit_changed_surface_override") ||
      record.authority === undefined
    ) {
      throw new Error("malformed agent admission record");
    }
    return {
      task_id: record.task,
      state: record.state,
      changed_authority_paths: record.authority.split(","),
    };
  });

  let notExercised = 0;
  let unresolved = 0;
  for (const gap of parsed.gaps) {
    if (gap.kind === "NOT_EXERCISED") {
      expect(Object.keys(gap).sort()).toEqual(["kind", "line", "path"].sort());
      notExercised += 1;
    } else if (gap.kind === "UNRESOLVED") {
      expect(Object.keys(gap).sort()).toEqual(["kind", "line", "path", "reason"].sort());
      unresolved += 1;
    } else {
      throw new Error("agent gap kind is not material T066 truth");
    }
  }

  for (const evidence of parsed.evidence) {
    expect(Object.keys(evidence).sort()).toEqual(["id", "kind", "task"].sort());
  }
  for (const change of parsed.test_changes) {
    expect(Object.keys(change).sort()).toEqual(["kind", "path"].sort());
  }

  return {
    common: {
      head_sha: parsed.header.head!,
      stability: parsed.header.stability! as ReceiptV1["stability"],
      task_status_counts: taskStatusCounts,
      admissions,
      not_exercised_lines: notExercised,
      unresolved_lines: unresolved,
      finding_count: Number.parseInt(parsed.summary.findings!, 10),
      completeness: parsed.summary.completeness! as ReceiptV1["summary"]["completeness"],
      exit_code: Number.parseInt(parsed.summary.exit!, 10) as ReceiptV1["summary"]["exit_code"],
    },
    machine: {
      repository_id: parsed.header.repo!,
      evidence_ids: parsed.evidence.map((record) => record.id!),
      test_changes: parsed.test_changes.map((record) => `${record.kind}:${record.path}`),
    },
  };
}

function projectAcceptedFormats(candidate: unknown): {
  readonly accepted: ReceiptV1;
  readonly terminal: string;
  readonly json: string;
  readonly agent: string;
} {
  const accepted = validateReceiptForAcceptance(candidate);
  return {
    accepted,
    terminal: renderTerminalSummary(accepted),
    json: renderReceiptJson(accepted),
    agent: projectAgentContract(accepted),
  };
}

describe("T067 cross-format consistency contract", () => {
  it("derives terminal, JSON, and T066-agent truth from one semantically accepted ReceiptV1", () => {
    const formats = projectAcceptedFormats(receiptFixture());
    const expectedCommon = commonTruth(formats.accepted);
    const expectedMachine = machineTruth(formats.accepted);

    const terminalTruth = parseTerminalTruth(formats.terminal);
    const jsonReceipt = validateReceiptForAcceptance(JSON.parse(formats.json));
    const agentTruth = truthFromAgent(formats.agent);

    expect(terminalTruth).toEqual(expectedCommon);
    expect(commonTruth(jsonReceipt)).toEqual(expectedCommon);
    expect(agentTruth.common).toEqual(expectedCommon);
    expect(machineTruth(jsonReceipt)).toEqual(expectedMachine);
    expect(agentTruth.machine).toEqual(expectedMachine);
    expect(Buffer.byteLength(formats.agent, "utf8")).toBeLessThanOrEqual(AGENT_MAX_UTF8_BYTES);

    expect(expectedCommon).toMatchObject({
      stability: "stable",
      completeness: "materially_incomplete",
      exit_code: 4,
      finding_count: 0,
      task_status_counts: { PASS: 1, NOT_RUN: 1 },
      admissions: [
        {
          task_id: "lint",
          state: "refused_changed_surface",
          changed_authority_paths: ["package.json"],
        },
      ],
      not_exercised_lines: 1,
      unresolved_lines: 1,
    });
  });

  it("preserves machine-only evidence/test-change truth between validated JSON and T066 agent records", () => {
    const formats = projectAcceptedFormats(receiptFixture());
    const jsonReceipt = validateReceiptForAcceptance(JSON.parse(formats.json));
    const agentTruth = truthFromAgent(formats.agent);

    expect(agentTruth.machine).toEqual(machineTruth(jsonReceipt));
    expect(agentTruth.machine).toEqual({
      repository_id: formats.accepted.source.start.repository_id,
      evidence_ids: ["test.e1"],
      test_changes: ["test_file_deleted:tests/old.test.ts"],
    });
  });

  it("rejects contradictory receipt truth before any format projection", () => {
    const valid = receiptFixture();
    const invalid: ReceiptV1 = {
      ...valid,
      summary: {
        ...valid.summary,
        completeness: "complete",
        exit_code: 0,
      },
    };

    expect(() => validateReceiptForAcceptance(invalid)).toThrow();
    expect(() => renderReceiptJson(invalid)).toThrow();
    expect(() => projectAcceptedFormats(invalid)).toThrow();
  });
});
