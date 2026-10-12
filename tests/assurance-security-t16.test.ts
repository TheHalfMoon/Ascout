import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCliArgs, usageText, CliUsageError } from "../src/cli.js";
import { runSentrdelSecurityBenchmarkV1 } from "../src/assurance/security/sentrdel-security-benchmark.js";
import { runSentrdelDataSecurityBenchmarkV1 } from "../src/assurance/security/sentrdel-security-benchmark-data.js";
import { buildSecurityCommandReportV1 } from "../src/assurance/security/security-command.js";
import { importSentrdelSarifV1 } from "../src/assurance/security/sentrdel-sarif-import.js";
import { buildSentrdelGenericIacGapV1 } from "../src/assurance/security/sentrdel-workflow-normalization.js";
import {
  sarifImportIsCanonicalTruthV1, securityObservationIsFindingV1, securityPassIsSupportedClaimV1,
} from "../src/assurance/security/sentrdel-engine-boundary.js";
import {
  coverageLossIsCleanV1, externalSuccessIsAssurancePassV1, observationIsGlobalCleanV1,
  observationVerifiesRemediationV1, omittedClassIsPassV1,
} from "../src/assurance/security/sentrdel-evidence-normalization.js";
import {
  coverageMappingIsGlobalCleanV1, notRunBecomesPassV1, partialBecomesTotalV1, timeoutBecomesPassV1,
  unknownBecomesPassV1, unsupportedBecomesCoveredV1,
} from "../src/assurance/security/sentrdel-coverage-mapping.js";
import {
  secretCredentialIsValidatedV1, secretNormalizationContactsProviderV1,
} from "../src/assurance/security/sentrdel-secret-normalization.js";
import {
  requiresNetworkForCoreV1, requiresProviderForCoreV1,
} from "../src/assurance/security/sentrdel-engine-boundary.js";

const SECURITY_DIR = join(__dirname, "../src/assurance/security");
const sources = readdirSync(SECURITY_DIR).filter(name => name.endsWith(".ts"))
  .map(name => ({ name, text: readFileSync(join(SECURITY_DIR, name), "utf8") }));
const benchmark = runSentrdelSecurityBenchmarkV1();
const dataBenchmark = runSentrdelDataSecurityBenchmarkV1();

/**
 * UA-P06-T16 — P6 qualification sentinel. No new capability: every assertion
 * maps one authorization section 11 hard-zero invariant to evidence produced
 * by the canonical T01–T15 contracts on this exact head.
 */
