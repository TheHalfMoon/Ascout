import { describe, expect, it } from "vitest";

import {
  createAssertionResponse,
  createSessionIdentity,
} from "../src/browser/executor.js";
import {
  assembleEvidenceBundle,
  attachOracleRef,
  createAccessibilityFact,
  createNetworkRecord,
  createOracleRecord,
  recordActionAttempt,
} from "../src/browser/evidence.js";
import { createIntentTest, intentDigest } from "../src/browser/intent.js";
import {
  createJourney,
  createJourneyEdge,
  createJourneyNode,
} from "../src/browser/journey.js";
import { projectBrowserEvidenceV1 } from "../src/assurance/test/browser-evidence-projection.js";

const SOURCE = "tree:5e27cf02000000000000000000000000000000";
const OTHER_SOURCE = "tree:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const SESSION = "session-t04-1";
const OTHER_SESSION = "session-t04-2";

function makeSessionIdentity(source: string = SOURCE, session: string = SESSION) {
  return createSessionIdentity({
    application_origin: "https://example.com",
    browser_profile: "stable",
    engine: { channel: "stable", name: "chromium", version: "1.63.0" },
    environment: {
      arch: "x64",
      os: "linux",
      runtime: "node",
      runtime_version: "24",
    },
    session_id: session,
    source_identity: source,
  });
}

const REAL_SESSION = makeSessionIdentity();

function makeIntent(source: string = SOURCE) {
  return createIntentTest(
    {
      actions: [{ kind: "navigate", target: "https://example.com/", value: null }],
      expected_outcomes: [{ kind: "dom", statement: "welcome visible" }],
      goal: "verify login",
      intent_id: "intent:login",
      obligation_refs: ["obl:login"],
      oracle_policy: [{ index: 0, oracle: "dom", required: true, scope: "action" }],
      preconditions: [{ kind: "dom", statement: "page loaded" }],
      provenance: { artifact_ref: null, origin: "human_authored" },
      recovery_policy: {
        allow_execution_recovery: false,
        allow_resolver_recovery: false,
        allow_semantic_recovery: false,
        max_recovery_actions: 0,
        max_retry_attempts: 0,
      },
      requirement_refs: ["req:login"],
      risk_refs: [],
      source_identity: source,
      target_surface: {
        application_origin: "https://example.com",
        browser_profile: "stable",
        surface: "web",
      },
    },
    ["obl:login"],
  );
}

function makeOracle(
  id = "oracle-1",
  overrides: Record<string, unknown> = {},
  source: string = SOURCE,
) {
  return createOracleRecord({
    authority: "gating",
    calibration_state: null,
    independence_class: "independent",
    oracle_id: id,
    oracle_kind: "network_deterministic",
    producer: "ascout",
    provenance: { detail: null, origin: "browser-adapter" },
    required_evidence_types: ["network-record"],
    source_identity: source,
    version: "1",
    ...overrides,
  });
}

function makeBundle(
  source: string = SOURCE,
  session: string = SESSION,
  oracleIds: readonly string[] = ["oracle-1"],
  bundleId = "bundle-1",
  boundIntentDigest: string | null = intentDigest(makeIntent(source)),
) {
  const oracles = oracleIds.map((id) => makeOracle(id, {}, source));
  const attempt = recordActionAttempt(
    0,
    { kind: "click", target: "#login" },
    {
      duration_ms: 5,
      error: null,
      evidence_refs: [],
      request_id: "req-1",
      session_id: session,
      source_identity: source,
      status: "ok",
    },
  );
  const assertion = attachOracleRef(
    createAssertionResponse({
      duration_ms: 2,
      error: null,
      evidence_refs: [],
      oracle_ref: null,
      request_id: "assert-1",
      session_id: session,
      source_identity: source,
      status: "passed",
    }),
    oracleIds[0] ?? "oracle-1",
  );
  return assembleEvidenceBundle({
    accessibility_facts: [],
    artifacts: [],
    assertions: [assertion],
    attempts: [attempt],
    bundle_id: bundleId,
    console_records: [],
    dom_facts: [],
    intent_digest: boundIntentDigest,
    network_records: [
      createNetworkRecord({
        method: "GET",
        record_id: "net-1",
        request_count: 1,
        response_status: 200,
        session_id: session,
        source_identity: source,
        url: "https://example.com/login",
      }),
    ],
    oracle_records: oracles,
    session_id: session,
    source_identity: source,
  });
}

