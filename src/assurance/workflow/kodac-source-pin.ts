export const KODAC_SOURCE_PIN_SCHEMA_VERSION = 1 as const;

export const KODAC_REPOSITORY = "TheHalfMoon/Kodac" as const;

export const KODAC_PINNED_REVISION =
  "406b335277f2df1e3dedf24cdb45847dff919d44" as const;

export const KODAC_PINNED_TREE =
  "0213c3ffc952336b92ab0fc03f62937396619133" as const;

export const KODAC_PLANNING_REVISION =
  "406b335277f2df1e3dedf24cdb45847dff919d44" as const;

export const KODAC_LICENSE = "Apache-2.0" as const;

export const KODAC_LICENSE_BLOB_SHA =
  "261eeb9e9f8b2b4b0d119366dda99c6fd7d35c64" as const;

export const KODAC_FRESHNESS_VALUES = [
  "UNCHANGED",
  "ADVANCED",
  "UNKNOWN",
] as const;

export type KodacFreshnessV1 = (typeof KODAC_FRESHNESS_VALUES)[number];

export const KODAC_INTEGRATION_MODES = ["PATTERN_ONLY"] as const;

export type KodacIntegrationModeV1 =
  (typeof KODAC_INTEGRATION_MODES)[number];

export const KODAC_PIN_STATUSES = ["CHARACTERIZED"] as const;

export type KodacPinStatusV1 = (typeof KODAC_PIN_STATUSES)[number];

export interface KodacSourcePinV1 {
  readonly schema_version: 1;
  readonly repository: typeof KODAC_REPOSITORY;
  readonly revision: typeof KODAC_PINNED_REVISION;
  readonly tree: typeof KODAC_PINNED_TREE;
  readonly license: typeof KODAC_LICENSE;
  readonly license_blob_sha: typeof KODAC_LICENSE_BLOB_SHA;
  readonly root_notice: null;
  readonly package_notices: readonly string[];
  readonly planning_revision: typeof KODAC_PLANNING_REVISION;
  readonly freshness: KodacFreshnessV1;
  readonly npm_dependency_implication: "NONE";
  readonly integration_mode: KodacIntegrationModeV1;
  readonly status: KodacPinStatusV1;
}

const GIT_SHA1_HEX = /^[a-f0-9]{40}$/u;
const GIT_TREE_HEX = /^[a-f0-9]{40}$/u;
const BLOB_SHA1_HEX = /^[a-f0-9]{40}$/u;

export function buildKodacSourcePinV1(): KodacSourcePinV1 {
  return {
    schema_version: KODAC_SOURCE_PIN_SCHEMA_VERSION,
    repository: KODAC_REPOSITORY,
    revision: KODAC_PINNED_REVISION,
    tree: KODAC_PINNED_TREE,
    license: KODAC_LICENSE,
    license_blob_sha: KODAC_LICENSE_BLOB_SHA,
    root_notice: null,
    package_notices: Object.freeze([
      "packages/kodac-runtime/THIRD_PARTY_NOTICES.md",
    ]),
    planning_revision: KODAC_PLANNING_REVISION,
    freshness: "UNCHANGED",
    npm_dependency_implication: "NONE",
    integration_mode: "PATTERN_ONLY",
    status: "CHARACTERIZED",
  };
}

export interface KodacPinValidationV1 {
  readonly schema_version: 1;
  readonly valid: boolean;
  readonly reasons: readonly string[];
}

export function validateKodacSourcePinV1(
  pin: KodacSourcePinV1,
): KodacPinValidationV1 {
  const reasons: string[] = [];
  if (pin.schema_version !== 1) {
    reasons.push("schema version must be 1");
  }
  if (pin.repository !== KODAC_REPOSITORY) {
    reasons.push("repository must be TheHalfMoon/Kodac");
  }
  if (!GIT_SHA1_HEX.test(pin.revision)) {
    reasons.push("revision must be a 40 character lowercase hex commit");
  }
  if (!GIT_TREE_HEX.test(pin.tree)) {
    reasons.push("tree must be a 40 character lowercase hex tree");
  }
  if (pin.license !== KODAC_LICENSE) {
    reasons.push("license must be Apache-2.0");
  }
  if (!BLOB_SHA1_HEX.test(pin.license_blob_sha)) {
    reasons.push("license blob sha must be a 40 character hex digest");
  }
  if (pin.root_notice !== null) {
    reasons.push("root notice must be absent (null)");
  }
  if (pin.revision !== pin.planning_revision) {
    reasons.push("revision must equal the planning revision for UNCHANGED");
  }
  if (pin.freshness !== "UNCHANGED") {
    reasons.push("freshness must be UNCHANGED at this pin");
  }
  if (pin.npm_dependency_implication !== "NONE") {
    reasons.push("T01 must carry no npm dependency implication");
  }
  if (pin.integration_mode !== "PATTERN_ONLY") {
    reasons.push("T01 integration mode must be PATTERN_ONLY");
  }
  if (pin.status !== "CHARACTERIZED") {
    reasons.push("status must be CHARACTERIZED");
  }
  return {
    schema_version: 1,
    valid: reasons.length === 0,
    reasons: Object.freeze(reasons),
  };
}
