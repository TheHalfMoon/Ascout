import { describe, expect, it } from "vitest";

import {
  TEST_PROFILES,
  getTestProfilePolicyV1,
  listTestProfilePoliciesV1,
  predictTestProfileEffectsV1,
  projectTestProfilePlanFieldsV1,
  resolveTestProfileBudgetV1,
} from "../src/assurance/test/profile-policy.js";

describe("UA-P05-T01 test profile policy", () => {
  it("exposes exactly QUICK, STANDARD, DEEP, RELEASE in canonical order", () => {
    expect(TEST_PROFILES).toEqual(["QUICK", "STANDARD", "DEEP", "RELEASE"]);
    expect(listTestProfilePoliciesV1().map((p) => p.profile)).toEqual([
      "QUICK",
      "STANDARD",
      "DEEP",
      "RELEASE",
    ]);
  });

  it("binds every policy to TEST scope with adapter-first strategy", () => {
    for (const policy of listTestProfilePoliciesV1()) {
      expect(policy.schema_version).toBe(1);
      expect(policy.scope).toBe("TEST");
      expect(policy.adapter_strategy).toBe("adapter-first");
    }
  });

  it("keeps budgets visible and local-zero-cost with no network, model, or cost", () => {
    for (const profile of TEST_PROFILES) {
      const budget = resolveTestProfileBudgetV1(profile);
      expect(budget.max_concurrency).toBeGreaterThanOrEqual(1);
      expect(budget.max_engine_runs).toBeGreaterThanOrEqual(1);
      expect(budget.max_network_requests).toBe(0);
      expect(budget.max_network_egress_bytes).toBe(0);
      expect(budget.max_model_tokens).toBe(0);
      expect(budget.max_cost_microunits).toBe(0);
    }
  });

  it("uses progressive time, run, and artifact budgets", () => {
    const quick = resolveTestProfileBudgetV1("QUICK");
    const standard = resolveTestProfileBudgetV1("STANDARD");
    const deep = resolveTestProfileBudgetV1("DEEP");
    const release = resolveTestProfileBudgetV1("RELEASE");
    expect(quick.max_wall_time_ms).toBeLessThanOrEqual(
      standard.max_wall_time_ms ?? 0,
    );
    expect(standard.max_wall_time_ms).toBeLessThanOrEqual(
      deep.max_wall_time_ms ?? 0,
    );
    expect(deep.max_wall_time_ms).toBeLessThanOrEqual(
      release.max_wall_time_ms ?? 0,
    );
    expect(quick.max_engine_runs).toBeLessThanOrEqual(standard.max_engine_runs);
    expect(standard.max_engine_runs).toBeLessThanOrEqual(deep.max_engine_runs);
    expect(deep.max_engine_runs).toBeLessThanOrEqual(release.max_engine_runs);
  });

  it("predicts local-only effects with E4 reserved for DEEP and RELEASE", () => {
    expect(predictTestProfileEffectsV1("QUICK")).toEqual([
      "E0_READ_ONLY_ANALYSIS",
      "E1_LOCAL_DETERMINISTIC_PROCESS",
      "E2_LOCAL_WRITE_ARTIFACT_ONLY",
      "E3_ISOLATED_LOCAL_EXECUTION",
    ]);
    expect(predictTestProfileEffectsV1("STANDARD")).toEqual([
      "E0_READ_ONLY_ANALYSIS",
      "E1_LOCAL_DETERMINISTIC_PROCESS",
      "E2_LOCAL_WRITE_ARTIFACT_ONLY",
      "E3_ISOLATED_LOCAL_EXECUTION",
    ]);
    expect(predictTestProfileEffectsV1("DEEP")).toContain(
      "E4_BROWSER_OR_APP_INTERACTION",
    );
    expect(predictTestProfileEffectsV1("RELEASE")).toContain(
      "E4_BROWSER_OR_APP_INTERACTION",
    );
    for (const profile of TEST_PROFILES) {
      const effects = predictTestProfileEffectsV1(profile);
      expect(effects).not.toContain("E5_AUTHORIZED_NETWORK_READ");
      expect(effects).not.toContain("E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT");
      expect(effects).not.toContain("E7_ACTIVE_SECURITY_VALIDATION");
    }
  });

  it("projects budgets and predicted effects as plan-visible fields", () => {
    for (const profile of TEST_PROFILES) {
      const policy = getTestProfilePolicyV1(profile);
      expect(policy.plan_visible_fields).toEqual([
        "adapter_strategy",
        "budgets",
        "predicted_effect_classes",
        "profile",
        "scope",
      ]);
      const projection = projectTestProfilePlanFieldsV1(profile);
      expect(projection.profile).toBe(profile);
      expect(projection.scope).toBe("TEST");
      expect(projection.adapter_strategy).toBe("adapter-first");
      expect(projection.budgets).toEqual(resolveTestProfileBudgetV1(profile));
      expect(projection.predicted_effect_classes).toEqual(
        predictTestProfileEffectsV1(profile),
      );
    }
  });

  it("is deterministic and returns immutable budget copies", () => {
    const first = projectTestProfilePlanFieldsV1("STANDARD");
    const second = projectTestProfilePlanFieldsV1("STANDARD");
    expect(second).toEqual(first);
    expect(second.budgets).not.toBe(first.budgets);
    expect(second.budgets).toEqual(first.budgets);
  });

  it("rejects unknown profiles without implying omitted capability as pass", () => {
    expect(() => getTestProfilePolicyV1("UNKNOWN")).toThrow(TypeError);
    expect(() => resolveTestProfileBudgetV1("")).toThrow(TypeError);
    expect(() => predictTestProfileEffectsV1("LIVE")).toThrow(TypeError);
  });
});
