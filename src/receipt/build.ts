import {
  decideReceiptExitCode,
  deriveReceiptCompleteness,
  type ArtifactV1,
  type ChangedCodeV1,
  type ComparisonV1,
  type EvidenceV1,
  type ExerciseV1,
  type FindingV1,
  type ReceiptV1,
  type RunReceiptV1,
  type SelectionV1,
  type SourceStateV1,
  type Stability,
  type TaskResultV1,
  type TaskStatusCountsV1,
  type TaskStatus,
  type TestChangeV1,
} from "./model.js";

export interface BuildReceiptInput {
  readonly run: RunReceiptV1;
  readonly sourceStart: SourceStateV1;
  readonly sourceEnd: SourceStateV1 | null;
  readonly comparison: ComparisonV1;
  readonly selection: SelectionV1;
  readonly tasks: readonly TaskResultV1[];
  readonly exercise: ExerciseV1;
  readonly testChanges: readonly TestChangeV1[];
  readonly findings: readonly FindingV1[];
  readonly evidence: readonly EvidenceV1[];
  readonly artifacts: readonly ArtifactV1[];
}

function countTaskStatuses(tasks: readonly TaskResultV1[]): TaskStatusCountsV1 {
  const counts: Record<TaskStatus, number> = {
    PASS: 0,
    FAIL: 0,
    FLAKY: 0,
    BLOCKED: 0,
    ERROR: 0,
    NOT_APPLICABLE: 0,
    NOT_RUN: 0,
  };
  for (const task of tasks) counts[task.status] += 1;
  return counts;
}

function deriveStability(sourceStart: SourceStateV1, sourceEnd: SourceStateV1 | null): Stability {
  if (
    sourceEnd === null ||
    sourceEnd.repository_id !== sourceStart.repository_id ||
    sourceEnd.repository_id_kind !== sourceStart.repository_id_kind
  ) {
    return "unknown";
  }
  return sourceEnd.tree_digest === sourceStart.tree_digest ? "stable" : "tree_drifted";
}

function deriveComparison(
  comparison: ComparisonV1,
  tasks: readonly TaskResultV1[],
): ComparisonV1 {
  const changedAuthorityPaths = new Set(
    tasks.flatMap((task) => task.changed_authority_paths),
  );

  return {
    ...comparison,
    changed_files: comparison.changed_files.map((file) => ({
      ...file,
      is_command_surface:
        file.is_command_surface ||
        changedAuthorityPaths.has(file.path) ||
        (file.previous_path !== undefined && changedAuthorityPaths.has(file.previous_path)),
    })),
  };
}

function deriveTaskTiming(tasks: readonly TaskResultV1[]): readonly TaskResultV1[] {
  return tasks.map((task) => {
    if (task.started_at === null || task.finished_at === null || task.duration_ms === null) {
      return task;
    }
    const started = Date.parse(task.started_at);
    const finished = Date.parse(task.finished_at);
    if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) {
      return task;
    }
    return {
      ...task,
      duration_ms: finished - started,
    };
  });
}

function deriveChangedCode(comparison: ComparisonV1): ChangedCodeV1 {
  let changedTextLineCount = 0;
  for (const file of comparison.changed_files) {
    if (file.line_semantics !== "text") continue;
    for (const [start, end] of file.changed_new_line_ranges) changedTextLineCount += end - start + 1;
  }
  return {
    changed_file_count: comparison.changed_files.length,
    changed_text_line_count: changedTextLineCount,
  };
}

/**
 * Deterministically assembles the terminal M1 receipt. Derived sections are
 * computed once here; summary completeness and exit code reuse the canonical
 * semantic derivations so the builder can never contradict them.
 */
