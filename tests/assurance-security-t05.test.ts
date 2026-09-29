import { describe, expect, it } from "vitest";

import {
  assertSentrdelCoverageInvariantsV1,
  coverageLossResolvesCleanV1,
  coverageMappingEmitsAuthorityV1,
  coverageMappingExecutesRuntimeV1,
  coverageMappingIsGlobalCleanV1,
  coverageMappingRequiresNetworkV1,
  coverageMappingUsesClockV1,
  coverageMappingUsesRandomnessV1,
  malformedOutputBecomesCleanV1,
  mapSentrdelCoverageV1,
  notRunBecomesPassV1,
  partialBecomesTotalV1,
  SENTRDEL_AGGREGATE_COVERAGE_STATES,
  SENTRDEL_COVERAGE_ABSENCE_EFFECTS,
  SENTRDEL_COVERAGE_AUTHORITIES,
  SENTRDEL_COVERAGE_CLAIM_IMPACTS,
  SENTRDEL_COVERAGE_KNOWN_LIMITATIONS,
  SENTRDEL_COVERAGE_LOSS_CANONICAL_TOKENS,
  SENTRDEL_COVERAGE_LOSS_REASON_IDS,
  SENTRDEL_COVERAGE_LOSS_REASONS,
  SENTRDEL_COVERAGE_PHASE_AUTHORITY,
  SENTRDEL_COVERAGE_RECOVERY_STATES,
  SENTRDEL_COVERAGE_SCHEMA_VERSION,
  SENTRDEL_EXECUTION_STATE_LOSS_REASON,
  SENTRDEL_NON_PRODUCING_EXECUTION_STATES,
  SENTRDEL_SCOPE_EVIDENCE_STATES,
  SENTRDEL_SCOPE_PARSER_STATES,
  SENTRDEL_SCOPE_UNIT_STATES,
  timeoutBecomesPassV1,
  unknownBecomesPassV1,
  unsupportedBecomesCoveredV1,
  validateSentrdelCoverageRequestV1,
  type SentrdelCapabilityRunInputV1,
  type SentrdelCoverageLossInputV1,
  type SentrdelCoverageReportV1,
  type SentrdelCoverageRequestV1,
  type SentrdelScopeUnitV1,
} from "../src/assurance/security/sentrdel-coverage-mapping.js";
import {
  SENTRDEL_CAPABILITY_IDS,
  SENTRDEL_UNKNOWN_TOKENS,
  type SentrdelCapabilityIdV1,
} from "../src/assurance/security/sentrdel-capability-characterization.js";
import { SENTRDEL_ENGINE_ID } from "../src/assurance/security/sentrdel-engine-boundary.js";
import {
  SENTRDEL_PINNED_REVISION,
  SENTRDEL_PINNED_TREE,
  SENTRDEL_PIN_REF,
} from "../src/assurance/security/sentrdel-source-pin.js";

const HEAD_A = "1".repeat(40);
const HEAD_B = "2".repeat(40);

function unit(
  unitRef: string,
  state: SentrdelScopeUnitV1["state"],
  parserState: SentrdelScopeUnitV1["parser_state"] = "PARSER_SUPPORTED",
  evidenceState: SentrdelScopeUnitV1["evidence_state"] = "EVIDENCE_MISSING",
): SentrdelScopeUnitV1 {
  return {
    unit_ref: unitRef,
    state,
    parser_state: parserState,
    evidence_state: evidenceState,
  };
}

function loss(
  scopeRef: string,
  reason: SentrdelCoverageLossInputV1["reason"],
  reasonDetail = "bounded reason detail for the coverage loss",
  evidenceRefs: readonly string[] = [],
): SentrdelCoverageLossInputV1 {
  return {
    scope_ref: scopeRef,
    reason,
    reason_detail: reasonDetail,
    evidence_refs: evidenceRefs,
  };
}

