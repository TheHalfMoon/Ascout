import { isDeepStrictEqual } from "node:util";

export const FINDING_SCHEMA_VERSION = 1 as const;
export const FINDING_LIFECYCLE_EVENT_SCHEMA_VERSION = 1 as const;

export const FINDING_STATUSES = [
  "CANDIDATE",
  "REQUIRES_MORE_EVIDENCE",
  "VALIDATED",
  "OPEN",
  "REJECTED_FALSE_POSITIVE",
  "REPAIRED_PENDING_REVERIFY",
  "VERIFIED_FIXED",
  "ACCEPTED_RISK",
  "SUPERSEDED",
] as const;

export type FindingStatusV1 = (typeof FINDING_STATUSES)[number];

const FINDING_STATUS_SET = new Set<string>(FINDING_STATUSES);
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const STATE_ID = /^[A-Z][A-Z0-9_]{0,63}$/u;
const SAFE_RELATIVE_PATH =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.+\/[.]{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u;
const MAX_LIST_ITEMS = 256;
const MAX_TEXT_LENGTH = 512;

export interface FindingLocationV1 {
  readonly path: string;
  readonly line: number | null;
  readonly column: number | null;
  readonly symbol_id: string | null;
}

export interface FindingProducerObservationV1 {
  readonly observation_id: string;
  readonly producer_id: string;
  readonly run_id: string;
  readonly target_id: string;
  readonly observation_state: string;
  readonly evidence_refs: readonly string[];
  readonly observed_at_epoch_ms: number;
}

export interface FindingSuppressionRiskAcceptanceV1 {
  readonly disposition_kind: "SUPPRESSION" | "RISK_ACCEPTANCE";
  readonly actor_id: string;
  readonly provenance_ref: string;
  readonly reason: string;
  readonly expires_at_epoch_ms: number | null;
  readonly review_at_epoch_ms: number | null;
  readonly evidence_refs: readonly string[];
}

export interface FindingV1 {
  readonly schema_version: 1;
  readonly finding_id: string;
  readonly kind: string;
  readonly severity: string;
  readonly confidence_class: string;
  readonly validation_state: string;
  readonly rule_check_identity: string;
  readonly primary_location: FindingLocationV1 | null;
  readonly related_locations: readonly FindingLocationV1[];
  readonly subject_identities: readonly string[];
  readonly reachability_state: string;
  readonly producer_observations: readonly FindingProducerObservationV1[];
  readonly reproduction_proof_refs: readonly string[];
  readonly first_seen_target_id: string;
  readonly last_verified_target_id: string;
  readonly status: FindingStatusV1;
  readonly suppression_risk_acceptance: FindingSuppressionRiskAcceptanceV1 | null;
}

export type FindingInputV1 = Omit<FindingV1, "schema_version">;

export interface FindingLifecycleActorV1 {
  readonly actor_id: string;
  readonly actor_kind: string;
  readonly provenance_ref: string;
}

export interface FindingLifecycleEventV1 {
  readonly schema_version: 1;
  readonly lifecycle_event_id: string;
  readonly finding_id: string;
  readonly sequence_number: number;
  readonly previous_state: FindingStatusV1 | null;
  readonly new_state: FindingStatusV1;
  readonly actor: FindingLifecycleActorV1;
  readonly target_id: string;
  readonly reason: string;
  readonly evidence_refs: readonly string[];
  readonly occurred_at_epoch_ms: number;
  readonly risk_acceptance_expiry_epoch_ms: number | null;
  readonly review_at_epoch_ms: number | null;
}

export type FindingLifecycleEventInputV1 = Omit<
  FindingLifecycleEventV1,
  "schema_version"
>;

export interface FindingResolutionContextV1 {
  readonly available_target_ids: readonly string[];
  readonly available_run_ids: readonly string[];
  readonly available_evidence_ids: readonly string[];
}

export interface FindingLifecycleResolutionContextV1 {
  readonly available_target_ids: readonly string[];
  readonly available_evidence_ids: readonly string[];
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

function requireFindingStatus(
  value: unknown,
  field: string,
): FindingStatusV1 {
  if (typeof value !== "string" || !FINDING_STATUS_SET.has(value)) {
    throw new TypeError(field + " must be a canonical Finding status");
  }
  return value as FindingStatusV1;
}

function requireEpochMs(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(field + " must be a non-negative safe integer epoch ms");
  }
  return value as number;
}

function requireNullableEpochMs(value: unknown, field: string): number | null {
  return value === null ? null : requireEpochMs(value, field);
}

function requirePositiveSafeInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new TypeError(field + " must be a safe integer >= 1");
  }
  return value as number;
}

