import { describe, expect, it } from "vitest";

import {
  BenchmarkHarnessError,
  assertControllerSecretsAbsent,
  attestSourceStability,
  filterAscoutRuntimeUntrackedStatus,
  canonicalJson,
  classifyLcov,
  extractGapCommands,
  extractSelectionCommands,
  frozenInstallCommand,
  observationsDeterministic,
  parseRestrictedCommand,
  sanitizedDonorEnvironment,
  validateReplayCase,
} from "../benchmarks/harness-lib.mjs";

function selectionCase() {
  return {
    case_id: "selection-case",
    case_revision: 1,
    case_class: "selection",
    lifecycle_state: "CASE_REVIEWED",
    paths: { production: ["src/a.ts"], regression_tests: ["tests/a.test.ts"] },
    reconstruction: { derived_identity: { expected_digest: null } },
    runtime: { package_manager: "pnpm" },
    oracle: {
      observation: null,
      specification: {
        regression_test_ids: ["does the thing"],
        ground_truth_procedure: [
          "Pinned T075 project-native command contract from exact metadata: targeted regression-file command = `pnpm test -- tests/a.test.ts`; project-native full-suite/reference command = `pnpm test`; plain-project test comparator = `pnpm test`; runner-native related selector = `pnpm exec vitest related src/a.ts --run`. T075 must additionally prove execution.",
        ],
      },
    },
  };
}

function gapCase() {
  return {
    case_id: "gap-case",
    case_revision: 1,
    case_class: "gap",
    lifecycle_state: "CASE_REVIEWED",
    paths: { production: ["src/a.ts"], regression_tests: ["tests/a.test.ts"] },
    reconstruction: { derived_identity: { expected_digest: null } },
    runtime: { package_manager: "npm" },
    oracle: {
      observation: null,
      specification: {
        regression_test_ids: ["does the gap thing"],
        ground_truth_procedure: [
          "Pinned T075 targeted oracle command: `npm test -- tests/a.test.ts`. Pinned project-native reference command: `npm test`.",
        ],
        coverage_oracle: {
          full_test_coverage_command: "NODE_ENV=test ./node_modules/.bin/jest --coverage",
          project_native_reference_command: "npm test",
          artifact: { format: "lcov", path: "coverage/lcov.info" },
          artifact_digest_algorithm: "sha256",
          mapping: {},
          freeze_before_ascout: true,
        },
      },
    },
  };
}

describe("T075 restricted command contract", () => {
  it("turns a reviewed command into argv and leading environment without a shell", () => {
    expect(parseRestrictedCommand("BRAINTREE_JS_ENV=development ./node_modules/.bin/jest --config=jest.config.json --runInBand")).toEqual({
      file: "./node_modules/.bin/jest",
      argv: ["--config=jest.config.json", "--runInBand"],
      env: { BRAINTREE_JS_ENV: "development" },
    });
  });

  it.each([
    "npm test && curl example.com",
    "npm test | tee out",
    "npm test; echo hidden",
    "npm test $(whoami)",
    "../tool --flag",
    "/tmp/tool --flag",
  ])("rejects shell or path authority: %s", (command) => {
    expect(() => parseRestrictedCommand(command)).toThrow(BenchmarkHarnessError);
  });

  it("extracts the canonical selection and gap command contracts exactly once", () => {
    expect(extractSelectionCommands(selectionCase())).toEqual({
      targeted: "pnpm test -- tests/a.test.ts",
      full: "pnpm test",
      plain: "pnpm test",
      related: "pnpm exec vitest related src/a.ts --run",
    });
    expect(extractGapCommands(gapCase())).toEqual({
      targeted: "npm test -- tests/a.test.ts",
      reference: "npm test",
      fullCoverage: "NODE_ENV=test ./node_modules/.bin/jest --coverage",
      nativeCoverage: "npm test",
      artifact: "coverage/lcov.info",
    });

    const noTestReference = gapCase();
    noTestReference.oracle.specification.ground_truth_procedure = [
      "Pinned T075 targeted oracle command: `npm test -- tests/a.test.ts`. T075 must prove execution.",
    ];
    expect(extractGapCommands(noTestReference)).toEqual({
      targeted: "npm test -- tests/a.test.ts",
      reference: null,
      fullCoverage: "NODE_ENV=test ./node_modules/.bin/jest --coverage",
      nativeCoverage: "npm test",
      artifact: "coverage/lcov.info",
    });
  });
});

