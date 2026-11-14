#!/usr/bin/env node
import { closeSync, fstatSync, openSync, readFileSync, realpathSync, existsSync, lstatSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { runCheck } from "./check.js";
import { collectDiscoveredProject } from "./discovery.js";
import { loadConfig, composeSourceState } from "./check.js";
import { classifyCommandSurfaces, type CommandSurfaceClassifyOptions } from "./discovery.js";
import {
  readRepositoryPrefix,
  readStagedChangedPaths,
  readContainedWorktreeText,
  readWorkingTreeComparison,
  refuseUnsupportedRepository,
} from "./git.js";
import { renderReceiptAgent } from "./receipt/agent.js";
import { renderReceiptJson } from "./receipt/json.js";
import {
  buildEmptyReviewScopeV1,
  buildReviewAbsenceReportV1,
  buildReviewCommandReportV1,
  buildReviewDriftReportV1,
  defaultUnavailableExecutionV1,
  renderReviewJsonV1,
  renderReviewTerminalV1,
  type ReviewChangeV1,
  type ReviewReportV1,
} from "./assurance/review/review-command.js";
import {
  buildTestCommandReportV1,
  renderTestCommandTerminalV1,
  renderTestPlanJsonV1,
  TEST_PLAN_DEFAULT_PROFILE,
} from "./assurance/test/test-plan-command.js";
import { escapeTerminalText } from "./terminal-text.js";
import { looksInsideGitWorkTreeV1 } from "./assurance/repository-presence.js";
import { ASCOUT_PACKAGE_VERSION, serveMcpV1 } from "./mcp/server.js";
import { collectPrEvidenceV1 } from "./github/collect.js";
import { runPrPublishMainV1 } from "./github/publish-run.js";
import { runPrAiPublishMainV1, runPrAiReviewMainV1 } from "./github/pr-ai-review.js";
import {
  computeDoctorV1,
  computeDelegatedExportV1,
  computeDelegatedIngestV1,
  computeRemoteReviewV1,
  computeReviewV1,
  computeSecurityV1,
  computeTestPlanV1,
  redactLocalPathFromError,
  renderDoctorTerminalV1,
} from "./command-functions.js";
import { readLocalReviewConfigV1 } from "./assurance/review/local-review-provider.js";
import { runLocalReviewV1 } from "./assurance/review/local-review-run.js";
import { redactExactValues, selectedSecretValues } from "./redact.js";
import {
  buildTestNotRunReportV2,
  profileRunsCheckV1,
  renderTestRunTerminalV1,
  testRunResultFromReceiptV1,
  type TestRunReportV2,
} from "./assurance/test/test-run-command.js";
import {
  buildSecurityCommandReportV1,
  renderSecurityJsonV1,
  renderSecurityTerminalV1,
} from "./assurance/security/security-command.js";
import {
  configuredGitleaksPathV1,
  renderSecurityGitleaksTerminalV1,
  runSecurityGitleaksV1,
} from "./assurance/security/security-gitleaks.js";
import type { TestProfile } from "./assurance/test/profile-policy.js";

const COMMANDS = ["init", "doctor", "check", "review", "test", "security", "mcp", "pr-evidence", "pr-publish", "pr-ai-review", "pr-ai-publish"] as const;
const ALLOW_CHANGED_COMMAND_SURFACE = "--allow-changed-command-surface";
const FORMAT_FLAG = "--format";
const PROFILE_FLAG = "--profile";
const PLAN_FLAG = "--plan";
const LOCAL_MODEL_FLAG = "--local-model";
const EXPORT_TASK_FLAG = "--export-task";
const INGEST_FLAG = "--ingest";
const REMOTE_MODEL_FLAG = "--remote-model";
const DRY_RUN_FLAG = "--dry-run";
const CHECK_FORMATS = ["json", "agent"] as const;
const REVIEW_FORMATS = ["json", "terminal"] as const;
const TEST_FORMATS = ["json", "terminal"] as const;
const SECURITY_FORMATS = ["json", "terminal"] as const;
const TEST_PROFILE_TOKENS = ["quick", "standard", "deep", "release"] as const;
const REVIEW_WRITE_FLAGS = ["--publish", "--write", "--output", "--push"] as const;
const OPERATIONAL_ERROR_EXIT_CODE = 2;

export type CliCommand = (typeof COMMANDS)[number];
export type CheckFormat = (typeof CHECK_FORMATS)[number];
export type ReviewFormat = (typeof REVIEW_FORMATS)[number];
export type TestFormat = (typeof TEST_FORMATS)[number];
export type SecurityFormat = (typeof SECURITY_FORMATS)[number];
export type TestProfileToken = (typeof TEST_PROFILE_TOKENS)[number];

type EntryDisposition = "direct" | "not_direct" | "resolution_error";

export interface CliInvocation {
  command: CliCommand;
  allowChangedCommandSurface: boolean;
  format?: CheckFormat | ReviewFormat | TestFormat | SecurityFormat;
  profile?: TestProfile;
  plan?: true;
  localModel?: true;
  exportTaskPath?: string;
  ingestPath?: string;
  remoteModel?: true;
  dryRun?: true;
  skipTests?: true;
  bundlePath?: string;
  prHead?: string;
}

export class CliUsageError extends Error {
  override readonly name = "CliUsageError";
}

function isCliCommand(value: string): value is CliCommand {
  return COMMANDS.includes(value as CliCommand);
}

function isCheckFormat(value: string): value is CheckFormat {
  return CHECK_FORMATS.includes(value as CheckFormat);
}

function isReviewFormat(value: string): value is ReviewFormat {
  return REVIEW_FORMATS.includes(value as ReviewFormat);
}

function isTestFormat(value: string): value is TestFormat {
  return TEST_FORMATS.includes(value as TestFormat);
}

function isSecurityFormat(value: string): value is SecurityFormat {
  return SECURITY_FORMATS.includes(value as SecurityFormat);
}

function isTestProfileToken(value: string): value is TestProfileToken {
  return TEST_PROFILE_TOKENS.includes(value as TestProfileToken);
}

function resolveTestProfileToken(value: TestProfileToken): TestProfile {
  if (value === "quick") {
    return "QUICK";
  }
  if (value === "standard") {
    return "STANDARD";
  }
  if (value === "deep") {
    return "DEEP";
  }
  return "RELEASE";
}

export function parseCliArgs(argv: readonly string[]): CliInvocation {
  const [commandToken, ...rest] = argv;

  if (commandToken === undefined) {
    throw new CliUsageError("Missing command.");
  }

  if (!isCliCommand(commandToken)) {
    throw new CliUsageError(`Unknown command: ${commandToken}`);
  }

  let allowChangedCommandSurface = false;
  let format: CheckFormat | ReviewFormat | TestFormat | SecurityFormat | undefined;
  let profile: TestProfile | undefined;
  let plan = false;
  let localModel = false;
  let exportTaskPath: string | undefined;
  let ingestPath: string | undefined;
  let remoteModel = false;
  let dryRun = false;

  if (commandToken === "pr-ai-review") {
    if (rest.length !== 0) throw new CliUsageError("ascout pr-ai-review takes no arguments; it reads the workflow's environment.");
    return { command: "pr-ai-review", allowChangedCommandSurface: false };
  }
  if (commandToken === "pr-ai-publish") {
    if (rest.length !== 1 || rest[0]!.startsWith("-")) throw new CliUsageError("ascout pr-ai-publish takes one argument: the AI review artifact path.");
    return { command: "pr-ai-publish", allowChangedCommandSurface: false, bundlePath: rest[0]! };
  }
  if (commandToken === "pr-publish") {
    if (rest.length !== 1 || rest[0]!.startsWith("-")) {
      throw new CliUsageError("ascout pr-publish takes one argument: the evidence bundle path.");
    }
    return { command: "pr-publish", allowChangedCommandSurface: false, bundlePath: rest[0]! };
  }

  if (commandToken === "pr-evidence") {
    let skipTests = false;
    let prHead: string | undefined;
    for (let index = 0; index < rest.length; index += 1) {
      const token = rest[index]!;
      if (token === "--skip-tests" && !skipTests) {
        skipTests = true;
      } else if (token === "--pr-head" && prHead === undefined && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(rest[index + 1] ?? "")) {
        prHead = rest[index + 1]!;
        index += 1;
      } else {
        throw new CliUsageError("ascout pr-evidence accepts --skip-tests and --pr-head <sha>, a lowercase 40- or 64-hex commit ID.");
      }
    }
    return { command: "pr-evidence", allowChangedCommandSurface: false, ...(skipTests ? { skipTests: true as const } : {}), ...(prHead === undefined ? {} : { prHead }) };
  }

  if (commandToken === "mcp" && rest.length > 0) {
    // The scope of an MCP server is fixed by whoever launches it, and a repository's own MCP
    // config can launch it, so it accepts no options at all (E8 design, "who launches the server").
    throw new CliUsageError("ascout mcp takes no options.");
  }

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]!;

    if ((REVIEW_WRITE_FLAGS as readonly string[]).includes(token)) {
      if (commandToken === "review") {
        throw new CliUsageError(
          `${token} is refused: ascout review is read-only and has no write or publication authority.`,
        );
      }
    }

    if (token === ALLOW_CHANGED_COMMAND_SURFACE) {
      if (commandToken !== "check") {
        throw new CliUsageError(
          `${ALLOW_CHANGED_COMMAND_SURFACE} is valid only with the check command.`,
        );
      }
      if (allowChangedCommandSurface) {
        throw new CliUsageError(`${ALLOW_CHANGED_COMMAND_SURFACE} may be supplied only once.`);
      }
      allowChangedCommandSurface = true;
      continue;
    }

    if (token === FORMAT_FLAG) {
      if (commandToken !== "check" && commandToken !== "review" && commandToken !== "test" && commandToken !== "security" && commandToken !== "doctor") {
        throw new CliUsageError(`${FORMAT_FLAG} is valid only with the check, doctor, review, test, or security command.`);
      }
      if (format !== undefined) {
        throw new CliUsageError(`${FORMAT_FLAG} may be supplied only once.`);
      }
      const value = rest[index + 1];
      if (commandToken === "check") {
        if (value === undefined) {
          throw new CliUsageError(`${FORMAT_FLAG} requires one of: ${CHECK_FORMATS.join("|")}.`);
        }
        if (!isCheckFormat(value)) {
          throw new CliUsageError(
            `Unsupported check format: ${value}. Expected one of: ${CHECK_FORMATS.join("|")}.`,
          );
        }
        format = value;
        index += 1;
        continue;
      }
      if (value === undefined) {
        throw new CliUsageError(`${FORMAT_FLAG} requires one of: ${REVIEW_FORMATS.join("|")}.`);
      }
      if (commandToken === "doctor") {
        if (!isReviewFormat(value)) {
          throw new CliUsageError(
            `Unsupported doctor format: ${value}. Expected one of: ${REVIEW_FORMATS.join("|")}.`,
          );
        }
        format = value;
        index += 1;
        continue;
      }
      if (commandToken === "security") {
        if (!isSecurityFormat(value)) {
          throw new CliUsageError(
            `Unsupported security format: ${value}. Expected one of: ${SECURITY_FORMATS.join("|")}.`,
          );
        }
        format = value;
        index += 1;
        continue;
      }
      if (commandToken === "test") {
        if (!isTestFormat(value)) {
          throw new CliUsageError(
            `Unsupported test format: ${value}. Expected one of: ${TEST_FORMATS.join("|")}.`,
          );
        }
        format = value;
        index += 1;
        continue;
      }
      if (!isReviewFormat(value)) {
        throw new CliUsageError(
          `Unsupported review format: ${value}. Expected one of: ${REVIEW_FORMATS.join("|")}.`,
        );
      }
      format = value;
      index += 1;
      continue;
    }

    if (token === PROFILE_FLAG) {
      if (commandToken !== "test") {
        throw new CliUsageError(`${PROFILE_FLAG} is valid only with the test command.`);
      }
      if (profile !== undefined) {
        throw new CliUsageError(`${PROFILE_FLAG} may be supplied only once.`);
      }
      const value = rest[index + 1];
      if (value === undefined) {
        throw new CliUsageError(`${PROFILE_FLAG} requires one of: ${TEST_PROFILE_TOKENS.join("|")}.`);
      }
      if (!isTestProfileToken(value)) {
        throw new CliUsageError(
          `Unsupported test profile: ${value}. Expected one of: ${TEST_PROFILE_TOKENS.join("|")}.`,
        );
      }
      profile = resolveTestProfileToken(value);
      index += 1;
      continue;
    }

    if (token === LOCAL_MODEL_FLAG) {
      if (commandToken !== "review") {
        throw new CliUsageError(`${LOCAL_MODEL_FLAG} is valid only with the review command.`);
      }
      if (localModel) {
        throw new CliUsageError(`${LOCAL_MODEL_FLAG} may be supplied only once.`);
      }
      localModel = true;
      continue;
    }

    if (token === REMOTE_MODEL_FLAG || token === DRY_RUN_FLAG) {
      if (commandToken !== "review") {
        throw new CliUsageError(`${token} is valid only with the review command.`);
      }
      if (token === REMOTE_MODEL_FLAG) {
        if (remoteModel) throw new CliUsageError(`${REMOTE_MODEL_FLAG} may be supplied only once.`);
        remoteModel = true;
      } else {
        if (dryRun) throw new CliUsageError(`${DRY_RUN_FLAG} may be supplied only once.`);
        dryRun = true;
      }
      continue;
    }

    if (token === EXPORT_TASK_FLAG || token === INGEST_FLAG) {
      if (commandToken !== "review") {
        throw new CliUsageError(`${token} is valid only with the review command.`);
      }
      const value = rest[index + 1];
      if (value === undefined || value === "" || value.startsWith("--")) {
        throw new CliUsageError(`${token} needs a file path.`);
      }
      if (token === EXPORT_TASK_FLAG) {
        if (exportTaskPath !== undefined) throw new CliUsageError(`${EXPORT_TASK_FLAG} may be supplied only once.`);
        exportTaskPath = value;
      } else {
        if (ingestPath !== undefined) throw new CliUsageError(`${INGEST_FLAG} may be supplied only once.`);
        ingestPath = value;
      }
      index += 1;
      continue;
    }

    if (token === PLAN_FLAG) {
      if (commandToken !== "test") {
        throw new CliUsageError(`${PLAN_FLAG} is valid only with the test command.`);
      }
      if (plan) {
        throw new CliUsageError(`${PLAN_FLAG} may be supplied only once.`);
      }
      plan = true;
      continue;
    }

    throw new CliUsageError(`Unknown argument for ${commandToken}: ${token}`);
  }

  if ([localModel, remoteModel, exportTaskPath !== undefined, ingestPath !== undefined].filter(Boolean).length > 1) {
    throw new CliUsageError(`${LOCAL_MODEL_FLAG}, ${REMOTE_MODEL_FLAG}, ${EXPORT_TASK_FLAG}, and ${INGEST_FLAG} can't be combined.`);
  }
  if (dryRun && !remoteModel) {
    throw new CliUsageError(`${DRY_RUN_FLAG} is valid only with ${REMOTE_MODEL_FLAG}.`);
  }

  return {
    command: commandToken,
    allowChangedCommandSurface,
    ...(format === undefined ? {} : { format }),
    ...(profile === undefined ? {} : { profile }),
    ...(plan ? { plan: true as const } : {}),
    ...(localModel ? { localModel: true as const } : {}),
    ...(exportTaskPath === undefined ? {} : { exportTaskPath }),
    ...(ingestPath === undefined ? {} : { ingestPath }),
    ...(remoteModel ? { remoteModel: true as const } : {}),
    ...(dryRun ? { dryRun: true as const } : {}),
  };
}

