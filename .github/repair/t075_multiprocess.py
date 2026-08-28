from pathlib import Path
import sys

root = Path(sys.argv[1]).resolve()

preload = root / 'benchmarks/membership-preload.cjs'
s = preload.read_text()
old = '''      const instrumentation =
        kind === "vitest"
          ? ["--reporter=json", `--outputFile=${outputFile}`]
          : ["--json", `--outputFile=${outputFile}`];'''
new = '''      const reportFile = `${outputFile}.${process.pid}.json`;
      const instrumentation =
        kind === "vitest"
          ? ["--reporter=json", `--outputFile=${reportFile}`]
          : ["--json", `--outputFile=${reportFile}`];'''
if old not in s:
    raise SystemExit('membership-preload instrumentation guard missing')
preload.write_text(s.replace(old, new, 1))

run = root / 'benchmarks/run.mjs'
s = run.read_text()
old_import = '''  readFile,
  rm,'''
new_import = '''  readFile,
  readdir,
  rm,'''
if old_import not in s:
    raise SystemExit('fs import guard missing')
s = s.replace(old_import, new_import, 1)
old_path_import = 'import { dirname, join, resolve } from "node:path";'
new_path_import = 'import { basename, dirname, join, resolve } from "node:path";'
if old_path_import not in s:
    raise SystemExit('path import guard missing')
s = s.replace(old_path_import, new_path_import, 1)
old_setup = '  rejectSetupFailure(textOutput(proof), `${label} membership proof`);\n'
if old_setup not in s:
    raise SystemExit('proof setup guard missing')
s = s.replace(old_setup, '', 1)
start_marker = '  let reportStat;\n  try {\n    reportStat = await stat(proofPath);'
end_marker = '  const membership = proveRunnerMembership('
start = s.find(start_marker)
if start == -1:
    raise SystemExit('proof report block start missing')
end = s.find(end_marker, start)
if end == -1:
    raise SystemExit('proof report block end missing')
replacement = '''  const proofDir = dirname(proofPath);
  const proofBase = basename(proofPath);
  const reportPaths = [];
  try {
    const exactStat = await stat(proofPath);
    if (exactStat.isFile()) reportPaths.push(proofPath);
  } catch {}
  for (const entry of await readdir(proofDir)) {
    if (entry.startsWith(`${proofBase}.`) && entry.endsWith(".json")) {
      reportPaths.push(join(proofDir, entry));
    }
  }
  const uniqueReportPaths = [...new Set(reportPaths)].sort();
  if (uniqueReportPaths.length === 0) {
    const boundedOutput = textOutput(proof).slice(0, 2000);
    fail("oracle_membership", `${label} membership proof did not produce an external JSON report (exit ${proof.exitCode}); output=${boundedOutput}`);
  }
  const reports = [];
  let reportBytesTotal = 0;
  for (const reportPath of uniqueReportPaths) {
    const reportStat = await stat(reportPath);
    if (!reportStat.isFile() || reportStat.size <= 0 || reportStat.size > CAPTURE_CAP_BYTES) {
      fail("oracle_membership", `${label} membership proof JSON report has an invalid size`);
    }
    reportBytesTotal += reportStat.size;
    if (reportBytesTotal > CAPTURE_CAP_BYTES) fail("oracle_membership", `${label} aggregate membership proof JSON exceeds capture cap`);
    const bytes = await readFile(reportPath);
    let parsedReport;
    try {
      parsedReport = JSON.parse(bytes.toString("utf8"));
    } catch {
      fail("oracle_membership", `${label} membership proof JSON report is not valid JSON`);
    }
    if (!Array.isArray(parsedReport?.testResults)) fail("oracle_membership", `${label} membership proof JSON report is missing testResults`);
    reports.push(parsedReport);
  }
  const report = { testResults: reports.flatMap((item) => item.testResults) };
  const reportBytes = Buffer.from(canonicalJson(report), "utf8");
'''
s = s[:start] + replacement + s[end:]
old_evidence = '''      report_bytes: reportBytes.length,
      evidence_kind: "runner-json-assertion-results",'''
