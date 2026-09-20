import { describe, expect, it } from "vitest";

import {
  CliUsageError,
  parseCliArgs,
  usageText,
} from "../src/cli.js";
import {
  ASSURANCE_CANONICAL_SERIALIZATION_VERSION,
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

describe("UA-P01-T18-R2 recovery phase closeout sentinel", () => {
  it("preserves the exact version-1 structural contract inventory", () => {
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

  it("preserves fail-closed semantic validation", () => {
    expect(typeof validateAssuranceSemanticGraphV1).toBe("function");
    expect(() => validateAssuranceSemanticGraphV1({})).toThrow(
      "semantic graph contains missing or unknown fields",
    );
  });

  it("preserves version-1 deterministic canonical digest behavior", () => {
    expect(ASSURANCE_CANONICAL_SERIALIZATION_VERSION).toBe(1);

    const first = {
      nested: { z: 2, a: 1 },
      array: ["first", "second"],
    };
    const reordered = {
      array: ["first", "second"],
      nested: { a: 1, z: 2 },
    };

    expect(canonicalAssuranceSha256V1(first)).toBe(
      canonicalAssuranceSha256V1(reordered),
    );
    expect(canonicalAssuranceSha256V1(["first", "second"])).not.toBe(
      canonicalAssuranceSha256V1(["second", "first"]),
    );
  });

  it("preserves the existing check-only public CLI surface", () => {
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
