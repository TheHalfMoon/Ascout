import { execFileSync, spawnSync } from "node:child_process";
import { generateKeyPairSync, verify } from "node:crypto";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { APP_TOKEN_PERMISSIONS, mintInstallationTokenV1, readGatePinV1, signAppJwtV1 } from "../src/github/app-auth.js";
import { buildPrEvidenceV1, checkRunFromEvidenceV1, stateForExitCode, summaryCommentV1, type PrCheckV1 } from "../src/github/pr-evidence.js";
import { runPrPublishFromEnvV1, runPrPublishMainV1 } from "../src/github/publish-run.js";
import { preparePublishV1 } from "../src/github/publish.js";
import { revokeInstallationTokenV1 } from "../src/github/app-auth.js";
import { runCli } from "../src/cli.js";

// C1a (specs/017-unified-assurance/C1_GITHUB_APP_GATE_DESIGN.md): publish the Ascout check as a
// customer-registered GitHub App, from an entry point that imports only Node built-ins.
const HEAD = "a".repeat(40);
const APP_ID = 424242;
const CLIENT_ID = "Iv23liTestClient";
const INSTALL_TOKEN = "ghs_" + "I".repeat(36);
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const scratch = realpathSync(mkdtempSync(join(tmpdir(), "ascout-c1a-")));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const check = (id: PrCheckV1["id"], exit: PrCheckV1["exit_code"]): PrCheckV1 => ({ id, exit_code: exit, state: stateForExitCode(exit), outcome: "X", reason: "r" });
const bundle = (exit: PrCheckV1["exit_code"]) => buildPrEvidenceV1({ ascout_version: "0.2.0", head_sha: HEAD, checks: [check("review", exit), check("security", exit), check("test", exit)], findings: [] });

function decodeJwt(jwt: string): { header: Record<string, unknown>; payload: Record<string, unknown>; valid: boolean } {
  const [header, payload, signature] = jwt.split(".") as [string, string, string];
  return {
    header: JSON.parse(Buffer.from(header, "base64url").toString("utf8")) as Record<string, unknown>,
    payload: JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>,
    valid: verify("sha256", Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, "base64url")),
  };
}

describe("the App JWT", () => {
  it("is RS256, issued by the client ID 60 seconds in the past, valid for 9 minutes, and verifies", () => {
    const jwt = signAppJwtV1({ clientId: CLIENT_ID, privateKeyPem: PEM }, 1_000_000);
    const decoded = decodeJwt(jwt);
    expect(decoded.header).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decoded.payload).toEqual({ iat: 1_000_000 - 60, exp: 1_000_000 + 540, iss: CLIENT_ID });
    expect((decoded.payload.exp as number) - (decoded.payload.iat as number)).toBeLessThanOrEqual(600);
    expect(decoded.valid).toBe(true);
  });
});

interface FakeState {
  appId: number;
  installStatus: number;
  installRaw: string | null;
  prHead: string;
  prState: string;
  slug: unknown;
  tokenStatus: number;
  tokenBody: unknown;
  rulesStatus: number;
  rules: unknown;
  rulesLink: string;
  checkRunStatus: number;
  comments: { id: number; user: { login: string }; body: string }[];
  requests: { method: string; path: string; auth: string; body: unknown }[];
}

let server: Server;
let origin: string;
let state: FakeState;
const reset = (overrides: Partial<FakeState> = {}) => {
  state = {
    appId: APP_ID,
    installStatus: 200,
    slug: "acme-ascout",
    tokenStatus: 201,
    tokenBody: { token: INSTALL_TOKEN, expires_at: "2026-11-12T12:00:00Z" },
    rulesStatus: 200,
    rules: [{ type: "required_status_checks", parameters: { required_status_checks: [{ context: "Ascout verification", integration_id: APP_ID }] } }],
    rulesLink: "",
    checkRunStatus: 201,
    installRaw: null,
    prHead: HEAD,
    prState: "open",
    comments: [],
    requests: [],
    ...overrides,
  };
};

