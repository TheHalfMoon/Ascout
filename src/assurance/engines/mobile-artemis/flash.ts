import { canonicalAssuranceSha256V1 } from "../../contracts/canonical-serialization.js";

export const FLASH_HARD_MAX_STEPS = 200 as const;
export const FLASH_HARD_MAX_SECONDS = 3600 as const;
export const FLASH_HARD_MAX_TOKENS = 200000 as const;
export const FLASH_HARD_MAX_ARTIFACTS = 128 as const;
export const FLASH_HARD_MAX_HISTORY = 2000 as const;

export interface FlashCeilingsV1 {
  readonly max_steps: number;
  readonly max_seconds: number;
  readonly max_tokens: number;
  readonly max_artifacts: number;
  readonly max_history_entries: number;
}

export const FLASH_DEFAULT_CEILINGS: FlashCeilingsV1 = {
  max_steps: 25,
  max_seconds: 300,
  max_tokens: 32000,
  max_artifacts: 16,
  max_history_entries: 200,
};

export type FlashTerminalV1 =
  | "COMPLETED"
  | "BLOCKED"
  | "CANCELLED"
  | "EXHAUSTED_STEPS"
  | "EXHAUSTED_TIME"
  | "EXHAUSTED_TOKENS"
  | "EXHAUSTED_ARTIFACTS"
  | "FAILED";

export type FlashStatusV1 = "READY" | "RUNNING" | FlashTerminalV1;

export interface FlashConsumptionV1 {
  readonly tokens: number;
  readonly artifacts: number;
  readonly elapsed_ms: number;
}

export interface FlashRunStateV1 {
  readonly run_id: string;
  readonly status: FlashStatusV1;
  readonly step_count: number;
  readonly tokens_used: number;
  readonly artifacts_used: number;
  readonly elapsed_ms: number;
  readonly ceilings: FlashCeilingsV1;
  readonly cancel_reason: string;
}

export type FlashResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

