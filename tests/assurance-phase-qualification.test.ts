import { describe, expect, it } from "vitest";

import {
  CliUsageError,
  parseCliArgs,
  usageText,
} from "../src/cli.js";
import {
  ASSURANCE_CANONICAL_SERIALIZATION_VERSION,
  canonicalAssuranceJsonV1,
  canonicalAssuranceSha256V1,
} from "../src/assurance/contracts/canonical-serialization.js";
import { validateAssuranceSemanticGraphV1 } from "../src/assurance/contracts/semantic-validator.js";
import {
  ASSURANCE_STRUCTURAL_SCHEMA_KINDS,
  ASSURANCE_STRUCTURAL_SCHEMA_REGISTRY_V1,
  ASSURANCE_STRUCTURAL_SCHEMA_REGISTRY_VERSION,
} from "../src/assurance/contracts/structural-schema.js";

const EXPECTED_CONTRACT_KINDS = [
  "ASSURANCE_TARGET",
  "ASSURANCE_INTENT",
  "ASSURANCE_POLICY_SNAPSHOT",
  "ASSURANCE_PLAN",
  "ENGINE_DESCRIPTOR",
  "ENGINE_QUALIFICATION",
  "ENGINE_RUN",
  "EVIDENCE_REF",
  "FINDING",
  "FINDING_LIFECYCLE_EVENT",
  "COVERAGE_CLAIM",
  "OMISSION_RECORD",
  "CONTRADICTION_RECORD",
  "CLAIM_ASSESSMENT",
] as const;

const EXPECTED_USAGE = [
  "Usage:",
  "  ascout init",
  "  ascout doctor",
  "  ascout check [--allow-changed-command-surface] [--format json|agent]",
].join("\n");

describe("UA-P01-T18 exact-head phase qualification sentinel", () => {
  it("freezes the complete version-1 structural contract registry", () => {
    expect(ASSURANCE_STRUCTURAL_SCHEMA_REGISTRY_VERSION).toBe(1);
    expect(ASSURANCE_STRUCTURAL_SCHEMA_KINDS).toEqual(
      EXPECTED_CONTRACT_KINDS,
    );
    expect(ASSURANCE_STRUCTURAL_SCHEMA_REGISTRY_V1).toEqual(
      EXPECTED_CONTRACT_KINDS.map((contractKind) => ({
        contract_kind: contractKind,
        supported_schema_versions: [1],
      })),
    );
  });

  it("keeps the semantic graph validator present and fail-closed", () => {
    expect(typeof validateAssuranceSemanticGraphV1).toBe("function");
    expect(() => validateAssuranceSemanticGraphV1({})).toThrow(
      "semantic graph contains missing or unknown fields",
    );
  });

  it("keeps canonical serialization versioned and deterministic", () => {
    expect(ASSURANCE_CANONICAL_SERIALIZATION_VERSION).toBe(1);

    const first = {
      z: [3, 2, 1],
      nested: { b: 2, a: 1 },
      a: true,
    };
    const second = {
      a: true,
      nested: { a: 1, b: 2 },
      z: [3, 2, 1],
    };

    expect(canonicalAssuranceJsonV1(first)).toBe(
      canonicalAssuranceJsonV1(second),
    );
    expect(canonicalAssuranceSha256V1(first)).toBe(
      canonicalAssuranceSha256V1(second),
    );
    expect(canonicalAssuranceSha256V1(["a", "b"])).not.toBe(
      canonicalAssuranceSha256V1(["b", "a"]),
    );
  });

  it("preserves the existing check-only public compatibility surface", () => {
    expect(usageText()).toBe(EXPECTED_USAGE);
    expect(parseCliArgs(["check"])).toEqual({
      command: "check",
      allowChangedCommandSurface: false,
    });

    for (const command of ["review", "test", "security", "cyber", "assure"]) {
      expect(() => parseCliArgs([command])).toThrow(CliUsageError);
    }
  });
});
