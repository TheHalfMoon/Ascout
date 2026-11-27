import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  accessSync,
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  readlinkSync,
  realpathSync,
  statSync,
} from "node:fs";
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { TextDecoder } from "node:util";
import { URL } from "node:url";

import {
  changedNewLineRangesFromBytes,
  isBinaryBytes,
  isConsistentOpenedWorktreeFile,
  matchFuzzyRenames,
  normalizeCrlfToLf,
  parseCatFileBatchOutput,
  parseGitCoreWorktreeConfig,
  shouldNormalizeWorktreeEol,
  splitLinesForDiff,
  type GitCoreWorktreeConfig,
} from "./git-diff.js";

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

// Repository configuration is data, not permission to launch helpers. These
// overrides beat repository, global, and system config for the keys they name.
// This is bounded process hardening, not a sandbox.
const GIT_NULL_DEVICE = "/dev/null"; // Git for Windows accepts this; it rejects NUL here.
const GIT_CONFIG_OVERRIDES = [
  "core.fsmonitor=false",
  `core.hooksPath=${GIT_NULL_DEVICE}`,
  "core.pager=cat",
  "core.sshCommand=false",
  "core.askPass=",
  "core.gitProxy=",
  "core.alternateRefsCommand=",
  "credential.helper=",
  "diff.external=",
  "submodule.recurse=false",
  "protocol.allow=never",
  // check-attr reports these driver names exactly like absent attributes, so
  // they can't be refused by name. An empty command makes Git skip the driver.
  ...["unset", "unspecified"].flatMap((name) =>
    ["clean", "smudge", "process"].map((command) => `filter.${name}.${command}=`)),
] as const;

/**
 * Single-open regular-file flags without platform-conditional branches: on POSIX includes
 * O_NOFOLLOW | O_NONBLOCK (preventing symlink following and FIFO blocking); on Windows resolves
 * to O_RDONLY paired with pre/post BigInt dev/ino verification.
 */
const OPEN_CONTAINED_REGULAR_FLAGS = [
  fsConstants.O_RDONLY,
  fsConstants.O_NOFOLLOW,
  fsConstants.O_NONBLOCK,
].filter(Number.isInteger).reduce((flags, bit) => flags | bit, 0);

function hardenedGitArgs(argv: readonly string[]): string[] {
  return [...GIT_CONFIG_OVERRIDES.flatMap((setting) => ["-c", setting]), ...argv];
}

// Global and system config stay in effect, because they carry settings such as
// core.autocrlf that determine tree identity. Only inherited GIT_* authority goes.
function hardenedGitEnv(inherited: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(inherited)) {
    if (!key.toUpperCase().startsWith("GIT_")) {
      env[key] = value;
    }
  }
  return { ...env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0", GIT_NO_LAZY_FETCH: "1" };
}

