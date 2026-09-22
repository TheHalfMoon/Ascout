import type { MobileEffect } from "./effects.js";
import type { EvidenceArtifactRefV1 } from "./evidence.js";
import type { FlashStatusV1 } from "./flash.js";
import type { MobileCompletionState } from "./protocol.js";

export const MOBILE_SURFACES = [
  "REVIEW",
  "TEST",
  "SECURITY",
  "CYBER",
  "ASSURE",
  "LAB",
] as const;

export type MobileSurface = (typeof MOBILE_SURFACES)[number];

export interface MobileCheckpointSummaryV1 {
  readonly total: number;
  readonly satisfied: number;
  readonly violated: number;
  readonly pending: number;
}

export interface MobileAuthorityViewV1 {
  readonly admitted_effects: readonly MobileEffect[];
  readonly donor_sha: string;
  readonly engine_descriptor_digest: string;
}

export interface MobileRunViewV1 {
  readonly run_id: string;
  readonly surface: MobileSurface;
  readonly run_status: FlashStatusV1;
  readonly completion_state: MobileCompletionState;
  readonly blocked_actions: readonly string[];
  readonly screenshot_refs: readonly EvidenceArtifactRefV1[];
  readonly timeline_digest: string;
  readonly checkpoints: MobileCheckpointSummaryV1;
  readonly unverified_scope: readonly string[];
  readonly authority: MobileAuthorityViewV1;
}

export type MobileViewResult =
  | { readonly ok: true; readonly value: MobileRunViewV1 }
  | { readonly ok: false; readonly reason: string };

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const GIT_SHA_HEX = /^[a-f0-9]{40}$/u;

const MOBILE_EFFECT_SET: readonly string[] = [
  "DEVICE_READ",
  "DEVICE_INPUT",
  "APP_LAUNCH",
  "APP_INSTALL",
  "APP_UNINSTALL",
  "FILE_PUSH",
  "FILE_PULL",
  "LOGCAT_READ",
  "SCREEN_CAPTURE",
  "SCREEN_RECORD",
  "ADB_SHELL_READ",
  "ADB_SHELL_MUTATE",
  "DEVICE_SETTINGS_MUTATE",
];

const FLASH_STATUSES: readonly string[] = [
  "READY",
  "RUNNING",
  "COMPLETED",
  "BLOCKED",
  "CANCELLED",
  "EXHAUSTED_STEPS",
  "EXHAUSTED_TIME",
  "EXHAUSTED_TOKENS",
  "EXHAUSTED_ARTIFACTS",
  "FAILED",
];

const COMPLETION_STATES: readonly string[] = [
  "PASS",
  "FAIL",
  "BLOCKED",
  "INCOMPLETE",
  "INCONCLUSIVE",
  "REFUSED",
  "ERROR",
  "NOT_RUN",
  "STALE",
  "UNKNOWN",
];

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be an opaque id");
  }
  return value;
}

function requireOpaqueIdList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > 1024) {
    throw new TypeError(field + " must be an array of at most 1024 ids");
  }
  return value.map((entry) => requireOpaqueId(entry, field + "[]"));
}

function requireArtifactRefs(value: unknown): EvidenceArtifactRefV1[] {
  if (!Array.isArray(value) || value.length > 1024) {
    throw new TypeError("screenshot_refs must be an array of at most 1024 refs");
  }
  return value.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new TypeError("artifact ref must be an object");
    }
    const record = entry as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (
      keys.length !== 4 ||
      keys[0] !== "artifact_id" ||
      keys[1] !== "byte_length" ||
      keys[2] !== "kind" ||
      keys[3] !== "sha256"
    ) {
      throw new TypeError("artifact ref must contain exactly artifact_id, kind, sha256, byte_length");
    }
    if (typeof record["sha256"] !== "string" || !SHA256_HEX.test(record["sha256"])) {
      throw new TypeError("artifact sha256 must be hex");
    }
    if (
      typeof record["byte_length"] !== "number" ||
      !Number.isInteger(record["byte_length"]) ||
      (record["byte_length"] as number) < 0
    ) {
      throw new TypeError("artifact byte_length must be a non-negative integer");
    }
    return {
      artifact_id: requireOpaqueId(record["artifact_id"], "artifact_id"),
      kind: requireOpaqueId(record["kind"], "artifact kind"),
      sha256: record["sha256"] as string,
      byte_length: record["byte_length"] as number,
    };
  });
}

