import { isDeepStrictEqual } from "node:util";

import {
  parseEngineDescriptorV1,
  type EngineDescriptorV1,
  type EngineImplementationIdentityV1,
} from "./engine-descriptor.js";

export const ENGINE_QUALIFICATION_SCHEMA_VERSION = 1 as const;

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const STATE_ID = /^[A-Z][A-Z0-9_]{0,63}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const MAX_LIST_ITEMS = 256;

export interface EngineConfigurationIdentityV1 {
  readonly configuration_id: string;
  readonly configuration_sha256: string;
}

export interface EngineBenchmarkCorpusIdentityV1 {
  readonly benchmark_id: string;
  readonly corpus_id: string;
  readonly corpus_sha256: string;
}

export interface EnginePlatformIdentityV1 {
  readonly platform_id: string;
  readonly platform_sha256: string;
}

export interface EngineQualificationEvidenceRefV1 {
  readonly evidence_ref: string;
  readonly provider_self_description: false;
}

export interface EngineQualificationInvalidationRulesV1 {
  readonly invalidate_on_implementation_drift: true;
  readonly invalidate_on_configuration_drift: true;
  readonly invalidate_on_profile_drift: true;
  readonly invalidate_on_benchmark_corpus_drift: true;
  readonly invalidate_on_platform_drift: true;
}

export interface EngineQualificationV1 {
  readonly schema_version: 1;
  readonly qualification_id: string;
  readonly engine_id: string;
  readonly implementation_identity: EngineImplementationIdentityV1;
  readonly configuration_identity: EngineConfigurationIdentityV1;
  readonly profile_identities: readonly string[];
  readonly benchmark_corpus_identity: EngineBenchmarkCorpusIdentityV1;
  readonly platform_identity: EnginePlatformIdentityV1;
  readonly evidence_refs: readonly EngineQualificationEvidenceRefV1[];
  readonly result: string;
  readonly qualified_at_epoch_ms: number;
  readonly expires_at_epoch_ms: number | null;
  readonly invalidation_rules: EngineQualificationInvalidationRulesV1;
}

export interface EngineQualificationInputV1
  extends Omit<EngineQualificationV1, "schema_version" | "invalidation_rules"> {}

export interface EngineQualificationApplicationContextV1 {
  readonly descriptor: EngineDescriptorV1;
  readonly configuration_identity: EngineConfigurationIdentityV1;
  readonly profile_identities: readonly string[];
  readonly benchmark_corpus_identity: EngineBenchmarkCorpusIdentityV1;
  readonly platform_identity: EnginePlatformIdentityV1;
  readonly as_of_epoch_ms: number;
}
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

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be a bounded opaque identifier");
  }
  return value;
}

function requireStateId(value: unknown, field: string): string {
  if (typeof value !== "string" || !STATE_ID.test(value)) {
    throw new TypeError(field + " must be an uppercase bounded state identifier");
  }
  return value;
}

function requireSha256(value: unknown, field: string): string {
  if (typeof value !== "string" || !SHA256_HEX.test(value)) {
    throw new TypeError(field + " must be lowercase sha256");
  }
  return value;
}

function requireEpochMs(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(field + " must be a non-negative safe integer epoch ms");
  }
  return value as number;
}

function requireLiteralTrue(value: unknown, field: string): true {
  if (value !== true) throw new TypeError(field + " must equal true");
  return true;
}

