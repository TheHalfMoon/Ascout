import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const COMMANDS = ["init", "doctor", "check"] as const;
const ALLOW_CHANGED_COMMAND_SURFACE = "--allow-changed-command-surface";

export type CliCommand = (typeof COMMANDS)[number];

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

export function runCli(argv: readonly string[]): number {
  try {
    const invocation = parseCliArgs(argv);
    const admissionNote = invocation.allowChangedCommandSurface
      ? " Explicit per-run changed-command-surface admission was requested, but it has not been applied."
      : "";

    console.error(
      `ascout ${invocation.command}: recognized, but command execution is not implemented in T006. No project task was executed.${admissionNote}`,
    );
    return 2;
  } catch (error: unknown) {
    if (error instanceof CliUsageError) {
      console.error(`${error.message}\n\n${usageText()}`);
      return 2;
    }

    throw error;
  }
}

function isDirectEntry(): boolean {
  const entryPath = process.argv[1];
  if (entryPath === undefined) {
    return false;
  }

  try {
    return realpathSync(entryPath) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectEntry()) {
  process.exitCode = runCli(process.argv.slice(2));
}
