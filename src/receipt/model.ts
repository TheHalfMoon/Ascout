export * from "./model-core.js";

import {
  validateReceiptSemantics as validateCoreReceiptSemantics,
  type ReceiptSemanticIssue,
  type ReceiptSemanticValidationResult,
  type ReceiptV1,
} from "./model-core.js";

function validateCommandSurfaceFileFacts(
  receipt: ReceiptV1,
  issues: ReceiptSemanticIssue[],
): void {
  const reportedFileMismatches = new Set<number>();

  for (const [taskIndex, task] of receipt.tasks.entries()) {
    for (const [authorityIndex, authorityPath] of task.changed_authority_paths.entries()) {
      const matches = receipt.comparison.changed_files
        .map((file, fileIndex) => ({ file, fileIndex }))
        .filter(
          ({ file }) =>
            file.path === authorityPath || file.previous_path === authorityPath,
        );

      if (matches.length === 0) {
        issues.push({
          code: "changed_authority_path_not_in_comparison",
          path: `tasks[${taskIndex}].changed_authority_paths[${authorityIndex}]`,
          message: "changed authority path must resolve to a current comparison path or rename previous_path",
        });
        continue;
      }

      for (const { file, fileIndex } of matches) {
        if (file.is_command_surface || reportedFileMismatches.has(fileIndex)) continue;
        reportedFileMismatches.add(fileIndex);
        issues.push({
          code: "command_surface_file_fact_mismatch",
          path: `comparison.changed_files[${fileIndex}].is_command_surface`,
          message: "changed file matched by task authority must be marked is_command_surface=true",
        });
      }
    }
  }
}

function timelineMilliseconds(value: string): number | null {
  const direct = Date.parse(value);
  if (Number.isFinite(direct)) return direct;

  const leapSecond = value.match(/^(.*T\d{2}:\d{2}):60(\.\d+)?(Z|[+-]\d{2}:\d{2})$/u);
  if (leapSecond === null) return null;
  const normalized = `${leapSecond[1]}:59${leapSecond[2] ?? ""}${leapSecond[3]}`;
  const base = Date.parse(normalized);
  return Number.isFinite(base) ? base + 1_000 : null;
}

function validateExecutionTimeline(
  receipt: ReceiptV1,
  issues: ReceiptSemanticIssue[],
): void {
  const runStarted = timelineMilliseconds(receipt.run.started_at);
  const runFinished = timelineMilliseconds(receipt.run.finished_at);

  if (runStarted === null) {
    issues.push({
      code: "timeline_timestamp_unparseable",
      path: "run.started_at",
      message: "run.started_at must be a parseable receipt timestamp",
    });
  }
  if (runFinished === null) {
    issues.push({
      code: "timeline_timestamp_unparseable",
      path: "run.finished_at",
      message: "run.finished_at must be a parseable receipt timestamp",
    });
  }
  if (runStarted !== null && runFinished !== null && runFinished < runStarted) {
    issues.push({
      code: "run_timeline_reversed",
      path: "run.finished_at",
      message: "run.finished_at must not precede run.started_at",
    });
  }

  for (const [taskIndex, task] of receipt.tasks.entries()) {
    const path = `tasks[${taskIndex}]`;
    const timingPresence = [task.started_at, task.finished_at, task.duration_ms]
      .filter((value) => value !== null).length;

    if (timingPresence !== 0 && timingPresence !== 3) {
      issues.push({
        code: "task_timing_shape",
        path,
        message: "task started_at, finished_at, and duration_ms must be either all null or all present",
      });
      continue;
    }

    if (["PASS", "FAIL", "FLAKY"].includes(task.status) && timingPresence !== 3) {
      issues.push({
        code: "executed_task_timing_required",
        path,
        message: `${task.status} requires complete task timing`,
      });
      continue;
    }

    if (timingPresence === 0) continue;
    const taskStarted = timelineMilliseconds(task.started_at!);
    const taskFinished = timelineMilliseconds(task.finished_at!);

    if (taskStarted === null) {
      issues.push({
        code: "timeline_timestamp_unparseable",
        path: `${path}.started_at`,
        message: "task started_at must be a parseable receipt timestamp",
      });
    }
    if (taskFinished === null) {
      issues.push({
        code: "timeline_timestamp_unparseable",
        path: `${path}.finished_at`,
        message: "task finished_at must be a parseable receipt timestamp",
      });
    }
    if (taskStarted === null || taskFinished === null) continue;

    if (taskFinished < taskStarted) {
      issues.push({
        code: "task_timeline_reversed",
        path: `${path}.finished_at`,
        message: "task finished_at must not precede task started_at",
      });
    }
    if (runStarted !== null && taskStarted < runStarted) {
      issues.push({
        code: "task_timeline_outside_run",
        path: `${path}.started_at`,
        message: "task started_at must not precede run.started_at",
      });
    }
    if (runFinished !== null && taskFinished > runFinished) {
      issues.push({
        code: "task_timeline_outside_run",
        path: `${path}.finished_at`,
        message: "task finished_at must not exceed run.finished_at",
      });
    }
    if (task.duration_ms !== taskFinished - taskStarted) {
      issues.push({
        code: "task_duration_mismatch",
        path: `${path}.duration_ms`,
        message: "task duration_ms must equal finished_at - started_at in milliseconds",
      });
    }
  }
}

export function validateReceiptSemantics(
  receipt: ReceiptV1,
): ReceiptSemanticValidationResult {
  const core = validateCoreReceiptSemantics(receipt);
  const issues = [...core.issues];
  validateCommandSurfaceFileFacts(receipt, issues);
  validateExecutionTimeline(receipt, issues);
  return { valid: issues.length === 0, issues };
}
