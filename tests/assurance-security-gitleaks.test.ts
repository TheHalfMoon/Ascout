import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { runCli } from "../src/cli.js";
import type { EngineRunResultV1 } from "../src/assurance/engines/execution-broker.js";
import { GITLEAKS_RELEASE_V1 } from "../src/assurance/engines/gitleaks-profile.js";
import {
  configuredGitleaksPathV1,
  GITLEAKS_PATH_ENV,
  runSecurityGitleaksV1,
  securityOutcomeFromRunV1,
} from "../src/assurance/security/security-gitleaks.js";

const START = { head_sha: "a".repeat(40), tree_digest: "b".repeat(64) };
const END = { head_sha: "a".repeat(40), tree_digest: "c".repeat(64) };
const OBSERVATION = {
  observation_id: "gitleaks:" + "d".repeat(32),
  capability_id: "capability:secrets",
  rule_id: "github-pat",
  location: { path: "settings.js", start_line: 1, end_line: 1 },
  message: "A token.",
};

function result(overrides: Partial<EngineRunResultV1>): EngineRunResultV1 {
  return {
    schema: "ascout-engine-run-result/1",
    request_id: "request:1",
    engine_id: "engine:gitleaks",
    profile_id: "profile:gitleaks-dir-v1",
    profile_sha256: "e".repeat(64),
    qualification_id: "qualification:x",
    status: "INCOMPLETE",
    reason_code: "PARTIAL_COVERAGE",
    exit_code: 42,
    signal: null,
    started_at_epoch_ms: 1,
    ended_at_epoch_ms: 2,
    source_start: START,
    source_end: START,
    executable_sha256: "f".repeat(64),
    stdout: null,
    stderr: null,
    stderr_excerpt: null,
    output_withheld: false,
    envelope: {
      protocol: "ascout-engine/1",
      request_id: "request:1",
      engine: { id: "engine:gitleaks", version: "8.30.1", build: "b" },
      profile_sha256: "e".repeat(64),
      source: START,
      execution: { state: "COMPLETED", started_at_epoch_ms: 1, ended_at_epoch_ms: 2 },
      capabilities: [{ id: "capability:secrets", state: "EXECUTED", coverage: "PARTIAL" }],
      observations: [OBSERVATION],
      diagnostics: [],
    },
    cleanup_complete: true,
    limitations: ["a limit"],
    ...overrides,
  };
}

