import { describe, expect, it } from "vitest";

import {
  assertSameAssuranceTargetV1,
  createAssuranceTargetV1,
  parseAssuranceTargetV1,
} from "../src/assurance/contracts/target.js";
import type { EnvironmentV1, SourceStateV1 } from "../src/receipt/model.js";

const REPOSITORY_ID = "remote:" + "a".repeat(64);
const HEAD = "b".repeat(40);
const TREE = "c".repeat(64);
const BASE = "d".repeat(40);

function source(overrides: Partial<SourceStateV1> = {}): SourceStateV1 {
  return {
    repository_id: REPOSITORY_ID,
    repository_id_kind: "remote",
    portable: true,
    head_sha: HEAD,
    detached: false,
    shallow: false,
    tree_digest_version: 1,
    tree_digest: TREE,
    tracked_index_entry_count: 12,
    unstaged_changed_count: 2,
    included_untracked_count: 1,
    ...overrides,
  };
}
function environment(): EnvironmentV1 {
  return {
    runtime_name: "node",
    runtime_version: "24.15.0",
    platform: "linux",
    architecture: "x64",
    package_manager: "npm",
    package_manager_version: "11.6.0",
    package_manager_source: "package_json",
    lockfile_path: "package-lock.json",
    lockfile_sha256: "e".repeat(64),
  };
}

function targetInput() {
  return {
    target_id: "target:ua-p01-t01",
    source_start_identity: source(),
    base_revision: BASE,
    change_set_identity: "changeset:working-tree-v1",
    worktree_generation: "generation:7",
    policy_snapshot_id: "policy:canonical-v1",
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P01-T01",
      acceptance_id: "acceptance:assurance-target-v1",
    },
    environment_identity: environment(),
    graph_index_generation: null,
    build_artifact_identity: null,
  } as const;
}

