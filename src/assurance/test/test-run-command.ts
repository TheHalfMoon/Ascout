/**
 * E6 — `ascout test` runs the real `check`.
 *
 * STANDARD, DEEP, and RELEASE run the existing `check` engine over the same repository, with
 * its admission rules, and report its result. DEEP and RELEASE also require engines Ascout does
 * not run yet; those stay NOT_RUN, so the profile is incomplete unless `check` itself found a
 * failure or drift. QUICK has no qualified engine and runs nothing. `--plan` is unchanged.
 */
import type { ReceiptV1, TaskStatus } from "../../receipt/model.js";
import { renderTestPlanTerminalV1 } from "./test-plan-command.js";
import {
  projectTestProfilePlanFieldsV1,
  type TestProfile,
  type TestProfilePlanProjectionV1,
} from "./profile-policy.js";

export const TEST_RUN_REPORT_SCHEMA_VERSION = 2 as const;

/** Capabilities a profile requires that no Ascout engine runs yet. */
const UNRUN_CAPABILITIES: Readonly<Record<TestProfile, readonly string[]>> = Object.freeze({
  QUICK: ["quick-tests"],
  STANDARD: [],
  DEEP: ["mutation", "property-fuzz", "browser"],
  RELEASE: ["mutation", "property-fuzz", "browser", "contract", "performance-recovery"],
});

const RUNS_CHECK: Readonly<Record<TestProfile, boolean>> = Object.freeze({
  QUICK: false,
  STANDARD: true,
  DEEP: true,
  RELEASE: true,
});

export interface TestNotRunCapabilityV1 {
  readonly capability: string;
  readonly reason_code: "ENGINE_NOT_QUALIFIED" | "NO_REPOSITORY";
  readonly reason_text: string;
}

export interface TestCheckSummaryV1 {
  readonly receipt_schema_version: "1.0";
  readonly run_id: string;
  readonly exit_code: number;
  readonly completeness: string;
  readonly finding_count: number;
  readonly task_status_counts: ReceiptV1["summary"]["task_status_counts"];
  readonly tasks: readonly Readonly<{ task_id: string; status: TaskStatus; reason_code: string | null }>[];
  readonly source_start: Readonly<{ head_sha: string; tree_digest: string }>;
}

export type TestRunOutcomeV1 = "COMPLETE" | "FINDINGS" | "SOURCE_DRIFT" | "INCOMPLETE" | "NOT_RUN";

export type TestRunReportV2 = TestProfilePlanProjectionV1 &
  Readonly<{
    kind: "test";
    schema_version: typeof TEST_RUN_REPORT_SCHEMA_VERSION;
    outcome: TestRunOutcomeV1;
    reason_code: string;
    reason_text: string;
    exit_code: 0 | 1 | 3 | 4;
    executed_count: number;
    check: TestCheckSummaryV1 | null;
    not_run: readonly TestNotRunCapabilityV1[];
    /** The plan's effect classes and budgets are predictions. Nothing enforces them. */
    effects_enforced: false;
  }>;

export function profileRunsCheckV1(profile: TestProfile): boolean {
  return RUNS_CHECK[profile];
}

function notRunCapabilities(profile: TestProfile): readonly TestNotRunCapabilityV1[] {
  return UNRUN_CAPABILITIES[profile].map((capability) =>
    Object.freeze({
      capability,
      reason_code: "ENGINE_NOT_QUALIFIED" as const,
      reason_text: `No ${capability} engine runs in Ascout yet.`,
    }),
  );
}

/** A report for a profile that ran nothing: QUICK, or any profile outside a repository. */
export function buildTestNotRunReportV2(
  profile: TestProfile,
  reasonCode: "ENGINE_NOT_QUALIFIED" | "NO_REPOSITORY",
): TestRunReportV2 {
  const plan = projectTestProfilePlanFieldsV1(profile);
  return Object.freeze({
    ...plan,
    kind: "test",
    schema_version: TEST_RUN_REPORT_SCHEMA_VERSION,
    outcome: "NOT_RUN",
    reason_code: reasonCode,
    reason_text:
      reasonCode === "NO_REPOSITORY"
        ? `No usable Git repository here, so the verification required by the ${plan.profile} profile did not run.`
        : `No engine is qualified for it, so the verification required by the ${plan.profile} profile did not run.`,
    exit_code: 4,
    executed_count: 0,
    check: null,
    effects_enforced: false,
    not_run: Object.freeze(
      reasonCode === "NO_REPOSITORY"
        ? [
            ...(RUNS_CHECK[profile]
              ? [Object.freeze({ capability: "check", reason_code: "NO_REPOSITORY" as const, reason_text: "check needs a Git repository." })]
              : []),
            ...notRunCapabilities(profile),
          ]
        : notRunCapabilities(profile),
    ),
  });
}

