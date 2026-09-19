import { describe, expect, it } from "vitest";

import {
  assurancePolicyDigestV1,
  createAssurancePolicySnapshotV1,
  parseAssurancePolicySnapshotV1,
  type AssurancePolicySnapshotInputV1,
} from "../src/assurance/contracts/policy.js";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);

function input(): AssurancePolicySnapshotInputV1 {
  return {
    policy_id: "policy:canonical-v1",
    policy_version: "2026.09.19",
    trusted_policy_sources: [
      {
        source_id: "trusted:user",
        source_kind: "TRUSTED_USER",
        content_sha256: B,
      },
      {
        source_id: "canonical:constitution",
        source_kind: "CANONICAL_REPOSITORY",
        content_sha256: A,
      },
    ],
    repository_advisory_policy_sources: [
      {
        source_id: "repository:ascout-config",
        source_kind: "REPOSITORY_ADVISORY",
        content_sha256: C,
      },
    ],
    minimum_mandatory_checks: [
      "security:minimum",
      "check:typecheck",
      "check:typecheck",
      "check:test",
    ],
    effect_ceilings: [
      { scope: "CYBER", maximum_effect_class: "E3_ISOLATED_LOCAL_EXECUTION" },
      { scope: "TEST", maximum_effect_class: "E1_LOCAL_DETERMINISTIC_PROCESS" },
      { scope: "ASSURE", maximum_effect_class: "E1_LOCAL_DETERMINISTIC_PROCESS" },
      { scope: "REALITY", maximum_effect_class: "E3_ISOLATED_LOCAL_EXECUTION" },
      { scope: "REVIEW", maximum_effect_class: "E0_READ_ONLY_ANALYSIS" },
      { scope: "SECURITY", maximum_effect_class: "E1_LOCAL_DETERMINISTIC_PROCESS" },
    ],
    engine_qualification_requirements: {
      require_exact_implementation_identity: true,
      require_exact_configuration_identity: true,
      require_platform_identity: true,
      minimum_qualification_refs: 1,
    },
    independence_requirements: {
      minimum_independent_engines: 1,
      acceptance_critical_requires_independence: true,
    },
    freshness_rules: {
      require_exact_target_match: true,
      invalidate_on_source_drift: true,
      invalidate_on_policy_drift: true,
      invalidate_on_engine_identity_drift: true,
      max_evidence_age_ms: 86_400_000,
    },
    risk_acceptance_rules: {
      allow_risk_acceptance: true,
      require_reason: true,
      require_expiry: true,
      require_actor_identity: true,
    },
    data_egress_rules: {
      source_egress: "DENY",
      artifact_egress: "EXPLICIT_POLICY_ONLY",
      credential_material_egress: "DENY",
    },
  };
}

