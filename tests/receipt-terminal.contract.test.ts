import { describe, expect, it } from "vitest";
import { buildReceipt, renderTerminalSummary } from "../src/receipt/build.js";
import { renderReceiptJson, validateReceiptForAcceptance } from "../src/receipt/json.js";
import {
  validateReceiptSemantics,
  type ReceiptV1,
  type SourceStateV1,
  type TaskResultV1,
} from "../src/receipt/model.js";
import { decideTaskAdmission } from "../src/check.js";
import type { ChangedPathView } from "../src/discovery.js";

const RUN = {
  run_id: "run-t040",
  ascout_version: "0.0.0",
  started_at: "2026-08-24T00:00:00.000Z",
  finished_at: "2026-08-24T00:00:02.000Z",
  config_digest: "d".repeat(64),
};

function sourceState(treeDigest: string): SourceStateV1 {
  return {
    repository_id: `local:${"e".repeat(64)}`,
    repository_id_kind: "local_only",
    portable: false,
    head_sha: "a".repeat(40),
    detached: false,
    shallow: false,
    tree_digest_version: 1,
    tree_digest: treeDigest,
    tracked_index_entry_count: 4,
    unstaged_changed_count: 1,
    included_untracked_count: 0,
  };
}

const SELECTION = {
  mode: "native_related" as const,
  initial_scope: { kind: "repository" as const, path: null },
  selected_test_count: 2,
  deselected_test_count: 3,
  total_test_count: 5,
  widened: false,
  widen_triggers: [],
  passes: [
    {
      ordinal: 1 as const,
      mode: "native_related" as const,
      scope: { kind: "repository" as const, path: null },
      trigger: null,
      selected_test_count: 2,
      deselected_test_count: 3,
      total_test_count: 5,
    },
  ],
  limitations: [],
};

function passingTask(taskId: string): TaskResultV1 {
  return {
    task_id: taskId,
    task_type: taskId.includes("lint") ? "lint" : "test",
    authorized_by: "discovery",
    source_path: "package.json",
    argv: ["npm", "test"],
    argv_redacted: false,
    tool_name: "vitest",
    tool_version: "4.0.0",
    command_surface_changed: false,
    changed_authority_paths: [],
    execution_admission: "normal",
    status: "PASS",
    reason_code: null,
    reason_text: null,
    exit_code: 0,
    started_at: "2026-08-24T00:00:00.000Z",
    finished_at: "2026-08-24T00:00:01.000Z",
    duration_ms: 1000,
    observations: { runs: 1, failures: 0 },
    cache_state: "cold",
    evidence_ids: [],
    artifact_refs: [],
    output_truncated: false,
  };
}