beforeAll(async () => {
  reset();
  server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk: Buffer) => { raw += chunk.toString("utf8"); });
    request.on("end", () => {
      const path = new URL(request.url!, "http://x").pathname;
      state.requests.push({ method: request.method!, path, auth: String(request.headers.authorization ?? ""), body: raw === "" ? null : JSON.parse(raw) });
      const send = (status: number, value: unknown) => { response.statusCode = status; response.end(JSON.stringify(value)); };
      if (path === "/repos/o/r/installation") {
        if (state.installRaw !== null) { response.statusCode = 200; return response.end(state.installRaw); }
        return send(state.installStatus, { id: 77, app_id: state.appId, app_slug: state.slug });
      }
      if (path === "/app/installations/77/access_tokens") return send(state.tokenStatus, state.tokenBody);
      if (path === "/repos/o/r/rules/branches/main" || path === "/repos/o/r/rules/branches/release/x") {
        if (state.rulesLink !== "") response.setHeader("link", state.rulesLink);
        return send(state.rulesStatus, state.rules);
      }
      if (request.method === "DELETE" && path === "/installation/token") { response.statusCode = 204; return response.end(); }
      if (path === "/repos/o/r/check-runs" && state.checkRunStatus !== 201) return send(state.checkRunStatus, {});
      const pr = { number: 7, state: state.prState, user: { login: "maintainer" }, base: { ref: "main" }, head: { sha: state.prHead, repo: { full_name: "o/r" } } };
      if (path === "/repos/o/r/pulls/7") return send(200, pr);
      if (path === "/repos/o/r/pulls") return send(200, state.prState === "open" ? [pr] : []);
      if (path === "/repos/o/r/check-runs") return send(201, { id: 99 });
      if (request.method === "GET" && path === "/repos/o/r/issues/7/comments") return send(200, state.comments);
      if (request.method === "POST" && path === "/repos/o/r/issues/7/comments") {
        state.comments.push({ id: 500, user: { login: "acme-ascout[bot]" }, body: (JSON.parse(raw) as { body: string }).body });
        return send(201, {});
      }
      if (request.method === "PATCH") return send(200, {});
      return send(404, {});
    });
  });
  // A test below compiles the project synchronously, blocking the event loop for many seconds. With
  // Node's 5-second default, the server would close idle keep-alive sockets meanwhile, and the next
  // fetch could reuse a dead pooled socket and fail. Keep idle sockets longer than any compile.
  server.keepAliveTimeout = 10 * 60 * 1000;
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((done) => server.close(() => done()));
});

const credentials = { appId: APP_ID, clientId: CLIENT_ID, privateKeyPem: PEM };
const mint = (masked: string[] = []) => mintInstallationTokenV1({ apiOrigin: origin, repository: "o/r", credentials, mask: (value) => masked.push(value) });

