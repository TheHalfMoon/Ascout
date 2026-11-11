import { execFileSync, spawn } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir, userInfo } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { GitChangedFile } from "../src/git.js";
import { redactExactValues, selectedSecretValues } from "../src/redact.js";
import { callLocalReviewModelV1, localReviewConfigPath, readLocalReviewConfigV1, type LocalReviewConfigResultV1 } from "../src/assurance/review/local-review-provider.js";
import { buildLocalReviewPayloadV1, isNeverSentPathV1, runLocalReviewV1 } from "../src/assurance/review/local-review-run.js";
import { egressForEndpointV1, ollamaProviderV1, type ReviewProviderV2 } from "../src/assurance/review/review-provider.js";

// E10a (specs/017-unified-assurance/E10_BYOAI_PROVIDER_DESIGN.md): one provider interface, and the
// E6 gaps closed: the config path can't be moved by the environment, proxies are ignored, untracked
// and secret-shaped files never reach a model, and a model can't echo a secret into the report.
const scratch = realpathSync(mkdtempSync(join(tmpdir(), "ascout-e10a-")));
afterAll(() => rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));
afterEach(() => vi.unstubAllEnvs());

const CONFIG = { provider: "ollama" as const, endpoint: "http://127.0.0.1:11434", model: "qwen2.5-coder:7b", model_family: "qwen", authorized_by_founder: true };
const LOADED: LocalReviewConfigResultV1 = { state: "loaded", path: "/cfg/review-provider.json", config: CONFIG };
const HEAD = "a".repeat(40);

const file = (path: string, change_kind: GitChangedFile["change_kind"] = "modified"): GitChangedFile =>
  ({ path, change_kind, line_semantics: "text", changed_new_line_ranges: [[1, 1]] }) as unknown as GitChangedFile;

function runInput(changed: GitChangedFile[], overrides: Partial<Parameters<typeof runLocalReviewV1>[0]> = {}): Parameters<typeof runLocalReviewV1>[0] {
  return {
    target_id: "repo:test",
    head_sha: HEAD,
    config: LOADED,
    changed_files: changed,
    changes: changed.map((change) => ({ path: change.path, change_kind: change.change_kind })) as never,
    readText: () => "const a = 1;\n",
    redact: (text) => text,
    ...overrides,
  };
}

describe("the config location comes from the account, never the environment", () => {
  it("ignores ASCOUT_CONFIG_HOME, XDG_CONFIG_HOME, APPDATA, and HOME", () => {
    const expected = localReviewConfigPath();
    vi.stubEnv("ASCOUT_CONFIG_HOME", join(scratch, "planted"));
    vi.stubEnv("XDG_CONFIG_HOME", join(scratch, "planted"));
    vi.stubEnv("APPDATA", join(scratch, "planted"));
    vi.stubEnv("HOME", join(scratch, "planted"));
    expect(localReviewConfigPath()).toBe(expected);
    expect(expected).not.toContain("planted");
    expect(expected!.startsWith(userInfo().homedir)).toBe(true);
    expect(expected).toBe(process.platform === "win32"
      ? join(userInfo().homedir, "AppData", "Roaming", "ascout", "review-provider.json")
      : join(userInfo().homedir, ".config", "ascout", "review-provider.json"));
  });

  it("treats an account with no home directory as not configured, so nothing runs", () => {
    const thrown = { accountHome: () => { throw new Error("no passwd entry"); } };
    expect(localReviewConfigPath(thrown)).toBeNull();
    expect(localReviewConfigPath({ accountHome: () => "" })).toBeNull();
    expect(readLocalReviewConfigV1(scratch, thrown)).toMatchObject({ state: "absent" });
  });

  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)("refuses a config owned by another account", () => {
    const home = join(scratch, "foreign-owner");
    mkdirSync(home);
    chmodSync(home, 0o700);
    // /etc/passwd belongs to root; the link makes it this account's config path.
    symlinkSync("/etc/passwd", join(home, "review-provider.json"));
    const repo = join(scratch, "repo-owner");
    mkdirSync(repo);
    expect(readLocalReviewConfigV1(repo, { configHome: home })).toMatchObject({ state: "invalid", reason: expect.stringContaining("not owned by this account") });
  });

  it.skipIf(process.platform === "win32")("refuses a config, or a config folder, another user can write", () => {
    const home = join(scratch, "group-writable");
    mkdirSync(home);
    chmodSync(home, 0o700);
    const path = join(home, "review-provider.json");
    writeFileSync(path, JSON.stringify({ version: 1, ...CONFIG }));
    const repo = join(scratch, "repo-x");
    mkdirSync(repo);
    chmodSync(path, 0o664);
    expect(readLocalReviewConfigV1(repo, { configHome: home })).toMatchObject({ state: "invalid", reason: expect.stringContaining("writable by other users") });
    chmodSync(path, 0o600);
    expect(readLocalReviewConfigV1(repo, { configHome: home }).state).toBe("loaded");
    chmodSync(home, 0o777);
    expect(readLocalReviewConfigV1(repo, { configHome: home })).toMatchObject({ state: "invalid", reason: expect.stringContaining("writable by other users") });
    chmodSync(home, 0o700);
  });
});

