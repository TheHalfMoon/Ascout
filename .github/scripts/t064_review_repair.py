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
    '''    evidence.push(machine.evidence);
    artifacts.push(machine.artifact);
    const matches = parseTestAssertionObservations(
      repositoryRoot,
      machine.text,
      machine.evidence.evidence_id,
    ).filter((observation) =>
''',
    '''    evidence.push(machine.evidence);
    artifacts.push(machine.artifact);
    const machineResultValid = runner === "jest"
      ? validJestMachineResult(machine.text)
      : validVitestMachineResult(machine.text);
    if (!machineResultValid) {
      return { observation: null, evidence, artifacts, finishedAt, outputTruncated: executed.task.output_truncated };
    }
    const matches = parseTestAssertionObservations(
      repositoryRoot,
      machine.text,
      machine.evidence.evidence_id,
    ).filter((observation) =>
''',
    "targeted runner machine validation",
)
check_path.write_text(check)


test_path = Path("tests/flake-run-check.integration.test.ts")
test = test_path.read_text()
test = replace_once(
    test,
    'type Scenario = "flaky" | "stable" | "rerun-error";\n',
    'type Scenario = "flaky" | "stable" | "rerun-error" | "malformed-rerun";\n',
    "scenario union",
)
test = replace_once(
    test,
    '''const result = {
  success: !failed,
  numTotalTests: 1,
''',
    '''const result = {
  ...(scenario === "malformed-rerun" && isTargeted && ordinal === 2 ? {} : { success: !failed }),
  numTotalTests: 1,
''',
    "malformed targeted result",
)
test = replace_once(
    test,
    '''  writeFileSync(executable, runnerShim());
  chmodSync(executable, 0o755);

  writeFileSync(join(root, ".gitignore"), ".ascout/\\nnode_modules/\\n");
''',
    '''  writeFileSync(executable, runnerShim());
  chmodSync(executable, 0o755);
  writeFileSync(
    join(binRoot, `${runner}.cmd`),
    `@ECHO off\\r\\nnode "%~dp0${runner}" %*\\r\\n`,
  );

  writeFileSync(join(root, ".gitignore"), ".ascout/\\nnode_modules/\\n");
''',
    "Windows command launcher",
)
insert = '''

  it("jest: keeps reproduction unknown when a targeted machine result violates the Jest contract", async () => {
    const receipt = await checkFixture("jest", "malformed-rerun");
    expect(receipt.tasks.find((task) => task.task_type === "test")).toMatchObject({
      status: "FAIL",
      observations: { runs: 1, failures: 1 },
    });
    expect(receipt.findings[0]).toMatchObject({
      determinism_class: "unknown",
      observations: { runs: 1, failures: 1 },
      reproduced: "unknown",
    });
    expect(receipt.artifacts.some((artifact) => artifact.relative_run_path.includes("rerun-1"))).toBe(true);
    expect(receipt.artifacts.some((artifact) => artifact.relative_run_path.includes("rerun-2"))).toBe(false);
  }, 30_000);
'''
test = replace_once(
    test,
    "\n});\n",
    insert + "\n});\n",
    "malformed Jest regression insertion",
)
test_path.write_text(test)
