#!/usr/bin/env node
import { realpathSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { runCheck } from "./check.js";
import { collectDiscoveredProject } from "./discovery.js";
import { loadConfig, composeSourceState } from "./check.js";
import { classifyCommandSurfaces, type CommandSurfaceClassifyOptions } from "./discovery.js";
import { readWorkingTreeComparison } from "./git.js";
import { renderReceiptAgent } from "./receipt/agent.js";
import { renderReceiptJson } from "./receipt/json.js";

const COMMANDS = ["init", "doctor", "check"] as const;
const ALLOW_CHANGED_COMMAND_SURFACE = "--allow-changed-command-surface";
const FORMAT_FLAG = "--format";
const CHECK_FORMATS = ["json", "agent"] as const;

export type CliCommand = (typeof COMMANDS)[number];
export type CheckFormat = (typeof CHECK_FORMATS)[number];

type EntryDisposition = "direct" | "not_direct" | "resolution_error";

export interface CliInvocation {
  command: CliCommand;
  allowChangedCommandSurface: boolean;
  format?: CheckFormat;
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

export function parseCliArgs(argv: readonly string[]): CliInvocation {
  const [commandToken, ...rest] = argv;

  if (commandToken === undefined) {
    throw new CliUsageError("Missing command.");
  }

  if (!isCliCommand(commandToken)) {
    throw new CliUsageError(`Unknown command: ${commandToken}`);
  }

  let allowChangedCommandSurface = false;
  let format: CheckFormat | undefined;

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]!;

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
      if (commandToken !== "check") {
        throw new CliUsageError(`${FORMAT_FLAG} is valid only with the check command.`);
      }
      if (format !== undefined) {
        throw new CliUsageError(`${FORMAT_FLAG} may be supplied only once.`);
      }
      const value = rest[index + 1];
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

    throw new CliUsageError(`Unknown argument for ${commandToken}: ${token}`);
  }

  return {
    command: commandToken,
    allowChangedCommandSurface,
    ...(format === undefined ? {} : { format }),
  };
}

export function usageText(): string {
  return [
    "Usage:",
    "  ascout init",
    "  ascout doctor",
    `  ascout check [${ALLOW_CHANGED_COMMAND_SURFACE}] [${FORMAT_FLAG} json|agent]`,
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
    console.error(`ascout init failed: ${redactLocalPathFromError(error, process.cwd())}`);
    return 1;
  }
}

export async function runCli(argv: readonly string[]): Promise<number> {
  try {
    const invocation = parseCliArgs(argv);
    if (invocation.command === "init") {
      return await runInit();
    }
    if (invocation.command === "check") {
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
    console.error(`ascout ${invocation.command}: not implemented.`);
    return 2;
  } catch (error: unknown) {
    if (error instanceof CliUsageError) {
      console.error(`${error.message}\n\n${usageText()}`);
      return 2;
    }
    console.error(redactLocalPathFromError(error, process.cwd()));
    return 1;
  }
}

function runDoctor(repositoryRoot: string): DoctorResult {
  try {
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
      exitCode: 1,
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

const entryDisposition = classifyEntry();
if (entryDisposition === "direct") {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  }).catch((err) => {
    console.error("ascout: unexpected error:", redactLocalPathFromError(err, process.cwd()));
    process.exitCode = 1;
  });
} else if (entryDisposition === "resolution_error") {
  console.error("ascout: unable to resolve CLI entry path. No project task was executed.");
  process.exitCode = 2;
}
