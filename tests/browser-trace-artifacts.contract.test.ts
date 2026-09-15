import { describe, expect, it } from "vitest";
import { createArtifactRef } from "../src/browser/executor.js";
import type { BrowserArtifactRef } from "../src/browser/executor.js";
import {
  assembleTraceIngestion,
  corroborateWithTrace,
  createRetentionPolicy,
  evaluateRetention,
  ingestTraceFact,
  TRACE_BINDING_MISMATCH,
  TRACE_KIND_REJECTED,
  TRACE_RETENTION_INVALID,
  traceFactFromJson,
  traceFactToJson,
  traceIngestionDigest,
  traceIngestionFromJson,
  traceIngestionToJson,
} from "../src/browser/trace-artifacts.js";

const SESSION = "session-p1608";
const SOURCE = "source-p1608";

function artifact(
  artifact_id: string,
  kind: string,
  overrides: {
    readonly session_id?: string;
    readonly source_identity?: string;
  } = {},
): BrowserArtifactRef {
  return createArtifactRef({
    artifact_id,
    byte_size: 1024,
    digest: "ab".repeat(32),
    kind,
    redacted: false,
    session_id: overrides.session_id ?? SESSION,
    source_identity: overrides.source_identity ?? SOURCE,
    uri: `artifacts/${artifact_id}.zip`,
  });
}

function traceArtifact(): BrowserArtifactRef {
  return artifact("trace-1", "trace");
}