function makeFailedBundle() {
  const attempt = recordActionAttempt(
    0,
    { kind: "click", target: "#login" },
    {
      duration_ms: 5,
      error: { code: "E_ACTION", message: "action failed" },
      evidence_refs: [],
      request_id: "req-failed",
      session_id: SESSION,
      source_identity: SOURCE,
      status: "failed",
    },
  );
  const assertion = attachOracleRef(
    createAssertionResponse({
      duration_ms: 2,
      error: { code: "E_ASSERTION", message: "assertion failed" },
      evidence_refs: [],
      oracle_ref: null,
      request_id: "assert-failed",
      session_id: SESSION,
      source_identity: SOURCE,
      status: "failed",
    }),
    "oracle-1",
  );
  return assembleEvidenceBundle({
    accessibility_facts: [],
    artifacts: [],
    assertions: [assertion],
    attempts: [attempt],
    bundle_id: "bundle-failed",
    console_records: [],
    dom_facts: [],
    intent_digest: intentDigest(makeIntent()),
    network_records: [
      createNetworkRecord({
        method: "GET",
        record_id: "net-failed",
        request_count: 1,
        response_status: 200,
        session_id: SESSION,
        source_identity: SOURCE,
        url: "https://example.com/login",
      }),
    ],
    oracle_records: [makeOracle()],
    session_id: SESSION,
    source_identity: SOURCE,
  });
}

function makeJourney(source: string = SOURCE, session: string = SESSION) {
  return createJourney({
    edges: [
      createJourneyEdge({
        edge_id: "edge-1",
        from_node: "node-1",
        kind: "observed",
        run_id: "run-1",
        source_identity: source,
        to_node: "node-2",
      }),
      createJourneyEdge({
        edge_id: "edge-2",
        from_node: "node-2",
        kind: "inferred",
        reason: "same obligation chain",
        run_id: null,
        source_identity: source,
        to_node: "node-1",
      }),
    ],
    journey_id: "journey-1",
    nodes: [
      createJourneyNode({ label: "login page", node_id: "node-1", obligation_refs: ["obl:login"] }),
      createJourneyNode({ label: "home page", node_id: "node-2", obligation_refs: ["obl:login"] }),
    ],
    obligation_refs: ["obl:login"],
    oracle_refs: ["oracle-1"],
    session_id: session,
    source_identity: source,
  });
}

