import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  GitIdentityError,
  type GitCommandRunner,
  readGitHeadState,
  repositoryIdentityFromLocalPath,
  repositoryIdentityFromRemote,
} from "../src/git.js";

const HTTPS_HASH = "e9497c38e4fa38f1fa5c4be8b0c9af80f65802497625efe8628a0c210f05ff16";
const SSH_HASH = "396165d0807ee9ac398f21e22a1adfd912664fe71924c4551b9ef2919ebeaca4";
const IPV6_SSH_HASH = "6f0c0d33f2a51bb994542be183462dbea3e60527cd2644fb3cde387a4772f823";
const SHA256_HEAD = "0123456789abcdef".repeat(4);
const temporaryDirectories: string[] = [];

function makeTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "ascout-t018-"));
  temporaryDirectories.push(directory);
  return directory;
}

function git(repositoryRoot: string, argv: readonly string[]): string {
  return execFileSync("git", [...argv], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
  });
}

function initRepository(repositoryRoot: string): void {
  mkdirSync(repositoryRoot, { recursive: true });
  git(repositoryRoot, ["init", "-q"]);
}

function commitEmpty(repositoryRoot: string): void {
  git(repositoryRoot, [
    "-c",
    "user.name=Ascout Test",
    "-c",
    "user.email=ascout@example.invalid",
    "commit",
    "--allow-empty",
    "-m",
    "fixture",
    "-q",
  ]);
}

function persistedStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((entry) => persistedStrings(entry));
  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap((entry) => persistedStrings(entry));
  }
  return [];
}

function expectNoPersistedMaterial(value: unknown, forbidden: readonly string[]): void {
  const strings = persistedStrings(value);
  for (const material of forbidden) {
    for (const persisted of strings) {
      expect(persisted).not.toContain(material);
    }
  }
}

