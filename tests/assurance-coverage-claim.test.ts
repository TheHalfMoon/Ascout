import { describe, expect, it } from "vitest";

import {
  FROZEN_MINIMUM_COVERAGE_DIMENSIONS,
  assertCoverageClaimResolvesV1,
  createCoverageClaimV1,
  getCoverageDimensionV1,
  isCoverageDimensionObservedV1,
  parseCoverageClaimV1,
  type CoverageDimensionV1,
} from "../src/assurance/contracts/coverage-claim.js";
import { createAssuranceTargetV1 } from "../src/assurance/contracts/target.js";
import type { SourceStateV1 } from "../src/receipt/model.js";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const HEAD = "b".repeat(40);
const BASE = "c".repeat(40);

function source(): SourceStateV1 {
  return {
    repository_id: "remote:" + A,
    repository_id_kind: "remote",
    portable: true,
    head_sha: HEAD,
    detached: false,
    shallow: false,
    tree_digest_version: 1,
    tree_digest: B,
    tracked_index_entry_count: 14,
    unstaged_changed_count: 0,
    included_untracked_count: 0,
  };
}

function target() {
  return createAssuranceTargetV1({
    target_id: "target:ua-p01-t10",
    source_start_identity: source(),
    base_revision: BASE,
    change_set_identity: "changeset:ua-p01-t10",
    worktree_generation: "generation:10",
    policy_snapshot_id: "policy:canonical-v1",
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P01-T10",
      acceptance_id: "acceptance:coverage-claim-v1",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
}

function dimension(
  dimensionId: string,
  state: CoverageDimensionV1["state"] = "UNKNOWN",
): CoverageDimensionV1 {
  if (state === "OBSERVED") {
    return {
      dimension_id: dimensionId,
      state,
      scope_refs: ["scope:" + dimensionId.toLowerCase()],
      evidence_refs: ["evidence:" + dimensionId.toLowerCase()],
      limitations: [],
    };
  }
  if (state === "PARTIAL") {
    return {
      dimension_id: dimensionId,
      state,
      scope_refs: ["scope:" + dimensionId.toLowerCase()],
      evidence_refs: ["evidence:" + dimensionId.toLowerCase()],
      limitations: ["Only part of the requested scope was observed."],
    };
  }
  return {
    dimension_id: dimensionId,
    state,
    scope_refs: [],
    evidence_refs: ["evidence:" + dimensionId.toLowerCase()],
    limitations: ["This dimension remains explicitly " + state + "."],
  };
}

function dimensions(): CoverageDimensionV1[] {
  return FROZEN_MINIMUM_COVERAGE_DIMENSIONS.map((dimensionId, index) =>
    dimension(
      dimensionId,
      index === 0
        ? "OBSERVED"
        : index === 1
          ? "PARTIAL"
          : index === 2
            ? "UNSUPPORTED"
            : index === 3
              ? "UNOBSERVED"
              : "UNKNOWN",
    ),
  );
}

function claimInput() {
  return {
    coverage_claim_id: "coverage:ua-p01-t10",
    target_id: "target:ua-p01-t10",
    run_ids: ["run:b", "run:a", "run:b"],
    dimensions: dimensions().reverse(),
  } as const;
}

function evidenceIds(): string[] {
  return dimensions().flatMap((entry) => entry.evidence_refs);
}

describe("UA-P01-T10 CoverageClaim", () => {
  it("requires every frozen minimum dimension and canonicalizes the claim", () => {
    const claim = createCoverageClaimV1(claimInput());

    expect(claim.schema_version).toBe(1);
    expect(claim.run_ids).toEqual(["run:a", "run:b"]);
    expect(claim.dimensions.map((entry) => entry.dimension_id)).toEqual(
      [...FROZEN_MINIMUM_COVERAGE_DIMENSIONS].sort(),
    );
    for (const dimensionId of FROZEN_MINIMUM_COVERAGE_DIMENSIONS) {
      expect(
        claim.dimensions.some((entry) => entry.dimension_id === dimensionId),
      ).toBe(true);
    }
  });

  it("round-trips strict persisted data", () => {
    const claim = createCoverageClaimV1(claimInput());
    expect(parseCoverageClaimV1(structuredClone(claim))).toEqual(claim);
  });

  it("rejects a missing frozen minimum dimension", () => {
    expect(() =>
      createCoverageClaimV1({
        ...claimInput(),
        dimensions: dimensions().slice(1),
      }),
    ).toThrow("coverage claim is missing frozen minimum dimensions");
  });

  it("rejects duplicate dimension identities", () => {
    const values = dimensions();
    expect(() =>
      createCoverageClaimV1({
        ...claimInput(),
        dimensions: [...values, values[0]],
      }),
    ).toThrow("dimensions must contain unique dimension_id values");
  });

  it("allows an additive future dimension without replacing minimum dimensions", () => {
    const claim = createCoverageClaimV1({
      ...claimInput(),
      dimensions: [
        ...dimensions(),
        dimension("FUTURE_EXPLICIT_DIMENSION", "UNKNOWN"),
      ],
    });

    expect(
      claim.dimensions.some(
        (entry) => entry.dimension_id === "FUTURE_EXPLICIT_DIMENSION",
      ),
    ).toBe(true);
  });

  it("keeps unknown, unsupported, and unobserved scope explicitly unobserved", () => {
    for (const state of ["UNKNOWN", "UNSUPPORTED", "UNOBSERVED"] as const) {
      expect(() =>
        createCoverageClaimV1({
          ...claimInput(),
          dimensions: dimensions().map((entry) =>
            entry.dimension_id === "LANGUAGES_ECOSYSTEMS"
              ? {
                  ...dimension("LANGUAGES_ECOSYSTEMS", state),
                  scope_refs: ["scope:fabricated-positive-observation"],
                }
              : entry,
          ),
        }),
      ).toThrow("cannot declare observed scope refs while state is " + state);
    }
  });

  it("requires explanations for unknown, unsupported, and unobserved dimensions", () => {
    expect(() =>
      createCoverageClaimV1({
        ...claimInput(),
        dimensions: dimensions().map((entry) =>
          entry.dimension_id === "LANGUAGES_ECOSYSTEMS"
            ? {
                ...dimension("LANGUAGES_ECOSYSTEMS", "UNKNOWN"),
                limitations: [],
              }
            : entry,
        ),
      }),
    ).toThrow("must explain UNKNOWN with at least one limitation");
  });

  it("requires observed and partial dimensions to carry scope and evidence", () => {
    expect(() =>
      createCoverageClaimV1({
        ...claimInput(),
        dimensions: dimensions().map((entry) =>
          entry.dimension_id === "CHANGED_FILES_SYMBOLS_REVIEWED"
            ? {
                ...dimension("CHANGED_FILES_SYMBOLS_REVIEWED", "OBSERVED"),
                evidence_refs: [],
              }
            : entry,
        ),
      }),
    ).toThrow("must declare at least one evidence ref for OBSERVED");

    expect(() =>
      createCoverageClaimV1({
        ...claimInput(),
        dimensions: dimensions().map((entry) =>
          entry.dimension_id === "LOGICAL_REVIEW_GROUPS"
            ? {
                ...dimension("LOGICAL_REVIEW_GROUPS", "PARTIAL"),
                scope_refs: [],
              }
            : entry,
        ),
      }),
    ).toThrow("must declare at least one observed scope ref for PARTIAL");
  });

  it("requires partial coverage to carry limitations", () => {
    expect(() =>
      createCoverageClaimV1({
        ...claimInput(),
        dimensions: dimensions().map((entry) =>
          entry.dimension_id === "LOGICAL_REVIEW_GROUPS"
            ? {
                ...dimension("LOGICAL_REVIEW_GROUPS", "PARTIAL"),
                limitations: [],
              }
            : entry,
        ),
      }),
    ).toThrow("PARTIAL coverage requires limitations");
  });

  it("rejects persisted non-canonical run ordering", () => {
    const claim = createCoverageClaimV1(claimInput());
    expect(() =>
      parseCoverageClaimV1({
        ...claim,
        run_ids: ["run:b", "run:a"],
      }),
    ).toThrow("run_ids must be unique and canonically sorted");
  });

  it("rejects persisted non-canonical dimension ordering", () => {
    const claim = createCoverageClaimV1(claimInput());
    expect(() =>
      parseCoverageClaimV1({
        ...claim,
        dimensions: [...claim.dimensions].reverse(),
      }),
    ).toThrow("dimensions must be canonically sorted by dimension_id");
  });

  it("rejects persisted non-canonical per-dimension refs and limitations", () => {
    const claim = createCoverageClaimV1(claimInput());
    const observed = getCoverageDimensionV1(
      claim,
      "CHANGED_FILES_SYMBOLS_REVIEWED",
    );
    const replacement = {
      ...observed,
      evidence_refs: ["evidence:z", "evidence:a"],
    };
    const altered = claim.dimensions
      .map((entry) =>
        entry.dimension_id === replacement.dimension_id ? replacement : entry,
      )
      .sort((a, b) => a.dimension_id.localeCompare(b.dimension_id));

    expect(() =>
      parseCoverageClaimV1({
        ...claim,
        dimensions: altered,
      }),
    ).toThrow("evidence_refs must be unique and canonically sorted");
  });

  it("binds exactly to the supplied target and available run/evidence sets", () => {
    const claim = createCoverageClaimV1(claimInput());

    expect(() =>
      assertCoverageClaimResolvesV1(claim, {
        target: target(),
        available_run_ids: ["run:b", "run:a"],
        available_evidence_ids: evidenceIds(),
      }),
    ).not.toThrow();
  });

  it("rejects cross-target coverage", () => {
    const claim = createCoverageClaimV1({
      ...claimInput(),
      target_id: "target:other",
    });

    expect(() =>
      assertCoverageClaimResolvesV1(claim, {
        target: target(),
        available_run_ids: ["run:a", "run:b"],
        available_evidence_ids: evidenceIds(),
      }),
    ).toThrow("coverage claim target_id does not match AssuranceTarget");
  });

  it("rejects dangling run lineage", () => {
    const claim = createCoverageClaimV1(claimInput());

    expect(() =>
      assertCoverageClaimResolvesV1(claim, {
        target: target(),
        available_run_ids: ["run:a"],
        available_evidence_ids: evidenceIds(),
      }),
    ).toThrow("coverage claim contains dangling run id: run:b");
  });

  it("rejects dangling evidence lineage", () => {
    const claim = createCoverageClaimV1(claimInput());

    expect(() =>
      assertCoverageClaimResolvesV1(claim, {
        target: target(),
        available_run_ids: ["run:a", "run:b"],
        available_evidence_ids: [],
      }),
    ).toThrow("contains dangling evidence ref");
  });

  it("does not expose an aggregate authority percentage", () => {
    const claim = createCoverageClaimV1(claimInput());

    expect("percentage" in claim).toBe(false);
    expect("aggregate_percentage" in claim).toBe(false);
    expect("coverage_score" in claim).toBe(false);
    expect("pass" in claim).toBe(false);
    expect("ready" in claim).toBe(false);
  });

  it("rejects unknown aggregate or authority fields", () => {
    const claim = createCoverageClaimV1(claimInput());

    expect(() =>
      parseCoverageClaimV1({
        ...claim,
        aggregate_percentage: 100,
      }),
    ).toThrow("coverage claim contains missing or unknown fields");

    expect(() =>
      parseCoverageClaimV1({
        ...claim,
        terminal_claim_authority: true,
      }),
    ).toThrow("coverage claim contains missing or unknown fields");
  });

  it("distinguishes observed from non-observed state without promoting partial", () => {
    expect(
      isCoverageDimensionObservedV1(
        dimension("CHANGED_FILES_SYMBOLS_REVIEWED", "OBSERVED"),
      ),
    ).toBe(true);
    expect(
      isCoverageDimensionObservedV1(
        dimension("LOGICAL_REVIEW_GROUPS", "PARTIAL"),
      ),
    ).toBe(false);
    expect(
      isCoverageDimensionObservedV1(
        dimension("LANGUAGES_ECOSYSTEMS", "UNKNOWN"),
      ),
    ).toBe(false);
  });

  it("rejects malformed dimension identifiers and multiline limitations", () => {
    expect(() =>
      createCoverageClaimV1({
        ...claimInput(),
        dimensions: [
          ...dimensions(),
          dimension("bad dimension", "UNKNOWN"),
        ],
      }),
    ).toThrow("must be a bounded uppercase dimension identifier");

    expect(() =>
      createCoverageClaimV1({
        ...claimInput(),
        dimensions: dimensions().map((entry) =>
          entry.dimension_id === "LANGUAGES_ECOSYSTEMS"
            ? {
                ...dimension("LANGUAGES_ECOSYSTEMS", "UNKNOWN"),
                limitations: ["line one\nline two"],
              }
            : entry,
        ),
      }),
    ).toThrow("must be bounded non-empty single-line text");
  });

  it("rejects raw path material in scope/evidence identities", () => {
    expect(() =>
      createCoverageClaimV1({
        ...claimInput(),
        dimensions: dimensions().map((entry) =>
          entry.dimension_id === "CHANGED_FILES_SYMBOLS_REVIEWED"
            ? {
                ...dimension("CHANGED_FILES_SYMBOLS_REVIEWED", "OBSERVED"),
                scope_refs: ["C:\\private\\file.ts"],
              }
            : entry,
        ),
      }),
    ).toThrow("scope_refs[0] must be a bounded opaque identifier");

    expect(() =>
      createCoverageClaimV1({
        ...claimInput(),
        dimensions: dimensions().map((entry) =>
          entry.dimension_id === "CHANGED_FILES_SYMBOLS_REVIEWED"
            ? {
                ...dimension("CHANGED_FILES_SYMBOLS_REVIEWED", "OBSERVED"),
                evidence_refs: ["/private/evidence"],
              }
            : entry,
        ),
      }),
    ).toThrow("evidence_refs[0] must be a bounded opaque identifier");
  });

  it("keeps every frozen dimension state explicit", () => {
    const claim = createCoverageClaimV1(claimInput());
    expect(claim.dimensions.every((entry) => typeof entry.state === "string")).toBe(
      true,
    );
    expect(claim.dimensions).toHaveLength(
      FROZEN_MINIMUM_COVERAGE_DIMENSIONS.length,
    );
    expect(A).toHaveLength(64);
    expect(C).toHaveLength(64);
  });
});
