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

const STATUS_ORDER: readonly TaskStatus[] = [
  "PASS",
  "FAIL",
  "FLAKY",
  "BLOCKED",
  "ERROR",
  "NOT_APPLICABLE",
  "NOT_RUN",
];

interface AdmissionTruth {
  readonly task_id: string;
  readonly state: TaskResultV1["execution_admission"];
  readonly changed_authority_paths: readonly string[];
}

interface ExerciseTruth {
  readonly changed_executable_lines: number;
  readonly exercised_lines: number;
  readonly not_exercised_lines: number;
  readonly unresolved_lines: number;
  readonly changed_files_with_zero_exercised_lines: number;
}

interface CrossFormatCoreTruth {
  readonly head_sha: string;
  readonly repository_id_kind: SourceStateV1["repository_id_kind"];
  readonly stability: ReceiptV1["stability"];
  readonly changed_file_count: number;
  readonly changed_text_line_count: number;
  readonly task_status_counts: TaskStatusCountsV1;
  readonly admissions: readonly AdmissionTruth[];
  readonly exercise: ExerciseTruth;
  readonly finding_count: number;
  readonly completeness: ReceiptV1["summary"]["completeness"];
  readonly exit_code: ReceiptV1["summary"]["exit_code"];
}

interface MachineAgentTruth {
  readonly repository_id: string;
  readonly evidence_ids: readonly string[];
  readonly test_changes: readonly string[];
}

interface AgentContractVector {
  readonly core: CrossFormatCoreTruth;
  readonly machine: MachineAgentTruth;
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
          line_semantics: "text",
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

function coreTruth(receipt: ReceiptV1): CrossFormatCoreTruth {
  return {
    head_sha: receipt.source.start.head_sha,
    repository_id_kind: receipt.source.start.repository_id_kind,
    stability: receipt.stability,
    changed_file_count: receipt.changed_code.changed_file_count,
    changed_text_line_count: receipt.changed_code.changed_text_line_count,
    task_status_counts: { ...receipt.summary.task_status_counts },
    admissions: receipt.tasks
      .filter((task) => task.execution_admission !== "normal")
      .map((task) => ({
        task_id: task.task_id,
        state: task.execution_admission,
        changed_authority_paths: [...task.changed_authority_paths],
      })),
    exercise: {
      changed_executable_lines: receipt.exercise.changed_executable_lines,
      exercised_lines: receipt.exercise.exercised_lines,
      not_exercised_lines: receipt.exercise.not_exercised_lines,
      unresolved_lines: receipt.exercise.unresolved_lines,
      changed_files_with_zero_exercised_lines:
        receipt.exercise.changed_files_with_zero_exercised_lines,
    },
    finding_count: receipt.summary.finding_count,
    completeness: receipt.summary.completeness,
    exit_code: receipt.summary.exit_code,
  };
}

function machineAgentTruth(receipt: ReceiptV1): MachineAgentTruth {
  return {
    repository_id: receipt.source.start.repository_id,
    evidence_ids: receipt.evidence.map((evidence) => evidence.evidence_id),
    test_changes: receipt.test_changes.map((change) => `${change.kind}:${change.path}`),
  };
}

function parseTerminalTruth(summary: string): CrossFormatCoreTruth {
  const lines = summary.split("\n");
  const sourceLine = lines.find((line) => line.startsWith("source "));
  const changedLine = lines.find((line) => line.startsWith("changed scope: "));
  const exerciseLine = lines.find((line) => line.startsWith("exercise: "));
  const completenessLine = lines.find((line) => line.startsWith("completeness="));
  const statusesLine = lines.find((line) => line.startsWith("statuses: "));
  if (
    sourceLine === undefined ||
    changedLine === undefined ||
    exerciseLine === undefined ||
    completenessLine === undefined ||
    statusesLine === undefined
  ) {
    throw new Error("terminal summary is missing a canonical truth record");
  }

  const source = /^source ([0-9a-f]{40}|[0-9a-f]{64}) \((remote|local_only)\) stability=(stable|tree_drifted|unknown)$/.exec(
    sourceLine,
  );
  const changed = /^changed scope: (\d+) file\(s\), (\d+) changed line\(s\)$/.exec(changedLine);
  const exercise = /^exercise: changed_executable=(\d+) exercised=(\d+) not_exercised=(\d+) unresolved=(\d+) zero_exercised_files=(\d+)$/.exec(
    exerciseLine,
  );
  const completeness = /^completeness=(complete|materially_incomplete|unknown_due_to_error) exit=([0-4]) findings=(\d+)$/.exec(
    completenessLine,
  );
  if (source === null || changed === null || exercise === null || completeness === null) {
    throw new Error("terminal summary contains malformed canonical truth");
  }

  const statusTokens = statusesLine.slice("statuses: ".length).split(" ");
  const taskStatusCounts = {} as Record<TaskStatus, number>;
  if (statusTokens.length !== STATUS_ORDER.length) {
    throw new Error("terminal status count record has the wrong arity");
  }
  for (const [index, status] of STATUS_ORDER.entries()) {
    const token = statusTokens[index];
    const match = new RegExp(`^${status}=(\\d+)$`).exec(token ?? "");
    if (match === null) throw new Error(`terminal status count missing ${status}`);
    taskStatusCounts[status] = Number.parseInt(match[1]!, 10);
  }

  const admissions: AdmissionTruth[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const taskMatch = /^  \[(?:PASS|FAIL|FLAKY|BLOCKED|ERROR|NOT_APPLICABLE|NOT_RUN)\] ([^ ]+) \([^)]*\) \[(refused|admitted)\](?: - .*)?$/.exec(
      lines[index]!,
    );
    if (taskMatch === null) continue;
    const authority = /^    changed authority: (.+)$/.exec(lines[index + 1] ?? "");
    if (authority === null) throw new Error("admission detail is missing changed authority paths");
    admissions.push({
      task_id: taskMatch[1]!,
      state:
        taskMatch[2] === "refused"
          ? "refused_changed_surface"
          : "explicit_changed_surface_override",
      changed_authority_paths: authority[1]!.split(", "),
    });
  }

