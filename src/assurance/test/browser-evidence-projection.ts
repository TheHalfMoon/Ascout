import {
  createSessionIdentity,
  type BrowserSessionIdentity,
} from "../../browser/executor.js";
import {
  collectBlockingReasons,
  type BrowserEvidenceBundle,
  type BrowserOracleRecord,
} from "../../browser/evidence.js";
import {
  intentDigest,
  type IntentTest,
} from "../../browser/intent.js";
import {
  evaluateJourneyCoverage,
  type Journey,
} from "../../browser/journey.js";

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
  readonly session_identity: BrowserSessionIdentity | null;
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
  readonly expected_intent_digest: string;
  readonly bound_intent_digest: string | null;
  readonly bundle_id: string | null;
  readonly journey_id: string | null;
  readonly session_id: string | null;
  readonly session_identity_bound: boolean;
  readonly source_identity: string;
  readonly substrate: BrowserEvidenceSubstrate;
  readonly substrate_reason: string | null;
  readonly substrate_verified: boolean;
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
  readonly blocking_reasons: readonly string[];
  readonly unknown_limitations: readonly string[];
  readonly plan_visible_fields: readonly string[];
}

const PLAN_VISIBLE_FIELDS: readonly string[] = Object.freeze([
  "artifact_count",
  "assertion_count",
  "attempt_count",
  "blocking_reasons",
  "bound_intent_digest",
  "bundle_id",
  "edge_count",
  "expected_intent_digest",
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
  "session_identity_bound",
  "source_identity",
  "substrate",
  "substrate_reason",
  "substrate_verified",
  "substitute_declared",
  "unknown_limitations",
]);

const SUBSTRATES: readonly BrowserEvidenceSubstrate[] = [
  "real-browser",
  "fixture",
  "mock",
  "unknown",
] as const;

function requireNonEmpty(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(field + " must be non-empty");
  }
}

function canonicalUnique(values: readonly string[], field: string): readonly string[] {
  if (new Set(values).size !== values.length) {
    throw new TypeError(field + " must contain unique entries");
  }
  return [...values].sort();
}

function validateSessionIdentity(
  identity: BrowserSessionIdentity | null,
): BrowserSessionIdentity | null {
  if (identity === null) {
    return null;
  }
  return createSessionIdentity({
    application_origin: identity.application_origin,
    browser_profile: identity.browser_profile,
    engine: {
      channel: identity.engine.channel,
      name: identity.engine.name,
      version: identity.engine.version,
    },
    environment: {
      arch: identity.environment.arch,
      os: identity.environment.os,
      runtime: identity.environment.runtime,
      runtime_version: identity.environment.runtime_version,
    },
    session_id: identity.session_id,
    source_identity: identity.source_identity,
  });
}

