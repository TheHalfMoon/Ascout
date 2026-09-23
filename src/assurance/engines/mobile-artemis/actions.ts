import type { AssuranceEffectClass } from "../../contracts/intent.js";
import { mobileEffectCeiling, type MobileEffect } from "./effects.js";

export const MOBILE_ACTIONS = [
  "TAP",
  "TYPE",
  "SWIPE",
  "BACK",
  "HOME",
  "APP_LAUNCH",
] as const;

export type MobileActionKind = (typeof MOBILE_ACTIONS)[number];

export const MOBILE_ACTION_EFFECTS: Record<MobileActionKind, MobileEffect> = {
  TAP: "DEVICE_INPUT",
  TYPE: "DEVICE_INPUT",
  SWIPE: "DEVICE_INPUT",
  BACK: "DEVICE_INPUT",
  HOME: "DEVICE_INPUT",
  APP_LAUNCH: "APP_LAUNCH",
};

export const COORDINATE_MAX = 100000 as const;
export const TYPE_MAX_CHARS = 4096 as const;
export const SWIPE_MAX_DURATION_MS = 10000 as const;
export const SEQUENCE_MAX_ACTIONS = 64 as const;

const TYPE_CHARSET = /^[A-Za-z0-9 .,!?@_:/+-]*$/u;
const PACKAGE_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/u;

export interface TapArgsV1 {
  readonly x: number;
  readonly y: number;
}

export interface TypeArgsV1 {
  readonly text: string;
}

export interface SwipeArgsV1 {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly duration_ms: number;
}

export interface AppLaunchArgsV1 {
  readonly package: string;
}

export type MobileActionArgsV1 =
  | { readonly kind: "TAP"; readonly args: TapArgsV1 }
  | { readonly kind: "TYPE"; readonly args: TypeArgsV1 }
  | { readonly kind: "SWIPE"; readonly args: SwipeArgsV1 }
  | { readonly kind: "BACK"; readonly args: Record<string, never> }
  | { readonly kind: "HOME"; readonly args: Record<string, never> }
  | { readonly kind: "APP_LAUNCH"; readonly args: AppLaunchArgsV1 };

function requireCoordinate(value: unknown, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > COORDINATE_MAX
  ) {
    throw new TypeError(field + " must be an integer 0..100000");
  }
  return value;
}

function requireTypeText(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > TYPE_MAX_CHARS ||
    !TYPE_CHARSET.test(value)
  ) {
    throw new TypeError("type text must be 1..4096 allowlisted chars");
  }
  return value;
}

function requireDurationMs(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > SWIPE_MAX_DURATION_MS
  ) {
    throw new TypeError("duration_ms must be an integer 0..10000");
  }
  return value;
}

