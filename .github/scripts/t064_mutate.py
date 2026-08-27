from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


check_path = Path("src/check.ts")
check = check_path.read_text()

check = replace_once(
    check,
    '  type ExerciseV1,\n  type ReceiptV1,',
    '  type ExerciseV1,\n  type FindingV1,\n  type ReceiptV1,',
    'FindingV1 import',
)
check = replace_once(
    check,
    'import { planJestTask, type JestTaskPlan, type PlannedJestTask } from "./tools/jest.js";\n',
    'import { planJestTargetedRerun } from "./tools/jest-rerun.js";\nimport { planJestTask, type JestTaskPlan, type PlannedJestTask } from "./tools/jest.js";\n',
    'Jest rerun import',
)
check = replace_once(
    check,
    'import { planVitestTask, type PlannedVitestTask, type VitestTaskPlan } from "./tools/vitest.js";\n',
    'import { planVitestTargetedRerun } from "./tools/vitest-rerun.js";\nimport { planVitestTask, type PlannedVitestTask, type VitestTaskPlan } from "./tools/vitest.js";\n',
    'Vitest rerun import',
)
check = replace_once(
    check,
    'import { planESLintTask } from "./tools/eslint.js";\n',
    'import {\n  buildNormalizedTestFinding,\n  failingTestIdentities,\n  normalizedAggregateTestStatus,\n  observationsForIdentity,\n  parseTestAssertionObservations,\n  type FailingTestIdentity,\n  type TestAssertionObservation,\n} from "./test-reproduction.js";\nimport { planESLintTask } from "./tools/eslint.js";\n',
    'reproduction import',
)

old_interface = '''interface ExecutedTestTask extends ExecutedTask {
  readonly coveragePoints: readonly LcovLinePoint[] | null;
  readonly selectedTestCounts: readonly (number | null)[];
}
'''
new_interface = '''interface TestMachineResultRecord {
  readonly runner: "vitest" | "jest";
  readonly text: string;
  readonly evidenceId: string;
  readonly basePlan: PlannedVitestTask | PlannedJestTask;
}

interface ExecutedTestTask extends ExecutedTask {
  readonly coveragePoints: readonly LcovLinePoint[] | null;
  readonly selectedTestCounts: readonly (number | null)[];
  readonly machineResults: readonly TestMachineResultRecord[];
}
'''
check = replace_once(check, old_interface, new_interface, 'ExecutedTestTask interface')

check = check.replace(
    'return { ...executed, coveragePoints: null, selectedTestCounts: [null] };',
    'return { ...executed, coveragePoints: null, selectedTestCounts: [null], machineResults: [] };',
)
if check.count('machineResults: []') < 2:
    raise SystemExit('expected both early test ERROR returns to gain machineResults')

check = check.replace(
    '    selectedTestCounts: [null],\n  };',
    '    selectedTestCounts: [null],\n    machineResults: [],\n  };',
)
if check.count('machineResults: [],') < 4:
    raise SystemExit('expected evidence-error returns to gain machineResults')

check = replace_once(
    check,
    '  let coveragePoints: readonly LcovLinePoint[] | null = null;\n  let selectedTestCount: number | null = null;\n  try {\n    const machine = persistGeneratedTextArtifact(',
    '  let coveragePoints: readonly LcovLinePoint[] | null = null;\n  let selectedTestCount: number | null = null;\n  let machineResult: TestMachineResultRecord | null = null;\n  try {\n    const machine = persistGeneratedTextArtifact(',
    'Vitest machine result declaration',
)
check = replace_once(
    check,
    '    if (!validVitestMachineResult(machine.text)) return withVitestEvidenceError(executed, generated);\n    selectedTestCount = observedSelectedTestCount(machine.text);\n',
    '    if (!validVitestMachineResult(machine.text)) return withVitestEvidenceError(executed, generated);\n    selectedTestCount = observedSelectedTestCount(machine.text);\n    machineResult = { runner: "vitest", text: machine.text, evidenceId: machine.evidence.evidence_id, basePlan: plan };\n',
    'Vitest machine result capture',
)
check = replace_once(
    check,
    '    coveragePoints,\n    selectedTestCounts: [selectedTestCount],\n  };\n}\n\n\nfunction validJestMachineResult',
    '    coveragePoints,\n    selectedTestCounts: [selectedTestCount],\n    machineResults: machineResult === null ? [] : [machineResult],\n  };\n}\n\n\nfunction validJestMachineResult',
    'Vitest machine result return',
)

