import { runCheck } from "../check.js";
import { computeReviewV1, computeSecurityV1, type CommandResultV1 } from "../command-functions.js";
import { readGitHeadState, refuseUnsupportedRepository } from "../git.js";
import { testRunResultFromReceiptV1 } from "../assurance/test/test-run-command.js";
import { ASCOUT_PACKAGE_VERSION } from "../mcp/server.js";
import {
  buildPrEvidenceV1,
  stateForExitCode,
  type CheckId,
  type PrCheckV1,
  type PrEvidenceV1,
  type PrFindingV1,
} from "./pr-evidence.js";

/**
 * Collects PR evidence on the PR head, in the unprivileged job. It runs the same command paths as
 * the CLI: review without a model, security (Gitleaks only if configured), and the standard test
 * profile, which runs `check` and therefore the repository's own tools. That's T0 trusted-local
 * execution; on a pull request it belongs in a job with a read-only token and no secrets.
 */
export interface CollectOptionsV1 {
  readonly root: string;
  readonly gitleaksPath: string | null;
  readonly runTests: boolean;
  readonly signal?: AbortSignal;
  /** For tests: replaces the check run. */
  readonly runTestCheck?: (root: string, signal: AbortSignal) => Promise<CommandResultV1<{ exit_code: number; outcome: string; reason_text: string; failed_tasks: readonly string[] }>>;
}

function check(id: CheckId, exitCode: number, outcome: string, reason: string): PrCheckV1 {
  const code = ([0, 1, 2, 3, 4].includes(exitCode) ? exitCode : 2) as PrCheckV1["exit_code"];
  return { id, exit_code: code, state: stateForExitCode(code), outcome: outcome.slice(0, 64), reason: reason.slice(0, 500) };
}

function errorCheck(id: CheckId, message: string): PrCheckV1 {
  return check(id, 2, "ERROR", message);
}

const SEVERITY: Record<string, PrFindingV1["severity"]> = { critical: "failure", major: "failure", minor: "warning", info: "notice", unknown: "warning" };

async function defaultRunTestCheck(root: string, signal: AbortSignal): ReturnType<NonNullable<CollectOptionsV1["runTestCheck"]>> {
  const outcome = await runCheck(root, { signal });
  const result = testRunResultFromReceiptV1("STANDARD", outcome.receipt);
  if (result.kind === "error") return { kind: "error", message: result.message, exit_code: 2 };
  const failed = (result.report.check?.tasks ?? []).filter((task) => task.status === "FAIL").map((task) => task.task_id);
  return { kind: "report", exit_code: result.report.exit_code, report: { exit_code: result.report.exit_code, outcome: result.report.outcome, reason_text: result.report.reason_text, failed_tasks: failed } };
}

export async function collectPrEvidenceV1(options: CollectOptionsV1): Promise<PrEvidenceV1> {
  const signal = options.signal ?? new AbortController().signal;
  refuseUnsupportedRepository(options.root);
  const head = readGitHeadState(options.root).head_sha;
  const checks: PrCheckV1[] = [];
  const findings: PrFindingV1[] = [];

  const review = await computeReviewV1(options.root, { signal });
  if (review.kind === "error") {
    checks.push(errorCheck("review", review.message));
  } else {
    const report = review.report as { outcome?: string; reason_text?: string; records?: readonly { promotable: boolean; observation: { severity_hint: string; category_hint: string; body: string; location_hint: { path: string; start_line: number | null; end_line: number | null } | null } }[] };
    checks.push(check("review", review.exit_code, report.outcome ?? "UNKNOWN", report.reason_text ?? "See the review report."));
    for (const record of report.records ?? []) {
      if (!record.promotable) continue;
      const { observation } = record;
      findings.push({
        check: "review",
        path: observation.location_hint?.path ?? null,
        start_line: observation.location_hint?.start_line ?? null,
        end_line: observation.location_hint?.end_line ?? null,
        severity: SEVERITY[observation.severity_hint] ?? "warning",
        title: `Review (${observation.category_hint})`,
        message: observation.body.slice(0, 2000),
      });
    }
  }

  const security = await computeSecurityV1(options.root, options.gitleaksPath, signal);
  if (security.kind === "error") {
    checks.push(errorCheck("security", security.message));
  } else {
    const report = security.report.report as { outcome?: string; reason_text?: string; findings?: readonly { rule_id: string; path: string | null; start_line: number | null; end_line: number | null; message: string }[] };
    checks.push(check("security", security.exit_code, report.outcome ?? "UNKNOWN", report.reason_text ?? "See the security report."));
    for (const finding of report.findings ?? []) {
      findings.push({ check: "security", path: finding.path, start_line: finding.start_line, end_line: finding.end_line, severity: "failure", title: `Secret: ${finding.rule_id}`, message: finding.message.slice(0, 2000) });
    }
  }

  if (options.runTests) {
    const test = await (options.runTestCheck ?? defaultRunTestCheck)(options.root, signal);
    if (test.kind === "error") {
      checks.push(errorCheck("test", test.message));
    } else {
      checks.push(check("test", test.report.exit_code, test.report.outcome, test.report.reason_text));
      for (const task of test.report.failed_tasks) {
        findings.push({ check: "test", path: null, start_line: null, end_line: null, severity: "failure", title: `Task failed: ${task}`, message: `The ${task} task failed. See the check receipt in the job log.` });
      }
    }
  } else {
    checks.push(check("test", 4, "NOT_RUN", "Tests were not run in this collection (disabled by configuration)."));
  }

  // A file path or line from a tool must be repository-relative to become an annotation.
  const safe = findings.map((finding) => (finding.path !== null && (finding.path.startsWith("/") || finding.path.includes("..") || /^[A-Za-z]:/u.test(finding.path))
    ? { ...finding, path: null, start_line: null, end_line: null }
    : finding));
  return buildPrEvidenceV1({ ascout_version: ASCOUT_PACKAGE_VERSION, head_sha: head, checks, findings: safe });
}
