import { describe, expect, it } from "vitest";

import {
  admitMobileSequenceV1,
  buildInputArgvV1,
  MOBILE_ACTION_EFFECTS,
  MOBILE_ACTIONS,
  mobileActionCeiling,
  parseMobileActionV1,
} from "../src/assurance/engines/mobile-artemis/actions.js";

describe("ARTEMIS-A4 action validation", () => {
  it("freezes the six bounded actions", () => {
    expect([...MOBILE_ACTIONS]).toEqual([
      "TAP",
      "TYPE",
      "SWIPE",
      "BACK",
      "HOME",
      "APP_LAUNCH",
    ]);
    expect(MOBILE_ACTION_EFFECTS["TAP"]).toBe("DEVICE_INPUT");
    expect(MOBILE_ACTION_EFFECTS["APP_LAUNCH"]).toBe("APP_LAUNCH");
    expect(mobileActionCeiling("TAP")).toBe("E4_BROWSER_OR_APP_INTERACTION");
    expect(mobileActionCeiling("APP_LAUNCH")).toBe("E4_BROWSER_OR_APP_INTERACTION");
  });

  it("accepts well-formed arguments and rejects the rest", () => {
    expect(
      parseMobileActionV1({ kind: "TAP", args: { x: 100, y: 200 } }).ok,
    ).toBe(true);
    expect(
      parseMobileActionV1({ kind: "TAP", args: { x: -1, y: 200 } }).ok,
    ).toBe(false);
    expect(
      parseMobileActionV1({ kind: "TAP", args: { x: 100001, y: 0 } }).ok,
    ).toBe(false);
    expect(
      parseMobileActionV1({ kind: "TYPE", args: { text: "hello world" } }).ok,
    ).toBe(true);
    expect(parseMobileActionV1({ kind: "TYPE", args: { text: "" } }).ok).toBe(
      false,
    );
    expect(
      parseMobileActionV1({ kind: "TYPE", args: { text: "rm -rf $HOME" } }).ok,
    ).toBe(false);
    expect(
      parseMobileActionV1({
        kind: "SWIPE",
        args: { x1: 0, y1: 0, x2: 10, y2: 10, duration_ms: 500 },
      }).ok,
    ).toBe(true);
    expect(
      parseMobileActionV1({
        kind: "SWIPE",
        args: { x1: 0, y1: 0, x2: 10, y2: 10, duration_ms: 20000 },
      }).ok,
    ).toBe(false);
    expect(parseMobileActionV1({ kind: "BACK", args: {} }).ok).toBe(true);
    expect(parseMobileActionV1({ kind: "HOME", args: {} }).ok).toBe(true);
    expect(
      parseMobileActionV1({ kind: "BACK", args: { extra: 1 } }).ok,
    ).toBe(false);
    expect(
      parseMobileActionV1({
        kind: "APP_LAUNCH",
        args: { package: "com.example.app" },
      }).ok,
    ).toBe(true);
    expect(
      parseMobileActionV1({ kind: "APP_LAUNCH", args: { package: "evil;pkg" } })
        .ok,
    ).toBe(false);
    expect(
      parseMobileActionV1({ kind: "TAP", args: { x: 1, y: 2 }, extra: 1 }).ok,
    ).toBe(false);
    expect(parseMobileActionV1({ kind: "FLY", args: {} }).ok).toBe(false);
  });
});

describe("ARTEMIS-A4 minimum-privilege sequence admission", () => {
  it("admits only sequences within budget and admitted effects", () => {
    const tap = { kind: "TAP", args: { x: 1, y: 2 } };
    const launch = { kind: "APP_LAUNCH", args: { package: "com.example.app" } };

    const admitted = admitMobileSequenceV1([tap, tap], ["DEVICE_INPUT"], 10);
    expect(admitted.ok).toBe(true);

    const unadmitted = admitMobileSequenceV1([tap, launch], ["DEVICE_INPUT"], 10);
    expect(unadmitted.ok).toBe(false);

    const overBudget = admitMobileSequenceV1([tap, tap, tap], ["DEVICE_INPUT"], 2);
    expect(overBudget.ok).toBe(false);

    const tooLong = admitMobileSequenceV1(
      Array.from({ length: 65 }, () => tap),
      ["DEVICE_INPUT"],
      1000,
    );
    expect(tooLong.ok).toBe(false);

    const empty = admitMobileSequenceV1([], ["DEVICE_INPUT"], 10);
    expect(empty.ok).toBe(false);
  });
});

describe("ARTEMIS-A4 frozen input argv", () => {
  it("builds exact bounded argv with no shell", () => {
    const tap = parseMobileActionV1({ kind: "TAP", args: { x: 540, y: 1200 } });
    expect(tap.ok).toBe(true);
    if (tap.ok) {
      expect(buildInputArgvV1(tap.value)).toEqual({
        adb: "adb",
        args: ["shell", "input", "tap", "540", "1200"],
      });
    }

    const type = parseMobileActionV1({ kind: "TYPE", args: { text: "hi there" } });
    expect(type.ok).toBe(true);
    if (type.ok) {
      expect(buildInputArgvV1(type.value)).toEqual({
        adb: "adb",
        args: ["shell", "input", "text", "hi%sthere"],
      });
    }

    const back = parseMobileActionV1({ kind: "BACK", args: {} });
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(buildInputArgvV1(back.value)).toEqual({
        adb: "adb",
        args: ["shell", "input", "keyevent", "KEYCODE_BACK"],
      });
    }

    const launch = parseMobileActionV1({
      kind: "APP_LAUNCH",
      args: { package: "com.example.app" },
    });
    expect(launch.ok).toBe(true);
    if (launch.ok) {
      expect(buildInputArgvV1(launch.value)).toEqual({
        adb: "adb",
        args: [
          "shell",
          "monkey",
          "-p",
          "com.example.app",
          "-c",
          "android.intent.category.LAUNCHER",
          "1",
        ],
      });
    }
  });
});