function requireNullablePositiveSafeInteger(
  value: unknown,
  field: string,
): number | null {
  return value === null ? null : requirePositiveSafeInteger(value, field);
}

function requireBoundedText(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > MAX_TEXT_LENGTH ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    throw new TypeError(field + " must be bounded non-empty single-line text");
  }
  return value;
}

function requireSafeRelativePath(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > MAX_TEXT_LENGTH ||
    !SAFE_RELATIVE_PATH.test(value)
  ) {
    throw new TypeError(field + " must be a safe repository-relative path");
  }
  return value;
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

function parseLocation(value: unknown, field: string): FindingLocationV1 {
  const record = requireRecord(value, field);
  requireExactKeys(record, ["path", "line", "column", "symbol_id"], field);
  return {
    path: requireSafeRelativePath(record.path, field + ".path"),
    line: requireNullablePositiveSafeInteger(record.line, field + ".line"),
    column: requireNullablePositiveSafeInteger(
      record.column,
      field + ".column",
    ),
    symbol_id: requireNullableOpaqueId(record.symbol_id, field + ".symbol_id"),
  };
}

function locationKey(location: FindingLocationV1): string {
  return [
    location.path,
    location.line === null ? "" : String(location.line).padStart(16, "0"),
    location.column === null ? "" : String(location.column).padStart(16, "0"),
    location.symbol_id ?? "",
  ].join("\u0000");
}

function normalizeLocations(
  values: readonly FindingLocationV1[],
  field: string,
): readonly FindingLocationV1[] {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = values.map((value, index) =>
    parseLocation(value, field + "[" + index + "]"),
  );
  const byKey = new Map(parsed.map((location) => [locationKey(location), location]));
  return [...byKey.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, location]) => location);
}

function parseCanonicalLocations(
  value: unknown,
  field: string,
): readonly FindingLocationV1[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = value.map((entry, index) =>
    parseLocation(entry, field + "[" + index + "]"),
  );
  const keys = parsed.map(locationKey);
  const canonical = [...new Set(keys)].sort();
  if (!isDeepStrictEqual(keys, canonical)) {
    throw new TypeError(field + " must be unique and canonically sorted");
  }
  return parsed;
}

function parseProducerObservation(
  value: unknown,
  field: string,
): FindingProducerObservationV1 {
  const record = requireRecord(value, field);
  requireExactKeys(
    record,
    [
      "observation_id",
      "producer_id",
      "run_id",
      "target_id",
      "observation_state",
      "evidence_refs",
      "observed_at_epoch_ms",
    ],
    field,
  );
  return {
    observation_id: requireOpaqueId(
      record.observation_id,
      field + ".observation_id",
    ),
    producer_id: requireOpaqueId(record.producer_id, field + ".producer_id"),
    run_id: requireOpaqueId(record.run_id, field + ".run_id"),
    target_id: requireOpaqueId(record.target_id, field + ".target_id"),
    observation_state: requireStateId(
      record.observation_state,
      field + ".observation_state",
    ),
    evidence_refs: parseCanonicalOpaqueIds(
      record.evidence_refs,
      field + ".evidence_refs",
    ),
    observed_at_epoch_ms: requireEpochMs(
      record.observed_at_epoch_ms,
      field + ".observed_at_epoch_ms",
    ),
  };
}

