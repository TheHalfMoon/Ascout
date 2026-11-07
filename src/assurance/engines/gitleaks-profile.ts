import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { createEngineDescriptorV1 } from "../contracts/engine-descriptor.js";
import type { EngineRegistryEntryV1 } from "../kernel/registry.js";
import {
  ENGINE_PROFILE_HARD_CAPS_V1,
  validateEngineProfileV1,
  type EngineProfileV1,
} from "./engine-profile-v1.js";

export const GITLEAKS_ENGINE_ID = "engine:gitleaks" as const;
export const GITLEAKS_PROFILE_ID = "profile:gitleaks-dir-v1" as const;
export const GITLEAKS_CAPABILITY = "capability:secrets" as const;
export const GITLEAKS_CONFIGURATION_ID = "configuration:gitleaks-ascout-v1" as const;

export interface GitleaksArchiveV1 {
  readonly name: string;
  readonly url: string;
  /** GitHub's SHA-256 of the archive, read from the release API. */
  readonly sha256: string;
  readonly size: number;
  readonly binary: string;
  /**
   * The executable's SHA-256, measured by the Real Engines workflow from this verified archive
   * on both Node versions. Null where no runner exists, so that platform stays unqualified.
   */
  readonly executable_sha256: string | null;
}

/**
 * The one admitted upstream release. Archive digests were read from GitHub's release API
 * on 2026-11-07 and are re-checked against the release's checksum file before any use.
 * The executable's own digest is not pinned: it is measured from a verified archive.
 */
export const GITLEAKS_RELEASE_V1 = Object.freeze({
  version: "8.30.1",
  tag: "v8.30.1",
  tag_commit: "83d9cd684c87d95d656c1458ef04895a7f1cbd8e",
  license_spdx: "MIT",
  repository: "https://github.com/gitleaks/gitleaks",
  published_at: "2026-03-21T02:17:58Z",
  checksums: Object.freeze({
    name: "gitleaks_8.30.1_checksums.txt",
    url: "https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_checksums.txt",
    sha256: "061476c21adaf5441516f96f185c1a4706a83cd6329b9b38762271b3d4a52fae",
  }),
  archives: Object.freeze({
    "linux-x64": archive("linux_x64.tar.gz", "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb", 8_230_402, "gitleaks",
      "88f91962aa2f93ac6ab281d553b9e125f5197bbbce38f9f2437f7299c32e5509"),
    "linux-arm64": archive("linux_arm64.tar.gz", "e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080", 7_601_421, "gitleaks"),
    "darwin-x64": archive("darwin_x64.tar.gz", "dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709", 8_359_235, "gitleaks"),
    "darwin-arm64": archive("darwin_arm64.tar.gz", "b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5", 7_897_593, "gitleaks",
      "ba52fb1bfabbcde42f032afad3d6e0b19dff8ed105229a16e7caa338bbc0e84f"),
    "win32-x64": archive("windows_x64.zip", "d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e", 8_438_883, "gitleaks.exe",
      "17157e2ee8b76fc8b1d8bee607a250e34b8a8023c8bc81822d4b5ee4d78fcb7c"),
    "win32-arm64": archive("windows_arm64.zip", "b95f5e4f5c425cedca7ee203d9afd29597e692c4924a12ed42f970537c72cc0f", 7_701_820, "gitleaks.exe"),
  } satisfies Record<string, GitleaksArchiveV1>),
});

function archive(
  suffix: string,
  sha256: string,
  size: number,
  binary: string,
  executableSha256: string | null = null,
): GitleaksArchiveV1 {
  const name = "gitleaks_8.30.1_" + suffix;
  return Object.freeze({
    name,
    url: "https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/" + name,
    sha256,
    size,
    binary,
    executable_sha256: executableSha256,
  });
}

export type GitleaksPlatformKeyV1 = keyof typeof GITLEAKS_RELEASE_V1.archives;

export function gitleaksArchiveForV1(platform: string, arch: string): GitleaksArchiveV1 | null {
  const key = platform + "-" + arch;
  return Object.hasOwn(GITLEAKS_RELEASE_V1.archives, key)
    ? GITLEAKS_RELEASE_V1.archives[key as GitleaksPlatformKeyV1]
    : null;
}

/** Upstream's default rules, unchanged. The subject repository never supplies configuration. */
export const GITLEAKS_CONFIG_TEXT_V1 = [
  "# Ascout's fixed Gitleaks configuration: the upstream default rules, unchanged.",
  'title = "ascout-gitleaks-v1"',
  "",
  "[extend]",
  "useDefault = true",
  "",
].join("\n");

export const GITLEAKS_CONFIG_SHA256_V1 = createHash("sha256")
  .update(GITLEAKS_CONFIG_TEXT_V1, "utf8")
  .digest("hex");

export const GITLEAKS_CONFIG_FILE_NAME_V1 = "ascout-gitleaks.toml";

/**
 * Writes the fixed configuration into a directory Ascout owns, outside any scanned source,
 * and returns its canonical path. The directory doubles as Gitleaks' ignore-file location,
 * so it must not hold a .gitleaksignore.
 */