export function usageText(): string {
  return [
    "Usage:",
    "  ascout init",
    `  ascout doctor [${FORMAT_FLAG} json|terminal]`,
    `  ascout check [${ALLOW_CHANGED_COMMAND_SURFACE}] [${FORMAT_FLAG} json|agent]`,
    `  ascout review [${LOCAL_MODEL_FLAG} | ${REMOTE_MODEL_FLAG} [${DRY_RUN_FLAG}] | ${EXPORT_TASK_FLAG} <path> | ${INGEST_FLAG} <findings.json>] [${FORMAT_FLAG} json|terminal]`,
    `  ascout test [${PLAN_FLAG}] [${PROFILE_FLAG} quick|standard|deep|release] [${FORMAT_FLAG} json|terminal]`,
    "  ascout pr-evidence [--skip-tests] [--pr-head <sha>]",
    "  ascout pr-publish <bundle>",
    "  ascout pr-ai-review",
    "  ascout pr-ai-publish <artifact>",
    `  ascout security [${FORMAT_FLAG} json|terminal]`,
    "  ascout mcp",
    "  ascout --help | --version",
  ].join("\n");
}

export { redactLocalPathFromError };

function describeOperationalError(error: unknown): string {
  try {
    return redactLocalPathFromError(error, process.cwd());
  } catch {
    return "ascout: operational error; details withheld because the working directory is unavailable.";
  }
}

