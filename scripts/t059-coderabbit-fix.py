from pathlib import Path

model_path = Path("src/receipt/model.ts")
model = model_path.read_text()
status_block = '''        if (owningTask.status !== "FLAKY") {
          addIssue(
            issues,
            "finding_flake_status_invariant",
            `findings[${i}]`,
            "contradictory valid test observations require task status FLAKY",
          );
        }
'''
if status_block not in model:
    raise SystemExit("finding status block not found")
model = model.replace(status_block, "", 1)
model_path.write_text(model)

test_path = Path("tests/flake-reproduction.contract.test.ts")
test = test_path.read_text()
old_test = '''  it("rejects contradictory observations that remain a plain FAIL", () => {
    const receipt = receiptFor({
      status: "FAIL",
      runs: 3,
      failures: 2,
      determinismClass: "nondeterministic",
      reproduced: false,
    });

    expect(issueCodes(receipt)).toContain("finding_flake_status_invariant");
  });

'''
if old_test not in test:
    raise SystemExit("plain FAIL inverse test not found")
test = test.replace(old_test, "", 1)
anchor = '''  it("rejects contradictory observations that claim stable reproduction", () => {
'''
regression = '''  it("allows a contradictory finding under aggregate FAIL when another finding fails consistently", () => {
    const receipt = receiptFor({
      status: "FAIL",
      runs: 3,
      failures: 3,
      determinismClass: "deterministic",
      reproduced: true,
    });
    const stableFinding = receipt.findings[0]!;
    const flakyFinding: FindingV1 = {
      ...stableFinding,
      finding_id: "finding-2",
      rule_or_test_id: "src/a.test.ts > flakes",
      message: "intermittent mismatch",
      determinism_class: "nondeterministic",
      observations: { runs: 3, failures: 2 },
      reproduced: false,
    };
    (receipt.findings as FindingV1[]).push(flakyFinding);
    (receipt.summary as { finding_count: number }).finding_count = 2;

    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.tasks[0]).toMatchObject({
      status: "FAIL",
      observations: { runs: 3, failures: 3 },
    });
    expect(receipt.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        finding_id: "finding-1",
        observations: { runs: 3, failures: 3 },
        reproduced: true,
      }),
      expect.objectContaining({
        finding_id: "finding-2",
        observations: { runs: 3, failures: 2 },
        reproduced: false,
        determinism_class: "nondeterministic",
      }),
    ]));
  });

  it("rejects contradictory observations that claim stable reproduction", () => {
'''
if anchor not in test:
    raise SystemExit("regression anchor not found")
test = test.replace(anchor, regression, 1)
test_path.write_text(test)
