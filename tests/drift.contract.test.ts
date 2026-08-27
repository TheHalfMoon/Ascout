import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readTreeDigestV1 } from "../src/git.js";
import { buildReceipt } from "../src/receipt/build.js";
import { validateReceiptSemantics, type SourceStateV1 } from "../src/receipt/model.js";

const temporaryDirectories: string[] = [];
const NULL_GIT_CONFIG = process.platform === "win32" ? "NUL" : "/dev/null";
const GIT_TEST_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: NULL_GIT_CONFIG,
  GIT_CONFIG_SYSTEM: NULL_GIT_CONFIG,
  GIT_TERMINAL_PROMPT: "0",
};

function git(repositoryRoot: string, argv: readonly string[]): string {
  return execFileSync("git", [...argv], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: GIT_TEST_ENV,
    windowsHide: true,
  });
}

function makeRepository(): string {
  const repositoryRoot = mkdtempSync(join(tmpdir(), "ascout-t058-"));
  temporaryDirectories.push(repositoryRoot);
  execFileSync("git", ["init", "-q"], {
    cwd: repositoryRoot,
    env: GIT_TEST_ENV,
    windowsHide: true,
  });
  git(repositoryRoot, ["config", "user.name", "Ascout Test"]);
  git(repositoryRoot, ["config", "user.email", "ascout@example.invalid"]);
  git(repositoryRoot, ["config", "commit.gpgSign", "false"]);
  git(repositoryRoot, ["config", "core.autocrlf", "false"]);
  return repositoryRoot;
}

function commitAll(repositoryRoot: string, message: string): void {
  git(repositoryRoot, ["add", "--all"]);
  git(repositoryRoot, ["commit", "-q", "-m", message]);
}

function sourceState(treeDigest: string): SourceStateV1 {
  return {
    repository_id: `local:${"a".repeat(64)}`,
    repository_id_kind: "local_only",
    portable: false,
    head_sha: "b".repeat(40),
    detached: false,
    shallow: false,
    tree_digest_version: 1,
    tree_digest: treeDigest,
    tracked_index_entry_count: 1,
    unstaged_changed_count: 1,
    included_untracked_count: 0,
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("T058 source drift detection", () => {
  it("changes tree_digest_v1 when tracked worktree content mutates after the start snapshot", () => {
    const repositoryRoot = makeRepository();
    writeFileSync(join(repositoryRoot, "tracked.txt"), "start\n");
    commitAll(repositoryRoot, "base");

    const start = readTreeDigestV1(repositoryRoot);
    expect(start.unstaged_changed_count).toBe(0);

    writeFileSync(join(repositoryRoot, "tracked.txt"), "mutated\n");
    const end = readTreeDigestV1(repositoryRoot);

    expect(end.unstaged_changed_count).toBe(1);
    expect(end.tree_digest).not.toBe(start.tree_digest);
  });

  it("detects mutation of included untracked content while excluding .ascout runtime writes", () => {
    const repositoryRoot = makeRepository();
    writeFileSync(join(repositoryRoot, "tracked.txt"), "base\n");
    commitAll(repositoryRoot, "base");

    writeFileSync(join(repositoryRoot, "notes.txt"), "start\n");
    const start = readTreeDigestV1(repositoryRoot);
    expect(start.included_untracked_count).toBe(1);

    mkdirSync(join(repositoryRoot, ".ascout", "runs", "r1"), { recursive: true });
    writeFileSync(join(repositoryRoot, ".ascout", "runs", "r1", "stdout.txt"), "runtime one\n");
    const withRuntimeOutput = readTreeDigestV1(repositoryRoot);
    expect(withRuntimeOutput).toEqual(start);

    writeFileSync(join(repositoryRoot, ".ascout", "runs", "r1", "stdout.txt"), "runtime two\n");
    expect(readTreeDigestV1(repositoryRoot)).toEqual(start);

    writeFileSync(join(repositoryRoot, "notes.txt"), "mutated\n");
    const end = readTreeDigestV1(repositoryRoot);
    expect(end.included_untracked_count).toBe(1);
    expect(end.tree_digest).not.toBe(start.tree_digest);
  });
});

describe("T058 drift exit contract", () => {
  it("maps a valid tree-drifted receipt to exit 3 ahead of a remaining exercise gap", () => {
    const start = sourceState("c".repeat(64));
    const end = sourceState("d".repeat(64));

    const receipt = buildReceipt({
      run: {
        run_id: "run-t058-drift",
        ascout_version: "0.1.0-m1",
        started_at: "2026-08-27T10:30:00.000Z",
        finished_at: "2026-08-27T10:30:01.000Z",
        config_digest: "e".repeat(64),
      },
      sourceStart: start,
      sourceEnd: end,
      comparison: {
        kind: "working_tree_vs_head",
        base_ref: start.head_sha,
        includes_staged: true,
        includes_unstaged: true,
        includes_untracked_nonignored: true,
        changed_files: [{
          path: "src/a.ts",
          change_kind: "modified",
          line_semantics: "text",
          changed_new_line_ranges: [[10, 10]],
          is_test_file: false,
          is_snapshot: false,
          is_command_surface: false,
        }],
      },
      selection: {
        mode: "native_related",
        initial_scope: { kind: "repository", path: null },
        selected_test_count: 1,
        deselected_test_count: 0,
        total_test_count: 1,
        widened: false,
        widen_triggers: [],
        passes: [{
          ordinal: 1,
          mode: "native_related",
          scope: { kind: "repository", path: null },
          trigger: null,
          selected_test_count: 1,
          deselected_test_count: 0,
          total_test_count: 1,
        }],
        limitations: [],
      },
      tasks: [{
        task_id: "test-1",
        task_type: "test",
        authorized_by: "discovery",
        source_path: "package.json",
        argv: ["vitest", "related", "src/a.ts", "--run"],
        argv_redacted: false,
        tool_name: "vitest",
        tool_version: "4.1.10",
        command_surface_changed: false,
        changed_authority_paths: [],
        execution_admission: "normal",
        status: "PASS",
        reason_code: null,
        reason_text: null,
        exit_code: 0,
        started_at: "2026-08-27T10:30:00.000Z",
        finished_at: "2026-08-27T10:30:01.000Z",
        duration_ms: 1_000,
        observations: { runs: 1, failures: 0 },
        cache_state: "cold",
        evidence_ids: ["coverage-1"],
        artifact_refs: [],
        output_truncated: false,
      }],
      exercise: {
        changed_executable_lines: 1,
        exercised_lines: 0,
        not_exercised_lines: 1,
        unresolved_lines: 0,
        changed_files_with_zero_exercised_lines: 1,
        records: [{
          path: "src/a.ts",
          line: 10,
          state: "NOT_EXERCISED",
          execution_count: 0,
          source_task_ids: ["test-1"],
        }],
      },
      testChanges: [],
      findings: [],
      evidence: [{
        evidence_id: "coverage-1",
        run_id: "run-t058-drift",
        task_id: "test-1",
        sequence: 1,
        kind: "coverage",
        sha256: "f".repeat(64),
        artifact_id: null,
        redacted: false,
        truncated: false,
      }],
      artifacts: [],
    });

    expect(receipt.stability).toBe("tree_drifted");
    expect(receipt.summary.completeness).toBe("materially_incomplete");
    expect(receipt.summary.exit_code).toBe(3);
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
  });
});
