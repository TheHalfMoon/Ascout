import { describe, expect, it } from "vitest";
import {
  createActionResponse,
  createArtifactRef,
  createAssertionResponse,
} from "../src/browser/executor.js";
import {
  appendAttempt,
  assembleEvidenceBundle,
  attachOracleRef,
  checkSourceDrift,
  collectBlockingReasons,
  createAccessibilityFact,
  createConsoleRecord,
  createDomFact,
  createNetworkRecord,
  createOracleRecord,
  evidenceBundleDigest,
  evidenceBundleFromJson,
  evidenceBundleToJson,
  oracleRecordFromJson,
  oracleRecordToJson,
  recordActionAttempt,
} from "../src/browser/evidence.js";

const SOURCE = "tree:5e27cf02000000000000000000000000000000";
const OTHER_SOURCE = "tree:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const SESSION = "session-evidence-1";

function oracleInput() {
  return {
    authority: "gating",
    calibration_state: null,
    independence_class: "independent",
    oracle_id: "oracle-network-1",
    oracle_kind: "network_deterministic",
    producer: "ascout",
    provenance: { detail: "request log", origin: "browser-adapter" },
    required_evidence_types: ["network-record"],
    source_identity: SOURCE,
    version: "1",
  } as const;
}

function attemptResponse(status: string, errorCode: string | null) {
  return createActionResponse({
    duration_ms: 11,
    error: errorCode === null ? null : { code: errorCode, message: "m" },
    evidence_refs: [],
    request_id: "req-1",
    session_id: SESSION,
    source_identity: SOURCE,
    status,
  });
}

function passingAssertion(oracle_ref: string | null) {
  return createAssertionResponse({
    duration_ms: 2,
    error: null,
    evidence_refs: [],
    oracle_ref,
    request_id: "assert-1",
    session_id: SESSION,
    source_identity: SOURCE,
    status: "passed",
  });
}

