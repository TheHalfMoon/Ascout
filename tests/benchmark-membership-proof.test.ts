import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  BenchmarkHarnessError,
  enforceMembershipPolicy,
  membershipProofCommand,
  proveObservedRunnerNoTests,
  proveReviewedAssertionStatus,
  proveRunnerMembership,
} from "../benchmarks/harness-lib.mjs";

describe("T075 structured membership proof command", () => {
  it("proxies the exact reviewed Vitest command without rewriting its argv", () => {
    const proof = membershipProofCommand(
      "pnpm test -- packages/zod/src/v4/classic/tests/number.test.ts",
      "vitest",
      "/tmp/ascout-proof.json",
    );

    expect(proof.file).toBe(process.execPath);
    expect(proof.argv[0]).toMatch(/membership-proxy\.mjs$/);
    expect(proof.argv.slice(1)).toEqual([
      "--kind",
      "vitest",
      "--output",
      "/tmp/ascout-proof.json",
      "--",
      "pnpm",
      "test",
      "--",
      "packages/zod/src/v4/classic/tests/number.test.ts",
    ]);
    expect(proof.env).toEqual({});
  });

  it("preserves reviewed Jest command environment and argv exactly behind the proxy", () => {
    const proof = membershipProofCommand(
      "BRAINTREE_JS_ENV=development ./node_modules/.bin/jest --config=test/venmo/jest.config.json --runInBand test/venmo/unit/venmo.js",
      "jest",
      "/tmp/jest-proof.json",
    );

    expect(proof.file).toBe(process.execPath);
    expect(proof.argv[0]).toMatch(/membership-proxy\.mjs$/);
    expect(proof.argv.slice(1)).toEqual([
      "--kind",
      "jest",
      "--output",
      "/tmp/jest-proof.json",
      "--",
      "./node_modules/.bin/jest",
      "--config=test/venmo/jest.config.json",
      "--runInBand",
      "test/venmo/unit/venmo.js",
    ]);
    expect(proof.env).toEqual({ BRAINTREE_JS_ENV: "development" });
  });

  it("rejects relative proof paths, reviewed reporter overrides, and instrumentation authority collisions", () => {
    expect(() => membershipProofCommand("pnpm test", "vitest", "proof.json")).toThrow(BenchmarkHarnessError);
    expect(() => membershipProofCommand("pnpm test -- --reporter=verbose", "vitest", "/tmp/proof.json")).toThrow(
      /already controls reporter/,
    );
    expect(() => membershipProofCommand("NODE_OPTIONS=--trace-warnings pnpm test", "vitest", "/tmp/proof.json")).toThrow(
      /must not control NODE_OPTIONS/,
    );
    expect(() =>
      membershipProofCommand("ASCOUT_MEMBERSHIP_KIND=jest pnpm test", "vitest", "/tmp/proof.json"),
    ).toThrow(/must not control ASCOUT_MEMBERSHIP_KIND/);
  });
});