  return {
    head_sha: source[1]!,
    repository_id_kind: source[2]! as SourceStateV1["repository_id_kind"],
    stability: source[3]! as ReceiptV1["stability"],
    changed_file_count: Number.parseInt(changed[1]!, 10),
    changed_text_line_count: Number.parseInt(changed[2]!, 10),
    task_status_counts: taskStatusCounts,
    admissions,
    exercise: {
      changed_executable_lines: Number.parseInt(exercise[1]!, 10),
      exercised_lines: Number.parseInt(exercise[2]!, 10),
      not_exercised_lines: Number.parseInt(exercise[3]!, 10),
      unresolved_lines: Number.parseInt(exercise[4]!, 10),
      changed_files_with_zero_exercised_lines: Number.parseInt(exercise[5]!, 10),
    },
    finding_count: Number.parseInt(completeness[3]!, 10),
    completeness: completeness[1]! as ReceiptV1["summary"]["completeness"],
    exit_code: Number.parseInt(completeness[2]!, 10) as ReceiptV1["summary"]["exit_code"],
  };
}

function futureAgentVector(receipt: ReceiptV1): string {
  const core = coreTruth(receipt);
  const machine = machineAgentTruth(receipt);
  const statuses = STATUS_ORDER.map(
    (status) => `${status}=${core.task_status_counts[status]}`,
  ).join(",");
  const admissions = core.admissions
    .map(
      (admission) =>
        `${admission.task_id}:${admission.state}:${admission.changed_authority_paths.join("+")}`,
    )
    .join(",");

  return [
    `SOURCE head=${core.head_sha} kind=${core.repository_id_kind} stability=${core.stability} repo=${machine.repository_id}`,
    `SUMMARY completeness=${core.completeness} exit=${core.exit_code} findings=${core.finding_count} changed_files=${core.changed_file_count} changed_lines=${core.changed_text_line_count}`,
    `STATUSES ${statuses}`,
    `ADMISSIONS ${admissions}`,
    `EXERCISE changed=${core.exercise.changed_executable_lines} exercised=${core.exercise.exercised_lines} not_exercised=${core.exercise.not_exercised_lines} unresolved=${core.exercise.unresolved_lines} zero_files=${core.exercise.changed_files_with_zero_exercised_lines}`,
    `EVIDENCE ${machine.evidence_ids.join(",")}`,
    `TEST_CHANGES ${machine.test_changes.join(",")}`,
  ].join("\n");
}

