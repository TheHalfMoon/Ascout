import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { readGitHeadState, readWorkingTreeComparison } from "../src/git.js";
import { validateReceiptSemantics, type ReceiptV1 } from "../src/receipt/model.js";

const temporaryDirectories: string[] = [];
const NULL_GIT_CONFIG = process.platform === "win32" ? "NUL" : "/dev/null";
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: NULL_GIT_CONFIG,
  GIT_CONFIG_SYSTEM: NULL_GIT_CONFIG,
  GIT_TERMINAL_PROMPT: "0",
};
const FIXED_GIT_DATES = {
  GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z",
  GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z",
};

const HEAD_GOLDENS = {
  sha1: "d06e36fb77c98e06d956405722ac8c065a5d1b74",
  sha256: "94688a47c09cb0a184013e8e65d2f6062ad2d6f527546e39fe29ba8cfe8144da",
} as const;

function git(repositoryRoot: string, argv: readonly string[], extraEnv: NodeJS.ProcessEnv = {}): string {
  return execFileSync("git", [...argv], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...GIT_ENV, ...extraEnv },
    windowsHide: true,
  });
}

function makeRepository(objectFormat: "sha1" | "sha256"): string {
  const root = mkdtempSync(join(tmpdir(), `ascout-t081-${objectFormat}-`));
  temporaryDirectories.push(root);
  git(root, ["init", "-q", `--object-format=${objectFormat}`]);
  git(root, ["config", "user.name", "Ascout T081"]);
  git(root, ["config", "user.email", "t081@example.invalid"]);
  git(root, ["config", "commit.gpgsign", "false"]);
  git(root, ["config", "core.autocrlf", "false"]);
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "a.ts"), "export const value = 1;\n", "utf8");
  git(root, ["add", "src/a.ts"]);
  git(root, ["commit", "-q", "-m", "fixture"], FIXED_GIT_DATES);
  return root;
}

function receiptFor(head: string): ReceiptV1 {
  const tree = "b".repeat(64);
  const source = {
    repository_id: `local:${"c".repeat(64)}`,
    repository_id_kind: "local_only" as const,
    portable: false,
    head_sha: head,
    detached: false,
    shallow: false,
    tree_digest_version: 1 as const,
    tree_digest: tree,
    tracked_index_entry_count: 1,
    unstaged_changed_count: 1,
    included_untracked_count: 0,
  };
  return {
    schema_version: "1.0",
    run: {
      run_id: "t081-run",
      ascout_version: "0.1.0-m1",
      started_at: "2026-01-01T00:00:00.000Z",
      finished_at: "2026-01-01T00:00:01.000Z",
      config_digest: "d".repeat(64),
    },
    source: { start: source, end: { ...source } },
    comparison: {
      kind: "working_tree_vs_head",
      base_ref: head,
      includes_staged: true,
      includes_unstaged: true,
      includes_untracked_nonignored: true,
      changed_files: [{
        path: "src/a.ts",
        change_kind: "modified",
        line_semantics: "text",
        changed_new_line_ranges: [[1, 1]],
        is_test_file: false,
        is_snapshot: false,
        is_command_surface: false,
      }],
    },
    selection: {
      mode: "no_test_task",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: null,
      deselected_test_count: null,
      total_test_count: null,
      widened: false,
      widen_triggers: [],
      passes: [],
      limitations: ["t081 deterministic receipt fixture"],
    },
    tasks: [{
      task_id: "lint-1",
      task_type: "lint",
      authorized_by: "discovery",
      source_path: null,
      argv: ["eslint", "src/a.ts"],
      argv_redacted: false,
      tool_name: "eslint",
      tool_version: "1.0.0",
      command_surface_changed: false,
      changed_authority_paths: [],
      execution_admission: "normal",
      status: "PASS",
      reason_code: null,
      reason_text: null,
      exit_code: 0,
      started_at: "2026-01-01T00:00:00.000Z",
      finished_at: "2026-01-01T00:00:01.000Z",
      duration_ms: 1000,
      observations: { runs: 1, failures: 0 },
      cache_state: "cold",
      evidence_ids: ["e1"],
      artifact_refs: ["a1"],
      output_truncated: false,
    }],
    changed_code: { changed_file_count: 1, changed_text_line_count: 1 },
    exercise: {
      changed_executable_lines: 0,
      exercised_lines: 0,
      not_exercised_lines: 0,
      unresolved_lines: 0,
      changed_files_with_zero_exercised_lines: 0,
      records: [],
    },
    test_changes: [],
    findings: [],
    evidence: [{
      evidence_id: "e1",
      run_id: "t081-run",
      task_id: "lint-1",
      sequence: 1,
      kind: "process_result",
      sha256: "e".repeat(64),
      artifact_id: "a1",
      redacted: false,
      truncated: false,
    }],
    artifacts: [{
      artifact_id: "a1",
      task_id: "lint-1",
      relative_run_path: "raw/lint.txt",
      kind: "stdout",
      sha256: "f".repeat(64),
      byte_length: 1,
      redacted: false,
      truncated: false,
    }],
    stability: "stable",
    summary: {
      task_status_counts: {
        PASS: 1,
        FAIL: 0,
        FLAKY: 0,
        BLOCKED: 0,
        ERROR: 0,
        NOT_APPLICABLE: 0,
        NOT_RUN: 0,
      },
      finding_count: 0,
      completeness: "complete",
      exit_code: 0,
    },
  };
}

