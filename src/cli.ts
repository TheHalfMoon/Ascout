#!/usr/bin/env node
import { realpathSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { runCheck } from "./check.js";
import { collectDiscoveredProject } from "./discovery.js";
import { loadConfig, composeSourceState } from "./check.js";
import { classifyCommandSurfaces, type CommandSurfaceClassifyOptions } from "./discovery.js";
import { readStagedChangedPaths, readWorkingTreeComparison, refuseUnsupportedRepository } from "./git.js";
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
import {
  buildSecurityCommandReportV1,
  renderSecurityJsonV1,
  renderSecurityTerminalV1,
} from "./assurance/security/security-command.js";
import type { TestProfile } from "./assurance/test/profile-policy.js";

const COMMANDS = ["init", "doctor", "check", "review", "test", "security"] as const;
const ALLOW_CHANGED_COMMAND_SURFACE = "--allow-changed-command-surface";
const FORMAT_FLAG = "--format";
const PROFILE_FLAG = "--profile";
const PLAN_FLAG = "--plan";
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
}

interface DoctorResult {
  readonly output: string;
  readonly exitCode: number;
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
      if (commandToken !== "check" && commandToken !== "review" && commandToken !== "test" && commandToken !== "security") {
        throw new CliUsageError(`${FORMAT_FLAG} is valid only with the check, review, test, or security command.`);
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
  };
}

export function usageText(): string {
  return [
    "Usage:",
    "  ascout init",
    "  ascout doctor",
    `  ascout check [${ALLOW_CHANGED_COMMAND_SURFACE}] [${FORMAT_FLAG} json|agent]`,
    `  ascout review [${FORMAT_FLAG} json|terminal]`,
    `  ascout test [${PLAN_FLAG}] [${PROFILE_FLAG} quick|standard|deep|release] [${FORMAT_FLAG} json|terminal]`,
    `  ascout security [${FORMAT_FLAG} json|terminal]`,
  ].join("\n");
}

function redactLocalPathFromError(error: unknown, repositoryRoot: string): string {
  let message = String(error);
  const candidates = new Set([repositoryRoot, resolve(repositoryRoot)]);
  try {
    candidates.add(realpathSync(repositoryRoot));
  } catch {
    // A failing path may not have a resolvable real path; lexical candidates still apply.
  }
  for (const candidate of candidates) {
    if (candidate.length > 0) message = message.replaceAll(candidate, "<repository>");
  }
  return message;
}

// Reporting an error must not itself throw, including when the working directory is gone.
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

