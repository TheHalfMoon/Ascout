/**
 * UA-P06-T09, grain B: evidence-bound static CI/MCP/Supabase presence.
 *
 * Exact source: pinned Sentrdel config_detection.rs. This is inventory data
 * only. No config contents, dynamic workflow, CI execution, credentials,
 * remote MCP service, or hosted security posture are inspected.
 */
import { createHash } from "node:crypto";
import { snapshotSentrdelObservationDataV1 } from "./sentrdel-observation-snapshot.js";
import {
  buildSentrdelCapabilitiesV1,
  getSentrdelCapabilityV1,
} from "./sentrdel-capability-characterization.js";
import { SENTRDEL_ENGINE_ID, SENTRDEL_ENGINE_VERSION } from "./sentrdel-engine-boundary.js";
import { containsSecretMaterialV1, containsExternalAttestationV1 } from "./sentrdel-evidence-normalization.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE, SENTRDEL_PIN_REF } from "./sentrdel-source-pin.js";

export const SENTRDEL_CONFIG_PRESENCE_AUTHORITY = "UA-P06-T09" as const;
export const SENTRDEL_CONFIG_PRESENCE_CAPABILITY = "config-inspection" as const;
export const SENTRDEL_CONFIG_PRESENCE_SIGNALS = [
  "github-actions", "gitlab-ci", "azure-pipelines", "jenkins", "circleci",
  "mcp-json", "cursor-mcp", "vscode-mcp", "claude-mcp",
  "supabase-config", "supabase-seed", "supabase-migration", "supabase-function",
] as const;
export type SentrdelPresenceSignalV1 = (typeof SENTRDEL_CONFIG_PRESENCE_SIGNALS)[number];
const SIGNAL_SET = new Set<string>(SENTRDEL_CONFIG_PRESENCE_SIGNALS);
const CAPABILITY = getSentrdelCapabilityV1(buildSentrdelCapabilitiesV1(), "config-inspection");
const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const PATH = /^[A-Za-z0-9._/-]{1,4096}$/u;
const EXACT_KEYS = [
  "schema_version", "request_id", "attempt_id", "source_head", "engine_id",
  "engine_pin", "engine_tree", "engine_version", "capability_id",
  "path", "signal", "producer_id", "evidence_ref", "evidence_digest",
] as const;

export interface SentrdelConfigPresenceInputV1 {
  readonly schema_version: 1;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly source_head: string;
  readonly engine_id: typeof SENTRDEL_ENGINE_ID;
  readonly engine_pin: typeof SENTRDEL_PINNED_REVISION;
  readonly engine_tree: typeof SENTRDEL_PINNED_TREE;
  readonly engine_version: typeof SENTRDEL_ENGINE_VERSION;
  readonly capability_id: typeof SENTRDEL_CONFIG_PRESENCE_CAPABILITY;
  readonly path: string;
  readonly signal: SentrdelPresenceSignalV1;
  readonly producer_id: string;
  readonly evidence_ref: string;
  readonly evidence_digest: string;
}