function expectGitIdentityErrorCode(operation: () => unknown, code: string): void {
  try {
    operation();
    throw new Error(`expected GitIdentityError(${code})`);
  } catch (error) {
    expect(error).toBeInstanceOf(GitIdentityError);
    expect((error as GitIdentityError).code).toBe(code);
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("T018 repository identity implementation", () => {
  it("matches the T012 HTTPS golden while removing credentials/query/fragment from persisted identity", () => {
    const raw = "https://alice:FAKE_PASSWORD@example.COM/org/repo.git?token=QUERY_SECRET#private-fragment";
    const identity = repositoryIdentityFromRemote(raw);

    expect(identity).toEqual({
      repository_id: `remote:${HTTPS_HASH}`,
      repository_id_kind: "remote",
      portable: true,
    });
    expectNoPersistedMaterial(identity, [
      raw,
      "alice",
      "FAKE_PASSWORD",
      "QUERY_SECRET",
      "private-fragment",
      "https://example.com/org/repo.git",
    ]);
  });

  it("matches the T012 SSH/scp golden and strips userinfo", () => {
    const ssh = repositoryIdentityFromRemote(
      "ssh://git:SSH_SECRET@Example.COM/org/repo.git?credential=QUERY_SECRET#fragment",
    );
    const scpGit = repositoryIdentityFromRemote("git@Example.COM:org/repo.git");
    const scpDeploy = repositoryIdentityFromRemote("deploy@example.com:org/repo.git");

    expect(ssh).toEqual({
      repository_id: `remote:${SSH_HASH}`,
      repository_id_kind: "remote",
      portable: true,
    });
    expect(scpGit).toEqual(ssh);
    expect(scpDeploy).toEqual(ssh);
    expectNoPersistedMaterial(ssh, ["git", "SSH_SECRET", "QUERY_SECRET", "fragment"]);
  });

  it("keeps bracketed IPv6 canonical for scheme-based SSH URLs", () => {
    const identity = repositoryIdentityFromRemote(
      "ssh://git:SECRET@[2001:DB8::1]/org/repo.git?token=QUERY#fragment",
    );

    expect(identity).toEqual({
      repository_id: `remote:${IPV6_SSH_HASH}`,
      repository_id_kind: "remote",
      portable: true,
    });
    expectNoPersistedMaterial(identity, ["git", "SECRET", "QUERY", "fragment"]);
  });

  it("preserves meaningful remote port/path distinctions and rejects unsupported or ambiguous grammars", () => {
    const one = repositoryIdentityFromRemote("ssh://alice:one@example.com:2222/Org/Repo.git?x=1#one");
    const same = repositoryIdentityFromRemote("ssh://bob:two@EXAMPLE.COM:2222/Org/Repo.git?x=2#two");
    const differentPort = repositoryIdentityFromRemote("ssh://alice:one@example.com:2200/Org/Repo.git");
    const differentPath = repositoryIdentityFromRemote("ssh://alice:one@example.com:2222/org/repo.git");

    expect(one).toEqual(same);
    expect(one.repository_id).not.toBe(differentPort.repository_id);
    expect(one.repository_id).not.toBe(differentPath.repository_id);

    for (const unsupported of [
      "file:///tmp/repo",
      "ftp://user:pass@example.com/repo.git",
      "ssh:///repo.git",
      "not a remote",
      "example.com/path/without-scp-colon",
      "git@[2001:db8::1]:org/repo.git",
      "git@example.com:/org/repo.git",
      "example.com:/org/repo.git",
      "C:/work/repo",
      "C:\\work\\repo",
      "C:work/repo",
    ]) {
      expect(() => repositoryIdentityFromRemote(unsupported)).toThrow(GitIdentityError);
    }
  });

  it("hashes the canonical real local path and never returns raw path material", () => {
    const root = makeTemporaryDirectory();
    const repositoryRoot = join(root, "repo");
    const nested = join(repositoryRoot, "nested");
    mkdirSync(nested, { recursive: true });

    const alias = join(nested, "..");
    const canonical = realpathSync.native(repositoryRoot);
    const fromAlias = repositoryIdentityFromLocalPath(alias);
    const fromCanonical = repositoryIdentityFromLocalPath(canonical);

    expect(fromAlias).toEqual(fromCanonical);
    expect(fromAlias.repository_id).toMatch(/^local:[a-f0-9]{64}$/);
    expect(fromAlias.repository_id_kind).toBe("local_only");
    expect(fromAlias.portable).toBe(false);
    expectNoPersistedMaterial(fromAlias, [root, repositoryRoot, alias, canonical]);
  });

  it("rejects a local repository path that cannot resolve to a real path", () => {
    const missing = join(makeTemporaryDirectory(), "missing");
    expectGitIdentityErrorCode(() => repositoryIdentityFromLocalPath(missing), "invalid_repository_path");
  });
});

describe("T018 HEAD identity implementation", () => {
  it("rejects an unborn repository before any normal source identity can be claimed", () => {
    const repositoryRoot = join(makeTemporaryDirectory(), "repo");
    initRepository(repositoryRoot);

    expectGitIdentityErrorCode(() => readGitHeadState(repositoryRoot), "unborn_head");
  });

  it("returns the exact full HEAD object ID and attached/detached state from a real repository", () => {
    const repositoryRoot = join(makeTemporaryDirectory(), "repo");
    initRepository(repositoryRoot);
    commitEmpty(repositoryRoot);

    const expectedHead = git(repositoryRoot, ["rev-parse", "HEAD"]).trimEnd();
    const attached = readGitHeadState(repositoryRoot);

    expect(attached).toEqual({
      head_sha: expectedHead,
      detached: false,
      shallow: false,
    });
    expect(attached.head_sha).toMatch(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);

    git(repositoryRoot, ["checkout", "--detach", "-q"]);
    expect(readGitHeadState(repositoryRoot)).toEqual({
      head_sha: expectedHead,
      detached: true,
      shallow: false,
    });
  });

  it("accepts a full lowercase 64-hex HEAD and reports shallow state without abbreviating it", () => {
    const calls: string[] = [];
    const runner: GitCommandRunner = (_repositoryRoot, argv) => {
      const command = argv.join(" ");
      calls.push(command);
      if (command === "rev-parse --is-inside-work-tree") {
        return { status: 0, stdout: "true\n", stderr: "" };
      }
      if (command === "rev-parse --verify HEAD^{commit}") {
        return { status: 0, stdout: `${SHA256_HEAD}\n`, stderr: "" };
      }
      if (command === "symbolic-ref -q HEAD") {
        return { status: 1, stdout: "", stderr: "" };
      }
      if (command === "rev-parse --is-shallow-repository") {
        return { status: 0, stdout: "true\n", stderr: "" };
      }
      throw new Error(`unexpected Git argv: ${command}`);
    };

    expect(readGitHeadState("/fixture/repo", runner)).toEqual({
      head_sha: SHA256_HEAD,
      detached: true,
      shallow: true,
    });
    expect(calls).toEqual([
      "rev-parse --is-inside-work-tree",
      "rev-parse --verify HEAD^{commit}",
      "symbolic-ref -q HEAD",
      "rev-parse --is-shallow-repository",
    ]);
  });

  it("rejects abbreviated, uppercase, symbolic, or otherwise malformed resolved HEAD output", () => {
    for (const headOutput of [
      "0123456789ab\n",
      `${"a".repeat(40).toUpperCase()}\n`,
      "HEAD\n",
      `${"a".repeat(40)} extra\n`,
    ]) {
      const runner: GitCommandRunner = (_repositoryRoot, argv) => {
        const command = argv.join(" ");
        if (command === "rev-parse --is-inside-work-tree") {
          return { status: 0, stdout: "true\n", stderr: "" };
        }
        if (command === "rev-parse --verify HEAD^{commit}") {
          return { status: 0, stdout: headOutput, stderr: "" };
        }
        throw new Error(`unexpected Git argv after invalid HEAD: ${command}`);
      };

      expectGitIdentityErrorCode(() => readGitHeadState("/fixture/repo", runner), "invalid_head_identity");
    }
  });

  it("does not misclassify runner failure or an existing-but-unresolvable HEAD ref as unborn", () => {
    const runnerFailure: GitCommandRunner = (_repositoryRoot, argv) => {
      const command = argv.join(" ");
      if (command === "rev-parse --is-inside-work-tree") {
        return { status: 0, stdout: "true\n", stderr: "" };
      }
      if (command === "rev-parse --verify HEAD^{commit}") {
        return { status: null, stdout: "", stderr: "", error: new Error("timeout") };
      }
      throw new Error(`unexpected Git argv after runner failure: ${command}`);
    };
    expectGitIdentityErrorCode(
      () => readGitHeadState("/fixture/repo", runnerFailure),
      "git_metadata_error",
    );

    const existingBrokenRef: GitCommandRunner = (_repositoryRoot, argv) => {
      const command = argv.join(" ");
      if (command === "rev-parse --is-inside-work-tree") {
        return { status: 0, stdout: "true\n", stderr: "" };
      }
      if (command === "rev-parse --verify HEAD^{commit}") {
        return { status: 128, stdout: "", stderr: "fatal" };
      }
      if (command === "symbolic-ref -q HEAD") {
        return { status: 0, stdout: "refs/heads/main\n", stderr: "" };
      }
      if (command === "show-ref --verify --quiet refs/heads/main") {
        return { status: 0, stdout: "", stderr: "" };
      }
      throw new Error(`unexpected Git argv for broken ref: ${command}`);
    };
    expectGitIdentityErrorCode(
      () => readGitHeadState("/fixture/repo", existingBrokenRef),
      "git_metadata_error",
    );
  });

  it("fails closed when Git metadata cannot establish repository, detached, or shallow state", () => {
    const notRepository: GitCommandRunner = () => ({ status: 128, stdout: "", stderr: "fatal" });
    expect(() => readGitHeadState("/fixture/repo", notRepository)).toThrow(GitIdentityError);

    const badDetached: GitCommandRunner = (_repositoryRoot, argv) => {
      const command = argv.join(" ");
      if (command === "rev-parse --is-inside-work-tree") {
        return { status: 0, stdout: "true\n", stderr: "" };
      }
      if (command === "rev-parse --verify HEAD^{commit}") {
        return { status: 0, stdout: `${"a".repeat(40)}\n`, stderr: "" };
      }
      if (command === "symbolic-ref -q HEAD") {
        return { status: 2, stdout: "", stderr: "unexpected" };
      }
      throw new Error(command);
    };
    expect(() => readGitHeadState("/fixture/repo", badDetached)).toThrow(GitIdentityError);

    const badShallow: GitCommandRunner = (_repositoryRoot, argv) => {
      const command = argv.join(" ");
      if (command === "rev-parse --is-inside-work-tree") {
        return { status: 0, stdout: "true\n", stderr: "" };
      }
      if (command === "rev-parse --verify HEAD^{commit}") {
        return { status: 0, stdout: `${"a".repeat(40)}\n`, stderr: "" };
      }
      if (command === "symbolic-ref -q HEAD") {
        return { status: 0, stdout: "refs/heads/main\n", stderr: "" };
      }
      if (command === "rev-parse --is-shallow-repository") {
        return { status: 0, stdout: "unknown\n", stderr: "" };
      }
      throw new Error(command);
    };
    expect(() => readGitHeadState("/fixture/repo", badShallow)).toThrow(GitIdentityError);
  });
});
