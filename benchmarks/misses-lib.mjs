function fail(message) {
  throw new Error(`benchmark selector misses: ${message}`);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function uniqueStrings(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    fail(`${label} must be an array of non-empty strings`);
  }
  const unique = new Set(value);
  if (unique.size !== value.length) fail(`${label} must not contain duplicates`);
  return [...value];
}

function sameStrings(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function exactRate(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

const SHA256 = /^[a-f0-9]{64}$/u;
const ARTIFACT_DIGEST = /^sha256:[a-f0-9]{64}$/u;
const RUN_ID = /^[1-9][0-9]*$/u;
const COMPARATORS = ["full", "plain", "related", "ascout"];

function caseKey(caseId, caseRevision) {
  return `${caseId}@${caseRevision}`;
}

function requireSourceEvidence(evidence) {
  if (!isObject(evidence)) fail("source evidence must be an object");
  const required = ["qualification_run_id", "t076_aggregate_sha256", "t077_aggregate_sha256", "aggregate_artifact_digest"];
  for (const field of required) {
    if (!(field in evidence)) fail(`source evidence ${field} is required`);
  }
  if (typeof evidence.qualification_run_id !== "string" || !RUN_ID.test(evidence.qualification_run_id)) {
    fail("source evidence qualification_run_id must be a positive decimal GitHub Actions run id");
  }
  for (const field of ["t076_aggregate_sha256", "t077_aggregate_sha256"]) {
    if (typeof evidence[field] !== "string" || !SHA256.test(evidence[field])) {
      fail(`source evidence ${field} must be a lowercase SHA-256 digest`);
    }
  }
  if (typeof evidence.aggregate_artifact_digest !== "string" || !ARTIFACT_DIGEST.test(evidence.aggregate_artifact_digest)) {
    fail("source evidence aggregate_artifact_digest must be a sha256:<digest> value");
  }
  return {
    qualification_run_id: evidence.qualification_run_id,
    t076_aggregate_sha256: evidence.t076_aggregate_sha256,
    t077_aggregate_sha256: evidence.t077_aggregate_sha256,
    aggregate_artifact_digest: evidence.aggregate_artifact_digest,
  };
}

function requireT076Aggregate(input) {
  if (!isObject(input) || input.schema_version !== 1 || input.task !== "T076") {
    fail("input must be a T076 aggregate result");
  }
  if (!Array.isArray(input.case_set) || input.case_set.length === 0) fail("T076 case_set is unavailable");
  if (!Array.isArray(input.raw_cases) || input.raw_cases.length === 0) fail("T076 raw_cases are unavailable");
  if (!isObject(input.metrics?.selection_recall)) fail("T076 aggregate selection_recall metrics are unavailable");
}

function caseBindings(input) {
  const bindings = new Map();
  for (const item of input.case_set) {
    if (!isObject(item) || typeof item.case_id !== "string" || item.case_id.length === 0 || !Number.isInteger(item.case_revision) || item.case_revision < 1) {
      fail("T076 case_set contains invalid case identity");
    }
    if (typeof item.t075_evidence_sha256 !== "string" || !SHA256.test(item.t075_evidence_sha256)) {
      fail(`${caseKey(item.case_id, item.case_revision)} is missing T075 evidence binding`);
    }
    const key = caseKey(item.case_id, item.case_revision);
    if (bindings.has(key)) fail(`duplicate T076 case binding: ${key}`);
    bindings.set(key, {
      case_id: item.case_id,
      case_revision: item.case_revision,
      t075_evidence_sha256: item.t075_evidence_sha256,
    });
  }
  return bindings;
}

function selectionBaseline(result, comparator, metric, t075EvidenceSha256) {
  if (!Array.isArray(result.baselines)) fail(`${caseKey(result.case_id, result.case_revision)} baselines are unavailable`);
  const matches = result.baselines.filter((baseline) =>
    baseline?.metric === "selection_recall" &&
    baseline?.comparator === comparator &&
    baseline?.baseline_id === metric?.baseline_id,
  );
  if (matches.length !== 1) {
    fail(`${caseKey(result.case_id, result.case_revision)} ${comparator} selection baseline is missing or ambiguous`);
  }
  const baseline = matches[0];
  if (baseline.case_id !== result.case_id || baseline.case_revision !== result.case_revision || baseline.cache_class !== "cold") {
    fail(`${caseKey(result.case_id, result.case_revision)} ${comparator} baseline identity is inconsistent`);
  }
  if (!isObject(baseline.denominator) || baseline.denominator.kind !== "frozen_oracle_test_ids") {
    fail(`${caseKey(result.case_id, result.case_revision)} ${comparator} denominator contract is invalid`);
  }
  const required = uniqueStrings(baseline.frozen_oracle_test_ids, `${result.case_id} ${comparator} frozen oracle IDs`);
  if (!isNonNegativeInteger(baseline.denominator.count) || baseline.denominator.count !== required.length || required.length === 0) {
    fail(`${caseKey(result.case_id, result.case_revision)} ${comparator} frozen oracle denominator is inconsistent`);
  }
  if (typeof baseline.reference_evidence_sha256 !== "string" || !SHA256.test(baseline.reference_evidence_sha256)) {
    fail(`${caseKey(result.case_id, result.case_revision)} ${comparator} reference evidence binding is unavailable`);
  }
  if (baseline.reference_evidence_sha256 !== t075EvidenceSha256) {
    fail(`${caseKey(result.case_id, result.case_revision)} ${comparator} reference evidence does not match the T075 case binding`);
  }
  return { baseline, required };
}

function outcomeFor(result, comparator, t075EvidenceSha256) {
  const metric = result.metrics?.selection_recall?.[comparator];
  if (!isObject(metric) || metric.comparator !== comparator || typeof metric.baseline_id !== "string" || !SHA256.test(metric.baseline_id)) {
    fail(`${caseKey(result.case_id, result.case_revision)} ${comparator} selection metric is invalid`);
  }
  const { baseline, required } = selectionBaseline(result, comparator, metric, t075EvidenceSha256);
  if (!isNonNegativeInteger(metric.denominator) || metric.denominator !== required.length) {
    fail(`${caseKey(result.case_id, result.case_revision)} ${comparator} metric denominator is inconsistent`);
  }

  const common = {
    case_id: result.case_id,
    case_revision: result.case_revision,
    comparator,
    baseline_id: metric.baseline_id,
    t075_evidence_sha256: t075EvidenceSha256,
    reference_evidence_sha256: baseline.reference_evidence_sha256,
    required_oracle_test_ids: [...required].sort(),
  };

  if (metric.available === false) {
    if (
      metric.numerator !== null ||
      metric.recall !== null ||
      ("observed_oracle_test_ids" in metric && metric.observed_oracle_test_ids !== null) ||
      ("required_oracle_test_ids" in metric && metric.required_oracle_test_ids !== null) ||
      typeof metric.reason !== "string" ||
      metric.reason.length === 0
    ) {
      fail(`${caseKey(result.case_id, result.case_revision)} ${comparator} unavailable metric is inconsistent`);
    }
    return {
      ...common,
      availability: "unavailable",
      reason: metric.reason,
      observed_oracle_test_ids: null,
      missed_oracle_test_ids: null,
    };
  }

  if (metric.available !== true || metric.reason !== null) {
    fail(`${caseKey(result.case_id, result.case_revision)} ${comparator} availability state is invalid`);
  }
  const requiredMetric = uniqueStrings(metric.required_oracle_test_ids, `${result.case_id} ${comparator} required oracle IDs`);
  const observed = uniqueStrings(metric.observed_oracle_test_ids, `${result.case_id} ${comparator} observed oracle IDs`);
  if (!sameStrings(requiredMetric, required)) {
    fail(`${caseKey(result.case_id, result.case_revision)} ${comparator} metric/baseline oracle IDs disagree`);
  }
  if (observed.some((id) => !required.includes(id))) {
    fail(`${caseKey(result.case_id, result.case_revision)} ${comparator} observed a non-oracle test ID`);
  }
  if (!isNonNegativeInteger(metric.numerator) || metric.numerator !== observed.length || metric.numerator > required.length) {
    fail(`${caseKey(result.case_id, result.case_revision)} ${comparator} numerator is inconsistent`);
  }
  if (metric.recall !== exactRate(metric.numerator, metric.denominator)) {
    fail(`${caseKey(result.case_id, result.case_revision)} ${comparator} recall is inconsistent`);
  }
  const missed = required.filter((id) => !observed.includes(id)).sort();
  return {
    ...common,
    availability: missed.length === 0 ? "hit" : "miss",
    reason: null,
    observed_oracle_test_ids: [...observed].sort(),
    missed_oracle_test_ids: missed,
  };
}

function aggregateCrossCheck(input, outcomes) {
  for (const comparator of COMPARATORS) {
    const published = outcomes.filter((item) => item.comparator === comparator);
    const available = published.filter((item) => item.availability !== "unavailable");
    const unavailable = published.filter((item) => item.availability === "unavailable");
    const numerator = available.reduce((sum, item) => sum + item.observed_oracle_test_ids.length, 0);
    const denominator = available.reduce((sum, item) => sum + item.required_oracle_test_ids.length, 0);
    const baselineIds = [...new Set(available.map((item) => item.baseline_id))].sort();
    const aggregate = input.metrics.selection_recall[comparator];
    if (!isObject(aggregate)) fail(`T076 aggregate ${comparator} selection metric is unavailable`);
    if (
      aggregate.available_case_count !== available.length ||
      aggregate.unavailable_case_count !== unavailable.length ||
      aggregate.numerator !== numerator ||
      aggregate.denominator !== denominator ||
      aggregate.recall !== exactRate(numerator, denominator) ||
      !sameStrings(uniqueStrings(aggregate.baseline_ids, `T076 aggregate ${comparator} baseline IDs`), baselineIds)
    ) {
      fail(`T076 aggregate ${comparator} selection metric disagrees with published case truth`);
    }
  }
}

export function publishSelectorMisses(input, evidence) {
  requireT076Aggregate(input);
  const sourceEvidence = requireSourceEvidence(evidence);
  const bindings = caseBindings(input);
  const outcomes = [];
  const selectionCases = [];
  const seenRaw = new Set();

  for (const result of input.raw_cases) {
    if (!isObject(result) || typeof result.case_id !== "string" || !Number.isInteger(result.case_revision) || result.case_revision < 1) {
      fail("T076 raw_cases contains invalid case identity");
    }
    if (result.metrics?.selection_recall === null) continue;
    const key = caseKey(result.case_id, result.case_revision);
    const binding = bindings.get(key);
    if (binding === undefined) fail(`${key} has no T076 case-set evidence binding`);
    if (seenRaw.has(key)) fail(`duplicate T076 raw case: ${key}`);
    seenRaw.add(key);
    selectionCases.push(binding);
    for (const comparator of COMPARATORS) {
      outcomes.push(outcomeFor(result, comparator, binding.t075_evidence_sha256));
    }
  }

  if (outcomes.length === 0) fail("T076 aggregate contains no selection cases");
  aggregateCrossCheck(input, outcomes);

  const misses = outcomes.flatMap((outcome) =>
    outcome.availability === "miss"
      ? outcome.missed_oracle_test_ids.map((oracleTestId) => ({
          case_id: outcome.case_id,
          case_revision: outcome.case_revision,
          comparator: outcome.comparator,
          baseline_id: outcome.baseline_id,
          t075_evidence_sha256: outcome.t075_evidence_sha256,
          reference_evidence_sha256: outcome.reference_evidence_sha256,
          oracle_test_id: oracleTestId,
        }))
      : [],
  ).sort((left, right) =>
    left.case_id.localeCompare(right.case_id) ||
    left.comparator.localeCompare(right.comparator) ||
    left.oracle_test_id.localeCompare(right.oracle_test_id),
  );

  const unavailable = outcomes.filter((item) => item.availability === "unavailable").sort((left, right) =>
    left.case_id.localeCompare(right.case_id) || left.comparator.localeCompare(right.comparator),
  );

  const comparatorSummary = {};
  for (const comparator of COMPARATORS) {
    const values = outcomes.filter((item) => item.comparator === comparator);
    comparatorSummary[comparator] = {
      hit_case_count: values.filter((item) => item.availability === "hit").length,
      miss_case_count: values.filter((item) => item.availability === "miss").length,
      unavailable_case_count: values.filter((item) => item.availability === "unavailable").length,
      published_missed_oracle_test_count: misses.filter((item) => item.comparator === comparator).length,
    };
  }

  return {
    schema_version: 1,
    task: "T078",
    status: "SELECTOR_MISSES_PUBLISHED",
    source_task: "T076",
    threshold_policy: {
      acceptance_threshold: null,
      rationale: "No pre-data selector recall threshold is authorized; every observed selector miss is published.",
    },
    source_evidence: sourceEvidence,
    selection_case_set: selectionCases.sort((left, right) =>
      left.case_id.localeCompare(right.case_id) || left.case_revision - right.case_revision,
    ),
    summary: {
      selection_case_count: selectionCases.length,
      comparator_outcome_count: outcomes.length,
      published_selector_miss_count: misses.length,
      unavailable_outcome_count: unavailable.length,
      comparators: comparatorSummary,
    },
    selector_misses: misses,
    selector_unavailable: unavailable.map((item) => ({
      case_id: item.case_id,
      case_revision: item.case_revision,
      comparator: item.comparator,
      baseline_id: item.baseline_id,
      t075_evidence_sha256: item.t075_evidence_sha256,
      reference_evidence_sha256: item.reference_evidence_sha256,
      required_oracle_test_ids: item.required_oracle_test_ids,
      reason: item.reason,
    })),
  };
}

export const __test = { exactRate, sameStrings };
