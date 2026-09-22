import { describe, expect, it } from "vitest";

import {
  admitMobileToolCallV1,
  MOBILE_TOOL_DESCRIPTIONS,
  MOBILE_TOOL_EFFECTS,
  MOBILE_TOOLS,
  mobileCliVerbV1,
  validateMobileToolArgsV1,
} from "../src/assurance/engines/mobile-artemis/interface.js";

const TAP = { kind: "TAP", args: { x: 1, y: 2 } };

function planArgs() {
  return {
    plan: {
      plan_id: "plan:run-1",
      goal: "Observe the home screen",
      steps: [{ step_id: "s1", role: "OPERATOR", action: TAP, checkpoint_after: false }],
    },
    max_steps: 10,
  };
}

describe("ARTEMIS-A9 governed tool catalog", () => {
  it("freezes eight Ascout-owned tools with no raw donor namespace", () => {
    expect([...MOBILE_TOOLS]).toEqual([
      "mobile_doctor",
      "mobile_devices",
      "mobile_run",
      "mobile_status",
      "mobile_cancel",
      "mobile_evidence",
      "mobile_replay",
      "mobile_diagnose",
    ]);
    for (const tool of MOBILE_TOOLS) {
      expect(tool.startsWith("mobile_")).toBe(true);
      expect(tool.includes("artemis")).toBe(false);
      expect(MOBILE_TOOL_DESCRIPTIONS[tool].length).toBeGreaterThan(0);
    }
    expect(MOBILE_TOOL_EFFECTS["mobile_run"]).toBe("DEVICE_INPUT");
    expect(MOBILE_TOOL_EFFECTS["mobile_doctor"]).toBe("DEVICE_READ");
  });

  it("maps tools to CLI verbs without product expansion", () => {
    expect(mobileCliVerbV1("mobile_doctor")).toBe("mobile doctor");
    expect(mobileCliVerbV1("mobile_run")).toBe("mobile run");
    expect(mobileCliVerbV1("mobile_diagnose")).toBe("mobile diagnose");
  });
});

describe("ARTEMIS-A9 tool argument validation", () => {
  it("validates each tool's arguments with exact keys", () => {
    expect(validateMobileToolArgsV1("mobile_doctor", {}, 10).ok).toBe(true);
    expect(validateMobileToolArgsV1("mobile_doctor", { x: 1 }, 10).ok).toBe(false);
    expect(validateMobileToolArgsV1("mobile_status", { run_id: "run:1" }, 10).ok).toBe(true);
    expect(validateMobileToolArgsV1("mobile_status", {}, 10).ok).toBe(false);
    expect(validateMobileToolArgsV1("mobile_cancel", { run_id: "run:1" }, 10).ok).toBe(true);
    expect(validateMobileToolArgsV1("mobile_evidence", { run_id: "run:1" }, 10).ok).toBe(true);
    expect(validateMobileToolArgsV1("mobile_diagnose", { run_id: "run:1" }, 10).ok).toBe(true);
    expect(validateMobileToolArgsV1("mobile_run", planArgs(), 10).ok).toBe(true);
    expect(validateMobileToolArgsV1("mobile_run", { plan: {}, max_steps: 10 }, 10).ok).toBe(false);
    expect(
      validateMobileToolArgsV1("mobile_replay", { run_id: "run:1", from_step: 2 }, 10).ok,
    ).toBe(true);
    expect(
      validateMobileToolArgsV1("mobile_replay", { run_id: "run:1", from_step: -1 }, 10).ok,
    ).toBe(false);
    expect(validateMobileToolArgsV1("mobile_run", null, 10).ok).toBe(false);
  });
});

describe("ARTEMIS-A9 effect-routed admission", () => {
  it("admits only known tools with admitted effects and valid args", () => {
    const admitted = admitMobileToolCallV1("mobile_doctor", {}, ["DEVICE_READ"], 10);
    expect(admitted).toEqual({ admitted: true, tool: "mobile_doctor", effect: "DEVICE_READ" });

    expect(
      admitMobileToolCallV1("mobile_run", planArgs(), ["DEVICE_READ"], 10),
    ).toEqual({ admitted: false, reason: "effect DEVICE_INPUT not admitted for mobile_run" });

    const runAdmitted = admitMobileToolCallV1(
      "mobile_run",
      planArgs(),
      ["DEVICE_READ", "DEVICE_INPUT"],
      10,
    );
    expect(runAdmitted).toEqual({ admitted: true, tool: "mobile_run", effect: "DEVICE_INPUT" });

    expect(admitMobileToolCallV1("artemis.raw", {}, ["DEVICE_READ"], 10)).toEqual({
      admitted: false,
      reason: "unknown mobile tool",
    });
    expect(admitMobileToolCallV1("mobile_status", {}, ["DEVICE_READ"], 10).admitted).toBe(false);
  });
});
