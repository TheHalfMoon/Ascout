import { createHash } from "node:crypto";
import {
  closeSync,
  fstatSync,
  openSync,
  readSync,
  realpathSync,
  statSync,
} from "node:fs";
import type { BigIntStats } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

import type {
  DiscoveryFileMap,
  PackageManager,
  ProjectDiscovery,
} from "./discovery.js";
import type { EnvironmentV1 } from "./receipt/model.js";

const LOCKFILE_BY_MANAGER: Readonly<Record<PackageManager, string>> = {
  npm: "package-lock.json",
  pnpm: "pnpm-lock.yaml",
  yarn: "yarn.lock",
};
const PACKAGE_MANAGER_DECLARATION = /^(npm|pnpm|yarn)@([0-9]+\.[0-9]+\.[0-9]+)$/u;
const HASH_CHUNK_BYTES = 64 * 1024;

export type EnvironmentIdentityIntegrityReason =
  | "authority_contradiction"
  | "lockfile_containment_failed"
  | "lockfile_identity_unavailable"
  | "lockfile_identity_mismatch"
  | "lockfile_stability_failed"
  | "lockfile_read_failed";

export class EnvironmentIdentityIntegrityError extends Error {
  readonly code = "environment_identity_integrity_error";
  readonly reasonCode: EnvironmentIdentityIntegrityReason;
  readonly sourcePath: string | null;

  constructor(
    reasonCode: EnvironmentIdentityIntegrityReason,
    message: string,
    sourcePath: string | null = null,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "EnvironmentIdentityIntegrityError";
    this.reasonCode = reasonCode;
    this.sourcePath = sourcePath;
  }
}

interface FileObjectIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

function integrityError(
  reasonCode: EnvironmentIdentityIntegrityReason,
  message: string,
  sourcePath: string | null,
  cause?: unknown,
): EnvironmentIdentityIntegrityError {
  return new EnvironmentIdentityIntegrityError(reasonCode, message, sourcePath, cause);
}

function objectIdentity(stats: BigIntStats, sourcePath: string): FileObjectIdentity {
  if (stats.ino <= 0n) {
    throw integrityError(
      "lockfile_identity_unavailable",
      `lockfile object identity is unavailable for ${sourcePath}`,
      sourcePath,
    );
  }
  return { dev: stats.dev, ino: stats.ino };
}

