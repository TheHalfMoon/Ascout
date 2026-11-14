import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { readWorkingTreeComparison } from "../src/git.js";
import { collectReviewChanges } from "../src/command-functions.js";
import { parseCliArgs, CliUsageError, usageText } from "../src/cli.js";
import {
  isPublicAddressV1,
  parseRemoteEndpointV1,
  readRemoteReviewConfigV2,
  remoteReviewConfigPath,
  repositoryIsListedV1,
  runRemoteReviewV1,
  type PayloadScanV1,
  type RemoteDisclosureV1,
  type RemoteExchangeV1,
  type RemoteReviewInputV1,
} from "../src/assurance/review/remote-review.js";

vi.setConfig({ testTimeout: 180_000 });

// E10c: remote review. Nothing leaves the machine unless every gate passes. These tests replace the
// terminal, the payload scan, DNS, and the network with recorders, so they can prove what would and
// would not be sent without any real connection.
const CREDENTIAL = "sk-test-credential-value-e10c";
const roots: string[] = [];
afterEach(() => {
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

function repository(): string {
  const root = temp("ascout-e10c-repo-");
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Ascout Test"]);
  git(root, ["config", "user.email", "ascout@example.invalid"]);
  git(root, ["config", "commit.gpgSign", "false"]);
  git(root, ["config", "core.autocrlf", "false"]);
  writeFileSync(join(root, "a.ts"), ["export const a = 1;", "export const b = 2;", "export const c = 3;", ""].join("\n"));
  mkdirSync(join(root, "vendor"));
  writeFileSync(join(root, "vendor", "v.ts"), "export const v = 1;\n");
  writeFileSync(join(root, "keep.env"), "TOKEN=1\n");
  git(root, ["add", "--all"]);
  git(root, ["commit", "-q", "-m", "base"]);
  writeFileSync(join(root, "a.ts"), ["export const a = 1;", "export const b = 20;", "export const c = 3;", ""].join("\n"));
  writeFileSync(join(root, "vendor", "v.ts"), "export const v = 2;\n");
  writeFileSync(join(root, "keep.env"), "TOKEN=2\n");
  writeFileSync(join(root, "untracked.ts"), "export const u = 1;\n");
  return root;
}

const CONFIG = (root: string, overrides: Record<string, unknown> = {}) => ({
  version: 2,
  provider: "openai-compatible",
  endpoint: "https://api.example-provider.com/v1",
  model: "example-model",
  model_family: "example",
  credential_env: "EXAMPLE_API_KEY",
  allow_remote_egress: true,
  operator_authorized: true,
  repositories: [root],
  exclude: ["vendor"],
  ...overrides,
});

function configHome(config: unknown): string {
  const home = temp("ascout-e10c-config-");
  writeFileSync(join(home, "review-remote.json"), JSON.stringify(config));
  return home;
}

interface Recorder {
  readonly sent: RemoteExchangeV1[];
  readonly resolved: string[];
  readonly confirmed: RemoteDisclosureV1[];
  readonly scanned: string[];
}

function input(root: string, home: string | null, options: {
  env?: NodeJS.ProcessEnv;
  dryRun?: boolean;
  typed?: string | null;
  scan?: PayloadScanV1;
  addresses?: { address: string; family: number }[];
  reply?: { status: number; text: string | null };
} = {}): { input: RemoteReviewInputV1; recorder: Recorder } {
  const recorder: Recorder = { sent: [], resolved: [], confirmed: [], scanned: [] };
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const comparison = readWorkingTreeComparison(root, head);
  const changes = collectReviewChanges(root, head, comparison.changed_files);
  const config = home === null
    ? { state: "absent" as const, path: "(none)" }
    : readRemoteReviewConfigV2(root, { configHome: home });
  return {
    recorder,
    input: {
      repositoryRoot: root,
      target_id: "repo",
      head_sha: head,
      config,
      changed_files: comparison.changed_files,
      changes,
      readText: (path) => {
        try {
          return readFileSync(join(root, path), "utf8");
        } catch {
          return null;
        }
      },
      redact: (text) => text,
      gitleaksPath: "unused",
      dryRun: options.dryRun ?? false,
      env: options.env ?? { EXAMPLE_API_KEY: CREDENTIAL },
      confirm: (disclosure) => {
        recorder.confirmed.push(disclosure);
        return options.typed === undefined ? "api.example-provider.com" : options.typed;
      },
      scan: async (sections) => {
        recorder.scanned.push(...sections.map((section) => section.text));
        return options.scan ?? { kind: "clean" };
      },
      resolve: async (hostname) => {
        recorder.resolved.push(hostname);
        return options.addresses ?? [{ address: "93.184.216.34", family: 4 }];
      },
      transport: async (exchange) => {
        recorder.sent.push(exchange);
        return options.reply ?? { status: 200, text: JSON.stringify({ choices: [{ message: { content: JSON.stringify({ findings: [{ path: "a.ts", start_line: 2, severity: "major", category: "bug", message: "b changed" }] }) } }] }) };
      },
    },
  };
}

function nothingLeft(recorder: Recorder): void {
  expect(recorder.sent).toEqual([]);
}

describe("E10c endpoint and address rules", () => {
  it.each([
    ["http remote", "http://api.example.com/v1"],
    ["localhost", "https://localhost/v1"],
    ["a loopback IP", "https://127.0.0.2/v1"],
    ["an IPv4-mapped IPv6 literal", "https://[::ffff:127.0.0.1]/v1"],
    ["user info", "https://user:pass@api.example.com/v1"],
    ["a trailing dot", "https://api.example.com./v1"],
    ["a query", "https://api.example.com/v1?x=1"],
    ["a fragment", "https://api.example.com/v1#x"],
    ["a single-label host", "https://intranet/v1"],
  ])("refuses %s", (_label, endpoint) => {
    expect(typeof parseRemoteEndpointV1(endpoint)).toBe("string");
  });

  it("keeps the exact host, port, and path, and compares internationalized names in punycode", () => {
    expect(parseRemoteEndpointV1("https://API.Example.com:8443/v1/")).toEqual({ url: "https://api.example.com:8443/v1", hostname: "api.example.com", port: 8443, path: "/v1" });
    expect(parseRemoteEndpointV1("https://bücher.example/v1")).toMatchObject({ hostname: "xn--bcher-kva.example" });
  });

  it.each([
    ["127.0.0.1", false], ["10.1.2.3", false], ["172.20.0.1", false], ["192.168.1.1", false], ["169.254.169.254", false],
    ["100.64.0.1", false], ["0.0.0.0", false], ["224.0.0.1", false], ["198.18.0.1", false], ["192.0.0.8", false],
    ["::1", false], ["::", false], ["fe80::1", false], ["fd00::1", false], ["ff02::1", false], ["::ffff:10.0.0.1", false], ["2001:db8::1", false], ["64:ff9b::1", false],
    ["2002:c0a8:101::1", false], ["2001:0:4136:e378::1", false], ["2001:10::1", false], ["3fff::1", false], ["2001:0db8::1", false],
    ["198.51.100.7", false], ["203.0.113.9", false], ["192.88.99.1", false], ["192.0.2.1", false], ["::127.0.0.1", false], ["0:0:0:0:0:0:0:1", false],
    ["93.184.216.34", true], ["8.8.8.8", true], ["192.0.32.10", true], ["2606:4700::1111", true], ["::ffff:93.184.216.34", true], ["not-an-address", false], ["1::2::3", false],
  ])("classifies %s as public: %s", (address, expected) => {
    expect(isPublicAddressV1(address as string)).toBe(expected);
  });
});

describe("E10c config: two keys the repository can't supply", () => {
  it("derives the config path from the account, ignoring HOME, XDG_CONFIG_HOME, APPDATA, and ASCOUT_CONFIG_HOME", () => {
    const before = remoteReviewConfigPath({ accountHome: () => "/home/operator" });
    vi.stubEnv("HOME", "/repo/attack");
    vi.stubEnv("XDG_CONFIG_HOME", "/repo/attack");
    vi.stubEnv("APPDATA", "/repo/attack");
    vi.stubEnv("ASCOUT_CONFIG_HOME", "/repo/attack");
    expect(remoteReviewConfigPath({ accountHome: () => "/home/operator" })).toBe(before);
    expect(before).not.toContain("attack");
    vi.unstubAllEnvs();
  });

  it.each([
    ["version 1", { version: 1 }],
    ["egress not allowed", { allow_remote_egress: false }],
    ["not operator authorized", { operator_authorized: false }],
    ["an http endpoint", { endpoint: "http://api.example.com/v1" }],
    ["a bad credential variable name", { credential_env: "lower-case" }],
    ["no repositories", { repositories: [] }],
    ["a relative repository path", { repositories: ["repo"] }],
    ["an unknown key", { send_everything: true }],
    ["an oversized payload limit", { limits: { max_payload_bytes: 10_000_000 } }],
    ["an unknown limit", { limits: { retries: 3 } }],
    ["an exclude that climbs out", { exclude: ["../x"] }],
  ])("refuses %s as invalid (exit 2)", async (_label, overrides) => {
    const root = repository();
    const { input: run, recorder } = input(root, configHome(CONFIG(root, overrides)));
    expect((await runRemoteReviewV1(run)).kind).toBe("error");
    nothingLeft(recorder);
  });

  it("refuses a config that lies inside the repository", () => {
    const root = repository();
    writeFileSync(join(root, "review-remote.json"), JSON.stringify(CONFIG(root)));
    expect(readRemoteReviewConfigV2(root, { configHome: root })).toMatchObject({ state: "invalid" });
  });

  it("sends nothing with no config, for an unlisted repository, or without the credential", async () => {
    const root = repository();
    for (const [home, env] of [
      [null, { EXAMPLE_API_KEY: CREDENTIAL }],
      [configHome(CONFIG(root, { repositories: [join(root, "nested")] })), { EXAMPLE_API_KEY: CREDENTIAL }],
      [configHome(CONFIG(root)), {}],
    ] as const) {
      const { input: run, recorder } = input(root, home, { env });
      expect((await runRemoteReviewV1(run)).kind).toBe("not_run");
      nothingLeft(recorder);
      expect(recorder.resolved).toEqual([]);
    }
  });

  it("matches listed repositories by exact real path, not prefix, folding case only where the file system does", () => {
    const root = repository();
    expect(repositoryIsListedV1(root, [root])).toBe(true);
    expect(repositoryIsListedV1(root, [join(root, "..")])).toBe(false);
    expect(repositoryIsListedV1(join(root, "vendor"), [root])).toBe(false);
    expect(repositoryIsListedV1(root, [root.toUpperCase()])).toBe(process.platform === "win32" || process.platform === "darwin");
  });
});

describe("E10c payload safety", () => {
  it("matches exclude entries written with backslashes or a trailing slash", async () => {
    const root = repository();
    const { input: run, recorder } = input(root, configHome(CONFIG(root, { exclude: ["vendor\\", "nothing/"] })));
    await runRemoteReviewV1(run);
    expect(recorder.sent[0]!.body).not.toContain("export const v");
  });

  it("never sends untracked, secret-named, or operator-excluded files", async () => {
    const root = repository();
    const { input: run, recorder } = input(root, configHome(CONFIG(root)));
    await runRemoteReviewV1(run);
    expect(recorder.sent).toHaveLength(1);
    const body = recorder.sent[0]!.body;
    expect(body).toContain("export const b = 20;");
    expect(body).not.toContain("TOKEN=");
    expect(body).not.toContain("export const u");
    expect(body).not.toContain("export const v");
  });

  it("refuses to send when Gitleaks is unavailable or the scan finds a possible secret, naming the file", async () => {
    const root = repository();
    let { input: run, recorder } = input(root, configHome(CONFIG(root)), { scan: { kind: "unavailable", reason: "Gitleaks is not configured" } });
    expect(await runRemoteReviewV1(run)).toMatchObject({ kind: "not_run", reason: "Gitleaks is not configured" });
    nothingLeft(recorder);
    ({ input: run, recorder } = input(root, configHome(CONFIG(root)), { scan: { kind: "hits", files: ["a.ts"] } }));
    const hit = await runRemoteReviewV1(run);
    expect(hit).toMatchObject({ kind: "not_run" });
    expect((hit as { reason: string }).reason).toContain("a.ts");
    nothingLeft(recorder);
  });

  it("scans the exact payload it would send", async () => {
    const root = repository();
    const { input: run, recorder } = input(root, configHome(CONFIG(root)));
    await runRemoteReviewV1(run);
    expect(recorder.scanned.join("\n")).toBe(JSON.parse(recorder.sent[0]!.body).messages[1].content.replace(/^Change to review \(numbered excerpts of the changed files\):\n<diff>\n/u, "").replace(/\n<\/diff>$/u, ""));
  });
});

describe("E10c destination and confirmation", () => {
  it.each([
    ["a private address", [{ address: "10.0.0.5", family: 4 }]],
    ["cloud metadata", [{ address: "169.254.169.254", family: 4 }]],
    ["loopback among public answers", [{ address: "93.184.216.34", family: 4 }, { address: "127.0.0.1", family: 4 }]],
    ["no answer", []],
  ])("sends nothing when the host resolves to %s", async (_label, addresses) => {
    const root = repository();
    const { input: run, recorder } = input(root, configHome(CONFIG(root)), { addresses });
    expect((await runRemoteReviewV1(run)).kind).toBe("not_run");
    nothingLeft(recorder);
    expect(recorder.confirmed).toEqual([]);
  });

  it("connects to the one checked address, with the operator's credential as a bearer token", async () => {
    const root = repository();
    const { input: run, recorder } = input(root, configHome(CONFIG(root)), { addresses: [{ address: "93.184.216.34", family: 4 }] });
    await runRemoteReviewV1(run);
    expect(recorder.sent[0]).toMatchObject({ address: "93.184.216.34", family: 4, endpoint: { hostname: "api.example-provider.com", port: 443, path: "/v1" } });
    expect(recorder.sent[0]!.headers.authorization).toBe(`Bearer ${CREDENTIAL}`);
    expect(JSON.parse(recorder.sent[0]!.body)).toMatchObject({ max_tokens: 8000, stream: false, temperature: 0 });
  });

  it("sends nothing with no terminal, or when the typed host doesn't match", async () => {
    const root = repository();
    for (const typed of [null, "api.example-provider.co", ""]) {
      const { input: run, recorder } = input(root, configHome(CONFIG(root)), { typed });
      expect((await runRemoteReviewV1(run)).kind, String(typed)).toBe("not_run");
      nothingLeft(recorder);
    }
  });

  it("shows the disclosure before asking, including the payload digest", async () => {
    const root = repository();
    const { input: run, recorder } = input(root, configHome(CONFIG(root)));
    await runRemoteReviewV1(run);
    expect(recorder.confirmed[0]).toMatchObject({ host: "api.example-provider.com", model: "example-model", files: 1 });
    expect(recorder.confirmed[0]!.payload_sha256).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("remembers the last confirmed host per repository in the operator's folder, and shows a change", async () => {
    const root = repository();
    const home = configHome(CONFIG(root));
    const first = input(root, home);
    await runRemoteReviewV1(first.input);
    expect(first.recorder.confirmed[0]!.last_confirmed_host).toBeNull();
    writeFileSync(join(home, "review-remote.json"), JSON.stringify(CONFIG(root, { endpoint: "https://other.example-provider.com/v1" })));
    const second = input(root, home, { typed: "other.example-provider.com" });
    await runRemoteReviewV1(second.input);
    expect(second.recorder.confirmed[0]).toMatchObject({ host: "other.example-provider.com", last_confirmed_host: "api.example-provider.com" });
    expect(readFileSync(join(home, "review-remote-history.json"), "utf8")).toContain("other.example-provider.com");
  });

  it("dry run shows the disclosure and the payload, and resolves, confirms, scans, and sends nothing", async () => {
    const root = repository();
    const { input: run, recorder } = input(root, configHome(CONFIG(root)), { dryRun: true });
    const result = await runRemoteReviewV1(run);
    expect(result.kind).toBe("dry_run");
    expect((result as { payload: string }).payload).toContain("export const b = 20;");
    nothingLeft(recorder);
    expect(recorder.resolved).toEqual([]);
    expect(recorder.confirmed).toEqual([]);
  });
});

describe("E10c replies and truth rules", () => {
  it("reports findings on changed lines as advisory, exit 1, never human review, with the egress recorded", async () => {
    const root = repository();
    const { input: run } = input(root, configHome(CONFIG(root)));
    const result = await runRemoteReviewV1(run);
    expect(result.kind).toBe("review");
    const report = (result as { report: Record<string, any> }).report;
    expect(report).toMatchObject({ advisory: true, satisfies_human_r1: false, outcome: "FINDINGS", exit_code: 1 });
    expect(report.remote).toMatchObject({ egress: "REMOTE", host: "api.example-provider.com", cost: "OPERATOR_ACCOUNT" });
    expect(report.provider.independence).toBe("INDEPENDENT_MODEL");
    expect(JSON.stringify(report)).not.toContain(CREDENTIAL);
  });

  it.each([
    ["no findings", { status: 200, text: JSON.stringify({ choices: [{ message: { content: "{\"findings\":[]}" } }] }) }],
    ["prose saying the code is safe", { status: 200, text: JSON.stringify({ choices: [{ message: { content: "The code is safe." } }] }) }],
    ["a malformed reply", { status: 200, text: "<html>" }],
    ["a redirect", { status: 302, text: "" }],
    ["a server error", { status: 500, text: "error" }],
    ["no response", { status: 0, text: null }],
  ])("never passes: %s exits 4", async (_label, reply) => {
    const root = repository();
    const { input: run } = input(root, configHome(CONFIG(root)), { reply });
    const result = await runRemoteReviewV1(run);
    expect(result.kind === "not_run" || (result.kind === "review" && result.report.exit_code === 4)).toBe(true);
  });

  it("removes the credential when the model echoes it in a finding", async () => {
    const root = repository();
    const echoed = { status: 200, text: JSON.stringify({ choices: [{ message: { content: JSON.stringify({ findings: [{ path: "a.ts", start_line: 2, severity: "major", category: "bug", message: `uses ${CREDENTIAL}` }] }) } }] }) };
    const { input: run } = input(root, configHome(CONFIG(root)), { reply: echoed });
    const result = await runRemoteReviewV1(run);
    expect(JSON.stringify(result)).not.toContain(CREDENTIAL);
  });

  it("rejects a finding off the changed lines", async () => {
    const root = repository();
    const off = { status: 200, text: JSON.stringify({ choices: [{ message: { content: JSON.stringify({ findings: [{ path: "a.ts", start_line: 3, severity: "major", category: "bug", message: "untouched" }] }) } }] }) };
    const { input: run } = input(root, configHome(CONFIG(root)), { reply: off });
    const result = await runRemoteReviewV1(run);
    expect(result.kind === "review" && result.report.exit_code).toBe(4);
  });
});

describe("E10c arguments", () => {
  it("parses --remote-model with an optional --dry-run, exclusive with the other review modes", () => {
    expect(parseCliArgs(["review", "--remote-model"])).toMatchObject({ remoteModel: true });
    expect(parseCliArgs(["review", "--remote-model", "--dry-run", "--format", "json"])).toMatchObject({ remoteModel: true, dryRun: true });
    for (const args of [
      ["review", "--dry-run"],
      ["review", "--remote-model", "--local-model"],
      ["review", "--remote-model", "--ingest", "f"],
      ["review", "--remote-model", "--remote-model"],
      ["review", "--remote-model", "--dry-run", "--dry-run"],
      ["check", "--remote-model"],
    ]) {
      expect(() => parseCliArgs(args), args.join(" ")).toThrow(CliUsageError);
    }
    expect(usageText()).toContain("--remote-model [--dry-run]");
  });
});
