/**
 * UA-P06-T15, grain A — security benchmark v1 over the T09–T14 contracts.
 *
 * Every case runs the real Ascout security contract (no stand-ins) on a fixed,
 * synthetic, deterministic input and compares the observed outcome with the
 * expected one. Hard gates are computed from the actual outputs and mirror the
 * authorization's hard-zero invariants. The benchmark is local and offline and
 * is itself never a security verdict on any repository.
 */
import { createHash } from "node:crypto";
import { buildSentrdelGenericIacGapV1, normalizeSentrdelWorkflowObservationV1 } from "./sentrdel-workflow-normalization.js";
import { compareSentrdelInvariantRegressionV1 } from "./sentrdel-invariant-regression.js";
import { importSentrdelSarifV1 } from "./sentrdel-sarif-import.js";
import { exportSentrdelSarifV1 } from "./sentrdel-sarif-export.js";
import { linkSentrdelReproductionV1 } from "./sentrdel-reproduction-link.js";
import { assessSentrdelRemediationV1 } from "./sentrdel-remediation-retest.js";
import { buildSecurityCommandReportV1 } from "./security-command.js";
import { normalizeSentrdelEvidenceV1 } from "./sentrdel-evidence-normalization.js";
import { SENTRDEL_ENGINE_ID, SENTRDEL_ENGINE_VERSION } from "./sentrdel-engine-boundary.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "./sentrdel-source-pin.js";

export const SENTRDEL_SECURITY_BENCHMARK_AUTHORITY = "UA-P06-T15" as const;
export const SENTRDEL_SECURITY_BENCHMARK_CLASSES = [
  "known-invariant-regression", "safe-control", "false-positive-candidate", "unsupported-coverage",
  "sarif-conflict", "iac-ci-misconfiguration", "remediation-retest", "reproduction-reference", "missing-engine",
] as const;
export type SentrdelSecurityBenchmarkClassV1 = (typeof SENTRDEL_SECURITY_BENCHMARK_CLASSES)[number];

interface CaseResult {
  readonly id: string;
  readonly class: SentrdelSecurityBenchmarkClassV1;
  readonly expected: string;
  readonly observed: string;
  readonly matched: boolean;
}

const BASE = "a".repeat(40);
const CANDIDATE = "b".repeat(40);
const sha = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

function side(role: "TRUSTED_BASE" | "CANDIDATE", evaluations: unknown[]) {
  return {
    schema_version: 1, role, source_head: role === "TRUSTED_BASE" ? BASE : CANDIDATE, request_id: "request:bench",
    attempt_id: "attempt:1", engine_id: SENTRDEL_ENGINE_ID, engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE, engine_version: SENTRDEL_ENGINE_VERSION, producer_id: "producer:bench",
    evidence_ref: `evidence:${role.toLowerCase()}`, evidence_digest: sha(role), evaluations,
  };
}

function evaluation(state: string, coverage = "COVERED") {
  return { invariant_id: "inv:authz-owner-only", definition_digest: sha("authz-owner-only"), state,
    coverage_state: coverage, unknown_tokens: coverage === "COVERED" ? [] : ["TIMEOUT"] };
}

function regression(base: string, candidate: string, coverage = "COVERED"): string {
  return compareSentrdelInvariantRegressionV1(side("TRUSTED_BASE", [evaluation(base)]),
    side("CANDIDATE", [evaluation(candidate, coverage)])).records[0]!.disposition;
}

function observation(head: string, request: string, rule: string, digest: string, reproduction: string | null = null) {
  return normalizeSentrdelEvidenceV1({
    schema_version: 1, request_id: request, attempt_id: "attempt:1", claim_class: "STRUCTURAL_OBSERVATION",
    engine_id: SENTRDEL_ENGINE_ID, engine_pin: SENTRDEL_PINNED_REVISION, engine_tree: SENTRDEL_PINNED_TREE,
    engine_version: "0.0.0", source_head: head, capability_id: "sast-structural", execution_state: "EXECUTED",
    rule_id: rule, location: { path: "src/db/query.ts", start_line: 40, end_line: 44 },
    raw_evidence_ref: `raw:${request}`, raw_evidence_digest: digest, coverage_state: "PARTIAL",
    scanned_scope: ["src"], unscanned_scope: ["vendor"], unknown_states: ["PARSER_UNSUPPORTED"], limitations: ["benchmark"],
    provenance: { state: "COMPLETE", producer_id: "producer:bench", producer_version: "0.0.0",
      collector_ref: "collector:bench", rule_set_ref: "ruleset:bench" },
    effect_facts: "E0_READ_ONLY_ANALYSIS", network_facts: "NO_NETWORK", egress_facts: "NO_EGRESS",
    reproduction_ref: reproduction,
  } as Parameters<typeof normalizeSentrdelEvidenceV1>[0]);
}

