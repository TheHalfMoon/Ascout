#!/usr/bin/env node
import { realpathSync, existsSync, lstatSync, writeFileSync, readFileSync } from "node:fs";
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
import { looksInsideGitWorkTreeV1 } from "./assurance/repository-presence.js";
import { serveMcpV1 } from "./mcp/server.js";
import {
  computeDoctorV1,
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

const COMMANDS = ["init", "doctor", "check", "review", "test", "security", "mcp"] as const;
const ALLOW_CHANGED_COMMAND_SURFACE = "--allow-changed-command-surface";
const FORMAT_FLAG = "--format";
const PROFILE_FLAG = "--profile";
const PLAN_FLAG = "--plan";
const LOCAL_MODEL_FLAG = "--local-model";
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

  return {
    command: commandToken,
    allowChangedCommandSurface,
    ...(format === undefined ? {} : { format }),
    ...(profile === undefined ? {} : { profile }),
    ...(plan ? { plan: true as const } : {}),
    ...(localModel ? { localModel: true as const } : {}),
  };
}

export function usageText(): string {
  return [
    "Usage:",
    "  ascout init",
    `  ascout doctor [${FORMAT_FLAG} json|terminal]`,
    `  ascout check [${ALLOW_CHANGED_COMMAND_SURFACE}] [${FORMAT_FLAG} json|agent]`,
    `  ascout review [${LOCAL_MODEL_FLAG}] [${FORMAT_FLAG} json|terminal]`,
    `  ascout test [${PLAN_FLAG}] [${PROFILE_FLAG} quick|standard|deep|release] [${FORMAT_FLAG} json|terminal]`,
    `  ascout security [${FORMAT_FLAG} json|terminal]`,
    "  ascout mcp",
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

async function runInit(): Promise<number> {
  try {
    const root = process.cwd();

    const configPath = join(root, "ascout.config.json");
    requireAbsentOrRegularFile(configPath, "ascout.config.json");
    if (!existsSync(configPath)) {
      // "wx" fails on anything already there, including a link created since the check.
      writeFileSync(configPath, JSON.stringify({ version: 1 }, null, 2), { flag: "wx" });
    }

    const gitignorePath = join(root, ".gitignore");
    requireAbsentOrRegularFile(gitignorePath, ".gitignore");
    const gitignoreEntry = ".ascout/";
    let gitignoreContent = "";
    if (existsSync(gitignorePath)) {
      gitignoreContent = readFileSync(gitignorePath, "utf8");
    }
    const lines = gitignoreContent.split(/\r?\n/);
    if (!lines.some((line) => line.trim() === gitignoreEntry)) {
      const newContent = gitignoreContent.endsWith("\n")
        ? gitignoreContent + gitignoreEntry
        : gitignoreContent
        ? gitignoreContent + "\n" + gitignoreEntry
        : gitignoreEntry;
      writeFileSync(gitignorePath, newContent);
    }

    console.error("ascout init: created ascout.config.json and ensured .ascout/ is ignored.");
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
): Promise<number> {
  const result = await computeReviewV1(repositoryRoot, { localModel });
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
