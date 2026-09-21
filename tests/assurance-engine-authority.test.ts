import { describe, expect, it } from "vitest";

import {
  createEngineDescriptorV1,
  type EngineDescriptorInputV1,
} from "../src/assurance/contracts/engine-descriptor.js";
import type { AssuranceEffectClass } from "../src/assurance/contracts/intent.js";
import {
  evaluateEngineAuthorityCeilingV1,
  type EngineAuthorityRequestV1,
} from "../src/assurance/kernel/authority.js";
import {
  createEngineRegistryV1,
  type EngineRegistryEntryV1,
} from "../src/assurance/kernel/registry.js";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const D = "d".repeat(64);

function descriptorInput(
  effectClasses: readonly AssuranceEffectClass[],
  authorityCeiling: AssuranceEffectClass,
): EngineDescriptorInputV1 {
  return {
    engine_id: "engine:review",
    engine_kind: "INTERNAL",
    implementation_identity: {
      implementation_id: "implementation:review",
      source_identity: "source:canonical",
      version: "1.0.0",
      artifact_sha256: A,
    },
    capabilities: ["capability:review", "capability:test"],
    supported_inputs: ["input:assurance-target"],
    supported_outputs: ["output:evidence"],
    effect_classes: effectClasses,
    requirements: {
      process_required: false,
      network_required: false,
      provider_requirements: [],
      sandbox_required: false,
    },
    configuration_trust_boundary: {
      trusted_configuration_sources: ["config:canonical"],
      advisory_configuration_sources: [],
    },
    license_provenance_state: {
      license_identity: "license:apache-2.0",
      provenance_ref: "provenance:canonical",
      admission_state: "ADMITTED",
    },
    qualification_evidence_refs: [],
    known_limitations: [],
    authority_ceiling: authorityCeiling,
  };
}

function registryEntry(
  effectClasses: readonly AssuranceEffectClass[] = [
    "E0_READ_ONLY_ANALYSIS",
    "E1_LOCAL_DETERMINISTIC_PROCESS",
  ],
  authorityCeiling: AssuranceEffectClass = "E1_LOCAL_DETERMINISTIC_PROCESS",
): EngineRegistryEntryV1 {
  return {
    descriptor: createEngineDescriptorV1(
      descriptorInput(effectClasses, authorityCeiling),
    ),
    configuration_identity: {
      configuration_id: "configuration:review",
      configuration_sha256: B,
    },
  };
}

function identityFor(entry: EngineRegistryEntryV1) {
  return {
    engine_id: entry.descriptor.engine_id,
    implementation_identity: entry.descriptor.implementation_identity,
    configuration_identity: entry.configuration_identity,
  };
}

function requestFor(
  entry: EngineRegistryEntryV1,
  capabilities: readonly string[],
  effectClasses: readonly AssuranceEffectClass[],
): EngineAuthorityRequestV1 {
  return {
    identity: identityFor(entry),
    capabilities,
    effect_classes: effectClasses,
  };
}

