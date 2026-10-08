import { describe, expect, it } from "vitest";
import {
  SENTRDEL_WORKFLOW_RULE_IDS,
  buildSentrdelGenericIacGapV1,
  normalizeSentrdelWorkflowObservationV1,
  validateSentrdelWorkflowInputV1,
  type SentrdelWorkflowInputV1,
} from "../src/assurance/security/sentrdel-workflow-normalization.js";
import { SENTRDEL_ENGINE_ID, SENTRDEL_ENGINE_VERSION } from "../src/assurance/security/sentrdel-engine-boundary.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "../src/assurance/security/sentrdel-source-pin.js";

const HEAD = "a".repeat(40);
const DIGEST = "b".repeat(64);

function input(overrides: Record<string, unknown> = {}): SentrdelWorkflowInputV1 {
  return {
    schema_version: 1,
    request_id: "request:fixture",
    attempt_id: "attempt:fixture",
    source_head: HEAD,
    engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE,
    engine_version: SENTRDEL_ENGINE_VERSION,
    capability_id: "github-actions",
    execution_state: "EXECUTED",
    rule_id: "gha.pull-request-target",
    workflow_path: ".github/workflows/ci.yml",
    line: 17,
    producer_id: "producer:sentrdel",
    evidence_ref: "evidence:synthetic",
    evidence_digest: DIGEST,
    coverage_state: "COMPLETE_WITHIN_STATED_SCOPE",
    unknown_tokens: [],
    effect_ceiling: "E0_READ_ONLY_ANALYSIS",
    network_policy: "NO_NETWORK",
    egress_policy: "NO_EGRESS",
    ...overrides,
  } as SentrdelWorkflowInputV1;
}

