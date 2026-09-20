import { isDeepStrictEqual } from "node:util";

import {
  parseEngineRunV1,
  type EngineRunV1,
} from "./engine-run.js";
import {
  parseAssuranceTargetV1,
  type AssuranceTargetV1,
} from "./target.js";

export const EVIDENCE_REF_SCHEMA_VERSION = 1 as const;

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const STATE_ID = /^[A-Z][A-Z0-9_]{0,63}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const MAX_LIST_ITEMS = 256;

export interface EvidenceProducerV1 {
  readonly producer_id: string;
  readonly producer_kind: string;
}

export interface EvidenceContentArtifactIdentityV1 {
  readonly identity_kind: "CONTENT" | "ARTIFACT";
  readonly identity_id: string;
}

export interface EvidenceFreshnessV1 {
  readonly observed_at_epoch_ms: number;
  readonly expires_at_epoch_ms: number | null;
}

export interface EvidenceRetentionV1 {
  readonly retention_class: string;
  readonly retain_until_epoch_ms: number | null;
}

export interface EvidenceLineageV1 {
  readonly parent_evidence_refs: readonly string[];
  readonly derivation_ref: string | null;
}

export interface EvidenceRefV1 {
  readonly schema_version: 1;
  readonly evidence_id: string;
  readonly producer: EvidenceProducerV1;
  readonly run_id: string;
  readonly target_id: string;
  readonly kind: string;
  readonly content_artifact_identity: EvidenceContentArtifactIdentityV1;
  readonly digest_sha256: string;
  readonly trust_class: string;
  readonly data_classification: string;
  readonly freshness: EvidenceFreshnessV1;
  readonly redaction_state: string;
  readonly retention: EvidenceRetentionV1;
  readonly lineage: EvidenceLineageV1;
}

export type EvidenceRefInputV1 = Omit<EvidenceRefV1, "schema_version">;

