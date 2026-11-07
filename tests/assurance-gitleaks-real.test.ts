import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createEngineQualificationV1 } from "../src/assurance/contracts/engine-qualification.js";
import {
  engineProfileQualificationIdentityV1,
  type EngineProfileV1,
} from "../src/assurance/engines/engine-profile-v1.js";
import { runQualifiedEngineV1, type EngineRequestV1 } from "../src/assurance/engines/execution-broker.js";
import {
  createGitleaksProfileV1,
  GITLEAKS_CAPABILITY,
  GITLEAKS_RELEASE_V1,
  gitleaksRegistryEntryV1,
  writeGitleaksConfigV1,
} from "../src/assurance/engines/gitleaks-profile.js";
import { GITLEAKS_SUPPRESSION_LIMITATION_V1 } from "../src/assurance/engines/gitleaks-adapter.js";
import { createEngineQualificationSetV1 } from "../src/assurance/kernel/qualification.js";
import { createEngineRegistryV1 } from "../src/assurance/kernel/registry.js";
import { readGitHeadState, readTreeDigestV1 } from "../src/git.js";

// L2 evidence: the real, checksum-verified Gitleaks run through the broker. The executable
// comes from .github/scripts/acquire-gitleaks.mjs. Without it these tests are NOT_RUN, and
// the real-engine workflow sets ASCOUT_REQUIRE_REAL_GITLEAKS so that absence fails instead.
const EXECUTABLE = process.env.ASCOUT_GITLEAKS_EXECUTABLE;
const MEASURED_SHA256 = process.env.ASCOUT_GITLEAKS_SHA256;
const REQUIRED = process.env.ASCOUT_REQUIRE_REAL_GITLEAKS === "1";
const AVAILABLE = EXECUTABLE !== undefined && EXECUTABLE !== "" && MEASURED_SHA256 !== undefined;

const BENCHMARK = { benchmark_id: "benchmark:e5", corpus_id: "corpus:e5", corpus_sha256: "c".repeat(64) };
const PLATFORM = { platform_id: "platform:e5-ci", platform_sha256: "d".repeat(64) };

describe.runIf(REQUIRED && !AVAILABLE)("real Gitleaks requirement", () => {
  it("has a verified executable when the workflow requires one", () => {
    expect(EXECUTABLE, "ASCOUT_GITLEAKS_EXECUTABLE").toBeTruthy();
    expect(MEASURED_SHA256, "ASCOUT_GITLEAKS_SHA256").toMatch(/^[a-f0-9]{64}$/u);
  });
});

