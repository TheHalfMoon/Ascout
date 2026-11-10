import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { collectPrEvidenceV1 } from "../src/github/collect.js";
import {
  CHECK_RUN_NAME,
  CONCLUSION_BY_STATE,
  PR_EVIDENCE_MAX_FINDINGS,
  SUMMARY_COMMENT_MARKER,
  buildPrEvidenceV1,
  checkRunFromEvidenceV1,
  neutralizeMarkdownV1,
  overallStateV1,
  stateForExitCode,
  summaryCommentV1,
  validatePrEvidenceV1,
  type PrCheckV1,
  type PrFindingV1,
} from "../src/github/pr-evidence.js";

const HEAD = "a".repeat(40);
const c = (id: PrCheckV1["id"], exit: PrCheckV1["exit_code"]): PrCheckV1 => ({ id, exit_code: exit, state: stateForExitCode(exit), outcome: "X", reason: "because" });
const f = (overrides: Partial<PrFindingV1> = {}): PrFindingV1 => ({ check: "security", path: "src/a.ts", start_line: 3, end_line: 3, severity: "failure", title: "Secret: github-pat", message: "Detected a token.", ...overrides });
const bundle = (checks: PrCheckV1[], findings: PrFindingV1[] = []) => buildPrEvidenceV1({ ascout_version: "0.2.0", head_sha: HEAD, checks, findings });

describe("overall state and check-run conclusion", () => {
  it("follows A07 precedence: error, drift, findings, incomplete, complete", () => {
    expect(overallStateV1([c("review", 0), c("security", 4), c("test", 1)])).toBe("FINDINGS");
    expect(overallStateV1([c("review", 3), c("test", 2)])).toBe("ERROR");
    expect(overallStateV1([c("review", 0), c("test", 4)])).toBe("INCOMPLETE");
    expect(overallStateV1([c("review", 0), c("security", 0), c("test", 0)])).toBe("COMPLETE");
    expect(overallStateV1([])).toBe("INCOMPLETE");
  });

  it("is green only when every check completed; incomplete is action_required, never neutral or success", () => {
    expect(CONCLUSION_BY_STATE).toEqual({ COMPLETE: "success", FINDINGS: "failure", ERROR: "failure", SOURCE_DRIFT: "failure", INCOMPLETE: "action_required" });
    expect(checkRunFromEvidenceV1(bundle([c("review", 4), c("security", 4), c("test", 0)])).conclusion).toBe("action_required");
    expect(checkRunFromEvidenceV1(bundle([c("review", 0), c("security", 0), c("test", 0)])).conclusion).toBe("success");
  });

  it("annotates only located findings and binds the run to the head commit", () => {
    const run = checkRunFromEvidenceV1(bundle([c("security", 1)], [f(), f({ path: null, start_line: null, end_line: null, title: "Task failed: test" })]));
    expect(run).toMatchObject({ name: CHECK_RUN_NAME, head_sha: HEAD, status: "completed", conclusion: "failure" });
    expect(run.output.annotations).toEqual([{ path: "src/a.ts", start_line: 3, end_line: 3, annotation_level: "failure", title: "Secret: github-pat", message: "Detected a token." }]);
  });

  it("caps findings at the annotation limit and says more exist", () => {
    const many = Array.from({ length: PR_EVIDENCE_MAX_FINDINGS + 5 }, (_, i) => f({ start_line: i + 1, end_line: i + 1 }));
    const evidence = bundle([c("security", 1)], many);
    expect(evidence.findings).toHaveLength(PR_EVIDENCE_MAX_FINDINGS);
    expect(evidence.findings_truncated).toBe(true);
    expect(checkRunFromEvidenceV1(evidence).output.summary).toContain("more not shown");
  });
});

