import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CliUsageError, parseCliArgs, runCli, usageText } from "../src/cli.js";
import {
  SECURITY_COMMAND_NOT_RUN_EXIT_CODE,
  buildSecurityCommandReportV1,
} from "../src/assurance/security/security-command.js";
import { buildSentrdelCapabilitiesV1 } from "../src/assurance/security/sentrdel-capability-characterization.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function capture() {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
  return {
    stdout: () => stdout.mock.calls.map(call => String(call[0])).join(""),
    stderr: () => stderr.mock.calls.flat().map(String).join("\n"),
  };
}

describe("UA-P06-T14 ascout security (effective amendment #625, decisions A and B)", () => {
  it("parses exactly security with optional --format json|terminal", () => {
    expect(parseCliArgs(["security"])).toEqual({ command: "security", allowChangedCommandSurface: false });
    expect(parseCliArgs(["security", "--format", "json"])).toEqual({
      command: "security", allowChangedCommandSurface: false, format: "json",
    });
    expect(parseCliArgs(["security", "--format", "terminal"]).format).toBe("terminal");
  });

  it("refuses every other option, value, and repetition (decision B)", () => {
    for (const argv of [
      ["security", "--format"], ["security", "--format", "agent"], ["security", "--format", "sarif"],
      ["security", "--format", "json", "--format", "json"], ["security", "--profile", "quick"],
      ["security", "--allow-changed-command-surface"], ["security", "--publish"], ["security", "--write"],
      ["security", "src/app.ts"], ["security", "--input", "result.sarif"],
    ]) {
      expect(() => parseCliArgs(argv), argv.join(" ")).toThrow(CliUsageError);
    }
  });

  it("keeps other unimplemented verbs refused and documents exactly one new usage line", () => {
    for (const command of ["cyber", "assure", "secure", "scan"]) {
      expect(() => parseCliArgs([command]), command).toThrow(CliUsageError);
    }
    const lines = usageText().split("\n");
    expect(lines.filter(line => line.includes("ascout security"))).toEqual(["  ascout security [--format json|terminal]"]);
    expect(lines.at(-1)).toBe("  ascout security [--format json|terminal]");
  });

  it("reports NOT_RUN on stderr and exits 1, never a pass (decision A)", async () => {
    const io = capture();
    expect(await runCli(["security"])).toBe(1);
    expect(io.stdout()).toBe("");
    const text = io.stderr();
    expect(text).toContain("=== Ascout Security (NOT_RUN) ===");
    expect(text).toContain("ENGINE_NOT_EXECUTED_IN_UA_P06");
    expect(text).toContain("This is not a security pass and not a clean result.");
    expect(text).not.toMatch(/\bPASS(ED)?\b|\bCLEAN\b|\bSECURE\b/u);
  });

  it("emits the JSON report on stdout and exits 1", async () => {
    const io = capture();
    expect(await runCli(["security", "--format", "json"])).toBe(1);
    const report = JSON.parse(io.stdout());
    expect(report).toEqual(JSON.parse(JSON.stringify(buildSecurityCommandReportV1())));
    expect(report).toMatchObject({
      kind: "security", outcome: "NOT_RUN", security_pass: false, clean_claimed: false, findings_emitted: false,
      assurance_effect: "NONE", network: "NONE", writes: "NONE", exit_code: 1, scanned_scope: [],
      engine: { executed: false },
    });
    expect(report.capabilities).toHaveLength(buildSentrdelCapabilitiesV1().length);
    expect(report.capabilities.every((c: { run: boolean }) => c.run === false)).toBe(true);
    expect(SECURITY_COMMAND_NOT_RUN_EXIT_CODE).toBe(1);
  });

  it("is deterministic, local, and read-only", async () => {
    expect(buildSecurityCommandReportV1()).toEqual(buildSecurityCommandReportV1());
    const source = readFileSync(join(__dirname, "../src/assurance/security/security-command.ts"), "utf8");
    expect(source).not.toMatch(/from "node:(fs|net|http|https|child_process|dgram|tls|worker_threads)"/u);
    expect(source).not.toMatch(/\bfetch\(|process\.cwd\(|Date\.now\(|Math\.random\(/u);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dir = mkdtempSync(join(tmpdir(), "ascout-t14-"));
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(dir);
    try {
      capture();
      expect(await runCli(["security", "--format", "json"])).toBe(1);
      expect(readdirSync(dir)).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      cwd.mockRestore();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("leaves check, review, and test parsing and usage lines unchanged", () => {
    expect(parseCliArgs(["check"])).toEqual({ command: "check", allowChangedCommandSurface: false });
    expect(parseCliArgs(["check", "--format", "agent"]).format).toBe("agent");
    expect(parseCliArgs(["review", "--format", "terminal"]).format).toBe("terminal");
    expect(parseCliArgs(["test", "--profile", "deep"]).profile).toBe("DEEP");
    expect(() => parseCliArgs(["review", "--publish"])).toThrow(/read-only/u);
    expect(usageText().split("\n").slice(0, 6)).toEqual([
      "Usage:",
      "  ascout init",
      "  ascout doctor",
      "  ascout check [--allow-changed-command-surface] [--format json|agent]",
      "  ascout review [--format json|terminal]",
      "  ascout test [--profile quick|standard|deep|release] [--format json|terminal]",
    ]);
  });
});
