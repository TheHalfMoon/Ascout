import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createEngineDescriptorV1 } from "../src/assurance/contracts/engine-descriptor.js";
import { createEngineQualificationV1 } from "../src/assurance/contracts/engine-qualification.js";
import {
  ENGINE_PROFILE_HARD_CAPS_V1,
  engineProfileQualificationIdentityV1,
  validateEngineProfileV1,
} from "../src/assurance/engines/engine-profile-v1.js";
import {
  runQualifiedEngineV1,
  type EngineRequestV1,
} from "../src/assurance/engines/execution-broker.js";
import type { EngineProfileV1 } from "../src/assurance/engines/engine-profile-v1.js";
import { createEngineQualificationSetV1 } from "../src/assurance/kernel/qualification.js";
import { createEngineRegistryV1 } from "../src/assurance/kernel/registry.js";
import { readGitHeadState, readTreeDigestV1 } from "../src/git.js";

const CAPABILITY = "capability:scan";
const PROFILE_ID = "profile:fixture";
const BENCHMARK = { benchmark_id: "benchmark:e4", corpus_id: "corpus:e4", corpus_sha256: "c".repeat(64) };
const PLATFORM = { platform_id: "platform:e4", platform_sha256: "d".repeat(64) };

// The stand-in engine speaks the protocol and misbehaves on request. The real Node binary
// is the fixed executable, so digest and path checks act on a real file on every platform.
const ENGINE_SCRIPT = String.raw`
const { spawn } = require("node:child_process");
const { existsSync, readFileSync, writeFileSync, appendFileSync } = require("node:fs");
const mode = process.argv[2];
const markerPath = process.argv[3];
const request = JSON.parse(readFileSync(0, "utf8"));

function envelope(overrides = {}) {
  return {
    protocol: "ascout-engine/1",
    request_id: request.request_id,
    engine: { id: "engine:fixture", version: "1.0.0", build: "build:1" },
    profile_sha256: request.profile_sha256,
    source: request.source,
    execution: { state: "COMPLETED", started_at_epoch_ms: 1, ended_at_epoch_ms: 2 },
    capabilities: request.capabilities.map((id) => ({ id, state: "EXECUTED", coverage: "COMPLETE" })),
    observations: [],
    diagnostics: [],
    ...overrides,
  };
}
const emit = (value) => process.stdout.write(JSON.stringify(value));
const observation = {
  observation_id: "observation:1",
  capability_id: request.capabilities[0],
  rule_id: "rule:1",
  location: { path: "tracked.txt", start_line: 1, end_line: 1 },
  message: "A rule matched.",
};
const holdOpen = () => setInterval(() => {}, 1000);
const grandchildSource = "require('node:fs').writeFileSync(process.argv[1], String(process.pid)); setInterval(() => {}, 1000);";

switch (mode) {
  case "clean": emit(envelope()); break;
  case "findings": emit(envelope({ observations: [observation] })); process.exitCode = 1; break;
  case "clean_exit_with_findings": emit(envelope({ observations: [observation] })); break;
  case "findings_exit_without_findings": emit(envelope()); process.exitCode = 1; break;
  case "partial": emit(envelope({ capabilities: request.capabilities.map((id) => ({ id, state: "INCOMPLETE", coverage: "PARTIAL" })) })); break;
  case "failed_execution": emit(envelope({ execution: { state: "FAILED", started_at_epoch_ms: 1, ended_at_epoch_ms: 2 } })); break;
  case "wrong_request": emit(envelope({ request_id: "request:other" })); break;
  case "wrong_profile": emit(envelope({ profile_sha256: "e".repeat(64) })); break;
  case "wrong_source": emit(envelope({ source: { ...request.source, tree_digest: "e".repeat(64) } })); break;
  case "wrong_engine": emit(envelope({ engine: { id: "engine:other", version: "1.0.0", build: "b" } })); break;
  case "missing_capability": emit(envelope({ capabilities: [] })); break;
  case "garbage": process.stdout.write("not json"); break;
  case "empty": break;
  case "no_input": process.exitCode = 3; break;
  case "native_error": process.stderr.write("fatal\n"); process.exitCode = 2; break;
  case "unmapped_exit": emit(envelope()); process.exitCode = 77; break;
  case "kill_self": process.kill(process.pid, "SIGKILL"); holdOpen(); break;
  case "stdout_flood": process.stdout.write("x".repeat(4096)); holdOpen(); break;
  case "stderr_flood": process.stderr.write("x".repeat(4096)); emit(envelope()); holdOpen(); break;
  case "hang": holdOpen(); break;
  case "secret_stdout": process.stdout.write(process.argv[4]); break;
  case "secret_stderr": process.stderr.write(process.argv[4]); emit(envelope()); break;
  case "secret_in_diagnostic": emit(envelope({ diagnostics: [{ code: "note:1", message: process.argv[4] }] })); break;
  case "escaped_secret_in_diagnostic": {
    const text = JSON.stringify(envelope({ diagnostics: [{ code: "note:1", message: "@@" }] }));
    const escaped = [...process.argv[4]].map((c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")).join("");
    process.stdout.write(text.replace("@@", () => escaped));
    break;
  }
  case "stderr_paths": process.stderr.write("at " + process.cwd() + "/x\n"); emit(envelope()); break;
  case "stderr_other_paths": process.stderr.write("a C:\\Other\\x.txt b [/opt/other/x] c \\\\host\\share\\x d \u001b[31m/opt/ansi/x\n"); emit(envelope()); break;
  case "secret_split_by_control": process.stderr.write(process.argv[4].slice(0, 3) + "\u0001" + process.argv[4].slice(3)); emit(envelope()); break;
  case "deep_json": process.stdout.write("[".repeat(200000) + JSON.stringify(process.argv[4]) + "]".repeat(200000)); break;
  case "env": writeFileSync(markerPath, JSON.stringify(process.env)); emit(envelope()); break;
  case "mutate_source": appendFileSync("tracked.txt", "changed\n"); emit(envelope()); break;
  case "mutate_config": appendFileSync(process.argv[4], "changed\n"); emit(envelope()); break;
  case "tree_hang": {
    // libuv's kill-on-close job would end a plain Windows grandchild along with this process,
    // so detaching there makes the broker's own tree kill the thing being tested.
    const child = spawn(process.execPath, ["-e", grandchildSource, markerPath], { stdio: "ignore", detached: process.platform === "win32" });
    child.unref();
    holdOpen();
    break;
  }
  // Windows places a Node child in a job that dies with its parent unless it is detached,
  // and on POSIX detaching leaves the process group, so these three modes differ on purpose.
  case "escape_detached_holding_pipes":
    spawn(process.execPath, ["-e", grandchildSource, markerPath], { stdio: ["ignore", "inherit", "inherit"], detached: true }).unref();
    exitOnceStarted(markerPath);
    break;
  case "escape_holding_pipes":
    spawn(process.execPath, ["-e", grandchildSource, markerPath], { stdio: ["ignore", "inherit", "inherit"] }).unref();
    exitOnceStarted(markerPath);
    break;
  case "escape_in_group":
    spawn(process.execPath, ["-e", grandchildSource, markerPath], { stdio: "ignore" }).unref();
    exitOnceStarted(markerPath);
    break;
  default: process.exitCode = 99;
}
function exitOnceStarted(marker) {
  const start = Date.now();
  const timer = setInterval(() => {
    if (existsSync(marker) || Date.now() - start > 8000) { clearInterval(timer); emit(envelope()); process.exit(0); }
  }, 25);
}
`;