function normalizeOpaqueIds(
  values: readonly string[],
  field: string,
): readonly string[] {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = values.map((value, index) =>
    requireOpaqueId(value, field + "[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
}

function parseCanonicalOpaqueIds(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = value.map((entry, index) =>
    requireOpaqueId(entry, field + "[" + index + "]"),
  );
  const canonical = [...new Set(parsed)].sort();
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError(field + " must be unique and canonically sorted");
  }
  return parsed;
}
function parseImplementationIdentity(
  value: unknown,
): EngineImplementationIdentityV1 {
  const record = requireRecord(value, "implementation_identity");
  requireExactKeys(
    record,
    ["implementation_id", "source_identity", "version", "artifact_sha256"],
    "implementation_identity",
  );
  return {
    implementation_id: requireOpaqueId(
      record.implementation_id,
      "implementation_identity.implementation_id",
    ),
    source_identity: requireOpaqueId(
      record.source_identity,
      "implementation_identity.source_identity",
    ),
    version: requireOpaqueId(record.version, "implementation_identity.version"),
    artifact_sha256: requireSha256(
      record.artifact_sha256,
      "implementation_identity.artifact_sha256",
    ),
  };
}

function parseConfigurationIdentity(
  value: unknown,
): EngineConfigurationIdentityV1 {
  const record = requireRecord(value, "configuration_identity");
  requireExactKeys(
    record,
    ["configuration_id", "configuration_sha256"],
    "configuration_identity",
  );
  return {
    configuration_id: requireOpaqueId(
      record.configuration_id,
      "configuration_identity.configuration_id",
    ),
    configuration_sha256: requireSha256(
      record.configuration_sha256,
      "configuration_identity.configuration_sha256",
    ),
  };
}

function parseBenchmarkCorpusIdentity(
  value: unknown,
): EngineBenchmarkCorpusIdentityV1 {
  const record = requireRecord(value, "benchmark_corpus_identity");
  requireExactKeys(
    record,
    ["benchmark_id", "corpus_id", "corpus_sha256"],
    "benchmark_corpus_identity",
  );
  return {
    benchmark_id: requireOpaqueId(
      record.benchmark_id,
      "benchmark_corpus_identity.benchmark_id",
    ),
    corpus_id: requireOpaqueId(
      record.corpus_id,
      "benchmark_corpus_identity.corpus_id",
    ),
    corpus_sha256: requireSha256(
      record.corpus_sha256,
      "benchmark_corpus_identity.corpus_sha256",
    ),
  };
}

function parsePlatformIdentity(value: unknown): EnginePlatformIdentityV1 {
  const record = requireRecord(value, "platform_identity");
  requireExactKeys(
    record,
    ["platform_id", "platform_sha256"],
    "platform_identity",
  );
  return {
    platform_id: requireOpaqueId(
      record.platform_id,
      "platform_identity.platform_id",
    ),
    platform_sha256: requireSha256(
      record.platform_sha256,
      "platform_identity.platform_sha256",
    ),
  };
}

function parseEvidenceRef(value: unknown): EngineQualificationEvidenceRefV1 {
  const record = requireRecord(value, "qualification evidence ref");
  requireExactKeys(
    record,
    ["evidence_ref", "provider_self_description"],
    "qualification evidence ref",
  );
  if (record.provider_self_description !== false) {
    throw new TypeError(
      "provider self-description cannot be qualification evidence",
    );
  }
  return {
    evidence_ref: requireOpaqueId(
      record.evidence_ref,
      "qualification evidence ref.evidence_ref",
    ),
    provider_self_description: false,
  };
}

function normalizeEvidenceRefs(
  values: readonly EngineQualificationEvidenceRefV1[],
): readonly EngineQualificationEvidenceRefV1[] {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS) {
    throw new TypeError(
      "evidence_refs must contain at most " + MAX_LIST_ITEMS + " items",
    );
  }
  const parsed = values.map(parseEvidenceRef);
  const sorted = [...parsed].sort((left, right) =>
    left.evidence_ref < right.evidence_ref
      ? -1
      : left.evidence_ref > right.evidence_ref
        ? 1
        : 0,
  );
  const ids = sorted.map((entry) => entry.evidence_ref);
  if (new Set(ids).size !== ids.length) {
    throw new TypeError("evidence_refs contains duplicate evidence_ref");
  }
  return sorted;
}

