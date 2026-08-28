import { createHash } from "node:crypto";

function fail(message) {
  throw new Error(`benchmark metrics: ${message}`);
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function rate(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function mean(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function same(values) {
  if (values.length < 2) return values.length === 0 ? "unknown" : "unknown";
  const first = stableJson(values[0]);
  return values.every((value) => stableJson(value) === first) ? "deterministic" : "nondeterministic";
}

function requireCaseInput(input) {
  if (!input || typeof input !== "object") fail("case input must be an object");
  if (typeof input.case_id !== "string" || !Number.isInteger(input.case_revision)) fail("case identity is invalid");
  if (input.case_class !== "selection" && input.case_class !== "gap") fail("case class is invalid");
  if (!Array.isArray(input.observations) || input.observations.length < 2) fail("at least two T076 observations are required");
  if (!Array.isArray(input.baselines) || input.baselines.length === 0) fail("machine-readable metric baselines are required before calculation");
}

function comparatorProjection(comparator, cacheClass) {
  const run = comparator?.[cacheClass];
  if (!run) return null;
  return {
    status: run.status ?? null,
    exit_code: run.exit_code ?? null,
    clean_success: run.clean_success ?? null,
    oracle_test_ids_observed: uniqueSorted(run.oracle_test_ids_observed ?? []),
    source_stability: run.source_stability ?? null,
    reported_source_stability: run.reported_source_stability ?? null,
    selection: run.selection ?? null,
    tasks: run.tasks ?? null,
    exercise: run.exercise ?? null,
    findings: run.findings ?? null,
    completeness: run.completeness ?? null,
  };
}

function comparatorDeterminism(observations, name, cacheClass) {
  const projections = observations
    .map((observation) => comparatorProjection(observation.comparators?.[name], cacheClass))
    .filter((value) => value !== null);
  if (projections.length < 2) return "unknown";
  return same(projections);
}

function selectionMetricForComparator(input, name) {
  const required = uniqueSorted(input.oracle_test_ids);
  if (required.length === 0) fail(`${input.case_id} selection oracle has no test ids`);
  const runs = input.observations.map((observation) => observation.comparators?.[name]?.cold ?? null);
  if (runs.some((run) => run === null || run.membership_available !== true)) {
    return {
      available: false,
      reason: "required oracle membership evidence is unavailable for one or more repeated cold observations",
      comparator: name,
      denominator: required.length,
      numerator: null,
      recall: null,
    };
  }
  const observedSets = runs.map((run) => uniqueSorted(run.oracle_test_ids_observed ?? []));
  if (same(observedSets) !== "deterministic") {
    return {
      available: false,
      reason: "oracle membership is nondeterministic across repeated cold observations",
      comparator: name,
      denominator: required.length,
      numerator: null,
      recall: null,
    };
  }
  const observed = observedSets[0].filter((id) => required.includes(id));
  return {
    available: true,
    reason: null,
    comparator: name,
    denominator: required.length,
    numerator: observed.length,
    recall: rate(observed.length, required.length),
    required_oracle_test_ids: required,
    observed_oracle_test_ids: observed,
  };
}

function falsePassForComparator(input, name) {
  const selection = selectionMetricForComparator(input, name);
  if (!selection.available) {
    return {
      available: false,
      reason: selection.reason,
      comparator: name,
      false_pass: null,
      clean_success: null,
    };
  }
  const runs = input.observations.map((observation) => observation.comparators[name].cold);
  const cleanStates = runs.map((run) => run.clean_success === true);
  if (same(cleanStates) !== "deterministic") {
    return {
      available: false,
      reason: "clean/success semantics are nondeterministic across repeated cold observations",
      comparator: name,
      false_pass: null,
      clean_success: null,
    };
  }
  const omission = selection.numerator < selection.denominator;
  return {
    available: true,
    reason: null,
    comparator: name,
    false_pass: cleanStates[0] && omission,
    clean_success: cleanStates[0],
    material_oracle_omission: omission,
  };
}

function mapExercise(records) {
  const result = new Map();
  for (const record of records ?? []) {
    if (!record || typeof record.path !== "string" || !Number.isInteger(record.line)) continue;
    result.set(`${record.path}:${record.line}`, record.state ?? record.classification ?? null);
  }
  return result;
}

function gapMetric(input) {
  const oracle = input.gap_oracle ?? [];
  const domain = oracle.filter((item) => item.classification !== "UNRESOLVED");
  const oracleExcluded = oracle.length - domain.length;
  if (domain.length === 0) {
    return {
      available: false,
      reason: "independent gap oracle has no resolved comparison domain",
      accuracy: null,
      unresolved_rate: null,
      denominator: 0,
      oracle_excluded_unresolved: oracleExcluded,
    };
  }
  const perObservation = input.observations.map((observation) => {
    const exercise = mapExercise(observation.comparators?.ascout?.cold?.exercise?.records);
    let correct = 0;
    let unresolved = 0;
    const raw = [];
    for (const item of domain) {
      const key = `${item.path}:${item.line}`;
      const observed = exercise.get(key) ?? "UNRESOLVED";
      if (observed === item.classification) correct += 1;
      if (observed === "UNRESOLVED") unresolved += 1;
      raw.push({ path: item.path, line: item.line, oracle: item.classification, ascout: observed });
    }
    return { correct, unresolved, raw };
  });
  if (same(perObservation.map(({ raw }) => raw)) !== "deterministic") {
    return {
      available: false,
      reason: "Ascout gap classifications are nondeterministic across repeated cold observations",
      accuracy: null,
      unresolved_rate: null,
      denominator: domain.length,
      oracle_excluded_unresolved: oracleExcluded,
      raw_observations: perObservation,
    };
  }
  const first = perObservation[0];
  return {
    available: true,
    reason: null,
    numerator_correct: first.correct,
    denominator: domain.length,
    accuracy: rate(first.correct, domain.length),
    unresolved_numerator: first.unresolved,
    unresolved_rate: rate(first.unresolved, domain.length),
    oracle_excluded_unresolved: oracleExcluded,
    raw: first.raw,
  };
}

function gapFalsePass(input) {
  const materialGap = (input.gap_oracle ?? []).some((item) => item.classification === "NOT_EXERCISED");
  const runs = input.observations.map((observation) => observation.comparators?.ascout?.cold ?? null);
  if (runs.some((run) => run === null)) {
    return { available: false, reason: "Ascout cold observations are unavailable", comparator: "ascout", false_pass: null };
  }
  const cleanStates = runs.map((run) => run.clean_success === true);
  if (same(cleanStates) !== "deterministic") {
    return { available: false, reason: "Ascout clean/success semantics are nondeterministic", comparator: "ascout", false_pass: null };
  }
  return {
    available: true,
    reason: null,
    comparator: "ascout",
    false_pass: cleanStates[0] && materialGap,
    clean_success: cleanStates[0],
    material_oracle_omission: materialGap,
  };
}

function timingMetrics(input) {
  const names = uniqueSorted(input.observations.flatMap((observation) => Object.keys(observation.comparators ?? {})));
  const results = [];
  for (const name of names) {
    for (const cacheClass of ["cold", "warm"]) {
      const samples = input.observations
        .map((observation) => observation.comparators?.[name]?.[cacheClass] ?? null)
        .filter((run) => run !== null)
        .map((run) => ({ duration_ms: run.duration_ms, source_stability: run.source_stability ?? null }));
      const valid = samples.filter((sample) => typeof sample.duration_ms === "number" && Number.isFinite(sample.duration_ms) && sample.duration_ms >= 0);
      results.push({
        comparator: name,
        cache_class: cacheClass,
        sample_count: valid.length,
        arithmetic_mean_ms: mean(valid.map(({ duration_ms }) => duration_ms)),
        raw_samples: samples,
      });
    }
  }
  return results;
}

function driftMetric(input) {
  const samples = input.observations.flatMap((observation) => {
    const result = [];
    for (const cacheClass of ["cold", "warm"]) {
      const run = observation.comparators?.ascout?.[cacheClass];
      if (!run) continue;
      result.push({
        cache_class: cacheClass,
        independent: run.source_stability ?? null,
        reported: run.reported_source_stability ?? null,
      });
    }
    return result;
  }).filter((sample) => sample.independent === "stable" || sample.independent === "tree_drifted");
  let correct = 0;
  let referenceDrift = 0;
  let detectedDrift = 0;
  let missedDrift = 0;
  for (const sample of samples) {
    if (sample.independent === sample.reported) correct += 1;
    if (sample.independent === "tree_drifted") {
      referenceDrift += 1;
      if (sample.reported === "tree_drifted") detectedDrift += 1;
      else missedDrift += 1;
    }
  }
  return {
    sample_count: samples.length,
    agreement_count: correct,
    agreement_rate: rate(correct, samples.length),
    reference_tree_drifted_count: referenceDrift,
    detected_tree_drifted_count: detectedDrift,
    missed_tree_drifted_count: missedDrift,
    drift_detection_rate: rate(detectedDrift, referenceDrift),
    raw_samples: samples,
  };
}

function determinismMetrics(input) {
  const names = uniqueSorted(input.observations.flatMap((observation) => Object.keys(observation.comparators ?? {})));
  return names.flatMap((name) => ["cold", "warm"].map((cacheClass) => ({
    comparator: name,
    cache_class: cacheClass,
    classification: comparatorDeterminism(input.observations, name, cacheClass),
  })));
}

function flakeBehavior(input) {
  const findings = input.observations.flatMap((observation) => observation.comparators?.ascout?.cold?.findings ?? []);
  const evaluated = [];
  for (const finding of findings) {
    const runs = finding?.observations?.runs;
    const failures = finding?.observations?.failures;
    if (!Number.isInteger(runs) || !Number.isInteger(failures) || runs < 0 || failures < 0 || failures > runs) continue;
    let expected = null;
    if (runs < 2) expected = { determinism_class: "unknown", reproduced: "unknown" };
    else if (failures > 0 && failures < runs) expected = { determinism_class: "nondeterministic", reproduced: false };
    else if (failures === runs && runs >= 2) expected = { determinism_class: "deterministic", reproduced: true };
    if (expected === null) continue;
    const observed = { determinism_class: finding.determinism_class, reproduced: finding.reproduced };
    evaluated.push({ finding_id: finding.finding_id ?? null, runs, failures, expected, observed, correct: stableJson(expected) === stableJson(observed) });
  }
  const correct = evaluated.filter((item) => item.correct).length;
  return {
    available: evaluated.length > 0,
    reason: evaluated.length === 0 ? "no benchmark-active Ascout finding exposed a repeated-observation flake classification domain" : null,
    evaluated_finding_count: evaluated.length,
    correct_count: correct,
    accuracy: rate(correct, evaluated.length),
    raw: evaluated,
  };
}

export function computeCaseMetrics(input) {
  requireCaseInput(input);
  const selection = {};
  const falsePass = [];
  if (input.case_class === "selection") {
    for (const name of ["full", "plain", "related", "ascout"]) {
      selection[name] = selectionMetricForComparator(input, name);
      falsePass.push(falsePassForComparator(input, name));
    }
  } else {
    falsePass.push(gapFalsePass(input));
  }
  const gap = input.case_class === "gap" ? gapMetric(input) : null;
  return {
    schema_version: 1,
    case_id: input.case_id,
    case_revision: input.case_revision,
    selection_recall: input.case_class === "selection" ? selection : null,
    false_pass: falsePass,
    gap_classification: gap,
    timing: timingMetrics(input),
    drift_detection: driftMetric(input),
    determinism: determinismMetrics(input),
    flake_classification_behavior: flakeBehavior(input),
  };
}

function baselineKey(baseline) {
  return sha256Text(stableJson(baseline));
}

export function aggregateBenchmarkMetrics(caseResults) {
  if (!Array.isArray(caseResults) || caseResults.length === 0) fail("aggregate requires at least one case result");
  const ids = new Set();
  for (const result of caseResults) {
    const key = `${result.case_id}@${result.case_revision}`;
    if (ids.has(key)) fail(`duplicate case result: ${key}`);
    ids.add(key);
    if (result.status !== "BENCHMARK_METRICS_READY" || result.task !== "T076") fail(`${key} is not a T076-ready result`);
  }

  const selection = {};
  for (const name of ["full", "plain", "related", "ascout"]) {
    const values = caseResults.map((result) => result.metrics.selection_recall?.[name]).filter(Boolean);
    const available = values.filter((value) => value.available === true);
    const numerator = available.reduce((sum, value) => sum + value.numerator, 0);
    const denominator = available.reduce((sum, value) => sum + value.denominator, 0);
    selection[name] = {
      available_case_count: available.length,
      unavailable_case_count: values.length - available.length,
      numerator,
      denominator,
      recall: rate(numerator, denominator),
    };
  }

  const falsePassValues = caseResults.flatMap((result) => result.metrics.false_pass ?? []).filter((value) => value.available === true);
  const falsePassCount = falsePassValues.filter((value) => value.false_pass === true).length;

  const gapValues = caseResults.map((result) => result.metrics.gap_classification).filter((value) => value?.available === true);
  const gapCorrect = gapValues.reduce((sum, value) => sum + value.numerator_correct, 0);
  const gapDenominator = gapValues.reduce((sum, value) => sum + value.denominator, 0);
  const gapUnresolved = gapValues.reduce((sum, value) => sum + value.unresolved_numerator, 0);

  const driftSamples = caseResults.flatMap((result) => result.metrics.drift_detection.raw_samples ?? []);
  const driftCorrect = driftSamples.filter((sample) => sample.independent === sample.reported).length;
  const driftReference = driftSamples.filter((sample) => sample.independent === "tree_drifted").length;
  const driftDetected = driftSamples.filter((sample) => sample.independent === "tree_drifted" && sample.reported === "tree_drifted").length;

  const determinism = { deterministic: 0, nondeterministic: 0, unknown: 0 };
  for (const item of caseResults.flatMap((result) => result.metrics.determinism ?? [])) {
    if (item.classification in determinism) determinism[item.classification] += 1;
  }

  const flakeEvaluated = caseResults.reduce((sum, result) => sum + (result.metrics.flake_classification_behavior.evaluated_finding_count ?? 0), 0);
  const flakeCorrect = caseResults.reduce((sum, result) => sum + (result.metrics.flake_classification_behavior.correct_count ?? 0), 0);

  const timingGroups = new Map();
  for (const result of caseResults) {
    const baselinesByName = new Map((result.baselines ?? []).map((baseline) => [`${baseline.comparator}:${baseline.cache_class}`, baseline]));
    for (const timing of result.metrics.timing ?? []) {
      const baseline = baselinesByName.get(`${timing.comparator}:${timing.cache_class}`);
      if (!baseline) continue;
      const key = baselineKey(baseline);
      const existing = timingGroups.get(key) ?? { baseline, samples: [] };
      existing.samples.push(...timing.raw_samples.map((sample) => ({ case_id: result.case_id, case_revision: result.case_revision, ...sample })));
      timingGroups.set(key, existing);
    }
  }
  const timing = [...timingGroups.values()].map(({ baseline, samples }) => ({
    baseline,
    sample_count: samples.length,
    arithmetic_mean_ms: mean(samples.map(({ duration_ms }) => duration_ms).filter((value) => typeof value === "number" && Number.isFinite(value))),
    raw_samples: samples,
  }));

  return {
    schema_version: 1,
    task: "T076",
    case_set: caseResults.map((result) => ({ case_id: result.case_id, case_revision: result.case_revision, t075_evidence_sha256: result.t075_evidence_sha256 })).sort((left, right) => left.case_id.localeCompare(right.case_id)),
    aggregation: {
      selection_recall: "sum observed frozen-oracle tests / sum frozen-oracle tests across metric-available cases",
      false_pass: "case-comparator count/rate over deterministic metric-available cold observations",
      gap_accuracy: "sum correctly classified resolved oracle lines / sum resolved oracle lines",
      unresolved_rate: "sum Ascout UNRESOLVED lines / sum independently resolved oracle lines",
      timing: "arithmetic mean only within byte-identical machine-readable baseline declarations",
      drift: "observation-level agreement and tree-drift detection",
      determinism: "count of same-key semantic projection classifications",
      flake: "raw observation-contract classification accuracy where an evaluable finding domain exists",
    },
    metrics: {
      selection_recall: selection,
      false_pass: {
        available_comparator_count: falsePassValues.length,
        false_pass_count: falsePassCount,
        false_pass_rate: rate(falsePassCount, falsePassValues.length),
      },
      gap_classification_accuracy: { numerator_correct: gapCorrect, denominator: gapDenominator, accuracy: rate(gapCorrect, gapDenominator) },
      unresolved_rate: { numerator: gapUnresolved, denominator: gapDenominator, rate: rate(gapUnresolved, gapDenominator) },
      timing,
      drift_detection: {
        sample_count: driftSamples.length,
        agreement_count: driftCorrect,
        agreement_rate: rate(driftCorrect, driftSamples.length),
        reference_tree_drifted_count: driftReference,
        detected_tree_drifted_count: driftDetected,
        drift_detection_rate: rate(driftDetected, driftReference),
      },
      determinism,
      flake_classification_behavior: {
        available: flakeEvaluated > 0,
        evaluated_finding_count: flakeEvaluated,
        correct_count: flakeCorrect,
        accuracy: rate(flakeCorrect, flakeEvaluated),
      },
    },
    raw_cases: caseResults.map((result) => ({
      case_id: result.case_id,
      case_revision: result.case_revision,
      baselines: result.baselines,
      observations: result.observations,
      metrics: result.metrics,
    })),
  };
}

export const __test = { stableJson, rate, same, comparatorProjection };
