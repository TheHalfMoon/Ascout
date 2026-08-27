from pathlib import Path

path = Path("src/check.ts")
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected one match, found {count}: {old[:120]!r}")
    text = text.replace(old, new, 1)


def replace_between(start: str, end: str, new: str) -> None:
    global text
    i = text.find(start)
    if i < 0:
        raise SystemExit(f"start marker missing: {start!r}")
    j = text.find(end, i)
    if j < 0:
        raise SystemExit(f"end marker missing: {end!r}")
    text = text[:i] + new + text[j:]


replace_once(
    'import { normalizeLcovLineCoverage } from "./coverage/lcov.js";',
    'import { normalizeLcovLineCoverage, type LcovLinePoint } from "./coverage/lcov.js";',
)
replace_once(
    'import { decidePreRunWidening, initialSelection, preRunPlanningChangedFiles } from "./selection.js";',
    '''import {
  decidePostRunWidening,
  decidePreRunWidening,
  initialSelection,
  postRunPlanningChangedFiles,
  preRunPlanningChangedFiles,
  withPostRunWideningPass,
} from "./selection.js";''',
)

replace_once(
    '''interface ExecutedTask {
  readonly task: TaskResultV1;
  readonly evidence: readonly EvidenceV1[];
  readonly artifacts: readonly ArtifactV1[];
}

interface ExecutePlannedTaskOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly toolName?: string;
  readonly toolVersion?: string;
}''',
    '''interface ExecutedTask {
  readonly task: TaskResultV1;
  readonly evidence: readonly EvidenceV1[];
  readonly artifacts: readonly ArtifactV1[];
}

interface ExecutedTestTask extends ExecutedTask {
  readonly coveragePoints: readonly LcovLinePoint[] | null;
}

interface ExecutePlannedTaskOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly toolName?: string;
  readonly toolVersion?: string;
  readonly captureFilePrefix?: string;
  readonly evidenceSequenceStart?: number;
}''',
)

replace_between(
    '  const stdoutPersisted = persistCapture(\n',
    '\n\n  const persistedArgv = redactPersistedArgv',
    '''  const captureFilePrefix = options.captureFilePrefix ?? taskId;
  const evidenceSequenceStart = options.evidenceSequenceStart ?? 1;
  const stdoutPersisted = persistCapture(
    runId, taskId, evidenceSequenceStart, rawPath, `${captureFilePrefix}-stdout.log`,
    result.stdout.bytes, result.stdout.truncated, secrets,
  );
  const stderrPersisted = persistCapture(
    runId, taskId, evidenceSequenceStart + 1, rawPath, `${captureFilePrefix}-stderr.log`,
    result.stderr.bytes, result.stderr.truncated, secrets,
  );''',
)

vitest_block = r'''function withVitestEvidenceError(
  executed: ExecutedTask,
  generated: readonly PersistedTextArtifact[],
): ExecutedTestTask {
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
    coveragePoints: null,
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
  passOrdinal: 1 | 2 = 1,
): Promise<ExecutedTestTask> {
  mkdirSync(
    passOrdinal === 1 ? join(rawPath, "test") : join(rawPath, "test", "pass-2"),
    { recursive: true },
  );
  const executionOptions: ExecutePlannedTaskOptions = {
    env: { ...process.env, CI: "1" },
    toolName: "vitest",
    ...(plan.toolVersion === null ? {} : { toolVersion: plan.toolVersion }),
    captureFilePrefix: passOrdinal === 1 ? "test" : "test-pass-2",
    evidenceSequenceStart: passOrdinal === 1 ? 1 : 5,
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

  if (executed.task.status === "ERROR") return { ...executed, coveragePoints: null };
  if (plan.machineResultPath === null || plan.lcovPath === null) return withVitestEvidenceError(executed, []);

  const generated: PersistedTextArtifact[] = [];
  const generatedSequenceStart = passOrdinal === 1 ? 3 : 7;
  const artifactPrefix = passOrdinal === 1 ? "test" : "test.pass-2";
  let coveragePoints: readonly LcovLinePoint[] | null = null;
  try {
    const machine = persistGeneratedTextArtifact(
      runId,
      "test",
      generatedSequenceStart,
      runPath,
      runRelativeArtifactPath(runId, plan.machineResultPath),
      `${artifactPrefix}.vitest-results`,
      "test_result_json",
      "test_result",
      secrets,
    );
    generated.push(machine);
    if (!validVitestMachineResult(machine.text)) return withVitestEvidenceError(executed, generated);

    const coverage = persistGeneratedTextArtifact(
      runId,
      "test",
      generatedSequenceStart + 1,
      runPath,
      runRelativeArtifactPath(runId, plan.lcovPath),
      `${artifactPrefix}.lcov`,
      "coverage_lcov",
      "coverage",
      secrets,
    );
    generated.push(coverage);
    const normalized = normalizeLcovLineCoverage(coverage.text, repositoryRoot);
    if (normalized.outcome !== "resolved") return withVitestEvidenceError(executed, generated);
    coveragePoints = normalized.points;
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
    coveragePoints,
  };
}


'''
replace_between("function withVitestEvidenceError(", "function validJestMachineResult", vitest_block)

