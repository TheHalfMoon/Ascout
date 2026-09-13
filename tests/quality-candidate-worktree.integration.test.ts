import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createCandidateProposal } from "../src/quality/candidate.js";
import { createOracle } from "../src/quality/obligation.js";
import {
  createCandidateWorktree,
  disposeCandidateWorktree,
  materializeProposal,
  verifyCandidateWorktreeIdentity,
} from "../src/quality/worktree.js";

const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
const trackedDirs: string[] = [];

afterEach(() => {
  while (trackedDirs.length > 0) {
    const dir = trackedDirs.pop() as string;
    try {
      rmSync(dir, { force: true, recursive: true });
    } catch {
      // Best-effort fixture cleanup; git state assertions already ran.
    }
  }
});

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd,
    encoding: "utf8",
    env: GIT_ENV,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
  }).trim();
}

function initFixture(): { root: string; head: string } {
  const root = mkdtempSync(join(tmpdir(), "ascout-candidate-fixture-"));
  trackedDirs.push(root);
  git(root, ["init", "-b", "main"]);
  writeFileSync(join(root, "src.js"), "module.exports = 1;\n", "utf8");
  git(root, ["add", "src.js"]);
  git(root, [
    "-c",
    "user.email=fixture@example.com",
    "-c",
    "user.name=Fixture",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    "fixture base",
  ]);
  return { head: git(root, ["rev-parse", "HEAD"]), root };
}

function parentDir(): string {
  const parent = mkdtempSync(join(tmpdir(), "ascout-candidate-parent-"));
  trackedDirs.push(parent);
  return parent;
}

function proposal(sourceId: string, testFile: string) {
  return createCandidateProposal({
    body: "it('covers the obligation', () => { expect(1).toBe(1); });",
    generated_by: "template:obligation-scaffold-v1",
    id: "candidate-w1",
    obligation_id: "obligation-9",
    oracle: createOracle({
      calibrated: true,
      class: "deterministic-assertion",
      description: "independent assertion",
      id: "oracle-w1",
      independence: "independent",
      provenance: "reviewed against the PRD",
    }),
    source_id: sourceId,
    test_file: testFile,
    test_name: "covers the obligation",
  });
}

