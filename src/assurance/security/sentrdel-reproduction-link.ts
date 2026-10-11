/**
 * UA-P06-T12 — proof/reproduction references.
 *
 * Links a UA-P06-T04 security observation to the deterministic reproduction it
 * declared. Mirrors pinned Sentrdel `crates/sentrdel-schema/src/evidence.rs`:
 * a reproduction's input digest must equal a declared evidence input digest
 * (`ReproductionInputDigestNotTrusted` otherwise). A link records that a
 * bound reproduction exists; it never runs it, and it is never proof that a
 * finding is real or exploitable (reproducibility-proof capability: runtime
 * exploit proof and VERIFIED producer claims are unsupported).
 */
import { createHash } from "node:crypto";
import { snapshotSentrdelObservationDataV1 } from "./sentrdel-observation-snapshot.js";
import { containsSecretMaterialV1, containsExternalAttestationV1 } from "./sentrdel-evidence-normalization.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "./sentrdel-source-pin.js";

export const SENTRDEL_REPRODUCTION_AUTHORITY = "UA-P06-T12" as const;
/** No VERIFIED, REPRODUCED, or PROVEN member: linking cannot express an executed proof. */
export const SENTRDEL_REPRODUCTION_LINK_STATES = ["NONE_DECLARED", "DECLARED_NOT_SUPPLIED", "LINKED_NOT_EXECUTED"] as const;
export type SentrdelReproductionLinkStateV1 = (typeof SENTRDEL_REPRODUCTION_LINK_STATES)[number];

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u;
const REPRODUCTION_KEYS = ["schema_version", "reproduction_ref", "source_head", "method", "input_digest"];
const NON_PROMOTED: Readonly<Record<string, unknown>> = Object.freeze({
  schema_version: 1, phase_authority: "UA-P06-T04", authority: "OBSERVATION_ONLY",
  engine_pin: SENTRDEL_PINNED_REVISION, engine_tree: SENTRDEL_PINNED_TREE, assurance_effect: "NONE",
  finding_emitted: false, claim_assessment_emitted: false, global_clean_claimed: false, remediation_verified: false,
});

function fail(reason: string): never {
  throw new TypeError(`invalid reproduction link: ${reason}`);
}

/** Own data property only; accessors are refused without being invoked. */
function own(record: unknown, key: string): unknown {
  if (typeof record !== "object" || record === null) fail(`${key} needs a record`);
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined || !Object.hasOwn(descriptor, "value")) fail(`${key} must be an own data property`);
  return descriptor.value;
}

function id(value: unknown, what: string): string {
  if (typeof value !== "string" || !ID.test(value)) fail(`${what} is invalid`);
  if (containsSecretMaterialV1(value) || containsExternalAttestationV1(value)) {
    fail(`${what} may not contain secrets or self-attestation`);
  }
  return value;
}

function readObservation(raw: unknown) {
  for (const [key, expected] of Object.entries(NON_PROMOTED)) {
    if (own(raw, key) !== expected) fail(`observation ${key} claims more than a pinned T04 observation`);
  }
  const sourceHead = own(raw, "source_head");
  if (typeof sourceHead !== "string" || !SHA1.test(sourceHead)) fail("observation source_head is invalid");
  const declared = own(raw, "reproduction_ref");
  const digest = own(own(raw, "raw_evidence"), "digest");
  if (typeof digest !== "string" || !SHA256.test(digest)) fail("observation raw evidence digest is invalid");
  return {
    observation_id: id(own(raw, "observation_id"), "observation_id"),
    source_head: sourceHead,
    reproduction_ref: declared === null ? null : id(declared, "observation reproduction_ref"),
    input_digest: digest,
  };
}

function readReproduction(raw: unknown) {
  const value = snapshotSentrdelObservationDataV1(raw);
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail("reproduction must be a record");
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== REPRODUCTION_KEYS.length || !keys.every(key => REPRODUCTION_KEYS.includes(key))) {
    fail("reproduction keys must match the bounded schema");
  }
  if (record["schema_version"] !== 1) fail("reproduction schema_version must be 1");
  if (typeof record["source_head"] !== "string" || !SHA1.test(record["source_head"])) fail("reproduction source_head is invalid");
  if (typeof record["input_digest"] !== "string" || !SHA256.test(record["input_digest"])) fail("reproduction input_digest is invalid");
  return {
    reproduction_ref: id(record["reproduction_ref"], "reproduction_ref"),
    method: id(record["method"], "method"),
    source_head: record["source_head"],
    input_digest: record["input_digest"],
  };
}

/**
 * `reproduction` may be null: the result then reports whether the observation
 * declared a reproduction that was not supplied, or declared none.
 */
export function linkSentrdelReproductionV1(observation: unknown, reproduction: unknown) {
  const obs = readObservation(observation);
  let state: SentrdelReproductionLinkStateV1 = obs.reproduction_ref === null ? "NONE_DECLARED" : "DECLARED_NOT_SUPPLIED";
  let linked: ReturnType<typeof readReproduction> | null = null;
  if (reproduction !== null) {
    linked = readReproduction(reproduction);
    if (obs.reproduction_ref === null) fail("observation declared no reproduction; an unsolicited one cannot be attached");
    if (linked.reproduction_ref !== obs.reproduction_ref) fail("reproduction_ref differs from the one the observation declared");
    if (linked.source_head !== obs.source_head) fail("reproduction belongs to a different source head");
    if (linked.input_digest !== obs.input_digest) {
      fail("reproduction input digest is not bound to the observation's declared input digest");
    }
    state = "LINKED_NOT_EXECUTED";
  }
  const digest = createHash("sha256").update(JSON.stringify([
    SENTRDEL_REPRODUCTION_AUTHORITY, obs.observation_id, obs.source_head, obs.reproduction_ref, obs.input_digest,
    state, linked?.method ?? null,
  ]), "utf8").digest("hex");
  return Object.freeze({
    schema_version: 1 as const,
    phase_authority: SENTRDEL_REPRODUCTION_AUTHORITY,
    link_id: `reproduction-link:${digest}`,
    observation_id: obs.observation_id,
    source_head: obs.source_head,
    state,
    reproduction_ref: obs.reproduction_ref,
    method: linked?.method ?? null,
    input_digest: obs.input_digest,
    reproduction_executed: false as const,
    reproduced: false as const,
    exploit_proven: false as const,
    finding_emitted: false as const,
    assurance_effect: "NONE" as const,
  });
}
