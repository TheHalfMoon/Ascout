/**
 * UA-P06-T11, grain B — SARIF 2.1.0 export boundary.
 *
 * Exports UA-P06-T04 security observations as SARIF interchange. Every result
 * is `kind: "review"` with `level: "none"`: SARIF consumers can never read an
 * Ascout observation as a pass, a failure, or a severity. Ascout semantics
 * (observation only, not canonical truth, coverage not total, empty export not
 * clean) travel in `properties`. Records that claim more than an observation
 * are refused rather than downgraded.
 */
import { createHash } from "node:crypto";
import { containsSecretMaterialV1, containsExternalAttestationV1 } from "./sentrdel-evidence-normalization.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "./sentrdel-source-pin.js";

export const SENTRDEL_SARIF_EXPORT_AUTHORITY = "UA-P06-T11" as const;
/** Matches the T11A import bound, so every export can be re-imported. */
export const SENTRDEL_SARIF_EXPORT_MAX_OBSERVATIONS = 4_096 as const;

const SHA1 = /^[0-9a-f]{40}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u;
/** Fields whose exact values prove the record never claimed more than an observation. */
const NON_PROMOTED: Readonly<Record<string, unknown>> = Object.freeze({
  schema_version: 1, phase_authority: "UA-P06-T04", authority: "OBSERVATION_ONLY",
  engine_pin: SENTRDEL_PINNED_REVISION, engine_tree: SENTRDEL_PINNED_TREE, assurance_effect: "NONE",
  finding_emitted: false, claim_assessment_emitted: false, global_clean_claimed: false, remediation_verified: false,
});

/** A fresh copy of only the fields the export reads. */
interface Obs {
  readonly observation_id: string; readonly request_id: string; readonly attempt_id: string;
  readonly source_head: string; readonly claim_class: string; readonly capability_id: string;
  readonly execution_state: string; readonly rule_id: string | null; readonly unknown_states: readonly string[];
  readonly location: { readonly state: string; readonly path: string | null; readonly start_line: number | null; readonly end_line: number | null };
  readonly raw_evidence: { readonly digest: string };
  readonly coverage: { readonly state: string };
}

function fail(reason: string): never {
  throw new TypeError(`invalid SARIF export: ${reason}`);
}

function safe(value: string, what: string): string {
  if (containsSecretMaterialV1(value) || containsExternalAttestationV1(value)) {
    fail(`${what} may not contain secrets or self-attestation`);
  }
  return value;
}

/**
 * Read one own data property without invoking accessors. T04 records share
 * frozen sub-objects, so they cannot pass the tree-only snapshot; reading only
 * the exported fields this way gives the same no-getter guarantee.
 */
function own(record: unknown, key: string): unknown {
  if (typeof record !== "object" || record === null) fail(`${key} needs a record`);
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined || !Object.hasOwn(descriptor, "value")) fail(`${key} must be an own data property`);
  return descriptor.value;
}

function list(value: unknown, what: string, max: number): unknown[] {
  if (!Array.isArray(value)) fail(`${what} must be an array`);
  const length = own(value, "length");
  if (!Number.isSafeInteger(length) || (length as number) > max) fail(`${what} must be bounded`);
  return Array.from({ length: length as number }, (_, index) => own(value, String(index)));
}

function text(record: unknown, key: string): string {
  const value = own(record, key);
  if (typeof value !== "string" || !ID.test(value)) fail(`observation ${key} is invalid`);
  return safe(value, key);
}

function line(value: unknown): number | null {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || (value as number) < 1) fail("observation lines must be positive integers");
  return value as number;
}

