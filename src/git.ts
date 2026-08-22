import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  lstatSync,
  openSync,
  readSync,
  readlinkSync,
  realpathSync,
} from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { TextDecoder } from "node:util";
import { URL } from "node:url";

export type RepositoryIdentity =
  | {
      readonly repository_id: `remote:${string}`;
      readonly repository_id_kind: "remote";
      readonly portable: true;
    }
  | {
      readonly repository_id: `local:${string}`;
      readonly repository_id_kind: "local_only";
      readonly portable: false;
    };

export interface GitHeadState {
  readonly head_sha: string;
  readonly detached: boolean;
  readonly shallow: boolean;
}

export interface GitCommandResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly error?: Error;
}

export type GitCommandRunner = (
  repositoryRoot: string,
  argv: readonly string[],
) => GitCommandResult;

export type WorktreeEntryType = "file" | "symlink";
export type UnstagedTreeState = "modified" | "deleted" | "type_changed";

export interface TreeDigestIndexEntry {
  readonly path: string;
  readonly mode: string;
  readonly oid: string;
  readonly stage: number;
}

export interface TreeDigestUnstagedEntry {
  readonly path: string;
  readonly state: UnstagedTreeState;
  readonly type?: WorktreeEntryType;
  readonly mode?: string;
  readonly digest?: string;
}

export interface TreeDigestUntrackedEntry {
  readonly path: string;
  readonly type: WorktreeEntryType;
  readonly mode: string;
  readonly digest: string;
  readonly ignored: boolean;
}

export interface TreeDigestState {
  readonly head: string;
  readonly index: readonly TreeDigestIndexEntry[];
  readonly unstaged: readonly TreeDigestUnstagedEntry[];
  readonly untracked: readonly TreeDigestUntrackedEntry[];
}

export interface TreeDigestV1 {
  readonly tree_digest_version: 1;
  readonly tree_digest: string;
  readonly tracked_index_entry_count: number;
  readonly unstaged_changed_count: number;
  readonly included_untracked_count: number;
}

export type GitIdentityErrorCode =
  | "unsupported_remote"
  | "invalid_repository_path"
  | "not_git_repository"
  | "unborn_head"
  | "invalid_head_identity"
  | "git_metadata_error";

export class GitIdentityError extends Error {
  readonly code: GitIdentityErrorCode;

  constructor(code: GitIdentityErrorCode, message: string) {
    super(message);
    this.name = "GitIdentityError";
    this.code = code;
  }
}

const GIT_METADATA_TIMEOUT_MS = 10_000;
const GIT_METADATA_MAX_BUFFER_BYTES = 1024 * 1024;
const GIT_TREE_METADATA_MAX_BUFFER_BYTES = 16 * 1024 * 1024;
const FILE_HASH_BUFFER_BYTES = 64 * 1024;
const FULL_GIT_OBJECT_ID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const SYMBOLIC_HEAD_REF = /^refs\/.+$/;
const INDEX_MODE = /^[0-7]{6}$/;
const INDEX_RECORD = /^([0-7]{6}) ([a-f0-9]{40}|[a-f0-9]{64}) ([0-3])\t(.+)$/s;
const RAW_DIFF_METADATA = /^:([0-7]{6}) ([0-7]{6}) ([a-f0-9]{40}|[a-f0-9]{64}) ([a-f0-9]{40}|[a-f0-9]{64}) ([A-Z])$/;
const CANONICAL_REPOSITORY_PATH = /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.*/[.]{1,2}(?:\/|$))(?!.*\\)[^/]+(?:\/[^/]+)*$/;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256Bytes(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(FILE_HASH_BUFFER_BYTES);
  let descriptor: number | undefined;
  try {
    descriptor = openSync(path, "r");
    while (true) {
      const bytesRead = readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
    }
    return hash.digest("hex");
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function gitBlobOidForBytes(value: Buffer, expectedOid: string): string {
  const algorithm = expectedOid.length === 40 ? "sha1" : expectedOid.length === 64 ? "sha256" : null;
  if (algorithm === null) {
    throw new GitIdentityError("git_metadata_error", "unsupported Git object ID length");
  }
  const hash = createHash(algorithm);
  hash.update(Buffer.from(`blob ${value.length}\0`, "utf8"));
  hash.update(value);
  return hash.digest("hex");
}

function stripOneTerminalNewline(value: string): string {
  if (value.endsWith("\r\n")) return value.slice(0, -2);
  if (value.endsWith("\n")) return value.slice(0, -1);
  return value;
}

function stripUrlAuthoritySecrets(rawRemote: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawRemote);
  } catch {
    throw new GitIdentityError("unsupported_remote", "unsupported remote identity form");
  }

  parsed.username = "";
  parsed.password = "";
  parsed.search = "";
  parsed.hash = "";
  return parsed;
}

