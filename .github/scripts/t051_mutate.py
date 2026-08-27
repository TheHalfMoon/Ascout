from pathlib import Path

path = Path("src/check.ts")
text = path.read_text()

def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one replacement, found {count}: {old[:100]!r}")
    text = text.replace(old, new, 1)

replace_once(
    'import { readFileSync, writeFileSync } from "node:fs";',
    'import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";',
)
replace_once(
    'import { configDigestV1, parseConfigV1Json, type ConfigV1 } from "./config.js";\n',
    'import { configDigestV1, parseConfigV1Json, type ConfigV1 } from "./config.js";\nimport { normalizeLcovLineCoverage } from "./coverage/lcov.js";\n',
)
replace_once(
    'import {\n  validateReceiptSemantics,',
    'import {\n  UNSAFE_SELECTION_LIMITATION,\n  validateReceiptSemantics,',
)
replace_once(
    'import { planTypeScriptTask } from "./tools/typescript.js";\n',
    'import { planTypeScriptTask } from "./tools/typescript.js";\nimport { planVitestTask, type PlannedVitestTask, type VitestTaskPlan } from "./tools/vitest.js";\n',
)

replace_once(
'''/**
 * Disclosed reason for the fixed `test` task until its dedicated JS/TS test
 * integration lands: the receipt records the omission instead of claiming
 * coverage that was never executed.
 */
export const TEST_TASK_NOT_WIRED_REASON_CODE = "test_task_unavailable";
export const TEST_TASK_NOT_WIRED_REASON_TEXT =
  "JavaScript/TypeScript test planning and execution is not wired in this milestone phase; the omission is recorded instead of claimed coverage.";

/** Selection counts are unobserved until native test-output parsing exists; the limitation is disclosed rather than invented. */
export const SELECTION_COUNTS_NOT_OBSERVED_LIMITATION = "selection_counts_not_observed";
''',
'''/** Selection totals remain unknown until T057/T061 final selection accounting; disclose rather than invent them. */
export const SELECTION_COUNTS_NOT_OBSERVED_LIMITATION = "selection_counts_not_observed";
''',
)

replace_once(
'''function baseSelection(): SelectionV1 {
  return {
    mode: "full",
    initial_scope: { kind: "repository", path: null },
    selected_test_count: null,
    deselected_test_count: null,
    total_test_count: null,
    widened: false,
    widen_triggers: [],
    passes: [],
    limitations: [SELECTION_COUNTS_NOT_OBSERVED_LIMITATION],
  };
}
''',
'''function baseSelection(testPlan: VitestTaskPlan): SelectionV1 {
  const limitations = [SELECTION_COUNTS_NOT_OBSERVED_LIMITATION, UNSAFE_SELECTION_LIMITATION] as const;
  if (testPlan.state !== "planned") {
    return {
      mode: "full",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: null,
      deselected_test_count: null,
      total_test_count: null,
      widened: false,
      widen_triggers: [],
      passes: [],
      limitations,
    };
  }

  const scope = testPlan.workingDirectory === null
    ? ({ kind: "repository", path: null } as const)
    : ({ kind: "package", path: testPlan.workingDirectory } as const);
  return {
    mode: "native_related",
    initial_scope: scope,
    selected_test_count: null,
    deselected_test_count: null,
    total_test_count: null,
    widened: false,
    widen_triggers: [],
    passes: [
      {
        ordinal: 1,
        mode: "native_related",
        scope,
        trigger: null,
        selected_test_count: null,
        deselected_test_count: null,
        total_test_count: null,
      },
    ],
    limitations,
  };
}
''',
)

replace_once(
'''async function executePlannedTask(
  repositoryRoot: string,
  runId: string,
  rawPath: string,
  taskId: SemanticTaskType,
  plan: NormalizedPlan & { state: "planned" },
  decision: TaskAdmissionDecision,
  secrets: readonly string[],
  timeoutMs: number,
): Promise<ExecutedTask> {
''',
'''interface ExecutePlannedTaskOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly toolName?: string;
  readonly toolVersion?: string;
}

async function executePlannedTask(
  repositoryRoot: string,
  runId: string,
  rawPath: string,
  taskId: SemanticTaskType,
  plan: NormalizedPlan & { state: "planned" },
  decision: TaskAdmissionDecision,
  secrets: readonly string[],
  timeoutMs: number,
  options: ExecutePlannedTaskOptions = {},
): Promise<ExecutedTask> {
''',
)
replace_once(
'''    cwd: workingDirectoryPath(repositoryRoot, plan.workingDirectory),
    timeout_ms: timeoutMs,
''',
'''    cwd: workingDirectoryPath(repositoryRoot, plan.workingDirectory),
    ...(options.env === undefined ? {} : { env: options.env }),
    timeout_ms: timeoutMs,
''',
)
replace_once(
'''      authorized_by: plan.authorizedBy,
      source_path: plan.sourcePath,
      argv: [...persistedArgv],
      argv_redacted: argvRedacted,
      tool_name: null,
      tool_version: null,
''',
'''      authorized_by: plan.authorizedBy,
      source_path: plan.sourcePath,
      argv: [...persistedArgv],
      argv_redacted: argvRedacted,
      tool_name: options.toolName ?? null,
      tool_version: options.toolVersion ?? null,
''',
)

