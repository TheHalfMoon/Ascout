import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { renderReceiptAgent } from "../src/receipt/agent.js";
import { renderTerminalSummary } from "../src/receipt/build.js";
import {
  renderReceiptJson,
  validateReceiptForAcceptance,
  validateReceiptJsonSchema,
  validateReceiptJsonSchemaAgainstParsedSchemaForProof,
} from "../src/receipt/json.js";
import {
  decideReceiptExitCode,
  deriveReceiptCompleteness,
  validateReceiptSemantics,
  type EnvironmentV1,
  type ReceiptV1,
} from "../src/receipt/model.js";

const PRIOR_SCHEMA_BLOB = "b331de44505f6fbdc5ff033367ef0904fda236b4";
const PRIOR_SCHEMA_URL = new URL("./fixtures/receipt-v1-pre-spec005.schema.json", import.meta.url);

type EnvironmentMutation = (environment: Record<string, unknown>) => void;

function gitBlobShaFromCheckout(bytes: Buffer): string {
  // Git may materialize LF repository text as CRLF on Windows. The pinned identity
  // is the repository blob, so normalize only that checkout transport difference.
  const repositoryBytes = Buffer.from(bytes.toString("utf8").replace(/\r\n/gu, "\n"), "utf8");
  return createHash("sha1")
    .update(Buffer.from(`blob ${repositoryBytes.byteLength}\0`, "utf8"))
    .update(repositoryBytes)
    .digest("hex");
}

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
      run_id: "run-t104-environment",
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
      run_id: "run-t104-environment",
      task_id: "test-1",
      sequence: 1,
      kind: "test_result",
      sha256: "e".repeat(64),
      artifact_id: "a1",
      redacted: false,
      truncated: false,
    }, {
      evidence_id: "coverage-1",
      run_id: "run-t104-environment",
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

const npmEnvironment: EnvironmentV1 = {
  runtime_name: "node",
  runtime_version: "24.15.0",
  platform: "linux",
  architecture: "x64",
  package_manager: "npm",
  package_manager_version: "11.6.0",
  package_manager_source: "package_json",
  lockfile_path: "package-lock.json",
  lockfile_sha256: "1".repeat(64),
};

function withEnvironment(environment: EnvironmentV1): ReceiptV1 {
  return { ...receiptFixture(), environment };
}

function invalidEnvironment(mutate: EnvironmentMutation): unknown {
  const receipt = structuredClone(withEnvironment(npmEnvironment)) as unknown as Record<string, unknown>;
  const environment = receipt.environment as Record<string, unknown>;
  mutate(environment);
  return receipt;
}

const invalidCases: readonly [string, EnvironmentMutation][] = [
  ["unavailable source with manager", (environment) => {
    environment.package_manager_source = "unavailable";
    environment.package_manager = "npm";
    environment.package_manager_version = null;
    environment.lockfile_path = null;
    environment.lockfile_sha256 = null;
  }],
  ["package-json source without version", (environment) => {
    environment.package_manager_version = null;
  }],
  ["partial lockfile identity", (environment) => {
    environment.lockfile_sha256 = null;
  }],
  ["manager-mismatched lockfile", (environment) => {
    environment.lockfile_path = "pnpm-lock.yaml";
  }],
  ["unsafe lockfile path", (environment) => {
    environment.lockfile_path = "../package-lock.json";
  }],
  ["invalid lockfile digest", (environment) => {
    environment.lockfile_sha256 = "ABC";
  }],
  ["lockfile authority with version", (environment) => {
    environment.package_manager_source = "lockfile";
  }],
  ["unsupported runtime", (environment) => {
    environment.runtime_name = "deno";
  }],
];

describe("T104 environment receipt contract", () => {
  it("keeps legacy receipt v1 valid under current semantic and schema validators", () => {
    const receipt = receiptFixture();
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(validateReceiptJsonSchema(receipt)).toEqual({ valid: true, issues: [] });
    expect(validateReceiptForAcceptance(receipt)).toBe(receipt);
  });

  it("accepts an additive environment receipt without changing decision semantics", () => {
    const legacy = receiptFixture();
    const receipt = withEnvironment(npmEnvironment);

    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(validateReceiptJsonSchema(receipt)).toEqual({ valid: true, issues: [] });
    expect(validateReceiptForAcceptance(receipt)).toBe(receipt);
    expect(deriveReceiptCompleteness(receipt)).toBe(deriveReceiptCompleteness(legacy));
    expect(decideReceiptExitCode(receipt)).toBe(decideReceiptExitCode(legacy));
  });

  it("binds the prior strict-schema proof to the exact canonical Git blob and same evaluator", () => {
    const bytes = readFileSync(PRIOR_SCHEMA_URL);
    expect(gitBlobShaFromCheckout(bytes)).toBe(PRIOR_SCHEMA_BLOB);

    const priorSchema = JSON.parse(bytes.toString("utf8")) as unknown;
    const result = validateReceiptJsonSchemaAgainstParsedSchemaForProof(
      withEnvironment(npmEnvironment),
      priorSchema,
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      path: "$.environment",
      keyword: "additionalProperties",
      message: "unknown property is forbidden",
    });
  });

  it.each(invalidCases)("rejects invalid environment state: %s", (_label, mutate) => {
    const result = validateReceiptJsonSchema(invalidEnvironment(mutate));
    expect(result.valid).toBe(false);
  });

  it("accepts explicit unavailable and lockfile-authority states", () => {
    const unavailable: EnvironmentV1 = {
      runtime_name: "node",
      runtime_version: "22.18.0",
      platform: "win32",
      architecture: "x64",
      package_manager: null,
      package_manager_version: null,
      package_manager_source: "unavailable",
      lockfile_path: null,
      lockfile_sha256: null,
    };
    const lockfile: EnvironmentV1 = {
      runtime_name: "node",
      runtime_version: "22.18.0",
      platform: "darwin",
      architecture: "arm64",
      package_manager: "pnpm",
      package_manager_version: null,
      package_manager_source: "lockfile",
      lockfile_path: "pnpm-lock.yaml",
      lockfile_sha256: "2".repeat(64),
    };

    expect(validateReceiptJsonSchema(withEnvironment(unavailable)).valid).toBe(true);
    expect(validateReceiptJsonSchema(withEnvironment(lockfile)).valid).toBe(true);
  });

  it("keeps current JSON, agent, and terminal consumers functional without bespoke presentation", () => {
    const receipt = withEnvironment(npmEnvironment);
    expect(JSON.parse(renderReceiptJson(receipt))).toEqual(receipt);
    expect(renderReceiptAgent(receipt).length).toBeGreaterThan(0);
    expect(renderTerminalSummary(receipt).length).toBeGreaterThan(0);
  });
});