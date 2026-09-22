import { isDeepStrictEqual } from "node:util";

import {
  canonicalAssuranceSha256V1,
} from "../contracts/canonical-serialization.js";
import {
  parseEngineQualificationV1,
  type EngineBenchmarkCorpusIdentityV1,
  type EnginePlatformIdentityV1,
  type EngineQualificationV1,
} from "../contracts/engine-qualification.js";
import {
  findEngineRegistryEntryV1,
  type EngineRegistryIdentityV1,
  type EngineRegistryV1,
} from "./registry.js";

export const ENGINE_QUALIFICATION_LOOKUP_SCHEMA_VERSION = 1 as const;

export const ENGINE_QUALIFICATION_LOOKUP_RESULTS = [
  "QUALIFIED",
  "NOT_QUALIFIED",
] as const;

export type EngineQualificationLookupResultV1 =
  (typeof ENGINE_QUALIFICATION_LOOKUP_RESULTS)[number];

export const ENGINE_QUALIFICATION_LOOKUP_REASONS = [
  "QUALIFICATION_SATISFIED",
  "NO_QUALIFICATION_RECORD",
  "IMPLEMENTATION_DRIFT",
  "CONFIGURATION_DRIFT",
  "PROFILE_DRIFT",
  "BENCHMARK_CORPUS_DRIFT",
  "PLATFORM_DRIFT",
  "RESULT_NOT_QUALIFIED",
  "NOT_YET_APPLICABLE",
  "EXPIRED",
] as const;

export type EngineQualificationLookupReasonV1 =
  (typeof ENGINE_QUALIFICATION_LOOKUP_REASONS)[number];

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;

export interface EngineQualificationSetV1 {
  readonly schema_version: 1;
  readonly qualifications: readonly EngineQualificationV1[];
}

export interface EngineQualificationLookupRequestV1 {
  readonly identity: EngineRegistryIdentityV1;
  readonly profile_identities: readonly string[];
  readonly benchmark_corpus_identity: EngineBenchmarkCorpusIdentityV1;
  readonly platform_identity: EnginePlatformIdentityV1;
  readonly as_of_epoch_ms: number;
}

export interface EngineQualificationDecisionV1 {
  readonly schema_version: 1;
  readonly registry_sha256: string;
  readonly qualifications_sha256: string;
  readonly identity: EngineRegistryIdentityV1;
  readonly qualification_id: string | null;
  readonly result: EngineQualificationLookupResultV1;
  readonly reason_code: EngineQualificationLookupReasonV1;
  readonly profile_identities: readonly string[];
  readonly benchmark_corpus_identity: EngineBenchmarkCorpusIdentityV1;
  readonly platform_identity: EnginePlatformIdentityV1;
  readonly as_of_epoch_ms: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError(field + " must be an object");
  }
  return value;
}

function requireExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  field: string,
): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new TypeError(field + " contains missing or unknown fields");
  }
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

function requireEpochMs(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(field + " must be a non-negative safe integer epoch ms");
  }
  return value as number;
}

