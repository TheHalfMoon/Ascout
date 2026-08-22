import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";

type RepositoryIdentity =
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

const HTTPS_NORMALIZED = "https://example.com/org/repo.git";
const HTTPS_HASH = "e9497c38e4fa38f1fa5c4be8b0c9af80f65802497625efe8628a0c210f05ff16";
const SSH_NORMALIZED = "ssh://example.com/org/repo.git";
const SSH_HASH = "396165d0807ee9ac398f21e22a1adfd912664fe71924c4551b9ef2919ebeaca4";
const LOCAL_CANONICAL_GOLDEN = "/canonical/example/repo";
const LOCAL_HASH = "420baf67bf3f3517440004fc4d34b7e6c6894e04bd73e2bf431ceaf508e2ed01";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function stripUrlAuthoritySecrets(rawRemote: string): URL {
  const parsed = new URL(rawRemote);
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
    throw new Error(`unsupported remote protocol: ${protocol}`);
  }

  const scpLike = /^(?:[^@/:]+@)?([^:/?#]+):([^?#]+)$/.exec(rawRemote);
  if (scpLike === null) throw new Error("unsupported remote identity form");

  const host = scpLike[1]!.toLowerCase();
  const path = scpLike[2]!;
  return `ssh://${host}/${path}`;
}

function remoteRepositoryIdentity(rawRemote: string): RepositoryIdentity {
  const normalized = normalizeRemoteIdentity(rawRemote);
  return {
    repository_id: `remote:${sha256(normalized)}`,
    repository_id_kind: "remote",
    portable: true,
  };
}

function localRepositoryIdentityFromCanonicalPath(canonicalRealPath: string): RepositoryIdentity {
  return {
    repository_id: `local:${sha256(canonicalRealPath)}`,
    repository_id_kind: "local_only",
    portable: false,
  };
}

function localRepositoryIdentity(rawPath: string): RepositoryIdentity {
  return localRepositoryIdentityFromCanonicalPath(realpathSync.native(rawPath));
}

function expectOpaqueIdentity(identity: RepositoryIdentity): void {
  if (identity.repository_id_kind === "remote") {
    expect(identity.repository_id).toMatch(/^remote:[a-f0-9]{64}$/);
    expect(identity.portable).toBe(true);
    return;
  }

  expect(identity.repository_id).toMatch(/^local:[a-f0-9]{64}$/);
  expect(identity.portable).toBe(false);
}

describe("T012 repository identity contract", () => {
  it("removes HTTPS credentials, query, and fragment before hashing", () => {
    const rawA = "https://alice:ghp_SUPER_SECRET@example.COM/org/repo.git?token=QUERY_SECRET#private-fragment";
    const rawB = "https://bob:DIFFERENT_SECRET@example.com/org/repo.git?auth=OTHER_SECRET#other-fragment";

    expect(normalizeRemoteIdentity(rawA)).toBe(HTTPS_NORMALIZED);
    expect(normalizeRemoteIdentity(rawB)).toBe(HTTPS_NORMALIZED);
    expect(sha256(HTTPS_NORMALIZED)).toBe(HTTPS_HASH);

    const identityA = remoteRepositoryIdentity(rawA);
    const identityB = remoteRepositoryIdentity(rawB);
    expect(identityA).toEqual({
      repository_id: `remote:${HTTPS_HASH}`,
      repository_id_kind: "remote",
      portable: true,
    });
    expect(identityB).toEqual(identityA);
    expectOpaqueIdentity(identityA);

    const persisted = JSON.stringify(identityA);
    for (const forbidden of [
      rawA,
      "alice",
      "ghp_SUPER_SECRET",
      "QUERY_SECRET",
      "private-fragment",
      HTTPS_NORMALIZED,
    ]) {
      expect(persisted).not.toContain(forbidden);
    }
  });

  it("removes SSH URL userinfo/query/fragment and normalizes host before hashing", () => {
    const raw = "ssh://git:SSH_SECRET@Example.COM/org/repo.git?credential=QUERY_SECRET#private-fragment";

    expect(normalizeRemoteIdentity(raw)).toBe(SSH_NORMALIZED);
    expect(sha256(SSH_NORMALIZED)).toBe(SSH_HASH);

    const identity = remoteRepositoryIdentity(raw);
    expect(identity).toEqual({
      repository_id: `remote:${SSH_HASH}`,
      repository_id_kind: "remote",
      portable: true,
    });
    expectOpaqueIdentity(identity);

    const persisted = JSON.stringify(identity);
    for (const forbidden of [raw, "git", "SSH_SECRET", "QUERY_SECRET", "private-fragment", SSH_NORMALIZED]) {
      expect(persisted).not.toContain(forbidden);
    }
  });

  it("removes scp-like userinfo and gives equivalent SSH/scp repository identity", () => {
    const scpGitUser = "git@Example.COM:org/repo.git";
    const scpDeployUser = "deploy@example.com:org/repo.git";
    const sshUrl = "ssh://git@example.com/org/repo.git";

    expect(normalizeRemoteIdentity(scpGitUser)).toBe(SSH_NORMALIZED);
    expect(normalizeRemoteIdentity(scpDeployUser)).toBe(SSH_NORMALIZED);
    expect(normalizeRemoteIdentity(sshUrl)).toBe(SSH_NORMALIZED);

    const identity = remoteRepositoryIdentity(scpGitUser);
    expect(identity.repository_id).toBe(`remote:${SSH_HASH}`);
    expect(remoteRepositoryIdentity(scpDeployUser)).toEqual(identity);
    expect(remoteRepositoryIdentity(sshUrl)).toEqual(identity);
    expectOpaqueIdentity(identity);

    const persisted = JSON.stringify(identity);
    expect(persisted).not.toContain(scpGitUser);
    expect(persisted).not.toContain("git@");
    expect(persisted).not.toContain("deploy@");
    expect(persisted).not.toContain(SSH_NORMALIZED);
  });

  it("keeps meaningful remote path and non-default port identity while discarding secrets", () => {
    const a = remoteRepositoryIdentity("ssh://alice:one@example.com:2222/Org/Repo.git?x=1#one");
    const b = remoteRepositoryIdentity("ssh://bob:two@EXAMPLE.COM:2222/Org/Repo.git?x=2#two");
    const differentPort = remoteRepositoryIdentity("ssh://alice:one@example.com:2200/Org/Repo.git");
    const differentPath = remoteRepositoryIdentity("ssh://alice:one@example.com:2222/org/repo.git");

    expect(a).toEqual(b);
    expect(a.repository_id).not.toBe(differentPort.repository_id);
    expect(a.repository_id).not.toBe(differentPath.repository_id);
  });

  it("pins the local canonical-path hash shape and non-portability", () => {
    expect(sha256(LOCAL_CANONICAL_GOLDEN)).toBe(LOCAL_HASH);

    const identity = localRepositoryIdentityFromCanonicalPath(LOCAL_CANONICAL_GOLDEN);
    expect(identity).toEqual({
      repository_id: `local:${LOCAL_HASH}`,
      repository_id_kind: "local_only",
      portable: false,
    });
    expectOpaqueIdentity(identity);
    expect(JSON.stringify(identity)).not.toContain(LOCAL_CANONICAL_GOLDEN);
  });

  it("hashes the real canonical local path so lexical aliases collapse without persisting raw paths", () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-t012-"));
    try {
      const repo = join(root, "repo");
      const nested = join(repo, "nested");
      mkdirSync(nested, { recursive: true });

      const alias = join(nested, "..");
      const canonical = realpathSync.native(repo);
      const fromAlias = localRepositoryIdentity(alias);
      const fromCanonical = localRepositoryIdentity(canonical);

      expect(fromAlias).toEqual(fromCanonical);
      expect(fromAlias.repository_id).toBe(`local:${sha256(canonical)}`);
      expectOpaqueIdentity(fromAlias);

      const persisted = JSON.stringify(fromAlias);
      expect(persisted).not.toContain(root);
      expect(persisted).not.toContain(repo);
      expect(persisted).not.toContain(alias);
      expect(persisted).not.toContain(canonical);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects unsupported remote grammars rather than inventing a persistent identity", () => {
    for (const raw of [
      "file:///tmp/repo",
      "ftp://user:pass@example.com/repo.git",
      "not a remote",
      "example.com/path/without-scp-colon",
    ]) {
      expect(() => remoteRepositoryIdentity(raw)).toThrow();
    }
  });
});
