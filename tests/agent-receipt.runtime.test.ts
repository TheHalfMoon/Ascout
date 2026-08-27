import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import {
  AGENT_RECEIPT_MAX_UTF8_BYTES,
  AgentReceiptBudgetError,
  encodeAgentFieldValue,
  renderReceiptAgent,
} from "../src/receipt/agent.js";
import { buildReceipt } from "../src/receipt/build.js";
import { ReceiptContractValidationError } from "../src/receipt/json.js";
import type {
  EvidenceV1,
  ExerciseRecordV1,
  FindingV1,
  ReceiptV1,
  SourceStateV1,
  TaskResultV1,
} from "../src/receipt/model.js";

const RECORD_PREFIXES = [
  "ASCOUT_AGENT_V1 ",
  "SUMMARY ",
  "ERROR ",
  "FINDING ",
  "ADMISSION ",
  "GAP ",
  "TEST_CHANGE ",
  "EVIDENCE ",
  "OMITTED ",
] as const;

type Fields = Readonly<Record<string, string>>;

function parseFields(text: string): Fields {
  const fields: Record<string, string> = {};
  for (const token of text.split(" ")) {
    const separator = token.indexOf("=");
    if (separator <= 0 || separator === token.length - 1) {
      throw new Error(`malformed agent field: ${token}`);
    }
    const key = token.slice(0, separator);
    if (Object.hasOwn(fields, key)) throw new Error(`duplicate agent field: ${key}`);
    fields[key] = token.slice(separator + 1);
  }
  return fields;
}

function records(rendered: string, prefix: string): readonly Fields[] {
  return rendered
    .split("\n")
    .filter((line) => line.startsWith(prefix))
    .map((line) => parseFields(line.slice(prefix.length)));
}

function exactlyOne(rendered: string, prefix: string): Fields {
  const matches = records(rendered, prefix);
  if (matches.length !== 1) throw new Error(`expected one ${prefix.trim()} record`);
  return matches[0]!;
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
    tracked_index_entry_count: 3,
    unstaged_changed_count: 3,
    included_untracked_count: 0,
  };
}

function failingTestTask(): TaskResultV1 {
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
    status: "FAIL",
    reason_code: null,
    reason_text: null,
    exit_code: 1,
    started_at: "2026-08-27T12:00:00.000Z",
    finished_at: "2026-08-27T12:00:01.000Z",
    duration_ms: 1000,
    observations: { runs: 1, failures: 1 },
    cache_state: "not_applicable",
    evidence_ids: ["test.result", "test.coverage"],
    artifact_refs: [],
    output_truncated: false,
  };
}

function errorTypecheckTask(): TaskResultV1 {
  return {
    task_id: "typecheck",
    task_type: "typecheck",
    authorized_by: "discovery",
    source_path: "package.json",
    argv: ["tsc", "--noEmit"],
    argv_redacted: false,
    tool_name: "tsc",
    tool_version: "5.9.3",
    command_surface_changed: false,
    changed_authority_paths: [],
    execution_admission: "normal",
    status: "ERROR",
    reason_code: "task_execution_error",
    reason_text: "synthetic T069 task execution error",
    exit_code: 2,
    started_at: "2026-08-27T12:00:00.000Z",
    finished_at: "2026-08-27T12:00:01.000Z",
    duration_ms: 1000,
    observations: { runs: 1, failures: 1 },
    cache_state: "not_applicable",
    evidence_ids: ["typecheck.error"],
    artifact_refs: [],
    output_truncated: false,
  };
}

