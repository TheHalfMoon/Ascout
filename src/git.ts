import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
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
const FULL_GIT_OBJECT_ID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
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

    if (protocol === "https:") {
      return `https://${host}${port}${parsed.pathname}`;
    }
    if (protocol === "ssh:") {
      return `ssh://${host}${port}${parsed.pathname}`;
    }
    throw new GitIdentityError("unsupported_remote", `unsupported remote protocol: ${protocol}`);
  }

  const scpLike = /^(?:[^@/:]+@)?([^:/?#]+):([^?#]+)$/.exec(rawRemote);
  if (scpLike === null) {
    throw new GitIdentityError("unsupported_remote", "unsupported remote identity form");
  }

  const host = scpLike[1];
  const path = scpLike[2];
  if (host === undefined || path === undefined) {
    throw new GitIdentityError("unsupported_remote", "unsupported remote identity form");
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
  if (headResult.error !== undefined || headResult.status !== 0) {
    throw new GitIdentityError("unborn_head", "M1 check requires an existing Git HEAD commit");
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