async function runInit(): Promise<number> {
  try {
    const root = process.cwd();

    const configPath = join(root, "ascout.config.json");
    if (!existsSync(configPath)) {
      writeFileSync(configPath, JSON.stringify({ version: 1 }, null, 2));
    }

    const gitignorePath = join(root, ".gitignore");
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
function collectReviewChanges(
  repositoryRoot: string,
  headSha: string,
  changedFiles: ReturnType<typeof readWorkingTreeComparison>["changed_files"],
): ReviewChangeV1[] {
  const changes: ReviewChangeV1[] = [];
  const seen = new Set<string>();
  const add = (change: ReviewChangeV1): void => {
    if (!seen.has(change.path)) {
      seen.add(change.path);
      changes.push(change);
    }
  };
  const toChange = (file: (typeof changedFiles)[number]): ReviewChangeV1 => ({
    path: file.path,
    change_kind: file.change_kind,
    ...(file.previous_path === undefined ? {} : { previous_path: file.previous_path }),
  });
  for (const file of changedFiles) {
    if (file.change_kind !== "untracked") add(toChange(file));
  }
  for (const file of changedFiles) {
    if (file.change_kind === "untracked") add(toChange(file));
  }
  const previousPaths = new Set(changes.flatMap((change) => change.previous_path ?? []));
  for (const staged of readStagedChangedPaths(repositoryRoot, headSha)) {
    if (!previousPaths.has(staged.path)) add(staged);
  }
  return changes;
}

function writeReviewReport(report: ReviewReportV1, format: ReviewFormat): void {
  if (format === "json") {
    process.stdout.write(renderReviewJsonV1(report));
  } else {
    console.error(renderReviewTerminalV1(report));
  }
}

async function runReview(
  repositoryRoot: string,
  format: ReviewFormat | undefined,
): Promise<number> {
  const sourceState = composeSourceState(repositoryRoot);
  const comparison = readWorkingTreeComparison(
    repositoryRoot,
    sourceState.head_sha,
  );
  const changes = collectReviewChanges(repositoryRoot, sourceState.head_sha, comparison.changed_files);
  const endState = composeSourceState(repositoryRoot);
  const outputFormat: ReviewFormat = format ?? "terminal";
  if (endState.head_sha !== sourceState.head_sha || endState.tree_digest !== sourceState.tree_digest) {
    const drift = buildReviewDriftReportV1(sourceState.repository_id, sourceState, endState);
    writeReviewReport(drift, outputFormat);
    return drift.exit_code;
  }
  const files = changes.map((change) => change.path).sort();
  const report = buildReviewCommandReportV1(
    files.length === 0
      ? buildEmptyReviewScopeV1(sourceState.repository_id, sourceState.head_sha)
      : buildReviewAbsenceReportV1(
          sourceState.repository_id,
          sourceState.head_sha,
          defaultUnavailableExecutionV1(
            sourceState.head_sha,
            "profile:review-default",
            "capsule:review-default",
          ),
          [{ group_id: "group:working-tree", files }],
        ),
    changes,
  );
  writeReviewReport(report, outputFormat);
  return report.exit_code;
}

function runTest(profile: TestProfile, planOnly: boolean, format: TestFormat | undefined): number {
  const report = buildTestCommandReportV1(profile, planOnly);
  if (format === "json") {
    process.stdout.write(renderTestPlanJsonV1(report));
  } else {
    console.error(renderTestCommandTerminalV1(report));
  }
  return report.exit_code;
}

export async function runCli(argv: readonly string[]): Promise<number> {
  try {
    const invocation = parseCliArgs(argv);
    if (invocation.command === "init") {
      return await runInit();
    }
    if (invocation.command === "check") {
      refuseUnsupportedRepository(process.cwd());
      const outcome = await runCheck(process.cwd(), {
        allowChangedCommandSurface: invocation.allowChangedCommandSurface,
      });
      if (invocation.format === "json") {
        process.stdout.write(renderReceiptJson(outcome.receipt));
      } else if (invocation.format === "agent") {
        process.stdout.write(renderReceiptAgent(outcome.receipt));
      } else {
        console.error(outcome.terminalSummary);
      }
      return outcome.receipt.summary.exit_code;
    }
    if (invocation.command === "doctor") {
      const result = runDoctor(process.cwd());
      console.error(result.output);
      return result.exitCode;
    }
    if (invocation.command === "review") {
      // parseCliArgs admits only json|terminal for the review command,
      // so this narrowing reflects parser-guaranteed input.
      const reviewFormat = invocation.format as ReviewFormat | undefined;
      refuseUnsupportedRepository(process.cwd());
      return await runReview(process.cwd(), reviewFormat);
    }
    if (invocation.command === "test") {
      // parseCliArgs admits only json|terminal for the test command,
      // so this narrowing reflects parser-guaranteed input.
      const testFormat = invocation.format as TestFormat | undefined;
      return runTest(invocation.profile ?? TEST_PLAN_DEFAULT_PROFILE, invocation.plan === true, testFormat);
    }
    if (invocation.command === "security") {
      // Local and read-only: no repository read, process, network, or file write.
      const report = buildSecurityCommandReportV1();
      if (invocation.format === "json") {
        process.stdout.write(renderSecurityJsonV1(report));
      } else {
        console.error(renderSecurityTerminalV1(report));
      }
      return report.exit_code;
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

function runDoctor(repositoryRoot: string): DoctorResult {
  try {
    refuseUnsupportedRepository(repositoryRoot);
    const { root, discovery } = collectDiscoveredProject(repositoryRoot);
    const { config } = loadConfig(root);
    const sourceState = composeSourceState(root);
    const gitComparison = readWorkingTreeComparison(root, sourceState.head_sha);
    const changedFiles = gitComparison.changed_files;
    const classifyOptions: CommandSurfaceClassifyOptions = {
      ascoutConfigPath: "ascout.config.json",
      tasks: config.tasks ?? null,
    };
    const surfaces = classifyCommandSurfaces(discovery, classifyOptions);

    const changedKindCounts = new Map<string, number>();
    for (const file of changedFiles) {
      changedKindCounts.set(file.change_kind, (changedKindCounts.get(file.change_kind) ?? 0) + 1);
    }

    const lines: string[] = [];
    lines.push("=== Doctor Output ===\n");
    lines.push(`Repository identity: ${sourceState.repository_id}`);
    lines.push(`Repository identity kind: ${sourceState.repository_id_kind}`);
    lines.push(`Portable identity: ${sourceState.portable}`);
    lines.push(`Config source: ${existsSync(join(root, "ascout.config.json")) ? "repository_config" : "built_in_defaults"}`);
    lines.push("\n--- Discovered Project ---");
    lines.push(`Workspace kind: ${discovery.workspace.kind}`);
    lines.push(`Package manager: ${discovery.packageManager.state === "resolved" ? discovery.packageManager.value : discovery.packageManager.reasonCode}`);
    lines.push(`Js test runner: ${discovery.jsTestRunner.state === "resolved" ? discovery.jsTestRunner.value : discovery.jsTestRunner.reasonCode}`);
    lines.push(`Pytest basic: ${discovery.pytestBasic.state === "resolved" ? discovery.pytestBasic.value : discovery.pytestBasic.reasonCode}`);
    lines.push("\n--- Authority Classification ---");
    for (const task of ["typecheck", "lint", "pytestBasic", "test"] as const) {
      const surface = surfaces[task];
      lines.push(`${task}:`);
      lines.push(`  authorityPathCount: ${surface.authorityPaths.length}`);
      lines.push(`  effectivePytestConfig: ${surface.effectivePytestConfig === null ? "absent" : "present"}`);
    }
    lines.push("\n--- Changed Files ---");
    lines.push(`Count: ${changedFiles.length}`);
    for (const kind of ["added", "modified", "deleted", "renamed", "type_changed", "untracked"] as const) {
      const count = changedKindCounts.get(kind) ?? 0;
      if (count > 0) lines.push(`  ${kind}: ${count}`);
    }
    return { output: lines.join("\n"), exitCode: 0 };
  } catch (error) {
    return {
      output: `Error during doctor: ${redactLocalPathFromError(error, repositoryRoot)}`,
      exitCode: OPERATIONAL_ERROR_EXIT_CODE,
    };
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