function normalizeRemoteIdentity(rawRemote: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(rawRemote)) {
    const parsed = stripUrlAuthoritySecrets(rawRemote);
    const protocol = parsed.protocol.toLowerCase();
    const host = parsed.hostname.toLowerCase();
    const port = parsed.port === "" ? "" : `:${parsed.port}`;

    if (host === "") {
      throw new GitIdentityError("unsupported_remote", "scheme-based remote requires a host");
    }
    if (protocol === "https:") {
      return `https://${host}${port}${parsed.pathname}`;
    }
    if (protocol === "ssh:") {
      return `ssh://${host}${port}${parsed.pathname}`;
    }
    throw new GitIdentityError("unsupported_remote", `unsupported remote protocol: ${protocol}`);
  }

  // Windows drive-qualified paths are local-path syntax, not portable scp-like remotes.
  if (/^[A-Za-z]:/.test(rawRemote)) {
    throw new GitIdentityError("unsupported_remote", "unsupported drive-qualified remote path");
  }

  // T012 does not define a canonical bracketed-IPv6 scp grammar. Reject rather than split on an
  // IPv6 colon and fabricate a portable remote identity.
  if (/^(?:[^@/:]+@)?\[/.test(rawRemote)) {
    throw new GitIdentityError("unsupported_remote", "unsupported bracketed scp-like remote host");
  }

  const scpLike = /^(?:[^@/:]+@)?([^:/?#]+):([^?#]+)$/.exec(rawRemote);
  if (scpLike === null) {
    throw new GitIdentityError("unsupported_remote", "unsupported remote identity form");
  }

  const host = scpLike[1];
  const path = scpLike[2];
  if (host === undefined || path === undefined || path.startsWith("/")) {
    throw new GitIdentityError("unsupported_remote", "unsupported scp-like remote path form");
  }
  return `ssh://${host.toLowerCase()}/${path}`;
}

export function repositoryIdentityFromRemote(rawRemote: string): RepositoryIdentity {
  const normalized = normalizeRemoteIdentity(rawRemote);
  return {
    repository_id: `remote:${sha256(normalized)}`,
    repository_id_kind: "remote",
    portable: true,
  };
}

export function repositoryIdentityFromLocalPath(rawRepositoryPath: string): RepositoryIdentity {
  let canonicalRealPath: string;
  try {
    canonicalRealPath = realpathSync.native(rawRepositoryPath);
  } catch {
    throw new GitIdentityError(
      "invalid_repository_path",
      "repository path must resolve to an existing canonical real path",
    );
  }

  return {
    repository_id: `local:${sha256(canonicalRealPath)}`,
    repository_id_kind: "local_only",
    portable: false,
  };
}

const defaultGitCommandRunner: GitCommandRunner = (repositoryRoot, argv) => {
  const result = spawnSync("git", [...argv], {
    cwd: repositoryRoot,
    encoding: "utf8",
    shell: false,
    timeout: GIT_METADATA_TIMEOUT_MS,
    maxBuffer: GIT_METADATA_MAX_BUFFER_BYTES,
    windowsHide: true,
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    ...(result.error === undefined ? {} : { error: result.error }),
  };
};

function requireSuccessfulGit(
  result: GitCommandResult,
  code: GitIdentityErrorCode,
  message: string,
): string {
  if (result.error !== undefined || result.status !== 0) {
    throw new GitIdentityError(code, message);
  }
  return result.stdout;
}

function parseExactBoolean(stdout: string, context: string): boolean {
  const value = stripOneTerminalNewline(stdout);
  if (value === "true") return true;
  if (value === "false") return false;
  throw new GitIdentityError("git_metadata_error", `${context} returned an invalid boolean`);
}

function proveUnbornHead(repositoryRoot: string, runGit: GitCommandRunner): boolean {
  const symbolicHead = runGit(repositoryRoot, ["symbolic-ref", "-q", "HEAD"]);
  if (symbolicHead.error !== undefined || symbolicHead.status !== 0) {
    return false;
  }

  const symbolicRef = stripOneTerminalNewline(symbolicHead.stdout);
  if (
    !SYMBOLIC_HEAD_REF.test(symbolicRef) ||
    symbolicRef.includes("\n") ||
    symbolicRef.includes("\r")
  ) {
    throw new GitIdentityError("git_metadata_error", "Git returned an invalid symbolic HEAD ref");
  }

  const refResult = runGit(repositoryRoot, ["show-ref", "--verify", "--quiet", symbolicRef]);
  if (refResult.error !== undefined) {
    throw new GitIdentityError("git_metadata_error", "unable to verify symbolic HEAD ref");
  }
  if (refResult.status === 1) return true;
  if (refResult.status === 0) return false;
  throw new GitIdentityError("git_metadata_error", "unable to verify symbolic HEAD ref");
}

export function readGitHeadState(
  repositoryRoot: string,
  runGit: GitCommandRunner = defaultGitCommandRunner,
): GitHeadState {
  const insideResult = runGit(repositoryRoot, ["rev-parse", "--is-inside-work-tree"]);
  const inside = requireSuccessfulGit(
    insideResult,
    "not_git_repository",
    "repository path is not a usable Git work tree",
  );
  if (stripOneTerminalNewline(inside) !== "true") {
    throw new GitIdentityError("not_git_repository", "repository path is not a Git work tree");
  }

  const headResult = runGit(repositoryRoot, ["rev-parse", "--verify", "HEAD^{commit}"]);
  if (headResult.error !== undefined) {
    throw new GitIdentityError("git_metadata_error", "unable to resolve Git HEAD commit");
  }
  if (headResult.status !== 0) {
    if (proveUnbornHead(repositoryRoot, runGit)) {
      throw new GitIdentityError("unborn_head", "M1 check requires an existing Git HEAD commit");
    }
    throw new GitIdentityError("git_metadata_error", "unable to resolve Git HEAD commit");
  }

  const headSha = stripOneTerminalNewline(headResult.stdout);
  if (!FULL_GIT_OBJECT_ID.test(headSha)) {
    throw new GitIdentityError(
      "invalid_head_identity",
      "HEAD must resolve to one full lowercase 40- or 64-hex Git object ID",
    );
  }

  const symbolicHead = runGit(repositoryRoot, ["symbolic-ref", "-q", "HEAD"]);
  let detached: boolean;
  if (symbolicHead.error !== undefined) {
    throw new GitIdentityError("git_metadata_error", "unable to determine detached HEAD state");
  }
  if (symbolicHead.status === 0) detached = false;
  else if (symbolicHead.status === 1) detached = true;
  else throw new GitIdentityError("git_metadata_error", "unable to determine detached HEAD state");

  const shallowStdout = requireSuccessfulGit(
    runGit(repositoryRoot, ["rev-parse", "--is-shallow-repository"]),
    "git_metadata_error",
    "unable to determine shallow repository state",
  );

  return {
    head_sha: headSha,
    detached,
    shallow: parseExactBoolean(shallowStdout, "git shallow-state query"),
  };
}

function compareUtf8(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function isAscoutRuntimePath(path: string): boolean {
  return path === ".ascout" || path.startsWith(".ascout/");
}

function requireCanonicalRepositoryPath(path: string): string {
  if (!CANONICAL_REPOSITORY_PATH.test(path)) {
    throw new GitIdentityError("git_metadata_error", `Git returned a non-canonical repository path: ${path}`);
  }
  return path;
}

function updateFramedTreeField(hash: ReturnType<typeof createHash>, value: string): void {
  const bytes = Buffer.from(value, "utf8");
  hash.update(Buffer.from(`${bytes.length}:`, "ascii"));
  hash.update(bytes);
}

export function treeDigestV1FromState(state: TreeDigestState): TreeDigestV1 {
  for (const entry of state.index) requireCanonicalRepositoryPath(entry.path);
  for (const entry of state.unstaged) requireCanonicalRepositoryPath(entry.path);
  for (const entry of state.untracked) requireCanonicalRepositoryPath(entry.path);

  const index = [...state.index].sort((left, right) =>
    compareUtf8(left.path, right.path) ||
    left.stage - right.stage ||
    compareUtf8(left.mode, right.mode) ||
    compareUtf8(left.oid, right.oid),
  );
  const unstaged = [...state.unstaged].sort((left, right) => compareUtf8(left.path, right.path));
  const untracked = state.untracked
    .filter((entry) => !entry.ignored && !isAscoutRuntimePath(entry.path))
    .sort((left, right) => compareUtf8(left.path, right.path));

  const hash = createHash("sha256");
  const field = (value: string): void => updateFramedTreeField(hash, value);

  field("ascout-tree-v1");
  field(state.head);
  field("index");
  field(String(index.length));
  for (const entry of index) {
    field("index-entry");
    field(entry.mode);
    field(entry.oid);
    field(String(entry.stage));
    field(entry.path);
  }

  field("unstaged");
  field(String(unstaged.length));
  for (const entry of unstaged) {
    field("unstaged-entry");
    field(entry.path);
    field(entry.state);
    if (entry.state === "deleted") {
      field("deleted");
      continue;
    }
    if (entry.type === undefined || entry.mode === undefined || entry.digest === undefined) {
      throw new GitIdentityError(
        "git_metadata_error",
        `incomplete unstaged tree-digest entry: ${entry.path}`,
      );
    }
    field(entry.type);
    field(entry.mode);
    field(entry.digest);
  }

  field("untracked");
  field(String(untracked.length));
  for (const entry of untracked) {
    field("untracked-entry");
    field(entry.path);
    field(entry.type);
    field(entry.mode);
    field(entry.digest);
  }

  return {
    tree_digest_version: 1,
    tree_digest: hash.digest("hex"),
    tracked_index_entry_count: index.length,
    unstaged_changed_count: unstaged.length,
    included_untracked_count: untracked.length,
  };
}

interface GitBufferCommandResult {
  readonly status: number | null;
  readonly stdout: Buffer;
  readonly stderr: Buffer;
  readonly error?: Error;
}

function runGitTreeMetadata(repositoryRoot: string, argv: readonly string[]): GitBufferCommandResult {
  const result = spawnSync("git", [...argv], {
    cwd: repositoryRoot,
    encoding: null,
    shell: false,
    timeout: GIT_METADATA_TIMEOUT_MS,
    maxBuffer: GIT_TREE_METADATA_MAX_BUFFER_BYTES,
    windowsHide: true,
  });

  return {
    status: result.status,
    stdout: Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0),
    stderr: Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.alloc(0),
    ...(result.error === undefined ? {} : { error: result.error }),
  };
}

function requireSuccessfulGitBuffer(result: GitBufferCommandResult, message: string): Buffer {
  if (result.error !== undefined || result.status !== 0) {
    throw new GitIdentityError("git_metadata_error", message);
  }
  return result.stdout;
}

function decodeUtf8(buffer: Buffer, context: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new GitIdentityError("git_metadata_error", `${context} is not valid UTF-8`);
  }
}

function splitNullTerminated(buffer: Buffer, context: string): Buffer[] {
  if (buffer.length === 0) return [];
  if (buffer[buffer.length - 1] !== 0) {
    throw new GitIdentityError("git_metadata_error", `${context} is not NUL-terminated`);
  }

  const records: Buffer[] = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0) continue;
    const record = buffer.subarray(start, index);
    if (record.length === 0) {
      throw new GitIdentityError("git_metadata_error", `${context} contains an empty record`);
    }
    records.push(record);
    start = index + 1;
  }
  return records;
}

