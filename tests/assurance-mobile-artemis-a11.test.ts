import { describe, expect, it } from "vitest";

import {
  assertDonorTelemetryOffV1,
  assertSafeArtifactPathV1,
  classifyAdbArgvV1,
  DONOR_TELEMETRY_DEFAULT,
  parseNetworkPolicyV1,
  parseProviderPolicyV1,
  sanitizeUntrustedOutputV1,
} from "../src/assurance/engines/mobile-artemis/hardening.js";

describe("ARTEMIS-A11 network and provider policy", () => {
  it("fails closed with explicit allowlists and justifications", () => {
    expect(
      parseNetworkPolicyV1({ mode: "DENY_ALL", allowlisted_hosts: [], justification: "" }).ok,
    ).toBe(true);
    expect(
      parseNetworkPolicyV1({ mode: "ALLOWLIST", allowlisted_hosts: [], justification: "" }).ok,
    ).toBe(false);
    expect(
      parseNetworkPolicyV1({ mode: "ALLOWLIST", allowlisted_hosts: ["example.com"], justification: "" }).ok,
    ).toBe(true);
    expect(
      parseNetworkPolicyV1({ mode: "ALLOWLIST", allowlisted_hosts: ["http://x/y"], justification: "" }).ok,
    ).toBe(false);
    expect(
      parseNetworkPolicyV1({ mode: "UNRESTRICTED_EXPLICIT", allowlisted_hosts: [], justification: "" }).ok,
    ).toBe(false);
    expect(
      parseNetworkPolicyV1({ mode: "UNRESTRICTED_EXPLICIT", allowlisted_hosts: [], justification: "release lab" }).ok,
    ).toBe(true);
    expect(parseNetworkPolicyV1({ mode: "WIDE_OPEN", allowlisted_hosts: [], justification: "" }).ok).toBe(
      false,
    );
  });

  it("requires explicit screenshot permission and bounded retention", () => {
    const base = { mode: "DENY_ALL", allowlisted_models: [], screenshot_upload: false, retention_days: 30 };
    expect(parseProviderPolicyV1(base).ok).toBe(true);
    expect(parseProviderPolicyV1({ ...base, retention_days: 400 }).ok).toBe(false);
    expect(
      parseProviderPolicyV1({ mode: "ALLOWLIST", allowlisted_models: [], screenshot_upload: false, retention_days: 30 }).ok,
    ).toBe(false);
    expect(
      parseProviderPolicyV1({
        mode: "ALLOWLIST",
        allowlisted_models: ["model:local-1"],
        screenshot_upload: true,
        retention_days: 7,
      }).ok,
    ).toBe(true);
    expect(
      parseProviderPolicyV1({ ...base, screenshot_upload: "yes" }).ok,
    ).toBe(false);
  });
});

describe("ARTEMIS-A11 donor telemetry default", () => {
  it("audits telemetry flags off with offending key names", () => {
    expect(DONOR_TELEMETRY_DEFAULT).toBe("OFF");
    expect(assertDonorTelemetryOffV1({}).ok).toBe(true);
    expect(
      assertDonorTelemetryOffV1({ telemetry_enabled: false, posthog_enabled: false }).ok,
    ).toBe(true);
    const enabled = assertDonorTelemetryOffV1({ telemetry_enabled: true, posthog_enabled: false });
    expect(enabled.ok).toBe(false);
    if (!enabled.ok) expect(enabled.reason).toContain("telemetry_enabled");
    expect(assertDonorTelemetryOffV1(null).ok).toBe(false);
  });
});

describe("ARTEMIS-A11 ADB argv classification", () => {
  it("permits catalog reads and bounded inputs, refuses the rest", () => {
    expect(classifyAdbArgvV1(["adb", "shell", "getprop"])).toEqual({ verdict: "PERMITTED_READ" });
    expect(classifyAdbArgvV1(["adb", "exec-out", "screencap", "-p"])).toEqual({
      verdict: "PERMITTED_READ",
    });
    expect(classifyAdbArgvV1(["adb", "logcat", "-d", "-v", "threadtime"])).toEqual({
      verdict: "PERMITTED_READ",
    });
    expect(
      classifyAdbArgvV1(["adb", "shell", "dumpsys", "package", "com.example.app"]),
    ).toEqual({ verdict: "PERMITTED_READ" });
    expect(classifyAdbArgvV1(["adb", "shell", "dumpsys", "package"])).toEqual({
      verdict: "PERMITTED_READ",
    });
    expect(classifyAdbArgvV1(["adb", "shell", "input", "tap", "540", "1200"])).toEqual({
      verdict: "PERMITTED_INPUT",
    });
    expect(classifyAdbArgvV1(["adb", "shell", "input", "text", "hi%sthere"])).toEqual({
      verdict: "PERMITTED_INPUT",
    });
    expect(
      classifyAdbArgvV1(["adb", "shell", "input", "swipe", "0", "0", "10", "10", "500"]),
    ).toEqual({ verdict: "PERMITTED_INPUT" });
    expect(
      classifyAdbArgvV1(["adb", "shell", "input", "keyevent", "KEYCODE_HOME"]),
    ).toEqual({ verdict: "PERMITTED_INPUT" });
    expect(
      classifyAdbArgvV1(["adb", "shell", "input", "keyevent", "KEYCODE_POWER"]),
    ).toEqual({ verdict: "REFUSED", reason: "argv outside the permitted catalog" });
    expect(
      classifyAdbArgvV1([
        "adb",
        "shell",
        "monkey",
        "-p",
        "com.example.app",
        "-c",
        "android.intent.category.LAUNCHER",
        "1",
      ]),
    ).toEqual({ verdict: "PERMITTED_INPUT" });
    expect(
      classifyAdbArgvV1([
        "adb",
        "shell",
        "monkey",
        "-p",
        "com.example.app",
        "-c",
        "android.intent.category.LAUNCHER",
        "500",
      ]).verdict,
    ).toBe("REFUSED");
    expect(classifyAdbArgvV1(["adb", "shell", "am", "start", "-n", "x/y"]).verdict).toBe("REFUSED");
    expect(classifyAdbArgvV1(["adb", "install", "app.apk"]).verdict).toBe("REFUSED");
    expect(classifyAdbArgvV1(["adb", "shell"]).verdict).toBe("REFUSED");
    expect(classifyAdbArgvV1(["fastboot", "devices"]).verdict).toBe("REFUSED");
  });
});

describe("ARTEMIS-A11 traversal guard and output sanitizer", () => {
  it("contains artifact paths and sanitizes untrusted text", () => {
    expect(assertSafeArtifactPathV1("shots/run-1/shot.png")).toBe("shots/run-1/shot.png");
    expect(() => assertSafeArtifactPathV1("../escape.png")).toThrow();
    expect(() => assertSafeArtifactPathV1("/abs.png")).toThrow();
    expect(() => assertSafeArtifactPathV1("C:\\win.png")).toThrow();
    expect(() => assertSafeArtifactPathV1("a\\b.png")).toThrow();

    const clean = sanitizeUntrustedOutputV1("line one\nline two\tend");
    expect(clean).toEqual({ text: "line one\nline two\tend", truncated: false });
    const stripped = sanitizeUntrustedOutputV1("abc");
    expect(stripped.text).toBe("abc");
    expect(() => sanitizeUntrustedOutputV1("a\0b")).toThrow();
    const big = sanitizeUntrustedOutputV1("x".repeat(1048577));
    expect(big.truncated).toBe(true);
    expect(big.text).toHaveLength(1048576);
  });
});