describe("minting an installation token", () => {
  it("asks for one repository and only the publishing permissions, and masks the JWT and the token", async () => {
    reset();
    const masked: string[] = [];
    const result = await mint(masked);
    expect(result).toEqual({ ok: true, token: INSTALL_TOKEN, botLogin: "acme-ascout[bot]", expiresAt: "2026-11-12T12:00:00Z" });
    expect(state.requests.map((r) => `${r.method} ${r.path}`)).toEqual(["GET /repos/o/r/installation", "POST /app/installations/77/access_tokens"]);
    expect(state.requests[1]!.body).toEqual({ repositories: ["r"], permissions: { checks: "write", pull_requests: "write", metadata: "read" } });
    expect(APP_TOKEN_PERMISSIONS).toEqual({ checks: "write", pull_requests: "write", metadata: "read" });
    const jwt = state.requests[0]!.auth.replace(/^Bearer /u, "");
    expect(decodeJwt(jwt).valid).toBe(true);
    expect(masked).toEqual([jwt, INSTALL_TOKEN]);
  });

  it("refuses an installation that belongs to a different App, without asking for a token", async () => {
    reset({ appId: 1 });
    expect(await mint()).toEqual({ ok: false, reason: "the installation on this repository belongs to a different App" });
    expect(state.requests.some((r) => r.method === "POST")).toBe(false);
  });

  it.each([
    ["no installation", { installStatus: 404 }, "finding the App installation failed: HTTP 404"],
    ["a malformed slug", { slug: "Bad Slug!" }, "the App installation response was malformed"],
    ["a refused token request", { tokenStatus: 403 }, "creating the installation token failed: HTTP 403"],
    ["a token response without a token", { tokenBody: { expires_at: "x" } }, "the installation token response was malformed"],
  ] as const)("refuses %s, naming the step and never a value", async (_label, overrides, reason) => {
    reset(overrides as Partial<FakeState>);
    const result = await mint();
    expect(result).toEqual({ ok: false, reason });
    expect(JSON.stringify(result)).not.toContain(PEM.slice(40, 80));
  });

  it("refuses a token that isn't token-shaped, such as one that would inject a workflow command", async () => {
    reset({ tokenBody: { token: "ghs_x" + String.fromCharCode(10) + "::warning::injected", expires_at: "x" } });
    expect(await mint()).toEqual({ ok: false, reason: "the installation token response was malformed" });
  });

  it("accepts GitHub's longer token format", async () => {
    const longToken = `ghs_${APP_ID}_${"a".repeat(30)}.${"b".repeat(60)}.${"c-_".repeat(20)}`;
    reset({ tokenBody: { token: longToken, expires_at: "x" } });
    expect(await mint()).toMatchObject({ ok: true, token: longToken });
  });

  it("calls an empty installation response malformed, not a different App", async () => {
    reset({ slug: null, appId: APP_ID });
    expect(await mint()).toEqual({ ok: false, reason: "the App installation response was malformed" });
  });

  it("refuses an unusable private key before any request", async () => {
    reset();
    const result = await mintInstallationTokenV1({ apiOrigin: origin, repository: "o/r", credentials: { ...credentials, privateKeyPem: "not a key" }, mask: () => undefined });
    expect(result).toEqual({ ok: false, reason: "the App private key could not be used to sign" });
    expect(state.requests).toEqual([]);
  });

  it("reports an unreachable API without exposing anything", async () => {
    const gone = createServer();
    await new Promise<void>((done) => gone.listen(0, "127.0.0.1", done));
    const port = (gone.address() as AddressInfo).port;
    await new Promise<void>((done) => gone.close(() => done()));
    const result = await mintInstallationTokenV1({ apiOrigin: `http://127.0.0.1:${port}`, repository: "o/r", credentials, mask: () => undefined });
    expect(result).toEqual({ ok: false, reason: "the GitHub API could not be reached while minting the App token" });
  });
});

