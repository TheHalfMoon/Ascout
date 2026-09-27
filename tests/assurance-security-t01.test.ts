import { describe, expect, it } from "vitest";

import {
  assertSentrdelEngineBoundaryV1,
  createSentrdelEngineDescriptorV1,
  isSentrdelExternalOptionalEngineV1,
  requiresDaemonForCoreV1,
  requiresNetworkForCoreV1,
  requiresProviderForCoreV1,
  requiresRustToolchainForCoreV1,
  resolveSentrdelAbsenceV1,
  sarifImportIsCanonicalTruthV1,
  securityObservationIsFindingV1,
  securityPassIsSupportedClaimV1,
  SENTRDEL_CONFIGURATION_SURFACES,
  SENTRDEL_ENGINE_ID,
  SENTRDEL_OUTPUT_SURFACES,
  SENTRDEL_SELECTED_CAPABILITY_REFS,
  SENTRDEL_UNSUPPORTED_SCOPE,
} from "../src/assurance/security/sentrdel-engine-boundary.js";
import {
  buildSentrdelSourcePinV1,
  SENTRDEL_DEPENDENCY_LICENSE_STATUS,
  SENTRDEL_DONOR_LICENSE,
  SENTRDEL_DONOR_NOTICE_STATUS,
  SENTRDEL_LICENSE,
  SENTRDEL_LICENSE_BLOB_SHA,
  SENTRDEL_PINNED_REVISION,
  SENTRDEL_PINNED_TREE,
  SENTRDEL_PIN_REF,
  SENTRDEL_PIN_SUBJECT,
  SENTRDEL_REPOSITORY,
  SENTRDEL_RUST_TOOLCHAIN,
  SENTRDEL_SELECTED_PATH_LICENSE_STATUS,
  SENTRDEL_SELECTED_SOURCE_PATHS,
  validateSentrdelSourcePinV1,
} from "../src/assurance/security/sentrdel-source-pin.js";

