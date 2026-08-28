from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one guarded replacement, found {count}")
    path.write_text(text.replace(old, new, 1))


harness = ROOT / "benchmarks" / "harness-lib.mjs"
replace_once(
    harness,
    '''function fail(code, message) {\n  throw new BenchmarkHarnessError(code, message);\n}\n\nexport function sha256Bytes(bytes) {''',
    '''function fail(code, message) {\n  throw new BenchmarkHarnessError(code, message);\n}\n\nexport function attestSourceStability(startDigest, endDigest, reported) {\n  if (typeof startDigest !== "string" || startDigest.length === 0 || typeof endDigest !== "string" || endDigest.length === 0) {\n    fail("binding_integrity", "independent source-state digests must be non-empty strings");\n  }\n  const actual = startDigest === endDigest ? "stable" : "tree_drifted";\n  if (reported !== actual) {\n    fail("binding_integrity", `Ascout reported source stability ${String(reported)} but independent Git state is ${actual}`);\n  }\n  return actual;\n}\n\nexport function sha256Bytes(bytes) {''',
)

run = ROOT / "benchmarks" / "run.mjs"
replace_once(
    run,
    '''  BenchmarkHarnessError,\n  assertControllerSecretsAbsent,''',
    '''  BenchmarkHarnessError,\n  assertControllerSecretsAbsent,\n  attestSourceStability,''',
)
replace_once(
    run,
    '''const CLEAN_RUNTIME_PREFIXES = ["node_modules/", ".ascout/", "coverage/"];\nconst SETUP_ERROR_PATTERNS = [''',
    '''const CLEAN_RUNTIME_PREFIXES = ["node_modules/", ".ascout/", "coverage/"];\nconst MEMBERSHIP_RUNTIME_CACHE_PATHS = [".nx/cache", ".nx/workspace-data", ".cache", "node_modules/.cache"];\nconst SETUP_ERROR_PATTERNS = [''',
)
replace_once(
    run,
    '''async function gitText(repo, args, env) {\n  const result = await runGit(repo, args, env);\n  return result.stdout.toString("utf8").trim();\n}\n\nasync function objectExists''',
    '''async function gitText(repo, args, env) {\n  const result = await runGit(repo, args, env);\n  return result.stdout.toString("utf8").trim();\n}\n\nasync function clearIgnoredMembershipRuntimeCaches(repo, env) {\n  for (const relativePath of MEMBERSHIP_RUNTIME_CACHE_PATHS) {\n    const absolutePath = resolve(repo, relativePath);\n    assertPathInside(repo, absolutePath);\n    let present = false;\n    try {\n      present = (await stat(absolutePath)).isDirectory() || (await stat(absolutePath)).isFile();\n    } catch {}\n    if (!present) continue;\n    const ignored = await runGit(repo, ["check-ignore", "-q", "--", relativePath], env, { allowFailure: true });\n    if (ignored.exitCode !== 0) {\n      fail("binding_integrity", `membership runtime cache path is not ignored by donor repository: ${relativePath}`);\n    }\n    await rm(absolutePath, { recursive: true, force: true });\n  }\n}\n\nasync function independentSourceStateDigest(repo, env) {\n  const status = await runGit(repo, ["status", "--porcelain=v1", "-z", "--untracked-files=all"], env);\n  const unstaged = await runGit(repo, ["diff", "--binary", "--no-ext-diff", "HEAD", "--"], env);\n  const staged = await runGit(repo, ["diff", "--cached", "--binary", "--no-ext-diff", "HEAD", "--"], env);\n  return sha256Bytes(Buffer.concat([\n    Buffer.from("status\\0", "utf8"), status.stdout,\n    Buffer.from("\\0unstaged\\0", "utf8"), unstaged.stdout,\n    Buffer.from("\\0staged\\0", "utf8"), staged.stdout,\n  ]));\n}\n\nasync function objectExists''',
)
replace_once(
    run,
    '''  const proofEnv = { ...envBase, ...variant.env };\n  assertControllerSecretsAbsent(proofEnv);\n  const proof = await runBounded({ file: variant.file, argv: variant.argv, cwd: repo, env: proofEnv });''',
    '''  const proofEnv = { ...envBase, ...variant.env };\n  assertControllerSecretsAbsent(proofEnv);\n  await clearIgnoredMembershipRuntimeCaches(repo, proofEnv);\n  const proof = await runBounded({ file: variant.file, argv: variant.argv, cwd: repo, env: proofEnv });''',
)
replace_once(
    run,
    '''  const cli = resolve(ascoutRoot, "dist/cli.js");\n  const result = await runBounded({ file: process.execPath, argv: [cli, "check", "--format", "json"], cwd: repo, env, timeoutMs: DEFAULT_TIMEOUT_MS });''',
    '''  const cli = resolve(ascoutRoot, "dist/cli.js");\n  const sourceStateStartSha256 = await independentSourceStateDigest(repo, env);\n  const result = await runBounded({ file: process.execPath, argv: [cli, "check", "--format", "json"], cwd: repo, env, timeoutMs: DEFAULT_TIMEOUT_MS });''',
)
replace_once(
    run,
    '''  await assertMeasuredState(repo, caseRecord.paths.production, env);\n  return {\n    exit_code: result.exitCode,\n    completeness: receipt?.summary?.completeness ?? receipt?.completeness ?? null,\n    source_stability: receipt?.stability ?? receipt?.source?.stability ?? receipt?.source_stability ?? null,''',
    '''  const sourceStateEndSha256 = await independentSourceStateDigest(repo, env);\n  const reportedSourceStability = receipt?.stability ?? receipt?.source?.stability ?? receipt?.source_stability ?? null;\n  const independentSourceStability = attestSourceStability(sourceStateStartSha256, sourceStateEndSha256, reportedSourceStability);\n  return {\n    exit_code: result.exitCode,\n    completeness: receipt?.summary?.completeness ?? receipt?.completeness ?? null,\n    source_stability: reportedSourceStability,\n    independent_source_stability: independentSourceStability,\n    source_state_start_sha256: sourceStateStartSha256,\n    source_state_end_sha256: sourceStateEndSha256,''',
)
replace_once(
    run,
    '''        source_stability: observation.ascout.source_stability,\n        source: observation.ascout.source,''',
    '''        source_stability: observation.ascout.source_stability,\n        independent_source_stability: observation.ascout.independent_source_stability,\n        source_state_start_sha256: observation.ascout.source_state_start_sha256,\n        source_state_end_sha256: observation.ascout.source_state_end_sha256,\n        source: observation.ascout.source,''',
)

