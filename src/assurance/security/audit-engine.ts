import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";

import {
  readGitHeadState,
  readRepositoryPrefix,
  readTreeDigestV1,
  refuseUnsupportedRepository,
} from "../../git.js";
import { escapeTerminalText } from "../../terminal-text.js";
import { ASCOUT_PACKAGE_VERSION } from "../../version.js";
import { looksInsideGitWorkTreeV1 } from "../repository-presence.js";
import {
  runSecurityReconV1,
  type AttackSurfaceKindV1,
  type OmittedSecurityFileV1,
} from "./audit-recon.js";
import {
  runSecurityRulesV1,
  sortSecurityFindingsV1,
  type SecurityAuditFindingV1,
} from "./audit-rules.js";
import {
  runSecurityGitleaksV1,
  type SecurityDriftReportV1,
  type SecuritySourceV1,
} from "./security-gitleaks.js";

export const ASCOUT_SECURITY_ENGINE_ID = "engine:ascout-security-core" as const;
export const SECURITY_AUDIT_SCHEMA_VERSION = 3 as const;

export interface SecurityAuditReportV3 {
  readonly schema_version: typeof SECURITY_AUDIT_SCHEMA_VERSION;
  readonly kind: "security";
  readonly outcome: "FINDINGS" | "INCOMPLETE" | "NOT_RUN";
  readonly reason_code: string;
  readonly reason_text: string;
  readonly exit_code: 1 | 4;
  readonly executed_count: 0 | 1;
  readonly engine: Readonly<{
    id: typeof ASCOUT_SECURITY_ENGINE_ID;
    version: string;
    mode: "deterministic";
    executed: boolean;
    gitleaks_executed: boolean;
  }>;
  readonly source: SecuritySourceV1 | null;
  readonly coverage: Readonly<{
    state: "PARTIAL" | "NONE";
    scanned_file_count: number;
    unsupported_file_count: number;
    omitted_file_count: number;
    excluded_directories: readonly string[];
    omitted_files: readonly OmittedSecurityFileV1[];
    attack_surfaces: readonly AttackSurfaceKindV1[];
    offline_advisory_catalog_only: true;
  }>;
  readonly counts: Readonly<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
  readonly findings: readonly SecurityAuditFindingV1[];
  readonly limitations: readonly string[];
  readonly security_pass: false;
  readonly clean_claimed: false;
}

export type SecurityAuditOutcomeV3 =
  | { readonly kind: "report"; readonly report: SecurityAuditReportV3 }
  | { readonly kind: "drift"; readonly report: SecurityDriftReportV1 }
  | { readonly kind: "error"; readonly message: string };

export interface SecurityAuditDepsV1 {
  readonly readSource?: (root: string) => SecuritySourceV1;
  readonly runGitleaks?: typeof runSecurityGitleaksV1;
}

export interface SecurityAuditOptionsV1 {
  readonly gitleaksPath?: string | null;
  readonly signal?: AbortSignal;
  readonly maxFileBytes?: number;
  readonly maxFiles?: number;
  readonly deps?: SecurityAuditDepsV1;
}

function defaultReadSource(root: string): SecuritySourceV1 {
  return {
    head_sha: readGitHeadState(root).head_sha,
    tree_digest: readTreeDigestV1(root).tree_digest,
  };
}

export function classifyGitFailureReasonV1(message: string): string {
  if (/partial clone|promisor/iu.test(message)) return "partial clone";
  if (/submodule/iu.test(message)) return "submodule";
  if (/filter/iu.test(message)) return "Git filter attribute";
  if (/unborn|no commits|ambiguous argument 'HEAD'|unknown revision/iu.test(message)) return "no commits yet";
  return "Git metadata error";
}

function makeNotRunReport(reasonCode: string, reasonText: string): SecurityAuditReportV3 {
  return {
    schema_version: SECURITY_AUDIT_SCHEMA_VERSION,
    kind: "security",
    outcome: "NOT_RUN",
    reason_code: reasonCode,
    reason_text: reasonText,
    exit_code: 4,
    executed_count: 0,
    engine: {
      id: ASCOUT_SECURITY_ENGINE_ID,
      version: ASCOUT_PACKAGE_VERSION,
      mode: "deterministic",
      executed: false,
      gitleaks_executed: false,
    },
    source: null,
    coverage: {
      state: "NONE",
      scanned_file_count: 0,
      unsupported_file_count: 0,
      omitted_file_count: 0,
      excluded_directories: [],
      omitted_files: [],
      attack_surfaces: [],
      offline_advisory_catalog_only: true,
    },
    counts: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
    findings: [],
    limitations: ["No usable Git repository was present at the working directory."],
    security_pass: false,
    clean_claimed: false,
  };
}

