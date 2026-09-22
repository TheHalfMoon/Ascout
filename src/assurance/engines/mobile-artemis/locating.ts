import type { HierarchyNodeV1 } from "./evidence.js";

export const LOCATOR_STRATEGIES = [
  "ACCESSIBILITY_ID",
  "RESOURCE_ID",
  "TEXT",
  "CONTENT_DESC",
  "CLASS_HIERARCHY",
  "OCR_TEXT",
  "VISION_REGION",
  "COORDINATE_FALLBACK",
] as const;

export type LocatorStrategy = (typeof LOCATOR_STRATEGIES)[number];

export const PLATFORM_FRAMEWORKS = [
  "NATIVE_VIEW",
  "COMPOSE",
  "FLUTTER",
  "CANVAS",
  "WEBVIEW",
  "UNKNOWN_FRAMEWORK",
] as const;

export type PlatformFramework = (typeof PLATFORM_FRAMEWORKS)[number];

export const SELECTOR_MAX_CHARS = 1024 as const;
export const FALLBACK_REASON_MAX_CHARS = 512 as const;
export const DYNAMIC_CANDIDATE_MAX = 1024 as const;

function requireSelector(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > SELECTOR_MAX_CHARS
  ) {
    throw new TypeError(field + " must be 1..1024 chars");
  }
  return value;
}

export interface LocatorStepV1 {
  readonly strategy: LocatorStrategy;
  readonly fallback: boolean;
  readonly fallbackReason: string;
}

export interface LocatorPlanV1 {
  readonly steps: readonly LocatorStepV1[];
  readonly coordinateFallback: boolean;
}

export type LocatorPlanResult =
  | { readonly ok: true; readonly value: LocatorPlanV1 }
  | { readonly ok: false; readonly reason: string };

export function planLocatorV1(
  strategies: readonly unknown[],
  coordinateFallbackReason: string,
): LocatorPlanResult {
  try {
    if (strategies.length === 0) throw new TypeError("strategy list must not be empty");
    if (strategies.length > LOCATOR_STRATEGIES.length) {
      throw new TypeError("strategy list exceeds catalog");
    }
    const seen = new Set<string>();
    const steps: LocatorStepV1[] = [];
    let coordinateFallback = false;
    for (const entry of strategies) {
      if (
        typeof entry !== "string" ||
        !(LOCATOR_STRATEGIES as readonly string[]).includes(entry)
      ) {
        throw new TypeError("unknown locator strategy");
      }
      if (seen.has(entry)) throw new TypeError("duplicate locator strategy");
      seen.add(entry);
      if (entry === "COORDINATE_FALLBACK") {
        if (
          typeof coordinateFallbackReason !== "string" ||
          coordinateFallbackReason.length < 1 ||
          coordinateFallbackReason.length > FALLBACK_REASON_MAX_CHARS
        ) {
          throw new TypeError("coordinate fallback requires a 1..512 char reason");
        }
        coordinateFallback = true;
        steps.push({
          strategy: "COORDINATE_FALLBACK",
          fallback: true,
          fallbackReason: coordinateFallbackReason,
        });
        continue;
      }
      steps.push({
        strategy: entry as LocatorStrategy,
        fallback: false,
        fallbackReason: "",
      });
    }
    const order = (strategy: LocatorStrategy): number =>
      LOCATOR_STRATEGIES.indexOf(strategy);
    const ranked = [...steps].sort((left, right) => {
      const leftFallback = left.fallback ? 1 : 0;
      const rightFallback = right.fallback ? 1 : 0;
      if (leftFallback !== rightFallback) return leftFallback - rightFallback;
      return order(left.strategy) - order(right.strategy);
    });
    return {
      ok: true,
      value: { steps: ranked, coordinateFallback },
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "locator plan refused",
    };
  }
}

export type DynamicMatchRule = "exact" | "prefix" | "contains";

export interface DynamicTargetV1 {
  readonly rule: DynamicMatchRule;
  readonly pattern: string;
}

export interface DynamicMatchV1 {
  readonly candidate: string;
  readonly rule: DynamicMatchRule;
}

export type DynamicMatchResult =
  | { readonly ok: true; readonly value: readonly DynamicMatchV1[] }
  | { readonly ok: false; readonly reason: string };