function parseIndexEntries(buffer: Buffer): TreeDigestIndexEntry[] {
  const records = splitNullTerminated(buffer, "git ls-files --stage output");
  return records.map((record) => {
    const text = decodeUtf8(record, "git index record");
    const match = INDEX_RECORD.exec(text);
    if (match === null) {
      throw new GitIdentityError("git_metadata_error", "Git returned a malformed index entry");
    }

    const mode = match[1];
    const oid = match[2];
    const stageText = match[3];
    const path = match[4];
    if (mode === undefined || oid === undefined || stageText === undefined || path === undefined) {
      throw new GitIdentityError("git_metadata_error", "Git returned an incomplete index entry");
    }
    if (!INDEX_MODE.test(mode) || !FULL_GIT_OBJECT_ID.test(oid) || path.length === 0) {
      throw new GitIdentityError("git_metadata_error", "Git returned an invalid index entry");
    }

    return { path: requireCanonicalRepositoryPath(path), mode, oid, stage: Number(stageText) };
  });
}

function assertTreeDigestIndexVisibility(repositoryRoot: string): void {
  const records = splitNullTerminated(
    requireSuccessfulGitBuffer(
      runGitTreeMetadata(repositoryRoot, ["ls-files", "-v", "-z"]),
      "unable to inspect Git index visibility flags for tree digest",
    ),
    "git ls-files -v output",
  );

  for (const record of records) {
    if (record.length < 3 || record[1] !== 0x20) {
      throw new GitIdentityError("git_metadata_error", "Git returned a malformed index visibility record");
    }
    const tagByte = record[0];
    if (tagByte === undefined) {
      throw new GitIdentityError("git_metadata_error", "Git returned an incomplete index visibility record");
    }
    const tag = String.fromCharCode(tagByte);
    const path = requireCanonicalRepositoryPath(decodeUtf8(record.subarray(2), "git index visibility path"));

    if (tag === "S" || tag === "s") {
      throw new GitIdentityError(
        "git_metadata_error",
        `tree digest cannot safely inspect skip-worktree index entry: ${path}`,
      );
    }
    if (tag >= "a" && tag <= "z") {
      throw new GitIdentityError(
        "git_metadata_error",
        `tree digest cannot safely inspect assume-unchanged index entry: ${path}`,
      );
    }
  }
}

