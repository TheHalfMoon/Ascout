import { isDeepStrictEqual } from "node:util";

import {
  CLAIM_ASSESSMENT_SCHEMA_VERSION,
  parseClaimAssessmentV1,
} from "./claim-assessment.js";
import {
  COVERAGE_CLAIM_SCHEMA_VERSION,
  parseCoverageClaimV1,
} from "./coverage-claim.js";
import {
  ENGINE_DESCRIPTOR_SCHEMA_VERSION,
  parseEngineDescriptorV1,
} from "./engine-descriptor.js";
import {
  ENGINE_QUALIFICATION_SCHEMA_VERSION,
  parseEngineQualificationV1,
} from "./engine-qualification.js";
import {
  ENGINE_RUN_SCHEMA_VERSION,
  parseEngineRunV1,
} from "./engine-run.js";
import {
  EVIDENCE_REF_SCHEMA_VERSION,
  parseEvidenceRefV1,
} from "./evidence-ref.js";
import {
  FINDING_LIFECYCLE_EVENT_SCHEMA_VERSION,
  FINDING_SCHEMA_VERSION,
  parseFindingLifecycleEventV1,
  parseFindingV1,
} from "./finding.js";
import {
  ASSURANCE_INTENT_SCHEMA_VERSION,
  parseAssuranceIntentV1,
} from "./intent.js";
import {
  CONTRADICTION_RECORD_SCHEMA_VERSION,
  OMISSION_RECORD_SCHEMA_VERSION,
  parseContradictionRecordV1,
  parseOmissionRecordV1,
} from "./missing-conflict.js";
import {
  ASSURANCE_PLAN_SCHEMA_VERSION,
  parseAssurancePlanV1,
} from "./plan.js";
import {
  ASSURANCE_POLICY_SCHEMA_VERSION,
  parseAssurancePolicySnapshotV1,
} from "./policy.js";
import {
  ASSURANCE_TARGET_SCHEMA_VERSION,
  parseAssuranceTargetV1,
} from "./target.js";

export const ASSURANCE_STRUCTURAL_SCHEMA_REGISTRY_VERSION = 1 as const;

export const ASSURANCE_STRUCTURAL_SCHEMA_KINDS = [
  "ASSURANCE_TARGET",
  "ASSURANCE_INTENT",
  "ASSURANCE_POLICY_SNAPSHOT",
  "ASSURANCE_PLAN",
  "ENGINE_DESCRIPTOR",
  "ENGINE_QUALIFICATION",
  "ENGINE_RUN",
  "EVIDENCE_REF",
  "FINDING",
  "FINDING_LIFECYCLE_EVENT",
  "COVERAGE_CLAIM",
  "OMISSION_RECORD",
  "CONTRADICTION_RECORD",
  "CLAIM_ASSESSMENT",
] as const;

export type AssuranceStructuralSchemaKind =
  (typeof ASSURANCE_STRUCTURAL_SCHEMA_KINDS)[number];

export interface AssuranceStructuralSchemaDescriptorV1 {
  readonly contract_kind: AssuranceStructuralSchemaKind;
  readonly supported_schema_versions: readonly number[];
}

export interface AssuranceStructuralValidationRequestV1 {
  readonly contract_kind: AssuranceStructuralSchemaKind;
  readonly schema_version: number;
  readonly value: unknown;
}

type StructuralParser = (value: unknown) => unknown;

const STRUCTURAL_PARSERS: Readonly<
  Record<AssuranceStructuralSchemaKind, StructuralParser>
> = Object.freeze({
  ASSURANCE_TARGET: parseAssuranceTargetV1,
  ASSURANCE_INTENT: parseAssuranceIntentV1,
  ASSURANCE_POLICY_SNAPSHOT: parseAssurancePolicySnapshotV1,
  ASSURANCE_PLAN: parseAssurancePlanV1,
  ENGINE_DESCRIPTOR: parseEngineDescriptorV1,
  ENGINE_QUALIFICATION: parseEngineQualificationV1,
  ENGINE_RUN: parseEngineRunV1,
  EVIDENCE_REF: parseEvidenceRefV1,
  FINDING: parseFindingV1,
  FINDING_LIFECYCLE_EVENT: parseFindingLifecycleEventV1,
  COVERAGE_CLAIM: parseCoverageClaimV1,
  OMISSION_RECORD: parseOmissionRecordV1,
  CONTRADICTION_RECORD: parseContradictionRecordV1,
  CLAIM_ASSESSMENT: parseClaimAssessmentV1,
});

