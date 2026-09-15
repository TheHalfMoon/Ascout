import { describe, expect, it } from "vitest";
import {
  actionRequestFromJson,
  actionRequestToJson,
  actionResponseFromJson,
  actionResponseToJson,
  activeCancellation,
  artifactFromJson,
  artifactToJson,
  assertionRequestFromJson,
  assertionRequestToJson,
  assertionResponseFromJson,
  assertionResponseToJson,
  cancelState,
  createActionRequest,
  createActionResponse,
  createArtifactRef,
  createAssertionRequest,
  createAssertionResponse,
  createSessionIdentity,
  deadlineExceeded,
  remainingMs,
  requireBoundArtifact,
  requireBoundResponse,
  sessionFromJson,
  sessionToJson,
} from "../src/browser/executor.js";

const SOURCE = "tree:898cb1e4000000000000000000000000000000";

function sessionInput() {
  return {
    application_origin: "http://localhost:3100",
    browser_profile: "chromium-default",
    engine: {
      channel: "bundled-chromium",
      name: "chromium",
      version: "141.0.7390.37",
    },
    environment: {
      arch: "x64",
      os: "linux",
      runtime: "node",
      runtime_version: "24.21.0",
    },
    session_id: "session-001",
    source_identity: SOURCE,
  } as const;
}

