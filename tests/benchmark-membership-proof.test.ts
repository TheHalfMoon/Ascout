import { describe, expect, it } from "vitest";

import {
  BenchmarkHarnessError,
  membershipProofCommand,
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

  it("does not treat skipped or substring titles as execution", () => {
    expect(
      proveRunnerMembership(report, ["skipped evidence is not execution"], ["packages/zod/src/v4/classic/tests/number.test.ts"]),
    ).toBe(false);
    expect(
      proveRunnerMembership(report, ["scientific notation"], ["packages/zod/src/v4/classic/tests/number.test.ts"]),
    ).toBe(false);
  });

  it("fails closed instead of accepting a title from an unrelated file", () => {
    expect(() => proveRunnerMembership(report, ["duplicate title in an unrelated file"], ["tests/a.test.ts"])).toThrow(
      /no reviewed regression-test path/,
    );
  });

  it("fails closed when no reviewed regression-test path exists in the report", () => {
    expect(() => proveRunnerMembership(report, ["duplicate title in an unrelated file"], ["tests/missing.test.ts"])).toThrow(
      /no reviewed regression-test path/,
    );
  });
});