jest_marker = 'async function executeJestTask('
jest_index = check.index(jest_marker)
before_jest = check[:jest_index]
after_jest = check[jest_index:]
after_jest = replace_once(
    after_jest,
    '  let coveragePoints: readonly LcovLinePoint[] | null = null;\n  let selectedTestCount: number | null = null;\n  try {\n    const machine = persistGeneratedTextArtifact(',
    '  let coveragePoints: readonly LcovLinePoint[] | null = null;\n  let selectedTestCount: number | null = null;\n  let machineResult: TestMachineResultRecord | null = null;\n  try {\n    const machine = persistGeneratedTextArtifact(',
    'Jest machine result declaration',
)
after_jest = replace_once(
    after_jest,
    '    if (!validJestMachineResult(machine.text)) return withJestEvidenceError(executed, generated);\n    selectedTestCount = observedSelectedTestCount(machine.text);\n',
    '    if (!validJestMachineResult(machine.text)) return withJestEvidenceError(executed, generated);\n    selectedTestCount = observedSelectedTestCount(machine.text);\n    machineResult = { runner: "jest", text: machine.text, evidenceId: machine.evidence.evidence_id, basePlan: plan };\n',
    'Jest machine result capture',
)
after_jest = replace_once(
    after_jest,
    '    coveragePoints,\n    selectedTestCounts: [selectedTestCount],\n  };\n}\n\nfunction combineTestPasses',
    '    coveragePoints,\n    selectedTestCounts: [selectedTestCount],\n    machineResults: machineResult === null ? [] : [machineResult],\n  };\n}\n\nfunction combineTestPasses',
    'Jest machine result return',
)
check = before_jest + after_jest

