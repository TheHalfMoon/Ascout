import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CliUsageError, parseCliArgs, runCli, usageText } from "../src/cli.js";
import {
  SECURITY_COMMAND_NOT_RUN_EXIT_CODE,
  buildSecurityCommandReportV1,
} from "../src/assurance/security/security-command.js";
import { buildSentrdelCapabilitiesV1 } from "../src/assurance/security/sentrdel-capability-characterization.js";

const configuredGitleaks = process.env.ASCOUT_GITLEAKS_PATH;

// These rows describe the command without an engine, so the opt-in variable is cleared.
beforeEach(() => {
  delete process.env.ASCOUT_GITLEAKS_PATH;
});

afterEach(() => {
  vi.restoreAllMocks();
  if (configuredGitleaks !== undefined) process.env.ASCOUT_GITLEAKS_PATH = configuredGitleaks;
});

function capture() {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
  return {
    stdout: () => stdout.mock.calls.map(call => String(call[0])).join(""),
    stderr: () => stderr.mock.calls.flat().map(String).join("\n"),
  };
}

function makeCleanRepo(): string {
  const dir = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-t14-repo-")));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  git("init", "-q");
  git("config", "user.name", "t");
  git("config", "user.email", "t@example.invalid");
  git("config", "commit.gpgsign", "false");
  writeFileSync(join(dir, "index.ts"), "export const ok = 1;\n");
  git("add", ".");
  git("commit", "-qm", "init");
  return dir;
}

describe("UA-P06-T14 ascout security (with deterministic engine and exits from Amendment A07)", () => {
  it("parses security with optional --format json|terminal|sarif and --out <path>", () => {
    expect(parseCliArgs(["security"])).toEqual({ command: "security", allowChangedCommandSurface: false });
    expect(parseCliArgs(["security", "--format", "json"])).toEqual({
      command: "security", allowChangedCommandSurface: false, format: "json",
    });
    expect(parseCliArgs(["security", "--format", "terminal"]).format).toBe("terminal");
    expect(parseCliArgs(["security", "--format", "sarif"]).format).toBe("sarif");
    expect(parseCliArgs(["security", "--format", "sarif", "--out", "audit.sarif"]).outPath).toBe("audit.sarif");
  });

  it("refuses every other option, value, and repetition", () => {
    for (const argv of [
      ["security", "--format"], ["security", "--format", "agent"],
      ["security", "--format", "json", "--format", "json"], ["security", "--profile", "quick"],
      ["security", "--allow-changed-command-surface"], ["security", "--publish"], ["security", "--write"],
      ["security", "src/app.ts"], ["security", "--input", "result.sarif"],
    ]) {
      expect(() => parseCliArgs(argv), argv.join(" ")).toThrow(CliUsageError);
    }
  });

  it("keeps other unimplemented verbs refused and documents the security usage line", () => {
    for (const command of ["cyber", "assure", "secure", "scan"]) {
      expect(() => parseCliArgs([command]), command).toThrow(CliUsageError);
    }
    const lines = usageText().split("\n");
    expect(lines.filter(line => line.includes("ascout security"))).toEqual(["  ascout security [--format json|terminal|sarif] [--out <path>]"]);
    expect(lines.at(-5)).toBe("  ascout security [--format json|terminal|sarif] [--out <path>]");
    expect(lines.at(-2)).toBe("  ascout mcp");
    expect(lines.at(-1)).toBe("  ascout --help | --version");
  });

  it("reports INCOMPLETE on stderr and exits 4 on a clean repository, never a pass (Amendment A07)", async () => {
    const repo = makeCleanRepo();
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(repo);
    try {
      const io = capture();
      expect(await runCli(["security"])).toBe(4);
      expect(io.stdout()).toBe("");
      const text = io.stderr();
      expect(text).toContain("=== Ascout Security (INCOMPLETE) ===");
      expect(text).toContain("NO_FINDINGS_STATIC_PARTIAL_COVERAGE");
      expect(text).toContain("This is not a security pass and not a clean result.");
      expect(text).not.toMatch(/\bPASS(ED)?\b|\bCLEAN\b|\bSECURE\b/u);
    } finally {
      cwd.mockRestore();
      rmSync(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }, 60_000);

  it("emits the deterministic JSON report on stdout and exits 4 on a clean repository", async () => {
    const repo = makeCleanRepo();
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(repo);
    try {
      const io = capture();
      expect(await runCli(["security", "--format", "json"])).toBe(4);
      const report = JSON.parse(io.stdout());
      expect(report).toMatchObject({
        schema_version: 3,
        kind: "security",
        outcome: "INCOMPLETE",
        security_pass: false,
        clean_claimed: false,
        exit_code: 4,
        executed_count: 1,
        engine: { id: "engine:ascout-security-core", executed: true },
      });
      expect(buildSecurityCommandReportV1().capabilities).toHaveLength(buildSentrdelCapabilitiesV1().length);
      expect(buildSecurityCommandReportV1().capabilities.every((c: { run: boolean }) => c.run === false)).toBe(true);
      expect(SECURITY_COMMAND_NOT_RUN_EXIT_CODE).toBe(4);
    } finally {
      cwd.mockRestore();
      rmSync(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }, 60_000);

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
      expect(await runCli(["security", "--format", "json"])).toBe(4);
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
      "  ascout doctor [--format json|terminal]",
      "  ascout check [--allow-changed-command-surface] [--clean-env | --sandbox] [--pass-env NAME]... [--format json|agent]",
      "  ascout review [--local-model | --remote-model [--dry-run] | --export-task <path> | --ingest <findings.json>] [--format json|terminal]",
      "  ascout test [--plan] [--profile quick|standard|deep|release] [--clean-env | --sandbox] [--pass-env NAME]... [--format json|terminal]",
    ]);
  });
});
