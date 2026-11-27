import { execFileSync } from "node:child_process";
import { closeSync, linkSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runCheck } from "../src/check.js";
import { runCli } from "../src/cli.js";
import { writePackageNodeCommandShim } from "./helpers/native-command-shim.js";
import {
  CAS_MAX_OBJECT_BYTES,
  casObjectPathV1,
  casObjectsRootV1,
  commitCasTempFileV1,
  deleteCasObjectV1,
  ensureContainedPhysicalDirV1,
  getCasObjectV1,
  isConsistentRegularDescriptorV1,
  isValidSha256HexV1,
  listCasDigestsV1,
  putCasObjectV1,
  readBoundedFdV1,
  readBoundedRegularFileV1,
  redactEvidenceTextV1,
  sha256HexV1,
  writeAtomicSafeRegularFileV1,
} from "../src/evidence/cas-store.js";
import {
  parseEvidenceSubcommandArgsV1,
  parseReportArgsV1,
  runEvidenceCommandV1,
  runReportCommandV1,
} from "../src/evidence/cli-command.js";
import {
  captureEvidenceSourceIdentityV1,
  diffEvidenceV1,
  evidenceManifestPathV1,
  evidenceManifestsRootV1,
  exportEvidenceBundleV1,
  findLatestCheckRunReceiptV1,
  isValidEvidenceIdV1,
  listEvidenceManifestsV1,
  lookupEvidenceManifestV1,
  parseEvidenceManifestV1,
  pruneEvidenceV1,
  readEvidenceManifestV1,
  recordCheckRunAsEvidenceV1,
  recordEvidenceV1,
  verifyEvidenceV1,
} from "../src/evidence/manifest.js";
import { buildVerificationReportV1, writeReportToFileV1 } from "../src/evidence/report.js";

const roots: string[] = [];
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_TERMINAL_PROMPT: "0",
};

function makeDir(prefix = "ascout-evidence-"): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
}

