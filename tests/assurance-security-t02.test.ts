import { describe, expect, it } from "vitest";

import {
  buildSentrdelCapabilitiesV1,
  canClaimGlobalCleanV1,
  getSentrdelCapabilityV1,
  promotesPassV1,
  requiresNetworkV1,
  requiresProcessExecutionV1,
  requiresRustExecutionV1,
  SENTRDEL_CAPABILITY_IDS,
  SENTRDEL_CAPABILITY_SCHEMA_VERSION,
  validateSentrdelCapabilitiesV1,
} from "../src/assurance/security/sentrdel-capability-characterization.js";
import {
  SENTRDEL_PINNED_REVISION,
  SENTRDEL_PINNED_TREE,
  SENTRDEL_PIN_REF,
} from "../src/assurance/security/sentrdel-source-pin.js";

describe("UA-P06-T02 Sentrdel capability characterization", () => {
  it("binds the exact donor pin on every capability", () => {
    const capabilities = buildSentrdelCapabilitiesV1();
    expect(SENTRDEL_CAPABILITY_SCHEMA_VERSION).toBe(1);
    expect(capabilities.length).toBe(SENTRDEL_CAPABILITY_IDS.length);
    for (const capability of capabilities) {
      expect(capability.revision).toBe(SENTRDEL_PINNED_REVISION);
      expect(capability.tree).toBe(SENTRDEL_PINNED_TREE);
      expect(capability.pin_ref).toBe(SENTRDEL_PIN_REF);
    }
    expect(validateSentrdelCapabilitiesV1(capabilities).valid).toBe(true);
  });

  it("orders capabilities deterministically without duplicates", () => {
    const first = buildSentrdelCapabilitiesV1().map((c) => c.id);
    const second = buildSentrdelCapabilitiesV1().map((c) => c.id);
    expect(first).toEqual(second);
    expect(first).toEqual([...first].sort());
    expect(new Set(first).size).toBe(first.length);
    expect(first).toContain("sast-structural");
    expect(first).toContain("secrets-changed");
    expect(first).toContain("sbom");
  });

  it("gives every capability explicit evidence semantics", () => {
    for (const capability of buildSentrdelCapabilitiesV1()) {
      expect(capability.evidence.kind).toBe("OBSERVATION_ONLY_NEVER_FINDING");
      expect(capability.evidence.source.length).toBeGreaterThan(0);
      expect(capability.evidence.provenance_requirement.length).toBeGreaterThan(
        0,
      );
      expect(capability.evidence.location_precision.length).toBeGreaterThan(0);
      expect(capability.evidence.rule_identity.length).toBeGreaterThan(0);
      expect(capability.evidence.reproduction_support.length).toBeGreaterThan(
        0,
      );
      expect(capability.evidence.raw_output_status.length).toBeGreaterThan(0);
    }
  });

  it("gives every capability explicit coverage semantics", () => {
    for (const capability of buildSentrdelCapabilitiesV1()) {
      expect(capability.coverage.scanned.length).toBeGreaterThan(0);
      expect(capability.coverage.unscanned.length).toBeGreaterThan(0);
      expect(capability.coverage.unscanned).not.toBe("CLEAN");
      expect(capability.coverage.unscanned).toMatch(
        /EXPLICIT|NEVER_CLEAN|GAP|NONE/,
      );
      expect(capability.coverage.supported_languages.length).toBeGreaterThan(
        0,
      );
      expect(capability.coverage.unsupported_languages.length).toBeGreaterThan(
        0,
      );
      expect(capability.coverage.advisory_freshness.length).toBeGreaterThan(0);
      expect(capability.coverage.reachability_state.length).toBeGreaterThan(0);
    }
  });

  it("keeps UNKNOWN representable on every capability", () => {
    for (const capability of buildSentrdelCapabilitiesV1()) {
      expect(capability.unknown_tokens.length).toBeGreaterThan(0);
    }
    const sast = getSentrdelCapabilityV1(
      buildSentrdelCapabilitiesV1(),
      "sast-structural",
    );
    expect(sast?.unknown_tokens).toContain("PARSER_UNSUPPORTED");
    const dep = getSentrdelCapabilityV1(
      buildSentrdelCapabilitiesV1(),
      "dependency-delta",
    );
    expect(dep?.unknown_tokens).toContain("REACHABILITY_NOT_COMPUTED");
  });

  it("keeps unsupported scope explicit, including SBOM and generic IaC gaps", () => {
    const sbom = getSentrdelCapabilityV1(
      buildSentrdelCapabilitiesV1(),
      "sbom",
    );
    expect(sbom?.status).toBe("NOT_CHARACTERIZED");
    expect(sbom?.unsupported_scope.length).toBeGreaterThan(0);
    const iac = getSentrdelCapabilityV1(
      buildSentrdelCapabilitiesV1(),
      "iac-generic",
    );
    expect(iac?.status).toBe("UNSUPPORTED");
    expect(iac?.supported_scope).toBe("None for generic IaC at this pin.");
  });

  it("never lets a capability claim global clean", () => {
    expect(canClaimGlobalCleanV1()).toBe(false);
    for (const capability of buildSentrdelCapabilitiesV1()) {
      expect(capability.absence).toBe("NOT_RUN_OR_INCOMPLETE_NEVER_PASS");
      expect(capability.produced_outputs).not.toMatch(/PASS/i);
    }
  });

  it("contains no PASS promotion", () => {
    expect(promotesPassV1()).toBe(false);
    for (const capability of buildSentrdelCapabilitiesV1()) {
      expect(capability.evidence.kind).not.toBe("FINDING");
      expect(capability.authority_ceiling).toBe("E0_READ_ONLY_ANALYSIS");
    }
  });

  it("rejects duplicate capability ids", () => {
    const capabilities = buildSentrdelCapabilitiesV1();
    const duplicated = [...capabilities, capabilities[0]!];
    expect(validateSentrdelCapabilitiesV1(duplicated).valid).toBe(false);
  });

  it("fails closed on malformed descriptors", () => {
    const capabilities = buildSentrdelCapabilitiesV1();
    const malformed = capabilities.map((capability) =>
      capability.id === "sast-structural"
        ? { ...capability, revision: "0".repeat(40) as typeof capability.revision }
        : capability,
    );
    expect(validateSentrdelCapabilitiesV1(malformed).valid).toBe(false);
    const unordered = [...capabilities].reverse();
    expect(validateSentrdelCapabilitiesV1(unordered).valid).toBe(false);
  });

  it("performs no network or process execution", () => {
    expect(requiresNetworkV1()).toBe(false);
    expect(requiresRustExecutionV1()).toBe(false);
    expect(requiresProcessExecutionV1()).toBe(false);
    for (const capability of buildSentrdelCapabilitiesV1()) {
      expect(capability.local_offline).toBe("LOCAL_OFFLINE_ONLY");
      expect(capability.external_effects).toBe("NONE_IN_T02");
    }
  });

  it("returns deterministic immutable records", () => {
    const first = buildSentrdelCapabilitiesV1();
    const second = buildSentrdelCapabilitiesV1();
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(Object.isFrozen(first)).toBe(true);
    for (const capability of first) {
      expect(Object.isFrozen(capability)).toBe(true);
    }
  });
});
