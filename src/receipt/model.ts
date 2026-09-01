import { relative, sep } from "node:path";

export type TaskType = "typecheck" | "lint" | "test" | "pytestBasic";
export type TaskStatus = "PASS" | "FAIL" | "FLAKY" | "BLOCKED" | "ERROR" | "NOT_APPLICABLE" | "NOT_RUN";
export type ExecutionAdmission = "normal" | "refused_changed_surface" | "explicit_changed_surface_override";
export type Stability = "stable" | "tree_drifted" | "unknown";
export type Completeness = "complete" | "materially_incomplete" | "unknown_due_to_error";
export type ReceiptExitCode = 0 | 1 | 2 | 3 | 4;
export type ReceiptPathNamespace = "repository" | "run";
export const UNSAFE_SELECTION_LIMITATION = "unsafe_selection" as const;

export interface ReceiptPathCandidate {
  readonly namespace: ReceiptPathNamespace;
  readonly original_spelling: string;
}

export function constructReceiptPathCandidate(
  namespace: ReceiptPathNamespace,
  originalSpelling: string,
): ReceiptPathCandidate {
  return { namespace, original_spelling: originalSpelling };
}

export function constructReceiptPathCandidateFromHostPath(
  namespace: ReceiptPathNamespace,
  namespaceRoot: string,
  hostOrToolPath: string,
): ReceiptPathCandidate {
  const nativeRelative = relative(namespaceRoot, hostOrToolPath);
  const candidateSpelling = sep === "/" ? nativeRelative : nativeRelative.split(sep).join("/");
  return constructReceiptPathCandidate(namespace, candidateSpelling);
}

export interface RunReceiptV1 {
  readonly run_id: string;
  readonly ascout_version: string;
  readonly started_at: string;
  readonly finished_at: string;
  readonly config_digest: string;
}

export interface SourceStateV1 {
  readonly repository_id: string;
  readonly repository_id_kind: "remote" | "local_only";
  readonly portable: boolean;
  readonly head_sha: string;
  readonly detached: boolean;
  readonly shallow: boolean;
  readonly tree_digest_version: 1;
  readonly tree_digest: string;
  readonly tracked_index_entry_count: number;
  readonly unstaged_changed_count: number;
  readonly included_untracked_count: number;
}

export interface SourceReceiptV1 {
  readonly start: SourceStateV1;
  readonly end: SourceStateV1 | null;
}

export type ChangeKind = "added" | "modified" | "deleted" | "renamed" | "type_changed" | "untracked";
export type LineSemantics = "text" | "binary_or_non_line" | "deleted_only";
export type LineRange = readonly [number, number];

export interface ChangedFileV1 {
  readonly path: string;
  readonly previous_path?: string;
  readonly change_kind: ChangeKind;
  readonly line_semantics: LineSemantics;
  readonly changed_new_line_ranges: readonly LineRange[];
  readonly is_test_file: boolean;
  readonly is_snapshot: boolean;
  readonly is_command_surface: boolean;
}

export interface ComparisonV1 {
  readonly kind: "working_tree_vs_head";
  readonly base_ref: string;
  readonly includes_staged: true;
  readonly includes_unstaged: true;
  readonly includes_untracked_nonignored: true;
  readonly changed_files: readonly ChangedFileV1[];
}

export interface ScopeV1 {
  readonly kind: "repository" | "package";
  readonly path: string | null;
}

export interface SelectionPassV1 {
  readonly ordinal: 1 | 2;
  readonly mode: "full" | "native_related" | "native_changed" | "configured";
  readonly scope: ScopeV1;
  readonly trigger: string | null;
  readonly selected_test_count: number | null;
  readonly deselected_test_count: number | null;
  readonly total_test_count: number | null;
}

export interface SelectionV1 {
  readonly mode: "full" | "native_related" | "native_changed" | "configured" | "no_test_task";
  readonly initial_scope: ScopeV1;
  readonly selected_test_count: number | null;
  readonly deselected_test_count: number | null;
  readonly total_test_count: number | null;
  readonly widened: boolean;
  readonly widen_triggers: readonly string[];
  readonly passes: readonly SelectionPassV1[];
  readonly limitations: readonly string[];
}

export interface ObservationsV1 {
  readonly runs: number;
  readonly failures: number;
}

export interface TaskResultV1 {
  readonly task_id: string;
  readonly task_type: TaskType;
  readonly authorized_by: "user_config" | "repo_config" | "discovery";
  readonly source_path: string | null;
  readonly argv: readonly string[];
  readonly argv_redacted: boolean;
  readonly tool_name: string | null;
  readonly tool_version: string | null;
  readonly command_surface_changed: boolean;
  readonly changed_authority_paths: readonly string[];
  readonly execution_admission: ExecutionAdmission;
  readonly status: TaskStatus;
  readonly reason_code: string | null;
  readonly reason_text: string | null;
  readonly exit_code: number | null;
  readonly started_at: string | null;
  readonly finished_at: string | null;
  readonly duration_ms: number | null;
  readonly observations: ObservationsV1;
  readonly cache_state: "cold" | "warm" | "reused" | "unknown" | "not_applicable";
  readonly selected_test_count?: number | null;
  readonly deselected_test_count?: number | null;
  readonly evidence_ids: readonly string[];
  readonly artifact_refs: readonly string[];
  readonly output_truncated: boolean;
}

export interface ChangedCodeV1 {
  readonly changed_file_count: number;
  readonly changed_text_line_count: number;
}

export interface ExerciseRecordV1 {
  readonly path: string;
  readonly line: number;
  readonly state: "EXERCISED" | "NOT_EXERCISED" | "UNRESOLVED";
  readonly execution_count: number | null;
  readonly source_task_ids: readonly string[];
  readonly reason?: string;
}

export interface BranchRecordV1 {
  readonly path: string;
  readonly line: number;
  readonly block_id: string;
  readonly branch_id: string;
  readonly taken: number | null;
  readonly state: "EXERCISED" | "NOT_EXERCISED" | "UNRESOLVED";
  readonly reason?: string;
}

export interface ExerciseV1 {
  readonly changed_executable_lines: number;
  readonly exercised_lines: number;
  readonly not_exercised_lines: number;
  readonly unresolved_lines: number;
  readonly changed_files_with_zero_exercised_lines: number;
  readonly records: readonly ExerciseRecordV1[];
  readonly branch_records?: readonly BranchRecordV1[];
  readonly exercised_branches?: number;
  readonly not_exercised_branches?: number;
  readonly unresolved_branches?: number;
  readonly changed_files_with_zero_exercised_branches?: number;
}

export interface TestChangeV1 {
  readonly kind: "test_file_changed" | "test_file_deleted" | "snapshot_changed" | "snapshot_deleted";
  readonly path: string;
  readonly previous_path?: string;
  readonly source: "git_diff";
}

