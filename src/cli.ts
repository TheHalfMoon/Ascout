#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runCheck } from "./check.js";

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

async function runCli(argv: readonly string[]): Promise<number> {
  try {
    const invocation = parseCliArgs(argv);
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
    // For init and doctor, we keep the placeholder.
    console.error(
      `ascout ${invocation.command}: recognized, but command execution is not implemented in T041. No project task was executed.`
    );
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