function normalizeProducerObservations(
  values: readonly FindingProducerObservationV1[],
): readonly FindingProducerObservationV1[] {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS) {
    throw new TypeError(
      "producer_observations must contain at most " + MAX_LIST_ITEMS + " items",
    );
  }
  const parsed = values.map((value, index) => {
    const observation = parseProducerObservation(
      {
        ...value,
        evidence_refs: normalizeOpaqueIds(
          value.evidence_refs,
          "producer_observations[" + index + "].evidence_refs",
        ),
      },
      "producer_observations[" + index + "]",
    );
    return observation;
  });
  const ids = parsed.map((observation) => observation.observation_id);
  if (new Set(ids).size !== ids.length) {
    throw new TypeError("producer_observations observation_id values must be unique");
  }
  return [...parsed].sort((a, b) =>
    a.observation_id < b.observation_id
      ? -1
      : a.observation_id > b.observation_id
        ? 1
        : 0,
  );
}

function parseCanonicalProducerObservations(
  value: unknown,
): readonly FindingProducerObservationV1[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    throw new TypeError(
      "producer_observations must contain at most " + MAX_LIST_ITEMS + " items",
    );
  }
  const parsed = value.map((entry, index) =>
    parseProducerObservation(entry, "producer_observations[" + index + "]"),
  );
  const ids = parsed.map((observation) => observation.observation_id);
  const canonical = [...new Set(ids)].sort();
  if (!isDeepStrictEqual(ids, canonical)) {
    throw new TypeError(
      "producer_observations must have unique canonically sorted observation_id values",
    );
  }
  return parsed;
}

function parseDisposition(
  value: unknown,
): FindingSuppressionRiskAcceptanceV1 | null {
  if (value === null) return null;
  const record = requireRecord(value, "suppression_risk_acceptance");
  requireExactKeys(
    record,
    [
      "disposition_kind",
      "actor_id",
      "provenance_ref",
      "reason",
      "expires_at_epoch_ms",
      "review_at_epoch_ms",
      "evidence_refs",
    ],
    "suppression_risk_acceptance",
  );
  if (
    record.disposition_kind !== "SUPPRESSION" &&
    record.disposition_kind !== "RISK_ACCEPTANCE"
  ) {
    throw new TypeError(
      "suppression_risk_acceptance.disposition_kind must equal SUPPRESSION or RISK_ACCEPTANCE",
    );
  }
  const expiresAt = requireNullableEpochMs(
    record.expires_at_epoch_ms,
    "suppression_risk_acceptance.expires_at_epoch_ms",
  );
  const reviewAt = requireNullableEpochMs(
    record.review_at_epoch_ms,
    "suppression_risk_acceptance.review_at_epoch_ms",
  );
  return {
    disposition_kind: record.disposition_kind,
    actor_id: requireOpaqueId(
      record.actor_id,
      "suppression_risk_acceptance.actor_id",
    ),
    provenance_ref: requireOpaqueId(
      record.provenance_ref,
      "suppression_risk_acceptance.provenance_ref",
    ),
    reason: requireBoundedText(
      record.reason,
      "suppression_risk_acceptance.reason",
    ),
    expires_at_epoch_ms: expiresAt,
    review_at_epoch_ms: reviewAt,
    evidence_refs: parseCanonicalOpaqueIds(
      record.evidence_refs,
      "suppression_risk_acceptance.evidence_refs",
    ),
  };
}

function normalizeDisposition(
  value: FindingSuppressionRiskAcceptanceV1 | null,
): FindingSuppressionRiskAcceptanceV1 | null {
  if (value === null) return null;
  return parseDisposition({
    ...value,
    evidence_refs: normalizeOpaqueIds(
      value.evidence_refs,
      "suppression_risk_acceptance.evidence_refs",
    ),
  });
}

function validateDispositionForStatus(
  status: FindingStatusV1,
  disposition: FindingSuppressionRiskAcceptanceV1 | null,
): void {
  if (status === "ACCEPTED_RISK") {
    if (
      disposition === null ||
      disposition.disposition_kind !== "RISK_ACCEPTANCE" ||
      disposition.expires_at_epoch_ms === null ||
      disposition.review_at_epoch_ms === null
    ) {
      throw new TypeError(
        "ACCEPTED_RISK requires explicit risk acceptance metadata with expiry and review time",
      );
    }
    if (disposition.review_at_epoch_ms > disposition.expires_at_epoch_ms) {
      throw new TypeError(
        "risk acceptance review_at_epoch_ms must not exceed expires_at_epoch_ms",
      );
    }
  } else if (
    disposition !== null &&
    disposition.disposition_kind === "RISK_ACCEPTANCE"
  ) {
    throw new TypeError(
      "RISK_ACCEPTANCE metadata requires finding status ACCEPTED_RISK",
    );
  }
}