function sarifImport(results: unknown[]) {
  const text = JSON.stringify({ version: "2.1.0", runs: [
    { tool: { driver: { name: "tool-a", version: "1.0.0" } }, results },
  ] });
  return importSentrdelSarifV1({ schema_version: 1, source_head: CANDIDATE, request_id: "request:bench",
    attempt_id: "attempt:1", producer_id: "producer:bench", evidence_ref: "evidence:sarif", evidence_digest: sha(text), sarif_text: text });
}

function refused(run: () => unknown): string {
  try {
    run();
    return "ACCEPTED";
  } catch {
    return "REFUSED";
  }
}

export function runSentrdelSecurityBenchmarkV1() {
  const sarifResult = (kind: string, level: string) => ({ ruleId: "js/sql-injection", kind, level,
    message: { text: "Query built from user input" },
    locations: [{ physicalLocation: { artifactLocation: { uri: "src/db/query.ts" }, region: { startLine: 40 } } }] });
  const conflict = sarifImport([sarifResult("fail", "error"), sarifResult("pass", "none")]);
  const original = observation(BASE, "request:scan", "rule:sqli", sha("scan"), "repro:sqli");
  const fix = { schema_version: 1, fix_ref: "pr:bench", fix_head: CANDIDATE };
  const run = { schema_version: 1, source_head: CANDIDATE, request_id: "request:retest", attempt_id: "attempt:1",
    capability_id: "sast-structural", execution_state: "EXECUTED", coverage_state: "COMPLETE_WITHIN_STATED_SCOPE",
    scanned_scope: ["src"], unknown_states: [], evidence_ref: "evidence:retest", evidence_digest: sha("retest") };
  const workflow = normalizeSentrdelWorkflowObservationV1({ schema_version: 1, request_id: "request:bench",
    attempt_id: "attempt:1", source_head: CANDIDATE, engine_id: SENTRDEL_ENGINE_ID, engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE, engine_version: SENTRDEL_ENGINE_VERSION, capability_id: "github-actions",
    execution_state: "EXECUTED", rule_id: "gha.pull-request-target", workflow_path: ".github/workflows/ci.yml", line: 3,
    producer_id: "producer:bench", evidence_ref: "evidence:workflow", evidence_digest: sha("workflow"),
    coverage_state: "COMPLETE_WITHIN_STATED_SCOPE", unknown_tokens: [], effect_ceiling: "E0_READ_ONLY_ANALYSIS",
    network_policy: "NO_NETWORK", egress_policy: "NO_EGRESS" });
  const gap = buildSentrdelGenericIacGapV1();
  const exported = JSON.parse(exportSentrdelSarifV1([original]).sarif_text);
  const security = buildSecurityCommandReportV1();
  const fixOnly = assessSentrdelRemediationV1(original, fix, null, null);
  const stillThere = assessSentrdelRemediationV1(original, fix, run, [observation(CANDIDATE, "request:retest", "rule:sqli", sha("again"))]);
  const notReobserved = assessSentrdelRemediationV1(original, fix, run, []);
  const link = linkSentrdelReproductionV1(original, { schema_version: 1, reproduction_ref: "repro:sqli",
    source_head: BASE, method: "deterministic-rescan", input_digest: sha("scan") });

  const cases: Array<Omit<CaseResult, "matched">> = [
    { id: "regression.satisfied-to-violated", class: "known-invariant-regression", expected: "REGRESSION", observed: regression("SATISFIED", "VIOLATED") },
    { id: "safe.satisfied-unchanged", class: "safe-control", expected: "UNCHANGED", observed: regression("SATISFIED", "SATISFIED") },
    { id: "safe.violated-to-satisfied", class: "safe-control", expected: "IMPROVEMENT", observed: regression("VIOLATED", "SATISFIED") },
    { id: "coverage.timeout-not-unchanged", class: "unsupported-coverage", expected: "COVERAGE_LOST", observed: regression("SATISFIED", "SATISFIED", "TIMED_OUT") },
    { id: "coverage.generic-iac-not-run", class: "unsupported-coverage", expected: "NOT_RUN/clean=false", observed: `${gap.status}/clean=${gap.clean_claimed}` },
    { id: "fp.sarif-is-inference", class: "false-positive-candidate", expected: "INFERENCE/finding=false", observed: `${conflict.observations[0]!.epistemic_class}/finding=${conflict.observations[0]!.finding_emitted}` },
    { id: "fp.export-review-only", class: "false-positive-candidate", expected: "review/none", observed: `${exported.runs[0].results[0].kind}/${exported.runs[0].results[0].level}` },
    { id: "sarif.conflict-both-inference", class: "sarif-conflict", expected: "2xINFERENCE/truth=false", observed: `${conflict.observations.filter(o => o.epistemic_class === "INFERENCE").length}xINFERENCE/truth=${conflict.sarif_is_canonical_truth}` },
    { id: "sarif.tampered-text-refused", class: "sarif-conflict", expected: "REFUSED", observed: refused(() => importSentrdelSarifV1({ schema_version: 1, source_head: CANDIDATE, request_id: "request:bench", attempt_id: "attempt:1", producer_id: "producer:bench", evidence_ref: "evidence:sarif", evidence_digest: sha("other"), sarif_text: "{}" })) },
    { id: "iac.pull-request-target-observation", class: "iac-ci-misconfiguration", expected: "CONFIG_OBSERVATION_ONLY/finding=false", observed: `${workflow.authority}/finding=${workflow.finding_emitted}` },
    { id: "retest.fix-only-open", class: "remediation-retest", expected: "OPEN_FIX_UNVERIFIED", observed: fixOnly.state },
    { id: "retest.still-observed", class: "remediation-retest", expected: "OPEN_STILL_OBSERVED", observed: stillThere.state },
    { id: "retest.not-reobserved-unverified", class: "remediation-retest", expected: "RETEST_NOT_REOBSERVED/verified=false", observed: `${notReobserved.state}/verified=${notReobserved.remediation_verified}` },
    { id: "repro.linked-not-executed", class: "reproduction-reference", expected: "LINKED_NOT_EXECUTED/proven=false", observed: `${link.state}/proven=${link.exploit_proven}` },
    { id: "engine.missing-not-run-exit-1", class: "missing-engine", expected: "NOT_RUN/1", observed: `${security.outcome}/${security.exit_code}` },
  ];
  const results: CaseResult[] = cases.map(c => Object.freeze({ ...c, matched: c.observed === c.expected }));
  const count = (cls: SentrdelSecurityBenchmarkClassV1) => results.filter(r => r.class === cls);
  const rate = (cls: SentrdelSecurityBenchmarkClassV1) => `${count(cls).filter(r => r.matched).length}/${count(cls).length}`;
  // Hard gates from the authorization's hard-zero invariants, computed on actual outputs.
  const hardGates = Object.freeze({
    security_pass_presented_as_assurance_pass: Number(security.security_pass !== false),
    // Widened on purpose: this gate must catch a runtime regression the literal type cannot express.
    missing_engine_converted_to_pass: Number(security.outcome !== "NOT_RUN" || (security.exit_code as number) === 0),
    sarif_presented_as_canonical_truth: Number(conflict.sarif_is_canonical_truth !== false) +
      conflict.observations.filter(o => o.canonical_truth !== false).length,
    fix_without_new_evidence_presented_as_verified: Number(fixOnly.remediation_verified !== false || fixOnly.lifecycle_open !== true),
    unsupported_scope_preserves_totality_claim: Number(gap.coverage_total !== false || gap.clean_claimed !== false) +
      Number(regression("SATISFIED", "SATISFIED", "TIMED_OUT") === "UNCHANGED"),
    safe_control_reported_as_regression: count("safe-control").filter(r => r.observed === "REGRESSION").length,
  });
  return Object.freeze({
    schema_version: 1 as const,
    phase_authority: SENTRDEL_SECURITY_BENCHMARK_AUTHORITY,
    cases: Object.freeze(results),
    metrics: Object.freeze({
      invariant_regression_detection: rate("known-invariant-regression"),
      known_safe_false_positives: count("safe-control").filter(r => !r.matched).length,
      coverage_loss_honesty: rate("unsupported-coverage"),
      external_engine_reconciliation: rate("sarif-conflict"),
      remediation_retest_correctness: rate("remediation-retest"),
    }),
    hard_gates: hardGates,
    all_cases_matched: results.every(r => r.matched),
    hard_gates_zero: Object.values(hardGates).every(value => value === 0),
    benchmark_is_security_verdict: false as const,
    assurance_effect: "NONE" as const,
  });
}
