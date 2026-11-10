import { describe, expect, it } from "vitest";

import { DEFAULT_PR_POLICY, evaluatePolicyV1, parsePrPolicyV1 } from "../src/github/policy.js";
import { buildPrEvidenceV1, checkRunFromEvidenceV1, stateForExitCode, summaryCommentV1, type PrCheckV1 } from "../src/github/pr-evidence.js";

const HEAD = "a".repeat(40);
const c = (id: PrCheckV1["id"], exit: PrCheckV1["exit_code"]): PrCheckV1 => ({ id, exit_code: exit, state: stateForExitCode(exit), outcome: "X", reason: "because" });
const bundle = (review: PrCheckV1["exit_code"], security: PrCheckV1["exit_code"], test: PrCheckV1["exit_code"]) =>
  buildPrEvidenceV1({ ascout_version: "0.2.0", head_sha: HEAD, checks: [c("review", review), c("security", security), c("test", test)], findings: [] });
const testOnly = { required_checks: ["test"] as const, source: "file" as const };
const ctx = (trusted: boolean) => ({ trusted_head_sha: HEAD, evidence_trusted: trusted, details_url: "https://github.com/o/r/actions/runs/1", policy: testOnly });

describe("team policy file", () => {
  it("accepts a valid policy and normalizes the order of required checks", () => {
    expect(parsePrPolicyV1(JSON.stringify({ version: 1, required_checks: ["test", "review"] }))).toEqual({ ok: true, policy: { version: 1, required_checks: ["review", "test"], source: "file" } });
  });

  it.each([
    ["not JSON", "{"],
    ["an array", "[]"],
    ["null", "null"],
    ["a missing version", JSON.stringify({ required_checks: ["test"] })],
    ["an unknown version", JSON.stringify({ version: 2, required_checks: ["test"] })],
    ["a string version", JSON.stringify({ version: "1", required_checks: ["test"] })],
    ["an extra key", JSON.stringify({ version: 1, required_checks: ["test"], allow_findings: true })],
    ["no required checks", JSON.stringify({ version: 1, required_checks: [] })],
    ["required_checks that is not a list", JSON.stringify({ version: 1, required_checks: "test" })],
    ["an unknown check", JSON.stringify({ version: 1, required_checks: ["tests"] })],
    ["a non-string check", JSON.stringify({ version: 1, required_checks: [1] })],
    ["a duplicate check", JSON.stringify({ version: 1, required_checks: ["test", "test"] })],
    ["a file over 16 KiB", JSON.stringify({ version: 1, required_checks: ["test"], pad: "x".repeat(17_000) })],
  ])("refuses %s, so a typo can never weaken the gate", (_label, text) => {
    expect(parsePrPolicyV1(text).ok).toBe(false);
  });

  it("requires every check by default", () => {
    expect(DEFAULT_PR_POLICY.required_checks).toEqual(["review", "security", "test"]);
    expect(evaluatePolicyV1(bundle(4, 4, 0), DEFAULT_PR_POLICY).verdict).toBe("INCOMPLETE");
    expect(evaluatePolicyV1(bundle(0, 0, 0), DEFAULT_PR_POLICY).verdict).toBe("PASS");
  });
});

describe("evaluating evidence against a policy", () => {
  const policy = { version: 1 as const, required_checks: ["test" as const], source: "file" as const };

  it("passes when every required check completed and nothing failed, even if an optional check did not run", () => {
    expect(evaluatePolicyV1(bundle(4, 4, 0), policy)).toEqual({ verdict: "PASS", reasons: [] });
  });

  it("is incomplete when a required check did not run", () => {
    expect(evaluatePolicyV1(bundle(0, 0, 4), policy)).toMatchObject({ verdict: "INCOMPLETE", reasons: ["test: required, but did not complete"] });
  });

  it.each([[1, "findings"], [2, "error"], [3, "source changed"]] as const)("fails on exit %i in an optional check: a real problem is never excused", (exit, words) => {
    const result = evaluatePolicyV1(bundle(exit, 4, 0), policy);
    expect(result.verdict).toBe("FAIL");
    expect(result.reasons.join(" ")).toContain(words);
  });

  it("fails rather than reporting incomplete when a check fails and a required one did not run", () => {
    expect(evaluatePolicyV1(bundle(1, 4, 4), policy).verdict).toBe("FAIL");
  });

  it("never passes with nothing required, even if a caller skips the parser", () => {
    expect(evaluatePolicyV1(bundle(0, 0, 0), { ...policy, required_checks: [] }).verdict).toBe("INCOMPLETE");
  });
});

describe("the check run under a team policy", () => {
  it("turns green for a trusted run when only the required test completed", () => {
    const run = checkRunFromEvidenceV1(bundle(4, 4, 0), ctx(true));
    expect(run.conclusion).toBe("success");
    expect(run.output.title).toBe("Ascout: passed the team policy");
    expect(run.output.summary).toContain("| review | no | incomplete");
    expect(run.output.summary).toContain("| test | yes | complete");
    expect(run.output.summary).toContain("Team policy (.github/ascout-policy.json on the default branch): **PASS**");
  });

  it("still caps a policy pass from untrusted evidence at action_required", () => {
    const run = checkRunFromEvidenceV1(bundle(4, 4, 0), ctx(false));
    expect(run.conclusion).toBe("action_required");
    expect(run.name).toBe("Ascout verification (untrusted)");
  });

  it("fails on findings in an optional check, and is action_required when the required check did not run", () => {
    expect(checkRunFromEvidenceV1(bundle(1, 4, 0), ctx(true)).conclusion).toBe("failure");
    expect(checkRunFromEvidenceV1(bundle(0, 0, 4), ctx(true)).conclusion).toBe("action_required");
  });

  it("computes the verdict from the evidence, so a caller cannot smuggle in a pass", () => {
    const forged = { ...ctx(true), policy: { ...testOnly, verdict: "PASS", reasons: [] } } as Parameters<typeof checkRunFromEvidenceV1>[1];
    expect(checkRunFromEvidenceV1(bundle(4, 4, 4), forged).conclusion).toBe("action_required");
  });

  it("marks required checks in the summary comment and titles it by the policy verdict", () => {
    const body = summaryCommentV1(bundle(4, 4, 0), testOnly);
    expect(body).toContain("### Ascout verification: passed the team policy");
    expect(body).toContain("| security | no | incomplete");
    expect(body).toContain("| test | yes | complete");
  });
});