function requireCeilings(value: unknown, field: string): FlashCeilingsV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(field + " must be an object");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const wanted = [
    "max_artifacts",
    "max_history_entries",
    "max_seconds",
    "max_steps",
    "max_tokens",
  ];
  if (keys.length !== wanted.length || !wanted.every((key, index) => key === keys[index])) {
    throw new TypeError(field + " must contain exactly the ceiling keys");
  }
  const hard: Array<readonly [string, number]> = [
    ["max_steps", FLASH_HARD_MAX_STEPS],
    ["max_seconds", FLASH_HARD_MAX_SECONDS],
    ["max_tokens", FLASH_HARD_MAX_TOKENS],
    ["max_artifacts", FLASH_HARD_MAX_ARTIFACTS],
    ["max_history_entries", FLASH_HARD_MAX_HISTORY],
  ];
  const out: Record<string, number> = {};
  for (const [key, hardMax] of hard) {
    const entry = record[key];
    if (typeof entry !== "number" || !Number.isInteger(entry) || entry < 1 || entry > hardMax) {
      throw new TypeError(field + "." + key + " must be an integer 1.." + hardMax);
    }
    out[key] = entry;
  }
  return {
    max_steps: out["max_steps"] as number,
    max_seconds: out["max_seconds"] as number,
    max_tokens: out["max_tokens"] as number,
    max_artifacts: out["max_artifacts"] as number,
    max_history_entries: out["max_history_entries"] as number,
  };
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export function admitFlashRunV1(
  run_id: unknown,
  requested: unknown,
  admitted: FlashCeilingsV1,
): FlashResult<FlashRunStateV1> {
  try {
    if (typeof run_id !== "string" || !OPAQUE_ID.test(run_id)) {
      throw new TypeError("run_id must be an opaque id");
    }
    const ceilings = requireCeilings(requested, "requested ceilings");
    const pairs: Array<readonly [keyof FlashCeilingsV1, string]> = [
      ["max_steps", "step budget exceeds admission"],
      ["max_seconds", "time budget exceeds admission"],
      ["max_tokens", "token budget exceeds admission"],
      ["max_artifacts", "artifact budget exceeds admission"],
      ["max_history_entries", "history budget exceeds admission"],
    ];
    for (const [key, message] of pairs) {
      if (ceilings[key] > admitted[key]) throw new TypeError(message);
    }
    return {
      ok: true,
      value: {
        run_id,
        status: "READY",
        step_count: 0,
        tokens_used: 0,
        artifacts_used: 0,
        elapsed_ms: 0,
        ceilings,
        cancel_reason: "",
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "flash run refused",
    };
  }
}

export function startFlashRunV1(state: FlashRunStateV1): FlashResult<FlashRunStateV1> {
  if (state.status !== "READY") {
    return { ok: false, reason: "only READY runs start" };
  }
  return { ok: true, value: { ...state, status: "RUNNING" } };
}

export function advanceFlashStepV1(
  state: FlashRunStateV1,
  consumption: FlashConsumptionV1,
): FlashResult<FlashRunStateV1> {
  if (state.status !== "RUNNING") {
    return { ok: false, reason: "only RUNNING runs advance" };
  }
  if (
    typeof consumption.tokens !== "number" ||
    !Number.isInteger(consumption.tokens) ||
    consumption.tokens < 0 ||
    typeof consumption.artifacts !== "number" ||
    !Number.isInteger(consumption.artifacts) ||
    consumption.artifacts < 0 ||
    typeof consumption.elapsed_ms !== "number" ||
    !Number.isInteger(consumption.elapsed_ms) ||
    consumption.elapsed_ms < 0
  ) {
    return { ok: false, reason: "consumption must be non-negative integers" };
  }
  const step_count = state.step_count + 1;
  const tokens_used = state.tokens_used + consumption.tokens;
  const artifacts_used = state.artifacts_used + consumption.artifacts;
  const elapsed_ms = state.elapsed_ms + consumption.elapsed_ms;
  const ceilings = state.ceilings;
  let status: FlashStatusV1 = "RUNNING";
  if (step_count > ceilings.max_steps) status = "EXHAUSTED_STEPS";
  else if (elapsed_ms > ceilings.max_seconds * 1000) status = "EXHAUSTED_TIME";
  else if (tokens_used > ceilings.max_tokens) status = "EXHAUSTED_TOKENS";
  else if (artifacts_used > ceilings.max_artifacts) status = "EXHAUSTED_ARTIFACTS";
  return {
    ok: true,
    value: { ...state, status, step_count, tokens_used, artifacts_used, elapsed_ms },
  };
}

export function finishFlashRunV1(
  state: FlashRunStateV1,
  terminal: "COMPLETED" | "BLOCKED" | "FAILED",
): FlashResult<FlashRunStateV1> {
  if (state.status !== "RUNNING") {
    return { ok: false, reason: "only RUNNING runs finish" };
  }
  return { ok: true, value: { ...state, status: terminal } };
}

export function cancelFlashRunV1(
  state: FlashRunStateV1,
  reason: unknown,
): FlashResult<FlashRunStateV1> {
  if (state.status !== "READY" && state.status !== "RUNNING") {
    return { ok: false, reason: "only READY or RUNNING runs cancel" };
  }
  if (typeof reason !== "string" || reason.length < 1 || reason.length > 512) {
    return { ok: false, reason: "cancel reason must be 1..512 chars" };
  }
  return { ok: true, value: { ...state, status: "CANCELLED", cancel_reason: reason } };
}

export function isFlashTerminalV1(status: FlashStatusV1): boolean {
  return status !== "READY" && status !== "RUNNING";
}

export interface FlashHistoryEntryV1 {
  readonly step: number;
  readonly kind: string;
  readonly summary: string;
}

export interface FlashCompressedHistoryV1 {
  readonly kept: readonly FlashHistoryEntryV1[];
  readonly compressed_entries: number;
  readonly compressed_digest: string;
}

export function compressFlashHistoryV1(
  entries: readonly unknown[],
  keepTail: number,
): FlashResult<FlashCompressedHistoryV1> {
  try {
    if (!Number.isInteger(keepTail) || keepTail < 1 || keepTail > FLASH_HARD_MAX_HISTORY) {
      throw new TypeError("keepTail must be an integer 1..2000");
    }
    if (entries.length > FLASH_HARD_MAX_HISTORY) {
      throw new TypeError("history exceeds 2000 entries");
    }
    const normalized: FlashHistoryEntryV1[] = [];
    for (const entry of entries) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        throw new TypeError("history entry must be an object");
      }
      const record = entry as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      if (keys.length !== 3 || keys[0] !== "kind" || keys[1] !== "step" || keys[2] !== "summary") {
        throw new TypeError("history entry must contain exactly step, kind, summary");
      }
      if (typeof record["step"] !== "number" || !Number.isInteger(record["step"])) {
        throw new TypeError("history step must be an integer");
      }
      if (typeof record["kind"] !== "string" || typeof record["summary"] !== "string") {
        throw new TypeError("history kind and summary must be strings");
      }
      normalized.push({
        step: record["step"] as number,
        kind: record["kind"] as string,
        summary: record["summary"] as string,
      });
    }
    if (normalized.length <= keepTail) {
      return {
        ok: true,
        value: { kept: normalized, compressed_entries: 0, compressed_digest: "" },
      };
    }
    const dropped = normalized.slice(0, normalized.length - keepTail);
    const kept = normalized.slice(normalized.length - keepTail);
    return {
      ok: true,
      value: {
        kept,
        compressed_entries: dropped.length,
        compressed_digest: canonicalAssuranceSha256V1(dropped),
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "history refused",
    };
  }
}

export interface FlashReplayPlanV1 {
  readonly replay_id: string;
  readonly run_id: string;
  readonly from_step: number;
  readonly steps: readonly FlashHistoryEntryV1[];
}

export function buildFlashReplayPlanV1(
  run_id: unknown,
  entries: readonly FlashHistoryEntryV1[],
  fromStep: unknown,
): FlashResult<FlashReplayPlanV1> {
  try {
    if (typeof run_id !== "string" || !OPAQUE_ID.test(run_id)) {
      throw new TypeError("run_id must be an opaque id");
    }
    if (typeof fromStep !== "number" || !Number.isInteger(fromStep) || fromStep < 0) {
      throw new TypeError("fromStep must be a non-negative integer");
    }
    if (entries.length > FLASH_HARD_MAX_HISTORY) {
      throw new TypeError("history exceeds 2000 entries");
    }
    const steps = entries.filter((entry) => entry.step >= fromStep);
    if (steps.length === 0) throw new TypeError("replay range is empty");
    return {
      ok: true,
      value: {
        replay_id: run_id + ":replay:" + String(fromStep),
        run_id,
        from_step: fromStep,
        steps,
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "replay refused",
    };
  }
}