describe("UA-P06-T09A bounded CI observation normalization", () => {
  it("accepts each actual pinned GitHub Actions rule identifier", () => {
    expect(SENTRDEL_WORKFLOW_RULE_IDS).toHaveLength(8);
    for (const rule of SENTRDEL_WORKFLOW_RULE_IDS) {
      const record = normalizeSentrdelWorkflowObservationV1(input({ rule_id: rule }));
      expect(record.rule_id).toBe(rule);
      expect(record.phase_authority).toBe("UA-P06-T09");
      expect(record.authority).toBe("CONFIG_OBSERVATION_ONLY");
      expect(record.assurance_effect).toBe("NONE");
      expect(record.finding_emitted).toBe(false);
      expect(record.claim_assessment_emitted).toBe(false);
      expect(record.producer_execution_attested).toBe(false);
      expect(record.severity_derived).toBe(false);
      expect(record.remediation_verified).toBe(false);
      expect(record.coverage.repository_total).toBe(false);
      expect(record.coverage.unscanned_is_clean).toBe(false);
      expect(JSON.stringify(record)).not.toMatch(/"PASS"|"SUPPORTED"|"CLEAN"/u);
    }
  });

  it("is deterministic, frozen, and bound to exact source and evidence identity", () => {
    const source = input();
    const first = normalizeSentrdelWorkflowObservationV1(source);
    expect(normalizeSentrdelWorkflowObservationV1(source)).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.provenance)).toBe(true);
    expect(Object.isFrozen(first.coverage)).toBe(true);
    expect(Object.isFrozen(first.coverage.unknown_tokens)).toBe(true);
    expect(normalizeSentrdelWorkflowObservationV1(input({ source_head: "c".repeat(40) })).observation_id)
      .not.toBe(first.observation_id);
    expect(normalizeSentrdelWorkflowObservationV1(input({ evidence_digest: "d".repeat(64) })).observation_id)
      .not.toBe(first.observation_id);
    expect(normalizeSentrdelWorkflowObservationV1(input({ attempt_id: "attempt:other" })).observation_id)
      .not.toBe(first.observation_id);
    expect(normalizeSentrdelWorkflowObservationV1(input({ producer_id: "producer:other" })).observation_id)
      .not.toBe(first.observation_id);
    expect(normalizeSentrdelWorkflowObservationV1(input({ evidence_ref: "evidence:other" })).observation_id)
      .not.toBe(first.observation_id);
  });

  it("preserves partial coverage and canonicalizes unknown reasons", () => {
    const a = input({ coverage_state: "PARTIAL", unknown_tokens: ["TIMEOUT", "PARSER_UNSUPPORTED"] });
    const b = input({ coverage_state: "PARTIAL", unknown_tokens: ["PARSER_UNSUPPORTED", "TIMEOUT"] });
    const x = normalizeSentrdelWorkflowObservationV1(a);
    expect(x).toEqual(normalizeSentrdelWorkflowObservationV1(b));
    expect(x.coverage.unknown_tokens).toEqual(["PARSER_UNSUPPORTED", "TIMEOUT"]);
    expect(x.coverage.state).toBe("PARTIAL");
    expect(x.coverage.repository_total).toBe(false);
  });

  it("never promotes generic IaC absence into clean/supported scope", () => {
    const gap = buildSentrdelGenericIacGapV1();
    expect(gap.capability_id).toBe("iac-generic");
    expect(gap.phase_authority).toBe("UA-P06-T09");
    expect(gap.status).toBe("NOT_RUN");
    expect(gap.reason_code).toBe("unsupported_at_pinned_source");
    expect(gap.coverage_total).toBe(false);
    expect(gap.clean_claimed).toBe(false);
    expect(gap.assurance_effect).toBe("NONE");
    expect(Object.isFrozen(gap)).toBe(true);
    expect(buildSentrdelGenericIacGapV1()).toEqual(gap);
  });

  it("refuses unqualified and escalation-bearing observation input", () => {
    const invalid: Array<[string, Record<string, unknown>]> = [
      ["engine pin", { engine_pin: "0".repeat(40) }],
      ["engine tree", { engine_tree: "0".repeat(40) }],
      ["engine identity", { engine_id: "engine:other" }],
      ["version", { engine_version: "99.0.0" }],
      ["capability", { capability_id: "iac-generic" }],
      ["unsupported CI format", { capability_id: "jenkins" }],
      ["absent engine", { execution_state: "UNAVAILABLE" }],
      ["timeout", { execution_state: "TIMEOUT" }],
      ["engine error", { execution_state: "ENGINE_ERROR" }],
      ["invented rule", { rule_id: "gha.does-not-exist" }],
      ["absolute path", { workflow_path: "C:/private/workflow.yml" }],
      ["parent traversal", { workflow_path: ".github/workflows/../ci.yml" }],
      ["arbitrary YAML", { workflow_path: "config/ci.yml" }],
      ["nested workflow path", { workflow_path: ".github/workflows/tmp/ci.yml" }],
      ["unsafe path", { workflow_path: ".github/workflows/ci ; echo unsafe.yml" }],
      ["invalid line", { line: 0 }],
      ["noninteger line", { line: 1.5 }],
      ["overflow line", { line: 1_000_001 }],
      ["missing provenance", { producer_id: "" }],
      ["missing evidence", { evidence_ref: "" }],
      ["bad evidence digest", { evidence_digest: "123" }],
      ["invalid head", { source_head: "123" }],
      ["fabricated coverage", { coverage_state: "TOTAL" }],
      ["unexplained partial", { coverage_state: "PARTIAL", unknown_tokens: [] }],
      ["unknown in complete", { coverage_state: "COMPLETE_WITHIN_STATED_SCOPE", unknown_tokens: ["TIMEOUT"] }],
      ["invented unknown token", { coverage_state: "PARTIAL", unknown_tokens: ["CLEAN"] }],
      ["duplicate unknown token", { coverage_state: "PARTIAL", unknown_tokens: ["TIMEOUT", "TIMEOUT"] }],
      ["effect escalation", { effect_ceiling: "E2_WRITE" }],
      ["network escalation", { network_policy: "ALLOW_NETWORK" }],
      ["egress escalation", { egress_policy: "ALLOW_EGRESS" }],
      ["attempted verdict", { verdict: "PASS" }],
      ["attempted severity", { severity: "critical" }],
      ["self attestation", { finding_validated: true }],
      ["secret material", { producer_id: "ghp_" + "x".repeat(36) }],
    ];
    for (const [name, change] of invalid) {
      const outcome = validateSentrdelWorkflowInputV1(input(change));
      expect(outcome.valid, name).toBe(false);
      expect(outcome.reasons.length, name).toBeGreaterThan(0);
      expect(() => normalizeSentrdelWorkflowObservationV1(input(change)), name).toThrow(TypeError);
    }
  });

  it("refuses malformed nonrecord input and unknown arrays", () => {
    for (const value of [null, undefined, [], 1, "ready"]) {
      expect(validateSentrdelWorkflowInputV1(value).valid).toBe(false);
    }
    for (const value of [null, "TIMEOUT", Array(9).fill("TIMEOUT")]) {
      expect(validateSentrdelWorkflowInputV1(input({ unknown_tokens: value })).valid).toBe(false);
    }
  });
});