describe("reading whether the gate is pinned", () => {
  const pin = () => readGatePinV1({ apiOrigin: origin, repository: "o/r", branch: "main", token: INSTALL_TOKEN, appId: APP_ID });

  it("is pinned only when a ruleset requires the Ascout check from this App", async () => {
    reset();
    expect(await pin()).toBe("pinned");
    expect(state.requests[0]!.auth).toBe(`Bearer ${INSTALL_TOKEN}`);
  });

  it.each([
    ["a pin to GitHub Actions", [{ type: "required_status_checks", parameters: { required_status_checks: [{ context: "Ascout verification", integration_id: 15368 }] } }]],
    ["a pin with no source", [{ type: "required_status_checks", parameters: { required_status_checks: [{ context: "Ascout verification" }] } }]],
    ["this App pinned to another check", [{ type: "required_status_checks", parameters: { required_status_checks: [{ context: "build", integration_id: APP_ID }] } }]],
    ["no rules at all", []],
    ["other rule types only", [{ type: "pull_request" }, null]],
  ])("is not pinned with %s", async (_label, rules) => {
    reset({ rules });
    expect(await pin()).toBe("not_pinned");
  });

  it.each([
    ["an HTTP error", { rulesStatus: 403 }],
    ["a response that is not a list", { rules: { message: "x" } }],
  ])("is unknown on %s, never pinned", async (_label, overrides) => {
    reset(overrides as Partial<FakeState>);
    expect(await pin()).toBe("unknown");
  });

  it("finds the pin in any of several rulesets", async () => {
    reset({ rules: [
      { type: "required_status_checks", parameters: { required_status_checks: [{ context: "build", integration_id: 15368 }] } },
      { type: "required_status_checks", parameters: { required_status_checks: [{ context: "Ascout verification", integration_id: APP_ID }] } },
    ] });
    expect(await pin()).toBe("pinned");
  });

  it("is unknown, not 'not pinned', when more rules sit on a later page", async () => {
    reset({ rules: [{ type: "pull_request" }], rulesLink: '<https://api.github.com/x?page=2>; rel="next"' });
    expect(await pin()).toBe("unknown");
    expect(state.requests[0]!.path).toBe("/repos/o/r/rules/branches/main");
  });

  it("keeps a slashed branch name as path segments", async () => {
    reset();
    expect(await readGatePinV1({ apiOrigin: origin, repository: "o/r", branch: "release/x", token: INSTALL_TOKEN, appId: APP_ID })).toBe("pinned");
    expect(state.requests[0]!.path).toBe("/repos/o/r/rules/branches/release/x");
  });

  it("is unknown when the API can't be reached", async () => {
    expect(await readGatePinV1({ apiOrigin: "http://127.0.0.1:1", repository: "o/r", branch: "main", token: INSTALL_TOKEN, appId: APP_ID })).toBe("unknown");
  });

  it("states each pin outcome in the check run and the summary comment", () => {
    const context = { trusted_head_sha: HEAD, evidence_trusted: true, details_url: "https://github.com/o/r/actions/runs/1" };
    const pinned = checkRunFromEvidenceV1(bundle(0), { ...context, gate_pin: "pinned" });
    expect(pinned.output.summary).toContain("Gate: pinned in a ruleset to this GitHub App");
    expect(pinned.output.summary).toContain("Bypass actors and classic branch protection were not checked.");
    expect(checkRunFromEvidenceV1(bundle(0), { ...context, gate_pin: "not_pinned" }).output.summary).toContain("**not pinned in any ruleset**");
    expect(summaryCommentV1(bundle(0), { evidence_trusted: true, gate_pin: "unknown" })).toContain("could not be read");
    expect(checkRunFromEvidenceV1(bundle(0), context).output.summary).not.toContain("Gate:");
  });
});

