import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";
import { beforeAll, describe, expect, it } from "vitest";
import { aggregateBenchmarkMetrics, computeCaseMetrics } from "../benchmarks/metrics-lib.mjs";
let T113_QUALIFIED_REPLAY_INPUTS: any;
let gitBlobSha1: any;
let validateControllerIdentity: any;
let validateQualifiedReplayContract: any;
let validateT111ManifestCompatibility: any;
const qualifiedReplayDescribe = process.platform === "linux" ? describe : describe.skip;
function baselineId(metric: string, comparator: string, cacheClass = "-") {
return createHash("sha256").update(`${metric}:${comparator}:${cacheClass}`).digest("hex");
}
function baseline(metric: string, comparator: string, cacheClass?: "cold" | "warm") {
return {
baseline_id: baselineId(metric, comparator, cacheClass), metric, comparator,
...(cacheClass === undefined ? {} : { cache_class: cacheClass }),
case_revision: 1, source_state: "tree-1",
environment: { os: "linux", node: "24.15.0", package_manager: "npm@11.12.1" },
command: comparator, process_limits: { timeout_ms: 900000 }, dependency_install_included: false,
cache_contract: cacheClass === undefined ? null : { dependency_tree: "retained", runner_cache: cacheClass === "cold" ? "cleared" : "retained" },
};
}
function selectionBaselines() {
const result: any[] = [];
for (const comparator of ["full", "plain", "related", "ascout"]) {
for (const metric of ["selection_recall", "false_pass"]) result.push(baseline(metric, comparator));
for (const cacheClass of ["cold", "warm"] as const) {
result.push(baseline("timing", comparator, cacheClass), baseline("determinism", comparator, cacheClass));
}
}
result.push(baseline("drift_detection", "ascout"), baseline("flake_classification_behavior", "ascout"));
return result;
}
function gapBaselines() {
const result = ["false_pass", "gap_classification_accuracy", "unresolved_rate", "drift_detection", "flake_classification_behavior"].map((metric) => baseline(metric, "ascout"));
for (const cacheClass of ["cold", "warm"] as const) result.push(baseline("timing", "ascout", cacheClass), baseline("determinism", "ascout", cacheClass));
return result;
}
function externalRun(observed: string[], duration_ms: number, clean_success = true) {
return { status: clean_success ? "passed" : "failed", exit_code: clean_success ? 0 : 1, clean_success, membership_available: true, oracle_test_ids_observed: observed, duration_ms, source_stability: "stable", reported_source_stability: null };
}
function ascoutRun(observed: string[], duration_ms: number, records: unknown[] = [], findings: unknown[] = []) {
return {
status: "passed", exit_code: 0, clean_success: true, membership_available: true, oracle_test_ids_observed: observed, duration_ms,
source_stability: "stable", reported_source_stability: "stable", completeness: "complete",
selection: { mode: "native_related", initial_scope: { kind: "repository", path: null }, selected_test_count: null, deselected_test_count: null, total_test_count: null, widened: false, widen_triggers: [], passes: [], limitations: ["counts unavailable in fixture"] },
tasks: [{ task_id: "test", task_type: "test", status: "PASS", cache_state: "unknown", observations: { runs: 1, failures: 0 } }],
exercise: { changed_executable_lines: records.length, exercised_lines: 0, not_exercised_lines: 0, unresolved_lines: 0, records }, findings,
};
}
function selectionInput(relatedObserved: string[]) {
const comparators = {
full: { cold: externalRun(["oracle A", "oracle B"], 100), warm: externalRun(["oracle A", "oracle B"], 80) },
plain: { cold: externalRun(["oracle A"], 90), warm: externalRun(["oracle A"], 70) },
related: { cold: externalRun(relatedObserved, 60), warm: externalRun(relatedObserved, 40) },
ascout: { cold: ascoutRun(relatedObserved, 50), warm: ascoutRun(relatedObserved, 30) },
};
return { case_id: "selection-case", case_revision: 1, case_class: "selection" as const, oracle_test_ids: ["oracle A", "oracle B"], gap_oracle: null, baselines: selectionBaselines(), observations: [{ comparators }, { comparators: structuredClone(comparators) }] };
}
describe("T076 benchmark metrics", () => {
it("computes frozen-oracle selection recall and exposes false PASS without using selected-count as recall", () => {
const metrics = computeCaseMetrics(selectionInput(["oracle A"]));
expect(metrics.selection_recall?.full).toMatchObject({ available: true, numerator: 2, denominator: 2, recall: 1 });
expect(metrics.selection_recall?.related).toMatchObject({ available: true, numerator: 1, denominator: 2, recall: 0.5 });
expect(metrics.selection_recall?.related.baseline_id).toHaveLength(64);
expect(metrics.false_pass.find((item) => item.comparator === "related")).toMatchObject({ available: true, false_pass: true, material_oracle_omission: true });
});
it("keeps plain recall and false-PASS unavailable without membership evidence", () => {
const input = selectionInput(["oracle A", "oracle B"]);
for (const observation of input.observations) for (const cacheClass of ["cold", "warm"] as const) {
observation.comparators.plain[cacheClass].membership_available = false;
observation.comparators.plain[cacheClass].oracle_test_ids_observed = [];
}
const metrics = computeCaseMetrics(input);
expect(metrics.selection_recall?.plain).toMatchObject({ available: false, numerator: null, recall: null });
expect(metrics.false_pass.find((item) => item.comparator === "plain")).toMatchObject({ available: false, false_pass: null, clean_success: null });
});
it("makes recall unavailable when repeated membership evidence is contradictory", () => {
const input = selectionInput(["oracle A"]);
input.observations[1]!.comparators.related.cold.oracle_test_ids_observed = ["oracle A", "oracle B"];
const metrics = computeCaseMetrics(input);
expect(metrics.selection_recall?.related).toMatchObject({ available: false, recall: null });
expect(metrics.determinism.find((item) => item.comparator === "related" && item.cache_class === "cold")?.classification).toBe("nondeterministic");
});
it("computes gap accuracy over independently resolved lines and publishes unresolved rate separately", () => {
const records = [{ path: "src/a.ts", line: 10, state: "EXERCISED" }, { path: "src/a.ts", line: 11, state: "UNRESOLVED" }];
const comparators = { ascout: { cold: ascoutRun([], 50, records), warm: ascoutRun([], 30, records) } };
const input = { case_id: "gap-case", case_revision: 1, case_class: "gap" as const, oracle_test_ids: [], gap_oracle: [
{ path: "src/a.ts", line: 10, classification: "EXERCISED" }, { path: "src/a.ts", line: 11, classification: "NOT_EXERCISED" }, { path: "src/a.ts", line: 12, classification: "UNRESOLVED" },
], baselines: gapBaselines(), observations: [{ comparators }, { comparators: structuredClone(comparators) }] };
const metrics = computeCaseMetrics(input);
expect(metrics.gap_classification).toMatchObject({ available: true, numerator_correct: 1, denominator: 2, accuracy: 0.5, unresolved_numerator: 1, unresolved_rate: 0.5, oracle_excluded_unresolved: 1 });
expect(metrics.gap_classification?.accuracy_baseline_id).toHaveLength(64);
expect(metrics.false_pass[0]).toMatchObject({ available: true, false_pass: true });
});
it("does not invent flake accuracy when no repeated-observation finding domain exists", () => {
expect(computeCaseMetrics(selectionInput(["oracle A", "oracle B"])).flake_classification_behavior).toMatchObject({ available: false, accuracy: null, evaluated_finding_count: 0 });
});
it("evaluates flake classification behavior from raw runs/failures when the domain exists", () => {
const input = selectionInput(["oracle A", "oracle B"]);
const finding = { finding_id: "test.f1", determinism_class: "nondeterministic", reproduced: false, observations: { runs: 2, failures: 1 } };
for (const observation of input.observations) observation.comparators.ascout.cold.findings = [finding];
expect(computeCaseMetrics(input).flake_classification_behavior).toMatchObject({ available: true, evaluated_finding_count: 2, correct_count: 2, accuracy: 1 });
});
it("rejects incomplete metric baseline declarations before calculating", () => {
const input = selectionInput(["oracle A", "oracle B"]);
input.baselines = input.baselines.filter((item) => !(item.metric === "selection_recall" && item.comparator === "related"));
expect(() => computeCaseMetrics(input)).toThrow(/exactly one baseline for selection_recall\/related/);
});
it("aggregates timings only under identical baseline declarations", () => {
const input = selectionInput(["oracle A", "oracle B"]), metrics = computeCaseMetrics(input);
const aggregate = aggregateBenchmarkMetrics([{ status: "BENCHMARK_METRICS_READY", task: "T076", case_id: input.case_id, case_revision: input.case_revision, t075_evidence_sha256: "a".repeat(64), baselines: input.baselines, observations: input.observations, metrics }]);
expect(aggregate.metrics.selection_recall.related).toMatchObject({ numerator: 2, denominator: 2, recall: 1 });
const relatedCold = aggregate.metrics.timing.find((item) => item.baseline.comparator === "related" && item.baseline.cache_class === "cold");
expect(relatedCold).toMatchObject({ sample_count: 2, arithmetic_mean_ms: 60 });
expect(relatedCold?.baseline_id).toHaveLength(64);
});
});
const QUALIFIED_REPLAY_FIXTURES_BR_BASE64 = "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";
let qualifiedReplayFixtureCache: { t111: Buffer; t112: Buffer } | null = null;
function qualifiedReplayFixtures() {
if (qualifiedReplayFixtureCache) return qualifiedReplayFixtureCache;
const combined = brotliDecompressSync(Buffer.from(QUALIFIED_REPLAY_FIXTURES_BR_BASE64, "base64"));
const n = combined.readUInt32BE(0);
return qualifiedReplayFixtureCache = { t111: combined.subarray(4, 4 + n), t112: combined.subarray(4 + n) };
}
function exactReplayFixture(which: "t111" | "t112") {
const replayBytes = qualifiedReplayFixtures()[which];
return { replayBytes, replay: JSON.parse(replayBytes.toString("utf8")) };
}
function currentManifest() { return JSON.parse(readFileSync(new URL("../benchmarks/manifest.json", import.meta.url), "utf8")); }
function provenance(frozen: any) { return { source_commit: frozen.source_commit, workflow_run_id: frozen.workflow_run_id, workflow_run_attempt: frozen.workflow_run_attempt, artifact_id: frozen.artifact_id }; }
function exactT112AdmissionInputs() {
const { replayBytes, replay } = exactReplayFixture("t112"), manifest = currentManifest();
const caseRecord = manifest.cases.find((candidate: any) => candidate.case_id === "immer-draftmap-iterator-compatibility");
if (!caseRecord) throw new Error("exact T112 manifest case is unavailable");
const frozen = T113_QUALIFIED_REPLAY_INPUTS[caseRecord.case_id];
return { replayBytes, replay, manifest, caseRecord, frozen, provenance: provenance(frozen) };
}
const CURRENT_T112_COMMAND_CONTRACT = "Pinned T112 command contract from exact package.json blob 5eef16ebf240a50415610ce73fd752cf7956bd0b and Vitest config blob 93381dae04d8b24d97f5d78dbc16802fcbe2539a: targeted regression-file command = `yarn test:src __tests__/map-set.js`; project-native full-suite/reference command = `yarn test:src`; plain-project comparator = `yarn test`; runner-native related selector = `yarn vitest related src/plugins/mapset.ts --run`. T112 must prove both recorded regression_test_ids executed; file-level success alone is not oracle evidence.";
const HISTORICAL_T112_COMMAND_CONTRACT = CURRENT_T112_COMMAND_CONTRACT.replace("full-suite/reference", "source-suite/reference");
function reconstructHistoricalT111Manifest(manifest: any) {
const historical = structuredClone(manifest);
if (historical.manifest_revision !== 13) throw new Error("current manifest revision is not 13");
historical.manifest_revision = 12;
const immer = historical.cases.find((candidate: any) => candidate.case_id === "immer-draftmap-iterator-compatibility");
if (!immer || immer.case_revision !== 2) throw new Error("current T112 case revision is not 2");
immer.case_revision = 1;
const procedures = immer.oracle?.specification?.ground_truth_procedure;
if (!Array.isArray(procedures) || procedures[2] !== CURRENT_T112_COMMAND_CONTRACT) throw new Error("current T112 command contract is not authorized");
procedures[2] = HISTORICAL_T112_COMMAND_CONTRACT;
return Buffer.from(`${JSON.stringify(historical)}\n`, "utf8");
}
function exactT111AdmissionInputs() {
const { replayBytes, replay } = exactReplayFixture("t111"), manifest = currentManifest();
const caseRecord = manifest.cases.find((candidate: any) => candidate.case_id === "jotai-splitatom-identical-write");
if (!caseRecord) throw new Error("exact T111 manifest case is unavailable");
const frozen = T113_QUALIFIED_REPLAY_INPUTS[caseRecord.case_id], historicalManifestBytes = reconstructHistoricalT111Manifest(manifest);
return { replayBytes, replay, manifest, caseRecord, frozen, provenance: provenance(frozen), historicalManifestBytes, historicalManifest: JSON.parse(historicalManifestBytes.toString("utf8")) };
}
qualifiedReplayDescribe("T113 qualified replay admission", () => {
beforeAll(async () => {
const metricsUrl = new URL("../benchmarks/metrics.mjs", import.meta.url).href;
const metricsModule: any = await import(/* @vite-ignore */ metricsUrl);
({ T113_QUALIFIED_REPLAY_INPUTS, gitBlobSha1, validateControllerIdentity, validateQualifiedReplayContract, validateT111ManifestCompatibility } = metricsModule);
});
it("pins the two and only two authorized replay identities", () => expect(Object.keys(T113_QUALIFIED_REPLAY_INPUTS).sort()).toEqual(["immer-draftmap-iterator-compatibility", "jotai-splitatom-identical-write"]));
it("binds controller identity to replay and manifest runtime exactly", () => {
const caseRecord = { runtime: { node_version: "24.15.0", package_manager: "yarn", package_manager_version: "1.22.22" } };
const replay = { evidence: { platform: { os: "linux", arch: "x64" }, toolchain: { node: "24.15.0", package_manager: "yarn", package_manager_version: "1.22.22" } } }, actual = { os: "linux", arch: "x64", node: "24.15.0", package_manager: "yarn", package_manager_version: "1.22.22" };
expect(validateControllerIdentity(caseRecord, replay, actual)).toBe(true);
expect(() => validateControllerIdentity(caseRecord, replay, { ...actual, arch: "arm64" })).toThrow(/controller architecture mismatch/);
expect(() => validateControllerIdentity({ runtime: { ...caseRecord.runtime, package_manager_version: "1.22.21" } }, replay, actual)).toThrow(/manifest package manager version mismatch/);
});
it("computes Git blob identity over exact historical bytes", () => expect(gitBlobSha1(Buffer.from("hello\n", "utf8"))).toBe("ce013625030ba8dba906f756967f9e9ca394464a"));
it("accepts only complete canonical equality for the bounded revision-12-to-13 compatibility proof", () => {
const historicalCase: any = { case_id: "jotai-splitatom-identical-write", case_revision: 1, runtime: { node_version: "24.15.0", package_manager: "yarn", package_manager_version: "1.22.22" }, paths: { production: ["src/a.ts"], regression_tests: ["tests/a.test.ts"] }, oracle: { specification: { ground_truth_procedure: ["exact"] } } };
const historicalManifest = { manifest_revision: 12, cases: [historicalCase] }, historicalManifestBytes = Buffer.from(JSON.stringify(historicalManifest), "utf8");
const frozen = { case_id: historicalCase.case_id, case_revision: 1, replay_manifest_revision: 12, current_manifest_revision: 13, historical_manifest_blob: gitBlobSha1(historicalManifestBytes) };
const currentCase = structuredClone(historicalCase), currentManifest = { manifest_revision: 13, cases: [currentCase] };
expect(validateT111ManifestCompatibility({ historicalManifestBytes, historicalManifest, currentManifest, currentCase, frozen })).toBe(true);
const changed = structuredClone(currentCase); changed.oracle.specification.ground_truth_procedure = ["changed"];
expect(() => validateT111ManifestCompatibility({ historicalManifestBytes, historicalManifest, currentManifest, currentCase: changed, frozen })).toThrow(/not canonically identical/);
});
it("fails closed before accepting an unauthorized case or wrong replay bytes", () => {
expect(() => validateQualifiedReplayContract({ replayBytes: Buffer.from("{}"), replay: {}, caseRecord: { case_id: "not-authorized", case_revision: 1 }, manifest: { manifest_revision: 13 }, repetitions: 2, provenance: {} })).toThrow(/not authorized/);
const frozen = T113_QUALIFIED_REPLAY_INPUTS["immer-draftmap-iterator-compatibility"], caseRecord = { case_id: frozen.case_id, case_revision: frozen.case_revision, runtime: { node_version: "24.15.0", package_manager: "yarn", package_manager_version: "1.22.22" } };
expect(() => validateQualifiedReplayContract({ replayBytes: Buffer.from("{}"), replay: {}, caseRecord, manifest: { manifest_revision: 13 }, repetitions: 2, provenance: provenance(frozen) })).toThrow(/qualified replay file SHA-256 mismatch/);
});
it("accepts the exact frozen T112 replay bytes with exact provenance", () => {
const { replayBytes, replay, manifest, caseRecord, frozen, provenance: bound } = exactT112AdmissionInputs();
expect(validateQualifiedReplayContract({ replayBytes, replay, caseRecord, manifest, repetitions: 2, provenance: bound })).toEqual(frozen);
});
it("rejects selected-case semantic drift even when replay bytes and revisions are exact", () => {
const { replayBytes, replay, manifest, caseRecord, provenance: bound } = exactT112AdmissionInputs(), driftedCase = structuredClone(caseRecord);
driftedCase.oracle.specification.ground_truth_procedure = [...driftedCase.oracle.specification.ground_truth_procedure, "semantic drift"];
expect(() => validateQualifiedReplayContract({ replayBytes, replay, caseRecord: driftedCase, manifest, repetitions: 2, provenance: bound })).toThrow(/selected case canonical SHA-256 mismatch/);
});
it("accepts exact frozen T111 replay bytes through the full historical compatibility contract", () => {
const { replayBytes, replay, manifest, caseRecord, frozen, provenance: bound, historicalManifestBytes, historicalManifest } = exactT111AdmissionInputs();
expect(gitBlobSha1(historicalManifestBytes)).toBe(frozen.historical_manifest_blob);
expect(validateQualifiedReplayContract({ replayBytes, replay, caseRecord, manifest, repetitions: 2, provenance: bound, historicalManifestBytes, historicalManifest })).toEqual(frozen);
});
it("rejects current-manifest revision drift before compatibility selection", () => {
const { replayBytes, replay, manifest, caseRecord, provenance: bound } = exactT112AdmissionInputs(), driftedManifest = structuredClone(manifest); driftedManifest.manifest_revision += 1;
expect(() => validateQualifiedReplayContract({ replayBytes, replay, caseRecord, manifest: driftedManifest, repetitions: 2, provenance: bound })).toThrow(/current manifest revision mismatch/);
});
it("rejects replay-manifest revision drift before digest or compatibility selection", () => {
const { replayBytes, replay, manifest, caseRecord, provenance: bound } = exactT112AdmissionInputs(), driftedReplay = structuredClone(replay); driftedReplay.evidence.manifest_revision += 1;
expect(() => validateQualifiedReplayContract({ replayBytes, replay: driftedReplay, caseRecord, manifest, repetitions: 2, provenance: bound })).toThrow(/qualified replay manifest revision mismatch/);
});
it("rejects ambiguous qualified-input CLI combinations before reading any benchmark input", () => {
const metricsScript = fileURLToPath(new URL("../benchmarks/metrics.mjs", import.meta.url));
const aggregate = spawnSync(process.execPath, [metricsScript, "--aggregate-input", "missing.json", "--t075-input", "missing-replay.json"], { encoding: "utf8" });
expect(aggregate.status).toBe(1); expect(aggregate.stderr).toMatch(/aggregate mode cannot be combined/);
const retryAttempt = spawnSync(process.execPath, [metricsScript, "--case", "x", "--run-id", "x", "--t075-input", "missing-replay.json", "--t075-source-commit", "a".repeat(40), "--t075-workflow-run-id", "1", "--t075-workflow-run-attempt", "2", "--t075-artifact-id", "1"], { encoding: "utf8" });
expect(retryAttempt.status).toBe(1); expect(retryAttempt.stderr).toMatch(/requires --t075-workflow-run-attempt 1/);
});
});

