import { describe, expect, it } from "vitest";

import { projectMobileRunViewV1 } from "../src/assurance/engines/mobile-artemis/view.js";
import { hashDeviceSerialV1 } from "../src/assurance/engines/mobile-artemis/evidence.js";
import { MOBILE_ARTEMIS_DONOR_SHA } from "../src/assurance/engines/mobile-artemis/descriptor.js";

const DIGEST_A =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DIGEST_B =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function viewInput(overrides: Record<string, unknown> = {}) {
  return {
    run_id: "run:view-1",
    surface: "LAB",
    run_status: "COMPLETED",
    completion_state: "INCOMPLETE",
    blocked_actions: ["action:tap"],
    screenshot_refs: [
      { artifact_id: "artifact:shot-1", kind: "screenshot", sha256: DIGEST_A, byte_length: 33 },
    ],
    timeline_digest: DIGEST_B,
    device_identity_hash: hashDeviceSerialV1("emulator-5554"),
    checkpoints: { total: 2, satisfied: 1, violated: 0, pending: 1 },
    unverified_scope: ["scope:final-goal"],
    authority: {
      admitted_effects: ["DEVICE_INPUT", "DEVICE_READ"],
      donor_sha: MOBILE_ARTEMIS_DONOR_SHA,
      engine_descriptor_digest: DIGEST_A,
    },
    ...overrides,
  };
}

describe("ARTEMIS-A10 run view projection", () => {
  it("projects honest views across all six surfaces", () => {
    for (const surface of ["REVIEW", "TEST", "SECURITY", "CYBER", "ASSURE", "LAB"]) {
      const view = projectMobileRunViewV1(viewInput({ surface }));
      expect(view.ok).toBe(true);
    }
    expect(projectMobileRunViewV1(viewInput({ surface: "CHAT" })).ok).toBe(false);
    const view = projectMobileRunViewV1(viewInput({}));
    expect(view.ok).toBe(true);
    if (view.ok) {
      expect(view.value.unverified_scope).toEqual(["scope:final-goal"]);
      expect(view.value.authority.admitted_effects).toEqual(["DEVICE_INPUT", "DEVICE_READ"]);
      expect(Object.isFrozen(view.value)).toBe(true);
    }
  });

  it("refuses PASS that masks scope, blocks, or open checkpoints", () => {
    const cleanPass = {
      completion_state: "PASS",
      blocked_actions: [],
      unverified_scope: [],
      checkpoints: { total: 1, satisfied: 1, violated: 0, pending: 0 },
    };
    expect(projectMobileRunViewV1(viewInput(cleanPass)).ok).toBe(true);
    expect(
      projectMobileRunViewV1(viewInput({ ...cleanPass, unverified_scope: ["scope:x"] })).ok,
    ).toBe(false);
    expect(
      projectMobileRunViewV1(viewInput({ ...cleanPass, blocked_actions: ["action:x"] })).ok,
    ).toBe(false);
    expect(
      projectMobileRunViewV1(
        viewInput({ ...cleanPass, checkpoints: { total: 1, satisfied: 0, violated: 1, pending: 0 } }),
      ).ok,
    ).toBe(false);
    expect(
      projectMobileRunViewV1(
        viewInput({ ...cleanPass, checkpoints: { total: 1, satisfied: 0, violated: 0, pending: 1 } }),
      ).ok,
    ).toBe(false);
  });

  it("requires hash-only device identity and consistent counts", () => {
    expect(
      projectMobileRunViewV1(viewInput({ device_identity_hash: "emulator-5554" })).ok,
    ).toBe(false);
    expect(
      projectMobileRunViewV1(
        viewInput({ checkpoints: { total: 2, satisfied: 2, violated: 1, pending: 0 } }),
      ).ok,
    ).toBe(false);
    expect(
      projectMobileRunViewV1(
        viewInput({
          authority: {
            admitted_effects: ["DEVICE_READ", "FLY"],
            donor_sha: MOBILE_ARTEMIS_DONOR_SHA,
            engine_descriptor_digest: DIGEST_A,
          },
        }),
      ).ok,
    ).toBe(false);
  });
});
