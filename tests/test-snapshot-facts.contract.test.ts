import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { buildReceipt } from "../src/receipt/build.js";
import { validateReceiptJsonSchema } from "../src/receipt/json.js";
import {
  validateReceiptSemantics,
  type ReceiptV1,
  type SourceStateV1,
  type TaskResultV1,
  type TestChangeV1,
} from "../src/receipt/model.js";

const CANONICAL_FACT_KINDS = [
  "test_file_changed",
  "test_file_deleted",
  "snapshot_changed",
  "snapshot_deleted",
] as const;

interface TestChangeSchemaContract {
  readonly $defs: {
    readonly testChange: {
      readonly properties: {
        readonly kind: { readonly enum: readonly string[] };
        readonly source: { readonly const: string };
      };
    };
  };
}

function testChangeSchemaContract(): TestChangeSchemaContract["$defs"]["testChange"] {
  const schema = JSON.parse(readFileSync(
    new URL(
      "../specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json",
      import.meta.url,
    ),
    "utf8",
  )) as TestChangeSchemaContract;
  return schema.$defs.testChange;
}

function sourceState(): SourceStateV1 {
  return {
    repository_id: `local:${"a".repeat(64)}`,
    repository_id_kind: "local_only",
    portable: false,
    head_sha: "b".repeat(40),
    detached: false,
    shallow: false,
    tree_digest_version: 1,
    tree_digest: "c".repeat(64),
    tracked_index_entry_count: 4,
    unstaged_changed_count: 4,
    included_untracked_count: 0,
  };
}

function passingTestTask(): TaskResultV1 {
  return {
    task_id: "test",
    task_type: "test",
    authorized_by: "discovery",
    source_path: "package.json",
    argv: ["vitest", "run"],
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
    started_at: "2026-08-27T16:00:00.000Z",
    finished_at: "2026-08-27T16:00:01.000Z",
    duration_ms: 1_000,
    observations: { runs: 1, failures: 0 },
    cache_state: "not_applicable",
    evidence_ids: [],
    artifact_refs: [],
    output_truncated: false,
  };
}

const FACTS: readonly TestChangeV1[] = [
  {
    kind: "test_file_changed",
    path: "tests/unit/example.test.ts",
    source: "git_diff",
  },
  {
    kind: "test_file_deleted",
    path: "tests/legacy/removed.test.ts",
    source: "git_diff",
  },
  {
    kind: "snapshot_changed",
    path: "tests/__snapshots__/example.test.ts.snap",
    source: "git_diff",
  },
  {
    kind: "snapshot_deleted",
    path: "tests/__snapshots__/removed.test.ts.snap",
    source: "git_diff",
  },
];

