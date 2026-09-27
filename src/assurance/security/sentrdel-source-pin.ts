export const SENTRDEL_SOURCE_PIN_SCHEMA_VERSION = 1 as const;

export const SENTRDEL_REPOSITORY = "TheHalfMoon/Sentrdel" as const;

export const SENTRDEL_PINNED_REVISION =
  "f5747319a50831ef7cee983d253c0ca5503c9a64" as const;

export const SENTRDEL_PINNED_TREE =
  "0d70de477fa403a416a8cff5576498e4c59a1689" as const;

export const SENTRDEL_PIN_SUBJECT =
  "Merge PR #333: make Sentrdel developer-first and adoption-ready" as const;

export const SENTRDEL_COMMIT_AUTHOR = "Abdulaziz M. Shehri" as const;

export const SENTRDEL_COMMIT_DATE = "2026-09-16T06:38:28Z" as const;

export const SENTRDEL_VISIBILITY = "public" as const;

export const SENTRDEL_LICENSE = "Apache-2.0" as const;

export const SENTRDEL_LICENSE_BLOB_SHA =
  "45d3d38717ab6e5fd41a53a9b14184d0e93f1007" as const;

export const SENTRDEL_WORKSPACE_VERSION = "0.0.0" as const;

export const SENTRDEL_RUST_TOOLCHAIN = "1.98.0" as const;

export const SENTRDEL_PIN_REF =
  "provenance:sentrdel-pin-f5747319a50831ef7cee983d253c0ca5503c9a64" as const;

export const SENTRDEL_DONOR_LICENSE = "Apache-2.0" as const;

export const SENTRDEL_DONOR_NOTICE_STATUS = "ABSENT_AT_PIN" as const;

export const SENTRDEL_SELECTED_PATH_LICENSE_STATUS =
  "INHERITS_WORKSPACE_APACHE_2_0_NO_NESTED_LICENSE" as const;

export const SENTRDEL_DEPENDENCY_LICENSE_STATUS =
  "WORKSPACE_DECLARED_PERMISSIVE_WITH_DEFERRED_TRANSITIVE_AUDIT" as const;

export const SENTRDEL_INTEGRATION_MODES = ["REFERENCE_ONLY"] as const;

export type SentrdelIntegrationModeV1 =
  (typeof SENTRDEL_INTEGRATION_MODES)[number];

export const SENTRDEL_PIN_STATUSES = ["CHARACTERIZED"] as const;

export type SentrdelPinStatusV1 = (typeof SENTRDEL_PIN_STATUSES)[number];

export const SENTRDEL_FRESHNESS_VALUES = ["UNCHANGED"] as const;

export type SentrdelFreshnessV1 = (typeof SENTRDEL_FRESHNESS_VALUES)[number];

export const SENTRDEL_SELECTED_SOURCE_PATHS = [
  "Cargo.toml",
  "Cargo.lock",
  "rust-toolchain.toml",
  "deny.toml",
  "crates/sentrdel-schema",
  "crates/sentrdel-engine",
  "crates/sentrdel-policy",
  "crates/sentrdel-review",
  "crates/sentrdel-verify",
  "crates/sentrdel-store",
  "crates/sentrdel-graph",
  "crates/sentrdel-guard",
  "crates/sentrdel-cli",
  "schemas/v1",
  "docs/architecture/r1-evidence-control-plane.md",
  "docs/security/threat-model.md",
  "docs/security/dependency-policy.md",
] as const;

export type SentrdelSelectedSourcePathV1 =
  (typeof SENTRDEL_SELECTED_SOURCE_PATHS)[number];

export const SENTRDEL_OUTPUT_SCHEMA_IDS = [
  "asel-event.schema.json",
  "coverage.schema.json",
  "engine-manifest.schema.json",
  "engine-run.schema.json",
  "evidence.schema.json",
  "finding.schema.json",
  "graph-edge.schema.json",
  "graph-node.schema.json",
  "policy-decision.schema.json",
  "project-profile.schema.json",
  "reasoner-evidence.schema.json",
  "security-pack-manifest.schema.json",
] as const;

