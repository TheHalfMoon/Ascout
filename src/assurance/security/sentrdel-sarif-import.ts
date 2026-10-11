/**
 * UA-P06-T11, grain A — SARIF 2.1.0 import boundary.
 *
 * SARIF is interchange, never canonical truth. Mirrors the pinned Sentrdel
 * `crates/sentrdel-engine/src/adapter.rs` (`adapt_sarif`): every result becomes
 * an INFERENCE-class observation; `level` is kept as reported text and never
 * becomes a severity; result `kind`, suppressions and baseline state are not
 * read, so a SARIF "pass" cannot become a PASS. Raw SARIF text is parsed here
 * (no caller getters or proxies can run) and bound to its evidence digest.
 * Paths are lexical repo-relative claims; unlike the donor, no workspace is
 * consulted, so their existence and symlink safety are NOT verified.
 */
import { createHash } from "node:crypto";
import { snapshotSentrdelObservationDataV1 } from "./sentrdel-observation-snapshot.js";
import { containsSecretMaterialV1, containsExternalAttestationV1 } from "./sentrdel-evidence-normalization.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "./sentrdel-source-pin.js";

export const SENTRDEL_SARIF_IMPORT_AUTHORITY = "UA-P06-T11" as const;
/** Donor caps: MAX_ENGINE_ADAPTER_JSON_BYTES, _RUNS, _ITEMS, LOCATIONS_PER_ITEM, IDENTIFIER/LOCATION/RESULT_TEXT bytes. */
export const SENTRDEL_SARIF_LIMITS = Object.freeze({
  bytes: 8 * 1024 * 1024, runs: 64, results: 4_096, locations: 64,
  identifierBytes: 4_096, locationBytes: 4_096, textBytes: 64 * 1024,
});
const LEVELS = new Set(["none", "note", "warning", "error"]);
const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const BINDING_KEYS = ["schema_version", "source_head", "request_id", "attempt_id", "producer_id",
  "evidence_ref", "evidence_digest", "sarif_text"];
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/u;

export interface SentrdelSarifLocationV1 {
  readonly path: string;
  readonly start_line: number | null;
  readonly start_column: number | null;
  readonly end_line: number | null;
  readonly end_column: number | null;
}

export interface SentrdelSarifObservationV1 {
  readonly observation_id: string;
  readonly rule_id: string;
  readonly tool_name: string;
  readonly tool_version: string | null;
  readonly reported_level: string | null;
  readonly message: string;
  readonly locations: readonly SentrdelSarifLocationV1[];
  readonly epistemic_class: "INFERENCE";
  readonly authority: "INTERCHANGE_IMPORT_ONLY";
  readonly canonical_truth: false;
  readonly severity_derived: false;
  readonly finding_emitted: false;
  readonly path_existence_verified: false;
}

