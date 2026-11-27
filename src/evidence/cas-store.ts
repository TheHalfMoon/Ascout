import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { redactExactValues } from "../redact.js";

export const EVIDENCE_DIR_NAME = ".ascout";
export const CAS_OBJECTS_SUBDIR = "objects/sha256";
export const EVIDENCE_MANIFESTS_SUBDIR = "evidence";
export const CAS_MAX_OBJECT_BYTES = 16 * 1024 * 1024;

const SHA256_HEX = /^[0-9a-f]{64}$/u;
const HEX_SHARD = /^[0-9a-f]{2}$/u;

export const OPEN_RDONLY_NOFOLLOW_FLAGS = [
  constants.O_RDONLY,
  constants.O_NOFOLLOW,
  constants.O_NONBLOCK,
]
  .filter(Number.isInteger)
  .reduce((flags, bit) => flags | bit, 0);

export const OPEN_WRONLY_EXCL_NOFOLLOW_FLAGS = [
  constants.O_WRONLY,
  constants.O_CREAT,
  constants.O_EXCL,
  constants.O_NOFOLLOW,
]
  .filter(Number.isInteger)
  .reduce((flags, bit) => flags | bit, 0);

export interface CasPutResultV1 {
  readonly sha256: string;
  readonly byte_length: number;
  readonly already_present: boolean;
}

export type CasReadResultV1 =
  | { readonly ok: true; readonly sha256: string; readonly bytes: Buffer; readonly byte_length: number }
  | {
      readonly ok: false;
      readonly sha256: string;
      readonly reason: "invalid_digest" | "missing" | "unsafe_file" | "corrupt";
      readonly actual_sha256: string | null;
    };

export type BoundedFileReadV1 =
  | { readonly kind: "ok"; readonly bytes: Buffer }
  | { readonly kind: "missing" }
  | { readonly kind: "unsafe" };

