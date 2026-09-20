import { isDeepStrictEqual } from "node:util";

import {
  parseAssuranceIntentV1,
  type AssuranceIntentV1,
} from "./intent.js";
import {
  assertSameAssuranceTargetV1,
  parseAssuranceTargetV1,
  type AssuranceTargetV1,
} from "./target.js";

export const CLAIM_ASSESSMENT_SCHEMA_VERSION = 1 as const;

export const CLAIM_ASSESSMENT_STATES = [
  "SUPPORTED",
  "BLOCKED",
  "INCOMPLETE",
  "INCONCLUSIVE",
  "STALE",
  "REFUSED",
] as const;

export type ClaimAssessmentState =
  (typeof CLAIM_ASSESSMENT_STATES)[number];

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const CLAIM_ID = /^[A-Z][A-Z0-9_]{0,63}$/u;
const STATE_ID = /^[A-Z][A-Z0-9_]{0,63}$/u;
const MAX_LIST_ITEMS = 256;
const MAX_TEXT_LENGTH = 512;

export interface ClaimAssessmentV1 {
  readonly schema_version: 1;
  readonly claim_assessment_id: string;
  readonly target_id: string;
  readonly intent_id: string;
  readonly requested_claim: string;
  readonly state: ClaimAssessmentState;
  readonly coverage_claim_refs: readonly string[];
  readonly omission_refs: readonly string[];
  readonly contradiction_refs: readonly string[];
  readonly supporting_evidence_refs: readonly string[];
  readonly contradicting_evidence_refs: readonly string[];
  readonly missing_evidence_refs: readonly string[];
  readonly stale_evidence_refs: readonly string[];
  readonly refused_evidence_refs: readonly string[];
  readonly unknown_evidence_refs: readonly string[];
  readonly reason_codes: readonly string[];
  readonly limitations: readonly string[];
  readonly assessed_at_epoch_ms: number;
}

export type ClaimAssessmentInputV1 = Omit<
  ClaimAssessmentV1,
  "schema_version"
>;

export interface ClaimAssessmentResolutionContextV1 {
  readonly target: AssuranceTargetV1;
  readonly intent: AssuranceIntentV1;
  readonly available_coverage_claim_ids: readonly string[];
  readonly available_omission_ids: readonly string[];
  readonly available_contradiction_ids: readonly string[];
  readonly available_evidence_ids: readonly string[];
  readonly mandatory_evidence_ids: readonly string[];
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

function requireClaimId(value: unknown, field: string): string {
  if (typeof value !== "string" || !CLAIM_ID.test(value)) {
    throw new TypeError(field + " must be an uppercase bounded claim identifier");
  }
  return value;
}

function requireStateId(value: unknown, field: string): string {
  if (typeof value !== "string" || !STATE_ID.test(value)) {
    throw new TypeError(field + " must be an uppercase bounded state identifier");
  }
  return value;
}

function requireAssessmentState(value: unknown): ClaimAssessmentState {
  if (
    typeof value !== "string" ||
    !CLAIM_ASSESSMENT_STATES.includes(value as ClaimAssessmentState)
  ) {
    throw new TypeError("state is invalid or unsupported");
  }
  return value as ClaimAssessmentState;
}

function requireEpochMs(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(field + " must be a non-negative safe integer epoch ms");
  }
  return value as number;
}

