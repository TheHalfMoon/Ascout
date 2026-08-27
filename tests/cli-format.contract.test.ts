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

import { CliUsageError, parseCliArgs, runCli, usageText } from "../src/cli.js";

afterEach(() => {
  vi.restoreAllMocks();
  mocks.runCheck.mockReset();
  mocks.renderJson.mockReset();
  mocks.renderAgent.mockReset();
});

describe("T070 CLI receipt format wiring", () => {
  it("parses json/agent format in either flag order without changing the default shape", () => {
    expect(parseCliArgs(["check"])).toEqual({
      command: "check",
      allowChangedCommandSurface: false,
    });
    expect(parseCliArgs(["check", "--format", "json"])).toEqual({
      command: "check",
      allowChangedCommandSurface: false,
      format: "json",
    });
    expect(parseCliArgs(["check", "--format", "agent", "--allow-changed-command-surface"])).toEqual({
      command: "check",
      allowChangedCommandSurface: true,
      format: "agent",
    });
    expect(parseCliArgs(["check", "--allow-changed-command-surface", "--format", "json"])).toEqual({
      command: "check",
      allowChangedCommandSurface: true,
      format: "json",
    });
  });

  it("rejects missing, unsupported, duplicate, and non-check format usage", () => {
    for (const argv of [
      ["check", "--format"],
      ["check", "--format", "terminal"],
      ["check", "--format", "json", "--format", "agent"],
      ["doctor", "--format", "json"],
      ["init", "--format", "agent"],
    ]) {
      expect(() => parseCliArgs(argv)).toThrow(CliUsageError);
    }
    expect(usageText()).toContain("--format json|agent");
  });

  it("keeps default terminal rendering on stderr without machine rendering", async () => {
    const receipt = { summary: { exit_code: 4 } } as never;
    mocks.runCheck.mockResolvedValue({ receipt, terminalSummary: "terminal-output" });
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await runCli(["check"])).toBe(4);
    expect(mocks.runCheck).toHaveBeenCalledTimes(1);
    expect(mocks.runCheck).toHaveBeenCalledWith(process.cwd(), {
      allowChangedCommandSurface: false,
    });
    expect(error).toHaveBeenCalledWith("terminal-output");
    expect(stdout).not.toHaveBeenCalled();
    expect(mocks.renderJson).not.toHaveBeenCalled();
    expect(mocks.renderAgent).not.toHaveBeenCalled();
  });

  it("renders JSON to stdout from the single-run receipt and preserves exit code", async () => {
    const receipt = { summary: { exit_code: 3 } } as never;
    mocks.runCheck.mockResolvedValue({ receipt, terminalSummary: "must-not-render" });
    mocks.renderJson.mockReturnValue('{"schema_version":1}\n');
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await runCli(["check", "--format", "json"])).toBe(3);
    expect(mocks.runCheck).toHaveBeenCalledTimes(1);
    expect(mocks.renderJson).toHaveBeenCalledTimes(1);
    expect(mocks.renderJson).toHaveBeenCalledWith(receipt);
    expect(mocks.renderAgent).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledTimes(1);
    expect(stdout).toHaveBeenCalledWith('{"schema_version":1}\n');
    expect(error).not.toHaveBeenCalled();
  });

  it("renders agent output to stdout from the same single-run receipt", async () => {
    const receipt = { summary: { exit_code: 1 } } as never;
    mocks.runCheck.mockResolvedValue({ receipt, terminalSummary: "must-not-render" });
    mocks.renderAgent.mockReturnValue("ASCOUT_AGENT_V1 repo=remote:x head=y stability=stable");
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await runCli(["check", "--allow-changed-command-surface", "--format", "agent"])).toBe(1);
    expect(mocks.runCheck).toHaveBeenCalledTimes(1);
    expect(mocks.runCheck).toHaveBeenCalledWith(process.cwd(), {
      allowChangedCommandSurface: true,
    });
    expect(mocks.renderAgent).toHaveBeenCalledTimes(1);
    expect(mocks.renderAgent).toHaveBeenCalledWith(receipt);
    expect(mocks.renderJson).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledTimes(1);
    expect(stdout).toHaveBeenCalledWith("ASCOUT_AGENT_V1 repo=remote:x head=y stability=stable");
    expect(error).not.toHaveBeenCalled();
  });
});