describe("T075 structured runner membership evidence", () => {
  const report = {
    testResults: [
      {
        name: "/work/repo/packages/zod/src/v4/classic/tests/number.test.ts",
        assertionResults: [
          {
            title: ".multipleOf() with scientific notation (multi-digit exponents)",
            fullName: "number .multipleOf() with scientific notation (multi-digit exponents)",
            ancestorTitles: ["number"],
            status: "passed",
          },
          {
            title: "skipped evidence is not execution",
            fullName: "number skipped evidence is not execution",
            status: "skipped",
          },
        ],
      },
      {
        name: "/work/repo/tests/other.test.ts",
        assertionResults: [
          {
            title: "duplicate title in an unrelated file",
            fullName: "other duplicate title in an unrelated file",
            status: "passed",
          },
        ],
      },
    ],
  };

  it("proves an exact executed title only from reviewed regression-test paths", () => {
    expect(
      proveRunnerMembership(
        report,
        [".multipleOf() with scientific notation (multi-digit exponents)"],
        ["packages/zod/src/v4/classic/tests/number.test.ts"],
      ),
    ).toBe(true);
  });

  it("accepts an exact fullName when the reviewed id includes suite ancestry", () => {
    expect(
      proveRunnerMembership(
        report,
        ["number .multipleOf() with scientific notation (multi-digit exponents)"],
        ["packages/zod/src/v4/classic/tests/number.test.ts"],
      ),
    ).toBe(true);
  });

  it("accepts exact canonical suite ancestry", () => {
    expect(
      proveRunnerMembership(
        report,
        ["number > .multipleOf() with scientific notation (multi-digit exponents)"],
        ["packages/zod/src/v4/classic/tests/number.test.ts"],
      ),
    ).toBe(true);
  });

  it("does not fuzzy-match canonical suite ancestry", () => {
    expect(
      proveRunnerMembership(
        report,
        ["number > scientific notation (multi-digit exponents)"],
        ["packages/zod/src/v4/classic/tests/number.test.ts"],
      ),
    ).toBe(false);
  });

  it("proves reviewed assertion status independently from unrelated failures", () => {
    const mixed = {
      testResults: [
        {
          name: "/tmp/repo/packages/zod/src/v4/classic/tests/number.test.ts",
          assertionResults: [
            {
              title: ".multipleOf() with scientific notation (multi-digit exponents)",
              fullName: "number .multipleOf() with scientific notation (multi-digit exponents)",
              ancestorTitles: ["number"],
              status: "passed",
            },
            {
              title: "unrelated historical failure",
              fullName: "number unrelated historical failure",
              ancestorTitles: ["number"],
              status: "failed",
            },
          ],
        },
      ],
    };
    expect(
      proveReviewedAssertionStatus(
        mixed,
        ["number > .multipleOf() with scientific notation (multi-digit exponents)"],
        ["packages/zod/src/v4/classic/tests/number.test.ts"],
        "passed",
      ),
    ).toBe(true);
    expect(
      proveReviewedAssertionStatus(
        mixed,
        ["number > .multipleOf() with scientific notation (multi-digit exponents)"],
        ["packages/zod/src/v4/classic/tests/number.test.ts"],
        "failed",
      ),
    ).toBe(false);
  });

  it("rejects contradictory reviewed assertion statuses", () => {
    const contradictory = {
      testResults: [
        {
          name: "/tmp/repo/packages/zod/src/v4/classic/tests/number.test.ts",
          assertionResults: [
            { title: "reviewed", fullName: "suite reviewed", ancestorTitles: ["suite"], status: "passed" },
            { title: "reviewed", fullName: "suite reviewed", ancestorTitles: ["suite"], status: "failed" },
          ],
        },
      ],
    };
    expect(
      proveReviewedAssertionStatus(
        contradictory,
        ["suite > reviewed"],
        ["packages/zod/src/v4/classic/tests/number.test.ts"],
        "passed",
      ),
    ).toBe(false);
  });

  it("injects reporter-only proof flags directly through pnpm exec", () => {
    const output = "/tmp/ascout-membership.json";
    const proof = membershipProofCommand(
      "FOO=bar pnpm --filter @trpc/tests exec vitest run server/errors.test.ts",
      "vitest",
      output,
    );
    expect(proof.file).toBe("pnpm");
    expect(proof.env).toEqual({ FOO: "bar" });
    expect(proof.argv).toEqual([
      "--filter",
      "@trpc/tests",
      "exec",
      "vitest",
      "--reporter=json",
      `--outputFile=${output}`,
      "run",
      "server/errors.test.ts",
    ]);
  });

  it("does not treat skipped or substring titles as execution", () => {
    expect(
      proveRunnerMembership(report, ["skipped evidence is not execution"], ["packages/zod/src/v4/classic/tests/number.test.ts"]),
    ).toBe(false);
    expect(
      proveRunnerMembership(report, ["scientific notation"], ["packages/zod/src/v4/classic/tests/number.test.ts"]),
    ).toBe(false);
  });

  it("returns false instead of accepting a title from an unrelated file", () => {
    expect(proveRunnerMembership(report, ["duplicate title in an unrelated file"], ["tests/a.test.ts"])).toBe(false);
  });

  it("returns false when the reviewed regression-test path is absent", () => {
    expect(proveRunnerMembership(report, ["duplicate title in an unrelated file"], ["tests/missing.test.ts"])).toBe(false);
  });

  it("keeps observed selector misses measurable while required oracle membership remains fail-closed", () => {
    expect(enforceMembershipPolicy("observed", false, "runner-native related selector")).toBe(false);
    expect(enforceMembershipPolicy("observed", true, "runner-native related selector")).toBe(true);
    expect(enforceMembershipPolicy("required", true, "project-native full suite")).toBe(true);
    expect(() => enforceMembershipPolicy("required", false, "project-native full suite")).toThrow(
      /did not prove oracle membership/,
    );
    expect(enforceMembershipPolicy("none", null, "plain project test")).toBeNull();
  });
});