describe("spec016 p016-05 browser evidence and oracle records", () => {
  it("creates a deterministic gating oracle with independent provenance", () => {
    const record = createOracleRecord(oracleInput());
    expect(record.authority).toBe("gating");
    expect(record.required_evidence_types).toEqual(["network-record"]);
  });

  it("keeps model and human oracles advisory-only", () => {
    for (const kind of [
      "visual_semantic_model",
      "semantic_model",
      "human",
    ] as const) {
      expect(() =>
        createOracleRecord({
          ...oracleInput(),
          authority: "gating",
          calibration_state: kind === "human" ? null : "calibrated-2026-09",
          oracle_id: `oracle-${kind}`,
          oracle_kind: kind,
        }),
      ).toThrow(TypeError);
      const advisory = createOracleRecord({
        ...oracleInput(),
        authority: "advisory",
        calibration_state: kind === "human" ? null : "calibrated-2026-09",
        oracle_id: `oracle-${kind}-ok`,
        oracle_kind: kind,
      });
      expect(advisory.authority).toBe("advisory");
    }
  });

  it("fails closed on derived or unresolved gating independence", () => {
    for (const independence of [
      "implementation_derived",
      "unresolved",
    ] as const) {
      expect(() =>
        createOracleRecord({
          ...oracleInput(),
          independence_class: independence,
        }),
      ).toThrow(TypeError);
    }
    const advisory = createOracleRecord({
      ...oracleInput(),
      authority: "advisory",
      independence_class: "unresolved",
      oracle_id: "oracle-unresolved",
    });
    expect(advisory.independence_class).toBe("unresolved");
  });

  it("requires calibration state for model oracles", () => {
    expect(() =>
      createOracleRecord({
        ...oracleInput(),
        authority: "advisory",
        calibration_state: null,
        oracle_id: "oracle-model-nocal",
        oracle_kind: "semantic_model",
      }),
    ).toThrow(TypeError);
  });

  it("rejects unknown oracle enums", () => {
    expect(() =>
      createOracleRecord({ ...oracleInput(), oracle_kind: "vibes" }),
    ).toThrow(TypeError);
    expect(() =>
      createOracleRecord({ ...oracleInput(), authority: "absolute" }),
    ).toThrow(TypeError);
    expect(() =>
      createOracleRecord({
        ...oracleInput(),
        required_evidence_types: ["tea-leaves"],
      }),
    ).toThrow(TypeError);
  });

  it("preserves attempt order and failures in append-only logs", () => {
    const first = recordActionAttempt(
      0,
      { kind: "click", target: "place-order" },
      attemptResponse("ok", null),
    );
    const second = recordActionAttempt(
      1,
      { kind: "click", target: "place-order" },
      attemptResponse("failed", "E_ACTION_FAILED"),
    );
    let log: readonly typeof first[] = [];
    log = appendAttempt(log, first);
    log = appendAttempt(log, second);
    expect(log).toHaveLength(2);
    expect(log[1]?.status).toBe("failed");
    expect(log[1]?.error_code).toBe("E_ACTION_FAILED");
    expect(() => appendAttempt(log, first)).toThrow(TypeError);
    expect(() =>
      appendAttempt(
        log,
        recordActionAttempt(
          5,
          { kind: "click", target: "x" },
          attemptResponse("ok", null),
        ),
      ),
    ).toThrow(TypeError);
  });

  it("bounds network evidence to method, origin, and path", () => {
    const record = createNetworkRecord({
      method: "POST",
      record_id: "net-1",
      request_count: 1,
      response_status: 201,
      session_id: SESSION,
      source_identity: SOURCE,
      url: "https://shop.example.test/api/orders",
    });
    expect(record.origin).toBe("https://shop.example.test");
    expect(record.path).toBe("/api/orders");
    for (const url of [
      "https://shop.example.test/api/orders?admin=true",
      "https://shop.example.test/api/orders#frag",
      "https://user:pass@shop.example.test/api/orders",
      "ftp://shop.example.test/x",
    ]) {
      expect(() =>
        createNetworkRecord({
          method: "GET",
          record_id: "net-bad",
          request_count: 1,
          response_status: 200,
          session_id: SESSION,
          source_identity: SOURCE,
          url,
        }),
      ).toThrow(TypeError);
    }
  });

  it("records console errors and dom/accessibility facts source-bound", () => {
    const consoleRecord = createConsoleRecord({
      count: 2,
      message: "boom-NOISE-404",
      record_id: "con-1",
      session_id: SESSION,
      source_identity: SOURCE,
      stream: "console-error",
    });
    expect(consoleRecord.count).toBe(2);
    const dom = createDomFact({
      fact_id: "dom-1",
      observation: "Order for Ada",
      property: "text",
      session_id: SESSION,
      source_identity: SOURCE,
      subject: "order confirmation",
    });
    expect(dom.observation).toBe("Order for Ada");
    const a11y = createAccessibilityFact({
      fact_id: "a11y-1",
      name: "Place order",
      observation: "present",
      property: "text",
      role: "button",
      session_id: SESSION,
      source_identity: SOURCE,
    });
    expect(a11y.role).toBe("button");
    expect(() =>
      createDomFact({
        fact_id: "dom-secret",
        observation: "key ghp_abcdefghij1234567890abcdef",
        property: "text",
        session_id: SESSION,
        source_identity: SOURCE,
        subject: "leak",
      }),
    ).toThrow(TypeError);
  });

  it("requires digests where artifacts carry them and binds sessions", () => {
    const artifact = createArtifactRef({
      artifact_id: "shot-1",
      byte_size: 100,
      digest: "ab12cd",
      kind: "screenshot",
      redacted: false,
      session_id: SESSION,
      source_identity: SOURCE,
      uri: "artifacts/s/shot-1.png",
    });
    expect(artifact.digest).toBe("ab12cd");
    const bundle = assembleEvidenceBundle({
      accessibility_facts: [],
      artifacts: [artifact],
      assertions: [attachOracleRef(passingAssertion(null), "oracle-network-1")],
      attempts: [],
      bundle_id: "bundle-1",
      console_records: [],
      dom_facts: [],
      intent_digest: null,
      network_records: [
        createNetworkRecord({
          method: "GET",
          record_id: "net-1",
          request_count: 1,
          response_status: 200,
          session_id: SESSION,
          source_identity: SOURCE,
          url: "https://shop.example.test/cart",
        }),
      ],
      oracle_records: [createOracleRecord(oracleInput())],
      session_id: SESSION,
      source_identity: SOURCE,
    });
    expect(bundle.artifacts).toHaveLength(1);
  });

  it("rejects cross-tree and cross-session bundles", () => {
    const good = createDomFact({
      fact_id: "dom-1",
      observation: "x",
      property: "text",
      session_id: SESSION,
      source_identity: SOURCE,
      subject: "s",
    });
    const foreign = createDomFact({
      fact_id: "dom-2",
      observation: "y",
      property: "text",
      session_id: SESSION,
      source_identity: OTHER_SOURCE,
      subject: "s",
    });
    const base = {
      accessibility_facts: [],
      artifacts: [],
      assertions: [],
      attempts: [],
      bundle_id: "bundle-x",
      console_records: [],
      intent_digest: null,
      network_records: [],
      oracle_records: [],
      session_id: SESSION,
      source_identity: SOURCE,
    };
    expect(() =>
      assembleEvidenceBundle({ ...base, dom_facts: [good, foreign] }),
    ).toThrow(TypeError);
    const wrongSession = createDomFact({
      fact_id: "dom-3",
      observation: "z",
      property: "text",
      session_id: "other-session",
      source_identity: SOURCE,
      subject: "s",
    });
    expect(() =>
      assembleEvidenceBundle({ ...base, dom_facts: [wrongSession] }),
    ).toThrow(TypeError);
  });

  it("requires every assertion to reference a present oracle record", () => {
    const base = {
      accessibility_facts: [],
      artifacts: [],
      attempts: [],
      bundle_id: "bundle-o",
      console_records: [],
      dom_facts: [],
      intent_digest: null,
      network_records: [],
      oracle_records: [createOracleRecord(oracleInput())],
      session_id: SESSION,
      source_identity: SOURCE,
    };
    expect(() =>
      assembleEvidenceBundle({ ...base, assertions: [passingAssertion(null)] }),
    ).toThrow(TypeError);
    expect(() =>
      assembleEvidenceBundle({
        ...base,
        assertions: [passingAssertion("oracle-missing")],
      }),
    ).toThrow(TypeError);
    expect(() =>
      assembleEvidenceBundle({
        ...base,
        assertions: [],
        oracle_records: [
          createOracleRecord(oracleInput()),
          createOracleRecord(oracleInput()),
        ],
      }),
    ).toThrow(TypeError);
  });

  it("checks source drift as data and enumerates blocking reasons", () => {
    const oracle = createOracleRecord({
      ...oracleInput(),
      required_evidence_types: ["network-record", "console-record"],
    });
    const bundle = assembleEvidenceBundle({
      accessibility_facts: [],
      artifacts: [],
      assertions: [
        attachOracleRef(
          createAssertionResponse({
            duration_ms: 1,
            error: { code: "E_CONSOLE_ERROR", message: "boom" },
            evidence_refs: [],
            oracle_ref: null,
            request_id: "assert-2",
            session_id: SESSION,
            source_identity: SOURCE,
            status: "failed",
          }),
          "oracle-network-1",
        ),
      ],
      attempts: [
        recordActionAttempt(
          0,
          { kind: "click", target: "x" },
          attemptResponse("timeout", "E_TIMEOUT"),
        ),
      ],
      bundle_id: "bundle-b",
      console_records: [],
      dom_facts: [],
      intent_digest: null,
      network_records: [
        createNetworkRecord({
          method: "GET",
          record_id: "net-1",
          request_count: 1,
          response_status: 200,
          session_id: SESSION,
          source_identity: SOURCE,
          url: "https://shop.example.test/cart",
        }),
      ],
      oracle_records: [oracle],
      session_id: SESSION,
      source_identity: SOURCE,
    });
    expect(checkSourceDrift(bundle, SOURCE)).toBe("match");
    expect(checkSourceDrift(bundle, OTHER_SOURCE)).toBe("drift");
    const reasons = collectBlockingReasons(bundle, SOURCE);
    expect(reasons).toContain("attempt 0 timeout: E_TIMEOUT");
    expect(reasons).toContain("assertion assert-2 failed: E_CONSOLE_ERROR");
    expect(reasons).toContain("oracle oracle-network-1 missing console-record");
    expect(
      collectBlockingReasons(bundle, OTHER_SOURCE).some((reason) =>
        reason.startsWith("source drift:"),
      ),
    ).toBe(true);
  });

  it("round-trips oracles and bundles through strict JSON", () => {
    const oracle = createOracleRecord(oracleInput());
    expect(oracleRecordFromJson(oracleRecordToJson(oracle))).toEqual(oracle);
    expect(() => oracleRecordFromJson("nope")).toThrow(TypeError);
    const bundle = assembleEvidenceBundle({
      accessibility_facts: [],
      artifacts: [],
      assertions: [attachOracleRef(passingAssertion(null), "oracle-network-1")],
      attempts: [
        recordActionAttempt(
          0,
          { kind: "click", target: "x" },
          attemptResponse("ok", null),
        ),
      ],
      bundle_id: "bundle-j",
      console_records: [],
      dom_facts: [
        createDomFact({
          fact_id: "dom-1",
          observation: "v",
          property: "visible",
          session_id: SESSION,
          source_identity: SOURCE,
          subject: "s",
        }),
      ],
      intent_digest: "intentdigest0000000000000000000000000001",
      network_records: [],
      oracle_records: [oracle],
      session_id: SESSION,
      source_identity: SOURCE,
    });
    const json = evidenceBundleToJson(bundle);
    expect(evidenceBundleToJson(evidenceBundleFromJson(json))).toBe(json);
    expect(evidenceBundleDigest(bundle)).toMatch(/^[0-9a-f]{64}$/);
    const tampered = JSON.stringify({
      ...(JSON.parse(json) as Record<string, unknown>),
      source_identity: OTHER_SOURCE,
    });
    expect(() => evidenceBundleFromJson(tampered)).toThrow(TypeError);
  });
});