describe("UA-P02-T03 Authority ceiling enforcement", () => {
  it("allows declared capability and effect authority within the descriptor ceiling", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineAuthorityCeilingV1(
      registry,
      requestFor(
        engine,
        ["capability:test", "capability:review"],
        ["E1_LOCAL_DETERMINISTIC_PROCESS", "E0_READ_ONLY_ANALYSIS"],
      ),
    );

    expect(decision).toEqual({
      schema_version: 1,
      identity: identityFor(engine),
      capabilities: ["capability:review", "capability:test"],
      effect_classes: [
        "E0_READ_ONLY_ANALYSIS",
        "E1_LOCAL_DETERMINISTIC_PROCESS",
      ],
      descriptor_authority_ceiling: "E1_LOCAL_DETERMINISTIC_PROCESS",
      result: "WITHIN_CEILING",
      reason_code: "DESCRIPTOR_AUTHORITY_SATISFIED",
    });
  });

  it("denies a capability that the canonical descriptor does not declare", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineAuthorityCeilingV1(
      registry,
      requestFor(
        engine,
        ["capability:security"],
        ["E0_READ_ONLY_ANALYSIS"],
      ),
    );

    expect(decision.result).toBe("DENIED");
    expect(decision.reason_code).toBe("CAPABILITY_NOT_DECLARED");
  });

  it("denies an effect class that the canonical descriptor does not declare", () => {
    const engine = registryEntry(
      ["E0_READ_ONLY_ANALYSIS", "E2_LOCAL_WRITE_ARTIFACT_ONLY"],
      "E2_LOCAL_WRITE_ARTIFACT_ONLY",
    );
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineAuthorityCeilingV1(
      registry,
      requestFor(
        engine,
        ["capability:review"],
        ["E1_LOCAL_DETERMINISTIC_PROCESS"],
      ),
    );

    expect(decision.result).toBe("DENIED");
    expect(decision.reason_code).toBe("EFFECT_NOT_DECLARED");
  });

  it("denies a declared technical effect above the descriptor authority ceiling", () => {
    const engine = registryEntry(
      ["E0_READ_ONLY_ANALYSIS", "E3_ISOLATED_LOCAL_EXECUTION"],
      "E1_LOCAL_DETERMINISTIC_PROCESS",
    );
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineAuthorityCeilingV1(
      registry,
      requestFor(
        engine,
        ["capability:review"],
        ["E3_ISOLATED_LOCAL_EXECUTION"],
      ),
    );

    expect(decision.result).toBe("DENIED");
    expect(decision.reason_code).toBe(
      "EFFECT_EXCEEDS_DESCRIPTOR_AUTHORITY_CEILING",
    );
    expect(decision.descriptor_authority_ceiling).toBe(
      "E1_LOCAL_DETERMINISTIC_PROCESS",
    );
  });

  it("allows a lower declared effect even when the descriptor advertises a higher technical effect", () => {
    const engine = registryEntry(
      ["E0_READ_ONLY_ANALYSIS", "E3_ISOLATED_LOCAL_EXECUTION"],
      "E1_LOCAL_DETERMINISTIC_PROCESS",
    );
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineAuthorityCeilingV1(
      registry,
      requestFor(
        engine,
        ["capability:review"],
        ["E0_READ_ONLY_ANALYSIS"],
      ),
    );

    expect(decision.result).toBe("WITHIN_CEILING");
    expect(decision.reason_code).toBe("DESCRIPTOR_AUTHORITY_SATISFIED");
  });

  it("requires exact registered engine, implementation, and configuration identity", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);

    expect(() =>
      evaluateEngineAuthorityCeilingV1(registry, {
        ...requestFor(
          engine,
          ["capability:review"],
          ["E0_READ_ONLY_ANALYSIS"],
        ),
        identity: {
          ...identityFor(engine),
          configuration_identity: {
            configuration_id: "configuration:review",
            configuration_sha256: C,
          },
        },
      }),
    ).toThrow("engine authority request identity is not registered");
  });

  it("canonicalizes requested capability and effect ordering deterministically", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);

    const left = evaluateEngineAuthorityCeilingV1(
      registry,
      requestFor(
        engine,
        ["capability:test", "capability:review", "capability:test"],
        ["E1_LOCAL_DETERMINISTIC_PROCESS", "E0_READ_ONLY_ANALYSIS"],
      ),
    );
    const right = evaluateEngineAuthorityCeilingV1(
      registry,
      requestFor(
        engine,
        ["capability:review", "capability:test"],
        ["E0_READ_ONLY_ANALYSIS", "E1_LOCAL_DETERMINISTIC_PROCESS"],
      ),
    );

    expect(left).toEqual(right);
  });

  it("rejects malformed capabilities, effects, and unknown authority-like fields", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);

    expect(() =>
      evaluateEngineAuthorityCeilingV1(registry, {
        ...requestFor(
          engine,
          ["capability:review"],
          ["E0_READ_ONLY_ANALYSIS"],
        ),
        capabilities: ["not allowed"],
      }),
    ).toThrow("capabilities[0] must be a bounded opaque identifier");

    expect(() =>
      evaluateEngineAuthorityCeilingV1(registry, {
        ...requestFor(
          engine,
          ["capability:review"],
          ["E0_READ_ONLY_ANALYSIS"],
        ),
        effect_classes: ["E99_UNKNOWN"],
      } as unknown as EngineAuthorityRequestV1),
    ).toThrow("effect_classes contains invalid effect class");

    expect(() =>
      evaluateEngineAuthorityCeilingV1(registry, {
        ...requestFor(
          engine,
          ["capability:review"],
          ["E0_READ_ONLY_ANALYSIS"],
        ),
        execution_authority: true,
      } as unknown as EngineAuthorityRequestV1),
    ).toThrow("engine authority request contains missing or unknown fields");
  });

  it("keeps T03 output effect-free and does not evaluate intent, policy, phase, or qualification", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineAuthorityCeilingV1(
      registry,
      requestFor(
        engine,
        ["capability:review"],
        ["E0_READ_ONLY_ANALYSIS"],
      ),
    );

    expect(Object.isFrozen(decision)).toBe(true);
    expect(Object.isFrozen(decision.identity)).toBe(true);
    expect(Object.isFrozen(decision.capabilities)).toBe(true);
    expect(Object.isFrozen(decision.effect_classes)).toBe(true);

    expect("execution_authority" in decision).toBe(false);
    expect("network_authority" in decision).toBe(false);
    expect("intent" in decision).toBe(false);
    expect("policy" in decision).toBe(false);
    expect("phase_authority" in decision).toBe(false);
    expect("qualification" in decision).toBe(false);
  });

  it("binds the returned identity to the canonical registry entry", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineAuthorityCeilingV1(
      registry,
      requestFor(
        engine,
        [],
        [],
      ),
    );

    expect(decision.identity).toEqual(identityFor(engine));
    expect(decision.identity.configuration_identity.configuration_sha256).toBe(
      B,
    );
    expect(decision.identity.implementation_identity.artifact_sha256).toBe(A);
    expect(decision.identity.implementation_identity.artifact_sha256).not.toBe(
      D,
    );
  });
});
