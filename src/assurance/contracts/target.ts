import { isDeepStrictEqual } from "node:util";

import type { EnvironmentV1, SourceStateV1 } from "../../receipt/model.js";

export const ASSURANCE_TARGET_SCHEMA_VERSION = 1 as const;

const FULL_GIT_OBJECT_ID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const REPOSITORY_ID = /^(remote|local):([a-f0-9]{64})$/u;
const NODE_RUNTIME_VERSION =
  /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;
const PACKAGE_MANAGER_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/u;
const PLATFORM_TOKEN = /^[A-Za-z0-9._-]{1,64}$/u;
const LOCKFILE_BY_MANAGER = {
  npm: "package-lock.json",
  pnpm: "pnpm-lock.yaml",
  yarn: "yarn.lock",
} as const;
const SAFE_RELATIVE_PATH =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.+\/[.]{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u;

export interface AssuranceRepositoryIdentityV1 {
  readonly repository_id: string;
  readonly repository_id_kind: "remote" | "local_only";
  readonly portable: boolean;
}

export interface AssuranceTreeIdentityV1 {
  readonly tree_digest_version: 1;
  readonly tree_digest: string;
  readonly tracked_index_entry_count: number;
  readonly unstaged_changed_count: number;
  readonly included_untracked_count: number;
}
export interface AssuranceAcceptanceIdentityV1 {
  readonly spec_id: string;
  readonly task_id: string;
  readonly acceptance_id: string;
}

export interface AssuranceTargetV1 {
  readonly schema_version: 1;
  readonly target_id: string;
  readonly repository_identity: AssuranceRepositoryIdentityV1;
  readonly source_start_identity: SourceStateV1;
  readonly head_revision: string;
  readonly base_revision: string | null;
  readonly tree_identity: AssuranceTreeIdentityV1;
  readonly change_set_identity: string;
  readonly worktree_generation: string | null;
  readonly policy_snapshot_id: string;
  readonly acceptance_identity: AssuranceAcceptanceIdentityV1 | null;
  readonly environment_identity: EnvironmentV1 | null;
  readonly graph_index_generation: string | null;
  readonly build_artifact_identity: string | null;
}

export interface AssuranceTargetInputV1 {
  readonly target_id: string;
  readonly source_start_identity: SourceStateV1;
  readonly base_revision: string | null;
  readonly change_set_identity: string;
  readonly worktree_generation: string | null;
  readonly policy_snapshot_id: string;
  readonly acceptance_identity: AssuranceAcceptanceIdentityV1 | null;
  readonly environment_identity: EnvironmentV1 | null;
  readonly graph_index_generation: string | null;
  readonly build_artifact_identity: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(field + " must be an object");
  return value;
}

function requireExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  field: string,
): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (!isDeepStrictEqual(actual, wanted)) {
    throw new TypeError(field + " contains missing or unknown fields");
  }
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(field + " must be boolean");
  return value;
}

function requireCount(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(field + " must be a non-negative safe integer");
  }
  return value as number;
}

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be a bounded opaque identifier");
  }
  return value;
}

function requireNullableOpaqueId(value: unknown, field: string): string | null {
  return value === null ? null : requireOpaqueId(value, field);
}

function requireGitObjectId(value: unknown, field: string): string {
  if (typeof value !== "string" || !FULL_GIT_OBJECT_ID.test(value)) {
    throw new TypeError(field + " must be a full lowercase Git object id");
  }
  return value;
}

function requireNullableGitObjectId(value: unknown, field: string): string | null {
  return value === null ? null : requireGitObjectId(value, field);
}
function parseRepositoryIdentity(value: unknown): AssuranceRepositoryIdentityV1 {
  const record = requireRecord(value, "repository_identity");
  requireExactKeys(
    record,
    ["repository_id", "repository_id_kind", "portable"],
    "repository_identity",
  );
  if (typeof record.repository_id !== "string" || !REPOSITORY_ID.test(record.repository_id)) {
    throw new TypeError("repository_identity.repository_id must be an opaque repository id");
  }
  const match = REPOSITORY_ID.exec(record.repository_id)!;
  const kind = record.repository_id_kind;
  const portable = requireBoolean(record.portable, "repository_identity.portable");
  if (match[1] === "remote") {
    if (kind !== "remote" || portable !== true) {
      throw new TypeError("remote repository identity kind/portability mismatch");
    }
    return { repository_id: record.repository_id, repository_id_kind: "remote", portable: true };
  }
  if (kind !== "local_only" || portable !== false) {
    throw new TypeError("local repository identity kind/portability mismatch");
  }
  return { repository_id: record.repository_id, repository_id_kind: "local_only", portable: false };
}

