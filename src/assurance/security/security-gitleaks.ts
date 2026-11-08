/**
 * E5 part two — `ascout security` with Gitleaks.
 *
 * Opt-in: the caller names a Gitleaks executable in ASCOUT_GITLEAKS_PATH. It runs only when its
 * bytes match the executable digest pinned for this platform, so the path selects a copy and
 * never what runs. Without the variable, `ascout security` keeps its NOT_RUN report.
 *
 * Gitleaks never proves coverage, so a run with no finding is incomplete, not clean (exit 4).
 * A finding exits 1 and keeps the incomplete coverage visible (A07 clause 2). Errors exit 2 with
 * stdout empty, and source drift exits 3; neither reports findings from that run.
 */
import { createHash } from "node:crypto";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createEngineQualificationV1 } from "../contracts/engine-qualification.js";
import {
  engineProfileQualificationIdentityV1,
  type EngineProfileV1,
} from "../engines/engine-profile-v1.js";
import {
  runQualifiedEngineV1,
  type EngineRequestV1,
  type EngineRunResultV1,
} from "../engines/execution-broker.js";
import {
  createGitleaksProfileV1,
  GITLEAKS_CAPABILITY,
  GITLEAKS_RELEASE_V1,
  gitleaksArchiveForV1,
  gitleaksRegistryEntryV1,
  writeGitleaksConfigV1,
} from "../engines/gitleaks-profile.js";
import { createEngineQualificationSetV1 } from "../kernel/qualification.js";
import { createEngineRegistryV1 } from "../kernel/registry.js";
import { looksInsideGitWorkTreeV1 } from "../repository-presence.js";
import {
  readGitHeadState,
  readRepositoryPrefix,
  readTreeDigestV1,
  refuseUnsupportedRepository,
} from "../../git.js";
import { escapeTerminalText } from "../../terminal-text.js";

export const GITLEAKS_PATH_ENV = "ASCOUT_GITLEAKS_PATH" as const;

export interface SecurityFindingV1 {
  readonly rule_id: string;
  readonly path: string | null;
  readonly start_line: number | null;
  readonly end_line: number | null;
  readonly message: string;
}

export interface SecuritySourceV1 {
  readonly head_sha: string;
  readonly tree_digest: string;
}

/** The report for a Gitleaks run that reached a result. Exits 2 and 3 never produce one. */
export interface SecurityGitleaksReportV2 {
  readonly schema_version: 2;
  readonly kind: "security";
  readonly outcome: "FINDINGS" | "NOT_RUN" | "INCOMPLETE";
  readonly reason_code: string;
  readonly reason_text: string;
  readonly exit_code: 1 | 4;
  readonly executed_count: 0 | 1;
  readonly engine: Readonly<{
    id: string;
    version: string;
    executed: boolean;
    executable_sha256: string | null;
    run_status: string;
    run_reason_code: string;
  }>;
  readonly source: SecuritySourceV1 | null;
  readonly coverage: "PARTIAL" | "NONE";
  readonly findings: readonly SecurityFindingV1[];
  readonly limitations: readonly string[];
  readonly security_pass: false;
  readonly clean_claimed: false;
}

export type SecurityGitleaksOutcomeV1 =
  | { readonly kind: "report"; readonly report: SecurityGitleaksReportV2 }
  | { readonly kind: "drift"; readonly report: SecurityDriftReportV1 }
  | { readonly kind: "error"; readonly message: string };

export interface SecurityDriftReportV1 {
  readonly schema_version: 1;
  readonly kind: "drift";
  readonly outcome: "SOURCE_DRIFT";
  readonly exit_code: 3;
  readonly reason_code: "SOURCE_DRIFT";
  readonly reason_text: string;
  readonly executed_count: 0 | 1;
  readonly start: SecuritySourceV1 | null;
  readonly end: SecuritySourceV1 | null;
}

const COVERAGE_REASON =
  "Gitleaks does not report which files it scanned, so coverage is partial and no result is clean.";

function engineBlock(result: EngineRunResultV1 | null, executed: boolean) {
  return Object.freeze({
    id: "engine:gitleaks",
    version: GITLEAKS_RELEASE_V1.version,
    executed,
    executable_sha256: result?.executable_sha256 ?? null,
    run_status: result?.status ?? "NOT_RUN",
    run_reason_code: result?.reason_code ?? "NOT_STARTED",
  });
}

