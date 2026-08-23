import { describe, expect, it } from "vitest";

import { parseCliArgs, type CliInvocation } from "../src/cli.js";
import type { ExecutionAdmission, TaskResultV1 } from "../src/receipt/model.js";

const ADMISSION_FLAG = "--allow-changed-command-surface";

interface AdmissionDecision {
  readonly command_surface_changed: boolean;
  readonly changed_authority_paths: readonly string[];
  readonly execution_admission: ExecutionAdmission;
  readonly launch_allowed: boolean;
  readonly status?: "NOT_RUN";
  readonly reason_code?: "command_surface_changed";
  readonly reason_text?: string;
}

interface InvocationResult {
  readonly invocation: CliInvocation;
  readonly receiptTask: TaskResultV1;
  readonly launchCount: number;
}

function changedAuthorityIntersection(
  effectiveAuthorityPaths: readonly string[],
  changedPaths: readonly string[],
): readonly string[] {
  const changed = new Set(changedPaths);
  return effectiveAuthorityPaths.filter(
    (path, index) => changed.has(path) && effectiveAuthorityPaths.indexOf(path) === index,
  );
}

function decideAdmission(
  invocation: CliInvocation,
  effectiveAuthorityPaths: readonly string[],
  changedPaths: readonly string[],
): AdmissionDecision {
  const changedAuthorityPaths = changedAuthorityIntersection(
    effectiveAuthorityPaths,
    changedPaths,
  );

  if (changedAuthorityPaths.length === 0) {
    return {
      command_surface_changed: false,
      changed_authority_paths: [],
      execution_admission: "normal",
      launch_allowed: true,
    };
  }

  if (invocation.allowChangedCommandSurface) {
    return {
      command_surface_changed: true,
      changed_authority_paths: changedAuthorityPaths,
      execution_admission: "explicit_changed_surface_override",
      launch_allowed: true,
    };
  }

  return {
    command_surface_changed: true,
    changed_authority_paths: changedAuthorityPaths,
    execution_admission: "refused_changed_surface",
    launch_allowed: false,
    status: "NOT_RUN",
    reason_code: "command_surface_changed",
    reason_text: "effective command or configuration authority changed in this invocation",
  };
}

function runInvocation(
  argv: readonly string[],
  effectiveAuthorityPaths: readonly string[],
  changedPaths: readonly string[],
): InvocationResult {
  const invocation = parseCliArgs(argv);
  const decision = decideAdmission(invocation, effectiveAuthorityPaths, changedPaths);
  let launchCount = 0;

  if (decision.launch_allowed) {
    launchCount += 1;
  }

  const receiptTask: TaskResultV1 = {
    task_id: "test",
    task_type: "test",
    authorized_by: "discovery",
    source_path: "package.json",
    argv: ["vitest", "run"],
    argv_redacted: false,
    tool_name: "vitest",
    tool_version: null,
    command_surface_changed: decision.command_surface_changed,
    changed_authority_paths: decision.changed_authority_paths,
    execution_admission: decision.execution_admission,
    status: decision.launch_allowed ? "PASS" : "NOT_RUN",
    reason_code: decision.reason_code ?? null,
    reason_text: decision.reason_text ?? null,
    exit_code: decision.launch_allowed ? 0 : null,
    started_at: decision.launch_allowed ? "2026-01-01T00:00:00.000Z" : null,
    finished_at: decision.launch_allowed ? "2026-01-01T00:00:00.001Z" : null,
    duration_ms: decision.launch_allowed ? 1 : null,
    observations: { runs: decision.launch_allowed ? 1 : 0, failures: 0 },
    cache_state: "not_applicable",
    evidence_ids: [],
    artifact_refs: [],
    output_truncated: false,
  };

  return { invocation, receiptTask, launchCount };
}

describe("T029 explicit changed-command-surface admission", () => {
  it("applies the override to one invocation only, records it with exact paths, then refuses again", () => {
    const effectiveAuthorityPaths = ["package.json", "vitest.config.ts"] as const;
    const changedPaths = ["src/example.ts", "vitest.config.ts"] as const;

    const ordinaryBefore = runInvocation(
      ["check"],
      effectiveAuthorityPaths,
      changedPaths,
    );
    const explicitlyAllowed = runInvocation(
      ["check", ADMISSION_FLAG],
      effectiveAuthorityPaths,
      changedPaths,
    );
    const ordinaryAfter = runInvocation(
      ["check"],
      effectiveAuthorityPaths,
      changedPaths,
    );

    expect(ordinaryBefore.invocation.allowChangedCommandSurface).toBe(false);
    expect(ordinaryBefore.launchCount).toBe(0);
    expect(ordinaryBefore.receiptTask).toMatchObject({
      command_surface_changed: true,
      changed_authority_paths: ["vitest.config.ts"],
      execution_admission: "refused_changed_surface",
      status: "NOT_RUN",
      reason_code: "command_surface_changed",
    });
    expect(ordinaryBefore.receiptTask.reason_text?.length).toBeGreaterThan(0);

    expect(explicitlyAllowed.invocation.allowChangedCommandSurface).toBe(true);
    expect(explicitlyAllowed.launchCount).toBe(1);
    expect(explicitlyAllowed.receiptTask).toMatchObject({
      command_surface_changed: true,
      changed_authority_paths: ["vitest.config.ts"],
      execution_admission: "explicit_changed_surface_override",
      status: "PASS",
      reason_code: null,
      reason_text: null,
    });
    expect(explicitlyAllowed.receiptTask.changed_authority_paths).not.toContain(
      "src/example.ts",
    );

    expect(ordinaryAfter.invocation.allowChangedCommandSurface).toBe(false);
    expect(ordinaryAfter.launchCount).toBe(0);
    expect(ordinaryAfter.receiptTask).toMatchObject({
      command_surface_changed: true,
      changed_authority_paths: ["vitest.config.ts"],
      execution_admission: "refused_changed_surface",
      status: "NOT_RUN",
      reason_code: "command_surface_changed",
    });
    expect(ordinaryAfter.receiptTask.reason_text?.length).toBeGreaterThan(0);

    expect({
      command_surface_changed: ordinaryAfter.receiptTask.command_surface_changed,
      changed_authority_paths: ordinaryAfter.receiptTask.changed_authority_paths,
      execution_admission: ordinaryAfter.receiptTask.execution_admission,
      status: ordinaryAfter.receiptTask.status,
      reason_code: ordinaryAfter.receiptTask.reason_code,
    }).toEqual({
      command_surface_changed: ordinaryBefore.receiptTask.command_surface_changed,
      changed_authority_paths: ordinaryBefore.receiptTask.changed_authority_paths,
      execution_admission: ordinaryBefore.receiptTask.execution_admission,
      status: ordinaryBefore.receiptTask.status,
      reason_code: ordinaryBefore.receiptTask.reason_code,
    });
  });
});