function parseTreeIdentity(value: unknown): AssuranceTreeIdentityV1 {
  const record = requireRecord(value, "tree_identity");
  requireExactKeys(record, [
    "tree_digest_version",
    "tree_digest",
    "tracked_index_entry_count",
    "unstaged_changed_count",
    "included_untracked_count",
  ], "tree_identity");
  if (record.tree_digest_version !== 1) {
    throw new TypeError("tree_identity.tree_digest_version must equal 1");
  }
  if (typeof record.tree_digest !== "string" || !SHA256_HEX.test(record.tree_digest)) {
    throw new TypeError("tree_identity.tree_digest must be lowercase sha256");
  }
  return {
    tree_digest_version: 1,
    tree_digest: record.tree_digest,
    tracked_index_entry_count: requireCount(
      record.tracked_index_entry_count,
      "tree_identity.tracked_index_entry_count",
    ),
    unstaged_changed_count: requireCount(
      record.unstaged_changed_count,
      "tree_identity.unstaged_changed_count",
    ),
    included_untracked_count: requireCount(
      record.included_untracked_count,
      "tree_identity.included_untracked_count",
    ),
  };
}

function parseSourceState(value: unknown): SourceStateV1 {
  const record = requireRecord(value, "source_start_identity");
  requireExactKeys(record, [
    "repository_id",
    "repository_id_kind",
    "portable",
    "head_sha",
    "detached",
    "shallow",
    "tree_digest_version",
    "tree_digest",
    "tracked_index_entry_count",
    "unstaged_changed_count",
    "included_untracked_count",
  ], "source_start_identity");

  const repository = parseRepositoryIdentity({
    repository_id: record.repository_id,
    repository_id_kind: record.repository_id_kind,
    portable: record.portable,
  });
  const tree = parseTreeIdentity({
    tree_digest_version: record.tree_digest_version,
    tree_digest: record.tree_digest,
    tracked_index_entry_count: record.tracked_index_entry_count,
    unstaged_changed_count: record.unstaged_changed_count,
    included_untracked_count: record.included_untracked_count,
  });

  return {
    ...repository,
    head_sha: requireGitObjectId(record.head_sha, "source_start_identity.head_sha"),
    detached: requireBoolean(record.detached, "source_start_identity.detached"),
    shallow: requireBoolean(record.shallow, "source_start_identity.shallow"),
    ...tree,
  };
}

function parseAcceptanceIdentity(value: unknown): AssuranceAcceptanceIdentityV1 | null {
  if (value === null) return null;
  const record = requireRecord(value, "acceptance_identity");
  requireExactKeys(record, ["spec_id", "task_id", "acceptance_id"], "acceptance_identity");
  return {
    spec_id: requireOpaqueId(record.spec_id, "acceptance_identity.spec_id"),
    task_id: requireOpaqueId(record.task_id, "acceptance_identity.task_id"),
    acceptance_id: requireOpaqueId(record.acceptance_id, "acceptance_identity.acceptance_id"),
  };
}

