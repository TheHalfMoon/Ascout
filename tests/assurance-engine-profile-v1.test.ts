import { describe, expect, it } from "vitest";

import {
  ENGINE_PROFILE_HARD_CAPS_V1,
  engineProfileSha256V1,
  validateEngineProfileV1,
} from "../src/assurance/engines/engine-profile-v1.js";

const A = "a".repeat(64);
const B = "b".repeat(64);

function validInput(): Record<string, unknown> {
  return {
    schema: "ascout-engine-profile/1",
    engine_id: "engine:fixture",
    profile_id: "profile:fixture",
    release_version: "1.0.0",
    platform: "linux",
    arch: "x64",
    artifact: {
      source_url: "https://example.invalid/fixture.tar.gz",
      sha256: A,
      license_spdx: "MIT",
      provenance_reference: "provenance:fixture",
      pinned_release_digest: B,
    },
    executable_absolute_path: "/opt/fixture/engine",
    argv: ["--scan", "two words"],
    environment: { LANG: "C", ASCOUT_ENGINE_MODE: "strict" },
    config_absolute_path: "/opt/fixture/config.toml",
    config_sha256: B,
    requested_capabilities: ["capability:a", "capability:b"],
    native_exit_map: { "0": "CLEAN", "1": "FINDINGS" },
    output_format: "ascout-engine/1",
    coverage_mode: "explicit_changed_files",
    budget: { ...ENGINE_PROFILE_HARD_CAPS_V1 },
    source_egress: "DENY",
    network: "DENY",
    independence: "DETERMINISTIC_TOOL",
  };
}

function withField(field: string, value: unknown): Record<string, unknown> {
  return { ...validInput(), [field]: value };
}

function windowsInput(executable: string): Record<string, unknown> {
  return {
    ...validInput(),
    platform: "win32",
    executable_absolute_path: executable,
    config_absolute_path: "C:\\engine\\config.toml",
  };
}

describe("validateEngineProfileV1", () => {
  it("accepts a complete profile and freezes it", () => {
    const profile = validateEngineProfileV1(validInput());
    expect(profile.engine_id).toBe("engine:fixture");
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile.argv)).toBe(true);
    expect(Object.isFrozen(profile.budget)).toBe(true);
  });

  it("gives equal profiles equal digests regardless of key order", () => {
    const left = validateEngineProfileV1(validInput());
    const reversed = Object.fromEntries(Object.entries(validInput()).reverse());
    const right = validateEngineProfileV1(reversed);
    expect(engineProfileSha256V1(left)).toBe(engineProfileSha256V1(right));
    const other = validateEngineProfileV1(withField("argv", ["--other"]));
    expect(engineProfileSha256V1(other)).not.toBe(engineProfileSha256V1(left));
  });

  it("refuses unknown and missing fields", () => {
    expect(() => validateEngineProfileV1(withField("shell", true))).toThrow(TypeError);
    const missing = validInput();
    delete missing.argv;
    expect(() => validateEngineProfileV1(missing)).toThrow(TypeError);
    expect(() => validateEngineProfileV1(null)).toThrow(TypeError);
    expect(() => validateEngineProfileV1([])).toThrow(TypeError);
  });

  it.each([
    ["relative", "engine"],
    ["dot relative", "./engine"],
    ["parent segments", "/opt/../engine"],
    ["double slash network form", "//server/share/engine"],
    ["control character", "/opt/engi\nne"],
    ["not a string", 7],
  ])("refuses a %s executable path on POSIX", (_label, path) => {
    expect(() =>
      validateEngineProfileV1(withField("executable_absolute_path", path)),
    ).toThrow(TypeError);
  });

  it.each([
    ["UNC", "\\\\server\\share\\engine.exe"],
    ["device", "\\\\?\\C:\\engine\\engine.exe"],
    ["drive relative", "C:engine.exe"],
    ["relative", "engine.exe"],
    ["alternate data stream", "C:\\engine\\engine.exe:hidden.exe"],
    ["parent segments", "C:\\engine\\..\\engine.exe"],
    ["command script", "C:\\engine\\engine.cmd"],
    ["batch script", "C:\\engine\\engine.bat"],
    ["extensionless file", "C:\\engine\\engine"],
  ])("refuses a %s executable path on Windows", (_label, path) => {
    expect(() => validateEngineProfileV1(windowsInput(path))).toThrow(TypeError);
  });

  it("accepts a local Windows executable", () => {
    const profile = validateEngineProfileV1(windowsInput("C:\\engine\\engine.exe"));
    expect(profile.platform).toBe("win32");
  });

  it.each([
    "PATH",
    "Path",
    "HOME",
    "NODE_OPTIONS",
    "LD_PRELOAD",
    "DYLD_INSERT_LIBRARIES",
    "GIT_DIR",
    "GITHUB_TOKEN",
    "HTTP_PROXY",
    "BASH_ENV",
    "ASCOUT_ENGINE_",
    "ascout_engine_mode",
    "lang",
  ])("refuses the environment variable %s", (name) => {
    expect(() => validateEngineProfileV1(withField("environment", { [name]: "x" }))).toThrow(
      /forbidden variable name/u,
    );
  });

  it.each([
    ["max_wall_ms", ENGINE_PROFILE_HARD_CAPS_V1.max_wall_ms + 1],
    ["max_stdout_bytes", ENGINE_PROFILE_HARD_CAPS_V1.max_stdout_bytes + 1],
    ["max_stderr_bytes", ENGINE_PROFILE_HARD_CAPS_V1.max_stderr_bytes + 1],
    ["max_input_bytes", ENGINE_PROFILE_HARD_CAPS_V1.max_input_bytes + 1],
    ["max_network_requests", 1],
    ["max_wall_ms", 0],
    ["max_stdout_bytes", 1.5],
  ])("refuses budget %s of %s", (field, value) => {
    expect(() =>
      validateEngineProfileV1(
        withField("budget", { ...ENGINE_PROFILE_HARD_CAPS_V1, [field]: value }),
      ),
    ).toThrow(TypeError);
  });

  it("accepts a budget below the hard caps", () => {
    const profile = validateEngineProfileV1(
      withField("budget", { ...ENGINE_PROFILE_HARD_CAPS_V1, max_wall_ms: 1_000 }),
    );
    expect(profile.budget.max_wall_ms).toBe(1_000);
  });

  it.each([
    ["network", "ALLOW"],
    ["source_egress", "ALLOW"],
    ["independence", "MODEL"],
    ["output_format", "gitleaks-json-v1"],
    ["coverage_mode", "all_files"],
    ["schema", "ascout-engine-profile/2"],
    ["platform", "freebsd"],
    ["arch", "ia32"],
    ["config_sha256", "A".repeat(64)],
    ["argv", ["line\nbreak"]],
    ["argv", "--scan"],
    ["requested_capabilities", []],
    ["requested_capabilities", ["capability:b", "capability:a"]],
    ["native_exit_map", {}],
    ["native_exit_map", { "0": "PASS" }],
    ["native_exit_map", { "256": "CLEAN" }],
    ["native_exit_map", { "-1": "CLEAN" }],
  ])("refuses %s of %j", (field, value) => {
    expect(() => validateEngineProfileV1(withField(field, value))).toThrow(TypeError);
  });

  it("refuses an artifact URL that is not https or carries credentials", () => {
    for (const source_url of [
      "http://example.invalid/a",
      "file:///etc/passwd",
      "https://user:pass@example.invalid/a",
    ]) {
      const artifact = { ...(validInput().artifact as object), source_url };
      expect(() => validateEngineProfileV1(withField("artifact", artifact))).toThrow(TypeError);
    }
  });
});
