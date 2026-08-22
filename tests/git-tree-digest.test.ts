import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  GitIdentityError,
  readTreeDigestV1,
  treeDigestV1FromState,
  type TreeDigestState,
  type TreeDigestUntrackedEntry,
} from "../src/git.js";

const HEAD = "a".repeat(40);
const BASE_INDEX = [
  { path: "src/app.ts", mode: "100644", oid: "1".repeat(40), stage: 0 },
  { path: "tests/__snapshots__/ui.snap", mode: "100644", oid: "2".repeat(40), stage: 0 },
] as const;
const temporaryDirectories: string[] = [];

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function cleanState(): TreeDigestState {
  return { head: HEAD, index: BASE_INDEX, unstaged: [], untracked: [] };
}

function makeRepository(): string {
  const repositoryRoot = mkdtempSync(join(tmpdir(), "ascout-t019-"));
  temporaryDirectories.push(repositoryRoot);
  execFileSync("git", ["init", "-q"], { cwd: repositoryRoot, windowsHide: true });
  execFileSync("git", ["config", "user.name", "Ascout Test"], {
    cwd: repositoryRoot,
    windowsHide: true,
  });
  execFileSync("git", ["config", "user.email", "ascout@example.invalid"], {
    cwd: repositoryRoot,
    windowsHide: true,
  });
  return repositoryRoot;
}

function git(repositoryRoot: string, argv: readonly string[]): string {
  return execFileSync("git", [...argv], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
  });
}