export interface SentrdelSourcePinV1 {
  readonly schema_version: 1;
  readonly repository: typeof SENTRDEL_REPOSITORY;
  readonly revision: typeof SENTRDEL_PINNED_REVISION;
  readonly tree: typeof SENTRDEL_PINNED_TREE;
  readonly subject: typeof SENTRDEL_PIN_SUBJECT;
  readonly license: typeof SENTRDEL_LICENSE;
  readonly license_blob_sha: typeof SENTRDEL_LICENSE_BLOB_SHA;
  readonly root_notice: null;
  readonly root_third_party_notices: null;
  readonly donor_license: typeof SENTRDEL_DONOR_LICENSE;
  readonly donor_notice_status: typeof SENTRDEL_DONOR_NOTICE_STATUS;
  readonly selected_path_license_status: typeof SENTRDEL_SELECTED_PATH_LICENSE_STATUS;
  readonly dependency_license_status: typeof SENTRDEL_DEPENDENCY_LICENSE_STATUS;
  readonly selected_source_paths: readonly SentrdelSelectedSourcePathV1[];
  readonly output_schema_ids: readonly string[];
  readonly rust_toolchain: typeof SENTRDEL_RUST_TOOLCHAIN;
  readonly workspace_version: typeof SENTRDEL_WORKSPACE_VERSION;
  readonly npm_dependency_implication: "NONE";
  readonly integration_mode: SentrdelIntegrationModeV1;
  readonly freshness: SentrdelFreshnessV1;
  readonly status: SentrdelPinStatusV1;
  readonly pin_ref: typeof SENTRDEL_PIN_REF;
}

const GIT_SHA1_HEX = /^[a-f0-9]{40}$/u;
const BLOB_SHA1_HEX = /^[a-f0-9]{40}$/u;

export function buildSentrdelSourcePinV1(): SentrdelSourcePinV1 {
  return Object.freeze({
    schema_version: SENTRDEL_SOURCE_PIN_SCHEMA_VERSION,
    repository: SENTRDEL_REPOSITORY,
    revision: SENTRDEL_PINNED_REVISION,
    tree: SENTRDEL_PINNED_TREE,
    subject: SENTRDEL_PIN_SUBJECT,
    license: SENTRDEL_LICENSE,
    license_blob_sha: SENTRDEL_LICENSE_BLOB_SHA,
    root_notice: null,
    root_third_party_notices: null,
    donor_license: SENTRDEL_DONOR_LICENSE,
    donor_notice_status: SENTRDEL_DONOR_NOTICE_STATUS,
    selected_path_license_status: SENTRDEL_SELECTED_PATH_LICENSE_STATUS,
    dependency_license_status: SENTRDEL_DEPENDENCY_LICENSE_STATUS,
    selected_source_paths: Object.freeze([
      ...SENTRDEL_SELECTED_SOURCE_PATHS,
    ]) as readonly SentrdelSelectedSourcePathV1[],
    output_schema_ids: Object.freeze([
      ...SENTRDEL_OUTPUT_SCHEMA_IDS,
    ]) as readonly string[],
    rust_toolchain: SENTRDEL_RUST_TOOLCHAIN,
    workspace_version: SENTRDEL_WORKSPACE_VERSION,
    npm_dependency_implication: "NONE" as const,
    integration_mode: "REFERENCE_ONLY" as const,
    freshness: "UNCHANGED" as const,
    status: "CHARACTERIZED" as const,
    pin_ref: SENTRDEL_PIN_REF,
  });
}

export interface SentrdelPinValidationV1 {
  readonly schema_version: 1;
  readonly valid: boolean;
  readonly reasons: readonly string[];
}