function refusedTaskFromDecision(changedFiles: readonly ChangedPathView[]): TaskResultV1 {
  const decision = decideTaskAdmission(
    "test",
    ["package.json", "vitest.config.ts"],
    changedFiles,
    false,
  );
  const refusal = decision.refusal;
  if (refusal === null) throw new Error("expected refusal decision");
  return {
    task_id: "test-refused",
    task_type: "test",
    authorized_by: "discovery",
    source_path: "package.json",
    argv: [],
    argv_redacted: false,
    tool_name: null,
    tool_version: null,
    command_surface_changed: decision.commandSurfaceChanged,
    changed_authority_paths: [...decision.changedAuthorityPaths],
    execution_admission: decision.executionAdmission,
    status: refusal.status,
    reason_code: refusal.reasonCode,
    reason_text: refusal.reasonText,
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

interface BuildOptions {
  readonly endTreeDigest?: string | null;
  readonly tasks?: readonly TaskResultV1[];
  readonly textRanges?: readonly (readonly [number, number])[];
}

function buildInput(options: BuildOptions = {}): ReceiptV1 {
  const start = sourceState("b".repeat(64));
  const end =
    options.endTreeDigest === null
      ? null
      : sourceState(options.endTreeDigest ?? "b".repeat(64));
  const ranges = options.textRanges ?? ([[10, 12]] as const);

  return buildReceipt({
    run: RUN,
    sourceStart: start,
    sourceEnd: end,
    comparison: {
      kind: "working_tree_vs_head",
      base_ref: start.head_sha,
      includes_staged: true,
      includes_unstaged: true,
      includes_untracked_nonignored: true,
      changed_files: [
        {
          path: "package.json",
          change_kind: "modified",
          line_semantics: "text",
          changed_new_line_ranges: [[1, 2]],
          is_test_file: false,
          is_snapshot: false,
          is_command_surface: true,
        },
        {
          path: "src/a.ts",
          change_kind: "modified",
          line_semantics: "text",
          changed_new_line_ranges: [...ranges],
          is_test_file: false,
          is_snapshot: false,
          is_command_surface: false,
        },
      ],
    },
    selection: SELECTION,
    tasks: options.tasks ?? [passingTask("lint-1"), passingTask("test-1")],
    exercise: {
      changed_executable_lines: 0,
      exercised_lines: 0,
      not_exercised_lines: 0,
      unresolved_lines: 0,
      changed_files_with_zero_exercised_lines: 0,
      records: [],
    },
    testChanges: [],
    findings: [],
    evidence: [],
    artifacts: [],
  });
}

describe("T040 terminal receipt build", () => {
  it("derives stable/complete/exit 0 for an unchanged tree with all tasks passed", () => {
    const receipt = buildInput();

    expect(receipt.stability).toBe("stable");
    expect(receipt.summary.completeness).toBe("complete");
    expect(receipt.summary.exit_code).toBe(0);
    expect(receipt.summary.task_status_counts.PASS).toBe(2);
    expect(receipt.summary.finding_count).toBe(0);
    expect(receipt.changed_code.changed_file_count).toBe(2);
    expect(receipt.changed_code.changed_text_line_count).toBe(5);
  });

  it("derives tree_drifted and exit 3 when the end tree digest differs", () => {
    const receipt = buildInput({ endTreeDigest: "c".repeat(64) });

    expect(receipt.stability).toBe("tree_drifted");
    expect(receipt.summary.exit_code).toBe(3);
  });

  it("derives unknown stability and exit 2 when no end state was captured", () => {
    const receipt = buildInput({ endTreeDigest: null });

    expect(receipt.stability).toBe("unknown");
    expect(receipt.summary.exit_code).toBe(2);
  });

  it("maps an admission refusal into materially_incomplete and exit 4 without higher-precedence outcomes", () => {
    const receipt = buildInput({
      tasks: [passingTask("lint-1"), refusedTaskFromDecision([{ path: "vitest.config.ts" }])],
    });

    expect(receipt.tasks[1]).toMatchObject({
      status: "NOT_RUN",
      execution_admission: "refused_changed_surface",
      command_surface_changed: true,
      changed_authority_paths: ["vitest.config.ts"],
    });
    expect(receipt.summary.task_status_counts.NOT_RUN).toBe(1);
    expect(receipt.summary.completeness).toBe("materially_incomplete");
    expect(receipt.summary.exit_code).toBe(4);
  });

  it("ranks FAIL at exit 1 and ERROR at exit 2 above drift", () => {
    const failed: TaskResultV1 = {
      ...passingTask("test-1"),
      status: "FAIL",
      exit_code: 1,
      observations: { runs: 1, failures: 1 },
    };
    expect(buildInput({ tasks: [failed] }).summary.exit_code).toBe(1);

    const errored: TaskResultV1 = {
      ...passingTask("test-1"),
      status: "ERROR",
      reason_code: "launch_failed",
      reason_text: "process launch failed",
      exit_code: null,
      observations: { runs: 0, failures: 0 },
    };
    expect(buildInput({ tasks: [errored] }).summary.exit_code).toBe(2);

    const erroredAndDrifted = buildInput({
      endTreeDigest: "c".repeat(64),
      tasks: [errored],
    });
    expect(erroredAndDrifted.summary.exit_code).toBe(2);
  });

  it("counts only text changed-line ranges toward changed_text_line_count", () => {
    const receipt = buildInput({ textRanges: [] });
    expect(receipt.changed_code.changed_text_line_count).toBe(2);
  });

  it("emits a built receipt through the fail-closed JSON acceptance layer", () => {
    const receipt = buildInput();
    expect(validateReceiptSemantics(receipt).valid).toBe(true);

    const rendered = renderReceiptJson(receipt);
    expect(validateReceiptForAcceptance(JSON.parse(rendered))).toEqual(receipt);
  });
});

describe("T040 terminal summary rendering", () => {
  it("communicates scope, task matrix, admissions, omissions, and completeness without raw logs", () => {
    const admittedTask: TaskResultV1 = {
      ...passingTask("lint-1"),
      command_surface_changed: true,
      changed_authority_paths: ["package.json"],
      execution_admission: "explicit_changed_surface_override",
    };
    const summary = renderTerminalSummary(
      buildInput({
        tasks: [
          admittedTask,
          refusedTaskFromDecision([
            { path: "src/unrelated.ts" },
            { path: "vitest.config.ts" },
          ]),
        ],
      }),
    );

    expect(summary).toContain("[PASS] lint-1 (lint) [admitted]");
    expect(summary).toContain("changed authority: package.json");
    expect(summary).toContain("[NOT_RUN] test-refused (test) [refused]");
    expect(summary).toContain("changed authority: vitest.config.ts");
    expect(summary).toContain("command_surface_changed");
    expect(summary).toContain("ascout check --allow-changed-command-surface");
    expect(summary).toContain("omissions:");
    expect(summary).toMatch(/completeness=materially_incomplete exit=4 findings=0/);
    expect(summary).toContain("stability=stable");
    expect(summary).not.toContain("stdout");
    expect(summary.split("\n").length).toBeLessThan(30);
  });

  it("omits admission, override, and omission sections when nothing was refused or skipped", () => {
    const summary = renderTerminalSummary(buildInput());

    expect(summary).not.toContain("--allow-changed-command-surface");
    expect(summary).not.toContain("omissions:");
    expect(summary).toContain("completeness=complete exit=0");
    expect(summary).not.toContain("[admitted]");
  });
});