const membershipRecoveryDescribe = process.platform === "linux" ? describe : describe.skip;
const R007_07_MANAGED_RUNNER_CACHE_PATHS = [".nx/cache", ".nx/workspace-data", ".cache", "node_modules/.cache"];

function fixtureGit(repo: string, ...args: string[]) {
const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
if (result.status !== 0) throw new Error(`fixture git ${args.join(" ")} failed: ${result.stderr}`);
return result.stdout.trim();
}

async function createR00707Fixture(ignoreManaged = true) {
const { chmod, mkdir, mkdtemp, rm, writeFile } = await import("node:fs/promises");
const { tmpdir } = await import("node:os");
const { join } = await import("node:path");
const repo = await mkdtemp(join(tmpdir(), "ascout-r00707-repo-"));
const root = await mkdtemp(join(tmpdir(), "ascout-r00707-root-"));
const ignored = ignoreManaged ? `${R007_07_MANAGED_RUNNER_CACHE_PATHS.map((path) => `${path}/`).join("\n")}\n` : "";
await writeFile(join(repo, ".gitignore"), ignored);
await mkdir(join(repo, "src"), { recursive: true });
await mkdir(join(repo, "tests"), { recursive: true });
await mkdir(join(repo, "node_modules", ".bin"), { recursive: true });
await writeFile(join(repo, "src", "value.ts"), "export const value = 'base';\n");
await writeFile(join(repo, "tests", "oracle.test.ts"), "fixture oracle\n");
const runner = [
"#!/usr/bin/env node",
"const fs = require('node:fs');",
"const path = require('node:path');",
`const caches = ${JSON.stringify(R007_07_MANAGED_RUNNER_CACHE_PATHS)};`,
"const outputArg = process.argv.find((value) => value.startsWith('--outputFile='));",
"if (!outputArg) { for (const cache of caches) { const dir = path.join(process.cwd(), cache); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'stale'), 'stale'); } process.exit(0); }",
"if (caches.some((cache) => fs.existsSync(path.join(process.cwd(), cache)))) process.exit(91);",
"const outputFile = outputArg.slice('--outputFile='.length);",
"const mode = process.env.FIXTURE_REPORT_MODE || 'valid';",
"const report = { testResults: [{ name: path.join(process.cwd(), 'tests/oracle.test.ts'), assertionResults: [{ status: 'passed', title: 'fixture oracle', fullName: 'fixture oracle', ancestorTitles: [] }] }] };",
"if (mode === 'no-report') process.exit(0);",
"if (mode === 'malformed') fs.writeFileSync(outputFile, '{');",
"else if (mode === 'missing-test-results') fs.writeFileSync(outputFile, JSON.stringify({ ok: true }));",
"else fs.writeFileSync(outputFile, JSON.stringify(report));",
"process.exit(mode === 'exit-mismatch' ? 3 : 0);",
].join("\n");
const runnerPath = join(repo, "node_modules", ".bin", "vitest");
await writeFile(runnerPath, `${runner}\n`);
await chmod(runnerPath, 0o755);
fixtureGit(repo, "init", "-q");
fixtureGit(repo, "config", "user.name", "Ascout Fixture");
fixtureGit(repo, "config", "user.email", "fixture@example.invalid");
fixtureGit(repo, "add", ".");
fixtureGit(repo, "commit", "-qm", "base");
const base = fixtureGit(repo, "rev-parse", "HEAD");
await writeFile(join(repo, "src", "value.ts"), "export const value = 'fix';\n");
fixtureGit(repo, "add", "src/value.ts");
fixtureGit(repo, "commit", "-qm", "fix");
const fix = fixtureGit(repo, "rev-parse", "HEAD");
fixtureGit(repo, "checkout", "-q", "--detach", base);
for (const cache of R007_07_MANAGED_RUNNER_CACHE_PATHS) {
const dir = join(repo, cache);
await mkdir(dir, { recursive: true });
await writeFile(join(dir, "stale"), "stale");
}
const caseRecord = {
case_id: "r00707-fixture",
case_class: "selection",
git: { fix: { commit_id: fix } },
paths: { production: ["src/value.ts"], regression_tests: ["tests/oracle.test.ts"] },
oracle: { specification: {
regression_test_ids: ["fixture oracle"],
ground_truth_procedure: [
"targeted command = `./node_modules/.bin/vitest`",
"project-native full-suite/reference command = `./node_modules/.bin/vitest`",
"plain-project comparator = `./node_modules/.bin/vitest`",
"runner-native related selector = `./node_modules/.bin/vitest`",
],
} },
};
return { repo, root, caseRecord, cleanup: async () => { await rm(repo, { recursive: true, force: true }); await rm(root, { recursive: true, force: true }); } };
}