marker = "\nfunction nonExecutedTask(\n"
if marker not in text:
    raise SystemExit("nonExecutedTask marker missing")
helper = r'''
const CANONICAL_RUN_RELATIVE_PATH =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.+\/[.]{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u;

interface PersistedTextArtifact extends PersistedCapture {
  readonly text: string;
}

function runRelativeArtifactPath(runId: string, repositoryPath: string): string {
  const prefix = `.ascout/runs/${runId}/`;
  if (!repositoryPath.startsWith(prefix)) {
    throw new Error("Vitest artifact path escaped the current Ascout run.");
  }
  const relativePath = repositoryPath.slice(prefix.length);
  if (!CANONICAL_RUN_RELATIVE_PATH.test(relativePath)) {
    throw new Error("Vitest artifact path is not a canonical run-relative path.");
  }
  return relativePath;
}

function persistGeneratedTextArtifact(
  runId: string,
  taskId: SemanticTaskType,
  sequence: number,
  runPath: string,
  relativeRunPath: string,
  artifactId: string,
  artifactKind: string,
  evidenceKind: EvidenceV1["kind"],
  secrets: readonly string[],
): PersistedTextArtifact {
  const absolute = join(runPath, ...relativeRunPath.split("/"));
  const info = statSync(absolute);
  if (!info.isFile() || info.size > TASK_CAPTURE_CAP_BYTES) {
    throw new Error("Vitest generated artifact is missing, non-file, or exceeds the evidence size budget.");
  }
  const raw = readFileSync(absolute);
  const rawText = raw.toString("utf8");
  const text = redactExactValues(rawText, secrets);
  const persisted = Buffer.from(text, "utf8");
  if (!persisted.equals(raw)) writeFileSync(absolute, persisted);
  const sha256 = createSha256(persisted);
  const redacted = secrets.some((secret) => rawText.includes(secret));
  return {
    text,
    artifact: {
      artifact_id: artifactId,
      task_id: taskId,
      relative_run_path: relativeRunPath,
      kind: artifactKind,
      sha256,
      byte_length: persisted.byteLength,
      redacted,
      truncated: false,
    },
    evidence: {
      evidence_id: `${taskId}.e${sequence}`,
      run_id: runId,
      task_id: taskId,
      sequence,
      kind: evidenceKind,
      sha256,
      artifact_id: artifactId,
      redacted,
      truncated: false,
    },
  };
}

function validVitestMachineResult(text: string): boolean {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return false;
  }
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Array.isArray((value as { readonly testResults?: unknown }).testResults);
}

function withVitestEvidenceError(
  executed: ExecutedTask,
  generated: readonly PersistedTextArtifact[],
): ExecutedTask {
  return {
    task: {
      ...executed.task,
      status: "ERROR",
      reason_code: "vitest_evidence_invalid",
      reason_text: "Vitest did not produce bounded, parseable machine-result and LCOV evidence inside the current Ascout run.",
      evidence_ids: [...executed.task.evidence_ids, ...generated.map(({ evidence }) => evidence.evidence_id)],
      artifact_refs: [...executed.task.artifact_refs, ...generated.map(({ artifact }) => artifact.artifact_id)],
    },
    evidence: [...executed.evidence, ...generated.map(({ evidence }) => evidence)],
    artifacts: [...executed.artifacts, ...generated.map(({ artifact }) => artifact)],
  };
}

async function executeVitestTask(
  repositoryRoot: string,
  runId: string,
  runPath: string,
  rawPath: string,
  plan: PlannedVitestTask,
  decision: TaskAdmissionDecision,
  secrets: readonly string[],
  timeoutMs: number,
): Promise<ExecutedTask> {
  mkdirSync(join(rawPath, "test"), { recursive: true });
  const executionOptions: ExecutePlannedTaskOptions = {
    env: { ...process.env, CI: "1" },
    toolName: "vitest",
    ...(plan.toolVersion === null ? {} : { toolVersion: plan.toolVersion }),
  };
  const executed = await executePlannedTask(
    repositoryRoot,
    runId,
    rawPath,
    "test",
    normalizePlan(plan) as NormalizedPlan & { state: "planned" },
    decision,
    secrets,
    timeoutMs,
    executionOptions,
  );

  if (executed.task.status === "ERROR") return executed;
  if (plan.machineResultPath === null || plan.lcovPath === null) return withVitestEvidenceError(executed, []);

  const generated: PersistedTextArtifact[] = [];
  try {
    const machine = persistGeneratedTextArtifact(
      runId,
      "test",
      3,
      runPath,
      runRelativeArtifactPath(runId, plan.machineResultPath),
      "test.vitest-results",
      "test_result_json",
      "test_result",
      secrets,
    );
    generated.push(machine);
    if (!validVitestMachineResult(machine.text)) return withVitestEvidenceError(executed, generated);

    const coverage = persistGeneratedTextArtifact(
      runId,
      "test",
      4,
      runPath,
      runRelativeArtifactPath(runId, plan.lcovPath),
      "test.lcov",
      "coverage_lcov",
      "coverage",
      secrets,
    );
    generated.push(coverage);
    if (normalizeLcovLineCoverage(coverage.text, repositoryRoot).outcome !== "resolved") {
      return withVitestEvidenceError(executed, generated);
    }
  } catch {
    return withVitestEvidenceError(executed, generated);
  }

  return {
    task: {
      ...executed.task,
      evidence_ids: [...executed.task.evidence_ids, ...generated.map(({ evidence }) => evidence.evidence_id)],
      artifact_refs: [...executed.task.artifact_refs, ...generated.map(({ artifact }) => artifact.artifact_id)],
    },
    evidence: [...executed.evidence, ...generated.map(({ evidence }) => evidence)],
    artifacts: [...executed.artifacts, ...generated.map(({ artifact }) => artifact)],
  };
}
'''
text = text.replace(marker, "\n" + helper + marker, 1)

