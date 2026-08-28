import { describe, expect, it } from "vitest";

import {
  BenchmarkHarnessError,
  membershipProofCommand,
  proveRunnerMembership,
} from "../benchmarks/harness-lib.mjs";

describe("T075 structured membership proof command", () => {
  it("writes Vitest JSON evidence outside the donor command surface", () => {
    expect(
      membershipProofCommand(
        "pnpm test -- packages/zod/src/v4/classic/tests/number.test.ts",
        "vitest",
        "/tmp/ascout-proof.json",
      ),
    ).toEqual({
      file: "pnpm",
      argv: [
        "test",
        "--",
        "packages/zod/src/v4/classic/tests/number.test.ts",
        "--reporter=json",
        "--outputFile=/tmp/ascout-proof.json",
      ],
      env: {},
    });
  });

  it("uses Jest JSON output without a shell", () => {
    expect(membershipProofCommand("npm test -- tests/a.test.ts", "jest", "/tmp/jest-proof.json")).toEqual({
      file: "npm",
      argv: ["test", "--", "tests/a.test.ts", "--json", "--outputFile=/tmp/jest-proof.json"],
      env: {},
    });
  });

  it("rejects relative proof paths and reviewed reporter overrides", () => {
    expect(() => membershipProofCommand("pnpm test", "vitest", "proof.json")).toThrow(BenchmarkHarnessError);
    expect(() => membershipProofCommand("pnpm test -- --reporter=verbose", "vitest", "/tmp/proof.json")).toThrow(
      /already controls reporter/,
    );
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

  it("does not treat skipped, substring, or unrelated-file titles as execution", () => {
    expect(
      proveRunnerMembership(report, ["skipped evidence is not execution"], ["packages/zod/src/v4/classic/tests/number.test.ts"]),
    ).toBe(false);
    expect(
      proveRunnerMembership(report, ["scientific notation"], ["packages/zod/src/v4/classic/tests/number.test.ts"]),
    ).toBe(false);
    expect(proveRunnerMembership(report, ["duplicate title in an unrelated file"], ["tests/a.test.ts"])).toBe(false);
  });

  it("fails closed when no reviewed regression-test path exists in the report", () => {
    expect(() => proveRunnerMembership(report, ["duplicate title in an unrelated file"], ["tests/missing.test.ts"])).toThrow(
      /no reviewed regression-test path/,
    );
  });
});