export function writeGitleaksConfigV1(directory: string): string {
  const path = join(realpathSync.native(directory), GITLEAKS_CONFIG_FILE_NAME_V1);
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== GITLEAKS_CONFIG_TEXT_V1) {
      throw new Error("an existing Gitleaks configuration differs from Ascout's fixed text");
    }
  } else {
    writeFileSync(path, GITLEAKS_CONFIG_TEXT_V1, { encoding: "utf8", flag: "wx" });
  }
  if (existsSync(join(dirname(path), ".gitleaksignore"))) {
    throw new Error("the Gitleaks configuration directory must not hold a .gitleaksignore");
  }
  return path;
}

export interface GitleaksProfileInputV1 {
  readonly executable_absolute_path: string;
  /** Measured from the executable extracted from a verified archive. */
  readonly executable_sha256: string;
  readonly config_absolute_path: string;
  readonly platform: EngineProfileV1["platform"];
  readonly arch: EngineProfileV1["arch"];
}

/** Gitleaks exits 1 on any error, so findings get their own code. */
export const GITLEAKS_FINDINGS_EXIT_CODE_V1 = 42;

export function createGitleaksProfileV1(input: GitleaksProfileInputV1): EngineProfileV1 {
  const selected = gitleaksArchiveForV1(input.platform, input.arch);
  if (selected === null) throw new TypeError("no admitted Gitleaks archive for this platform");
  return validateEngineProfileV1({
    schema: "ascout-engine-profile/1",
    engine_id: GITLEAKS_ENGINE_ID,
    profile_id: GITLEAKS_PROFILE_ID,
    release_version: GITLEAKS_RELEASE_V1.version,
    platform: input.platform,
    arch: input.arch,
    artifact: {
      source_url: selected.url,
      sha256: input.executable_sha256,
      license_spdx: GITLEAKS_RELEASE_V1.license_spdx,
      provenance_reference: "provenance:gitleaks-v8.30.1-github-release",
      pinned_release_digest: selected.sha256,
    },
    executable_absolute_path: input.executable_absolute_path,
    argv: [
      "dir",
      ".",
      "--config",
      input.config_absolute_path,
      "--report-format",
      "json",
      "--report-path",
      "-",
      "--exit-code",
      String(GITLEAKS_FINDINGS_EXIT_CODE_V1),
      // Replaces Secret and the secret inside Match with REDACTED.
      "--redact",
      // Otherwise a comment in the subject repository could silence a finding.
      "--ignore-gitleaks-allow",
      // Points away from the source root. Gitleaks still reads <source>/.gitleaksignore.
      "--gitleaks-ignore-path",
      dirname(input.config_absolute_path),
      "--no-banner",
      "--no-color",
      "--log-level",
      "error",
    ],
    environment: {},
    config_absolute_path: input.config_absolute_path,
    config_sha256: GITLEAKS_CONFIG_SHA256_V1,
    requested_capabilities: [GITLEAKS_CAPABILITY],
    native_exit_map: {
      "0": "CLEAN",
      "1": "ERROR",
      [String(GITLEAKS_FINDINGS_EXIT_CODE_V1)]: "FINDINGS",
      "126": "ERROR",
    },
    output_format: "gitleaks-json-v1",
    coverage_mode: "whole_directory",
    budget: { ...ENGINE_PROFILE_HARD_CAPS_V1 },
    source_egress: "DENY",
    network: "DENY",
    independence: "DETERMINISTIC_TOOL",
  });
}

/** The registry entry a Gitleaks profile materializes. Qualification stays with the kernel. */
export function gitleaksRegistryEntryV1(profile: EngineProfileV1): EngineRegistryEntryV1 {
  return {
    descriptor: createEngineDescriptorV1({
      engine_id: GITLEAKS_ENGINE_ID,
      engine_kind: "EXTERNAL",
      implementation_identity: {
        implementation_id: "implementation:gitleaks",
        source_identity: "source:gitleaks-v8.30.1",
        version: GITLEAKS_RELEASE_V1.version,
        artifact_sha256: profile.artifact.sha256,
      },
      capabilities: [GITLEAKS_CAPABILITY],
      supported_inputs: ["input:source"],
      supported_outputs: ["output:evidence"],
      effect_classes: ["E0_READ_ONLY_ANALYSIS"],
      requirements: {
        process_required: true,
        network_required: false,
        provider_requirements: [],
        sandbox_required: false,
      },
      configuration_trust_boundary: {
        trusted_configuration_sources: ["config:ascout-gitleaks-v1"],
        advisory_configuration_sources: [],
      },
      license_provenance_state: {
        license_identity: "license:mit",
        provenance_ref: "provenance:gitleaks-v8.30.1-github-release",
        admission_state: "ADMITTED",
      },
      qualification_evidence_refs: [],
      known_limitations: [
        "Gitleaks always applies the source root's .gitleaksignore, which can hide findings.",
        "Gitleaks does not report which files it scanned, so coverage is never complete.",
        "Archives and symbolic links are not scanned.",
        "The upstream default rules allowlist some paths, such as dependency folders and lockfiles.",
      ],
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
    }),
    configuration_identity: {
      configuration_id: GITLEAKS_CONFIGURATION_ID,
      configuration_sha256: GITLEAKS_CONFIG_SHA256_V1,
    },
  };
}
