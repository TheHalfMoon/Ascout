import type { IntentTest } from "../../browser/intent.js";
import type {
  BrowserEvidenceBundle,
  BrowserOracleRecord,
} from "../../browser/evidence.js";
import type { Journey } from "../../browser/journey.js";

import {
  getTestProfilePolicyV1,
  type TestProfile,
} from "./profile-policy.js";

export const BROWSER_EVIDENCE_PROJECTION_SCHEMA_VERSION = 1 as const;

export const BROWSER_EVIDENCE_STRATEGY = "projection-only" as const;

export type BrowserEvidenceSubstrate =
  | "real-browser"
  | "fixture"
  | "mock"
  | "unknown";

export interface BrowserEvidenceProjectionInputV1 {
  readonly profile: TestProfile;
  readonly intent: IntentTest;
  readonly bundle: BrowserEvidenceBundle | null;
  readonly journey: Journey | null;
  readonly substrate: BrowserEvidenceSubstrate;
  readonly substrate_reason: string | null;
  readonly unknown_limitations: readonly string[];
}

export interface ProjectedOracleV1 {
  readonly oracle_id: string;
  readonly oracle_kind: string;
  readonly authority: string;
  readonly independence_class: string;
}

export interface ProjectedJourneyEdgeV1 {
  readonly edge_id: string;
  readonly kind: string;
}

export interface BrowserEvidenceProjectionV1 {
  readonly schema_version: 1;
  readonly scope: "TEST";
  readonly profile: TestProfile;
  readonly projection_strategy: typeof BROWSER_EVIDENCE_STRATEGY;
  readonly intent_id: string;
  readonly intent_source_identity: string;
  readonly bound_intent_digest: string | null;
  readonly bundle_id: string | null;
  readonly journey_id: string | null;
  readonly session_id: string | null;
  readonly source_identity: string;
  readonly substrate: BrowserEvidenceSubstrate;
  readonly substrate_reason: string | null;
  readonly substitute_declared: boolean;
  readonly oracle_ids: readonly string[];
  readonly oracles: readonly ProjectedOracleV1[];
  readonly journey_edge_kinds: readonly ProjectedJourneyEdgeV1[];
  readonly journey_obligation_refs: readonly string[];
  readonly journey_oracle_refs: readonly string[];
  readonly attempt_count: number;
  readonly assertion_count: number;
  readonly fact_count: number;
  readonly artifact_count: number;
  readonly oracle_count: number;
  readonly node_count: number;
  readonly edge_count: number;
  readonly observed_edge_count: number;
  readonly inferred_edge_count: number;
  readonly missing_evidence: readonly string[];
  readonly unknown_limitations: readonly string[];
  readonly plan_visible_fields: readonly string[];
}

const PLAN_VISIBLE_FIELDS: readonly string[] = [
  "artifact_count",
  "assertion_count",
  "attempt_count",
  "bound_intent_digest",
  "bundle_id",
  "edge_count",
  "fact_count",
  "inferred_edge_count",
  "intent_id",
  "intent_source_identity",
  "journey_edge_kinds",
  "journey_id",
  "journey_obligation_refs",
  "journey_oracle_refs",
  "missing_evidence",
  "node_count",
  "observed_edge_count",
  "oracle_count",
  "oracle_ids",
  "oracles",
  "profile",
  "projection_strategy",
  "scope",
  "session_id",
  "source_identity",
  "substrate",
  "substrate_reason",
  "substitute_declared",
  "unknown_limitations",
] as const;

const SUBSTRATES: readonly BrowserEvidenceSubstrate[] = [
  "real-browser",
  "fixture",
  "mock",
  "unknown",
] as const;

const MOCK_MARKERS: readonly string[] = [
  "mock",
  "fixture",
  "stub",
  "fake",
  "substitute",
  "synthetic",
] as const;

function requireNonEmpty(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(field + " must be non-empty");
  }
}