describe("UA-P01-T03 AssurancePolicySnapshot", () => {
  it("constructs a canonical immutable policy snapshot", () => {
    const snapshot = createAssurancePolicySnapshotV1(input());

    expect(snapshot.schema_version).toBe(1);
    expect(snapshot.trusted_policy_sources.map((source) => source.source_id)).toEqual([
      "canonical:constitution",
      "trusted:user",
    ]);
    expect(snapshot.minimum_mandatory_checks).toEqual([
      "check:test",
      "check:typecheck",
      "security:minimum",
    ]);
    expect(snapshot.effect_ceilings.map((entry) => entry.scope)).toEqual([
      "REVIEW",
      "TEST",
      "SECURITY",
      "CYBER",
      "ASSURE",
      "REALITY",
    ]);
    expect(snapshot.policy_digest).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("round-trips strict persisted policy and verifies the digest", () => {
    const snapshot = createAssurancePolicySnapshotV1(input());
    expect(parseAssurancePolicySnapshotV1(structuredClone(snapshot))).toEqual(
      snapshot,
    );
    const { policy_digest: _digest, ...body } = snapshot;
    expect(assurancePolicyDigestV1(body)).toBe(snapshot.policy_digest);
  });
  it("produces the same digest for semantically identical unordered constructor input", () => {
    const first = createAssurancePolicySnapshotV1(input());
    const reordered = input();
    reordered.trusted_policy_sources = [
      reordered.trusted_policy_sources[1]!,
      reordered.trusted_policy_sources[0]!,
    ];
    reordered.minimum_mandatory_checks = [
      "check:test",
      "security:minimum",
      "check:typecheck",
    ];
    reordered.effect_ceilings = [...reordered.effect_ceilings].reverse();

    const second = createAssurancePolicySnapshotV1(reordered);
    expect(second).toEqual(first);
  });

  it("rejects a replaced policy digest", () => {
    const snapshot = createAssurancePolicySnapshotV1(input());
    expect(() =>
      parseAssurancePolicySnapshotV1({
        ...snapshot,
        policy_digest: "f".repeat(64),
      }),
    ).toThrow("policy_digest does not match canonical policy body");
  });

  it("keeps trusted and repository-advisory source classes explicit", () => {
    const snapshot = createAssurancePolicySnapshotV1(input());

    expect(
      snapshot.trusted_policy_sources.every(
        (source) => source.source_kind !== "REPOSITORY_ADVISORY",
      ),
    ).toBe(true);
    expect(
      snapshot.repository_advisory_policy_sources.every(
        (source) => source.source_kind === "REPOSITORY_ADVISORY",
      ),
    ).toBe(true);
  });

  it("rejects advisory policy records carrying effective rule payloads", () => {
    const snapshot = createAssurancePolicySnapshotV1(input());
    const advisory = {
      ...snapshot.repository_advisory_policy_sources[0]!,
      minimum_mandatory_checks: [],
    };

    expect(() =>
      parseAssurancePolicySnapshotV1({
        ...snapshot,
        repository_advisory_policy_sources: [advisory],
      }),
    ).toThrow(
      "repository_advisory_policy_source contains missing or unknown fields",
    );
  });

  it("rejects advisory source class in trusted policy sources", () => {
    const malformed = input();
    malformed.trusted_policy_sources = [
      {
        source_id: "repository:malicious",
        source_kind: "REPOSITORY_ADVISORY" as never,
        content_sha256: A,
      },
    ];

    expect(() => createAssurancePolicySnapshotV1(malformed)).toThrow(
      "trusted_policy_source.source_kind is invalid",
    );
  });
  it("requires at least one trusted policy source and canonical provenance", () => {
    expect(() =>
      createAssurancePolicySnapshotV1({
        ...input(),
        trusted_policy_sources: [],
      }),
    ).toThrow("trusted_policy_sources must not be empty");

    expect(() =>
      createAssurancePolicySnapshotV1({
        ...input(),
        trusted_policy_sources: [
          {
            source_id: "trusted:user-only",
            source_kind: "TRUSTED_USER",
            content_sha256: A,
          },
        ],
      }),
    ).toThrow(
      "trusted_policy_sources must include CANONICAL_REPOSITORY provenance",
    );
  });

  it("rejects duplicate or overlapping policy source identities", () => {
    const duplicate = input();
    duplicate.trusted_policy_sources = [
      duplicate.trusted_policy_sources[0]!,
      duplicate.trusted_policy_sources[0]!,
    ];
    expect(() => createAssurancePolicySnapshotV1(duplicate)).toThrow(
      "trusted_policy_sources contains duplicate source_id values",
    );

    const overlap = input();
    overlap.repository_advisory_policy_sources = [
      {
        source_id: "trusted:user",
        source_kind: "REPOSITORY_ADVISORY",
        content_sha256: C,
      },
    ];
    expect(() => createAssurancePolicySnapshotV1(overlap)).toThrow(
      "trusted and repository advisory policy source ids must be disjoint",
    );
  });

  it("requires canonical persisted mandatory checks", () => {
    const snapshot = createAssurancePolicySnapshotV1(input());
    expect(() =>
      parseAssurancePolicySnapshotV1({
        ...snapshot,
        minimum_mandatory_checks: ["security:minimum", "check:test"],
      }),
    ).toThrow(
      "minimum_mandatory_checks must be unique and canonically sorted",
    );
  });

  it("requires exactly one effect ceiling for every product scope", () => {
    const missing = input();
    missing.effect_ceilings = missing.effect_ceilings.slice(0, 5);
    expect(() => createAssurancePolicySnapshotV1(missing)).toThrow(
      "effect_ceilings must cover every assurance scope",
    );

    const duplicate = input();
    duplicate.effect_ceilings = [
      ...duplicate.effect_ceilings.slice(0, 5),
      { scope: "REVIEW", maximum_effect_class: "E0_READ_ONLY_ANALYSIS" },
    ];
    expect(() => createAssurancePolicySnapshotV1(duplicate)).toThrow(
      "effect_ceilings contains duplicate scope",
    );
  });

  it("rejects unknown effect ceilings", () => {
    const malformed = input();
    malformed.effect_ceilings = malformed.effect_ceilings.map((entry) =>
      entry.scope === "CYBER"
        ? {
            scope: "CYBER",
            maximum_effect_class: "E8_UNBOUNDED" as never,
          }
        : entry,
    );

    expect(() => createAssurancePolicySnapshotV1(malformed)).toThrow(
      "effect_ceiling.maximum_effect_class is invalid",
    );
  });
  it("rejects malformed qualification and independence requirements", () => {
    expect(() =>
      createAssurancePolicySnapshotV1({
        ...input(),
        engine_qualification_requirements: {
          ...input().engine_qualification_requirements,
          minimum_qualification_refs: -1,
        },
      }),
    ).toThrow("minimum_qualification_refs");

    expect(() =>
      createAssurancePolicySnapshotV1({
        ...input(),
        independence_requirements: {
          ...input().independence_requirements,
          minimum_independent_engines: -1,
        },
      }),
    ).toThrow("minimum_independent_engines");
  });

  it("rejects malformed freshness policy", () => {
    expect(() =>
      createAssurancePolicySnapshotV1({
        ...input(),
        freshness_rules: {
          ...input().freshness_rules,
          max_evidence_age_ms: 0,
        },
      }),
    ).toThrow("freshness_rules.max_evidence_age_ms");
  });

  it("keeps disabled risk acceptance fail-closed", () => {
    expect(() =>
      createAssurancePolicySnapshotV1({
        ...input(),
        risk_acceptance_rules: {
          allow_risk_acceptance: false,
          require_reason: false,
          require_expiry: true,
          require_actor_identity: true,
        },
      }),
    ).toThrow(
      "disabled risk acceptance must preserve reason/expiry/actor requirements",
    );
  });

  it("represents explicit-policy credential egress without granting authority", () => {
    const snapshot = createAssurancePolicySnapshotV1({
      ...input(),
      data_egress_rules: {
        ...input().data_egress_rules,
        credential_material_egress: "EXPLICIT_POLICY_ONLY",
      },
    });

    expect(snapshot.data_egress_rules.credential_material_egress).toBe(
      "EXPLICIT_POLICY_ONLY",
    );
    expect("credential_authority" in snapshot).toBe(false);

    expect(() =>
      createAssurancePolicySnapshotV1({
        ...input(),
        data_egress_rules: {
          ...input().data_egress_rules,
          credential_material_egress: "ALLOW_UNBOUNDED" as never,
        },
      }),
    ).toThrow("data_egress_rules.credential_material_egress is invalid");
  });

  it("rejects authority-like fields rather than treating policy as execution grant", () => {
    const snapshot = createAssurancePolicySnapshotV1(input());

    expect("network_authority" in snapshot).toBe(false);
    expect("write_authority" in snapshot).toBe(false);
    expect("credential_authority" in snapshot).toBe(false);

    expect(() =>
      parseAssurancePolicySnapshotV1({
        ...snapshot,
        execution_authority: true,
      }),
    ).toThrow(
      "assurance policy snapshot contains missing or unknown fields",
    );
  });
  it("rejects noncanonical persisted source ordering instead of repairing it", () => {
    const snapshot = createAssurancePolicySnapshotV1(input());
    expect(() =>
      parseAssurancePolicySnapshotV1({
        ...snapshot,
        trusted_policy_sources: [
          snapshot.trusted_policy_sources[1]!,
          snapshot.trusted_policy_sources[0]!,
        ],
      }),
    ).toThrow("trusted_policy_sources must be canonically sorted");
  });

  it("advisory provenance can change without changing effective rule fields", () => {
    const baseline = createAssurancePolicySnapshotV1(input());
    const changedInput = input();
    changedInput.repository_advisory_policy_sources = [
      {
        source_id: "repository:alternate-advice",
        source_kind: "REPOSITORY_ADVISORY",
        content_sha256: "d".repeat(64),
      },
    ];
    const changed = createAssurancePolicySnapshotV1(changedInput);

    expect(changed.minimum_mandatory_checks).toEqual(
      baseline.minimum_mandatory_checks,
    );
    expect(changed.effect_ceilings).toEqual(baseline.effect_ceilings);
    expect(changed.engine_qualification_requirements).toEqual(
      baseline.engine_qualification_requirements,
    );
    expect(changed.policy_digest).not.toBe(baseline.policy_digest);
  });
});