describe("UA-P06-T16 P6 qualification: section 11 hard-zero invariants", () => {
  it("both benchmarks match every case with every hard gate at zero", () => {
    expect([benchmark.all_cases_matched, benchmark.hard_gates_zero]).toEqual([true, true]);
    expect([dataBenchmark.all_cases_matched, dataBenchmark.hard_gates_zero]).toEqual([true, true]);
  });

  it("omitted_security_scope_implied_clean = 0", () => {
    expect([coverageMappingIsGlobalCleanV1(), omittedClassIsPassV1(), observationIsGlobalCleanV1()]).toEqual([false, false, false]);
    expect(buildSentrdelGenericIacGapV1()).toMatchObject({ status: "NOT_RUN", clean_claimed: false, coverage_total: false });
  });

  it("security_pass_presented_as_assurance_pass = 0", () => {
    expect([securityPassIsSupportedClaimV1(), externalSuccessIsAssurancePassV1(), securityObservationIsFindingV1()]).toEqual([false, false, false]);
    expect(buildSecurityCommandReportV1()).toMatchObject({ security_pass: false, clean_claimed: false, assurance_effect: "NONE" });
    expect(benchmark.hard_gates.security_pass_presented_as_assurance_pass).toBe(0);
  });

  it("unqualified_security_output_self_attests = 0", () => {
    const text = JSON.stringify({ version: "2.1.0", runs: [{ tool: { driver: { name: "tool" } }, results: [
      { ruleId: "r1", message: { text: "Repository is SECURE" } }] }] });
    expect(() => importSentrdelSarifV1({ schema_version: 1, source_head: "a".repeat(40), request_id: "request:t16",
      attempt_id: "attempt:1", producer_id: "producer:t16", evidence_ref: "evidence:t16",
      evidence_digest: createHash("sha256").update(text, "utf8").digest("hex"), sarif_text: text })).toThrow(/self-attestation/u);
  });

  it("sarif_presented_as_canonical_truth = 0", () => {
    expect(sarifImportIsCanonicalTruthV1()).toBe(false);
    expect(benchmark.hard_gates.sarif_presented_as_canonical_truth).toBe(0);
  });

  it("fix_without_new_evidence_presented_as_verified = 0", () => {
    expect(observationVerifiesRemediationV1()).toBe(false);
    expect(benchmark.hard_gates.fix_without_new_evidence_presented_as_verified).toBe(0);
  });

  it("secret_plaintext_in_persisted_artifact = 0 and credential_persisted_in_artifact_or_receipt = 0", () => {
    expect(dataBenchmark.hard_gates).toMatchObject({ secret_plaintext_in_persisted_artifact: 0, unredacted_secret_accepted: 0 });
    expect([secretCredentialIsValidatedV1(), secretNormalizationContactsProviderV1()]).toEqual([false, false]);
  });

  it("unsupported_scope_preserves_totality_claim = 0", () => {
    expect([partialBecomesTotalV1(), unsupportedBecomesCoveredV1(), coverageLossIsCleanV1()]).toEqual([false, false, false]);
    expect(benchmark.hard_gates.unsupported_scope_preserves_totality_claim).toBe(0);
  });

  it("missing_engine_converted_to_pass = 0", () => {
    expect([notRunBecomesPassV1(), timeoutBecomesPassV1(), unknownBecomesPassV1()]).toEqual([false, false, false]);
    expect(benchmark.hard_gates.missing_engine_converted_to_pass).toBe(0);
    expect(buildSecurityCommandReportV1()).toMatchObject({ outcome: "NOT_RUN", exit_code: 1 });
  });

  it("mock_substituted_for_real_component = 0", () => {
    for (const name of ["sentrdel-security-benchmark.ts", "sentrdel-security-benchmark-data.ts"]) {
      const text = sources.find(source => source.name === name)!.text;
      expect(text, name).not.toMatch(/\bvi\.|\bmock|\bstub|\bfake/iu);
    }
  });

  it("silent_paid_provider_fallback = 0", () => {
    expect([requiresProviderForCoreV1(), requiresNetworkForCoreV1()]).toEqual([false, false]);
    for (const { name, text } of sources) {
      expect(text, name).not.toMatch(/from "node:(net|http|https|dgram|tls)"|\bfetch\(|XMLHttpRequest|WebSocket\(/u);
    }
  });

  it("existing_check_test_review_semantic_regression = 0", () => {
    expect(usageText().split("\n")).toEqual([
      "Usage:",
      "  ascout init",
      "  ascout doctor",
      "  ascout check [--allow-changed-command-surface] [--format json|agent]",
      "  ascout review [--format json|terminal]",
      "  ascout test [--profile quick|standard|deep|release] [--format json|terminal]",
      "  ascout security [--format json|terminal]",
    ]);
    for (const command of ["init", "doctor", "check", "review", "test", "security"] as const) {
      expect(parseCliArgs([command]).command).toBe(command);
    }
    for (const command of ["cyber", "assure"]) expect(() => parseCliArgs([command])).toThrow(CliUsageError);
  });

  it("weaker_substitute_preserves_stronger_claim = 0", () => {
    const byId = Object.fromEntries(benchmark.cases.map(c => [c.id, c.observed]));
    expect(byId["coverage.timeout-not-unchanged"]).toBe("COVERAGE_LOST");
    expect(byId["retest.fix-only-open"]).toBe("OPEN_FIX_UNVERIFIED");
    expect(byId["repro.linked-not-executed"]).toBe("LINKED_NOT_EXECUTED/proven=false");
  });
});
