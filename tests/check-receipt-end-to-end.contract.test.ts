import { describe, expect, it } from "vitest";

import { configDigestV1 } from "../src/config.js";
import { repositoryIdentityFromRemote } from "../src/git.js";
import {
  ReceiptContractValidationError,
  renderReceiptJson,
  validateReceiptForAcceptance,
} from "../src/receipt/json.js";
import {
  decideReceiptExitCode,
  deriveReceiptCompleteness,
  validateReceiptSemantics,
  type ReceiptV1,
  type TaskResultV1,
} from "../src/receipt/model.js";

const CONFIG = {
  version: 1,
  tasks: {
    lint: { command: ["eslint", "src/a.ts"] },
    test: { command: ["vitest", "--run", "src/a.test.ts"] },
  },
  budgetMs: 60_000,
} as const;

const HEAD_SHA1 = "a".repeat(40);
const TREE_DIGEST = "b".repeat(64);

function validEndToEndReceipt(): ReceiptV1 {
  const identity = repositoryIdentityFromRemote(
    "https://user:secret@example.com/TheHalfMoon/Ascout.git?token=hidden#fragment",
  );
  const source = {
    ...identity,
    head_sha: HEAD_SHA1,
    detached: false,
    shallow: false,
    tree_digest_version: 1 as const,
    tree_digest: TREE_DIGEST,
    tracked_index_entry_count: 4,
    unstaged_changed_count: 2,
    included_untracked_count: 0,
  };

  return {
    schema_version: "1.0",
    run: {
      run_id: "run-t033-end-to-end",
      ascout_version: "0.0.0",
      started_at: "2026-08-23T06:35:00.000Z",
      finished_at: "2026-08-23T06:35:02.000Z",
      config_digest: configDigestV1(CONFIG),
    },
    source: {
      start: source,
      end: { ...source },
    },
    comparison: {
      kind: "working_tree_vs_head",
      base_ref: HEAD_SHA1,
      includes_staged: true,
      includes_unstaged: true,
      includes_untracked_nonignored: true,
      changed_files: [
        {
          path: "package.json",
          change_kind: "modified",
          line_semantics: "text",
          changed_new_line_ranges: [[1, 1]],
          is_test_file: false,
          is_snapshot: false,
          is_command_surface: true,
        },
        {
          path: "src/a.ts",
          change_kind: "modified",
          line_semantics: "text",
          changed_new_line_ranges: [[10, 12]],
          is_test_file: false,
          is_snapshot: false,
          is_command_surface: false,
        },
      ],
    },
    selection: {
      mode: "native_related",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: 2,
      deselected_test_count: 8,
      total_test_count: 10,
      widened: false,
      widen_triggers: [],
      passes: [
        {
          ordinal: 1,
          mode: "native_related",
          scope: { kind: "repository", path: null },
          trigger: null,
          selected_test_count: 2,
          deselected_test_count: 8,
          total_test_count: 10,
        },
      ],
      limitations: [],
    },
    tasks: [
      {
        task_id: "lint-1",
        task_type: "lint",
        authorized_by: "repo_config",
        source_path: "package.json",
        argv: ["eslint", "src/a.ts"],
        argv_redacted: false,
        tool_name: "eslint",
        tool_version: "9.0.0",
        command_surface_changed: true,
        changed_authority_paths: ["package.json"],
        execution_admission: "explicit_changed_surface_override",
        status: "PASS",
        reason_code: null,
        reason_text: null,
        exit_code: 0,
        started_at: "2026-08-23T06:35:00.000Z",
        finished_at: "2026-08-23T06:35:01.000Z",
        duration_ms: 1000,
        observations: { runs: 1, failures: 0 },
        cache_state: "cold",
        evidence_ids: ["e-lint-admission", "e-lint-process"],
        artifact_refs: ["a-lint"],
        output_truncated: false,
      },
      {
        task_id: "test-1",
        task_type: "test",
        authorized_by: "repo_config",
        source_path: "vitest.config.ts",
        argv: ["vitest", "--run", "src/a.test.ts"],
        argv_redacted: false,
        tool_name: "vitest",
        tool_version: "4.0.0",
        command_surface_changed: false,
        changed_authority_paths: [],
        execution_admission: "normal",
        status: "PASS",
        reason_code: null,
        reason_text: null,
        exit_code: 0,
        started_at: "2026-08-23T06:35:01.000Z",
        finished_at: "2026-08-23T06:35:02.000Z",
        duration_ms: 1000,
        observations: { runs: 1, failures: 0 },
        cache_state: "cold",
        selected_test_count: 2,
        deselected_test_count: 8,
        evidence_ids: ["e-test-result"],
        artifact_refs: ["a-test"],
        output_truncated: false,
      },
    ],
    changed_code: {
      changed_file_count: 2,
      changed_text_line_count: 4,
    },
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
    evidence: [
      {
        evidence_id: "e-lint-admission",
        run_id: "run-t033-end-to-end",
        task_id: "lint-1",
        sequence: 1,
        kind: "admission",
        sha256: "1".repeat(64),
        artifact_id: null,
        redacted: true,
        truncated: false,
      },
      {
        evidence_id: "e-lint-process",
        run_id: "run-t033-end-to-end",
        task_id: "lint-1",
        sequence: 2,
        kind: "process_result",
        sha256: "2".repeat(64),
        artifact_id: "a-lint",
        redacted: true,
        truncated: false,
      },
      {
        evidence_id: "e-test-result",
        run_id: "run-t033-end-to-end",
        task_id: "test-1",
        sequence: 1,
        kind: "test_result",
        sha256: "3".repeat(64),
        artifact_id: "a-test",
        redacted: true,
        truncated: false,
      },
    ],
    artifacts: [
      {
        artifact_id: "a-lint",
        task_id: "lint-1",
        relative_run_path: "raw/lint.txt",
        kind: "stdout",
        sha256: "4".repeat(64),
        byte_length: 128,
        redacted: true,
        truncated: false,
      },
      {
        artifact_id: "a-test",
        task_id: "test-1",
        relative_run_path: "raw/test.json",
        kind: "test_result",
        sha256: "5".repeat(64),
        byte_length: 256,
        redacted: true,
        truncated: false,
      },
    ],
    stability: "stable",
    summary: {
      task_status_counts: {
        PASS: 2,
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

function semanticCodes(receipt: ReceiptV1): readonly string[] {
  return validateReceiptSemantics(receipt).issues.map((issue) => issue.code);
}

function captureContractError(action: () => unknown): ReceiptContractValidationError {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(ReceiptContractValidationError);
    return error as ReceiptContractValidationError;
  }
  throw new Error("expected receipt contract validation to fail");
}

function expectSemanticRejection(receipt: ReceiptV1, code: string): void {
  const error = captureContractError(() => renderReceiptJson(receipt));
  expect(error.layer).toBe("semantic");
  expect(error.semanticIssues.map((issue) => issue.code)).toContain(code);
}

function notRunTask(): TaskResultV1 {
  return {
    task_id: "typecheck-omitted",
    task_type: "typecheck",
    authorized_by: "discovery",
    source_path: null,
    argv: [],
    argv_redacted: false,
    tool_name: null,
    tool_version: null,
    command_surface_changed: false,
    changed_authority_paths: [],
    execution_admission: "normal",
    status: "NOT_RUN",
    reason_code: "tool_missing",
    reason_text: "The applicable typecheck tool is unavailable.",
    exit_code: null,
    started_at: null,
    finished_at: null,
    duration_ms: null,
    observations: { runs: 0, failures: 0 },
    cache_state: "not_applicable",
    evidence_ids: [],
    artifact_refs: [],
    output_truncated: false,
  };
}

describe("T033 end-to-end check receipt contract", () => {
  it("round-trips one complete source-bound receipt through production config, identity, schema, semantics, and JSON emission", () => {
    const receipt = validEndToEndReceipt();
    const rendered = renderReceiptJson(receipt);
    const parsed = JSON.parse(rendered) as unknown;
    const accepted = validateReceiptForAcceptance(parsed);

    expect(accepted).toEqual(receipt);
    expect(rendered.endsWith("\n")).toBe(true);
    expect(receipt.run.config_digest).toBe(configDigestV1(CONFIG));
    expect(receipt.run.config_digest).toMatch(/^[a-f0-9]{64}$/);
    expect(receipt.source.start.repository_id).toMatch(/^remote:[a-f0-9]{64}$/);
    expect(receipt.source.start.repository_id).not.toContain("user");
    expect(receipt.source.start.repository_id).not.toContain("secret");
    expect(receipt.source.start.repository_id).not.toContain("token");
    expect(receipt.source.start.head_sha).toBe(receipt.comparison.base_ref);
    expect(receipt.source.start.head_sha).toHaveLength(40);
    expect(receipt.comparison.changed_files.every((file) => file.changed_new_line_ranges.every(([start, end]) => start <= end))).toBe(true);
    expect(receipt.tasks[0]).toMatchObject({
      command_surface_changed: true,
      changed_authority_paths: ["package.json"],
      execution_admission: "explicit_changed_surface_override",
      status: "PASS",
    });
    expect(receipt.evidence.map((item) => item.evidence_id)).toEqual([
      "e-lint-admission",
      "e-lint-process",
      "e-test-result",
    ]);
    expect(receipt.artifacts.map((item) => item.relative_run_path)).toEqual([
      "raw/lint.txt",
      "raw/test.json",
    ]);
    expect(receipt.stability).toBe("stable");
    expect(receipt.summary).toMatchObject({ completeness: "complete", exit_code: 0 });
  });

  it.each([40, 64] as const)("accepts a full %i-hex Git object identity only when source and comparison are exactly bound", (length) => {
    const receipt = validEndToEndReceipt();
    const objectId = "f".repeat(length);
    (receipt.source.start as { head_sha: string }).head_sha = objectId;
    (receipt.source.end as { head_sha: string }).head_sha = objectId;
    (receipt.comparison as { base_ref: string }).base_ref = objectId;

    expect(() => renderReceiptJson(receipt)).not.toThrow();
  });

  it("rejects abbreviated, symbolic, malformed, and mismatched source/comparison identities", () => {
    for (const invalidHead of ["a".repeat(12), "HEAD", "g".repeat(40)]) {
      const receipt = validEndToEndReceipt();
      (receipt.source.start as { head_sha: string }).head_sha = invalidHead;
      const error = captureContractError(() => renderReceiptJson(receipt));
      expect(error.layer, invalidHead).toBe("schema");
      expect(error.schemaIssues.length, invalidHead).toBeGreaterThan(0);
    }

    const mismatch = validEndToEndReceipt();
    (mismatch.comparison as { base_ref: string }).base_ref = "c".repeat(40);
    expectSemanticRejection(mismatch, "comparison_source_mismatch");
  });

  it("rejects an inverted changed-line range before changed-line arithmetic", () => {
    const receipt = validEndToEndReceipt();
    (receipt.comparison.changed_files[1] as unknown as { changed_new_line_ranges: [number, number][] })
      .changed_new_line_ranges = [[10, 1]];
    (receipt.changed_code as { changed_text_line_count: number }).changed_text_line_count = 999;

    const codes = semanticCodes(receipt);
    expect(codes).toContain("changed_range_inverted");
    expect(codes).not.toContain("changed_text_line_count_mismatch");
    expectSemanticRejection(receipt, "changed_range_inverted");
  });

  it("rejects original noncanonical path spellings without repairing them", () => {
    const invalidSpellings = [
      "/src/a.ts",
      "C:/repo/src/a.ts",
      "\\\\server\\share\\a.ts",
      "file:///src/a.ts",
      "src\\a.ts",
      "./src/a.ts",
      "src/../a.ts",
      "src//a.ts",
      "src/",
    ];

    for (const invalid of invalidSpellings) {
      const receipt = validEndToEndReceipt();
      const changed = receipt.comparison.changed_files[1] as unknown as { path: string };
      changed.path = invalid;

      const codes = semanticCodes(receipt);
      expect(codes, invalid).toContain("noncanonical_original_path");
      expect(changed.path, invalid).toBe(invalid);
      const error = captureContractError(() => renderReceiptJson(receipt));
      expect(error.layer, invalid).toBe("schema");
      expect(error.schemaIssues.length, invalid).toBeGreaterThan(0);
      expect(changed.path, invalid).toBe(invalid);
    }
  });

  it("rejects dangling, cross-run, and cross-task evidence references", () => {
    const dangling = validEndToEndReceipt();
    (dangling.tasks[0] as unknown as { evidence_ids: string[] }).evidence_ids.push("missing-evidence");
    expect(semanticCodes(dangling)).toContain("dangling_task_evidence_ref");
    expectSemanticRejection(dangling, "dangling_task_evidence_ref");

    const crossRun = validEndToEndReceipt();
    (crossRun.evidence[2] as { run_id: string }).run_id = "other-run";
    expect(semanticCodes(crossRun)).toContain("cross_run_evidence");
    expectSemanticRejection(crossRun, "cross_run_evidence");

    const crossTask = validEndToEndReceipt();
    (crossTask.tasks[0] as unknown as { evidence_ids: string[] }).evidence_ids.push("e-test-result");
    expect(semanticCodes(crossTask)).toContain("cross_task_evidence_ref");
    expectSemanticRejection(crossTask, "cross_task_evidence_ref");
  });

  it("rejects a false-green summary when known applicable work did not run", () => {
    const receipt = validEndToEndReceipt();
    (receipt.tasks as unknown as TaskResultV1[]).push(notRunTask());
    (receipt.summary.task_status_counts as { NOT_RUN: number }).NOT_RUN = 1;

    expect(deriveReceiptCompleteness(receipt)).toBe("materially_incomplete");
    expect(decideReceiptExitCode(receipt)).toBe(4);

    const codes = semanticCodes(receipt);
    expect(codes).toContain("completeness_mismatch");
    expect(codes).toContain("exit_code_mismatch");
    expectSemanticRejection(receipt, "completeness_mismatch");
  });
});