replace_once(
'''      const plans: Record<"typecheck" | "lint" | "pytestBasic", NormalizedPlan> = {
        typecheck: normalizePlan(planTypeScriptTask({ config, discovery, files })),
        lint: normalizePlan(planESLintTask({
          config,
          discovery,
          files,
          changedFiles: gitComparison.changed_files,
        })),
        pytestBasic: normalizePlan(planPytestBasicTask({ config, discovery, files })),
      };
''',
'''      const vitestPlan = planVitestTask({
        repositoryRoot: root,
        runId,
        config,
        discovery,
        files,
        changedFiles: gitComparison.changed_files,
      });
      const plans: Record<SemanticTaskType, NormalizedPlan> = {
        typecheck: normalizePlan(planTypeScriptTask({ config, discovery, files })),
        lint: normalizePlan(planESLintTask({
          config,
          discovery,
          files,
          changedFiles: gitComparison.changed_files,
        })),
        test: normalizePlan(vitestPlan),
        pytestBasic: normalizePlan(planPytestBasicTask({ config, discovery, files })),
      };
''',
)
replace_once(
'''            plans[task as keyof typeof plans] ?? null,
''',
'''            plans[task],
''',
)
replace_once(
'''
        if (task === "test") {
          const unwired = nonExecutedTask(
            task,
            decision,
            null,
            "NOT_RUN",
            TEST_TASK_NOT_WIRED_REASON_CODE,
            TEST_TASK_NOT_WIRED_REASON_TEXT,
            secrets,
          );
          tasks.push(unwired.task);
          continue;
        }

''',
"\n",
)
replace_once(
'''        const executed = await executePlannedTask(
          root,
          runId,
          runDir.raw_path,
          task,
          plan as NormalizedPlan & { state: "planned" },
          decision,
          secrets,
          taskTimeoutMs(config, task),
        );
''',
'''        const executed = task === "test"
          ? await executeVitestTask(
              root,
              runId,
              runDir.run_path,
              runDir.raw_path,
              vitestPlan as PlannedVitestTask,
              decision,
              secrets,
              taskTimeoutMs(config, task),
            )
          : await executePlannedTask(
              root,
              runId,
              runDir.raw_path,
              task,
              plan as NormalizedPlan & { state: "planned" },
              decision,
              secrets,
              taskTimeoutMs(config, task),
            );
''',
)
replace_once('        selection: baseSelection(),\n', '        selection: baseSelection(vitestPlan),\n')

path.write_text(text)
