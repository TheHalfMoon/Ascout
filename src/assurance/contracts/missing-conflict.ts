import { isDeepStrictEqual } from "node:util";

import {
  parseAssuranceTargetV1,
  type AssuranceTargetV1,
} from "./target.js";

export const OMISSION_RECORD_SCHEMA_VERSION = 1 as const;
export const CONTRADICTION_RECORD_SCHEMA_VERSION = 1 as const;

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const STATE_ID = /^[A-Z][A-Z0-9_]{0,63}$/u;
const MAX_LIST_ITEMS = 256;
const MAX_TEXT_LENGTH = 512;

export interface OmissionRecordV1 {
  readonly schema_version: 1;
  readonly omission_id: string;
  readonly target_id: string;
  readonly check_class: string;
  readonly reason_code: string;
  readonly reason_text: string;
  readonly claim_impact: string;
  readonly required_qualification: string | null;
  readonly required_effect: string | null;
  readonly evidence_refs: readonly string[];
}

export type OmissionRecordInputV1 = Omit<
  OmissionRecordV1,
  "schema_version"
>;

export interface ContradictionRecordV1 {
  readonly schema_version: 1;
  readonly contradiction_id: string;
  readonly target_id: string;
  readonly left_claim_ref: string;
  readonly right_claim_ref: string;
  readonly left_evidence_refs: readonly string[];
  readonly right_evidence_refs: readonly string[];
  readonly producer_identities: readonly string[];
  readonly reconciliation_status: string;
  readonly required_next_evidence: readonly string[];
}

export type ContradictionRecordInputV1 = Omit<
  ContradictionRecordV1,
  "schema_version"
>;

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

function requireNullableOpaqueId(
  value: unknown,
  field: string,
): string | null {
  return value === null ? null : requireOpaqueId(value, field);
}

