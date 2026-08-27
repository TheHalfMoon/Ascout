from pathlib import Path

path = Path('src/check.ts')
text = path.read_text()

old_import = '''import { planESLintTask } from "./tools/eslint.js";\nimport { planPytestBasicTask } from "./tools/pytest.js";'''
new_import = '''import { planESLintTask } from "./tools/eslint.js";\nimport { planJestTask, type JestTaskPlan, type PlannedJestTask } from "./tools/jest.js";\nimport { planPytestBasicTask } from "./tools/pytest.js";'''
if text.count(old_import) != 1:
    raise SystemExit(f'import anchor count={text.count(old_import)}')
text = text.replace(old_import, new_import)

old_base = 'function baseSelection(testPlan: VitestTaskPlan): SelectionV1 {'
new_base = 'function baseSelection(testPlan: VitestTaskPlan | JestTaskPlan): SelectionV1 {'
if text.count(old_base) != 1:
    raise SystemExit(f'baseSelection anchor count={text.count(old_base)}')
text = text.replace(old_base, new_base)

anchor = '\nfunction nonExecutedTask(\n'
if text.count(anchor) != 1:
    raise SystemExit(f'nonExecutedTask anchor count={text.count(anchor)}')

jest_exec = r'''
function validJestMachineResult(text: string): boolean {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return false;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as { readonly success?: unknown; readonly testResults?: unknown };
  return typeof candidate.success === "boolean" && Array.isArray(candidate.testResults);
}

function withJestEvidenceError(
  executed: ExecutedTask,
  generated: readonly PersistedTextArtifact[],
): ExecutedTask {
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
): Promise<ExecutedTask> {
  mkdirSync(join(rawPath, "test"), { recursive: true });
  const executionOptions: ExecutePlannedTaskOptions = {
    env: { ...process.env, CI: "1" },
    toolName: "jest",
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
  if (plan.machineResultPath === null || plan.lcovPath === null) return withJestEvidenceError(executed, []);

  const generated: PersistedTextArtifact[] = [];
  try {
    const machine = persistGeneratedTextArtifact(
      runId,
      "test",
      3,
      runPath,
      runRelativeArtifactPath(runId, plan.machineResultPath),
      "test.jest-results",
      "test_result_json",
      "test_result",
      secrets,
    );
    generated.push(machine);
    if (!validJestMachineResult(machine.text)) return withJestEvidenceError(executed, generated);

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
      return withJestEvidenceError(executed, generated);
    }
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
  };
}
'''
text = text.replace(anchor, '\n' + jest_exec + anchor)

old_plan = '''      const vitestPlan = planVitestTask({
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
      };'''
new_plan = '''      const vitestPlan = planVitestTask({
        repositoryRoot: root,
        runId,
        config,
        discovery,
        files,
        changedFiles: gitComparison.changed_files,
      });
      const jestPlan = planJestTask({
        repositoryRoot: root,
        runId,
        config,
        discovery,
        files,
        changedFiles: gitComparison.changed_files,
      });
      const testPlan: VitestTaskPlan | JestTaskPlan =
        discovery.jsTestRunner.state === "resolved" && discovery.jsTestRunner.value === "jest"
          ? jestPlan
          : vitestPlan;
      const plans: Record<SemanticTaskType, NormalizedPlan> = {
        typecheck: normalizePlan(planTypeScriptTask({ config, discovery, files })),
        lint: normalizePlan(planESLintTask({
          config,
          discovery,
          files,
          changedFiles: gitComparison.changed_files,
        })),
        test: normalizePlan(testPlan),
        pytestBasic: normalizePlan(planPytestBasicTask({ config, discovery, files })),
      };'''
if text.count(old_plan) != 1:
    raise SystemExit(f'plan block count={text.count(old_plan)}')
text = text.replace(old_plan, new_plan)

old_exec = '''        const executed = task === "test"
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
          : await executePlannedTask('''
new_exec = '''        const executed = task === "test"
          ? discovery.jsTestRunner.state === "resolved" && discovery.jsTestRunner.value === "jest"
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
              )
          : await executePlannedTask('''
if text.count(old_exec) != 1:
    raise SystemExit(f'exec block count={text.count(old_exec)}')
text = text.replace(old_exec, new_exec)

old_selection = '        selection: baseSelection(vitestPlan),'
new_selection = '        selection: baseSelection(testPlan),'
if text.count(old_selection) != 1:
    raise SystemExit(f'selection anchor count={text.count(old_selection)}')
text = text.replace(old_selection, new_selection)

path.write_text(text)