new_evidence = '''      report_bytes: reportBytesTotal,
      report_count: uniqueReportPaths.length,
      evidence_kind: "runner-json-assertion-results",'''
if old_evidence not in s:
    raise SystemExit('proof evidence guard missing')
s = s.replace(old_evidence, new_evidence, 1)
old_reviewed = '''  const exactText = textOutput(exact);
  rejectSetupFailure(exactText, label);
  const proof = await runMembershipProof(caseRecord, repo, root, commandText, exact.exitCode, label);'''
new_reviewed = '''  const proof = await runMembershipProof(caseRecord, repo, root, commandText, exact.exitCode, label);'''
if old_reviewed not in s:
    raise SystemExit('reviewed setup guard missing')
s = s.replace(old_reviewed, new_reviewed, 1)
old_comparator = '''  const exactText = textOutput(exact);
  rejectSetupFailure(exactText, label);
  const proof = requireMembership
    ? await runMembershipProof(caseRecord, repo, root, commandText, exact.exitCode, label)
    : null;'''
new_comparator = '''  if (!requireMembership) rejectSetupFailure(textOutput(exact), label);
  const proof = requireMembership
    ? await runMembershipProof(caseRecord, repo, root, commandText, exact.exitCode, label)
    : null;'''
if old_comparator not in s:
    raise SystemExit('comparator setup guard missing')
s = s.replace(old_comparator, new_comparator, 1)
run.write_text(s)

tests = root / 'tests/benchmark-membership-preload.test.ts'
s = tests.read_text()
old_runner = '    "process.stdout.write(JSON.stringify({ argv: process.argv.slice(2), instrumented: process.env.ASCOUT_MEMBERSHIP_INSTRUMENTED ?? null }));\\n",'
new_runner = '    "process.stdout.write(JSON.stringify({ argv: process.argv.slice(2), instrumented: process.env.ASCOUT_MEMBERSHIP_INSTRUMENTED ?? null, pid: process.pid }));\\n",'
if old_runner not in s:
    raise SystemExit('fake runner guard missing')
s = s.replace(old_runner, new_runner, 1)
old_vitest = '''    expect(JSON.parse(result.stdout)).toEqual({
      argv: ["run", "--reporter=json", `--outputFile=${outputFile}`, "--", "tests/a.test.ts"],
      instrumented: "1",
    });'''
new_vitest = '''    const observed = JSON.parse(result.stdout);
    expect(observed).toEqual({
      argv: ["run", "--reporter=json", `--outputFile=${outputFile}.${observed.pid}.json`, "--", "tests/a.test.ts"],
      instrumented: "1",
      pid: expect.any(Number),
    });'''
if old_vitest not in s:
    raise SystemExit('vitest assertion guard missing')
s = s.replace(old_vitest, new_vitest, 1)
old_jest = '''    expect(JSON.parse(result.stdout)).toEqual({
      argv: ["--runInBand", "tests/a.test.ts", "--json", `--outputFile=${outputFile}`],
      instrumented: "1",
    });'''
new_jest = '''    const observed = JSON.parse(result.stdout);
    expect(observed).toEqual({
      argv: ["--runInBand", "tests/a.test.ts", "--json", `--outputFile=${outputFile}.${observed.pid}.json`],
      instrumented: "1",
      pid: expect.any(Number),
    });'''
if old_jest not in s:
    raise SystemExit('jest assertion guard missing')
s = s.replace(old_jest, new_jest, 1)
old_untrusted = '''    expect(JSON.parse(result.stdout)).toEqual({
      argv: ["run", "tests/a.test.ts"],
      instrumented: null,
    });'''
new_untrusted = '''    expect(JSON.parse(result.stdout)).toEqual({
      argv: ["run", "tests/a.test.ts"],
      instrumented: null,
      pid: expect.any(Number),
    });'''
if old_untrusted not in s:
    raise SystemExit('untrusted assertion guard missing')
tests.write_text(s.replace(old_untrusted, new_untrusted, 1))