function reportOperationalError(message: string): void {
  try {
    console.error(message);
  } catch {
    // Nothing further can be reported; the exit code still carries the error.
  }
}

/** Throws unless `path` is absent or a regular file, so init never writes through a link. */
function requireAbsentOrRegularFile(path: string, name: string): void {
  let stats;
  try {
    stats = lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  if (!stats.isFile()) throw new Error(`${name} is not a regular file; init does not write through links`);
}

/**
 * Reads .gitignore through a descriptor and accepts it only if the opened file is the same regular
 * file the link check saw, so a link swapped in between can't make init copy outside content into
 * the repository. An absent file reads as empty.
 */
function readCheckedGitignore(path: string): string {
  let before;
  try {
    // BigInt stats: Windows file IDs exceed 2^53, so number inodes could compare equal for two files.
    before = lstatSync(path, { bigint: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
  const descriptor = openSync(path, "r");
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || !opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
      throw new Error(".gitignore changed while init was reading it; init does not write through links");
    }
    return readFileSync(descriptor, "utf8");
  } finally {
    closeSync(descriptor);
  }
}

async function runInit(): Promise<number> {
  try {
    const root = process.cwd();
    // Inside a .git directory Git reports an empty prefix, so the check below would let init write
    // its files into Git's own storage.
    if (resolve(root).split(/[\\/]/u).some((segment) => segment.toLowerCase() === ".git")) {
      throw new Error("this folder is inside a .git directory; run ascout init at the repository root");
    }
    // check reads the config only at the repository root, so a config written in a subdirectory
    // would be silently ignored. Outside any repository, init is still allowed (before git init).
    const prefix = looksInsideGitWorkTreeV1(root) ? readRepositoryPrefix(root) : "";
    if (prefix !== "") {
      // Name the folder by its place in the repository, never by an absolute local path. The
      // enclosing repository may be a home folder under version control, so offer git init too.
      throw new Error(
        `this folder is ${JSON.stringify(prefix.replace(/\/$/u, ""))} inside a Git repository, and check reads a config only at a repository root. Run ascout init at that repository's root, or, if this folder is its own project, run git init here first.`,
      );
    }

    const configPath = join(root, "ascout.config.json");
    requireAbsentOrRegularFile(configPath, "ascout.config.json");
    const configCreated = !existsSync(configPath);
    if (configCreated) {
      // "wx" fails on anything already there, including a link created since the check.
      writeFileSync(configPath, JSON.stringify({ version: 1 }, null, 2), { flag: "wx" });
    }

    const gitignorePath = join(root, ".gitignore");
    requireAbsentOrRegularFile(gitignorePath, ".gitignore");
    const gitignoreEntry = ".ascout/";
    const gitignoreContent = readCheckedGitignore(gitignorePath);
    const lines = gitignoreContent.split(/\r?\n/);
    const ignoreAdded = !lines.some((line) => line.trim() === gitignoreEntry);
    if (ignoreAdded) {
      const newContent = gitignoreContent.endsWith("\n")
        ? gitignoreContent + gitignoreEntry
        : gitignoreContent
        ? gitignoreContent + "\n" + gitignoreEntry
        : gitignoreEntry;
      // Write a new file and rename it into place: a rename replaces whatever is at the path,
      // including a link swapped in since the check, instead of writing through it.
      const temporaryPath = join(root, `.gitignore.ascout-${randomBytes(6).toString("hex")}`);
      writeFileSync(temporaryPath, newContent, { flag: "wx" });
      try {
        renameSync(temporaryPath, gitignorePath);
      } catch (error) {
        rmSync(temporaryPath, { force: true });
        throw error;
      }
    }

    console.error(`ascout init: ${configCreated ? "created" : "kept the existing"} ascout.config.json; ${ignoreAdded ? "added .ascout/ to" : ".ascout/ was already in"} .gitignore.`);
    return 0;
  } catch (error) {
    reportOperationalError(`ascout init failed: ${describeOperationalError(error)}`);
    return OPERATIONAL_ERROR_EXIT_CODE;
  }
}
function writeReviewReport(report: ReviewReportV1, format: ReviewFormat): void {
  if (format === "json") {
    process.stdout.write(renderReviewJsonV1(report));
  } else {
    console.error(renderReviewTerminalV1(report));
  }
}

export async function runReview(
  repositoryRoot: string,
  format: ReviewFormat | undefined,
  localModel = false,
  /** Tests only: where review-provider.json lives. The CLI itself never passes it. */
  testConfigHome?: string,
): Promise<number> {
  const result = await computeReviewV1(repositoryRoot, { localModel, ...(testConfigHome === undefined ? {} : { configHome: testConfigHome }) });
  if (result.kind === "error") {
    reportOperationalError(result.message);
    return result.exit_code;
  }
  writeReviewReport(result.report, format ?? "terminal");
  return result.exit_code;
}

/** `ascout review --export-task <path>` (E10d): writes the task for the operator's own agent. */
export function runDelegatedExport(repositoryRoot: string, path: string, format: ReviewFormat | undefined): number {
  const result = computeDelegatedExportV1(repositoryRoot, path);
  if (result.kind === "error") {
    reportOperationalError(`ascout review --export-task failed: ${result.message}`);
    return result.exit_code;
  }
  if (result.report.kind === "drift") {
    writeReviewReport(result.report, format ?? "terminal");
  } else if (format === "json") {
    process.stdout.write(`${JSON.stringify(result.report, null, 2)}\n`);
  } else {
    const lines = [`=== Ascout review task (${result.report.outcome}) ===`, result.report.reason_text];
    if (result.report.task_sha256 !== null) lines.push(`task_sha256: ${result.report.task_sha256}`, `files: ${result.report.reviewed_files.length}`);
    console.error(lines.join("\n"));
  }
  return result.exit_code;
}

/** `ascout review --remote-model [--dry-run]` (E10c): an operator-paid remote model, off by default. */
export async function runRemoteReview(repositoryRoot: string, dryRun: boolean, format: ReviewFormat | undefined, testConfigHome?: string): Promise<number> {
  const result = await withRunCancellation((signal) => computeRemoteReviewV1(repositoryRoot, { dryRun, signal, ...(testConfigHome === undefined ? {} : { configHome: testConfigHome }) }));
  if (result.kind === "error") {
    reportOperationalError(result.message);
    return result.exit_code;
  }
  const value = result.report as { kind?: string };
  if (value.kind === "remote_review_dry_run") {
    if (format === "json") {
      process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    } else {
      const dry = value as unknown as { reason_text: string; disclosure: Record<string, unknown>; payload: string };
      console.error([`=== Ascout remote review (DRY RUN) ===`, dry.reason_text, ...Object.entries(dry.disclosure).map(([key, entry]) => `${key}: ${String(entry)}`), "--- payload ---", escapeTerminalText(dry.payload)].join("\n"));
    }
    return result.exit_code;
  }
  writeReviewReport(result.report as Parameters<typeof writeReviewReport>[0], format ?? "terminal");
  return result.exit_code;
}

/** `ascout review --ingest <findings.json>` (E10d): checks the agent's findings against the current task. */
export function runDelegatedIngest(repositoryRoot: string, path: string, format: ReviewFormat | undefined): number {
  const result = computeDelegatedIngestV1(repositoryRoot, path);
  if (result.kind === "error") {
    reportOperationalError(result.message);
    return result.exit_code;
  }
  writeReviewReport(result.report, format ?? "terminal");
  return result.exit_code;
}

async function runTest(profile: TestProfile, planOnly: boolean, format: TestFormat | undefined): Promise<number> {
  if (planOnly) {
    const result = computeTestPlanV1(profile);
    if (result.kind === "error") return result.exit_code;
    if (format === "json") {
      process.stdout.write(renderTestPlanJsonV1(result.report));
    } else {
      console.error(renderTestCommandTerminalV1(result.report));
    }
    return result.exit_code;
  }

  const writeReport = (report: TestRunReportV2, checkSummary: string | null): number => {
    if (format === "json") {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      console.error(renderTestRunTerminalV1(report, checkSummary));
    }
    return report.exit_code;
  };
  if (!profileRunsCheckV1(profile)) {
    return writeReport(buildTestNotRunReportV2(profile, "ENGINE_NOT_QUALIFIED"), null);
  }
  // Outside a repository, or without a working directory, nothing is bound to test (A07). A Git
  // failure inside a repository is an error instead, and the catch in runCli makes it exit 2.
  let root: string;
  try {
    root = process.cwd();
  } catch {
    return writeReport(buildTestNotRunReportV2(profile, "NO_REPOSITORY"), null);
  }
  if (!looksInsideGitWorkTreeV1(root)) {
    return writeReport(buildTestNotRunReportV2(profile, "NO_REPOSITORY"), null);
  }
  readRepositoryPrefix(root);
  refuseUnsupportedRepository(root);
  const outcome = await withRunCancellation((signal) => runCheck(root, { signal }));
  const result = testRunResultFromReceiptV1(profile, outcome.receipt);
  if (result.kind === "error") {
    // Exit 2 keeps stdout empty (A07); the check receipt stays in its run directory.
    reportOperationalError(result.message);
    return OPERATIONAL_ERROR_EXIT_CODE;
  }
  return writeReport(result.report, outcome.terminalSummary);
}

const CANCEL_SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"] as const;

/**
 * Runs check with its own cancellation. The first SIGINT, SIGTERM, or SIGHUP stops the running
 * task's process tree and skips the rest, so the receipt still records the run; a second exits at
 * once. Without this, Ctrl-C ended Ascout and left the task tree running with no timeout.
 */
export async function withRunCancellation<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const onSignal = (): void => {
    if (controller.signal.aborted) process.exit(OPERATIONAL_ERROR_EXIT_CODE);
    reportOperationalError("ascout: cancelling; stopping the running task. Signal again to exit at once.");
    controller.abort();
  };
  for (const name of CANCEL_SIGNALS) process.on(name, onSignal);
  try {
    return await run(controller.signal);
  } finally {
    for (const name of CANCEL_SIGNALS) process.off(name, onSignal);
  }
}

export async function runCli(argv: readonly string[]): Promise<number> {
  // Help and version are recognized only as the sole argument, so they never change what a
  // command does. Both go to stdout and exit 0; a usage error still goes to stderr with exit 2.
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help")) {
    process.stdout.write(`${usageText()}\n`);
    return 0;
  }
  if (argv.length === 1 && argv[0] === "--version") {
    process.stdout.write(`${ASCOUT_PACKAGE_VERSION}\n`);
    return 0;
  }
  try {
    const invocation = parseCliArgs(argv);
    if (invocation.command === "init") {
      return await runInit();
    }
    if (invocation.command === "check") {
      refuseUnsupportedRepository(process.cwd());
      const outcome = await withRunCancellation((signal) => runCheck(process.cwd(), {
        allowChangedCommandSurface: invocation.allowChangedCommandSurface,
        signal,
      }));
      if (invocation.format === "json") {
        process.stdout.write(renderReceiptJson(outcome.receipt));
      } else if (invocation.format === "agent") {
        process.stdout.write(renderReceiptAgent(outcome.receipt));
      } else {
        console.error(outcome.terminalSummary);
      }
      return outcome.receipt.summary.exit_code;
    }
    if (invocation.command === "pr-ai-review" || invocation.command === "pr-ai-publish") {
      // E10f: optional, advisory AI review in pull requests. Never changes a check run.
      const io = { env: process.env, cwd: realpathSync.native(process.cwd()), out: (line: string) => process.stdout.write(`${line}\n`), err: (line: string) => reportOperationalError(line) };
      return invocation.command === "pr-ai-review"
        ? await runPrAiReviewMainV1([], io)
        : await runPrAiPublishMainV1([invocation.bundlePath!], io);
    }
    if (invocation.command === "pr-publish") {
      // Privileged GitHub publish step; the same dependency-free function the C1 App-mode job runs.
      return await runPrPublishMainV1([invocation.bundlePath!], { env: process.env, cwd: process.cwd(), out: process.stdout, err: process.stderr });
    }
    if (invocation.command === "pr-evidence") {
      // The PR evidence bundle for the GitHub integration, as JSON on stdout. Runs the repository's
      // own tests unless --skip-tests (T0 trusted-local); exits with the overall A07 code.
      const root = realpathSync.native(process.cwd());
      const evidence = await withRunCancellation((signal) => collectPrEvidenceV1({ root, gitleaksPath: configuredGitleaksPathV1(), runTests: invocation.skipTests !== true, ...(invocation.prHead === undefined ? {} : { prHead: invocation.prHead }), signal }));
      process.stdout.write(`${JSON.stringify(evidence, null, 2)}
`);
      return evidence.overall.exit_code;
    }
    if (invocation.command === "mcp") {
      // Refuses to start outside a repository root, or in a repository Ascout refuses (exit 2).
      const root = realpathSync.native(process.cwd());
      refuseUnsupportedRepository(root);
      return await serveMcpV1({
        root,
        gitleaksPath: configuredGitleaksPathV1(),
        input: process.stdin,
        output: process.stdout,
        log: (line) => reportOperationalError(line),
      });
    }
    if (invocation.command === "doctor") {
      const result = computeDoctorV1(process.cwd());
      if (result.kind === "error") {
        console.error(result.message);
      } else if (invocation.format === "json") {
        process.stdout.write(`${JSON.stringify(result.report, null, 2)}
`);
      } else {
        console.error(renderDoctorTerminalV1(result.report));
      }
      return result.exit_code;
    }
    if (invocation.command === "review") {
      // parseCliArgs admits only json|terminal for the review command,
      // so this narrowing reflects parser-guaranteed input.
      const reviewFormat = invocation.format as ReviewFormat | undefined;
      if (invocation.exportTaskPath !== undefined) return runDelegatedExport(process.cwd(), invocation.exportTaskPath, reviewFormat);
      if (invocation.ingestPath !== undefined) return runDelegatedIngest(process.cwd(), invocation.ingestPath, reviewFormat);
      if (invocation.remoteModel === true) return await runRemoteReview(process.cwd(), invocation.dryRun === true, reviewFormat);
      return await runReview(process.cwd(), reviewFormat, invocation.localModel === true);
    }
    if (invocation.command === "test") {
      // parseCliArgs admits only json|terminal for the test command,
      // so this narrowing reflects parser-guaranteed input.
      const testFormat = invocation.format as TestFormat | undefined;
      return await runTest(invocation.profile ?? TEST_PLAN_DEFAULT_PROFILE, invocation.plan === true, testFormat);
    }
    if (invocation.command === "security") {
      const gitleaksPath = configuredGitleaksPathV1();
      let root: string | null = null;
      if (gitleaksPath !== null) {
        try {
          root = process.cwd();
        } catch {
          // A deleted working directory is outside a repository, as without an engine.
          root = null;
        }
      }
      // Without a configured engine: local and read-only, with no repository read, process,
      // network, or file write.
      const result = await computeSecurityV1(root, gitleaksPath);
      if (result.kind === "error") {
        // Exit 2 keeps stdout empty and reports no findings from the failed run (A07).
        reportOperationalError(result.message);
        return result.exit_code;
      }
      if (result.report.engine === "gitleaks") {
        if (invocation.format === "json") {
          process.stdout.write(`${JSON.stringify(result.report.report, null, 2)}
`);
        } else {
          console.error(renderSecurityGitleaksTerminalV1(result.report.report));
        }
      } else if (invocation.format === "json") {
        process.stdout.write(renderSecurityJsonV1(result.report.report));
      } else {
        console.error(renderSecurityTerminalV1(result.report.report));
      }
      return result.exit_code;
    }
    console.error(`ascout ${invocation.command}: not implemented.`);
    return 2;
  } catch (error: unknown) {
    if (error instanceof CliUsageError) {
      console.error(`${error.message}\n\n${usageText()}`);
      return 2;
    }
    // EnvironmentIdentityIntegrityError and every other operational error exit 2 (Amendment A07).
    reportOperationalError(describeOperationalError(error));
    return OPERATIONAL_ERROR_EXIT_CODE;
  }
}