function requireCheckpointSummary(value: unknown): MobileCheckpointSummaryV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("checkpoints must be an object");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (
    keys.length !== 4 ||
    keys[0] !== "pending" ||
    keys[1] !== "satisfied" ||
    keys[2] !== "total" ||
    keys[3] !== "violated"
  ) {
    throw new TypeError("checkpoints must contain exactly total, satisfied, violated, pending");
  }
  const fields = ["total", "satisfied", "violated", "pending"] as const;
  const out: Record<string, number> = {};
  for (const field of fields) {
    const entry = record[field];
    if (typeof entry !== "number" || !Number.isInteger(entry) || entry < 0) {
      throw new TypeError("checkpoint " + field + " must be a non-negative integer");
    }
    out[field] = entry;
  }
  const total = out["total"] as number;
  if (
    (out["satisfied"] as number) + (out["violated"] as number) + (out["pending"] as number) !==
    total
  ) {
    throw new TypeError("checkpoint counts must sum to total");
  }
  return {
    total,
    satisfied: out["satisfied"] as number,
    violated: out["violated"] as number,
    pending: out["pending"] as number,
  };
}

function requireAuthority(value: unknown): MobileAuthorityViewV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("authority must be an object");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (
    keys.length !== 3 ||
    keys[0] !== "admitted_effects" ||
    keys[1] !== "donor_sha" ||
    keys[2] !== "engine_descriptor_digest"
  ) {
    throw new TypeError("authority must contain exactly admitted_effects, donor_sha, engine_descriptor_digest");
  }
  if (!Array.isArray(record["admitted_effects"]) || (record["admitted_effects"] as unknown[]).length > 13) {
    throw new TypeError("admitted_effects must be an array of at most 13 effects");
  }
  const effects: MobileEffect[] = [];
  for (const effect of record["admitted_effects"] as unknown[]) {
    if (typeof effect !== "string" || !MOBILE_EFFECT_SET.includes(effect)) {
      throw new TypeError("admitted effect unknown");
    }
    if (!effects.includes(effect as MobileEffect)) effects.push(effect as MobileEffect);
  }
  effects.sort();
  if (typeof record["donor_sha"] !== "string" || !GIT_SHA_HEX.test(record["donor_sha"])) {
    throw new TypeError("donor_sha must be a 40-char git sha");
  }
  if (
    typeof record["engine_descriptor_digest"] !== "string" ||
    !SHA256_HEX.test(record["engine_descriptor_digest"])
  ) {
    throw new TypeError("engine_descriptor_digest must be sha256 hex");
  }
  return {
    admitted_effects: effects,
    donor_sha: record["donor_sha"] as string,
    engine_descriptor_digest: record["engine_descriptor_digest"] as string,
  };
}

export function projectMobileRunViewV1(input: {
  readonly run_id: unknown;
  readonly surface: unknown;
  readonly run_status: unknown;
  readonly completion_state: unknown;
  readonly blocked_actions: unknown;
  readonly screenshot_refs: unknown;
  readonly timeline_digest: unknown;
  readonly device_identity_hash: unknown;
  readonly checkpoints: unknown;
  readonly unverified_scope: unknown;
  readonly authority: unknown;
}): MobileViewResult {
  try {
    if (typeof input.surface !== "string" || !(MOBILE_SURFACES as readonly string[]).includes(input.surface)) {
      throw new TypeError("surface must be REVIEW, TEST, SECURITY, CYBER, ASSURE, or LAB");
    }
    if (typeof input.run_status !== "string" || !FLASH_STATUSES.includes(input.run_status)) {
      throw new TypeError("run_status must be a frozen run status");
    }
    if (
      typeof input.completion_state !== "string" ||
      !COMPLETION_STATES.includes(input.completion_state)
    ) {
      throw new TypeError("completion_state must be canonical");
    }
    if (typeof input.timeline_digest !== "string" || !SHA256_HEX.test(input.timeline_digest)) {
      throw new TypeError("timeline_digest must be sha256 hex");
    }
    if (
      typeof input.device_identity_hash !== "string" ||
      !SHA256_HEX.test(input.device_identity_hash)
    ) {
      throw new TypeError("device identity must be a hash, never a raw serial");
    }
    const blocked_actions = requireOpaqueIdList(input.blocked_actions, "blocked_actions");
    const screenshot_refs = requireArtifactRefs(input.screenshot_refs);
    const checkpoints = requireCheckpointSummary(input.checkpoints);
    const unverified_scope = requireOpaqueIdList(input.unverified_scope, "unverified_scope");
    const authority = requireAuthority(input.authority);
    if (input.completion_state === "PASS") {
      if (unverified_scope.length > 0) {
        throw new TypeError("PASS must not mask unverified scope");
      }
      if (blocked_actions.length > 0) {
        throw new TypeError("PASS must not mask blocked actions");
      }
      if (checkpoints.violated > 0 || checkpoints.pending > 0) {
        throw new TypeError("PASS requires all checkpoints satisfied");
      }
    }
    return {
      ok: true,
      value: Object.freeze({
        run_id: requireOpaqueId(input.run_id, "run_id"),
        surface: input.surface as MobileRunViewV1["surface"],
        run_status: input.run_status as FlashStatusV1,
        completion_state: input.completion_state as MobileCompletionState,
        blocked_actions,
        screenshot_refs,
        timeline_digest: input.timeline_digest as string,
        checkpoints,
        unverified_scope,
        authority,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "run view refused",
    };
  }
}