function sameIdentity(left: FileObjectIdentity, right: FileObjectIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function requireRegularFile(stats: BigIntStats, sourcePath: string): void {
  if (!stats.isFile()) {
    throw integrityError(
      "lockfile_identity_mismatch",
      `authorized lockfile is not a regular file: ${sourcePath}`,
      sourcePath,
    );
  }
}

function requireDescriptorStability(
  before: BigIntStats,
  after: BigIntStats,
  sourcePath: string,
): void {
  const beforeIdentity = objectIdentity(before, sourcePath);
  const afterIdentity = objectIdentity(after, sourcePath);
  if (
    !sameIdentity(beforeIdentity, afterIdentity) ||
    before.isFile() !== after.isFile() ||
    before.size !== after.size ||
    before.mtimeNs !== after.mtimeNs ||
    before.ctimeNs !== after.ctimeNs
  ) {
    throw integrityError(
      "lockfile_stability_failed",
      `authorized lockfile changed while being hashed: ${sourcePath}`,
      sourcePath,
    );
  }
}

function requireContained(root: string, target: string, sourcePath: string): void {
  const rel = relative(root, target);
  if (rel === "") return;
  if (isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`)) {
    throw integrityError(
      "lockfile_containment_failed",
      `authorized lockfile resolves outside the repository: ${sourcePath}`,
      sourcePath,
    );
  }
}

function hashAuthorizedLockfile(root: string, sourcePath: string): string {
  let descriptor: number | null = null;
  let digest: string | undefined;
  let failure: unknown;

  try {
    const canonicalRoot = realpathSync(root);
    const authorizedPath = resolve(canonicalRoot, sourcePath);
    const preRealTarget = realpathSync(authorizedPath);
    requireContained(canonicalRoot, preRealTarget, sourcePath);

    const prePathStats = statSync(preRealTarget, { bigint: true });
    requireRegularFile(prePathStats, sourcePath);
    const prePathIdentity = objectIdentity(prePathStats, sourcePath);

    descriptor = openSync(authorizedPath, "r");
    const preDescriptorStats = fstatSync(descriptor, { bigint: true });
    requireRegularFile(preDescriptorStats, sourcePath);
    const preDescriptorIdentity = objectIdentity(preDescriptorStats, sourcePath);
    if (!sameIdentity(prePathIdentity, preDescriptorIdentity)) {
      throw integrityError(
        "lockfile_identity_mismatch",
        `authorized lockfile changed before descriptor binding: ${sourcePath}`,
        sourcePath,
      );
    }

    const hash = createHash("sha256");
    const buffer = Buffer.allocUnsafe(HASH_CHUNK_BYTES);
    for (;;) {
      const bytesRead = readSync(descriptor, buffer, 0, buffer.byteLength, null);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
    }

    const postDescriptorStats = fstatSync(descriptor, { bigint: true });
    requireDescriptorStability(preDescriptorStats, postDescriptorStats, sourcePath);

    const postRealTarget = realpathSync(authorizedPath);
    requireContained(canonicalRoot, postRealTarget, sourcePath);
    const postPathStats = statSync(postRealTarget, { bigint: true });
    requireRegularFile(postPathStats, sourcePath);
    const postPathIdentity = objectIdentity(postPathStats, sourcePath);
    if (!sameIdentity(preDescriptorIdentity, postPathIdentity)) {
      throw integrityError(
        "lockfile_identity_mismatch",
        `authorized lockfile path no longer identifies the hashed object: ${sourcePath}`,
        sourcePath,
      );
    }

    digest = hash.digest("hex");
  } catch (error) {
    failure = error;
  } finally {
    if (descriptor !== null) {
      try {
        closeSync(descriptor);
      } catch (error) {
        if (failure === undefined) failure = error;
      }
    }
  }

  if (failure !== undefined) {
    if (failure instanceof EnvironmentIdentityIntegrityError) throw failure;
    throw integrityError(
      "lockfile_read_failed",
      `failed to bind and hash authorized lockfile: ${sourcePath}`,
      sourcePath,
      failure,
    );
  }
  if (digest === undefined) {
    throw integrityError(
      "lockfile_read_failed",
      `failed to produce authorized lockfile digest: ${sourcePath}`,
      sourcePath,
    );
  }
  return digest;
}

function packageJsonManagerVersion(
  rawPackageJson: string | undefined,
  manager: PackageManager,
): string {
  if (rawPackageJson === undefined) {
    throw integrityError(
      "authority_contradiction",
      "package.json authority is missing from the discovery snapshot",
      "package.json",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPackageJson) as unknown;
  } catch (error) {
    throw integrityError(
      "authority_contradiction",
      "package.json authority is malformed in the discovery snapshot",
      "package.json",
      error,
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw integrityError(
      "authority_contradiction",
      "package.json authority must be an object in the discovery snapshot",
      "package.json",
    );
  }

  const declaration = (parsed as Record<string, unknown>).packageManager;
  if (typeof declaration !== "string") {
    throw integrityError(
      "authority_contradiction",
      "package.json authority is missing an exact packageManager declaration",
      "package.json",
    );
  }
  const match = PACKAGE_MANAGER_DECLARATION.exec(declaration);
  if (match === null || match[1] !== manager) {
    throw integrityError(
      "authority_contradiction",
      "package.json packageManager declaration contradicts discovery authority",
      "package.json",
    );
  }
  return match[2]!;
}

function baseEnvironment(): Pick<
  EnvironmentV1,
  "runtime_name" | "runtime_version" | "platform" | "architecture"
> {
  return {
    runtime_name: "node",
    runtime_version: process.versions.node,
    platform: process.platform,
    architecture: process.arch,
  };
}

export function observeEnvironment(
  root: string,
  files: DiscoveryFileMap,
  discovery: ProjectDiscovery,
): EnvironmentV1 {
  const runtime = baseEnvironment();
  const managerResolution = discovery.packageManager;
  if (managerResolution.state !== "resolved") {
    return {
      ...runtime,
      package_manager: null,
      package_manager_version: null,
      package_manager_source: "unavailable",
      lockfile_path: null,
      lockfile_sha256: null,
    };
  }

  const manager = managerResolution.value;
  const expectedLockfile = LOCKFILE_BY_MANAGER[manager];
  if (managerResolution.sourcePaths.length !== 1) {
    throw integrityError(
      "authority_contradiction",
      "resolved package-manager authority must have exactly one discovery source path",
      null,
    );
  }
  const authorityPath = managerResolution.sourcePaths[0]!;

  if (authorityPath === "package.json") {
    const version = packageJsonManagerVersion(files["package.json"], manager);
    let lockfilePath: string | null = null;
    let lockfileSha256: string | null = null;
    if (files[expectedLockfile] !== undefined) {
      try {
        lockfileSha256 = hashAuthorizedLockfile(root, expectedLockfile);
        lockfilePath = expectedLockfile;
      } catch {
        lockfilePath = null;
        lockfileSha256 = null;
      }
    }
    return {
      ...runtime,
      package_manager: manager,
      package_manager_version: version,
      package_manager_source: "package_json",
      lockfile_path: lockfilePath,
      lockfile_sha256: lockfileSha256,
    };
  }

  if (authorityPath !== expectedLockfile || files[authorityPath] === undefined) {
    throw integrityError(
      "authority_contradiction",
      `lockfile authority contradicts discovery manager: ${authorityPath}`,
      authorityPath,
    );
  }

  const lockfileSha256 = hashAuthorizedLockfile(root, authorityPath);
  return {
    ...runtime,
    package_manager: manager,
    package_manager_version: null,
    package_manager_source: "lockfile",
    lockfile_path: authorityPath,
    lockfile_sha256: lockfileSha256,
  };
}