interface Fixture {
  readonly base: string;
  readonly repo: string;
  readonly script: string;
  readonly config: string;
  readonly nodeSha256: string;
  readonly configSha256: string;
  readonly headSha: string;
  readonly treeDigest: string;
}

let fixture: Fixture;
const pidFiles: string[] = [];

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function git(cwd: string, ...args: string[]): void {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
}

function currentArch(): "x64" | "arm64" {
  if (process.arch !== "x64" && process.arch !== "arm64") {
    throw new Error("unsupported test architecture");
  }
  return process.arch;
}

function profileFor(
  mode: string,
  overrides: Partial<Record<keyof EngineProfileV1, unknown>> = {},
  extraArgs: readonly string[] = [],
): EngineProfileV1 {
  return {
    schema: "ascout-engine-profile/1",
    engine_id: "engine:fixture",
    profile_id: PROFILE_ID,
    release_version: "1.0.0",
    platform: process.platform as EngineProfileV1["platform"],
    arch: currentArch(),
    artifact: {
      source_url: "https://example.invalid/fixture",
      sha256: fixture.nodeSha256,
      license_spdx: "MIT",
      provenance_reference: "provenance:fixture",
      pinned_release_digest: "f".repeat(64),
    },
    executable_absolute_path: realpathSync.native(process.execPath),
    argv: [
      fixture.script,
      mode,
      join(fixture.base, "marker-unused"),
      ...extraArgs,
      String(overrides.config_absolute_path ?? fixture.config),
    ],
    environment: {},
    config_absolute_path: fixture.config,
    config_sha256: fixture.configSha256,
    requested_capabilities: [CAPABILITY],
    native_exit_map: { "0": "CLEAN", "1": "FINDINGS", "2": "ERROR", "3": "NO_INPUT" },
    output_format: "ascout-engine/1",
    coverage_mode: "explicit_changed_files",
    budget: { ...ENGINE_PROFILE_HARD_CAPS_V1, max_wall_ms: 20_000 },
    source_egress: "DENY",
    network: "DENY",
    independence: "DETERMINISTIC_TOOL",
    ...overrides,
  } as EngineProfileV1;
}

interface QualificationOptions {
  readonly requirements?: Record<string, unknown>;
  readonly expires?: number | null;
  readonly profileIdentities?: readonly string[];
  readonly engineKind?: "EXTERNAL" | "INTERNAL";
  readonly admission?: string;
  readonly capabilities?: readonly string[];
}