export function validateSentrdelSourcePinV1(
  pin: SentrdelSourcePinV1,
): SentrdelPinValidationV1 {
  const reasons: string[] = [];
  if (pin.schema_version !== 1) {
    reasons.push("schema version must be 1");
  }
  if (pin.repository !== SENTRDEL_REPOSITORY) {
    reasons.push("repository must be TheHalfMoon/Sentrdel");
  }
  if (!GIT_SHA1_HEX.test(pin.revision)) {
    reasons.push("revision must be a 40 character lowercase hex commit");
  }
  if (pin.revision !== SENTRDEL_PINNED_REVISION) {
    reasons.push("revision must equal the live-verified Sentrdel pin");
  }
  if (!GIT_SHA1_HEX.test(pin.tree)) {
    reasons.push("tree must be a 40 character lowercase hex tree");
  }
  if (pin.tree !== SENTRDEL_PINNED_TREE) {
    reasons.push("tree must equal the live-verified Sentrdel tree");
  }
  if (pin.subject !== SENTRDEL_PIN_SUBJECT) {
    reasons.push("subject must equal the pinned merge subject");
  }
  if (pin.license !== SENTRDEL_LICENSE) {
    reasons.push("license must be Apache-2.0");
  }
  if (!BLOB_SHA1_HEX.test(pin.license_blob_sha)) {
    reasons.push("license blob sha must be a 40 character hex digest");
  }
  if (pin.license_blob_sha !== SENTRDEL_LICENSE_BLOB_SHA) {
    reasons.push("license blob sha must equal the pinned LICENSE blob");
  }
  if (pin.root_notice !== null) {
    reasons.push("root notice must be absent (null) at this pin");
  }
  if (pin.root_third_party_notices !== null) {
    reasons.push("root third-party notices must be absent (null) at this pin");
  }
  if (pin.donor_license !== SENTRDEL_DONOR_LICENSE) {
    reasons.push("donor license must be Apache-2.0");
  }
  if (pin.donor_notice_status !== SENTRDEL_DONOR_NOTICE_STATUS) {
    reasons.push("donor notice status must be ABSENT_AT_PIN");
  }
  if (
    pin.selected_path_license_status !== SENTRDEL_SELECTED_PATH_LICENSE_STATUS
  ) {
    reasons.push("selected path license status mismatch");
  }
  if (pin.dependency_license_status !== SENTRDEL_DEPENDENCY_LICENSE_STATUS) {
    reasons.push("dependency license status mismatch");
  }
  if (pin.selected_source_paths.length === 0) {
    reasons.push("selected source paths must be non-empty");
  }
  if (!pin.selected_source_paths.includes("crates/sentrdel-schema")) {
    reasons.push("selected paths must include crates/sentrdel-schema");
  }
  if (!pin.selected_source_paths.includes("crates/sentrdel-engine")) {
    reasons.push("selected paths must include crates/sentrdel-engine");
  }
  if (!pin.selected_source_paths.includes("schemas/v1")) {
    reasons.push("selected paths must include schemas/v1");
  }
  if (pin.output_schema_ids.length !== 12) {
    reasons.push("output schema ids must list the 12 pinned v1 schemas");
  }
  if (pin.rust_toolchain !== SENTRDEL_RUST_TOOLCHAIN) {
    reasons.push("rust toolchain must be 1.98.0");
  }
  if (pin.workspace_version !== SENTRDEL_WORKSPACE_VERSION) {
    reasons.push("workspace version must be 0.0.0");
  }
  if (pin.npm_dependency_implication !== "NONE") {
    reasons.push("T01 must carry no npm dependency implication");
  }
  if (pin.integration_mode !== "REFERENCE_ONLY") {
    reasons.push("T01 integration mode must be REFERENCE_ONLY");
  }
  if (pin.freshness !== "UNCHANGED") {
    reasons.push("freshness must be UNCHANGED at this pin");
  }
  if (pin.status !== "CHARACTERIZED") {
    reasons.push("status must be CHARACTERIZED");
  }
  if (pin.pin_ref !== SENTRDEL_PIN_REF) {
    reasons.push("pin ref must bind the exact Sentrdel revision");
  }
  return {
    schema_version: 1,
    valid: reasons.length === 0,
    reasons: Object.freeze(reasons),
  };
}
