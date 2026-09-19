import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  ASSURANCE_EFFECT_CLASSES,
  ASSURANCE_SCOPES,
  type AssuranceEffectClass,
  type AssuranceScope,
} from "./intent.js";

export const ASSURANCE_POLICY_SCHEMA_VERSION = 1 as const;

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const MAX_POLICY_SOURCES = 64;
const MAX_MANDATORY_CHECKS = 256;

export const TRUSTED_POLICY_SOURCE_KINDS = [
  "CANONICAL_REPOSITORY",
  "TRUSTED_USER",
  "TRUSTED_ORGANIZATION",
] as const;

export type TrustedPolicySourceKind =
  (typeof TRUSTED_POLICY_SOURCE_KINDS)[number];

export interface TrustedPolicySourceV1 {
  readonly source_id: string;
  readonly source_kind: TrustedPolicySourceKind;
  readonly content_sha256: string;
}

export interface RepositoryAdvisoryPolicySourceV1 {
  readonly source_id: string;
  readonly source_kind: "REPOSITORY_ADVISORY";
  readonly content_sha256: string;
}

export interface AssuranceEffectCeilingV1 {
  readonly scope: AssuranceScope;
  readonly maximum_effect_class: AssuranceEffectClass;
}

export interface AssuranceEngineQualificationPolicyV1 {
  readonly require_exact_implementation_identity: boolean;
  readonly require_exact_configuration_identity: boolean;
  readonly require_platform_identity: boolean;
  readonly minimum_qualification_refs: number;
}

export interface AssuranceIndependencePolicyV1 {
  readonly minimum_independent_engines: number;
  readonly acceptance_critical_requires_independence: boolean;
}

export interface AssuranceFreshnessPolicyV1 {
  readonly require_exact_target_match: boolean;
  readonly invalidate_on_source_drift: boolean;
  readonly invalidate_on_policy_drift: boolean;
  readonly invalidate_on_engine_identity_drift: boolean;
  readonly max_evidence_age_ms: number | null;
}

export interface AssuranceRiskAcceptancePolicyV1 {
  readonly allow_risk_acceptance: boolean;
  readonly require_reason: boolean;
  readonly require_expiry: boolean;
  readonly require_actor_identity: boolean;
}

export interface AssuranceDataEgressPolicyV1 {
  readonly source_egress: "DENY" | "EXPLICIT_POLICY_ONLY";
  readonly artifact_egress: "DENY" | "EXPLICIT_POLICY_ONLY";
  readonly credential_material_egress: "DENY";
}

export interface AssurancePolicySnapshotV1 {
  readonly schema_version: 1;
  readonly policy_id: string;
  readonly policy_version: string;
  readonly policy_digest: string;
  readonly trusted_policy_sources: readonly TrustedPolicySourceV1[];
  readonly repository_advisory_policy_sources:
    readonly RepositoryAdvisoryPolicySourceV1[];
  readonly minimum_mandatory_checks: readonly string[];
  readonly effect_ceilings: readonly AssuranceEffectCeilingV1[];
  readonly engine_qualification_requirements:
    AssuranceEngineQualificationPolicyV1;
  readonly independence_requirements: AssuranceIndependencePolicyV1;
  readonly freshness_rules: AssuranceFreshnessPolicyV1;
  readonly risk_acceptance_rules: AssuranceRiskAcceptancePolicyV1;
  readonly data_egress_rules: AssuranceDataEgressPolicyV1;
}

export type AssurancePolicySnapshotInputV1 = Omit<
  AssurancePolicySnapshotV1,
  "schema_version" | "policy_digest"
>;
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(field + " must be an object");
  return value;
}

function requireExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  field: string,
): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (!isDeepStrictEqual(actual, wanted)) {
    throw new TypeError(field + " contains missing or unknown fields");
  }
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(field + " must be boolean");
  return value;
}

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be a bounded opaque identifier");
  }
  return value;
}

function requireSha256(value: unknown, field: string): string {
  if (typeof value !== "string" || !SHA256_HEX.test(value)) {
    throw new TypeError(field + " must be lowercase sha256");
  }
  return value;
}

function requireSafeInteger(
  value: unknown,
  field: string,
  minimum: number,
): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new TypeError(field + " must be a safe integer >= " + minimum);
  }
  return value as number;
}

