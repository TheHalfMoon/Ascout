import {
  isSelfReviewV1,
  type ReviewerLineageV1,
} from "./kodac-capability-characterization.js";

export const REVIEWER_ROLE_SCHEMA_VERSION = 1 as const;

export const WORKFLOW_ROLES = [
  "PRODUCER",
  "REVIEWER",
  "ACCEPTANCE_REVIEWER",
] as const;

export type WorkflowRoleV1 = (typeof WORKFLOW_ROLES)[number];

export interface RoleAssignmentV1 {
  readonly role: WorkflowRoleV1;
  readonly lineage: ReviewerLineageV1;
}

export interface SeparationAssessmentV1 {
  readonly schema_version: 1;
  readonly satisfied: boolean;
  readonly acceptance_critical: boolean;
  readonly reasons: readonly string[];
}

export function enforceRoleSeparationV1(
  producer: ReviewerLineageV1,
  reviewer: ReviewerLineageV1,
  acceptanceReviewer: ReviewerLineageV1 | null,
  acceptanceCritical: boolean,
): SeparationAssessmentV1 {
  const base = {
    schema_version: REVIEWER_ROLE_SCHEMA_VERSION,
    acceptance_critical: acceptanceCritical,
  } as const;
  if (isSelfReviewV1(producer, reviewer)) {
    return {
      ...base,
      satisfied: false,
      reasons: Object.freeze(["reviewer must be independent of producer"]),
    };
  }
  if (!acceptanceCritical) {
    return {
      ...base,
      satisfied: true,
      reasons: Object.freeze([]),
    };
  }
  if (acceptanceReviewer === null) {
    return {
      ...base,
      satisfied: false,
      reasons: Object.freeze([
        "acceptance-critical work requires an acceptance reviewer",
      ]),
    };
  }
  if (isSelfReviewV1(producer, acceptanceReviewer)) {
    return {
      ...base,
      satisfied: false,
      reasons: Object.freeze([
        "acceptance reviewer must be independent of producer",
      ]),
    };
  }
  if (isSelfReviewV1(reviewer, acceptanceReviewer)) {
    return {
      ...base,
      satisfied: false,
      reasons: Object.freeze([
        "acceptance reviewer must be independent of reviewer",
      ]),
    };
  }
  return {
    ...base,
    satisfied: true,
    reasons: Object.freeze([]),
  };
}

export function isAcceptanceEnforceableV1(
  assignments: readonly RoleAssignmentV1[],
  acceptanceCritical: boolean,
): boolean {
  const producer = assignments.find(
    (assignment) => assignment.role === "PRODUCER",
  );
  const reviewer = assignments.find(
    (assignment) => assignment.role === "REVIEWER",
  );
  if (producer === undefined || reviewer === undefined) {
    return false;
  }
  const acceptance = assignments.find(
    (assignment) => assignment.role === "ACCEPTANCE_REVIEWER",
  );
  const assessment = enforceRoleSeparationV1(
    producer.lineage,
    reviewer.lineage,
    acceptance === undefined ? null : acceptance.lineage,
    acceptanceCritical,
  );
  return assessment.satisfied;
}