runtime = r'''    coveragePoints: second.coveragePoints,
    selectedTestCounts: [...first.selectedTestCounts, ...second.selectedTestCounts],
    machineResults: [...first.machineResults, ...second.machineResults],
  };
}

interface TargetedObservationExecution {
  readonly observation: TestAssertionObservation | null;
  readonly evidence: readonly EvidenceV1[];
  readonly artifacts: readonly ArtifactV1[];
  readonly finishedAt: string | null;
  readonly outputTruncated: boolean;
}

async function executeTargetedTestObservation(
  repositoryRoot: string,
  runId: string,
  runPath: string,
  rawPath: string,
  runner: "vitest" | "jest",
  basePlan: PlannedVitestTask | PlannedJestTask,
  identity: FailingTestIdentity,
  observationOrdinal: 2 | 3,
  decision: TaskAdmissionDecision,
  secrets: readonly string[],
  timeoutMs: number,
): Promise<TargetedObservationExecution> {
  const targeted = runner === "jest"
    ? planJestTargetedRerun({
        runId,
        basePlan: basePlan as PlannedJestTask,
        selector: identity,
        observationOrdinal,
      })
    : planVitestTargetedRerun({
        runId,
        basePlan: basePlan as PlannedVitestTask,
        selector: identity,
        observationOrdinal,
      });
  if (targeted.state !== "planned") {
    return { observation: null, evidence: [], artifacts: [], finishedAt: null, outputTruncated: false };
  }

  const rerunIndex = observationOrdinal - 1;
  mkdirSync(join(rawPath, "test", `rerun-${rerunIndex}`), { recursive: true });
  const baseNormalized = normalizePlan(basePlan);
  if (baseNormalized.state !== "planned") {
    return { observation: null, evidence: [], artifacts: [], finishedAt: null, outputTruncated: false };
  }
  const normalizedPlan: NormalizedPlan & { state: "planned" } = {
    ...baseNormalized,
    state: "planned",
    argv: [...targeted.argv],
    workingDirectory: targeted.workingDirectory,
    reasonCode: null,
    reasonText: null,
  };
  const sequenceStart = observationOrdinal === 2 ? 9 : 12;
  const executed = await executePlannedTask(
    repositoryRoot,
    runId,
    rawPath,
    "test",
    normalizedPlan,
    decision,
    secrets,
    timeoutMs,
    {
      env: { ...process.env, CI: "1" },
      toolName: runner,
      ...(basePlan.toolVersion === null ? {} : { toolVersion: basePlan.toolVersion }),
      captureFilePrefix: `test-rerun-${rerunIndex}`,
      evidenceSequenceStart: sequenceStart,
    },
  );
  const evidence = [...executed.evidence];
  const artifacts = [...executed.artifacts];
  const finishedAt = executed.task.finished_at;
  if (executed.task.status === "ERROR") {
    return { observation: null, evidence, artifacts, finishedAt, outputTruncated: executed.task.output_truncated };
  }

  try {
    const machine = persistGeneratedTextArtifact(
      runId,
      "test",
      sequenceStart + 2,
      runPath,
      runRelativeArtifactPath(runId, targeted.machineResultPath),
      `test.rerun-${rerunIndex}.${runner}-results`,
      "test_result_json",
      "test_result",
      secrets,
    );
    evidence.push(machine.evidence);
    artifacts.push(machine.artifact);
    const matches = parseTestAssertionObservations(
      repositoryRoot,
      machine.text,
      machine.evidence.evidence_id,
    ).filter((observation) =>
      observation.path === identity.path && observation.fullName === identity.fullName
    );
    if (matches.length != 1) {
      return { observation: null, evidence, artifacts, finishedAt, outputTruncated: executed.task.output_truncated };
    }
    const observation = matches[0]!;
    const expectedStatus = observation.outcome === "failed" ? "FAIL" : "PASS";
    if (executed.task.status !== expectedStatus) {
      return { observation: null, evidence, artifacts, finishedAt, outputTruncated: executed.task.output_truncated };
    }
    return { observation, evidence, artifacts, finishedAt, outputTruncated: executed.task.output_truncated };
  } catch {
    return { observation: null, evidence, artifacts, finishedAt, outputTruncated: executed.task.output_truncated };
  }
}

interface NormalizedFailedTestExecution {
  readonly executed: ExecutedTestTask;
  readonly findings: readonly FindingV1[];
}

async function normalizeFailedTestExecution(
  repositoryRoot: string,
  runId: string,
  runPath: string,
  rawPath: string,
  executed: ExecutedTestTask,
  decision: TaskAdmissionDecision,
  secrets: readonly string[],
  timeoutMs: number,
): Promise<NormalizedFailedTestExecution> {
  if (executed.task.status !== "FAIL" || executed.machineResults.length === 0) {
    return { executed, findings: [] };
  }

  const baselineObservations = executed.machineResults.flatMap((record) =>
    parseTestAssertionObservations(repositoryRoot, record.text, record.evidenceId)
  );
  const identities = failingTestIdentities(baselineObservations);
  if (identities.length === 0) return { executed, findings: [] };

  const allObservations = [...baselineObservations];
  const extraEvidence: EvidenceV1[] = [];
  const extraArtifacts: ArtifactV1[] = [];
  let taskRuns = executed.task.observations.runs;
  let taskFailures = executed.task.observations.failures;
  let taskFinishedAt = executed.task.finished_at;
  let outputTruncated = executed.task.output_truncated;

  // T063 owns exactly two global extra observation slots. Use them for one
  // deterministic exact failure identity; other failures remain unknown unless
  // normal selection passes already observed them.
  const targetIdentity = identities[0]!;
  const origin = executed.machineResults.find((record) =>
    parseTestAssertionObservations(repositoryRoot, record.text, record.evidenceId).some((observation) =>
      observation.path === targetIdentity.path &&
      observation.fullName === targetIdentity.fullName &&
      observation.outcome === "failed"
    )
  );

  if (origin !== undefined) {
    let targetObservations = observationsForIdentity(allObservations, targetIdentity);
    while (
      targetObservations.length < 3 &&
      targetObservations.length > 0 &&
      targetObservations.every((observation) => observation.outcome === "failed")
    ) {
      const observationOrdinal = (targetObservations.length + 1) as 2 | 3;
      const targeted = await executeTargetedTestObservation(
        repositoryRoot,
        runId,
        runPath,
        rawPath,
        origin.runner,
        origin.basePlan,
        targetIdentity,
        observationOrdinal,
        decision,
        secrets,
        timeoutMs,
      );
      extraEvidence.push(...targeted.evidence);
      extraArtifacts.push(...targeted.artifacts);
      outputTruncated ||= targeted.outputTruncated;
      if (targeted.finishedAt !== null) taskFinishedAt = targeted.finishedAt;
      if (targeted.observation === null) break;
      allObservations.push(targeted.observation);
      taskRuns += 1;
      if (targeted.observation.outcome === "failed") taskFailures += 1;
      targetObservations = observationsForIdentity(allObservations, targetIdentity);
    }
  }

  const findings = identities.map((identity, index) =>
    buildNormalizedTestFinding(
      index,
      executed.machineResults[0]!.runner,
      identity,
      observationsForIdentity(allObservations, identity),
    )
  );
  const status = normalizedAggregateTestStatus(findings);
  const startedAt = executed.task.started_at;
  const durationMs = startedAt !== null && taskFinishedAt !== null
    ? Date.parse(taskFinishedAt) - Date.parse(startedAt)
    : executed.task.duration_ms;

  return {
    executed: {
      ...executed,
      task: {
        ...executed.task,
        status,
        finished_at: taskFinishedAt,
        duration_ms: durationMs,
        observations: { runs: taskRuns, failures: taskFailures },
        evidence_ids: [...executed.task.evidence_ids, ...extraEvidence.map(({ evidence_id }) => evidence_id)],
        artifact_refs: [...executed.task.artifact_refs, ...extraArtifacts.map(({ artifact_id }) => artifact_id)],
        output_truncated: outputTruncated,
      },
      evidence: [...executed.evidence, ...extraEvidence],
      artifacts: [...executed.artifacts, ...extraArtifacts],
    },
    findings,
  };
}

function nonExecutedTask('''