function requireNullablePositiveInteger(
  value: unknown,
  field: string,
): number | null {
  return value === null ? null : requireSafeInteger(value, field, 1);
}

function canonicalJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map((entry) => canonicalJson(entry)).join(",") + "]";
  }
  if (isRecord(value)) {
    const entries = Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]));
    return "{" + entries.join(",") + "}";
  }
  throw new TypeError("policy digest input contains a non-JSON value");
}

function policyDigestBody(
  snapshot: Omit<AssurancePolicySnapshotV1, "policy_digest">,
): string {
  return createHash("sha256")
    .update(canonicalJson(snapshot), "utf8")
    .digest("hex");
}
function parseTrustedPolicySource(value: unknown): TrustedPolicySourceV1 {
  const record = requireRecord(value, "trusted_policy_source");
  requireExactKeys(
    record,
    ["source_id", "source_kind", "content_sha256"],
    "trusted_policy_source",
  );
  if (
    typeof record.source_kind !== "string" ||
    !TRUSTED_POLICY_SOURCE_KINDS.includes(
      record.source_kind as TrustedPolicySourceKind,
    )
  ) {
    throw new TypeError("trusted_policy_source.source_kind is invalid");
  }
  return {
    source_id: requireOpaqueId(record.source_id, "trusted_policy_source.source_id"),
    source_kind: record.source_kind as TrustedPolicySourceKind,
    content_sha256: requireSha256(
      record.content_sha256,
      "trusted_policy_source.content_sha256",
    ),
  };
}

function parseAdvisoryPolicySource(
  value: unknown,
): RepositoryAdvisoryPolicySourceV1 {
  const record = requireRecord(value, "repository_advisory_policy_source");
  requireExactKeys(
    record,
    ["source_id", "source_kind", "content_sha256"],
    "repository_advisory_policy_source",
  );
  if (record.source_kind !== "REPOSITORY_ADVISORY") {
    throw new TypeError(
      "repository_advisory_policy_source.source_kind must equal REPOSITORY_ADVISORY",
    );
  }
  return {
    source_id: requireOpaqueId(
      record.source_id,
      "repository_advisory_policy_source.source_id",
    ),
    source_kind: "REPOSITORY_ADVISORY",
    content_sha256: requireSha256(
      record.content_sha256,
      "repository_advisory_policy_source.content_sha256",
    ),
  };
}

function canonicalizeSources<T extends { readonly source_id: string }>(
  values: readonly T[],
  field: string,
): readonly T[] {
  if (values.length > MAX_POLICY_SOURCES) {
    throw new TypeError(field + " contains too many policy sources");
  }
  const sorted = [...values].sort((left, right) =>
    left.source_id.localeCompare(right.source_id),
  );
  const ids = sorted.map((source) => source.source_id);
  if (new Set(ids).size !== ids.length) {
    throw new TypeError(field + " contains duplicate source_id values");
  }
  return sorted;
}

function requireCanonicalSources<T extends { readonly source_id: string }>(
  values: readonly T[],
  field: string,
): readonly T[] {
  const sorted = canonicalizeSources(values, field);
  if (!isDeepStrictEqual(values, sorted)) {
    throw new TypeError(field + " must be canonically sorted");
  }
  return values;
}

