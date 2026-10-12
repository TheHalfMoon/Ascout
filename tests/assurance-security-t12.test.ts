import { describe, expect, it } from "vitest";
import {
  SENTRDEL_REPRODUCTION_LINK_STATES,
  linkSentrdelReproductionV1,
} from "../src/assurance/security/sentrdel-reproduction-link.js";
import { normalizeSentrdelEvidenceV1 } from "../src/assurance/security/sentrdel-evidence-normalization.js";
import { SENTRDEL_ENGINE_ID } from "../src/assurance/security/sentrdel-engine-boundary.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "../src/assurance/security/sentrdel-source-pin.js";

const HEAD = "1".repeat(40);
const RAW = "a".repeat(64);

/** Real T04 observations, not hand-built stand-ins. */
function observation(overrides: Record<string, unknown> = {}) {
  return normalizeSentrdelEvidenceV1({
    schema_version: 1, request_id: "request:t12", attempt_id: "attempt:1", claim_class: "STRUCTURAL_OBSERVATION",
    engine_id: SENTRDEL_ENGINE_ID, engine_pin: SENTRDEL_PINNED_REVISION, engine_tree: SENTRDEL_PINNED_TREE,
    engine_version: "0.0.0", source_head: HEAD, capability_id: "sast-structural", execution_state: "EXECUTED",
    rule_id: "rule:eval-order", location: { path: "src/app.ts", start_line: 12, end_line: 18 },
    raw_evidence_ref: "raw:t12", raw_evidence_digest: RAW, coverage_state: "PARTIAL",
    scanned_scope: ["src/app.ts"], unscanned_scope: ["vendor"], unknown_states: ["PARSER_UNSUPPORTED"], limitations: ["t12"],
    provenance: { state: "COMPLETE", producer_id: "producer:sentrdel", producer_version: "0.0.0",
      collector_ref: "collector:t12", rule_set_ref: "ruleset:v1" },
    effect_facts: "E0_READ_ONLY_ANALYSIS", network_facts: "NO_NETWORK", egress_facts: "NO_EGRESS",
    reproduction_ref: "repro:t12", ...overrides,
  } as Parameters<typeof normalizeSentrdelEvidenceV1>[0]);
}

function reproduction(overrides: Record<string, unknown> = {}) {
  return { schema_version: 1, reproduction_ref: "repro:t12", source_head: HEAD, method: "deterministic-rescan",
    input_digest: RAW, ...overrides };
}

describe("UA-P06-T12 proof/reproduction references", () => {
  it("links a declared, digest-bound reproduction without claiming it ran or proved anything", () => {
    const obs = observation();
    const link = linkSentrdelReproductionV1(obs, reproduction());
    expect(link).toMatchObject({
      state: "LINKED_NOT_EXECUTED", observation_id: obs.observation_id, reproduction_ref: "repro:t12",
      method: "deterministic-rescan", input_digest: RAW, source_head: HEAD,
      reproduction_executed: false, reproduced: false, exploit_proven: false, finding_emitted: false, assurance_effect: "NONE",
    });
    expect(Object.isFrozen(link)).toBe(true);
    expect(SENTRDEL_REPRODUCTION_LINK_STATES).not.toContain("VERIFIED");
    expect(JSON.stringify(link)).not.toMatch(/"(VERIFIED|REPRODUCED|PROVEN|PASS)"/u);
  });

  it("reports declared-but-missing and undeclared reproductions explicitly", () => {
    expect(linkSentrdelReproductionV1(observation(), null)).toMatchObject({ state: "DECLARED_NOT_SUPPLIED", method: null });
    expect(linkSentrdelReproductionV1(observation({ reproduction_ref: null }), null))
      .toMatchObject({ state: "NONE_DECLARED", reproduction_ref: null });
  });

  it("is deterministic and bound to observation, method, and state", () => {
    const obs = observation();
    const first = linkSentrdelReproductionV1(obs, reproduction());
    expect(linkSentrdelReproductionV1(obs, reproduction())).toEqual(first);
    expect(linkSentrdelReproductionV1(obs, reproduction({ method: "fixture-replay" })).link_id).not.toBe(first.link_id);
    expect(linkSentrdelReproductionV1(obs, null).link_id).not.toBe(first.link_id);
  });

  it("refuses unbound, unsolicited, mismatched, and escalating reproductions", () => {
    const obs = observation();
    const refuse = (o: unknown, r: unknown, name: string) => expect(() => linkSentrdelReproductionV1(o, r), name).toThrow(TypeError);
    refuse(obs, reproduction({ input_digest: "b".repeat(64) }), "input digest not declared (donor ReproductionInputDigestNotTrusted)");
    refuse(obs, reproduction({ reproduction_ref: "repro:other" }), "different reference");
    refuse(obs, reproduction({ source_head: "2".repeat(40) }), "different source head");
    expect(() => linkSentrdelReproductionV1(observation({ reproduction_ref: null }), reproduction()), "unsolicited reproduction")
      .toThrow(/declared no reproduction/u);
    refuse(obs, reproduction({ verified: true }), "extra key");
    refuse(obs, reproduction({ schema_version: 2 }), "schema");
    refuse(obs, reproduction({ method: "" }), "empty method");
    refuse(obs, reproduction({ method: "AKIA" + "Q".repeat(16) }), "secret method");
    refuse(obs, reproduction({ input_digest: "x" }), "bad digest");
    refuse(obs, "repro:t12", "non-record reproduction");
    for (const [key, value] of [["finding_emitted", true], ["remediation_verified", true], ["assurance_effect", "PASS"],
      ["authority", "FINDING"], ["phase_authority", "UA-P06-T13"]] as const) {
      refuse({ ...obs, [key]: value }, reproduction(), `promoted ${key}`);
    }
    let calls = 0;
    const accessor = { ...obs };
    Object.defineProperty(accessor, "reproduction_ref", { enumerable: true, get: () => { calls += 1; return "repro:t12"; } });
    refuse(accessor, reproduction(), "accessor observation");
    expect(calls).toBe(0);
  });
});
