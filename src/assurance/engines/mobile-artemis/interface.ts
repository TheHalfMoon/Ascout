import { planProRunV1 } from "./pro.js";
import type { MobileEffect } from "./effects.js";

export const MOBILE_TOOLS = [
  "mobile_doctor",
  "mobile_devices",
  "mobile_run",
  "mobile_status",
  "mobile_cancel",
  "mobile_evidence",
  "mobile_replay",
  "mobile_diagnose",
] as const;

export type MobileToolName = (typeof MOBILE_TOOLS)[number];

export const MOBILE_TOOL_EFFECTS: Record<MobileToolName, MobileEffect> = {
  mobile_doctor: "DEVICE_READ",
  mobile_devices: "DEVICE_READ",
  mobile_run: "DEVICE_INPUT",
  mobile_status: "DEVICE_READ",
  mobile_cancel: "DEVICE_INPUT",
  mobile_evidence: "DEVICE_READ",
  mobile_replay: "DEVICE_READ",
  mobile_diagnose: "DEVICE_READ",
};

export const MOBILE_TOOL_DESCRIPTIONS: Record<MobileToolName, string> = {
  mobile_doctor: "Report sidecar, interpreter, donor, and ADB-binary availability.",
  mobile_devices: "List candidate device identities known to configuration.",
  mobile_run: "Admit a validated Pro plan for a future execution phase.",
  mobile_status: "Report the status of an admitted run.",
  mobile_cancel: "Request cancellation of an admitted run.",
  mobile_evidence: "Bind evidence artifacts for an admitted run.",
  mobile_replay: "Admit a recorded-range replay plan.",
  mobile_diagnose: "Bind a diagnostic report for an admitted run.",
};

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be an opaque id");
  }
  return value;
}

function requireExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  field: string,
): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    !wanted.every((key, index) => key === actual[index])
  ) {
    throw new TypeError(field + " must contain exactly the declared arguments");
  }
}

export type MobileToolArgsResult =
  | { readonly ok: true; readonly value: Record<string, unknown> }
  | { readonly ok: false; readonly reason: string };

export function validateMobileToolArgsV1(
  tool: MobileToolName,
  args: unknown,
  maxSteps: number,
): MobileToolArgsResult {
  try {
    if (typeof args !== "object" || args === null || Array.isArray(args)) {
      throw new TypeError("tool arguments must be an object");
    }
    const record = args as Record<string, unknown>;
    switch (tool) {
      case "mobile_doctor":
      case "mobile_devices":
      case "mobile_status": {
        if (tool === "mobile_status") {
          requireExactKeys(record, ["run_id"], tool);
          requireOpaqueId(record["run_id"], "run_id");
        } else if (Object.keys(record).length !== 0) {
          throw new TypeError(tool + " takes no arguments");
        }
        return { ok: true, value: { ...record } };
      }
      case "mobile_cancel":
      case "mobile_evidence":
      case "mobile_diagnose": {
        requireExactKeys(record, ["run_id"], tool);
        requireOpaqueId(record["run_id"], "run_id");
        return { ok: true, value: { run_id: record["run_id"] as string } };
      }
      case "mobile_run": {
        requireExactKeys(record, ["plan", "max_steps"], tool);
        const planned = planProRunV1(record["plan"], maxSteps);
        if (!planned.ok) throw new TypeError("run plan rejected: " + planned.reason);
        return { ok: true, value: { plan: planned.value, max_steps: maxSteps } };
      }
      case "mobile_replay": {
        requireExactKeys(record, ["run_id", "from_step"], tool);
        requireOpaqueId(record["run_id"], "run_id");
        if (
          typeof record["from_step"] !== "number" ||
          !Number.isInteger(record["from_step"]) ||
          (record["from_step"] as number) < 0
        ) {
          throw new TypeError("from_step must be a non-negative integer");
        }
        return {
          ok: true,
          value: {
            run_id: record["run_id"] as string,
            from_step: record["from_step"] as number,
          },
        };
      }
    }
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "tool arguments refused",
    };
  }
}

export type MobileAdmission =
  | { readonly admitted: true; readonly tool: MobileToolName; readonly effect: MobileEffect }
  | { readonly admitted: false; readonly reason: string };

export function admitMobileToolCallV1(
  tool: unknown,
  args: unknown,
  admittedEffects: readonly MobileEffect[],
  maxSteps: number,
): MobileAdmission {
  if (
    typeof tool !== "string" ||
    !(MOBILE_TOOLS as readonly string[]).includes(tool)
  ) {
    return { admitted: false, reason: "unknown mobile tool" };
  }
  const name = tool as MobileToolName;
  const required = MOBILE_TOOL_EFFECTS[name];
  if (!admittedEffects.includes(required)) {
    return {
      admitted: false,
      reason: "effect " + required + " not admitted for " + name,
    };
  }
  const validated = validateMobileToolArgsV1(name, args, maxSteps);
  if (!validated.ok) {
    return { admitted: false, reason: validated.reason };
  }
  return { admitted: true, tool: name, effect: required };
}

export function mobileCliVerbV1(tool: MobileToolName): string {
  return tool.replace(/^mobile_/u, "mobile ").replace(/_/gu, " ");
}