function parseMandatoryChecks(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_MANDATORY_CHECKS) {
    throw new TypeError(
      "minimum_mandatory_checks must contain at most " +
        MAX_MANDATORY_CHECKS +
        " checks",
    );
  }
  const parsed = value.map((entry, index) =>
    requireOpaqueId(entry, "minimum_mandatory_checks[" + index + "]"),
  );
  const canonical = [...new Set(parsed)].sort();
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError(
      "minimum_mandatory_checks must be unique and canonically sorted",
    );
  }
  return parsed;
}
function normalizeMandatoryChecks(
  value: readonly string[],
): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_MANDATORY_CHECKS) {
    throw new TypeError(
      "minimum_mandatory_checks must contain at most " +
        MAX_MANDATORY_CHECKS +
        " checks",
    );
  }
  const parsed = value.map((entry, index) =>
    requireOpaqueId(entry, "minimum_mandatory_checks[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
}

function parseEffectCeiling(value: unknown): AssuranceEffectCeilingV1 {
  const record = requireRecord(value, "effect_ceiling");
  requireExactKeys(
    record,
    ["scope", "maximum_effect_class"],
    "effect_ceiling",
  );
  if (
    typeof record.scope !== "string" ||
    !ASSURANCE_SCOPES.includes(record.scope as AssuranceScope)
  ) {
    throw new TypeError("effect_ceiling.scope is invalid");
  }
  if (
    typeof record.maximum_effect_class !== "string" ||
    !ASSURANCE_EFFECT_CLASSES.includes(
      record.maximum_effect_class as AssuranceEffectClass,
    )
  ) {
    throw new TypeError("effect_ceiling.maximum_effect_class is invalid");
  }
  return {
    scope: record.scope as AssuranceScope,
    maximum_effect_class:
      record.maximum_effect_class as AssuranceEffectClass,
  };
}

function normalizeEffectCeilings(
  values: readonly AssuranceEffectCeilingV1[],
): readonly AssuranceEffectCeilingV1[] {
  const byScope = new Map<AssuranceScope, AssuranceEffectCeilingV1>();
  for (const value of values) {
    const parsed = parseEffectCeiling(value);
    if (byScope.has(parsed.scope)) {
      throw new TypeError("effect_ceilings contains duplicate scope");
    }
    byScope.set(parsed.scope, parsed);
  }
  if (byScope.size !== ASSURANCE_SCOPES.length) {
    throw new TypeError("effect_ceilings must cover every assurance scope");
  }
  return ASSURANCE_SCOPES.map((scope) => byScope.get(scope)!);
}

function parseCanonicalEffectCeilings(
  value: unknown,
): readonly AssuranceEffectCeilingV1[] {
  if (!Array.isArray(value)) {
    throw new TypeError("effect_ceilings must be an array");
  }
  const parsed = value.map(parseEffectCeiling);
  const canonical = normalizeEffectCeilings(parsed);
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError(
      "effect_ceilings must be complete, unique, and canonically ordered",
    );
  }
  return parsed;
}
function parseQualificationPolicy(
  value: unknown,
): AssuranceEngineQualificationPolicyV1 {
  const record = requireRecord(value, "engine_qualification_requirements");
  requireExactKeys(record, [
    "require_exact_implementation_identity",
    "require_exact_configuration_identity",
    "require_platform_identity",
    "minimum_qualification_refs",
  ], "engine_qualification_requirements");
  return {
    require_exact_implementation_identity: requireBoolean(
      record.require_exact_implementation_identity,
      "engine_qualification_requirements.require_exact_implementation_identity",
    ),
    require_exact_configuration_identity: requireBoolean(
      record.require_exact_configuration_identity,
      "engine_qualification_requirements.require_exact_configuration_identity",
    ),
    require_platform_identity: requireBoolean(
      record.require_platform_identity,
      "engine_qualification_requirements.require_platform_identity",
    ),
    minimum_qualification_refs: requireSafeInteger(
      record.minimum_qualification_refs,
      "engine_qualification_requirements.minimum_qualification_refs",
      0,
    ),
  };
}

function parseIndependencePolicy(
  value: unknown,
): AssuranceIndependencePolicyV1 {
  const record = requireRecord(value, "independence_requirements");
  requireExactKeys(record, [
    "minimum_independent_engines",
    "acceptance_critical_requires_independence",
  ], "independence_requirements");
  return {
    minimum_independent_engines: requireSafeInteger(
      record.minimum_independent_engines,
      "independence_requirements.minimum_independent_engines",
      0,
    ),
    acceptance_critical_requires_independence: requireBoolean(
      record.acceptance_critical_requires_independence,
      "independence_requirements.acceptance_critical_requires_independence",
    ),
  };
}