function summarizeCheck(receipt: ReceiptV1): TestCheckSummaryV1 {
  return Object.freeze({
    receipt_schema_version: receipt.schema_version,
    run_id: receipt.run.run_id,
    exit_code: receipt.summary.exit_code,
    completeness: receipt.summary.completeness,
    finding_count: receipt.summary.finding_count,
    task_status_counts: receipt.summary.task_status_counts,
    tasks: Object.freeze(
      receipt.tasks.map((task) =>
        Object.freeze({ task_id: task.task_id, status: task.status, reason_code: task.reason_code }),
      ),
    ),
    source_start: Object.freeze({
      head_sha: receipt.source.start.head_sha,
      tree_digest: receipt.source.start.tree_digest,
    }),
  });
}

const EXECUTED: ReadonlySet<TaskStatus> = new Set<TaskStatus>(["PASS", "FAIL", "FLAKY"]);

export type TestRunResultV1 =
  | { readonly kind: "report"; readonly report: TestRunReportV2 }
  | { readonly kind: "error"; readonly message: string };

/**
 * Combines a `check` receipt with the profile's other requirements. Precedence follows A07:
 * 2, then 3, then 1, then 4, then 0. An error from `check` becomes exit 2 with no report.
 */
export function testRunResultFromReceiptV1(profile: TestProfile, receipt: ReceiptV1): TestRunResultV1 {
  const checkExit = receipt.summary.exit_code;
  if (checkExit === 2) {
    return {
      kind: "error",
      message:
        "ascout test: check reported an error, so no test result is reported. Its receipt is at .ascout/runs/" +
        receipt.run.run_id +
        "/receipt.json.",
    };
  }
  // check can complete with only typecheck or lint applicable. A test command needs a test.
  // Vitest runs with --passWithNoTests, so a passing JS test task that selected zero tests ran none.
  const zeroTestsSelected = receipt.selection?.selected_test_count === 0;
  const testRan = receipt.tasks.some((task) =>
    task.status === "PASS" && (task.task_type === "pytestBasic" || (task.task_type === "test" && !zeroTestsSelected))
  );
  const plan = projectTestProfilePlanFieldsV1(profile);
  const notRun = notRunCapabilities(profile);
  let exit: 0 | 1 | 3 | 4;
  if (checkExit === 3) exit = 3;
  else if (checkExit === 1) exit = 1;
  else if (checkExit === 4 || notRun.length > 0 || !testRan) exit = 4;
  else exit = 0;

  const outcome: TestRunOutcomeV1 =
    exit === 3 ? "SOURCE_DRIFT" : exit === 1 ? "FINDINGS" : exit === 4 ? "INCOMPLETE" : "COMPLETE";
  const reasonCode =
    exit === 3 ? "SOURCE_DRIFT"
      : exit === 1 ? "CHECK_FINDINGS"
      : checkExit === 4 ? "CHECK_INCOMPLETE"
      : notRun.length > 0 ? "REQUIRED_ENGINE_NOT_RUN"
      : !testRan ? "NO_TEST_EXECUTED"
      : "CHECK_COMPLETE";
  const reasonText =
    exit === 3 ? "The source changed during check, so its results describe a tree that no longer exists."
      : exit === 1 ? "check found failures or flaky tests."
      : checkExit === 4 ? "check did not complete all applicable verification."
      : notRun.length > 0 ? `check completed, but the ${plan.profile} profile also requires engines that did not run.`
      : !testRan ? "check completed, but no test task ran, so nothing was tested."
      : "check completed all applicable verification, including at least one passing test task.";

  return {
    kind: "report",
    report: Object.freeze({
      ...plan,
      kind: "test",
      schema_version: TEST_RUN_REPORT_SCHEMA_VERSION,
      outcome,
      reason_code: reasonCode,
      reason_text: reasonText,
      exit_code: exit,
      executed_count: receipt.tasks.filter((task) => EXECUTED.has(task.status)).length,
      check: summarizeCheck(receipt),
      not_run: Object.freeze(notRun),
      effects_enforced: false,
    }),
  };
}

export function renderTestRunTerminalV1(report: TestRunReportV2, checkSummary: string | null): string {
  const lines = [
    `=== Ascout Test (${report.outcome}) ===`,
    `profile: ${report.profile}`,
    `outcome: ${report.outcome} (${report.reason_code})`,
    report.reason_text,
    `executed: ${report.executed_count}`,
  ];
  if (report.check !== null) {
    lines.push(`check: exit ${report.check.exit_code}, ${report.check.completeness}, run ${report.check.run_id}`);
    for (const task of report.check.tasks) {
      lines.push(`  ${task.task_id}: ${task.status}${task.reason_code === null ? "" : ` (${task.reason_code})`}`);
    }
  }
  for (const item of report.not_run) lines.push(`not run: ${item.capability} (${item.reason_code})`);
  lines.push(`exit code: ${report.exit_code}`);
  lines.push("The plan's effect classes and budgets below are predictions; check runs repository commands with your permissions.");
  // The profile's plan, as `--plan` shows it, without that output's plan-only header.
  lines.push(...renderTestPlanTerminalV1(report).split("\n").slice(1));
  if (checkSummary !== null && checkSummary.length > 0) lines.push("", checkSummary);
  return lines.join("\n");
}