async function r00707Testing() {
const metricsUrl = new URL("../benchmarks/metrics.mjs", import.meta.url).href;
const metricsModule: any = await import(/* @vite-ignore */ metricsUrl);
return metricsModule.__R007_07_TESTING_ONLY__;
}

membershipRecoveryDescribe("R007-07 T076 membership recovery", () => {
it("prepares exactly the existing four ignored runner caches before genuine structured membership proof", async () => {
const fixture = await createR00707Fixture();
try {
const testing = await r00707Testing();
expect(testing.managedRunnerCachePaths).toEqual(R007_07_MANAGED_RUNNER_CACHE_PATHS);
const result = await testing.membershipAudit(fixture.caseRecord, fixture.repo, fixture.root, "FIXTURE_REPORT_MODE=valid ./node_modules/.bin/vitest", 0, "fixture");
expect(result).toMatchObject({ membership_available: true, oracle_membership: true, oracle_test_ids_observed: ["fixture oracle"], evidence: { report_count: 1 } });
} finally { await fixture.cleanup(); }
});

it("keeps cleanup path-contained", async () => {
const fixture = await createR00707Fixture();
try {
const { mkdir, stat } = await import("node:fs/promises");
const { resolve } = await import("node:path");
const outside = resolve(fixture.repo, "..", `ascout-r00707-outside-${process.pid}`);
await mkdir(outside, { recursive: true });
const testing = await r00707Testing();
await expect(testing.clearIgnoredPath(fixture.repo, fixture.root, `../${outside.split("/").at(-1)}`)).rejects.toBeTruthy();
await expect(stat(outside)).resolves.toBeTruthy();
const { rm } = await import("node:fs/promises");
await rm(outside, { recursive: true, force: true });
} finally { await fixture.cleanup(); }
});

it("rejects a managed cache path that donor Git does not classify as ignored", async () => {
const fixture = await createR00707Fixture(false);
try {
const testing = await r00707Testing();
await expect(testing.clearIgnoredPath(fixture.repo, fixture.root, ".cache")).rejects.toThrow(/metric cache path is not ignored/);
} finally { await fixture.cleanup(); }
});

it("keeps missing membership reports fail-closed", async () => {
const fixture = await createR00707Fixture();
try {
const testing = await r00707Testing();
await expect(testing.membershipAudit(fixture.caseRecord, fixture.repo, fixture.root, "FIXTURE_REPORT_MODE=no-report ./node_modules/.bin/vitest", 0, "fixture")).rejects.toThrow(/did not produce a runner JSON report/);
} finally { await fixture.cleanup(); }
});

it("rejects malformed membership JSON", async () => {
const fixture = await createR00707Fixture();
try {
const testing = await r00707Testing();
await expect(testing.membershipAudit(fixture.caseRecord, fixture.repo, fixture.root, "FIXTURE_REPORT_MODE=malformed ./node_modules/.bin/vitest", 0, "fixture")).rejects.toBeInstanceOf(SyntaxError);
} finally { await fixture.cleanup(); }
});

it("rejects membership reports without testResults", async () => {
const fixture = await createR00707Fixture();
try {
const testing = await r00707Testing();
await expect(testing.membershipAudit(fixture.caseRecord, fixture.repo, fixture.root, "FIXTURE_REPORT_MODE=missing-test-results ./node_modules/.bin/vitest", 0, "fixture")).rejects.toThrow(/membership report is missing testResults/);
} finally { await fixture.cleanup(); }
});

it("rejects membership instrumentation exit-code mismatch", async () => {
const fixture = await createR00707Fixture();
try {
const testing = await r00707Testing();
await expect(testing.membershipAudit(fixture.caseRecord, fixture.repo, fixture.root, "FIXTURE_REPORT_MODE=exit-mismatch ./node_modules/.bin/vitest", 0, "fixture")).rejects.toThrow(/membership instrumentation changed exit behavior/);
} finally { await fixture.cleanup(); }
});
});

