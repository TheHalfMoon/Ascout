import { describe, expect, it } from "vitest";
import {
  buildSentrdelT09InventoryV1,
  SENTRDEL_T09_MAX_OBSERVATIONS,
} from "../src/assurance/security/sentrdel-t09-inventory.js";
import { SENTRDEL_ENGINE_ID, SENTRDEL_ENGINE_VERSION } from "../src/assurance/security/sentrdel-engine-boundary.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "../src/assurance/security/sentrdel-source-pin.js";

const SHARED = {
  schema_version: 1,
  request_id: "request:test",
  attempt_id: "attempt:test",
  source_head: "a".repeat(40),
  engine_id: SENTRDEL_ENGINE_ID,
  engine_pin: SENTRDEL_PINNED_REVISION,
  engine_tree: SENTRDEL_PINNED_TREE,
  engine_version: SENTRDEL_ENGINE_VERSION,
};

function workflow(extra: Record<string, unknown> = {}) {
  return {
    ...SHARED, capability_id: "github-actions", execution_state: "EXECUTED",
    rule_id: "gha.pull-request-target",
    workflow_path: ".github/workflows/ci.yml",
    line: 12,
    producer_id: "producer:fixture", evidence_ref: "evidence:ci",
    evidence_digest: "b".repeat(64),
    coverage_state: "COMPLETE_WITHIN_STATED_SCOPE",
    unknown_tokens: [],
    effect_ceiling: "E0_READ_ONLY_ANALYSIS",
    network_policy: "NO_NETWORK", egress_policy: "NO_EGRESS", ...extra,
  };
}

function configuration(extra: Record<string, unknown> = {}) {
  return {
    ...SHARED, capability_id: "config-inspection",
    path: ".mcp.json", signal: "mcp-json",
    producer_id: "producer:fixture", evidence_ref: "evidence:mcp",
    evidence_digest: "c".repeat(64), ...extra,
  };
}