function requirePackage(value: unknown): string {
  if (typeof value !== "string" || !PACKAGE_PATTERN.test(value)) {
    throw new TypeError("package must be a dotted application id");
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type MobileActionParse<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

export function parseMobileActionV1(value: unknown): MobileActionParse<MobileActionArgsV1> {
  try {
    if (!isRecord(value)) throw new TypeError("action must be an object");
    const keys = Object.keys(value).sort();
    if (keys.length !== 2 || keys[0] !== "args" || keys[1] !== "kind") {
      throw new TypeError("action must contain exactly kind and args");
    }
    const kind = value["kind"];
    if (typeof kind !== "string" || !(MOBILE_ACTIONS as readonly string[]).includes(kind)) {
      throw new TypeError("action kind unknown");
    }
    const args = value["args"];
    if (!isRecord(args)) throw new TypeError("action args must be an object");
    switch (kind as MobileActionKind) {
      case "TAP": {
        if (Object.keys(args).sort().join(",") !== "x,y") {
          throw new TypeError("tap args must be exactly x and y");
        }
        return {
          ok: true,
          value: {
            kind: "TAP",
            args: {
              x: requireCoordinate(args["x"], "tap.x"),
              y: requireCoordinate(args["y"], "tap.y"),
            },
          },
        };
      }
      case "TYPE": {
        if (Object.keys(args).sort().join(",") !== "text") {
          throw new TypeError("type args must be exactly text");
        }
        return {
          ok: true,
          value: { kind: "TYPE", args: { text: requireTypeText(args["text"]) } },
        };
      }
      case "SWIPE": {
        if (Object.keys(args).sort().join(",") !== "duration_ms,x1,x2,y1,y2") {
          throw new TypeError("swipe args must be exactly coordinates and duration");
        }
        return {
          ok: true,
          value: {
            kind: "SWIPE",
            args: {
              x1: requireCoordinate(args["x1"], "swipe.x1"),
              y1: requireCoordinate(args["y1"], "swipe.y1"),
              x2: requireCoordinate(args["x2"], "swipe.x2"),
              y2: requireCoordinate(args["y2"], "swipe.y2"),
              duration_ms: requireDurationMs(args["duration_ms"]),
            },
          },
        };
      }
      case "BACK":
      case "HOME": {
        if (Object.keys(args).length !== 0) {
          throw new TypeError(kind + " takes no arguments");
        }
        const keyless = kind as "BACK" | "HOME";
        return { ok: true, value: { kind: keyless, args: {} } };
      }
      case "APP_LAUNCH": {
        if (Object.keys(args).sort().join(",") !== "package") {
          throw new TypeError("launch args must be exactly package");
        }
        return {
          ok: true,
          value: { kind: "APP_LAUNCH", args: { package: requirePackage(args["package"]) } },
        };
      }
    }
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "action rejected",
    };
  }
}

export interface MobileSequenceV1 {
  readonly actions: readonly MobileActionArgsV1[];
}

export type SequenceAdmission =
  | { readonly ok: true; readonly value: MobileSequenceV1 }
  | { readonly ok: false; readonly reason: string };

export function admitMobileSequenceV1(
  actions: readonly unknown[],
  admittedEffects: readonly MobileEffect[],
  maxSteps: number,
): SequenceAdmission {
  try {
    if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 1000000) {
      throw new TypeError("maxSteps must be a bounded positive integer");
    }
    if (actions.length === 0) throw new TypeError("sequence must not be empty");
    if (actions.length > SEQUENCE_MAX_ACTIONS) {
      throw new TypeError("sequence exceeds 64 actions");
    }
    if (actions.length > maxSteps) {
      throw new TypeError("sequence exceeds the admitted step budget");
    }
    const parsed: MobileActionArgsV1[] = [];
    for (const action of actions) {
      const result = parseMobileActionV1(action);
      if (!result.ok) throw new TypeError("sequence action rejected: " + result.reason);
      const required = MOBILE_ACTION_EFFECTS[result.value.kind];
      if (!admittedEffects.includes(required)) {
        throw new TypeError(
          "effect " + required + " not admitted for " + result.value.kind,
        );
      }
      parsed.push(result.value);
    }
    return { ok: true, value: { actions: parsed } };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "sequence refused",
    };
  }
}

export function mobileActionCeiling(kind: MobileActionKind): AssuranceEffectClass {
  return mobileEffectCeiling(MOBILE_ACTION_EFFECTS[kind]);
}

function encodeInputText(text: string): string {
  return text.replace(/ /gu, "%s");
}

export interface InputArgvV1 {
  readonly adb: "adb";
  readonly args: readonly string[];
}

export function buildInputArgvV1(action: MobileActionArgsV1): InputArgvV1 {
  switch (action.kind) {
    case "TAP":
      return {
        adb: "adb",
        args: ["shell", "input", "tap", String(action.args.x), String(action.args.y)],
      };
    case "TYPE":
      return {
        adb: "adb",
        args: ["shell", "input", "text", encodeInputText(action.args.text)],
      };
    case "SWIPE":
      return {
        adb: "adb",
        args: [
          "shell",
          "input",
          "swipe",
          String(action.args.x1),
          String(action.args.y1),
          String(action.args.x2),
          String(action.args.y2),
          String(action.args.duration_ms),
        ],
      };
    case "BACK":
      return { adb: "adb", args: ["shell", "input", "keyevent", "KEYCODE_BACK"] };
    case "HOME":
      return { adb: "adb", args: ["shell", "input", "keyevent", "KEYCODE_HOME"] };
    case "APP_LAUNCH":
      return {
        adb: "adb",
        args: [
          "shell",
          "monkey",
          "-p",
          action.args.package,
          "-c",
          "android.intent.category.LAUNCHER",
          "1",
        ],
      };
  }
}
