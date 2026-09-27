import { describe, expect, it } from "vitest";

import {
  adapterIdentityV1,
  evaluateAdapterAuthorityV1,
  externalSuccessIsAssurancePassV1,
  isVersionMismatchV1,
  resolveMissingEngineV1,
  responseCarriesFindingV1,
  SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES,
  validateSentrdelAdapterRequestV1,
  validateSentrdelAdapterResponseV1,
  type SentrdelAdapterRequestV1,
  type SentrdelAdapterResponseV1,
} from "../src/assurance/security/sentrdel-engine-adapter.js";
import { SENTRDEL_ENGINE_ID } from "../src/assurance/security/sentrdel-engine-boundary.js";
import {
  SENTRDEL_PINNED_REVISION,
  SENTRDEL_PINNED_TREE,
} from "../src/assurance/security/sentrdel-source-pin.js";

const ZERO_SHA256 = "0".repeat(64);

function validRequest(): SentrdelAdapterRequestV1 {
  return Object.freeze({
    schema_version: 1,
    request_id: "request:t03-acceptance-001",
    source_kind: "source:local-worktree",
    source_head: "a".repeat(40),
    requested_capabilities: Object.freeze(["sast-structural", "secrets-changed"]),
    effect_ceiling: "E0_READ_ONLY_ANALYSIS",
    network_policy: "NO_NETWORK",
    data_egress_policy: "NO_EGRESS",
    engine_id: SENTRDEL_ENGINE_ID,
    engine_pin_expected: SENTRDEL_PINNED_REVISION,
    engine_tree_expected: SENTRDEL_PINNED_TREE,
    engine_version_expected: "0.0.0",
    input_refs: Object.freeze(["input:changed-bytes-001"]),
    attempt_id: "attempt:t03-001",
  }) as SentrdelAdapterRequestV1;
}

function validResponse(): SentrdelAdapterResponseV1 {
  return Object.freeze({
    schema_version: 1,
    request_id: "request:t03-acceptance-001",
    engine_id: SENTRDEL_ENGINE_ID,
    engine_version_actual: "0.0.0",
    engine_pin_actual: SENTRDEL_PINNED_REVISION,
    capability: "sast-structural",
    execution_state: "EXECUTED",
    source_binding: "a".repeat(40),
    occurrence_ref: "occurrence:t03-001",
    raw_result_digest: ZERO_SHA256,
    coverage_state: "coverage:partial-unknown-visible",
    unknown_tokens: Object.freeze(["PARSER_UNSUPPORTED"]),
    limitations: Object.freeze(["T03 contract validation only"]),
    effect_fact: "E0_READ_ONLY_ANALYSIS",
    network_fact: "NO_NETWORK",
    egress_fact: "NO_EGRESS",
    exit_outcome: "exit:bounded-decode-ok",
    adapter_errors: Object.freeze([]),
  }) as SentrdelAdapterResponseV1;
}

