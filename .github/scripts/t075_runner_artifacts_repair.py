from pathlib import Path

lib = Path('benchmarks/harness-lib.mjs')
text = lib.read_text()
needle = '''function pathMatchesReviewed(sourcePath, reviewedPaths) {
  const source = canonicalRepoPath(sourcePath);
  return reviewedPaths.some((path) => {
    const expected = canonicalRepoPath(path);
    return source === expected || source.endsWith(`/${expected}`);
  });
}
'''
helper = needle + '''
function isVitestTypecheckPseudoAssertion(result, assertion, regressionTestIds, regressionTestPaths) {
  if (!result || typeof result !== "object" || typeof result.name !== "string") return false;
  if (!assertion || typeof assertion !== "object") return false;
  if (!Array.isArray(assertion.ancestorTitles) || assertion.ancestorTitles.length !== 1) return false;
  if (typeof assertion.title !== "string" || typeof assertion.fullName !== "string") return false;
  const title = assertion.title.trim();
  if (!regressionTestIds.some((id) => id.trim() === title)) return false;
  const rawAncestor = assertion.ancestorTitles[0];
  if (typeof rawAncestor !== "string") return false;
  const ancestor = canonicalRepoPath(rawAncestor.trim());
  if (!ancestor.includes("/") || ancestor.length === 0) return false;
  if (assertion.fullName.trim() !== `${rawAncestor.trim()} ${title}`) return false;
  return regressionTestPaths.some((path) => {
    const reviewed = canonicalRepoPath(path);
    return pathMatchesReviewed(result.name, [path]) &&
      (reviewed === ancestor || reviewed.endsWith(`/${ancestor}`));
  });
}
'''
if text.count(needle) != 1:
    raise SystemExit('pathMatchesReviewed anchor drifted')
text = text.replace(needle, helper)
first = '''      if (!assertion || typeof assertion !== "object") continue;
      if (assertion.status !== "passed" && assertion.status !== "failed") continue;
      for (const field of [assertion.title, assertion.fullName]) {'''
first_new = '''      if (!assertion || typeof assertion !== "object") continue;
      if (assertion.status !== "passed" && assertion.status !== "failed") continue;
      if (isVitestTypecheckPseudoAssertion(result, assertion, regressionTestIds, regressionTestPaths)) continue;
      for (const field of [assertion.title, assertion.fullName]) {'''
if text.count(first) != 1:
    raise SystemExit('membership assertion anchor drifted')
text = text.replace(first, first_new)
second = '''      if (!assertion || typeof assertion !== "object") continue;
      if (assertion.status !== "passed" && assertion.status !== "failed") continue;
      const names = new Set();'''
second_new = '''      if (!assertion || typeof assertion !== "object") continue;
      if (assertion.status !== "passed" && assertion.status !== "failed") continue;
      if (isVitestTypecheckPseudoAssertion(result, assertion, regressionTestIds, regressionTestPaths)) continue;
      const names = new Set();'''
if text.count(second) != 1:
    raise SystemExit('status assertion anchor drifted')
text = text.replace(second, second_new)
lib.write_text(text)

run = Path('benchmarks/run.mjs')
text = run.read_text()
env_anchor = '''    COREPACK_HOME: join(root, "cache", "corepack"),
  });'''
env_new = '''    COREPACK_HOME: join(root, "cache", "corepack"),
    NX_SOCKET_DIR: join(root, "nx"),
  });'''
if text.count(env_anchor) != 1:
    raise SystemExit('runtime env anchor drifted')
text = text.replace(env_anchor, env_new)
dir_anchor = '''    mkdir(join(root, "cache", "corepack"), { recursive: true }),
  ]);'''
dir_new = '''    mkdir(join(root, "cache", "corepack"), { recursive: true }),
    mkdir(join(root, "nx"), { recursive: true }),
  ]);'''
if text.count(dir_anchor) != 1:
    raise SystemExit('runtime dir anchor drifted')
text = text.replace(dir_anchor, dir_new)
run.write_text(text)

spec = Path('tests/benchmark-membership-proof.test.ts')
text = spec.read_text()
append = r'''

describe("T075 Vitest typecheck pseudo-results", () => {
  const reviewedPath = "packages/zod/src/v4/classic/tests/number.test.ts";
  const reviewedId = ".multipleOf() with scientific notation (multi-digit exponents)";

  it("ignores a path-echo typecheck pseudo-result when a real reviewed assertion fails", () => {
    const report = {
      testResults: [
        {
          name: `/tmp/repo/${reviewedPath}`,
          status: "failed",
          assertionResults: [{ title: reviewedId, fullName: reviewedId, ancestorTitles: [], status: "failed" }],
        },
        {
          name: `/tmp/repo/${reviewedPath}`,
          status: "passed",
          assertionResults: [{
            title: reviewedId,
            fullName: `src/v4/classic/tests/number.test.ts ${reviewedId}`,
            ancestorTitles: ["src/v4/classic/tests/number.test.ts"],
            status: "passed",
          }],
        },
      ],
    };
    expect(proveRunnerMembership(report, [reviewedId], [reviewedPath])).toBe(true);
    expect(proveReviewedAssertionStatus(report, [reviewedId], [reviewedPath], "failed")).toBe(true);
    expect(proveReviewedAssertionStatus(report, [reviewedId], [reviewedPath], "passed")).toBe(false);
  });

  it("does not allow a path-echo pseudo-result to prove execution by itself", () => {
    const report = {
      testResults: [{
        name: `/tmp/repo/${reviewedPath}`,
        status: "passed",
        assertionResults: [{
          title: reviewedId,
          fullName: `src/v4/classic/tests/number.test.ts ${reviewedId}`,
          ancestorTitles: ["src/v4/classic/tests/number.test.ts"],
          status: "passed",
        }],
      }],
    };
    expect(proveRunnerMembership(report, [reviewedId], [reviewedPath])).toBe(false);
  });

  it("keeps genuine contradictory reviewed statuses fail-closed", () => {
    const report = {
      testResults: [{
        name: `/tmp/repo/${reviewedPath}`,
        assertionResults: [
          { title: reviewedId, fullName: reviewedId, ancestorTitles: [], status: "failed" },
          { title: reviewedId, fullName: reviewedId, ancestorTitles: [], status: "passed" },
        ],
      }],
    };
    expect(proveReviewedAssertionStatus(report, [reviewedId], [reviewedPath], "failed")).toBe(false);
    expect(proveReviewedAssertionStatus(report, [reviewedId], [reviewedPath], "passed")).toBe(false);
  });
});
'''
if 'describe("T075 Vitest typecheck pseudo-results"' in text:
    raise SystemExit('pseudo-result tests already present')
spec.write_text(text + append)