function qualificationFor(options: QualificationOptions = {}): EngineRequestV1["qualification"] {
  const descriptor = createEngineDescriptorV1({
    engine_id: "engine:fixture",
    engine_kind: options.engineKind ?? "EXTERNAL",
    implementation_identity: {
      implementation_id: "implementation:fixture",
      source_identity: "source:fixture",
      version: "1.0.0",
      artifact_sha256: fixture.nodeSha256,
    },
    capabilities: [...(options.capabilities ?? [CAPABILITY])],
    supported_inputs: ["input:source"],
    supported_outputs: ["output:evidence"],
    effect_classes: ["E0_READ_ONLY_ANALYSIS"],
    requirements: {
      process_required: true,
      network_required: false,
      provider_requirements: [],
      sandbox_required: false,
      ...options.requirements,
    } as never,
    configuration_trust_boundary: {
      trusted_configuration_sources: ["config:fixture"],
      advisory_configuration_sources: [],
    },
    license_provenance_state: {
      license_identity: "license:mit",
      provenance_ref: "provenance:fixture",
      admission_state: options.admission ?? "ADMITTED",
    },
    qualification_evidence_refs: [],
    known_limitations: [],
    authority_ceiling: "E0_READ_ONLY_ANALYSIS",
  });
  const configuration_identity = {
    configuration_id: "configuration:fixture",
    configuration_sha256: fixture.configSha256,
  };
  const qualification = createEngineQualificationV1({
    qualification_id: "qualification:fixture",
    engine_id: descriptor.engine_id,
    implementation_identity: descriptor.implementation_identity,
    configuration_identity,
    profile_identities: [...(options.profileIdentities ?? [PROFILE_ID])],
    benchmark_corpus_identity: BENCHMARK,
    platform_identity: PLATFORM,
    evidence_refs: [{ evidence_ref: "evidence:fixture", provider_self_description: false }],
    result: "QUALIFIED",
    qualified_at_epoch_ms: 1_000,
    expires_at_epoch_ms: options.expires === undefined ? null : options.expires,
  });
  return {
    registry: createEngineRegistryV1([{ descriptor, configuration_identity }]),
    qualification_set: createEngineQualificationSetV1([qualification]),
    benchmark_corpus_identity: BENCHMARK,
    platform_identity: PLATFORM,
  };
}

function requestFor(overrides: Partial<EngineRequestV1> = {}): EngineRequestV1 {
  return {
    schema: "ascout-engine-request/1",
    request_id: "request:1",
    source: {
      root_absolute_path: fixture.repo,
      head_sha: fixture.headSha,
      tree_digest: fixture.treeDigest,
    },
    capabilities: [CAPABILITY],
    qualification: qualificationFor(),
    ...overrides,
  };
}

/** The qualification every test run names by default: this exact profile's digest. */
function identityOf(profile: EngineProfileV1): string {
  try {
    return engineProfileQualificationIdentityV1(validateEngineProfileV1(profile));
  } catch {
    return "profile:invalid-in-this-test";
  }
}

function run(
  profile: EngineProfileV1,
  overrides: Partial<EngineRequestV1> & { readonly options?: QualificationOptions } = {},
  signal = new AbortController().signal,
) {
  const { options, ...fields } = overrides;
  const request = requestFor({
    qualification: qualificationFor({ profileIdentities: [identityOf(profile)], ...options }),
    ...fields,
  });
  return runQualifiedEngineV1(request, profile, signal);
}

function withMarker(
  mode: string,
  marker: string,
  overrides: Parameters<typeof profileFor>[1] = {},
): EngineProfileV1 {
  return { ...profileFor(mode, overrides), argv: [fixture.script, mode, marker, fixture.config] };
}

/** A synthetic value assembled at run time, so no secret-shaped text is committed. */
function syntheticToken(): string {
  return ["gh", "p_"].join("") + "a1B2".repeat(9);
}

function freshMarker(): string {
  const path = join(fixture.base, `marker-${pidFiles.length}.txt`);
  pidFiles.push(path);
  return path;
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitFor(condition: () => boolean, milliseconds: number): Promise<boolean> {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    if (condition()) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return condition();
}

beforeAll(() => {
  const base = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-e4-")));
  const repo = join(base, "repo");
  spawnSync("git", ["init", "-q", repo]);
  writeFileSync(join(repo, "tracked.txt"), "content\n");
  git(repo, "add", "tracked.txt");
  git(repo, "-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-q", "--no-gpg-sign", "-m", "x");
  const script = join(base, "engine.cjs");
  writeFileSync(script, ENGINE_SCRIPT);
  const config = join(base, "config.toml");
  writeFileSync(config, "fixed = true\n");
  fixture = {
    base,
    repo,
    script,
    config,
    nodeSha256: sha256(realpathSync.native(process.execPath)),
    configSha256: sha256(config),
    headSha: readGitHeadState(repo).head_sha,
    treeDigest: readTreeDigestV1(repo).tree_digest,
  };
}, 60_000);

afterEach(() => {
  // Any grandchild a test left behind is stopped here, then its marker is forgotten.
  for (const path of pidFiles.splice(0)) {
    if (!existsSync(path)) continue;
    const pid = Number(readFileSync(path, "utf8"));
    if (Number.isSafeInteger(pid) && pid > 0 && isAlive(pid)) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Already gone.
      }
    }
  }
});

