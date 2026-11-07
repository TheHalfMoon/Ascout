import { describe, expect, it } from "vitest";

import { EngineEnvelopeError } from "../src/assurance/engines/engine-envelope-v1.js";
import { engineProfileSha256V1 } from "../src/assurance/engines/engine-profile-v1.js";
import {
  decodeGitleaksReportV1,
  GITLEAKS_COVERAGE_DIAGNOSTIC_V1,
} from "../src/assurance/engines/gitleaks-adapter.js";
import {
  createGitleaksProfileV1,
  GITLEAKS_CAPABILITY,
  GITLEAKS_CONFIG_SHA256_V1,
  GITLEAKS_CONFIG_TEXT_V1,
  GITLEAKS_FINDINGS_EXIT_CODE_V1,
  GITLEAKS_RELEASE_V1,
  gitleaksArchiveForV1,
  gitleaksRegistryEntryV1,
} from "../src/assurance/engines/gitleaks-profile.js";
import { createEngineRegistryV1 } from "../src/assurance/kernel/registry.js";

const PROFILE = createGitleaksProfileV1({
  executable_absolute_path: "/opt/gitleaks/gitleaks",
  executable_sha256: "a".repeat(64),
  config_absolute_path: "/opt/ascout/ascout-gitleaks.toml",
  platform: "linux",
  arch: "x64",
});

const CONTEXT = {
  request_id: "request:1",
  profile: PROFILE,
  profile_sha256: engineProfileSha256V1(PROFILE),
  source: { head_sha: "b".repeat(40), tree_digest: "c".repeat(64) },
  capabilities: [GITLEAKS_CAPABILITY],
  started_at_epoch_ms: 10,
  ended_at_epoch_ms: 20,
};

/** A finding in Gitleaks 8.30.1's JSON shape, as --redact leaves it. No real secret appears. */
function finding(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    RuleID: "github-pat",
    Description: "Uncovered a GitHub Personal Access Token, potentially leading to unauthorized repository access.",
    StartLine: 3,
    EndLine: 3,
    StartColumn: 7,
    EndColumn: 46,
    Match: "token = REDACTED",
    Secret: "REDACTED",
    File: "src/config.js",
    SymlinkFile: "",
    Commit: "",
    Entropy: 4.2,
    Author: "",
    Email: "",
    Date: "",
    Message: "",
    Tags: [],
    Fingerprint: "src/config.js:github-pat:3",
    ...overrides,
  };
}

function decode(value: unknown) {
  return decodeGitleaksReportV1(Buffer.from(JSON.stringify(value), "utf8"), CONTEXT);
}

function errorOf(value: unknown): string {
  try {
    decode(value);
  } catch (error) {
    if (error instanceof EngineEnvelopeError) return error.code;
    throw error;
  }
  return "DECODED";
}

describe("Gitleaks profile", () => {
  it("fixes the command, the findings exit, and the configuration digest", () => {
    expect(PROFILE.output_format).toBe("gitleaks-json-v1");
    expect(PROFILE.argv.slice(0, 2)).toEqual(["dir", "."]);
    for (const flag of ["--redact", "--ignore-gitleaks-allow", "--no-banner"]) {
      expect(PROFILE.argv).toContain(flag);
    }
    expect(PROFILE.argv[PROFILE.argv.indexOf("--report-path") + 1]).toBe("-");
    expect(PROFILE.argv[PROFILE.argv.indexOf("--exit-code") + 1]).toBe(String(GITLEAKS_FINDINGS_EXIT_CODE_V1));
    expect(PROFILE.argv[PROFILE.argv.indexOf("--gitleaks-ignore-path") + 1]).toBe("/opt/ascout");
    expect(PROFILE.native_exit_map).toEqual({ "0": "CLEAN", "1": "ERROR", "42": "FINDINGS", "126": "ERROR" });
    expect(PROFILE.environment).toEqual({});
    expect(PROFILE.config_sha256).toBe(GITLEAKS_CONFIG_SHA256_V1);
    expect(GITLEAKS_CONFIG_TEXT_V1).toContain("useDefault = true");
    expect(PROFILE.artifact.pinned_release_digest).toBe(GITLEAKS_RELEASE_V1.archives["linux-x64"].sha256);
  });

  it("names an archive for each admitted platform and none for others", () => {
    expect(gitleaksArchiveForV1("win32", "x64")?.binary).toBe("gitleaks.exe");
    expect(gitleaksArchiveForV1("darwin", "arm64")?.name).toBe("gitleaks_8.30.1_darwin_arm64.tar.gz");
    expect(gitleaksArchiveForV1("freebsd", "x64")).toBeNull();
    expect(gitleaksArchiveForV1("linux", "constructor")).toBeNull();
    for (const entry of Object.values(GITLEAKS_RELEASE_V1.archives)) {
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(entry.url).toBe("https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/" + entry.name);
    }
  });

  it("materializes a registry entry the kernel accepts", () => {
    const entry = gitleaksRegistryEntryV1(PROFILE);
    const registry = createEngineRegistryV1([entry]);
    expect(registry.entries[0]?.descriptor.implementation_identity.artifact_sha256).toBe("a".repeat(64));
    expect(entry.descriptor.requirements.network_required).toBe(false);
  });
});