export interface SentrdelConfigPresenceObservationV1 {
  readonly schema_version: 1;
  readonly phase_authority: typeof SENTRDEL_CONFIG_PRESENCE_AUTHORITY;
  readonly identity: string;
  readonly source_head: string;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly engine_pin: typeof SENTRDEL_PINNED_REVISION;
  readonly engine_tree: typeof SENTRDEL_PINNED_TREE;
  readonly pin_ref: typeof SENTRDEL_PIN_REF;
  readonly capability_id: typeof SENTRDEL_CONFIG_PRESENCE_CAPABILITY;
  readonly path: string;
  readonly signal: SentrdelPresenceSignalV1;
  readonly provenance: Readonly<{ producer_id: string; evidence_ref: string; evidence_digest: string }>;
  readonly authority: "STATIC_PRESENCE_ONLY";
  readonly assurance_effect: "NONE";
  readonly producer_execution_attested: false;
  readonly security_rule_executed: false;
  readonly configuration_contents_scanned: false;
  readonly ci_security_scanned: false;
  readonly hosted_posture_verified: false;
  readonly repository_total: false;
  readonly finding_emitted: false;
  readonly claim_assessment_emitted: false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Transcribes the pinned path-only producer classification. A recognized CI
 * filename is not evidence that any of its instructions were evaluated.
 */
export function classifySentrdelConfigPresencePathV1(path: string): readonly SentrdelPresenceSignalV1[] {
  if (!PATH.test(path) || path.startsWith("/") || path.endsWith("/") ||
      path.split("/").some(part => part === "" || part === "." || part === "..")) {
    return Object.freeze([]);
  }
  const base = path.slice(path.lastIndexOf("/") + 1);
  const signals: SentrdelPresenceSignalV1[] = [];
  if (path.startsWith(".github/workflows/") && /\.ya?ml$/u.test(path)) signals.push("github-actions");
  if (base === ".gitlab-ci.yml" || base === ".gitlab-ci.yaml") signals.push("gitlab-ci");
  if (base === "azure-pipelines.yml" || base === "azure-pipelines.yaml") signals.push("azure-pipelines");
  if (base === "Jenkinsfile") signals.push("jenkins");
  if (path.startsWith(".circleci/") && ["CircleCI.yml", "CircleCI.yaml", "config.yml", "config.yaml"].includes(base)) signals.push("circleci");
  if (path === ".mcp.json" || path === "mcp.json") signals.push("mcp-json");
  if (path === ".cursor/mcp.json") signals.push("cursor-mcp");
  if (path === ".vscode/mcp.json") signals.push("vscode-mcp");
  if (path.startsWith(".claude/") && base === "mcp.json") signals.push("claude-mcp");
  // Pinned supabase_detection.rs recognizes local path layout, not live posture.
  if (path === "supabase/config.toml") signals.push("supabase-config");
  if (path === "supabase/seed.sql") signals.push("supabase-seed");
  if (path.startsWith("supabase/migrations/")) {
    const relative = path.slice("supabase/migrations/".length);
    if (relative.length > 0 && !relative.includes("/") && relative.endsWith(".sql")) {
      signals.push("supabase-migration");
    }
  }
  if (path.startsWith("supabase/functions/")) {
    const parts = path.slice("supabase/functions/".length).split("/");
    if (parts.length >= 2 && parts[0]!.length > 0 && parts[1]!.length > 0) {
      signals.push("supabase-function");
    }
  }
  return Object.freeze(signals);
}

function validatePlainSentrdelConfigPresenceInputV1(value: unknown): readonly string[] {
  const reasons: string[] = [];
  if (!isRecord(value)) return Object.freeze(["input must be a record"]);
  if (Object.keys(value).length !== EXACT_KEYS.length ||
      Object.keys(value).some(key => !(EXACT_KEYS as readonly string[]).includes(key))) {
    reasons.push("input keys must exactly match schema");
  }
  const expected: Readonly<Record<string, unknown>> = {
    schema_version: 1, engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION, engine_tree: SENTRDEL_PINNED_TREE,
    engine_version: SENTRDEL_ENGINE_VERSION,
    capability_id: SENTRDEL_CONFIG_PRESENCE_CAPABILITY,
  };
  for (const [k, v] of Object.entries(expected)) {
    if (value[k] !== v) reasons.push(k + " violates pinned source");
  }
  for (const k of ["request_id", "attempt_id", "producer_id", "evidence_ref"]) {
    if (typeof value[k] !== "string" || !ID.test(value[k])) reasons.push(k + " must be bounded");
  }
  if (typeof value["source_head"] !== "string" || !SHA1.test(value["source_head"])) reasons.push("invalid source head");
  if (typeof value["evidence_digest"] !== "string" || !SHA256.test(value["evidence_digest"])) reasons.push("invalid evidence digest");
  if (typeof value["path"] !== "string" || !PATH.test(value["path"]) ||
      classifySentrdelConfigPresencePathV1(typeof value["path"] === "string" ? value["path"] : "").length === 0) {
    reasons.push("unrecognized or noncanonical repository path");
  }
  if (!SIGNAL_SET.has(value["signal"] as string) ||
      typeof value["path"] !== "string" ||
      !classifySentrdelConfigPresencePathV1(value["path"]).includes(value["signal"] as SentrdelPresenceSignalV1)) {
    reasons.push("signal does not match donor-recognized path");
  }
  if (CAPABILITY?.status !== "CHARACTERIZED") reasons.push("config-inspection not characterized");
  for (const item of Object.values(value)) {
    if (typeof item === "string" && (containsSecretMaterialV1(item) || containsExternalAttestationV1(item))) {
      reasons.push("external content contains sensitive or self-attesting text");
      break;
    }
  }
  return Object.freeze(reasons);
}

/**
 * Direct callers cannot mutate or conceal fields between validation and output.
 * This blocks accessor reads but does not sandbox already executing JS code.
 */
export function validateSentrdelConfigPresenceInputV1(value: unknown): readonly string[] {
  try {
    return validatePlainSentrdelConfigPresenceInputV1(snapshotSentrdelObservationDataV1(value));
  } catch {
    return Object.freeze(["input must be immutable plain JSON data"]);
  }
}

/** Normalize a bounded external presence report, not proof that Sentrdel ran. */
export function normalizeSentrdelConfigPresenceV1(value: unknown): SentrdelConfigPresenceObservationV1 {
  const stable = snapshotSentrdelObservationDataV1(value);
  const reasons = validatePlainSentrdelConfigPresenceInputV1(stable);
  if (reasons.length > 0) throw new TypeError("invalid configuration presence: " + reasons.join("; "));
  const input = stable as SentrdelConfigPresenceInputV1;
  const identity = createHash("sha256").update(JSON.stringify([
    SENTRDEL_CONFIG_PRESENCE_AUTHORITY, input.request_id, input.attempt_id,
    input.source_head, input.engine_pin, input.engine_tree, input.signal,
    input.path, input.producer_id, input.evidence_ref, input.evidence_digest,
  ])).digest("hex");
  return Object.freeze({
    schema_version: 1,
    phase_authority: SENTRDEL_CONFIG_PRESENCE_AUTHORITY,
    identity: "config-presence:sentrdel:" + identity,
    source_head: input.source_head,
    request_id: input.request_id,
    attempt_id: input.attempt_id,
    engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE,
    pin_ref: SENTRDEL_PIN_REF,
    capability_id: SENTRDEL_CONFIG_PRESENCE_CAPABILITY,
    path: input.path,
    signal: input.signal,
    provenance: Object.freeze({
      producer_id: input.producer_id,
      evidence_ref: input.evidence_ref,
      evidence_digest: input.evidence_digest,
    }),
    authority: "STATIC_PRESENCE_ONLY" as const,
    assurance_effect: "NONE" as const,
    producer_execution_attested: false as const,
    security_rule_executed: false as const,
    configuration_contents_scanned: false as const,
    ci_security_scanned: false as const,
    hosted_posture_verified: false as const,
    repository_total: false as const,
    finding_emitted: false as const,
    claim_assessment_emitted: false as const,
  });
}