tests = ROOT / "tests" / "benchmark-harness.test.ts"
replace_once(
    tests,
    '''  assertControllerSecretsAbsent,\n  canonicalJson,''',
    '''  assertControllerSecretsAbsent,\n  attestSourceStability,\n  canonicalJson,''',
)
replace_once(
    tests,
    '''  it("canonicalizes evidence objects independently of insertion order", () => {''',
    '''  it("attests reported source stability against independent Git-state digests", () => {\n    expect(attestSourceStability("same", "same", "stable")).toBe("stable");\n    expect(attestSourceStability("before", "after", "tree_drifted")).toBe("tree_drifted");\n    expect(() => attestSourceStability("before", "after", "stable")).toThrowError(/independent Git state is tree_drifted/);\n    expect(() => attestSourceStability("same", "same", "tree_drifted")).toThrowError(/independent Git state is stable/);\n  });\n\n  it("canonicalizes evidence objects independently of insertion order", () => {''',
)

manifest_path = ROOT / "benchmarks" / "manifest.json"
manifest = json.loads(manifest_path.read_text())
if manifest.get("manifest_revision") != 9:
    raise SystemExit(f"expected manifest revision 9, got {manifest.get('manifest_revision')}")
case = next((item for item in manifest["cases"] if item.get("case_id") == "braintree-venmo-csp-nonce-web-login"), None)
if case is None:
    raise SystemExit("Braintree case missing")
if case.get("case_revision") != 2:
    raise SystemExit(f"expected Braintree revision 2, got {case.get('case_revision')}")
coverage = case["oracle"]["specification"]["coverage_oracle"]
old_coverage = "BRAINTREE_JS_ENV=development npm_config_ignore_scripts=true ./node_modules/.bin/jest --config=jest.config.json --runInBand --coverage --coverageReporters=lcov --coverageDirectory=coverage"
new_coverage = "BRAINTREE_JS_ENV=development npm_config_ignore_scripts=true ./node_modules/.bin/jest --config=jest.config.json --runInBand --ignoreProjects publishing --coverage --coverageReporters=lcov --coverageDirectory=coverage"
old_native = "npm test"
new_native = "BRAINTREE_JS_ENV=development npm_config_ignore_scripts=true ./node_modules/.bin/jest --config=jest.config.json --runInBand --ignoreProjects publishing"
if coverage.get("full_test_coverage_command") != old_coverage:
    raise SystemExit("unexpected Braintree coverage command")
if coverage.get("project_native_reference_command") != old_native:
    raise SystemExit("unexpected Braintree native reference command")
coverage["full_test_coverage_command"] = new_coverage
coverage["project_native_reference_command"] = new_native
case["case_revision"] = 3
manifest["manifest_revision"] = 10
case["limitations"].append(
    "Case revision 3 supersedes revision 2 after T075 executable diagnostics proved that the root Jest publishing project is the only reviewed full-suite project that mutates tracked repository files during the independent coverage/native reference run. The revised commands retain all 22 runtime/test Jest projects, exclude only publishing, preserve the production-only measured diff under the exact sanitized T075 environment, and still emit src/coverage/lcov.info. Historical unrelated failures remain nonzero comparator evidence rather than being normalized to PASS."
)
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