const STRUCTURAL_SCHEMA_VERSIONS: Readonly<
  Record<AssuranceStructuralSchemaKind, number>
> = Object.freeze({
  ASSURANCE_TARGET: ASSURANCE_TARGET_SCHEMA_VERSION,
  ASSURANCE_INTENT: ASSURANCE_INTENT_SCHEMA_VERSION,
  ASSURANCE_POLICY_SNAPSHOT: ASSURANCE_POLICY_SCHEMA_VERSION,
  ASSURANCE_PLAN: ASSURANCE_PLAN_SCHEMA_VERSION,
  ENGINE_DESCRIPTOR: ENGINE_DESCRIPTOR_SCHEMA_VERSION,
  ENGINE_QUALIFICATION: ENGINE_QUALIFICATION_SCHEMA_VERSION,
  ENGINE_RUN: ENGINE_RUN_SCHEMA_VERSION,
  EVIDENCE_REF: EVIDENCE_REF_SCHEMA_VERSION,
  FINDING: FINDING_SCHEMA_VERSION,
  FINDING_LIFECYCLE_EVENT: FINDING_LIFECYCLE_EVENT_SCHEMA_VERSION,
  COVERAGE_CLAIM: COVERAGE_CLAIM_SCHEMA_VERSION,
  OMISSION_RECORD: OMISSION_RECORD_SCHEMA_VERSION,
  CONTRADICTION_RECORD: CONTRADICTION_RECORD_SCHEMA_VERSION,
  CLAIM_ASSESSMENT: CLAIM_ASSESSMENT_SCHEMA_VERSION,
});

export const ASSURANCE_STRUCTURAL_SCHEMA_REGISTRY_V1: readonly AssuranceStructuralSchemaDescriptorV1[] =
  Object.freeze(
    ASSURANCE_STRUCTURAL_SCHEMA_KINDS.map((contractKind) =>
      Object.freeze({
        contract_kind: contractKind,
        supported_schema_versions: Object.freeze([
          STRUCTURAL_SCHEMA_VERSIONS[contractKind],
        ]),
      }),
    ),
  );

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

function requireContractKind(value: unknown): AssuranceStructuralSchemaKind {
  if (
    typeof value !== "string" ||
    !ASSURANCE_STRUCTURAL_SCHEMA_KINDS.includes(
      value as AssuranceStructuralSchemaKind,
    )
  ) {
    throw new TypeError("contract_kind is invalid or unsupported");
  }
  return value as AssuranceStructuralSchemaKind;
}

function requireSchemaVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new TypeError("schema_version must be a positive safe integer");
  }
  return value as number;
}

export function parseAssuranceStructuralValidationRequestV1(
  value: unknown,
): AssuranceStructuralValidationRequestV1 {
  const record = requireRecord(value, "structural validation request");
  requireExactKeys(
    record,
    ["contract_kind", "schema_version", "value"],
    "structural validation request",
  );

  return {
    contract_kind: requireContractKind(record.contract_kind),
    schema_version: requireSchemaVersion(record.schema_version),
    value: record.value,
  };
}

export function isAssuranceStructuralSchemaSupportedV1(
  contractKind: unknown,
  schemaVersion: unknown,
): boolean {
  if (
    typeof contractKind !== "string" ||
    !ASSURANCE_STRUCTURAL_SCHEMA_KINDS.includes(
      contractKind as AssuranceStructuralSchemaKind,
    ) ||
    !Number.isSafeInteger(schemaVersion) ||
    (schemaVersion as number) < 1
  ) {
    return false;
  }

  return (
    STRUCTURAL_SCHEMA_VERSIONS[
      contractKind as AssuranceStructuralSchemaKind
    ] === schemaVersion
  );
}

export function validateAssuranceStructuralSchemaV1(
  request: unknown,
): unknown {
  const parsedRequest =
    parseAssuranceStructuralValidationRequestV1(request);

  const supportedVersion =
    STRUCTURAL_SCHEMA_VERSIONS[parsedRequest.contract_kind];

  if (parsedRequest.schema_version !== supportedVersion) {
    throw new TypeError(
      "unsupported schema_version " +
        parsedRequest.schema_version +
        " for contract_kind " +
        parsedRequest.contract_kind,
    );
  }

  return STRUCTURAL_PARSERS[parsedRequest.contract_kind](
    parsedRequest.value,
  );
}