function parseFreshnessPolicy(value: unknown): AssuranceFreshnessPolicyV1 {
  const record = requireRecord(value, "freshness_rules");
  requireExactKeys(record, [
    "require_exact_target_match",
    "invalidate_on_source_drift",
    "invalidate_on_policy_drift",
    "invalidate_on_engine_identity_drift",
    "max_evidence_age_ms",
  ], "freshness_rules");
  return {
    require_exact_target_match: requireBoolean(
      record.require_exact_target_match,
      "freshness_rules.require_exact_target_match",
    ),
    invalidate_on_source_drift: requireBoolean(
      record.invalidate_on_source_drift,
      "freshness_rules.invalidate_on_source_drift",
    ),
    invalidate_on_policy_drift: requireBoolean(
      record.invalidate_on_policy_drift,
      "freshness_rules.invalidate_on_policy_drift",
    ),
    invalidate_on_engine_identity_drift: requireBoolean(
      record.invalidate_on_engine_identity_drift,
      "freshness_rules.invalidate_on_engine_identity_drift",
    ),
    max_evidence_age_ms: requireNullablePositiveInteger(
      record.max_evidence_age_ms,
      "freshness_rules.max_evidence_age_ms",
    ),
  };
}
function parseRiskPolicy(value: unknown): AssuranceRiskAcceptancePolicyV1 {
  const record = requireRecord(value, "risk_acceptance_rules");
  requireExactKeys(record, [
    "allow_risk_acceptance",
    "require_reason",
    "require_expiry",
    "require_actor_identity",
  ], "risk_acceptance_rules");
  const policy = {
    allow_risk_acceptance: requireBoolean(
      record.allow_risk_acceptance,
      "risk_acceptance_rules.allow_risk_acceptance",
    ),
    require_reason: requireBoolean(
      record.require_reason,
      "risk_acceptance_rules.require_reason",
    ),
    require_expiry: requireBoolean(
      record.require_expiry,
      "risk_acceptance_rules.require_expiry",
    ),
    require_actor_identity: requireBoolean(
      record.require_actor_identity,
      "risk_acceptance_rules.require_actor_identity",
    ),
  };
  if (
    !policy.allow_risk_acceptance &&
    (!policy.require_reason ||
      !policy.require_expiry ||
      !policy.require_actor_identity)
  ) {
    throw new TypeError(
      "disabled risk acceptance must preserve reason/expiry/actor requirements",
    );
  }
  return policy;
}

function parseDataEgressPolicy(value: unknown): AssuranceDataEgressPolicyV1 {
  const record = requireRecord(value, "data_egress_rules");
  requireExactKeys(record, [
    "source_egress",
    "artifact_egress",
    "credential_material_egress",
  ], "data_egress_rules");

  if (
    record.source_egress !== "DENY" &&
    record.source_egress !== "EXPLICIT_POLICY_ONLY"
  ) {
    throw new TypeError("data_egress_rules.source_egress is invalid");
  }
  if (
    record.artifact_egress !== "DENY" &&
    record.artifact_egress !== "EXPLICIT_POLICY_ONLY"
  ) {
    throw new TypeError("data_egress_rules.artifact_egress is invalid");
  }
  if (record.credential_material_egress !== "DENY") {
    throw new TypeError(
      "data_egress_rules.credential_material_egress must equal DENY",
    );
  }
  return {
    source_egress: record.source_egress,
    artifact_egress: record.artifact_egress,
    credential_material_egress: "DENY",
  };
}

function withoutDigest(
  snapshot: AssurancePolicySnapshotV1,
): Omit<AssurancePolicySnapshotV1, "policy_digest"> {
  const { policy_digest: _policyDigest, ...body } = snapshot;
  return body;
}
export function assurancePolicyDigestV1(
  snapshot: Omit<AssurancePolicySnapshotV1, "policy_digest">,
): string {
  return policyDigestBody(snapshot);
}

