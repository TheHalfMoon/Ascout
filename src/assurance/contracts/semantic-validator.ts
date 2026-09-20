import { isDeepStrictEqual } from "node:util";

import {
  assertClaimAssessmentResolvesV1,
  type ClaimAssessmentV1,
} from "./claim-assessment.js";
import {
  assertCoverageClaimResolvesV1,
  type CoverageClaimV1,
} from "./coverage-claim.js";
import {
  assertEngineImplementationIdentityV1,
  type EngineDescriptorV1,
} from "./engine-descriptor.js";
import {
  assertEngineQualificationAppliesV1,
  type EngineQualificationV1,
} from "./engine-qualification.js";
import {
  assertEngineRunBindingsV1,
  type EngineRunV1,
} from "./engine-run.js";
import {
  assertEvidenceRefResolvesV1,
  type EvidenceRefV1,
} from "./evidence-ref.js";
import {
  assertFindingLifecycleV1,
  assertFindingResolvesV1,
  type FindingLifecycleEventV1,
  type FindingV1,
} from "./finding.js";
import {
  assertAssuranceIntentTargetV1,
  type AssuranceIntentV1,
} from "./intent.js";
import {
  assertContradictionRecordResolvesV1,
  assertOmissionRecordResolvesV1,
  type ContradictionRecordV1,
  type OmissionRecordV1,
} from "./missing-conflict.js";
import {
  assertAssurancePlanBindingsV1,
  type AssurancePlanV1,
} from "./plan.js";
import type { AssurancePolicySnapshotV1 } from "./policy.js";
import {
  validateAssuranceStructuralSchemaV1,
  type AssuranceStructuralSchemaKind,
} from "./structural-schema.js";
import type { AssuranceTargetV1 } from "./target.js";

const MAX_GRAPH_ITEMS = 256;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export interface AssuranceSemanticGraphV1 {
  readonly target: unknown;
  readonly intent: unknown;
  readonly policy: unknown;
  readonly plan: unknown;
  readonly engine_descriptors: readonly unknown[];
  readonly engine_qualifications: readonly unknown[];
  readonly engine_runs: readonly unknown[];
  readonly evidence_refs: readonly unknown[];
  readonly findings: readonly unknown[];
  readonly finding_lifecycle_events: readonly unknown[];
  readonly coverage_claims: readonly unknown[];
  readonly omission_records: readonly unknown[];
  readonly contradiction_records: readonly unknown[];
  readonly claim_assessment: unknown;
  readonly mandatory_evidence_ids: readonly string[];
}