describe("decodeGitleaksReportV1", () => {
  it("decodes findings into observations without the secret or the match", () => {
    const envelope = decode([finding()]);
    expect(envelope.observations).toHaveLength(1);
    const [observation] = envelope.observations;
    expect(observation?.rule_id).toBe("github-pat");
    expect(observation?.location).toEqual({ path: "src/config.js", start_line: 3, end_line: 3 });
    expect(observation?.observation_id).toMatch(/^gitleaks:[a-f0-9]{32}$/u);
    expect(JSON.stringify(envelope)).not.toContain("REDACTED");
    expect(JSON.stringify(envelope)).not.toContain("Fingerprint");
  });

  it("never reports complete coverage, even for an empty report", () => {
    for (const report of [[], null]) {
      const envelope = decode(report);
      expect(envelope.observations).toEqual([]);
      expect(envelope.capabilities).toEqual([{ id: GITLEAKS_CAPABILITY, state: "EXECUTED", coverage: "PARTIAL" }]);
      expect(envelope.diagnostics).toEqual([GITLEAKS_COVERAGE_DIAGNOSTIC_V1]);
    }
  });

  it("binds the envelope to the broker's request, profile, and source", () => {
    const envelope = decode([]);
    expect(envelope.request_id).toBe("request:1");
    expect(envelope.profile_sha256).toBe(CONTEXT.profile_sha256);
    expect(envelope.source).toEqual(CONTEXT.source);
    expect(envelope.engine).toEqual({ id: "engine:gitleaks", version: "8.30.1", build: "sha256-" + "a".repeat(32) });
  });

  it("rebases a dot-relative path", () => {
    expect(decode([finding({ File: "./src/config.js" })]).observations[0]?.location?.path).toBe("src/config.js");
  });

  it("rebases a Windows path from a Windows profile", () => {
    const windows = createGitleaksProfileV1({
      executable_absolute_path: "C:\\gitleaks\\gitleaks.exe",
      executable_sha256: "a".repeat(64),
      config_absolute_path: "C:\\ascout\\ascout-gitleaks.toml",
      platform: "win32",
      arch: "x64",
    });
    const envelope = decodeGitleaksReportV1(
      Buffer.from(JSON.stringify([finding({ File: "src\\config.js" })]), "utf8"),
      { ...CONTEXT, profile: windows, profile_sha256: engineProfileSha256V1(windows) },
    );
    expect(envelope.observations[0]?.location?.path).toBe("src/config.js");
  });

  it.each([
    "/etc/passwd",
    "C:/Users/x/config.js",
    "../outside.js",
    "src/../../outside.js",
    "",
    "a\nb",
  ])("keeps the finding but strips the unusable path %j", (file) => {
    const envelope = decode([finding({ File: file })]);
    expect(envelope.observations).toHaveLength(1);
    expect(envelope.observations[0]?.location).toBeNull();
  });

  it.each([
    [{ StartLine: 0 }],
    [{ StartLine: 5, EndLine: 4 }],
  ])("strips a location with unusable lines %j", (lines) => {
    expect(decode([finding(lines)]).observations[0]?.location).toBeNull();
  });

  it("bounds and flattens the description", () => {
    const long = decode([finding({ Description: "x".repeat(600) })]).observations[0]?.message ?? "";
    expect(long.length).toBe(512);
    const flat = decode([finding({ Description: "one\ntwo\u001b[31m" })]).observations[0]?.message;
    expect(flat).toBe("one two [31m");
    expect(decode([finding({ Description: "" })]).observations[0]?.message).toBe("Gitleaks rule github-pat matched.");
  });

  it.each<[string, unknown]>([
    ["an unredacted secret", [finding({ Secret: "plain-value" })]],
    ["a commit, which a directory scan never has", [finding({ Commit: "d".repeat(40) })]],
    ["an unknown field", [finding({ Severity: "high" })]],
    ["a missing field", [Object.fromEntries(Object.entries(finding()).filter(([key]) => key !== "Fingerprint"))]],
    ["a rule ID with spaces", [finding({ RuleID: "my rule" })]],
    ["a non-integer line", [finding({ StartLine: "3" })]],
    ["an object instead of an array", { findings: [] }],
    ["a finding that is not an object", ["text"]],
  ])("refuses %s", (_label, value) => {
    expect(errorOf(value)).toBe("INVALID_ENVELOPE");
  });

  it("refuses bytes that are not UTF-8 JSON", () => {
    for (const bytes of [Buffer.from("not json"), Buffer.from([0xff, 0xfe]), Buffer.alloc(0)]) {
      expect(() => decodeGitleaksReportV1(bytes, CONTEXT)).toThrow(EngineEnvelopeError);
    }
  });

  it("accepts the optional Link field and drops it", () => {
    const envelope = decode([finding({ Link: "https://example.invalid/x" })]);
    expect(JSON.stringify(envelope)).not.toContain("example.invalid");
  });

  it("refuses a finding that carries a raw Fragment", () => {
    expect(errorOf([finding({ Fragment: { Raw: "content" } })])).toBe("INVALID_ENVELOPE");
  });

  it("treats a backslash as part of a file name outside Windows", () => {
    expect(decode([finding({ File: "src\\config.js" })]).observations[0]?.location).toBeNull();
  });
});