function makeGitRepo(withPassTask = false): string {
  const root = makeDir("ascout-evidence-repo-");
  const git = (args: readonly string[]) =>
    execFileSync("git", [...args], { cwd: root, env: GIT_ENV, windowsHide: true, stdio: "pipe" });
  git(["init", "-q"]);
  git(["config", "user.name", "Ascout Test"]);
  git(["config", "user.email", "ascout@example.invalid"]);
  git(["config", "commit.gpgsign", "false"]);
  git(["config", "core.autocrlf", "false"]);
  writeFileSync(join(root, ".gitignore"), ".ascout/\n");
  writeFileSync(join(root, "app.ts"), "export const answer = 42;\n");
  if (withPassTask) {
    writeFileSync(
      join(root, "ascout.config.json"),
      JSON.stringify({
        version: 1,
        tasks: {
          typecheck: { command: [process.execPath, "-e", "process.exit(0)"] },
          test: { command: [process.execPath, "-e", "process.exit(0)"] },
        },
      }),
    );
  }
  git(["add", "--all"]);
  git(["commit", "-q", "-m", "initial"]);
  return root;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe("Ascout Evidence CAS store (src/evidence/cas-store.ts)", () => {
  it("stores, deduplicates, verifies, lists, deletes, and enforces containment/bounds/descriptor guards", () => {
    const root = makeDir();
    expect(isValidSha256HexV1("a".repeat(64))).toBe(true);
    expect(isValidSha256HexV1("../escape")).toBe(false);
    expect(() => casObjectPathV1(root, "bad")).toThrow(/Invalid SHA-256/u);
    expect(() => deleteCasObjectV1(root, "bad")).toThrow(/Invalid SHA-256/u);
    expect(listCasDigestsV1(root)).toEqual([]);

    expect(getCasObjectV1(root, "not-a-hash")).toEqual({
      ok: false,
      sha256: "not-a-hash",
      reason: "invalid_digest",
      actual_sha256: null,
    });

    const missingDigest = sha256HexV1("missing");
    expect(getCasObjectV1(root, missingDigest).ok).toBe(false);
    expect(deleteCasObjectV1(root, missingDigest)).toBe(false);

    const first = putCasObjectV1(root, "hello evidence");
    expect(first.already_present).toBe(false);
    expect(first.byte_length).toBe(14);
    const second = putCasObjectV1(root, Buffer.from("hello evidence"));
    expect(second.already_present).toBe(true);
    expect(second.sha256).toBe(first.sha256);

    // Oversized CAS payload rejected before write.
    expect(() => putCasObjectV1(root, Buffer.alloc(CAS_MAX_OBJECT_BYTES + 1))).toThrow(/exceeds maximum size/u);

    const loaded = getCasObjectV1(root, first.sha256);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.bytes.toString("utf8")).toBe("hello evidence");

    // Non-shard files, bad shard names, a file occupying a hex shard name, and non-matching entries are ignored.
    writeFileSync(join(casObjectsRootV1(root), "ignore-file"), "x");
    writeFileSync(join(casObjectsRootV1(root), "00"), "not-a-dir");
    mkdirSync(join(casObjectsRootV1(root), "zz"), { recursive: true });
    writeFileSync(join(casObjectsRootV1(root), first.sha256.slice(0, 2), "not-a-digest"), "x");
    expect(listCasDigestsV1(root)).toEqual([first.sha256]);

    // Unsafe non-directory in CAS hierarchy fails closed on getCasObjectV1 and ensureContainedPhysicalDirV1.
    expect(getCasObjectV1(root, `00${"a".repeat(62)}`)).toEqual({
      ok: false,
      sha256: `00${"a".repeat(62)}`,
      reason: "unsafe_file",
      actual_sha256: null,
    });
    expect(() => ensureContainedPhysicalDirV1(root, [".ascout", "objects", "sha256", "00"], false)).toThrow(/Unsafe non-directory/u);

    // Hard-linked CAS object is rejected as unsafe_file.
    const objPath = casObjectPathV1(root, first.sha256);
    const extraLink = join(root, "hardlink-copy");
    linkSync(objPath, extraLink);
    expect(getCasObjectV1(root, first.sha256)).toEqual({
      ok: false,
      sha256: first.sha256,
      reason: "unsafe_file",
      actual_sha256: null,
    });
    expect(() => putCasObjectV1(root, "hello evidence")).toThrow(/failed integrity verification/u);
    rmSync(extraLink);

    // Corrupt object fails read and put.
    writeFileSync(objPath, "tampered bytes");
    const corrupt = getCasObjectV1(root, first.sha256);
    expect(corrupt.ok).toBe(false);
    if (!corrupt.ok) {
      expect(corrupt.reason).toBe("corrupt");
      expect(corrupt.actual_sha256).toBe(sha256HexV1("tampered bytes"));
    }
    expect(() => putCasObjectV1(root, "hello evidence")).toThrow(/corrupt/u);

    expect(deleteCasObjectV1(root, first.sha256)).toBe(true);
    expect(deleteCasObjectV1(root, first.sha256)).toBe(false);

    // Deleting a directory throws non-ENOENT error.
    const dirTarget = sha256HexV1("dir-target");
    mkdirSync(casObjectPathV1(root, dirTarget), { recursive: true });
    expect(getCasObjectV1(root, dirTarget).ok).toBe(false);
    expect(() => deleteCasObjectV1(root, dirTarget)).toThrow();

    // Direct descriptor consistency and bounded-read helper coverage.
    const sampleFile = join(root, "sample.txt");
    writeFileSync(sampleFile, "0123456789");
    expect(readBoundedRegularFileV1(sampleFile, 4)).toEqual({ kind: "unsafe" });
    expect(readBoundedRegularFileV1(sampleFile, 32, { open: () => { throw new Error("EACCES"); } })).toEqual({ kind: "unsafe" });
    expect(readBoundedRegularFileV1(sampleFile, 32, { verifyOpened: () => false })).toEqual({ kind: "unsafe" });
    expect(readBoundedRegularFileV1(sampleFile, 32, { readBytes: () => null })).toEqual({ kind: "unsafe" });
    const fd = openSync(sampleFile, "r");
    try {
      expect(readBoundedFdV1(fd, 3)).toBeNull();
      const bounded = readBoundedFdV1(fd, 20);
      expect(bounded?.toString("utf8")).toBe("0123456789");
      // Exact-sized buffer: never pins a 16 MiB backing ArrayBuffer via .subarray().
      expect(bounded?.buffer.byteLength).toBe(10);
    } finally {
      closeSync(fd);
    }
    const multiChunkFile = join(root, "multi-chunk.txt");
    writeFileSync(multiChunkFile, "A".repeat(70 * 1024));
    const mfd = openSync(multiChunkFile, "r");
    try {
      const multi = readBoundedFdV1(mfd, 128 * 1024);
      expect(multi?.byteLength).toBe(70 * 1024);
      expect(multi?.buffer.byteLength).toBe(70 * 1024);
    } finally {
      closeSync(mfd);
    }
    // Root-only paths like "/" must not replace slashes in evidence text (L2).
    expect(redactEvidenceTextV1("path/to/file.ts", [], { repoRoot: "/", homeDir: "/" })).toEqual({
      text: "path/to/file.ts",
      redacted: false,
    });
    const okBefore = { dev: 1n, ino: 2n };
    const okOpened = { isFile: () => true, dev: 1n, ino: 2n, nlink: 1n, size: 10n };
    expect(isConsistentRegularDescriptorV1({ before: okBefore, opened: okOpened, maxBytes: 10 })).toBe(true);
    expect(isConsistentRegularDescriptorV1({ before: okBefore, opened: { ...okOpened, isFile: () => false }, maxBytes: 10 })).toBe(false);
    expect(isConsistentRegularDescriptorV1({ before: okBefore, opened: { ...okOpened, nlink: 2n }, maxBytes: 10 })).toBe(false);
    expect(isConsistentRegularDescriptorV1({ before: okBefore, opened: { ...okOpened, dev: 9n }, maxBytes: 10 })).toBe(false);
    expect(isConsistentRegularDescriptorV1({ before: okBefore, opened: { ...okOpened, ino: 9n }, maxBytes: 10 })).toBe(false);
    expect(isConsistentRegularDescriptorV1({ before: okBefore, opened: { ...okOpened, size: 11n }, maxBytes: 10 })).toBe(false);

    // writeAtomicSafeRegularFileV1 refuses directories (and symlinks on POSIX).
    expect(() => writeAtomicSafeRegularFileV1(root, "nope")).toThrow(/Refusing to overwrite/u);
    if (process.platform !== "win32") {
      const symTarget = join(root, "sym-out.txt");
      symlinkSync(sampleFile, symTarget);
      expect(() => writeAtomicSafeRegularFileV1(symTarget, "nope")).toThrow(/Refusing to overwrite/u);
      expect(() => writeReportToFileV1(symTarget, "nope")).toThrow(/Refusing to overwrite/u);
    }
  });

  it("handles commitCasTempFileV1 races (EEXIST, ENOTSUP/EOPNOTSUPP, unexpected errors) and pre-hash redaction", () => {
    const root = makeDir();
    const content = "race payload";
    const digest = sha256HexV1(content);
    const dest = join(root, "dest");
    const tmp = join(root, "tmp");
    writeFileSync(dest, content);
    writeFileSync(tmp, content);

    const eexist = Object.assign(new Error("exists"), { code: "EEXIST" });
    const enotsup = Object.assign(new Error("notsup"), { code: "ENOTSUP" });
    const eopnotsupp = Object.assign(new Error("opnotsupp"), { code: "EOPNOTSUPP" });
    const eacces = Object.assign(new Error("denied"), { code: "EACCES" });

    expect(commitCasTempFileV1(tmp, dest, digest, {
      link: () => { throw eexist; },
      rename: () => undefined,
    })).toBe(true);

    writeFileSync(dest, "corrupt");
    expect(() => commitCasTempFileV1(tmp, dest, digest, {
      link: () => { throw eexist; },
      rename: () => undefined,
    })).toThrow(/raced and failed integrity verification/u);

    // ENOTSUP refuses overwrite when destination already exists!
    expect(() => commitCasTempFileV1(tmp, dest, digest, {
      link: () => { throw enotsup; },
      rename: () => undefined,
    })).toThrow(/refusing overwrite/u);

    // EOPNOTSUPP falls back to rename only when destination is absent.
    const renamedDest = join(root, "renamed");
    expect(commitCasTempFileV1(tmp, renamedDest, digest, {
      link: () => { throw eopnotsupp; },
      rename: (src, dst) => { writeFileSync(dst, readFileSync(src)); },
    })).toBe(false);
    expect(readFileSync(renamedDest, "utf8")).toBe(content);

    // Non-ENOTSUP errors (e.g. EACCES) rethrow without overwriting!
    expect(() => commitCasTempFileV1(tmp, renamedDest, digest, {
      link: () => { throw eacces; },
      rename: () => undefined,
    })).toThrow("denied");

    // Pre-hash secret + path redaction (including 2-arg default options, case-insensitive, and non-existent repo).
    expect(redactEvidenceTextV1("plain", [])).toEqual({ text: "plain", redacted: false });
    const home = join(root, "Home-User");
    const nestedRepo = join(home, "Workspace", "App");
    const redacted = redactEvidenceTextV1(
      `token=SECRET_VALUE_1234 repo=${nestedRepo.toLowerCase()} home=${home}`,
      ["SECRET_VALUE_1234"],
      { repoRoot: nestedRepo, homeDir: home, caseInsensitivePaths: true },
    );
    expect(redacted.redacted).toBe(true);
    expect(redacted.text).not.toContain("SECRET_VALUE_1234");
    expect(redacted.text).toContain("repo=<repo>");
    expect(redacted.text).toContain("home=<home>");

    const caseSensitive = redactEvidenceTextV1("clean text", [], { repoRoot: "", homeDir: "", caseInsensitivePaths: false });
    expect(caseSensitive).toEqual({ text: "clean text", redacted: false });
  });
});