function evidenceTypeCount(
  bundle: BrowserEvidenceBundle,
  type: string,
): number {
  switch (type) {
    case "action-attempt":
      return bundle.attempts.length;
    case "dom-fact":
      return bundle.dom_facts.length;
    case "accessibility-fact":
      return bundle.accessibility_facts.length;
    case "state-observation":
      return bundle.dom_facts.length + bundle.accessibility_facts.length;
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
  const expectedIntentDigest = intentDigest(input.intent);
  const sessionIdentity = validateSessionIdentity(input.session_identity ?? null);
  if (input.substrate === "real-browser") {
    if (input.substrate_reason !== null) {
      throw new TypeError("real-browser substrate must not carry a reason");
    }
    if (sessionIdentity === null) {
      throw new TypeError("real-browser substrate requires a session identity");
    }
  } else if (
    input.substrate_reason === null ||
    input.substrate_reason.length === 0
  ) {
    throw new TypeError(input.substrate + " substrate requires a reason");
  }
  const oracles: readonly BrowserOracleRecord[] =
    input.bundle === null ? [] : input.bundle.oracle_records;
  const oracleIds = canonicalUnique(
    oracles.map((oracle) => oracle.oracle_id),
    "oracle_ids",
  );
  const sources = new Set<string>([input.intent.source_identity]);
  if (input.bundle !== null) {
    sources.add(input.bundle.source_identity);
  }
  if (input.journey !== null) {
    sources.add(input.journey.source_identity);
  }
  if (sessionIdentity !== null) {
    sources.add(sessionIdentity.source_identity);
    if (
      sessionIdentity.application_origin !== input.intent.target_surface.application_origin ||
      sessionIdentity.browser_profile !== input.intent.target_surface.browser_profile
    ) {
      throw new TypeError("session identity does not match intent target surface");
    }
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
  if (sessionIdentity !== null) {
    sessions.add(sessionIdentity.session_id);
  }
  if (sessions.size > 1) {
    throw new TypeError("conflicting session identity across browser truth");
  }
  const nodeIds = canonicalUnique(
    (input.journey?.nodes ?? []).map((node) => node.node_id),
    "journey node_ids",
  );
  const edgeIds = canonicalUnique(
    (input.journey?.edges ?? []).map((edge) => edge.edge_id),
    "journey edge_ids",
  );
  for (const limitation of input.unknown_limitations) {
    requireNonEmpty(limitation, "unknown_limitation");
  }
  const unknownLimitations = canonicalUnique(
    input.unknown_limitations,
    "unknown_limitations",
  );
  const intentBindingBlockingReasons =
    input.bundle !== null &&
    input.bundle.intent_digest !== null &&
    input.bundle.intent_digest !== expectedIntentDigest
      ? ["bound-intent-digest:mismatch"]
      : [];
  const blockingReasons = [
    ...intentBindingBlockingReasons,
    ...(input.bundle === null
      ? []
      : collectBlockingReasons(input.bundle, input.intent.source_identity)),
    ...(input.journey === null
      ? []
      : evaluateJourneyCoverage(input.journey).blocking_reasons),
  ];
  const uniqueBlockingReasons = [...new Set(blockingReasons)].sort();
  const missing: string[] = [];
  if (input.bundle === null) {
    missing.push("evidence-bundle:absent", "oracle:absent");
  } else {
    if (input.bundle.intent_digest === null) {
      missing.push("bound-intent-digest:absent");
    } else if (input.bundle.intent_digest !== expectedIntentDigest) {
      missing.push("bound-intent-digest:mismatch");
    }
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
  const projectedOracles = Object.freeze(
    [...oracles]
      .sort((a, b) => (a.oracle_id < b.oracle_id ? -1 : 1))
      .map((oracle) =>
        Object.freeze({
          authority: oracle.authority,
          independence_class: oracle.independence_class,
          oracle_id: oracle.oracle_id,
          oracle_kind: oracle.oracle_kind,
        }),
      ),
  );
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
    input.bundle?.session_id ??
    input.journey?.session_id ??
    sessionIdentity?.session_id ??
    null;
  const journeyObligationRefs = [...(input.journey?.obligation_refs ?? [])].sort();
  const journeyOracleRefs = [...(input.journey?.oracle_refs ?? [])].sort();
  const substrateVerified = false;
  return Object.freeze({
    artifact_count: input.bundle?.artifacts.length ?? 0,
    assertion_count: input.bundle?.assertions.length ?? 0,
    attempt_count: input.bundle?.attempts.length ?? 0,
    blocking_reasons: Object.freeze([...uniqueBlockingReasons]),
    bound_intent_digest: input.bundle?.intent_digest ?? null,
    bundle_id: input.bundle?.bundle_id ?? null,
    edge_count: edges.length,
    expected_intent_digest: expectedIntentDigest,
    fact_count:
      (input.bundle?.dom_facts.length ?? 0) +
      (input.bundle?.accessibility_facts.length ?? 0),
    inferred_edge_count: inferred,
    intent_id: input.intent.intent_id,
    intent_source_identity: input.intent.source_identity,
    journey_edge_kinds: Object.freeze(
      edges.map((edge) =>
        Object.freeze({ edge_id: edge.edge_id, kind: edge.kind }),
      ),
    ),
    journey_id: input.journey?.journey_id ?? null,
    journey_obligation_refs: Object.freeze(journeyObligationRefs),
    journey_oracle_refs: Object.freeze(journeyOracleRefs),
    missing_evidence: Object.freeze([...missing]),
    node_count: nodeIds.length,
    observed_edge_count: observed,
    oracle_count: oracles.length,
    oracle_ids: Object.freeze([...oracleIds]),
    oracles: projectedOracles,
    profile: input.profile,
    projection_strategy: BROWSER_EVIDENCE_STRATEGY,
    scope: "TEST" as const,
    session_id: sessionId,
    session_identity_bound: sessionIdentity !== null,
    source_identity: input.intent.source_identity,
    substrate: input.substrate,
    substrate_reason: input.substrate_reason,
    substrate_verified: substrateVerified,
    substitute_declared:
      input.substrate !== "real-browser" || !substrateVerified,
    unknown_limitations: Object.freeze([...unknownLimitations]),
    plan_visible_fields: Object.freeze([...PLAN_VISIBLE_FIELDS]),
    schema_version: 1 as const,
  });
}
