import { describe, expect, it } from "vitest";
import { exportSentrdelSarifV1 } from "../src/assurance/security/sentrdel-sarif-export.js";
import { importSentrdelSarifV1 } from "../src/assurance/security/sentrdel-sarif-import.js";
import { normalizeSentrdelEvidenceV1 } from "../src/assurance/security/sentrdel-evidence-normalization.js";
import { SENTRDEL_ENGINE_ID } from "../src/assurance/security/sentrdel-engine-boundary.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "../src/assurance/security/sentrdel-source-pin.js";

/** Real T04 observations: the exporter is tested against the actual upstream component. */
function observation(overrides: Record<string, unknown> = {}) {
  return normalizeSentrdelEvidenceV1({
    schema_version: 1, request_id: "request:t11b", attempt_id: "attempt:1", claim_class: "STRUCTURAL_OBSERVATION",
    engine_id: SENTRDEL_ENGINE_ID, engine_pin: SENTRDEL_PINNED_REVISION, engine_tree: SENTRDEL_PINNED_TREE,
    engine_version: "0.0.0", source_head: "1".repeat(40), capability_id: "sast-structural", execution_state: "EXECUTED",
    rule_id: "rule:eval-order", location: { path: "src/app.ts", start_line: 12, end_line: 18 },
    raw_evidence_ref: "raw:t11b", raw_evidence_digest: "a".repeat(64), coverage_state: "PARTIAL",
    scanned_scope: ["src/app.ts"], unscanned_scope: ["vendor"], unknown_states: ["PARSER_UNSUPPORTED"],
    limitations: ["export test"],
    provenance: { state: "COMPLETE", producer_id: "producer:sentrdel", producer_version: "0.0.0",
      collector_ref: "collector:t11b", rule_set_ref: "ruleset:v1" },
    effect_facts: "E0_READ_ONLY_ANALYSIS", network_facts: "NO_NETWORK", egress_facts: "NO_EGRESS",
    reproduction_ref: "repro:t11b", ...overrides,
  } as Parameters<typeof normalizeSentrdelEvidenceV1>[0]);
}

const sarif = (observations: unknown[]) => JSON.parse(exportSentrdelSarifV1(observations).sarif_text);