interface ParsedSemanticGraphV1 {
  readonly target: AssuranceTargetV1;
  readonly intent: AssuranceIntentV1;
  readonly policy: AssurancePolicySnapshotV1;
  readonly plan: AssurancePlanV1;
  readonly engine_descriptors: readonly EngineDescriptorV1[];
  readonly engine_qualifications: readonly EngineQualificationV1[];
  readonly engine_runs: readonly EngineRunV1[];
  readonly evidence_refs: readonly EvidenceRefV1[];
  readonly findings: readonly FindingV1[];
  readonly finding_lifecycle_events: readonly FindingLifecycleEventV1[];
  readonly coverage_claims: readonly CoverageClaimV1[];
  readonly omission_records: readonly OmissionRecordV1[];
  readonly contradiction_records: readonly ContradictionRecordV1[];
  readonly claim_assessment: ClaimAssessmentV1;
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

function requireArray(
  value: unknown,
  field: string,
): readonly unknown[] {
  if (!Array.isArray(value) || value.length > MAX_GRAPH_ITEMS) {
    throw new TypeError(
      field + " must be an array with at most " + MAX_GRAPH_ITEMS + " items",
    );
  }
  return value;
}

function requireOpaqueIdArray(
  value: unknown,
  field: string,
): readonly string[] {
  const values = requireArray(value, field);
  const result: string[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < values.length; index += 1) {
    const item = values[index];
    if (typeof item !== "string" || !OPAQUE_ID.test(item)) {
      throw new TypeError(
        field + "[" + index + "] must be a bounded opaque identifier",
      );
    }
    if (seen.has(item)) {
      throw new TypeError(field + " contains duplicate identity: " + item);
    }
    seen.add(item);
    result.push(item);
  }

  return result;
}

function structural<T>(
  contractKind: AssuranceStructuralSchemaKind,
  value: unknown,
): T {
  return validateAssuranceStructuralSchemaV1({
    contract_kind: contractKind,
    schema_version: 1,
    value,
  }) as T;
}

function structuralArray<T>(
  contractKind: AssuranceStructuralSchemaKind,
  value: unknown,
  field: string,
): readonly T[] {
  return requireArray(value, field).map((item) =>
    structural<T>(contractKind, item),
  );
}

function parseSemanticGraphV1(value: unknown): ParsedSemanticGraphV1 {
  const record = requireRecord(value, "semantic graph");
  requireExactKeys(
    record,
    [
      "target",
      "intent",
      "policy",
      "plan",
      "engine_descriptors",
      "engine_qualifications",
      "engine_runs",
      "evidence_refs",
      "findings",
      "finding_lifecycle_events",
      "coverage_claims",
      "omission_records",
      "contradiction_records",
      "claim_assessment",
      "mandatory_evidence_ids",
    ],
    "semantic graph",
  );

  return {
    target: structural<AssuranceTargetV1>("ASSURANCE_TARGET", record.target),
    intent: structural<AssuranceIntentV1>("ASSURANCE_INTENT", record.intent),
    policy: structural<AssurancePolicySnapshotV1>(
      "ASSURANCE_POLICY_SNAPSHOT",
      record.policy,
    ),
    plan: structural<AssurancePlanV1>("ASSURANCE_PLAN", record.plan),
    engine_descriptors: structuralArray<EngineDescriptorV1>(
      "ENGINE_DESCRIPTOR",
      record.engine_descriptors,
      "engine_descriptors",
    ),
    engine_qualifications: structuralArray<EngineQualificationV1>(
      "ENGINE_QUALIFICATION",
      record.engine_qualifications,
      "engine_qualifications",
    ),
    engine_runs: structuralArray<EngineRunV1>(
      "ENGINE_RUN",
      record.engine_runs,
      "engine_runs",
    ),
    evidence_refs: structuralArray<EvidenceRefV1>(
      "EVIDENCE_REF",
      record.evidence_refs,
      "evidence_refs",
    ),
    findings: structuralArray<FindingV1>(
      "FINDING",
      record.findings,
      "findings",
    ),
    finding_lifecycle_events: structuralArray<FindingLifecycleEventV1>(
      "FINDING_LIFECYCLE_EVENT",
      record.finding_lifecycle_events,
      "finding_lifecycle_events",
    ),
    coverage_claims: structuralArray<CoverageClaimV1>(
      "COVERAGE_CLAIM",
      record.coverage_claims,
      "coverage_claims",
    ),
    omission_records: structuralArray<OmissionRecordV1>(
      "OMISSION_RECORD",
      record.omission_records,
      "omission_records",
    ),
    contradiction_records: structuralArray<ContradictionRecordV1>(
      "CONTRADICTION_RECORD",
      record.contradiction_records,
      "contradiction_records",
    ),
    claim_assessment: structural<ClaimAssessmentV1>(
      "CLAIM_ASSESSMENT",
      record.claim_assessment,
    ),
    mandatory_evidence_ids: requireOpaqueIdArray(
      record.mandatory_evidence_ids,
      "mandatory_evidence_ids",
    ),
  };
}

function uniqueMap<T>(
  values: readonly T[],
  identity: (value: T) => string,
  field: string,
): ReadonlyMap<string, T> {
  const result = new Map<string, T>();

  for (const value of values) {
    const id = identity(value);
    if (result.has(id)) {
      throw new TypeError(field + " contains duplicate identity: " + id);
    }
    result.set(id, value);
  }

  return result;
}

function requireFromMap<T>(
  map: ReadonlyMap<string, T>,
  id: string,
  field: string,
): T {
  const value = map.get(id);
  if (value === undefined) {
    throw new TypeError(field + " contains dangling ref: " + id);
  }
  return value;
}

function validateEngineGraph(
  graph: ParsedSemanticGraphV1,
): {
  readonly runMap: ReadonlyMap<string, EngineRunV1>;
} {
  const descriptorMap = uniqueMap(
    graph.engine_descriptors,
    (descriptor) => descriptor.engine_id,
    "engine_descriptors",
  );
  const qualificationMap = uniqueMap(
    graph.engine_qualifications,
    (qualification) => qualification.qualification_id,
    "engine_qualifications",
  );
  const runMap = uniqueMap(
    graph.engine_runs,
    (run) => run.run_id,
    "engine_runs",
  );

  for (const engineId of graph.plan.selected_engine_identities) {
    requireFromMap(
      descriptorMap,
      engineId,
      "plan.selected_engine_identities",
    );
  }

  for (const qualification of graph.engine_qualifications) {
    const descriptor = requireFromMap(
      descriptorMap,
      qualification.engine_id,
      "engine_qualifications.engine_id",
    );
    assertEngineImplementationIdentityV1(
      descriptor,
      qualification.implementation_identity,
    );
  }

  for (const run of graph.engine_runs) {
    const descriptor = requireFromMap(
      descriptorMap,
      run.engine_id,
      "engine_runs.engine_id",
    );
    const qualification = requireFromMap(
      qualificationMap,
      run.qualification_id,
      "engine_runs.qualification_id",
    );

    assertEngineRunBindingsV1(
      run,
      graph.plan,
      graph.target,
      descriptor,
      qualification,
    );

    assertEngineQualificationAppliesV1(qualification, {
      descriptor,
      configuration_identity: run.configuration_identity,
      profile_identities: qualification.profile_identities,
      benchmark_corpus_identity: qualification.benchmark_corpus_identity,
      platform_identity: run.runtime_identity.platform_identity,
      as_of_epoch_ms: run.started_at_epoch_ms,
    });
  }

  for (const run of graph.engine_runs) {
    const parentId =
      run.retry_recovery_lineage.retry_of_run_id ??
      run.retry_recovery_lineage.recovery_of_run_id;

    if (parentId === null) continue;
    if (parentId === run.run_id) {
      throw new TypeError("engine run lineage cannot reference itself");
    }

    const parent = requireFromMap(
      runMap,
      parentId,
      "engine run retry/recovery lineage",
    );

    if (parent.target_id !== run.target_id) {
      throw new TypeError("engine run lineage crosses target identity");
    }
    if (parent.engine_id !== run.engine_id) {
      throw new TypeError("engine run lineage crosses engine identity");
    }
    if (
      parent.retry_recovery_lineage.attempt_number >=
      run.retry_recovery_lineage.attempt_number
    ) {
      throw new TypeError("engine run lineage parent attempt must precede child");
    }
    if (parent.ended_at_epoch_ms > run.started_at_epoch_ms) {
      throw new TypeError("engine run lineage parent must finish before child");
    }
  }

  return { runMap };
}

function assertEvidenceLineageAcyclic(
  evidenceMap: ReadonlyMap<string, EvidenceRefV1>,
): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new TypeError("evidence lineage contains a cycle at: " + id);
    }

    visiting.add(id);
    const evidence = requireFromMap(
      evidenceMap,
      id,
      "evidence lineage",
    );

    for (const parentId of evidence.lineage.parent_evidence_refs) {
      if (parentId === id) {
        throw new TypeError("evidence lineage cannot reference itself: " + id);
      }
      visit(parentId);
    }

    visiting.delete(id);
    visited.add(id);
  };

  for (const id of evidenceMap.keys()) {
    visit(id);
  }
}