function worktreeTypeFromMode(mode: string, path: string): WorktreeEntryType {
  if (mode === "120000") return "symlink";
  if (mode === "100644" || mode === "100755") return "file";
  if (mode === "160000") {
    throw new GitIdentityError(
      "git_metadata_error",
      `tree digest does not support gitlink/submodule worktree state at ${path}`,
    );
  }
  throw new GitIdentityError(
    "git_metadata_error",
    `unsupported worktree mode for tree digest at ${path}: ${mode}`,
  );
}

function repositoryPath(repositoryRoot: string, path: string): string {
  const canonicalPath = requireCanonicalRepositoryPath(path);
  const root = resolve(repositoryRoot);
  const absolutePath = resolve(root, ...canonicalPath.split("/"));
  const relativePath = relative(root, absolutePath);
  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new GitIdentityError("git_metadata_error", `tree-digest path escapes repository root: ${path}`);
  }
  return absolutePath;
}

function readSymlinkTarget(repositoryRoot: string, path: string): Buffer {
  const absolutePath = repositoryPath(repositoryRoot, path);
  try {
    const stat = lstatSync(absolutePath);
    if (!stat.isSymbolicLink()) {
      throw new GitIdentityError("git_metadata_error", `tree-digest expected a symlink at ${path}`);
    }
    return readlinkSync(absolutePath, { encoding: "buffer" });
  } catch (error) {
    if (error instanceof GitIdentityError) throw error;
    throw new GitIdentityError("git_metadata_error", `unable to read symlink target for tree digest: ${path}`);
  }
}