export interface FindingV1 {
  readonly finding_id: string;
  readonly task_id: string;
  readonly producer: string;
  readonly rule_or_test_id?: string | null;
  readonly message: string;
  readonly path?: string | null;
  readonly line_start?: number | null;
  readonly line_end?: number | null;
  readonly severity: "info" | "low" | "medium" | "high" | "critical" | "unknown";
  readonly in_changed_lines: boolean | null;
  readonly introduced_by_change: boolean | "unknown";
  readonly determinism_class: "deterministic" | "nondeterministic" | "unknown";
  readonly observations: ObservationsV1;
  readonly reproduced: true | false | "not_applicable" | "unknown";
  readonly fingerprint_version?: 1 | null;
  readonly fingerprint?: string | null;
  readonly evidence_ids: readonly string[];
}

export interface EvidenceV1 {
  readonly evidence_id: string;
  readonly run_id: string;
  readonly task_id: string;
  readonly sequence: number;
  readonly kind: "process_result" | "test_result" | "coverage" | "admission" | "warning" | "other";
  readonly sha256: string;
  readonly artifact_id: string | null;
  readonly redacted: boolean;
  readonly truncated: boolean;
}

export interface ArtifactV1 {
  readonly artifact_id: string;
  readonly task_id?: string | null;
  readonly relative_run_path: string;
  readonly kind: string;
  readonly sha256: string;
  readonly byte_length: number;
  readonly redacted: boolean;
  readonly truncated: boolean;
}

export interface TaskStatusCountsV1 {
  readonly PASS: number;
  readonly FAIL: number;
  readonly FLAKY: number;
  readonly BLOCKED: number;
  readonly ERROR: number;
  readonly NOT_APPLICABLE: number;
  readonly NOT_RUN: number;
}

export interface SummaryV1 {
  readonly task_status_counts: TaskStatusCountsV1;
  readonly finding_count: number;
  readonly completeness: Completeness;
  readonly exit_code: ReceiptExitCode;
}

export interface ReceiptV1 {
  readonly schema_version: "1.0";
  readonly run: RunReceiptV1;
  readonly source: SourceReceiptV1;
  readonly comparison: ComparisonV1;
  readonly selection: SelectionV1;
  readonly tasks: readonly TaskResultV1[];
  readonly changed_code: ChangedCodeV1;
  readonly exercise: ExerciseV1;
  readonly test_changes: readonly TestChangeV1[];
  readonly findings: readonly FindingV1[];
  readonly evidence: readonly EvidenceV1[];
  readonly artifacts: readonly ArtifactV1[];
  readonly stability: Stability;
  readonly summary: SummaryV1;
}

export interface ReceiptSemanticIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface ReceiptSemanticValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ReceiptSemanticIssue[];
}

const FULL_GIT_OBJECT_ID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const SHA256 = /^[a-f0-9]{64}$/;
const CANONICAL_RELATIVE_PATH = /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.+\/[.]{1,2}(?:\/|$))[^/]+(?:\/[^/]+)*$/;
const EXECUTED_OUTCOME_STATUSES = new Set<TaskStatus>(["PASS", "FAIL", "FLAKY"]);
const EXERCISE_TEST_TASK_TYPES = new Set<TaskType>(["test"]);

