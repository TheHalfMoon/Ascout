import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Branding regression (docs/BRAND_IDENTITY.md): every active, user-facing surface presents the
// product as Ascout. This checks real output of the compiled CLI and MCP server, not source text,
// so legal notices, provenance records, vendored code, and history are out of scope by design.
const PROJECT_ROOT = resolve(__dirname, "..");
const OUT_DIR = join(PROJECT_ROOT, "node_modules", ".cache", "ascout-brand");
const CLI = join(OUT_DIR, "cli.js");
const scratch = realpathSync(mkdtempSync(join(tmpdir(), "ascout-brand-")));

/**
 * Names that must never appear as a product identity in active output.
 */
const FOREIGN_NAMES = [
  "artemis", "sentrdel", "kodac", "graft", "pulse", "opencode", "open-code-review", "skelet",
  "medscale", "ottari", "codex", "chatgpt", "claude", "cursor", "copilot", "coderabbit", "greptile",
];

/**
 * The documented allowance: exact identifiers that accurately name a third-party or separate engine
 * in a report, and are part of the report schema, so renaming them would break compatibility.
 * Each entry says why it is allowed. Add to this list only with that reason.
 */
const ALLOWED_IDENTIFIERS: readonly { token: string; reason: string }[] = [
  { token: "engine:review-opencode-review", reason: "Report engine_id for Alibaba open-code-review, the pinned review engine reported as not run" },
  { token: "open-code-review", reason: "Report binary_name of that engine" },
  { token: "engine:sentrdel", reason: "Security report names the separate Sentrdel scanner as not executed" },
];

function foreignNamesIn(text: string): string[] {
  let scrubbed = text;
  for (const { token } of [...ALLOWED_IDENTIFIERS].sort((a, b) => b.token.length - a.token.length)) {
    scrubbed = scrubbed.split(token).join(" ");
  }
  return FOREIGN_NAMES.filter((name) => new RegExp(`(^|[^a-z0-9])${name}([^a-z0-9]|$)`, "iu").test(scrubbed));
}

let repo: string;
let outside: string;

beforeAll(() => {
  execFileSync(process.execPath, [join(PROJECT_ROOT, "node_modules", "typescript", "bin", "tsc"), "-p", join(PROJECT_ROOT, "tsconfig.json"), "--outDir", OUT_DIR], { stdio: "pipe" });
  repo = join(scratch, "repo");
  outside = join(scratch, "outside");
  mkdirSync(repo);
  mkdirSync(outside);
  const git = (...args: string[]) => expect(spawnSync("git", args, { cwd: repo }).status).toBe(0);
  git("init", "-q");
  git("config", "user.name", "t");
  git("config", "user.email", "t@example.invalid");
  git("config", "commit.gpgsign", "false");
  writeFileSync(join(repo, "a.txt"), "a\n");
  git("add", ".");
  git("commit", "-qm", "base");
  writeFileSync(join(repo, "a.txt"), "a\nb\n");
}, 300_000);

afterAll(() => rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

function run(cwd: string, args: readonly string[], input?: string): string {
  const env = { ...process.env };
  delete env.ASCOUT_GITLEAKS_PATH;
  const result = spawnSync(process.execPath, [CLI, ...args], { cwd, env, encoding: "utf8", input, timeout: 120_000 });
  return `${result.stdout}\n${result.stderr}`;
}

const COMMANDS: readonly (readonly string[])[] = [
  [], ["--help"], ["nope"], ["review"], ["review", "--format", "json"], ["review", "--bogus"],
  ["test", "--plan"], ["test", "--plan", "--format", "json"], ["test", "--profile", "quick", "--format", "json"],
  ["security"], ["security", "--format", "json"], ["doctor"], ["doctor", "--format", "json"], ["mcp", "--x"],
  ["pr-evidence", "--skip-tests"], ["pr-evidence", "--bogus"], ["pr-publish"],
];

describe("Ascout identity on active surfaces", () => {
  it("every CLI command's real output, in and out of a repository, names no other product", () => {
    const offenders: string[] = [];
    for (const cwd of [repo, outside]) {
      for (const args of COMMANDS) {
        const found = foreignNamesIn(run(cwd, args));
        if (found.length > 0) offenders.push(`ascout ${args.join(" ")} (${cwd === repo ? "repo" : "outside"}): ${found.join(", ")}`);
      }
    }
    expect(offenders).toEqual([]);
  }, 600_000);

  it("usage presents the executable as ascout", () => {
    const usage = run(outside, []);
    expect(usage).toContain("Usage:");
    for (const line of usage.split("\n").filter((l) => l.startsWith("  ") && l.trim() !== "")) {
      expect(line.trim().startsWith("ascout ")).toBe(true);
    }
  }, 120_000);

  it("the MCP server identifies itself as ascout, and its tools and descriptions name no other product", () => {
    const out = run(repo, ["mcp"], [
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } }),
      JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "ascout_review" } }),
      JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "ascout_doctor" } }),
    ].join("\n") + "\n");
    const lines = out.split("\n").filter((line) => line.startsWith("{"));
    const init = JSON.parse(lines[0]!) as { result: { serverInfo: { name: string }; instructions: string } };
    expect(init.result.serverInfo.name).toBe("ascout");
    const tools = (JSON.parse(lines[1]!) as { result: { tools: { name: string; description: string }[] } }).result.tools;
    for (const tool of tools) expect(tool.name.startsWith("ascout_")).toBe(true);
    expect(foreignNamesIn(out)).toEqual([]);
  }, 180_000);

  it("package metadata names the product Ascout", () => {
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, "package.json"), "utf8")) as Record<string, unknown>;
    expect(pkg.name).toBe("@thehalfmoon/ascout");
    expect(pkg.bin).toEqual({ ascout: "./dist/cli.js" });
    expect(String(pkg.description)).toMatch(/AI ships/u);
    expect(foreignNamesIn(JSON.stringify({ description: pkg.description, keywords: pkg.keywords, homepage: pkg.homepage, repository: pkg.repository }))).toEqual([]);
  });

  it("README introduces the product as Ascout", () => {
    const intro = readFileSync(join(PROJECT_ROOT, "README.md"), "utf8").split("\n").slice(0, 12).join("\n");
    expect(intro.startsWith("# Ascout")).toBe(true);
    expect(foreignNamesIn(intro)).toEqual([]);
  });
});

describe("the brand guard itself", () => {
  it("flags a foreign product name, and lets only the documented identifiers through", () => {
    expect(foreignNamesIn("Welcome to Artemis CLI")).toEqual(["artemis"]);
    expect(foreignNamesIn("powered by Sentrdel")).toEqual(["sentrdel"]);
    expect(foreignNamesIn('"engine_id": "engine:review-opencode-review", "binary_name": "open-code-review"')).toEqual([]);
    expect(foreignNamesIn("engine: engine:sentrdel 0.0.0 (not executed)")).toEqual([]);
    expect(foreignNamesIn("opencode is great")).toEqual(["opencode"]);
    expect(foreignNamesIn("compares shares graftless")).toEqual([]);
    for (const { reason } of ALLOWED_IDENTIFIERS) expect(reason.length).toBeGreaterThan(20);
  });
});