describe.runIf(AVAILABLE)("real Gitleaks through the broker", () => {
  let base: string;
  let ascoutDirectory: string;
  let profile: EngineProfileV1;

  /** A synthetic token in GitHub's format, built at run time. It grants nothing. */
  function syntheticToken(): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const body = [...randomBytes(36)].map((byte) => alphabet[byte % alphabet.length]).join("");
    return ["gh", "p_"].join("") + body;
  }

  function git(cwd: string, ...args: string[]): void {
    const result = spawnSync("git", args, { cwd, encoding: "utf8" });
    if (result.status !== 0) throw new Error("git " + args.join(" ") + ": " + result.stderr);
  }

  function repository(files: Record<string, string>): string {
    const root = mkdtempSync(join(base, "repo-"));
    git(root, "init", "-q");
    for (const [name, content] of Object.entries(files)) writeFileSync(join(root, name), content);
    git(root, "add", "-A");
    git(root, "-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-q", "--no-gpg-sign", "-m", "x");
    return realpathSync.native(root);
  }

  function request(root: string, forProfile: EngineProfileV1 = profile): EngineRequestV1 {
    const qualification = createEngineQualificationV1({
      qualification_id: "qualification:gitleaks-e5",
      engine_id: "engine:gitleaks",
      implementation_identity: gitleaksRegistryEntryV1(forProfile).descriptor.implementation_identity,
      configuration_identity: gitleaksRegistryEntryV1(forProfile).configuration_identity,
      profile_identities: [engineProfileQualificationIdentityV1(forProfile)],
      benchmark_corpus_identity: BENCHMARK,
      platform_identity: PLATFORM,
      evidence_refs: [{ evidence_ref: "evidence:e5-real-engines", provider_self_description: false }],
      result: "QUALIFIED",
      qualified_at_epoch_ms: 1_000,
      expires_at_epoch_ms: null,
    });
    return {
      schema: "ascout-engine-request/1",
      request_id: "request:e5",
      source: {
        root_absolute_path: root,
        head_sha: readGitHeadState(root).head_sha,
        tree_digest: readTreeDigestV1(root).tree_digest,
      },
      capabilities: [GITLEAKS_CAPABILITY],
      qualification: {
        registry: createEngineRegistryV1([gitleaksRegistryEntryV1(forProfile)]),
        qualification_set: createEngineQualificationSetV1([qualification]),
        benchmark_corpus_identity: BENCHMARK,
        platform_identity: PLATFORM,
      },
    };
  }

  const run = (root: string, forProfile: EngineProfileV1 = profile) =>
    runQualifiedEngineV1(request(root, forProfile), forProfile, new AbortController().signal);

  beforeAll(() => {
    base = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-e5-")));
    ascoutDirectory = join(base, "ascout");
    mkdirSync(ascoutDirectory);
    const executable = realpathSync.native(EXECUTABLE as string);
    const digest = createHash("sha256").update(readFileSync(executable)).digest("hex");
    expect(digest, "the executable changed after acquisition").toBe(MEASURED_SHA256);
    profile = createGitleaksProfileV1({
      executable_absolute_path: executable,
      executable_sha256: digest,
      config_absolute_path: writeGitleaksConfigV1(ascoutDirectory),
      platform: process.platform as EngineProfileV1["platform"],
      arch: process.arch as EngineProfileV1["arch"],
    });
  }, 60_000);

  afterAll(() => {
    // Every planted token lives under this one temporary tree.
    if (base !== undefined) rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  it("is the admitted release", () => {
    const result = spawnSync(EXECUTABLE as string, ["version"], { encoding: "utf8", env: {} });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(GITLEAKS_RELEASE_V1.version);
  });

  it("detects a planted canary, reports where, and never returns the token", async () => {
    const token = syntheticToken();
    const root = repository({ "settings.js": `const token = "${token}";\n` });
    const result = await run(root);
    expect([result.status, result.reason_code]).toEqual(["INCOMPLETE", "PARTIAL_COVERAGE"]);
    expect(result.exit_code).toBe(42);
    const observations = result.envelope?.observations ?? [];
    expect(observations.length).toBeGreaterThan(0);
    expect(observations.map((observation) => observation.rule_id)).toContain("github-pat");
    expect(observations[0]?.location).toEqual({ path: "settings.js", start_line: 1, end_line: 1 });
    expect(JSON.stringify(result)).not.toContain(token);
    expect(result.output_withheld).toBe(false);
  }, 120_000);

  it("never calls a clean scan clean", async () => {
    const root = repository({ "readme.txt": "nothing to see\n" });
    const result = await run(root);
    expect([result.status, result.reason_code]).toEqual(["INCOMPLETE", "PARTIAL_COVERAGE"]);
    expect(result.exit_code).toBe(0);
    expect(result.envelope?.observations).toEqual([]);
    expect(result.envelope?.capabilities[0]?.coverage).toBe("PARTIAL");
  }, 120_000);

  it("ignores a gitleaks:allow comment in the source", async () => {
    const token = syntheticToken();
    const root = repository({ "settings.js": `const token = "${token}"; // gitleaks:allow\n` });
    const result = await run(root);
    expect(result.envelope?.observations.length).toBeGreaterThan(0);
  }, 120_000);

  it("ignores a .gitleaks.toml in the source that allows everything", async () => {
    const token = syntheticToken();
    const root = repository({
      "settings.js": `const token = "${token}";\n`,
      ".gitleaks.toml": 'title = "allow all"\n[allowlist]\npaths = [".*"]\n',
    });
    const result = await run(root);
    expect(result.envelope?.observations.length).toBeGreaterThan(0);
  }, 120_000);

  it("is not redirected by a GITLEAKS_CONFIG in the parent", async () => {
    const allowAll = join(base, "allow-all.toml");
    writeFileSync(allowAll, 'title = "allow all"\n[allowlist]\npaths = [".*"]\n');
    const previous = process.env.GITLEAKS_CONFIG;
    process.env.GITLEAKS_CONFIG = allowAll;
    try {
      const root = repository({ "settings.js": `const token = "${syntheticToken()}";\n` });
      const result = await run(root);
      expect(result.envelope?.observations.length).toBeGreaterThan(0);
    } finally {
      if (previous === undefined) delete process.env.GITLEAKS_CONFIG;
      else process.env.GITLEAKS_CONFIG = previous;
    }
  }, 120_000);

  it("states that a source .gitleaksignore can hide findings, because Gitleaks always applies it", async () => {
    const token = syntheticToken();
    const root = repository({
      "settings.js": `const token = "${token}";\n`,
      ".gitleaksignore": "settings.js:github-pat:1\n",
    });
    const result = await run(root);
    expect(result.status).toBe("INCOMPLETE");
    // The finding really is hidden: no observation and a clean exit, despite the canary.
    expect(result.exit_code).toBe(0);
    expect(result.envelope?.observations).toEqual([]);
    expect(result.limitations).toContain(GITLEAKS_SUPPRESSION_LIMITATION_V1);
    expect(JSON.stringify(result)).not.toContain(token);
  }, 120_000);

  it("refuses to start when Ascout's own ignore location holds a .gitleaksignore", async () => {
    const planted = join(ascoutDirectory, ".gitleaksignore");
    writeFileSync(planted, "settings.js:github-pat:1\n");
    try {
      const root = repository({ "settings.js": `const token = "${syntheticToken()}";\n` });
      const result = await run(root);
      expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "ENGINE_IGNORE_FILE_PRESENT"]);
    } finally {
      rmSync(planted, { force: true });
    }
  }, 120_000);

  it("refuses a Gitleaks copy inside the source", async () => {
    const root = repository({ "readme.txt": "x\n" });
    const planted = join(root, process.platform === "win32" ? "gitleaks.exe" : "gitleaks");
    copyFileSync(EXECUTABLE as string, planted);
    const plantedProfile = createGitleaksProfileV1({
      executable_absolute_path: realpathSync.native(planted),
      executable_sha256: profile.artifact.sha256,
      config_absolute_path: profile.config_absolute_path,
      platform: profile.platform,
      arch: profile.arch,
    });
    const result = await run(root, plantedProfile);
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "REPOSITORY_CONTROLLED_PATH"]);
  }, 120_000);

  it("refuses an executable whose digest differs from the measured one", async () => {
    const root = repository({ "readme.txt": "x\n" });
    const wrong = createGitleaksProfileV1({
      executable_absolute_path: profile.executable_absolute_path,
      executable_sha256: "0".repeat(64),
      config_absolute_path: profile.config_absolute_path,
      platform: profile.platform,
      arch: profile.arch,
    });
    const result = await run(root, wrong);
    expect([result.status, result.reason_code]).toEqual(["VERSION_MISMATCH", "EXECUTABLE_DIGEST_MISMATCH"]);
  }, 120_000);

  describe("ascout security through the compiled CLI", () => {
    const cliPath = join(process.cwd(), "dist", "cli.js");

    function security(root: string, format: "json" | "terminal") {
      return spawnSync(process.execPath, [cliPath, "security", "--format", format], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, ASCOUT_GITLEAKS_PATH: EXECUTABLE },
        timeout: 120_000,
      });
    }

    it("exits 1 with the finding and partial coverage, and never prints the token", () => {
      const token = syntheticToken();
      const root = repository({ "settings.js": `const token = "${token}";\n` });
      const result = security(root, "json");
      expect(result.status, result.stderr).toBe(1);
      const report = JSON.parse(result.stdout);
      expect([report.outcome, report.coverage, report.exit_code]).toEqual(["FINDINGS", "PARTIAL", 1]);
      expect(report.findings).toContainEqual(expect.objectContaining({ rule_id: "github-pat", path: "settings.js", start_line: 1 }));
      expect(report.clean_claimed).toBe(false);
      expect(result.stdout + result.stderr).not.toContain(token);
    }, 120_000);

    it("exits 4 when nothing is found, because coverage is unproven", () => {
      const root = repository({ "readme.txt": "nothing to see\n" });
      const result = security(root, "json");
      expect(result.status, result.stderr).toBe(4);
      const report = JSON.parse(result.stdout);
      expect([report.outcome, report.reason_code, report.findings]).toEqual(["INCOMPLETE", "COVERAGE_UNPROVEN", []]);
      expect([report.exit_code, report.executed_count, report.clean_claimed]).toEqual([4, 1, false]);
    }, 120_000);

    it("prints the terminal report on stderr and nothing on stdout", () => {
      const token = syntheticToken();
      const root = repository({ "settings.js": `const token = "${token}";\n` });
      const result = security(root, "terminal");
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("github-pat");
      expect(result.stderr).toContain("not a clean result");
      expect(result.stderr).not.toContain(token);
    }, 120_000);
  });

  it("does not start on a stale tree", async () => {
    const root = repository({ "readme.txt": "x\n" });
    const stale = request(root);
    writeFileSync(join(root, "readme.txt"), "changed\n");
    const result = await runQualifiedEngineV1(stale, profile, new AbortController().signal);
    expect([result.status, result.reason_code]).toEqual(["NOT_RUN", "SOURCE_DRIFT_AT_START"]);
  }, 120_000);
});