function refusedLintTask(): TaskResultV1 {
  return {
    task_id: "lint",
    task_type: "lint",
    authorized_by: "discovery",
    source_path: "package.json",
    argv: [],
    argv_redacted: false,
    tool_name: null,
    tool_version: null,
    command_surface_changed: true,
    changed_authority_paths: ["package.json"],
    execution_admission: "refused_changed_surface",
    status: "NOT_RUN",
    reason_code: "command_surface_changed",
    reason_text: "effective command or configuration authority changed in this invocation",
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

function findingFixture(): FindingV1 {
  return {
    finding_id: "finding-1",
    task_id: "test",
    producer: "vitest",
    rule_or_test_id: "src/a.test.ts > changed behavior",
    message: "expected true to be false",
    path: "src/a.test.ts",
    line_start: 10,
    line_end: 10,
    severity: "medium",
    in_changed_lines: null,
    introduced_by_change: "unknown",
    determinism_class: "unknown",
    observations: { runs: 1, failures: 1 },
    reproduced: "unknown",
    evidence_ids: ["test.result"],
  };
}

function evidenceFixture(): readonly EvidenceV1[] {
  return [
    {
      evidence_id: "test.result",
      run_id: "run-t069-agent",
      task_id: "test",
      sequence: 1,
      kind: "test_result",
      sha256: "e".repeat(64),
      artifact_id: null,
      redacted: false,
      truncated: false,
    },
    {
      evidence_id: "test.coverage",
      run_id: "run-t069-agent",
      task_id: "test",
      sequence: 2,
      kind: "coverage",
      sha256: "f".repeat(64),
      artifact_id: null,
      redacted: false,
      truncated: false,
    },
    {
      evidence_id: "typecheck.error",
      run_id: "run-t069-agent",
      task_id: "typecheck",
      sequence: 1,
      kind: "process_result",
      sha256: "1".repeat(64),
      artifact_id: null,
      redacted: false,
      truncated: false,
    },
  ];
}

function exerciseRecords(gapCount: number): readonly ExerciseRecordV1[] {
  return Array.from({ length: gapCount }, (_, index) => {
    const line = index + 1;
    if (line === 2) {
      return {
        path: "src/a.ts",
        line,
        state: "UNRESOLVED" as const,
        execution_count: null,
        source_task_ids: ["test"],
        reason: "coverage_source_mapping_unresolved",
      };
    }
    return {
      path: "src/a.ts",
      line,
      state: "NOT_EXERCISED" as const,
      execution_count: 0,
      source_task_ids: ["test"],
    };
  });
}

function receiptFixture(gapCount = 2): ReceiptV1 {
  const source = sourceState();
  const records = exerciseRecords(gapCount);
  const unresolved = records.filter((record) => record.state === "UNRESOLVED").length;
  return buildReceipt({
    run: {
      run_id: "run-t069-agent",
      ascout_version: "0.1.0-m1",
      started_at: "2026-08-27T12:00:00.000Z",
      finished_at: "2026-08-27T12:00:02.000Z",
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
          changed_new_line_ranges: [[1, Math.max(2, gapCount)]],
          is_test_file: false,
          is_snapshot: false,
          is_command_surface: false,
        },
        {
          path: "tests/old.test.ts",
          change_kind: "deleted",
          line_semantics: "deleted_only",
          changed_new_line_ranges: [],
          is_test_file: true,
          is_snapshot: false,
          is_command_surface: false,
        },
      ],
    },
    selection: {
      mode: "full",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: null,
      deselected_test_count: null,
      total_test_count: null,
      widened: false,
      widen_triggers: [],
      passes: [
        {
          ordinal: 1,
          mode: "full",
          scope: { kind: "repository", path: null },
          trigger: null,
          selected_test_count: null,
          deselected_test_count: null,
          total_test_count: null,
        },
      ],
      limitations: ["selection_counts_not_observed"],
    },
    tasks: [failingTestTask(), errorTypecheckTask(), refusedLintTask()],
    exercise: {
      changed_executable_lines: gapCount,
      exercised_lines: 0,
      not_exercised_lines: gapCount - unresolved,
      unresolved_lines: unresolved,
      changed_files_with_zero_exercised_lines: gapCount === 0 ? 0 : 1,
      records,
    },
    testChanges: [
      {
        kind: "test_file_deleted",
        path: "tests/old.test.ts",
        source: "git_diff",
      },
    ],
    findings: [findingFixture()],
    evidence: evidenceFixture(),
    artifacts: [],
  });
}

function parseNonnegative(fields: Fields, key: string): number {
  const raw = fields[key];
  if (raw === undefined || !/^(?:0|[1-9]\d*)$/.test(raw)) {
    throw new Error(`invalid nonnegative integer ${key}`);
  }
  return Number.parseInt(raw, 10);
}