describe("ascout pr-publish in App mode", () => {
  const bundlePath = join(scratch, "bundle.json");
  writeFileSync(bundlePath, JSON.stringify(bundle(0)));
  const baseEnv = () => ({
    GITHUB_REPOSITORY: "o/r", ASCOUT_PR_HEAD_SHA: HEAD, ASCOUT_PR_HEAD_REPOSITORY: "o/r", ASCOUT_PR_HEAD_BRANCH: "feature",
    ASCOUT_PR_DETAILS_URL: "https://github.com/o/r/actions/runs/1", GITHUB_API_URL: origin,
    ASCOUT_PR_TRIGGERING_ACTOR: "maintainer", ASCOUT_PR_TRUSTED_ACTORS: "maintainer", ASCOUT_PR_REQUIRED_BASE: "main", ASCOUT_PR_NUMBER: "7",
  });
  const appEnv = () => ({ ...baseEnv(), ASCOUT_APP_ID: String(APP_ID), ASCOUT_APP_CLIENT_ID: CLIENT_ID, ASCOUT_APP_PRIVATE_KEY: PEM });
  async function publish(env: Record<string, string>): Promise<{ code: number; out: string[]; err: string[] }> {
    const out: string[] = [];
    const err: string[] = [];
    const code = await runPrPublishFromEnvV1({ bundlePath, env, cwd: scratch, stdout: (line) => out.push(line), stderr: (line) => err.push(line) });
    return { code, out, err };
  }

  it("publishes the check as the App, with the pin in the summary, masking before any use", async () => {
    reset();
    const { code, out, err } = await publish(appEnv());
    expect(code).toBe(0);
    expect(err).toEqual([]);
    const checkRun = state.requests.find((r) => r.path === "/repos/o/r/check-runs")!;
    expect(checkRun.auth).toBe(`Bearer ${INSTALL_TOKEN}`);
    expect((checkRun.body as { name: string; output: { summary: string } }).output.summary).toContain("Gate: pinned in a ruleset to this GitHub App");
    // Every call after minting uses the installation token, never the JWT or any GITHUB_TOKEN.
    for (const request of state.requests.slice(2)) expect(request.auth).toBe(`Bearer ${INSTALL_TOKEN}`);
    expect(out.slice(0, 2).every((line) => line.startsWith("::add-mask::"))).toBe(true);
    expect(out[1]).toBe(`::add-mask::${INSTALL_TOKEN}`);
    expect(JSON.parse(out[out.length - 1]!)).toMatchObject({ kind: "published", conclusion: "success" });
    expect(state.comments).toHaveLength(1);
    // The private key never reaches any output.
    expect([...out, ...err].join(" ")).not.toContain(PEM.slice(40, 80));
  });

  it("shows the JWT and the token only in mask lines, never any line of the key, and revokes the token", async () => {
    reset();
    const { out, err } = await publish(appEnv());
    const jwt = state.requests[0]!.auth.replace(/^Bearer /u, "");
    const plain = [...out.filter((line) => !line.startsWith("::add-mask::")), ...err].join(String.fromCharCode(10));
    expect(plain).not.toContain(jwt);
    expect(plain).not.toContain(INSTALL_TOKEN);
    for (const line of PEM.split(String.fromCharCode(10)).filter((l) => l.length > 20 && !l.startsWith("-----"))) {
      expect([...out, ...err].join(" ")).not.toContain(line);
    }
    const last = state.requests[state.requests.length - 1]!;
    expect(`${last.method} ${last.path} ${last.auth}`).toBe(`DELETE /installation/token Bearer ${INSTALL_TOKEN}`);
  });

  it("validates the bundle before minting, so a bad input never costs a credential", async () => {
    reset();
    const bad = join(scratch, "bad.json");
    writeFileSync(bad, "{not json");
    const out: string[] = [];
    const code = await runPrPublishFromEnvV1({ bundlePath: bad, env: appEnv(), cwd: scratch, stdout: (line) => out.push(line), stderr: () => undefined });
    expect(code).toBe(2);
    expect(out.some((line) => line.startsWith("::add-mask::"))).toBe(false);
    expect(state.requests).toEqual([]);
  });

  it("refuses a malformed details URL instead of crashing", async () => {
    reset();
    const { code, out } = await publish({ ...appEnv(), ASCOUT_PR_DETAILS_URL: "not a url" });
    expect(code).toBe(2);
    expect(JSON.parse(out[out.length - 1]!)).toEqual({ kind: "refused", reason: "details URL is not a URL" });
    expect(state.requests).toEqual([]);
  });

  it("turns an API failure after minting into exit 2, and still revokes the token", async () => {
    reset({ checkRunStatus: 500 });
    const { code, out, err } = await publish(appEnv());
    expect(code).toBe(2);
    expect(JSON.parse(out[out.length - 1]!)).toMatchObject({ kind: "refused", reason: expect.stringContaining("HTTP 500") });
    expect(err.join(" ")).not.toContain(INSTALL_TOKEN);
    expect(state.requests.some((r) => r.method === "DELETE" && r.path === "/installation/token")).toBe(true);
  });

  it("finds the App's own summary comment again, so it updates instead of adding another", async () => {
    reset();
    await publish(appEnv());
    await publish(appEnv());
    expect(state.comments).toHaveLength(1);
    expect(state.requests.some((r) => r.method === "PATCH")).toBe(true);
  });

  it("posts nothing when the token can't be minted, and says why", async () => {
    reset({ appId: 1 });
    const { code, out, err } = await publish(appEnv());
    expect(code).toBe(2);
    expect(err.join(" ")).toContain("belongs to a different App");
    expect(JSON.parse(out[out.length - 1]!)).toEqual({ kind: "refused", reason: "the installation on this repository belongs to a different App" });
    expect(state.requests.some((r) => r.path === "/repos/o/r/check-runs")).toBe(false);
  });

  it.each([
    ["only the App ID", { ASCOUT_APP_ID: String(APP_ID) }],
    ["the ID and client ID without the key", { ASCOUT_APP_ID: String(APP_ID), ASCOUT_APP_CLIENT_ID: CLIENT_ID }],
    ["only the key", { ASCOUT_APP_PRIVATE_KEY: PEM }],
  ])("refuses %s, with no network at all", async (_label, partial) => {
    reset();
    const { code, err } = await publish({ ...baseEnv(), GITHUB_TOKEN: "t", ...partial });
    expect(code).toBe(2);
    expect(err.join(" ")).toContain("GitHub App mode needs all of ASCOUT_APP_ID, ASCOUT_APP_CLIENT_ID, ASCOUT_APP_PRIVATE_KEY");
    expect(err.join(" ")).not.toContain(PEM.slice(40, 80));
    expect(state.requests).toEqual([]);
  });

  it.each([
    ["a non-numeric App ID", { ...appEnv(), ASCOUT_APP_ID: "acme" }, "must be the App's numeric ID"],
    ["no token and no App", baseEnv(), "GITHUB_TOKEN not set"],
    ["a missing event value", { ...appEnv(), ASCOUT_PR_HEAD_SHA: "" }, "ASCOUT_PR_HEAD_SHA not set"],
    ["a non-https API", { ...appEnv(), GITHUB_API_URL: "http://api.example.com" }, "must use https"],
  ])("refuses %s, with no network at all", async (_label, env, message) => {
    reset();
    const { code, err } = await publish(env as Record<string, string>);
    expect(code).toBe(2);
    expect(err.join(" ")).toContain(message);
    expect(state.requests).toEqual([]);
  });

  it("without an App, publishes with GITHUB_TOKEN as before and says nothing about a gate", async () => {
    reset();
    const { code, out } = await publish({ ...baseEnv(), GITHUB_TOKEN: "plain-token" });
    expect(code).toBe(0);
    expect(out).toHaveLength(1);
    const checkRun = state.requests.find((r) => r.path === "/repos/o/r/check-runs")!;
    expect(checkRun.auth).toBe("Bearer plain-token");
    expect((checkRun.body as { output: { summary: string } }).output.summary).not.toContain("Gate:");
    expect(state.requests.some((r) => r.path.includes("installation") || r.path.includes("/rules/"))).toBe(false);
  });
});