function requireUniqueSorted(values: readonly string[], field: string): void {
  const sorted = [...values].sort();
  const unique = [...new Set(sorted)];
  if (unique.length !== values.length) {
    throw new TypeError(field + " must contain unique entries");
  }
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] !== sorted[index]) {
      throw new TypeError(field + " must be canonically sorted");
    }
  }
}

function declaresSubstituteText(value: string): boolean {
  const lowered = value.toLowerCase();
  return MOCK_MARKERS.some((marker) => lowered.includes(marker));
}

function collectAttestedTexts(
  intent: IntentTest,
  bundle: BrowserEvidenceBundle | null,
  journey: Journey | null,
  oracles: readonly BrowserOracleRecord[],
): readonly string[] {
  const texts: string[] = [
    intent.intent_id,
    intent.source_identity,
  ];
  if (bundle !== null) {
    texts.push(bundle.bundle_id, bundle.session_id, bundle.source_identity);
  }
  if (journey !== null) {
    texts.push(
      journey.journey_id,
      journey.session_id,
      journey.source_identity,
    );
  }
  for (const oracle of oracles) {
    texts.push(oracle.producer, oracle.provenance.origin);
  }
  return texts;
}

function evidenceTypeCount(
  bundle: BrowserEvidenceBundle,
  type: string,
): number {
  switch (type) {
    case "action-attempt":
      return bundle.attempts.length;
    case "dom-fact":
    case "state-observation":
      return bundle.dom_facts.length;
    case "accessibility-fact":
      return bundle.accessibility_facts.length;
    case "network-record":
      return bundle.network_records.length;
    case "console-record":
      return bundle.console_records.length;
    case "artifact-ref":
      return bundle.artifacts.length;
    default:
      return 0;
  }
}

