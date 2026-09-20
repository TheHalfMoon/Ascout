import { isDeepStrictEqual } from "node:util";

import {
  parseAssuranceTargetV1,
  type AssuranceTargetV1,
} from "./target.js";

export const COVERAGE_CLAIM_SCHEMA_VERSION = 1 as const;

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const STATE_ID = /^[A-Z][A-Z0-9_]{0,95}$/u;
const MAX_LIST_ITEMS = 512;
const MAX_TEXT_LENGTH = 512;

export const FROZEN_MINIMUM_COVERAGE_DIMENSIONS = [
  "CHANGED_FILES_SYMBOLS_REVIEWED",
  "LOGICAL_REVIEW_GROUPS",
  "LANGUAGES_ECOSYSTEMS",
  "RULES_CHECK_CLASSES",
  "TESTS_SELECTED_EXECUTED",
  "CHANGED_LINE_BRANCH_FUNCTION_EXERCISE",
  "MUTATION_ATTEMPTS_KILLS_SURVIVORS",
  "PROPERTY_FUZZ_SPACE_COUNTEREXAMPLES",
  "BROWSER_JOURNEYS_ORACLES",
  "API_SERVICE_JOURNEYS",
  "REAL_APP_DESKTOP_JOURNEYS",
  "INSTALL_UPGRADE_RECOVERY_JOURNEYS",
  "SAST_SECRETS_SCA_SBOM_IAC_CI",
  "REACHABILITY_SECURITY_INVARIANTS",
  "THREAT_MODEL_ASSETS_BOUNDARIES",
  "PLATFORM_RUNTIME_BROWSER_MATRIX",
  "DYNAMIC_ENDPOINTS_AUTHORIZED_EXERCISED",
  "UNSUPPORTED_UNREADABLE_OPAQUE_SCOPE",
  "REVIEWER_ENGINE_INDEPENDENCE",
] as const;

export type FrozenMinimumCoverageDimensionIdV1 =
  (typeof FROZEN_MINIMUM_COVERAGE_DIMENSIONS)[number];

export const COVERAGE_DIMENSION_STATES = [
  "OBSERVED",
  "PARTIAL",
  "UNKNOWN",
  "UNSUPPORTED",
  "UNOBSERVED",
] as const;

export type CoverageDimensionStateV1 =
  (typeof COVERAGE_DIMENSION_STATES)[number];

export interface CoverageDimensionV1 {
  readonly dimension_id: string;
  readonly state: CoverageDimensionStateV1;
  readonly scope_refs: readonly string[];
  readonly evidence_refs: readonly string[];
  readonly limitations: readonly string[];
}

export interface CoverageClaimV1 {
  readonly schema_version: 1;
  readonly coverage_claim_id: string;
  readonly target_id: string;
  readonly run_ids: readonly string[];
  readonly dimensions: readonly CoverageDimensionV1[];
}

export type CoverageClaimInputV1 = Omit<CoverageClaimV1, "schema_version">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(field + " must be an object");
  return value;
}

function requireExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  field: string,
): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (!isDeepStrictEqual(actual, wanted)) {
    throw new TypeError(field + " contains missing or unknown fields");
  }
}

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be a bounded opaque identifier");
  }
  return value;
}

function requireDimensionId(value: unknown, field: string): string {
  if (typeof value !== "string" || !STATE_ID.test(value)) {
    throw new TypeError(field + " must be a bounded uppercase dimension identifier");
  }
  return value;
}

function requireCoverageState(
  value: unknown,
  field: string,
): CoverageDimensionStateV1 {
  if (
    typeof value !== "string" ||
    !(COVERAGE_DIMENSION_STATES as readonly string[]).includes(value)
  ) {
    throw new TypeError(
      field +
        " must be OBSERVED, PARTIAL, UNKNOWN, UNSUPPORTED, or UNOBSERVED",
    );
  }
  return value as CoverageDimensionStateV1;
}

function requireBoundedText(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > MAX_TEXT_LENGTH ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    throw new TypeError(field + " must be bounded non-empty single-line text");
  }
  return value;
}

function normalizeOpaqueIds(
  values: readonly string[],
  field: string,
): readonly string[] {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = values.map((value, index) =>
    requireOpaqueId(value, field + "[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
}

function parseCanonicalOpaqueIds(
  value: unknown,
  field: string,
): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = value.map((entry, index) =>
    requireOpaqueId(entry, field + "[" + index + "]"),
  );
  const canonical = [...new Set(parsed)].sort();
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError(field + " must be unique and canonically sorted");
  }
  return parsed;
}