export function sha256HexV1(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function isValidSha256HexV1(value: string): boolean {
  return SHA256_HEX.test(value);
}

export function casObjectsRootV1(repoRoot: string): string {
  return join(resolve(repoRoot), EVIDENCE_DIR_NAME, "objects", "sha256");
}

export function casObjectPathV1(repoRoot: string, sha256: string): string {
  if (!isValidSha256HexV1(sha256)) {
    throw new TypeError(`Invalid SHA-256 digest: ${JSON.stringify(sha256)}`);
  }
  return join(casObjectsRootV1(repoRoot), sha256.slice(0, 2), sha256);
}

/**
 * Verifies every existing directory component under `repoRoot` along `segments` is a physical
 * non-symlink directory contained inside `repoRoot`, optionally creating missing directories.
 */
export function ensureContainedPhysicalDirV1(
  repoRoot: string,
  segments: readonly string[],
  createMissing: boolean,
): string | null {
  const realRoot = realpathSync.native(resolve(repoRoot));
  let current = realRoot;
  for (const segment of segments) {
    const next = join(current, segment);
    const stat = lstatSync(next, { bigint: true, throwIfNoEntry: false });
    if (stat === undefined) {
      if (!createMissing) return null;
      mkdirSync(next, { mode: 0o700 });
    } else if (!stat.isDirectory()) {
      throw new Error(`Unsafe non-directory or symlink at ${next}`);
    }
    current = next;
  }
  return current;
}

export function isConsistentRegularDescriptorV1(check: {
  readonly before: { readonly dev: bigint; readonly ino: bigint };
  readonly opened: { isFile(): boolean; readonly dev: bigint; readonly ino: bigint; readonly nlink: bigint; readonly size: bigint };
  readonly maxBytes: number;
}): boolean {
  return (
    check.opened.isFile() &&
    check.opened.nlink === 1n &&
    check.opened.dev === check.before.dev &&
    check.opened.ino === check.before.ino &&
    check.opened.size <= BigInt(check.maxBytes)
  );
}

/**
 * Safely reads a single-link regular file up to `maxBytes` via bounded `readSync`, checking
 * `lstatSync` + `fstatSync` physical `(dev, ino)` identity so leaf symlinks are rejected on both
 * POSIX (`O_NOFOLLOW`) and Windows (where `O_NOFOLLOW` is absent).
 */
export function readBoundedRegularFileV1(
  filePath: string,
  maxBytes: number,
  ops: {
    readonly open?: typeof openSync;
    readonly readBytes?: (fd: number, limit: number) => Buffer | null;
    readonly verifyOpened?: typeof isConsistentRegularDescriptorV1;
  } = {},
): BoundedFileReadV1 {
  const before = lstatSync(filePath, { bigint: true, throwIfNoEntry: false });
  if (before === undefined) return { kind: "missing" };
  if (!before.isFile() || before.nlink !== 1n || before.size > BigInt(maxBytes)) {
    return { kind: "unsafe" };
  }
  const openFn = ops.open ?? openSync;
  const readBytesFn = ops.readBytes ?? readBoundedFdV1;
  const verifyOpened = ops.verifyOpened ?? isConsistentRegularDescriptorV1;
  let fd: number;
  try {
    fd = openFn(filePath, OPEN_RDONLY_NOFOLLOW_FLAGS);
  } catch {
    return { kind: "unsafe" };
  }
  try {
    const opened = fstatSync(fd, { bigint: true });
    if (!verifyOpened({ before, opened, maxBytes })) {
      return { kind: "unsafe" };
    }
    const bytes = readBytesFn(fd, maxBytes);
    return bytes === null ? { kind: "unsafe" } : { kind: "ok", bytes };
  } finally {
    closeSync(fd);
  }
}

const READ_CHUNK_BYTES = 64 * 1024;

export function readBoundedFdV1(fd: number, maxBytes: number): Buffer | null {
  const chunks: Buffer[] = [];
  const scratch = Buffer.allocUnsafe(READ_CHUNK_BYTES);
  let total = 0;
  for (;;) {
    const toRead = Math.min(scratch.length, maxBytes + 1 - total);
    const bytesRead = readSync(fd, scratch, 0, toRead, total);
    if (bytesRead === 0) break;
    total += bytesRead;
    if (total > maxBytes) return null;
    chunks.push(Buffer.from(scratch.subarray(0, bytesRead)));
  }
  const out = Buffer.allocUnsafeSlow(total);
  let offset = 0;
  for (const chunk of chunks) {
    chunk.copy(out, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * Atomically writes `content` to `destination` via an `O_EXCL | O_NOFOLLOW` `0o600` temp file +
 * `fsyncSync` + `renameSync`, refusing to overwrite any symlink, directory, FIFO, or socket.
 */
export function writeAtomicSafeRegularFileV1(destination: string, content: string): void {
  const resolved = resolve(destination);
  const existing = lstatSync(resolved, { bigint: true, throwIfNoEntry: false });
  if (existing !== undefined && !existing.isFile()) {
    throw new Error(`Refusing to overwrite symlink or non-regular file at ${resolved}`);
  }
  const parent = dirname(resolved);
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const tempPath = join(parent, `.tmp-${process.pid}-${randomBytes(8).toString("hex")}`);
  const bytes = Buffer.from(content, "utf8");
  try {
    const fd = openSync(tempPath, OPEN_WRONLY_EXCL_NOFOLLOW_FLAGS, 0o600);
    try {
      let offset = 0;
      while (offset < bytes.byteLength) {
        offset += writeSync(fd, bytes, offset, bytes.byteLength - offset);
      }
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tempPath, resolved);
  } finally {
    try {
      unlinkSync(tempPath);
    } catch {
      // Temp file already renamed or never created.
    }
  }
}

function pathVariantsForRedaction(absPath: string): readonly string[] {
  const candidates = new Set<string>();
  const resolved = resolve(absPath);
  candidates.add(resolved);
  candidates.add(resolved.replaceAll("\\", "/"));
  try {
    const real = realpathSync.native(resolved);
    candidates.add(real);
    candidates.add(real.replaceAll("\\", "/"));
  } catch {
    // Non-existent path still uses lexical variants.
  }
  return [...candidates].filter((candidate) => !/^(?:[A-Za-z]:)?[\\/]+$/u.test(candidate));
}

function escapeRegExpLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Strips selected secrets and local host path prefixes BEFORE hashing into the CAS so exported
 * bundles never leak environment secrets or developer home directories.
 */
export function redactEvidenceTextV1(
  text: string,
  secrets: readonly string[],
  options: { readonly repoRoot?: string; readonly homeDir?: string; readonly caseInsensitivePaths?: boolean } = {},
): { readonly text: string; readonly redacted: boolean } {
  let out = secrets.length > 0 ? redactExactValues(text, secrets) : text;
  const replacements: Array<readonly [string, string]> = [];
  if (options.repoRoot !== undefined && options.repoRoot.length > 0) {
    for (const variant of pathVariantsForRedaction(options.repoRoot)) {
      replacements.push([variant, "<repo>"]);
    }
  }
  const home = options.homeDir ?? homedir();
  if (home.length > 0) {
    for (const variant of pathVariantsForRedaction(home)) {
      replacements.push([variant, "<home>"]);
    }
  }
  replacements.sort((left, right) => right[0].length - left[0].length);
  const caseInsensitive =
    options.caseInsensitivePaths ?? new Set(["win32", "darwin"]).has(process.platform);
  const flags = caseInsensitive ? "giu" : "gu";
  for (const [needle, placeholder] of replacements) {
    out = out.replace(new RegExp(escapeRegExpLiteral(needle), flags), placeholder);
  }
  return { text: out, redacted: out !== text };
}

function readVerifiedFile(filePath: string, expectedSha256: string): CasReadResultV1 {
  const read = readBoundedRegularFileV1(filePath, CAS_MAX_OBJECT_BYTES);
  if (read.kind === "missing") {
    return { ok: false, sha256: expectedSha256, reason: "missing", actual_sha256: null };
  }
  if (read.kind === "unsafe") {
    return { ok: false, sha256: expectedSha256, reason: "unsafe_file", actual_sha256: null };
  }
  const actual = sha256HexV1(read.bytes);
  if (actual !== expectedSha256) {
    return { ok: false, sha256: expectedSha256, reason: "corrupt", actual_sha256: actual };
  }
  return { ok: true, sha256: expectedSha256, bytes: read.bytes, byte_length: read.bytes.byteLength };
}

export function getCasObjectV1(repoRoot: string, sha256: string): CasReadResultV1 {
  if (!isValidSha256HexV1(sha256)) {
    return { ok: false, sha256, reason: "invalid_digest", actual_sha256: null };
  }
  try {
    const shardDir = ensureContainedPhysicalDirV1(
      repoRoot,
      [EVIDENCE_DIR_NAME, "objects", "sha256", sha256.slice(0, 2)],
      false,
    );
    if (shardDir === null) {
      return { ok: false, sha256, reason: "missing", actual_sha256: null };
    }
    return readVerifiedFile(join(shardDir, sha256), sha256);
  } catch {
    return { ok: false, sha256, reason: "unsafe_file", actual_sha256: null };
  }
}

export function commitCasTempFileV1(
  tempPath: string,
  destination: string,
  sha256: string,
  ops: { readonly link: typeof linkSync; readonly rename: typeof renameSync } = { link: linkSync, rename: renameSync },
): boolean {
  try {
    ops.link(tempPath, destination);
    return false;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST") {
      const raced = readVerifiedFile(destination, sha256);
      if (!raced.ok) {
        throw new Error(`CAS object ${sha256} raced and failed integrity verification (${raced.reason}).`);
      }
      return true;
    }
    if (code === "ENOTSUP" || code === "EOPNOTSUPP") {
      const present = lstatSync(destination, { bigint: true, throwIfNoEntry: false });
      if (present !== undefined) {
        throw new Error(`CAS object ${sha256} already exists on linkless filesystem; refusing overwrite.`);
      }
      ops.rename(tempPath, destination);
      return false;
    }
    throw error;
  }
}

/**
 * Atomically writes bytes into `.ascout/objects/sha256/<ab>/<digest>` without overwriting an
 * existing object. Verifies physical directory containment and stored digest integrity.
 */
export function putCasObjectV1(repoRoot: string, content: Uint8Array | string): CasPutResultV1 {
  const bytes = typeof content === "string" ? Buffer.from(content, "utf8") : Buffer.from(content);
  if (bytes.byteLength > CAS_MAX_OBJECT_BYTES) {
    throw new Error(`CAS object exceeds maximum size of ${CAS_MAX_OBJECT_BYTES} bytes.`);
  }
  const sha256 = sha256HexV1(bytes);
  const shardDir = ensureContainedPhysicalDirV1(
    repoRoot,
    [EVIDENCE_DIR_NAME, "objects", "sha256", sha256.slice(0, 2)],
    true,
  )!;
  const destination = join(shardDir, sha256);

  const existing = readVerifiedFile(destination, sha256);
  if (existing.ok) {
    return { sha256, byte_length: bytes.byteLength, already_present: true };
  }
  if (existing.reason !== "missing") {
    throw new Error(`CAS object ${sha256} already exists but failed integrity verification (${existing.reason}).`);
  }

  const tempPath = join(shardDir, `.tmp-${process.pid}-${randomBytes(8).toString("hex")}`);
  try {
    const fd = openSync(tempPath, OPEN_WRONLY_EXCL_NOFOLLOW_FLAGS, 0o600);
    try {
      let offset = 0;
      while (offset < bytes.byteLength) {
        offset += writeSync(fd, bytes, offset, bytes.byteLength - offset);
      }
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    const alreadyPresent = commitCasTempFileV1(tempPath, destination, sha256);
    return { sha256, byte_length: bytes.byteLength, already_present: alreadyPresent };
  } finally {
    try {
      unlinkSync(tempPath);
    } catch {
      // Temp file already renamed or removed.
    }
  }
}

export function listCasDigestsV1(repoRoot: string): readonly string[] {
  const root = ensureContainedPhysicalDirV1(repoRoot, [EVIDENCE_DIR_NAME, "objects", "sha256"], false);
  if (root === null) return [];
  const digests: string[] = [];
  for (const shard of readdirSync(root)) {
    if (!HEX_SHARD.test(shard)) continue;
    const shardPath = join(root, shard);
    const stat = lstatSync(shardPath, { bigint: true, throwIfNoEntry: false });
    if (stat === undefined || !stat.isDirectory()) continue;
    for (const entry of readdirSync(shardPath)) {
      if (isValidSha256HexV1(entry) && entry.startsWith(shard)) {
        digests.push(entry);
      }
    }
  }
  digests.sort();
  return digests;
}

export function deleteCasObjectV1(repoRoot: string, sha256: string): boolean {
  if (!isValidSha256HexV1(sha256)) {
    throw new TypeError(`Invalid SHA-256 digest: ${JSON.stringify(sha256)}`);
  }
  const shardDir = ensureContainedPhysicalDirV1(
    repoRoot,
    [EVIDENCE_DIR_NAME, "objects", "sha256", sha256.slice(0, 2)],
    false,
  );
  if (shardDir === null) return false;
  const filePath = join(shardDir, sha256);
  try {
    unlinkSync(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
