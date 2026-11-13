import { execFileSync } from "node:child_process";
import { chmodSync, closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { computeRemoteReviewV1 } from "../src/command-functions.js";
import { runCli, runRemoteReview } from "../src/cli.js";
import {
  confirmAtTerminalV1,
  isPublicAddressV1,
  parseRemoteEndpointV1,
  promptForHostV1,
  readRemoteReviewConfigV2,
  remoteReviewConfigPath,
  runRemoteReviewV1,
  scanRemotePayloadV1,
  terminalPathsV1,
  defaultRemoteReviewDepsV1,
  type RemoteDisclosureV1,
  type RemoteReviewInputV1,
} from "../src/assurance/review/remote-review.js";
import { readWorkingTreeComparison } from "../src/git.js";
import { collectReviewChanges } from "../src/command-functions.js";

vi.setConfig({ testTimeout: 180_000 });

// Edges of remote review that the main suite doesn't reach: every config refusal, address and
// endpoint corner, the terminal prompt, the scan's failure paths, and the command wrapper's outcomes.
// Nothing here connects anywhere: DNS, the terminal, the scan, and the network are recorders.
const roots: string[] = [];
const originalCwd = process.cwd();
afterEach(() => {
  process.chdir(originalCwd);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function temp(prefix: string): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  roots.push(dir);
  return dir;
}

function git(root: string, args: readonly string[]): void {
  execFileSync("git", args, { cwd: root, windowsHide: true });
}

function repository(changed = true): string {
  const root = temp("ascout-e10c-edge-");
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Ascout Test"]);
  git(root, ["config", "user.email", "ascout@example.invalid"]);
  git(root, ["config", "commit.gpgSign", "false"]);
  git(root, ["config", "core.autocrlf", "false"]);
  writeFileSync(join(root, "a.ts"), "export const a = 1;\nexport const b = 2;\n");
  git(root, ["add", "--all"]);
  git(root, ["commit", "-q", "-m", "base"]);
  if (changed) writeFileSync(join(root, "a.ts"), "export const a = 1;\nexport const b = 20;\n");
  return root;
}

const config = (root: string, overrides: Record<string, unknown> = {}) => ({
  version: 2, provider: "openai-compatible", endpoint: "https://api.example-provider.com/v1", model: "m", model_family: "example",
  credential_env: "E10C_EDGE_KEY", allow_remote_egress: true, operator_authorized: true, repositories: [root], ...overrides,
});

function home(body: unknown): string {
  const dir = temp("ascout-e10c-edge-home-");
  writeFileSync(join(dir, "review-remote.json"), typeof body === "string" ? body : JSON.stringify(body));
  return dir;
}

const reply = (content: string) => ({ status: 200, text: JSON.stringify({ choices: [{ message: { content } }] }) });

function deps(overrides: Partial<Pick<RemoteReviewInputV1, "confirm" | "scan" | "resolve" | "transport">> = {}): Pick<RemoteReviewInputV1, "confirm" | "scan" | "resolve" | "transport"> {
  return {
    confirm: () => "api.example-provider.com",
    scan: async () => ({ kind: "clean" }),
    resolve: async () => [{ address: "93.184.216.34", family: 4 }],
    transport: async () => reply(JSON.stringify({ findings: [{ path: "a.ts", start_line: 2, severity: "major", category: "bug", message: "b changed" }] })),
    ...overrides,
  };
}

function runInput(root: string, configHome: string, overrides: Partial<RemoteReviewInputV1> = {}): RemoteReviewInputV1 {
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const comparison = readWorkingTreeComparison(root, head);
  return {
    repositoryRoot: root,
    target_id: "repo",
    head_sha: head,
    config: readRemoteReviewConfigV2(root, { configHome }),
    changed_files: comparison.changed_files,
    changes: collectReviewChanges(root, head, comparison.changed_files),
    readText: (path) => readFileSync(join(root, path), "utf8"),
    redact: (text) => text,
    gitleaksPath: "unused",
    dryRun: false,
    env: { E10C_EDGE_KEY: "sk-edge" },
    ...deps(),
    ...overrides,
  };
}

describe("endpoint and address corners", () => {
  it.each([["not a URL", "::"], ["port zero", "https://api.example.com:0/v1"], ["an out-of-range port", "https://api.example.com:70000/v1"]])("refuses %s", (_label, endpoint) => {
    expect(typeof parseRemoteEndpointV1(endpoint)).toBe("string");
  });

  it.each([["198.19.0.1", false], ["::1.2.3.4", false], ["::ffff:0102:0304", false], ["fffff::1", false], ["1:2:3:4:5:6:7:8:9", false],
    ["2606:4700:4700::1111", true], ["2606:4700::", true], ["::1:2:3", false], ["2606:4700:0:0:0:0:0:1111", true], ["64:ff9b::1.2.3.4", false]])("classifies %s as public: %s", (address, expected) => {
    expect(isPublicAddressV1(address as string)).toBe(expected);
  });
});

describe("config refusals", () => {
  it("has no config path, and so nothing configured, for an account without a home folder", () => {
    expect(remoteReviewConfigPath({ accountHome: () => "" })).toBeNull();
    expect(remoteReviewConfigPath({ accountHome: () => { throw new Error("no account"); } })).toBeNull();
    expect(remoteReviewConfigPath()).toMatch(/review-remote\.json$/u);
    expect(readRemoteReviewConfigV2(repository(), { accountHome: () => "" })).toMatchObject({ state: "absent" });
  });

  it.each([
    ["too large", () => `{"pad":"${"x".repeat(17 * 1024)}"}`],
    ["not JSON", () => "{nope"],
    ["an array", () => "[]"],
    ["another provider", (root: string) => config(root, { provider: "ollama" })],
    ["no endpoint", (root: string) => config(root, { endpoint: 42 })],
    ["a bad model name", (root: string) => config(root, { model: "bad name" })],
    ["a bad model family", (root: string) => config(root, { model_family: "" })],
    ["zero output tokens", (root: string) => config(root, { limits: { max_output_tokens: 0 } })],
    ["too many output tokens", (root: string) => config(root, { limits: { max_output_tokens: 40_000 } })],
  ])("refuses a config that is %s", (_label, body) => {
    const root = repository();
    expect(readRemoteReviewConfigV2(root, { configHome: home(body(root)) })).toMatchObject({ state: "invalid" });
  });

  it.skipIf(process.platform === "win32")("refuses a config other users can write", () => {
    const root = repository();
    const dir = home(config(root));
    chmodSync(join(dir, "review-remote.json"), 0o666);
    expect(readRemoteReviewConfigV2(root, { configHome: dir })).toMatchObject({ state: "invalid", reason: expect.stringContaining("writable by other users") });
  });
});

describe("the terminal prompt", () => {
  const disclosure: RemoteDisclosureV1 = { host: "api.example.com", endpoint: "https://api.example.com/v1", model: "m", files: 1, bytes: 10, payload_sha256: "a".repeat(64), last_confirmed_host: "old.example.com" };

  it("uses the console on Windows and /dev/tty elsewhere", () => {
    expect(terminalPathsV1("win32")).toEqual(["\\\\.\\CONIN$", "\\\\.\\CONOUT$"]);
    expect(terminalPathsV1("linux")).toEqual(["/dev/tty", "/dev/tty"]);
  });

  it("shows the disclosure, notes a changed host, and reads one line across chunks", () => {
    const chunks = ["api.exam", "ple.com\nignored"];
    const written: string[] = [];
    const typed = promptForHostV1(disclosure, (buffer) => {
      const next = chunks.shift();
      if (next === undefined) return 0;
      return buffer.write(next);
    }, (text) => written.push(text));
    expect(typed).toBe("api.example.com");
    expect(written.join("")).toContain("differs from the one last confirmed for this repository (old.example.com)");
    expect(promptForHostV1({ ...disclosure, last_confirmed_host: null }, () => 0, () => undefined)).toBe("");
    expect(promptForHostV1(disclosure, (buffer) => buffer.write("x".repeat(512)), () => undefined)).toHaveLength(512);
  });

  it("returns null without a terminal, and reads a real terminal's answer", () => {
    expect(confirmAtTerminalV1(disclosure, { open: () => { throw new Error("no tty"); }, isTerminal: () => true })).toBeNull();
    const dir = temp("ascout-e10c-tty-");
    writeFileSync(join(dir, "in"), "api.example.com\n");
    writeFileSync(join(dir, "out"), "");
    const open = (path: string, flags: string) => openSync(join(dir, path.includes("CONOUT") || flags === "w" ? "out" : "in"), flags);
    expect(confirmAtTerminalV1(disclosure, { open, isTerminal: () => false })).toBeNull();
    expect(confirmAtTerminalV1(disclosure, { open, isTerminal: () => true })).toBe("api.example.com");
    expect(readFileSync(join(dir, "out"), "utf8")).toContain("host:     api.example.com");
    void closeSync;
  });
});

describe("the payload scan's failure paths", () => {
  it("is unavailable with no trusted Git", async () => {
    const root = repository();
    // Restored by hand: Windows treats PATH and Path as one variable, which confuses stubbed restores.
    const saved = process.env.PATH;
    process.env.PATH = temp("ascout-e10c-nogit-");
    try {
      expect(await scanRemotePayloadV1([{ path: "a.ts", text: "x" }], "gitleaks", undefined, root)).toMatchObject({ kind: "unavailable", reason: expect.stringContaining("no trusted Git") });
    } finally {
      process.env.PATH = saved;
    }
  });

  it("names an unnamed section safely and is unavailable when Gitleaks won't run", async () => {
    // On Windows the engine profile needs an .exe name before it ever tries to run it.
    const fake = join(temp("ascout-e10c-fake-"), process.platform === "win32" ? "gitleaks.exe" : "gitleaks");
    writeFileSync(fake, "not an executable");
    expect(await scanRemotePayloadV1([{ path: "", text: "x" }], fake, undefined, repository())).toMatchObject({ kind: "unavailable" });
    expect(await scanRemotePayloadV1([{ path: "a.ts", text: "x" }], fake, new AbortController().signal, repository())).toMatchObject({ kind: "unavailable" });
  });
});

describe("remote review outcomes", () => {
  it("sends nothing when every changed file is excluded", async () => {
    const root = repository();
    const result = await runRemoteReviewV1(runInput(root, home(config(root, { exclude: ["a.ts"] }))));
    expect(result).toMatchObject({ kind: "not_run", reason: expect.stringContaining("no changed file") });
  });

  it("connects over IPv6 when the only answer is a public IPv6 address", async () => {
    const root = repository();
    const sent: number[] = [];
    await runRemoteReviewV1(runInput(root, home(config(root)), {
      resolve: async () => [{ address: "2606:4700:4700::1111", family: 6 }],
      transport: async (exchange) => {
        sent.push(exchange.family);
        return reply(JSON.stringify({ findings: [] }));
      },
    }));
    expect(sent).toEqual([6]);
  });

  it("sends nothing when the host can't be resolved", async () => {
    const root = repository();
    const result = await runRemoteReviewV1(runInput(root, home(config(root)), { resolve: async () => { throw new Error("ENOTFOUND"); } }));
    expect(result).toMatchObject({ kind: "not_run", reason: expect.stringContaining("could not be resolved") });
  });

  it("uses the real terminal by default, which refuses where there is none", () => {
    if (process.stdin.isTTY === true) return;
    const real = defaultRemoteReviewDepsV1(repository(), null);
    expect(real.confirm({ host: "h.example", endpoint: "https://h.example", model: "m", files: 1, bytes: 1, payload_sha256: "a".repeat(64), last_confirmed_host: null })).toBeNull();
  });

  it("treats a completion without message content as no review", async () => {
    const root = repository();
    const result = await runRemoteReviewV1(runInput(root, home(config(root)), { transport: async () => ({ status: 200, text: JSON.stringify({ choices: [{ message: {} }] }) }) }));
    expect(result).toMatchObject({ kind: "not_run" });
  });

  it("reports NO_FINDINGS, still exit 4, and marks a same-family model as not independent", async () => {
    const root = repository();
    const result = await runRemoteReviewV1(runInput(root, home(config(root, { model_family: "claude" })), { transport: async () => reply(JSON.stringify({ findings: [] })) }));
    expect(result.kind === "review" && result.report).toMatchObject({ outcome: "NO_FINDINGS", exit_code: 4, provider: { independence: "SAME_MODEL_FAMILY" } });
  });

  it("forgets a stored host that isn't a plain host name", async () => {
    const root = repository();
    const dir = home(config(root));
    writeFileSync(join(dir, "review-remote-history.json"), JSON.stringify({ [root]: "evil host\n", [root.toLowerCase()]: "evil host\n" }));
    const seen: (string | null)[] = [];
    await runRemoteReviewV1(runInput(root, dir, { confirm: (d) => { seen.push(d.last_confirmed_host); return null; } }));
    expect(seen).toEqual([null]);
  });

  it("reads no history without an operator config file, even one planted in the current folder", async () => {
    const root = repository();
    const loaded = readRemoteReviewConfigV2(root, { configHome: home(config(root)) });
    const cwd = realpathSync(mkdtempSync(join(tmpdir(), "ascout-e10c-cwd-")));
    const previous = process.cwd();
    process.chdir(cwd);
    try {
      writeFileSync(join(cwd, "review-remote-history.json"), JSON.stringify({ [root]: "planted.example", [root.toLowerCase()]: "planted.example" }));
      const seen: (string | null)[] = [];
      await runRemoteReviewV1(runInput(root, cwd, { config: { ...loaded, path: "(workflow)" }, confirm: (d) => { seen.push(d.last_confirmed_host); return null; } }));
      expect(seen).toEqual([null]);
    } finally {
      process.chdir(previous);
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe("computeRemoteReviewV1 and the CLI", () => {
  it("reports findings (exit 1), source that changed during the review (exit 3), nothing to review, and a broken config", async () => {
    vi.stubEnv("E10C_EDGE_KEY", "sk-edge");
    const root = repository();
    const dir = home(config(root));
    expect(await computeRemoteReviewV1(root, { dryRun: false, configHome: dir, deps: deps() })).toMatchObject({ kind: "report", exit_code: 1 });
    const drifting = deps({ transport: async () => {
      writeFileSync(join(root, "a.ts"), "export const changed = true;\n");
      return reply(JSON.stringify({ findings: [] }));
    } });
    expect(await computeRemoteReviewV1(root, { dryRun: false, configHome: dir, deps: drifting })).toMatchObject({ kind: "report", exit_code: 3 });
    const clean = repository(false);
    expect((await computeRemoteReviewV1(clean, { dryRun: false, configHome: home(config(clean)), deps: deps() })).exit_code).not.toBe(1);
    expect(await computeRemoteReviewV1(root, { dryRun: false, configHome: home("{nope"), deps: deps() })).toMatchObject({ kind: "error", exit_code: 2 });
    expect(await computeRemoteReviewV1(temp("ascout-e10c-norepo-"), { dryRun: false, deps: deps() })).toMatchObject({ kind: "error", exit_code: 2 });
  });

  it("prints a refusal to the terminal, reports a broken config as exit 2, and routes --remote-model from the command line", async () => {
    const root = repository();
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await runRemoteReview(root, false, "terminal", temp("ascout-e10c-none-"))).toBe(4);
    expect(consoleError.mock.calls.flat().join("\n")).toContain("no remote review provider is configured");
    expect(await runRemoteReview(root, false, "json", home("{nope"))).toBe(2);
    expect(await runRemoteReview(root, false, undefined, temp("ascout-e10c-none2-"))).toBe(4);
    process.chdir(root);
    expect([2, 4]).toContain(await runCli(["review", "--remote-model", "--dry-run", "--format", "json"]));
    if (process.stdin.isTTY !== true) expect([2, 4]).toContain(await runCli(["review", "--remote-model", "--format", "json"]));
    // E10d's ingest outside any repository is an error, not a crash.
    process.chdir(temp("ascout-e10c-norepo2-"));
    expect(await runCli(["review", "--ingest", join(temp("ascout-e10c-f-"), "findings.json")])).toBe(2);
    mkdirSync(join(root, "unused"), { recursive: true });
  });
});