describe("Ascout Evidence manifests, integrity verification, diff, export, prune, and report", () => {
  it("enforces closed schema, rejects reserved IDs & extra unhashed keys, detects tampering, diffs, exports, and prunes", async () => {
    const repo = makeGitRepo();
    expect(isValidEvidenceIdV1("ev_0123456789abcdef")).toBe(true);
    for (const badId of ["all", "ALL", "latest", "LATEST", "../bad", ".hidden", "trail.", "CON", "nul.txt", "a"]) {
      expect(isValidEvidenceIdV1(badId), badId).toBe(false);
    }
    expect(() => evidenceManifestPathV1(repo, "all")).toThrow(/Invalid evidence id/u);
    expect(readEvidenceManifestV1(repo, "all")).toBeNull();
    expect(readEvidenceManifestV1(repo, "ev_missing_001")).toBeNull();
    expect(() => verifyEvidenceV1(repo, "all", { expectedDigest: "a".repeat(64) })).toThrow(/cannot be combined/u);

    expect(parseEvidenceManifestV1("not-json")).toBeNull();
    expect(parseEvidenceManifestV1("[]")).toBeNull();
    expect(parseEvidenceManifestV1(JSON.stringify({ schema_version: 2 }))).toBeNull();
    // Closed key set rejects unknown extra top-level keys!
    const validSample = {
      schema_version: 1,
      evidence_id: "ev_valid001",
      kind: "check",
      created_at: "2026-11-27T00:00:00.000Z",
      ascout_version: "0.3.2",
      verdict: "PASS",
      exit_code: 0,
      source: { head_sha: null, detached: false, worktree_tree_digest: null, dirty: false },
      parent_manifest_sha256: null,
      summary: "ok",
      payload_sha256: "a".repeat(64),
      manifest_sha256: "b".repeat(64),
      integrity_scope: "local_content_hash_only",
      artifacts: [],
    };
    expect(parseEvidenceManifestV1(JSON.stringify({ ...validSample, approved_by: "human" }))).toBeNull();
    expect(parseEvidenceManifestV1(JSON.stringify({ ...validSample, kind: "bogus" }))).toBeNull();
    expect(parseEvidenceManifestV1(JSON.stringify({ ...validSample, source: { ...validSample.source, extra: 1 } }))).toBeNull();
    expect(parseEvidenceManifestV1(JSON.stringify({ ...validSample, artifacts: [{ role: "bad" }] }))).toBeNull();

    // Outside git repo source capture falls back gracefully.
    const nonGit = makeDir("ascout-nongit-");
    expect(captureEvidenceSourceIdentityV1(nonGit)).toEqual({
      head_sha: null,
      detached: false,
      worktree_tree_digest: null,
      dirty: true,
    });
    expect(verifyEvidenceV1(repo, "all").status).toBe("INCOMPLETE");
    expect(verifyEvidenceV1(repo, "latest").status).toBe("INCOMPLETE");
    expect(verifyEvidenceV1(repo, "latest", { expectedDigest: "a".repeat(64) }).items[0]?.expected_digest_matched).toBe(false);

    await expect(
      recordEvidenceV1(repo, { kind: "check", verdict: "PASS", exit_code: 0, summary: "bad", payload: {}, evidence_id: "all", skipLock: true }),
    ).rejects.toThrow(/Invalid evidence id/u);

    const first = await recordEvidenceV1(repo, {
      kind: "check",
      verdict: "PASS",
      exit_code: 0,
      summary: `Check passed at ${repo} with MY_SECRET_TOKEN_99`,
      payload: { ok: true, [`key_${repo}`]: `secret=MY_SECRET_TOKEN_99`, nested: [repo, undefined], skipped: undefined },
      artifacts: [
        { role: "stdout", media_type: "text/plain", content: `log MY_SECRET_TOKEN_99 in ${repo}` },
        { role: "shared", media_type: "text/plain", content: "identical" },
        { role: "screenshot", media_type: "image/png", content: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) },
        { role: "bytes-text", media_type: "text/plain", content: Buffer.from("utf8-bytes"), is_text: true },
      ],
      created_at: "2026-11-27T01:00:00.000Z",
      evidence_id: "ev_first_001",
      secrets: ["MY_SECRET_TOKEN_99"],
    });
    expect(first.parent_manifest_sha256).toBeNull();
    expect(first.summary).not.toContain("MY_SECRET_TOKEN_99");
    expect(first.summary).toContain("<repo>");
    const payloadObj = getCasObjectV1(repo, first.payload_sha256);
    expect(payloadObj.ok && payloadObj.bytes.toString("utf8").includes("key_<repo>")).toBe(true);

    const second = await recordEvidenceV1(repo, {
      kind: "review",
      verdict: "FAIL",
      exit_code: 1,
      summary: "Review found 1 issue",
      payload: { findings: 1 },
      artifacts: [
        { role: "stdout", media_type: "text/plain", content: "updated log" },
        { role: "shared", media_type: "text/plain", content: "identical" },
        { role: "review-json", media_type: "application/json", content: "{}" },
      ],
      created_at: "2026-11-27T02:00:00.000Z",
      evidence_id: "ev_second_002",
      skipLock: true,
    });
    expect(second.parent_manifest_sha256).toBe(first.manifest_sha256);

    // Deterministic tie-breaker & chronological sort (both directions exercised).
    const tie = await recordEvidenceV1(repo, {
      kind: "security",
      verdict: "PASS",
      exit_code: 0,
      summary: "tie",
      payload: { ok: true },
      created_at: "2026-11-27T02:00:00.000Z",
      evidence_id: "ev_third_003",
      skipLock: true,
    });
    const older = await recordEvidenceV1(repo, {
      kind: "security",
      verdict: "PASS",
      exit_code: 0,
      summary: "older",
      payload: { ok: true },
      created_at: "2026-11-27T00:30:00.000Z",
      evidence_id: "ev_zero_000",
      skipLock: true,
    });
    expect(listEvidenceManifestsV1(repo).manifests.map((m) => m.evidence_id)).toEqual([
      "ev_third_003",
      "ev_second_002",
      "ev_first_001",
      "ev_zero_000",
    ]);
    rmSync(evidenceManifestPathV1(repo, tie.evidence_id));
    rmSync(evidenceManifestPathV1(repo, older.evidence_id));

    writeFileSync(join(evidenceManifestsRootV1(repo), "README.txt"), "ignored");
    writeFileSync(join(evidenceManifestsRootV1(repo), ".tmp-ignored.json"), "{}");

    // Filename-to-evidence_id mismatch on direct lookup fails as corrupt (TAMPERED).
    const renamedCopy = evidenceManifestPathV1(repo, "ev_spoofed_009");
    writeFileSync(renamedCopy, readFileSync(evidenceManifestPathV1(repo, first.evidence_id), "utf8"));
    expect(lookupEvidenceManifestV1(repo, "ev_spoofed_009").state).toBe("corrupt");
    expect(verifyEvidenceV1(repo, "ev_spoofed_009").status).toBe("TAMPERED");
    expect(verifyEvidenceV1(repo, "ev_spoofed_009", { expectedDigest: first.manifest_sha256 }).status).toBe("TAMPERED");
    // verify latest fails closed when any corrupt manifest exists!
    expect(verifyEvidenceV1(repo, "latest").status).toBe("TAMPERED");
    expect(() => exportEvidenceBundleV1(repo, "ev_spoofed_009", join(repo, ".ascout", "nope.json"))).toThrow(/TAMPERED/u);
    await expect(pruneEvidenceV1(repo, { keepLast: 1, skipLock: true })).rejects.toThrow(/corrupt manifest/u);
    rmSync(renamedCopy);

    // Unsafe hard-linked manifest on direct lookup fails as corrupt.
    const hardlinked = evidenceManifestPathV1(repo, "ev_hardlink_008");
    linkSync(evidenceManifestPathV1(repo, first.evidence_id), hardlinked);
    expect(lookupEvidenceManifestV1(repo, "ev_hardlink_008").state).toBe("corrupt");
    rmSync(hardlinked);

    const verifiedAll = verifyEvidenceV1(repo, "all");
    expect(verifiedAll.status).toBe("CONTENT_INTEGRITY_VERIFIED");
    expect(verifiedAll.items).toHaveLength(2);
    expect(verifiedAll.items[0]?.chain_status).toBe("linked");
    expect(verifiedAll.items[1]?.chain_status).toBe("genesis");

    expect(verifyEvidenceV1(repo, second.evidence_id, { expectedDigest: second.manifest_sha256 }).status).toBe("CONTENT_INTEGRITY_VERIFIED");
    expect(verifyEvidenceV1(repo, second.evidence_id, { expectedDigest: "0".repeat(64) }).status).toBe("TAMPERED");

    const diff = diffEvidenceV1(repo, first.evidence_id, second.evidence_id);
    expect(diff.verdict_changed).toBe(true);
    expect(diff.payload_changed).toBe(true);
    expect(diff.artifact_deltas.map((d) => `${d.role}:${d.change}`)).toEqual([
      "bytes-text:removed",
      "review-json:added",
      "screenshot:removed",
      "stdout:modified",
    ]);
    expect(() => diffEvidenceV1(repo, "ev_missing_01", second.evidence_id)).toThrow(/Left evidence manifest not found/u);
    expect(() => diffEvidenceV1(repo, first.evidence_id, "ev_missing_02")).toThrow(/Right evidence manifest not found/u);

    // Export portable bundle in single verified pass.
    const exportFile = join(repo, ".ascout", "export-bundle.json");
    const bundle = exportEvidenceBundleV1(repo, first.evidence_id, exportFile, { exportedAt: "2026-11-27T03:00:00.000Z" });
    expect(bundle.bundle_format).toBe("ascout.evidence-bundle.v1");
    expect(Object.keys(bundle.objects)).toHaveLength(5);
    expect(readFileSync(exportFile, "utf8")).not.toContain("MY_SECRET_TOKEN_99");
    expect(() => exportEvidenceBundleV1(repo, "ev_missing_99", exportFile)).toThrow(/INCOMPLETE/u);

    // Tamper CAS artifact, payload, manifest body, and lone surrogate.
    const artifactPath = casObjectPathV1(repo, first.artifacts[0]!.sha256);
    const savedArtifactBytes = readFileSync(artifactPath);
    writeFileSync(artifactPath, "TAMPERED");
    expect(verifyEvidenceV1(repo, first.evidence_id).status).toBe("TAMPERED");
    expect(() => exportEvidenceBundleV1(repo, first.evidence_id, exportFile)).toThrow(/Refusing to export unverified/u);
    writeFileSync(artifactPath, savedArtifactBytes);

    const payloadPath = casObjectPathV1(repo, first.payload_sha256);
    const savedPayload = readFileSync(payloadPath);
    writeFileSync(payloadPath, "BAD");
    expect(verifyEvidenceV1(repo, first.evidence_id).status).toBe("TAMPERED");
    writeFileSync(payloadPath, savedPayload);

    const firstPath = evidenceManifestPathV1(repo, first.evidence_id);
    const savedManifest = readFileSync(firstPath, "utf8");
    const tamperedManifest = {
      ...first,
      summary: "forged \uD800 summary",
      artifacts: [{ ...first.artifacts[0]!, byte_length: 9999 }],
    };
    writeFileSync(firstPath, JSON.stringify(tamperedManifest, null, 2));
    const tamperedVerify = verifyEvidenceV1(repo, "all");
    expect(tamperedVerify.status).toBe("TAMPERED");
    expect(tamperedVerify.items.find((i) => i.evidence_id === second.evidence_id)?.chain_status).toBe("chain_tampered");
    expect(verifyEvidenceV1(repo, first.evidence_id, { expectedDigest: first.manifest_sha256 }).status).toBe("TAMPERED");
    writeFileSync(firstPath, savedManifest);

    // Corrupt manifest file reported by verify --all.
    const corruptFile = join(evidenceManifestsRootV1(repo), "broken.json");
    writeFileSync(corruptFile, "{not-json");
    expect(verifyEvidenceV1(repo, "all").status).toBe("TAMPERED");
    rmSync(corruptFile);

    // Prune dry-run and real mark-and-sweep.
    await expect(pruneEvidenceV1(repo, { keepLast: -1 })).rejects.toThrow(/non-negative integer/u);
    const dryPrune = await pruneEvidenceV1(repo, { keepLast: 1, dryRun: true, skipLock: true });
    expect(dryPrune.kept_evidence_ids).toEqual([second.evidence_id]);
    expect(dryPrune.removed_evidence_ids).toEqual([first.evidence_id]);

    const realPrune = await pruneEvidenceV1(repo, { keepLast: 1 });
    expect(realPrune.removed_evidence_ids).toEqual([first.evidence_id]);
    expect(realPrune.removed_object_digests.length).toBeGreaterThan(0);
    expect(verifyEvidenceV1(repo, second.evidence_id).items[0]?.chain_status).toBe("parent_pruned");
  }, 60_000);

  it("imports real schema-valid ReceiptV1 check runs, enforces current-source-bound reports, and exercises CLI commands", async () => {
    const repo = makeGitRepo(true);
    expect(findLatestCheckRunReceiptV1(repo)).toBeNull();
    expect(findLatestCheckRunReceiptV1(repo, "all")).toBeNull();
    await expect(recordCheckRunAsEvidenceV1(repo)).rejects.toThrow(/No readable completed Ascout check receipt/u);

    const ioOut: string[] = [];
    const ioErr: string[] = [];
    const io = {
      writeStdout: (s: string) => { ioOut.push(s); },
      writeStderr: (s: string) => { ioErr.push(s); },
    };

    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["list", "--format", "terminal"]), io)).toBe(0);
    expect(ioErr.join("")).toContain("No Ascout evidence records found");
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["verify"]), io)).toBe(4);
    expect(runReportCommandV1(repo, parseReportArgsV1([]), io)).toBe(4);
    expect(runReportCommandV1(repo, parseReportArgsV1(["--format", "markdown"]), io)).toBe(4);
    expect(runReportCommandV1(repo, parseReportArgsV1(["--id", "ev_missing_01", "--format", "json"]), io)).toBe(4);
    expect(() => buildVerificationReportV1(repo, { evidenceId: "all" })).toThrow(/not 'all'/u);

    const nonGitDir = makeDir("ascout-report-nongit-");
    expect(runReportCommandV1(nonGitDir, parseReportArgsV1(["--format", "terminal"]), io)).toBe(4);
    expect(runReportCommandV1(nonGitDir, parseReportArgsV1(["--format", "markdown"]), io)).toBe(4);

    // Run a REAL `runCheck(repo)` to generate a genuine schema-valid completed ReceiptV1!
    const checked = await runCheck(repo);
    const realRunId = checked.receipt.run.run_id;
    const runsDir = join(repo, ".ascout", "runs");

    // Plant non-completed / corrupt / invalid / mismatched run entries to exercise fail-closed scanning.
    writeFileSync(join(runsDir, "stray-file"), "x");
    mkdirSync(join(runsDir, "bad.dir."), { recursive: true });
    mkdirSync(join(runsDir, "zzz_active_run"), { recursive: true });
    writeFileSync(join(runsDir, "zzz_active_run", ".active"), "");
    mkdirSync(join(runsDir, "zzz_no_manifest"), { recursive: true });
    mkdirSync(join(runsDir, "zzz_bad_manifest"), { recursive: true });
    writeFileSync(join(runsDir, "zzz_bad_manifest", "manifest.json"), "{broken");
    mkdirSync(join(runsDir, "zzz_no_receipt"), { recursive: true });
    writeFileSync(join(runsDir, "zzz_no_receipt", "manifest.json"), JSON.stringify({ state: "completed", run_id: "zzz_no_receipt" }));
    mkdirSync(join(runsDir, "zzz_bad_receipt"), { recursive: true });
    writeFileSync(join(runsDir, "zzz_bad_receipt", "manifest.json"), JSON.stringify({ state: "completed", run_id: "zzz_bad_receipt" }));
    writeFileSync(join(runsDir, "zzz_bad_receipt", "receipt.json"), "{broken");
    mkdirSync(join(runsDir, "zzz_mismatch_id"), { recursive: true });
    writeFileSync(join(runsDir, "zzz_mismatch_id", "manifest.json"), JSON.stringify({ state: "completed", run_id: "zzz_mismatch_id" }));
    writeFileSync(join(runsDir, "zzz_mismatch_id", "receipt.json"), readFileSync(join(runsDir, realRunId, "receipt.json"), "utf8"));

    expect(buildVerificationReportV1(repo).gaps.some((g) => g.includes("ascout evidence record"))).toBe(true);

    // Record the real ReceiptV1 into CAS and verify real source.start binding!
    const realCheckEv = await recordCheckRunAsEvidenceV1(repo, realRunId, { skipLock: true });
    expect(realCheckEv.kind).toBe("check");
    expect(realCheckEv.source.head_sha).toBe(checked.receipt.source.start.head_sha);
    expect(realCheckEv.source.worktree_tree_digest).toBe(checked.receipt.source.start.tree_digest);

    // Also test a synthetic completed schema-valid PASS & FAIL & unstable receipt path cleanly.
    const makeDerivedRun = (id: string, mutate: (r: Record<string, unknown>) => void) => {
      const dir = join(runsDir, id);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "manifest.json"), JSON.stringify({ state: "completed", run_id: id }));
      const copy = JSON.parse(readFileSync(join(runsDir, realRunId, "receipt.json"), "utf8")) as Record<string, unknown>;
      (copy.run as Record<string, unknown>).run_id = id;
      mutate(copy);
      writeFileSync(join(dir, "receipt.json"), JSON.stringify(copy));
    };
    makeDerivedRun("run_unstable_01", (r) => {
      r.stability = "unstable";
      const summary = r.summary as Record<string, unknown>;
      summary.exit_code = 0;
      summary.completeness = "complete";
      const end = (r.source as Record<string, unknown>).end as Record<string, unknown>;
      end.tree_digest = "0".repeat(64);
    });
    // Record real check (exit 4 on 0-test repo -> INCOMPLETE), plus matching current-source check(0), review(0), security(0).
    await recordEvidenceV1(repo, { kind: "check", verdict: "PASS", exit_code: 0, summary: "clean\ncheck `ok`", payload: { ok: true }, skipLock: true });
    await recordEvidenceV1(repo, { kind: "review", verdict: "PASS", exit_code: 0, summary: "clean review", payload: { ok: true }, skipLock: true });
    await recordEvidenceV1(repo, { kind: "security", verdict: "PASS", exit_code: 0, summary: "clean security", payload: { ok: true }, skipLock: true });
    // Remove the exit-4 realCheckEv temporarily so current-source manifests are all PASS -> exit 0!
    rmSync(evidenceManifestPathV1(repo, realCheckEv.evidence_id));

    const passReport = buildVerificationReportV1(repo);
    expect(passReport.overall_status).toBe("PASS");
    expect(passReport.exit_code).toBe(0);
    expect(passReport.gaps).toEqual([]);

    const latestId = passReport.verified_entries[0]!.evidence_id;
    const genesisId = passReport.verified_entries[passReport.verified_entries.length - 1]!.evidence_id;
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["list"]), io)).toBe(0);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["list", "--format", "json"]), io)).toBe(0);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["show"]), io)).toBe(0);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["show", genesisId]), io)).toBe(0);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["show", latestId, "--format", "json"]), io)).toBe(0);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["show", "ev_missing_01"]), io)).toBe(4);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["verify", "--all"]), io)).toBe(0);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["verify", latestId, "--expected-digest", passReport.verified_entries[0]!.manifest_sha256, "--format", "json"]), io)).toBe(0);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["verify", latestId, "--expected-digest", "0".repeat(64)]), io)).toBe(1);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["diff", passReport.verified_entries[2]!.evidence_id, latestId]), io)).toBe(0);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["diff", passReport.verified_entries[2]!.evidence_id, latestId, "--format", "json"]), io)).toBe(0);

    const mdOut = join(repo, ".ascout", "report.md");
    expect(runReportCommandV1(repo, parseReportArgsV1(["--format", "terminal"]), io)).toBe(0);
    expect(runReportCommandV1(repo, parseReportArgsV1(["--format", "markdown", "--out", mdOut]), io)).toBe(0);
    expect(runReportCommandV1(repo, parseReportArgsV1(["--format", "json"]), io)).toBe(0);
    expect(buildVerificationReportV1(repo, { evidenceId: "ev_missing_01" }).overall_status).toBe("INCOMPLETE");
    const singleIdReport = buildVerificationReportV1(repo, { evidenceId: latestId });
    expect(singleIdReport.verified_entries).toHaveLength(1);
    expect(singleIdReport.overall_status).toBe("INCOMPLETE");
    expect(readFileSync(mdOut, "utf8")).toContain("# Ascout Verification Report");
    expect(readFileSync(mdOut, "utf8")).toContain("clean check 'ok'");

    // Unreadable directory entry named *.json inside .ascout/evidence/ is flagged corrupt.
    const dirJsonPath = join(evidenceManifestsRootV1(repo), "dir-entry.json");
    mkdirSync(dirJsonPath);
    expect(listEvidenceManifestsV1(repo).corrupt_files).toContain("dir-entry.json");
    rmSync(dirJsonPath, { recursive: true, force: true });

    // Non-Git directory with recorded evidence hits sourceBound === false with non-empty manifests.
    const plainWithManifest = makeDir("ascout-ev-plain-");
    await recordEvidenceV1(plainWithManifest, {
      kind: "check",
      verdict: "PASS",
      exit_code: 0,
      summary: "plain dir evidence",
      payload: { ok: true },
      skipLock: true,
    });
    expect(buildVerificationReportV1(plainWithManifest).overall_status).toBe("INCOMPLETE");
    expect(await runEvidenceCommandV1(plainWithManifest, parseEvidenceSubcommandArgsV1(["show"]), io)).toBe(0);

    // findLatestCheckRunReceiptV1 invalid id and runs dir with no completed valid runs.
    expect(findLatestCheckRunReceiptV1(repo, "../bad")).toBeNull();
    const emptyRunsDir = join(plainWithManifest, ".ascout", "runs", "incomplete_run");
    mkdirSync(emptyRunsDir, { recursive: true });
    expect(findLatestCheckRunReceiptV1(plainWithManifest)).toBeNull();

    // Verify recordCheckRunAsEvidenceV1 against real FAIL (exit 1) and INCOMPLETE (exit 4) check runs.
    const failRepo = makeGitRepo(false);
    writeFileSync(
      join(failRepo, "ascout.config.json"),
      JSON.stringify({ version: 1, tasks: { typecheck: { command: [process.execPath, "-e", "process.exit(1)"] } } }),
    );
    execFileSync("git", ["add", "ascout.config.json"], { cwd: failRepo, env: GIT_ENV, windowsHide: true, stdio: "pipe" });
    execFileSync("git", ["commit", "-q", "-m", "fail-task"], { cwd: failRepo, env: GIT_ENV, windowsHide: true, stdio: "pipe" });
    const failCheck = await runCheck(failRepo);
    expect(failCheck.receipt.summary.exit_code).toBe(1);
    const recFail = await recordCheckRunAsEvidenceV1(failRepo, failCheck.receipt.run.run_id, { skipLock: true });
    expect(recFail.verdict).toBe("FAIL");
    expect(recFail.exit_code).toBe(1);

    const incompleteRepo = makeGitRepo(false);
    const incCheck = await runCheck(incompleteRepo);
    expect(incCheck.receipt.summary.exit_code).toBe(4);
    const recInc = await recordCheckRunAsEvidenceV1(incompleteRepo, incCheck.receipt.run.run_id, { skipLock: true });
    expect(recInc.verdict).toBe("INCOMPLETE");
    expect(recInc.exit_code).toBe(4);

    // Real exit-0 PASS check run via project-local Vitest fixture.
    const passRepo = makeDir("ascout-evidence-pass-");
    mkdirSync(join(passRepo, "src"), { recursive: true });
    mkdirSync(join(passRepo, "node_modules", "vitest"), { recursive: true });
    mkdirSync(join(passRepo, "node_modules", "@vitest", "coverage-v8"), { recursive: true });
    mkdirSync(join(passRepo, "node_modules", "fake-vitest"), { recursive: true });
    writeFileSync(join(passRepo, ".gitignore"), ".ascout/\nnode_modules/\n");
    writeFileSync(
      join(passRepo, "package.json"),
      JSON.stringify({
        name: "ev-pass",
        private: true,
        type: "module",
        devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" },
      }),
    );
    writeFileSync(join(passRepo, "node_modules", "vitest", "package.json"), JSON.stringify({ name: "vitest", version: "4.1.10" }));
    writeFileSync(join(passRepo, "node_modules", "@vitest", "coverage-v8", "package.json"), JSON.stringify({ name: "@vitest/coverage-v8", version: "4.1.10" }));
    writeFileSync(
      join(passRepo, "node_modules", "fake-vitest", "index.mjs"),
      [
        'import { mkdirSync, writeFileSync } from "node:fs";',
        'import { dirname } from "node:path";',
        'const output = process.argv.find((arg) => arg.startsWith("--outputFile="))?.slice("--outputFile=".length);',
        'const coverageDir = process.argv.find((arg) => arg.startsWith("--coverage.reportsDirectory="))?.slice("--coverage.reportsDirectory=".length);',
        'mkdirSync(dirname(output), { recursive: true });',
        'mkdirSync(coverageDir, { recursive: true });',
        'writeFileSync(output, JSON.stringify({ numTotalTests: 1, testResults: [] }));',
        'writeFileSync(coverageDir + "/lcov.info", "SF:src/used.js\\nDA:1,1\\nend_of_record\\n");',
      ].join("\n") + "\n",
    );
    writePackageNodeCommandShim(join(passRepo, "node_modules", ".bin"), "vitest", "../fake-vitest/index.mjs");
    writeFileSync(join(passRepo, "src", "used.js"), "export function used() { return 1; }\n");
    const runPassGit = (args: readonly string[]) =>
      execFileSync("git", [...args], { cwd: passRepo, env: GIT_ENV, windowsHide: true, stdio: "pipe" });
    runPassGit(["init", "-q"]);
    runPassGit(["config", "user.name", "Ascout Test"]);
    runPassGit(["config", "user.email", "ascout@example.invalid"]);
    runPassGit(["config", "commit.gpgsign", "false"]);
    runPassGit(["config", "core.autocrlf", "false"]);
    runPassGit(["add", "."]);
    runPassGit(["commit", "-q", "-m", "baseline"]);
    writeFileSync(join(passRepo, "src", "used.js"), "export function used() { return 2; }\n");
    const passCheck = await runCheck(passRepo);
    expect(passCheck.receipt.summary.exit_code).toBe(0);
    const recPass = await recordCheckRunAsEvidenceV1(passRepo, passCheck.receipt.run.run_id, { skipLock: true });
    expect(recPass.verdict).toBe("PASS");
    expect(recPass.exit_code).toBe(0);

    // Stale-evidence protection (H6): modifying app.ts makes prior manifests stale, AND adding only
    // a new review manifest on the modified tree MUST NOT produce PASS (still missing current check & security)!
    writeFileSync(join(repo, "app.ts"), "export const answer = 99;\n");
    const staleAll = buildVerificationReportV1(repo);
    expect(staleAll.overall_status).toBe("INCOMPLETE");
    expect(staleAll.gaps.some((g) => g.includes("stale"))).toBe(true);

    await recordEvidenceV1(repo, { kind: "review", verdict: "PASS", exit_code: 0, summary: "new review only", payload: { ok: true }, skipLock: true });
    const partialCurrent = buildVerificationReportV1(repo);
    expect(partialCurrent.overall_status).toBe("INCOMPLETE");
    expect(partialCurrent.gaps.some((g) => g.includes("'check'"))).toBe(true);

    await recordEvidenceV1(repo, { kind: "security", verdict: "FAIL", exit_code: 1, summary: "finding", payload: { ok: false }, skipLock: true });
    expect(buildVerificationReportV1(repo).overall_status).toBe("FAIL");

    // Corrupt manifest causes list exit 1 (naming corrupt_files), show exit 1, diff corrupt error, and report TAMPERED.
    const corruptPath = join(evidenceManifestsRootV1(repo), "corrupt.json");
    writeFileSync(corruptPath, "{broken");
    ioErr.length = 0;
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["list"]), io)).toBe(1);
    expect(ioErr.join("")).toContain("corrupt_files (1): corrupt.json");
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["show", "corrupt"]), io)).toBe(1);
    expect(() => diffEvidenceV1(repo, "corrupt", latestId)).toThrow(/is corrupt/u);
    expect(buildVerificationReportV1(repo).overall_status).toBe("TAMPERED");
    rmSync(corruptPath);

    // Refuses overwriting an existing manifest ID to preserve the append-only hash chain (M2).
    await expect(
      recordEvidenceV1(repo, {
        evidence_id: latestId,
        kind: "check",
        verdict: "PASS",
        exit_code: 0,
        summary: "duplicate id attempt",
        payload: { ok: true },
        skipLock: true,
      }),
    ).rejects.toThrow(/already exists/u);

    // Export, record, prune CLI paths.
    const bundleOut = join(repo, ".ascout", "cli-export.json");
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["export", latestId, "--out", bundleOut]), io)).toBe(0);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["export", "--out", bundleOut, "--format", "json"]), io)).toBe(0);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["record", "--from-run", realRunId]), io)).toBe(0);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["record", "--format", "json"]), io)).toBe(0);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["prune", "--dry-run"]), io)).toBe(0);
    expect(await runEvidenceCommandV1(repo, parseEvidenceSubcommandArgsV1(["prune", "--keep", "3", "--format", "json"]), io)).toBe(0);

    // Run through runCli directly.
    const prevCwd = process.cwd();
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.chdir(repo);
    try {
      expect(await runCli(["evidence", "list"])).toBe(0);
      expect(await runCli(["evidence", "list", "--format", "json"])).toBe(0);
      expect(await runCli(["report"])).toBe(1);
      expect(await runCli(["report", "--format", "json"])).toBe(1);
      expect([0, 1, 4]).toContain(await runCli(["security", "--format", "json"]));
      expect(await runCli(["evidence", "bogus"])).toBe(2);
      expect(await runCli(["report", "--bogus"])).toBe(2);
    } finally {
      process.chdir(prevCwd);
    }

    // Exercise parser error branches including reserved 'all' and integer overflow on --keep.
    for (const bad of [
      [],
      ["unknown"],
      ["list", "extra"],
      ["list", "--format", "xml"],
      ["list", "--format", "json", "--format", "terminal"],
      ["list", "--expected-digest", "a".repeat(64)],
      ["verify", "--expected-digest", "short"],
      ["verify", "all"],
      ["verify", "all", "--expected-digest", "a".repeat(64)],
      ["list", "--all"],
      ["verify", "--all", "id1"],
      ["verify", "--all", "--expected-digest", "a".repeat(64)],
      ["verify", "a", "b"],
      ["show", "all"],
      ["show", "a", "b"],
      ["diff", "only-one"],
      ["list", "--out", "x"],
      ["export", "--out", ""],
      ["export"],
      ["export", "all", "--out", "x"],
      ["export", "a", "b", "--out", "x"],
      ["list", "--keep", "2"],
      ["prune", "--keep", "abc"],
      ["prune", "--keep", "99999999999999999999999"],
      ["prune", "extra"],
      ["list", "--dry-run"],
      ["list", "--from-run", "latest"],
      ["record", "--from-run", ""],
      ["record", "extra"],
      ["list", "--unknown-flag"],
    ]) {
      expect(() => parseEvidenceSubcommandArgsV1(bad), bad.join(" ")).toThrow();
    }
    for (const badReport of [
      ["--id"],
      ["--id", "all"],
      ["--format", "yaml"],
      ["--format", "json", "--format", "markdown"],
      ["--out"],
      ["--unknown"],
    ]) {
      expect(() => parseReportArgsV1(badReport), badReport.join(" ")).toThrow();
    }
  }, 240_000);
});
