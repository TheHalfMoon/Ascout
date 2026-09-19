import { describe, expect, it } from "vitest";

import {
  ASSURANCE_EFFECT_CLASSES,
  ASSURANCE_PROFILES,
  ASSURANCE_SCOPES,
  assertAssuranceIntentTargetV1,
  createAssuranceIntentV1,
  parseAssuranceIntentV1,
} from "../src/assurance/contracts/intent.js";
import { createAssuranceTargetV1 } from "../src/assurance/contracts/target.js";
import type { SourceStateV1 } from "../src/receipt/model.js";

function source(treeDigest = "c".repeat(64)): SourceStateV1 {
  return {
    repository_id: "remote:" + "a".repeat(64),
    repository_id_kind: "remote",
    portable: true,
    head_sha: "b".repeat(40),
    detached: false,
    shallow: false,
    tree_digest_version: 1,
    tree_digest: treeDigest,
    tracked_index_entry_count: 10,
    unstaged_changed_count: 1,
    included_untracked_count: 0,
  };
}

function target(treeDigest = "c".repeat(64)) {
  return createAssuranceTargetV1({
    target_id: "target:ua-p01-t02",
    source_start_identity: source(treeDigest),
    base_revision: "d".repeat(40),
    change_set_identity: "changeset:working-tree-v1",
    worktree_generation: "generation:8",
    policy_snapshot_id: "policy:canonical-v1",
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P01-T02",
      acceptance_id: "acceptance:assurance-intent-v1",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
}

function budget() {
  return {
    max_wall_time_ms: 300_000,
    max_concurrency: 2,
    max_engine_runs: 8,
    max_artifact_bytes: 16_000_000,
    max_network_requests: 0,
    max_network_egress_bytes: 0,
    max_model_tokens: 0,
    max_cost_microunits: 0,
  } as const;
}

function input() {
  return {
    intent_id: "intent:ua-p01-t02",
    requested_claim: "RELEASE_READY",
    profile: "RELEASE" as const,
    scope: "ASSURE" as const,
    include: ["check:security", "path:src/**", "check:security"],
    exclude: ["path:docs/**"],
    maximum_effect_class: "E0_READ_ONLY_ANALYSIS" as const,
    budget: budget(),
    target: target(),
    surface_provenance: {
      surface_kind: "TERMINAL" as const,
      surface_request_id: "request:42",
    },
  };
}
describe("UA-P01-T02 AssuranceIntent", () => {
  it("normalizes constructor constraints and preserves exact target", () => {
    const intent = createAssuranceIntentV1(input());

    expect(intent.schema_version).toBe(1);
    expect(intent.constraints.include).toEqual(["check:security", "path:src/**"]);
    expect(intent.constraints.exclude).toEqual(["path:docs/**"]);
    expect(intent.target).toEqual(target());
    expect(intent.maximum_effect_class).toBe("E0_READ_ONLY_ANALYSIS");
  });

  it("round-trips the strict persisted shape", () => {
    const intent = createAssuranceIntentV1(input());
    expect(parseAssuranceIntentV1(structuredClone(intent))).toEqual(intent);
  });

  it("rejects noncanonical persisted constraint ordering and duplicates", () => {
    const intent = createAssuranceIntentV1(input());

    expect(() =>
      parseAssuranceIntentV1({
        ...intent,
        constraints: {
          ...intent.constraints,
          include: ["path:src/**", "check:security"],
        },
      }),
    ).toThrow("constraints.include must be unique and canonically sorted");

    expect(() =>
      parseAssuranceIntentV1({
        ...intent,
        constraints: {
          ...intent.constraints,
          include: ["check:security", "check:security"],
        },
      }),
    ).toThrow("constraints.include must be unique and canonically sorted");
  });

  it("rejects include/exclude conflicts", () => {
    expect(() =>
      createAssuranceIntentV1({
        ...input(),
        include: ["path:src/**"],
        exclude: ["path:src/**"],
      }),
    ).toThrow("constraints include/exclude conflict");
  });

  it("rejects unsafe constraint selectors instead of persisting raw paths", () => {
    expect(() =>
      createAssuranceIntentV1({
        ...input(),
        include: ["/Users/alice/private/repo"],
      }),
    ).toThrow("invalid scope selector");

    expect(() =>
      createAssuranceIntentV1({
        ...input(),
        include: ["C:\\private\\repo"],
      }),
    ).toThrow("invalid scope selector");
  });
  it("rejects unknown profile values", () => {
    const intent = createAssuranceIntentV1(input());
    expect(() => parseAssuranceIntentV1({ ...intent, profile: "FASTEST" })).toThrow(
      "profile is invalid or unsupported",
    );
    expect(ASSURANCE_PROFILES).not.toContain("FASTEST");
  });

  it("rejects unknown product scopes", () => {
    const intent = createAssuranceIntentV1(input());
    expect(() => parseAssuranceIntentV1({ ...intent, scope: "DEPLOY" })).toThrow(
      "scope is invalid or unsupported",
    );
    expect(ASSURANCE_SCOPES).not.toContain("DEPLOY");
  });

  it("rejects unknown effect classes", () => {
    const intent = createAssuranceIntentV1(input());
    expect(() =>
      parseAssuranceIntentV1({ ...intent, maximum_effect_class: "E8_UNBOUNDED" }),
    ).toThrow("maximum_effect_class is invalid or unsupported");
    expect(ASSURANCE_EFFECT_CLASSES).not.toContain("E8_UNBOUNDED");
  });

  it("rejects malformed claim identifiers without fabricating a closed claim enum", () => {
    expect(() =>
      createAssuranceIntentV1({ ...input(), requested_claim: "release ready" }),
    ).toThrow("requested_claim must be an uppercase bounded claim identifier");

    expect(
      createAssuranceIntentV1({ ...input(), requested_claim: "CUSTOM_POLICY_CLAIM" })
        .requested_claim,
    ).toBe("CUSTOM_POLICY_CLAIM");
  });

  it("rejects invalid planning budgets", () => {
    expect(() =>
      createAssuranceIntentV1({
        ...input(),
        budget: { ...budget(), max_concurrency: 0 },
      }),
    ).toThrow("budget.max_concurrency");

    expect(() =>
      createAssuranceIntentV1({
        ...input(),
        budget: { ...budget(), max_network_requests: -1 },
      }),
    ).toThrow("budget.max_network_requests");

    expect(() =>
      createAssuranceIntentV1({
        ...input(),
        budget: { ...budget(), max_wall_time_ms: 1.5 },
      }),
    ).toThrow("budget.max_wall_time_ms");
  });

  it("rejects unknown surface provenance values", () => {
    const intent = createAssuranceIntentV1(input());
    expect(() =>
      parseAssuranceIntentV1({
        ...intent,
        surface_provenance: {
          ...intent.surface_provenance,
          surface_kind: "HIDDEN_FAST_PATH",
        },
      }),
    ).toThrow("surface_provenance.surface_kind is invalid or unsupported");
  });
  it("rejects authority-like fields rather than treating intent as a grant", () => {
    const intent = createAssuranceIntentV1({
      ...input(),
      maximum_effect_class: "E7_ACTIVE_SECURITY_VALIDATION",
      budget: {
        ...budget(),
        max_network_requests: 100,
        max_network_egress_bytes: 1_000_000,
      },
    });

    expect(intent.maximum_effect_class).toBe("E7_ACTIVE_SECURITY_VALIDATION");
    expect(intent.budget.max_network_requests).toBe(100);
    expect("network_authority" in intent).toBe(false);
    expect("write_authority" in intent).toBe(false);
    expect("credential_authority" in intent).toBe(false);

    expect(() =>
      parseAssuranceIntentV1({
        ...intent,
        network_authority: true,
      }),
    ).toThrow("assurance intent contains missing or unknown fields");
  });

  it("rejects malformed embedded targets", () => {
    const intent = createAssuranceIntentV1(input());
    const malformedTarget = {
      ...intent.target,
      head_revision: "f".repeat(40),
    };

    expect(() =>
      parseAssuranceIntentV1({ ...intent, target: malformedTarget }),
    ).toThrow("head_revision does not match source_start_identity");
  });

  it("binds the intent to one exact AssuranceTarget", () => {
    const intent = createAssuranceIntentV1(input());
    const differentTarget = target("f".repeat(64));

    expect(() => assertAssuranceIntentTargetV1(intent, differentTarget)).toThrow(
      "assurance target binding mismatch",
    );
    expect(() => assertAssuranceIntentTargetV1(intent, target())).not.toThrow();
  });

  it("rejects raw path material in surface provenance ids", () => {
    expect(() =>
      createAssuranceIntentV1({
        ...input(),
        surface_provenance: {
          surface_kind: "CI",
          surface_request_id: "/private/workspace/run",
        },
      }),
    ).toThrow("surface_provenance.surface_request_id");
  });

  it("rejects unknown nested budget and provenance fields", () => {
    const intent = createAssuranceIntentV1(input());

    expect(() =>
      parseAssuranceIntentV1({
        ...intent,
        budget: { ...intent.budget, allow_network: true },
      }),
    ).toThrow("budget contains missing or unknown fields");

    expect(() =>
      parseAssuranceIntentV1({
        ...intent,
        surface_provenance: {
          ...intent.surface_provenance,
          credential_ref: "secret:prod",
        },
      }),
    ).toThrow("surface_provenance contains missing or unknown fields");
  });
});