function parseFutureAgentVector(vector: string): AgentContractVector {
  const lines = vector.split("\n");
  if (lines.length !== 7) throw new Error("future agent vector must contain exactly seven truth records");

  const source = /^SOURCE head=([0-9a-f]{40}|[0-9a-f]{64}) kind=(remote|local_only) stability=(stable|tree_drifted|unknown) repo=(.+)$/.exec(
    lines[0]!,
  );
  const summary = /^SUMMARY completeness=(complete|materially_incomplete|unknown_due_to_error) exit=([0-4]) findings=(\d+) changed_files=(\d+) changed_lines=(\d+)$/.exec(
    lines[1]!,
  );
  const exercise = /^EXERCISE changed=(\d+) exercised=(\d+) not_exercised=(\d+) unresolved=(\d+) zero_files=(\d+)$/.exec(
    lines[4]!,
  );
  if (source === null || summary === null || exercise === null) {
    throw new Error("future agent vector contains malformed core truth");
  }

  const statusText = lines[2]!.replace(/^STATUSES /, "");
  const statusTokens = statusText.split(",");
  const taskStatusCounts = {} as Record<TaskStatus, number>;
  if (statusTokens.length !== STATUS_ORDER.length) throw new Error("future agent statuses have wrong arity");
  for (const [index, status] of STATUS_ORDER.entries()) {
    const match = new RegExp(`^${status}=(\\d+)$`).exec(statusTokens[index] ?? "");
    if (match === null) throw new Error(`future agent status missing ${status}`);
    taskStatusCounts[status] = Number.parseInt(match[1]!, 10);
  }

  const admissionsText = lines[3]!.replace(/^ADMISSIONS /, "");
  const admissions: AdmissionTruth[] = admissionsText.length === 0
    ? []
    : admissionsText.split(",").map((record) => {
        const [taskId, state, paths] = record.split(":");
        if (
          taskId === undefined ||
          (state !== "refused_changed_surface" && state !== "explicit_changed_surface_override") ||
          paths === undefined
        ) {
          throw new Error("future agent admission record is malformed");
        }
        return {
          task_id: taskId,
          state,
          changed_authority_paths: paths.split("+").filter((path) => path.length > 0),
        };
      });

  const evidenceText = lines[5]!.replace(/^EVIDENCE /, "");
  const testChangesText = lines[6]!.replace(/^TEST_CHANGES /, "");

  return {
    core: {
      head_sha: source[1]!,
      repository_id_kind: source[2]! as SourceStateV1["repository_id_kind"],
      stability: source[3]! as ReceiptV1["stability"],
      changed_file_count: Number.parseInt(summary[4]!, 10),
      changed_text_line_count: Number.parseInt(summary[5]!, 10),
      task_status_counts: taskStatusCounts,
      admissions,
      exercise: {
        changed_executable_lines: Number.parseInt(exercise[1]!, 10),
        exercised_lines: Number.parseInt(exercise[2]!, 10),
        not_exercised_lines: Number.parseInt(exercise[3]!, 10),
        unresolved_lines: Number.parseInt(exercise[4]!, 10),
        changed_files_with_zero_exercised_lines: Number.parseInt(exercise[5]!, 10),
      },
      finding_count: Number.parseInt(summary[3]!, 10),
      completeness: summary[1]! as ReceiptV1["summary"]["completeness"],
      exit_code: Number.parseInt(summary[2]!, 10) as ReceiptV1["summary"]["exit_code"],
    },
    machine: {
      repository_id: source[4]!,
      evidence_ids: evidenceText.length === 0 ? [] : evidenceText.split(","),
      test_changes: testChangesText.length === 0 ? [] : testChangesText.split(","),
    },
  };
}

function acceptedForTerminal(candidate: unknown): string {
  return renderTerminalSummary(validateReceiptForAcceptance(candidate));
}

function acceptedForFutureAgent(candidate: unknown): string {
  return futureAgentVector(validateReceiptForAcceptance(candidate));
}

describe("T067 cross-format consistency contract", () => {
  it("derives terminal, JSON, and future-agent truth from the same accepted ReceiptV1", () => {
    const accepted = validateReceiptForAcceptance(receiptFixture());
    const expectedCore = coreTruth(accepted);
    const expectedMachine = machineAgentTruth(accepted);

    const terminalTruth = parseTerminalTruth(renderTerminalSummary(accepted));
    const jsonReceipt = validateReceiptForAcceptance(JSON.parse(renderReceiptJson(accepted)));
    const agentTruth = parseFutureAgentVector(futureAgentVector(accepted));

    expect(terminalTruth).toEqual(expectedCore);
    expect(coreTruth(jsonReceipt)).toEqual(expectedCore);
    expect(agentTruth.core).toEqual(expectedCore);
    expect(machineAgentTruth(jsonReceipt)).toEqual(expectedMachine);
    expect(agentTruth.machine).toEqual(expectedMachine);

    expect(expectedCore).toMatchObject({
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
      exercise: {
        changed_executable_lines: 2,
        exercised_lines: 0,
        not_exercised_lines: 1,
        unresolved_lines: 1,
      },
    });
  });

  it("requires canonical schema and semantic acceptance before every format path", () => {
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
    expect(() => acceptedForTerminal(invalid)).toThrow();
    expect(() => acceptedForFutureAgent(invalid)).toThrow();
  });

  it("does not let the machine/agent-only evidence and test-change projection diverge from accepted JSON truth", () => {
    const accepted = validateReceiptForAcceptance(receiptFixture());
    const jsonReceipt = validateReceiptForAcceptance(JSON.parse(renderReceiptJson(accepted)));
    const agentTruth = parseFutureAgentVector(acceptedForFutureAgent(accepted));

    expect(agentTruth.machine).toEqual(machineAgentTruth(jsonReceipt));
    expect(agentTruth.machine).toEqual({
      repository_id: accepted.source.start.repository_id,
      evidence_ids: ["test.e1"],
      test_changes: ["test_file_deleted:tests/old.test.ts"],
    });
  });
});