describe("UA-P06-T09C source/attempt-bound static inventory", () => {
  it("combines only same-source/same-attempt observations with no assurance promotion", () => {
    const result = buildSentrdelT09InventoryV1({
      workflows: [workflow()], configurations: [configuration()],
    });
    expect(result.phase_authority).toBe("UA-P06-T09");
    expect(result.source_head).toBe(SHARED.source_head);
    expect(result.engine_pin).toBe(SENTRDEL_PINNED_REVISION);
    expect(result.generic_iac.status).toBe("NOT_RUN");
    expect(result.generic_iac.clean_claimed).toBe(false);
    expect(result.workflow_observations).toHaveLength(1);
    expect(result.config_presence_observations).toHaveLength(1);
    expect(result.assurance_effect).toBe("NONE");
    expect(result.authority).toBe("STATIC_OBSERVATION_INVENTORY_ONLY");
    expect(result.executed_scanner_proven).toBe(false);
    expect(result.coverage_proven_complete).toBe(false);
    expect(result.repository_clean_claimed).toBe(false);
    expect(result.findings_emitted).toBe(false);
    expect(result.claim_assessment_emitted).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.workflow_observations)).toBe(true);
    expect(Object.isFrozen(result.config_presence_observations)).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/"PASS"|"SUPPORTED"/u);
  });

  it("sorts observation IDs and produces a stable order-independent inventory", () => {
    const workflows = [workflow({ line: 45 }), workflow({ line: 12 })];
    const configurations = [
      configuration({ path: ".cursor/mcp.json", signal: "cursor-mcp" }),
      configuration(),
    ];
    const a = buildSentrdelT09InventoryV1({ workflows, configurations });
    const b = buildSentrdelT09InventoryV1({
      workflows: [...workflows].reverse(), configurations: [...configurations].reverse(),
    });
    expect(a).toEqual(b);
    expect(a.inventory_id).toBe(b.inventory_id);
    expect(a.workflow_observations[0]?.observation_id).not.toBe(a.workflow_observations[1]?.observation_id);
    expect(a.config_presence_observations[0]?.identity).not.toBe(a.config_presence_observations[1]?.identity);
  });

  it("does not depend on localeCompare or host ICU collation for canonical IDs", () => {
    const values = {
      workflows: [workflow({ line: 45 }), workflow({ line: 12 })],
      configurations: [
        configuration({ path: ".cursor/mcp.json", signal: "cursor-mcp" }),
        configuration(),
      ],
    };
    const expected = buildSentrdelT09InventoryV1(values);
    const original = String.prototype.localeCompare;
    try {
      String.prototype.localeCompare = () => {
        throw new Error("locale-specific sorting is forbidden in evidence identity");
      };
      const got = buildSentrdelT09InventoryV1({
        workflows: [...values.workflows].reverse(),
        configurations: [...values.configurations].reverse(),
      });
      expect(got.inventory_id).toBe(expected.inventory_id);
      expect(got.workflow_observations.map(x => x.observation_id)).toEqual(
        expected.workflow_observations.map(x => x.observation_id),
      );
      expect(got.config_presence_observations.map(x => x.identity)).toEqual(
        expected.config_presence_observations.map(x => x.identity),
      );
    } finally {
      String.prototype.localeCompare = original;
    }
  });

  it("refuses cross-head and cross-attempt pooling for both record types", () => {
    for (const patch of [
      { source_head: "d".repeat(40) }, { request_id: "request:other" },
      { attempt_id: "attempt:other" },
    ]) {
      expect(() => buildSentrdelT09InventoryV1({
        workflows: [workflow()], configurations: [configuration(patch)],
      })).toThrow(/cross-source/);
      expect(() => buildSentrdelT09InventoryV1({
        workflows: [workflow(patch)], configurations: [configuration()],
      })).toThrow(/cross-source/);
    }
  });

  it("refuses duplicate observations rather than inflating coverage", () => {
    expect(() => buildSentrdelT09InventoryV1({
      workflows: [workflow(), workflow()], configurations: [],
    })).toThrow(/repeated evidence/);
    expect(() => buildSentrdelT09InventoryV1({
      workflows: [], configurations: [configuration(), configuration()],
    })).toThrow(/repeated evidence/);
  });

  it("refuses one evidence reference bound to conflicting digests", () => {
    const second = { rule_id: "gha.mutable-action-ref", line: 30 };
    expect(() => buildSentrdelT09InventoryV1({
      workflows: [workflow(), workflow({ ...second, evidence_digest: "d".repeat(64) })],
      configurations: [],
    })).toThrow(/conflicting digests/);
    expect(() => buildSentrdelT09InventoryV1({
      workflows: [workflow()],
      configurations: [configuration({ evidence_ref: "evidence:ci" })],
    })).toThrow(/conflicting digests/);
    // Sharing one artifact with the same digest is legitimate.
    const shared = buildSentrdelT09InventoryV1({
      workflows: [workflow(), workflow(second)],
      configurations: [configuration({ evidence_ref: "evidence:ci", evidence_digest: "b".repeat(64) })],
    });
    expect(shared.workflow_observations).toHaveLength(2);
    expect(shared.config_presence_observations).toHaveLength(1);
  });

  it("refuses unverifiable, malformed, empty, and excessive raw inputs", () => {
    const invalid: unknown[] = [
      null, "PASS", [], {}, { workflows: [], configurations: [] },
      { workflows: [], configurations: [], assessment: "PASS" },
      { workflows: "fake", configurations: [] },
      { workflows: [], configurations: 1 },
      { workflows: [workflow({ rule_id: "gha.fake" })], configurations: [] },
      { workflows: [], configurations: [configuration({ execution_state: "EXECUTED" })] },
      { workflows: [], configurations: [configuration({ source_head: "bad" })] },
      { workflows: [], configurations: [configuration({ path: "../secret" })] },
      { workflows: Array(SENTRDEL_T09_MAX_OBSERVATIONS + 1).fill(workflow()),
        configurations: [] },
    ];
    for (const value of invalid) {
      expect(() => buildSentrdelT09InventoryV1(value)).toThrow(TypeError);
    }
  });

  it("refuses accessor, hidden, symbol, and sparse input mutations", () => {
    let observed = 0;
    const getterRecord = { ...workflow() };
    Object.defineProperty(getterRecord, "workflow_path", {
      enumerable: true,
      get() {
        observed += 1;
        return observed < 4 ? ".github/workflows/ci.yml" : "../unsafe.yml";
      },
    });
    const hiddenRecord = { ...configuration() };
    Object.defineProperty(hiddenRecord, "verdict", { value: "PASS", enumerable: false });
    const symbolRecord = { ...configuration(), [Symbol("bypass")]: "PASS" };
    const sparseRecords = Array(1);
    const nestedAccessor = { ...workflow() };
    const unknownTokens: string[] = ["TIMEOUT"];
    Object.defineProperty(unknownTokens, "0", {
      enumerable: true, get: () => "TIMEOUT",
    });
    nestedAccessor.unknown_tokens = unknownTokens;
    for (const input of [
      { workflows: [getterRecord], configurations: [] },
      { workflows: [], configurations: [hiddenRecord] },
      { workflows: [], configurations: [symbolRecord] },
      { workflows: sparseRecords, configurations: [] },
      { workflows: [nestedAccessor], configurations: [] },
    ]) {
      expect(() => buildSentrdelT09InventoryV1(input)).toThrow(TypeError);
    }
    expect(observed).toBe(0);
  });

  it("accepts a single characterized surface without inferring the absent one was checked", () => {
    const a = buildSentrdelT09InventoryV1({ workflows: [workflow()], configurations: [] });
    const b = buildSentrdelT09InventoryV1({ workflows: [], configurations: [configuration()] });
    expect(a.workflow_observations).toHaveLength(1);
    expect(a.config_presence_observations).toHaveLength(0);
    expect(b.workflow_observations).toHaveLength(0);
    expect(b.config_presence_observations).toHaveLength(1);
    expect(a.coverage_proven_complete).toBe(false);
    expect(b.coverage_proven_complete).toBe(false);
    expect(a.generic_iac.status).toBe("NOT_RUN");
    expect(b.generic_iac.status).toBe("NOT_RUN");
  });
});
