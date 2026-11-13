import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 180_000 });

// The real edges of remote review: the HTTPS transport, the Gitleaks payload scan, the terminal
// confirmation, and the CLI. The transport is checked by recording the options it hands to Node's
// https module, so no connection is ever made.
const requests: { options: Record<string, any>; body: string }[] = [];
vi.mock("node:https", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:https")>();
  return {
    ...actual,
    request: (options: Record<string, any>, onResponse: (response: any) => void) => {
      const { EventEmitter } = require("node:events") as typeof import("node:events");
      const req = new EventEmitter() as any;
      req.destroy = () => undefined;
      req.end = (body: string) => {
        requests.push({ options, body });
        const response = new EventEmitter() as any;
        response.statusCode = 200;
        onResponse(response);
        response.emit("data", Buffer.from('{"choices":[]}'));
        response.emit("end");
      };
      return req;
    },
  };
});

const { httpsTransportV1, scanRemotePayloadV1, confirmAtTerminalV1 } = await import("../src/assurance/review/remote-review.js");
const { runRemoteReview } = await import("../src/cli.js");

const roots: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function temp(prefix: string): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  roots.push(dir);
  return dir;
}

describe("the HTTPS transport", () => {
  it("uses its own agent (so no proxy applies), pins the checked address, keeps the TLS name, and never follows redirects", async () => {
    vi.stubEnv("HTTPS_PROXY", "http://127.0.0.1:9");
    vi.stubEnv("HTTP_PROXY", "http://127.0.0.1:9");
    vi.stubEnv("NODE_USE_ENV_PROXY", "1");
    requests.length = 0;
    const reply = await httpsTransportV1({
      address: "93.184.216.34",
      family: 4,
      endpoint: { url: "https://api.example.com/v1", hostname: "api.example.com", port: 443, path: "/v1" },
      headers: { authorization: "Bearer x" },
      body: "{}",
      timeoutMs: 1000,
      maxBytes: 1024,
      signal: new AbortController().signal,
    });
    expect(reply).toEqual({ status: 200, text: '{"choices":[]}' });
    const { options } = requests[0]!;
    expect(options).toMatchObject({ host: "api.example.com", servername: "api.example.com", port: 443, path: "/v1/chat/completions", method: "POST" });
    expect(options.agent).toBeDefined();
    expect(options.agent.options?.proxyEnv).toBeUndefined();
    const looked: unknown[] = [];
    options.lookup("api.example.com", {}, (...args: unknown[]) => looked.push(args));
    expect(looked).toEqual([[null, "93.184.216.34", 4]]);
    expect(options.maxRedirects).toBeUndefined();
  });
});

describe("the terminal confirmation", () => {
  it("refuses without a controlling terminal, as under CI or a test runner", () => {
    if (process.stdin.isTTY === true) return;
    expect(confirmAtTerminalV1({ host: "api.example.com", endpoint: "https://api.example.com/v1", model: "m", files: 1, bytes: 1, payload_sha256: "a".repeat(64), last_confirmed_host: null })).toBeNull();
  });
});

const GITLEAKS = process.env.ASCOUT_GITLEAKS_EXECUTABLE;

describe("the payload secret scan", () => {
  it("refuses to scan, and so to send, when Gitleaks isn't configured", async () => {
    expect(await scanRemotePayloadV1([{ path: "a.ts", text: "x" }], null)).toMatchObject({ kind: "unavailable" });
  });

  it("reports an unrunnable Gitleaks as unavailable, never as clean", async () => {
    const fake = join(temp("ascout-e10c-fake-"), "gitleaks");
    writeFileSync(fake, "not an executable");
    expect((await scanRemotePayloadV1([{ path: "a.ts", text: "x" }], fake)).kind).toBe("unavailable");
  });

  it.runIf(GITLEAKS !== undefined && GITLEAKS !== "")("finds a secret in the exact payload, names its file, and can't be silenced with gitleaks:allow", async () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const token = ["gh", "p_"].join("") + [...randomBytes(36)].map((byte) => alphabet[byte % alphabet.length]).join("");
    const result = await scanRemotePayloadV1([
      { path: "src/clean.ts", text: "export const a = 1;\n" },
      { path: "src/settings.ts", text: `const token = "${token}"; // gitleaks:allow\n` },
    ], GITLEAKS!);
    expect(result).toEqual({ kind: "hits", files: ["src/settings.ts"] });
    expect(await scanRemotePayloadV1([{ path: "src/clean.ts", text: "export const a = 1;\n" }], GITLEAKS!)).toEqual({ kind: "clean" });
  });
});