function validateEvidenceGraph(
  graph: ParsedSemanticGraphV1,
  runMap: ReadonlyMap<string, EngineRunV1>,
): ReadonlyMap<string, EvidenceRefV1> {
  const evidenceMap = uniqueMap(
    graph.evidence_refs,
    (evidence) => evidence.evidence_id,
    "evidence_refs",
  );
  const availableEvidenceIds = [...evidenceMap.keys()];

  for (const evidence of graph.evidence_refs) {
    const run = requireFromMap(
      runMap,
      evidence.run_id,
      "evidence_refs.run_id",
    );

    assertEvidenceRefResolvesV1(evidence, {
      target: graph.target,
      run,
      available_evidence_ids: availableEvidenceIds,
      as_of_epoch_ms: evidence.freshness.observed_at_epoch_ms,
    });
  }

  assertEvidenceLineageAcyclic(evidenceMap);
  return evidenceMap;
}

function validateFindingGraph(
  graph: ParsedSemanticGraphV1,
  runMap: ReadonlyMap<string, EngineRunV1>,
  evidenceMap: ReadonlyMap<string, EvidenceRefV1>,
): void {
  const findingMap = uniqueMap(
    graph.findings,
    (finding) => finding.finding_id,
    "findings",
  );
  uniqueMap(
    graph.finding_lifecycle_events,
    (event) => event.lifecycle_event_id,
    "finding_lifecycle_events",
  );

  const targetIds = [graph.target.target_id];
  const runIds = [...runMap.keys()];
  const evidenceIds = [...evidenceMap.keys()];

  for (const finding of graph.findings) {
    assertFindingResolvesV1(finding, {
      available_target_ids: targetIds,
      available_run_ids: runIds,
      available_evidence_ids: evidenceIds,
    });
  }

  const eventsByFinding = new Map<string, FindingLifecycleEventV1[]>();
  for (const event of graph.finding_lifecycle_events) {
    requireFromMap(
      findingMap,
      event.finding_id,
      "finding_lifecycle_events.finding_id",
    );
    const events = eventsByFinding.get(event.finding_id) ?? [];
    events.push(event);
    eventsByFinding.set(event.finding_id, events);
  }

  for (const finding of graph.findings) {
    const events = eventsByFinding.get(finding.finding_id) ?? [];
    assertFindingLifecycleV1(finding, events, {
      available_target_ids: targetIds,
      available_evidence_ids: evidenceIds,
    });
  }
}