export function parseFindingV1(value: unknown): FindingV1 {
  const record = requireRecord(value, "finding");
  requireExactKeys(
    record,
    [
      "schema_version",
      "finding_id",
      "kind",
      "severity",
      "confidence_class",
      "validation_state",
      "rule_check_identity",
      "primary_location",
      "related_locations",
      "subject_identities",
      "reachability_state",
      "producer_observations",
      "reproduction_proof_refs",
      "first_seen_target_id",
      "last_verified_target_id",
      "status",
      "suppression_risk_acceptance",
    ],
    "finding",
  );

  if (record.schema_version !== FINDING_SCHEMA_VERSION) {
    throw new TypeError("finding schema_version must equal 1");
  }

  const status = requireFindingStatus(record.status, "status");
  const disposition = parseDisposition(record.suppression_risk_acceptance);
  validateDispositionForStatus(status, disposition);

  return {
    schema_version: FINDING_SCHEMA_VERSION,
    finding_id: requireOpaqueId(record.finding_id, "finding_id"),
    kind: requireStateId(record.kind, "kind"),
    severity: requireStateId(record.severity, "severity"),
    confidence_class: requireStateId(
      record.confidence_class,
      "confidence_class",
    ),
    validation_state: requireStateId(
      record.validation_state,
      "validation_state",
    ),
    rule_check_identity: requireOpaqueId(
      record.rule_check_identity,
      "rule_check_identity",
    ),
    primary_location:
      record.primary_location === null
        ? null
        : parseLocation(record.primary_location, "primary_location"),
    related_locations: parseCanonicalLocations(
      record.related_locations,
      "related_locations",
    ),
    subject_identities: parseCanonicalOpaqueIds(
      record.subject_identities,
      "subject_identities",
    ),
    reachability_state: requireStateId(
      record.reachability_state,
      "reachability_state",
    ),
    producer_observations: parseCanonicalProducerObservations(
      record.producer_observations,
    ),
    reproduction_proof_refs: parseCanonicalOpaqueIds(
      record.reproduction_proof_refs,
      "reproduction_proof_refs",
    ),
    first_seen_target_id: requireOpaqueId(
      record.first_seen_target_id,
      "first_seen_target_id",
    ),
    last_verified_target_id: requireOpaqueId(
      record.last_verified_target_id,
      "last_verified_target_id",
    ),
    status,
    suppression_risk_acceptance: disposition,
  };
}

export function createFindingV1(input: FindingInputV1): FindingV1 {
  return parseFindingV1({
    schema_version: FINDING_SCHEMA_VERSION,
    ...input,
    related_locations: normalizeLocations(
      input.related_locations,
      "related_locations",
    ),
    subject_identities: normalizeOpaqueIds(
      input.subject_identities,
      "subject_identities",
    ),
    producer_observations: normalizeProducerObservations(
      input.producer_observations,
    ),
    reproduction_proof_refs: normalizeOpaqueIds(
      input.reproduction_proof_refs,
      "reproduction_proof_refs",
    ),
    suppression_risk_acceptance: normalizeDisposition(
      input.suppression_risk_acceptance,
    ),
  });
}

export function appendFindingProducerObservationV1(
  finding: unknown,
  observation: FindingProducerObservationV1,
): FindingV1 {
  const parsedFinding = parseFindingV1(finding);
  if (
    parsedFinding.producer_observations.some(
      (entry) => entry.observation_id === observation.observation_id,
    )
  ) {
    throw new TypeError("producer observation_id already exists");
  }
  return createFindingV1({
    ...parsedFinding,
    producer_observations: [
      ...parsedFinding.producer_observations,
      observation,
    ],
  });
}

function requireIdentitySet(
  values: readonly string[],
  field: string,
): ReadonlySet<string> {
  return new Set(normalizeOpaqueIds(values, field));
}

function requireAllAvailable(
  refs: readonly string[],
  available: ReadonlySet<string>,
  field: string,
): void {
  for (const ref of refs) {
    if (!available.has(ref)) {
      throw new TypeError(field + " contains dangling identity " + ref);
    }
  }
}