export function buildReceipt(input: BuildReceiptInput): ReceiptV1 {
  const stability = deriveStability(input.sourceStart, input.sourceEnd);
  const tasks = deriveTaskTiming(input.tasks);
  const comparison = deriveComparison(input.comparison, tasks);
  const changedCode = deriveChangedCode(comparison);
  const taskStatusCounts = countTaskStatuses(tasks);

  const base = {
    schema_version: "1.0" as const,
    run: input.run,
    source: {
      start: input.sourceStart,
      end: input.sourceEnd,
    },
    comparison,
    selection: input.selection,
    tasks,
    changed_code: changedCode,
    exercise: input.exercise,
    test_changes: input.testChanges,
    findings: input.findings,
    evidence: input.evidence,
    artifacts: input.artifacts,
    stability,
  };

  const completeness = deriveReceiptCompleteness({
    ...base,
    summary: {
      task_status_counts: taskStatusCounts,
      finding_count: input.findings.length,
      completeness: "complete",
      exit_code: 0,
    },
  });

  const exitCode = decideReceiptExitCode({
    ...base,
    summary: {
      task_status_counts: taskStatusCounts,
      finding_count: input.findings.length,
      completeness,
      exit_code: 0,
    },
  });

  return {
    ...base,
    summary: {
      task_status_counts: taskStatusCounts,
      finding_count: input.findings.length,
      completeness,
      exit_code: exitCode,
    },
  };
}

const STATUS_ORDER: readonly TaskStatus[] = [
  "PASS",
  "FAIL",
  "FLAKY",
  "BLOCKED",
  "ERROR",
  "NOT_APPLICABLE",
  "NOT_RUN",
];

function admissionMark(task: TaskResultV1): string {
  if (task.execution_admission === "refused_changed_surface") return " [refused]";
  if (task.execution_admission === "explicit_changed_surface_override") return " [admitted]";
  return "";
}

/**
 * Renders the concise human-facing terminal summary: changed scope, task
 * matrix, admissions/omissions, stability/completeness. No raw logs.
 */
export function renderTerminalSummary(receipt: ReceiptV1): string {
  const lines: string[] = [];

  lines.push(`ascout run ${receipt.run.run_id}`);
  lines.push(
    `source ${receipt.source.start.head_sha} (${receipt.source.start.repository_id_kind}) stability=${receipt.stability}`,
  );
  lines.push(
    `changed scope: ${receipt.changed_code.changed_file_count} file(s), ${receipt.changed_code.changed_text_line_count} changed line(s)`,
  );

  lines.push("tasks:");
  for (const task of receipt.tasks) {
    let line = `  [${task.status}] ${task.task_id} (${task.task_type})${admissionMark(task)}`;
    if (task.reason_text !== null) line += ` - ${task.reason_text}`;
    lines.push(line);
    if (task.changed_authority_paths.length > 0) {
      lines.push(`    changed authority: ${task.changed_authority_paths.join(", ")}`);
    }
  }

  const refusals = receipt.tasks.filter((task) => task.execution_admission === "refused_changed_surface");
  if (refusals.length > 0) {
    lines.push(
      `admission refused for ${refusals.map((task) => task.task_id).join(", ")}. After human review of the changed command surface, rerun with:`,
    );
    lines.push("  ascout check --allow-changed-command-surface");
  }

  const omissions = receipt.tasks.filter(
    (task) => task.status === "NOT_RUN" || task.status === "BLOCKED" || task.status === "ERROR",
  );
  if (omissions.length > 0) {
    lines.push("omissions:");
    for (const task of omissions) {
      lines.push(`  ${task.task_id}: ${task.status}(${task.reason_code ?? "unknown"}) ${task.reason_text ?? ""}`.trimEnd());
    }
  }

  lines.push(
    `completeness=${receipt.summary.completeness} exit=${receipt.summary.exit_code} findings=${receipt.summary.finding_count}`,
  );
  lines.push(
    `statuses: ${STATUS_ORDER.map((status) => `${status}=${receipt.summary.task_status_counts[status]}`).join(" ")}`,
  );

  return lines.join("\n");
}