function requireStateId(value: unknown, field: string): string {
  if (typeof value !== "string" || !STATE_ID.test(value)) {
    throw new TypeError(
      field + " must be an uppercase bounded state identifier",
    );
  }
  return value;
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
  minimumItems = 0,
): readonly string[] {
  if (
    !Array.isArray(values) ||
    values.length < minimumItems ||
    values.length > MAX_LIST_ITEMS
  ) {
    throw new TypeError(
      field +
        " must contain between " +
        minimumItems +
        " and " +
        MAX_LIST_ITEMS +
        " items",
    );
  }
  const parsed = values.map((value, index) =>
    requireOpaqueId(value, field + "[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
}

function parseCanonicalOpaqueIds(
  value: unknown,
  field: string,
  minimumItems = 0,
): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length < minimumItems ||
    value.length > MAX_LIST_ITEMS
  ) {
    throw new TypeError(
      field +
        " must contain between " +
        minimumItems +
        " and " +
        MAX_LIST_ITEMS +
        " items",
    );
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

function requireUnavailableRequirement(
  qualification: string | null,
  effect: string | null,
): void {
  if (qualification === null && effect === null) {
    throw new TypeError(
      "omission must identify an unavailable required qualification or effect",
    );
  }
}

export function parseOmissionRecordV1(value: unknown): OmissionRecordV1 {
  const record = requireRecord(value, "omission record");
  requireExactKeys(
    record,
    [
      "schema_version",
      "omission_id",
      "target_id",
      "check_class",
      "reason_code",
      "reason_text",
      "claim_impact",
      "required_qualification",
      "required_effect",
      "evidence_refs",
    ],
    "omission record",
  );

  if (record.schema_version !== OMISSION_RECORD_SCHEMA_VERSION) {
    throw new TypeError("omission record schema_version must equal 1");
  }

  const requiredQualification = requireNullableOpaqueId(
    record.required_qualification,
    "required_qualification",
  );
  const requiredEffect = requireNullableOpaqueId(
    record.required_effect,
    "required_effect",
  );
  requireUnavailableRequirement(requiredQualification, requiredEffect);

  return {
    schema_version: OMISSION_RECORD_SCHEMA_VERSION,
    omission_id: requireOpaqueId(record.omission_id, "omission_id"),
    target_id: requireOpaqueId(record.target_id, "target_id"),
    check_class: requireOpaqueId(record.check_class, "check_class"),
    reason_code: requireStateId(record.reason_code, "reason_code"),
    reason_text: requireBoundedText(record.reason_text, "reason_text"),
    claim_impact: requireBoundedText(record.claim_impact, "claim_impact"),
    required_qualification: requiredQualification,
    required_effect: requiredEffect,
    evidence_refs: parseCanonicalOpaqueIds(
      record.evidence_refs,
      "evidence_refs",
    ),
  };
}

export function createOmissionRecordV1(
  input: OmissionRecordInputV1,
): OmissionRecordV1 {
  return parseOmissionRecordV1({
    schema_version: OMISSION_RECORD_SCHEMA_VERSION,
    omission_id: input.omission_id,
    target_id: input.target_id,
    check_class: input.check_class,
    reason_code: input.reason_code,
    reason_text: input.reason_text,
    claim_impact: input.claim_impact,
    required_qualification: input.required_qualification,
    required_effect: input.required_effect,
    evidence_refs: normalizeOpaqueIds(input.evidence_refs, "evidence_refs"),
  });
}

export function assertOmissionRecordResolvesV1(
  omission: unknown,
  target: unknown,
  availableEvidenceIds: ReadonlySet<string>,
): void {
  const parsed = parseOmissionRecordV1(omission);
  const parsedTarget = parseAssuranceTargetV1(target) as AssuranceTargetV1;

  if (parsed.target_id !== parsedTarget.target_id) {
    throw new TypeError(
      "omission target_id does not match AssuranceTarget",
    );
  }

  for (const evidenceRef of parsed.evidence_refs) {
    if (!availableEvidenceIds.has(evidenceRef)) {
      throw new TypeError(
        "omission evidence ref does not resolve: " + evidenceRef,
      );
    }
  }
}

export function parseContradictionRecordV1(
  value: unknown,
): ContradictionRecordV1 {
  const record = requireRecord(value, "contradiction record");
  requireExactKeys(
    record,
    [
      "schema_version",
      "contradiction_id",
      "target_id",
      "left_claim_ref",
      "right_claim_ref",
      "left_evidence_refs",
      "right_evidence_refs",
      "producer_identities",
      "reconciliation_status",
      "required_next_evidence",
    ],
    "contradiction record",
  );

  if (record.schema_version !== CONTRADICTION_RECORD_SCHEMA_VERSION) {
    throw new TypeError("contradiction record schema_version must equal 1");
  }

  return {
    schema_version: CONTRADICTION_RECORD_SCHEMA_VERSION,
    contradiction_id: requireOpaqueId(
      record.contradiction_id,
      "contradiction_id",
    ),
    target_id: requireOpaqueId(record.target_id, "target_id"),
    left_claim_ref: requireOpaqueId(
      record.left_claim_ref,
      "left_claim_ref",
    ),
    right_claim_ref: requireOpaqueId(
      record.right_claim_ref,
      "right_claim_ref",
    ),
    left_evidence_refs: parseCanonicalOpaqueIds(
      record.left_evidence_refs,
      "left_evidence_refs",
      1,
    ),
    right_evidence_refs: parseCanonicalOpaqueIds(
      record.right_evidence_refs,
      "right_evidence_refs",
      1,
    ),
    producer_identities: parseCanonicalOpaqueIds(
      record.producer_identities,
      "producer_identities",
      1,
    ),
    reconciliation_status: requireStateId(
      record.reconciliation_status,
      "reconciliation_status",
    ),
    required_next_evidence: parseCanonicalOpaqueIds(
      record.required_next_evidence,
      "required_next_evidence",
      1,
    ),
  };
}

export function createContradictionRecordV1(
  input: ContradictionRecordInputV1,
): ContradictionRecordV1 {
  return parseContradictionRecordV1({
    schema_version: CONTRADICTION_RECORD_SCHEMA_VERSION,
    contradiction_id: input.contradiction_id,
    target_id: input.target_id,
    left_claim_ref: input.left_claim_ref,
    right_claim_ref: input.right_claim_ref,
    left_evidence_refs: normalizeOpaqueIds(
      input.left_evidence_refs,
      "left_evidence_refs",
      1,
    ),
    right_evidence_refs: normalizeOpaqueIds(
      input.right_evidence_refs,
      "right_evidence_refs",
      1,
    ),
    producer_identities: normalizeOpaqueIds(
      input.producer_identities,
      "producer_identities",
      1,
    ),
    reconciliation_status: input.reconciliation_status,
    required_next_evidence: normalizeOpaqueIds(
      input.required_next_evidence,
      "required_next_evidence",
      1,
    ),
  });
}

export function assertContradictionRecordResolvesV1(
  contradiction: unknown,
  target: unknown,
  availableEvidenceIds: ReadonlySet<string>,
): void {
  const parsed = parseContradictionRecordV1(contradiction);
  const parsedTarget = parseAssuranceTargetV1(target) as AssuranceTargetV1;

  if (parsed.target_id !== parsedTarget.target_id) {
    throw new TypeError(
      "contradiction target_id does not match AssuranceTarget",
    );
  }

  const allEvidenceRefs = [
    ...parsed.left_evidence_refs,
    ...parsed.right_evidence_refs,
  ];
  for (const evidenceRef of allEvidenceRefs) {
    if (!availableEvidenceIds.has(evidenceRef)) {
      throw new TypeError(
        "contradiction evidence ref does not resolve: " + evidenceRef,
      );
    }
  }
}