describe("UA-P06-T11B SARIF export boundary", () => {
  it("exports observations as review-only SARIF that carries Ascout non-truth semantics", () => {
    const obs = observation();
    const exported = exportSentrdelSarifV1([obs]);
    const log = JSON.parse(exported.sarif_text);
    expect(log.version).toBe("2.1.0");
    const [run] = log.runs;
    expect(run.properties).toMatchObject({ ascout_sarif_is_canonical_truth: false, ascout_coverage_total: false,
      ascout_empty_export_is_clean: false, ascout_assurance_effect: "NONE", ascout_source_head: "1".repeat(40) });
    const [res] = run.results;
    expect(res).toMatchObject({ ruleId: "rule:eval-order", kind: "review", level: "none" });
    expect(res.locations).toEqual([{ physicalLocation: { artifactLocation: { uri: "src/app.ts" }, region: { startLine: 12, endLine: 18 } } }]);
    expect(res.properties).toMatchObject({ ascout_observation_id: obs.observation_id, ascout_canonical_truth: false,
      ascout_finding: false, ascout_coverage_state: "PARTIAL", ascout_unknown_states: ["PARSER_UNSUPPORTED"] });
    expect(exported).toMatchObject({ result_count: 1, sarif_is_canonical_truth: false, assurance_effect: "NONE" });
    expect(exported.sarif_text).not.toMatch(/"(pass|fail|error|warning|PASS|CLEAN|VERIFIED)"/u);
  });

  it("round-trips through the T11A import as inference only", () => {
    const exported = exportSentrdelSarifV1([observation()]);
    const imported = importSentrdelSarifV1({ schema_version: 1, source_head: "1".repeat(40), request_id: "request:t11b",
      attempt_id: "attempt:1", producer_id: "producer:ascout", evidence_ref: "evidence:export",
      evidence_digest: exported.sarif_digest, sarif_text: exported.sarif_text });
    expect(imported.observations).toHaveLength(1);
    expect(imported.observations[0]).toMatchObject({ tool_name: "Ascout", rule_id: "rule:eval-order", reported_level: "none",
      epistemic_class: "INFERENCE", canonical_truth: false, severity_derived: false });
  });

  it("names unresolved rules and never invents a region", () => {
    const dependency = observation({ claim_class: "DEPENDENCY_OBSERVATION", rule_id: null, capability_id: "dependency-delta",
      location: { path: "package-lock.json", start_line: null, end_line: null },
      scanned_scope: ["package-lock.json"], unknown_states: ["REACHABILITY_NOT_COMPUTED"] });
    expect(dependency, "real T04 dependency observation").toBeTypeOf("object");
    const res = sarif([dependency]).runs[0].results[0];
    expect(res.ruleId).toBe("ascout.unresolved-rule.DEPENDENCY_OBSERVATION");
    expect(res.properties.ascout_rule_resolved).toBe(false);
    expect(res.locations).toEqual([{ physicalLocation: { artifactLocation: { uri: "package-lock.json" } } }]);
    expect(res.properties.ascout_unknown_states).toEqual(["REACHABILITY_NOT_COMPUTED"]);
    expect(res.properties.ascout_location_state).toBe("PARTIAL");
    const absent = sarif([observation({ location: null })]).runs[0].results[0];
    expect([absent.locations, absent.properties.ascout_location_state]).toEqual([[], "ABSENT"]);
  });

  it("is deterministic and independent of input order", () => {
    const a = observation();
    const b = observation({ rule_id: "rule:other", raw_evidence_digest: "b".repeat(64) });
    const first = exportSentrdelSarifV1([a, b]);
    expect(exportSentrdelSarifV1([b, a])).toEqual(first);
    expect(first.sarif_digest).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("refuses promoted, mixed, duplicate, empty, oversized, and secret-bearing input", () => {
    const obs = observation();
    const refuse = (input: unknown, name: string) => expect(() => exportSentrdelSarifV1(input), name).toThrow(TypeError);
    refuse([], "empty is NOT_RUN");
    refuse([obs, obs], "shared reference");
    refuse([obs, { ...obs }], "duplicate observation");
    refuse([obs, observation({ source_head: "2".repeat(40) })], "mixed source");
    refuse([obs, observation({ attempt_id: "attempt:2" })], "mixed attempt");
    refuse(new Array(4_097).fill(obs), "too many (checked before any entry is read)");
    refuse([undefined], "missing entry");
    for (const [key, value] of [["finding_emitted", true], ["global_clean_claimed", true], ["remediation_verified", true],
      ["assurance_effect", "PASS"], ["authority", "FINDING"], ["phase_authority", "UA-P06-T13"], ["engine_pin", "0".repeat(40)]] as const) {
      refuse([{ ...obs, [key]: value }], `promoted ${key}`);
    }
    refuse([{ ...obs, coverage: { ...obs.coverage, is_total: true } }], "total coverage");
    for (const path of ["/etc/passwd", "../x", "src//x", "src\\x", "src/x?y", "src/%2e%2e/x"]) {
      refuse([{ ...obs, location: { ...obs.location, path } }], `path ${path}`);
    }
    refuse([{ ...obs, location: { ...obs.location, start_line: 0 } }], "zero line");
    let getterCalls = 0;
    const accessor = { ...obs };
    Object.defineProperty(accessor, "rule_id", { enumerable: true, get: () => { getterCalls += 1; return "rule:x"; } });
    refuse([accessor], "accessor field");
    expect(getterCalls).toBe(0);
    refuse([{ ...obs, rule_id: "AKIA" + "Q".repeat(16) }], "secret rule id");
    refuse([{ ...obs, location: { ...obs.location, path: "AKIA" + "Q".repeat(16) } }], "secret path");
  });
});