describe("spec016 p016-03 executor contract", () => {
  it("creates a validated chromium session identity", () => {
    const session = createSessionIdentity(sessionInput());
    expect(session.engine.name).toBe("chromium");
    expect(session.session_id).toBe("session-001");
  });

  it("fails closed on unknown engines and bad origins", () => {
    const base = sessionInput();
    expect(() =>
      createSessionIdentity({
        ...base,
        engine: { ...base.engine, name: "firefox" },
      }),
    ).toThrow(TypeError);
    expect(() =>
      createSessionIdentity({
        ...base,
        application_origin: "http://localhost:3100/app",
      }),
    ).toThrow(TypeError);
    expect(() =>
      createSessionIdentity({ ...base, session_id: "has space" }),
    ).toThrow(TypeError);
  });

  it("validates action requests with bounded timeouts", () => {
    const request = createActionRequest({
      kind: "click",
      request_id: "req-1",
      session_id: "session-001",
      target: "Place order",
      timeout_ms: 30000,
      value: null,
    });
    expect(request.kind).toBe("click");
    expect(() =>
      createActionRequest({
        kind: "teleport",
        request_id: "req-2",
        session_id: "session-001",
        target: "x",
        timeout_ms: 30000,
        value: null,
      }),
    ).toThrow(TypeError);
    for (const timeout_ms of [0, -5, 120001, 1.5]) {
      expect(() =>
        createActionRequest({
          kind: "click",
          request_id: "req-3",
          session_id: "session-001",
          target: "x",
          timeout_ms,
          value: null,
        }),
      ).toThrow(TypeError);
    }
  });

  it("enforces error consistency on action responses", () => {
    const ok = createActionResponse({
      duration_ms: 12,
      error: null,
      evidence_refs: [],
      request_id: "req-1",
      session_id: "session-001",
      source_identity: SOURCE,
      status: "ok",
    });
    expect(ok.status).toBe("ok");
    expect(() =>
      createActionResponse({
        duration_ms: 12,
        error: { code: "E_X", message: "x" },
        evidence_refs: [],
        request_id: "req-1",
        session_id: "session-001",
        source_identity: SOURCE,
        status: "ok",
      }),
    ).toThrow(TypeError);
    expect(() =>
      createActionResponse({
        duration_ms: 12,
        error: null,
        evidence_refs: [],
        request_id: "req-1",
        session_id: "session-001",
        source_identity: SOURCE,
        status: "failed",
      }),
    ).toThrow(TypeError);
    expect(() =>
      createActionResponse({
        duration_ms: 12,
        error: { code: "E_X", message: "x" },
        evidence_refs: [],
        request_id: "req-1",
        session_id: "session-001",
        source_identity: SOURCE,
        status: "maybe",
      }),
    ).toThrow(TypeError);
  });

  it("validates assertion requests and oracle refs", () => {
    const request = createAssertionRequest({
      kind: "network",
      request_id: "req-9",
      session_id: "session-001",
      statement: "exactly one order request succeeds",
      timeout_ms: 15000,
    });
    expect(request.kind).toBe("network");
    const passed = createAssertionResponse({
      duration_ms: 3,
      error: null,
      evidence_refs: ["ev-1"],
      oracle_ref: null,
      request_id: "req-9",
      session_id: "session-001",
      source_identity: SOURCE,
      status: "passed",
    });
    expect(passed.oracle_ref).toBeNull();
    const withOracle = createAssertionResponse({
      duration_ms: 3,
      error: null,
      evidence_refs: [],
      oracle_ref: "oracle-dom-1",
      request_id: "req-9",
      session_id: "session-001",
      source_identity: SOURCE,
      status: "passed",
    });
    expect(withOracle.oracle_ref).toBe("oracle-dom-1");
    expect(() =>
      createAssertionResponse({
        duration_ms: 3,
        error: null,
        evidence_refs: [],
        oracle_ref: "bad ref",
        request_id: "req-9",
        session_id: "session-001",
        source_identity: SOURCE,
        status: "passed",
      }),
    ).toThrow(TypeError);
  });

  it("validates artifact refs with digests and safe uris", () => {
    const artifact = createArtifactRef({
      artifact_id: "shot-1",
      byte_size: 4242,
      digest: "9f2c4a",
      kind: "screenshot",
      redacted: false,
      session_id: "session-001",
      source_identity: SOURCE,
      uri: "artifacts/session-001/shot-1.png",
    });
    expect(artifact.kind).toBe("screenshot");
    expect(() =>
      createArtifactRef({
        artifact_id: "shot-2",
        byte_size: null,
        digest: "ZZZ-not-hex",
        kind: "screenshot",
        redacted: false,
        session_id: "session-001",
        source_identity: SOURCE,
        uri: null,
      }),
    ).toThrow(TypeError);
    for (const uri of ["/etc/passwd", "C:\\shots\\a.png", "artifacts\\a.png"]) {
      expect(() =>
        createArtifactRef({
          artifact_id: "shot-3",
          byte_size: null,
          digest: null,
          kind: "trace",
          redacted: false,
          session_id: "session-001",
          source_identity: SOURCE,
          uri,
        }),
      ).toThrow(TypeError);
    }
    expect(() =>
      createArtifactRef({
        artifact_id: "shot-4",
        byte_size: null,
        digest: null,
        kind: "video",
        redacted: false,
        session_id: "session-001",
        source_identity: SOURCE,
        uri: null,
      }),
    ).toThrow(TypeError);
  });

  it("binds responses and artifacts to their session", () => {
    const session = createSessionIdentity(sessionInput());
    const response = createActionResponse({
      duration_ms: 1,
      error: null,
      evidence_refs: [],
      request_id: "req-1",
      session_id: "session-001",
      source_identity: SOURCE,
      status: "ok",
    });
    requireBoundResponse(response, session);
    const artifact = createArtifactRef({
      artifact_id: "a-1",
      byte_size: null,
      digest: null,
      kind: "trace",
      redacted: true,
      session_id: "session-001",
      source_identity: SOURCE,
      uri: null,
    });
    requireBoundArtifact(artifact, session);
    expect(() =>
      requireBoundResponse(
        { ...response, session_id: "session-999" },
        session,
      ),
    ).toThrow(TypeError);
    expect(() =>
      requireBoundArtifact(
        { ...artifact, source_identity: "tree:other" },
        session,
      ),
    ).toThrow(TypeError);
  });

  it("models cancellation as immutable values", () => {
    const active = activeCancellation();
    expect(active.cancelled).toBe(false);
    const cancelled = cancelState(active);
    expect(cancelled.cancelled).toBe(true);
    expect(active.cancelled).toBe(false);
  });

  it("computes deadlines purely without a clock", () => {
    expect(deadlineExceeded(1000, 31000, 30000)).toBe(true);
    expect(deadlineExceeded(1000, 30999, 30000)).toBe(false);
    expect(remainingMs(1000, 11000, 30000)).toBe(20000);
    expect(remainingMs(1000, 99000, 30000)).toBe(0);
    expect(() => deadlineExceeded(0, 10, 0)).toThrow(TypeError);
  });

  it("round-trips every envelope through deterministic JSON", () => {
    const session = createSessionIdentity(sessionInput());
    expect(sessionFromJson(sessionToJson(session))).toEqual(session);
    const actionRequest = createActionRequest({
      kind: "fill",
      request_id: "req-5",
      session_id: "session-001",
      target: "email",
      timeout_ms: 5000,
      value: "a@example.test",
    });
    expect(actionRequestFromJson(actionRequestToJson(actionRequest))).toEqual(
      actionRequest,
    );
    const actionResponse = createActionResponse({
      duration_ms: 7,
      error: null,
      evidence_refs: ["ev-b", "ev-a"],
      request_id: "req-5",
      session_id: "session-001",
      source_identity: SOURCE,
      status: "ok",
    });
    expect(actionResponse.evidence_refs).toEqual(["ev-a", "ev-b"]);
    expect(
      actionResponseFromJson(actionResponseToJson(actionResponse)),
    ).toEqual(actionResponse);
    const assertionRequest = createAssertionRequest({
      kind: "console",
      request_id: "req-6",
      session_id: "session-001",
      statement: "no page errors",
      timeout_ms: 5000,
    });
    expect(
      assertionRequestFromJson(assertionRequestToJson(assertionRequest)),
    ).toEqual(assertionRequest);
    const assertionResponse = createAssertionResponse({
      duration_ms: 2,
      error: { code: "E_TIMEOUT", message: "wait exceeded" },
      evidence_refs: [],
      oracle_ref: null,
      request_id: "req-6",
      session_id: "session-001",
      source_identity: SOURCE,
      status: "timeout",
    });
    expect(
      assertionResponseFromJson(assertionResponseToJson(assertionResponse)),
    ).toEqual(assertionResponse);
    const artifact = createArtifactRef({
      artifact_id: "art-1",
      byte_size: 10,
      digest: "ab12",
      kind: "dom-snapshot",
      redacted: true,
      session_id: "session-001",
      source_identity: SOURCE,
      uri: "artifacts/session-001/dom.json",
    });
    expect(artifactFromJson(artifactToJson(artifact))).toEqual(artifact);
    expect(() => sessionFromJson("not json")).toThrow(TypeError);
    expect(() => artifactFromJson("[]")).toThrow(TypeError);
  });
});