function parseEnvironmentIdentity(value: unknown): EnvironmentV1 | null {
  if (value === null) return null;
  const record = requireRecord(value, "environment_identity");
  requireExactKeys(record, [
    "runtime_name",
    "runtime_version",
    "platform",
    "architecture",
    "package_manager",
    "package_manager_version",
    "package_manager_source",
    "lockfile_path",
    "lockfile_sha256",
  ], "environment_identity");

  if (record.runtime_name !== "node") {
    throw new TypeError("environment_identity.runtime_name must equal node");
  }
  if (typeof record.runtime_version !== "string" || !NODE_RUNTIME_VERSION.test(record.runtime_version)) {
    throw new TypeError("environment_identity.runtime_version is invalid");
  }
  if (typeof record.platform !== "string" || !PLATFORM_TOKEN.test(record.platform)) {
    throw new TypeError("environment_identity.platform is invalid");
  }
  if (typeof record.architecture !== "string" || !PLATFORM_TOKEN.test(record.architecture)) {
    throw new TypeError("environment_identity.architecture is invalid");
  }
  const runtimeVersion = record.runtime_version;
  const platform = record.platform;
  const architecture = record.architecture;
  const manager = record.package_manager;
  if (manager !== null && manager !== "npm" && manager !== "pnpm" && manager !== "yarn") {
    throw new TypeError("environment_identity.package_manager is invalid");
  }
  const managerVersion =
    record.package_manager_version === null
      ? null
      : typeof record.package_manager_version === "string" &&
          PACKAGE_MANAGER_VERSION.test(record.package_manager_version)
        ? record.package_manager_version
        : null;
  if (record.package_manager_version !== null && managerVersion === null) {
    throw new TypeError("environment_identity.package_manager_version is invalid");
  }
  const managerSource = record.package_manager_source;
  if (managerSource !== "package_json" && managerSource !== "lockfile" && managerSource !== "unavailable") {
    throw new TypeError("environment_identity.package_manager_source is invalid");
  }
  const lockfilePath = record.lockfile_path;
  if (
    lockfilePath !== null &&
    (typeof lockfilePath !== "string" || !SAFE_RELATIVE_PATH.test(lockfilePath))
  ) {
    throw new TypeError("environment_identity.lockfile_path must be canonical relative path or null");
  }
  const lockfileSha =
    record.lockfile_sha256 === null
      ? null
      : typeof record.lockfile_sha256 === "string" && SHA256_HEX.test(record.lockfile_sha256)
        ? record.lockfile_sha256
        : null;
  if (record.lockfile_sha256 !== null && lockfileSha === null) {
    throw new TypeError("environment_identity.lockfile_sha256 must be lowercase sha256 or null");
  }

  if (managerSource === "unavailable") {
    if (
      manager !== null ||
      managerVersion !== null ||
      lockfilePath !== null ||
      lockfileSha !== null
    ) {
      throw new TypeError("environment_identity unavailable state is internally inconsistent");
    }
  } else {
    if (manager === null) {
      throw new TypeError("environment_identity resolved package manager is required");
    }
    const expectedLockfile = LOCKFILE_BY_MANAGER[manager];
    if (managerSource === "package_json") {
      if (managerVersion === null) {
        throw new TypeError("environment_identity package_json source requires manager version");
      }
      if ((lockfilePath === null) !== (lockfileSha === null)) {
        throw new TypeError("environment_identity lockfile path/digest must be present together");
      }
      if (lockfilePath !== null && lockfilePath !== expectedLockfile) {
        throw new TypeError("environment_identity lockfile path does not match package manager");
      }
    } else {
      if (managerVersion !== null) {
        throw new TypeError("environment_identity lockfile source forbids manager version");
      }
      if (lockfilePath !== expectedLockfile || lockfileSha === null) {
        throw new TypeError("environment_identity lockfile source requires exact lockfile identity");
      }
    }
  }

  return {
    runtime_name: "node",
    runtime_version: runtimeVersion,
    platform,
    architecture,
    package_manager: manager,
    package_manager_version: managerVersion,
    package_manager_source: managerSource,
    lockfile_path: lockfilePath,
    lockfile_sha256: lockfileSha,
  };
}

function repositoryIdentityFromSource(source: SourceStateV1): AssuranceRepositoryIdentityV1 {
  return {
    repository_id: source.repository_id,
    repository_id_kind: source.repository_id_kind,
    portable: source.portable,
  };
}

function treeIdentityFromSource(source: SourceStateV1): AssuranceTreeIdentityV1 {
  return {
    tree_digest_version: source.tree_digest_version,
    tree_digest: source.tree_digest,
    tracked_index_entry_count: source.tracked_index_entry_count,
    unstaged_changed_count: source.unstaged_changed_count,
    included_untracked_count: source.included_untracked_count,
  };
}