function validateCoverageAndConflictGraph(
  graph: ParsedSemanticGraphV1,
  runMap: ReadonlyMap<string, EngineRunV1>,
  evidenceMap: ReadonlyMap<string, EvidenceRefV1>,
): {
  readonly coverageMap: ReadonlyMap<string, CoverageClaimV1>;
  readonly omissionMap: ReadonlyMap<string, OmissionRecordV1>;
  readonly contradictionMap: ReadonlyMap<string, ContradictionRecordV1>;
} {
  const coverageMap = uniqueMap(
    graph.coverage_claims,
    (claim) => claim.coverage_claim_id,
    "coverage_claims",
  );
  const omissionMap = uniqueMap(
    graph.omission_records,
    (omission) => omission.omission_id,
    "omission_records",
  );
  const contradictionMap = uniqueMap(
    graph.contradiction_records,
    (contradiction) => contradiction.contradiction_id,
    "contradiction_records",
  );

  const runIds = [...runMap.keys()];
  const evidenceIds = [...evidenceMap.keys()];
  const evidenceIdSet = new Set(evidenceIds);

  for (const claim of graph.coverage_claims) {
    assertCoverageClaimResolvesV1(claim, {
      target: graph.target,
      available_run_ids: runIds,
      available_evidence_ids: evidenceIds,
    });
  }

  for (const omission of graph.omission_records) {
    assertOmissionRecordResolvesV1(
      omission,
      graph.target,
      evidenceIdSet,
    );
  }

  for (const contradiction of graph.contradiction_records) {
    assertContradictionRecordResolvesV1(
      contradiction,
      graph.target,
      evidenceIdSet,
    );
  }

  return { coverageMap, omissionMap, contradictionMap };
}

function validateClaimEvidenceFreshness(
  assessment: ClaimAssessmentV1,
  evidenceMap: ReadonlyMap<string, EvidenceRefV1>,
): void {
  const classes: readonly [string, readonly string[]][] = [
    ["supporting_evidence_refs", assessment.supporting_evidence_refs],
    ["contradicting_evidence_refs", assessment.contradicting_evidence_refs],
    ["missing_evidence_refs", assessment.missing_evidence_refs],
    ["stale_evidence_refs", assessment.stale_evidence_refs],
    ["refused_evidence_refs", assessment.refused_evidence_refs],
    ["unknown_evidence_refs", assessment.unknown_evidence_refs],
  ];
  const membership = new Map<string, string>();

  for (const [field, ids] of classes) {
    for (const id of ids) {
      const previous = membership.get(id);
      if (previous !== undefined) {
        throw new TypeError(
          "claim evidence identity appears in multiple classes: " +
            id +
            " (" +
            previous +
            ", " +
            field +
            ")",
        );
      }
      membership.set(id, field);

      const evidence = requireFromMap(
        evidenceMap,
        id,
        "claim assessment evidence classes",
      );
      const assessedAt = assessment.assessed_at_epoch_ms;

      if (assessedAt < evidence.freshness.observed_at_epoch_ms) {
        throw new TypeError(
          "claim assessment references evidence not yet observable: " + id,
        );
      }

      const isStale =
        evidence.freshness.expires_at_epoch_ms !== null &&
        assessedAt >= evidence.freshness.expires_at_epoch_ms;

      if (field === "stale_evidence_refs") {
        if (!isStale) {
          throw new TypeError(
            "stale_evidence_refs contains evidence that is current: " + id,
          );
        }
      } else if (isStale) {
        throw new TypeError(
          field + " contains stale evidence that must be classified explicitly: " + id,
        );
      }
    }
  }
}

export function validateAssuranceSemanticGraphV1(value: unknown): void {
  const graph = parseSemanticGraphV1(value);

  assertAssuranceIntentTargetV1(graph.intent, graph.target);
  assertAssurancePlanBindingsV1(graph.plan, graph.intent, graph.policy);

  const { runMap } = validateEngineGraph(graph);
  const evidenceMap = validateEvidenceGraph(graph, runMap);

  validateFindingGraph(graph, runMap, evidenceMap);

  const { coverageMap, omissionMap, contradictionMap } =
    validateCoverageAndConflictGraph(graph, runMap, evidenceMap);

  assertClaimAssessmentResolvesV1(graph.claim_assessment, {
    target: graph.target,
    intent: graph.intent,
    available_coverage_claim_ids: [...coverageMap.keys()],
    available_omission_ids: [...omissionMap.keys()],
    available_contradiction_ids: [...contradictionMap.keys()],
    available_evidence_ids: [...evidenceMap.keys()],
    mandatory_evidence_ids: graph.mandatory_evidence_ids,
  });

  validateClaimEvidenceFreshness(
    graph.claim_assessment,
    evidenceMap,
  );
}