export function countSecurityFindingsV1(findings: readonly SecurityAuditFindingV1[]): SecurityAuditReportV3["counts"] {
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const finding of findings) {
    if (finding.severity === "critical") critical += 1;
    else if (finding.severity === "high") high += 1;
    else if (finding.severity === "medium") medium += 1;
    else low += 1;
  }
  return { total: findings.length, critical, high, medium, low };
}

/**
 * Runs Ascout's deterministic, offline deep security audit over `root`, optionally merging
 * findings from a hash-pinned Gitleaks binary when `gitleaksPath` is configured.
 *
 * Honesty invariants:
 * - Outside a repository / deleted cwd: `NOT_RUN` (exit 4), reads nothing.
 * - Source drift across the scan: `SOURCE_DRIFT` (exit 3), reports no findings.
 * - Confirmed findings: `FINDINGS` (exit 1).
 * - Zero findings: `INCOMPLETE` (exit 4, `security_pass: false`, `clean_claimed: false`) because
 *   static analysis and offline advisory checks cannot prove absence of vulnerabilities.
 */
export async function runSecurityAuditV1(
  root: string | null,
  options: SecurityAuditOptionsV1 = {},
): Promise<SecurityAuditOutcomeV3> {
  let sourceRoot: string;
  try {
    if (root === null) throw new Error("no working directory");
    sourceRoot = realpathSync.native(root);
  } catch {
    return {
      kind: "report",
      report: makeNotRunReport("NO_REPOSITORY", "No usable Git repository here, so nothing was scanned."),
    };
  }
  if (!looksInsideGitWorkTreeV1(sourceRoot)) {
    return {
      kind: "report",
      report: makeNotRunReport("NO_REPOSITORY", "No usable Git repository here, so nothing was scanned."),
    };
  }

  const readSource = options.deps?.readSource ?? defaultReadSource;
  const readSourceSafe = (withRootChecks: boolean): { readonly ok: true; readonly source: SecuritySourceV1 } | { readonly ok: false; readonly message: string } => {
    try {
      if (withRootChecks) {
        readRepositoryPrefix(sourceRoot);
        refuseUnsupportedRepository(sourceRoot);
      }
      return { ok: true, source: readSource(sourceRoot) };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      if (/run from the repository root/u.test(message)) {
        return { ok: false, message: "ascout security: run from the repository root." };
      }
      return {
        ok: false,
        message: `ascout security: the repository could not be read for scanning (${classifyGitFailureReasonV1(message)}).`,
      };
    }
  };
  const startRead = readSourceSafe(true);
  if (!startRead.ok) return { kind: "error", message: startRead.message };
  const sourceStart = startRead.source;

  const recon = runSecurityReconV1(sourceRoot, {
    ...(options.maxFileBytes === undefined ? {} : { maxFileBytes: options.maxFileBytes }),
    ...(options.maxFiles === undefined ? {} : { maxFiles: options.maxFiles }),
  });
  const mergedFindings: SecurityAuditFindingV1[] = [...runSecurityRulesV1(recon.scanned_files)];
  const limitations: string[] = [
    "Static analysis and offline advisory matching provide partial coverage only and cannot prove absence of vulnerabilities.",
    "Dependency advisory checks use a built-in offline catalog only (no network lookup).",
    "Test and fixture paths are excluded from source code and secret rules.",
  ];
  let gitleaksExecuted = false;

  const gitleaksPath = options.gitleaksPath ?? null;
  if (gitleaksPath !== null) {
    const runGitleaks = options.deps?.runGitleaks ?? runSecurityGitleaksV1;
    const gitleaksOutcome = await runGitleaks(
      sourceRoot,
      gitleaksPath,
      options.signal === undefined ? {} : { signal: options.signal },
    );
    if (gitleaksOutcome.kind === "error") {
      return { kind: "error", message: gitleaksOutcome.message };
    }
    if (gitleaksOutcome.kind === "drift") {
      return { kind: "drift", report: gitleaksOutcome.report };
    }
    gitleaksExecuted = gitleaksOutcome.report.engine.executed;
    const seen = new Set(mergedFindings.map((f) => `${f.path}:${f.start_line}:${f.rule_id}`));
    for (const finding of gitleaksOutcome.report.findings) {
      const path = finding.path ?? "(location withheld)";
      const startLine = finding.start_line ?? 1;
      const endLine = finding.end_line ?? startLine;
      const key = `${path}:${startLine}:${finding.rule_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      mergedFindings.push({
        finding_id: `sec_${createHash("sha256").update(`gitleaks\0${key}\0${finding.message}`, "utf8").digest("hex").slice(0, 16)}`,
        rule_id: finding.rule_id,
        cwe: "CWE-798",
        severity: "critical",
        confidence: "high",
        category: "secrets",
        path,
        start_line: startLine,
        end_line: endLine,
        message: finding.message,
        evidence_excerpt: "<REDACTED:gitleaks>",
        remediation: "Revoke and rotate the exposed credential immediately, and load secrets outside source control.",
      });
    }
    for (const lim of gitleaksOutcome.report.limitations) {
      if (!limitations.includes(lim)) limitations.push(lim);
    }
    sortSecurityFindingsV1(mergedFindings);
  }

  const endRead = readSourceSafe(false);
  if (!endRead.ok) return { kind: "error", message: endRead.message };
  const sourceEnd = endRead.source;
  if (sourceEnd.head_sha !== sourceStart.head_sha || sourceEnd.tree_digest !== sourceStart.tree_digest) {
    return {
      kind: "drift",
      report: {
        schema_version: 1,
        kind: "drift",
        outcome: "SOURCE_DRIFT",
        exit_code: 3,
        reason_code: "SOURCE_DRIFT",
        reason_text: "The source changed while it was being scanned, so no result from this run is reported.",
        executed_count: 1,
        start: sourceStart,
        end: sourceEnd,
      },
    };
  }

  if (recon.omitted_files.length > 0) {
    limitations.push(`${recon.omitted_files.length} file(s) were omitted (symlink, binary, oversized, or cap exceeded).`);
  }
  if (recon.unsupported_files.length > 0) {
    limitations.push(`${recon.unsupported_files.length} file(s) have extensions outside Ascout's deterministic security rule set.`);
  }

  const counts = countSecurityFindingsV1(mergedFindings);
  const hasFindings = counts.total > 0;
  return {
    kind: "report",
    report: {
      schema_version: SECURITY_AUDIT_SCHEMA_VERSION,
      kind: "security",
      outcome: hasFindings ? "FINDINGS" : "INCOMPLETE",
      reason_code: hasFindings ? "SECURITY_FINDINGS_DETECTED" : "NO_FINDINGS_STATIC_PARTIAL_COVERAGE",
      reason_text: hasFindings
        ? `${counts.total} deterministic security finding(s) detected across ${recon.scanned_files.length} scanned file(s).`
        : `0 deterministic security findings across ${recon.scanned_files.length} scanned file(s); static analysis coverage is partial and not a vulnerability-free claim.`,
      exit_code: hasFindings ? 1 : 4,
      executed_count: 1,
      engine: {
        id: ASCOUT_SECURITY_ENGINE_ID,
        version: ASCOUT_PACKAGE_VERSION,
        mode: "deterministic",
        executed: true,
        gitleaks_executed: gitleaksExecuted,
      },
      source: sourceStart,
      coverage: {
        state: "PARTIAL",
        scanned_file_count: recon.scanned_files.length,
        unsupported_file_count: recon.unsupported_files.length,
        omitted_file_count: recon.omitted_files.length,
        excluded_directories: recon.excluded_directories,
        omitted_files: recon.omitted_files,
        attack_surfaces: recon.attack_surfaces,
        offline_advisory_catalog_only: true,
      },
      counts,
      findings: mergedFindings,
      limitations,
      security_pass: false,
      clean_claimed: false,
    },
  };
}

export function renderSecurityAuditJsonV1(report: SecurityAuditReportV3): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function renderSecurityAuditTerminalV1(report: SecurityAuditReportV3 | SecurityDriftReportV1): string {
  if (report.kind === "drift") {
    return [
      "=== Ascout Security (SOURCE_DRIFT) ===",
      report.reason_text,
      `start: ${report.start?.head_sha ?? "unknown"} ${report.start?.tree_digest ?? ""}`.trimEnd(),
      `end: ${report.end?.head_sha ?? "unknown"} ${report.end?.tree_digest ?? ""}`.trimEnd(),
      `exit code: ${report.exit_code}`,
    ].join("\n");
  }
  const lines = [
    `=== Ascout Security (${report.outcome}) ===`,
    `outcome: ${report.outcome} (${report.reason_code})`,
    report.reason_text,
    `engine: ${report.engine.id} ${report.engine.version} (${report.engine.executed ? "executed" : "not executed"}${report.engine.gitleaks_executed ? " + gitleaks" : ""})`,
    `coverage: ${report.coverage.state} (${report.coverage.scanned_file_count} scanned, ${report.coverage.unsupported_file_count} unsupported, ${report.coverage.omitted_file_count} omitted)`,
  ];
  if (report.coverage.attack_surfaces.length > 0) {
    lines.push(`attack surfaces: ${report.coverage.attack_surfaces.join(", ")}`);
  }
  for (const finding of report.findings) {
    lines.push(
      `  [${finding.severity.toUpperCase()}] ${finding.rule_id} (${finding.cwe})  ${escapeTerminalText(finding.path)}:${finding.start_line}  ${escapeTerminalText(finding.message)}`,
    );
  }
  for (const limitation of report.limitations) {
    lines.push(`limitation: ${limitation}`);
  }
  lines.push("This is not a security pass and not a clean result.", `exit code: ${report.exit_code}`);
  return lines.join("\n");
}