function checkObservation(raw: unknown): Obs {
  for (const [key, expected] of Object.entries(NON_PROMOTED)) {
    if (own(raw, key) !== expected) fail(`observation ${key} claims more than a pinned T04 observation`);
  }
  const sourceHead = own(raw, "source_head");
  if (typeof sourceHead !== "string" || !SHA1.test(sourceHead)) fail("observation source_head is invalid");
  const ruleRaw = own(raw, "rule_id");
  const coverage = own(raw, "coverage");
  if (own(coverage, "is_total") !== false || own(coverage, "unscanned_is_clean") !== false) fail("observation coverage claims totality");
  const coverageState = own(coverage, "state");
  if (typeof coverageState !== "string" || !ID.test(coverageState)) fail("observation coverage state");
  const unknownStates = list(own(raw, "unknown_states"), "unknown_states", 64);
  if (unknownStates.some(state => typeof state !== "string" || !ID.test(state))) fail("observation unknown_states");
  const location = own(raw, "location");
  const path = own(location, "path");
  if (path !== null && (typeof path !== "string" || path === "" || path.startsWith("/") ||
      path.split("/").some(part => part === "" || part === "..") ||
      /[\\?#%\u0000-\u001f\u007f-\u009f]/u.test(path))) fail("observation location path must be repository-relative");
  const locationState = own(location, "state");
  if (typeof locationState !== "string" || !ID.test(locationState)) fail("observation location state");
  const digest = own(own(raw, "raw_evidence"), "digest");
  if (typeof digest !== "string" || !/^[0-9a-f]{64}$/u.test(digest)) fail("observation raw evidence digest");
  return {
    observation_id: text(raw, "observation_id"), request_id: text(raw, "request_id"), attempt_id: text(raw, "attempt_id"),
    claim_class: text(raw, "claim_class"), capability_id: text(raw, "capability_id"),
    execution_state: text(raw, "execution_state"), source_head: sourceHead,
    rule_id: ruleRaw === null ? null : text(raw, "rule_id"),
    unknown_states: unknownStates as string[],
    location: { state: locationState, path: path === null ? null : safe(path as string, "location path"),
      start_line: line(own(location, "start_line")), end_line: line(own(location, "end_line")) },
    raw_evidence: { digest },
    coverage: { state: coverageState },
  };
}

function sarifLocations(location: Obs["location"]): unknown[] {
  // T04 keeps a path whenever one was produced (PRESENT or PARTIAL); ABSENT has none.
  if (location.path === null) return [];
  const physicalLocation: Record<string, unknown> = { artifactLocation: { uri: location.path } };
  if (location.start_line !== null) {
    const region: Record<string, number> = { startLine: location.start_line };
    if (location.end_line !== null) region["endLine"] = location.end_line;
    physicalLocation["region"] = region;
  }
  return [{ physicalLocation }];
}

function result(obs: Obs) {
  const { location } = obs;
  return {
    ruleId: obs.rule_id ?? `ascout.unresolved-rule.${obs.claim_class}`,
    kind: "review", level: "none",
    message: { text: `Ascout security observation (${obs.claim_class}); not a finding and not canonical truth.` },
    locations: sarifLocations(location),
    properties: {
      ascout_observation_id: obs.observation_id, ascout_claim_class: obs.claim_class,
      ascout_capability_id: obs.capability_id, ascout_execution_state: obs.execution_state,
      ascout_rule_resolved: obs.rule_id !== null, ascout_location_state: location.state,
      ascout_coverage_state: obs.coverage.state, ascout_unknown_states: [...obs.unknown_states],
      ascout_raw_evidence_digest: obs.raw_evidence.digest,
      ascout_authority: "INTERCHANGE_EXPORT_ONLY", ascout_canonical_truth: false,
      ascout_finding: false, ascout_assurance_effect: "NONE",
    },
  };
}

export function exportSentrdelSarifV1(observations: unknown) {
  const raw = list(observations, "observations", SENTRDEL_SARIF_EXPORT_MAX_OBSERVATIONS);
  if (raw.length === 0) fail("export needs a non-empty observation array; absence is NOT_RUN");
  const checked = raw.map(checkObservation);
  const [first] = checked;
  if (first === undefined) fail("export needs at least one observation");
  for (const obs of checked) {
    if (obs.source_head !== first.source_head || obs.request_id !== first.request_id || obs.attempt_id !== first.attempt_id) {
      fail("one SARIF log cannot mix sources, requests, or attempts");
    }
  }
  const ids = checked.map(o => o.observation_id);
  if (new Set(ids).size !== ids.length) fail("observations must be unique");
  // UTF-16 code-unit order keeps the log independent of input order and host locale.
  const ordered = [...checked].sort((a, b) => {
    if (a.observation_id === b.observation_id) return 0;
    return a.observation_id < b.observation_id ? -1 : 1;
  });
  const log = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: { driver: { name: "Ascout", informationUri: "https://github.com/TheHalfMoon/Ascout", rules: [] } },
      results: ordered.map(result),
      properties: {
        ascout_phase_authority: SENTRDEL_SARIF_EXPORT_AUTHORITY, ascout_source_head: first.source_head,
        ascout_request_id: first.request_id, ascout_attempt_id: first.attempt_id,
        ascout_engine_pin: SENTRDEL_PINNED_REVISION, ascout_engine_tree: SENTRDEL_PINNED_TREE,
        ascout_sarif_is_canonical_truth: false, ascout_coverage_total: false, ascout_empty_export_is_clean: false,
        ascout_assurance_effect: "NONE",
      },
    }],
  };
  const sarif_text = JSON.stringify(log);
  return Object.freeze({
    schema_version: 1 as const, phase_authority: SENTRDEL_SARIF_EXPORT_AUTHORITY,
    sarif_text, sarif_digest: createHash("sha256").update(sarif_text, "utf8").digest("hex"),
    result_count: ordered.length, sarif_is_canonical_truth: false as const, assurance_effect: "NONE" as const,
  });
}
