import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2]);
const manifestPath = path.join(root, 'benchmarks/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.manifest_revision !== 9) throw new Error(`expected manifest revision 9, got ${manifest.manifest_revision}`);
const c = manifest.cases.find((item) => item.case_id === 'braintree-venmo-csp-nonce-web-login');
if (!c) throw new Error('Braintree case missing');
if (c.case_revision !== 2) throw new Error(`expected Braintree case revision 2, got ${c.case_revision}`);
if (c.lifecycle_state !== 'CASE_REVIEWED' || c.case_class !== 'gap') throw new Error('unexpected Braintree lifecycle/class');
const coverage = c.oracle?.specification?.coverage_oracle;
if (!coverage) throw new Error('Braintree coverage oracle missing');
const oldCoverage = 'BRAINTREE_JS_ENV=development npm_config_ignore_scripts=true ./node_modules/.bin/jest --config=jest.config.json --runInBand --coverage --coverageReporters=lcov --coverageDirectory=coverage';
const newCoverage = 'BRAINTREE_JS_ENV=development npm_config_ignore_scripts=true ./node_modules/.bin/jest --config=jest.config.json --runInBand --ignoreProjects publishing --coverage --coverageReporters=lcov --coverageDirectory=coverage';
const oldNative = 'npm test';
const newNative = 'BRAINTREE_JS_ENV=development npm_config_ignore_scripts=true ./node_modules/.bin/jest --config=jest.config.json --runInBand --ignoreProjects publishing';
if (coverage.full_test_coverage_command !== oldCoverage) throw new Error(`unexpected coverage command: ${coverage.full_test_coverage_command}`);
if (coverage.project_native_reference_command !== oldNative) throw new Error(`unexpected native reference: ${coverage.project_native_reference_command}`);
if (coverage.artifact?.path !== 'src/coverage/lcov.info') throw new Error(`unexpected LCOV path: ${coverage.artifact?.path}`);
coverage.full_test_coverage_command = newCoverage;
coverage.project_native_reference_command = newNative;
const procedure = c.oracle.specification.ground_truth_procedure;
if (!Array.isArray(procedure)) throw new Error('ground truth procedure missing');
let referenceLabels = 0;
c.oracle.specification.ground_truth_procedure = procedure.map((line) => {
  if (!line.includes('Pinned project-native reference command:')) return line;
  referenceLabels += 1;
  return line.replace(/Pinned project-native reference command: `[^`]+`\./, `Pinned project-native reference command: \`${newNative}\`.`);
});
if (referenceLabels > 1) throw new Error(`expected at most one reference-command procedure label, got ${referenceLabels}`);
c.case_revision = 3;
manifest.manifest_revision = 10;
c.limitations.push(
  'Case revision 3 supersedes revision 2 after T075 replay proved that the root Jest publishing project mutates tracked repository files during verification. The revised reference and coverage commands preserve all 22 runtime/test Jest projects while excluding only the publishing project; T075 independently observed that this keeps the measured production-only diff source-stable and still emits src/coverage/lcov.info. Historical unrelated test failures remain visible through nonzero command status, and a missing LCOV record for the reviewed line remains UNRESOLVED rather than being inferred or repaired.'
);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
