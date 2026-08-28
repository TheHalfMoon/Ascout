from pathlib import Path

p = Path("benchmarks/run.mjs")
s = p.read_text()

old_import = 'import { dirname, join, resolve } from "node:path";'
new_import = 'import { dirname, isAbsolute, join, relative, resolve } from "node:path";'
if old_import not in s:
    raise SystemExit("path import anchor missing")
s = s.replace(old_import, new_import, 1)

start = s.index("function proofVariant(commandText, kind) {")
end = s.index("function rejectSetupFailure(output, label) {")
replacement = r'''function proofVariant(commandText, kind, outputFile) {
  const parsed = parseRestrictedCommand(commandText);
  const argv = [...parsed.argv];
  const isPackageScript = ["npm", "pnpm", "yarn"].includes(parsed.file) && !argv.includes("exec");
  if (isPackageScript && !argv.includes("--")) argv.push("--");
  if (kind === "vitest") {
    argv.push("--reporter=json", `--outputFile=${outputFile}`);
  } else {
    argv.push("--json", `--outputFile=${outputFile}`);
  }
  return { ...parsed, argv };
}

function runnerReportFiles(report, repo) {
  const testResults = Array.isArray(report?.testResults) ? report.testResults : [];
  const files = [];
  const assertions = [];
  for (const result of testResults) {
    const rawFile = result?.name ?? result?.testFilePath ?? result?.testFile;
    let file = null;
    if (typeof rawFile === "string" && rawFile.length > 0) {
      const absolute = isAbsolute(rawFile) ? rawFile : resolve(repo, rawFile);
      const rel = relative(repo, absolute).replaceAll("\\", "/");
      if (rel !== "" && rel !== ".." && !rel.startsWith("../") && !isAbsolute(rel)) file = rel;
    }
    if (file !== null) files.push(file);
    const assertionResults = Array.isArray(result?.assertionResults) ? result.assertionResults : [];
    for (const assertion of assertionResults) {
      const identifiers = new Set();
      for (const candidate of [assertion?.title, assertion?.fullName, assertion?.name]) {
        if (typeof candidate === "string" && candidate.length > 0) identifiers.add(candidate);
      }
      if (Array.isArray(assertion?.ancestorTitles) && typeof assertion?.title === "string") {
        const hierarchy = [...assertion.ancestorTitles, assertion.title];
        if (hierarchy.every((value) => typeof value === "string" && value.length > 0)) identifiers.add(hierarchy.join(" > "));
      }
      assertions.push({ file, identifiers: [...identifiers] });
    }
  }
  return { files: [...new Set(files)].sort(), assertions };
}

async function runMembershipProof(caseRecord, repo, root, commandText, label, expectedExit, targetedScope) {
  const proofDir = join(root, "controller-proof");
  await mkdir(proofDir, { recursive: true });
  const outputFile = join(proofDir, `${randomUUID()}.json`);
  const variant = proofVariant(commandText, runnerKind(caseRecord), outputFile);
  const envBase = runtimeEnvironment(root);
  const proof = await runBounded({ file: variant.file, argv: variant.argv, cwd: repo, env: { ...envBase, ...variant.env } });
  requireExited(proof, `${label} membership proof`);
  if (proof.exitCode !== expectedExit) fail("oracle", `${label} machine membership proof changed exit behavior`);
  let report;
  try {
    report = JSON.parse(await readFile(outputFile, "utf8"));
  } catch (error) {
    fail("oracle_membership", `${label} machine membership proof did not produce parseable JSON: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await rm(outputFile, { force: true });
  }
  const parsed = runnerReportFiles(report, repo);
  for (const id of caseRecord.oracle.specification.regression_test_ids) {
    if (!parsed.assertions.some((assertion) => assertion.identifiers.includes(id))) {
      fail("oracle_membership", `${label} machine membership proof did not report reviewed test id: ${id}`);
    }
  }
  if (targetedScope) {
    const allowed = new Set(caseRecord.paths.regression_tests);
    const unexpected = parsed.files.filter((file) => !allowed.has(file));
    if (unexpected.length > 0) {
      fail("oracle_scope", `${label} targeted membership proof executed unexpected test files: ${unexpected.slice(0, 8).join(", ")}`);
    }
    const matchedFiles = new Set(
      parsed.assertions
        .filter((assertion) => caseRecord.oracle.specification.regression_test_ids.some((id) => assertion.identifiers.includes(id)))
        .map((assertion) => assertion.file)
        .filter((file) => file !== null),
    );
    if (matchedFiles.size === 0 || [...matchedFiles].some((file) => !allowed.has(file))) {
      fail("oracle_scope", `${label} reviewed test id was not bound to a reviewed regression-test path`);
    }
  }
  return {
    machine_report_sha256: sha256Bytes(Buffer.from(canonicalJson(report), "utf8")),
    executed_test_files: parsed.files,
    reviewed_ids_proven: true,
    process: outputDigest(proof),
  };
}

'''
s = s[:start] + replacement + s[end:]

