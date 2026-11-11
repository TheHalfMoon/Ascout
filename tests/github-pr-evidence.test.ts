import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { collectPrEvidenceV1 } from "../src/github/collect.js";
import { computeReviewV1 } from "../src/command-functions.js";
import {
  CHECK_RUN_NAME,
  CONCLUSION_BY_STATE,
  PR_EVIDENCE_MAX_FINDINGS,
  SUMMARY_COMMENT_MARKER,
  buildPrEvidenceV1,
  checkRunFromEvidenceV1,
  isOwnSummaryCommentV1,
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
const ctx = { trusted_head_sha: HEAD, evidence_trusted: true, details_url: "https://github.com/o/r/actions/runs/1" };
const bundle = (checks: PrCheckV1[], findings: PrFindingV1[] = []) => buildPrEvidenceV1({ ascout_version: "0.2.0", head_sha: HEAD, checks, findings });

describe("overall state and check-run conclusion", () => {
  it("follows A07 precedence: error, drift, findings, incomplete, complete", () => {
    expect(overallStateV1([c("review", 0), c("security", 4), c("test", 1)])).toBe("FINDINGS");
    expect(overallStateV1([c("review", 3), c("test", 2)])).toBe("ERROR");
    expect(overallStateV1([c("review", 1), c("test", 2)])).toBe("ERROR");
    expect(overallStateV1([c("review", 1), c("test", 3)])).toBe("SOURCE_DRIFT");
    expect(overallStateV1([c("review", 4), c("test", 1)])).toBe("FINDINGS");
    expect(overallStateV1([c("review", 0), c("test", 4)])).toBe("INCOMPLETE");
    expect(overallStateV1([c("review", 0), c("security", 0), c("test", 0)])).toBe("COMPLETE");
    expect(overallStateV1([])).toBe("INCOMPLETE");
  });

  it("is green only when every check completed; incomplete is action_required, never neutral or success", () => {
    expect(CONCLUSION_BY_STATE).toEqual({ COMPLETE: "success", FINDINGS: "failure", ERROR: "failure", SOURCE_DRIFT: "failure", INCOMPLETE: "action_required" });
    expect(checkRunFromEvidenceV1(bundle([c("review", 4), c("security", 4), c("test", 0)]), ctx).conclusion).toBe("action_required");
    expect(checkRunFromEvidenceV1(bundle([c("review", 0), c("security", 0), c("test", 0)]), ctx).conclusion).toBe("success");
  });

  it("annotates only located findings and binds the run to the head commit", () => {
    const run = checkRunFromEvidenceV1(bundle([c("security", 1)], [f(), f({ path: null, start_line: null, end_line: null, title: "Task failed: test" })]), ctx);
    expect(run).toMatchObject({ name: CHECK_RUN_NAME, head_sha: HEAD, status: "completed", conclusion: "failure" });
    expect(run.output.annotations).toEqual([{ path: "src/a.ts", start_line: 3, end_line: 3, annotation_level: "failure", title: "Secret: github-pat", message: "Detected a token." }]);
  });

  it("caps findings at the annotation limit and says more exist", () => {
    const many = Array.from({ length: PR_EVIDENCE_MAX_FINDINGS + 5 }, (_, i) => f({ start_line: i + 1, end_line: i + 1 }));
    const evidence = bundle([c("security", 1)], many);
    expect(evidence.findings).toHaveLength(PR_EVIDENCE_MAX_FINDINGS);
    expect(evidence.findings_truncated).toBe(true);
    expect(checkRunFromEvidenceV1(evidence, ctx).output.summary).toContain("more not shown");
  });
});

describe("validating an untrusted bundle", () => {
  const good = () => JSON.parse(JSON.stringify(bundle([c("review", 4), c("security", 1), c("test", 0)], [f()]))) as Record<string, any>;

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
    const comment = summaryCommentV1(bundle([c("review", 4), c("test", 4)], [f({ path: null, start_line: null, end_line: null, title: "@admin <b>x</b>" })]), { evidence_trusted: true });
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
    expect(checkRunFromEvidenceV1(evidence, { ...ctx, trusted_head_sha: evidence.head_sha }).conclusion).toBe("action_required");
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
    expect(checkRunFromEvidenceV1(evidence, { ...ctx, trusted_head_sha: evidence.head_sha }).conclusion).toBe("failure");
  }, 120_000);

  it("records tests as not run, never as passed, when they are disabled", async () => {
    const evidence = await collectPrEvidenceV1({ root: repo, gitleaksPath: null, runTests: false });
    expect(evidence.checks.find((check) => check.id === "test")).toMatchObject({ state: "INCOMPLETE", outcome: "NOT_RUN" });
  }, 120_000);
});

