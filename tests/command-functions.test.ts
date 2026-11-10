import { spawnSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { CliUsageError, parseCliArgs } from "../src/cli.js";
import {
  computeDoctorV1,
  computeReviewV1,
  computeSecurityV1,
  computeTestPlanV1,
  renderDoctorTerminalV1,
} from "../src/command-functions.js";
import { callLocalReviewModelV1 } from "../src/assurance/review/local-review-provider.js";

// E8 part zero: the commands as functions that never write to stdio and never end the process.
const scratch = realpathSync(mkdtempSync(join(tmpdir(), "ascout-cmdfn-")));
const repo = join(scratch, "repo");
const outside = join(scratch, "outside");

beforeAll(() => {
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
});

afterAll(() => rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

afterEach(() => vi.restoreAllMocks());

function silenceCheck(): () => string[] {
  const seen: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => { seen.push(`stdout:${String(chunk)}`); return true; });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => { seen.push(`stderr:${String(chunk)}`); return true; });
  vi.spyOn(console, "error").mockImplementation((...args) => { seen.push(`console:${args.join(" ")}`); });
  vi.spyOn(console, "log").mockImplementation((...args) => { seen.push(`console:${args.join(" ")}`); });
  vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit called"); });
  return () => seen;
}

describe("command functions", () => {
  it("review returns the report and exit 4 for a changed tree, writing nothing", async () => {
    const seen = silenceCheck();
    const result = await computeReviewV1(repo);
    expect(result).toMatchObject({ kind: "report", exit_code: 4, report: { kind: "absence", outcome: "NOT_RUN" } });
    expect(seen()).toEqual([]);
  }, 60_000);

  it("review returns an error result, not a throw, outside a repository", async () => {
    const seen = silenceCheck();
    const result = await computeReviewV1(outside);
    expect(result).toMatchObject({ kind: "error", exit_code: 2 });
    if (result.kind === "error") expect(result.message).not.toContain(outside);
    expect(seen()).toEqual([]);
  }, 60_000);

  it("doctor returns a versioned JSON report and renders the same text as before", () => {
    const seen = silenceCheck();
    const result = computeDoctorV1(repo);
    expect(result.kind).toBe("report");
    if (result.kind !== "report") return;
    expect(result.report).toMatchObject({
      kind: "doctor",
      schema_version: 1,
      exit_code: 0,
      repository: { config_source: "built_in_defaults" },
      changed_files: { count: 1, by_kind: { modified: 1 } },
    });
    const text = renderDoctorTerminalV1(result.report);
    expect(text.startsWith("=== Doctor Output ===\n")).toBe(true);
    expect(text).toContain("\n--- Changed Files ---\nCount: 1\n  modified: 1");
    expect(seen()).toEqual([]);
  }, 60_000);

  it("doctor returns an error result outside a repository", () => {
    const result = computeDoctorV1(outside);
    expect(result).toMatchObject({ kind: "error", exit_code: 2, message: expect.stringContaining("Error during doctor:") });
  }, 60_000);

  it("test --plan and security without an engine read no repository and write nothing", async () => {
    const seen = silenceCheck();
    expect(computeTestPlanV1("STANDARD")).toMatchObject({ kind: "report", exit_code: 0 });
    expect(await computeSecurityV1(null, null)).toMatchObject({ kind: "report", exit_code: 4, report: { engine: "none" } });
    expect(seen()).toEqual([]);
  });

  it("parses doctor --format json|terminal and refuses anything else", () => {
    expect(parseCliArgs(["doctor", "--format", "json"])).toMatchObject({ command: "doctor", format: "json" });
    expect(parseCliArgs(["doctor", "--format", "terminal"])).toMatchObject({ command: "doctor", format: "terminal" });
    expect(() => parseCliArgs(["doctor", "--format", "agent"])).toThrow(CliUsageError);
    expect(() => parseCliArgs(["init", "--format", "json"])).toThrow(CliUsageError);
  });
});

describe("local model cancellation", () => {
  let server: Server;
  let endpoint: string;
  beforeAll(async () => {
    server = createServer((request, response) => {
      if (request.url === "/api/version") return void response.end('{"version":"1"}');
      // Never answers a chat request.
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("stops at once when the caller aborts, and says it was cancelled", async () => {
    const controller = new AbortController();
    const started = Date.now();
    setTimeout(() => controller.abort(), 200);
    const result = await callLocalReviewModelV1({ endpoint, model: "m", diff: "+x", timeoutMs: 60_000, maxResponseBytes: 1024, signal: controller.signal });
    expect(result).toEqual({ ok: false, reason: "the review was cancelled" });
    expect(Date.now() - started).toBeLessThan(10_000);
  });
});
