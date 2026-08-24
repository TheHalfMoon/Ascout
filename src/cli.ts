#!/usr/bin/env node
import { realpathSync, mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { runCheck } from "./check.js";
import { collectDiscoveredProject } from "./discovery.js";
import { loadConfig, composeSourceState } from "./check.js";
import { classifyCommandSurfaces, type CommandSurfaceClassifyOptions } from "./discovery.js";
import { readWorkingTreeComparison } from "./git.js";

const COMMANDS = ["init", "doctor", "check"] as const;
const ALLOW_CHANGED_COMMAND_SURFACE = "--allow-changed-command-surface";

export type CliCommand = (typeof COMMANDS)[number];

type EntryDisposition = "direct" | "not_direct" | "resolution_error";

export interface CliInvocation {
  command: CliCommand;
  allowChangedCommandSurface: boolean;
}

export class CliUsageError extends Error {
  override readonly name = "CliUsageError";
}

function isCliCommand(value: string): value is CliCommand {
  return COMMANDS.includes(value as CliCommand);
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

  for (const token of rest) {
    if (token !== ALLOW_CHANGED_COMMAND_SURFACE) {
      throw new CliUsageError(`Unknown argument for ${commandToken}: ${token}`);
    }

    if (commandToken !== "check") {
      throw new CliUsageError(
        `${ALLOW_CHANGED_COMMAND_SURFACE} is valid only with the check command.`,
      );
    }

    if (allowChangedCommandSurface) {
      throw new CliUsageError(`${ALLOW_CHANGED_COMMAND_SURFACE} may be supplied only once.`);
    }

    allowChangedCommandSurface = true;
  }

  return {
    command: commandToken,
    allowChangedCommandSurface,
  };
}

export function usageText(): string {
  return [
    "Usage:",
    "  ascout init",
    "  ascout doctor",
    `  ascout check [${ALLOW_CHANGED_COMMAND_SURFACE}]`,
  ].join("\n");
}

async function runInit(): Promise<number> {
  try {
    const root = process.cwd();

    // 1. Create minimal ascout.config.json if it doesn't exist.
    const configPath = join(root, "ascout.config.json");
    if (!existsSync(configPath)) {
      writeFileSync(configPath, JSON.stringify({ version: 1 }, null, 2));
    }

    // 2. Ensure .ascout/ is ignored in .gitignore.
    const gitignorePath = join(root, ".gitignore");
    const gitignoreEntry = ".ascout/";
    let gitignoreContent = "";
    if (existsSync(gitignorePath)) {
      gitignoreContent = readFileSync(gitignorePath, "utf8");
    }
    // Normalize line endings for checking.
    const lines = gitignoreContent.split(/\r?\n/);
    if (!lines.some(line => line.trim() === gitignoreEntry)) {
      // Append the entry, ensuring we have a newline before if the file is not empty.
      const newContent = gitignoreContent.endsWith("\n")
        ? gitignoreContent + gitignoreEntry
        : gitignoreContent
        ? gitignoreContent + "\n" + gitignoreEntry
        : gitignoreEntry;
      writeFileSync(gitignorePath, newContent);
    }

    // Optionally, create the .ascout directory (but it will be created on first run).
    const ascoutDir = join(root, ".ascout");
    if (!existsSync(ascoutDir)) {
      mkdirSync(ascoutDir, { recursive: true });
    }

    console.error("ascout init: created ascout.config.json and ensured .ascout/ is ignored.");
    return 0;
  } catch (error) {
    console.error(`ascout init failed: ${error}`);
    return 1;
  }
}

async function runCli(argv: readonly string[]): Promise<number> {
  try {
    const invocation = parseCliArgs(argv);
    if (invocation.command === "init") {
      return await runInit();
    }
    if (invocation.command === "check") {
      const outcome = await runCheck(process.cwd(), {
        allowChangedCommandSurface: invocation.allowChangedCommandSurface,
      });
      console.error(outcome.terminalSummary);
      const { receipt } = outcome;
      if (receipt.tasks.some(t => t.status === "FAIL" || t.status === "ERROR")) {
        return 1;
      }
      return 0;
    }
    if (invocation.command === "doctor") {
      const output = await runDoctor(process.cwd());
      console.error(output);
      return 0;
    }
    // Should not happen because parseCliArgs validates the command.
    console.error(`ascout ${invocation.command}: not implemented.`);
    return 2;
  } catch (error: unknown) {
    if (error instanceof CliUsageError) {
      console.error(`${error.message}\n\n${usageText()}`);
      return 2;
    }
    // For other errors, we print the message.
    console.error(String(error));
    return 1;
  }
}

async function runDoctor(repositoryRoot: string): Promise<string> {
  try {
    const { root, files, discovery } = collectDiscoveredProject(repositoryRoot);
    const { config, digest } = loadConfig(root);
    const sourceState = composeSourceState(root);
    const gitComparison = readWorkingTreeComparison(root, sourceState.head_sha);
    const changedFiles = gitComparison.changed_files;
    const classifyOptions: CommandSurfaceClassifyOptions = {
      ascoutConfigPath: "ascout.config.json",
      tasks: config.tasks ?? null,
    };
    const surfaces = classifyCommandSurfaces(discovery, classifyOptions);

    // Build output string
    const lines: string[] = [];
    lines.push(`=== Doctor Output ===\n`);
    lines.push(`Repository root: ${root}`);
    lines.push(`\n--- Discovered Project ---`);
    lines.push(`Workspace kind: ${discovery.workspace.kind}`);
    lines.push(`Package manager: ${discovery.packageManager.state === "resolved" ? discovery.packageManager.value : discovery.packageManager.reasonCode}`);
    lines.push(`Js test runner: ${discovery.jsTestRunner.state === "resolved" ? discovery.jsTestRunner.value : discovery.jsTestRunner.reasonCode}`);
    lines.push(`Pytest basic: ${discovery.pytestBasic.state === "resolved" ? discovery.pytestBasic.value : discovery.pytestBasic.reasonCode}`);
    lines.push(`\n--- Config ---`);
    lines.push(JSON.stringify(config, null, 2));
    lines.push(`\n--- Authority Classification ---`);
    for (const task of ["typecheck", "lint", "pytestBasic", "test"] as const) {
      const surface = surfaces[task];
      lines.push(`${task}:`);
      lines.push(`  authorityPaths: ${JSON.stringify(surface.authorityPaths)}`);
      lines.push(`  effectivePytestConfig: ${surface.effectivePytestConfig ?? "null"}`);
    }
    lines.push(`\n--- Changed Files ---`);
    lines.push(`Count: ${changedFiles.length}`);
    for (const file of changedFiles.slice(0, 10)) {
      lines.push(`  ${file.path} (${file.change_kind})`);
    }
    if (changedFiles.length > 10) {
      lines.push(`  ... and ${changedFiles.length - 10} more`);
    }
    return lines.join("\n");
  } catch (error) {
    return `Error during doctor: ${error}`;
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
  runCli(process.argv.slice(2)).then(code => {
    process.exitCode = code;
  }).catch(err => {
    console.error("ascout: unexpected error:", err);
    process.exitCode = 1;
  });
} else if (entryDisposition === "resolution_error") {
  console.error("ascout: unable to resolve CLI entry path. No project task was executed.");
  process.exitCode = 2;
}