jest_block = r'''function withJestEvidenceError(
  executed: ExecutedTask,
  generated: readonly PersistedTextArtifact[],
): ExecutedTestTask {
  return {
    task: {
      ...executed.task,
      status: "ERROR",
      reason_code: "jest_evidence_invalid",
      reason_text: "Jest did not produce bounded, parseable machine-result and LCOV evidence inside the current Ascout run.",
      evidence_ids: [...executed.task.evidence_ids, ...generated.map(({ evidence }) => evidence.evidence_id)],
      artifact_refs: [...executed.task.artifact_refs, ...generated.map(({ artifact }) => artifact.artifact_id)],
    },
    evidence: [...executed.evidence, ...generated.map(({ evidence }) => evidence)],
    artifacts: [...executed.artifacts, ...generated.map(({ artifact }) => artifact)],
    coveragePoints: null,
  };
}

async function executeJestTask(
  repositoryRoot: string,
  runId: string,
  runPath: string,
  rawPath: string,
  plan: PlannedJestTask,
  decision: TaskAdmissionDecision,
  secrets: readonly string[],
  timeoutMs: number,
  passOrdinal: 1 | 2 = 1,
): Promise<ExecutedTestTask> {
  mkdirSync(
    passOrdinal === 1 ? join(rawPath, "test") : join(rawPath, "test", "pass-2"),
    { recursive: true },
  );
  const executionOptions: ExecutePlannedTaskOptions = {
    env: { ...process.env, CI: "1" },
    toolName: "jest",
    ...(plan.toolVersion === null ? {} : { toolVersion: plan.toolVersion }),
    captureFilePrefix: passOrdinal === 1 ? "test" : "test-pass-2",
    evidenceSequenceStart: passOrdinal === 1 ? 1 : 5,
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

  if (executed.task.status === "ERROR") return { ...executed, coveragePoints: null };
  if (plan.machineResultPath === null || plan.lcovPath === null) return withJestEvidenceError(executed, []);

  const generated: PersistedTextArtifact[] = [];
  const generatedSequenceStart = passOrdinal === 1 ? 3 : 7;
  const artifactPrefix = passOrdinal === 1 ? "test" : "test.pass-2";
  let coveragePoints: readonly LcovLinePoint[] | null = null;
  try {
    const machine = persistGeneratedTextArtifact(
      runId,
      "test",
      generatedSequenceStart,
      runPath,
      runRelativeArtifactPath(runId, plan.machineResultPath),
      `${artifactPrefix}.jest-results`,
      "test_result_json",
      "test_result",
      secrets,
    );
    generated.push(machine);
    if (!validJestMachineResult(machine.text)) return withJestEvidenceError(executed, generated);

    const coverage = persistGeneratedTextArtifact(
      runId,
      "test",
      generatedSequenceStart + 1,
      runPath,
      runRelativeArtifactPath(runId, plan.lcovPath),
      `${artifactPrefix}.lcov`,
      "coverage_lcov",
      "coverage",
      secrets,
    );
    generated.push(coverage);
    const normalized = normalizeLcovLineCoverage(coverage.text, repositoryRoot);
    if (normalized.outcome !== "resolved") return withJestEvidenceError(executed, generated);
    coveragePoints = normalized.points;
  } catch {
    return withJestEvidenceError(executed, generated);
  }

  return {
    task: {
      ...executed.task,
      evidence_ids: [...executed.task.evidence_ids, ...generated.map(({ evidence }) => evidence.evidence_id)],
      artifact_refs: [...executed.task.artifact_refs, ...generated.map(({ artifact }) => artifact.artifact_id)],
    },
    evidence: [...executed.evidence, ...generated.map(({ evidence }) => evidence)],
    artifacts: [...executed.artifacts, ...generated.map(({ artifact }) => artifact)],
    coveragePoints,
  };
}

function combineTestPasses(first: ExecutedTestTask, second: ExecutedTestTask): ExecutedTestTask {
  const firstStatus = first.task.status;
  const secondStatus = second.task.status;
  const status: TaskResultV1["status"] =
    firstStatus === "ERROR" || secondStatus === "ERROR"
      ? "ERROR"
      : firstStatus === "FAIL" || secondStatus === "FAIL"
        ? "FAIL"
        : "PASS";
  const errorTask = secondStatus === "ERROR" ? second.task : first.task;
  const failingExitCode = [second.task.exit_code, first.task.exit_code]
    .find((value) => value !== null && value !== 0) ?? null;
  const startedAt = first.task.started_at!;
  const finishedAt = second.task.finished_at!;

  return {
    task: {
      ...second.task,
      status,
      reason_code: status === "ERROR" ? errorTask.reason_code : null,
      reason_text: status === "ERROR" ? errorTask.reason_text : null,
      exit_code: status === "PASS" ? 0 : status === "FAIL" ? failingExitCode : errorTask.exit_code,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_ms: Date.parse(finishedAt) - Date.parse(startedAt),
      observations: {
        runs: first.task.observations.runs + second.task.observations.runs,
        failures: first.task.observations.failures + second.task.observations.failures,
      },
      evidence_ids: [...first.task.evidence_ids, ...second.task.evidence_ids],
      artifact_refs: [...first.task.artifact_refs, ...second.task.artifact_refs],
      output_truncated: first.task.output_truncated || second.task.output_truncated,
    },
    evidence: [...first.evidence, ...second.evidence],
    artifacts: [...first.artifacts, ...second.artifacts],
    coveragePoints: second.coveragePoints,
  };
}

'''
replace_between("function withJestEvidenceError(", "function nonExecutedTask", jest_block)