describe("validating an untrusted bundle", () => {
  const good = () => JSON.parse(JSON.stringify(bundle([c("review", 4), c("security", 1)], [f()]))) as Record<string, any>;

  it("accepts a bundle Ascout built", () => {
    expect(validatePrEvidenceV1(JSON.stringify(good()))).toMatchObject({ ok: true });
  });

  it.each([
    ["extra key", (b: Record<string, any>) => { b.token = "x"; }],
    ["bad head sha", (b: Record<string, any>) => { b.head_sha = "main"; }],
    ["state that contradicts its exit code", (b: Record<string, any>) => { b.checks[0].state = "COMPLETE"; }],
    ["overall that contradicts the checks", (b: Record<string, any>) => { b.overall = { state: "COMPLETE", exit_code: 0 }; }],
    ["duplicate check", (b: Record<string, any>) => { b.checks.push({ ...b.checks[0] }); }],
    ["path traversal", (b: Record<string, any>) => { b.findings[0].path = "../../etc/passwd"; }],
    ["absolute path", (b: Record<string, any>) => { b.findings[0].path = "/etc/passwd"; }],
    ["windows path", (b: Record<string, any>) => { b.findings[0].path = "C:\\x"; }],
    ["inverted range", (b: Record<string, any>) => { b.findings[0].start_line = 9; b.findings[0].end_line = 2; }],
    ["unknown severity", (b: Record<string, any>) => { b.findings[0].severity = "critical"; }],
    ["unsupported schema", (b: Record<string, any>) => { b.schema = "ascout.pr-evidence/v9"; }],
    ["no checks", (b: Record<string, any>) => { b.checks = []; b.overall = { state: "INCOMPLETE", exit_code: 4 }; }],
  ])("rejects a bundle with a %s", (_label, mutate) => {
    const b = good();
    mutate(b);
    expect(validatePrEvidenceV1(JSON.stringify(b)).ok).toBe(false);
  });

  it("rejects non-JSON and oversized input", () => {
    expect(validatePrEvidenceV1("{not json").ok).toBe(false);
    expect(validatePrEvidenceV1(`"${"x".repeat(1024 * 1024 + 10)}"`).ok).toBe(false);
  });
});

describe("rendering untrusted text", () => {
  it("neutralizes mentions, HTML, links, and code fences", () => {
    const text = neutralizeMarkdownV1("@everyone <img src=x> [x](http://e) ```js");
    expect(text).not.toMatch(/@everyone/u);
    expect(text).not.toContain("<img");
    expect(text).not.toContain("](");
    expect(text).not.toContain("```");
  });

  it("keeps one marked summary comment that says exit 4 is never a pass", () => {
    const comment = summaryCommentV1(bundle([c("review", 4), c("test", 4)], [f({ path: null, start_line: null, end_line: null, title: "@admin <b>x</b>" })]));
    expect(comment.split(SUMMARY_COMMENT_MARKER)).toHaveLength(2);
    expect(comment).toContain("incomplete: required work did not run");
    expect(comment).toContain("never a pass");
    expect(comment).not.toContain("<b>");
    expect(comment).not.toMatch(/@admin/u);
  });
});

describe("collecting evidence from a real repository", () => {
  let repo: string;
  beforeAll(() => {
    repo = realpathSync(mkdtempSync(join(tmpdir(), "ascout-pr-")));
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
  afterAll(() => rmSync(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

  it("reports review and security as incomplete without engines, so the check is not green", async () => {
    const evidence = await collectPrEvidenceV1({
      root: repo, gitleaksPath: null, runTests: true,
      runTestCheck: async () => ({ kind: "report", exit_code: 0, report: { exit_code: 0, outcome: "COMPLETE", reason_text: "All admitted tasks passed.", failed_tasks: [] } }),
    });
    expect(evidence.checks.map((check) => [check.id, check.state])).toEqual([["review", "INCOMPLETE"], ["security", "INCOMPLETE"], ["test", "COMPLETE"]]);
    expect(evidence.overall).toEqual({ state: "INCOMPLETE", exit_code: 4 });
    expect(checkRunFromEvidenceV1(evidence).conclusion).toBe("action_required");
    expect(validatePrEvidenceV1(JSON.stringify(evidence)).ok).toBe(true);
    expect(evidence.head_sha).toMatch(/^[0-9a-f]{40}$/u);
  }, 120_000);

  it("turns a failed test task into a failing check with a finding", async () => {
    const evidence = await collectPrEvidenceV1({
      root: repo, gitleaksPath: null, runTests: true,
      runTestCheck: async () => ({ kind: "report", exit_code: 1, report: { exit_code: 1, outcome: "FINDINGS", reason_text: "A task failed.", failed_tasks: ["test"] } }),
    });
    expect(evidence.overall.state).toBe("FINDINGS");
    expect(evidence.findings).toContainEqual(expect.objectContaining({ check: "test", title: "Task failed: test", path: null }));
    expect(checkRunFromEvidenceV1(evidence).conclusion).toBe("failure");
  }, 120_000);

  it("records tests as not run, never as passed, when they are disabled", async () => {
    const evidence = await collectPrEvidenceV1({ root: repo, gitleaksPath: null, runTests: false });
    expect(evidence.checks.find((check) => check.id === "test")).toMatchObject({ state: "INCOMPLETE", outcome: "NOT_RUN" });
  }, 120_000);
});