function requireSourceBindings(target: AssuranceTargetV1): void {
  const sourceRepository = repositoryIdentityFromSource(target.source_start_identity);
  if (!isDeepStrictEqual(target.repository_identity, sourceRepository)) {
    throw new TypeError("repository identity does not match source_start_identity");
  }
  if (target.head_revision !== target.source_start_identity.head_sha) {
    throw new TypeError("head_revision does not match source_start_identity");
  }
  const sourceTree = treeIdentityFromSource(target.source_start_identity);
  if (!isDeepStrictEqual(target.tree_identity, sourceTree)) {
    throw new TypeError("tree_identity does not match source_start_identity");
  }
}

export function parseAssuranceTargetV1(value: unknown): AssuranceTargetV1 {
  const record = requireRecord(value, "assurance target");
  requireExactKeys(record, [
    "schema_version",
    "target_id",
    "repository_identity",
    "source_start_identity",
    "head_revision",
    "base_revision",
    "tree_identity",
    "change_set_identity",
    "worktree_generation",
    "policy_snapshot_id",
    "acceptance_identity",
    "environment_identity",
    "graph_index_generation",
    "build_artifact_identity",
  ], "assurance target");
  if (record.schema_version !== ASSURANCE_TARGET_SCHEMA_VERSION) {
    throw new TypeError("assurance target schema_version must equal 1");
  }

  const target: AssuranceTargetV1 = {
    schema_version: ASSURANCE_TARGET_SCHEMA_VERSION,
    target_id: requireOpaqueId(record.target_id, "target_id"),
    repository_identity: parseRepositoryIdentity(record.repository_identity),
    source_start_identity: parseSourceState(record.source_start_identity),
    head_revision: requireGitObjectId(record.head_revision, "head_revision"),
    base_revision: requireNullableGitObjectId(record.base_revision, "base_revision"),
    tree_identity: parseTreeIdentity(record.tree_identity),
    change_set_identity: requireOpaqueId(record.change_set_identity, "change_set_identity"),
    worktree_generation: requireNullableOpaqueId(record.worktree_generation, "worktree_generation"),
    policy_snapshot_id: requireOpaqueId(record.policy_snapshot_id, "policy_snapshot_id"),
    acceptance_identity: parseAcceptanceIdentity(record.acceptance_identity),
    environment_identity: parseEnvironmentIdentity(record.environment_identity),
    graph_index_generation: requireNullableOpaqueId(
      record.graph_index_generation,
      "graph_index_generation",
    ),
    build_artifact_identity: requireNullableOpaqueId(
      record.build_artifact_identity,
      "build_artifact_identity",
    ),
  };
  requireSourceBindings(target);
  return target;
}

export function createAssuranceTargetV1(input: AssuranceTargetInputV1): AssuranceTargetV1 {
  const source = parseSourceState(input.source_start_identity);
  return parseAssuranceTargetV1({
    schema_version: ASSURANCE_TARGET_SCHEMA_VERSION,
    target_id: input.target_id,
    repository_identity: repositoryIdentityFromSource(source),
    source_start_identity: source,
    head_revision: source.head_sha,
    base_revision: input.base_revision,
    tree_identity: treeIdentityFromSource(source),
    change_set_identity: input.change_set_identity,
    worktree_generation: input.worktree_generation,
    policy_snapshot_id: input.policy_snapshot_id,
    acceptance_identity: input.acceptance_identity,
    environment_identity: input.environment_identity,
    graph_index_generation: input.graph_index_generation,
    build_artifact_identity: input.build_artifact_identity,
  });
}

export function assertSameAssuranceTargetV1(expected: unknown, actual: unknown): void {
  const expectedTarget = parseAssuranceTargetV1(expected);
  const actualTarget = parseAssuranceTargetV1(actual);
  if (!isDeepStrictEqual(expectedTarget, actualTarget)) {
    throw new TypeError("assurance target binding mismatch");
  }
}