replace_once(
    '      const secrets = selectedSecretValues(process.env as RedactionEnv, policy);\n\n      const tasks: TaskResultV1[] = [];',
    '      const secrets = selectedSecretValues(process.env as RedactionEnv, policy);\n      let selection = initialSelection(testPlan, preRunWidening, decisions.test.launchAllowed);\n\n      const tasks: TaskResultV1[] = [];',
)

execution_start = '        const executed = task === "test"\n'
execution_end = '        artifacts.push(...executed.artifacts);\n'
i = text.find(execution_start)
if i < 0:
    raise SystemExit("test execution block start missing")
j = text.find(execution_end, i)
if j < 0:
    raise SystemExit("test execution block end missing")
j += len(execution_end)
execution_block = r'''        let executed: ExecutedTask;
        if (task === "test") {
          const firstExecuted: ExecutedTestTask =
            discovery.jsTestRunner.state === "resolved" && discovery.jsTestRunner.value === "jest"
              ? await executeJestTask(
                  root,
                  runId,
                  runDir.run_path,
                  runDir.raw_path,
                  testPlan as PlannedJestTask,
                  decision,
                  secrets,
                  taskTimeoutMs(config, task),
                )
              : await executeVitestTask(
                  root,
                  runId,
                  runDir.run_path,
                  runDir.raw_path,
                  testPlan as PlannedVitestTask,
                  decision,
                  secrets,
                  taskTimeoutMs(config, task),
                );
          let finalExecuted = firstExecuted;

          if (
            (firstExecuted.task.status === "PASS" || firstExecuted.task.status === "FAIL") &&
            firstExecuted.coveragePoints !== null &&
            testPlan.state === "planned" &&
            testPlan.selectionMode === "native_related"
          ) {
            const postRunWidening = decidePostRunWidening(
              gitComparison.changed_files,
              "native_related",
              firstExecuted.coveragePoints,
            );
            if (postRunWidening.widened) {
              const postRunChangedFiles = postRunPlanningChangedFiles(
                gitComparison.changed_files,
                postRunWidening,
              );

              if (discovery.jsTestRunner.state === "resolved" && discovery.jsTestRunner.value === "jest") {
                const widerPlan = planJestTask({
                  repositoryRoot: root,
                  runId,
                  config,
                  discovery,
                  files,
                  changedFiles: postRunChangedFiles,
                  selectionMode: "full",
                  artifactPassOrdinal: 2,
                });
                if (widerPlan.state === "planned") {
                  const secondExecuted = await executeJestTask(
                    root,
                    runId,
                    runDir.run_path,
                    runDir.raw_path,
                    widerPlan,
                    decision,
                    secrets,
                    taskTimeoutMs(config, task),
                    2,
                  );
                  finalExecuted = combineTestPasses(firstExecuted, secondExecuted);
                  selection = withPostRunWideningPass(selection, widerPlan.workingDirectory);
                }
              } else {
                const widerPlan = planVitestTask({
                  repositoryRoot: root,
                  runId,
                  config,
                  discovery,
                  files,
                  changedFiles: postRunChangedFiles,
                  selectionMode: "full",
                  artifactPassOrdinal: 2,
                });
                if (widerPlan.state === "planned") {
                  const secondExecuted = await executeVitestTask(
                    root,
                    runId,
                    runDir.run_path,
                    runDir.raw_path,
                    widerPlan,
                    decision,
                    secrets,
                    taskTimeoutMs(config, task),
                    2,
                  );
                  finalExecuted = combineTestPasses(firstExecuted, secondExecuted);
                  selection = withPostRunWideningPass(selection, widerPlan.workingDirectory);
                }
              }
            }
          }
          executed = finalExecuted;
        } else {
          executed = await executePlannedTask(
            root,
            runId,
            runDir.raw_path,
            task,
            plan as NormalizedPlan & { state: "planned" },
            decision,
            secrets,
            taskTimeoutMs(config, task),
          );
        }
        tasks.push(executed.task);
        evidence.push(...executed.evidence);
        artifacts.push(...executed.artifacts);
'''
text = text[:i] + execution_block + text[j:]

replace_once(
    '        selection: initialSelection(testPlan, preRunWidening, decisions.test.launchAllowed),',
    '        selection,',
)

path.write_text(text)
