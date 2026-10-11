/**
 * UA-P06-T15, grain B — security benchmark v1 over the T07 secret and T08
 * dependency contracts: synthetic secrets and dependency reachability
 * true/false/unknown. Every case runs the real contract on synthetic,
 * non-functional values. At the pin reachability is never computed, so the
 * only correct outcome for a reachable or not-reachable claim is refusal.
 */
import { normalizeSentrdelSecretInputV1, SENTRDEL_SECRET_CAPABILITY_ID } from "./sentrdel-secret-normalization.js";
import {
  normalizeSentrdelScaInputV1, SENTRDEL_SCA_CAPABILITY_ID, SENTRDEL_SCA_CLAIM_CLASS,
} from "./sentrdel-dependency-normalization.js";
import { SENTRDEL_ENGINE_ID, SENTRDEL_ENGINE_VERSION } from "./sentrdel-engine-boundary.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "./sentrdel-source-pin.js";

export const SENTRDEL_DATA_BENCHMARK_AUTHORITY = "UA-P06-T15" as const;
/** Synthetic, non-functional token body; it must never appear in any output. */
const SYNTHETIC_BODY = "SYNTHETICNOTAREALBENCHMARK0000000000";
// Assembled at runtime so no token-shaped literal exists in the source.
const SYNTHETIC_TOKEN = ["ghp", SYNTHETIC_BODY].join("_");

const PINNED = {
  schema_version: 1, source_head: "c".repeat(40), engine_id: SENTRDEL_ENGINE_ID, engine_pin: SENTRDEL_PINNED_REVISION,
  engine_tree: SENTRDEL_PINNED_TREE, engine_version: SENTRDEL_ENGINE_VERSION, execution_state: "EXECUTED",
  provenance_state: "COMPLETE", producer_id: "producer:bench", producer_version: SENTRDEL_ENGINE_VERSION,
  effect_facts: "E0_READ_ONLY_ANALYSIS", network_facts: "NO_NETWORK", egress_facts: "NO_EGRESS",
};

function secretInput(overrides: Record<string, unknown> = {}) {
  return { ...PINNED, request_id: "request:bench-secret", attempt_id: "attempt:1",
    capability_id: SENTRDEL_SECRET_CAPABILITY_ID, claim_class: "SECRET_SHAPE_OBSERVATION",
    match_state: "SECRET_SHAPE_OBSERVED", validation_state: "NOT_VALIDATED", confidence_state: "DETECTOR_PATTERN_MATCH_ONLY",
    redaction_state: "REDACTED_BEFORE_PERSISTENCE", rule_id: "rule:bench-secret-shape", rule_set_ref: "ruleset:bench",
    secret_class: "GITHUB_PERSONAL_ACCESS_TOKEN", matched_length: SYNTHETIC_TOKEN.length, redacted_digest: "d".repeat(64),
    location_path: "config/settings.ts", location_start_line: 4, location_end_line: 4, collector_ref: "collector:bench",
    coverage_state: "PARTIAL", aggregate_coverage_state: "PARTIALLY_COVERED", unknown_states: ["TIMEOUT"],
    coverage_loss_reasons: ["UNSCANNED_PATH"], evidence_ref: "evidence:bench-secret", evidence_digest: "e".repeat(64),
    limitations: ["benchmark synthetic secret"], ...overrides };
}

function dependencyInput(overrides: Record<string, unknown> = {}) {
  return { ...PINNED, request_id: "request:bench-sca", attempt_id: "attempt:1",
    capability_id: SENTRDEL_SCA_CAPABILITY_ID, claim_class: SENTRDEL_SCA_CLAIM_CLASS, ecosystem: "NPM",
    package_name: "left-pad", observed_version: "1.3.0", manifest_ref: "package-lock.json",
    advisory_ref: "advisory:bench-0001", advisory_source_ref: "advisory-corpus:bench",
    advisory_freshness_state: "ADVISORY_FRESHNESS_CONFIRMED", version_match_state: "ADVISORY_VERSION_MATCH_OBSERVED",
    reachability_state: "REACHABILITY_NOT_COMPUTED", rule_id: "rule:bench-dependency-delta", collector_ref: "collector:bench",
    coverage_state: "PARTIAL", aggregate_coverage_state: "PARTIALLY_COVERED", unknown_states: ["REACHABILITY_NOT_COMPUTED"],
    coverage_loss_reasons: ["UNKNOWN_REACHABILITY"], evidence_ref: "evidence:bench-sca", evidence_digest: "f".repeat(64),
    limitations: ["benchmark dependency delta"], ...overrides };
}

const outcome = (value: unknown): string => (value === undefined ? "REFUSED" : "ACCEPTED");

export function runSentrdelDataSecurityBenchmarkV1() {
  const secret = normalizeSentrdelSecretInputV1(secretInput() as never);
  const dependency = normalizeSentrdelScaInputV1(dependencyInput() as never);
  const serialized = JSON.stringify([secret, dependency]);
  const cases = [
    { id: "secret.redacted-observation", class: "synthetic-secret", expected: "ACCEPTED/plaintext=false",
      observed: `${outcome(secret)}/plaintext=${String(secret?.redacted_evidence.plaintext_persisted)}` },
    { id: "secret.plaintext-in-input-refused", class: "synthetic-secret", expected: "REFUSED",
      observed: outcome(normalizeSentrdelSecretInputV1(secretInput({ limitations: [`leaked ${SYNTHETIC_TOKEN}`] }) as never)) },
    { id: "reach.unknown-preserved", class: "dependency-reachability", expected: "ACCEPTED/REACHABILITY_NOT_COMPUTED",
      observed: `${outcome(dependency)}/${String(dependency?.reachability_state)}` },
    { id: "reach.true-claim-refused", class: "dependency-reachability", expected: "REFUSED",
      observed: outcome(normalizeSentrdelScaInputV1(dependencyInput({ reachability_state: "REACHABLE" }) as never)) },
    { id: "reach.false-claim-refused", class: "dependency-reachability", expected: "REFUSED",
      observed: outcome(normalizeSentrdelScaInputV1(dependencyInput({ reachability_state: "NOT_REACHABLE" }) as never)) },
    { id: "dependency.version-match-not-finding", class: "dependency-reachability", expected: "finding=false",
      observed: `finding=${String(dependency?.finding_emitted)}` },
  ].map(c => Object.freeze({ ...c, matched: c.observed === c.expected }));
  const hardGates = Object.freeze({
    secret_plaintext_in_persisted_artifact: Number(serialized.includes(SYNTHETIC_BODY)),
    reachability_verdict_accepted: cases.filter(c => c.id !== "reach.unknown-preserved" && c.class === "dependency-reachability" &&
      c.observed === "ACCEPTED").length,
    unredacted_secret_accepted: Number(cases[1]!.observed !== "REFUSED"),
  });
  return Object.freeze({
    schema_version: 1 as const,
    phase_authority: SENTRDEL_DATA_BENCHMARK_AUTHORITY,
    cases: Object.freeze(cases),
    hard_gates: hardGates,
    all_cases_matched: cases.every(c => c.matched),
    hard_gates_zero: Object.values(hardGates).every(value => value === 0),
    benchmark_is_security_verdict: false as const,
    assurance_effect: "NONE" as const,
  });
}