describe("T075 donor isolation contract", () => {
  it("constructs an allowlisted donor environment instead of inheriting process.env", () => {
    const env = sanitizedDonorEnvironment({
      pathValue: "/toolchain/bin:/usr/bin",
      home: "/tmp/home",
      temp: "/tmp/work",
      commandEnv: { NODE_ENV: "test" },
    });
    expect(env).toMatchObject({
      PATH: "/toolchain/bin:/usr/bin",
      HOME: "/tmp/home",
      TMPDIR: "/tmp/work",
      CI: "true",
      GIT_TERMINAL_PROMPT: "0",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
      NODE_ENV: "test",
    });
    expect(env).not.toHaveProperty("GITHUB_TOKEN");
    expect(() => assertControllerSecretsAbsent(env)).not.toThrow();
  });

  it.each(["PATH", "HOME", "TMPDIR", "GIT_CONFIG_GLOBAL", "NODE_OPTIONS", "XDG_CACHE_HOME", "npm_config_cache"])(
    "rejects reviewed command overrides of protected isolation environment: %s",
    (name) => {
      expect(() => sanitizedDonorEnvironment({
        pathValue: "/toolchain/bin:/usr/bin",
        home: "/tmp/home",
        temp: "/tmp/work",
        commandEnv: { [name]: "override" },
      })).toThrowError(/protected isolation environment/);
    },
  );

  it("fails if a forbidden credential name reaches a donor environment", () => {
    expect(() => assertControllerSecretsAbsent({ PATH: "/bin", GITHUB_TOKEN: "secret" })).toThrowError(/forbidden names/);
  });

  it("uses frozen installs and suppresses package install scripts by default", () => {
    expect(frozenInstallCommand({ package_manager: "npm" })).toEqual({ file: "npm", argv: ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], env: {} });
    expect(frozenInstallCommand({ package_manager: "pnpm" })).toEqual({ file: "pnpm", argv: ["install", "--frozen-lockfile", "--ignore-scripts"], env: {} });
    expect(frozenInstallCommand({ package_manager: "yarn" })).toEqual({ file: "yarn", argv: ["install", "--frozen-lockfile", "--ignore-scripts", "--non-interactive"], env: {} });
  });
});

describe("T075 independent LCOV oracle", () => {
  it("classifies only reviewed changed lines and fails closed on missing evidence", () => {
    const lcov = [
      "TN:",
      "SF:/repo/src/a.ts",
      "DA:10,3",
      "DA:11,0",
      "end_of_record",
      "",
    ].join("\n");
    expect(classifyLcov(lcov, [
      { path: "src/a.ts", line: 10 },
      { path: "src/a.ts", line: 11 },
      { path: "src/a.ts", line: 12 },
    ])).toEqual([
      { path: "src/a.ts", line: 10, classification: "EXERCISED", hits: 3, reason: null },
      { path: "src/a.ts", line: 11, classification: "NOT_EXERCISED", hits: 0, reason: null },
      { path: "src/a.ts", line: 12, classification: "UNRESOLVED", hits: null, reason: "line_missing" },
    ]);
  });

  it("marks ambiguous source identities unresolved instead of guessing", () => {
    const lcov = [
      "SF:/one/src/a.ts",
      "DA:10,1",
      "end_of_record",
      "SF:/two/src/a.ts",
      "DA:10,1",
      "end_of_record",
    ].join("\n");
    expect(classifyLcov(lcov, [{ path: "src/a.ts", line: 10 }])).toEqual([
      { path: "src/a.ts", line: 10, classification: "UNRESOLVED", hits: null, reason: "source_ambiguous" },
    ]);
  });
});