// Windows otherwise searches the working directory first, so a git.exe in the
// repository would run in place of Git. The search reads this process's own
// environment, not the child's, so the flag is set only around the synchronous
// spawn. Project tasks must not inherit it: it changes how cmd.exe finds tools.
function withoutCurrentDirectorySearch<T>(spawn: () => T): T {
  if (process.platform !== "win32") {
    return spawn();
  }
  const key = "NoDefaultCurrentDirectoryInExePath";
  const previous = process.env[key];
  process.env[key] = "1";
  try {
    return spawn();
  } finally {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
}

const GIT_METADATA_TIMEOUT_MS = 10_000;
const GIT_METADATA_MAX_BUFFER_BYTES = 1024 * 1024;
const GIT_TREE_METADATA_MAX_BUFFER_BYTES = 16 * 1024 * 1024;
const GIT_ATTRIBUTE_QUERY_MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const FILE_HASH_BUFFER_BYTES = 64 * 1024;
const EMPTY_BLOB_SHA1 = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
const EMPTY_BLOB_SHA256 = "473a0f4c3be8a93681a267e3b1e9a7dcda1185436fe141f7749120a303721813";
const FULL_GIT_OBJECT_ID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const SYMBOLIC_HEAD_REF = /^refs\/.+$/;
const INDEX_MODE = /^[0-7]{6}$/;
const INDEX_RECORD = /^([0-7]{6}) ([a-f0-9]{40}|[a-f0-9]{64}) ([0-3])\t(.+)$/s;
const LS_TREE_RECORD = /^([0-7]{6}) (blob|commit) ([a-f0-9]{40}|[a-f0-9]{64})\t(.+)$/s;
const CANONICAL_REPOSITORY_PATH =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?![^]+\/[.]{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256Bytes(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readAllDescriptorBytes(descriptor: number, maxBytes?: number): Buffer | null {
  const chunks: Buffer[] = [];
  const buffer = Buffer.allocUnsafe(FILE_HASH_BUFFER_BYTES);
  let totalBytes = 0;
  while (true) {
    const bytesRead = readSync(descriptor, buffer, 0, buffer.length, null);
    if (bytesRead === 0) break;
    totalBytes += bytesRead;
    if (maxBytes !== undefined && totalBytes > maxBytes) return null;
    chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
  }
  return Buffer.concat(chunks);
}

function gitBlobOidForBytes(value: Buffer, expectedOid: string): string {
  const hash = createHash(expectedOid.length === 64 ? "sha256" : "sha1");
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

/**
 * Reads the configured `origin` remote URL, or null when no origin remote is
 * configured. Real git failures fail closed. The raw URL is transient caller
 * material; only its derived identity may persist.
 */
export function readOriginRemoteUrl(
  repositoryRoot: string,
  runGit: GitCommandRunner = defaultGitCommandRunner,
): string | null {
  const remotesResult = runGit(repositoryRoot, ["remote"]);
  if (remotesResult.error !== undefined || remotesResult.status !== 0) {
    throw new GitIdentityError("git_metadata_error", "unable to list configured Git remotes");
  }

  const remotes = remotesResult.stdout
    .split("\n")
    .map((line) => stripOneTerminalNewline(line).trim())
    .filter((line) => line.length > 0);
  if (!remotes.includes("origin")) return null;

  const urlResult = runGit(repositoryRoot, ["remote", "get-url", "origin"]);
  const raw = requireSuccessfulGit(
    urlResult,
    "git_metadata_error",
    "unable to read the origin remote URL",
  );
  const url = stripOneTerminalNewline(raw);
  if (url.length === 0 || url.includes("\n") || url.includes("\r")) {
    throw new GitIdentityError("git_metadata_error", "Git returned an invalid origin remote URL");
  }
  return url;
}

export function resolveRepositoryIdentity(repositoryRoot: string): RepositoryIdentity {
  const rawRemote = readOriginRemoteUrl(repositoryRoot);
  return rawRemote === null
    ? repositoryIdentityFromLocalPath(repositoryRoot)
    : repositoryIdentityFromRemote(rawRemote);
}

// A PATH entry may name a directory the repository controls, including ".", so Git
// resolves here to an absolute file outside the repository. This is not proof of
// which Git it is: a directory the user put on PATH stays the user's authority.
export function trustedGitExecutable(repositoryRoot: string): string | null {
  return trustedExecutableOnPath(repositoryRoot, [process.platform === "win32" ? "git.exe" : "git"]);
}

/**
 * Resolves a bare command name the way the shell would, but only through absolute PATH
 * entries outside the repository. On Windows, a name without a PATHEXT extension tries
 * each extension in PATHEXT order, so `npm` finds `npm.cmd`. Never searches the current
 * directory, which Windows lookup otherwise does first.
 */
export function trustedCommandExecutable(repositoryRoot: string, command: string): string | null {
  if (process.platform !== "win32") return trustedExecutableOnPath(repositoryRoot, [command]);
  const extensions = (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .filter((extension) => /^\.[A-Za-z0-9]+$/u.test(extension));
  const hasExtension = extensions.some((extension) => command.toLowerCase().endsWith(extension.toLowerCase()));
  return trustedExecutableOnPath(
    repositoryRoot,
    hasExtension ? [command] : extensions.map((extension) => `${command}${extension.toLowerCase()}`),
  );
}

function trustedExecutableOnPath(repositoryRoot: string, names: readonly string[]): string | null {
  let root: string;
  try {
    root = realpathSync.native(repositoryRoot);
  } catch {
    return null;
  }
  // With PATH unset, POSIX exec searched a default path, so this keeps finding the command.
  const searchPath = process.env.PATH ?? (process.platform === "win32" ? "" : "/usr/local/bin:/usr/bin:/bin");
  for (const rawEntry of searchPath.split(delimiter)) {
    const entry = rawEntry.replace(/^"(.*)"$/u, "$1");
    if (!isAbsolute(entry) || /^[\\/]{2}/u.test(entry)) continue;
    for (const name of names) {
      try {
        const candidate = join(entry, name);
        // Each must lie outside: a repository entry, even one that links out, would let the
        // repository pick the binary, and an outside entry could link back in.
        if (isContainedPath(root, resolve(entry)) || isContainedPath(resolve(repositoryRoot), resolve(entry))) continue;
        if (isContainedPath(root, realpathSync.native(entry))) continue;
        const resolved = realpathSync.native(candidate);
        if (isContainedPath(root, resolved)) continue;
        if (!statSync(resolved).isFile()) continue;
        accessSync(resolved, fsConstants.X_OK);
        // The resolved path, so a link re-pointed after this check can't change what runs.
        return resolved;
      } catch {
        continue;
      }
    }
  }
  return null;
}

function noTrustedGitError(): Error {
  return Object.assign(new Error("no Git executable found outside the repository"), {
    code: "ENOENT",
  });
}

const defaultGitCommandRunner: GitCommandRunner = (repositoryRoot, argv) => {
  const git = trustedGitExecutable(repositoryRoot);
  if (git === null) {
    return { status: null, stdout: "", stderr: "", error: noTrustedGitError() };
  }
  const result = withoutCurrentDirectorySearch(() => spawnSync(git, hardenedGitArgs(argv), {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: hardenedGitEnv(),
    shell: false,
    timeout: GIT_METADATA_TIMEOUT_MS,
    maxBuffer: GIT_METADATA_MAX_BUFFER_BYTES,
    windowsHide: true,
  }));

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

function readDetachedHead(repositoryRoot: string, runGit: GitCommandRunner): boolean {
  const symbolicHead = runGit(repositoryRoot, ["symbolic-ref", "-q", "HEAD"]);
  if (symbolicHead.error !== undefined) {
    throw new GitIdentityError("git_metadata_error", "unable to determine detached HEAD state");
  }
  if (symbolicHead.status === 0) return false;
  if (symbolicHead.status === 1) return true;
  throw new GitIdentityError("git_metadata_error", "unable to determine detached HEAD state");
}

function resolveDetachedHead(
  includeDetached: boolean,
  repositoryRoot: string,
  runGit: GitCommandRunner,
): boolean {
  return includeDetached ? readDetachedHead(repositoryRoot, runGit) : false;
}

function readGitHeadStateInternal(
  repositoryRoot: string,
  runGit: GitCommandRunner,
  includeDetached: boolean,
): GitHeadState {
  // Native Git can answer three metadata questions in one process. Only an
  // exact successful shape is accepted; the existing path classifies failures.
  const batched = runGit(repositoryRoot, [
    "rev-parse", "--is-inside-work-tree", "--is-shallow-repository", "--verify", "HEAD^{commit}",
  ]);
  if (batched.error === undefined && batched.status === 0) {
    const lines = batched.stdout.split("\n");
    const [inside, shallow, headSha, terminator] = lines;
    if (
      lines.length === 4 && terminator === "" && inside === "true" &&
      (shallow === "true" || shallow === "false") &&
      headSha !== undefined && FULL_GIT_OBJECT_ID.test(headSha)
    ) {
      return {
        head_sha: headSha,
        detached: resolveDetachedHead(includeDetached, repositoryRoot, runGit),
        shallow: shallow === "true",
      };
    }
  }

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

  const detached = resolveDetachedHead(includeDetached, repositoryRoot, runGit);

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

export function readGitHeadState(
  repositoryRoot: string,
  runGit: GitCommandRunner = defaultGitCommandRunner,
): GitHeadState {
  return readGitHeadStateInternal(repositoryRoot, runGit, true);
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

function runGitTreeMetadata(
  repositoryRoot: string,
  argv: readonly string[],
  stdin?: Buffer,
  timeoutMs: number = GIT_METADATA_TIMEOUT_MS,
): GitBufferCommandResult {
  const git = trustedGitExecutable(repositoryRoot);
  if (git === null) {
    return { status: null, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), error: noTrustedGitError() };
  }
  const result = withoutCurrentDirectorySearch(() => spawnSync(git, hardenedGitArgs(argv), {
    cwd: repositoryRoot,
    encoding: null,
    env: hardenedGitEnv(),
    shell: false,
    timeout: timeoutMs,
    maxBuffer: stdin === undefined ? GIT_TREE_METADATA_MAX_BUFFER_BYTES : GIT_ATTRIBUTE_QUERY_MAX_BUFFER_BYTES,
    ...(stdin === undefined ? {} : { input: stdin }),
    windowsHide: true,
  }));

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
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer);
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
  const records = splitNullTerminated(buffer, "git ls-files --stage -v output");
  return records.map((record) => {
    if (record.length < 3 || record[1] !== 0x20) {
      throw new GitIdentityError("git_metadata_error", "Git returned a malformed index visibility record");
    }
    const tag = String.fromCharCode(record[0]!);
    const text = decodeUtf8(record.subarray(2), "git index record");
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

    const canonicalPath = requireCanonicalRepositoryPath(path);
    if (tag === "S" || tag === "s") {
      throw new GitIdentityError(
        "git_metadata_error",
        `tree digest cannot safely inspect skip-worktree index entry: ${canonicalPath}`,
      );
    }
    if (tag >= "a" && tag <= "z") {
      throw new GitIdentityError(
        "git_metadata_error",
        `tree digest cannot safely inspect assume-unchanged index entry: ${canonicalPath}`,
      );
    }
    if (tag !== "H" && tag !== "M") {
      throw new GitIdentityError("git_metadata_error", "Git returned an unsupported index visibility tag");
    }
    return { path: canonicalPath, mode, oid, stage: Number(stageText) };
  });
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

function isContainedPath(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return relativePath === "" || (
    relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}

function canonicalTreeDigestRepositoryRoot(repositoryRoot: string): string {
  try {
    return realpathSync.native(repositoryRoot);
  } catch {
    throw new GitIdentityError("git_metadata_error", "unable to resolve repository root for tree digest");
  }
}

function repositoryPath(repositoryRoot: string, path: string): string {
  const canonicalPath = requireCanonicalRepositoryPath(path);
  const root = canonicalTreeDigestRepositoryRoot(repositoryRoot);
  const logicalPath = resolve(root, ...canonicalPath.split("/"));
  if (!isContainedPath(root, logicalPath)) {
    throw new GitIdentityError("git_metadata_error", `tree-digest path escapes repository root: ${path}`);
  }

  const logicalParent = dirname(logicalPath);
  let realParent: string;
  try {
    realParent = realpathSync.native(logicalParent);
  } catch {
    throw new GitIdentityError(
      "git_metadata_error",
      `unable to resolve tree-digest parent path inside repository: ${path}`,
    );
  }
  if (!isContainedPath(root, realParent)) {
    throw new GitIdentityError(
      "git_metadata_error",
      `tree-digest intermediate path resolves outside repository root: ${path}`,
    );
  }

  // Access the entry through the already-resolved in-repository parent, not through the original
  // Git path. Retargeting an intermediate symlink after this check therefore cannot redirect the
  // subsequent file/symlink operation through that Git-path component.
  return resolve(realParent, basename(logicalPath));
}

/**
 * Resolves a tracked path inside `repositoryRoot`, returning null when any ancestor directory is
 * missing or was replaced by a non-directory (e.g. `rm -rf dir` or `rm -rf dir && touch dir`),
 * while failing closed if any intermediate symlink resolves outside `repositoryRoot`.
 */
export function resolveTrackedCandidatePath(repositoryRoot: string, path: string): string | null {
  const canonicalPath = requireCanonicalRepositoryPath(path);
  const root = canonicalTreeDigestRepositoryRoot(repositoryRoot);
  const segments = canonicalPath.split("/");
  let current = root;
  for (let index = 0; index < segments.length - 1; index += 1) {
    current = resolve(current, segments[index]!);
    const stat = lstatSync(current, { bigint: true, throwIfNoEntry: false });
    if (stat === undefined) return null;
    if (stat.isSymbolicLink()) {
      let realAncestor: string;
      try {
        realAncestor = realpathSync.native(current);
      } catch {
        throw new GitIdentityError(
          "git_metadata_error",
          `unable to resolve tree-digest parent path inside repository: ${path}`,
        );
      }
      if (!isContainedPath(root, realAncestor)) {
        throw new GitIdentityError(
          "git_metadata_error",
          `tree-digest intermediate path resolves outside repository root: ${path}`,
        );
      }
      if (!lstatSync(realAncestor, { bigint: true }).isDirectory()) return null;
      current = realAncestor;
      continue;
    }
    if (!stat.isDirectory()) return null;
  }
  return resolve(current, segments[segments.length - 1]!);
}

export function openContainedRegularFile(
  repositoryRoot: string,
  path: string,
  checkConsistent: typeof isConsistentOpenedWorktreeFile = isConsistentOpenedWorktreeFile,
): { readonly fd: number; readonly mode: bigint } {
  const candidate = repositoryPath(repositoryRoot, path);
  const before = lstatSync(candidate, { bigint: true, throwIfNoEntry: false });
  if (before === undefined || !before.isFile()) {
    throw new GitIdentityError("git_metadata_error", `tree-digest expected a regular file at ${path}`);
  }
  const fd = openSync(candidate, OPEN_CONTAINED_REGULAR_FLAGS);
  try {
    const opened = fstatSync(fd, { bigint: true });
    const root = canonicalTreeDigestRepositoryRoot(repositoryRoot);
    const realFile = realpathSync.native(candidate);
    const after = lstatSync(realFile, { bigint: true });
    if (!checkConsistent({
      contained: isContainedPath(root, realFile),
      beforeDev: before.dev,
      beforeIno: before.ino,
      openedIsFile: opened.isFile(),
      openedDev: opened.dev,
      openedIno: opened.ino,
      afterDev: after.dev,
      afterIno: after.ino,
    })) {
      throw new GitIdentityError("git_metadata_error", `worktree entry changed or escaped while opening: ${path}`);
    }
    return { fd, mode: opened.mode };
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}

function streamHashContainedRegularFile(
  repositoryRoot: string,
  path: string,
): { readonly digest: string; readonly mode: bigint } {
  const { fd, mode } = openContainedRegularFile(repositoryRoot, path);
  try {
    const hash = createHash("sha256");
    const chunk = Buffer.allocUnsafe(64 * 1024);
    for (;;) {
      const bytesRead = readSync(fd, chunk, 0, chunk.length, null);
      if (bytesRead === 0) break;
      hash.update(chunk.subarray(0, bytesRead));
    }
    return { digest: hash.digest("hex"), mode };
  } finally {
    closeSync(fd);
  }
}

function readContainedRegularFile(
  repositoryRoot: string,
  path: string,
): { readonly bytes: Buffer; readonly mode: bigint } {
  const { fd, mode } = openContainedRegularFile(repositoryRoot, path);
  try {
    return { bytes: readAllDescriptorBytes(fd)!, mode };
  } finally {
    closeSync(fd);
  }
}

/**
 * Reads a worktree file as text when it is a regular file that resolves inside
 * the repository and holds at most `maxBytes`. Anything else returns null, so
 * callers can fail closed.
 */
export function readContainedWorktreeText(
  repositoryRoot: string,
  path: string,
  maxBytes: number,
): string | null {
  let fd: number | undefined;
  try {
    fd = openContainedRegularFile(repositoryRoot, path).fd;
    const bytes = readAllDescriptorBytes(fd, maxBytes);
    return bytes === null ? null : bytes.toString("utf8");
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
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

interface GitPathEolAttributes {
  readonly text: string;
  readonly eol: string;
}

function readGitCoreWorktreeConfig(repositoryRoot: string): GitCoreWorktreeConfig {
  const result = runGitTreeMetadata(repositoryRoot, [
    "config",
    "--get-regexp",
    "^core\\.(autocrlf|filemode|symlinks)$",
  ]);
  if (result.error !== undefined || (result.status !== 0 && result.status !== 1)) {
    throw new GitIdentityError("git_metadata_error", "unable to read Git core worktree settings");
  }
  return result.status === 0
    ? parseGitCoreWorktreeConfig(decodeUtf8(result.stdout, "git core config output"))
    : { autocrlf: "false", fileMode: true, symlinks: true };
}

interface ObservedWorktreeEntry {
  readonly present: true;
  readonly type: WorktreeEntryType;
  readonly mode: string;
  readonly rawBytes: Buffer;
  readonly normalizedBytes: Buffer;
  readonly oid: string;
}

type WorktreeObservation =
  | ObservedWorktreeEntry
  | { readonly present: false };

function observeWorktreeTrackedEntry(
  repositoryRoot: string,
  path: string,
  referenceMode: string,
  expectedOid: string,
  attributes: ReadonlyMap<string, GitPathEolAttributes>,
  coreConfig: GitCoreWorktreeConfig,
): WorktreeObservation {
  const candidate = resolveTrackedCandidatePath(repositoryRoot, path);
  if (candidate === null) {
    return { present: false };
  }
  const stat = lstatSync(candidate, { bigint: true, throwIfNoEntry: false });
  if (stat === undefined) {
    return { present: false };
  }

  if (stat.isSymbolicLink()) {
    const rawBytes = readSymlinkTarget(repositoryRoot, path);
    return {
      present: true,
      type: "symlink",
      mode: "120000",
      rawBytes,
      normalizedBytes: rawBytes,
      oid: gitBlobOidForBytes(rawBytes, expectedOid),
    };
  }
  if (!stat.isFile()) {
    throw new GitIdentityError("git_metadata_error", `unsupported worktree entry type at ${path}`);
  }

  const { bytes: rawBytes, mode: modeBits } = readContainedRegularFile(repositoryRoot, path);
  // Under core.symlinks=false (e.g. Windows without symlink privilege), Git materializes 120000
  // entries as regular files holding the symlink target text.
  if (referenceMode === "120000" && !coreConfig.symlinks) {
    return {
      present: true,
      type: "symlink",
      mode: "120000",
      rawBytes,
      normalizedBytes: rawBytes,
      oid: gitBlobOidForBytes(rawBytes, expectedOid),
    };
  }
  const mode = coreConfig.fileMode
    ? ((modeBits & 0o100n) === 0n ? "100644" : "100755")
    : (referenceMode === "100755" ? "100755" : "100644");
  const attr = attributes.get(path) ?? { text: "unspecified", eol: "unspecified" };
  let normalizedBytes = !isBinaryBytes(rawBytes) &&
    shouldNormalizeWorktreeEol(attr.text, attr.eol, coreConfig.autocrlf)
    ? normalizeCrlfToLf(rawBytes)
    : rawBytes;
  let oid = gitBlobOidForBytes(normalizedBytes, expectedOid);
  // Matches Git's `has_cr_in_index` guard: when the indexed/committed blob itself stored CRLF,
  // Git does not treat an identical CRLF worktree checkout as modified under autocrlf/text=auto.
  if (oid !== expectedOid && normalizedBytes !== rawBytes && gitBlobOidForBytes(rawBytes, expectedOid) === expectedOid) {
    normalizedBytes = rawBytes;
    oid = expectedOid;
  }
  return {
    present: true,
    type: "file",
    mode,
    rawBytes,
    normalizedBytes,
    oid,
  };
}

function collectUnstagedEntries(
  repositoryRoot: string,
  index: readonly TreeDigestIndexEntry[],
  attributes: ReadonlyMap<string, GitPathEolAttributes>,
  coreConfig: GitCoreWorktreeConfig,
): TreeDigestUnstagedEntry[] {
  const entries: TreeDigestUnstagedEntry[] = [];
  for (const entry of index) {
    if (entry.stage !== 0) {
      throw new GitIdentityError(
        "git_metadata_error",
        `tree digest does not support unmerged tracked state at ${entry.path}`,
      );
    }
    const indexType = worktreeTypeFromMode(entry.mode, entry.path);
    const observed = observeWorktreeTrackedEntry(
      repositoryRoot,
      entry.path,
      entry.mode,
      entry.oid,
      attributes,
      coreConfig,
    );
    if (!observed.present) {
      entries.push({ path: entry.path, state: "deleted" });
      continue;
    }
    if (observed.type !== indexType) {
      entries.push({
        path: entry.path,
        state: "type_changed",
        type: observed.type,
        mode: observed.mode,
        digest: sha256Bytes(observed.rawBytes),
      });
      continue;
    }
    if (observed.mode !== entry.mode || observed.oid !== entry.oid) {
      entries.push({
        path: entry.path,
        state: "modified",
        type: observed.type,
        mode: observed.mode,
        digest: sha256Bytes(observed.rawBytes),
      });
    }
  }
  return entries;
}

function untrackedWorktreeEntry(repositoryRoot: string, path: string): TreeDigestUntrackedEntry {
  const absolutePath = repositoryPath(repositoryRoot, path);
  try {
    const stat = lstatSync(absolutePath, { bigint: true });
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
      const { digest, mode } = streamHashContainedRegularFile(repositoryRoot, path);
      return {
        path,
        type: "file",
        mode: (mode & 0o100n) === 0n ? "100644" : "100755",
        digest,
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

// A filter attribute makes Git run a driver while reading worktree content. Ascout both refuses
// any repository that configures a filter attribute (or submodule) AND never invokes a Git command
// that reads working-tree file content, eliminating the check-then-use execution window (#591).
function inspectGitAttributesAndRefuseFilters(
  repositoryRoot: string,
  index: readonly TreeDigestIndexEntry[],
  untrackedOutput: Buffer,
  extraPaths: readonly string[] = [],
): Map<string, GitPathEolAttributes> {
  const uniquePaths = new Set<string>();
  for (const entry of index) {
    if (entry.mode === "160000") {
      throw new GitIdentityError(
        "git_metadata_error",
        `refusing to read this repository: ${JSON.stringify(entry.path)} is a Git submodule, which Ascout does not read`,
      );
    }
    uniquePaths.add(entry.path);
  }
  for (const record of splitNullTerminated(untrackedOutput, "git ls-files --others output")) {
    const path = decodeUtf8(record, "git untracked path");
    if (!isAscoutRuntimePath(path)) uniquePaths.add(path);
  }
  for (const path of extraPaths) uniquePaths.add(path);

  const attributes = new Map<string, GitPathEolAttributes>();
  if (uniquePaths.size === 0) return attributes;

  const inputs: Buffer[] = [];
  for (const path of uniquePaths) {
    inputs.push(Buffer.from(path, "utf8"), Buffer.from([0]));
  }
  const records = splitNullTerminated(
    requireSuccessfulGitBuffer(
      runGitTreeMetadata(repositoryRoot, ["check-attr", "-z", "--stdin", "filter", "text", "eol"], Buffer.concat(inputs)),
      "unable to read Git filter attributes",
    ),
    "git check-attr output",
  );
  if (records.length % 3 !== 0) {
    throw new GitIdentityError("git_metadata_error", "Git returned incomplete filter attributes");
  }
  for (let indexPos = 0; indexPos < records.length; indexPos += 3) {
    const path = decodeUtf8(records[indexPos]!, "git filter attribute path");
    const attrName = decodeUtf8(records[indexPos + 1]!, "git attribute name");
    const value = decodeUtf8(records[indexPos + 2]!, "git filter attribute value");
    if (attrName === "filter" && value !== "unspecified" && value !== "unset") {
      throw new GitIdentityError(
        "git_metadata_error",
        `refusing to read this repository: ${JSON.stringify(path)} has a Git filter attribute, and filters can run commands`,
      );
    }
    if (attrName === "text" || attrName === "eol") {
      const current = attributes.get(path) ?? { text: "unspecified", eol: "unspecified" };
      attributes.set(path, attrName === "text" ? { text: value, eol: current.eol } : { text: current.text, eol: value });
    }
  }
  return attributes;
}

function readIndexEntries(repositoryRoot: string): TreeDigestIndexEntry[] {
  return parseIndexEntries(requireSuccessfulGitBuffer(
    runGitTreeMetadata(repositoryRoot, ["ls-files", "--stage", "-v", "-z"]),
    "unable to read Git index for tree digest",
  ));
}

function readUntrackedOutput(repositoryRoot: string): Buffer {
  return requireSuccessfulGitBuffer(
    runGitTreeMetadata(repositoryRoot, ["ls-files", "--others", "--exclude-standard", "-z"]),
    "unable to read untracked Git state for tree digest",
  );
}

function collectTreeDigestV1(repositoryRoot: string): TreeDigestV1 {
  const head = readGitHeadStateInternal(repositoryRoot, defaultGitCommandRunner, false).head_sha;
  const index = readIndexEntries(repositoryRoot);
  const untrackedOutput = readUntrackedOutput(repositoryRoot);
  const attributes = inspectGitAttributesAndRefuseFilters(repositoryRoot, index, untrackedOutput);
  const unstaged = index.length === 0
    ? []
    : collectUnstagedEntries(repositoryRoot, index, attributes, readGitCoreWorktreeConfig(repositoryRoot));
  const untracked = parseUntrackedEntries(repositoryRoot, untrackedOutput);

  return treeDigestV1FromState({ head, index, unstaged, untracked });
}

function sameTreeDigestObservation(left: TreeDigestV1, right: TreeDigestV1): boolean {
  return left.tree_digest === right.tree_digest &&
    left.tracked_index_entry_count === right.tracked_index_entry_count &&
    left.unstaged_changed_count === right.unstaged_changed_count &&
    left.included_untracked_count === right.included_untracked_count;
}

export function readTreeDigestV1(repositoryRoot: string): TreeDigestV1 {
  // Resolve the repository root once so a caller-provided symlink cannot retarget the Git cwd
  // between the two complete observations. Both observations enforce filter refusal and read
  // working-tree files directly via single-open descriptors without spawning Git worktree readers.
  const canonicalRoot = canonicalTreeDigestRepositoryRoot(repositoryRoot);
  const first = collectTreeDigestV1(canonicalRoot);
  const second = collectTreeDigestV1(canonicalRoot);
  if (!sameTreeDigestObservation(first, second)) {
    throw new GitIdentityError(
      "git_metadata_error",
      "source changed during tree-digest collection; refusing a mixed-state digest",
    );
  }
  return second;
}

export type ChangedFileKind =
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "type_changed"
  | "untracked";
export type ChangedLineSemantics = "text" | "binary_or_non_line" | "deleted_only";
export type ChangedNewLineRange = readonly [number, number];

export interface GitChangedFile {
  readonly path: string;
  readonly previous_path?: string;
  readonly change_kind: ChangedFileKind;
  readonly line_semantics: ChangedLineSemantics;
  readonly changed_new_line_ranges: readonly ChangedNewLineRange[];
}

export interface WorkingTreeComparison {
  readonly kind: "working_tree_vs_head";
  readonly base_ref: string;
  readonly includes_staged: true;
  readonly includes_unstaged: true;
  readonly includes_untracked_nonignored: true;
  readonly changed_files: readonly GitChangedFile[];
}

interface CommitTreeEntry {
  readonly path: string;
  readonly mode: string;
  readonly oid: string;
}

function readCommitTreeEntries(repositoryRoot: string, sha: string): Map<string, CommitTreeEntry> {
  const output = requireSuccessfulGitBuffer(
    runGitTreeMetadata(repositoryRoot, ["ls-tree", "-r", "-z", "--full-tree", sha]),
    "unable to read Git commit tree entries",
  );
  const records = splitNullTerminated(output, "git ls-tree output");
  const entries = new Map<string, CommitTreeEntry>();
  for (const record of records) {
    const text = decodeUtf8(record, "git ls-tree record");
    const match = LS_TREE_RECORD.exec(text);
    if (match === null) {
      throw new GitIdentityError("git_metadata_error", "Git returned a malformed commit tree entry");
    }
    const mode = match[1]!;
    const objectType = match[2]!;
    const oid = match[3]!;
    const path = requireCanonicalRepositoryPath(match[4]!);
    if (objectType === "commit") {
      throw new GitIdentityError(
        "git_metadata_error",
        `refusing to read this repository: ${JSON.stringify(path)} is a Git submodule, which Ascout does not read`,
      );
    }
    entries.set(path, { path, mode, oid });
  }
  return entries;
}

function readOdbBlobsBatch(
  repositoryRoot: string,
  oids: readonly string[],
): Map<string, Buffer> {
  const unique = [...new Set(oids)];
  if (unique.length === 0) return new Map();

  const stdin = Buffer.from(unique.map((oid) => `${oid}\n`).join(""), "utf8");
  const stdout = requireSuccessfulGitBuffer(
    runGitTreeMetadata(repositoryRoot, ["cat-file", "--batch"], stdin),
    "unable to read Git object-store blobs",
  );
  const parsed = parseCatFileBatchOutput(stdout, unique);
  if (!parsed.ok) {
    throw new GitIdentityError("git_metadata_error", parsed.reason);
  }
  return parsed.blobs;
}

function streamAnalyzeUntrackedRegularFile(
  repositoryRoot: string,
  path: string,
): { readonly binary: boolean; readonly lineCount: number } {
  const { fd } = openContainedRegularFile(repositoryRoot, path);
  try {
    const chunk = Buffer.allocUnsafe(64 * 1024);
    let inspectedForBinary = 0;
    let totalBytes = 0;
    let newlines = 0;
    let lastByte = 0;
    for (;;) {
      const bytesRead = readSync(fd, chunk, 0, chunk.length, null);
      if (bytesRead === 0) break;
      if (inspectedForBinary < 8000) {
        const sliceEnd = Math.min(bytesRead, 8000 - inspectedForBinary);
        if (chunk.subarray(0, sliceEnd).includes(0)) {
          return { binary: true, lineCount: 0 };
        }
        inspectedForBinary += sliceEnd;
      }
      for (let index = 0; index < bytesRead; index += 1) {
        if (chunk[index] === 0x0a) newlines += 1;
      }
      totalBytes += bytesRead;
      lastByte = chunk[bytesRead - 1]!;
    }
    if (totalBytes === 0) return { binary: false, lineCount: 0 };
    return { binary: false, lineCount: lastByte === 0x0a ? newlines : newlines + 1 };
  } finally {
    closeSync(fd);
  }
}

function untrackedPathToChangedFile(repositoryRoot: string, path: string): GitChangedFile {
  const absolutePath = repositoryPath(repositoryRoot, path);
  let stat;
  try {
    stat = lstatSync(absolutePath, { bigint: true });
  } catch {
    throw new GitIdentityError("git_metadata_error", `unable to inspect untracked diff entry: ${path}`);
  }

  if (stat.isSymbolicLink() || !stat.isFile()) {
    return {
      path,
      change_kind: "untracked",
      line_semantics: "binary_or_non_line",
      changed_new_line_ranges: [],
    };
  }

  const analysis = streamAnalyzeUntrackedRegularFile(repositoryRoot, path);
  if (analysis.binary) {
    return {
      path,
      change_kind: "untracked",
      line_semantics: "binary_or_non_line",
      changed_new_line_ranges: [],
    };
  }
  return {
    path,
    change_kind: "untracked",
    line_semantics: "text",
    changed_new_line_ranges: analysis.lineCount === 0 ? [] : [[1, analysis.lineCount]],
  };
}

function parseNonignoredUntrackedPaths(untrackedOutput: Buffer): string[] {
  return splitNullTerminated(untrackedOutput, "git untracked comparison output")
    .map((record) => requireCanonicalRepositoryPath(decodeUtf8(record, "git untracked comparison path")))
    .filter((path) => !isAscoutRuntimePath(path));
}

function compareChangedFiles(left: GitChangedFile, right: GitChangedFile): number {
  return compareUtf8(left.path, right.path) ||
    compareUtf8(left.previous_path ?? "", right.previous_path ?? "") ||
    compareUtf8(left.change_kind, right.change_kind);
}

interface PendingDeletedTracked {
  readonly head: CommitTreeEntry;
}

interface PendingAddedTracked {
  readonly path: string;
  readonly observed: ObservedWorktreeEntry;
}

interface PendingModifiedTracked {
  readonly path: string;
  readonly head: CommitTreeEntry;
  readonly observed: ObservedWorktreeEntry;
}

export function readWorkingTreeComparison(
  repositoryRoot: string,
  sourceStartHeadSha: string,
): WorkingTreeComparison {
  if (!FULL_GIT_OBJECT_ID.test(sourceStartHeadSha)) {
    throw new GitIdentityError(
      "invalid_head_identity",
      "working-tree comparison requires a full lowercase source-start Git object ID",
    );
  }

  const canonicalRoot = canonicalTreeDigestRepositoryRoot(repositoryRoot);
  const index = readIndexEntries(canonicalRoot);
  const untrackedOutput = readUntrackedOutput(canonicalRoot);
  const observedHead = readGitHeadStateInternal(canonicalRoot, defaultGitCommandRunner, false).head_sha;
  if (observedHead !== sourceStartHeadSha) {
    throw new GitIdentityError(
      "git_metadata_error",
      "working-tree comparison base does not equal the resolved source-start HEAD",
    );
  }
  const headEntries = readCommitTreeEntries(canonicalRoot, sourceStartHeadSha);
  const attributes = inspectGitAttributesAndRefuseFilters(
    canonicalRoot,
    index,
    untrackedOutput,
    [...headEntries.keys()],
  );
  const coreConfig = readGitCoreWorktreeConfig(canonicalRoot);

  const indexMap = new Map<string, TreeDigestIndexEntry>();
  for (const entry of index) {
    if (entry.stage !== 0) {
      throw new GitIdentityError("git_metadata_error", "working-tree diff does not support unmerged state");
    }
    indexMap.set(entry.path, entry);
  }

  const trackedChanges: GitChangedFile[] = [];
  const pendingDeleted: PendingDeletedTracked[] = [];
  const pendingAdded: PendingAddedTracked[] = [];
  const pendingModified: PendingModifiedTracked[] = [];

  for (const [path, head] of headEntries) {
    const indexEntry = indexMap.get(path);
    if (indexEntry === undefined) {
      pendingDeleted.push({ head });
      continue;
    }
    const observed = observeWorktreeTrackedEntry(
      canonicalRoot,
      path,
      indexEntry.mode,
      head.oid,
      attributes,
      coreConfig,
    );
    if (!observed.present) {
      pendingDeleted.push({ head });
      continue;
    }
    const headType = worktreeTypeFromMode(head.mode, path);
    if (observed.type !== headType) {
      trackedChanges.push({
        path,
        change_kind: "type_changed",
        line_semantics: "binary_or_non_line",
        changed_new_line_ranges: [],
      });
      continue;
    }
    if (observed.oid !== head.oid || observed.mode !== head.mode) {
      pendingModified.push({ path, head, observed });
    }
  }

  for (const [path, entry] of indexMap) {
    if (headEntries.has(path)) continue;
    const observed = observeWorktreeTrackedEntry(
      canonicalRoot,
      path,
      entry.mode,
      entry.oid,
      attributes,
      coreConfig,
    );
    if (!observed.present) continue;
    pendingAdded.push({ path, observed });
  }

  // Rename detection matching Git's default --find-renames (50% threshold): exact OID match first,
  // then byte-weighted line similarity on regular files.
  const matchedDeleted = new Set<string>();
  const matchedAdded = new Set<string>();
  const renamedPairs: { readonly oldEntry: CommitTreeEntry; readonly added: PendingAddedTracked; readonly exact: boolean }[] = [];

  for (const added of pendingAdded) {
    if (added.observed.oid === EMPTY_BLOB_SHA1 || added.observed.oid === EMPTY_BLOB_SHA256) continue;
    const exact = pendingDeleted.find(
      (del) => !matchedDeleted.has(del.head.path) &&
        del.head.oid === added.observed.oid &&
        worktreeTypeFromMode(del.head.mode, del.head.path) === added.observed.type,
    );
    if (exact !== undefined) {
      matchedDeleted.add(exact.head.path);
      matchedAdded.add(added.path);
      renamedPairs.push({ oldEntry: exact.head, added, exact: true });
    }
  }

  const remainingDeletedRegular = pendingDeleted.filter(
    (del) => !matchedDeleted.has(del.head.path) && del.head.mode !== "120000",
  );
  const remainingAddedRegular = pendingAdded.filter(
    (add) => !matchedAdded.has(add.path) && add.observed.type === "file",
  );

  const oidsNeeded: string[] = [
    ...pendingModified.filter((item) => item.observed.type === "file").map((item) => item.head.oid),
  ];
  const hasFuzzyCandidates = remainingDeletedRegular.length > 0 && remainingAddedRegular.length > 0;
  if (hasFuzzyCandidates) {
    for (const del of remainingDeletedRegular) oidsNeeded.push(del.head.oid);
  }
  const odbBlobs = readOdbBlobsBatch(canonicalRoot, oidsNeeded);

  if (hasFuzzyCandidates) {
    const deletedByPath = new Map(remainingDeletedRegular.map((del) => [del.head.path, del]));
    const addedByPath = new Map(remainingAddedRegular.map((add) => [add.path, add]));
    for (const match of matchFuzzyRenames(
      remainingDeletedRegular.map((del) => ({ path: del.head.path, bytes: odbBlobs.get(del.head.oid)! })),
      remainingAddedRegular.map((add) => ({ path: add.path, bytes: add.observed.normalizedBytes })),
    )) {
      matchedDeleted.add(match.oldPath);
      matchedAdded.add(match.newPath);
      renamedPairs.push({
        oldEntry: deletedByPath.get(match.oldPath)!.head,
        added: addedByPath.get(match.newPath)!,
        exact: false,
      });
    }
  }

  for (const pair of renamedPairs) {
    if (pair.added.observed.type === "symlink") {
      trackedChanges.push({
        path: pair.added.path,
        previous_path: pair.oldEntry.path,
        change_kind: "renamed",
        line_semantics: "binary_or_non_line",
        changed_new_line_ranges: [],
      });
      continue;
    }
    if (pair.exact) {
      const binary = isBinaryBytes(pair.added.observed.normalizedBytes);
      trackedChanges.push({
        path: pair.added.path,
        previous_path: pair.oldEntry.path,
        change_kind: "renamed",
        line_semantics: binary ? "binary_or_non_line" : "text",
        changed_new_line_ranges: [],
      });
      continue;
    }
    const oldBytes = odbBlobs.get(pair.oldEntry.oid)!;
    const newBytes = pair.added.observed.normalizedBytes;
    trackedChanges.push({
      path: pair.added.path,
      previous_path: pair.oldEntry.path,
      change_kind: "renamed",
      line_semantics: "text",
      changed_new_line_ranges: changedNewLineRangesFromBytes(oldBytes, newBytes),
    });
  }

  for (const del of pendingDeleted) {
    if (matchedDeleted.has(del.head.path)) continue;
    trackedChanges.push({
      path: del.head.path,
      change_kind: "deleted",
      line_semantics: "deleted_only",
      changed_new_line_ranges: [],
    });
  }

  for (const added of pendingAdded) {
    if (matchedAdded.has(added.path)) continue;
    if (added.observed.type === "symlink" || isBinaryBytes(added.observed.normalizedBytes)) {
      trackedChanges.push({
        path: added.path,
        change_kind: "added",
        line_semantics: "binary_or_non_line",
        changed_new_line_ranges: [],
      });
      continue;
    }
    const lineCount = splitLinesForDiff(added.observed.normalizedBytes).length;
    trackedChanges.push({
      path: added.path,
      change_kind: "added",
      line_semantics: "text",
      changed_new_line_ranges: lineCount === 0 ? [] : [[1, lineCount]],
    });
  }

  for (const mod of pendingModified) {
    if (mod.observed.type === "symlink") {
      trackedChanges.push({
        path: mod.path,
        change_kind: "modified",
        line_semantics: "binary_or_non_line",
        changed_new_line_ranges: [],
      });
      continue;
    }
    const oldBytes = odbBlobs.get(mod.head.oid)!;
    const newBytes = mod.observed.normalizedBytes;
    const binary = isBinaryBytes(oldBytes) || isBinaryBytes(newBytes);
    trackedChanges.push({
      path: mod.path,
      change_kind: "modified",
      line_semantics: binary ? "binary_or_non_line" : "text",
      changed_new_line_ranges: binary ? [] : changedNewLineRangesFromBytes(oldBytes, newBytes),
    });
  }

  const untracked = parseNonignoredUntrackedPaths(untrackedOutput)
    .map((path) => untrackedPathToChangedFile(canonicalRoot, path));

  return {
    kind: "working_tree_vs_head",
    base_ref: sourceStartHeadSha,
    includes_staged: true,
    includes_unstaged: true,
    includes_untracked_nonignored: true,
    changed_files: [...trackedChanges, ...untracked].sort(compareChangedFiles),
  };
}

export interface StagedChangedPath {
  readonly path: string;
  readonly change_kind: ChangedFileKind;
}

const STAGED_STATUS_KINDS: Readonly<Record<string, ChangedFileKind>> = {
  A: "added",
  M: "modified",
  D: "deleted",
  T: "type_changed",
};

/**
 * Returns which of `paths` are untracked and ignored by Git. The working-tree comparison
 * leaves such files out, so their absence from it doesn't mean they are unchanged.
 */
export function readUntrackedIgnoredPaths(
  repositoryRoot: string,
  paths: readonly string[],
): readonly string[] {
  if (paths.length === 0) return [];
  const records = splitNullTerminated(
    requireSuccessfulGitBuffer(
      runGitTreeMetadata(repositoryRoot, [
        "--literal-pathspecs", "ls-files", "-z", "--others", "--ignored", "--exclude-standard", "--", ...paths,
      ]),
      "unable to read ignored untracked paths",
    ),
    "git ignored untracked path output",
  );
  return records.map((record) => requireCanonicalRepositoryPath(decodeUtf8(record, "git ignored untracked path")));
}

export function readStagedChangedPaths(
  repositoryRoot: string,
  headSha: string,
): readonly StagedChangedPath[] {
  if (!FULL_GIT_OBJECT_ID.test(headSha)) {
    throw new GitIdentityError("git_metadata_error", "unable to read staged paths for an invalid HEAD");
  }
  const records = splitNullTerminated(
    requireSuccessfulGitBuffer(
      runGitTreeMetadata(repositoryRoot, ["diff", "--cached", "--no-ext-diff", "--no-textconv", "--no-renames", "--name-status", "-z", headSha, "--"]),
      "unable to read staged paths",
    ),
    "git staged path output",
  );
  if (records.length % 2 !== 0) {
    throw new GitIdentityError("git_metadata_error", "unable to parse staged paths");
  }
  const entries: StagedChangedPath[] = [];
  for (let index = 0; index < records.length; index += 2) {
    const changeKind = STAGED_STATUS_KINDS[decodeUtf8(records[index]!, "git staged status")];
    if (changeKind === undefined) {
      throw new GitIdentityError("git_metadata_error", "unable to parse staged paths");
    }
    const path = requireCanonicalRepositoryPath(decodeUtf8(records[index + 1]!, "git staged path"));
    if (!isAscoutRuntimePath(path)) {
      entries.push({ path, change_kind: changeKind });
    }
  }
  return entries;
}

export function readRepositoryPrefix(repositoryRoot: string): string {
  const output = requireSuccessfulGitBuffer(
    runGitTreeMetadata(repositoryRoot, ["rev-parse", "--show-prefix"]),
    "not inside a Git work tree, or Git could not be run",
  );
  return stripOneTerminalNewline(decodeUtf8(output, "git repository prefix"));
}

// Commands call this before any read that a repository could steer. From a subdirectory, Git
// lists only that subdirectory but diffs the whole tree, so the filter check would
// miss paths. A promisor remote can run a configured command for a missing object,
// and repository config can reopen transports, so these aren't left to overrides.
export function refuseUnsupportedRepository(repositoryRoot: string): void {
  if (readRepositoryPrefix(repositoryRoot) !== "") {
    throw new GitIdentityError("git_metadata_error", "Ascout must run from the repository root.");
  }
  const promisor = runGitTreeMetadata(repositoryRoot, [
    "config",
    "--get-regexp",
    "^(extensions\\.partialclone|remote\\..*\\.(promisor|partialclonefilter))$",
  ]);
  if (promisor.error !== undefined || (promisor.status !== 0 && promisor.status !== 1)) {
    throw new GitIdentityError("git_metadata_error", "unable to read Git partial clone settings");
  }
  if (promisor.status === 0) {
    throw new GitIdentityError(
      "git_metadata_error",
      "refusing to read this repository: partial clones and promisor remotes can run commands",
    );
  }
}

/**
 * True when the working tree holds exactly the content of `sha`: no tracked difference and no
 * untracked, non-ignored file. The GitHub collect job uses it after a soft reset to the merge base,
 * so the bundle can name the PR head while review sees the PR's changes. This guards honesty, not
 * trust: on a pull request, the PR itself authored the code that runs this check.
 */
export function worktreeMatchesCommitV1(repositoryRoot: string, sha: string): boolean {
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(sha)) return false;
  const canonicalRoot = canonicalTreeDigestRepositoryRoot(repositoryRoot);
  refuseUnsupportedRepository(canonicalRoot);
  const index = readIndexEntries(canonicalRoot);
  const untrackedOutput = readUntrackedOutput(canonicalRoot);
  const commitEntries = readCommitTreeEntries(canonicalRoot, sha);
  const attributes = inspectGitAttributesAndRefuseFilters(
    canonicalRoot,
    index,
    untrackedOutput,
    [...commitEntries.keys()],
  );
  if (untrackedOutput.byteLength !== 0) return false;
  if (index.some((entry) => entry.stage !== 0)) return false;
  if (index.length !== commitEntries.size) return false;
  const coreConfig = readGitCoreWorktreeConfig(canonicalRoot);
  for (const entry of index) {
    const expected = commitEntries.get(entry.path);
    if (expected === undefined) return false;
    const observed = observeWorktreeTrackedEntry(
      canonicalRoot,
      entry.path,
      entry.mode,
      expected.oid,
      attributes,
      coreConfig,
    );
    if (!observed.present || observed.mode !== expected.mode || observed.oid !== expected.oid) {
      return false;
    }
  }
  return true;
}