export interface EvidenceResolutionContextV1 {
  readonly target: AssuranceTargetV1;
  readonly run: EngineRunV1;
  readonly available_evidence_ids: readonly string[];
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

function requireNullableOpaqueId(value: unknown, field: string): string | null {
  return value === null ? null : requireOpaqueId(value, field);
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

function parseCanonicalOpaqueIds(
  value: unknown,
  field: string,
): readonly string[] {
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

function parseProducer(value: unknown): EvidenceProducerV1 {
  const record = requireRecord(value, "producer");
  requireExactKeys(record, ["producer_id", "producer_kind"], "producer");
  return {
    producer_id: requireOpaqueId(record.producer_id, "producer.producer_id"),
    producer_kind: requireStateId(record.producer_kind, "producer.producer_kind"),
  };
}

function parseContentArtifactIdentity(
  value: unknown,
): EvidenceContentArtifactIdentityV1 {
  const record = requireRecord(value, "content_artifact_identity");
  requireExactKeys(
    record,
    ["identity_kind", "identity_id"],
    "content_artifact_identity",
  );
  if (record.identity_kind !== "CONTENT" && record.identity_kind !== "ARTIFACT") {
    throw new TypeError(
      "content_artifact_identity.identity_kind must equal CONTENT or ARTIFACT",
    );
  }
  return {
    identity_kind: record.identity_kind,
    identity_id: requireOpaqueId(
      record.identity_id,
      "content_artifact_identity.identity_id",
    ),
  };
}

function parseFreshness(value: unknown): EvidenceFreshnessV1 {
  const record = requireRecord(value, "freshness");
  requireExactKeys(
    record,
    ["observed_at_epoch_ms", "expires_at_epoch_ms"],
    "freshness",
  );
  const observedAt = requireEpochMs(
    record.observed_at_epoch_ms,
    "freshness.observed_at_epoch_ms",
  );
  const expiresAt =
    record.expires_at_epoch_ms === null
      ? null
      : requireEpochMs(
          record.expires_at_epoch_ms,
          "freshness.expires_at_epoch_ms",
        );
  if (expiresAt !== null && expiresAt <= observedAt) {
    throw new TypeError(
      "freshness.expires_at_epoch_ms must be greater than observed_at_epoch_ms",
    );
  }
  return {
    observed_at_epoch_ms: observedAt,
    expires_at_epoch_ms: expiresAt,
  };
}

function parseRetention(
  value: unknown,
  observedAt: number,
): EvidenceRetentionV1 {
  const record = requireRecord(value, "retention");
  requireExactKeys(
    record,
    ["retention_class", "retain_until_epoch_ms"],
    "retention",
  );
  const retainUntil =
    record.retain_until_epoch_ms === null
      ? null
      : requireEpochMs(
          record.retain_until_epoch_ms,
          "retention.retain_until_epoch_ms",
        );
  if (retainUntil !== null && retainUntil < observedAt) {
    throw new TypeError(
      "retention.retain_until_epoch_ms cannot be before freshness.observed_at_epoch_ms",
    );
  }
  return {
    retention_class: requireStateId(
      record.retention_class,
      "retention.retention_class",
    ),
    retain_until_epoch_ms: retainUntil,
  };
}

function parseLineage(value: unknown, evidenceId: string): EvidenceLineageV1 {
  const record = requireRecord(value, "lineage");
  requireExactKeys(
    record,
    ["parent_evidence_refs", "derivation_ref"],
    "lineage",
  );
  const parentEvidenceRefs = parseCanonicalOpaqueIds(
    record.parent_evidence_refs,
    "lineage.parent_evidence_refs",
  );
  if (parentEvidenceRefs.includes(evidenceId)) {
    throw new TypeError("evidence lineage cannot reference itself");
  }
  return {
    parent_evidence_refs: parentEvidenceRefs,
    derivation_ref: requireNullableOpaqueId(
      record.derivation_ref,
      "lineage.derivation_ref",
    ),
  };
}

export function parseEvidenceRefV1(value: unknown): EvidenceRefV1 {
  const record = requireRecord(value, "evidence ref");
  requireExactKeys(
    record,
    [
      "schema_version",
      "evidence_id",
      "producer",
      "run_id",
      "target_id",
      "kind",
      "content_artifact_identity",
      "digest_sha256",
      "trust_class",
      "data_classification",
      "freshness",
      "redaction_state",
      "retention",
      "lineage",
    ],
    "evidence ref",
  );

  if (record.schema_version !== EVIDENCE_REF_SCHEMA_VERSION) {
    throw new TypeError("evidence ref schema_version must equal 1");
  }

  const evidenceId = requireOpaqueId(record.evidence_id, "evidence_id");
  const freshness = parseFreshness(record.freshness);

  return {
    schema_version: EVIDENCE_REF_SCHEMA_VERSION,
    evidence_id: evidenceId,
    producer: parseProducer(record.producer),
    run_id: requireOpaqueId(record.run_id, "run_id"),
    target_id: requireOpaqueId(record.target_id, "target_id"),
    kind: requireStateId(record.kind, "kind"),
    content_artifact_identity: parseContentArtifactIdentity(
      record.content_artifact_identity,
    ),
    digest_sha256: requireSha256(record.digest_sha256, "digest_sha256"),
    trust_class: requireStateId(record.trust_class, "trust_class"),
    data_classification: requireStateId(
      record.data_classification,
      "data_classification",
    ),
    freshness,
    redaction_state: requireStateId(record.redaction_state, "redaction_state"),
    retention: parseRetention(record.retention, freshness.observed_at_epoch_ms),
    lineage: parseLineage(record.lineage, evidenceId),
  };
}

export function createEvidenceRefV1(
  input: EvidenceRefInputV1,
): EvidenceRefV1 {
  return parseEvidenceRefV1({
    schema_version: EVIDENCE_REF_SCHEMA_VERSION,
    evidence_id: input.evidence_id,
    producer: input.producer,
    run_id: input.run_id,
    target_id: input.target_id,
    kind: input.kind,
    content_artifact_identity: input.content_artifact_identity,
    digest_sha256: input.digest_sha256,
    trust_class: input.trust_class,
    data_classification: input.data_classification,
    freshness: input.freshness,
    redaction_state: input.redaction_state,
    retention: input.retention,
    lineage: {
      parent_evidence_refs: normalizeOpaqueIds(
        input.lineage.parent_evidence_refs,
        "lineage.parent_evidence_refs",
      ),
      derivation_ref: input.lineage.derivation_ref,
    },
  });
}

function requireTargetRunBindings(
  evidence: EvidenceRefV1,
  target: AssuranceTargetV1,
  run: EngineRunV1,
): void {
  if (evidence.target_id !== target.target_id) {
    throw new TypeError("evidence target_id does not match AssuranceTarget");
  }
  if (evidence.run_id !== run.run_id) {
    throw new TypeError("evidence run_id does not match EngineRun");
  }
  if (run.target_id !== target.target_id) {
    throw new TypeError("EngineRun target_id does not match AssuranceTarget");
  }
}

function requireArtifactResolution(
  evidence: EvidenceRefV1,
  run: EngineRunV1,
): void {
  if (evidence.content_artifact_identity.identity_kind !== "ARTIFACT") return;
  if (
    !run.output_artifact_refs.includes(
      evidence.content_artifact_identity.identity_id,
    )
  ) {
    throw new TypeError(
      "artifact-backed evidence does not resolve in EngineRun output_artifact_refs",
    );
  }
}

function requireParentEvidenceResolution(
  evidence: EvidenceRefV1,
  availableEvidenceIds: readonly string[],
): void {
  const available = new Set(
    normalizeOpaqueIds(availableEvidenceIds, "available_evidence_ids"),
  );
  for (const parentRef of evidence.lineage.parent_evidence_refs) {
    if (!available.has(parentRef)) {
      throw new TypeError(
        "evidence lineage contains dangling parent evidence ref: " + parentRef,
      );
    }
  }
}

function requireCurrentFreshness(
  evidence: EvidenceRefV1,
  asOfEpochMs: number,
): void {
  const asOf = requireEpochMs(asOfEpochMs, "as_of_epoch_ms");
  if (asOf < evidence.freshness.observed_at_epoch_ms) {
    throw new TypeError("evidence is not yet observable at as_of_epoch_ms");
  }
  if (
    evidence.freshness.expires_at_epoch_ms !== null &&
    asOf >= evidence.freshness.expires_at_epoch_ms
  ) {
    throw new TypeError("evidence is stale at as_of_epoch_ms");
  }
}

export function assertEvidenceRefResolvesV1(
  evidence: unknown,
  context: EvidenceResolutionContextV1,
): void {
  const parsedEvidence = parseEvidenceRefV1(evidence);
  const target = parseAssuranceTargetV1(context.target);
  const run = parseEngineRunV1(context.run);

  requireTargetRunBindings(parsedEvidence, target, run);
  requireArtifactResolution(parsedEvidence, run);
  requireParentEvidenceResolution(
    parsedEvidence,
    context.available_evidence_ids,
  );
  requireCurrentFreshness(parsedEvidence, context.as_of_epoch_ms);
}