describe("UA-P06-T03 security engine adapter", () => {
  it("binds the exact donor pin and version", () => {
    const identity = adapterIdentityV1();
    expect(identity.pin).toBe(SENTRDEL_PINNED_REVISION);
    expect(identity.pin).toBe(
      "f5747319a50831ef7cee983d253c0ca5503c9a64",
    );
    expect(identity.version).toBe("0.0.0");
    expect(validateSentrdelAdapterRequestV1(validRequest()).valid).toBe(true);
  });

  it("versions the request schema", () => {
    expect(validRequest().schema_version).toBe(1);
    const bad = { ...validRequest(), schema_version: 2 as const };
    expect(validateSentrdelAdapterRequestV1(bad).valid).toBe(false);
  });

  it("versions the response schema", () => {
    expect(validResponse().schema_version).toBe(1);
    const bad = { ...validResponse(), schema_version: 2 as const };
    expect(validateSentrdelAdapterResponseV1(bad).valid).toBe(false);
  });

  it("orders capabilities deterministically", () => {
    const first = JSON.stringify(validRequest());
    const second = JSON.stringify(validRequest());
    expect(first).toBe(second);
    const unsorted = {
      ...validRequest(),
      requested_capabilities: ["secrets-changed", "sast-structural"] as const,
    };
    expect(
      validateSentrdelAdapterRequestV1(
        unsorted as unknown as SentrdelAdapterRequestV1,
      ).valid,
    ).toBe(false);
  });

  it("rejects duplicate capability ids", () => {
    const duplicated = {
      ...validRequest(),
      requested_capabilities: ["sast-structural", "sast-structural"] as const,
    };
    expect(
      validateSentrdelAdapterRequestV1(
        duplicated as unknown as SentrdelAdapterRequestV1,
      ).valid,
    ).toBe(false);
  });

  it("rejects malformed source SHAs", () => {
    const bad = { ...validRequest(), source_head: "not-a-sha" };
    expect(validateSentrdelAdapterRequestV1(bad).valid).toBe(false);
    const badResponse = { ...validResponse(), source_binding: "ZZZ" };
    expect(validateSentrdelAdapterResponseV1(badResponse).valid).toBe(false);
  });

  it("rejects unknown capabilities fail-closed", () => {
    const bad = {
      ...validRequest(),
      requested_capabilities: ["not-a-capability"] as unknown as typeof validRequest.prototype,
    };
    expect(
      validateSentrdelAdapterRequestV1(
        bad as unknown as SentrdelAdapterRequestV1,
      ).valid,
    ).toBe(false);
    expect(SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES).not.toContain("sbom");
    expect(SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES).not.toContain("iac-generic");
  });

  it("keeps engine version mismatch explicit", () => {
    expect(
      isVersionMismatchV1(
        validRequest(),
        SENTRDEL_PINNED_REVISION,
        "0.0.0",
      ),
    ).toBe(false);
    expect(isVersionMismatchV1(validRequest(), "b".repeat(40), "0.0.0")).toBe(
      true,
    );
    expect(isVersionMismatchV1(validRequest(), SENTRDEL_PINNED_REVISION, "9.9.9")).toBe(
      true,
    );
  });

  it("maps a missing engine to NOT_RUN or INCOMPLETE, never PASS", () => {
    const missing = resolveMissingEngineV1(
      "sentrdel_unavailable",
      "Sentrdel engine is unavailable and no security ran.",
    );
    expect(missing.execution_state).toBe("NOT_RUN");
    expect(missing.execution_state).not.toBe("PASS" as never);
    const fallback = resolveMissingEngineV1("", "");
    expect(fallback.execution_state).toBe("NOT_RUN");
  });

  it("keeps denied network and effect policy denied", () => {
    const badNetwork = { ...validRequest(), network_policy: "ALLOW" as never };
    expect(validateSentrdelAdapterRequestV1(badNetwork).valid).toBe(false);
    const decision = evaluateAdapterAuthorityV1(validRequest(), {
      explicit_request: true,
      phase_authority: "UA-P06-T03",
      engine_admitted: true,
      qualified: true,
      effect_within_ceiling: true,
      network_permitted: false,
      egress_permitted: true,
    });
    expect(decision.permitted).toBe(false);
    expect(decision.execution_state).toBe("DENIED_BY_POLICY");
  });

  it("never turns external success into an assurance PASS", () => {
    expect(externalSuccessIsAssurancePassV1()).toBe(false);
    expect(validResponse().execution_state).toBe("EXECUTED");
    expect(validateSentrdelAdapterResponseV1(validResponse()).valid).toBe(
      true,
    );
  });

  it("prevents adapter responses from self-creating Findings", () => {
    expect(responseCarriesFindingV1(validResponse())).toBe(false);
    const smuggled = {
      ...validResponse(),
      finding: { id: "finding:smuggled" },
    } as unknown as SentrdelAdapterResponseV1;
    expect(validateSentrdelAdapterResponseV1(smuggled).valid).toBe(false);
    expect(responseCarriesFindingV1(smuggled)).toBe(true);
  });

  it("persists no credentials or secrets", () => {
    const leaked = {
      ...validRequest(),
      attempt_id: "attempt:ghp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    };
    expect(validateSentrdelAdapterRequestV1(leaked).valid).toBe(false);
    const leakedResponse = {
      ...validResponse(),
      exit_outcome: "exit:AKIAAAAAAAAAAAAAAAAA",
    };
    expect(validateSentrdelAdapterResponseV1(leakedResponse).valid).toBe(
      false,
    );
  });

  it("performs no implicit provider fallback", () => {
    const decision = evaluateAdapterAuthorityV1(validRequest(), {
      explicit_request: true,
      phase_authority: "UA-P06-T03",
      engine_admitted: false,
      qualified: false,
      effect_within_ceiling: true,
      network_permitted: true,
      egress_permitted: true,
    });
    expect(decision.permitted).toBe(false);
    expect(decision.execution_state).toBe("NOT_QUALIFIED");
  });

  it("keeps request and response source identity exact", () => {
    const request = validRequest();
    const response = { ...validResponse(), source_binding: request.source_head };
    expect(validateSentrdelAdapterRequestV1(request).valid).toBe(true);
    expect(validateSentrdelAdapterResponseV1(response).valid).toBe(true);
    expect(response.source_binding).toBe(request.source_head);
  });

  it("causes no runtime side effects during pure validation", () => {
    const before = JSON.stringify(validRequest());
    expect(validateSentrdelAdapterRequestV1(validRequest()).valid).toBe(true);
    expect(validateSentrdelAdapterResponseV1(validResponse()).valid).toBe(
      true,
    );
    expect(JSON.stringify(validRequest())).toBe(before);
    expect(Object.isFrozen(validRequest().requested_capabilities)).toBe(true);
  });
});