describe("spec015 wedge1 candidate worktree", () => {
  it("creates a disposable worktree pinned to the exact tree", () => {
    const fixture = initFixture();
    const worktree = createCandidateWorktree({
      name: "candidate-w1",
      parent_dir: parentDir(),
      repo_root: fixture.root,
      tree_id: fixture.head,
    });
    try {
      expect(verifyCandidateWorktreeIdentity(worktree)).toBe(fixture.head);
      expect(readFileSync(join(worktree.path, "src.js"), "utf8")).toBe(
        "module.exports = 1;\n",
      );
      expect(git(worktree.path, ["status", "--porcelain"])).toBe("");
      expect(git(fixture.root, ["status", "--porcelain"])).toBe("");
    } finally {
      disposeCandidateWorktree(worktree);
    }
  }, 60_000);

  it("materializes proposals inside the worktree while core stays clean", () => {
    const fixture = initFixture();
    const worktree = createCandidateWorktree({
      name: "candidate-w2",
      parent_dir: parentDir(),
      repo_root: fixture.root,
      tree_id: fixture.head,
    });
    try {
      const written = materializeProposal(
        worktree,
        proposal(fixture.head, "tests/candidate-checkout.test.ts"),
      );
      expect(written).toBe(
        join(worktree.path, "tests/candidate-checkout.test.ts"),
      );
      expect(readFileSync(written, "utf8")).toContain("covers the obligation");
      expect(
        git(worktree.path, [
          "status",
          "--porcelain",
          "--untracked-files=all",
        ]),
      ).toContain("tests/candidate-checkout.test.ts");
      expect(git(fixture.root, ["rev-parse", "HEAD"])).toBe(fixture.head);
      expect(git(fixture.root, ["status", "--porcelain"])).toBe("");
    } finally {
      disposeCandidateWorktree(worktree);
    }
  }, 60_000);

  it("refuses proposals bound to another source tree", () => {
    const fixture = initFixture();
    const worktree = createCandidateWorktree({
      name: "candidate-w3",
      parent_dir: parentDir(),
      repo_root: fixture.root,
      tree_id: fixture.head,
    });
    try {
      expect(() =>
        materializeProposal(
          worktree,
          proposal(
            "0000000000000000000000000000000000000000",
            "tests/other.test.ts",
          ),
        ),
      ).toThrow(TypeError);
      expect(git(worktree.path, ["status", "--porcelain"])).toBe("");
    } finally {
      disposeCandidateWorktree(worktree);
    }
  }, 60_000);

  it("refuses rejected proposals and escaping test files", () => {
    const fixture = initFixture();
    const worktree = createCandidateWorktree({
      name: "candidate-w4",
      parent_dir: parentDir(),
      repo_root: fixture.root,
      tree_id: fixture.head,
    });
    try {
      const valid = proposal(fixture.head, "tests/ok.test.ts");
      const rejected = { ...valid, status: "rejected" as const };
      expect(() => materializeProposal(worktree, rejected)).toThrow(TypeError);
      for (const escape of ["../evil.test.ts", "/abs.test.ts"]) {
        const armed = { ...valid, test_file: escape };
        expect(() => materializeProposal(worktree, armed)).toThrow(TypeError);
      }
      expect(git(worktree.path, ["status", "--porcelain"])).toBe("");
    } finally {
      disposeCandidateWorktree(worktree);
    }
  }, 60_000);

  it("disposes the worktree and refuses double disposal", () => {
    const fixture = initFixture();
    const parent = parentDir();
    const worktree = createCandidateWorktree({
      name: "candidate-w5",
      parent_dir: parent,
      repo_root: fixture.root,
      tree_id: fixture.head,
    });
    materializeProposal(worktree, proposal(fixture.head, "tests/x.test.ts"));
    disposeCandidateWorktree(worktree);
    expect(git(fixture.root, ["worktree", "list", "--porcelain"])).not.toContain(
      worktree.path,
    );
    expect(() => disposeCandidateWorktree(worktree)).toThrow(Error);
  }, 60_000);

  it("refuses existing names, unknown trees, and malformed roots", () => {
    const fixture = initFixture();
    const parent = parentDir();
    const worktree = createCandidateWorktree({
      name: "candidate-w6",
      parent_dir: parent,
      repo_root: fixture.root,
      tree_id: fixture.head,
    });
    try {
      expect(() =>
        createCandidateWorktree({
          name: "candidate-w6",
          parent_dir: parent,
          repo_root: fixture.root,
          tree_id: fixture.head,
        }),
      ).toThrow(TypeError);
      expect(() =>
        createCandidateWorktree({
          name: "candidate-w7",
          parent_dir: parent,
          repo_root: fixture.root,
          tree_id: "0000000000000000000000000000000000000000",
        }),
      ).toThrow(Error);
      expect(() =>
        createCandidateWorktree({
          name: "Bad Name!",
          parent_dir: parent,
          repo_root: fixture.root,
          tree_id: fixture.head,
        }),
      ).toThrow(TypeError);
      expect(() =>
        createCandidateWorktree({
          name: "candidate-w8",
          parent_dir: parent,
          repo_root: "relative/root",
          tree_id: fixture.head,
        }),
      ).toThrow(TypeError);
    } finally {
      disposeCandidateWorktree(worktree);
    }
  }, 60_000);

  it("detects worktree drift from the pinned tree", () => {
    const fixture = initFixture();
    const worktree = createCandidateWorktree({
      name: "candidate-w9",
      parent_dir: parentDir(),
      repo_root: fixture.root,
      tree_id: fixture.head,
    });
    try {
      writeFileSync(join(worktree.path, "drift.js"), "drift\n", "utf8");
      git(worktree.path, ["add", "drift.js"]);
      git(worktree.path, [
        "-c",
        "user.email=fixture@example.com",
        "-c",
        "user.name=Fixture",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        "drift",
      ]);
      expect(() => verifyCandidateWorktreeIdentity(worktree)).toThrow(Error);
      expect(git(fixture.root, ["rev-parse", "HEAD"])).toBe(fixture.head);
    } finally {
      disposeCandidateWorktree(worktree);
    }
  }, 60_000);
});
