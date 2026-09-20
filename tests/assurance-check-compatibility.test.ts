import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runCheck: vi.fn(),
  renderJson: vi.fn(),
  renderAgent: vi.fn(),
}));

vi.mock("../src/check.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/check.js")>();
  return { ...actual, runCheck: mocks.runCheck };
});

vi.mock("../src/receipt/json.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/receipt/json.js")>();
  return { ...actual, renderReceiptJson: mocks.renderJson };
});

vi.mock("../src/receipt/agent.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/receipt/agent.js")>();
  return { ...actual, renderReceiptAgent: mocks.renderAgent };
});

import {
  CliUsageError,
  parseCliArgs,
  runCli,
  usageText,
} from "../src/cli.js";
import type {
  ReceiptExitCode,
  TaskStatus,
} from "../src/receipt/model.js";

type Exact<Left, Right> =
  [Left] extends [Right]
    ? [Right] extends [Left]
      ? true
      : false
    : false;

type ExpectedTaskStatus =
  | "PASS"
  | "FAIL"
  | "FLAKY"
  | "BLOCKED"
  | "ERROR"
  | "NOT_APPLICABLE"
  | "NOT_RUN";

type ExpectedReceiptExitCode = 0 | 1 | 2 | 3 | 4;

const TASK_STATUS_COMPATIBLE: Exact<TaskStatus, ExpectedTaskStatus> = true;
const RECEIPT_EXIT_COMPATIBLE: Exact<
  ReceiptExitCode,
  ExpectedReceiptExitCode
> = true;

const EXPECTED_USAGE = [
  "Usage:",
  "  ascout init",
  "  ascout doctor",
  "  ascout check [--allow-changed-command-surface] [--format json|agent]",
].join("\n");

afterEach(() => {
  vi.restoreAllMocks();
  mocks.runCheck.mockReset();
  mocks.renderJson.mockReset();
  mocks.renderAgent.mockReset();
});

describe("UA-P01-T17 existing ascout check compatibility", () => {
  it("freezes the existing check CLI surface without adding an assurance verb", () => {
    expect(parseCliArgs(["check"])).toEqual({
      command: "check",
      allowChangedCommandSurface: false,
    });
    expect(
      parseCliArgs(["check", "--allow-changed-command-surface"]),
    ).toEqual({
      command: "check",
      allowChangedCommandSurface: true,
    });
    expect(parseCliArgs(["check", "--format", "json"])).toEqual({
      command: "check",
      allowChangedCommandSurface: false,
      format: "json",
    });
    expect(parseCliArgs(["check", "--format", "agent"])).toEqual({
      command: "check",
      allowChangedCommandSurface: false,
      format: "agent",
    });

    expect(usageText()).toBe(EXPECTED_USAGE);
    expect(usageText()).not.toContain("ascout assure");
    expect(() => parseCliArgs(["assure"])).toThrow(CliUsageError);
  });

  it("freezes the canonical task-status and receipt-exit vocabularies", () => {
    expect(TASK_STATUS_COMPATIBLE).toBe(true);
    expect(RECEIPT_EXIT_COMPATIBLE).toBe(true);
  });

  it.each([0, 1, 2, 3, 4] as const)(
    "propagates receipt exit code %i unchanged through terminal check rendering",
    async (exitCode) => {
      const receipt = {
        summary: { exit_code: exitCode },
      } as never;
      const terminalSummary = "compatibility-exit-" + exitCode;

      mocks.runCheck.mockResolvedValue({
        receipt,
        terminalSummary,
      });

      const stdout = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
      const error = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      expect(await runCli(["check"])).toBe(exitCode);
      expect(mocks.runCheck).toHaveBeenCalledTimes(1);
      expect(mocks.runCheck).toHaveBeenCalledWith(process.cwd(), {
        allowChangedCommandSurface: false,
      });
      expect(error).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith(terminalSummary);
      expect(stdout).not.toHaveBeenCalled();
      expect(mocks.renderJson).not.toHaveBeenCalled();
      expect(mocks.renderAgent).not.toHaveBeenCalled();
    },
  );

  it("keeps JSON as a rendering of the same single check receipt", async () => {
    const receipt = {
      summary: { exit_code: 4 },
    } as never;

    mocks.runCheck.mockResolvedValue({
      receipt,
      terminalSummary: "must-not-render",
    });
    mocks.renderJson.mockReturnValue('{"schema_version":"1.0"}\n');

    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(await runCli(["check", "--format", "json"])).toBe(4);
    expect(mocks.runCheck).toHaveBeenCalledTimes(1);
    expect(mocks.runCheck).toHaveBeenCalledWith(process.cwd(), {
      allowChangedCommandSurface: false,
    });
    expect(mocks.renderJson).toHaveBeenCalledTimes(1);
    expect(mocks.renderJson).toHaveBeenCalledWith(receipt);
    expect(mocks.renderAgent).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledTimes(1);
    expect(stdout).toHaveBeenCalledWith('{"schema_version":"1.0"}\n');
    expect(error).not.toHaveBeenCalled();
  });

  it("keeps agent output on the same receipt and preserves explicit admission", async () => {
    const receipt = {
      summary: { exit_code: 1 },
    } as never;

    mocks.runCheck.mockResolvedValue({
      receipt,
      terminalSummary: "must-not-render",
    });
    mocks.renderAgent.mockReturnValue(
      "ASCOUT_AGENT_V1 repo=remote:x head=y stability=stable",
    );

    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(
      await runCli([
        "check",
        "--allow-changed-command-surface",
        "--format",
        "agent",
      ]),
    ).toBe(1);
    expect(mocks.runCheck).toHaveBeenCalledTimes(1);
    expect(mocks.runCheck).toHaveBeenCalledWith(process.cwd(), {
      allowChangedCommandSurface: true,
    });
    expect(mocks.renderAgent).toHaveBeenCalledTimes(1);
    expect(mocks.renderAgent).toHaveBeenCalledWith(receipt);
    expect(mocks.renderJson).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledTimes(1);
    expect(stdout).toHaveBeenCalledWith(
      "ASCOUT_AGENT_V1 repo=remote:x head=y stability=stable",
    );
    expect(error).not.toHaveBeenCalled();
  });
});