describe("what a model may be sent", () => {
  it.each([".env", ".env.local", "config/.ENV.production", ".envrc", "deploy/server.pem", "id_rsa", "id_rsa.pub", "keys/id_ed25519", "tls.KEY", "cert.p12", "cert.pfx", ".npmrc", ".pypirc", ".netrc", "credentials.json", "aws/credentials",
    "secret.json", "config/secrets.yaml", "prod.env", ".git-credentials", "id_dsa", "server.jks", "app.keystore", "putty/key.ppk",
    "config/credentials/service.json", "home/.ssh/config", ".aws/config", "deploy/secrets/db.txt"])(
    "never sends %s",
    (path) => expect(isNeverSentPathV1(path)).toBe(true),
  );

  it.each(["src/environment.ts", "src/envelope.ts", "keyboard.ts", "src/monkey.ts", "docs/credential-guide.md", "pem.ts", "src/key.ts"])(
    "still sends %s",
    (path) => expect(isNeverSentPathV1(path)).toBe(false),
  );

  it("leaves out untracked and secret-shaped files, and keeps ordinary tracked changes", () => {
    const payload = buildLocalReviewPayloadV1([file("src/a.ts"), file("src/new.ts", "untracked"), file(".env"), file("src/b.ts", "added")], () => "x\n", (text) => text);
    expect(payload.reviewed_files).toEqual(["src/a.ts", "src/b.ts"]);
    expect(payload.text).not.toContain("new.ts");
    expect(payload.text).not.toContain(".env");
  });
});