describe("spec016 p016-08 trace/artifact ingestion", () => {
  it("requires bounded positive retention policies", () => {
    const policy = createRetentionPolicy({
      max_age_ms: 3_600_000,
      max_artifacts: 10,
      max_total_bytes: 1_000_000,
      policy_id: "policy-p1608",
    });
    expect(policy.max_artifacts).toBe(10);
    for (const bound of [
      { max_age_ms: 0, max_artifacts: 1, max_total_bytes: 1 },
      { max_age_ms: 1, max_artifacts: 0, max_total_bytes: 1 },
      { max_age_ms: 1, max_artifacts: 1, max_total_bytes: -5 },
      { max_age_ms: 1.5, max_artifacts: 1, max_total_bytes: 1 },
    ]) {
      expect(() =>
        createRetentionPolicy({ ...bound, policy_id: "policy-bad" }),
      ).toThrow(TRACE_RETENTION_INVALID);
    }
  });

  it("expires aged artifacts before count/byte eviction", () => {
    const policy = createRetentionPolicy({
      max_age_ms: 1000,
      max_artifacts: 10,
      max_total_bytes: 10_000,
      policy_id: "policy-age",
    });
    const decision = evaluateRetention(
      policy,
      [
        { artifact_id: "old", byte_size: 100, captured_at_ms: 0 },
        { artifact_id: "fresh", byte_size: 100, captured_at_ms: 5000 },
      ],
      6000,
    );
    expect(decision.expired).toEqual(["old"]);
    expect(decision.retained).toEqual(["fresh"]);
    expect(decision.retained_bytes).toBe(100);
  });

  it("evicts oldest-first with id tie-breaks for count and bytes", () => {
    const byCount = createRetentionPolicy({
      max_age_ms: 100_000,
      max_artifacts: 2,
      max_total_bytes: 100_000,
      policy_id: "policy-count",
    });
    const countDecision = evaluateRetention(
      byCount,
      [
        { artifact_id: "b-second", byte_size: 10, captured_at_ms: 2000 },
        { artifact_id: "a-first", byte_size: 10, captured_at_ms: 1000 },
        { artifact_id: "c-third", byte_size: 10, captured_at_ms: 3000 },
      ],
      4000,
    );
    expect(countDecision.evicted_by_count).toEqual(["a-first"]);
    expect(countDecision.retained).toEqual(["b-second", "c-third"]);
    const tied = evaluateRetention(
      byCount,
      [
        { artifact_id: "b", byte_size: 10, captured_at_ms: 1000 },
        { artifact_id: "a", byte_size: 10, captured_at_ms: 1000 },
        { artifact_id: "c", byte_size: 10, captured_at_ms: 1000 },
      ],
      2000,
    );
    expect(tied.evicted_by_count).toEqual(["a"]);
    const byBytes = createRetentionPolicy({
      max_age_ms: 100_000,
      max_artifacts: 10,
      max_total_bytes: 25,
      policy_id: "policy-bytes",
    });
    const bytesDecision = evaluateRetention(
      byBytes,
      [
        { artifact_id: "a", byte_size: 10, captured_at_ms: 1000 },
        { artifact_id: "b", byte_size: 10, captured_at_ms: 2000 },
        { artifact_id: "c", byte_size: 10, captured_at_ms: 3000 },
      ],
      4000,
    );
    expect(bytesDecision.evicted_by_bytes).toEqual(["a"]);
    expect(bytesDecision.retained_bytes).toBe(20);
    expect(() =>
      evaluateRetention(
        byCount,
        [
          { artifact_id: "dup", byte_size: 1, captured_at_ms: 1 },
          { artifact_id: "dup", byte_size: 1, captured_at_ms: 2 },
        ],
        10,
      ),
    ).toThrow(TypeError);
  });

  it("ingests only closed fact kinds per artifact kind", () => {
    const trace = traceArtifact();
    expect(
      ingestTraceFact(trace, {
        claim_key: "action-navigate",
        fact_id: "fact-action",
        fact_kind: "trace-action",
        redaction: "not-sensitive",
        summary: "navigated to checkout",
      }).provenance,
    ).toBe("trace-derived");
    expect(
      ingestTraceFact(trace, {
        claim_key: "error-x",
        fact_id: "fact-error",
        fact_kind: "trace-error",
        redaction: "redacted",
        summary: "page error observed",
      }).fact_kind,
    ).toBe("trace-error");
    expect(
      ingestTraceFact(artifact("shot-1", "screenshot"), {
        claim_key: "shot-x",
        fact_id: "fact-shot",
        fact_kind: "trace-screenshot",
        redaction: "redaction-unsupported",
        summary: "screenshot captured",
      }).redaction,
    ).toBe("redaction-unsupported");
    expect(
      ingestTraceFact(artifact("log-1", "console-log"), {
        claim_key: "console-x",
        fact_id: "fact-console",
        fact_kind: "trace-console",
        redaction: "not-sensitive",
        summary: "console error observed",
      }).fact_kind,
    ).toBe("trace-console");
    expect(
      ingestTraceFact(artifact("net-1", "network-log"), {
        claim_key: "net-x",
        fact_id: "fact-net",
        fact_kind: "trace-network",
        redaction: "not-sensitive",
        summary: "request observed",
      }).fact_kind,
    ).toBe("trace-network");
  });

  it("rejects snapshot sources and cross-kind ingestion", () => {
    for (const kind of ["dom-snapshot", "accessibility-snapshot"]) {
      expect(() =>
        ingestTraceFact(artifact("snap-1", kind), {
          claim_key: "k",
          fact_id: "fact-bad",
          fact_kind: "trace-action",
          redaction: "not-sensitive",
          summary: "snapshot fact attempt",
        }),
      ).toThrow(TRACE_KIND_REJECTED);
    }
    expect(() =>
      ingestTraceFact(traceArtifact(), {
        claim_key: "k",
        fact_id: "fact-bad",
        fact_kind: "trace-console",
        redaction: "not-sensitive",
        summary: "console fact from trace",
      }),
    ).toThrow(TRACE_KIND_REJECTED);
    expect(() =>
      ingestTraceFact(traceArtifact(), {
        claim_key: "k",
        fact_id: "fact-bad",
        fact_kind: "trace-timeline",
        redaction: "not-sensitive",
        summary: "viewer-grade fact",
      }),
    ).toThrow(TypeError);
    expect(() =>
      ingestTraceFact(traceArtifact(), {
        claim_key: "k",
        fact_id: "fact-bad",
        fact_kind: "trace-action",
        redaction: "auto-redacted",
        summary: "unknown redaction state",
      }),
    ).toThrow(TypeError);
  });

  it("binds facts to the artifact session/source and rejects secrets", () => {
    const fact = ingestTraceFact(traceArtifact(), {
      claim_key: "action-x",
      fact_id: "fact-bound",
      fact_kind: "trace-action",
      redaction: "not-sensitive",
      summary: "clicked checkout",
    });
    expect(fact.session_id).toBe(SESSION);
    expect(fact.source_identity).toBe(SOURCE);
    expect(fact.artifact_id).toBe("trace-1");
    expect(() =>
      ingestTraceFact(traceArtifact(), {
        claim_key: "k",
        fact_id: "fact-secret",
        fact_kind: "trace-action",
        redaction: "not-sensitive",
        summary: "typed ghp_abcdefghijklmnopqrstuvwxyz1234",
      }),
    ).toThrow(TypeError);
  });

  it("assembles ingestions with binding and uniqueness gates", () => {
    const trace = traceArtifact();
    const fact = ingestTraceFact(trace, {
      claim_key: "action-x",
      fact_id: "fact-1",
      fact_kind: "trace-action",
      redaction: "not-sensitive",
      summary: "clicked checkout",
    });
    const ingestion = assembleTraceIngestion({
      artifacts: [trace],
      facts: [fact],
      ingestion_id: "ing-1",
      session_id: SESSION,
      source_identity: SOURCE,
    });
    expect(ingestion.artifact_ids).toEqual(["trace-1"]);
    expect(ingestion.facts).toHaveLength(1);
    expect(() =>
      assembleTraceIngestion({
        artifacts: [
          artifact("trace-x", "trace", { session_id: "other-session" }),
        ],
        facts: [],
        ingestion_id: "ing-bad",
        session_id: SESSION,
        source_identity: SOURCE,
      }),
    ).toThrow(TRACE_BINDING_MISMATCH);
    expect(() =>
      assembleTraceIngestion({
        artifacts: [trace],
        facts: [fact, { ...fact, fact_id: "fact-1" }],
        ingestion_id: "ing-bad",
        session_id: SESSION,
        source_identity: SOURCE,
      }),
    ).toThrow(TypeError);
    expect(() =>
      assembleTraceIngestion({
        artifacts: [trace],
        facts: [{ ...fact, artifact_id: "missing-artifact" }],
        ingestion_id: "ing-bad",
        session_id: SESSION,
        source_identity: SOURCE,
      }),
    ).toThrow(TypeError);
    const foreign = ingestTraceFact(
      artifact("trace-f", "trace", { session_id: "other-session" }),
      {
        claim_key: "k",
        fact_id: "fact-foreign",
        fact_kind: "trace-action",
        redaction: "not-sensitive",
        summary: "foreign fact",
      },
    );
    expect(() =>
      assembleTraceIngestion({
        artifacts: [trace],
        facts: [foreign],
        ingestion_id: "ing-bad",
        session_id: SESSION,
        source_identity: SOURCE,
      }),
    ).toThrow(TRACE_BINDING_MISMATCH);
  });

  it("corroborates without ever overriding Ascout evidence", () => {
    const trace = traceArtifact();
    const matching = ingestTraceFact(trace, {
      claim_key: "nav-checkout",
      fact_id: "fact-match",
      fact_kind: "trace-action",
      redaction: "not-sensitive",
      summary: "navigated to checkout",
    });
    const conflicting = ingestTraceFact(trace, {
      claim_key: "button-label",
      fact_id: "fact-conflict",
      fact_kind: "trace-action",
      redaction: "not-sensitive",
      summary: "trace saw Buy now",
    });
    const orphan = ingestTraceFact(trace, {
      claim_key: "overlay-timing",
      fact_id: "fact-orphan",
      fact_kind: "trace-action",
      redaction: "not-sensitive",
      summary: "overlay dismissed at 120ms",
    });
    const results = corroborateWithTrace(
      [
        {
          claim_key: "nav-checkout",
          claim_value: "navigated to checkout",
          evidence_id: "ev-nav",
        },
        {
          claim_key: "button-label",
          claim_value: "Ascout observed Place order",
          evidence_id: "ev-button",
        },
      ],
      [orphan, conflicting, matching],
    );
    expect(results.map((entry) => entry.fact_id)).toEqual([
      "fact-conflict",
      "fact-match",
      "fact-orphan",
    ]);
    const byId = new Map(results.map((entry) => [entry.fact_id, entry]));
    expect(byId.get("fact-match")!.status).toBe("corroborated");
    expect(byId.get("fact-match")!.ascout_evidence_id).toBe("ev-nav");
    expect(byId.get("fact-orphan")!.status).toBe("trace-only");
    expect(byId.get("fact-orphan")!.ascout_evidence_id).toBeNull();
    const conflict = byId.get("fact-conflict")!;
    expect(conflict.status).toBe("conflict");
    expect(conflict.ascout_evidence_id).toBe("ev-button");
    expect(conflict.note).toContain("Ascout claim ev-button wins");
  });

  it("round-trips facts and ingestions with strict revalidation", () => {
    const fact = ingestTraceFact(traceArtifact(), {
      claim_key: "action-x",
      fact_id: "fact-1",
      fact_kind: "trace-action",
      redaction: "redacted",
      summary: "clicked checkout",
    });
    expect(traceFactFromJson(traceFactToJson(fact))).toEqual(fact);
    const ingestion = assembleTraceIngestion({
      artifacts: [traceArtifact()],
      facts: [fact],
      ingestion_id: "ing-1",
      session_id: SESSION,
      source_identity: SOURCE,
    });
    const json = traceIngestionToJson(ingestion);
    const parsed = traceIngestionFromJson(json);
    expect(parsed).toEqual(ingestion);
    expect(traceIngestionDigest(parsed)).toBe(traceIngestionDigest(ingestion));
    expect(traceIngestionToJson(parsed)).toBe(json);
    expect(() => traceIngestionFromJson("not json")).toThrow(TypeError);
    expect(() => traceFactFromJson("[]")).toThrow(TypeError);
    const badProvenance = JSON.parse(traceFactToJson(fact)) as Record<
      string,
      unknown
    >;
    badProvenance.provenance = "direct-evidence";
    expect(() =>
      traceFactFromJson(JSON.stringify(badProvenance)),
    ).toThrow(TypeError);
    const dangling = JSON.parse(json) as Record<string, unknown>;
    (dangling.facts as Record<string, unknown>[])[0]!.artifact_id =
      "ghost-artifact";
    expect(() => traceIngestionFromJson(JSON.stringify(dangling))).toThrow(
      TypeError,
    );
  });

  it("produces stable digests and deterministic retention", () => {
    const left = assembleTraceIngestion({
      artifacts: [traceArtifact()],
      facts: [
        ingestTraceFact(traceArtifact(), {
          claim_key: "k",
          fact_id: "fact-1",
          fact_kind: "trace-action",
          redaction: "not-sensitive",
          summary: "clicked",
        }),
      ],
      ingestion_id: "ing-1",
      session_id: SESSION,
      source_identity: SOURCE,
    });
    const right = assembleTraceIngestion({
      artifacts: [traceArtifact()],
      facts: [
        ingestTraceFact(traceArtifact(), {
          claim_key: "k",
          fact_id: "fact-1",
          fact_kind: "trace-action",
          redaction: "not-sensitive",
          summary: "clicked",
        }),
      ],
      ingestion_id: "ing-1",
      session_id: SESSION,
      source_identity: SOURCE,
    });
    expect(traceIngestionDigest(left)).toBe(traceIngestionDigest(right));
    const policy = createRetentionPolicy({
      max_age_ms: 100_000,
      max_artifacts: 5,
      max_total_bytes: 1000,
      policy_id: "policy-det",
    });
    const artifacts = [
      { artifact_id: "a", byte_size: 100, captured_at_ms: 1000 },
      { artifact_id: "b", byte_size: 100, captured_at_ms: 2000 },
    ];
    expect(evaluateRetention(policy, artifacts, 3000)).toEqual(
      evaluateRetention(policy, artifacts, 3000),
    );
  });

  it("keeps trace codes in their own namespace", () => {
    for (const code of [
      TRACE_KIND_REJECTED,
      TRACE_BINDING_MISMATCH,
      TRACE_RETENTION_INVALID,
    ]) {
      expect(code.startsWith("E_TRACE_")).toBe(true);
      expect(code.startsWith("E_RECOVERY_")).toBe(false);
      expect(code.startsWith("E_LOCATOR_")).toBe(false);
    }
  });
});
