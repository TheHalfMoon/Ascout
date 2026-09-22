import { describe, expect, it } from "vitest";

import { createEngineDescriptorV1 } from "../src/assurance/contracts/engine-descriptor.js";
import { createEngineQualificationV1 } from "../src/assurance/contracts/engine-qualification.js";
import {
  assertEngineQualificationDecisionContextV1,
  createEngineQualificationSetV1,
  evaluateEngineQualificationV1,
  type EngineQualificationLookupRequestV1,
} from "../src/assurance/kernel/qualification.js";
import {
  createEngineRegistryV1,
  type EngineRegistryEntryV1,
} from "../src/assurance/kernel/registry.js";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const D = "d".repeat(64);
const E = "e".repeat(64);
const F = "f".repeat(64);

function registryEntry(
  version = "1.0.0",
  configurationSha = B,
): EngineRegistryEntryV1 {
  return {
    descriptor: createEngineDescriptorV1({
      engine_id: "engine:t05",
      engine_kind: "INTERNAL",
      implementation_identity: {
        implementation_id: "implementation:t05",
        source_identity: "source:ascout",
        version,
        artifact_sha256: D,
      },
      capabilities: ["capability:review"],
      supported_inputs: ["input:assurance-target"],
      supported_outputs: ["output:evidence"],
      effect_classes: ["E0_READ_ONLY_ANALYSIS"],
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
        provenance_ref: "provenance:ascout",
        admission_state: "ADMITTED",
      },
      qualification_evidence_refs: [],
      known_limitations: [],
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
    }),
    configuration_identity: {
      configuration_id: "configuration:t05",
      configuration_sha256: configurationSha,
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

function benchmarkCorpus(corpusSha = C) {
  return {
    benchmark_id: "benchmark:t05",
    corpus_id: "corpus:t05",
    corpus_sha256: corpusSha,
  };
}

function platform(platformId = "platform:linux-x64-node24", platformSha = E) {
  return {
    platform_id: platformId,
    platform_sha256: platformSha,
  };
}

function qualificationFor(entry: EngineRegistryEntryV1) {
  return createEngineQualificationV1({
    qualification_id: "qualification:t05",
    engine_id: entry.descriptor.engine_id,
    implementation_identity: entry.descriptor.implementation_identity,
    configuration_identity: entry.configuration_identity,
    profile_identities: ["profile:standard"],
    benchmark_corpus_identity: benchmarkCorpus(),
    platform_identity: platform(),
    evidence_refs: [
      {
        evidence_ref: "evidence:t05",
        provider_self_description: false,
      },
    ],
    result: "QUALIFIED",
    qualified_at_epoch_ms: 1_000,
    expires_at_epoch_ms: 2_000,
  });
}

function requestFor(
  entry: EngineRegistryEntryV1,
  options: {
    readonly profiles?: readonly string[];
    readonly benchmarkSha?: string;
    readonly platformId?: string;
    readonly platformSha?: string;
    readonly asOf?: number;
  } = {},
): EngineQualificationLookupRequestV1 {
  return {
    identity: identityFor(entry),
    profile_identities: options.profiles ?? ["profile:standard"],
    benchmark_corpus_identity: benchmarkCorpus(
      options.benchmarkSha ?? C,
    ),
    platform_identity: platform(
      options.platformId ?? "platform:linux-x64-node24",
      options.platformSha ?? E,
    ),
    as_of_epoch_ms: options.asOf ?? 1_500,
  };
}

describe("UA-P02-T05 Qualification lookup and invalidation", () => {
  it("reports QUALIFIED only for exact implementation, configuration, and platform bindings", () => {
    const entry = registryEntry();
    const registry = createEngineRegistryV1([entry]);
    const set = createEngineQualificationSetV1([qualificationFor(entry)]);

    const decision = evaluateEngineQualificationV1(
      registry,
      set,
      requestFor(entry),
    );

    expect(decision.result).toBe("QUALIFIED");
    expect(decision.reason_code).toBe("QUALIFICATION_SATISFIED");
    expect(decision.qualification_id).toBe("qualification:t05");
  });

  it("does not let a wrong version inherit qualification", () => {
    const entry = registryEntry();
    const registry = createEngineRegistryV1([entry]);
    const qualified = qualificationFor(registryEntry("9.9.9"));
    const set = createEngineQualificationSetV1([qualified]);

    const decision = evaluateEngineQualificationV1(
      registry,
      set,
      requestFor(entry),
    );

    expect(decision.result).toBe("NOT_QUALIFIED");
    expect(decision.reason_code).toBe("IMPLEMENTATION_DRIFT");
  });

  it("does not let a wrong configuration inherit qualification", () => {
    const entry = registryEntry();
    const registry = createEngineRegistryV1([entry]);
    const qualified = createEngineQualificationV1({
      ...qualificationFor(entry),
      configuration_identity: {
        configuration_id: "configuration:t05",
        configuration_sha256: F,
      },
    });
    const set = createEngineQualificationSetV1([qualified]);

    const decision = evaluateEngineQualificationV1(
      registry,
      set,
      requestFor(entry),
    );

    expect(decision.result).toBe("NOT_QUALIFIED");
    expect(decision.reason_code).toBe("CONFIGURATION_DRIFT");
  });

  it("does not let a wrong platform inherit required qualification", () => {
    const entry = registryEntry();
    const registry = createEngineRegistryV1([entry]);
    const set = createEngineQualificationSetV1([qualificationFor(entry)]);

    const decision = evaluateEngineQualificationV1(
      registry,
      set,
      requestFor(entry, {
        platformId: "platform:windows-x64-node24",
        platformSha: F,
      }),
    );

    expect(decision.result).toBe("NOT_QUALIFIED");
    expect(decision.reason_code).toBe("PLATFORM_DRIFT");
  });

  it("never promotes an engine without a qualification record to QUALIFIED", () => {
    const entry = registryEntry();
    const registry = createEngineRegistryV1([entry]);
    const other = registryEntry("1.0.0", B);
    const otherEntry = {
      descriptor: createEngineDescriptorV1({
        ...other.descriptor,
        engine_id: "engine:other",
      }),
      configuration_identity: other.configuration_identity,
    };
    const otherRegistry = createEngineRegistryV1([otherEntry]);
    const set = createEngineQualificationSetV1([qualificationFor(entry)]);

    const decision = evaluateEngineQualificationV1(
      otherRegistry,
      set,
      requestFor(otherEntry),
    );

    expect(decision.result).toBe("NOT_QUALIFIED");
    expect(decision.reason_code).toBe("NO_QUALIFICATION_RECORD");
    expect(decision.qualification_id).toBeNull();
  });

  it("invalidates on profile drift", () => {
    const entry = registryEntry();
    const registry = createEngineRegistryV1([entry]);
    const set = createEngineQualificationSetV1([qualificationFor(entry)]);

    const decision = evaluateEngineQualificationV1(
      registry,
      set,
      requestFor(entry, { profiles: ["profile:other"] }),
    );

    expect(decision.result).toBe("NOT_QUALIFIED");
    expect(decision.reason_code).toBe("PROFILE_DRIFT");
  });

  it("invalidates on benchmark corpus drift", () => {
    const entry = registryEntry();
    const registry = createEngineRegistryV1([entry]);
    const set = createEngineQualificationSetV1([qualificationFor(entry)]);

    const decision = evaluateEngineQualificationV1(
      registry,
      set,
      requestFor(entry, { benchmarkSha: F }),
    );

    expect(decision.result).toBe("NOT_QUALIFIED");
    expect(decision.reason_code).toBe("BENCHMARK_CORPUS_DRIFT");
  });

  it("does not apply a NOT_QUALIFIED result as qualified", () => {
    const entry = registryEntry();
    const registry = createEngineRegistryV1([entry]);
    const notQualified = createEngineQualificationV1({
      ...qualificationFor(entry),
      qualification_id: "qualification:t05-not",
      result: "NOT_QUALIFIED",
      evidence_refs: [],
    });
    const set = createEngineQualificationSetV1([notQualified]);

    const decision = evaluateEngineQualificationV1(
      registry,
      set,
      requestFor(entry),
    );

    expect(decision.result).toBe("NOT_QUALIFIED");
    expect(decision.reason_code).toBe("RESULT_NOT_QUALIFIED");
  });

  it("rejects expired and not-yet-applicable qualification windows", () => {
    const entry = registryEntry();
    const registry = createEngineRegistryV1([entry]);
    const set = createEngineQualificationSetV1([qualificationFor(entry)]);

    const expired = evaluateEngineQualificationV1(
      registry,
      set,
      requestFor(entry, { asOf: 2_000 }),
    );
    expect(expired.result).toBe("NOT_QUALIFIED");
    expect(expired.reason_code).toBe("EXPIRED");

    const early = evaluateEngineQualificationV1(
      registry,
      set,
      requestFor(entry, { asOf: 999 }),
    );
    expect(early.result).toBe("NOT_QUALIFIED");
    expect(early.reason_code).toBe("NOT_YET_APPLICABLE");
  });

  it("requires exact registered identity before qualification lookup", () => {
    const entry = registryEntry();
    const registry = createEngineRegistryV1([entry]);
    const set = createEngineQualificationSetV1([qualificationFor(entry)]);
    const base = requestFor(entry);

    expect(() =>
      evaluateEngineQualificationV1(registry, set, {
        ...base,
        identity: {
          ...base.identity,
          configuration_identity: {
            ...base.identity.configuration_identity,
            configuration_sha256: A,
          },
        },
      }),
    ).toThrow("engine qualification request identity is not registered");
  });

  it("rejects malformed and authority-like request fields", () => {
    const entry = registryEntry();
    const registry = createEngineRegistryV1([entry]);
    const set = createEngineQualificationSetV1([qualificationFor(entry)]);
    const base = requestFor(entry);

    expect(() =>
      evaluateEngineQualificationV1(registry, set, {
        ...base,
        execution_authority: true,
      } as unknown as EngineQualificationLookupRequestV1),
    ).toThrow(
      "engine qualification lookup request contains missing or unknown fields",
    );

    expect(() =>
      evaluateEngineQualificationV1(registry, set, {
        ...base,
        platform_identity: {
          ...base.platform_identity,
          platform_sha256: "not-a-digest",
        },
      }),
    ).toThrow("platform_identity.platform_sha256");

    expect(() =>
      evaluateEngineQualificationV1(registry, set, {
        ...base,
        as_of_epoch_ms: Number.NaN,
      }),
    ).toThrow("as_of_epoch_ms must be a non-negative safe integer epoch ms");
  });

  it("binds decisions to registry, qualification set, and lookup context", () => {
    const entry = registryEntry();
    const registry = createEngineRegistryV1([entry]);
    const set = createEngineQualificationSetV1([qualificationFor(entry)]);
    const baseRequest = requestFor(entry);
    const decision = evaluateEngineQualificationV1(
      registry,
      set,
      baseRequest,
    );

    expect(() =>
      assertEngineQualificationDecisionContextV1(
        registry,
        set,
        baseRequest,
        decision,
      ),
    ).not.toThrow();

    const changedRegistry = createEngineRegistryV1([registryEntry("2.0.0")]);
    expect(() =>
      assertEngineQualificationDecisionContextV1(
        changedRegistry,
        set,
        baseRequest,
        decision,
      ),
    ).toThrow("engine qualification request identity is not registered");

    const changedSet = createEngineQualificationSetV1([
      createEngineQualificationV1({
        ...qualificationFor(entry),
        qualification_id: "qualification:t05-changed",
      }),
    ]);
    expect(() =>
      assertEngineQualificationDecisionContextV1(
        registry,
        changedSet,
        baseRequest,
        decision,
      ),
    ).toThrow("engine qualification decision context mismatch");

    expect(() =>
      assertEngineQualificationDecisionContextV1(
        registry,
        set,
        requestFor(entry, { asOf: 1_501 }),
        decision,
      ),
    ).toThrow("engine qualification decision context mismatch");
  });

  it("rejects duplicate qualification identities deterministically", () => {
    const entry = registryEntry();
    const first = qualificationFor(entry);
    const second = createEngineQualificationV1({
      ...first,
      qualification_id: "qualification:t05-other",
      platform_identity: platform("platform:other", F),
    });

    expect(() =>
      createEngineQualificationSetV1([first, second]),
    ).not.toThrow();
    expect(() =>
      createEngineQualificationSetV1([first, first]),
    ).toThrow("duplicate qualification_id");
  });

  it("selects the applicable record deterministically across insertion orders", () => {
    const entry = registryEntry();
    const registry = createEngineRegistryV1([entry]);
    const first = qualificationFor(entry);
    const second = createEngineQualificationV1({
      ...first,
      qualification_id: "qualification:t05-second",
      platform_identity: platform("platform:other", F),
    });

    const left = evaluateEngineQualificationV1(
      registry,
      createEngineQualificationSetV1([first, second]),
      requestFor(entry),
    );
    const right = evaluateEngineQualificationV1(
      registry,
      createEngineQualificationSetV1([second, first]),
      requestFor(entry),
    );

    expect(left).toEqual(right);
    expect(left.result).toBe("QUALIFIED");
    expect(left.qualification_id).toBe("qualification:t05");
  });

  it("returns deeply frozen effect-free evidence rather than an execution grant", () => {
    const entry = registryEntry();
    const registry = createEngineRegistryV1([entry]);
    const set = createEngineQualificationSetV1([qualificationFor(entry)]);

    const decision = evaluateEngineQualificationV1(
      registry,
      set,
      requestFor(entry),
    );

    expect(Object.isFrozen(decision)).toBe(true);
    expect(Object.isFrozen(decision.identity)).toBe(true);
    expect(Object.isFrozen(decision.profile_identities)).toBe(true);
    expect(Object.isFrozen(decision.benchmark_corpus_identity)).toBe(true);
    expect(Object.isFrozen(decision.platform_identity)).toBe(true);

    expect("execution_authority" in decision).toBe(false);
    expect("network_authority" in decision).toBe(false);
    expect("process_authority" in decision).toBe(false);
    expect("credential_authority" in decision).toBe(false);
    expect("descriptor" in decision).toBe(false);
    expect("qualification" in decision).toBe(false);
  });
});