function issueCodes(receipt: ReceiptV1): string[] {
  return validateReceiptSemantics(receipt).issues.map(({ code }) => code);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("T081 cross-platform receipt goldens", () => {
  for (const objectFormat of ["sha1", "sha256"] as const) {
    it(`binds a deterministic real ${objectFormat.toUpperCase()} repository to one receipt identity`, () => {
      const root = makeRepository(objectFormat);
      const head = readGitHeadState(root);
      expect(head.head_sha).toBe(HEAD_GOLDENS[objectFormat]);
      expect(head.head_sha).toHaveLength(objectFormat === "sha1" ? 40 : 64);

      writeFileSync(join(root, "src", "a.ts"), "export const value = 2;\n", "utf8");
      const comparison = readWorkingTreeComparison(root, head.head_sha);
      expect(comparison.base_ref).toBe(head.head_sha);
      expect(comparison.changed_files).toEqual([{
        path: "src/a.ts",
        change_kind: "modified",
        line_semantics: "text",
        changed_new_line_ranges: [[1, 1]],
      }]);

      const receipt = receiptFor(head.head_sha);
      expect(receipt.comparison.base_ref).toBe(receipt.source.start.head_sha);
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    });
  }

  it("rejects raw path spellings before any repair and rejects inverted ranges", () => {
    for (const invalid of [
      "/src/a.ts",
      "C:/repo/src/a.ts",
      "\\\\server\\share\\a.ts",
      "file:///src/a.ts",
      "src\\a.ts",
      "./src/a.ts",
      "src/../a.ts",
      "src//file.ts",
      "src/",
    ]) {
      const receipt = receiptFor(HEAD_GOLDENS.sha1);
      (receipt.comparison.changed_files[0] as { path: string }).path = invalid;
      expect(issueCodes(receipt), invalid).toContain("noncanonical_original_path");
    }

    const inverted = receiptFor(HEAD_GOLDENS.sha256);
    (inverted.comparison.changed_files[0] as unknown as { changed_new_line_ranges: [number, number][] })
      .changed_new_line_ranges = [[10, 1]];
    (inverted.changed_code as { changed_text_line_count: number }).changed_text_line_count = 10;
    const codes = issueCodes(inverted);
    expect(codes).toContain("changed_range_inverted");
    expect(codes).not.toContain("changed_text_line_count_mismatch");
  });
});
