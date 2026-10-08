/**
 * UA-P06-T09, grain A — bounded GitHub Actions observation normalization.
 *
 * This module consumes untrusted records. It does not execute a scanner,
 * interpret an action, validate a vulnerability, or issue assurance claims.
 * The pinned producer supports a subset of changed GitHub Actions workflows;
 * generic IaC remains unsupported and must be reported separately.
 */
import { createHash } from "node:crypto";
import { snapshotSentrdelObservationDataV1 } from "./sentrdel-observation-snapshot.js";
import {
  buildSentrdelCapabilitiesV1,
  getSentrdelCapabilityV1,
} from "./sentrdel-capability-characterization.js";
import { SENTRDEL_ENGINE_ID, SENTRDEL_ENGINE_VERSION } from "./sentrdel-engine-boundary.js";
import { containsSecretMaterialV1, containsExternalAttestationV1 } from "./sentrdel-evidence-normalization.js";
import { SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES } from "./sentrdel-engine-adapter.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE, SENTRDEL_PIN_REF } from "./sentrdel-source-pin.js";

export const SENTRDEL_WORKFLOW_PHASE_AUTHORITY = "UA-P06-T09" as const;
export const SENTRDEL_WORKFLOW_CAPABILITY_ID = "github-actions" as const;
export const SENTRDEL_GENERIC_IAC_CAPABILITY_ID = "iac-generic" as const;

/** Rule IDs observed in the exact pinned donor github_actions.rs implementation. */
export const SENTRDEL_WORKFLOW_RULE_IDS = Object.freeze([
  "gha.permission-widening",
  "gha.oidc-id-token-write",
  "gha.pull-request-target",
  "gha.secret-in-untrusted-pr-path",
  "gha.untrusted-expression-shell",
  "gha.mutable-action-ref",
  "gha.self-hosted-runner-change",
  "gha.trust-sensitive-artifact-cache-handoff",
] as const);

const RULE_SET: ReadonlySet<string> = new Set(SENTRDEL_WORKFLOW_RULE_IDS);
const CAPABILITIES = buildSentrdelCapabilitiesV1();
const WORKFLOW = getSentrdelCapabilityV1(CAPABILITIES, "github-actions");
const GENERIC_IAC = getSentrdelCapabilityV1(CAPABILITIES, "iac-generic");
const UNKNOWN_SET = new Set<string>(WORKFLOW?.unknown_tokens ?? []);
const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const PATH = /^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/u;
const KEYS = Object.freeze([
  "schema_version", "request_id", "attempt_id", "source_head", "engine_id",
  "engine_pin", "engine_tree", "engine_version", "capability_id", "execution_state",
  "rule_id", "workflow_path", "line", "producer_id", "evidence_ref",
  "evidence_digest", "coverage_state", "unknown_tokens",
  "effect_ceiling", "network_policy", "egress_policy",
] as const);

export interface SentrdelWorkflowInputV1 {
  readonly schema_version: 1;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly source_head: string;
  readonly engine_id: typeof SENTRDEL_ENGINE_ID;
  readonly engine_pin: typeof SENTRDEL_PINNED_REVISION;
  readonly engine_tree: typeof SENTRDEL_PINNED_TREE;
  readonly engine_version: typeof SENTRDEL_ENGINE_VERSION;
  readonly capability_id: typeof SENTRDEL_WORKFLOW_CAPABILITY_ID;
  readonly execution_state: "EXECUTED";
  readonly rule_id: (typeof SENTRDEL_WORKFLOW_RULE_IDS)[number];
  readonly workflow_path: string;
  readonly line: number;
  readonly producer_id: string;
  readonly evidence_ref: string;
  readonly evidence_digest: string;
  readonly coverage_state: "COMPLETE_WITHIN_STATED_SCOPE" | "PARTIAL";
  readonly unknown_tokens: readonly string[];
  readonly effect_ceiling: "E0_READ_ONLY_ANALYSIS";
  readonly network_policy: "NO_NETWORK";
  readonly egress_policy: "NO_EGRESS";
}