function normalizeProfileIdentities(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > 256) {
    throw new TypeError("profile_identities must contain at most 256 items");
  }
  const parsed = value.map((entry, index) =>
    requireOpaqueId(entry, "profile_identities[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
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

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function createEngineQualificationSetV1(
  qualifications: readonly unknown[],
): EngineQualificationSetV1 {
  if (!Array.isArray(qualifications) || qualifications.length > 512) {
    throw new TypeError(
      "engine qualification set must contain at most 512 records",
    );
  }
  const parsed = qualifications.map((entry) =>
    parseEngineQualificationV1(entry),
  );
  const seen = new Set<string>();
  for (const qualification of parsed) {
    if (seen.has(qualification.qualification_id)) {
      throw new TypeError(
        "engine qualification set contains duplicate qualification_id",
      );
    }
    seen.add(qualification.qualification_id);
  }
  const sorted = [...parsed].sort((left, right) =>
    left.qualification_id < right.qualification_id
      ? -1
      : left.qualification_id > right.qualification_id
        ? 1
        : 0,
  );
  return deepFreeze({
    schema_version: ENGINE_QUALIFICATION_LOOKUP_SCHEMA_VERSION,
    qualifications: sorted,
  });
}

function classifyCandidate(
  qualification: EngineQualificationV1,
  descriptorImplementationIdentity: unknown,
  configurationIdentity: unknown,
  profileIdentities: readonly string[],
  benchmarkCorpusIdentity: EngineBenchmarkCorpusIdentityV1,
  platformIdentity: EnginePlatformIdentityV1,
  asOfEpochMs: number,
): EngineQualificationLookupReasonV1 | null {
  if (
    !isDeepStrictEqual(
      qualification.implementation_identity,
      descriptorImplementationIdentity,
    )
  ) {
    return "IMPLEMENTATION_DRIFT";
  }
  if (
    !isDeepStrictEqual(
      qualification.configuration_identity,
      configurationIdentity,
    )
  ) {
    return "CONFIGURATION_DRIFT";
  }
  if (!isDeepStrictEqual(qualification.profile_identities, profileIdentities)) {
    return "PROFILE_DRIFT";
  }
  if (
    !isDeepStrictEqual(
      qualification.benchmark_corpus_identity,
      benchmarkCorpusIdentity,
    )
  ) {
    return "BENCHMARK_CORPUS_DRIFT";
  }
  if (!isDeepStrictEqual(qualification.platform_identity, platformIdentity)) {
    return "PLATFORM_DRIFT";
  }
  if (qualification.result !== "QUALIFIED") {
    return "RESULT_NOT_QUALIFIED";
  }
  if (asOfEpochMs < qualification.qualified_at_epoch_ms) {
    return "NOT_YET_APPLICABLE";
  }
  if (
    qualification.expires_at_epoch_ms !== null &&
    asOfEpochMs >= qualification.expires_at_epoch_ms
  ) {
    return "EXPIRED";
  }
  return null;
}

export function evaluateEngineQualificationV1(
  registry: EngineRegistryV1,
  qualificationSet: EngineQualificationSetV1,
  request: EngineQualificationLookupRequestV1,
): EngineQualificationDecisionV1 {
  const record = requireRecord(request, "engine qualification lookup request");
  requireExactKeys(
    record,
    [
      "identity",
      "profile_identities",
      "benchmark_corpus_identity",
      "platform_identity",
      "as_of_epoch_ms",
    ],
    "engine qualification lookup request",
  );

  const registered = findEngineRegistryEntryV1(
    registry,
    record.identity as EngineRegistryIdentityV1,
  );
  if (registered === undefined) {
    throw new TypeError(
      "engine qualification request identity is not registered",
    );
  }

  const profileIdentities = normalizeProfileIdentities(
    record.profile_identities,
  );
  const benchmarkCorpusIdentity = parseBenchmarkCorpusIdentity(
    record.benchmark_corpus_identity,
  );
  const platformIdentity = parsePlatformIdentity(record.platform_identity);
  const asOfEpochMs = requireEpochMs(
    record.as_of_epoch_ms,
    "as_of_epoch_ms",
  );

  const setRecord = requireRecord(
    qualificationSet as unknown,
    "engine qualification set",
  );
  requireExactKeys(
    setRecord,
    ["schema_version", "qualifications"],
    "engine qualification set",
  );
  if (setRecord.schema_version !== ENGINE_QUALIFICATION_LOOKUP_SCHEMA_VERSION) {
    throw new TypeError("engine qualification set schema_version must equal 1");
  }
  if (!Array.isArray(setRecord.qualifications)) {
    throw new TypeError("engine qualification set qualifications must be an array");
  }
  const qualifications = (setRecord.qualifications as readonly unknown[]).map(
    (entry) => parseEngineQualificationV1(entry),
  );

  const registrySha256 = canonicalAssuranceSha256V1(registry);
  const qualificationsSha256 = canonicalAssuranceSha256V1(qualificationSet);

  const identity: EngineRegistryIdentityV1 = {
    engine_id: registered.descriptor.engine_id,
    implementation_identity: registered.descriptor.implementation_identity,
    configuration_identity: registered.configuration_identity,
  };

  const candidates = qualifications
    .filter(
      (qualification) =>
        qualification.engine_id === registered.descriptor.engine_id,
    )
    .sort((left, right) =>
      left.qualification_id < right.qualification_id
        ? -1
        : left.qualification_id > right.qualification_id
          ? 1
          : 0,
    );

  if (candidates.length === 0) {
    return deepFreeze({
      schema_version: ENGINE_QUALIFICATION_LOOKUP_SCHEMA_VERSION,
      registry_sha256: registrySha256,
      qualifications_sha256: qualificationsSha256,
      identity,
      qualification_id: null,
      result: "NOT_QUALIFIED",
      reason_code: "NO_QUALIFICATION_RECORD",
      profile_identities: profileIdentities,
      benchmark_corpus_identity: benchmarkCorpusIdentity,
      platform_identity: platformIdentity,
      as_of_epoch_ms: asOfEpochMs,
    });
  }

  for (const candidate of candidates) {
    const failure = classifyCandidate(
      candidate,
      registered.descriptor.implementation_identity,
      registered.configuration_identity,
      profileIdentities,
      benchmarkCorpusIdentity,
      platformIdentity,
      asOfEpochMs,
    );
    if (failure === null) {
      return deepFreeze({
        schema_version: ENGINE_QUALIFICATION_LOOKUP_SCHEMA_VERSION,
        registry_sha256: registrySha256,
        qualifications_sha256: qualificationsSha256,
        identity,
        qualification_id: candidate.qualification_id,
        result: "QUALIFIED",
        reason_code: "QUALIFICATION_SATISFIED",
        profile_identities: profileIdentities,
        benchmark_corpus_identity: benchmarkCorpusIdentity,
        platform_identity: platformIdentity,
        as_of_epoch_ms: asOfEpochMs,
      });
    }
  }

  const first = candidates[0] as EngineQualificationV1;
  const reason = classifyCandidate(
    first,
    registered.descriptor.implementation_identity,
    registered.configuration_identity,
    profileIdentities,
    benchmarkCorpusIdentity,
    platformIdentity,
    asOfEpochMs,
  ) as EngineQualificationLookupReasonV1;

  return deepFreeze({
    schema_version: ENGINE_QUALIFICATION_LOOKUP_SCHEMA_VERSION,
    registry_sha256: registrySha256,
    qualifications_sha256: qualificationsSha256,
    identity,
    qualification_id: first.qualification_id,
    result: "NOT_QUALIFIED",
    reason_code: reason,
    profile_identities: profileIdentities,
    benchmark_corpus_identity: benchmarkCorpusIdentity,
    platform_identity: platformIdentity,
    as_of_epoch_ms: asOfEpochMs,
  });
}

export function assertEngineQualificationDecisionContextV1(
  registry: EngineRegistryV1,
  qualificationSet: EngineQualificationSetV1,
  request: EngineQualificationLookupRequestV1,
  decision: EngineQualificationDecisionV1,
): void {
  const expected = evaluateEngineQualificationV1(
    registry,
    qualificationSet,
    request,
  );
  if (
    canonicalAssuranceSha256V1(expected) !==
    canonicalAssuranceSha256V1(decision)
  ) {
    throw new TypeError(
      "engine qualification decision context mismatch",
    );
  }
}