function classifyEntry(): EntryDisposition {
  const entryPath = process.argv[1];
  if (entryPath === undefined) {
    return "not_direct";
  }

  try {
    return realpathSync(entryPath) === realpathSync(fileURLToPath(import.meta.url))
      ? "direct"
      : "not_direct";
  } catch {
    return "resolution_error";
  }
}

// A fault handler stops Node from terminating, so it must exit itself. Otherwise
// a pending runCli could still assign its own result over the error.
function terminateOnOperationalFault(error: unknown): void {
  reportOperationalError(`ascout: unexpected error: ${describeOperationalError(error)}`);
  process.exit(OPERATIONAL_ERROR_EXIT_CODE);
}

function installOperationalFaultHandlers(): void {
  process.on("uncaughtException", terminateOnOperationalFault);
  process.on("unhandledRejection", terminateOnOperationalFault);
  process.stdout.on("error", () => process.exit(OPERATIONAL_ERROR_EXIT_CODE));
  process.stderr.on("error", () => process.exit(OPERATIONAL_ERROR_EXIT_CODE));
}

const entryDisposition = classifyEntry();
if (entryDisposition === "direct") {
  installOperationalFaultHandlers();
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  }).catch(terminateOnOperationalFault);
} else if (entryDisposition === "resolution_error") {
  console.error("ascout: unable to resolve CLI entry path. No project task was executed.");
  process.exitCode = 2;
}