export interface SentrdelWorkflowObservationV1 {
  readonly schema_version: 1;
  readonly phase_authority: typeof SENTRDEL_WORKFLOW_PHASE_AUTHORITY;
  readonly observation_id: string;
  readonly capability_id: typeof SENTRDEL_WORKFLOW_CAPABILITY_ID;
  readonly source_head: string;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly engine_id: typeof SENTRDEL_ENGINE_ID;
  readonly engine_pin: typeof SENTRDEL_PINNED_REVISION;
  readonly engine_tree: typeof SENTRDEL_PINNED_TREE;
  readonly engine_pin_ref: typeof SENTRDEL_PIN_REF;
  readonly rule_id: (typeof SENTRDEL_WORKFLOW_RULE_IDS)[number];
  readonly workflow_path: string;
  readonly line: number;
  readonly provenance: Readonly<{ producer_id: string; evidence_ref: string; evidence_digest: string }>;
  readonly coverage: Readonly<{
    state: "COMPLETE_WITHIN_STATED_SCOPE" | "PARTIAL";
    unknown_tokens: readonly string[];
    repository_total: false;
    unscanned_is_clean: false;
  }>;
  readonly authority: "CONFIG_OBSERVATION_ONLY";
  readonly assurance_effect: "NONE";
  readonly finding_emitted: false;
  readonly claim_assessment_emitted: false;
  readonly producer_execution_attested: false;
  readonly severity_derived: false;
  readonly remediation_verified: false;
}