describe("UA-P06-T01 Sentrdel re-pin", () => {
  it("preserves the exact live-verified Sentrdel pin", () => {
    expect(SENTRDEL_REPOSITORY).toBe("TheHalfMoon/Sentrdel");
    expect(SENTRDEL_PINNED_REVISION).toBe(
      "f5747319a50831ef7cee983d253c0ca5503c9a64",
    );
    expect(SENTRDEL_PINNED_TREE).toBe(
      "0d70de477fa403a416a8cff5576498e4c59a1689",
    );
    expect(SENTRDEL_PIN_SUBJECT).toBe(
      "Merge PR #333: make Sentrdel developer-first and adoption-ready",
    );
    expect(SENTRDEL_PIN_REF).toBe(
      "provenance:sentrdel-pin-f5747319a50831ef7cee983d253c0ca5503c9a64",
    );
    const pin = buildSentrdelSourcePinV1();
    expect(pin.revision).toBe(SENTRDEL_PINNED_REVISION);
    expect(pin.tree).toBe(SENTRDEL_PINNED_TREE);
    expect(pin.pin_ref).toBe(SENTRDEL_PIN_REF);
    expect(validateSentrdelSourcePinV1(pin).valid).toBe(true);
  });

  it("records license and notice state honestly", () => {
    const pin = buildSentrdelSourcePinV1();
    expect(pin.license).toBe(SENTRDEL_LICENSE);
    expect(SENTRDEL_LICENSE).toBe("Apache-2.0");
    expect(pin.license_blob_sha).toBe(SENTRDEL_LICENSE_BLOB_SHA);
    expect(pin.license_blob_sha).toBe(
      "45d3d38717ab6e5fd41a53a9b14184d0e93f1007",
    );
    expect(pin.root_notice).toBeNull();
    expect(pin.root_third_party_notices).toBeNull();
    expect(pin.donor_license).toBe(SENTRDEL_DONOR_LICENSE);
    expect(pin.donor_notice_status).toBe(SENTRDEL_DONOR_NOTICE_STATUS);
    expect(SENTRDEL_DONOR_NOTICE_STATUS).toBe("ABSENT_AT_PIN");
    expect(pin.selected_path_license_status).toBe(
      SENTRDEL_SELECTED_PATH_LICENSE_STATUS,
    );
    expect(pin.dependency_license_status).toBe(
      SENTRDEL_DEPENDENCY_LICENSE_STATUS,
    );
  });

  it("performs no wholesale donor import", () => {
    const pin = buildSentrdelSourcePinV1();
    expect(pin.integration_mode).toBe("REFERENCE_ONLY");
    expect(pin.status).toBe("CHARACTERIZED");
    expect(pin.npm_dependency_implication).toBe("NONE");
    expect(SENTRDEL_SELECTED_SOURCE_PATHS.length).toBeLessThanOrEqual(24);
    expect(pin.selected_source_paths).toContain("crates/sentrdel-schema");
    expect(pin.selected_source_paths).toContain("crates/sentrdel-engine");
    expect(pin.selected_source_paths).toContain("schemas/v1");
    expect(SENTRDEL_SELECTED_CAPABILITY_REFS.length).toBeLessThanOrEqual(24);
    expect(SENTRDEL_SELECTED_CAPABILITY_REFS).toContain(
      "crates/sentrdel-schema/src/evidence.rs",
    );
  });

  it("introduces no Rust toolchain requirement into core", () => {
    expect(requiresRustToolchainForCoreV1()).toBe(false);
    expect(buildSentrdelSourcePinV1().rust_toolchain).toBe(
      SENTRDEL_RUST_TOOLCHAIN,
    );
    expect(SENTRDEL_RUST_TOOLCHAIN).toBe("1.98.0");
    const boundary = assertSentrdelEngineBoundaryV1(
      createSentrdelEngineDescriptorV1(),
    );
    expect(boundary.ok).toBe(true);
  });

  it("introduces no network, provider, daemon, or sandbox requirement", () => {
    expect(requiresNetworkForCoreV1()).toBe(false);
    expect(requiresProviderForCoreV1()).toBe(false);
    expect(requiresDaemonForCoreV1()).toBe(false);
    const descriptor = createSentrdelEngineDescriptorV1();
    expect(descriptor.requirements.network_required).toBe(false);
    expect(descriptor.requirements.provider_requirements).toEqual([]);
    expect(descriptor.requirements.sandbox_required).toBe(false);
    expect(descriptor.requirements.process_required).toBe(false);
  });

  it("binds source provenance exactly", () => {
    const descriptor = createSentrdelEngineDescriptorV1();
    expect(descriptor.engine_id).toBe(SENTRDEL_ENGINE_ID);
    expect(descriptor.engine_kind).toBe("EXTERNAL");
    expect(descriptor.license_provenance_state.provenance_ref).toBe(
      SENTRDEL_PIN_REF,
    );
    expect(descriptor.license_provenance_state.license_identity).toBe(
      "license:apache-2.0",
    );
    expect(descriptor.license_provenance_state.admission_state).toBe(
      "CHARACTERIZED",
    );
    expect(descriptor.authority_ceiling).toBe("E0_READ_ONLY_ANALYSIS");
  });

  it("creates no stronger security claim", () => {
    expect(securityObservationIsFindingV1()).toBe(false);
    expect(securityPassIsSupportedClaimV1()).toBe(false);
    expect(sarifImportIsCanonicalTruthV1()).toBe(false);
    const descriptor = createSentrdelEngineDescriptorV1();
    expect(descriptor.capabilities).toEqual([
      "capability:security-observation",
    ]);
    expect(descriptor.supported_outputs).toEqual([
      "output:security-observation",
    ]);
  });

  it("keeps Sentrdel an external optional engine", () => {
    expect(isSentrdelExternalOptionalEngineV1()).toBe(true);
    const descriptor = createSentrdelEngineDescriptorV1();
    expect(descriptor.engine_kind).toBe("EXTERNAL");
    expect(
      assertSentrdelEngineBoundaryV1(descriptor).ok,
    ).toBe(true);
  });

  it("maps absence to NOT_RUN or INCOMPLETE, never PASS", () => {
    const absence = resolveSentrdelAbsenceV1(
      "sentrdel_unavailable",
      "Sentrdel engine is unavailable and no security ran.",
    );
    expect(absence.status).toBe("NOT_RUN");
    expect(absence.reason_code.length).toBeGreaterThan(0);
    expect(absence.reason_text.length).toBeGreaterThan(0);
    const fallback = resolveSentrdelAbsenceV1("", "");
    expect(fallback.status).toBe("NOT_RUN");
    expect(fallback.reason_code.length).toBeGreaterThan(0);
    expect(["NOT_RUN", "INCOMPLETE"]).toContain(absence.status);
    expect(absence.status).not.toBe("PASS" as never);
  });

  it("freezes expected binary, config, and output boundaries", () => {
    expect(SENTRDEL_CONFIGURATION_SURFACES).toContain(
      "schemas/v1/engine-manifest.schema.json",
    );
    expect(SENTRDEL_CONFIGURATION_SURFACES).toContain(
      "schemas/v1/policy-decision.schema.json",
    );
    expect(SENTRDEL_OUTPUT_SURFACES).toContain(
      "schemas/v1/evidence.schema.json",
    );
    expect(SENTRDEL_OUTPUT_SURFACES).toContain(
      "schemas/v1/coverage.schema.json",
    );
    const descriptor = createSentrdelEngineDescriptorV1();
    expect(descriptor.configuration_trust_boundary.trusted_configuration_sources).toEqual(
      ["config:sentrdel-pin-v1"],
    );
  });

  it("keeps unsupported scope explicit without implying P07 authority", () => {
    expect(SENTRDEL_UNSUPPORTED_SCOPE.length).toBeGreaterThan(0);
    expect(SENTRDEL_UNSUPPORTED_SCOPE).toContain(
      "credentialed live posture and runtime verification",
    );
    const pin = buildSentrdelSourcePinV1();
    expect(pin.freshness).toBe("UNCHANGED");
    expect(pin.output_schema_ids).toHaveLength(12);
  });

  it("rejects a mutated pin binding", () => {
    const pin = buildSentrdelSourcePinV1();
    const mutated = { ...pin, revision: "0".repeat(40) };
    expect(validateSentrdelSourcePinV1(mutated).valid).toBe(false);
    expect(
      validateSentrdelSourcePinV1(mutated).reasons.length,
    ).toBeGreaterThan(0);
  });
});
