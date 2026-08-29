function fail(message) {
  throw new Error(`benchmark assertions: ${message}`);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function materialExerciseGap(run) {
  const exercise = run?.exercise;
  if (!isObject(exercise)) return null;
  if (!isNonNegativeInteger(exercise.not_exercised_lines) || !isNonNegativeInteger(exercise.unresolved_lines)) return null;
  return exercise.not_exercised_lines > 0 || exercise.unresolved_lines > 0;
}

function requireIntegrity(run, label) {
  const integrity = run?.integrity;
  if (!isObject(integrity)) fail(`${label} is missing canonical receipt integrity evidence`);
  if (typeof integrity.semantic_valid !== "boolean") fail(`${label} integrity semantic_valid is unavailable`);
  if (!Array.isArray(integrity.semantic_issues)) fail(`${label} integrity semantic_issues are unavailable`);
  if (typeof integrity.run_id !== "string" || integrity.run_id.length === 0) fail(`${label} integrity run_id is unavailable`);
  if (!Array.isArray(integrity.evidence_run_ids) || integrity.evidence_run_ids.some((value) => typeof value !== "string")) {
    fail(`${label} integrity evidence_run_ids are unavailable`);
  }
  if (!isObject(integrity.source_binding)) fail(`${label} source binding evidence is unavailable`);
  if (integrity.semantic_valid && ![0, 1, 2, 3, 4].includes(integrity.canonical_exit_code)) {
    fail(`${label} canonical exit decision is unavailable for a semantically valid receipt`);
  }
  return integrity;
}

function requireT076Case(input) {
  if (!isObject(input)) fail("input must be an object");
  if (input.task !== "T076" || input.status !== "BENCHMARK_METRICS_READY") fail("input must be one completed T076 case result");
  if (typeof input.case_id !== "string" || input.case_id.length === 0 || !Number.isInteger(input.case_revision)) fail("case identity is invalid");
  if (!Array.isArray(input.observations) || input.observations.length < 2) fail("at least two T076 observations are required");
}

function runAssertionFacts(run, observationOrdinal, cacheClass) {
  const label = `observation ${observationOrdinal} Ascout ${cacheClass}`;
  if (!isObject(run)) fail(`${label} run is unavailable`);
  const integrity = requireIntegrity(run, label);
  if (![0, 1, 2, 3, 4].includes(run.exit_code)) fail(`${label} exit code is invalid`);
  if (run.source_stability !== "stable" && run.source_stability !== "tree_drifted") fail(`${label} independent source stability is unavailable`);

  const evidenceRunMismatches = integrity.evidence_run_ids.filter((runId) => runId !== integrity.run_id);
  const bindingIssues = integrity.semantic_issues.map((issue) => ({
    code: typeof issue?.code === "string" ? issue.code : "unknown",
    path: typeof issue?.path === "string" ? issue.path : "unknown",
  }));
  if (!integrity.semantic_valid && bindingIssues.length === 0) {
    bindingIssues.push({ code: "semantic_validation_failed_without_issue", path: "receipt" });
  }

  const materialGap = materialExerciseGap(run);
  if (materialGap === null) fail(`${label} material exercise-gap evidence is unavailable`);
  const stableMaterialGap = run.source_stability === "stable" && materialGap;
  const cleanExitViolation = stableMaterialGap && run.exit_code === 0;
  const expectedGapExitFour = stableMaterialGap && integrity.semantic_valid && integrity.canonical_exit_code === 4;
  const gapExitMappingViolation = expectedGapExitFour && run.exit_code !== 4;

  return {
    observation_ordinal: observationOrdinal,
    cache_class: cacheClass,
    run_id: integrity.run_id,
    semantic_valid: integrity.semantic_valid,
    semantic_issue_count: bindingIssues.length,
    semantic_issues: bindingIssues,
    cross_tree_evidence_leakage_count: evidenceRunMismatches.length,
    cross_tree_evidence_leakage: evidenceRunMismatches.map((evidenceRunId) => ({
      receipt_run_id: integrity.run_id,
      evidence_run_id: evidenceRunId,
    })),
    independent_source_stability: run.source_stability,
    material_exercise_gap: materialGap,
    actual_exit_code: run.exit_code,
    canonical_exit_code: integrity.canonical_exit_code ?? null,
    stable_material_gap_exit_zero_violation: cleanExitViolation,
    stable_material_gap_exit_mapping_violation: gapExitMappingViolation,
  };
}

export function evaluateCaseAssertions(input) {
  requireT076Case(input);
  const rawRuns = [];
  for (let index = 0; index < input.observations.length; index += 1) {
    const observation = input.observations[index];
    if (!isObject(observation?.comparators?.ascout)) fail(`observation ${index + 1} is missing the Ascout comparator`);
    for (const cacheClass of ["cold", "warm"]) {
      rawRuns.push(runAssertionFacts(observation.comparators.ascout[cacheClass], index + 1, cacheClass));
    }
  }

  const crossTreeCount = rawRuns.reduce((sum, run) => sum + run.cross_tree_evidence_leakage_count, 0);
  const bindingCount = rawRuns.reduce((sum, run) => sum + run.semantic_issue_count, 0);
  const stableGapExitZeroCount = rawRuns.filter((run) => run.stable_material_gap_exit_zero_violation).length;
  const stableGapWrongExitCount = rawRuns.filter((run) => run.stable_material_gap_exit_mapping_violation).length;
  const satisfied = crossTreeCount === 0 && bindingCount === 0 && stableGapExitZeroCount === 0 && stableGapWrongExitCount === 0;

  return {
    schema_version: 1,
    task: "T077",
    status: satisfied ? "ABSOLUTE_ASSERTIONS_SATISFIED" : "ABSOLUTE_ASSERTIONS_VIOLATED",
    case_id: input.case_id,
    case_revision: input.case_revision,
    t075_evidence_sha256: input.t075_evidence_sha256 ?? null,
    evaluated_run_count: rawRuns.length,
    assertions: {
      cross_tree_evidence_leakage: {
        required_count: 0,
        observed_count: crossTreeCount,
      },
      binding_integrity_violations: {
        required_count: 0,
        observed_count: bindingCount,
      },
      stable_material_gap_exit_zero: {
        required_count: 0,
        observed_count: stableGapExitZeroCount,
      },
      stable_material_gap_wrong_exit_without_higher_precedence: {
        required_count: 0,
        observed_count: stableGapWrongExitCount,
      },
    },
    raw_runs: rawRuns,
  };
}

export function aggregateBenchmarkAssertions(caseResults) {
  if (!Array.isArray(caseResults) || caseResults.length === 0) fail("at least one T077 case result is required for aggregation");
  const seen = new Set();
  let crossTreeCount = 0;
  let bindingCount = 0;
  let stableGapExitZeroCount = 0;
  let stableGapWrongExitCount = 0;
  let evaluatedRunCount = 0;

  for (const result of caseResults) {
    if (!isObject(result) || result.task !== "T077" || !["ABSOLUTE_ASSERTIONS_SATISFIED", "ABSOLUTE_ASSERTIONS_VIOLATED"].includes(result.status)) {
      fail("aggregate input is not a T077 case result");
    }
    if (typeof result.case_id !== "string" || seen.has(result.case_id)) fail(`duplicate or invalid T077 case id: ${result.case_id ?? "unknown"}`);
    seen.add(result.case_id);
    if (!isNonNegativeInteger(result.evaluated_run_count)) fail(`invalid evaluated run count for ${result.case_id}`);
    const assertions = result.assertions;
    const required = [
      ["cross_tree_evidence_leakage", "observed_count"],
      ["binding_integrity_violations", "observed_count"],
      ["stable_material_gap_exit_zero", "observed_count"],
      ["stable_material_gap_wrong_exit_without_higher_precedence", "observed_count"],
    ];
    for (const [name, field] of required) {
      if (!isNonNegativeInteger(assertions?.[name]?.[field]) || assertions[name].required_count !== 0) fail(`invalid ${name} assertion for ${result.case_id}`);
    }
    crossTreeCount += assertions.cross_tree_evidence_leakage.observed_count;
    bindingCount += assertions.binding_integrity_violations.observed_count;
    stableGapExitZeroCount += assertions.stable_material_gap_exit_zero.observed_count;
    stableGapWrongExitCount += assertions.stable_material_gap_wrong_exit_without_higher_precedence.observed_count;
    evaluatedRunCount += result.evaluated_run_count;
  }

  const satisfied = crossTreeCount === 0 && bindingCount === 0 && stableGapExitZeroCount === 0 && stableGapWrongExitCount === 0;
  return {
    schema_version: 1,
    task: "T077",
    status: satisfied ? "ABSOLUTE_ASSERTIONS_SATISFIED" : "ABSOLUTE_ASSERTIONS_VIOLATED",
    case_set: [...seen].sort(),
    evaluated_run_count: evaluatedRunCount,
    assertions: {
      cross_tree_evidence_leakage: { required_count: 0, observed_count: crossTreeCount },
      binding_integrity_violations: { required_count: 0, observed_count: bindingCount },
      stable_material_gap_exit_zero: { required_count: 0, observed_count: stableGapExitZeroCount },
      stable_material_gap_wrong_exit_without_higher_precedence: { required_count: 0, observed_count: stableGapWrongExitCount },
    },
    raw_cases: caseResults,
  };
}