export function assertFindingResolvesV1(
  finding: unknown,
  context: FindingResolutionContextV1,
): void {
  const parsed = parseFindingV1(finding);
  const targetIds = requireIdentitySet(
    context.available_target_ids,
    "available_target_ids",
  );
  const runIds = requireIdentitySet(context.available_run_ids, "available_run_ids");
  const evidenceIds = requireIdentitySet(
    context.available_evidence_ids,
    "available_evidence_ids",
  );

  requireAllAvailable(
    [parsed.first_seen_target_id, parsed.last_verified_target_id],
    targetIds,
    "finding target lineage",
  );
  requireAllAvailable(
    parsed.reproduction_proof_refs,
    evidenceIds,
    "reproduction_proof_refs",
  );

  for (const observation of parsed.producer_observations) {
    requireAllAvailable(
      [observation.target_id],
      targetIds,
      "producer observation target",
    );
    requireAllAvailable(
      [observation.run_id],
      runIds,
      "producer observation run",
    );
    requireAllAvailable(
      observation.evidence_refs,
      evidenceIds,
      "producer observation evidence_refs",
    );
  }

  if (parsed.suppression_risk_acceptance !== null) {
    requireAllAvailable(
      parsed.suppression_risk_acceptance.evidence_refs,
      evidenceIds,
      "suppression_risk_acceptance.evidence_refs",
    );
  }
}

function parseLifecycleActor(value: unknown): FindingLifecycleActorV1 {
  const record = requireRecord(value, "actor");
  requireExactKeys(
    record,
    ["actor_id", "actor_kind", "provenance_ref"],
    "actor",
  );
  return {
    actor_id: requireOpaqueId(record.actor_id, "actor.actor_id"),
    actor_kind: requireStateId(record.actor_kind, "actor.actor_kind"),
    provenance_ref: requireOpaqueId(
      record.provenance_ref,
      "actor.provenance_ref",
    ),
  };
}

export function parseFindingLifecycleEventV1(
  value: unknown,
): FindingLifecycleEventV1 {
  const record = requireRecord(value, "finding lifecycle event");
  requireExactKeys(
    record,
    [
      "schema_version",
      "lifecycle_event_id",
      "finding_id",
      "sequence_number",
      "previous_state",
      "new_state",
      "actor",
      "target_id",
      "reason",
      "evidence_refs",
      "occurred_at_epoch_ms",
      "risk_acceptance_expiry_epoch_ms",
      "review_at_epoch_ms",
    ],
    "finding lifecycle event",
  );

  if (record.schema_version !== FINDING_LIFECYCLE_EVENT_SCHEMA_VERSION) {
    throw new TypeError("finding lifecycle event schema_version must equal 1");
  }

  const newState = requireFindingStatus(record.new_state, "new_state");
  const riskExpiry = requireNullableEpochMs(
    record.risk_acceptance_expiry_epoch_ms,
    "risk_acceptance_expiry_epoch_ms",
  );
  const reviewAt = requireNullableEpochMs(
    record.review_at_epoch_ms,
    "review_at_epoch_ms",
  );
  const occurredAt = requireEpochMs(
    record.occurred_at_epoch_ms,
    "occurred_at_epoch_ms",
  );

  if (newState === "ACCEPTED_RISK") {
    if (riskExpiry === null || reviewAt === null) {
      throw new TypeError(
        "ACCEPTED_RISK lifecycle event requires expiry and review time",
      );
    }
    if (riskExpiry <= occurredAt) {
      throw new TypeError(
        "risk_acceptance_expiry_epoch_ms must be after occurred_at_epoch_ms",
      );
    }
    if (reviewAt < occurredAt || reviewAt > riskExpiry) {
      throw new TypeError(
        "review_at_epoch_ms must be between occurrence and risk acceptance expiry",
      );
    }
  } else if (riskExpiry !== null || reviewAt !== null) {
    throw new TypeError(
      "risk acceptance timing is allowed only for ACCEPTED_RISK lifecycle events",
    );
  }

  return {
    schema_version: FINDING_LIFECYCLE_EVENT_SCHEMA_VERSION,
    lifecycle_event_id: requireOpaqueId(
      record.lifecycle_event_id,
      "lifecycle_event_id",
    ),
    finding_id: requireOpaqueId(record.finding_id, "finding_id"),
    sequence_number: requirePositiveSafeInteger(
      record.sequence_number,
      "sequence_number",
    ),
    previous_state:
      record.previous_state === null
        ? null
        : requireFindingStatus(record.previous_state, "previous_state"),
    new_state: newState,
    actor: parseLifecycleActor(record.actor),
    target_id: requireOpaqueId(record.target_id, "target_id"),
    reason: requireBoundedText(record.reason, "reason"),
    evidence_refs: parseCanonicalOpaqueIds(
      record.evidence_refs,
      "evidence_refs",
    ),
    occurred_at_epoch_ms: occurredAt,
    risk_acceptance_expiry_epoch_ms: riskExpiry,
    review_at_epoch_ms: reviewAt,
  };
}