function normalizeTextList(
  values: readonly string[],
  field: string,
): readonly string[] {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = values.map((value, index) =>
    requireBoundedText(value, field + "[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
}

function parseCanonicalTextList(
  value: unknown,
  field: string,
): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = value.map((entry, index) =>
    requireBoundedText(entry, field + "[" + index + "]"),
  );
  const canonical = [...new Set(parsed)].sort();
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError(field + " must be unique and canonically sorted");
  }
  return parsed;
}

function assertDimensionSemantics(dimension: CoverageDimensionV1): void {
  if (
    dimension.state === "UNKNOWN" ||
    dimension.state === "UNSUPPORTED" ||
    dimension.state === "UNOBSERVED"
  ) {
    if (dimension.scope_refs.length !== 0) {
      throw new TypeError(
        dimension.dimension_id +
          " cannot declare observed scope refs while state is " +
          dimension.state,
      );
    }
    if (dimension.limitations.length === 0) {
      throw new TypeError(
        dimension.dimension_id +
          " must explain " +
          dimension.state +
          " with at least one limitation",
      );
    }
    return;
  }

  if (dimension.scope_refs.length === 0) {
    throw new TypeError(
      dimension.dimension_id +
        " must declare at least one observed scope ref for " +
        dimension.state,
    );
  }
  if (dimension.evidence_refs.length === 0) {
    throw new TypeError(
      dimension.dimension_id +
        " must declare at least one evidence ref for " +
        dimension.state,
    );
  }
  if (dimension.state === "PARTIAL" && dimension.limitations.length === 0) {
    throw new TypeError(
      dimension.dimension_id + " PARTIAL coverage requires limitations",
    );
  }
}

function parseDimension(value: unknown, field: string): CoverageDimensionV1 {
  const record = requireRecord(value, field);
  requireExactKeys(
    record,
    ["dimension_id", "state", "scope_refs", "evidence_refs", "limitations"],
    field,
  );

  const dimension: CoverageDimensionV1 = {
    dimension_id: requireDimensionId(record.dimension_id, field + ".dimension_id"),
    state: requireCoverageState(record.state, field + ".state"),
    scope_refs: parseCanonicalOpaqueIds(record.scope_refs, field + ".scope_refs"),
    evidence_refs: parseCanonicalOpaqueIds(
      record.evidence_refs,
      field + ".evidence_refs",
    ),
    limitations: parseCanonicalTextList(record.limitations, field + ".limitations"),
  };
  assertDimensionSemantics(dimension);
  return dimension;
}

function normalizeDimension(
  value: CoverageDimensionV1,
  field: string,
): CoverageDimensionV1 {
  const dimension: CoverageDimensionV1 = {
    dimension_id: requireDimensionId(value.dimension_id, field + ".dimension_id"),
    state: requireCoverageState(value.state, field + ".state"),
    scope_refs: normalizeOpaqueIds(value.scope_refs, field + ".scope_refs"),
    evidence_refs: normalizeOpaqueIds(
      value.evidence_refs,
      field + ".evidence_refs",
    ),
    limitations: normalizeTextList(value.limitations, field + ".limitations"),
  };
  assertDimensionSemantics(dimension);
  return dimension;
}

function assertFrozenMinimumDimensions(
  dimensions: readonly CoverageDimensionV1[],
): void {
  const ids = new Set(dimensions.map((dimension) => dimension.dimension_id));
  const missing = FROZEN_MINIMUM_COVERAGE_DIMENSIONS.filter(
    (dimensionId) => !ids.has(dimensionId),
  );
  if (missing.length > 0) {
    throw new TypeError(
      "coverage claim is missing frozen minimum dimensions: " + missing.join(","),
    );
  }
}

function parseDimensions(value: unknown): readonly CoverageDimensionV1[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    throw new TypeError(
      "dimensions must contain at most " + MAX_LIST_ITEMS + " items",
    );
  }
  const parsed = value.map((entry, index) =>
    parseDimension(entry, "dimensions[" + index + "]"),
  );
  const ids = parsed.map((dimension) => dimension.dimension_id);
  if (new Set(ids).size !== ids.length) {
    throw new TypeError("dimensions must contain unique dimension_id values");
  }
  const sorted = [...parsed].sort((a, b) =>
    a.dimension_id < b.dimension_id ? -1 : a.dimension_id > b.dimension_id ? 1 : 0,
  );
  if (!isDeepStrictEqual(parsed, sorted)) {
    throw new TypeError("dimensions must be canonically sorted by dimension_id");
  }
  assertFrozenMinimumDimensions(parsed);
  return parsed;
}