function fail(reason: string): never {
  throw new TypeError(`invalid SARIF import: ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bytes(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function guarded(value: string, what: string): string {
  if (containsSecretMaterialV1(value) || containsExternalAttestationV1(value)) {
    fail(`${what} may not contain secrets or self-attestation`);
  }
  return value;
}

/** Donor validate_identifier: non-empty, unpadded, no control characters, bounded. */
function identifier(value: unknown, what: string): string {
  if (typeof value !== "string" || value === "" || value.trim() !== value || CONTROL.test(value) ||
      bytes(value) > SENTRDEL_SARIF_LIMITS.identifierBytes) fail(`${what} is not a valid identifier`);
  return guarded(value, what);
}

function optionalText(value: unknown, what: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") fail(`${what} must be text`);
  return value.trim() === "" ? undefined : value;
}

/** Donor normalize_repo_relative_path, lexically (no filesystem prefix checks). */
function repoPath(raw: unknown): string {
  if (typeof raw !== "string" || raw === "" || raw.trim() !== raw || CONTROL.test(raw) ||
      bytes(raw) > SENTRDEL_SARIF_LIMITS.locationBytes) fail("location uri is invalid");
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fail("location uri has invalid percent encoding");
  }
  if (CONTROL.test(decoded) || decoded.includes("?") || decoded.includes("#")) fail("location uri is not a plain path");
  const portable = decoded.replaceAll("\\", "/");
  const colon = portable.indexOf(":");
  const slash = portable.indexOf("/");
  const scheme = colon > 0 && (slash === -1 || colon < slash) && /^[A-Za-z][A-Za-z0-9+.-]*$/u.test(portable.slice(0, colon));
  if (portable.startsWith("/") || scheme) fail("location uri must be repository-relative");
  const parts: string[] = [];
  for (const part of portable.split("/")) {
    if (part === "") fail("location uri has an empty component");
    if (part === "..") fail("location uri escapes the repository");
    if (part !== ".") parts.push(part);
  }
  if (parts.length === 0) fail("location uri is empty");
  return guarded(parts.join("/"), "location uri");
}

function position(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || (value as number) < 1) fail("region positions must be positive integers");
  return value as number;
}

function readLocation(raw: unknown): SentrdelSarifLocationV1 {
  const physical = isRecord(raw) ? raw["physicalLocation"] : undefined;
  if (!isRecord(physical)) fail("only physical locations are supported");
  const artifact = physical["artifactLocation"];
  if (!isRecord(artifact)) fail("physical location needs an artifact location");
  if (artifact["uriBaseId"] !== undefined) fail("uriBaseId is not supported");
  const region = physical["region"];
  if (region !== undefined && !isRecord(region)) fail("region must be an object");
  return Object.freeze({
    path: repoPath(artifact["uri"]),
    start_line: position(region?.["startLine"]), start_column: position(region?.["startColumn"]),
    end_line: position(region?.["endLine"]), end_column: position(region?.["endColumn"]),
  });
}

export function importSentrdelSarifV1(input: unknown) {
  const binding = snapshotSentrdelObservationDataV1(input);
  if (!isRecord(binding) || Object.keys(binding).length !== BINDING_KEYS.length ||
      !Object.keys(binding).every(key => BINDING_KEYS.includes(key))) fail("binding keys must match the bounded schema");
  if (binding["schema_version"] !== 1) fail("schema_version must be 1");
  for (const key of ["request_id", "attempt_id", "producer_id", "evidence_ref"]) {
    if (typeof binding[key] !== "string" || !ID.test(binding[key])) fail(`${key} is invalid`);
  }
  if (typeof binding["source_head"] !== "string" || !SHA1.test(binding["source_head"])) fail("source_head must be a Git SHA-1");
  if (typeof binding["evidence_digest"] !== "string" || !SHA256.test(binding["evidence_digest"])) fail("evidence_digest must be SHA-256");
  const text = binding["sarif_text"];
  if (typeof text !== "string" || bytes(text) > SENTRDEL_SARIF_LIMITS.bytes) fail("sarif_text must be bounded text");
  if (createHash("sha256").update(text, "utf8").digest("hex") !== binding["evidence_digest"]) {
    fail("sarif_text does not match evidence_digest");
  }
  let log: unknown;
  try {
    log = JSON.parse(text);
  } catch {
    return fail("sarif_text is malformed JSON");
  }
  if (!isRecord(log) || log["version"] !== "2.1.0") fail("only SARIF version 2.1.0 is supported");
  const runs = log["runs"];
  if (!Array.isArray(runs) || runs.length > SENTRDEL_SARIF_LIMITS.runs) fail("runs must be a bounded array");
  const observations: SentrdelSarifObservationV1[] = [];
  for (const run of runs) {
    const driver = isRecord(run) && isRecord(run["tool"]) ? run["tool"]["driver"] : undefined;
    if (!isRecord(driver)) fail("run needs tool.driver");
    const toolName = identifier(driver["name"], "tool name");
    const version = optionalText(driver["semanticVersion"], "semanticVersion") ?? optionalText(driver["version"], "version");
    const toolVersion = version === undefined ? null : identifier(version, "tool version");
    const results = run["results"] ?? [];
    if (!Array.isArray(results)) fail("results must be an array");
    if (observations.length + results.length > SENTRDEL_SARIF_LIMITS.results) fail("too many results");
    for (const result of results) {
      if (!isRecord(result)) fail("result must be an object");
      const ruleText = optionalText(result["ruleId"], "ruleId");
      if (ruleText === undefined) fail("result is missing a non-empty ruleId");
      const ruleId = identifier(ruleText, "ruleId");
      const message = isRecord(result["message"]) ? result["message"] : fail("result needs a message");
      const body = optionalText(message["text"], "message text") ?? optionalText(message["markdown"], "message markdown");
      if (body === undefined || bytes(body) > SENTRDEL_SARIF_LIMITS.textBytes ||
          /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(body)) fail("result message is missing or invalid");
      const locations = result["locations"] ?? [];
      if (!Array.isArray(locations) || locations.length > SENTRDEL_SARIF_LIMITS.locations) fail("locations must be a bounded array");
      const levelText = optionalText(result["level"], "level");
      if (levelText !== undefined && !LEVELS.has(levelText)) fail("level is not a SARIF 2.1.0 level");
      const fields = { rule_id: ruleId, tool_name: toolName, tool_version: toolVersion,
        reported_level: levelText ?? null, message: guarded(body, "result message"),
        locations: Object.freeze(locations.map(readLocation)) };
      const id = createHash("sha256").update(JSON.stringify([binding["source_head"], binding["evidence_digest"],
        observations.length, fields]), "utf8").digest("hex");
      observations.push(Object.freeze({
        observation_id: `sarif-observation:${id}`, ...fields,
        epistemic_class: "INFERENCE" as const, authority: "INTERCHANGE_IMPORT_ONLY" as const,
        canonical_truth: false as const, severity_derived: false as const,
        finding_emitted: false as const, path_existence_verified: false as const,
      }));
    }
  }
  return Object.freeze({
    schema_version: 1 as const, phase_authority: SENTRDEL_SARIF_IMPORT_AUTHORITY,
    source_head: binding["source_head"], request_id: binding["request_id"], attempt_id: binding["attempt_id"],
    producer_id: binding["producer_id"], evidence_ref: binding["evidence_ref"], evidence_digest: binding["evidence_digest"],
    engine_pin: SENTRDEL_PINNED_REVISION, engine_tree: SENTRDEL_PINNED_TREE,
    observations: Object.freeze(observations),
    empty_import_is_clean: false as const, sarif_is_canonical_truth: false as const,
    assurance_effect: "NONE" as const, findings_emitted: false as const,
  });
}