describe("securityOutcomeFromRunV1", () => {
  it("exits 1 for findings and keeps the partial coverage visible", () => {
    const outcome = securityOutcomeFromRunV1(result({}));
    expect(outcome.kind).toBe("report");
    if (outcome.kind !== "report") return;
    expect(outcome.report.exit_code).toBe(1);
    expect(outcome.report.outcome).toBe("FINDINGS");
    expect(outcome.report.coverage).toBe("PARTIAL");
    expect(outcome.report.reason_text).toMatch(/coverage is partial/u);
    expect(outcome.report.findings).toEqual([
      { rule_id: "github-pat", path: "settings.js", start_line: 1, end_line: 1, message: "A token." },
    ]);
    expect(outcome.report.limitations).toEqual(["a limit"]);
    expect(outcome.report.clean_claimed).toBe(false);
    expect(outcome.report.security_pass).toBe(false);
  });

  it("exits 4 when nothing was found, and never claims clean", () => {
    const envelope = { ...result({}).envelope!, observations: [] };
    const outcome = securityOutcomeFromRunV1(result({ envelope, exit_code: 0 }));
    expect(outcome.kind === "report" && outcome.report.exit_code).toBe(4);
    expect(outcome.kind === "report" && outcome.report.reason_code).toBe("COVERAGE_UNPROVEN");
    expect(outcome.kind === "report" && outcome.report.clean_claimed).toBe(false);
  });

  it("keeps a location-less finding as a finding", () => {
    const envelope = { ...result({}).envelope!, observations: [{ ...OBSERVATION, location: null }] };
    const outcome = securityOutcomeFromRunV1(result({ envelope }));
    expect(outcome.kind === "report" && outcome.report.exit_code).toBe(1);
    expect(outcome.kind === "report" && outcome.report.findings[0]?.path).toBeNull();
  });

  it.each(["CANCELLED", "OUTPUT_CAP_EXCEEDED", "TREE_ESCAPE", "NATIVE_NO_INPUT"])(
    "exits 4 without findings for an incomplete run (%s)",
    (reason) => {
      // Even if an envelope with findings were present, a stopped run reports none of them.
      const outcome = securityOutcomeFromRunV1(result({ reason_code: reason }));
      expect(outcome.kind === "report" && outcome.report.exit_code).toBe(4);
      expect(outcome.kind === "report" && outcome.report.findings).toEqual([]);
      expect(outcome.kind === "report" && outcome.report.reason_code).toBe(reason);
    },
  );

  it("exits 3 for drift at the end, with the broker's two observations", () => {
    const outcome = securityOutcomeFromRunV1(result({ reason_code: "SOURCE_DRIFT_AT_END", source_end: END, envelope: null }));
    expect(outcome.kind).toBe("drift");
    if (outcome.kind !== "drift") return;
    expect([outcome.report.exit_code, outcome.report.start, outcome.report.end]).toEqual([3, START, END]);
    expect(JSON.stringify(outcome.report)).not.toContain("github-pat");
  });

  it("exits 3 for drift at the start, with the command's reading first", () => {
    // The broker's real shape: not started, its one reading is the changed tree, no end.
    const outcome = securityOutcomeFromRunV1(
      result({ status: "NOT_RUN", reason_code: "SOURCE_DRIFT_AT_START", started_at_epoch_ms: null,
        ended_at_epoch_ms: null, source_start: END, source_end: null, envelope: null }),
      START,
    );
    expect(outcome.kind).toBe("drift");
    if (outcome.kind !== "drift") return;
    expect([outcome.report.start, outcome.report.end, outcome.report.executed_count]).toEqual([START, END, 0]);
  });

  it("puts withheld output (exit 2) ahead of drift (exit 3)", () => {
    const outcome = securityOutcomeFromRunV1(result({ reason_code: "SOURCE_DRIFT_AT_END", output_withheld: true, envelope: null }));
    expect(outcome.kind).toBe("error");
  });

  it.each(["NOT_RUN", "INCOMPLETE"] as const)("exits 2 when the broker could not re-read the source (%s)", (status) => {
    const outcome = securityOutcomeFromRunV1(result({ status, reason_code: "SOURCE_BINDING_UNAVAILABLE", envelope: null }));
    expect(outcome.kind).toBe("error");
  });

  it("exits 2 rather than claim nothing was found when a partial run has no report", () => {
    expect(securityOutcomeFromRunV1(result({ envelope: null })).kind).toBe("error");
  });

  it.each([
    ["VERSION_MISMATCH", "EXECUTABLE_DIGEST_MISMATCH"],
    ["DENIED_BY_POLICY", "ENGINE_IGNORE_FILE_PRESENT"],
    ["MALFORMED_OUTPUT", "SECRET_IN_OUTPUT"],
    ["ENGINE_ERROR", "NATIVE_ERROR_EXIT"],
    ["TIMEOUT", "WALL_TIME_EXCEEDED"],
    ["EXECUTED", "RUN_COMPLETE"],
  ] as const)("exits 2 with no report and no findings for %s", (status, reason) => {
    const outcome = securityOutcomeFromRunV1(result({ status, reason_code: reason }));
    expect(outcome.kind).toBe("error");
    if (outcome.kind !== "error") return;
    expect(outcome.message).not.toContain("github-pat");
    expect(outcome.message).not.toContain("settings.js");
  });

  it.each([
    ["UNAVAILABLE", "EXECUTABLE_MISSING"],
    ["NOT_RUN", "CANCELLED_BEFORE_START"],
  ] as const)("exits 4 as NOT_RUN for %s", (status, reason) => {
    const outcome = securityOutcomeFromRunV1(result({ status, reason_code: reason, envelope: null }));
    expect(outcome.kind === "report" && outcome.report.outcome).toBe("NOT_RUN");
    expect(outcome.kind === "report" && outcome.report.exit_code).toBe(4);
  });
});

