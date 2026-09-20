import { describe, expect, it } from "vitest";

import { createClaimAssessmentV1 } from "../src/assurance/contracts/claim-assessment.js";
import {
  ASSURANCE_STRUCTURAL_SCHEMA_KINDS,
  ASSURANCE_STRUCTURAL_SCHEMA_REGISTRY_V1,
  ASSURANCE_STRUCTURAL_SCHEMA_REGISTRY_VERSION,
  isAssuranceStructuralSchemaSupportedV1,
  parseAssuranceStructuralValidationRequestV1,
  validateAssuranceStructuralSchemaV1,
} from "../src/assurance/contracts/structural-schema.js";
import { createAssuranceTargetV1 } from "../src/assurance/contracts/target.js";
import type { SourceStateV1 } from "../src/receipt/model.js";

const A = "a".repeat(64);
const D = "d".repeat(64);
const HEAD = "b".repeat(40);
const BASE = "c".repeat(40);

function source(): SourceStateV1 {
  return {
    repository_id: "remote:" + A,
    repository_id_kind: "remote",
    portable: true,
    head_sha: HEAD,
    detached: false,
    shallow: false,
    tree_digest_version: 1,
    tree_digest: D,
    tracked_index_entry_count: 22,
    unstaged_changed_count: 0,
    included_untracked_count: 0,
  };
}

function target() {
  return createAssuranceTargetV1({
    target_id: "target:ua-p01-t13",
    source_start_identity: source(),
    base_revision: BASE,
    change_set_identity: "changeset:ua-p01-t13",
    worktree_generation: "generation:13",
    policy_snapshot_id: "policy:canonical-v1",
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P01-T13",
      acceptance_id: "acceptance:structural-schema-v1",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
}

function assessment() {
  return createClaimAssessmentV1({
    claim_assessment_id: "assessment:ua-p01-t13",
    target_id: "target:ua-p01-t13",
    intent_id: "intent:ua-p01-t13",
    requested_claim: "RELEASE_READY",
    state: "INCONCLUSIVE",
    coverage_claim_refs: [],
    omission_refs: [],
    contradiction_refs: [],
    supporting_evidence_refs: [],
    contradicting_evidence_refs: [],
    missing_evidence_refs: [],
    stale_evidence_refs: [],
    refused_evidence_refs: [],
    unknown_evidence_refs: [],
    reason_codes: ["STRUCTURAL_VALIDATION_ONLY"],
    limitations: ["Cross-object semantics are outside this structural slice."],
    assessed_at_epoch_ms: 13_000,
  });
}

describe("UA-P01-T13 structural schema registry", () => {
  it("freezes registry version 1 and every T01-T12 structural contract kind", () => {
    expect(ASSURANCE_STRUCTURAL_SCHEMA_REGISTRY_VERSION).toBe(1);
    expect(ASSURANCE_STRUCTURAL_SCHEMA_KINDS).toEqual([
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
    ]);
    expect(ASSURANCE_STRUCTURAL_SCHEMA_REGISTRY_V1).toEqual(
      ASSURANCE_STRUCTURAL_SCHEMA_KINDS.map((contractKind) => ({
        contract_kind: contractKind,
        supported_schema_versions: [1],
      })),
    );
  });

  it("dispatches a valid early contract to its canonical parser", () => {
    const value = target();
    expect(
      validateAssuranceStructuralSchemaV1({
        contract_kind: "ASSURANCE_TARGET",
        schema_version: 1,
        value,
      }),
    ).toEqual(value);
  });

  it("dispatches a valid terminal contract to its canonical parser", () => {
    const value = assessment();
    expect(
      validateAssuranceStructuralSchemaV1({
        contract_kind: "CLAIM_ASSESSMENT",
        schema_version: 1,
        value,
      }),
    ).toEqual(value);
  });

  it("fails closed on required-shape violations for every registered kind", () => {
    for (const contractKind of ASSURANCE_STRUCTURAL_SCHEMA_KINDS) {
      expect(() =>
        validateAssuranceStructuralSchemaV1({
          contract_kind: contractKind,
          schema_version: 1,
          value: { schema_version: 1 },
        }),
      ).toThrow();
    }
  });

  it("rejects unknown contract kinds", () => {
    expect(() =>
      validateAssuranceStructuralSchemaV1({
        contract_kind: "UNKNOWN_CONTRACT",
        schema_version: 1,
        value: {},
      }),
    ).toThrow("contract_kind is invalid or unsupported");

    expect(
      isAssuranceStructuralSchemaSupportedV1("UNKNOWN_CONTRACT", 1),
    ).toBe(false);
  });

  it("rejects unsupported request schema versions without fallback", () => {
    expect(() =>
      validateAssuranceStructuralSchemaV1({
        contract_kind: "ASSURANCE_TARGET",
        schema_version: 2,
        value: target(),
      }),
    ).toThrow(
      "unsupported schema_version 2 for contract_kind ASSURANCE_TARGET",
    );

    expect(
      isAssuranceStructuralSchemaSupportedV1("ASSURANCE_TARGET", 2),
    ).toBe(false);
    expect(
      isAssuranceStructuralSchemaSupportedV1("ASSURANCE_TARGET", 1),
    ).toBe(true);
  });

  it("requires explicit request version instead of guessing it from value", () => {
    expect(() =>
      parseAssuranceStructuralValidationRequestV1({
        contract_kind: "ASSURANCE_TARGET",
        value: target(),
      }),
    ).toThrow("structural validation request contains missing or unknown fields");
  });

  it("requires the embedded contract version to match its canonical parser", () => {
    const value = target();

    expect(() =>
      validateAssuranceStructuralSchemaV1({
        contract_kind: "ASSURANCE_TARGET",
        schema_version: 1,
        value: {
          ...value,
          schema_version: 2,
        },
      }),
    ).toThrow("assurance target schema_version must equal 1");
  });

  it("rejects malformed request versions", () => {
    for (const schemaVersion of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        parseAssuranceStructuralValidationRequestV1({
          contract_kind: "ASSURANCE_TARGET",
          schema_version: schemaVersion,
          value: target(),
        }),
      ).toThrow("schema_version must be a positive safe integer");
    }
  });

  it("rejects unknown request fields rather than creating an authority surface", () => {
    expect(() =>
      parseAssuranceStructuralValidationRequestV1({
        contract_kind: "ASSURANCE_TARGET",
        schema_version: 1,
        value: target(),
        execution_authority: true,
      }),
    ).toThrow("structural validation request contains missing or unknown fields");
  });

  it("does not accept missing request value", () => {
    expect(() =>
      parseAssuranceStructuralValidationRequestV1({
        contract_kind: "ASSURANCE_TARGET",
        schema_version: 1,
      }),
    ).toThrow("structural validation request contains missing or unknown fields");
  });

  it("does not reinterpret a structurally valid claim assessment as task PASS", () => {
    const parsed = validateAssuranceStructuralSchemaV1({
      contract_kind: "CLAIM_ASSESSMENT",
      schema_version: 1,
      value: assessment(),
    });

    expect(parsed).toEqual(assessment());
    expect(parsed).not.toHaveProperty("pass");
    expect(parsed).not.toHaveProperty("execution_authority");
    expect(parsed).not.toHaveProperty("publication_authority");
  });
});
