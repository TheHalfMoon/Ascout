from pathlib import Path

model_path = Path("src/receipt/model.ts")
model = model_path.read_text()
anchor = '''    validateObservations(finding.observations, issues, `findings[${i}].observations`);
    if (finding.fingerprint != null && !SHA256.test(finding.fingerprint)) {
'''
replacement = '''    validateObservations(finding.observations, issues, `findings[${i}].observations`);
    const owningTask = tasks.get(finding.task_id);
    const validObservationCounts =
      isNonNegativeInteger(finding.observations.runs) &&
      isNonNegativeInteger(finding.observations.failures) &&
      finding.observations.failures <= finding.observations.runs;
    if (owningTask?.task_type === "test" && validObservationCounts) {
      const { runs, failures } = finding.observations;
      if (runs === 1 && failures === 1 && finding.reproduced !== "unknown") {
        addIssue(
          issues,
          "finding_reproduction_invariant",
          `findings[${i}].reproduced`,
          "one valid failing test observation requires reproduced=unknown",
        );
      }
      if (runs >= 2 && failures === runs && finding.reproduced !== true) {
        addIssue(
          issues,
          "finding_reproduction_invariant",
          `findings[${i}].reproduced`,
          "repeated consistent test failures require reproduced=true",
        );
      }
      if (runs >= 2 && failures > 0 && failures < runs) {
        if (owningTask.status !== "FLAKY") {
          addIssue(
            issues,
            "finding_flake_status_invariant",
            `findings[${i}]`,
            "contradictory valid test observations require task status FLAKY",
          );
        }
        if (finding.reproduced !== false) {
          addIssue(
            issues,
            "finding_reproduction_invariant",
            `findings[${i}].reproduced`,
            "contradictory valid test observations require stable-failure reproduction false",
          );
        }
        if (finding.determinism_class !== "nondeterministic") {
          addIssue(
            issues,
            "finding_determinism_invariant",
            `findings[${i}].determinism_class`,
            "contradictory valid test observations require nondeterministic classification",
          );
        }
      }
    }
    if (finding.fingerprint != null && !SHA256.test(finding.fingerprint)) {
'''
if anchor not in model:
    raise SystemExit("model anchor not found")
model = model.replace(anchor, replacement, 1)
model_path.write_text(model)

test_path = Path("tests/flake-reproduction.contract.test.ts")
test = test_path.read_text()
anchor = '''  it("keeps reproduction unknown when a rerun errors before a valid second observation", () => {
'''
new_tests = '''  it("rejects non-unknown reproduction after only one valid failing observation", () => {
    for (const reproduced of [true, false, "not_applicable"] as const) {
      const receipt = receiptFor({
        status: "FAIL",
        runs: 1,
        failures: 1,
        determinismClass: "unknown",
        reproduced,
      });

      expect(issueCodes(receipt), String(reproduced)).toContain("finding_reproduction_invariant");
    }
  });

  it("rejects non-true reproduction for repeated consistent test failures", () => {
    for (const reproduced of [false, "unknown", "not_applicable"] as const) {
      const receipt = receiptFor({
        status: "FAIL",
        runs: 3,
        failures: 3,
        determinismClass: "deterministic",
        reproduced,
      });

      expect(issueCodes(receipt), String(reproduced)).toContain("finding_reproduction_invariant");
    }
  });

  it("rejects contradictory observations that remain a plain FAIL", () => {
    const receipt = receiptFor({
      status: "FAIL",
      runs: 3,
      failures: 2,
      determinismClass: "nondeterministic",
      reproduced: false,
    });

    expect(issueCodes(receipt)).toContain("finding_flake_status_invariant");
  });

  it("rejects contradictory observations that claim stable reproduction", () => {
    for (const reproduced of [true, "unknown", "not_applicable"] as const) {
      const receipt = receiptFor({
        status: "FLAKY",
        runs: 3,
        failures: 2,
        determinismClass: "nondeterministic",
        reproduced,
      });

      expect(issueCodes(receipt), String(reproduced)).toContain("finding_reproduction_invariant");
    }
  });

  it("rejects contradictory observations without nondeterministic classification", () => {
    for (const determinismClass of ["deterministic", "unknown"] as const) {
      const receipt = receiptFor({
        status: "FLAKY",
        runs: 3,
        failures: 2,
        determinismClass,
        reproduced: false,
      });

      expect(issueCodes(receipt), determinismClass).toContain("finding_determinism_invariant");
    }
  });

  it("keeps reproduction unknown when a rerun errors before a valid second observation", () => {
'''
if anchor not in test:
    raise SystemExit("test anchor not found")
test = test.replace(anchor, new_tests, 1)
test_path.write_text(test)
