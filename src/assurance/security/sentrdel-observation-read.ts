/**
 * Accessor-free reads of UA-P06-T04 observations for downstream consumers.
 *
 * T04 records share frozen sub-objects, so they cannot pass the tree-only
 * snapshot. Reading each needed field through its own data-property
 * descriptor gives the same guarantee: no caller getter ever runs. Records
 * that claim more than a pinned T04 observation are refused, never downgraded.
 */
import { containsSecretMaterialV1, containsExternalAttestationV1 } from "./sentrdel-evidence-normalization.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "./sentrdel-source-pin.js";

export const SENTRDEL_NON_PROMOTED_OBSERVATION: Readonly<Record<string, unknown>> = Object.freeze({
  schema_version: 1, phase_authority: "UA-P06-T04", authority: "OBSERVATION_ONLY",
  engine_pin: SENTRDEL_PINNED_REVISION, engine_tree: SENTRDEL_PINNED_TREE, assurance_effect: "NONE",
  finding_emitted: false, claim_assessment_emitted: false, global_clean_claimed: false, remediation_verified: false,
});

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u;

/** Own data property only; an accessor is refused without being invoked. */
export function readOwnDataV1(record: unknown, key: string, fail: (reason: string) => never): unknown {
  if (typeof record !== "object" || record === null) fail(`${key} needs a record`);
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined || !Object.hasOwn(descriptor, "value")) fail(`${key} must be an own data property`);
  return descriptor.value;
}

/** Dense bounded array read through descriptors. */
export function readOwnListV1(value: unknown, what: string, max: number, fail: (reason: string) => never): unknown[] {
  if (!Array.isArray(value)) fail(`${what} must be an array`);
  const length = readOwnDataV1(value, "length", fail);
  if (!Number.isSafeInteger(length) || (length as number) > max) fail(`${what} must be bounded`);
  return Array.from({ length: length as number }, (_, index) => readOwnDataV1(value, String(index), fail));
}

/** Bounded identifier that may be persisted: no secret shape, no self-attestation. */
export function readSafeIdV1(value: unknown, what: string, fail: (reason: string) => never): string {
  if (typeof value !== "string" || !SAFE_ID.test(value)) fail(`${what} is invalid`);
  if (containsSecretMaterialV1(value) || containsExternalAttestationV1(value)) {
    fail(`${what} may not contain secrets or self-attestation`);
  }
  return value;
}

export function assertNonPromotedObservationV1(record: unknown, fail: (reason: string) => never): void {
  for (const [key, expected] of Object.entries(SENTRDEL_NON_PROMOTED_OBSERVATION)) {
    if (readOwnDataV1(record, key, fail) !== expected) fail(`observation ${key} claims more than a pinned T04 observation`);
  }
}