function notRun(reasonCode: string, reasonText: string, result: EngineRunResultV1 | null = null): SecurityGitleaksOutcomeV1 {
  return {
    kind: "report",
    report: Object.freeze({
      schema_version: 2,
      kind: "security",
      outcome: "NOT_RUN",
      reason_code: reasonCode,
      reason_text: reasonText,
      exit_code: 4,
      executed_count: 0,
      engine: engineBlock(result, false),
      source: result?.source_start ?? null,
      coverage: "NONE",
      findings: Object.freeze([]),
      limitations: Object.freeze([...(result?.limitations ?? [])]),
      security_pass: false,
      clean_claimed: false,
    }),
  };
}

function error(message: string): SecurityGitleaksOutcomeV1 {
  return { kind: "error", message: "ascout security: " + message };
}

/**
 * Maps a broker result to the command's exit and report. Pure, so every row is testable.
 * `observed` is the command's own reading of the source before it called the broker.
 */
export function securityOutcomeFromRunV1(
  result: EngineRunResultV1,
  observed: SecuritySourceV1 | null = null,
): SecurityGitleaksOutcomeV1 {
  const executed = result.started_at_epoch_ms !== null;
  // A07 precedence puts errors before drift. Withheld output is an error, whatever else happened.
  if (result.output_withheld) {
    return error("the Gitleaks run's output held a secret, so nothing from it is reported.");
  }
  if (result.reason_code === "SOURCE_BINDING_UNAVAILABLE") {
    return error("the source could not be read again around the scan, so nothing from it is reported.");
  }
  if (
    result.reason_code === "SOURCE_DRIFT_AT_START" ||
    result.reason_code === "SOURCE_DRIFT_AT_END"
  ) {
    // At the start, the broker's only reading is the changed one; the command's came first.
    const atStart = result.reason_code === "SOURCE_DRIFT_AT_START";
    return {
      kind: "drift",
      report: Object.freeze({
        schema_version: 1,
        kind: "drift",
        outcome: "SOURCE_DRIFT",
        exit_code: 3,
        reason_code: "SOURCE_DRIFT",
        reason_text: "The source changed while it was being scanned, so no result from this run is reported.",
        executed_count: executed ? 1 : 0,
        start: atStart ? observed : result.source_start,
        end: atStart ? result.source_start : result.source_end,
      }),
    };
  }

  switch (result.status) {
    case "UNAVAILABLE":
      return notRun(
        "ENGINE_UNAVAILABLE",
        result.reason_code === "EXECUTABLE_MISSING"
          ? "The configured Gitleaks executable was not found, so nothing was scanned."
          : "Gitleaks is not available here (" + result.reason_code + "), so nothing was scanned.",
        result,
      );
    case "NOT_RUN":
      return notRun("ENGINE_NOT_STARTED", "Gitleaks did not start (" + result.reason_code + ").", result);
    case "INCOMPLETE": {
      const findings = (result.envelope?.observations ?? []).map((observation) =>
        Object.freeze({
          rule_id: observation.rule_id,
          path: observation.location?.path ?? null,
          start_line: observation.location?.start_line ?? null,
          end_line: observation.location?.end_line ?? null,
          message: observation.message,
        }),
      );
      const partial = result.reason_code === "PARTIAL_COVERAGE";
      // A partial run always has an envelope. Without one, "found nothing" would be a guess.
      if (partial && result.envelope === null) {
        return error("the Gitleaks run reported partial coverage without a report.");
      }
      if (partial && findings.length > 0) {
        return {
          kind: "report",
          report: Object.freeze({
            schema_version: 2,
            kind: "security",
            outcome: "FINDINGS",
            reason_code: "SECRETS_FOUND",
            reason_text:
              findings.length + " potential secret(s) found. " + COVERAGE_REASON,
            exit_code: 1,
            executed_count: 1,
            engine: engineBlock(result, true),
            source: result.source_start,
            coverage: "PARTIAL",
            findings: Object.freeze(findings),
            limitations: Object.freeze([...result.limitations]),
            security_pass: false,
            clean_claimed: false,
          }),
        };
      }
      return {
        kind: "report",
        report: Object.freeze({
          schema_version: 2,
          kind: "security",
          outcome: "INCOMPLETE",
          reason_code: partial ? "COVERAGE_UNPROVEN" : result.reason_code,
          reason_text: partial
            ? "Gitleaks found nothing. " + COVERAGE_REASON
            : "The Gitleaks run did not complete (" + result.reason_code + "), so nothing is reported.",
          exit_code: 4,
          executed_count: executed ? 1 : 0,
          engine: engineBlock(result, executed),
          source: result.source_start,
          coverage: partial ? "PARTIAL" : "NONE",
          // A run stopped early has no envelope, so it shows no findings rather than some.
          findings: Object.freeze(partial ? findings : []),
          limitations: Object.freeze([...result.limitations]),
          security_pass: false,
          clean_claimed: false,
        }),
      };
    }
    case "EXECUTED":
      // Gitleaks coverage is always partial, so the broker can't report this. Refuse it.
      return error("the Gitleaks run reported complete coverage, which this engine cannot prove.");
    default:
      // VERSION_MISMATCH, DENIED_BY_POLICY, MALFORMED_OUTPUT, ENGINE_ERROR, TIMEOUT.
      return error(
        "the Gitleaks run failed (" + result.status + ", " + result.reason_code + "); no findings are reported from it.",
      );
  }
}