describe("T075 observation semantics", () => {
  it("requires at least two equivalent semantic observations for determinism", () => {
    const observation = {
      reconstruction: { tree: "abc" },
      pre_fix_oracle: { status: "failed_as_expected" },
      fixed_oracle: { status: "passed" },
      full_reference: { status: "passed" },
      related: { status: "passed" },
      ascout: { exit_code: 0 },
    };
    expect(observationsDeterministic([observation])).toBe("unknown");
    expect(observationsDeterministic([observation, structuredClone(observation)])).toBe("deterministic");
    expect(observationsDeterministic([observation, { ...observation, ascout: { exit_code: 4 } }])).toBe("nondeterministic");
  });

  it("attests reported source stability against independent Git-state digests", () => {
    expect(attestSourceStability("same", "same", "stable")).toBe("stable");
    expect(attestSourceStability("before", "after", "tree_drifted")).toBe("tree_drifted");
    expect(() => attestSourceStability("before", "after", "stable")).toThrowError(/independent Git state is tree_drifted/);
    expect(() => attestSourceStability("same", "same", "tree_drifted")).toThrowError(/independent Git state is stable/);
  });

  it("excludes only untracked Ascout runtime records from independent source status", () => {
    const raw = Buffer.from(
      " M src/a.ts\0?? .ascout/runs/1/receipt.json\0?? .ascout\0?? notes.txt\0 M .ascout/tracked.txt\0",
      "utf8",
    );
    expect(filterAscoutRuntimeUntrackedStatus(raw).toString("utf8")).toBe(
      " M src/a.ts\0?? notes.txt\0 M .ascout/tracked.txt\0",
    );
    expect(() => filterAscoutRuntimeUntrackedStatus(Buffer.from("?? .ascout/file", "utf8"))).toThrowError(/NUL-terminated/);
  });

  it("canonicalizes evidence objects independently of insertion order", () => {
    expect(canonicalJson({ b: 2, a: { z: 1, y: 0 } })).toBe(canonicalJson({ a: { y: 0, z: 1 }, b: 2 }));
  });

  it("treats raw coverage artifact bytes as evidence while comparing semantic gap classifications", () => {
    const base = {
      reconstruction: { tree: "abc" },
      pre_fix_oracle: { status: "failed_as_expected" },
      fixed_oracle: { status: "passed" },
      full_reference: { status: "failed" },
      related: { status: "not_applicable" },
      ascout: { exit_code: 4 },
      gap_coverage: {
        artifact_sha256: "a".repeat(64),
        classifications: [{ path: "src/a.ts", line: 10, classification: "EXERCISED", hits: 1, reason: null }],
      },
    };
    const rawArtifactChanged = structuredClone(base);
    rawArtifactChanged.gap_coverage.artifact_sha256 = "b".repeat(64);
    expect(observationsDeterministic([base, rawArtifactChanged])).toBe("deterministic");

    const semanticClassificationChanged = structuredClone(base);
    semanticClassificationChanged.gap_coverage.classifications[0] = { path: "src/a.ts", line: 10, classification: "NOT_EXERCISED", hits: 0, reason: null };
    expect(observationsDeterministic([base, semanticClassificationChanged])).toBe("nondeterministic");
  });

  it("accepts only CASE_REVIEWED cases with unobserved replay identities", () => {
    expect(validateReplayCase(selectionCase())).toBe(true);
    expect(validateReplayCase(gapCase())).toBe(true);
    const observed = gapCase();
    observed.oracle.observation = { status: "BENCHMARK_ACTIVE" };
    expect(() => validateReplayCase(observed)).toThrowError(/already has an oracle observation/);
  });
});