old_reviewed = '''  let proof = null;
  let membership = mentionsAllIds(exactText, caseRecord.oracle.specification.regression_test_ids);
  if (!membership) {
    const variant = proofVariant(commandText, runnerKind(caseRecord));
    const proofEnv = { ...envBase, ...variant.env };
    proof = await runBounded({ file: variant.file, argv: variant.argv, cwd: repo, env: proofEnv });
    requireExited(proof, `${label} membership proof`);
    const proofText = textOutput(proof);
    rejectSetupFailure(proofText, `${label} membership proof`);
    if (proof.exitCode !== exact.exitCode) fail("oracle", `${label} reporter-only proof changed exit behavior`);
    membership = mentionsAllIds(proofText, caseRecord.oracle.specification.regression_test_ids);
  }
  if (!membership) fail("oracle_membership", `${label} did not prove all reviewed regression_test_ids executed`);
  await assertMeasuredState(repo, expectedPaths, envBase);
  return { status: expected === "pass" ? "passed" : "failed_as_expected", membership_proven: true, exact: outputDigest(exact), proof: proof ? outputDigest(proof) : null };'''
new_reviewed = '''  const proof = await runMembershipProof(caseRecord, repo, root, commandText, label, exact.exitCode, true);
  await assertMeasuredState(repo, expectedPaths, envBase);
  return { status: expected === "pass" ? "passed" : "failed_as_expected", membership_proven: true, exact: outputDigest(exact), proof };'''
if old_reviewed not in s:
    raise SystemExit("runReviewed membership anchor missing")
s = s.replace(old_reviewed, new_reviewed, 1)

old_comparator = '''  let membership = mentionsAllIds(exactText, caseRecord.oracle.specification.regression_test_ids);
  let proof = null;
  if (requireMembership && !membership) {
    const variant = proofVariant(commandText, runnerKind(caseRecord));
    proof = await runBounded({ file: variant.file, argv: variant.argv, cwd: repo, env: { ...envBase, ...variant.env } });
    requireExited(proof, `${label} membership proof`);
    if (proof.exitCode !== 0) fail("comparator", `${label} membership proof failed`);
    membership = mentionsAllIds(textOutput(proof), caseRecord.oracle.specification.regression_test_ids);
  }
  if (requireMembership && !membership) fail("oracle_membership", `${label} did not prove oracle membership`);
  await assertMeasuredState(repo, caseRecord.paths.production, envBase);
  return { status: "passed", oracle_membership: requireMembership ? membership : null, exact: outputDigest(exact), proof: proof ? outputDigest(proof) : null };'''
new_comparator = '''  const proof = requireMembership
    ? await runMembershipProof(caseRecord, repo, root, commandText, label, exact.exitCode, false)
    : null;
  await assertMeasuredState(repo, caseRecord.paths.production, envBase);
  return { status: "passed", oracle_membership: requireMembership ? true : null, exact: outputDigest(exact), proof };'''
if old_comparator not in s:
    raise SystemExit("runComparator membership anchor missing")
s = s.replace(old_comparator, new_comparator, 1)

p.write_text(s)