export function matchDynamicTargetV1(
  target: { readonly rule: unknown; readonly pattern: unknown },
  candidates: readonly unknown[],
): DynamicMatchResult {
  try {
    if (target.rule !== "exact" && target.rule !== "prefix" && target.rule !== "contains") {
      throw new TypeError("dynamic match rule must be exact, prefix, or contains");
    }
    const pattern = requireSelector(target.pattern, "dynamic pattern");
    if (candidates.length > DYNAMIC_CANDIDATE_MAX) {
      throw new TypeError("candidate bound exceeded");
    }
    const matches: DynamicMatchV1[] = [];
    for (const candidate of candidates) {
      if (typeof candidate !== "string") continue;
      if (target.rule === "exact" && candidate === pattern) {
        matches.push({ candidate, rule: "exact" });
      } else if (target.rule === "prefix" && candidate.startsWith(pattern)) {
        matches.push({ candidate, rule: "prefix" });
      } else if (
        target.rule === "contains" &&
        pattern.length > 0 &&
        candidate.includes(pattern)
      ) {
        matches.push({ candidate, rule: "contains" });
      }
    }
    return { ok: true, value: matches };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "dynamic match refused",
    };
  }
}

export function classifyFrameworkV1(className: string): PlatformFramework {
  if (typeof className !== "string" || className.length === 0) {
    return "UNKNOWN_FRAMEWORK";
  }
  if (className.startsWith("androidx.compose.")) return "COMPOSE";
  if (
    className.startsWith("io.flutter.") ||
    className.startsWith("io.flutter_")
  ) {
    return "FLUTTER";
  }
  if (
    className.startsWith("android.webkit.") ||
    className.includes("WebView")
  ) {
    return "WEBVIEW";
  }
  if (
    className.includes("Canvas") ||
    className === "android.view.SurfaceView" ||
    className === "android.view.TextureView"
  ) {
    return "CANVAS";
  }
  if (className.startsWith("android.") || className.startsWith("com.android.")) {
    return "NATIVE_VIEW";
  }
  return "UNKNOWN_FRAMEWORK";
}

export interface LocatorAttemptV1 {
  readonly strategy: LocatorStrategy;
  readonly selector: string;
  readonly matched: boolean;
  readonly nodeIndex: number;
}

export interface LocatorEvidenceV1 {
  readonly winningStrategy: LocatorStrategy | null;
  readonly coordinateFallbackUsed: boolean;
  readonly attempts: readonly LocatorAttemptV1[];
}

export type LocatorEvidenceResult =
  | { readonly ok: true; readonly value: LocatorEvidenceV1 }
  | { readonly ok: false; readonly reason: string };

export function bindLocatorEvidenceV1(
  attempts: readonly {
    readonly strategy: unknown;
    readonly selector: unknown;
    readonly matched: unknown;
    readonly nodeIndex: unknown;
  }[],
): LocatorEvidenceResult {
  try {
    if (attempts.length === 0) throw new TypeError("attempt list must not be empty");
    if (attempts.length > 64) throw new TypeError("attempt bound exceeded");
    const bound: LocatorAttemptV1[] = [];
    let winningStrategy: LocatorStrategy | null = null;
    let coordinateFallbackUsed = false;
    for (const attempt of attempts) {
      if (
        typeof attempt.strategy !== "string" ||
        !(LOCATOR_STRATEGIES as readonly string[]).includes(attempt.strategy)
      ) {
        throw new TypeError("unknown attempt strategy");
      }
      const strategy = attempt.strategy as LocatorStrategy;
      if (typeof attempt.matched !== "boolean") {
        throw new TypeError("attempt matched must be boolean");
      }
      if (
        typeof attempt.nodeIndex !== "number" ||
        !Number.isInteger(attempt.nodeIndex) ||
        attempt.nodeIndex < -1
      ) {
        throw new TypeError("attempt nodeIndex must be an integer >= -1");
      }
      if (strategy === "COORDINATE_FALLBACK" && attempt.matched) {
        coordinateFallbackUsed = true;
      }
      if (attempt.matched && winningStrategy === null) {
        winningStrategy = strategy;
      }
      bound.push({
        strategy,
        selector: requireSelector(attempt.selector, "attempt selector"),
        matched: attempt.matched,
        nodeIndex: attempt.nodeIndex,
      });
    }
    return {
      ok: true,
      value: Object.freeze({
        winningStrategy,
        coordinateFallbackUsed,
        attempts: bound,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "locator evidence refused",
    };
  }
}

export function frameworkOfNodeV1(node: HierarchyNodeV1): PlatformFramework {
  return classifyFrameworkV1(node.className);
}
