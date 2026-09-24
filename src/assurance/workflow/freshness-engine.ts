import {
  evaluateWorkflowFreshnessV1,
  type WorkflowFreshnessStateV1,
} from "./kodac-capability-characterization.js";

export const FRESHNESS_ENGINE_SCHEMA_VERSION = 1 as const;

export interface FreshnessAssessmentV1 {
  readonly schema_version: 1;
  readonly subject_identity: string;
  readonly observed_head: string;
  readonly expected_head: string;
  readonly state: WorkflowFreshnessStateV1;
  readonly changed: boolean;
  readonly requires_revalidation: boolean;
  readonly reasons: readonly string[];
}

export interface ReviewEvidenceBindingV1 {
  readonly evidence_id: string;
  readonly bound_head: string;
}

export interface EvidenceCurrencyV1 {
  readonly schema_version: 1;
  readonly evidence_id: string;
  readonly state: WorkflowFreshnessStateV1;
  readonly usable_as_current: boolean;
  readonly reasons: readonly string[];
}

const SHA_HEX = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;

export function assessFreshnessV1(
  subjectIdentity: string,
  observedHead: string,
  expectedHead: string,
): FreshnessAssessmentV1 {
  const base = {
    schema_version: FRESHNESS_ENGINE_SCHEMA_VERSION,
    subject_identity: subjectIdentity,
    observed_head: observedHead,
    expected_head: expectedHead,
  } as const;
  if (
    !SHA_HEX.test(observedHead) ||
    !SHA_HEX.test(expectedHead) ||
    subjectIdentity.length === 0
  ) {
    return {
      ...base,
      state: "UNKNOWN",
      changed: false,
      requires_revalidation: true,
      reasons: Object.freeze(["identity or head is malformed"]),
    };
  }
  const state = evaluateWorkflowFreshnessV1(observedHead, expectedHead);
  if (state === "CURRENT") {
    return {
      ...base,
      state,
      changed: false,
      requires_revalidation: false,
      reasons: Object.freeze([]),
    };
  }
  if (state === "STALE") {
    return {
      ...base,
      state,
      changed: true,
      requires_revalidation: true,
      reasons: Object.freeze(["observed head differs from expected head"]),
    };
  }
  return {
    ...base,
    state,
    changed: false,
    requires_revalidation: true,
    reasons: Object.freeze(["freshness cannot be determined"]),
  };
}

export function validateEvidenceCurrencyV1(
  evidence: ReviewEvidenceBindingV1,
  expectedHead: string,
): EvidenceCurrencyV1 {
  const base = {
    schema_version: FRESHNESS_ENGINE_SCHEMA_VERSION,
    evidence_id: evidence.evidence_id,
  } as const;
  if (evidence.evidence_id.length === 0) {
    return {
      ...base,
      state: "UNKNOWN",
      usable_as_current: false,
      reasons: Object.freeze(["evidence identity is empty"]),
    };
  }
  const assessment = assessFreshnessV1(
    evidence.evidence_id,
    evidence.bound_head,
    expectedHead,
  );
  return {
    ...base,
    state: assessment.state,
    usable_as_current: assessment.state === "CURRENT",
    reasons: assessment.reasons,
  };
}

export function requiresRevalidationV1(
  state: WorkflowFreshnessStateV1,
): boolean {
  return state !== "CURRENT";
}