function requireBoundedText(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > MAX_TEXT_LENGTH ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    throw new TypeError(
      field + " must be bounded non-empty single-line text",
    );
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

function normalizeStateIds(
  values: readonly string[],
  field: string,
): readonly string[] {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = values.map((value, index) =>
    requireStateId(value, field + "[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
}

function parseCanonicalStateIds(
  value: unknown,
  field: string,
): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = value.map((entry, index) =>
    requireStateId(entry, field + "[" + index + "]"),
  );
  const canonical = [...new Set(parsed)].sort();
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError(field + " must be unique and canonically sorted");
  }
  return parsed;
}

function normalizeTextList(
  values: readonly string[],
  field: string,
): readonly string[] {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = values.map((value, index) =>
    requireBoundedText(value, field + "[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
}

function parseCanonicalTextList(
  value: unknown,
  field: string,
): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = value.map((entry, index) =>
    requireBoundedText(entry, field + "[" + index + "]"),
  );
  const canonical = [...new Set(parsed)].sort();
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError(field + " must be unique and canonically sorted");
  }
  return parsed;
}

function assertSupportedShape(assessment: ClaimAssessmentV1): void {
  if (assessment.state !== "SUPPORTED") return;

  const forbidden: readonly [string, readonly string[]][] = [
    ["omission_refs", assessment.omission_refs],
    ["contradiction_refs", assessment.contradiction_refs],
    ["contradicting_evidence_refs", assessment.contradicting_evidence_refs],
    ["missing_evidence_refs", assessment.missing_evidence_refs],
    ["stale_evidence_refs", assessment.stale_evidence_refs],
    ["refused_evidence_refs", assessment.refused_evidence_refs],
    ["unknown_evidence_refs", assessment.unknown_evidence_refs],
  ];

  const nonEmpty = forbidden.find(([, refs]) => refs.length > 0);
  if (nonEmpty !== undefined) {
    throw new TypeError(
      "SUPPORTED claim assessment cannot contain " + nonEmpty[0],
    );
  }
}

export function parseClaimAssessmentV1(value: unknown): ClaimAssessmentV1 {
  const record = requireRecord(value, "claim assessment");
  requireExactKeys(
    record,
    [
      "schema_version",
      "claim_assessment_id",
      "target_id",
      "intent_id",
      "requested_claim",
      "state",
      "coverage_claim_refs",
      "omission_refs",
      "contradiction_refs",
      "supporting_evidence_refs",
      "contradicting_evidence_refs",
      "missing_evidence_refs",
      "stale_evidence_refs",
      "refused_evidence_refs",
      "unknown_evidence_refs",
      "reason_codes",
      "limitations",
      "assessed_at_epoch_ms",
    ],
    "claim assessment",
  );

  if (record.schema_version !== CLAIM_ASSESSMENT_SCHEMA_VERSION) {
    throw new TypeError("claim assessment schema_version must equal 1");
  }

  const assessment: ClaimAssessmentV1 = {
    schema_version: CLAIM_ASSESSMENT_SCHEMA_VERSION,
    claim_assessment_id: requireOpaqueId(
      record.claim_assessment_id,
      "claim_assessment_id",
    ),
    target_id: requireOpaqueId(record.target_id, "target_id"),
    intent_id: requireOpaqueId(record.intent_id, "intent_id"),
    requested_claim: requireClaimId(record.requested_claim, "requested_claim"),
    state: requireAssessmentState(record.state),
    coverage_claim_refs: parseCanonicalOpaqueIds(
      record.coverage_claim_refs,
      "coverage_claim_refs",
    ),
    omission_refs: parseCanonicalOpaqueIds(
      record.omission_refs,
      "omission_refs",
    ),
    contradiction_refs: parseCanonicalOpaqueIds(
      record.contradiction_refs,
      "contradiction_refs",
    ),
    supporting_evidence_refs: parseCanonicalOpaqueIds(
      record.supporting_evidence_refs,
      "supporting_evidence_refs",
    ),
    contradicting_evidence_refs: parseCanonicalOpaqueIds(
      record.contradicting_evidence_refs,
      "contradicting_evidence_refs",
    ),
    missing_evidence_refs: parseCanonicalOpaqueIds(
      record.missing_evidence_refs,
      "missing_evidence_refs",
    ),
    stale_evidence_refs: parseCanonicalOpaqueIds(
      record.stale_evidence_refs,
      "stale_evidence_refs",
    ),
    refused_evidence_refs: parseCanonicalOpaqueIds(
      record.refused_evidence_refs,
      "refused_evidence_refs",
    ),
    unknown_evidence_refs: parseCanonicalOpaqueIds(
      record.unknown_evidence_refs,
      "unknown_evidence_refs",
    ),
    reason_codes: parseCanonicalStateIds(
      record.reason_codes,
      "reason_codes",
    ),
    limitations: parseCanonicalTextList(record.limitations, "limitations"),
    assessed_at_epoch_ms: requireEpochMs(
      record.assessed_at_epoch_ms,
      "assessed_at_epoch_ms",
    ),
  };

  assertSupportedShape(assessment);
  return assessment;
}

export function createClaimAssessmentV1(
  input: ClaimAssessmentInputV1,
): ClaimAssessmentV1 {
  return parseClaimAssessmentV1({
    schema_version: CLAIM_ASSESSMENT_SCHEMA_VERSION,
    claim_assessment_id: input.claim_assessment_id,
    target_id: input.target_id,
    intent_id: input.intent_id,
    requested_claim: input.requested_claim,
    state: input.state,
    coverage_claim_refs: normalizeOpaqueIds(
      input.coverage_claim_refs,
      "coverage_claim_refs",
    ),
    omission_refs: normalizeOpaqueIds(input.omission_refs, "omission_refs"),
    contradiction_refs: normalizeOpaqueIds(
      input.contradiction_refs,
      "contradiction_refs",
    ),
    supporting_evidence_refs: normalizeOpaqueIds(
      input.supporting_evidence_refs,
      "supporting_evidence_refs",
    ),
    contradicting_evidence_refs: normalizeOpaqueIds(
      input.contradicting_evidence_refs,
      "contradicting_evidence_refs",
    ),
    missing_evidence_refs: normalizeOpaqueIds(
      input.missing_evidence_refs,
      "missing_evidence_refs",
    ),
    stale_evidence_refs: normalizeOpaqueIds(
      input.stale_evidence_refs,
      "stale_evidence_refs",
    ),
    refused_evidence_refs: normalizeOpaqueIds(
      input.refused_evidence_refs,
      "refused_evidence_refs",
    ),
    unknown_evidence_refs: normalizeOpaqueIds(
      input.unknown_evidence_refs,
      "unknown_evidence_refs",
    ),
    reason_codes: normalizeStateIds(input.reason_codes, "reason_codes"),
    limitations: normalizeTextList(input.limitations, "limitations"),
    assessed_at_epoch_ms: input.assessed_at_epoch_ms,
  });
}

function requireRefsResolve(
  refs: readonly string[],
  available: ReadonlySet<string>,
  field: string,
): void {
  for (const ref of refs) {
    if (!available.has(ref)) {
      throw new TypeError(field + " contains dangling ref: " + ref);
    }
  }
}

function allEvidenceRefs(
  assessment: ClaimAssessmentV1,
): readonly string[] {
  return [
    ...assessment.supporting_evidence_refs,
    ...assessment.contradicting_evidence_refs,
    ...assessment.missing_evidence_refs,
    ...assessment.stale_evidence_refs,
    ...assessment.refused_evidence_refs,
    ...assessment.unknown_evidence_refs,
  ];
}

function assertMandatoryEvidenceVisible(
  assessment: ClaimAssessmentV1,
  mandatoryEvidenceIds: readonly string[],
): void {
  const supporting = new Set(assessment.supporting_evidence_refs);
  const negativeOrUnknown = new Set([
    ...assessment.contradicting_evidence_refs,
    ...assessment.missing_evidence_refs,
    ...assessment.stale_evidence_refs,
    ...assessment.refused_evidence_refs,
    ...assessment.unknown_evidence_refs,
  ]);

  for (const mandatoryId of mandatoryEvidenceIds) {
    if (supporting.has(mandatoryId)) continue;

    if (assessment.state === "SUPPORTED") {
      throw new TypeError(
        "SUPPORTED claim assessment is missing mandatory supporting evidence: " +
          mandatoryId,
      );
    }

    if (!negativeOrUnknown.has(mandatoryId)) {
      throw new TypeError(
        "mandatory evidence not supporting the claim must remain visible in a non-supporting evidence class: " +
          mandatoryId,
      );
    }
  }
}

export function assertClaimAssessmentResolvesV1(
  assessment: unknown,
  context: ClaimAssessmentResolutionContextV1,
): void {
  const parsedAssessment = parseClaimAssessmentV1(assessment);
  const parsedTarget = parseAssuranceTargetV1(context.target);
  const parsedIntent = parseAssuranceIntentV1(context.intent);

  assertSameAssuranceTargetV1(parsedIntent.target, parsedTarget);

  if (parsedAssessment.target_id !== parsedTarget.target_id) {
    throw new TypeError(
      "claim assessment target_id does not match AssuranceTarget",
    );
  }
  if (parsedAssessment.intent_id !== parsedIntent.intent_id) {
    throw new TypeError(
      "claim assessment intent_id does not match AssuranceIntent",
    );
  }
  if (parsedAssessment.requested_claim !== parsedIntent.requested_claim) {
    throw new TypeError(
      "claim assessment requested_claim does not match AssuranceIntent",
    );
  }

  const availableCoverageIds = new Set(
    normalizeOpaqueIds(
      context.available_coverage_claim_ids,
      "available_coverage_claim_ids",
    ),
  );
  const availableOmissionIds = new Set(
    normalizeOpaqueIds(
      context.available_omission_ids,
      "available_omission_ids",
    ),
  );
  const availableContradictionIds = new Set(
    normalizeOpaqueIds(
      context.available_contradiction_ids,
      "available_contradiction_ids",
    ),
  );
  const availableEvidenceIds = new Set(
    normalizeOpaqueIds(
      context.available_evidence_ids,
      "available_evidence_ids",
    ),
  );
  const mandatoryEvidenceIds = normalizeOpaqueIds(
    context.mandatory_evidence_ids,
    "mandatory_evidence_ids",
  );

  requireRefsResolve(
    parsedAssessment.coverage_claim_refs,
    availableCoverageIds,
    "coverage_claim_refs",
  );
  requireRefsResolve(
    parsedAssessment.omission_refs,
    availableOmissionIds,
    "omission_refs",
  );
  requireRefsResolve(
    parsedAssessment.contradiction_refs,
    availableContradictionIds,
    "contradiction_refs",
  );
  requireRefsResolve(
    allEvidenceRefs(parsedAssessment),
    availableEvidenceIds,
    "evidence classes",
  );

  assertMandatoryEvidenceVisible(parsedAssessment, mandatoryEvidenceIds);
}

export function isClaimAssessmentSupportedV1(value: unknown): boolean {
  return parseClaimAssessmentV1(value).state === "SUPPORTED";
}
