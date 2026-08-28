import json
from pathlib import Path

manifest_path = Path('benchmarks/manifest.json')
data = json.loads(manifest_path.read_text())
if data.get('manifest_revision') != 8:
    raise SystemExit(f"unexpected manifest revision {data.get('manifest_revision')}")
data['manifest_revision'] = 9
case = next((c for c in data['cases'] if c.get('case_id') == 'braintree-venmo-csp-nonce-web-login'), None)
if case is None:
    raise SystemExit('Braintree case missing')
if case.get('case_revision') != 1:
    raise SystemExit(f"unexpected Braintree case revision {case.get('case_revision')}")
case['case_revision'] = 2
coverage = case['oracle']['specification']['coverage_oracle']
old_command = 'BRAINTREE_JS_ENV=development ./node_modules/.bin/jest --config=jest.config.json --runInBand --coverage --coverageReporters=lcov --coverageDirectory=coverage'
new_command = 'BRAINTREE_JS_ENV=development npm_config_ignore_scripts=true ./node_modules/.bin/jest --config=jest.config.json --runInBand --coverage --coverageReporters=lcov --coverageDirectory=coverage'
if coverage.get('full_test_coverage_command') != old_command:
    raise SystemExit('Braintree coverage command drifted')
if coverage.get('artifact', {}).get('path') != 'coverage/lcov.info':
    raise SystemExit('Braintree LCOV path drifted')
coverage['full_test_coverage_command'] = new_command
coverage['artifact']['path'] = 'src/coverage/lcov.info'
limitations = case.get('limitations')
if not isinstance(limitations, list):
    raise SystemExit('Braintree limitations missing')
limitations.append('Case revision 2 supersedes the definition-only coverage invocation after T075 executable replay proved that the root Jest publishing globalSetup invokes npm run build, whose unrelated prebuild formatter cannot parse historical YAML-style .eslintrc files under the reconstructed toolchain. The revised full 23-project coverage command preserves the root Jest project set while setting npm_config_ignore_scripts=true so npm runs the required build without lifecycle prebuild/postbuild scripts; T075 independently observed the resulting LCOV location as src/coverage/lcov.info. Historical unrelated test failures remain visible through the recorded coverage command exit status and are not normalized to PASS.')
manifest_path.write_text(json.dumps(data, indent=2) + '\n')

run_path = Path('benchmarks/run.mjs')
text = run_path.read_text()
old = '''  requireExited(coverageRun, "gap full coverage oracle");
  if (coverageRun.exitCode !== 0) fail("coverage_oracle", `full coverage command failed with ${coverageRun.exitCode}`);
  await assertMeasuredState(measured.repo, caseRecord.paths.production, env);
  const artifactPath = resolve(measured.repo, commands.artifact);'''
new = '''  requireExited(coverageRun, "gap full coverage oracle");
  rejectSetupFailure(textOutput(coverageRun), "gap full coverage oracle");
  await assertMeasuredState(measured.repo, caseRecord.paths.production, env);
  const artifactPath = resolve(measured.repo, commands.artifact);'''
if text.count(old) != 1:
    raise SystemExit('gap coverage execution anchor drifted')
text = text.replace(old, new)
old_error = '''    fail("coverage_oracle", `full coverage command succeeded but required LCOV artifact ${commands.artifact} is unavailable: ${detail}`);'''
new_error = '''    fail("coverage_oracle", `full coverage command completed without required LCOV artifact ${commands.artifact}: ${detail}`);'''
if text.count(old_error) != 1:
    raise SystemExit('gap coverage artifact error anchor drifted')
text = text.replace(old_error, new_error)
old_status = '''    full_reference: { status: "passed" },'''
new_status = '''    full_reference: { status: coverageRun.exitCode === 0 ? "passed" : "failed" },'''
if text.count(old_status) != 1:
    raise SystemExit('gap full reference status anchor drifted')
text = text.replace(old_status, new_status)
run_path.write_text(text)