async function createR00709WrapperFixture() {
const { chmod, mkdir, mkdtemp, readFile, rm, writeFile } = await import("node:fs/promises");
const { tmpdir } = await import("node:os");
const { delimiter, join } = await import("node:path");
const repo = await mkdtemp(join(tmpdir(), "ascout-r00709-repo-"));
const root = await mkdtemp(join(tmpdir(), "ascout-r00709-root-"));
const launcherRoot = await mkdtemp(join(tmpdir(), "ascout-r00709-launcher-"));
const previousPath = process.env.PATH;
if (!previousPath) throw new Error("fixture PATH is unavailable");
process.env.PATH = `${launcherRoot}${delimiter}${previousPath}`;
await writeFile(join(repo, ".gitignore"), `${R007_07_MANAGED_RUNNER_CACHE_PATHS.map((path) => `${path}/`).join("\n")}\n`);
await writeFile(join(repo, "package.json"), `${JSON.stringify({ scripts: { "test:ci": "vitest" } })}\n`);
await mkdir(join(repo, "src"), { recursive: true });
await mkdir(join(repo, "tests"), { recursive: true });
await mkdir(join(repo, "node_modules", ".bin"), { recursive: true });
await writeFile(join(repo, "src", "value.ts"), "export const value = 'base';\n");
await writeFile(join(repo, "tests", "oracle.test.ts"), "fixture oracle\n");
const runner = [
"#!/usr/bin/env node",
"const fs = require('node:fs');",
"const path = require('node:path');",
`const caches = ${JSON.stringify(R007_07_MANAGED_RUNNER_CACHE_PATHS)};`,
"const tempRoot = process.env.TMPDIR || process.env.TEMP;",
"if (!tempRoot) process.exit(87);",
"const logPath = path.join(tempRoot, 'r00709-lifecycle.log');",
"const modePath = path.join(tempRoot, 'r00709-mode');",
"const outputArg = process.argv.find((value) => value.startsWith('--outputFile='));",
"if (!process.argv.includes('--run')) process.exit(88);",
"const source = fs.readFileSync(path.join(process.cwd(), 'src/value.ts'), 'utf8');",
"if (!source.includes(\"'fix'\")) process.exit(89);",
"const prior = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').trim().split(/\\n/u).filter(Boolean).length : 0;",
"if (!outputArg) {",
"  const cachePresence = caches.map((cache) => fs.existsSync(path.join(process.cwd(), cache)));",
"  if (prior === 0 && cachePresence.some(Boolean)) process.exit(90);",
"  if (prior === 1 && cachePresence.some((present) => !present)) process.exit(91);",
"  fs.appendFileSync(logPath, `comparator:${prior === 0 ? 'cold' : 'warm'}\\n`);",
"  for (const cache of caches) { const dir = path.join(process.cwd(), cache); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'stale'), 'stale'); }",
"  fs.writeFileSync(path.join(process.cwd(), 'src/value.ts'), \"export const value = 'runtime';\\n\");",
"  process.exit(0);",
"}",
"if (prior !== 2) process.exit(92);",
"if (caches.some((cache) => fs.existsSync(path.join(process.cwd(), cache)))) process.exit(93);",
"fs.appendFileSync(logPath, 'proof\\n');",
"const outputFile = outputArg.slice('--outputFile='.length);",
"const mode = fs.existsSync(modePath) ? fs.readFileSync(modePath, 'utf8').trim() : 'valid';",
"const assertion = mode === 'wrong-identity' ? { status: 'passed', title: 'wrong oracle', fullName: 'wrong oracle', ancestorTitles: [] } : { status: 'passed', title: 'fixture oracle', fullName: 'fixture oracle', ancestorTitles: [] };",
"const resultName = mode === 'wrong-identity' ? path.join(process.cwd(), 'tests/not-reviewed.test.ts') : path.join(process.cwd(), 'tests/oracle.test.ts');",
"const report = { testResults: [{ name: resultName, assertionResults: [assertion] }] };",
"if (mode === 'no-report') { process.stdout.write(`R00709_STDOUT_${'o'.repeat(1400)}`); process.stderr.write(`R00709_STDERR_${'e'.repeat(1400)}`); process.exit(0); }",
"if (mode === 'malformed') fs.writeFileSync(outputFile, '{');",
"else if (mode === 'missing-test-results') fs.writeFileSync(outputFile, JSON.stringify({ ok: true }));",
"else fs.writeFileSync(outputFile, JSON.stringify(report));",
"process.exit(mode === 'exit-mismatch' ? 3 : 0);",
].join("\n");
const runnerPath = join(repo, "node_modules", ".bin", "vitest");
await writeFile(runnerPath, `${runner}\n`);
await chmod(runnerPath, 0o755);
const yarnLauncher = [
"#!/usr/bin/env node",
"// Test-only package-script dispatcher. It models command shape and process inheritance, not Yarn Classic semantics.",
"const fs = require('node:fs');",
"const path = require('node:path');",
"const { spawnSync } = require('node:child_process');",
"const args = process.argv.slice(2);",
"if (args[0] !== 'test:ci') process.exit(81);",
"const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));",
"if (pkg?.scripts?.['test:ci'] !== 'vitest') process.exit(82);",
"const child = spawnSync(path.join(process.cwd(), 'node_modules', '.bin', 'vitest'), args.slice(1), { env: process.env, stdio: 'inherit' });",
"process.exit(child.status ?? 83);",
].join("\n");
const yarnPath = join(launcherRoot, "yarn");
await writeFile(yarnPath, `${yarnLauncher}\n`);
await chmod(yarnPath, 0o755);
fixtureGit(repo, "init", "-q");
fixtureGit(repo, "config", "user.name", "Ascout Fixture");
fixtureGit(repo, "config", "user.email", "fixture@example.invalid");
fixtureGit(repo, "add", ".");
fixtureGit(repo, "commit", "-qm", "base");
const base = fixtureGit(repo, "rev-parse", "HEAD");
await writeFile(join(repo, "src", "value.ts"), "export const value = 'fix';\n");
fixtureGit(repo, "add", "src/value.ts");
fixtureGit(repo, "commit", "-qm", "fix");
const fix = fixtureGit(repo, "rev-parse", "HEAD");
fixtureGit(repo, "checkout", "-q", "--detach", base);
const caseRecord = {
case_id: "r00709-wrapper-fixture",
case_class: "selection",
git: { fix: { commit_id: fix } },
paths: { production: ["src/value.ts"], regression_tests: ["tests/oracle.test.ts"] },
oracle: { specification: {
regression_test_ids: ["fixture oracle"],
ground_truth_procedure: [
"targeted regression-file command = `yarn test:ci --run`",
"project-native full-suite/reference command = `yarn test:ci --run`",
"plain-project comparator = `yarn test:ci --run`",
"runner-native related selector = `yarn test:ci --run`",
],
} },
};
const modePath = join(root, "tmp", "r00709-mode");
const logPath = join(root, "tmp", "r00709-lifecycle.log");
return {
repo, root, caseRecord, modePath, logPath,
setMode: async (mode: string) => { await mkdir(join(root, "tmp"), { recursive: true }); await writeFile(modePath, `${mode}\n`); },
readLifecycle: async () => (await readFile(logPath, "utf8")).trim().split(/\n/u).filter(Boolean),
cleanup: async () => {
process.env.PATH = previousPath;
await rm(repo, { recursive: true, force: true });
await rm(root, { recursive: true, force: true });
await rm(launcherRoot, { recursive: true, force: true });
},
};
}