function parseCanonicalEvidenceRefs(
  value: unknown,
): readonly EngineQualificationEvidenceRefV1[] {
  if (!Array.isArray(value)) {
    throw new TypeError("evidence_refs must be an array");
  }
  const parsed = value.map(parseEvidenceRef);
  const canonical = normalizeEvidenceRefs(parsed);
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError("evidence_refs must be unique and canonically sorted");
  }
  return parsed;
}
function parseInvalidationRules(
  value: unknown,
): EngineQualificationInvalidationRulesV1 {
  const record = requireRecord(value, "invalidation_rules");
  requireExactKeys(
    record,
    [
      "invalidate_on_implementation_drift",
      "invalidate_on_configuration_drift",
      "invalidate_on_profile_drift",
      "invalidate_on_benchmark_corpus_drift",
      "invalidate_on_platform_drift",
    ],
    "invalidation_rules",
  );
  return {
    invalidate_on_implementation_drift: requireLiteralTrue(
      record.invalidate_on_implementation_drift,
      "invalidation_rules.invalidate_on_implementation_drift",
    ),
    invalidate_on_configuration_drift: requireLiteralTrue(
      record.invalidate_on_configuration_drift,
      "invalidation_rules.invalidate_on_configuration_drift",
    ),
    invalidate_on_profile_drift: requireLiteralTrue(
      record.invalidate_on_profile_drift,
      "invalidation_rules.invalidate_on_profile_drift",
    ),
    invalidate_on_benchmark_corpus_drift: requireLiteralTrue(
      record.invalidate_on_benchmark_corpus_drift,
      "invalidation_rules.invalidate_on_benchmark_corpus_drift",
    ),
    invalidate_on_platform_drift: requireLiteralTrue(
      record.invalidate_on_platform_drift,
      "invalidation_rules.invalidate_on_platform_drift",
    ),
  };
}

function requireQualifiedEvidenceAndProfiles(
  result: string,
  evidenceRefs: readonly EngineQualificationEvidenceRefV1[],
  profileIdentities: readonly string[],
): void {
  if (result !== "QUALIFIED") return;
  if (profileIdentities.length === 0) {
    throw new TypeError("QUALIFIED result requires at least one profile identity");
  }
  if (evidenceRefs.length === 0) {
    throw new TypeError("QUALIFIED result requires qualification evidence");
  }
}

function requireExpiryOrder(
  qualifiedAt: number,
  expiresAt: number | null,
): void {
  if (expiresAt !== null && expiresAt <= qualifiedAt) {
    throw new TypeError("expires_at_epoch_ms must be greater than qualified_at_epoch_ms");
  }
}

export function parseEngineQualificationV1(
  value: unknown,
): EngineQualificationV1 {
  const record = requireRecord(value, "engine qualification");
  requireExactKeys(
    record,
    [
      "schema_version",
      "qualification_id",
      "engine_id",
      "implementation_identity",
      "configuration_identity",
      "profile_identities",
      "benchmark_corpus_identity",
      "platform_identity",
      "evidence_refs",
      "result",
      "qualified_at_epoch_ms",
      "expires_at_epoch_ms",
      "invalidation_rules",
    ],
    "engine qualification",
  );

  if (record.schema_version !== ENGINE_QUALIFICATION_SCHEMA_VERSION) {
    throw new TypeError("engine qualification schema_version must equal 1");
  }

  const result = requireStateId(record.result, "result");
  const evidenceRefs = parseCanonicalEvidenceRefs(record.evidence_refs);
  const profileIdentities = parseCanonicalOpaqueIds(
    record.profile_identities,
    "profile_identities",
  );
  const qualifiedAt = requireEpochMs(
    record.qualified_at_epoch_ms,
    "qualified_at_epoch_ms",
  );
  const expiresAt =
    record.expires_at_epoch_ms === null
      ? null
      : requireEpochMs(record.expires_at_epoch_ms, "expires_at_epoch_ms");

  requireQualifiedEvidenceAndProfiles(
    result,
    evidenceRefs,
    profileIdentities,
  );
  requireExpiryOrder(qualifiedAt, expiresAt);

  return {
    schema_version: ENGINE_QUALIFICATION_SCHEMA_VERSION,
    qualification_id: requireOpaqueId(
      record.qualification_id,
      "qualification_id",
    ),
    engine_id: requireOpaqueId(record.engine_id, "engine_id"),
    implementation_identity: parseImplementationIdentity(
      record.implementation_identity,
    ),
    configuration_identity: parseConfigurationIdentity(
      record.configuration_identity,
    ),
    profile_identities: profileIdentities,
    benchmark_corpus_identity: parseBenchmarkCorpusIdentity(
      record.benchmark_corpus_identity,
    ),
    platform_identity: parsePlatformIdentity(record.platform_identity),
    evidence_refs: evidenceRefs,
    result,
    qualified_at_epoch_ms: qualifiedAt,
    expires_at_epoch_ms: expiresAt,
    invalidation_rules: parseInvalidationRules(record.invalidation_rules),
  };
}
export function createEngineQualificationV1(
  input: EngineQualificationInputV1,
): EngineQualificationV1 {
  return parseEngineQualificationV1({
    schema_version: ENGINE_QUALIFICATION_SCHEMA_VERSION,
    qualification_id: input.qualification_id,
    engine_id: input.engine_id,
    implementation_identity: input.implementation_identity,
    configuration_identity: input.configuration_identity,
    profile_identities: normalizeOpaqueIds(
      input.profile_identities,
      "profile_identities",
    ),
    benchmark_corpus_identity: input.benchmark_corpus_identity,
    platform_identity: input.platform_identity,
    evidence_refs: normalizeEvidenceRefs(input.evidence_refs),
    result: input.result,
    qualified_at_epoch_ms: input.qualified_at_epoch_ms,
    expires_at_epoch_ms: input.expires_at_epoch_ms,
    invalidation_rules: {
      invalidate_on_implementation_drift: true,
      invalidate_on_configuration_drift: true,
      invalidate_on_profile_drift: true,
      invalidate_on_benchmark_corpus_drift: true,
      invalidate_on_platform_drift: true,
    },
  });
}