describe("ascout review --remote-model through the CLI", () => {
  function repository(): string {
    const root = temp("ascout-e10c-cli-");
    const git = (args: string[]) => execFileSync("git", args, { cwd: root, windowsHide: true });
    git(["init", "-q"]);
    git(["config", "user.name", "Ascout Test"]);
    git(["config", "user.email", "ascout@example.invalid"]);
    git(["config", "commit.gpgSign", "false"]);
    writeFileSync(join(root, "a.ts"), "export const a = 1;\n");
    git(["add", "--all"]);
    git(["commit", "-q", "-m", "base"]);
    writeFileSync(join(root, "a.ts"), "export const a = 2;\n");
    return root;
  }

  function capture() {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    return {
      stdout: () => stdout.mock.calls.map((call) => String(call[0])).join(""),
      stderr: () => [...consoleError.mock.calls.flat().map(String), ...stderr.mock.calls.map((call) => String(call[0]))].join("\n"),
    };
  }

  it("is off by default: with no config it sends nothing and exits 4", async () => {
    const root = repository();
    requests.length = 0;
    const io = capture();
    expect(await runRemoteReview(root, false, "json", temp("ascout-e10c-empty-"))).toBe(4);
    expect(requests).toEqual([]);
    expect(io.stdout()).toContain("no remote review provider is configured");
  });

  it("dry run prints the disclosure and the exact payload, exits 4, and sends nothing", async () => {
    const root = repository();
    const home = temp("ascout-e10c-home-");
    writeFileSync(join(home, "review-remote.json"), JSON.stringify({
      version: 2, provider: "openai-compatible", endpoint: "https://api.example.com/v1", model: "m", model_family: "f",
      credential_env: "E10C_TEST_KEY", allow_remote_egress: true, operator_authorized: true, repositories: [root],
    }));
    vi.stubEnv("E10C_TEST_KEY", "sk-dry-run-credential");
    requests.length = 0;
    let io = capture();
    expect(await runRemoteReview(root, true, "json", home)).toBe(4);
    const dry = JSON.parse(io.stdout()) as { kind: string; assurance: string; payload: string; disclosure: { host: string } };
    expect(dry).toMatchObject({ kind: "remote_review_dry_run", assurance: "NONE", disclosure: { host: "api.example.com" } });
    expect(dry.payload).toContain("export const a = 2;");
    expect(io.stdout()).not.toContain("sk-dry-run-credential");
    vi.restoreAllMocks();
    io = capture();
    expect(await runRemoteReview(root, true, "terminal", home)).toBe(4);
    expect(io.stderr()).toContain("DRY RUN");
    expect(requests).toEqual([]);
  });

  it("without a terminal, a configured run is refused before anything is sent", async () => {
    if (process.stdin.isTTY === true) return;
    const root = repository();
    const home = temp("ascout-e10c-home-");
    writeFileSync(join(home, "review-remote.json"), JSON.stringify({
      version: 2, provider: "openai-compatible", endpoint: "https://api.example.com/v1", model: "m", model_family: "f",
      credential_env: "E10C_TEST_KEY", allow_remote_egress: true, operator_authorized: true, repositories: [root],
    }));
    vi.stubEnv("E10C_TEST_KEY", "sk-no-terminal-credential");
    vi.stubEnv("ASCOUT_GITLEAKS_PATH", "");
    requests.length = 0;
    const io = capture();
    expect(await runRemoteReview(root, false, "json", home)).toBe(4);
    expect(requests).toEqual([]);
    expect(io.stdout()).not.toContain("sk-no-terminal-credential");
    expect(readFileSync(join(root, "a.ts"), "utf8")).toBe("export const a = 2;\n");
  });
});