function normalizeDimensions(
  values: readonly CoverageDimensionV1[],
): readonly CoverageDimensionV1[] {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS) {
    throw new TypeError(
      "dimensions must contain at most " + MAX_LIST_ITEMS + " items",
    );
  }
  const parsed = values.map((entry, index) =>
    normalizeDimension(entry, "dimensions[" + index + "]"),
  );
  const ids = parsed.map((dimension) => dimension.dimension_id);
  if (new Set(ids).size !== ids.length) {
    throw new TypeError("dimensions must contain unique dimension_id values");
  }
  const sorted = [...parsed].sort((a, b) =>
    a.dimension_id < b.dimension_id ? -1 : a.dimension_id > b.dimension_id ? 1 : 0,
  );
  assertFrozenMinimumDimensions(sorted);
  return sorted;
}

export function parseCoverageClaimV1(value: unknown): CoverageClaimV1 {
  const record = requireRecord(value, "coverage claim");
  requireExactKeys(
    record,
    [
      "schema_version",
      "coverage_claim_id",
      "target_id",
      "run_ids",
      "dimensions",
    ],
    "coverage claim",
  );

  if (record.schema_version !== COVERAGE_CLAIM_SCHEMA_VERSION) {
    throw new TypeError("coverage claim schema_version must equal 1");
  }

  return {
    schema_version: COVERAGE_CLAIM_SCHEMA_VERSION,
    coverage_claim_id: requireOpaqueId(
      record.coverage_claim_id,
      "coverage_claim_id",
    ),
    target_id: requireOpaqueId(record.target_id, "target_id"),
    run_ids: parseCanonicalOpaqueIds(record.run_ids, "run_ids"),
    dimensions: parseDimensions(record.dimensions),
  };
}

export function createCoverageClaimV1(
  input: CoverageClaimInputV1,
): CoverageClaimV1 {
  return parseCoverageClaimV1({
    schema_version: COVERAGE_CLAIM_SCHEMA_VERSION,
    coverage_claim_id: input.coverage_claim_id,
    target_id: input.target_id,
    run_ids: normalizeOpaqueIds(input.run_ids, "run_ids"),
    dimensions: normalizeDimensions(input.dimensions),
  });
}

export interface CoverageResolutionContextV1 {
  readonly target: AssuranceTargetV1;
  readonly available_run_ids: readonly string[];
  readonly available_evidence_ids: readonly string[];
}

export function assertCoverageClaimResolvesV1(
  claim: unknown,
  context: CoverageResolutionContextV1,
): void {
  const parsedClaim = parseCoverageClaimV1(claim);
  const parsedTarget = parseAssuranceTargetV1(context.target);
  const availableRunIds = new Set(
    normalizeOpaqueIds(context.available_run_ids, "available_run_ids"),
  );
  const availableEvidenceIds = new Set(
    normalizeOpaqueIds(
      context.available_evidence_ids,
      "available_evidence_ids",
    ),
  );

  if (parsedClaim.target_id !== parsedTarget.target_id) {
    throw new TypeError(
      "coverage claim target_id does not match AssuranceTarget",
    );
  }

  for (const runId of parsedClaim.run_ids) {
    if (!availableRunIds.has(runId)) {
      throw new TypeError("coverage claim contains dangling run id: " + runId);
    }
  }

  for (const dimension of parsedClaim.dimensions) {
    for (const evidenceRef of dimension.evidence_refs) {
      if (!availableEvidenceIds.has(evidenceRef)) {
        throw new TypeError(
          dimension.dimension_id +
            " contains dangling evidence ref: " +
            evidenceRef,
        );
      }
    }
  }
}

export function getCoverageDimensionV1(
  claim: unknown,
  dimensionId: string,
): CoverageDimensionV1 {
  const parsedClaim = parseCoverageClaimV1(claim);
  const parsedDimensionId = requireDimensionId(dimensionId, "dimension_id");
  const dimension = parsedClaim.dimensions.find(
    (entry) => entry.dimension_id === parsedDimensionId,
  );
  if (!dimension) {
    throw new TypeError(
      "coverage claim does not contain dimension: " + parsedDimensionId,
    );
  }
  return dimension;
}

export function isCoverageDimensionObservedV1(
  dimension: unknown,
): boolean {
  const parsed = parseDimension(dimension, "dimension");
  return parsed.state === "OBSERVED";
}