afterAll(() => {
  rmSync(fixture.base, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe("runQualifiedEngineV1 complete runs", () => {
  it("reports EXECUTED for a clean run bound to source, profile, and request", async () => {
    const request = requestFor();
    const result = await run(profileFor("clean"));
    expect(result.status).toBe("EXECUTED");
    expect(result.reason_code).toBe("RUN_COMPLETE");
    expect(result.qualification_id).toBe("qualification:fixture");
    expect(result.executable_sha256).toBe(fixture.nodeSha256);
    expect(result.source_start?.head_sha).toBe(request.source.head_sha);
    expect(result.source_end).toEqual(result.source_start);
    expect(result.cleanup_complete).toBe(true);
    expect(result.envelope?.request_id).toBe("request:1");
    expect(result.limitations.join(" ")).toMatch(/not a sandbox/u);
    expect(result.limitations.join(" ")).toMatch(/does not block sockets/u);
  }, 60_000);

  it("interprets a findings exit through the profile", async () => {
    const result = await run(profileFor("findings"));
    expect(result.status).toBe("EXECUTED");
    expect(result.exit_code).toBe(1);
    expect(result.envelope?.observations).toHaveLength(1);
  }, 60_000);

  it("gives the engine a sanitized environment and nothing else", async () => {
    const marker = freshMarker();
    const previous = process.env.ASCOUT_E4_PARENT_ONLY;
    process.env.ASCOUT_E4_PARENT_ONLY = "parent-value";
    try {
      const result = await run(withMarker("env", marker, { environment: { ASCOUT_ENGINE_MODE: "strict" } }));
      expect(result.status).toBe("EXECUTED");
      const seen = JSON.parse(readFileSync(marker, "utf8")) as Record<string, string>;
      pidFiles.pop();
      const names = Object.keys(seen).map((name) => name.toUpperCase());
      expect(seen.ASCOUT_ENGINE_MODE).toBe("strict");
      expect(names).not.toContain("ASCOUT_E4_PARENT_ONLY");
      expect(names).not.toContain("HOME");
      expect(names).not.toContain("GITHUB_TOKEN");
      for (const [name, value] of Object.entries(seen)) {
        if (name === "ASCOUT_ENGINE_MODE") continue;
        // Windows needs these two to load system libraries. libuv fills in the rest
        // unless they are set, so the broker sets them empty.
        if (process.platform === "win32" && /^(?:SYSTEMROOT|WINDIR)$/iu.test(name)) continue;
        // macOS adds this inside the child as it starts. It is not inherited.
        if (process.platform === "darwin" && name === "__CF_USER_TEXT_ENCODING") continue;
        // Node copies its coverage directory to children unless it is set, as it is here.
        if (name !== "NODE_V8_COVERAGE") expect(process.platform, name).toBe("win32");
        expect(value, name).toBe("");
      }
    } finally {
      if (previous === undefined) delete process.env.ASCOUT_E4_PARENT_ONLY;
      else process.env.ASCOUT_E4_PARENT_ONLY = previous;
    }
  }, 60_000);
});

describe("runQualifiedEngineV1 refusals before launch", () => {
  it("refuses an invalid profile without starting anything", async () => {
    const result = await run(profileFor("clean", { network: "ALLOW" }));
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "INVALID_PROFILE"]);
    expect(result.started_at_epoch_ms).toBeNull();
  }, 30_000);

  it("refuses a forbidden environment variable", async () => {
    const result = await run(profileFor("clean", { environment: { NODE_OPTIONS: "--require=x" } }));
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "INVALID_PROFILE"]);
  }, 30_000);

  it("refuses an invalid request", async () => {
    const result = await run(profileFor("clean"), { request_id: "bad id" });
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "INVALID_REQUEST"]);
  }, 30_000);

  it("does not start when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await run(profileFor("clean"), {}, controller.signal);
    expect([result.status, result.reason_code]).toEqual(["NOT_RUN", "CANCELLED_BEFORE_START"]);
  }, 30_000);

  it("reports another platform as unavailable", async () => {
    const other = process.platform === "linux" ? "darwin" : "linux";
    const result = await run(
      profileFor("clean", {
        platform: other,
        executable_absolute_path: "/opt/fixture/engine",
        config_absolute_path: "/opt/fixture/config",
      }),
    );
    expect([result.status, result.reason_code]).toEqual(["UNAVAILABLE", "PLATFORM_MISMATCH"]);
  }, 30_000);

  it("refuses a capability outside the profile", async () => {
    const result = await run(profileFor("clean"), { capabilities: ["capability:other"] });
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "CAPABILITY_NOT_ADMITTED"]);
  }, 30_000);

  it("refuses a profile capability outside the descriptor", async () => {
    const result = await run(profileFor("clean"), { options: { capabilities: ["capability:other"] } });
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "CAPABILITY_NOT_ADMITTED"]);
  }, 30_000);

  it("refuses an engine with no matching registry entry", async () => {
    const profile = profileFor("clean", { release_version: "2.0.0" });
    const result = await run(profile);
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "ENGINE_NOT_REGISTERED"]);
  }, 30_000);

  it.each<[string, QualificationOptions]>([
    ["requires a network", { requirements: { network_required: true } }],
    ["requires a sandbox", { requirements: { sandbox_required: true } }],
    ["requires a provider", { requirements: { provider_requirements: ["provider:x"] } }],
    ["is internal", { engineKind: "INTERNAL" }],
    ["is not admitted", { admission: "PENDING" }],
  ])("refuses a descriptor that %s", async (_label, options) => {
    const result = await run(profileFor("clean"), { options });
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "DESCRIPTOR_NOT_ADMISSIBLE"]);
  }, 30_000);

  it("uses the kernel's refusal for an expired qualification", async () => {
    const result = await run(profileFor("clean"), { options: { expires: 2_000 } });
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "EXPIRED"]);
  }, 30_000);

  it("uses the kernel's refusal for a profile outside the qualification", async () => {
    const result = await run(profileFor("clean"), { options: { profileIdentities: ["profile:other"] } });
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "PROFILE_DRIFT"]);
  }, 30_000);

  it("refuses changed argv under a qualified profile ID", async () => {
    const qualified = profileFor("clean");
    const changed: EngineProfileV1 = { ...qualified, argv: [...qualified.argv, "--extra"] };
    expect(changed.profile_id).toBe(qualified.profile_id);
    const result = await run(changed, {
      options: { profileIdentities: [identityOf(qualified)] },
    });
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "PROFILE_DRIFT"]);
    expect(result.started_at_epoch_ms).toBeNull();
  }, 30_000);

  it("is not fooled by a capability array that answers its own checks", async () => {
    const crafted = Object.assign(["capability:other"], { every: () => true, includes: () => true });
    const result = await run(profileFor("clean"), { capabilities: crafted });
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "INVALID_REQUEST"]);
  }, 30_000);

  it("is not fooled by a capability array that supplies its own copy through species", async () => {
    const crafted = ["capability:other"] as unknown as string[] & { constructor: unknown };
    crafted.constructor = {
      [Symbol.species]: function species() {
        return Object.assign([], { every: () => true, some: () => false });
      },
    };
    const result = await run(profileFor("clean"), { capabilities: crafted });
    // Cloning drops the symbol key, which leaves a plain array holding the unadmitted capability.
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "CAPABILITY_NOT_ADMITTED"]);
  }, 30_000);

  it("refuses a lone surrogate in argv with a status, not a rejected promise", async () => {
    const result = await run(profileFor("clean", {}, ["\ud800"]));
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "INVALID_PROFILE"]);
  }, 30_000);

  it("refuses a registry that does not parse, such as a string of capabilities", async () => {
    const good = qualificationFor({ profileIdentities: [identityOf(profileFor("clean"))] });
    const [entry] = good.registry.entries;
    const registry = {
      ...good.registry,
      entries: [{ ...entry, descriptor: { ...entry?.descriptor, capabilities: "capability:scan-extended" } }],
    } as never;
    const result = await run(profileFor("clean"), { qualification: { ...good, registry } });
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "INVALID_REQUEST"]);
  }, 30_000);

  it("refuses a request whose getter throws, and claims no run limits", async () => {
    const hostile = Object.defineProperty({ ...requestFor() }, "source", {
      get() {
        throw new Error("hostile getter");
      },
    });
    const result = await runQualifiedEngineV1(hostile, profileFor("clean"), new AbortController().signal);
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "INVALID_REQUEST"]);
    expect(result.limitations).toEqual([]);
  }, 30_000);

  it("treats a directory whose name only starts with two dots as inside the source", async () => {
    const dotted = join(fixture.repo, "..tools");
    mkdirSync(dotted, { recursive: true });
    const planted = join(dotted, "planted.exe");
    writeFileSync(planted, "planted");
    try {
      const result = await run(profileFor("clean", { executable_absolute_path: planted }));
      expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "REPOSITORY_CONTROLLED_PATH"]);
    } finally {
      rmSync(dotted, { recursive: true, force: true });
    }
  }, 30_000);

  it("uses the kernel's refusal for another platform identity", async () => {
    const qualification = {
      ...qualificationFor({ profileIdentities: [identityOf(profileFor("clean"))] }),
      platform_identity: { platform_id: "platform:other", platform_sha256: "e".repeat(64) },
    };
    const result = await run(profileFor("clean"), { qualification });
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "PLATFORM_DRIFT"]);
  }, 30_000);

  it("reports a fake executable path as unavailable", async () => {
    const name = process.platform === "win32" ? "absent.exe" : "absent";
    const result = await run(profileFor("clean", { executable_absolute_path: join(fixture.base, name) }));
    expect([result.status, result.reason_code]).toEqual(["UNAVAILABLE", "EXECUTABLE_MISSING"]);
  }, 30_000);

  it("reports an absent configuration as unavailable", async () => {
    const result = await run(profileFor("clean", { config_absolute_path: join(fixture.base, "absent.toml") }));
    expect([result.status, result.reason_code]).toEqual(["UNAVAILABLE", "CONFIG_MISSING"]);
  }, 30_000);

  it("refuses an executable and a configuration inside the source", async () => {
    const planted = join(fixture.repo, "planted.exe");
    writeFileSync(planted, "planted");
    try {
      const executable = await run(profileFor("clean", { executable_absolute_path: planted }));
      expect([executable.status, executable.reason_code]).toEqual(["DENIED_BY_POLICY", "REPOSITORY_CONTROLLED_PATH"]);
      const config = await run(profileFor("clean", { config_absolute_path: planted }));
      expect([config.status, config.reason_code]).toEqual(["DENIED_BY_POLICY", "REPOSITORY_CONTROLLED_PATH"]);
    } finally {
      rmSync(planted, { force: true });
    }
  }, 60_000);

  it.skipIf(process.platform === "win32")("refuses a symlink to the executable", async () => {
    const link = join(fixture.base, "engine-link");
    symlinkSync(realpathSync.native(process.execPath), link);
    const result = await run(profileFor("clean", { executable_absolute_path: link }));
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "NON_CANONICAL_PATH"]);
  }, 30_000);

  it("reports a digest mismatch, even when the registry agrees with the profile", async () => {
    const wrong = "e".repeat(64);
    const descriptorDigest = fixture.nodeSha256;
    const profile = profileFor("clean", {
      artifact: { ...profileFor("clean").artifact, sha256: wrong },
    });
    const saved = fixture;
    fixture = { ...saved, nodeSha256: wrong };
    let qualification: EngineRequestV1["qualification"];
    try {
      qualification = qualificationFor({ profileIdentities: [identityOf(profile)] });
    } finally {
      fixture = saved;
    }
    expect(descriptorDigest).not.toBe(wrong);
    const result = await run(profile, { qualification });
    expect([result.status, result.reason_code]).toEqual(["VERSION_MISMATCH", "EXECUTABLE_DIGEST_MISMATCH"]);
    expect(result.started_at_epoch_ms).toBeNull();
  }, 30_000);

  it("reports a changed configuration as a digest mismatch", async () => {
    const other = join(fixture.base, "other-config.toml");
    writeFileSync(other, "different = true\n");
    const result = await run(profileFor("clean", { config_absolute_path: other }));
    expect([result.status, result.reason_code]).toEqual(["VERSION_MISMATCH", "CONFIG_DIGEST_MISMATCH"]);
  }, 30_000);

  it("does not start on a stale HEAD or a stale tree", async () => {
    const current = requestFor();
    const staleHead = await run(profileFor("clean"), {
      source: { ...current.source, head_sha: "0".repeat(40) },
    });
    expect([staleHead.status, staleHead.reason_code]).toEqual(["NOT_RUN", "SOURCE_DRIFT_AT_START"]);
    expect(staleHead.started_at_epoch_ms).toBeNull();
    const staleTree = await run(profileFor("clean"), {
      source: { ...current.source, tree_digest: "0".repeat(64) },
    });
    expect([staleTree.status, staleTree.reason_code]).toEqual(["NOT_RUN", "SOURCE_DRIFT_AT_START"]);
  }, 60_000);

  it("does not start outside a usable Git source", async () => {
    const result = await run(profileFor("clean"), {
      source: { ...requestFor().source, root_absolute_path: mkdtempSync(join(fixture.base, "not-git-")) },
    });
    expect([result.status, result.reason_code]).toEqual(["NOT_RUN", "SOURCE_BINDING_UNAVAILABLE"]);
  }, 30_000);

  it("refuses a request larger than the input cap", async () => {
    const budget = { ...ENGINE_PROFILE_HARD_CAPS_V1, max_input_bytes: 16 };
    const result = await run(profileFor("clean", { budget }));
    expect([result.status, result.reason_code]).toEqual(["DENIED_BY_POLICY", "REQUEST_TOO_LARGE"]);
  }, 30_000);
});

