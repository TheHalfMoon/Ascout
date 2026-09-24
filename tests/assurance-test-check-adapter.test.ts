import { describe, expect, it } from "vitest";

import {
  CHECK_ADAPTER_OBSERVATION_KIND,
  CHECK_ADAPTER_STRATEGY,
  adaptCheckTaskStatusV1,
  isCheckAdapterTerminalObservation,
} from "../src/assurance/test/check-adapter.js";

describe("UA-P05-T02 existing check adapter", () => {
  it("preserves every M1 task status verbatim as observation", () => {
    const statuses = [
      "PASS",
      "FAIL",
      "FLAKY",
      "BLOCKED",
      "ERROR",
      "NOT_APPLICABLE",
      "NOT_RUN",
    ] as const;
    for (const status of statuses) {
      const needsReason =
        status === "BLOCKED" || status === "ERROR" || status === "NOT_RUN";
      const observation = adaptCheckTaskStatusV1({
        task_id: "task:" + status.toLowerCase(),
        status,
        reason_code: needsReason ? "reason:explicit" : null,
        reason_text: needsReason ? "explicit reason" : null,
        profile: "STANDARD",
      });
      expect(observation.schema_version).toBe(1);
      expect(observation.observation_kind).toBe(CHECK_ADAPTER_OBSERVATION_KIND);
      expect(observation.observation_kind).toBe("TEST_OBSERVATION");
      expect(observation.adapter_strategy).toBe(CHECK_ADAPTER_STRATEGY);
      expect(observation.scope).toBe("TEST");
      expect(observation.source_status).toBe(status);
      expect(observation.observed_status).toBe(status);
    }
  });

  it("never converts omitted, blocked, or error states into pass", () => {
    for (const status of ["BLOCKED", "ERROR", "NOT_RUN"] as const) {
      const observation = adaptCheckTaskStatusV1({
        task_id: "task:preserved",
        status,
        reason_code: "reason:explicit",
        reason_text: "explicit reason",
        profile: "QUICK",
      });
      expect(observation.observed_status).not.toBe("PASS");
      expect(observation.observed_status).toBe(status);
    }
  });

  it("keeps flaky visible and never hides it as pass", () => {
    const observation = adaptCheckTaskStatusV1({
      task_id: "task:flaky",
      status: "FLAKY",
      reason_code: null,
      reason_text: null,
      profile: "DEEP",
    });
    expect(observation.observed_status).toBe("FLAKY");
    expect(isCheckAdapterTerminalObservation(observation)).toBe(true);
  });

  it("requires explicit reasons for blocked, error, and not_run", () => {
    for (const status of ["BLOCKED", "ERROR", "NOT_RUN"] as const) {
      expect(() =>
        adaptCheckTaskStatusV1({
          task_id: "task:missing-reason",
          status,
          reason_code: null,
          reason_text: null,
          profile: "STANDARD",
        }),
      ).toThrow(TypeError);
    }
  });

  it("rejects unknown statuses without implying pass", () => {
    expect(() =>
      adaptCheckTaskStatusV1({
        task_id: "task:unknown",
        status: "UNKNOWN" as never,
        reason_code: null,
        reason_text: null,
        profile: "STANDARD",
      }),
    ).toThrow(TypeError);
  });

  it("binds observations to a valid test profile without adding CLI capability", () => {
    const observation = adaptCheckTaskStatusV1({
      task_id: "task:profile-bound",
      status: "PASS",
      reason_code: null,
      reason_text: null,
      profile: "RELEASE",
    });
    expect(observation.profile).toBe("RELEASE");
    expect(observation.plan_visible_fields).toEqual([
      "adapter_strategy",
      "observation_kind",
      "observed_status",
      "profile",
      "reason_code",
      "reason_text",
      "scope",
      "source_status",
      "task_id",
    ]);
    expect(() =>
      adaptCheckTaskStatusV1({
        task_id: "task:bad-profile",
        status: "PASS",
        reason_code: null,
        reason_text: null,
        profile: "UNKNOWN" as never,
      }),
    ).toThrow(TypeError);
  });
});