export function createFindingLifecycleEventV1(
  input: FindingLifecycleEventInputV1,
): FindingLifecycleEventV1 {
  return parseFindingLifecycleEventV1({
    schema_version: FINDING_LIFECYCLE_EVENT_SCHEMA_VERSION,
    ...input,
    evidence_refs: normalizeOpaqueIds(input.evidence_refs, "evidence_refs"),
  });
}

export function assertFindingLifecycleV1(
  finding: unknown,
  events: readonly unknown[],
  context: FindingLifecycleResolutionContextV1,
): void {
  const parsedFinding = parseFindingV1(finding);
  if (!Array.isArray(events) || events.length < 1 || events.length > MAX_LIST_ITEMS) {
    throw new TypeError(
      "finding lifecycle must contain between 1 and " + MAX_LIST_ITEMS + " events",
    );
  }
  const parsedEvents = events.map(parseFindingLifecycleEventV1);
  const targetIds = requireIdentitySet(
    context.available_target_ids,
    "available_target_ids",
  );
  const evidenceIds = requireIdentitySet(
    context.available_evidence_ids,
    "available_evidence_ids",
  );

  const eventIds = new Set<string>();
  let priorState: FindingStatusV1 | null = null;
  let priorTime = -1;

  for (let index = 0; index < parsedEvents.length; index += 1) {
    const event = parsedEvents[index]!;
    const expectedSequence = index + 1;

    if (event.sequence_number !== expectedSequence) {
      throw new TypeError("finding lifecycle sequence numbers must be contiguous from 1");
    }
    if (eventIds.has(event.lifecycle_event_id)) {
      throw new TypeError("finding lifecycle event ids must be unique");
    }
    eventIds.add(event.lifecycle_event_id);

    if (event.finding_id !== parsedFinding.finding_id) {
      throw new TypeError("finding lifecycle event finding_id does not match Finding");
    }
    if (event.previous_state !== priorState) {
      throw new TypeError("finding lifecycle previous_state chain is not exact");
    }
    if (event.occurred_at_epoch_ms < priorTime) {
      throw new TypeError("finding lifecycle timestamps must be non-decreasing");
    }

    requireAllAvailable(
      [event.target_id],
      targetIds,
      "finding lifecycle target",
    );
    requireAllAvailable(
      event.evidence_refs,
      evidenceIds,
      "finding lifecycle evidence_refs",
    );

    priorState = event.new_state;
    priorTime = event.occurred_at_epoch_ms;
  }

  const finalEvent = parsedEvents[parsedEvents.length - 1]!;
  if (finalEvent.new_state !== parsedFinding.status) {
    throw new TypeError(
      "finding lifecycle final new_state must equal Finding status",
    );
  }

  if (parsedFinding.status === "ACCEPTED_RISK") {
    const disposition = parsedFinding.suppression_risk_acceptance;
    if (
      disposition === null ||
      disposition.disposition_kind !== "RISK_ACCEPTANCE" ||
      finalEvent.risk_acceptance_expiry_epoch_ms !==
        disposition.expires_at_epoch_ms ||
      finalEvent.review_at_epoch_ms !== disposition.review_at_epoch_ms
    ) {
      throw new TypeError(
        "ACCEPTED_RISK lifecycle timing must match Finding risk acceptance metadata",
      );
    }
  }
}
