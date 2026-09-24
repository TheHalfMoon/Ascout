import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  buildWorkflowRunV1,
  recoverWorkflowRunV1,
  resumeWorkflowRunV1,
} from "../src/assurance/workflow/stage-attempt-model.js";

function hex64(seed: string): string {
  return createHash("sha256").update(seed, "utf8").digest("hex");
}

const HEAD = "c".repeat(40);
const NEXT_HEAD = "d".repeat(40);
const RUN = hex64("t03/run");
const POLICY = hex64("t03/policy");
const OTHER_POLICY = hex64("t03/other-policy");

describe("UA-P04-T03 durable stage and attempt model", () => {
  it("builds a run with pending stages", () => {
    const run = buildWorkflowRunV1(RUN, HEAD, POLICY, ["review", "publish"]);
    expect(run).not.toBeNull();
    expect(run?.stages.map((stage) => stage.state)).toEqual([
      "PENDING",
      "PENDING",
    ]);
  });

  it("rejects malformed run construction", () => {
    expect(buildWorkflowRunV1("short", HEAD, POLICY, ["review"])).toBeNull();
    expect(buildWorkflowRunV1(RUN, "bad", POLICY, ["review"])).toBeNull();
    expect(buildWorkflowRunV1(RUN, HEAD, POLICY, ["a", "a"])).toBeNull();
    expect(buildWorkflowRunV1(RUN, HEAD, POLICY, [""])).toBeNull();
  });

  it("preserves incomplete work across resume", () => {
    const run = buildWorkflowRunV1(RUN, HEAD, POLICY, ["review", "publish"]);
    expect(run).not.toBeNull();
    if (run === null) {
      return;
    }
    const resumed = {
      ...run,
      stages: Object.freeze([
        { ...run.stages[0]!, state: "SUCCEEDED" as const, attempts: run.stages[0]!.attempts },
        { ...run.stages[1]!, state: "IN_PROGRESS" as const, attempts: run.stages[1]!.attempts },
      ]),
    };
    const decision = resumeWorkflowRunV1(resumed, HEAD, POLICY);
    expect(decision.preserved_incomplete).toEqual(["publish"]);
    expect(decision.preserved_terminal).toEqual(["review"]);
    expect(decision.revalidation_required).toBe(true);
  });

  it("forces revalidation on changed head without erasing stages", () => {
    const run = buildWorkflowRunV1(RUN, HEAD, POLICY, ["review"]);
    expect(run).not.toBeNull();
    if (run === null) {
      return;
    }
    const decision = resumeWorkflowRunV1(run, NEXT_HEAD, POLICY);
    expect(decision.preserved_incomplete).toEqual(["review"]);
    expect(decision.revalidation_required).toBe(true);
    expect(decision.reasons).toContain("subject head requires revalidation");
  });

  it("forces revalidation on changed policy", () => {
    const run = buildWorkflowRunV1(RUN, HEAD, POLICY, ["review"]);
    expect(run).not.toBeNull();
    if (run === null) {
      return;
    }
    const decision = resumeWorkflowRunV1(run, HEAD, OTHER_POLICY);
    expect(decision.revalidation_required).toBe(true);
    expect(decision.reasons).toContain("policy identity requires revalidation");
  });

  it("recovers a serialized run after a crash", () => {
    const run = buildWorkflowRunV1(RUN, HEAD, POLICY, ["review", "publish"]);
    expect(run).not.toBeNull();
    if (run === null) {
      return;
    }
    const recovery = recoverWorkflowRunV1(JSON.stringify(run));
    expect(recovery.recovered).toBe(true);
    expect(recovery.run).toEqual(run);
  });

  it("fails closed on corrupt snapshots without inventing success", () => {
    expect(recoverWorkflowRunV1("not json").recovered).toBe(false);
    expect(recoverWorkflowRunV1("not json").run).toBeNull();
    expect(recoverWorkflowRunV1(JSON.stringify({})).recovered).toBe(false);
    expect(
      recoverWorkflowRunV1(JSON.stringify({ schema_version: 2 })).recovered,
    ).toBe(false);
  });

  it("keeps resume decisions deterministic", () => {
    const run = buildWorkflowRunV1(RUN, HEAD, POLICY, ["review"]);
    expect(run).not.toBeNull();
    if (run === null) {
      return;
    }
    expect(resumeWorkflowRunV1(run, HEAD, POLICY)).toEqual(
      resumeWorkflowRunV1(run, HEAD, POLICY),
    );
  });
});