describe("the built entry point", () => {
  it("runs as a program whether invoked with or without .js, and refuses missing configuration with exit 2", () => {
    const outDir = join(resolve(__dirname, ".."), "node_modules", ".cache", "ascout-c1a");
    execFileSync(process.execPath, [join(resolve(__dirname, ".."), "node_modules", "typescript", "bin", "tsc"), "-p", join(resolve(__dirname, ".."), "tsconfig.json"), "--outDir", outDir], { stdio: "pipe" });
    for (const entry of [join(outDir, "github", "publish-cli.js"), join(outDir, "github", "publish-cli")]) {
      const result = spawnSync(process.execPath, [entry, "bundle.json"], { encoding: "utf8", env: { PATH: process.env.PATH ?? "", SystemRoot: process.env.SystemRoot ?? "" } });
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("GITHUB_REPOSITORY");
    }
  }, 300_000);
});

describe("the publish entry point installs nothing", () => {
  it("imports only Node built-ins and Ascout's own GitHub modules", () => {
    const root = resolve(__dirname, "..", "src", "github", "publish-cli.ts");
    const seen = new Set<string>();
    const external = new Set<string>();
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      const source = readFileSync(file, "utf8");
      // Static `from`, bare side-effect imports, dynamic import(), and require(), in either quote style.
      const forms = [/\bfrom\s+["']([^"']+)["']/gu, /\bimport\s+["']([^"']+)["']/gu, /\bimport\s*\(\s*["']([^"']+)["']/gu, /\brequire\s*\(\s*["']([^"']+)["']/gu];
      expect(source).not.toMatch(/createRequire|\bimport\s*\(\s*[^"'\s]/u);
      for (const match of forms.flatMap((form) => [...source.matchAll(form)])) {
        const specifier = match[1]!;
        if (specifier.startsWith(".")) visit(resolve(dirname(file), specifier.replace(/\.js$/u, ".ts")));
        else external.add(specifier);
      }
    };
    visit(root);
    // Exactly these modules; a new import anywhere in the graph must be looked at, not slip in.
    expect([...seen].map((file) => basename(file)).sort()).toEqual(["app-auth.ts", "policy.ts", "pr-evidence.ts", "publish-cli.ts", "publish-run.ts", "publish.ts"]);
    expect([...external].filter((specifier) => !specifier.startsWith("node:"))).toEqual([]);
  });
});

describe("every exit and refusal of the publish step", () => {
  const bundlePath = join(scratch, "bundle-exits.json");
  writeFileSync(bundlePath, JSON.stringify(bundle(0)));
  const env = () => ({
    GITHUB_REPOSITORY: "o/r", ASCOUT_PR_HEAD_SHA: HEAD, ASCOUT_PR_HEAD_REPOSITORY: "o/r", ASCOUT_PR_HEAD_BRANCH: "feature",
    ASCOUT_PR_DETAILS_URL: "https://github.com/o/r/actions/runs/1", GITHUB_API_URL: origin, ASCOUT_PR_REQUIRED_BASE: "main",
    ASCOUT_PR_TRIGGERING_ACTOR: "maintainer", ASCOUT_PR_TRUSTED_ACTORS: "maintainer",
    ASCOUT_APP_ID: String(APP_ID), ASCOUT_APP_CLIENT_ID: CLIENT_ID, ASCOUT_APP_PRIVATE_KEY: PEM,
  });
  const run = async (overrides: Record<string, string> = {}) => {
    const out: string[] = [];
    const code = await runPrPublishFromEnvV1({ bundlePath, env: { ...env(), ...overrides }, cwd: scratch, stdout: (line) => out.push(line), stderr: () => undefined });
    return { code, last: JSON.parse(out[out.length - 1]!) as { kind: string } };
  };

  it("finds the PR by its branch when the event gives no PR number", async () => {
    reset();
    expect(await run()).toMatchObject({ code: 0, last: { kind: "published" } });
    expect(state.requests.some((r) => r.path === "/repos/o/r/pulls")).toBe(true);
  });

  it("exits 3 when the PR head moved after collection, and still revokes the token", async () => {
    reset({ prHead: "c".repeat(40) });
    expect(await run({ ASCOUT_PR_NUMBER: "7" })).toMatchObject({ code: 3, last: { kind: "stale" } });
    expect(state.requests.some((r) => r.method === "DELETE")).toBe(true);
  });

  it("exits 2 when there is no open PR to publish to", async () => {
    reset({ prState: "closed" });
    expect(await run()).toMatchObject({ code: 2, last: { kind: "refused" } });
  });

  it("uses the default API origin and bot login when none is given", async () => {
    reset();
    const out: string[] = [];
    const code = await runPrPublishFromEnvV1({ bundlePath, env: { ...env(), ASCOUT_APP_ID: "", ASCOUT_APP_CLIENT_ID: "", ASCOUT_APP_PRIVATE_KEY: "", GITHUB_API_URL: "", GITHUB_TOKEN: "t", ASCOUT_PR_HEAD_SHA: "nope" }, cwd: scratch, stdout: (line) => out.push(line), stderr: () => undefined });
    // A bad head SHA is refused before any request, so the default https://api.github.com is never called.
    expect(code).toBe(2);
    expect(JSON.parse(out[out.length - 1]!)).toEqual({ kind: "refused", reason: "invalid head sha" });
  });
});

describe("the program wrappers", () => {
  const sink = () => { const lines: string[] = []; return { lines, stream: { write: (text: string) => lines.push(text) } }; };

  it("needs exactly one argument", async () => {
    for (const argv of [[], ["a", "b"]]) {
      const err = sink();
      expect(await runPrPublishMainV1(argv, { env: {}, cwd: scratch, out: sink().stream, err: err.stream })).toBe(2);
      expect(err.lines.join("")).toContain("usage: node publish-cli.js <bundle>");
    }
  });

  it("publishes through the main wrapper, one line per write", async () => {
    reset();
    const bundlePath = join(scratch, "bundle-main.json");
    writeFileSync(bundlePath, JSON.stringify(bundle(0)));
    const out = sink();
    const code = await runPrPublishMainV1([bundlePath], {
      env: { GITHUB_REPOSITORY: "o/r", ASCOUT_PR_HEAD_SHA: HEAD, ASCOUT_PR_HEAD_REPOSITORY: "o/r", ASCOUT_PR_HEAD_BRANCH: "feature",
        ASCOUT_PR_DETAILS_URL: "https://github.com/o/r/actions/runs/1", GITHUB_API_URL: origin, ASCOUT_PR_REQUIRED_BASE: "main", ASCOUT_PR_NUMBER: "7", GITHUB_TOKEN: "t" },
      cwd: scratch, out: out.stream, err: sink().stream,
    });
    expect(code).toBe(0);
    expect(out.lines.every((line) => line.endsWith(String.fromCharCode(10)))).toBe(true);
  });

  it("the entry module runs on import and sets the exit code", async () => {
    const argv = process.argv;
    const exitCode = process.exitCode;
    const write = process.stderr.write;
    const captured: string[] = [];
    process.argv = [argv[0]!, "publish-cli.js"];
    process.stderr.write = ((text: string) => { captured.push(String(text)); return true; }) as typeof process.stderr.write;
    try {
      await import("../src/github/publish-cli.js");
      expect(process.exitCode).toBe(2);
      expect(captured.join("")).toContain("usage: node publish-cli.js <bundle>");
    } finally {
      process.argv = argv;
      process.stderr.write = write;
      process.exitCode = exitCode;
    }
  });

  it("ascout pr-publish goes through the same wrapper", async () => {
    vi.stubEnv("GITHUB_REPOSITORY", "");
    const write = process.stderr.write;
    const captured: string[] = [];
    process.stderr.write = ((text: string) => { captured.push(String(text)); return true; }) as typeof process.stderr.write;
    try {
      expect(await runCli(["pr-publish", join(scratch, "bundle-main.json")])).toBe(2);
      expect(captured.join("")).toContain("GITHUB_REPOSITORY");
    } finally {
      process.stderr.write = write;
      vi.unstubAllEnvs();
    }
  });
});

describe("hostile or broken API replies and local inputs", () => {
  it("calls an oversized or unparseable installation reply malformed", async () => {
    for (const raw of ["x".repeat(1024 * 1024 + 10), "{not json"]) {
      reset({ installRaw: raw });
      expect(await mintInstallationTokenV1({ apiOrigin: origin, repository: "o/r", credentials: { appId: APP_ID, clientId: CLIENT_ID, privateKeyPem: PEM }, mask: () => undefined })).toEqual({ ok: false, reason: "the App installation response was malformed" });
    }
  });

  it("reports whether revoking worked, and never throws", async () => {
    reset();
    expect(await revokeInstallationTokenV1({ apiOrigin: origin, token: INSTALL_TOKEN })).toBe(true);
    expect(await revokeInstallationTokenV1({ apiOrigin: "http://127.0.0.1:1", token: INSTALL_TOKEN })).toBe(false);
  });

  it("refuses a control character in the head branch, an oversized bundle, and an unreadable bundle", () => {
    const base = { repository: "o/r", headRepository: "o/r", headSha: HEAD, headBranch: "feature", detailsUrl: "https://github.com/o/r/actions/runs/1", bundlePath: join(scratch, "bundle-exits.json") };
    expect(preparePublishV1({ ...base, headBranch: "a" + String.fromCharCode(1) })).toEqual({ ok: false, reason: "invalid head branch" });
    const big = join(scratch, "big.json");
    writeFileSync(big, "x".repeat(2 * 1024 * 1024));
    expect(preparePublishV1({ ...base, bundlePath: big })).toEqual({ ok: false, reason: "bundle is larger than its limit" });
    expect(preparePublishV1({ ...base, bundlePath: join(scratch, "missing.json") })).toEqual({ ok: false, reason: "bundle could not be read" });
  });
});