function hostPlatform(): { platform: EngineProfileV1["platform"]; arch: EngineProfileV1["arch"] } | null {
  const { platform, arch } = process;
  if ((platform === "win32" || platform === "linux" || platform === "darwin") && (arch === "x64" || arch === "arm64")) {
    return { platform, arch };
  }
  return null;
}

/**
 * Runs the configured Gitleaks over the repository at `root`. The caller has already checked
 * that the variable is set. Operational problems before the scan become an error outcome.
 */
export interface SecurityGitleaksOptionsV1 {
  readonly signal?: AbortSignal;
  /** For tests: the platform to look up a pin for. Defaults to this host. */
  readonly host?: { platform: string; arch: string };
}

export async function runSecurityGitleaksV1(
  root: string | null,
  configuredPath: string,
  options: SecurityGitleaksOptionsV1 = {},
): Promise<SecurityGitleaksOutcomeV1> {
  const signal = options.signal ?? new AbortController().signal;
  const host = options.host === undefined ? hostPlatform() : supportedHost(options.host);
  const archive = host === null ? null : gitleaksArchiveForV1(host.platform, host.arch);
  const pinned = archive?.executable_sha256 ?? null;
  if (host === null || pinned === null) {
    return notRun(
      "ENGINE_PLATFORM_UNQUALIFIED",
      "No Gitleaks executable is qualified for this platform, so nothing was scanned.",
    );
  }

  let executable: string;
  try {
    executable = realpathSync.native(configuredPath);
  } catch {
    return notRun("ENGINE_UNAVAILABLE", GITLEAKS_PATH_ENV + " does not name an existing file, so nothing was scanned.");
  }

  // Outside a repository there is nothing bound to scan, as before. Only that case is NOT_RUN:
  // a repository Ascout refuses, or a read that fails inside one, is an error.
  let sourceRoot: string;
  try {
    if (root === null) throw new Error("no working directory");
    sourceRoot = realpathSync.native(root);
  } catch {
    return notRun("NO_REPOSITORY", "No usable Git repository here, so nothing was scanned.");
  }
  if (!looksInsideGitWorkTreeV1(sourceRoot)) {
    return notRun("NO_REPOSITORY", "No usable Git repository here, so nothing was scanned.");
  }
  let source: SecuritySourceV1;
  try {
    readRepositoryPrefix(sourceRoot);
    refuseUnsupportedRepository(sourceRoot);
    source = {
      head_sha: readGitHeadState(sourceRoot).head_sha,
      tree_digest: readTreeDigestV1(sourceRoot).tree_digest,
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (/run from the repository root/u.test(message)) return error("run from the repository root.");
    return error("the repository could not be read for scanning (" + gitReason(message) + ").");
  }

  let workspace: string;
  try {
    workspace = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-gitleaks-")));
  } catch {
    return error("a temporary configuration directory could not be created.");
  }
  try {
    const profile = createGitleaksProfileV1({
      executable_absolute_path: executable,
      executable_sha256: pinned,
      config_absolute_path: writeGitleaksConfigV1(workspace),
      platform: host.platform,
      arch: host.arch,
    });
    const entry = gitleaksRegistryEntryV1(profile);
    const platformId = host.platform + "-" + host.arch;
    // This record is self-issued and cannot fail: it names the profile this run builds. The
    // authority is the pinned executable digest and the fixed configuration digest, which the
    // broker checks. Its digest fields are derived from those pins, not from any other evidence.
    const pinDigest = createHash("sha256")
      .update(JSON.stringify([GITLEAKS_RELEASE_V1.tag, archive?.sha256 ?? null, pinned, profile.config_sha256]))
      .digest("hex");
    const qualification = createEngineQualificationV1({
      qualification_id: "qualification:gitleaks-8.30.1-" + platformId,
      engine_id: entry.descriptor.engine_id,
      implementation_identity: entry.descriptor.implementation_identity,
      configuration_identity: entry.configuration_identity,
      profile_identities: [engineProfileQualificationIdentityV1(profile)],
      benchmark_corpus_identity: {
        benchmark_id: "benchmark:pinned-gitleaks",
        corpus_id: "corpus:pinned-gitleaks-" + platformId,
        corpus_sha256: pinDigest,
      },
      platform_identity: {
        platform_id: "platform:" + platformId,
        platform_sha256: createHash("sha256").update(platformId + ":" + pinned).digest("hex"),
      },
      evidence_refs: [{ evidence_ref: "evidence:pinned-executable-digest", provider_self_description: false }],
      result: "QUALIFIED",
      qualified_at_epoch_ms: Date.parse(GITLEAKS_RELEASE_V1.published_at),
      expires_at_epoch_ms: null,
    });
    const request: EngineRequestV1 = {
      schema: "ascout-engine-request/1",
      request_id: "request:security-" + Date.now().toString(36),
      source: { root_absolute_path: sourceRoot, ...source },
      capabilities: [GITLEAKS_CAPABILITY],
      qualification: {
        registry: createEngineRegistryV1([entry]),
        qualification_set: createEngineQualificationSetV1([qualification]),
        benchmark_corpus_identity: qualification.benchmark_corpus_identity,
        platform_identity: qualification.platform_identity,
      },
    };
    return securityOutcomeFromRunV1(await runQualifiedEngineV1(request, profile, signal), source);
  } finally {
    // Only the directory this run created. A failed removal must not replace the result.
    try {
      rmSync(workspace, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {
      // Left in the temporary directory; it holds only the fixed public configuration.
    }
  }
}

/** A fixed, path-free summary of a Git failure. */
function gitReason(message: string): string {
  if (/partial clone|promisor/iu.test(message)) return "partial clone";
  if (/submodule/iu.test(message)) return "submodule";
  if (/filter/iu.test(message)) return "Git filter attribute";
  if (/unborn|no commits/iu.test(message)) return "no commits yet";
  return "Git metadata error";
}

function supportedHost(host: { platform: string; arch: string }): ReturnType<typeof hostPlatform> {
  const { platform, arch } = host;
  if ((platform === "win32" || platform === "linux" || platform === "darwin") && (arch === "x64" || arch === "arm64")) {
    return { platform, arch };
  }
  return null;
}

// Repository file names reach the terminal, so controls and bidirectional overrides are escaped.
function printable(text: string): string {
  return escapeTerminalText(text);
}

export function renderSecurityGitleaksTerminalV1(report: SecurityGitleaksReportV2 | SecurityDriftReportV1): string {
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
    `engine: gitleaks ${report.engine.version} (${report.engine.executed ? "executed" : "not executed"})`,
  ];
  for (const finding of report.findings) {
    const where = finding.path === null ? "(location withheld)" : `${printable(finding.path)}:${finding.start_line}`;
    lines.push(`  ${finding.rule_id}  ${where}  ${printable(finding.message)}`);
  }
  for (const limitation of report.limitations) lines.push(`limitation: ${limitation}`);
  lines.push("This is not a security pass and not a clean result.", `exit code: ${report.exit_code}`);
  return lines.join("\n");
}

/** Reads the variable once. An empty value counts as unset. */
export function configuredGitleaksPathV1(env: NodeJS.ProcessEnv = process.env): string | null {
  const value = env[GITLEAKS_PATH_ENV];
  return value === undefined || value.length === 0 ? null : value;
}