function digestWorktreeEntry(
  repositoryRoot: string,
  path: string,
  expectedType: WorktreeEntryType,
): string {
  const absolutePath = repositoryPath(repositoryRoot, path);
  try {
    if (expectedType === "symlink") {
      return sha256Bytes(readSymlinkTarget(repositoryRoot, path));
    }
    const stat = lstatSync(absolutePath);
    if (!stat.isFile()) {
      throw new GitIdentityError("git_metadata_error", `tree-digest expected a regular file at ${path}`);
    }
    return sha256File(absolutePath);
  } catch (error) {
    if (error instanceof GitIdentityError) throw error;
    throw new GitIdentityError("git_metadata_error", `unable to read worktree entry for tree digest: ${path}`);
  }
}

function worktreeGitObjectId(
  repositoryRoot: string,
  path: string,
  type: WorktreeEntryType,
  expectedOid: string,
): string {
  if (type === "symlink") {
    return gitBlobOidForBytes(readSymlinkTarget(repositoryRoot, path), expectedOid);
  }

  const output = requireSuccessfulGitBuffer(
    runGitTreeMetadata(repositoryRoot, [
      "hash-object",
      `--path=${path}`,
      "--",
      repositoryPath(repositoryRoot, path),
    ]),
    `unable to compute Git worktree object ID for ${path}`,
  );
  const oid = stripOneTerminalNewline(decodeUtf8(output, "git hash-object output"));
  if (!FULL_GIT_OBJECT_ID.test(oid) || oid.length !== expectedOid.length) {
    throw new GitIdentityError("git_metadata_error", `Git returned an invalid worktree object ID for ${path}`);
  }
  return oid;
}