describe("runQualifiedEngineV1 failures during and after a run", () => {
  it.each<[string, string, string]>([
    ["garbage", "MALFORMED_OUTPUT", "INVALID_ENVELOPE"],
    ["empty", "MALFORMED_OUTPUT", "INVALID_ENVELOPE"],
    ["wrong_request", "MALFORMED_OUTPUT", "REQUEST_ID_MISMATCH"],
    ["wrong_profile", "MALFORMED_OUTPUT", "ENVELOPE_BINDING_MISMATCH"],
    ["wrong_source", "MALFORMED_OUTPUT", "ENVELOPE_BINDING_MISMATCH"],
    ["wrong_engine", "MALFORMED_OUTPUT", "ENVELOPE_BINDING_MISMATCH"],
    ["missing_capability", "MALFORMED_OUTPUT", "ENVELOPE_BINDING_MISMATCH"],
    ["clean_exit_with_findings", "MALFORMED_OUTPUT", "EXIT_ENVELOPE_DISAGREEMENT"],
    ["findings_exit_without_findings", "MALFORMED_OUTPUT", "EXIT_ENVELOPE_DISAGREEMENT"],
    ["partial", "INCOMPLETE", "PARTIAL_COVERAGE"],
    ["failed_execution", "MALFORMED_OUTPUT", "EXIT_ENVELOPE_DISAGREEMENT"],
    ["no_input", "INCOMPLETE", "NATIVE_NO_INPUT"],
    ["native_error", "ENGINE_ERROR", "NATIVE_ERROR_EXIT"],
    ["unmapped_exit", "ENGINE_ERROR", "UNMAPPED_EXIT"],
  ])("maps the %s engine to %s", async (mode, status, reason) => {
    const result = await run(profileFor(mode));
    expect([result.status, result.reason_code]).toEqual([status, reason]);
    if (status !== "INCOMPLETE" || reason !== "PARTIAL_COVERAGE") {
      expect(result.envelope).toBeNull();
    }
    expect(result.cleanup_complete).toBe(true);
  }, 60_000);

  it.skipIf(process.platform === "win32")("reports an engine ended by a signal", async () => {
    const result = await run(profileFor("kill_self"));
    expect([result.status, result.reason_code]).toEqual(["ENGINE_ERROR", "TERMINATED_BY_SIGNAL"]);
  }, 60_000);

  it("stops at the wall limit, tears down the tree, and reports TIMEOUT", async () => {
    const marker = freshMarker();
    const result = await run(withMarker("tree_hang", marker, {
      budget: { ...ENGINE_PROFILE_HARD_CAPS_V1, max_wall_ms: 3_000 },
    }));
    expect([result.status, result.reason_code]).toEqual(["TIMEOUT", "WALL_TIME_EXCEEDED"]);
    expect(result.cleanup_complete).toBe(true);
    expect(result.envelope).toBeNull();
    expect(existsSync(marker), "the grandchild should have started").toBe(true);
    const pid = Number(readFileSync(marker, "utf8"));
    expect(await waitFor(() => !isAlive(pid), 5_000), "the grandchild should be gone").toBe(true);
  }, 60_000);

  it("stops on cancellation and tears down the tree", async () => {
    const marker = freshMarker();
    const controller = new AbortController();
    const running = run(withMarker("tree_hang", marker), {}, controller.signal);
    expect(await waitFor(() => existsSync(marker), 10_000)).toBe(true);
    const pid = Number(readFileSync(marker, "utf8"));
    controller.abort();
    const result = await running;
    expect([result.status, result.reason_code]).toEqual(["INCOMPLETE", "CANCELLED"]);
    expect(result.cleanup_complete).toBe(true);
    expect(await waitFor(() => !isAlive(pid), 5_000), "the grandchild should be gone").toBe(true);
  }, 60_000);

  it("stops an engine that passes its stdout cap, and never reports clean", async () => {
    const budget = { ...ENGINE_PROFILE_HARD_CAPS_V1, max_stdout_bytes: 1_024 };
    const started = Date.now();
    const result = await run(profileFor("stdout_flood", { budget }));
    expect([result.status, result.reason_code]).toEqual(["INCOMPLETE", "OUTPUT_CAP_EXCEEDED"]);
    expect(result.stdout?.cap_hit).toBe(true);
    expect(result.stdout?.captured_bytes).toBe(1_024);
    expect(result.envelope).toBeNull();
    expect(Date.now() - started).toBeLessThan(15_000);
  }, 60_000);

  it("stops an engine that passes its stderr cap", async () => {
    const budget = { ...ENGINE_PROFILE_HARD_CAPS_V1, max_stderr_bytes: 1_024 };
    const result = await run(profileFor("stderr_flood", { budget }));
    expect([result.status, result.reason_code]).toEqual(["INCOMPLETE", "OUTPUT_CAP_EXCEEDED"]);
    expect(result.stderr?.cap_hit).toBe(true);
    expect(result.envelope).toBeNull();
  }, 60_000);

  it.each(["secret_stdout", "secret_stderr", "secret_in_diagnostic", "escaped_secret_in_diagnostic"])(
    "withholds all output for %s",
    async (mode) => {
      const token = syntheticToken();
      const result = await run(profileFor(mode, {}, [token]));
      expect([result.status, result.reason_code]).toEqual(["MALFORMED_OUTPUT", "SECRET_IN_OUTPUT"]);
      expect(result.output_withheld).toBe(true);
      expect(result.envelope).toBeNull();
      expect(result.stderr_excerpt).toBeNull();
      expect(JSON.stringify(result)).not.toContain(token);
    },
    60_000,
  );

  it("withholds the value of a sensitive parent variable", async () => {
    const value = "exact-parent-value-" + "x".repeat(16);
    const previous = process.env.ASCOUT_E4_TEST_TOKEN;
    process.env.ASCOUT_E4_TEST_TOKEN = value;
    try {
      const result = await run(profileFor("secret_stderr", {}, [value]));
      expect(result.reason_code).toBe("SECRET_IN_OUTPUT");
      expect(JSON.stringify(result)).not.toContain(value);
    } finally {
      if (previous === undefined) delete process.env.ASCOUT_E4_TEST_TOKEN;
      else process.env.ASCOUT_E4_TEST_TOKEN = previous;
    }
  }, 60_000);

  it("withholds a sensitive value that JSON escaping changed", async () => {
    const value = 'pa"ss-exact-value-w0rd';
    const previous = process.env.ASCOUT_E4_TEST_PASSWORD;
    process.env.ASCOUT_E4_TEST_PASSWORD = value;
    try {
      const result = await run(profileFor("secret_in_diagnostic", {}, [value.replaceAll('"', "'") ]));
      expect(result.status).toBe("EXECUTED");
      const escaped = await run(profileFor("escaped_secret_in_diagnostic", {}, [value]));
      expect(escaped.reason_code).toBe("SECRET_IN_OUTPUT");
      expect(escaped.envelope).toBeNull();
    } finally {
      if (previous === undefined) delete process.env.ASCOUT_E4_TEST_PASSWORD;
      else process.env.ASCOUT_E4_TEST_PASSWORD = previous;
    }
  }, 60_000);

  it("withholds a secret split by a control character", async () => {
    const token = syntheticToken();
    const result = await run(profileFor("secret_split_by_control", {}, [token]));
    expect([result.status, result.reason_code]).toEqual(["MALFORMED_OUTPUT", "SECRET_IN_OUTPUT"]);
    expect(result.stderr_excerpt).toBeNull();
    expect(JSON.stringify(result)).not.toContain(token);
  }, 60_000);

  it("withholds output nested too deeply to scan", async () => {
    const result = await run(profileFor("deep_json", {}, ["x"]));
    expect(result.status).toBe("MALFORMED_OUTPUT");
    expect(result.envelope).toBeNull();
    // JSON.parse may refuse this depth itself, which also ends in a rejected envelope.
    if (result.output_withheld) expect(result.stdout?.sha256).toBeNull();
  }, 60_000);

  it("replaces other absolute paths and removes escape codes in the stderr excerpt", async () => {
    const result = await run(profileFor("stderr_other_paths"));
    expect(result.status).toBe("EXECUTED");
    for (const leaked of ["Other", "/opt/other", "host", "/opt/ansi", "\u001b"]) {
      expect(result.stderr_excerpt).not.toContain(leaked);
    }
  }, 60_000);

  it("returns no stderr excerpt when stderr hit its cap", async () => {
    const budget = { ...ENGINE_PROFILE_HARD_CAPS_V1, max_stderr_bytes: 1_024 };
    const result = await run(profileFor("stderr_flood", { budget }));
    expect(result.stderr?.cap_hit).toBe(true);
    expect(result.stderr_excerpt).toBeNull();
  }, 60_000);

  it("replaces the source path in the stderr excerpt", async () => {
    const result = await run(profileFor("stderr_paths"));
    expect(result.status).toBe("EXECUTED");
    expect(result.stderr_excerpt).toContain("<source>");
    expect(result.stderr_excerpt).not.toContain(fixture.repo);
  }, 60_000);

  it("reports source changed by the engine as drift at the end", async () => {
    const tracked = join(fixture.repo, "tracked.txt");
    const original = readFileSync(tracked);
    try {
      const result = await run(profileFor("mutate_source"));
      expect([result.status, result.reason_code]).toEqual(["INCOMPLETE", "SOURCE_DRIFT_AT_END"]);
      expect(result.envelope).toBeNull();
      expect(result.source_end?.tree_digest).not.toBe(result.source_start?.tree_digest);
    } finally {
      writeFileSync(tracked, original);
    }
  }, 60_000);

  it("reports a configuration changed during the run", async () => {
    const config = join(fixture.base, "mutable-config.toml");
    writeFileSync(config, "fixed = true\n");
    const digest = sha256(config);
    const saved = fixture;
    fixture = { ...saved, config, configSha256: digest };
    try {
      const result = await run(profileFor("mutate_config", {}, [config]));
      expect([result.status, result.reason_code]).toEqual(["VERSION_MISMATCH", "ARTIFACT_CHANGED_DURING_RUN"]);
      expect(result.envelope).toBeNull();
    } finally {
      fixture = saved;
    }
  }, 60_000);

  it("fails closed when a detached descendant outlives the root and holds its pipes", async () => {
    const marker = freshMarker();
    const started = Date.now();
    const result = await run(withMarker("escape_detached_holding_pipes", marker));
    expect([result.status, result.reason_code]).toEqual(["ENGINE_ERROR", "CLEANUP_INCOMPLETE"]);
    expect(result.cleanup_complete).toBe(false);
    expect(result.envelope).toBeNull();
    // The wait must come from the drain check, not the 20 second wall limit.
    expect(Date.now() - started).toBeLessThan(15_000);
    expect(existsSync(marker), "the descendant should have started").toBe(true);
    expect(isAlive(Number(readFileSync(marker, "utf8"))), "this test needs a live escapee").toBe(true);
  }, 60_000);

  it.skipIf(process.platform === "win32").each(["escape_holding_pipes", "escape_in_group"])(
    "finds and stops a descendant left in the process group by %s",
    async (mode) => {
      const marker = freshMarker();
      const result = await run(withMarker(mode, marker));
      expect([result.status, result.reason_code]).toEqual(["INCOMPLETE", "TREE_ESCAPE"]);
      expect(result.cleanup_complete).toBe(true);
      expect(result.envelope).toBeNull();
      const pid = Number(readFileSync(marker, "utf8"));
      expect(await waitFor(() => !isAlive(pid), 5_000), "the descendant should be gone").toBe(true);
    },
    60_000,
  );
});