describe("R007-01 observed runner-native no-tests evidence", () => {
  const exactVitestNoTests = {
    policy: "observed",
    runner: "vitest",
    outcome: "exited",
    expectedExitCode: 0,
    exitCode: 0,
    stdout: " RUN  v1.6.1 /tmp/jotai\nNo test files found, exiting with code 0\n",
    stderr: "",
    stdoutTruncated: false,
    stderrTruncated: false,
  } as const;

  it("accepts only the exact reviewed Vitest no-tests outcome for observed membership", () => {
    expect(proveObservedRunnerNoTests(exactVitestNoTests)).toBe(true);
    expect(proveObservedRunnerNoTests({ ...exactVitestNoTests, policy: "required" })).toBe(false);
    expect(proveObservedRunnerNoTests({ ...exactVitestNoTests, runner: "jest" })).toBe(false);
  });

  it("binds an accepted no-tests classification to factual membership=false and explicit runtime evidence", () => {
    const runSource = readFileSync(new URL("../benchmarks/run.mjs", import.meta.url), "utf8");
    const branchStart = runSource.indexOf("if (observedNoTests) {");
    const branchEnd = runSource.indexOf("const boundedOutput", branchStart);
    expect(branchStart).toBeGreaterThan(-1);
    expect(branchEnd).toBeGreaterThan(branchStart);
    const branch = runSource.slice(branchStart, branchEnd);

    expect(branch).toContain("membership: false");
    expect(branch).toContain("reviewed_status: { passed: false, failed: false }");
    expect(branch).toContain("...outputDigest(proof)");
    expect(branch).toContain("report_sha256: null");
    expect(branch).toContain("report_bytes: 0");
    expect(branch).toContain("report_count: 0");
    expect(branch).toContain('evidence_kind: "runner-native-no-tests"');
  });

  it("rejects nonzero, changed, non-exited, or truncated process evidence", () => {
    expect(proveObservedRunnerNoTests({ ...exactVitestNoTests, expectedExitCode: 1 })).toBe(false);
    expect(proveObservedRunnerNoTests({ ...exactVitestNoTests, exitCode: 1 })).toBe(false);
    expect(proveObservedRunnerNoTests({ ...exactVitestNoTests, outcome: "timed_out" })).toBe(false);
    expect(proveObservedRunnerNoTests({ ...exactVitestNoTests, stdoutTruncated: true })).toBe(false);
    expect(proveObservedRunnerNoTests({ ...exactVitestNoTests, stderrTruncated: true })).toBe(false);
  });

  it("rejects ambiguous or altered no-tests signatures", () => {
    expect(proveObservedRunnerNoTests({
      ...exactVitestNoTests,
      stdout: "No test files found, exiting with code 0\nNo test files found, exiting with code 0\n",
    })).toBe(false);
    expect(proveObservedRunnerNoTests({
      ...exactVitestNoTests,
      stdout: "No test files found, exiting with code 1\n",
    })).toBe(false);
  });

  it("rejects exact no-tests text when independent setup or resolution failure evidence is present", () => {
    for (const stderr of [
      "Cannot find module 'vitest'",
      "Failed to load config from vitest.config.ts",
      "ERR_MODULE_NOT_FOUND: missing dependency",
      "ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL",
      "Could not resolve ./setup.ts",
    ]) {
      expect(proveObservedRunnerNoTests({ ...exactVitestNoTests, stderr })).toBe(false);
    }
  });

  it("requires stable comparator and proof source state before no-tests evidence can produce membership=false", () => {
    expect(enforceMembershipPolicy(
      "observed",
      false,
      "runner-native related selector",
      {
        evidence_kind: "runner-native-no-tests",
        source_stability: "stable",
        proof_source_stability: "stable",
      },
    )).toBe(false);

    expect(() => enforceMembershipPolicy(
      "observed",
      false,
      "runner-native related selector",
      {
        evidence_kind: "runner-native-no-tests",
        source_stability: "tree_drifted",
        proof_source_stability: "stable",
      },
    )).toThrow(/requires stable comparator and proof source state/);

    expect(() => enforceMembershipPolicy(
      "observed",
      false,
      "runner-native related selector",
      {
        evidence_kind: "runner-native-no-tests",
        source_stability: "stable",
        proof_source_stability: "tree_drifted",
      },
    )).toThrow(/requires stable comparator and proof source state/);
  });

  it("never allows runner-native no-tests evidence to manufacture membership=true", () => {
    expect(() => enforceMembershipPolicy(
      "observed",
      true,
      "runner-native related selector",
      {
        evidence_kind: "runner-native-no-tests",
        source_stability: "stable",
        proof_source_stability: "stable",
      },
    )).toThrow(/cannot prove membership=true/);
  });

  it("does not alter structured-report observed semantics", () => {
    expect(enforceMembershipPolicy(
      "observed",
      false,
      "runner-native related selector",
      {
        evidence_kind: "runner-json-assertion-results",
        source_stability: "tree_drifted",
        proof_source_stability: "tree_drifted",
      },
    )).toBe(false);
  });
});

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