function receiptWithFacts(testChanges: readonly TestChangeV1[] = FACTS): ReceiptV1 {
  const source = sourceState();
  return buildReceipt({
    run: {
      run_id: "run-t065-test-snapshot-facts",
      ascout_version: "0.1.0-m1",
      started_at: "2026-08-27T16:00:00.000Z",
      finished_at: "2026-08-27T16:00:01.000Z",
      config_digest: "d".repeat(64),
    },
    sourceStart: source,
    sourceEnd: { ...source },
    comparison: {
      kind: "working_tree_vs_head",
      base_ref: source.head_sha,
      includes_staged: true,
      includes_unstaged: true,
      includes_untracked_nonignored: true,
      changed_files: [
        {
          path: "tests/unit/example.test.ts",
          change_kind: "modified",
          line_semantics: "text",
          changed_new_line_ranges: [[4, 7]],
          is_test_file: true,
          is_snapshot: false,
          is_command_surface: false,
        },
        {
          path: "tests/legacy/removed.test.ts",
          change_kind: "deleted",
          line_semantics: "deleted_only",
          changed_new_line_ranges: [],
          is_test_file: true,
          is_snapshot: false,
          is_command_surface: false,
        },
        {
          path: "tests/__snapshots__/example.test.ts.snap",
          change_kind: "modified",
          line_semantics: "text",
          changed_new_line_ranges: [[1, 2]],
          is_test_file: false,
          is_snapshot: true,
          is_command_surface: false,
        },
        {
          path: "tests/__snapshots__/removed.test.ts.snap",
          change_kind: "deleted",
          line_semantics: "deleted_only",
          changed_new_line_ranges: [],
          is_test_file: false,
          is_snapshot: true,
          is_command_surface: false,
        },
      ],
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
    tasks: [passingTestTask()],
    exercise: {
      changed_executable_lines: 0,
      exercised_lines: 0,
      not_exercised_lines: 0,
      unresolved_lines: 0,
      changed_files_with_zero_exercised_lines: 0,
      records: [],
    },
    testChanges,
    findings: [],
    evidence: [],
    artifacts: [],
  });
}

describe("T065 factual test and snapshot change contract", () => {
  it("locks the receipt schema to exactly four Git-diff-sourced first-slice facts", () => {
    const contract = testChangeSchemaContract();
    expect(contract.properties.kind.enum).toEqual(CANONICAL_FACT_KINDS);
    expect(contract.properties.source).toEqual({ const: "git_diff" });

    const receipt = receiptWithFacts();
    expect(receipt.test_changes).toEqual(FACTS);
    expect(validateReceiptJsonSchema(receipt)).toEqual({ valid: true, issues: [] });
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
  });

  it("keeps factual verification-asset changes orthogonal to pass/completeness/exit truth", () => {
    const withoutFacts = receiptWithFacts([]);
    const withFacts = receiptWithFacts();

    expect(withFacts.summary).toEqual(withoutFacts.summary);
    expect(withFacts.summary).toMatchObject({
      finding_count: 0,
      completeness: "complete",
      exit_code: 0,
    });
    expect(withFacts.tasks[0]).toMatchObject({ status: "PASS" });
    expect(withFacts.findings).toEqual([]);
  });

  it("rejects semantic weakening fields instead of turning syntactic facts into conclusions", () => {
    const receipt = structuredClone(receiptWithFacts()) as unknown as Record<string, unknown>;
    const testChanges = receipt.test_changes as Array<Record<string, unknown>>;
    testChanges[0] = {
      ...testChanges[0],
      weakened: true,
    };

    const result = validateReceiptJsonSchema(receipt);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === "additionalProperties")).toBe(true);
  });

  it("rejects invented semantic-impact kinds outside the factual enum", () => {
    const receipt = structuredClone(receiptWithFacts()) as unknown as Record<string, unknown>;
    const testChanges = receipt.test_changes as Array<Record<string, unknown>>;
    testChanges[0] = {
      kind: "test_file_weakened",
      path: "tests/unit/example.test.ts",
      source: "git_diff",
    };

    const result = validateReceiptJsonSchema(receipt);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === "enum")).toBe(true);
  });

  it("rejects non-Git test-change sources at the receipt boundary", () => {
    const receipt = structuredClone(receiptWithFacts()) as unknown as Record<string, unknown>;
    const testChanges = receipt.test_changes as Array<Record<string, unknown>>;
    testChanges[0] = {
      kind: "test_file_changed",
      path: "tests/unit/example.test.ts",
      source: "repository_scan",
    };

    const result = validateReceiptJsonSchema(receipt);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === "const")).toBe(true);
  });

  it("rejects noncanonical test-change paths at the receipt boundary", () => {
    const receipt = structuredClone(receiptWithFacts()) as unknown as Record<string, unknown>;
    const testChanges = receipt.test_changes as Array<Record<string, unknown>>;
    testChanges[0] = {
      kind: "test_file_changed",
      path: "tests//unit/example.test.ts",
      source: "git_diff",
    };

    const result = validateReceiptJsonSchema(receipt);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === "pattern")).toBe(true);
  });
});