describe("UA-P01-T01 AssuranceTarget", () => {
  it("constructs one exact target from canonical source facts", () => {
    const target = createAssuranceTargetV1(targetInput());

    expect(target.schema_version).toBe(1);
    expect(target.repository_identity).toEqual({
      repository_id: REPOSITORY_ID,
      repository_id_kind: "remote",
      portable: true,
    });
    expect(target.source_start_identity).toEqual(source());
    expect(target.head_revision).toBe(HEAD);
    expect(target.tree_identity).toEqual({
      tree_digest_version: 1,
      tree_digest: TREE,
      tracked_index_entry_count: 12,
      unstaged_changed_count: 2,
      included_untracked_count: 1,
    });
  });

  it("round-trips the strict persisted shape without repairing identities", () => {
    const target = createAssuranceTargetV1(targetInput());
    expect(parseAssuranceTargetV1(structuredClone(target))).toEqual(target);
  });
  it("rejects repository identity mismatched from source_start_identity", () => {
    const target = createAssuranceTargetV1(targetInput());
    const malformed = structuredClone(target);
    malformed.repository_identity.repository_id = "remote:" + "f".repeat(64);

    expect(() => parseAssuranceTargetV1(malformed)).toThrow(
      "repository identity does not match source_start_identity",
    );
  });

  it("rejects head revision mismatched from source_start_identity", () => {
    const target = createAssuranceTargetV1(targetInput());
    const malformed = { ...target, head_revision: "f".repeat(40) };

    expect(() => parseAssuranceTargetV1(malformed)).toThrow(
      "head_revision does not match source_start_identity",
    );
  });

  it("rejects tree identity mismatched from source_start_identity", () => {
    const target = createAssuranceTargetV1(targetInput());
    const malformed = {
      ...target,
      tree_identity: { ...target.tree_identity, tree_digest: "f".repeat(64) },
    };

    expect(() => parseAssuranceTargetV1(malformed)).toThrow(
      "tree_identity does not match source_start_identity",
    );
  });

  it("rejects raw credential-bearing remote material in repository identity", () => {
    const target = createAssuranceTargetV1(targetInput());
    const malformed = {
      ...target,
      repository_identity: {
        repository_id: "https://alice:secret@example.com/org/repo.git",
        repository_id_kind: "remote",
        portable: true,
      },
    };

    expect(() => parseAssuranceTargetV1(malformed)).toThrow(
      "repository_identity.repository_id must be an opaque repository id",
    );
  });

  it("rejects raw absolute local repository paths in persisted identity fields", () => {
    const input = targetInput();

    expect(() =>
      createAssuranceTargetV1({ ...input, target_id: "/Users/alice/private/repo" }),
    ).toThrow("target_id must be a bounded opaque identifier");

    expect(() =>
      createAssuranceTargetV1({ ...input, change_set_identity: "C:\\private\\repo" }),
    ).toThrow("change_set_identity must be a bounded opaque identifier");
  });
  it("rejects unknown persistence fields instead of carrying raw location material", () => {
    const target = createAssuranceTargetV1(targetInput());
    const malformed = {
      ...target,
      raw_repository_path: "/Users/alice/private/repo",
    };

    expect(() => parseAssuranceTargetV1(malformed)).toThrow(
      "assurance target contains missing or unknown fields",
    );
  });

  it("rejects malformed source identity instead of guessing or normalizing it", () => {
    const input = targetInput();
    const malformedSource = {
      ...input.source_start_identity,
      repository_id: "git@example.com:org/repo.git",
    };

    expect(() =>
      createAssuranceTargetV1({
        ...input,
        source_start_identity: malformedSource as SourceStateV1,
      }),
    ).toThrow("repository_identity.repository_id must be an opaque repository id");
  });

  it("rejects abbreviated or uppercase Git object identities", () => {
    const target = createAssuranceTargetV1(targetInput());

    expect(() => parseAssuranceTargetV1({ ...target, head_revision: "abc123" })).toThrow(
      "head_revision must be a full lowercase Git object id",
    );
    expect(() => parseAssuranceTargetV1({ ...target, base_revision: "A".repeat(40) })).toThrow(
      "base_revision must be a full lowercase Git object id",
    );
  });

  it("rejects malformed source counts", () => {
    const input = targetInput();
    const malformedSource = {
      ...input.source_start_identity,
      included_untracked_count: -1,
    };

    expect(() =>
      createAssuranceTargetV1({
        ...input,
        source_start_identity: malformedSource as SourceStateV1,
      }),
    ).toThrow("included_untracked_count");
  });

  it("accepts explicit null identities only where the frozen contract makes them conditional", () => {
    const target = createAssuranceTargetV1({
      ...targetInput(),
      base_revision: null,
      worktree_generation: null,
      acceptance_identity: null,
      environment_identity: null,
      graph_index_generation: null,
      build_artifact_identity: null,
    });

    expect(target.base_revision).toBeNull();
    expect(target.worktree_generation).toBeNull();
    expect(target.acceptance_identity).toBeNull();
    expect(target.environment_identity).toBeNull();
  });

  it("rejects an absolute path smuggled through environment lockfile identity", () => {
    const input = targetInput();
    const malformedEnvironment = {
      ...environment(),
      lockfile_path: "/private/repo/package-lock.json",
    };

    expect(() =>
      createAssuranceTargetV1({
        ...input,
        environment_identity: malformedEnvironment,
      }),
    ).toThrow("environment_identity.lockfile_path");
  });

  it("rejects malformed runtime and platform identity fields", () => {
    const input = targetInput();

    expect(() =>
      createAssuranceTargetV1({
        ...input,
        environment_identity: { ...environment(), runtime_version: "latest" },
      }),
    ).toThrow("environment_identity.runtime_version is invalid");

    expect(() =>
      createAssuranceTargetV1({
        ...input,
        environment_identity: { ...environment(), platform: "darwin/arm64" },
      }),
    ).toThrow("environment_identity.platform is invalid");
  });

  it("rejects internally inconsistent unavailable package-manager state", () => {
    const input = targetInput();
    const malformedEnvironment = {
      ...environment(),
      package_manager_source: "unavailable" as const,
    };

    expect(() =>
      createAssuranceTargetV1({
        ...input,
        environment_identity: malformedEnvironment,
      }),
    ).toThrow("environment_identity unavailable state is internally inconsistent");
  });

  it("rejects package-json source without a manager version", () => {
    const input = targetInput();
    const malformedEnvironment = {
      ...environment(),
      package_manager_version: null,
    };

    expect(() =>
      createAssuranceTargetV1({
        ...input,
        environment_identity: malformedEnvironment,
      }),
    ).toThrow("environment_identity package_json source requires manager version");
  });

  it("rejects a lockfile identity that does not match the package manager", () => {
    const input = targetInput();
    const malformedEnvironment = {
      ...environment(),
      lockfile_path: "yarn.lock",
    };

    expect(() =>
      createAssuranceTargetV1({
        ...input,
        environment_identity: malformedEnvironment,
      }),
    ).toThrow("environment_identity lockfile path does not match package manager");
  });

  it("rejects lockfile-source state that carries a package-manager version", () => {
    const input = targetInput();
    const malformedEnvironment = {
      ...environment(),
      package_manager_source: "lockfile" as const,
    };

    expect(() =>
      createAssuranceTargetV1({
        ...input,
        environment_identity: malformedEnvironment,
      }),
    ).toThrow("environment_identity lockfile source forbids manager version");
  });

  it("rejects cross-target source binding even when target_id is reused", () => {
    const expected = createAssuranceTargetV1(targetInput());
    const actual = createAssuranceTargetV1({
      ...targetInput(),
      source_start_identity: source({
        tree_digest: "f".repeat(64),
        included_untracked_count: 0,
      }),
    });

    expect(() => assertSameAssuranceTargetV1(expected, actual)).toThrow(
      "assurance target binding mismatch",
    );
  });

  it("rejects cross-target policy/change-set binding", () => {
    const expected = createAssuranceTargetV1(targetInput());
    const actual = createAssuranceTargetV1({
      ...targetInput(),
      change_set_identity: "changeset:other",
      policy_snapshot_id: "policy:other",
    });

    expect(() => assertSameAssuranceTargetV1(expected, actual)).toThrow(
      "assurance target binding mismatch",
    );
  });

  it("accepts exact target binding", () => {
    const expected = createAssuranceTargetV1(targetInput());
    const actual = parseAssuranceTargetV1(structuredClone(expected));

    expect(() => assertSameAssuranceTargetV1(expected, actual)).not.toThrow();
  });
});