function run(
  overrides: Partial<SentrdelCapabilityRunInputV1> = {},
): SentrdelCapabilityRunInputV1 {
  return {
    capability_id: "sast-structural",
    execution_state: "EXECUTED",
    scope_units: [
      unit("unit:app-ts", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_PRODUCED"),
    ],
    coverage_losses: [],
    coverage_limitations: ["T05 bounded structural coverage only"],
    evidence_refs: ["observation:sentrdel:aaa"],
    ...overrides,
  } as SentrdelCapabilityRunInputV1;
}

function request(
  overrides: Partial<SentrdelCoverageRequestV1> = {},
): SentrdelCoverageRequestV1 {
  return {
    schema_version: 1,
    request_id: "request:t05-acceptance-001",
    attempt_id: "attempt:t05-001",
    source_head: HEAD_A,
    engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE,
    engine_version: "0.0.0",
    requested_capabilities: ["sast-structural"],
    runs: [run()],
    effect_facts: "E0_READ_ONLY_ANALYSIS",
    network_facts: "NO_NETWORK",
    egress_facts: "NO_EGRESS",
    ...overrides,
  } as SentrdelCoverageRequestV1;
}

function mapped(
  overrides: Partial<SentrdelCoverageRequestV1> = {},
): SentrdelCoverageReportV1 {
  const report = mapSentrdelCoverageV1(request(overrides));
  expect(report).toBeDefined();
  return report!;
}

describe("UA-P06-T05 Sentrdel coverage loss and UNKNOWN mapping", () => {
  it("versions the coverage schema and binds the phase authority", () => {
    expect(SENTRDEL_COVERAGE_SCHEMA_VERSION).toBe(1);
    expect(SENTRDEL_COVERAGE_PHASE_AUTHORITY).toBe("UA-P06-T05");
    const report = mapped();
    expect(report.schema_version).toBe(1);
    expect(report.phase_authority).toBe("UA-P06-T05");
    expect(report.authority).toBe("COVERAGE_MAPPING_ONLY");
    expect(SENTRDEL_COVERAGE_AUTHORITIES).toEqual(["COVERAGE_MAPPING_ONLY"]);
    expect(
      validateSentrdelCoverageRequestV1(request({ schema_version: 2 as never })).valid,
    ).toBe(false);
  });

  it("keeps CLEAN, SECURE, PASS, and TOTAL out of every coverage vocabulary", () => {
    // UNSCANNED_SCOPE != CLEAN and UNKNOWN != PASS: no coverage vocabulary may
    // even express a promoted state.
    for (const vocabulary of [
      SENTRDEL_SCOPE_UNIT_STATES,
      SENTRDEL_AGGREGATE_COVERAGE_STATES,
      SENTRDEL_COVERAGE_CLAIM_IMPACTS,
      SENTRDEL_COVERAGE_RECOVERY_STATES,
      SENTRDEL_COVERAGE_ABSENCE_EFFECTS,
    ]) {
      for (const value of vocabulary) {
        expect(value).not.toBe("CLEAN");
        expect(value).not.toBe("SECURE");
        expect(value).not.toBe("PASS");
        expect(value).not.toBe("TOTAL");
      }
    }
  });

  it("answers what was covered, what was not covered, and what is unknown", () => {
    const report = mapped({
      runs: [
        run({
          scope_units: [
            unit("unit:app-ts", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_PRODUCED"),
            unit("unit:app-rs", "UNSUPPORTED", "PARSER_UNSUPPORTED", "EVIDENCE_MISSING"),
            unit("unit:vendor-blob", "UNSCANNED", "NOT_APPLICABLE", "EVIDENCE_MISSING"),
            unit("unit:generated", "UNKNOWN", "NOT_APPLICABLE", "NOT_APPLICABLE"),
          ],
          coverage_losses: [
            loss("unit:app-rs", "UNSUPPORTED_LANGUAGE", "Rust is outside the pinned rule set"),
            loss("unit:vendor-blob", "UNSCANNED_PATH", "Vendored tree was never traversed"),
          ],
        }),
      ],
    });
    const record = report.capability_coverage[0]!;
    expect(record.scanned_units).toEqual(["unit:app-ts"]);
    expect(record.unsupported_units).toEqual(["unit:app-rs"]);
    expect(record.unscanned_units).toEqual(["unit:vendor-blob"]);
    expect(record.unknown_units).toEqual(["unit:generated"]);
    expect(record.parser_supported_inputs).toEqual(["unit:app-ts"]);
    expect(record.parser_unsupported_inputs).toEqual(["unit:app-rs"]);
    expect(record.evidence_producing_scope).toEqual(["unit:app-ts"]);
    expect(record.evidence_missing_scope).toEqual([
      "unit:app-rs",
      "unit:vendor-blob",
    ]);
    expect(record.coverage_state).toBe("UNKNOWN");
    expect(record.is_fully_covered).toBe(false);
  });

  it("1. keeps partial coverage partial", () => {
    const report = mapped({
      runs: [
        run({
          scope_units: [
            unit("unit:app-ts", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_PRODUCED"),
            unit("unit:app-js", "PARTIALLY_COVERED", "PARSER_SUPPORTED", "EVIDENCE_MISSING"),
          ],
          coverage_losses: [
            loss("unit:app-js", "UNSUPPORTED_FORMAT", "Only a bounded grammar subset is parsed"),
          ],
        }),
      ],
    });
    const record = report.capability_coverage[0]!;
    expect(record.coverage_state).toBe("PARTIALLY_COVERED");
    expect(record.is_fully_covered).toBe(false);
    expect(record.partially_covered_units).toEqual(["unit:app-js"]);
    expect(report.aggregate_coverage_state).toBe("PARTIALLY_COVERED");
    expect(report.partial_is_total).toBe(false);
    expect(partialBecomesTotalV1()).toBe(false);
    expect(assertSentrdelCoverageInvariantsV1(report).ok).toBe(true);
  });

  it("2. never treats unscanned scope as clean", () => {
    const report = mapped({
      runs: [
        run({
          scope_units: [
            unit("unit:app-ts", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_PRODUCED"),
            unit("unit:vendor-blob", "UNSCANNED", "NOT_APPLICABLE", "NOT_APPLICABLE"),
          ],
          coverage_losses: [
            loss("unit:vendor-blob", "UNSCANNED_PATH", "Vendored tree was never traversed"),
          ],
        }),
      ],
    });
    const record = report.capability_coverage[0]!;
    expect(record.unscanned_units).toEqual(["unit:vendor-blob"]);
    expect(record.unscanned_is_clean).toBe(false);
    expect(record.coverage_state).not.toBe("COVERED_WITHIN_STATED_SCOPE");
    expect(report.unscanned_is_clean).toBe(false);
    expect(report.aggregate_coverage_state).toBe("NOT_COVERED");
    expect(coverageMappingIsGlobalCleanV1()).toBe(false);
    expect(assertSentrdelCoverageInvariantsV1(report).ok).toBe(true);
  });

  it("3. keeps UNKNOWN alive through aggregation", () => {
    const report = mapped({
      requested_capabilities: ["config-inspection", "sast-structural"],
      runs: [
        run({
          scope_units: [
            unit("unit:app-ts", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_PRODUCED"),
            unit("unit:unknown-region", "UNKNOWN", "NOT_APPLICABLE", "NOT_APPLICABLE"),
          ],
          coverage_losses: [],
        }),
        run({
          capability_id: "config-inspection",
          scope_units: [
            unit("unit:config-toml", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_PRODUCED"),
          ],
          evidence_refs: [],
        }),
      ],
    });
    // A fully covered sibling does not erase the UNKNOWN sibling.
    const unknownRecord = report.capability_coverage.find(
      (record) => record.capability_id === "sast-structural",
    )!;
    const coveredRecord = report.capability_coverage.find(
      (record) => record.capability_id === "config-inspection",
    )!;
    expect(coveredRecord.coverage_state).toBe("COVERED_WITHIN_STATED_SCOPE");
    expect(unknownRecord.coverage_state).toBe("UNKNOWN");
    expect(report.aggregate_coverage_state).toBe("UNKNOWN");
    expect(unknownRecord.unknown_units).toEqual(["unit:unknown-region"]);
    expect(report.unknown_is_pass).toBe(false);
    expect(unknownBecomesPassV1()).toBe(false);
    expect(assertSentrdelCoverageInvariantsV1(report).ok).toBe(true);
  });

  it("4. keeps unsupported scope explicit", () => {
    const report = mapped({
      runs: [
        run({
          scope_units: [
            unit("unit:app-ts", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_PRODUCED"),
            unit("unit:app-go", "UNSUPPORTED", "PARSER_UNSUPPORTED", "NOT_APPLICABLE"),
          ],
          coverage_losses: [
            loss("unit:app-go", "UNSUPPORTED_LANGUAGE", "Go is outside the pinned rule set"),
          ],
        }),
      ],
    });
    const record = report.capability_coverage[0]!;
    expect(record.unsupported_units).toEqual(["unit:app-go"]);
    expect(record.parser_unsupported_inputs).toEqual(["unit:app-go"]);
    expect(record.unsupported_scope.length).toBeGreaterThan(0);
    const derived = record.coverage_losses.find(
      (candidate) => candidate.scope_ref === "unit:app-go",
    )!;
    expect(derived.reason).toBe("UNSUPPORTED_LANGUAGE");
    expect(derived.canonical_unknown_token).toBe("PARSER_UNSUPPORTED");
    expect(derived.canonical_token_declared_by_capability).toBe(true);
    expect(unsupportedBecomesCoveredV1()).toBe(false);
    expect(coverageLossResolvesCleanV1()).toBe(false);
  });

  it("5. never lets NOT_RUN become a pass", () => {
    const report = mapped({
      runs: [
        run({
          execution_state: "NOT_RUN",
          scope_units: [
            unit("unit:app-ts", "UNSCANNED", "NOT_APPLICABLE", "NOT_APPLICABLE"),
          ],
          coverage_losses: [
            loss("capability", "ENGINE_UNAVAILABLE", "The pinned engine was never executed"),
          ],
          evidence_refs: [],
        }),
      ],
    });
    const record = report.capability_coverage[0]!;
    expect(record.executed).toBe(false);
    expect(record.execution_state).toBe("NOT_RUN");
    expect(record.is_fully_covered).toBe(false);
    expect(record.omitted_is_pass).toBe(false);
    expect(report.not_executed_capabilities).toEqual(["sast-structural"]);
    expect(report.execution_incomplete).toBe(true);
    expect(report.unavailable_engine_effect).toBe("COVERAGE_OMITTED_EXPLICIT");
    expect(report.omitted_class_is_pass).toBe(false);
    expect(notRunBecomesPassV1()).toBe(false);
    expect(report.coverage_losses).toHaveLength(1);
    expect(report.coverage_losses[0]!.reason).toBe("ENGINE_UNAVAILABLE");
    expect(assertSentrdelCoverageInvariantsV1(report).ok).toBe(true);
  });

  it("6. never lets a timeout become a pass", () => {
    const report = mapped({
      runs: [
        run({
          execution_state: "TIMEOUT",
          scope_units: [
            unit("unit:app-ts", "UNSCANNED", "NOT_APPLICABLE", "NOT_APPLICABLE"),
          ],
          coverage_losses: [
            loss("capability", "TIMEOUT", "The bounded run exceeded its time budget"),
          ],
          evidence_refs: [],
        }),
      ],
    });
    const record = report.capability_coverage[0]!;
    expect(record.execution_state).toBe("TIMEOUT");
    expect(record.is_fully_covered).toBe(false);
    expect(record.coverage_state).toBe("NOT_COVERED");
    expect(record.evidence_producing_scope).toEqual([]);
    expect(report.execution_incomplete).toBe(true);
    const derived = report.coverage_losses[0]!;
    expect(derived.reason).toBe("TIMEOUT");
    expect(derived.canonical_unknown_token).toBe("TIMEOUT");
    expect(derived.claim_impact).toBe("SCOPE_CLAIM_UNAVAILABLE");
    expect(derived.recovery).toBe("RETEST_POSSIBLE");
    expect(timeoutBecomesPassV1()).toBe(false);
    expect(assertSentrdelCoverageInvariantsV1(report).ok).toBe(true);
  });

  it("7. never lets malformed output become clean", () => {
    const report = mapped({
      runs: [
        run({
          execution_state: "MALFORMED_OUTPUT",
          scope_units: [
            unit("unit:app-ts", "UNKNOWN", "NOT_APPLICABLE", "NOT_APPLICABLE"),
          ],
          coverage_losses: [
            loss("capability", "MALFORMED_OUTPUT", "Engine output failed strict decoding"),
          ],
          evidence_refs: [],
        }),
      ],
    });
    const record = report.capability_coverage[0]!;
    expect(record.coverage_state).toBe("UNKNOWN");
    expect(record.evidence_producing_scope).toEqual([]);
    expect(record.is_fully_covered).toBe(false);
    expect(report.aggregate_coverage_state).toBe("UNKNOWN");
    const derived = report.coverage_losses[0]!;
    expect(derived.reason).toBe("MALFORMED_OUTPUT");
    expect(derived.canonical_unknown_token).toBe("MALFORMED_OUTPUT");
    expect(derived.recovery).toBe("RETEST_REQUIRES_ENGINE");
    expect(malformedOutputBecomesCleanV1()).toBe(false);
    expect(assertSentrdelCoverageInvariantsV1(report).ok).toBe(true);
  });

  it("8. produces coverage loss when the engine is unavailable", () => {
    const report = mapped({
      runs: [
        run({
          execution_state: "UNAVAILABLE",
          scope_units: [
            unit("unit:app-ts", "UNSCANNED", "NOT_APPLICABLE", "NOT_APPLICABLE"),
          ],
          coverage_losses: [
            loss("capability", "ENGINE_UNAVAILABLE", "The pinned engine is not installed"),
          ],
          evidence_refs: [],
        }),
      ],
    });
    expect(report.unavailable_engine_effect).toBe("COVERAGE_OMITTED_EXPLICIT");
    const derived = report.coverage_losses[0]!;
    expect(derived.reason).toBe("ENGINE_UNAVAILABLE");
    expect(derived.canonical_unknown_token).toBe("ANALYZER_UNAVAILABLE");
    expect(derived.claim_impact).toBe("TOTALITY_CLAIM_UNAVAILABLE");
    expect(derived.recovery).toBe("RETEST_REQUIRES_ENGINE");
    expect(report.capability_coverage[0]!.coverage_state).toBe("NOT_COVERED");
  });

  it("9. produces coverage loss on a version mismatch", () => {
    const report = mapped({
      runs: [
        run({
          execution_state: "VERSION_MISMATCH",
          scope_units: [
            unit("unit:app-ts", "UNSCANNED", "NOT_APPLICABLE", "NOT_APPLICABLE"),
          ],
          coverage_losses: [
            loss("capability", "VERSION_MISMATCH", "Engine revision differs from the pin"),
          ],
          evidence_refs: [],
        }),
      ],
    });
    expect(report.version_mismatch_effect).toBe("COVERAGE_REDUCED_TO_UNKNOWN");
    const derived = report.coverage_losses[0]!;
    expect(derived.reason).toBe("VERSION_MISMATCH");
    expect(derived.canonical_unknown_token).toBe("VERSION_MISMATCH");
    expect(derived.claim_impact).toBe("TOTALITY_CLAIM_UNAVAILABLE");
    expect(derived.recovery).toBe("RETEST_REQUIRES_ENGINE");
    // The report still binds the canonical pin, never the mismatched one.
    expect(report.engine_pin).toBe(SENTRDEL_PINNED_REVISION);
  });

  it("10. produces coverage loss on a policy denial", () => {
    const report = mapped({
      runs: [
        run({
          execution_state: "DENIED_BY_POLICY",
          scope_units: [
            unit("unit:app-ts", "UNSCANNED", "NOT_APPLICABLE", "NOT_APPLICABLE"),
          ],
          coverage_losses: [
            loss("capability", "POLICY_DENIED", "Policy denied the requested effect"),
          ],
          evidence_refs: [],
        }),
      ],
    });
    expect(report.denied_policy_effect).toBe("COVERAGE_OMITTED_EXPLICIT");
    const derived = report.coverage_losses[0]!;
    expect(derived.reason).toBe("POLICY_DENIED");
    expect(derived.canonical_unknown_token).toBe("PERMISSION_DENIED");
    expect(derived.claim_impact).toBe("TOTALITY_CLAIM_UNAVAILABLE");
    expect(derived.recovery).toBe("RETEST_REQUIRES_POLICY_AUTHORIZATION");
    expect(report.effect_facts).toBe("E0_READ_ONLY_ANALYSIS");
  });

  it("11. rejects duplicate coverage-loss entries", () => {
    const duplicated = run({
      scope_units: [
        unit("unit:app-rs", "UNSUPPORTED", "PARSER_UNSUPPORTED", "NOT_APPLICABLE"),
      ],
      coverage_losses: [
        loss("unit:app-rs", "UNSUPPORTED_LANGUAGE", "first declared cause"),
        loss("unit:app-rs", "UNSUPPORTED_LANGUAGE", "second declared cause"),
      ],
    });
    const validation = validateSentrdelCoverageRequestV1(
      request({ runs: [duplicated] }),
    );
    expect(validation.valid).toBe(false);
    expect(validation.reasons.join(" ")).toContain("duplicate coverage loss identity");
    expect(mapSentrdelCoverageV1(request({ runs: [duplicated] }))).toBeUndefined();
  });

  it("12. rejects contradictory scope states", () => {
    const contradictions: ReadonlyArray<[string, SentrdelScopeUnitV1]> = [
      [
        "covered and parser-unsupported",
        unit("unit:app-ts", "COVERED", "PARSER_UNSUPPORTED", "EVIDENCE_PRODUCED"),
      ],
      [
        "covered and evidence-missing",
        unit("unit:app-ts", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_MISSING"),
      ],
      [
        "unsupported and parser-supported",
        unit("unit:app-go", "UNSUPPORTED", "PARSER_SUPPORTED", "NOT_APPLICABLE"),
      ],
      [
        "unknown and already producing evidence",
        unit("unit:app-py", "UNKNOWN", "NOT_APPLICABLE", "EVIDENCE_PRODUCED"),
      ],
      [
        "unscanned and already producing evidence",
        unit("unit:blob", "UNSCANNED", "NOT_APPLICABLE", "EVIDENCE_PRODUCED"),
      ],
    ];
    for (const [label, contradictory] of contradictions) {
      const validation = validateSentrdelCoverageRequestV1(
        request({ runs: [run({ scope_units: [contradictory] })] }),
      );
      expect(validation.valid, label).toBe(false);
      expect(mapSentrdelCoverageV1(request({ runs: [run({ scope_units: [contradictory] })] }))).toBe(
        undefined,
      );
    }
  });

  it("12b. rejects a non-producing state that claims covered scope or evidence", () => {
    const claimsCovered = run({
      execution_state: "TIMEOUT",
      scope_units: [
        unit("unit:app-ts", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_PRODUCED"),
      ],
      coverage_losses: [loss("capability", "TIMEOUT", "bounded timeout detail")],
    });
    const validation = validateSentrdelCoverageRequestV1(
      request({ runs: [claimsCovered] }),
    );
    expect(validation.valid).toBe(false);
    expect(validation.reasons.join(" ")).toContain("may not report covered scope");
    expect(mapSentrdelCoverageV1(request({ runs: [claimsCovered] }))).toBeUndefined();
  });

  it("12c. rejects a non-producing state that omits its required reason", () => {
    const missingReason = run({
      execution_state: "ENGINE_ERROR",
      scope_units: [
        unit("unit:app-ts", "UNSCANNED", "NOT_APPLICABLE", "NOT_APPLICABLE"),
      ],
      coverage_losses: [],
    });
    const validation = validateSentrdelCoverageRequestV1(
      request({ runs: [missingReason] }),
    );
    expect(validation.valid).toBe(false);
    expect(validation.reasons.join(" ")).toContain(
      "must declare coverage loss PARSER_FAILURE",
    );
  });

  it("12d. rejects a non-covered scope unit with no reason", () => {
    const unexplained = run({
      scope_units: [
        unit("unit:vendor-blob", "UNSCANNED", "NOT_APPLICABLE", "NOT_APPLICABLE"),
      ],
      coverage_losses: [],
    });
    const validation = validateSentrdelCoverageRequestV1(
      request({ runs: [unexplained] }),
    );
    expect(validation.valid).toBe(false);
    expect(validation.reasons.join(" ")).toContain("without a coverage loss reason");
  });

  it("12e. rejects a loss that names a scope which does not exist", () => {
    const dangling = run({
      coverage_losses: [
        loss("unit:never-scanned", "UNSUPPORTED_FORMAT", "bounded format gap"),
      ],
    });
    const validation = validateSentrdelCoverageRequestV1(request({ runs: [dangling] }));
    expect(validation.valid).toBe(false);
    expect(validation.reasons.join(" ")).toContain("names an unknown scope reference");
  });

  it("13. orders every collection deterministically", () => {
    const forward = mapped({
      requested_capabilities: ["config-inspection", "sast-structural"],
      runs: [
        run({
          scope_units: [
            unit("unit:app-ts", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_PRODUCED"),
            unit("unit:app-js", "PARTIALLY_COVERED", "PARSER_SUPPORTED", "EVIDENCE_MISSING"),
          ],
          coverage_losses: [
            loss("unit:app-js", "UNSUPPORTED_FORMAT", "bounded format gap"),
            loss("unit:app-ts", "MISSING_PROVENANCE", "bounded provenance gap"),
          ],
        }),
        run({
          capability_id: "config-inspection",
          scope_units: [
            unit("unit:config-toml", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_PRODUCED"),
          ],
          evidence_refs: ["observation:sentrdel:aaa", "observation:sentrdel:bbb"],
        }),
      ],
    });
    const reversed = mapped({
      requested_capabilities: ["sast-structural", "config-inspection"],
      runs: [
        run({
          capability_id: "config-inspection",
          scope_units: [
            unit("unit:config-toml", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_PRODUCED"),
          ],
          evidence_refs: ["observation:sentrdel:bbb", "observation:sentrdel:aaa"],
        }),
        run({
          scope_units: [
            unit("unit:app-js", "PARTIALLY_COVERED", "PARSER_SUPPORTED", "EVIDENCE_MISSING"),
            unit("unit:app-ts", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_PRODUCED"),
          ],
          coverage_losses: [
            loss("unit:app-ts", "MISSING_PROVENANCE", "bounded provenance gap"),
            loss("unit:app-js", "UNSUPPORTED_FORMAT", "bounded format gap"),
          ],
        }),
      ],
    });

    const isSorted = (values: readonly string[]): boolean =>
      values.every((value, index) => index === 0 || values[index - 1]! <= value);

    expect(isSorted(forward.requested_capabilities)).toBe(true);
    expect(
      isSorted(forward.capability_coverage.map((record) => record.capability_id)),
    ).toBe(true);
    expect(
      isSorted(forward.coverage_losses.map((candidate) => candidate.loss_id)),
    ).toBe(true);
    expect(
      isSorted(forward.coverage_losses.map((candidate) => candidate.scope_ref)),
    ).toBe(true);
    expect(isSorted(forward.unknown_reasons)).toBe(true);
    expect(isSorted(forward.coverage_limitations)).toBe(true);
    expect(isSorted(forward.observation_refs)).toBe(true);
    // Input order is irrelevant to output order.
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(forward));
  });

  it("14. produces identical output for identical input", () => {
    const first = mapped();
    const second = mapped();
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    // The report is deeply frozen: nothing downstream can mutate the truth.
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.capability_coverage)).toBe(true);
    expect(Object.isFrozen(first.coverage_losses)).toBe(true);
    expect(Object.isFrozen(first.capability_coverage[0])).toBe(true);
  });

  it("15. makes every global-clean field structurally unable to become true", () => {
    const report = mapped();
    expect(report.global_clean_claimed).toBe(false);
    expect(report.totality_claim_available).toBe(false);
    expect(report.unscanned_is_clean).toBe(false);
    expect(report.unknown_is_pass).toBe(false);
    expect(report.partial_is_total).toBe(false);
    expect(report.omitted_class_is_pass).toBe(false);
    expect(report.aggregate_is_conservative).toBe(true);
    expect(coverageMappingIsGlobalCleanV1()).toBe(false);
    expect(coverageLossResolvesCleanV1()).toBe(false);
    expect(unknownBecomesPassV1()).toBe(false);

    // A consumer that forces a global clean is caught by the invariant gate.
    const tampered = {
      ...report,
      global_clean_claimed: true,
      totality_claim_available: true,
    } as unknown as SentrdelCoverageReportV1;
    const check = assertSentrdelCoverageInvariantsV1(tampered);
    expect(check.ok).toBe(false);
    expect(check.reasons.join(" ")).toContain("global clean");
    expect(check.reasons.join(" ")).toContain("totality must never be claimable");
  });

  it("15b. rejects a covered aggregate that hides an unexecuted capability", () => {
    const tampered = {
      ...mapped(),
      aggregate_coverage_state: "COVERED_WITHIN_STATED_SCOPE",
      not_executed_capabilities: ["sast-structural"],
    } as unknown as SentrdelCoverageReportV1;
    const check = assertSentrdelCoverageInvariantsV1(tampered);
    expect(check.ok).toBe(false);
    expect(check.reasons.join(" ")).toContain("must block a covered aggregate");
  });

  it("15c. rejects an aggregate that drops a capability-level unknown reason", () => {
    const base = mapped({
      runs: [
        run({
          execution_state: "TIMEOUT",
          scope_units: [
            unit("unit:app-ts", "UNSCANNED", "NOT_APPLICABLE", "NOT_APPLICABLE"),
          ],
          coverage_losses: [loss("capability", "TIMEOUT", "bounded timeout detail")],
          evidence_refs: [],
        }),
      ],
    });
    expect(base.unknown_reasons).toContain("TIMEOUT");
    const tampered = {
      ...base,
      unknown_reasons: [],
    } as unknown as SentrdelCoverageReportV1;
    const check = assertSentrdelCoverageInvariantsV1(tampered);
    expect(check.ok).toBe(false);
    expect(check.reasons.join(" ")).toContain("disappeared during aggregation");
  });

  it("16. emits no Finding", () => {
    const report = mapped();
    expect(report.finding_emitted).toBe(false);
    expect(report.security_observation_is_finding).toBe(false);
    const asRecord = report as unknown as Record<string, unknown>;
    expect(asRecord["finding"]).toBeUndefined();
    for (const capability of report.capability_coverage) {
      const record = capability as unknown as Record<string, unknown>;
      expect(record["finding"]).toBeUndefined();
      expect(record["verdict"]).toBeUndefined();
    }
    for (const candidate of report.coverage_losses) {
      const record = candidate as unknown as Record<string, unknown>;
      expect(record["finding"]).toBeUndefined();
      expect(record["severity"]).toBeUndefined();
    }
    expect(coverageMappingEmitsAuthorityV1()).toBe(false);
  });

  it("17. emits no ClaimAssessment", () => {
    const report = mapped();
    expect(report.claim_assessment_emitted).toBe(false);
    expect(report.assurance_effect).toBe("NONE");
    expect(report.security_pass_is_supported_claim).toBe(false);
    const asRecord = report as unknown as Record<string, unknown>;
    for (const forbidden of [
      "claim_assessment",
      "assurance",
      "claim",
      "verdict",
      "supported_claim",
    ]) {
      expect(asRecord[forbidden]).toBeUndefined();
    }
  });

  it("18. has no runtime, network, clock, or randomness dependency", () => {
    expect(coverageMappingExecutesRuntimeV1()).toBe(false);
    expect(coverageMappingRequiresNetworkV1()).toBe(false);
    expect(coverageMappingUsesClockV1()).toBe(false);
    expect(coverageMappingUsesRandomnessV1()).toBe(false);
    expect(mapped().effect_facts).toBe("E0_READ_ONLY_ANALYSIS");
    expect(mapped().network_facts).toBe("NO_NETWORK");
    expect(mapped().egress_facts).toBe("NO_EGRESS");
    // A validation failure must not consult the network or a clock either.
    expect(mapSentrdelCoverageV1({ schema_version: 1 })).toBeUndefined();
  });

  it("19. keeps the exact source and pin binding", () => {
    const report = mapped();
    expect(report.engine_id).toBe(SENTRDEL_ENGINE_ID);
    expect(report.engine_id).toBe("engine:sentrdel");
    expect(report.engine_pin).toBe(SENTRDEL_PINNED_REVISION);
    expect(report.engine_pin).toBe("f5747319a50831ef7cee983d253c0ca5503c9a64");
    expect(report.engine_tree).toBe(SENTRDEL_PINNED_TREE);
    expect(report.engine_pin_ref).toBe(SENTRDEL_PIN_REF);
    expect(report.source_head).toBe(HEAD_A);
    expect(assertSentrdelCoverageInvariantsV1(report).ok).toBe(true);

    const wrongBindings: ReadonlyArray<[string, Partial<SentrdelCoverageRequestV1>]> = [
      ["engine id", { engine_id: "engine:other" }],
      ["engine pin", { engine_pin: "0".repeat(40) }],
      ["engine tree", { engine_tree: "0".repeat(40) }],
      ["engine version", { engine_version: "9.9.9" }],
      ["source head", { source_head: "not-a-sha" }],
    ];
    for (const [label, overrides] of wrongBindings) {
      const validation = validateSentrdelCoverageRequestV1(request(overrides));
      expect(validation.valid, label).toBe(false);
    }
  });

  it("19b. rejects an unknown capability identity", () => {
    const unknownCapability = validateSentrdelCoverageRequestV1(
      request({
        requested_capabilities: ["sast-structural", "capability:not-a-thing"],
        runs: [run(), run({ capability_id: "capability:not-a-thing" })],
      }),
    );
    expect(unknownCapability.valid).toBe(false);
    expect(unknownCapability.reasons.join(" ")).toContain(
      "unknown capability identity rejected",
    );
  });

  it("20. preserves observation references through the mapping", () => {
    const report = mapped({
      runs: [
        run({
          evidence_refs: ["observation:sentrdel:zzz", "observation:sentrdel:aaa"],
          scope_units: [
            unit("unit:app-ts", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_PRODUCED"),
            unit("unit:app-rs", "UNSUPPORTED", "PARSER_UNSUPPORTED", "NOT_APPLICABLE"),
          ],
          coverage_losses: [
            loss("unit:app-rs", "UNSUPPORTED_LANGUAGE", "bounded language gap", [
              "observation:sentrdel:mmm",
            ]),
          ],
        }),
      ],
    });
    expect(report.capability_coverage[0]!.evidence_refs).toEqual([
      "observation:sentrdel:aaa",
      "observation:sentrdel:zzz",
    ]);
    expect(report.observation_refs).toEqual([
      "observation:sentrdel:aaa",
      "observation:sentrdel:zzz",
    ]);
    expect(report.coverage_losses[0]!.evidence_refs).toEqual([
      "observation:sentrdel:mmm",
    ]);
  });

  it("20b. rejects a self-attesting or secret-bearing coverage record", () => {
    const attesting = validateSentrdelCoverageRequestV1(
      request({
        runs: [
          run({ coverage_limitations: ["Repository is SECURE after this run"] }),
        ],
      }),
    );
    expect(attesting.valid).toBe(false);
    expect(attesting.reasons.join(" ")).toContain("must never self-attest");

    const secretBearing = validateSentrdelCoverageRequestV1(
      request({
        runs: [
          run({
            scope_units: [
              unit("unit:app-rs", "UNSUPPORTED", "PARSER_UNSUPPORTED", "NOT_APPLICABLE"),
            ],
            coverage_losses: [
              loss(
                "unit:app-rs",
                "UNSUPPORTED_LANGUAGE",
                "token AKIAIOSFODNN7EXAMPLE appeared while scanning",
              ),
            ],
          }),
        ],
      }),
    );
    expect(secretBearing.valid).toBe(false);
    expect(secretBearing.reasons.join(" ")).toContain("must not carry secret material");
  });

  it("20c. rejects an input that smuggles authority or an impossible claim", () => {
    for (const forbidden of [
      "finding",
      "claim_assessment",
      "assurance",
      "verdict",
      "global_clean",
      "totality_claim",
    ]) {
      const smuggled = { ...request(), [forbidden]: "PASS" } as unknown;
      const validation = validateSentrdelCoverageRequestV1(smuggled);
      expect(validation.valid, forbidden).toBe(false);
      expect(validation.reasons.join(" ")).toContain(
        `must never carry ${forbidden}`,
      );
    }
  });

  it("binds every coverage-loss reason to the canonical T02 UNKNOWN vocabulary", () => {
    expect(SENTRDEL_COVERAGE_LOSS_REASON_IDS).toEqual(
      [...SENTRDEL_COVERAGE_LOSS_REASONS].sort(),
    );
    // No forked vocabulary: every reason has an entry, and every bound token is
    // a real T02 UNKNOWN token.
    for (const reason of SENTRDEL_COVERAGE_LOSS_REASON_IDS) {
      const canonical = SENTRDEL_COVERAGE_LOSS_CANONICAL_TOKENS[reason];
      expect(reason in SENTRDEL_COVERAGE_LOSS_CANONICAL_TOKENS).toBe(true);
      if (canonical !== null) {
        expect(SENTRDEL_UNKNOWN_TOKENS).toContain(canonical);
      }
    }
    // The T05-native reasons are exactly the ones with no T02 equivalent.
    const nativeReasons = SENTRDEL_COVERAGE_LOSS_REASON_IDS.filter(
      (reason) => SENTRDEL_COVERAGE_LOSS_CANONICAL_TOKENS[reason] === null,
    );
    expect(nativeReasons).toEqual([
      "ENGINE_NOT_QUALIFIED",
      "MISSING_PROVENANCE",
      "PARSER_FAILURE",
      "UNSCANNED_PATH",
    ]);
  });

  it("requires a non-producing execution state to derive its own loss reason", () => {
    for (const state of SENTRDEL_NON_PRODUCING_EXECUTION_STATES) {
      const reason = SENTRDEL_EXECUTION_STATE_LOSS_REASON[state];
      expect(reason, state).toBeDefined();
      expect(SENTRDEL_COVERAGE_LOSS_REASONS).toContain(reason!);
    }
    // Producing states carry no mandatory loss.
    expect(SENTRDEL_EXECUTION_STATE_LOSS_REASON["EXECUTED"]).toBeUndefined();
    expect(SENTRDEL_EXECUTION_STATE_LOSS_REASON["AVAILABLE"]).toBeUndefined();
  });

  it("covers every T02 capability identity without redefinition", () => {
    for (const capabilityId of SENTRDEL_CAPABILITY_IDS as readonly SentrdelCapabilityIdV1[]) {
      const report = mapSentrdelCoverageV1(
        request({
          requested_capabilities: [capabilityId],
          runs: [
            run({
              capability_id: capabilityId,
              scope_units: [
                unit("unit:app-ts", "COVERED", "PARSER_SUPPORTED", "EVIDENCE_PRODUCED"),
              ],
              evidence_refs: [],
            }),
          ],
        }),
      );
      expect(report, capabilityId).toBeDefined();
      expect(report!.capability_coverage[0]!.capability_id).toBe(capabilityId);
      expect(assertSentrdelCoverageInvariantsV1(report!).ok, capabilityId).toBe(true);
    }
  });

  it("records the frozen limitations and the no-global-clean rule", () => {
    expect(SENTRDEL_COVERAGE_KNOWN_LIMITATIONS.length).toBeGreaterThanOrEqual(10);
    for (const limitation of SENTRDEL_COVERAGE_KNOWN_LIMITATIONS) {
      expect(limitation.length).toBeGreaterThan(0);
    }
    expect(
      SENTRDEL_COVERAGE_KNOWN_LIMITATIONS.some((entry) =>
        entry.includes("never answers whether a repository is secure"),
      ),
    ).toBe(true);
    expect(
      SENTRDEL_COVERAGE_KNOWN_LIMITATIONS.some((entry) =>
        entry.includes("UNSCANNED_SCOPE != CLEAN"),
      ),
    ).toBe(true);
  });

  it("exposes the frozen scope, parser, evidence, and aggregate vocabularies", () => {
    expect(SENTRDEL_SCOPE_UNIT_STATES).toEqual([
      "COVERED",
      "PARTIALLY_COVERED",
      "UNSUPPORTED",
      "UNSCANNED",
      "UNKNOWN",
    ]);
    expect(SENTRDEL_SCOPE_PARSER_STATES).toEqual([
      "PARSER_SUPPORTED",
      "PARSER_UNSUPPORTED",
      "NOT_APPLICABLE",
    ]);
    expect(SENTRDEL_SCOPE_EVIDENCE_STATES).toEqual([
      "EVIDENCE_PRODUCED",
      "EVIDENCE_MISSING",
      "NOT_APPLICABLE",
    ]);
    expect(SENTRDEL_AGGREGATE_COVERAGE_STATES).toEqual([
      "UNKNOWN",
      "NOT_COVERED",
      "PARTIALLY_COVERED",
      "COVERED_WITHIN_STATED_SCOPE",
    ]);
  });

  it("keeps a second source head binding exact", () => {
    const other = mapped({
      source_head: HEAD_B,
      request_id: "request:t05-acceptance-002",
      runs: [run({ evidence_refs: ["observation:sentrdel:bbb"] })],
    });
    expect(other.source_head).toBe(HEAD_B);
    expect(other.engine_pin).toBe(SENTRDEL_PINNED_REVISION);
    expect(other.observation_refs).toEqual(["observation:sentrdel:bbb"]);
  });
});