describe("the independent security review's findings", () => {
  const all = (exit: PrCheckV1["exit_code"]) => bundle([c("review", exit), c("security", exit), c("test", exit)]);

  it("C1: evidence from untrusted PR code can never turn the check green", () => {
    const forged = all(0);
    const run = checkRunFromEvidenceV1(forged, { ...ctx, evidence_trusted: false });
    expect(run.conclusion).toBe("action_required");
    expect(run.output.title).toContain("not trusted");
    expect(run.name).toBe("Ascout verification (untrusted)");
    // Untrusted evidence can still report a failure.
    expect(checkRunFromEvidenceV1(all(1), { ...ctx, evidence_trusted: false }).conclusion).toBe("failure");
  });

  it("H1: the check is bound to the trusted head, and a bundle naming another commit is refused", () => {
    expect(() => checkRunFromEvidenceV1(all(0), { ...ctx, trusted_head_sha: "b".repeat(40) })).toThrow(/different commit/u);
    expect(() => checkRunFromEvidenceV1(all(0), { ...ctx, trusted_head_sha: "not-a-sha" })).toThrow();
    expect(checkRunFromEvidenceV1(all(0), ctx)).toMatchObject({ head_sha: HEAD, details_url: ctx.details_url });
  });

  it("M1: a bundle must report every check", () => {
    const partial = JSON.parse(JSON.stringify(all(0))) as Record<string, any>;
    partial.checks = partial.checks.slice(0, 1);
    partial.overall = { state: "COMPLETE", exit_code: 0 };
    expect(validatePrEvidenceV1(JSON.stringify(partial)).ok).toBe(false);
  });

  it("M2 and L1: bare URLs and named-entity mentions do not become links or pings", () => {
    const text = neutralizeMarkdownV1("see https://evil.example/login or www.evil.example, &commat;admin");
    expect(text).not.toMatch(/https:\/\//u);
    expect(text).not.toMatch(/www\.evil/u);
    expect(text).not.toContain("&commat;");
  });

  it("M3: only the publisher's own comment, starting with the marker, counts as the summary", () => {
    const body = `${SUMMARY_COMMENT_MARKER}\nhello`;
    expect(isOwnSummaryCommentV1({ user: { login: "github-actions[bot]" }, body }, "github-actions[bot]")).toBe(true);
    expect(isOwnSummaryCommentV1({ user: { login: "attacker" }, body }, "github-actions[bot]")).toBe(false);
    expect(isOwnSummaryCommentV1({ user: { login: "github-actions[bot]" }, body: `quote: ${SUMMARY_COMMENT_MARKER}` }, "github-actions[bot]")).toBe(false);
  });

  it("L2: control and bidirectional characters are removed", () => {
    expect(neutralizeMarkdownV1("a‮b\u0085c‏d")).not.toMatch(/[‮\u0085‏]/u);
  });

  it("L3: a finding with an unsafe path loses only its location, and the bundle stays valid", async () => {
    const repo = realpathSync(mkdtempSync(join(tmpdir(), "ascout-pr-l3-")));
    try {
      const git = (...args: string[]) => expect(spawnSync("git", args, { cwd: repo }).status).toBe(0);
      git("init", "-q"); git("config", "user.name", "t"); git("config", "user.email", "t@example.invalid"); git("config", "commit.gpgsign", "false");
      writeFileSync(join(repo, "a.txt"), "a\n"); git("add", "."); git("commit", "-qm", "base");
      const evidence = await collectPrEvidenceV1({
        root: repo, gitleaksPath: null, runTests: true,
        runTestCheck: async () => ({ kind: "report", exit_code: 1, report: { exit_code: 1, outcome: "FINDINGS", reason_text: "x", failed_tasks: ["t".repeat(400)] } }),
      });
      expect(evidence.findings[0]!.title.length).toBeLessThanOrEqual(200);
      expect(validatePrEvidenceV1(JSON.stringify(evidence)).ok).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }, 120_000);
});

describe("PR range review: soft reset to the merge base, bundle names the PR head", () => {
  function prRepo(): { repo: string; prSha: string; baseSha: string; git: (...args: string[]) => string } {
    const repo = realpathSync(mkdtempSync(join(tmpdir(), "ascout-pr-range-")));
    const git = (...args: string[]) => {
      const result = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
      expect(result.status, `git ${args.join(" ")}: ${result.stderr}`).toBe(0);
      return result.stdout.trim();
    };
    git("init", "-q"); git("config", "user.name", "t"); git("config", "user.email", "t@example.invalid"); git("config", "commit.gpgsign", "false");
    writeFileSync(join(repo, "a.txt"), "a\n"); git("add", "."); git("commit", "-qm", "base");
    const baseSha = git("rev-parse", "HEAD");
    writeFileSync(join(repo, "a.txt"), "a\nchanged by the PR\n"); writeFileSync(join(repo, "new.txt"), "new\n");
    git("add", "."); git("commit", "-qm", "pr");
    const prSha = git("rev-parse", "HEAD");
    git("reset", "-q", "--soft", baseSha);
    return { repo, prSha, baseSha, git };
  }

  it("reviews the PR's changes and stamps the verified PR head", async () => {
    const { repo, prSha } = prRepo();
    try {
      const evidence = await collectPrEvidenceV1({ root: repo, gitleaksPath: null, runTests: false, prHead: prSha });
      expect(evidence.head_sha).toBe(prSha);
      const review = evidence.checks.find((check) => check.id === "review")!;
      expect(review.state).toBe("INCOMPLETE");
      const direct = await computeReviewV1(repo);
      expect(direct.kind).toBe("report");
      if (direct.kind === "report") {
        const changes = (direct.report as { unreviewed_changes?: { path: string }[] }).unreviewed_changes ?? [];
        expect(changes.map((change) => change.path).sort()).toEqual(["a.txt", "new.txt"]);
      }
      expect(validatePrEvidenceV1(JSON.stringify(evidence)).ok).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }, 120_000);

  it("refuses to name a PR head the working tree does not match", async () => {
    const { repo, prSha, baseSha } = prRepo();
    try {
      writeFileSync(join(repo, "a.txt"), "tampered\n");
      await expect(collectPrEvidenceV1({ root: repo, gitleaksPath: null, runTests: false, prHead: prSha })).rejects.toThrow(/exactly the pull request head/u);
      await expect(collectPrEvidenceV1({ root: repo, gitleaksPath: null, runTests: false, prHead: baseSha })).rejects.toThrow(/exactly the pull request head/u);
    } finally {
      rmSync(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }, 120_000);

  it("refuses when an untracked, non-ignored file was added to the working tree", async () => {
    const { repo, prSha } = prRepo();
    try {
      writeFileSync(join(repo, "extra.txt"), "smuggled\n");
      await expect(collectPrEvidenceV1({ root: repo, gitleaksPath: null, runTests: false, prHead: prSha })).rejects.toThrow(/exactly the pull request head/u);
    } finally {
      rmSync(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }, 120_000);
});
