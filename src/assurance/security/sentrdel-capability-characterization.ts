import {
  SENTRDEL_PINNED_REVISION,
  SENTRDEL_PINNED_TREE,
  SENTRDEL_PIN_REF,
} from "./sentrdel-source-pin.js";

export const SENTRDEL_CAPABILITY_SCHEMA_VERSION = 1 as const;

export const SENTRDEL_CAPABILITY_IDS = [
  "config-inspection",
  "dependency-delta",
  "github-actions",
  "iac-generic",
  "mcp-boundary",
  "process-boundary",
  "reproducibility-proof",
  "sast-structural",
  "sbom",
  "secrets-changed",
] as const;

export type SentrdelCapabilityIdV1 =
  (typeof SENTRDEL_CAPABILITY_IDS)[number];

export const SENTRDEL_CAPABILITY_STATUSES = [
  "CHARACTERIZED",
  "NOT_CHARACTERIZED",
  "UNSUPPORTED",
] as const;

export type SentrdelCapabilityStatusV1 =
  (typeof SENTRDEL_CAPABILITY_STATUSES)[number];

export const SENTRDEL_UNKNOWN_TOKENS = [
  "ADVISORY_STALE_UNAVAILABLE",
  "ANALYZER_UNAVAILABLE",
  "FILE_SKIPPED_OVERSIZE",
  "INCOMPLETE_GRAPH",
  "MALFORMED_OUTPUT",
  "MANIFEST_UNSUPPORTED",
  "PARSER_UNSUPPORTED",
  "PERMISSION_DENIED",
  "REACHABILITY_NOT_COMPUTED",
  "TIMEOUT",
  "VERSION_MISMATCH",
] as const;

export type SentrdelUnknownTokenV1 =
  (typeof SENTRDEL_UNKNOWN_TOKENS)[number];

export interface SentrdelEvidenceSemanticsV1 {
  readonly kind: string;
  readonly source: string;
  readonly provenance_requirement: string;
  readonly location_precision: string;
  readonly rule_identity: string;
  readonly reproduction_support: string;
  readonly raw_output_status: string;
}

export interface SentrdelCoverageSemanticsV1 {
  readonly scanned: string;
  readonly unscanned: string;
  readonly supported_languages: string;
  readonly unsupported_languages: string;
  readonly supported_manifests: string;
  readonly unsupported_manifests: string;
  readonly supported_config_formats: string;
  readonly unsupported_config_formats: string;
  readonly rule_coverage: string;
  readonly dependency_coverage: string;
  readonly advisory_freshness: string;
  readonly reachability_state: string;
}

export interface SentrdelCapabilityV1 {
  readonly id: SentrdelCapabilityIdV1;
  readonly status: SentrdelCapabilityStatusV1;
  readonly evidence: SentrdelEvidenceSemanticsV1;
  readonly coverage: SentrdelCoverageSemanticsV1;
  readonly unknown_tokens: readonly SentrdelUnknownTokenV1[];
  readonly supported_scope: string;
  readonly unsupported_scope: string;
  readonly authority_ceiling: "E0_READ_ONLY_ANALYSIS";
  readonly required_inputs: string;
  readonly produced_outputs: string;
  readonly local_offline: "LOCAL_OFFLINE_ONLY";
  readonly external_effects: "NONE_IN_T02";
  readonly absence: "NOT_RUN_OR_INCOMPLETE_NEVER_PASS";
  readonly revision: typeof SENTRDEL_PINNED_REVISION;
  readonly tree: typeof SENTRDEL_PINNED_TREE;
  readonly pin_ref: typeof SENTRDEL_PIN_REF;
  readonly source_refs: readonly string[];
}

function freezeCapability(
  capability: SentrdelCapabilityV1,
): SentrdelCapabilityV1 {
  Object.freeze(capability.evidence);
  Object.freeze(capability.coverage);
  Object.freeze(capability.unknown_tokens);
  Object.freeze(capability.source_refs);
  return Object.freeze(capability);
}