describe("terminal rendering", () => {
  it("escapes control and bidirectional characters from repository file names", async () => {
    const { renderSecurityGitleaksTerminalV1 } = await import("../src/assurance/security/security-gitleaks.js");
    const outcome = securityOutcomeFromRunV1(result({
      envelope: { ...result({}).envelope!, observations: [{ ...OBSERVATION, location: { path: "a\u202eb\u0085.js", start_line: 1, end_line: 1 } }] },
    }));
    if (outcome.kind !== "report") throw new Error("expected a report");
    const text = renderSecurityGitleaksTerminalV1(outcome.report);
    expect(text).not.toMatch(/[\u202e\u0085]/u);
    expect(text).toContain("\\u202e");
  });
});

describe("configuredGitleaksPathV1", () => {
  it("treats an unset or empty variable as not configured", () => {
    expect(configuredGitleaksPathV1({})).toBeNull();
    expect(configuredGitleaksPathV1({ [GITLEAKS_PATH_ENV]: "" })).toBeNull();
    expect(configuredGitleaksPathV1({ [GITLEAKS_PATH_ENV]: "/x/gitleaks" })).toBe("/x/gitleaks");
  });
});

describe("runSecurityGitleaksV1 without a real binary", () => {
  let base: string;
  let repo: string;

  function git(cwd: string, ...args: string[]): void {
    const r = spawnSync("git", args, { cwd, encoding: "utf8" });
    if (r.status !== 0) throw new Error(r.stderr);
  }

  beforeAll(() => {
    base = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-security-")));
    repo = join(base, "repo");
    mkdirSync(join(repo, "sub"), { recursive: true });
    git(repo, "init", "-q");
    writeFileSync(join(repo, "sub", "a.txt"), "a\n");
    git(repo, "add", "-A");
    git(repo, "-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-q", "--no-gpg-sign", "-m", "x");
  }, 60_000);

  afterAll(() => rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

  const qualifiedHost = (() => {
    const key = process.platform + "-" + process.arch;
    const entry = (GITLEAKS_RELEASE_V1.archives as Record<string, { executable_sha256: string | null }>)[key];
    return entry !== undefined && entry.executable_sha256 !== null;
  })();

  it.runIf(qualifiedHost)("refuses an executable whose bytes are not the pinned Gitleaks, with exit 2", async () => {
    // Node is a real executable that is not Gitleaks, so its digest cannot match the pin.
    const outcome = await runSecurityGitleaksV1(repo, process.execPath);
    expect(outcome.kind).toBe("error");
    if (outcome.kind === "error") expect(outcome.message).toMatch(/EXECUTABLE_DIGEST_MISMATCH|VERSION_MISMATCH/u);
  }, 60_000);

  it.runIf(qualifiedHost)("reports NOT_RUN with exit 4 when the configured file does not exist", async () => {
    const outcome = await runSecurityGitleaksV1(repo, join(base, "missing-gitleaks"));
    expect(outcome.kind === "report" && [outcome.report.outcome, outcome.report.reason_code, outcome.report.exit_code])
      .toEqual(["NOT_RUN", "ENGINE_UNAVAILABLE", 4]);
  }, 60_000);

  it.runIf(qualifiedHost)("reports NOT_RUN with exit 4 outside a repository", async () => {
    const outside = mkdtempSync(join(base, "outside-"));
    const outcome = await runSecurityGitleaksV1(outside, process.execPath);
    expect(outcome.kind === "report" && [outcome.report.reason_code, outcome.report.exit_code])
      .toEqual(["NO_REPOSITORY", 4]);
  }, 60_000);

  it.runIf(qualifiedHost)("exits 2 from a repository subdirectory", async () => {
    const outcome = await runSecurityGitleaksV1(join(repo, "sub"), process.execPath);
    expect(outcome.kind).toBe("error");
  }, 60_000);

  it.runIf(qualifiedHost)("exits 2, not NOT_RUN, for a repository Ascout refuses or can't read", async () => {
    const unborn = mkdtempSync(join(base, "unborn-"));
    git(unborn, "init", "-q");
    const partial = mkdtempSync(join(base, "partial-"));
    git(partial, "init", "-q");
    writeFileSync(join(partial, "a.txt"), "a\n");
    git(partial, "add", "-A");
    git(partial, "-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-q", "--no-gpg-sign", "-m", "x");
    git(partial, "config", "extensions.partialclone", "origin");
    for (const target of [unborn, partial]) {
      const outcome = await runSecurityGitleaksV1(target, process.execPath);
      expect(outcome.kind, target).toBe("error");
      if (outcome.kind === "error") expect(outcome.message).not.toContain(base);
    }
  }, 60_000);

  it.runIf(qualifiedHost)("exits 2, not NO_REPOSITORY, when Git fails inside something that looks like a repository", async () => {
    const broken = mkdtempSync(join(base, "broken-"));
    writeFileSync(join(broken, ".git"), "not a gitdir pointer\n");
    const outcome = await runSecurityGitleaksV1(broken, process.execPath);
    expect(outcome.kind).toBe("error");
  }, 60_000);

  it("reports NOT_RUN with exit 4 on a platform with no pinned executable", async () => {
    const outcome = await runSecurityGitleaksV1(repo, process.execPath, { host: { platform: "linux", arch: "arm64" } });
    expect(outcome.kind === "report" && [outcome.report.reason_code, outcome.report.exit_code])
      .toEqual(["ENGINE_PLATFORM_UNQUALIFIED", 4]);
  }, 60_000);

  it.runIf(qualifiedHost)("reports NOT_RUN with exit 4 without a working directory", async () => {
    const outcome = await runSecurityGitleaksV1(null, process.execPath);
    expect(outcome.kind === "report" && outcome.report.reason_code).toBe("NO_REPOSITORY");
  }, 60_000);
});

describe("ascout security with and without the variable", () => {
  const previous = process.env[GITLEAKS_PATH_ENV];

  afterEach(() => {
    vi.restoreAllMocks();
    if (previous === undefined) delete process.env[GITLEAKS_PATH_ENV];
    else process.env[GITLEAKS_PATH_ENV] = previous;
  });

  it("keeps the unconfigured NOT_RUN report and exit 4", async () => {
    delete process.env[GITLEAKS_PATH_ENV];
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    expect(await runCli(["security", "--format", "json"])).toBe(4);
    const report = JSON.parse(stdout.mock.calls.map((call) => String(call[0])).join(""));
    expect(report.schema_version).toBe(1);
    expect(report.reason_code).toBe("ENGINE_NOT_EXECUTED_IN_UA_P06");
  });

  it("writes nothing to stdout and exits 2 when the configured file is not Gitleaks", async () => {
    process.env[GITLEAKS_PATH_ENV] = process.execPath;
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const exit = await runCli(["security", "--format", "json"]);
    const key = process.platform + "-" + process.arch;
    const entry = (GITLEAKS_RELEASE_V1.archives as Record<string, { executable_sha256: string | null }>)[key];
    if (entry !== undefined && entry.executable_sha256 !== null) {
      expect(exit).toBe(2);
      expect(stdout).not.toHaveBeenCalled();
      expect(stderr.mock.calls.flat().map(String).join("\n")).toMatch(/EXECUTABLE_DIGEST_MISMATCH/u);
    } else {
      // No qualified executable here: nothing runs, and the configured path is still honoured.
      expect(exit).toBe(4);
      const report = JSON.parse(stdout.mock.calls.map((call) => String(call[0])).join(""));
      expect([report.schema_version, report.reason_code]).toEqual([2, "ENGINE_PLATFORM_UNQUALIFIED"]);
    }
  }, 60_000);
});