check = replace_once(
    check,
    '    coveragePoints: second.coveragePoints,\n    selectedTestCounts: [...first.selectedTestCounts, ...second.selectedTestCounts],\n  };\n}\n\nfunction nonExecutedTask(',
    runtime,
    'targeted rerun runtime insertion',
)

check = replace_once(
    check,
    '      const artifacts: ArtifactV1[] = [];\n      let exerciseCoveragePoints: readonly LcovLinePoint[] | null = null;\n',
    '      const artifacts: ArtifactV1[] = [];\n      const findings: FindingV1[] = [];\n      let exerciseCoveragePoints: readonly LcovLinePoint[] | null = null;\n',
    'run findings collection',
)
check = replace_once(
    check,
    '          exerciseCoveragePoints = finalExecuted.coveragePoints;\n          executed = finalExecuted;\n',
    '''          const normalizedTestExecution = await normalizeFailedTestExecution(
            root,
            runId,
            runDir.run_path,
            runDir.raw_path,
            finalExecuted,
            decision,
            secrets,
            taskTimeoutMs(config, task),
          );
          finalExecuted = normalizedTestExecution.executed;
          findings.push(...normalizedTestExecution.findings);
          exerciseCoveragePoints = finalExecuted.coveragePoints;
          executed = finalExecuted;
''',
    'run normalization wiring',
)
check = replace_once(
    check,
    '        findings: [],\n        evidence,\n',
    '        findings,\n        evidence,\n',
    'receipt findings wiring',
)
check_path.write_text(check)

model_path = Path("src/receipt/model.ts")
model = model_path.read_text()
model = replace_once(
    model,
    '  for (const [i, finding] of receipt.findings.entries()) {\n    validateObservations(finding.observations, issues, `findings[${i}].observations`);\n',
    '''  for (const [i, finding] of receipt.findings.entries()) {
    validateObservations(finding.observations, issues, `findings[${i}].observations`);
    if (finding.introduced_by_change !== "unknown") {
      addIssue(
        issues,
        "finding_causation_unproven",
        `findings[${i}].introduced_by_change`,
        "M1 receipt v1 has no comparative proof input; introduced_by_change must remain unknown",
      );
    }
''',
    'finding causation invariant',
)
model_path.write_text(model)

flake_path = Path("tests/flake-reproduction.contract.test.ts")
flake = flake_path.read_text()
insertion = '''

  it("rejects introduced_by_change claims without comparative proof", () => {
    for (const introducedByChange of [true, false] as const) {
      const receipt = receiptFor({
        status: "FAIL",
        runs: 1,
        failures: 1,
        determinismClass: "unknown",
        reproduced: "unknown",
      });
      (receipt.findings[0] as { introduced_by_change: boolean | "unknown" }).introduced_by_change = introducedByChange;
      expect(issueCodes(receipt), String(introducedByChange)).toContain("finding_causation_unproven");
    }
  });
'''
marker = '\n});\n'
if not flake.endswith(marker):
    raise SystemExit('flake test file closing marker not found')
flake = flake[:-len(marker)] + insertion + marker
flake_path.write_text(flake)
