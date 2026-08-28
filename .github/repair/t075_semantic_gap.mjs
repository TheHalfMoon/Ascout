import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2]);
const harnessPath = path.join(root, 'benchmarks/harness-lib.mjs');
const testsPath = path.join(root, 'tests/benchmark-harness.test.ts');

let harness = fs.readFileSync(harnessPath, 'utf8');
const oldProjection = '    gap_coverage: observation.gap_coverage ?? null,\n';
const newProjection = '    gap_coverage: observation.gap_coverage === null || observation.gap_coverage === undefined ? null : { classifications: observation.gap_coverage.classifications },\n';
if ((harness.match(new RegExp(oldProjection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length !== 1) {
  throw new Error('stable gap coverage projection guard missing or ambiguous');
}
harness = harness.replace(oldProjection, newProjection);
fs.writeFileSync(harnessPath, harness);

let tests = fs.readFileSync(testsPath, 'utf8');
const anchor = `  it("canonicalizes evidence objects independently of insertion order", () => {\n    expect(canonicalJson({ b: 2, a: { z: 1, y: 0 } })).toBe(canonicalJson({ a: { y: 0, z: 1 }, b: 2 }));\n  });\n`;
if (!tests.includes(anchor)) throw new Error('observation semantics test anchor missing');
const addition = `${anchor}\n  it("treats raw coverage artifact bytes as evidence while comparing semantic gap classifications", () => {\n    const base = {\n      reconstruction: { tree: "abc" },\n      pre_fix_oracle: { status: "failed_as_expected" },\n      fixed_oracle: { status: "passed" },\n      full_reference: { status: "failed" },\n      related: { status: "not_applicable" },\n      ascout: { exit_code: 4 },\n      gap_coverage: {\n        artifact_sha256: "a".repeat(64),\n        classifications: [{ path: "src/a.ts", line: 10, classification: "EXERCISED", hits: 1, reason: null }],\n      },\n    };\n    const rawArtifactChanged = structuredClone(base);\n    rawArtifactChanged.gap_coverage.artifact_sha256 = "b".repeat(64);\n    expect(observationsDeterministic([base, rawArtifactChanged])).toBe("deterministic");\n\n    const semanticClassificationChanged = structuredClone(base);\n    semanticClassificationChanged.gap_coverage.classifications[0] = { path: "src/a.ts", line: 10, classification: "NOT_EXERCISED", hits: 0, reason: null };\n    expect(observationsDeterministic([base, semanticClassificationChanged])).toBe("nondeterministic");\n  });\n`;
tests = tests.replace(anchor, addition);
fs.writeFileSync(testsPath, tests);
