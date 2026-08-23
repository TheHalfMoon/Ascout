import { describe, expect, it } from "vitest";

import {
  ReceiptContractValidationError,
  renderReceiptJson,
  validateReceiptForAcceptance,
  validateReceiptJsonSchema,
} from "../src/receipt/json.js";
import type { ReceiptV1 } from "../src/receipt/model.js";

function receiptFixture(): ReceiptV1 {
  const head = "a".repeat(40);
  const tree = "b".repeat(64);
  const source = {
    repository_id: `remote:${"c".repeat(64)}`,
    repository_id_kind: "remote" as const,
    portable: true,
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
      run_id: "run-review-findings",
      ascout_version: "0.0.0",
      started_at: "2026-08-22T20:00:00.000Z",
      finished_at: "2026-08-22T20:00:01.000Z",
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
        changed_new_line_ranges: [[1, 2]],
        is_test_file: false,
        is_snapshot: false,
        is_command_surface: false,
      }],
    },
    selection: {
      mode: "full",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: 1,
      deselected_test_count: 0,
      total_test_count: 1,
      widened: false,
      widen_triggers: [],
      passes: [{
        ordinal: 1,
        mode: "full",
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
      source_path: null,
      argv: ["vitest", "run"],
      argv_redacted: false,
      tool_name: "vitest",
      tool_version: "1.0.0",
      command_surface_changed: false,
      changed_authority_paths: [],
      execution_admission: "normal",
      status: "PASS",
      reason_code: null,
      reason_text: null,
      exit_code: 0,
      started_at: "2026-08-22T20:00:00.000Z",
      finished_at: "2026-08-22T20:00:01.000Z",
      duration_ms: 1000,
      observations: { runs: 1, failures: 0 },
      cache_state: "cold",
      evidence_ids: ["e1", "coverage-1"],
      artifact_refs: ["a1"],
      output_truncated: false,
    }],
    changed_code: { changed_file_count: 1, changed_text_line_count: 2 },
    exercise: {
      changed_executable_lines: 1,
      exercised_lines: 1,
      not_exercised_lines: 0,
      unresolved_lines: 0,
      changed_files_with_zero_exercised_lines: 0,
      records: [{
        path: "src/a.ts",
        line: 1,
        state: "EXERCISED",
        execution_count: 1,
        source_task_ids: ["test-1"],
      }],
    },
    test_changes: [],
    findings: [],
    evidence: [{
      evidence_id: "e1",
      run_id: "run-review-findings",
      task_id: "test-1",
      sequence: 1,
      kind: "test_result",
      sha256: "e".repeat(64),
      artifact_id: "a1",
      redacted: false,
      truncated: false,
    }, {
      evidence_id: "coverage-1",
      run_id: "run-review-findings",
      task_id: "test-1",
      sequence: 2,
      kind: "coverage",
      sha256: "a".repeat(64),
      artifact_id: null,
      redacted: false,
      truncated: false,
    }],
    artifacts: [{
      artifact_id: "a1",
      task_id: "test-1",
      relative_run_path: "raw/test.txt",
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


describe("T026 receipt JSON renderer", () => {
  it("emits only after schema and semantic validation", () => {
    const receipt = receiptFixture();
    expect(validateReceiptJsonSchema(receipt)).toEqual({ valid: true, issues: [] });
    expect(validateReceiptForAcceptance(receipt)).toBe(receipt);

    const rendered = renderReceiptJson(receipt);
    expect(rendered.endsWith("\n")).toBe(true);
    expect(JSON.parse(rendered)).toEqual(receipt);
  });

  it("fails at the JSON Schema layer before semantic validation for malformed structure", () => {
    const receipt = structuredClone(receiptFixture()) as unknown as Record<string, unknown>;
    receipt.run = null;

    try {
      renderReceiptJson(receipt);
      throw new Error("expected schema validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ReceiptContractValidationError);
      const contractError = error as ReceiptContractValidationError;
      expect(contractError.layer).toBe("schema");
      expect(contractError.schemaIssues.some((issue) => issue.path === "$.run")).toBe(true);
      expect(contractError.semanticIssues).toEqual([]);
    }
  });

  it("rejects noncanonical persisted paths at the JSON Schema boundary", () => {
    const receipt = structuredClone(receiptFixture()) as ReceiptV1;
    (receipt.comparison.changed_files[0] as unknown as { path: string }).path = "src//a.ts";

    try {
      renderReceiptJson(receipt);
      throw new Error("expected schema validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ReceiptContractValidationError);
      const contractError = error as ReceiptContractValidationError;
      expect(contractError.layer).toBe("schema");
      expect(contractError.schemaIssues.some((issue) => issue.keyword === "pattern")).toBe(true);
    }
  });

  it("rejects schema-valid source/comparison mismatches at the semantic layer", () => {
    const receipt = structuredClone(receiptFixture()) as ReceiptV1;
    (receipt.comparison as unknown as { base_ref: string }).base_ref = "9".repeat(40);
    (receipt as unknown as { stability: "unknown" }).stability = "unknown";
    (receipt.summary as unknown as { exit_code: 2 }).exit_code = 2;

    expect(validateReceiptJsonSchema(receipt).valid).toBe(true);
    try {
      renderReceiptJson(receipt);
      throw new Error("expected semantic validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ReceiptContractValidationError);
      const contractError = error as ReceiptContractValidationError;
      expect(contractError.layer).toBe("semantic");
      expect(contractError.semanticIssues.map((issue) => issue.code)).toContain("comparison_source_mismatch");
    }
  });

  it("rejects impossible RFC 3339 calendar dates and invalid time fields", () => {
    const invalidDateTimes = [
      "2023-02-29T00:00:00Z",
      "2024-02-30T00:00:00Z",
      "2024-04-31T00:00:00Z",
      "2024-01-01T24:00:00Z",
      "2024-01-01T23:60:00Z",
      "2024-01-01T23:59:00+24:00",
      "2024-01-01T23:59:00+00:60",
    ];

    for (const dateTime of invalidDateTimes) {
      const receipt = structuredClone(receiptFixture()) as ReceiptV1;
      (receipt.run as unknown as { started_at: string }).started_at = dateTime;
      const result = validateReceiptJsonSchema(receipt);
      expect(result.valid).toBe(false);
      expect(result.issues.some((issue) => issue.path === "$.run.started_at" && issue.keyword === "format")).toBe(true);
    }

    const leapDay = structuredClone(receiptFixture()) as ReceiptV1;
    (leapDay.run as unknown as { started_at: string }).started_at = "2024-02-29T23:59:59.123Z";
    expect(validateReceiptJsonSchema(leapDay).valid).toBe(true);
  });

  it("rejects inverted changed-line ranges before emission", () => {
    const receipt = structuredClone(receiptFixture()) as ReceiptV1;
    (receipt.comparison.changed_files[0] as unknown as { changed_new_line_ranges: Array<[number, number]> })
      .changed_new_line_ranges = [[10, 1]];

    expect(validateReceiptJsonSchema(receipt).valid).toBe(true);
    try {
      renderReceiptJson(receipt);
      throw new Error("expected semantic validation failure");
    } catch (error) {
      const contractError = error as ReceiptContractValidationError;
      expect(contractError.layer).toBe("semantic");
      expect(contractError.semanticIssues.map((issue) => issue.code)).toContain("changed_range_inverted");
    }
  });
});