function isNonEmpty(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNonNegativeInteger(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function addIssue(
  issues: ReceiptSemanticIssue[],
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function selectionCountsConsistent(
  selected: number | null,
  deselected: number | null,
  total: number | null,
): boolean {
  return selected === null || deselected === null || total === null || selected + deselected === total;
}

function selectionHasUnknownCounts(selection: SelectionV1): boolean {
  if (
    selection.selected_test_count === null ||
    selection.deselected_test_count === null ||
    selection.total_test_count === null
  ) {
    return true;
  }
  return selection.passes.some(
    (pass) =>
      pass.selected_test_count === null ||
      pass.deselected_test_count === null ||
      pass.total_test_count === null,
  );
}

function selectionPolicySatisfied(selection: SelectionV1): boolean {
  return !selection.limitations.includes(UNSAFE_SELECTION_LIMITATION);
}

function exerciseHasMaterialGap(exercise: ExerciseV1): boolean {
  return (
    exercise.not_exercised_lines > 0 ||
    exercise.unresolved_lines > 0 ||
    (
      exercise.branch_records !== undefined &&
      ((exercise.not_exercised_branches ?? 0) > 0 || (exercise.unresolved_branches ?? 0) > 0)
    )
  );
}

export function deriveReceiptCompleteness(receipt: ReceiptV1): Completeness {
  if (receipt.tasks.some((task) => task.status === "ERROR")) {
    return "unknown_due_to_error";
  }
  const applicable = receipt.tasks.filter((task) => task.status !== "NOT_APPLICABLE");
  if (!applicable.some((task) => EXECUTED_OUTCOME_STATUSES.has(task.status))) {
    return "materially_incomplete";
  }
  if (applicable.some((task) => task.status === "NOT_RUN" || task.status === "BLOCKED")) {
    return "materially_incomplete";
  }
  if (!selectionPolicySatisfied(receipt.selection)) return "materially_incomplete";
  if (exerciseHasMaterialGap(receipt.exercise)) return "materially_incomplete";
  return "complete";
}

export function decideReceiptExitCode(receipt: ReceiptV1): ReceiptExitCode {
  const completeness = deriveReceiptCompleteness(receipt);
  if (
    receipt.tasks.some((task) => task.status === "ERROR") ||
    completeness === "unknown_due_to_error" ||
    receipt.stability === "unknown"
  ) {
    return 2;
  }
  if (receipt.stability === "tree_drifted") return 3;
  if (receipt.findings.length > 0 || receipt.tasks.some((task) => task.status === "FAIL" || task.status === "FLAKY")) return 1;
  if (completeness !== "complete") return 4;
  return 0;
}

function validateRawPath(
  issues: ReceiptSemanticIssue[],
  candidate: ReceiptPathCandidate,
  path: string,
): boolean {
  if (candidate.original_spelling.includes("\\") || !CANONICAL_RELATIVE_PATH.test(candidate.original_spelling)) {
    addIssue(
      issues,
      "noncanonical_original_path",
      path,
      `${candidate.namespace} path candidate is not canonical in its original receipt spelling`,
    );
    return false;
  }
  return true;
}

function validateContainedCanonicalPath(
  issues: ReceiptSemanticIssue[],
  candidate: ReceiptPathCandidate,
  path: string,
): void {
  const segments = candidate.original_spelling.split("/");
  if (segments.length === 0 || segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    addIssue(issues, "path_namespace_escape", path, `${candidate.namespace} path escapes its namespace`);
  }
}

function validatePathCandidate(
  issues: ReceiptSemanticIssue[],
  namespace: ReceiptPathNamespace,
  originalSpelling: string,
  path: string,
): void {
  const candidate = constructReceiptPathCandidate(namespace, originalSpelling);
  if (!validateRawPath(issues, candidate, path)) return;
  validateContainedCanonicalPath(issues, candidate, path);
}

function validateScopePaths(issues: ReceiptSemanticIssue[], scope: ScopeV1, path: string): void {
  if (scope.kind === "repository") {
    if (scope.path !== null) addIssue(issues, "repository_scope_path", `${path}.path`, "repository scope path must be null");
    return;
  }
  if (scope.path === null) {
    addIssue(issues, "package_scope_path", `${path}.path`, "package scope requires a repository-relative path");
    return;
  }
  validatePathCandidate(issues, "repository", scope.path, `${path}.path`);
}

function validateOriginalPathSpellings(receipt: ReceiptV1, issues: ReceiptSemanticIssue[]): void {
  for (const [i, changed] of receipt.comparison.changed_files.entries()) {
    const base = `comparison.changed_files[${i}]`;
    validatePathCandidate(issues, "repository", changed.path, `${base}.path`);
    if (changed.previous_path !== undefined) {
      validatePathCandidate(issues, "repository", changed.previous_path, `${base}.previous_path`);
    }
  }
  validateScopePaths(issues, receipt.selection.initial_scope, "selection.initial_scope");
  for (const [i, pass] of receipt.selection.passes.entries()) {
    validateScopePaths(issues, pass.scope, `selection.passes[${i}].scope`);
  }
  for (const [i, task] of receipt.tasks.entries()) {
    if (task.source_path !== null) validatePathCandidate(issues, "repository", task.source_path, `tasks[${i}].source_path`);
    for (const [j, value] of task.changed_authority_paths.entries()) {
      validatePathCandidate(issues, "repository", value, `tasks[${i}].changed_authority_paths[${j}]`);
    }
  }
  for (const [i, record] of receipt.exercise.records.entries()) {
    validatePathCandidate(issues, "repository", record.path, `exercise.records[${i}].path`);
  }
  for (const [i, record] of (receipt.exercise.branch_records ?? []).entries()) {
    validatePathCandidate(issues, "repository", record.path, `exercise.branch_records[${i}].path`);
  }
  for (const [i, change] of receipt.test_changes.entries()) {
    validatePathCandidate(issues, "repository", change.path, `test_changes[${i}].path`);
    if (change.previous_path !== undefined) {
      validatePathCandidate(issues, "repository", change.previous_path, `test_changes[${i}].previous_path`);
    }
  }
  for (const [i, finding] of receipt.findings.entries()) {
    if (finding.path != null) validatePathCandidate(issues, "repository", finding.path, `findings[${i}].path`);
  }
  for (const [i, artifact] of receipt.artifacts.entries()) {
    validatePathCandidate(issues, "run", artifact.relative_run_path, `artifacts[${i}].relative_run_path`);
  }
}

function validateChangedRanges(receipt: ReceiptV1, issues: ReceiptSemanticIssue[]): boolean {
  let valid = true;
  for (const [i, changed] of receipt.comparison.changed_files.entries()) {
    const validRanges: LineRange[] = [];
    for (const [j, [start, end]] of changed.changed_new_line_ranges.entries()) {
      const path = `comparison.changed_files[${i}].changed_new_line_ranges[${j}]`;
      if (!isPositiveInteger(start) || !isPositiveInteger(end)) {
        addIssue(issues, "changed_range_shape", path, "changed-line range endpoints must be positive integers");
        valid = false;
        continue;
      }
      if (start > end) {
        addIssue(issues, "changed_range_inverted", path, "changed-line range start must not exceed end");
        valid = false;
        continue;
      }
      validRanges.push([start, end]);
    }

    validRanges.sort(([leftStart, leftEnd], [rightStart, rightEnd]) => leftStart - rightStart || leftEnd - rightEnd);
    for (let j = 1; j < validRanges.length; j += 1) {
      const previous = validRanges[j - 1]!;
      const current = validRanges[j]!;
      if (current[0] <= previous[1]) {
        addIssue(
          issues,
          "changed_range_overlap",
          `comparison.changed_files[${i}].changed_new_line_ranges`,
          "changed new-line ranges must not overlap",
        );
        valid = false;
        break;
      }
    }
  }
  return valid;
}

function changedTextLineCount(receipt: ReceiptV1): number {
  let count = 0;
  for (const changed of receipt.comparison.changed_files) {
    for (const [start, end] of changed.changed_new_line_ranges) count += end - start + 1;
  }
  return count;
}

function validateSourceState(
  state: SourceStateV1,
  issues: ReceiptSemanticIssue[],
  path: string,
): boolean {
  let valid = true;
  if (!FULL_GIT_OBJECT_ID.test(state.head_sha)) {
    addIssue(issues, "invalid_git_object_id", `${path}.head_sha`, "HEAD must be one full lowercase Git object ID");
    valid = false;
  }
  if (!SHA256.test(state.tree_digest)) {
    addIssue(issues, "invalid_tree_digest", `${path}.tree_digest`, "tree digest must be lowercase SHA-256");
    valid = false;
  }
  if (state.repository_id_kind === "remote") {
    if (!/^remote:[a-f0-9]{64}$/.test(state.repository_id) || !state.portable) {
      addIssue(issues, "repository_identity_mismatch", path, "remote repository identity must be portable remote:<sha256>");
      valid = false;
    }
  } else if (!/^local:[a-f0-9]{64}$/.test(state.repository_id) || state.portable) {
    addIssue(issues, "repository_identity_mismatch", path, "local repository identity must be non-portable local:<sha256>");
    valid = false;
  }
  return valid;
}

function validateGitBindingAndStability(receipt: ReceiptV1, issues: ReceiptSemanticIssue[]): void {
  const startValid = validateSourceState(receipt.source.start, issues, "source.start");
  const endValid = receipt.source.end !== null && validateSourceState(receipt.source.end, issues, "source.end");
  const baseValid = FULL_GIT_OBJECT_ID.test(receipt.comparison.base_ref);
  const comparisonBindingValid = baseValid && startValid && receipt.comparison.base_ref === receipt.source.start.head_sha;

  if (!baseValid) {
    addIssue(issues, "invalid_git_object_id", "comparison.base_ref", "comparison base must be one full lowercase Git object ID");
  } else if (startValid && !comparisonBindingValid) {
    addIssue(
      issues,
      "comparison_source_mismatch",
      "comparison.base_ref",
      "working_tree_vs_head comparison base must equal source.start.head_sha exactly",
    );
  }

  if (receipt.source.end === null) {
    if (receipt.stability !== "unknown") addIssue(issues, "stability_mismatch", "stability", "missing source.end requires stability=unknown");
    return;
  }
  if (!startValid || !endValid || !comparisonBindingValid) {
    if (receipt.stability !== "unknown") addIssue(issues, "stability_mismatch", "stability", "invalid source/comparison binding requires stability=unknown");
    return;
  }
  if (
    receipt.source.start.repository_id !== receipt.source.end.repository_id ||
    receipt.source.start.repository_id_kind !== receipt.source.end.repository_id_kind
  ) {
    addIssue(issues, "source_repository_changed", "source.end", "source.end must describe the same repository identity as source.start");
    if (receipt.stability !== "unknown") addIssue(issues, "stability_mismatch", "stability", "repository identity change requires stability=unknown");
    return;
  }

  const expected: Stability = receipt.source.start.tree_digest === receipt.source.end.tree_digest ? "stable" : "tree_drifted";
  if (receipt.stability !== expected) {
    addIssue(issues, "stability_mismatch", "stability", `stability must be ${expected} for the observed tree digests`);
  }
}

function validateRenameAndFileSemantics(receipt: ReceiptV1, issues: ReceiptSemanticIssue[]): void {
  for (const [i, changed] of receipt.comparison.changed_files.entries()) {
    const base = `comparison.changed_files[${i}]`;
    if (changed.change_kind === "renamed" && changed.previous_path === undefined) {
      addIssue(issues, "rename_previous_path_required", `${base}.previous_path`, "renamed change requires previous_path");
    }
    if (changed.change_kind !== "renamed" && changed.previous_path !== undefined) {
      addIssue(issues, "previous_path_for_nonrename", `${base}.previous_path`, "non-renamed change must not carry previous_path");
    }
    if (changed.change_kind === "deleted" && changed.line_semantics !== "deleted_only") {
      addIssue(issues, "deleted_line_semantics", `${base}.line_semantics`, "deleted changes require deleted_only line semantics");
    }
    if (changed.change_kind !== "deleted" && changed.line_semantics === "deleted_only") {
      addIssue(issues, "deleted_line_semantics", `${base}.line_semantics`, "deleted_only line semantics require a deleted change");
    }
    if (changed.change_kind === "type_changed" && changed.line_semantics !== "binary_or_non_line") {
      addIssue(issues, "type_change_line_semantics", `${base}.line_semantics`, "type changes are file-level binary_or_non_line changes");
    }
    if (changed.line_semantics !== "text" && changed.changed_new_line_ranges.length !== 0) {
      addIssue(issues, "nontext_changed_ranges", `${base}.changed_new_line_ranges`, "non-text changes cannot carry changed new-line ranges");
    }
  }
}

function validateCommandSurfaceFileFacts(receipt: ReceiptV1, issues: ReceiptSemanticIssue[]): void {
  const reportedFileMismatches = new Set<number>();
  for (const [taskIndex, task] of receipt.tasks.entries()) {
    for (const [authorityIndex, authorityPath] of task.changed_authority_paths.entries()) {
      const matches = receipt.comparison.changed_files
        .map((file, fileIndex) => ({ file, fileIndex }))
        .filter(({ file }) => file.path === authorityPath || file.previous_path === authorityPath);
      if (matches.length === 0) {
        addIssue(
          issues,
          "changed_authority_path_not_in_comparison",
          `tasks[${taskIndex}].changed_authority_paths[${authorityIndex}]`,
          "changed authority path must resolve to a current comparison path or rename previous_path",
        );
        continue;
      }
      for (const { file, fileIndex } of matches) {
        if (file.is_command_surface || reportedFileMismatches.has(fileIndex)) continue;
        reportedFileMismatches.add(fileIndex);
        addIssue(
          issues,
          "command_surface_file_fact_mismatch",
          `comparison.changed_files[${fileIndex}].is_command_surface`,
          "changed file matched by task authority must be marked is_command_surface=true",
        );
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

function validateExecutionTimeline(receipt: ReceiptV1, issues: ReceiptSemanticIssue[]): void {
  const runStarted = timelineMilliseconds(receipt.run.started_at);
  const runFinished = timelineMilliseconds(receipt.run.finished_at);
  if (runStarted === null) addIssue(issues, "timeline_timestamp_unparseable", "run.started_at", "run.started_at must be a parseable receipt timestamp");
  if (runFinished === null) addIssue(issues, "timeline_timestamp_unparseable", "run.finished_at", "run.finished_at must be a parseable receipt timestamp");
  if (runStarted !== null && runFinished !== null && runFinished < runStarted) {
    addIssue(issues, "run_timeline_reversed", "run.finished_at", "run.finished_at must not precede run.started_at");
  }

  for (const [taskIndex, task] of receipt.tasks.entries()) {
    const base = `tasks[${taskIndex}]`;
    const timingPresence = [task.started_at, task.finished_at, task.duration_ms].filter((value) => value !== null).length;
    if (timingPresence !== 0 && timingPresence !== 3) {
      addIssue(issues, "task_timing_shape", base, "task started_at, finished_at, and duration_ms must be either all null or all present");
      continue;
    }
    if (EXECUTED_OUTCOME_STATUSES.has(task.status) && timingPresence !== 3) {
      addIssue(issues, "executed_task_timing_required", base, `${task.status} requires complete task timing`);
      continue;
    }
    if (timingPresence === 0) continue;

    const taskStarted = timelineMilliseconds(task.started_at!);
    const taskFinished = timelineMilliseconds(task.finished_at!);
    if (taskStarted === null) addIssue(issues, "timeline_timestamp_unparseable", `${base}.started_at`, "task started_at must be a parseable receipt timestamp");
    if (taskFinished === null) addIssue(issues, "timeline_timestamp_unparseable", `${base}.finished_at`, "task finished_at must be a parseable receipt timestamp");
    if (taskStarted === null || taskFinished === null) continue;
    if (taskFinished < taskStarted) addIssue(issues, "task_timeline_reversed", `${base}.finished_at`, "task finished_at must not precede task started_at");
    if (runStarted !== null && taskStarted < runStarted) addIssue(issues, "task_timeline_outside_run", `${base}.started_at`, "task started_at must not precede run.started_at");
    if (runFinished !== null && taskFinished > runFinished) addIssue(issues, "task_timeline_outside_run", `${base}.finished_at`, "task finished_at must not exceed run.finished_at");
    if (task.duration_ms !== taskFinished - taskStarted) {
      addIssue(issues, "task_duration_mismatch", `${base}.duration_ms`, "task duration_ms must equal finished_at - started_at in milliseconds");
    }
  }
}

function validateObservations(
  observations: ObservationsV1,
  issues: ReceiptSemanticIssue[],
  path: string,
): void {
  if (!isNonNegativeInteger(observations.runs) || !isNonNegativeInteger(observations.failures)) {
    addIssue(issues, "invalid_observation_count", path, "observation counts must be non-negative integers");
    return;
  }
  if (observations.failures > observations.runs) {
    addIssue(issues, "observation_failures_exceed_runs", path, "observation failures cannot exceed runs");
  }
}

function validateTaskInvariants(receipt: ReceiptV1, issues: ReceiptSemanticIssue[]): void {
  for (const [i, task] of receipt.tasks.entries()) {
    const base = `tasks[${i}]`;
    validateObservations(task.observations, issues, `${base}.observations`);
    if (EXECUTED_OUTCOME_STATUSES.has(task.status) && task.observations.runs < 1) {
      addIssue(issues, "executed_status_without_observation", `${base}.observations`, `${task.status} requires at least one executed observation`);
    }
    if (task.status === "PASS" && task.observations.failures !== 0) {
      addIssue(issues, "pass_with_failure_observation", `${base}.observations`, "PASS cannot contain failing observations");
    }
    if (task.status === "FAIL" && task.observations.failures < 1) {
      addIssue(issues, "fail_without_failure_observation", `${base}.observations`, "FAIL requires at least one failing observation");
    }
    if (task.status === "FLAKY" && (task.observations.runs < 2 || task.observations.failures < 1 || task.observations.failures >= task.observations.runs)) {
      addIssue(issues, "flake_observation_invariant", `${base}.observations`, "FLAKY requires contradictory valid observations with both failure and non-failure outcomes");
    }
    if (["NOT_RUN", "BLOCKED", "NOT_APPLICABLE"].includes(task.status) && task.observations.runs !== 0) {
      addIssue(issues, "nonexecuted_status_has_observations", `${base}.observations`, `${task.status} cannot record executed observations`);
    }
    if (["NOT_RUN", "BLOCKED", "ERROR"].includes(task.status)) {
      if (!isNonEmpty(task.reason_code)) addIssue(issues, "task_reason_required", `${base}.reason_code`, `${task.status} requires non-empty reason_code`);
      if (!isNonEmpty(task.reason_text)) addIssue(issues, "task_reason_required", `${base}.reason_text`, `${task.status} requires non-empty reason_text`);
    }
    if (!task.command_surface_changed) {
      if (task.execution_admission !== "normal" || task.changed_authority_paths.length !== 0) {
        addIssue(issues, "admission_invariant", base, "unchanged command surface requires normal admission and no changed authority paths");
      }
    } else if (task.execution_admission === "normal" || task.changed_authority_paths.length === 0) {
      addIssue(issues, "admission_invariant", base, "changed command surface requires non-normal admission and at least one changed authority path");
    }
    if (
      task.execution_admission === "refused_changed_surface" &&
      (
        task.status !== "NOT_RUN" ||
        task.reason_code !== "command_surface_changed" ||
        task.observations.runs !== 0 ||
        !task.command_surface_changed ||
        task.changed_authority_paths.length === 0
      )
    ) {
      addIssue(issues, "admission_refusal_invariant", base, "changed-surface refusal must be a NOT_RUN command_surface_changed result");
    }
    if (task.execution_admission === "explicit_changed_surface_override" && (!task.command_surface_changed || task.changed_authority_paths.length === 0)) {
      addIssue(issues, "admission_override_invariant", base, "explicit override requires a changed command surface and recorded authority paths");
    }
    if (hasDuplicates(task.changed_authority_paths)) addIssue(issues, "duplicate_changed_authority_path", `${base}.changed_authority_paths`, "changed authority paths must be unique");
    if (hasDuplicates(task.evidence_ids)) addIssue(issues, "duplicate_task_evidence_ref", `${base}.evidence_ids`, "task evidence references must be unique");
    if (hasDuplicates(task.artifact_refs)) addIssue(issues, "duplicate_task_artifact_ref", `${base}.artifact_refs`, "task artifact references must be unique");
  }
}

function validateSelectionCounts(
  issues: ReceiptSemanticIssue[],
  path: string,
  selected: number | null,
  deselected: number | null,
  total: number | null,
): boolean {
  let valid = true;
  for (const [name, value] of [
    ["selected_test_count", selected],
    ["deselected_test_count", deselected],
    ["total_test_count", total],
  ] as const) {
    if (value !== null && !isNonNegativeInteger(value)) {
      addIssue(
        issues,
        "selection_count_shape",
        `${path}.${name}`,
        "selection counts must be non-negative integers or null",
      );
      valid = false;
    }
  }
  return valid;
}

function validateSelection(receipt: ReceiptV1, issues: ReceiptSemanticIssue[]): void {
  const selection = receipt.selection;
  if (selection.passes.length > 2) addIssue(issues, "selection_pass_limit", "selection.passes", "selection permits at most two passes");
  for (const [i, pass] of selection.passes.entries()) {
    if (pass.ordinal !== i + 1) addIssue(issues, "selection_pass_ordinal", `selection.passes[${i}].ordinal`, "selection pass ordinals must be contiguous starting at 1");
    const countsValid = validateSelectionCounts(
      issues,
      `selection.passes[${i}]`,
      pass.selected_test_count,
      pass.deselected_test_count,
      pass.total_test_count,
    );
    if (countsValid && !selectionCountsConsistent(pass.selected_test_count, pass.deselected_test_count, pass.total_test_count)) {
      addIssue(issues, "selection_count_mismatch", `selection.passes[${i}]`, "selected + deselected must equal total when all counts are known");
    }
  }
  const rootCountsValid = validateSelectionCounts(
    issues,
    "selection",
    selection.selected_test_count,
    selection.deselected_test_count,
    selection.total_test_count,
  );
  if (rootCountsValid && !selectionCountsConsistent(selection.selected_test_count, selection.deselected_test_count, selection.total_test_count)) {
    addIssue(issues, "selection_count_mismatch", "selection", "selected + deselected must equal total when all counts are known");
  }
  if (selectionHasUnknownCounts(selection) && selection.limitations.length === 0) {
    addIssue(issues, "selection_unknown_without_limitation", "selection.limitations", "unknown selection counts require a disclosed limitation");
  }
  if (selection.widened) {
    if (selection.passes.length === 0 || selection.widen_triggers.length === 0) {
      addIssue(issues, "selection_widening_invariant", "selection", "widened selection requires at least one pass and at least one widen trigger");
    }
  } else if (selection.widen_triggers.length !== 0 || selection.passes.length > 1) {
    addIssue(issues, "selection_widening_invariant", "selection", "non-widened selection cannot record widening triggers or a second pass");
  }
  if (hasDuplicates(selection.widen_triggers)) addIssue(issues, "duplicate_widen_trigger", "selection.widen_triggers", "widen triggers must be unique");
  if (selection.mode === "no_test_task" && selection.passes.length !== 0) {
    addIssue(issues, "no_test_task_has_passes", "selection.passes", "no_test_task selection cannot contain execution passes");
  }
}

function validateReferences(receipt: ReceiptV1, issues: ReceiptSemanticIssue[]): Map<string, TaskResultV1> {
  const taskIdsArray = receipt.tasks.map((x) => x.task_id);
  const evidenceIdsArray = receipt.evidence.map((x) => x.evidence_id);
  const artifactIdsArray = receipt.artifacts.map((x) => x.artifact_id);
  const findingIdsArray = receipt.findings.map((x) => x.finding_id);

  if (hasDuplicates(taskIdsArray)) addIssue(issues, "duplicate_task_id", "tasks", "task IDs must be unique");
  if (hasDuplicates(evidenceIdsArray)) addIssue(issues, "duplicate_evidence_id", "evidence", "evidence IDs must be unique");
  if (hasDuplicates(artifactIdsArray)) addIssue(issues, "duplicate_artifact_id", "artifacts", "artifact IDs must be unique");
  if (hasDuplicates(findingIdsArray)) addIssue(issues, "duplicate_finding_id", "findings", "finding IDs must be unique");

  const tasks = new Map(receipt.tasks.map((task) => [task.task_id, task]));
  const artifacts = new Map(receipt.artifacts.map((artifact) => [artifact.artifact_id, artifact]));
  const evidence = new Map(receipt.evidence.map((item) => [item.evidence_id, item]));

  for (const [i, artifact] of receipt.artifacts.entries()) {
    if (!SHA256.test(artifact.sha256)) {
      addIssue(issues, "invalid_artifact_sha256", `artifacts[${i}].sha256`, "artifact sha256 must be lowercase SHA-256");
    }
    if (artifact.task_id != null && !tasks.has(artifact.task_id)) {
      addIssue(issues, "dangling_artifact_task_ref", `artifacts[${i}].task_id`, "artifact task_id does not resolve");
    }
  }

  const logical = new Set<string>();
  for (const [i, item] of receipt.evidence.entries()) {
    const base = `evidence[${i}]`;
    if (!SHA256.test(item.sha256)) {
      addIssue(issues, "invalid_evidence_sha256", `${base}.sha256`, "evidence sha256 must be lowercase SHA-256");
    }
    if (item.run_id !== receipt.run.run_id) addIssue(issues, "cross_run_evidence", `${base}.run_id`, "evidence run_id must equal receipt run_id");
    if (!tasks.has(item.task_id)) addIssue(issues, "dangling_evidence_task_ref", `${base}.task_id`, "evidence task_id does not resolve");
    if (!isPositiveInteger(item.sequence)) addIssue(issues, "invalid_evidence_sequence", `${base}.sequence`, "evidence sequence must be a positive integer");
    const key = `${item.task_id}\u0000${item.sequence}`;
    if (logical.has(key)) addIssue(issues, "duplicate_evidence_logical_id", base, "evidence (task_id, sequence) identity must be unique within the run");
    logical.add(key);
    if (item.artifact_id !== null) {
      const artifact = artifacts.get(item.artifact_id);
      if (artifact === undefined) addIssue(issues, "dangling_evidence_artifact_ref", `${base}.artifact_id`, "evidence artifact_id does not resolve");
      else if (artifact.task_id != null && artifact.task_id !== item.task_id) {
        addIssue(issues, "cross_task_evidence_artifact_ref", `${base}.artifact_id`, "evidence cannot reference an artifact owned by another task");
      }
    }
  }

  for (const [i, task] of receipt.tasks.entries()) {
    for (const [j, id] of task.evidence_ids.entries()) {
      const item = evidence.get(id);
      if (item === undefined) addIssue(issues, "dangling_task_evidence_ref", `tasks[${i}].evidence_ids[${j}]`, "task evidence reference does not resolve");
      else if (item.run_id !== receipt.run.run_id || item.task_id !== task.task_id) {
        addIssue(issues, "cross_task_evidence_ref", `tasks[${i}].evidence_ids[${j}]`, "task evidence reference crosses run/task ownership");
      }
    }
    for (const [j, id] of task.artifact_refs.entries()) {
      const artifact = artifacts.get(id);
      if (artifact === undefined) addIssue(issues, "dangling_task_artifact_ref", `tasks[${i}].artifact_refs[${j}]`, "task artifact reference does not resolve");
      else if (artifact.task_id != null && artifact.task_id !== task.task_id) {
        addIssue(issues, "cross_task_artifact_ref", `tasks[${i}].artifact_refs[${j}]`, "task cannot reference an artifact owned by another task");
      }
    }
  }

  for (const [i, finding] of receipt.findings.entries()) {
    validateObservations(finding.observations, issues, `findings[${i}].observations`);
    if (finding.introduced_by_change !== "unknown") {
      addIssue(
        issues,
        "finding_causation_unproven",
        `findings[${i}].introduced_by_change`,
        "M1 receipt v1 has no comparative proof input; introduced_by_change must remain unknown",
      );
    }
    const owningTask = tasks.get(finding.task_id);
    const validObservationCounts =
      isNonNegativeInteger(finding.observations.runs) &&
      isNonNegativeInteger(finding.observations.failures) &&
      finding.observations.failures <= finding.observations.runs;
    if (owningTask?.task_type === "test" && validObservationCounts) {
      const { runs, failures } = finding.observations;
      if (runs === 1 && failures === 1 && finding.reproduced !== "unknown") {
        addIssue(
          issues,
          "finding_reproduction_invariant",
          `findings[${i}].reproduced`,
          "one valid failing test observation requires reproduced=unknown",
        );
      }
      if (runs >= 2 && failures === runs && finding.reproduced !== true) {
        addIssue(
          issues,
          "finding_reproduction_invariant",
          `findings[${i}].reproduced`,
          "repeated consistent test failures require reproduced=true",
        );
      }
      if (runs >= 2 && failures > 0 && failures < runs) {
        if (finding.reproduced !== false) {
          addIssue(
            issues,
            "finding_reproduction_invariant",
            `findings[${i}].reproduced`,
            "contradictory valid test observations require stable-failure reproduction false",
          );
        }
        if (finding.determinism_class !== "nondeterministic") {
          addIssue(
            issues,
            "finding_determinism_invariant",
            `findings[${i}].determinism_class`,
            "contradictory valid test observations require nondeterministic classification",
          );
        }
      }
    }
    if (finding.fingerprint != null && !SHA256.test(finding.fingerprint)) {
      addIssue(issues, "fingerprint_invalid", `findings[${i}]`, "persisted weak fingerprint must be lowercase SHA-256 when present");
    }
    if (!tasks.has(finding.task_id)) addIssue(issues, "dangling_finding_task_ref", `findings[${i}].task_id`, "finding task_id does not resolve");
    if (hasDuplicates(finding.evidence_ids)) addIssue(issues, "duplicate_finding_evidence_ref", `findings[${i}].evidence_ids`, "finding evidence references must be unique");
    for (const [j, id] of finding.evidence_ids.entries()) {
      const item = evidence.get(id);
      if (item === undefined) addIssue(issues, "dangling_finding_evidence_ref", `findings[${i}].evidence_ids[${j}]`, "finding evidence reference does not resolve");
      else if (item.run_id !== receipt.run.run_id || item.task_id !== finding.task_id) {
        addIssue(issues, "cross_task_finding_evidence_ref", `findings[${i}].evidence_ids[${j}]`, "finding evidence reference crosses run/task ownership");
      }
    }
    if (finding.line_start != null && finding.line_end != null && finding.line_start > finding.line_end) {
      addIssue(issues, "finding_line_range_inverted", `findings[${i}]`, "finding line_start must not exceed line_end");
    }
  }

  return tasks;
}

function validateExercise(
  receipt: ReceiptV1,
  issues: ReceiptSemanticIssue[],
  tasks: ReadonlyMap<string, TaskResultV1>,
  rangesValid: boolean,
): void {
  let exercised = 0;
  let notExercised = 0;
  let unresolved = 0;
  const byPath = new Map<string, ExerciseRecordV1[]>();
  const lineIds = new Set<string>();
  const changedRanges = new Map(receipt.comparison.changed_files.map((x) => [x.path, x.changed_new_line_ranges] as const));
  const evidence = new Map(receipt.evidence.map((item) => [item.evidence_id, item]));
  const hasOwnedCurrentRunCoverage = new Map(
    receipt.tasks.map((task) => [
      task.task_id,
      task.evidence_ids.some((evidenceId) => {
        const item = evidence.get(evidenceId);
        return (
          item !== undefined &&
          item.kind === "coverage" &&
          item.run_id === receipt.run.run_id &&
          item.task_id === task.task_id
        );
      }),
    ] as const),
  );
  const missingCoverageIssueTaskIds = new Set<string>();

  for (const [i, record] of receipt.exercise.records.entries()) {
    const base = `exercise.records[${i}]`;
    const lineId = `${record.path}\u0000${record.line}`;
    const records = byPath.get(record.path) ?? [];
    records.push(record);
    byPath.set(record.path, records);

    if (lineIds.has(lineId)) addIssue(issues, "duplicate_exercise_line", base, "each changed executable line may have only one exercise record");
    lineIds.add(lineId);

    if (!isPositiveInteger(record.line)) {
      addIssue(issues, "invalid_exercise_line", `${base}.line`, "exercise line must be a positive integer");
    } else if (rangesValid) {
      const ranges = changedRanges.get(record.path);
      if (ranges === undefined || !ranges.some(([start, end]) => start <= record.line && record.line <= end)) {
        addIssue(issues, "exercise_line_outside_changed_scope", base, "exercise record must identify a line in the changed new-line scope");
      }
    }

    if (hasDuplicates(record.source_task_ids)) {
      addIssue(issues, "duplicate_exercise_task_ref", `${base}.source_task_ids`, "exercise source task IDs must be unique");
    }
    for (const [j, id] of record.source_task_ids.entries()) {
      if (!tasks.has(id)) addIssue(issues, "dangling_exercise_task_ref", `${base}.source_task_ids[${j}]`, "exercise source task ID does not resolve");
    }

    if (record.state === "EXERCISED") {
      exercised += 1;
      if (record.execution_count === null || !isPositiveInteger(record.execution_count)) {
        addIssue(issues, "exercise_state_count", `${base}.execution_count`, "EXERCISED requires execution_count > 0");
      }
      if (record.source_task_ids.length === 0) {
        addIssue(issues, "exercise_source_task_required", `${base}.source_task_ids`, "EXERCISED requires at least one source test task");
      }
      for (const [j, id] of record.source_task_ids.entries()) {
        const task = tasks.get(id);
        if (
          task !== undefined &&
          (!EXERCISE_TEST_TASK_TYPES.has(task.task_type) || !EXECUTED_OUTCOME_STATUSES.has(task.status) || task.observations.runs < 1)
        ) {
          addIssue(
            issues,
            "exercise_source_task_not_executed_test",
            `${base}.source_task_ids[${j}]`,
            "EXERCISED source tasks must be executed test tasks with at least one recorded run",
          );
        }
        if (
          task !== undefined &&
          hasOwnedCurrentRunCoverage.get(task.task_id) !== true &&
          !missingCoverageIssueTaskIds.has(task.task_id)
        ) {
          missingCoverageIssueTaskIds.add(task.task_id);
          addIssue(
            issues,
            "exercise_source_task_missing_coverage_evidence",
            `${base}.source_task_ids[${j}]`,
            "EXERCISED source tasks must own current-run coverage evidence",
          );
        }
      }
    } else if (record.state === "NOT_EXERCISED") {
      notExercised += 1;
      if (record.execution_count !== 0) addIssue(issues, "exercise_state_count", `${base}.execution_count`, "NOT_EXERCISED requires execution_count = 0");
    } else {
      unresolved += 1;
      if (record.execution_count !== null || !isNonEmpty(record.reason)) {
        addIssue(issues, "exercise_state_count", base, "UNRESOLVED requires null execution_count and a non-empty reason");
      }
    }
  }

  const zeroPaths = [...byPath.values()].filter((records) => !records.some((record) => record.state === "EXERCISED")).length;
  if (receipt.exercise.changed_executable_lines !== receipt.exercise.records.length) {
    addIssue(issues, "exercise_summary_mismatch", "exercise.changed_executable_lines", "changed_executable_lines must equal the number of line-level exercise records");
  }
  if (receipt.exercise.exercised_lines !== exercised) addIssue(issues, "exercise_summary_mismatch", "exercise.exercised_lines", "exercised_lines does not match exercise records");
  if (receipt.exercise.not_exercised_lines !== notExercised) addIssue(issues, "exercise_summary_mismatch", "exercise.not_exercised_lines", "not_exercised_lines does not match exercise records");
  if (receipt.exercise.unresolved_lines !== unresolved) addIssue(issues, "exercise_summary_mismatch", "exercise.unresolved_lines", "unresolved_lines does not match exercise records");
  if (receipt.exercise.changed_files_with_zero_exercised_lines !== zeroPaths) {
    addIssue(issues, "exercise_summary_mismatch", "exercise.changed_files_with_zero_exercised_lines", "zero-exercised file count does not match exercise records");
  }

  if (receipt.exercise.branch_records === undefined) return;

  let exercisedBranches = 0;
  let notExercisedBranches = 0;
  let unresolvedBranches = 0;
  const branchIds = new Set<string>();
  const branchRecordsByPath = new Map<string, BranchRecordV1[]>();

  for (const [i, record] of receipt.exercise.branch_records.entries()) {
    const base = `exercise.branch_records[${i}]`;
    const branchId = `${record.path}\u0000${record.line}\u0000${record.block_id}\u0000${record.branch_id}`;
    if (branchIds.has(branchId)) {
      addIssue(issues, "duplicate_exercise_branch", base, "each changed branch identity may have only one branch exercise record");
    }
    branchIds.add(branchId);

    const records = branchRecordsByPath.get(record.path) ?? [];
    records.push(record);
    branchRecordsByPath.set(record.path, records);

    if (!isPositiveInteger(record.line)) {
      addIssue(issues, "invalid_exercise_branch_line", `${base}.line`, "branch exercise line must be a positive integer");
    } else if (rangesValid) {
      const ranges = changedRanges.get(record.path);
      if (ranges === undefined || !ranges.some(([start, end]) => start <= record.line && record.line <= end)) {
        addIssue(issues, "exercise_branch_outside_changed_scope", base, "branch exercise record must identify a line in the changed new-line scope");
      }
    }

    if (!isNonEmpty(record.block_id)) {
      addIssue(issues, "invalid_exercise_branch_identity", `${base}.block_id`, "branch block_id must be a non-empty string");
    }
    if (!isNonEmpty(record.branch_id)) {
      addIssue(issues, "invalid_exercise_branch_identity", `${base}.branch_id`, "branch branch_id must be a non-empty string");
    }

    const takenIsValid = record.taken === null ||
      (typeof record.taken === "number" && Number.isSafeInteger(record.taken) && record.taken >= 0);
    if (!takenIsValid) {
      addIssue(issues, "invalid_exercise_branch_taken", `${base}.taken`, "branch taken must be a non-negative safe integer or null");
    }

    if (record.state === "EXERCISED") {
      exercisedBranches += 1;
      if (record.taken === null || !Number.isSafeInteger(record.taken) || record.taken <= 0) {
        addIssue(issues, "exercise_branch_state_taken", base, "EXERCISED branch requires taken > 0");
      }
    } else if (record.state === "NOT_EXERCISED") {
      notExercisedBranches += 1;
      if (record.taken !== 0) {
        addIssue(issues, "exercise_branch_state_taken", base, "NOT_EXERCISED branch requires taken = 0");
      }
    } else {
      unresolvedBranches += 1;
      if (record.taken !== null || !isNonEmpty(record.reason)) {
        addIssue(issues, "exercise_branch_state_taken", base, "UNRESOLVED branch requires null taken and a non-empty reason");
      }
    }
  }

  const zeroBranchPaths = [...branchRecordsByPath.values()]
    .filter((records) => !records.some((record) => record.state === "EXERCISED"))
    .length;
  if (receipt.exercise.exercised_branches !== exercisedBranches) {
    addIssue(issues, "exercise_branch_summary_mismatch", "exercise.exercised_branches", "exercised_branches does not match branch records");
  }
  if (receipt.exercise.not_exercised_branches !== notExercisedBranches) {
    addIssue(issues, "exercise_branch_summary_mismatch", "exercise.not_exercised_branches", "not_exercised_branches does not match branch records");
  }
  if (receipt.exercise.unresolved_branches !== unresolvedBranches) {
    addIssue(issues, "exercise_branch_summary_mismatch", "exercise.unresolved_branches", "unresolved_branches does not match branch records");
  }
  if (receipt.exercise.changed_files_with_zero_exercised_branches !== zeroBranchPaths) {
    addIssue(
      issues,
      "exercise_branch_summary_mismatch",
      "exercise.changed_files_with_zero_exercised_branches",
      "zero-exercised branch file count does not match branch records",
    );
  }
}

function taskStatusCounts(tasks: readonly TaskResultV1[]): TaskStatusCountsV1 {
  const out: Record<TaskStatus, number> = {
    PASS: 0,
    FAIL: 0,
    FLAKY: 0,
    BLOCKED: 0,
    ERROR: 0,
    NOT_APPLICABLE: 0,
    NOT_RUN: 0,
  };
  for (const task of tasks) out[task.status] += 1;
  return out;
}

function sameCounts(a: TaskStatusCountsV1, b: TaskStatusCountsV1): boolean {
  return (
    a.PASS === b.PASS &&
    a.FAIL === b.FAIL &&
    a.FLAKY === b.FLAKY &&
    a.BLOCKED === b.BLOCKED &&
    a.ERROR === b.ERROR &&
    a.NOT_APPLICABLE === b.NOT_APPLICABLE &&
    a.NOT_RUN === b.NOT_RUN
  );
}

function validateAggregatesAndDecision(receipt: ReceiptV1, issues: ReceiptSemanticIssue[]): void {
  if (!sameCounts(receipt.summary.task_status_counts, taskStatusCounts(receipt.tasks))) {
    addIssue(issues, "task_status_count_mismatch", "summary.task_status_counts", "summary task status counts must equal task results");
  }
  if (receipt.summary.finding_count !== receipt.findings.length) {
    addIssue(issues, "finding_count_mismatch", "summary.finding_count", "summary finding_count must equal findings.length");
  }
  const completeness = deriveReceiptCompleteness(receipt);
  if (receipt.summary.completeness !== completeness) {
    addIssue(issues, "completeness_mismatch", "summary.completeness", `summary completeness must be ${completeness}`);
  }
  const exit = decideReceiptExitCode(receipt);
  if (receipt.summary.exit_code !== exit) {
    addIssue(issues, "exit_code_mismatch", "summary.exit_code", `summary exit_code must be ${exit}`);
  }
}

export function validateReceiptSemantics(receipt: ReceiptV1): ReceiptSemanticValidationResult {
  const issues: ReceiptSemanticIssue[] = [];

  validateOriginalPathSpellings(receipt, issues);
  const rangesValid = validateChangedRanges(receipt, issues);

  if (!SHA256.test(receipt.run.config_digest)) {
    addIssue(issues, "invalid_config_digest", "run.config_digest", "config_digest must be lowercase SHA-256");
  }

  validateGitBindingAndStability(receipt, issues);
  validateRenameAndFileSemantics(receipt, issues);
  validateCommandSurfaceFileFacts(receipt, issues);
  validateExecutionTimeline(receipt, issues);
  validateTaskInvariants(receipt, issues);
  validateSelection(receipt, issues);
  const tasks = validateReferences(receipt, issues);
  validateExercise(receipt, issues, tasks, rangesValid);

  if (receipt.changed_code.changed_file_count !== receipt.comparison.changed_files.length) {
    addIssue(issues, "changed_file_count_mismatch", "changed_code.changed_file_count", "changed_file_count must equal comparison.changed_files.length");
  }
  if (rangesValid && receipt.changed_code.changed_text_line_count !== changedTextLineCount(receipt)) {
    addIssue(issues, "changed_text_line_count_mismatch", "changed_code.changed_text_line_count", "changed_text_line_count must equal valid changed new-line ranges");
  }

  validateAggregatesAndDecision(receipt, issues);
  return { valid: issues.length === 0, issues };
}