export function projectBrowserEvidenceV1(
  input: BrowserEvidenceProjectionInputV1,
): BrowserEvidenceProjectionV1 {
  getTestProfilePolicyV1(input.profile);
  if (!SUBSTRATES.includes(input.substrate)) {
    throw new TypeError("unknown browser evidence substrate");
  }
  if (input.intent.version !== 1) {
    throw new TypeError("unknown intent version");
  }
  requireNonEmpty(input.intent.intent_id, "intent_id");
  requireNonEmpty(input.intent.source_identity, "intent source_identity");
  if (input.substrate === "real-browser") {
    if (input.substrate_reason !== null) {
      throw new TypeError("real-browser substrate must not carry a reason");
    }
  } else if (
    input.substrate_reason === null ||
    input.substrate_reason.length === 0
  ) {
    throw new TypeError(input.substrate + " substrate requires a reason");
  }
  const oracles: readonly BrowserOracleRecord[] =
    input.bundle === null ? [] : input.bundle.oracle_records;
  const oracleIds = oracles.map((oracle) => oracle.oracle_id);
  requireUniqueSorted(oracleIds, "oracle_ids");
  const attested = collectAttestedTexts(
    input.intent,
    input.bundle,
    input.journey,
    oracles,
  );
  const carriesSubstituteMarker = attested.some(declaresSubstituteText);
  if (carriesSubstituteMarker && input.substrate === "real-browser") {
    throw new TypeError("hidden mock substitution rejected");
  }
  const sources = new Set<string>([input.intent.source_identity]);
  if (input.bundle !== null) {
    sources.add(input.bundle.source_identity);
  }
  if (input.journey !== null) {
    sources.add(input.journey.source_identity);
  }
  if (sources.size !== 1) {
    throw new TypeError("conflicting source identity across browser truth");
  }
  const sessions = new Set<string>();
  if (input.bundle !== null) {
    sessions.add(input.bundle.session_id);
  }
  if (input.journey !== null) {
    sessions.add(input.journey.session_id);
  }
  if (sessions.size > 1) {
    throw new TypeError("conflicting session identity across browser truth");
  }
  const nodeIds = (input.journey?.nodes ?? []).map((node) => node.node_id);
  requireUniqueSorted(nodeIds, "journey node_ids");
  const edgeIds = (input.journey?.edges ?? []).map((edge) => edge.edge_id);
  requireUniqueSorted(edgeIds, "journey edge_ids");
  for (const limitation of input.unknown_limitations) {
    requireNonEmpty(limitation, "unknown_limitation");
  }
  requireUniqueSorted(input.unknown_limitations, "unknown_limitations");
  const missing: string[] = [];
  if (input.bundle === null) {
    missing.push("evidence-bundle:absent", "oracle:absent");
  } else {
    if (oracles.length === 0) {
      missing.push("oracle:absent");
    }
    for (const oracle of oracles) {
      for (const type of oracle.required_evidence_types) {
        if (evidenceTypeCount(input.bundle, type) === 0) {
          missing.push("oracle:" + oracle.oracle_id + ":missing:" + type);
        }
      }
    }
  }
  if (input.journey === null) {
    missing.push("journey:absent");
  } else {
    if (input.journey.obligation_refs.length === 0) {
      missing.push("journey:obligation-refs-absent");
    }
    if (input.journey.oracle_refs.length === 0) {
      missing.push("journey:oracle-refs-absent");
    }
  }
  missing.sort();
  const projectedOracles = [...oracles]
    .sort((a, b) => (a.oracle_id < b.oracle_id ? -1 : 1))
    .map((oracle) => ({
      authority: oracle.authority,
      independence_class: oracle.independence_class,
      oracle_id: oracle.oracle_id,
      oracle_kind: oracle.oracle_kind,
    }));
  const edges = [...(input.journey?.edges ?? [])].sort((a, b) =>
    a.edge_id < b.edge_id ? -1 : 1,
  );
  let observed = 0;
  let inferred = 0;
  for (const edge of edges) {
    if (edge.kind === "observed") {
      observed += 1;
    } else {
      inferred += 1;
    }
  }
  const sessionId =
    input.bundle !== null
      ? input.bundle.session_id
      : (input.journey?.session_id ?? null);
  const journeyObligationRefs = [...(input.journey?.obligation_refs ?? [])].sort();
  const journeyOracleRefs = [...(input.journey?.oracle_refs ?? [])].sort();
  return Object.freeze({
    artifact_count: input.bundle?.artifacts.length ?? 0,
    assertion_count: input.bundle?.assertions.length ?? 0,
    attempt_count: input.bundle?.attempts.length ?? 0,
    bound_intent_digest: input.bundle?.intent_digest ?? null,
    bundle_id: input.bundle?.bundle_id ?? null,
    edge_count: edges.length,
    fact_count:
      (input.bundle?.dom_facts.length ?? 0) +
      (input.bundle?.accessibility_facts.length ?? 0),
    inferred_edge_count: inferred,
    intent_id: input.intent.intent_id,
    intent_source_identity: input.intent.source_identity,
    journey_edge_kinds: Object.freeze(
      edges.map((edge) => ({ edge_id: edge.edge_id, kind: edge.kind })),
    ),
    journey_id: input.journey?.journey_id ?? null,
    journey_obligation_refs: Object.freeze(journeyObligationRefs),
    journey_oracle_refs: Object.freeze(journeyOracleRefs),
    missing_evidence: Object.freeze([...missing]),
    node_count: nodeIds.length,
    observed_edge_count: observed,
    oracle_count: oracles.length,
    oracle_ids: Object.freeze([...oracleIds].sort()),
    oracles: Object.freeze(projectedOracles),
    profile: input.profile,
    projection_strategy: BROWSER_EVIDENCE_STRATEGY,
    scope: "TEST" as const,
    session_id: sessionId,
    source_identity: input.intent.source_identity,
    substrate: input.substrate,
    substrate_reason: input.substrate_reason,
    substitute_declared:
      carriesSubstituteMarker || input.substrate !== "real-browser",
    unknown_limitations: Object.freeze([...input.unknown_limitations].sort()),
    plan_visible_fields: PLAN_VISIBLE_FIELDS,
    schema_version: 1 as const,
  });
}
