import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CliUsageError,
  parseCliArgs,
  runCli,
  usageText,
} from "../src/cli.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UA-P05-T09 additive test command", () => {
  it("parses the test command with plan defaults and no other surface change", () => {
    expect(parseCliArgs(["test"])).toEqual({
      command: "test",
      allowChangedCommandSurface: false,
    });
    expect(parseCliArgs(["test", "--profile", "deep"])).toEqual({
      command: "test",
      allowChangedCommandSurface: false,
      profile: "DEEP",
    });
    expect(
      parseCliArgs(["test", "--format", "json", "--profile", "quick"]),
    ).toEqual({
      command: "test",
      allowChangedCommandSurface: false,
      format: "json",
      profile: "QUICK",
    });
    expect(usageText()).toContain(
      "ascout test [--profile quick|standard|deep|release] [--format json|terminal]",
    );
  });

  it("rejects malformed, duplicate, and misplaced test options", () => {
    for (const argv of [
      ["test", "--profile"],
      ["test", "--profile", "STANDARD"],
      ["test", "--profile", "extended"],
      ["test", "--profile", "quick", "--profile", "deep"],
      ["test", "--format"],
      ["test", "--format", "agent"],
      ["test", "--format", "json", "--format", "terminal"],
      ["test", "--allow-changed-command-surface"],
      ["check", "--profile", "quick"],
      ["review", "--profile", "quick"],
      ["doctor", "--profile", "quick"],
      ["init", "--format", "json"],
      ["check", "--format", "terminal"],
      ["security"],
      ["cyber"],
      ["assure"],
    ]) {
      expect(() => parseCliArgs(argv)).toThrow(CliUsageError);
    }
  });

  it("renders the default STANDARD plan to stderr with exit zero", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await runCli(["test"])).toBe(0);
    expect(stdout).not.toHaveBeenCalled();
    const output = error.mock.calls.flat().map(String).join("\n");
    expect(output).toContain("=== Ascout Test Plan (plan only, no execution) ===");
    expect(output).toContain("profile: STANDARD");
    expect(output).toContain("scope: TEST");
    expect(output).toContain("strategy: adapter-first");
    expect(output).toContain("max_wall_time_ms: 300000");
    expect(output).toContain("E1_LOCAL_DETERMINISTIC_PROCESS");
  });

  it("renders the selected profile plan as JSON to stdout", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await runCli(["test", "--profile", "quick", "--format", "json"])).toBe(0);
    expect(error).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledTimes(1);
    const rendered = String(stdout.mock.calls[0]?.[0]);
    expect(rendered.endsWith("\n")).toBe(true);
    expect(JSON.parse(rendered)).toMatchObject({
      profile: "QUICK",
      scope: "TEST",
      adapter_strategy: "adapter-first",
    });
  });

  it("renders budgets and predicted effects for every profile in both formats", async () => {
    for (const token of ["quick", "standard", "deep", "release"] as const) {
      const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

      expect(await runCli(["test", "--profile", token])).toBe(0);
      const terminal = error.mock.calls.flat().map(String).join("\n");
      expect(terminal).toContain(`profile: ${token.toUpperCase()}`);
      expect(terminal).toContain("max_wall_time_ms:");
      expect(terminal).toContain("max_cost_microunits:");
      expect(terminal).toContain("E0_READ_ONLY_ANALYSIS");

      vi.restoreAllMocks();
      const jsonStdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const jsonError = vi.spyOn(console, "error").mockImplementation(() => undefined);

      expect(await runCli(["test", "--profile", token, "--format", "json"])).toBe(0);
      expect(jsonError).not.toHaveBeenCalled();
      const rendered = String(jsonStdout.mock.calls[0]?.[0]);
      const plan = JSON.parse(rendered) as {
        profile: string;
        budgets: Record<string, number>;
        predicted_effect_classes: string[];
      };
      expect(plan.profile).toBe(token.toUpperCase());
      expect(Object.keys(plan.budgets).sort()).toEqual(
        [
          "max_artifact_bytes",
          "max_concurrency",
          "max_cost_microunits",
          "max_engine_runs",
          "max_model_tokens",
          "max_network_egress_bytes",
          "max_network_requests",
          "max_wall_time_ms",
        ].sort(),
      );
      expect(plan.predicted_effect_classes.length).toBeGreaterThan(0);

      vi.restoreAllMocks();
    }
  });

  it("exits usage error without executing anything for unknown profiles", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await runCli(["test", "--profile", "extended"])).toBe(2);
    expect(stdout).not.toHaveBeenCalled();
    expect(error.mock.calls.flat().map(String).join("\n")).toContain("Usage:");
  });

  it("leaves check parsing, rendering, and exit semantics unchanged", async () => {
    expect(parseCliArgs(["check"])).toEqual({
      command: "check",
      allowChangedCommandSurface: false,
    });
    expect(parseCliArgs(["check", "--format", "agent"])).toEqual({
      command: "check",
      allowChangedCommandSurface: false,
      format: "agent",
    });
    expect(parseCliArgs(["review"])).toEqual({
      command: "review",
      allowChangedCommandSurface: false,
    });
    expect(usageText()).toContain("ascout check [--allow-changed-command-surface] [--format json|agent]");
    expect(usageText()).toContain("ascout review [--format json|terminal]");
    expect(usageText()).not.toContain("ascout publish");
    expect(usageText()).not.toContain("ascout workflow");
    expect(() => parseCliArgs(["publish"])).toThrow(CliUsageError);
    expect(() => parseCliArgs(["review", "--publish"])).toThrow(CliUsageError);
  });
});