function requireExactQualificationBindings(
  qualification: EngineQualificationV1,
  context: EngineQualificationApplicationContextV1,
): void {
  const descriptor = parseEngineDescriptorV1(context.descriptor);
  const configuration = parseConfigurationIdentity(
    context.configuration_identity,
  );
  const profiles = normalizeOpaqueIds(
    context.profile_identities,
    "application_context.profile_identities",
  );
  const benchmarkCorpus = parseBenchmarkCorpusIdentity(
    context.benchmark_corpus_identity,
  );
  const platform = parsePlatformIdentity(context.platform_identity);

  if (qualification.engine_id !== descriptor.engine_id) {
    throw new TypeError("qualification engine_id does not match descriptor");
  }
  if (
    !isDeepStrictEqual(
      qualification.implementation_identity,
      descriptor.implementation_identity,
    )
  ) {
    throw new TypeError("qualification implementation identity mismatch");
  }
  if (
    !isDeepStrictEqual(qualification.configuration_identity, configuration)
  ) {
    throw new TypeError("qualification configuration identity mismatch");
  }
  if (!isDeepStrictEqual(qualification.profile_identities, profiles)) {
    throw new TypeError("qualification profile identity mismatch");
  }
  if (
    !isDeepStrictEqual(
      qualification.benchmark_corpus_identity,
      benchmarkCorpus,
    )
  ) {
    throw new TypeError("qualification benchmark/corpus identity mismatch");
  }
  if (!isDeepStrictEqual(qualification.platform_identity, platform)) {
    throw new TypeError("qualification platform identity mismatch");
  }
}

export function assertEngineQualificationAppliesV1(
  qualification: unknown,
  context: EngineQualificationApplicationContextV1,
): void {
  const parsed = parseEngineQualificationV1(qualification);
  requireExactQualificationBindings(parsed, context);

  if (parsed.result !== "QUALIFIED") {
    throw new TypeError("engine qualification result is not QUALIFIED");
  }

  const asOf = requireEpochMs(context.as_of_epoch_ms, "as_of_epoch_ms");
  if (asOf < parsed.qualified_at_epoch_ms) {
    throw new TypeError("engine qualification is not yet applicable");
  }
  if (
    parsed.expires_at_epoch_ms !== null &&
    asOf >= parsed.expires_at_epoch_ms
  ) {
    throw new TypeError("engine qualification is expired");
  }
}