const OBSERVATION_ONLY: SentrdelEvidenceSemanticsV1 = Object.freeze({
  kind: "OBSERVATION_ONLY_NEVER_FINDING",
  source: "SENTRDEL_PINNED_SOURCE_ONLY",
  provenance_requirement: "EXACT_PIN_REVISION_TREE_AND_RULE_ID",
  location_precision: "FILE_AND_LINE_WHEN_PRODUCED_ELSE_SCOPE_ONLY",
  rule_identity: "PINNED_RULE_ID_REQUIRED",
  reproduction_support: "DETERMINISTIC_RESCAN_BY_INPUT_DIGEST",
  raw_output_status: "BOUNDED_UNTRUSTED_INPUT_NEVER_TRUTH",
});

function evidenceWith(
  overrides: Partial<SentrdelEvidenceSemanticsV1>,
): SentrdelEvidenceSemanticsV1 {
  return Object.freeze({ ...OBSERVATION_ONLY, ...overrides });
}

function coverageWith(
  overrides: Partial<SentrdelCoverageSemanticsV1>,
): SentrdelCoverageSemanticsV1 {
  return Object.freeze({
    scanned: "CHANGED_SCOPE_ONLY_EXPLICIT",
    unscanned: "EXPLICIT_NEVER_CLEAN",
    supported_languages: "EXPLICIT_OR_NOT_APPLICABLE",
    unsupported_languages: "EXPLICIT",
    supported_manifests: "EXPLICIT_OR_NOT_APPLICABLE",
    unsupported_manifests: "EXPLICIT",
    supported_config_formats: "EXPLICIT_OR_NOT_APPLICABLE",
    unsupported_config_formats: "EXPLICIT",
    rule_coverage: "BOUNDED_PINNED_RULE_SET",
    dependency_coverage: "EXPLICIT_OR_NOT_APPLICABLE",
    advisory_freshness: "EXPLICIT_FIXTURE_OR_LOOKUP_STATE",
    reachability_state: "EXPLICIT_INCLUDING_NOT_COMPUTED",
    ...overrides,
  });
}

function baseCapability(
  capability: Omit<SentrdelCapabilityV1, "revision" | "tree" | "pin_ref">,
): SentrdelCapabilityV1 {
  return freezeCapability({
    ...capability,
    revision: SENTRDEL_PINNED_REVISION,
    tree: SENTRDEL_PINNED_TREE,
    pin_ref: SENTRDEL_PIN_REF,
  });
}