membershipRecoveryDescribe("R007-09 exact T076 wrapper lifecycle", () => {
it("preserves yarn test:ci --run through cold, warm, restore, cache preparation, package dispatch, and structured proof", async () => {
const fixture = await createR00709WrapperFixture();
try {
const testing = await r00707Testing();
const timed = await testing.timedCommandPair(fixture.caseRecord, fixture.repo, fixture.root, "yarn test:ci --run", "R007-09 wrapper");
expect(timed.cold).toMatchObject({ status: "passed", exit_code: 0, clean_success: true });
expect(timed.warm).toMatchObject({ status: "passed", exit_code: 0, clean_success: true });
const membership = await testing.membershipAudit(fixture.caseRecord, fixture.repo, fixture.root, "yarn test:ci --run", timed.cold.exit_code, "R007-09 wrapper");
expect(membership).toMatchObject({ membership_available: true, oracle_membership: true, oracle_test_ids_observed: ["fixture oracle"], evidence: { report_count: 1 } });
expect(await fixture.readLifecycle()).toEqual(["comparator:cold", "comparator:warm", "proof"]);
} finally { await fixture.cleanup(); }
});

it("keeps missing structured reports fail-closed while exposing only bounded proof diagnostics", async () => {
const fixture = await createR00709WrapperFixture();
try {
const testing = await r00707Testing();
const timed = await testing.timedCommandPair(fixture.caseRecord, fixture.repo, fixture.root, "yarn test:ci --run", "R007-09 wrapper");
await fixture.setMode("no-report");
let failure: Error | null = null;
try {
await testing.membershipAudit(fixture.caseRecord, fixture.repo, fixture.root, "yarn test:ci --run", timed.cold.exit_code, "R007-09 wrapper");
} catch (error) { failure = error as Error; }
expect(failure).toBeInstanceOf(Error);
expect(failure?.message).toMatch(/membership audit did not produce a runner JSON report/);
expect(failure?.message).toContain("stdout_sha256");
expect(failure?.message).toContain("stderr_sha256");
expect(failure?.message).toContain("R00709_STDOUT_");
expect(failure?.message).toContain("R00709_STDERR_");
expect(failure?.message.length).toBeLessThan(2200);
expect(await fixture.readLifecycle()).toEqual(["comparator:cold", "comparator:warm", "proof"]);
} finally { await fixture.cleanup(); }
});

it("rejects malformed structured reports through the exact wrapper lifecycle without producing membership truth", async () => {
const fixture = await createR00709WrapperFixture();
try {
const testing = await r00707Testing();
const timed = await testing.timedCommandPair(fixture.caseRecord, fixture.repo, fixture.root, "yarn test:ci --run", "R007-09 wrapper");
expect(timed.cold).toMatchObject({ status: "passed", exit_code: 0, clean_success: true });
expect(timed.warm).toMatchObject({ status: "passed", exit_code: 0, clean_success: true });
await fixture.setMode("malformed");
let membership: unknown;
let failure: unknown;
try {
membership = await testing.membershipAudit(fixture.caseRecord, fixture.repo, fixture.root, "yarn test:ci --run", timed.cold.exit_code, "R007-09 wrapper");
} catch (error) { failure = error; }
expect(failure).toBeInstanceOf(SyntaxError);
expect(membership).toBeUndefined();
expect(await fixture.readLifecycle()).toEqual(["comparator:cold", "comparator:warm", "proof"]);
} finally { await fixture.cleanup(); }
});

it("does not promote wrong reviewed path or test identity into membership truth", async () => {
const fixture = await createR00709WrapperFixture();
try {
const testing = await r00707Testing();
const timed = await testing.timedCommandPair(fixture.caseRecord, fixture.repo, fixture.root, "yarn test:ci --run", "R007-09 wrapper");
await fixture.setMode("wrong-identity");
const membership = await testing.membershipAudit(fixture.caseRecord, fixture.repo, fixture.root, "yarn test:ci --run", timed.cold.exit_code, "R007-09 wrapper");
expect(membership).toMatchObject({ membership_available: true, oracle_membership: false, oracle_test_ids_observed: [], evidence: { report_count: 1 } });
expect(await fixture.readLifecycle()).toEqual(["comparator:cold", "comparator:warm", "proof"]);
} finally { await fixture.cleanup(); }
});
});