describe("T069 bounded production agent renderer", () => {
  it("renders the T066/T067 grammar from one accepted ReceiptV1", () => {
    const receipt = receiptFixture();
    const rendered = renderReceiptAgent(receipt);
    const lines = rendered.split("\n");

    expect(lines.every((line) => RECORD_PREFIXES.some((prefix) => line.startsWith(prefix)))).toBe(true);
    expect(lines[0]).toBe(
      `ASCOUT_AGENT_V1 repo=local:${"a".repeat(64)} head=${"b".repeat(40)} stability=stable`,
    );
    expect(lines[1]).toBe(
      "SUMMARY completeness=unknown_due_to_error exit=2 tasks=3 findings=1 exercise_gaps=2 test_changes=1 evidence=3 PASS=0 FAIL=1 FLAKY=0 BLOCKED=0 ERROR=1 NOT_APPLICABLE=0 NOT_RUN=1",
    );
    expect(lines).toContain("ERROR task=typecheck reason=task_execution_error evidence=typecheck.error");
    expect(lines).toContain("FINDING id=finding-1 task=test severity=medium evidence=test.result");
    expect(lines).toContain("ADMISSION task=lint state=refused_changed_surface authority=package.json");
    expect(lines).toContain("GAP kind=NOT_EXERCISED path=src/a.ts line=1");
    expect(lines).toContain(
      "GAP kind=UNRESOLVED path=src/a.ts line=2 reason=coverage_source_mapping_unresolved",
    );
    expect(lines).toContain("TEST_CHANGE kind=test_file_deleted path=tests/old.test.ts");
    expect(lines).toContain("EVIDENCE id=test.result task=test kind=test_result");
    expect(lines).toContain("EVIDENCE id=test.coverage task=test kind=coverage");
    expect(lines).toContain("EVIDENCE id=typecheck.error task=typecheck kind=process_result");
    expect(lines.at(-1)).toBe(
      "OMITTED tasks=1 findings=0 exercise_gaps=0 test_changes=0 evidence=0",
    );
    expect(Buffer.byteLength(rendered, "utf8")).toBeLessThanOrEqual(AGENT_RECEIPT_MAX_UTF8_BYTES);
  });

  it("prioritizes critical truth under pressure and keeps omission totals honest", () => {
    const receipt = receiptFixture(500);
    const rendered = renderReceiptAgent(receipt);
    const lines = rendered.split("\n");
    const errorIndex = lines.findIndex((line) => line.startsWith("ERROR "));
    const findingIndex = lines.findIndex((line) => line.startsWith("FINDING "));
    const admissionIndex = lines.findIndex((line) => line.startsWith("ADMISSION "));
    const gapIndex = lines.findIndex((line) => line.startsWith("GAP "));
    const omittedIndex = lines.findIndex((line) => line.startsWith("OMITTED "));

    expect(Buffer.byteLength(rendered, "utf8")).toBeLessThanOrEqual(AGENT_RECEIPT_MAX_UTF8_BYTES);
    expect(errorIndex).toBeGreaterThan(1);
    expect(findingIndex).toBeGreaterThan(errorIndex);
    expect(admissionIndex).toBeGreaterThan(findingIndex);
    expect(gapIndex).toBeGreaterThan(admissionIndex);
    expect(omittedIndex).toBeGreaterThan(gapIndex);

    const header = exactlyOne(rendered, "ASCOUT_AGENT_V1 ");
    const summary = exactlyOne(rendered, "SUMMARY ");
    const omitted = exactlyOne(rendered, "OMITTED ");
    const errors = records(rendered, "ERROR ");
    const findings = records(rendered, "FINDING ");
    const admissions = records(rendered, "ADMISSION ");
    const gaps = records(rendered, "GAP ");
    const testChanges = records(rendered, "TEST_CHANGE ");
    const evidence = records(rendered, "EVIDENCE ");

    expect(header).toEqual({ repo: receipt.source.start.repository_id, head: receipt.source.start.head_sha, stability: receipt.stability });
    expect(parseNonnegative(summary, "tasks")).toBe(receipt.tasks.length);
    expect(parseNonnegative(summary, "exercise_gaps")).toBe(500);
    expect(parseNonnegative(omitted, "findings") + findings.length).toBe(receipt.findings.length);
    expect(parseNonnegative(omitted, "exercise_gaps") + gaps.length).toBe(500);
    expect(parseNonnegative(omitted, "test_changes") + testChanges.length).toBe(receipt.test_changes.length);
    expect(parseNonnegative(omitted, "evidence") + evidence.length).toBe(receipt.evidence.length);
    expect(parseNonnegative(omitted, "exercise_gaps")).toBeGreaterThan(0);

    const representedTaskIds = new Set([
      ...errors.map((record) => record.task),
      ...admissions.map((record) => record.task),
    ]);
    expect(parseNonnegative(omitted, "tasks") + representedTaskIds.size).toBe(receipt.tasks.length);

    const evidenceById = new Map(evidence.map((record) => [record.id, record]));
    for (const record of [...errors, ...findings]) {
      const linked = evidenceById.get(record.evidence);
      expect(linked).toBeDefined();
      expect(linked!.task).toBe(record.task);
    }
  });

  it("keeps admission truth atomic with a retained ERROR under the default budget", () => {
    const base = receiptFixture();
    const tasks = base.tasks.map((task) =>
      task.task_id === "typecheck"
        ? {
            ...task,
            command_surface_changed: true,
            changed_authority_paths: ["package.json"],
            execution_admission: "explicit_changed_surface_override" as const,
          }
        : task,
    );
    const findings = Array.from({ length: 300 }, (_, index) => ({
      ...findingFixture(),
      finding_id: `finding-pressure-${index + 1}`,
    }));
    const receipt = buildReceipt({
      run: base.run,
      sourceStart: base.source.start,
      sourceEnd: base.source.end,
      comparison: base.comparison,
      selection: base.selection,
      tasks,
      exercise: base.exercise,
      testChanges: base.test_changes,
      findings,
      evidence: base.evidence,
      artifacts: base.artifacts,
    });

    const rendered = renderReceiptAgent(receipt);
    expect(Buffer.byteLength(rendered, "utf8")).toBeLessThanOrEqual(AGENT_RECEIPT_MAX_UTF8_BYTES);
    expect(rendered).toContain(
      "ERROR task=typecheck reason=task_execution_error evidence=typecheck.error",
    );
    expect(rendered).toContain(
      "ADMISSION task=typecheck state=explicit_changed_surface_override authority=package.json",
    );
  });

  it("encodes unpaired UTF-16 surrogates losslessly so identities cannot collapse", () => {
    const first = String.fromCharCode(0xd800);
    const second = String.fromCharCode(0xd801);
    expect(encodeAgentFieldValue(`evidence-${first}`)).toBe("evidence-%uD800");
    expect(encodeAgentFieldValue(`evidence-${second}`)).toBe("evidence-%uD801");
    expect(encodeAgentFieldValue(`evidence-${first}`)).not.toBe(
      encodeAgentFieldValue(`evidence-${second}`),
    );
    expect(encodeAgentFieldValue("%uD800")).toBe("%25uD800");
    expect(encodeAgentFieldValue("😀")).toBe("%F0%9F%98%80");
  });

  it("preserves distinct accepted evidence identities containing lone surrogates", () => {
    const receipt = receiptFixture();
    const firstId = `test.result-${String.fromCharCode(0xd800)}`;
    const secondId = `test.coverage-${String.fromCharCode(0xd801)}`;
    const candidate: ReceiptV1 = {
      ...receipt,
      tasks: receipt.tasks.map((task) =>
        task.task_id === "test"
          ? { ...task, evidence_ids: [firstId, secondId] }
          : task,
      ),
      findings: receipt.findings.map((finding) => ({
        ...finding,
        evidence_ids: [firstId],
      })),
      evidence: receipt.evidence.map((evidence) => {
        if (evidence.evidence_id === "test.result") return { ...evidence, evidence_id: firstId };
        if (evidence.evidence_id === "test.coverage") return { ...evidence, evidence_id: secondId };
        return evidence;
      }),
    };
    const rendered = renderReceiptAgent(candidate);
    expect(rendered).toContain("EVIDENCE id=test.result-%uD800 task=test kind=test_result");
    expect(rendered).toContain("EVIDENCE id=test.coverage-%uD801 task=test kind=coverage");
    expect(rendered).toContain("FINDING id=finding-1 task=test severity=medium evidence=test.result-%uD800");
  });

  it("encodes structural field bytes so legal paths cannot forge agent records", () => {
    const receipt = receiptFixture();
    const candidate: ReceiptV1 = {
      ...receipt,
      comparison: {
        ...receipt.comparison,
        changed_files: receipt.comparison.changed_files.map((file) =>
          file.path === "tests/old.test.ts"
            ? { ...file, path: "tests/old case.test.ts" }
            : file,
        ),
      },
      test_changes: [
        {
          kind: "test_file_deleted",
          path: "tests/old case.test.ts",
          source: "git_diff",
        },
      ],
    };
    const rendered = renderReceiptAgent(candidate);
    expect(rendered).toContain(
      "TEST_CHANGE kind=test_file_deleted path=tests/old%20case.test.ts",
    );
    expect(rendered).not.toContain("path=tests/old case.test.ts");
  });

  it("reuses canonical schema/semantic acceptance before projection", () => {
    const receipt = receiptFixture();
    const invalid = {
      ...receipt,
      source: {
        ...receipt.source,
        start: { ...receipt.source.start, head_sha: "abc" },
      },
      comparison: { ...receipt.comparison, base_ref: "abc" },
    };
    expect(() => renderReceiptAgent(invalid)).toThrow(ReceiptContractValidationError);
  });

  it("never permits a configured budget above the canonical 16 KiB cap", () => {
    expect(() => renderReceiptAgent(receiptFixture(), {
      maxUtf8Bytes: AGENT_RECEIPT_MAX_UTF8_BYTES + 1,
    })).toThrow(RangeError);
    expect(() => renderReceiptAgent(receiptFixture(), { maxUtf8Bytes: 64 })).toThrow(
      AgentReceiptBudgetError,
    );
  });
});