export function parseAssurancePolicySnapshotV1(
  value: unknown,
): AssurancePolicySnapshotV1 {
  const record = requireRecord(value, "assurance policy snapshot");
  requireExactKeys(record, [
    "schema_version",
    "policy_id",
    "policy_version",
    "policy_digest",
    "trusted_policy_sources",
    "repository_advisory_policy_sources",
    "minimum_mandatory_checks",
    "effect_ceilings",
    "engine_qualification_requirements",
    "independence_requirements",
    "freshness_rules",
    "risk_acceptance_rules",
    "data_egress_rules",
  ], "assurance policy snapshot");

  if (record.schema_version !== ASSURANCE_POLICY_SCHEMA_VERSION) {
    throw new TypeError("assurance policy snapshot schema_version must equal 1");
  }
  if (!Array.isArray(record.trusted_policy_sources)) {
    throw new TypeError("trusted_policy_sources must be an array");
  }
  if (!Array.isArray(record.repository_advisory_policy_sources)) {
    throw new TypeError(
      "repository_advisory_policy_sources must be an array",
    );
  }

  const trusted = record.trusted_policy_sources.map(parseTrustedPolicySource);
  if (trusted.length === 0) {
    throw new TypeError("trusted_policy_sources must not be empty");
  }
  requireCanonicalSources(trusted, "trusted_policy_sources");

  const advisory = record.repository_advisory_policy_sources.map(
    parseAdvisoryPolicySource,
  );
  requireCanonicalSources(advisory, "repository_advisory_policy_sources");

  const trustedIds = new Set(trusted.map((source) => source.source_id));
  if (advisory.some((source) => trustedIds.has(source.source_id))) {
    throw new TypeError(
      "trusted and repository advisory policy source ids must be disjoint",
    );
  }

  const snapshot: AssurancePolicySnapshotV1 = {
    schema_version: ASSURANCE_POLICY_SCHEMA_VERSION,
    policy_id: requireOpaqueId(record.policy_id, "policy_id"),
    policy_version: requireOpaqueId(record.policy_version, "policy_version"),
    policy_digest: requireSha256(record.policy_digest, "policy_digest"),
    trusted_policy_sources: trusted,
    repository_advisory_policy_sources: advisory,
    minimum_mandatory_checks: parseMandatoryChecks(
      record.minimum_mandatory_checks,
    ),
    effect_ceilings: parseCanonicalEffectCeilings(record.effect_ceilings),
    engine_qualification_requirements: parseQualificationPolicy(
      record.engine_qualification_requirements,
    ),
    independence_requirements: parseIndependencePolicy(
      record.independence_requirements,
    ),
    freshness_rules: parseFreshnessPolicy(record.freshness_rules),
    risk_acceptance_rules: parseRiskPolicy(record.risk_acceptance_rules),
    data_egress_rules: parseDataEgressPolicy(record.data_egress_rules),
  };

  const expectedDigest = policyDigestBody(withoutDigest(snapshot));
  if (snapshot.policy_digest !== expectedDigest) {
    throw new TypeError("policy_digest does not match canonical policy body");
  }
  return snapshot;
}
export function createAssurancePolicySnapshotV1(
  input: AssurancePolicySnapshotInputV1,
): AssurancePolicySnapshotV1 {
  const trusted = canonicalizeSources(
    input.trusted_policy_sources.map(parseTrustedPolicySource),
    "trusted_policy_sources",
  );
  if (trusted.length === 0) {
    throw new TypeError("trusted_policy_sources must not be empty");
  }
  const advisory = canonicalizeSources(
    input.repository_advisory_policy_sources.map(parseAdvisoryPolicySource),
    "repository_advisory_policy_sources",
  );
  const trustedIds = new Set(trusted.map((source) => source.source_id));
  if (advisory.some((source) => trustedIds.has(source.source_id))) {
    throw new TypeError(
      "trusted and repository advisory policy source ids must be disjoint",
    );
  }

  const body: Omit<AssurancePolicySnapshotV1, "policy_digest"> = {
    schema_version: ASSURANCE_POLICY_SCHEMA_VERSION,
    policy_id: requireOpaqueId(input.policy_id, "policy_id"),
    policy_version: requireOpaqueId(input.policy_version, "policy_version"),
    trusted_policy_sources: trusted,
    repository_advisory_policy_sources: advisory,
    minimum_mandatory_checks: normalizeMandatoryChecks(
      input.minimum_mandatory_checks,
    ),
    effect_ceilings: normalizeEffectCeilings(input.effect_ceilings),
    engine_qualification_requirements: parseQualificationPolicy(
      input.engine_qualification_requirements,
    ),
    independence_requirements: parseIndependencePolicy(
      input.independence_requirements,
    ),
    freshness_rules: parseFreshnessPolicy(input.freshness_rules),
    risk_acceptance_rules: parseRiskPolicy(input.risk_acceptance_rules),
    data_egress_rules: parseDataEgressPolicy(input.data_egress_rules),
  };

  return parseAssurancePolicySnapshotV1({
    ...body,
    policy_digest: policyDigestBody(body),
  });
}