describe("the provider interface and its egress gate", () => {
  it("derives egress from the endpoint, never from config", () => {
    expect(egressForEndpointV1("http://127.0.0.1:11434")).toBe("NONE");
    expect(egressForEndpointV1("http://[::1]:11434")).toBe("NONE");
    for (const endpoint of ["http://localhost:11434", "https://127.0.0.1:11434", "http://127.0.0.2:1", "http://[::ffff:127.0.0.1]:1", "https://api.example.com", "not a url", "http://127.0.0.1:0"]) {
      expect(egressForEndpointV1(endpoint)).toBe("REMOTE");
    }
    expect(ollamaProviderV1(CONFIG).disclosure()).toEqual({ provider: "ollama", endpoint_host: "127.0.0.1:11434", model: "qwen2.5-coder:7b", egress: "NONE" });
  });

  it("refuses any provider that would leave loopback, and never calls it", async () => {
    const review = vi.fn();
    const remote: ReviewProviderV2 = { id: "fake-remote", egress: "REMOTE", cost: "OPERATOR_ACCOUNT", disclosure: () => ({ provider: "fake-remote", endpoint_host: "api.example.com", model: "m", egress: "REMOTE" }), review };
    const result = await runLocalReviewV1(runInput([file("src/a.ts")], { provider: remote }));
    expect(result.kind).toBe("not_run");
    expect(JSON.stringify(result)).toContain("sending source off this machine is not allowed");
    expect(review).not.toHaveBeenCalled();
  });

  it("removes a secret the model echoes back before anything is reported", async () => {
    const secret = "ghp_" + "Z".repeat(36);
    const result = await runLocalReviewV1(runInput([file("src/a.ts")], {
      redact: (text) => text.split(secret).join("[REDACTED]"),
      call: async () => ({ ok: true, version: "0.1", content: JSON.stringify({ findings: [{ path: "src/a.ts", start_line: 1, end_line: 1, severity: "major", category: "bug", message: `leaks ${secret}` }] }) }),
    }));
    expect(result.kind).toBe("review");
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(JSON.stringify(result)).toContain("[REDACTED]");
  });

  it("reports a model server reply that is not JSON as such, and never as a review", async () => {
    const server = createServer((request, response) => {
      request.resume();
      request.on("end", () => response.end(request.url === "/api/version" ? '{"version":"0.1"}' : "<html>not json</html>"));
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    try {
      const reply = await callLocalReviewModelV1({ endpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, model: "m", diff: "x", timeoutMs: 20_000, maxResponseBytes: 65_536 });
      expect(reply).toEqual({ ok: false, reason: "the model server's reply was not JSON" });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((done) => server.close(() => done()));
    }
  });

  it("removes a secret the model writes with JSON escapes, using the real redactor", async () => {
    const secret = "ghp_" + "Z".repeat(36);
    const secrets = selectedSecretValues({ GITHUB_TOKEN: secret }, { recognized_names: [], configured_names: [], minimum_value_bytes: 8 });
    // The reply spells one character as a JSON unicode escape, so the raw text never contains the secret.
    const escapedZ = String.fromCharCode(92) + "u005A";
    const raw = JSON.stringify({ findings: [{ path: "src/a.ts", start_line: 1, end_line: 1, severity: "major", category: "bug", message: `leaks ${secret}` }] });
    const content = raw.replace(secret, secret.slice(0, 5) + escapedZ + secret.slice(6));
    expect(content).not.toContain(secret);
    const result = await runLocalReviewV1(runInput([file("src/a.ts")], {
      redact: (text) => redactExactValues(text, secrets),
      call: async () => ({ ok: true, version: "0.1", content }),
    }));
    expect(result.kind).toBe("review");
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});

describe("proxy settings cannot route a loopback review elsewhere", () => {
  let model: Server;
  let proxy: Server;
  let modelRequests: string[];
  let proxyHits: number;
  const outDir = join(resolve(__dirname, ".."), "node_modules", ".cache", "ascout-e10a");

  beforeAll(async () => {
    execFileSync(process.execPath, [join(resolve(__dirname, ".."), "node_modules", "typescript", "bin", "tsc"), "-p", join(resolve(__dirname, ".."), "tsconfig.json"), "--outDir", outDir], { stdio: "pipe" });
    modelRequests = [];
    proxyHits = 0;
    model = createServer((request, response) => {
      modelRequests.push(`${request.method} ${request.url}`);
      request.resume();
      request.on("end", () => response.end(request.url === "/api/version" ? '{"version":"0.1"}' : JSON.stringify({ message: { content: '{"findings":[]}' } })));
    });
    proxy = createServer((request, response) => {
      proxyHits += 1;
      response.statusCode = 502;
      response.end();
    });
    // Refuse a tunnel outright; a dropped socket makes fetch retry without end.
    proxy.on("connect", (_request, socket) => {
      proxyHits += 1;
      const crlf = String.fromCharCode(13, 10);
      socket.end(["HTTP/1.1 403 Forbidden", "content-length: 0", "", ""].join(crlf));
    });
    await new Promise<void>((done) => model.listen(0, "127.0.0.1", done));
    await new Promise<void>((done) => proxy.listen(0, "127.0.0.1", done));
  }, 300_000);

  afterAll(async () => {
    for (const server of [model, proxy]) {
      server.closeAllConnections();
      await new Promise<void>((done) => server.close(() => done()));
    }
  });

  // Node 24 can route fetch through HTTP_PROXY, even for 127.0.0.1. Older Node may not, so the
  // control that proves the proxy was live is asserted only where the switch exists.
  const proxySwitchExists = Number(process.versions.node.split(".")[0]) >= 24;

  it.each([
    ["NODE_USE_ENV_PROXY=1", { NODE_USE_ENV_PROXY: "1" }],
    ["NODE_OPTIONS=--use-env-proxy", { NODE_OPTIONS: "--use-env-proxy" }],
  ])("talks to the model directly with HTTP_PROXY and %s set, while plain fetch would use the proxy", async (_label, proxySwitch) => {
    if (!proxySwitchExists && "NODE_OPTIONS" in proxySwitch) return;
    modelRequests.length = 0;
    proxyHits = 0;
    const modelUrl = `http://127.0.0.1:${(model.address() as AddressInfo).port}`;
    const proxyUrl = `http://127.0.0.1:${(proxy.address() as AddressInfo).port}`;
    const script = join(scratch, "proxy-probe.mjs");
    writeFileSync(script, [
      `import { callLocalReviewModelV1 } from ${JSON.stringify(pathToFileURL(join(outDir, "assurance", "review", "local-review-provider.js")).href)};`,
      `const reply = await callLocalReviewModelV1({ endpoint: ${JSON.stringify(modelUrl)}, model: "m", diff: "x", timeoutMs: 20000, maxResponseBytes: 65536 });`,
      `let control = "not-run";`,
      `try { const r = await fetch(${JSON.stringify(`${modelUrl}/control`)}, { signal: AbortSignal.timeout(20000) }); control = String(r.status); } catch (e) { control = "error"; }`,
      `console.log(JSON.stringify({ reply, control }));`,
    ].join("\n"));
    const env = { ...process.env, HTTP_PROXY: proxyUrl, http_proxy: proxyUrl, HTTPS_PROXY: proxyUrl, NO_PROXY: "", no_proxy: "", ...proxySwitch };
    const stdout = await new Promise<string>((done, fail) => {
      const child = spawn(process.execPath, [script], { env });
      let out = "";
      let err = "";
      child.stdout.on("data", (chunk: Buffer) => { out += chunk.toString("utf8"); });
      child.stderr.on("data", (chunk: Buffer) => { err += chunk.toString("utf8"); });
      child.on("close", (code) => (code === 0 ? done(out) : fail(new Error(`probe exited ${code}: ${err}`))));
    });
    const { reply, control } = JSON.parse(stdout.trim().split("\n").pop()!) as { reply: { ok: boolean }; control: string };
    expect(reply).toMatchObject({ ok: true });
    expect(modelRequests).toEqual(expect.arrayContaining(["GET /api/version", "POST /api/chat"]));
    // The positive control: under the same environment, plain fetch went to the proxy, not the model.
    if (proxySwitchExists) {
      expect(modelRequests).not.toContain("GET /control");
      expect(control).not.toBe("200");
      expect(proxyHits).toBeGreaterThan(0);
    }
  }, 120_000);
});