export interface SentrdelWorkflowValidationV1 {
  readonly valid: boolean;
  readonly reasons: readonly string[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validatePlainSentrdelWorkflowInputV1(input: unknown): SentrdelWorkflowValidationV1 {
  const reasons: string[] = [];
  if (!record(input)) {
    return { valid: false, reasons: Object.freeze(["input must be a record"]) };
  }
  const expected = new Set<string>(KEYS);
  if (Object.keys(input).length !== KEYS.length ||
      Object.keys(input).some((key) => !expected.has(key))) {
    reasons.push("input keys must match the exact bounded schema");
  }
  const exact: Readonly<Record<string, unknown>> = {
    schema_version: 1, engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION, engine_tree: SENTRDEL_PINNED_TREE,
    engine_version: SENTRDEL_ENGINE_VERSION, capability_id: SENTRDEL_WORKFLOW_CAPABILITY_ID,
    execution_state: "EXECUTED", effect_ceiling: "E0_READ_ONLY_ANALYSIS",
    network_policy: "NO_NETWORK", egress_policy: "NO_EGRESS",
  };
  for (const [key, expectedValue] of Object.entries(exact)) {
    if (input[key] !== expectedValue) reasons.push(`${key} does not match the pinned boundary`);
  }
  for (const key of ["request_id", "attempt_id", "producer_id", "evidence_ref"]) {
    if (typeof input[key] !== "string" || !ID.test(input[key])) reasons.push(`${key} is invalid`);
  }
  if (typeof input["source_head"] !== "string" || !SHA1.test(input["source_head"])) {
    reasons.push("source_head must be a canonical Git SHA-1");
  }
  if (typeof input["evidence_digest"] !== "string" || !SHA256.test(input["evidence_digest"])) {
    reasons.push("evidence_digest must be a SHA-256 digest");
  }
  if (!RULE_SET.has(input["rule_id"] as string)) reasons.push("rule_id is not present at the pinned donor");
  if (typeof input["workflow_path"] !== "string" || !PATH.test(input["workflow_path"])) {
    reasons.push("workflow_path must be a canonical changed GitHub Actions YAML path");
  }
  if (!Number.isSafeInteger(input["line"]) || (input["line"] as number) < 1 ||
      (input["line"] as number) > 1_000_000) reasons.push("line must be a bounded positive integer");
  if (input["coverage_state"] !== "COMPLETE_WITHIN_STATED_SCOPE" &&
      input["coverage_state"] !== "PARTIAL") reasons.push("coverage_state must be executed-scope coverage");
  const tokens = input["unknown_tokens"];
  if (!Array.isArray(tokens) || tokens.length > 8 ||
      tokens.some((item: unknown) => typeof item !== "string" || !UNKNOWN_SET.has(item)) ||
      new Set(tokens).size !== tokens.length) {
    reasons.push("unknown_tokens must be unique characterized tokens");
  } else if (tokens.length > 0 && input["coverage_state"] !== "PARTIAL") {
    reasons.push("unknown tokens cannot be reported as complete coverage");
  } else if (tokens.length === 0 && input["coverage_state"] === "PARTIAL") {
    reasons.push("partial coverage must declare its unknown reason");
  }

  if (WORKFLOW?.status !== "CHARACTERIZED" ||
      !SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES.includes("github-actions")) {
    reasons.push("pinned workflow capability is not characterized and adapter-admitted");
  }
  for (const value of Object.values(input)) {
    if (typeof value === "string" &&
        (containsSecretMaterialV1(value) || containsExternalAttestationV1(value))) {
      reasons.push("untrusted strings may not contain secrets or self-attestation");
      break;
    }
  }
  return Object.freeze({ valid: reasons.length === 0, reasons: Object.freeze(reasons) });
}

/**
 * Validate a stable snapshot; invalid accessors/hidden data fail closed without
 * running getters. All exported entry points enforce this boundary themselves.
 */
export function validateSentrdelWorkflowInputV1(value: unknown): SentrdelWorkflowValidationV1 {
  try {
    return validatePlainSentrdelWorkflowInputV1(snapshotSentrdelObservationDataV1(value));
  } catch {
    return Object.freeze({
      valid: false,
      reasons: Object.freeze(["input must be immutable plain JSON data"]),
    });
  }
}

/** This is data normalization, not a scan, review result, or proof of runtime execution. */
export function normalizeSentrdelWorkflowObservationV1(
  value: unknown,
): SentrdelWorkflowObservationV1 {
  const stable = snapshotSentrdelObservationDataV1(value);
  const check = validatePlainSentrdelWorkflowInputV1(stable);
  if (!check.valid) throw new TypeError(`invalid workflow observation: ${check.reasons.join("; ")}`);
  const input = stable as SentrdelWorkflowInputV1;
  const unknown = Object.freeze([...input.unknown_tokens].sort());
  const identity = [
    SENTRDEL_WORKFLOW_PHASE_AUTHORITY, input.request_id, input.attempt_id,
    input.engine_pin, input.engine_tree, input.engine_version,
    input.source_head, input.rule_id, input.workflow_path,
    String(input.line), input.producer_id, input.evidence_ref,
    input.evidence_digest, input.coverage_state, ...unknown,
  ];
  const digest = createHash("sha256").update(JSON.stringify(identity), "utf8").digest("hex");
  return Object.freeze({
    schema_version: 1, phase_authority: SENTRDEL_WORKFLOW_PHASE_AUTHORITY,
    observation_id: `ci-observation:sentrdel:${digest}`,
    capability_id: SENTRDEL_WORKFLOW_CAPABILITY_ID, source_head: input.source_head,
    request_id: input.request_id, attempt_id: input.attempt_id,
    engine_id: SENTRDEL_ENGINE_ID, engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE, engine_pin_ref: SENTRDEL_PIN_REF,
    rule_id: input.rule_id, workflow_path: input.workflow_path, line: input.line,
    provenance: Object.freeze({
      producer_id: input.producer_id, evidence_ref: input.evidence_ref,
      evidence_digest: input.evidence_digest,
    }),
    coverage: Object.freeze({
      state: input.coverage_state, unknown_tokens: unknown,
      repository_total: false as const, unscanned_is_clean: false as const,
    }),
    authority: "CONFIG_OBSERVATION_ONLY" as const,
    assurance_effect: "NONE" as const, finding_emitted: false as const,
    claim_assessment_emitted: false as const, producer_execution_attested: false as const,
    severity_derived: false as const, remediation_verified: false as const,
  });
}

/** The pinned Sentrdel implementation has no generic IaC producer. */
export function buildSentrdelGenericIacGapV1() {
  if (GENERIC_IAC?.status !== "UNSUPPORTED" ||
      SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES.includes("iac-generic")) {
    throw new TypeError("pinned generic IaC characterization drifted");
  }
  return Object.freeze({
    schema_version: 1 as const, phase_authority: SENTRDEL_WORKFLOW_PHASE_AUTHORITY,
    capability_id: SENTRDEL_GENERIC_IAC_CAPABILITY_ID,
    engine_pin: SENTRDEL_PINNED_REVISION, engine_tree: SENTRDEL_PINNED_TREE,
    status: "NOT_RUN" as const, reason_code: "unsupported_at_pinned_source" as const,
    reason_text: "No generic IaC analyzer is implemented at the pinned Sentrdel revision.",
    coverage_total: false as const, clean_claimed: false as const,
    assurance_effect: "NONE" as const,
  });
}