describe("UA-P05-T04 P016 browser evidence projection", () => {
  it("projects a valid IntentTest with evidence identities", () => {
    const projection = projectBrowserEvidenceV1({
      bundle: makeBundle(),
      intent: makeIntent(),
      journey: makeJourney(),
      profile: "STANDARD",
      session_identity: REAL_SESSION,
      substrate: "real-browser",
      substrate_reason: null,
      unknown_limitations: [],
    });
    expect(projection.scope).toBe("TEST");
    expect(projection.projection_strategy).toBe("projection-only");
    expect(projection.intent_id).toBe("intent:login");
    expect(projection.bundle_id).toBe("bundle-1");
    expect(projection.journey_id).toBe("journey-1");
    expect(projection.session_id).toBe(SESSION);
    expect(projection.session_identity_bound).toBe(true);
    expect(projection.source_identity).toBe(SOURCE);
    expect(projection.attempt_count).toBe(1);
    expect(projection.assertion_count).toBe(1);
    expect(projection.oracle_count).toBe(1);
    expect(projection.node_count).toBe(2);
    expect(projection.edge_count).toBe(2);
    expect(projection.missing_evidence).toEqual([]);
    expect(projection.substitute_declared).toBe(true);
    expect(projection.substrate_verified).toBe(false);
  });

  it("marks absent and mismatched intent bindings explicitly", () => {
    const intent = makeIntent();
    const missing = projectBrowserEvidenceV1({
      bundle: makeBundle(SOURCE, SESSION, ["oracle-1"], "bundle-missing", null),
      intent,
      journey: makeJourney(),
      profile: "STANDARD",
      session_identity: REAL_SESSION,
      substrate: "real-browser",
      substrate_reason: null,
      unknown_limitations: [],
    });
    expect(missing.missing_evidence).toContain("bound-intent-digest:absent");
    const mismatch = projectBrowserEvidenceV1({
      bundle: makeBundle(SOURCE, SESSION, ["oracle-1"], "bundle-mismatch", "0".repeat(64)),
      intent,
      journey: makeJourney(),
      profile: "STANDARD",
      session_identity: REAL_SESSION,
      substrate: "real-browser",
      substrate_reason: null,
      unknown_limitations: [],
    });
    expect(mismatch.missing_evidence).toContain("bound-intent-digest:mismatch");
    expect(mismatch.blocking_reasons).toContain("bound-intent-digest:mismatch");
    expect(mismatch.expected_intent_digest).toBe(intentDigest(intent));
  });

  it("preserves oracle outcomes without upgrading them", () => {
    const advisory = makeOracle("oracle-model", {
      authority: "advisory",
      calibration_state: "calibrated-2026-09",
      oracle_kind: "semantic_model",
      required_evidence_types: [],
    });
    const attempt = recordActionAttempt(
      0,
      { kind: "click", target: "#login" },
      {
        duration_ms: 5,
        error: null,
        evidence_refs: [],
        request_id: "req-1",
        session_id: SESSION,
        source_identity: SOURCE,
        status: "ok",
      },
    );
    const assertion = attachOracleRef(
      createAssertionResponse({
        duration_ms: 2,
        error: null,
        evidence_refs: [],
        oracle_ref: null,
        request_id: "assert-1",
        session_id: SESSION,
        source_identity: SOURCE,
        status: "passed",
      }),
      "oracle-1",
    );
    const bundle = assembleEvidenceBundle({
      accessibility_facts: [],
      artifacts: [],
      assertions: [assertion],
      attempts: [attempt],
      bundle_id: "bundle-2",
      console_records: [],
      dom_facts: [],
      intent_digest: intentDigest(makeIntent()),
      network_records: [
        createNetworkRecord({
          method: "GET",
          record_id: "net-1",
          request_count: 1,
          response_status: 200,
          session_id: SESSION,
          source_identity: SOURCE,
          url: "https://example.com/login",
        }),
      ],
      oracle_records: [makeOracle("oracle-1"), advisory],
      session_id: SESSION,
      source_identity: SOURCE,
    });
    const projection = projectBrowserEvidenceV1({
      bundle,
      intent: makeIntent(),
      journey: null,
      profile: "DEEP",
      session_identity: REAL_SESSION,
      substrate: "real-browser",
      substrate_reason: null,
      unknown_limitations: [],
    });
    expect(projection.oracle_ids).toEqual(["oracle-1", "oracle-model"]);
    const gating = projection.oracles.find((o) => o.oracle_id === "oracle-1");
    const model = projection.oracles.find((o) => o.oracle_id === "oracle-model");
    expect(gating?.authority).toBe("gating");
    expect(model?.authority).toBe("advisory");
    expect(model?.oracle_kind).toBe("semantic_model");
  });

  it("preserves failed execution and zero-edge coverage as blocking reasons", () => {
    const failed = projectBrowserEvidenceV1({
      bundle: makeFailedBundle(),
      intent: makeIntent(),
      journey: makeJourney(),
      profile: "STANDARD",
      session_identity: REAL_SESSION,
      substrate: "real-browser",
      substrate_reason: null,
      unknown_limitations: [],
    });
    expect(failed.blocking_reasons).toEqual(
      expect.arrayContaining([
        "attempt 0 failed: E_ACTION",
        "assertion assert-failed failed: E_ASSERTION",
      ]),
    );
    const emptyJourney = createJourney({
      edges: [],
      journey_id: "journey-empty",
      nodes: [
        createJourneyNode({
          label: "login page",
          node_id: "node-empty",
          obligation_refs: ["obl:login"],
        }),
      ],
      obligation_refs: ["obl:login"],
      oracle_refs: ["oracle-1"],
      session_id: SESSION,
      source_identity: SOURCE,
    });
    const empty = projectBrowserEvidenceV1({
      bundle: makeBundle(),
      intent: makeIntent(),
      journey: emptyJourney,
      profile: "STANDARD",
      session_identity: REAL_SESSION,
      substrate: "real-browser",
      substrate_reason: null,
      unknown_limitations: [],
    });
    expect(empty.blocking_reasons).toContain("no-observed-or-inferred-traversal");
  });

  it("preserves journey provenance and observed/inferred distinction", () => {
    const projection = projectBrowserEvidenceV1({
      bundle: makeBundle(),
      intent: makeIntent(),
      journey: makeJourney(),
      profile: "STANDARD",
      session_identity: REAL_SESSION,
      substrate: "real-browser",
      substrate_reason: null,
      unknown_limitations: [],
    });
    expect(projection.journey_obligation_refs).toEqual(["obl:login"]);
    expect(projection.journey_oracle_refs).toEqual(["oracle-1"]);
    expect(projection.journey_edge_kinds).toEqual([
      { edge_id: "edge-1", kind: "observed" },
      { edge_id: "edge-2", kind: "inferred" },
    ]);
    expect(projection.observed_edge_count).toBe(1);
    expect(projection.inferred_edge_count).toBe(1);
  });

  it("counts accessibility evidence for state observations", () => {
    const stateOracle = makeOracle("oracle-state", {
      oracle_kind: "application_state_deterministic",
      required_evidence_types: ["state-observation"],
    });
    const stateBundle = assembleEvidenceBundle({
      accessibility_facts: [
        createAccessibilityFact({
          fact_id: "a11y-1",
          name: "Welcome",
          observation: "visible",
          property: "visible",
          role: "heading",
          session_id: SESSION,
          source_identity: SOURCE,
        }),
      ],
      artifacts: [],
      assertions: [],
      attempts: [],
      bundle_id: "bundle-state",
      console_records: [],
      dom_facts: [],
      intent_digest: intentDigest(makeIntent()),
      network_records: [],
      oracle_records: [stateOracle],
      session_id: SESSION,
      source_identity: SOURCE,
    });
    const projection = projectBrowserEvidenceV1({
      bundle: stateBundle,
      intent: makeIntent(),
      journey: makeJourney(),
      profile: "STANDARD",
      session_identity: REAL_SESSION,
      substrate: "real-browser",
      substrate_reason: null,
      unknown_limitations: [],
    });
    expect(projection.missing_evidence).not.toContain(
      "oracle:oracle-state:missing:state-observation",
    );
  });

  it("keeps missing and unknown evidence explicit", () => {
    const projection = projectBrowserEvidenceV1({
      bundle: null,
      intent: makeIntent(),
      journey: null,
      profile: "QUICK",
      session_identity: null,
      substrate: "unknown",
      substrate_reason: "no browser run selected",
      unknown_limitations: ["browser coverage partial"],
    });
    expect(projection.bundle_id).toBeNull();
    expect(projection.journey_id).toBeNull();
    expect(projection.missing_evidence).toContain("evidence-bundle:absent");
    expect(projection.missing_evidence).toContain("oracle:absent");
    expect(projection.missing_evidence).toContain("journey:absent");
    expect(projection.unknown_limitations).toEqual(["browser coverage partial"]);
    expect(projection.substitute_declared).toBe(true);
  });

  it("does not treat a structural session identity as execution provenance", () => {
    expect(() =>
      projectBrowserEvidenceV1({
        bundle: null,
        intent: makeIntent(),
        journey: null,
        profile: "STANDARD",
        session_identity: null,
        substrate: "real-browser",
        substrate_reason: null,
        unknown_limitations: [],
      }),
    ).toThrow("session identity");
    const projection = projectBrowserEvidenceV1({
      bundle: null,
      intent: makeIntent(),
      journey: null,
      profile: "STANDARD",
      session_identity: REAL_SESSION,
      substrate: "real-browser",
      substrate_reason: null,
      unknown_limitations: [],
    });
    expect(projection.substitute_declared).toBe(true);
    expect(projection.substrate_verified).toBe(false);
    expect(projection.session_id).toBe(SESSION);
  });

  it("preserves the real-vs-mock substrate distinction", () => {
    const projection = projectBrowserEvidenceV1({
      bundle: null,
      intent: makeIntent(),
      journey: null,
      profile: "STANDARD",
      session_identity: null,
      substrate: "fixture",
      substrate_reason: "deterministic unit fixture",
      unknown_limitations: [],
    });
    expect(projection.substrate).toBe("fixture");
    expect(projection.substrate_reason).toBe("deterministic unit fixture");
    expect(projection.substitute_declared).toBe(true);
    expect(() =>
      projectBrowserEvidenceV1({
        bundle: null,
        intent: makeIntent(),
        journey: null,
      profile: "STANDARD",
      session_identity: null,
      substrate: "mock",
        substrate_reason: null,
        unknown_limitations: [],
      }),
    ).toThrow(TypeError);
  });

  it("canonicalizes valid unsorted oracle identifiers", () => {
    const projection = projectBrowserEvidenceV1({
      bundle: makeBundle(SOURCE, SESSION, ["oracle-2", "oracle-1"], "bundle-unsorted"),
      intent: makeIntent(),
      journey: makeJourney(),
      profile: "STANDARD",
      session_identity: REAL_SESSION,
      substrate: "real-browser",
      substrate_reason: null,
      unknown_limitations: [],
    });
    expect(projection.oracle_ids).toEqual(["oracle-1", "oracle-2"]);
  });

  it("is deterministic with canonical ordering", () => {
    const first = projectBrowserEvidenceV1({
      bundle: makeBundle(SOURCE, SESSION, ["oracle-1"]),
      intent: makeIntent(),
      journey: makeJourney(),
      profile: "RELEASE",
      session_identity: REAL_SESSION,
      substrate: "real-browser",
      substrate_reason: null,
      unknown_limitations: [],
    });
    const second = projectBrowserEvidenceV1({
      bundle: makeBundle(SOURCE, SESSION, ["oracle-1"]),
      intent: makeIntent(),
      journey: makeJourney(),
      profile: "RELEASE",
      session_identity: REAL_SESSION,
      substrate: "real-browser",
      substrate_reason: null,
      unknown_limitations: [],
    });
    expect(second).toEqual(first);
  });

  it("rejects conflicting source and session identity", () => {
    expect(() =>
      projectBrowserEvidenceV1({
        bundle: makeBundle(OTHER_SOURCE),
        intent: makeIntent(),
        journey: null,
        profile: "STANDARD",
        session_identity: REAL_SESSION,
        substrate: "real-browser",
        substrate_reason: null,
        unknown_limitations: [],
      }),
    ).toThrow(TypeError);
    expect(() =>
      projectBrowserEvidenceV1({
        bundle: makeBundle(SOURCE, SESSION),
        intent: makeIntent(),
        journey: makeJourney(SOURCE, OTHER_SESSION),
        profile: "STANDARD",
        session_identity: REAL_SESSION,
        substrate: "real-browser",
        substrate_reason: null,
        unknown_limitations: [],
      }),
    ).toThrow(TypeError);
  });

  it("never synthesizes PASS from missing evidence", () => {
    const projection = projectBrowserEvidenceV1({
      bundle: null,
      intent: makeIntent(),
      journey: makeJourney(),
      profile: "STANDARD",
      session_identity: null,
      substrate: "unknown",
      substrate_reason: "browser not run",
      unknown_limitations: [],
    });
    expect(projection.missing_evidence.length).toBeGreaterThan(0);
    expect("verdict" in projection).toBe(false);
    expect("passed" in projection).toBe(false);
    expect("pass" in projection).toBe(false);
  });

  it("does not mutate its sources and performs no side effects", () => {
    const intent = makeIntent();
    const bundle = makeBundle();
    const journey = makeJourney();
    const before = JSON.stringify({ bundle, intent, journey });
    const first = projectBrowserEvidenceV1({
      bundle,
      intent,
      journey,
      profile: "STANDARD",
      session_identity: REAL_SESSION,
      substrate: "real-browser",
      substrate_reason: null,
      unknown_limitations: [],
    });
    expect(JSON.stringify({ bundle, intent, journey })).toBe(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.plan_visible_fields)).toBe(true);
    expect(Object.isFrozen(first.oracle_ids)).toBe(true);
    expect(Object.isFrozen(first.oracles)).toBe(true);
    expect(Object.isFrozen(first.oracles[0])).toBe(true);
    expect(Object.isFrozen(first.journey_edge_kinds[0])).toBe(true);
    expect(() => (first.plan_visible_fields as string[]).push("mutable")).toThrow();
    const second = projectBrowserEvidenceV1({
      bundle,
      intent,
      journey,
      profile: "STANDARD",
      session_identity: REAL_SESSION,
      substrate: "real-browser",
      substrate_reason: null,
      unknown_limitations: [],
    });
    expect(second).toEqual(first);
  });
});