function parseUnstagedEntries(repositoryRoot: string, buffer: Buffer): TreeDigestUnstagedEntry[] {
  const records = splitNullTerminated(buffer, "git diff-files --raw output");
  if (records.length % 2 !== 0) {
    throw new GitIdentityError("git_metadata_error", "Git returned an incomplete unstaged diff record");
  }

  const entries: TreeDigestUnstagedEntry[] = [];
  for (let index = 0; index < records.length; index += 2) {
    const metadataRecord = records[index];
    const pathRecord = records[index + 1];
    if (metadataRecord === undefined || pathRecord === undefined) {
      throw new GitIdentityError("git_metadata_error", "Git returned an incomplete unstaged diff record");
    }

    const metadata = decodeUtf8(metadataRecord, "git unstaged metadata");
    const path = requireCanonicalRepositoryPath(decodeUtf8(pathRecord, "git unstaged path"));
    const match = RAW_DIFF_METADATA.exec(metadata);
    if (match === null) {
      throw new GitIdentityError("git_metadata_error", "Git returned a malformed unstaged diff record");
    }

    const oldMode = match[1];
    const newMode = match[2];
    const oldOid = match[3];
    const status = match[5];
    if (oldMode === undefined || newMode === undefined || oldOid === undefined || status === undefined) {
      throw new GitIdentityError("git_metadata_error", "Git returned incomplete unstaged metadata");
    }

    if (status === "U") {
      throw new GitIdentityError(
        "git_metadata_error",
        `tree digest does not support unmerged tracked state at ${path}`,
      );
    }
    if (status === "D") {
      entries.push({ path, state: "deleted" });
      continue;
    }
    if (status !== "M" && status !== "T") {
      throw new GitIdentityError(
        "git_metadata_error",
        `unsupported unstaged Git status for tree digest at ${path}: ${status}`,
      );
    }

    const type = worktreeTypeFromMode(newMode, path);
    if (status === "M" && oldMode === newMode) {
      const currentOid = worktreeGitObjectId(repositoryRoot, path, type, oldOid);
      if (currentOid === oldOid) continue;
    }

    entries.push({
      path,
      state: status === "T" ? "type_changed" : "modified",
      type,
      mode: newMode,
      digest: digestWorktreeEntry(repositoryRoot, path, type),
    });
  }
  return entries;
}

function untrackedWorktreeEntry(repositoryRoot: string, path: string): TreeDigestUntrackedEntry {
  const absolutePath = repositoryPath(repositoryRoot, path);
  try {
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      return {
        path,
        type: "symlink",
        mode: "120000",
        digest: sha256Bytes(readSymlinkTarget(repositoryRoot, path)),
        ignored: false,
      };
    }
    if (stat.isFile()) {
      return {
        path,
        type: "file",
        mode: (stat.mode & 0o100) === 0 ? "100644" : "100755",
        digest: sha256File(absolutePath),
        ignored: false,
      };
    }
    throw new GitIdentityError(
      "git_metadata_error",
      `unsupported untracked worktree type for tree digest: ${path}`,
    );
  } catch (error) {
    if (error instanceof GitIdentityError) throw error;
    throw new GitIdentityError("git_metadata_error", `unable to read untracked tree-digest entry: ${path}`);
  }
}

function parseUntrackedEntries(repositoryRoot: string, buffer: Buffer): TreeDigestUntrackedEntry[] {
  const records = splitNullTerminated(buffer, "git ls-files --others output");
  const entries: TreeDigestUntrackedEntry[] = [];
  for (const record of records) {
    const path = requireCanonicalRepositoryPath(decodeUtf8(record, "git untracked path"));
    if (isAscoutRuntimePath(path)) continue;
    entries.push(untrackedWorktreeEntry(repositoryRoot, path));
  }
  return entries;
}

export function readTreeDigestV1(repositoryRoot: string): TreeDigestV1 {
  const head = readGitHeadState(repositoryRoot).head_sha;
  const index = parseIndexEntries(requireSuccessfulGitBuffer(
    runGitTreeMetadata(repositoryRoot, ["ls-files", "--stage", "-z"]),
    "unable to read Git index for tree digest",
  ));
  assertTreeDigestIndexVisibility(repositoryRoot);
  const unstaged = parseUnstagedEntries(repositoryRoot, requireSuccessfulGitBuffer(
    runGitTreeMetadata(repositoryRoot, [
      "diff-files",
      "--raw",
      "--no-abbrev",
      "--no-renames",
      "--no-ext-diff",
      "-z",
    ]),
    "unable to read unstaged Git state for tree digest",
  ));
  const untracked = parseUntrackedEntries(repositoryRoot, requireSuccessfulGitBuffer(
    runGitTreeMetadata(repositoryRoot, ["ls-files", "--others", "--exclude-standard", "-z"]),
    "unable to read untracked Git state for tree digest",
  ));

  return treeDigestV1FromState({ head, index, unstaged, untracked });
}