export function buildSentrdelCapabilitiesV1(): readonly SentrdelCapabilityV1[] {
  const capabilities: SentrdelCapabilityV1[] = [
    baseCapability({
      id: "config-inspection",
      status: "CHARACTERIZED",
      evidence: evidenceWith({
        source: "BOUNDED_NON_EXECUTING_REPO_VIEWS_AND_LAYOUT_SIGNALS",
      }),
      coverage: coverageWith({
        scanned: "CHANGED_FILES_WITHIN_4MIB_AND_4KIB_PATH_BOUNDS",
        supported_languages: "NOT_APPLICABLE_LAYOUT_AND_CONFIG_SIGNALS",
        supported_manifests: "NOT_APPLICABLE",
        supported_config_formats:
          "SUPABASE_LAYOUT_SIGNALS_PLUS_BOUNDED_STATIC_CONFIG_SUBSET",
        unsupported_config_formats:
          "CREDENTIALED_LIVE_POSTURE_HOSTED_STATE_DYNAMIC_VALUES",
        rule_coverage: "BOUNDED_DETECTION_RULES_NO_VERDICT",
        dependency_coverage: "NOT_APPLICABLE",
        advisory_freshness: "NOT_APPLICABLE",
        reachability_state: "NOT_COMPUTED",
      }),
      unknown_tokens: Object.freeze([
        "FILE_SKIPPED_OVERSIZE",
        "MANIFEST_UNSUPPORTED",
        "PARSER_UNSUPPORTED",
        "PERMISSION_DENIED",
        "TIMEOUT",
        "VERSION_MISMATCH",
      ]) as readonly SentrdelUnknownTokenV1[],
      supported_scope:
        "Bounded repository views plus Supabase layout signals and bounded static config subset; detection only, no posture verdict.",
      unsupported_scope:
        "Credentialed live posture, hosted state, dynamic values, and verdicts.",
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
      required_inputs: "CHANGED_SOURCE_AND_CONFIG_BYTES_WITH_INPUT_DIGESTS",
      produced_outputs: "OBSERVATION_AND_COVERAGE_ONLY",
      local_offline: "LOCAL_OFFLINE_ONLY",
      external_effects: "NONE_IN_T02",
      absence: "NOT_RUN_OR_INCOMPLETE_NEVER_PASS",
      source_refs: Object.freeze([
        "crates/sentrdel-review/src/config_detection.rs",
        "crates/sentrdel-review/src/project_detection.rs",
        "crates/sentrdel-review/src/stack_detection.rs",
        "crates/sentrdel-review/src/supabase_detection.rs",
        "crates/sentrdel-review/src/view.rs",
      ]) as readonly string[],
    }),
    baseCapability({
      id: "dependency-delta",
      status: "CHARACTERIZED",
      evidence: evidenceWith({
        source: "LOCKFILE_DELTA_PARSED_AS_UNTRUSTED_DATA_NO_EXECUTION",
      }),
      coverage: coverageWith({
        scanned: "CHANGED_CARGO_AND_NPM_LOCKFILES_WITHIN_8MIB_50K_PACKAGES",
        supported_languages: "NOT_APPLICABLE_MANIFEST_DATA",
        supported_manifests: "CARGO_AND_NPM_LOCKFILES_ONLY",
        unsupported_manifests: "ALL_OTHER_ECOSYSTEMS",
        supported_config_formats: "NOT_APPLICABLE",
        unsupported_config_formats: "NOT_APPLICABLE",
        rule_coverage: "BOUNDED_DELTA_PARSERS",
        dependency_coverage: "DELTA_ONLY_NOT_FULL_GRAPH",
        advisory_freshness:
          "OFFLINE_FIXTURE_UP_TO_10K_OR_EXPLICIT_LOOKUP_UNAVAILABLE_OFFLINE",
        reachability_state: "NOT_COMPUTED",
      }),
      unknown_tokens: Object.freeze([
        "ADVISORY_STALE_UNAVAILABLE",
        "ANALYZER_UNAVAILABLE",
        "FILE_SKIPPED_OVERSIZE",
        "INCOMPLETE_GRAPH",
        "MANIFEST_UNSUPPORTED",
        "REACHABILITY_NOT_COMPUTED",
        "TIMEOUT",
        "VERSION_MISMATCH",
      ]) as readonly SentrdelUnknownTokenV1[],
      supported_scope:
        "Cargo and npm lockfile deltas with offline advisory fixtures and optional OSV-compatible lookup under explicit network policy.",
      unsupported_scope:
        "Other ecosystems, full-graph resolution, reachability, and live advisory guarantees while offline.",
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
      required_inputs: "CHANGED_LOCKFILE_BYTES_WITH_INPUT_DIGESTS",
      produced_outputs: "OBSERVATION_AND_COVERAGE_ONLY",
      local_offline: "LOCAL_OFFLINE_ONLY",
      external_effects: "NONE_IN_T02",
      absence: "NOT_RUN_OR_INCOMPLETE_NEVER_PASS",
      source_refs: Object.freeze([
        "crates/sentrdel-review/src/dependency.rs",
        "crates/sentrdel-review/src/osv.rs",
      ]) as readonly string[],
    }),
    baseCapability({
      id: "github-actions",
      status: "CHARACTERIZED",
      evidence: evidenceWith({
        source: "CHANGED_WORKFLOW_BYTES_PARSED_AS_UNTRUSTED_DATA_NO_EXECUTION",
      }),
      coverage: coverageWith({
        scanned: "CHANGED_WORKFLOW_FILES_WITHIN_512KIB",
        supported_languages: "NOT_APPLICABLE_WORKFLOW_DATA",
        supported_manifests: "NOT_APPLICABLE",
        unsupported_manifests: "NOT_APPLICABLE",
        supported_config_formats: "GITHUB_ACTIONS_WORKFLOWS_STATIC_SUBSET",
        unsupported_config_formats: "OTHER_CI_SYSTEMS_AND_DYNAMIC_BEHAVIOR",
        rule_coverage: "BOUNDED_PERMISSIONS_OIDC_PR_TARGET_SHELL_REF_RUNNER_CACHE_RULES",
        dependency_coverage: "NOT_APPLICABLE",
        advisory_freshness: "NOT_APPLICABLE",
        reachability_state: "NOT_COMPUTED",
      }),
      unknown_tokens: Object.freeze([
        "FILE_SKIPPED_OVERSIZE",
        "PARSER_UNSUPPORTED",
        "PERMISSION_DENIED",
        "TIMEOUT",
        "VERSION_MISMATCH",
      ]) as readonly SentrdelUnknownTokenV1[],
      supported_scope:
        "Static observations for changed GitHub Actions workflows; never executes YAML, actions, shells, or network.",
      unsupported_scope:
        "Other CI systems, runtime behavior, and exploitability verdicts.",
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
      required_inputs: "CHANGED_WORKFLOW_BYTES_WITH_INPUT_DIGESTS",
      produced_outputs: "OBSERVATION_AND_COVERAGE_ONLY",
      local_offline: "LOCAL_OFFLINE_ONLY",
      external_effects: "NONE_IN_T02",
      absence: "NOT_RUN_OR_INCOMPLETE_NEVER_PASS",
      source_refs: Object.freeze([
        "crates/sentrdel-review/src/github_actions.rs",
      ]) as readonly string[],
    }),
    baseCapability({
      id: "iac-generic",
      status: "UNSUPPORTED",
      evidence: evidenceWith({
        source: "NO_GENERIC_IAC_PRODUCER_TRACED_AT_PIN",
      }),
      coverage: coverageWith({
        scanned: "NONE_GENERIC_IAC_NOT_SCANNED",
        supported_languages: "NOT_APPLICABLE",
        supported_manifests: "NOT_APPLICABLE",
        supported_config_formats: "NONE_GENERIC_IAC_NOT_SUPPORTED",
        unsupported_config_formats:
          "TERRAFORM_CLOUDFORMATION_KUBERNETES_DOCKERFILE_AND_GENERAL_IAC",
        rule_coverage: "NO_GENERIC_IAC_RULE_SET_TRACED",
        dependency_coverage: "NOT_APPLICABLE",
        advisory_freshness: "NOT_APPLICABLE",
        reachability_state: "NOT_COMPUTED",
      }),
      unknown_tokens: Object.freeze([
        "MANIFEST_UNSUPPORTED",
        "PARSER_UNSUPPORTED",
      ]) as readonly SentrdelUnknownTokenV1[],
      supported_scope: "None for generic IaC at this pin.",
      unsupported_scope:
        "Generic Terraform, CloudFormation, Kubernetes, Dockerfile, and general IaC scanning; bounded Supabase config and GitHub Actions remain separate capabilities.",
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
      required_inputs: "NOT_APPLICABLE_UNSUPPORTED",
      produced_outputs: "COVERAGE_GAP_ONLY_NEVER_CLEAN",
      local_offline: "LOCAL_OFFLINE_ONLY",
      external_effects: "NONE_IN_T02",
      absence: "NOT_RUN_OR_INCOMPLETE_NEVER_PASS",
      source_refs: Object.freeze([]) as readonly string[],
    }),
    baseCapability({
      id: "mcp-boundary",
      status: "CHARACTERIZED",
      evidence: evidenceWith({
        source: "STDIO_GATEWAY_FRAMING_POLICY_APPROVAL_AND_ASEL_PATH",
      }),
      coverage: coverageWith({
        scanned: "DECLARED_MCP_SURFACE_WITHIN_BOUNDS",
        supported_languages: "NOT_APPLICABLE_PROTOCOL_BOUNDARY",
        supported_manifests: "NOT_APPLICABLE",
        supported_config_formats: "NOT_APPLICABLE",
        unsupported_config_formats: "REMOTE_STREAMABLE_HTTP_MCP",
        rule_coverage: "BOUNDED_FRAMING_POLICY_APPROVAL_RULES",
        dependency_coverage: "NOT_APPLICABLE",
        advisory_freshness: "NOT_APPLICABLE",
        reachability_state: "NOT_COMPUTED",
      }),
      unknown_tokens: Object.freeze([
        "ANALYZER_UNAVAILABLE",
        "PERMISSION_DENIED",
        "TIMEOUT",
        "VERSION_MISMATCH",
      ]) as readonly SentrdelUnknownTokenV1[],
      supported_scope:
        "Stdio-only MCP gateway boundary with deny-by-default credential inheritance; git-hook guard remains partial and advisory.",
      unsupported_scope:
        "Remote or streamable HTTP MCP enforcement and universal interception.",
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
      required_inputs: "DECLARED_MCP_SURFACE_WITH_INPUT_DIGESTS",
      produced_outputs: "BOUNDARY_OBSERVATION_AND_COVERAGE_ONLY",
      local_offline: "LOCAL_OFFLINE_ONLY",
      external_effects: "NONE_IN_T02",
      absence: "NOT_RUN_OR_INCOMPLETE_NEVER_PASS",
      source_refs: Object.freeze([
        "crates/sentrdel-guard/src/mcp/environment.rs",
        "crates/sentrdel-guard/src/mcp/gateway_impl.rs",
        "crates/sentrdel-guard/src/mcp/inventory.rs",
        "crates/sentrdel-guard/src/mcp/protocol.rs",
        "crates/sentrdel-guard/src/mcp/untrusted_content.rs",
      ]) as readonly string[],
    }),
    baseCapability({
      id: "process-boundary",
      status: "CHARACTERIZED",
      evidence: evidenceWith({
        source: "BOUNDED_EXTERNAL_ENGINE_PREFLIGHT_PLUS_STRICT_DECODING",
      }),
      coverage: coverageWith({
        scanned: "BOUNDED_JSON_AND_SARIF_V2_1_0_INPUTS_WITHIN_8MIB_4096_ITEMS_64_RUNS",
        supported_languages: "NOT_APPLICABLE_ENGINE_TRANSPORT",
        supported_manifests: "ENGINE_MANIFEST_WITHIN_BOUNDS",
        supported_config_formats: "NOT_APPLICABLE",
        unsupported_config_formats: "NOT_APPLICABLE",
        rule_coverage: "STRUCTURAL_PREFLIGHT_THEN_TYPED_DECODING",
        dependency_coverage: "NOT_APPLICABLE",
        advisory_freshness: "NOT_APPLICABLE",
        reachability_state: "NOT_COMPUTED",
      }),
      unknown_tokens: Object.freeze([
        "ANALYZER_UNAVAILABLE",
        "MALFORMED_OUTPUT",
        "PERMISSION_DENIED",
        "TIMEOUT",
        "VERSION_MISMATCH",
      ]) as readonly SentrdelUnknownTokenV1[],
      supported_scope:
        "Bounded external-engine transport with explicit argv and scrubbed environments; strict decoding only, no execution in T02.",
      unsupported_scope:
        "Unbounded execution, shell-string commands, ambient environment inheritance, and sandbox guarantees.",
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
      required_inputs: "BOUNDED_ENGINE_BYTES_WITH_TRUSTED_AUTHORITY_AND_DIGESTS",
      produced_outputs: "OBSERVATION_AND_COVERAGE_ONLY",
      local_offline: "LOCAL_OFFLINE_ONLY",
      external_effects: "NONE_IN_T02",
      absence: "NOT_RUN_OR_INCOMPLETE_NEVER_PASS",
      source_refs: Object.freeze([
        "crates/sentrdel-engine/src/adapter.rs",
        "crates/sentrdel-engine/src/boundary.rs",
        "crates/sentrdel-engine/src/bounded_json.rs",
        "crates/sentrdel-engine/src/coverage.rs",
        "crates/sentrdel-engine/src/runner.rs",
      ]) as readonly string[],
    }),
    baseCapability({
      id: "reproducibility-proof",
      status: "CHARACTERIZED",
      evidence: evidenceWith({
        source: "DETERMINISTIC_CORRELATION_WITH_INPUT_DIGEST_BOUND_REPRODUCTION",
      }),
      coverage: coverageWith({
        scanned: "COMPATIBLE_OBSERVATIONS_WITH_STABLE_NON_SECRET_IDENTITY",
        supported_languages: "NOT_APPLICABLE_CORRELATION_SUBSTRATE",
        supported_manifests: "NOT_APPLICABLE",
        supported_config_formats: "NOT_APPLICABLE",
        unsupported_config_formats: "NOT_APPLICABLE",
        rule_coverage: "RUNTIME_OWNED_RECONCILIATION_RULES",
        dependency_coverage: "NOT_APPLICABLE",
        advisory_freshness: "NOT_APPLICABLE",
        reachability_state: "NOT_COMPUTED",
      }),
      unknown_tokens: Object.freeze([
        "INCOMPLETE_GRAPH",
        "VERSION_MISMATCH",
      ]) as readonly SentrdelUnknownTokenV1[],
      supported_scope:
        "Deterministic Evidence correlation with contradictions retained; only reconciler authority mints Findings; reproduction links are input-digest bound.",
      unsupported_scope:
        "Runtime exploit proof, production authorization behavior, and VERIFIED producer claims.",
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
      required_inputs: "EVIDENCE_SET_WITH_DECLARED_INPUT_DIGESTS",
      produced_outputs: "CORRELATION_OBSERVATION_AND_COVERAGE_ONLY",
      local_offline: "LOCAL_OFFLINE_ONLY",
      external_effects: "NONE_IN_T02",
      absence: "NOT_RUN_OR_INCOMPLETE_NEVER_PASS",
      source_refs: Object.freeze([
        "crates/sentrdel-review/src/reconcile.rs",
        "crates/sentrdel-schema/src/evidence.rs",
      ]) as readonly string[],
    }),
    baseCapability({
      id: "sast-structural",
      status: "CHARACTERIZED",
      evidence: evidenceWith({
        source: "RUST_NATIVE_STRUCTURAL_MATCHING_WITH_COMPILED_IN_RULES",
      }),
      coverage: coverageWith({
        scanned: "CHANGED_JAVASCRIPT_AND_TYPESCRIPT_WITHIN_BOUNDS",
        supported_languages: "JAVASCRIPT_AND_TYPESCRIPT_ONLY",
        unsupported_languages: "ALL_OTHER_LANGUAGES",
        supported_manifests: "NOT_APPLICABLE_SOURCE_MATCHING",
        unsupported_manifests: "NOT_APPLICABLE",
        supported_config_formats: "NOT_APPLICABLE",
        unsupported_config_formats: "NOT_APPLICABLE",
        rule_coverage: "BOUNDED_PINNED_RULE_SET_UP_TO_256_RULES",
        dependency_coverage: "NOT_APPLICABLE",
        advisory_freshness: "NOT_APPLICABLE",
        reachability_state: "NOT_COMPUTED",
      }),
      unknown_tokens: Object.freeze([
        "FILE_SKIPPED_OVERSIZE",
        "PARSER_UNSUPPORTED",
        "PERMISSION_DENIED",
        "TIMEOUT",
        "VERSION_MISMATCH",
      ]) as readonly SentrdelUnknownTokenV1[],
      supported_scope:
        "Bounded structural matching for JavaScript and TypeScript with repository content treated as data and no execution.",
      unsupported_scope:
        "All other languages, dynamic grammars, repository-provided rules, and semantic conclusions beyond bounded observations.",
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
      required_inputs: "CHANGED_SOURCE_BYTES_WITH_INPUT_DIGESTS",
      produced_outputs: "OBSERVATION_AND_COVERAGE_ONLY",
      local_offline: "LOCAL_OFFLINE_ONLY",
      external_effects: "NONE_IN_T02",
      absence: "NOT_RUN_OR_INCOMPLETE_NEVER_PASS",
      source_refs: Object.freeze([
        "crates/sentrdel-review/src/structural.rs",
        "crates/sentrdel-review/src/structural_rules.rs",
      ]) as readonly string[],
    }),
    baseCapability({
      id: "sbom",
      status: "NOT_CHARACTERIZED",
      evidence: evidenceWith({
        source: "NO_SBOM_PRODUCER_TRACED_AT_PIN",
      }),
      coverage: coverageWith({
        scanned: "NONE_NO_SBOM_INVENTORY_TRACED",
        supported_languages: "NOT_APPLICABLE",
        supported_manifests: "NONE_TRACED",
        unsupported_manifests: "EXPLICIT_PENDING_T08_SCA_PROOF",
        supported_config_formats: "NOT_APPLICABLE",
        unsupported_config_formats: "NOT_APPLICABLE",
        rule_coverage: "NO_SBOM_RULE_SET_TRACED",
        dependency_coverage: "UNKNOWN_PENDING_T08",
        advisory_freshness: "UNKNOWN_PENDING_T08",
        reachability_state: "NOT_COMPUTED",
      }),
      unknown_tokens: Object.freeze([
        "ANALYZER_UNAVAILABLE",
        "MANIFEST_UNSUPPORTED",
      ]) as readonly SentrdelUnknownTokenV1[],
      supported_scope: "None proven at this pin.",
      unsupported_scope:
        "SBOM inventory and format support remain unproven until T08 SCA work; never treated as clean.",
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
      required_inputs: "NOT_APPLICABLE_UNPROVEN",
      produced_outputs: "COVERAGE_GAP_ONLY_NEVER_CLEAN",
      local_offline: "LOCAL_OFFLINE_ONLY",
      external_effects: "NONE_IN_T02",
      absence: "NOT_RUN_OR_INCOMPLETE_NEVER_PASS",
      source_refs: Object.freeze([]) as readonly string[],
    }),
    baseCapability({
      id: "secrets-changed",
      status: "CHARACTERIZED",
      evidence: evidenceWith({
        source: "CHANGED_BYTES_ONLY_WITH_REDACTION_BEFORE_EVIDENCE",
      }),
      coverage: coverageWith({
        scanned: "CHANGED_BYTES_WITHIN_4MIB_WITH_PINNED_SECRET_RULES",
        supported_languages: "NOT_APPLICABLE_BYTE_PATTERNS",
        supported_manifests: "NOT_APPLICABLE",
        unsupported_manifests: "NOT_APPLICABLE",
        supported_config_formats: "NOT_APPLICABLE",
        unsupported_config_formats: "NOT_APPLICABLE",
        rule_coverage: "BOUNDED_PINNED_SECRET_RULES_WITH_TYPE_LOCATION_FINGERPRINTS",
        dependency_coverage: "NOT_APPLICABLE",
        advisory_freshness: "NOT_APPLICABLE",
        reachability_state: "NOT_COMPUTED",
      }),
      unknown_tokens: Object.freeze([
        "FILE_SKIPPED_OVERSIZE",
        "PERMISSION_DENIED",
        "TIMEOUT",
        "VERSION_MISMATCH",
      ]) as readonly SentrdelUnknownTokenV1[],
      supported_scope:
        "Changed-source secret observations with plaintext never copied into Evidence, fingerprints, locations, diagnostics, or digests.",
      unsupported_scope:
        "Historical scans, stable unkeyed value-only hashes, and persisted plaintext in any form.",
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
      required_inputs: "CHANGED_BYTES_WITH_INPUT_DIGESTS",
      produced_outputs: "REDACTED_OBSERVATION_AND_COVERAGE_ONLY",
      local_offline: "LOCAL_OFFLINE_ONLY",
      external_effects: "NONE_IN_T02",
      absence: "NOT_RUN_OR_INCOMPLETE_NEVER_PASS",
      source_refs: Object.freeze([
        "crates/sentrdel-review/src/secrets.rs",
        "crates/sentrdel-store/src/redaction.rs",
      ]) as readonly string[],
    }),
  ];
  const ordered = [...capabilities].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  for (const capability of ordered) {
    freezeCapability(capability);
  }
  return Object.freeze(ordered);
}