function commitAll(repositoryRoot: string, message: string): void {
  git(repositoryRoot, ["add", "--all"]);
  git(repositoryRoot, ["commit", "-q", "-m", message]);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("T019 tree_digest_v1 canonicalization", () => {
  it("matches every T010 golden and remains input-order invariant", () => {
    const targetDigest = sha256Text("../lib/app.ts");
    const untracked: readonly TreeDigestUntrackedEntry[] = [
      { path: "notes.txt", type: "file", mode: "100644", digest: sha256Text("notes\n"), ignored: false },
      { path: "scratch.bin", type: "file", mode: "100644", digest: sha256Text("\u0000\u0001"), ignored: false },
      { path: "tmp/keep.json", type: "file", mode: "100644", digest: sha256Text("{}\n"), ignored: false },
      { path: "ignored.log", type: "file", mode: "100644", digest: sha256Text("ignored\n"), ignored: true },
      { path: ".ascout/runs/r1/out.txt", type: "file", mode: "100644", digest: sha256Text("run evidence\n"), ignored: false },
    ];
    const unicodeUntracked: readonly TreeDigestUntrackedEntry[] = [
      { path: "é.txt", type: "file", mode: "100644", digest: sha256Text("e-acute"), ignored: false },
      { path: "z.txt", type: "file", mode: "100644", digest: sha256Text("z"), ignored: false },
      { path: "ä.txt", type: "file", mode: "100644", digest: sha256Text("a-umlaut"), ignored: false },
      { path: "a.txt", type: "file", mode: "100644", digest: sha256Text("a"), ignored: false },
    ];

    const cases: readonly [string, TreeDigestState, string][] = [
      ["clean", cleanState(), "368364c24d47714d6645ff1b098160280d363451dd1bd594853e4ec3bdc3ad82"],
      [
        "staged",
        { ...cleanState(), index: [{ ...BASE_INDEX[0], oid: "3".repeat(40) }, BASE_INDEX[1]] },
        "e4c8566d6ae1633dc8472974ad1ed0e524334c4b0f878e4ca99bab68fa8fa5d6",
      ],
      [
        "unstaged",
        {
          ...cleanState(),
          unstaged: [{
            path: "src/app.ts",
            state: "modified",
            type: "file",
            mode: "100644",
            digest: sha256Text("console.log('changed')\n"),
          }],
        },
        "bd41af5b7e6c49b5dab8333428323143319b5425696cc04aa22f38a8e597e0a9",
      ],
      [
        "deletion",
        { ...cleanState(), unstaged: [{ path: "src/app.ts", state: "deleted" }] },
        "d7f21bff1d9c29b0887654548ff1dc3c520e3109bbc93798a1a580cefae061fd",
      ],
      [
        "symlink",
        {
          ...cleanState(),
          unstaged: [{
            path: "src/app.ts",
            state: "modified",
            type: "symlink",
            mode: "120000",
            digest: targetDigest,
          }],
        },
        "a591e715c4dfcd9adc1e3edda7070959b847ea5fc3b46874bda1513e5d524353",
      ],
      [
        "mode",
        {
          ...cleanState(),
          unstaged: [{
            path: "src/app.ts",
            state: "modified",
            type: "file",
            mode: "100755",
            digest: sha256Text("console.log('base')\n"),
          }],
        },
        "42be8e0497be224db269b0f2da0f1a945b14f26661cdddfe82595cd3a48adb03",
      ],
      [
        "type",
        {
          ...cleanState(),
          unstaged: [{
            path: "src/app.ts",
            state: "type_changed",
            type: "symlink",
            mode: "120000",
            digest: targetDigest,
          }],
        },
        "018630f3aa90b43a1f0c9a6926dfbc2a1ce1e725754f57d49ea732f6c257c44d",
      ],
      [
        "untracked",
        { ...cleanState(), untracked },
        "b1aab29b5e465e44224145254caa51b3f9f371f7e1414e3799a1f13ad9be6cc7",
      ],
      [
        "unicode-untracked",
        { ...cleanState(), untracked: unicodeUntracked },
        "7955d13f9e3bf356f2a34c5e3180e2e0c71b4c26001ccd4024ffccbbff3c0925",
      ],
      [
        "snapshot",
        {
          ...cleanState(),
          unstaged: [{
            path: "tests/__snapshots__/ui.snap",
            state: "modified",
            type: "file",
            mode: "100644",
            digest: sha256Text('exports[`ui`] = `"changed"`;\n'),
          }],
        },
        "08ed4832503efb7087fc38de9558a20409fc692085eb694475abffa89ff7c59d",
      ],
    ];

    for (const [name, state, expected] of cases) {
      const digest = treeDigestV1FromState(state);
      expect(digest.tree_digest, name).toBe(expected);
      expect(digest.tree_digest_version).toBe(1);
    }

    const reordered = treeDigestV1FromState({
      ...cleanState(),
      index: [...BASE_INDEX].reverse(),
      untracked: [...unicodeUntracked].reverse(),
    });
    expect(reordered.tree_digest).toBe(
      treeDigestV1FromState({ ...cleanState(), untracked: unicodeUntracked }).tree_digest,
    );
  });
});

describe("T019 live Git tree-digest collection", () => {
  it("binds clean, staged, unstaged, deletion, and all nonignored untracked state", () => {
    const repositoryRoot = makeRepository();
    mkdirSync(join(repositoryRoot, "src"));
    writeFileSync(join(repositoryRoot, "src", "app.ts"), "console.log('base')\n");
    commitAll(repositoryRoot, "base");

    const clean = readTreeDigestV1(repositoryRoot);
    expect(clean.tracked_index_entry_count).toBe(1);
    expect(clean.unstaged_changed_count).toBe(0);
    expect(clean.included_untracked_count).toBe(0);

    writeFileSync(join(repositoryRoot, "src", "app.ts"), "console.log('unstaged')\n");
    const unstaged = readTreeDigestV1(repositoryRoot);
    expect(unstaged.unstaged_changed_count).toBe(1);
    expect(unstaged.tree_digest).not.toBe(clean.tree_digest);

    git(repositoryRoot, ["add", "src/app.ts"]);
    const staged = readTreeDigestV1(repositoryRoot);
    expect(staged.unstaged_changed_count).toBe(0);
    expect(staged.tree_digest).not.toBe(clean.tree_digest);
    expect(staged.tree_digest).not.toBe(unstaged.tree_digest);

    git(repositoryRoot, ["reset", "--hard", "HEAD"]);
    unlinkSync(join(repositoryRoot, "src", "app.ts"));
    const deleted = readTreeDigestV1(repositoryRoot);
    expect(deleted.unstaged_changed_count).toBe(1);
    expect(deleted.tree_digest).not.toBe(clean.tree_digest);

    git(repositoryRoot, ["checkout", "--", "src/app.ts"]);
    writeFileSync(join(repositoryRoot, ".gitignore"), "ignored.log\n");
    commitAll(repositoryRoot, "ignore");
    const baseline = readTreeDigestV1(repositoryRoot);

    writeFileSync(join(repositoryRoot, "notes.txt"), "notes\n");
    writeFileSync(join(repositoryRoot, "ignored.log"), "ignored\n");
    mkdirSync(join(repositoryRoot, ".ascout", "runs", "r1"), { recursive: true });
    writeFileSync(join(repositoryRoot, ".ascout", "runs", "r1", "out.txt"), "runtime\n");
    const withUntracked = readTreeDigestV1(repositoryRoot);
    expect(withUntracked.included_untracked_count).toBe(1);
    expect(withUntracked.tree_digest).not.toBe(baseline.tree_digest);

    rmSync(join(repositoryRoot, "ignored.log"));
    rmSync(join(repositoryRoot, ".ascout"), { recursive: true, force: true });
    expect(readTreeDigestV1(repositoryRoot)).toEqual(withUntracked);
  });

  it("fails closed when index visibility flags can hide tracked worktree state", () => {
    const repositoryRoot = makeRepository();
    writeFileSync(join(repositoryRoot, "tracked.txt"), "base\n");
    commitAll(repositoryRoot, "base");

    git(repositoryRoot, ["update-index", "--assume-unchanged", "tracked.txt"]);
    writeFileSync(join(repositoryRoot, "tracked.txt"), "hidden change\n");
    expect(() => readTreeDigestV1(repositoryRoot)).toThrow(GitIdentityError);

    git(repositoryRoot, ["update-index", "--no-assume-unchanged", "tracked.txt"]);
    git(repositoryRoot, ["checkout", "--", "tracked.txt"]);
    git(repositoryRoot, ["update-index", "--skip-worktree", "tracked.txt"]);
    writeFileSync(join(repositoryRoot, "tracked.txt"), "hidden skip-worktree change\n");
    expect(() => readTreeDigestV1(repositoryRoot)).toThrow(GitIdentityError);
  });

  it("binds executable mode and symlink target/type where the platform exposes them", () => {
    const repositoryRoot = makeRepository();
    writeFileSync(join(repositoryRoot, "tool.sh"), "#!/bin/sh\nexit 0\n");
    commitAll(repositoryRoot, "base");
    const clean = readTreeDigestV1(repositoryRoot);

    if (process.platform !== "win32") {
      chmodSync(join(repositoryRoot, "tool.sh"), 0o755);
      const executable = readTreeDigestV1(repositoryRoot);
      expect(executable.unstaged_changed_count).toBe(1);
      expect(executable.tree_digest).not.toBe(clean.tree_digest);

      chmodSync(join(repositoryRoot, "tool.sh"), 0o644);
      unlinkSync(join(repositoryRoot, "tool.sh"));
      symlinkSync("target.sh", join(repositoryRoot, "tool.sh"));
      const typeChanged = readTreeDigestV1(repositoryRoot);
      expect(typeChanged.unstaged_changed_count).toBe(1);
      expect(typeChanged.tree_digest).not.toBe(clean.tree_digest);
      expect(typeChanged.tree_digest).not.toBe(executable.tree_digest);
    }
  });
});
