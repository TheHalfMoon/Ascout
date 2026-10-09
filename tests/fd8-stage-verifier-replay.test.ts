import { describe, expect, it } from "vitest";
import { summarizeVerifier } from "../scripts/planning/fd8-stage-verifier-replay.mjs";

describe("FD8 pinned planning-verifier observation classification", () => {
  it("does not treat proposed-verifier exit zero as approved source or merge", () => {
    const r = summarizeVerifier(0, "", '{"root":"v2","files":20}\nverify-planning-docs: PASS');
    expect(r.outcome).toBe("PROPOSED_VERIFIER_PASS_ONLY");
    expect(r.exit).toBe(0);
    expect(r.issue_count).toBe(0);
  });
  it("retains bounded, actionable missing-ID and missing-link findings", () => {
    const r = summarizeVerifier(1, "v2/a.md:4: broken link x.md\nv2/a.md:5: identifier ADV-12 is referenced but never defined in v2\n", "");
    expect(r.outcome).toBe("PROPOSED_VERIFIER_FAIL");
    expect(r.issue_count).toBe(2);
    expect(r.examples).toHaveLength(2);
  });
  it("refuses unknown process status and CLI misuse as verification", () => {
    expect(summarizeVerifier(null, "", "").outcome).toBe("VERIFIER_NOT_RUN_OR_UNKNOWN");
    expect(summarizeVerifier(2, "", "").outcome).toBe("VERIFIER_INVOCATION_ERROR");
    expect(summarizeVerifier(3, "", "").outcome).toBe("VERIFIER_INVOCATION_ERROR");
  });
  it("bounds emitted diagnostic examples", () => {
    const r = summarizeVerifier(1, Array(30).fill("broken link " + "x".repeat(300)).join("\n"), "");
    expect(r.issue_count).toBe(30);
    expect(r.examples).toHaveLength(3);
    expect(r.examples.every(x => x.length <= 240)).toBe(true);
  });
});