export interface SentrdelCapabilityValidationV1 {
  readonly schema_version: 1;
  readonly valid: boolean;
  readonly reasons: readonly string[];
}

const CAPABILITY_ID_SET = new Set<string>(SENTRDEL_CAPABILITY_IDS);
const UNKNOWN_TOKEN_SET = new Set<string>(SENTRDEL_UNKNOWN_TOKENS);

export function validateSentrdelCapabilitiesV1(
  capabilities: readonly SentrdelCapabilityV1[],
): SentrdelCapabilityValidationV1 {
  const reasons: string[] = [];
  if (capabilities.length !== SENTRDEL_CAPABILITY_IDS.length) {
    reasons.push("capability list must contain exactly the frozen T02 set");
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const capability of capabilities) {
    if (!CAPABILITY_ID_SET.has(capability.id)) {
      reasons.push(`unknown capability id: ${capability.id}`);
    }
    if (seen.has(capability.id)) {
      reasons.push(`duplicate capability id: ${capability.id}`);
    }
    seen.add(capability.id);
    ids.push(capability.id);
    if (capability.revision !== SENTRDEL_PINNED_REVISION) {
      reasons.push(`${capability.id} revision must equal the T01 pin`);
    }
    if (capability.tree !== SENTRDEL_PINNED_TREE) {
      reasons.push(`${capability.id} tree must equal the T01 tree`);
    }
    if (capability.pin_ref !== SENTRDEL_PIN_REF) {
      reasons.push(`${capability.id} pin ref must bind the exact pin`);
    }
    if (capability.authority_ceiling !== "E0_READ_ONLY_ANALYSIS") {
      reasons.push(`${capability.id} ceiling must remain E0_READ_ONLY_ANALYSIS`);
    }
    if (capability.local_offline !== "LOCAL_OFFLINE_ONLY") {
      reasons.push(`${capability.id} must remain local and offline`);
    }
    if (capability.external_effects !== "NONE_IN_T02") {
      reasons.push(`${capability.id} must declare no T02 external effects`);
    }
    if (capability.absence !== "NOT_RUN_OR_INCOMPLETE_NEVER_PASS") {
      reasons.push(`${capability.id} absence must never become PASS`);
    }
    if (capability.evidence.kind !== "OBSERVATION_ONLY_NEVER_FINDING") {
      reasons.push(`${capability.id} evidence must remain observational`);
    }
    if (capability.supported_scope.length === 0) {
      reasons.push(`${capability.id} supported scope must be explicit`);
    }
    if (capability.unsupported_scope.length === 0) {
      reasons.push(`${capability.id} unsupported scope must be explicit`);
    }
    if (capability.unknown_tokens.length === 0) {
      reasons.push(`${capability.id} must expose at least one UNKNOWN token`);
    }
    for (const token of capability.unknown_tokens) {
      if (!UNKNOWN_TOKEN_SET.has(token)) {
        reasons.push(`${capability.id} carries unknown UNKNOWN token: ${token}`);
      }
    }
    if (capability.source_refs.length > 8) {
      reasons.push(`${capability.id} source refs must stay bounded`);
    }
  }
  const ordered = [...ids].sort();
  for (let index = 0; index < ids.length; index += 1) {
    if (ids[index] !== ordered[index]) {
      reasons.push("capabilities must be canonically ordered by id");
      break;
    }
  }
  return {
    schema_version: 1,
    valid: reasons.length === 0,
    reasons: Object.freeze(reasons),
  };
}

export function getSentrdelCapabilityV1(
  capabilities: readonly SentrdelCapabilityV1[],
  id: SentrdelCapabilityIdV1,
): SentrdelCapabilityV1 | undefined {
  return capabilities.find((capability) => capability.id === id);
}

export function canClaimGlobalCleanV1(): boolean {
  return false;
}

export function promotesPassV1(): boolean {
  return false;
}

export function requiresNetworkV1(): boolean {
  return false;
}

export function requiresRustExecutionV1(): boolean {
  return false;
}

export function requiresProcessExecutionV1(): boolean {
  return false;
}
