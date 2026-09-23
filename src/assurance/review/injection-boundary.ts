import {
  assertRawReviewObservationV1,
  type RawReviewObservationV1,
} from "./raw-observation.js";

export const INJECTION_BOUNDARY_SCHEMA_VERSION = 1 as const;

export const INJECTION_VERDICTS = ["CLEAN", "INJECTION_DETECTED"] as const;

export type InjectionVerdictV1 = (typeof INJECTION_VERDICTS)[number];

export const INJECTION_CLASSES = [
  "AUTHORITY_OVERRIDE",
  "ROLE_REASSIGNMENT",
  "TOOL_EFFECT_CLAIM",
  "GOVERNANCE_OVERRIDE",
] as const;

export type InjectionClassV1 = (typeof INJECTION_CLASSES)[number];

export interface InjectionScreenV1 {
  readonly schema_version: 1;
  readonly observation_id: string;
  readonly verdict: InjectionVerdictV1;
  readonly classes: readonly InjectionClassV1[];
  readonly reasons: readonly string[];
  readonly screened_fields: readonly string[];
  readonly attempt_excerpt: string;
  readonly attempt_truncated: boolean;
}

export interface InjectionScreenCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

const MAX_EXCERPT_CHARS = 1024 as const;

const PATTERNS: readonly {
  readonly phrase: string;
  readonly kind: InjectionClassV1;
}[] = Object.freeze([
  { phrase: "ignore previous instructions", kind: "AUTHORITY_OVERRIDE" },
  { phrase: "ignore all previous instructions", kind: "AUTHORITY_OVERRIDE" },
  { phrase: "disregard previous instructions", kind: "AUTHORITY_OVERRIDE" },
  { phrase: "disregard all previous", kind: "AUTHORITY_OVERRIDE" },
  { phrase: "override previous", kind: "AUTHORITY_OVERRIDE" },
  { phrase: "bypass review", kind: "AUTHORITY_OVERRIDE" },
  { phrase: "bypass verification", kind: "AUTHORITY_OVERRIDE" },
  { phrase: "you are now", kind: "ROLE_REASSIGNMENT" },
  { phrase: "act as system", kind: "ROLE_REASSIGNMENT" },
  { phrase: "pretend to be", kind: "ROLE_REASSIGNMENT" },
  { phrase: "new system prompt", kind: "ROLE_REASSIGNMENT" },
  { phrase: "reveal system prompt", kind: "ROLE_REASSIGNMENT" },
  { phrase: "run shell command", kind: "TOOL_EFFECT_CLAIM" },
  { phrase: "execute shell", kind: "TOOL_EFFECT_CLAIM" },
  { phrase: "delete the repository", kind: "TOOL_EFFECT_CLAIM" },
  { phrase: "publish this review", kind: "TOOL_EFFECT_CLAIM" },
  { phrase: "push to main", kind: "TOOL_EFFECT_CLAIM" },
  { phrase: "merge this pull", kind: "TOOL_EFFECT_CLAIM" },
  { phrase: "grant write access", kind: "TOOL_EFFECT_CLAIM" },
  { phrase: "approve this change", kind: "TOOL_EFFECT_CLAIM" },
  { phrase: "widen authority", kind: "GOVERNANCE_OVERRIDE" },
  { phrase: "elevate privilege", kind: "GOVERNANCE_OVERRIDE" },
  { phrase: "disable verification", kind: "GOVERNANCE_OVERRIDE" },
  { phrase: "skip verification", kind: "GOVERNANCE_OVERRIDE" },
  { phrase: "skip review", kind: "GOVERNANCE_OVERRIDE" },
  { phrase: "mark as verified", kind: "GOVERNANCE_OVERRIDE" },
]);

function normalizeSeparators(text: string): string {
  return text.replace(/[-_.:]+/gu, " ").replace(/\s+/gu, " ");
}

function excerptOf(text: string): {
  readonly excerpt: string;
  readonly truncated: boolean;
} {
  if (text.length <= MAX_EXCERPT_CHARS) {
    return { excerpt: text, truncated: false };
  }
  return { excerpt: text.slice(0, MAX_EXCERPT_CHARS), truncated: true };
}

export function screenObservationInjectionV1(
  observation: RawReviewObservationV1,
): InjectionScreenV1 {
  const shape = assertRawReviewObservationV1(observation);
  if (!shape.ok) {
    throw new TypeError(
      "invalid injection screen input: " + shape.reasons.join("; "),
    );
  }
  const fields: { readonly name: string; readonly text: string }[] = [
    { name: "body", text: observation.body },
    { name: "category_hint", text: observation.category_hint },
  ];
  if (observation.rule_id !== null) {
    fields.push({ name: "rule_id", text: observation.rule_id });
  }
  const matched = new Map<InjectionClassV1, string[]>();
  const screenedFields: string[] = [];
  let attemptText = "";
  for (const field of fields) {
    // Separator folding defeats hyphen/underscore/dot/colon variants
    // (e.g. rule ids like "rule:skip-review"); patterns are stored
    // in already-folded form.
    const folded = normalizeSeparators(field.text.toLowerCase());
    let fieldHit = false;
    for (const pattern of PATTERNS) {
      if (folded.includes(pattern.phrase)) {
        fieldHit = true;
        const phrases = matched.get(pattern.kind);
        if (phrases === undefined) {
          matched.set(pattern.kind, [pattern.phrase]);
        } else if (!phrases.includes(pattern.phrase)) {
          phrases.push(pattern.phrase);
        }
        if (attemptText === "") {
          attemptText = field.text;
        }
      }
    }
    if (fieldHit) {
      screenedFields.push(field.name);
    }
  }
  const classes = Object.freeze(
    [...matched.keys()].sort(),
  ) as readonly InjectionClassV1[];
  const reasons = Object.freeze(
    [...matched.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(
        ([kind, phrases]) =>
          kind + ": matched " + [...phrases].sort().join(", "),
      ),
  );
  const excerpt = excerptOf(
    attemptText === "" ? observation.body : attemptText,
  );
  const verdict: InjectionVerdictV1 =
    classes.length === 0 ? "CLEAN" : "INJECTION_DETECTED";
  return Object.freeze({
    schema_version: INJECTION_BOUNDARY_SCHEMA_VERSION,
    observation_id: observation.observation_id,
    verdict,
    classes,
    reasons,
    screened_fields: Object.freeze([...screenedFields].sort()),
    attempt_excerpt: excerpt.excerpt,
    attempt_truncated: excerpt.truncated,
  });
}

export function isCleanInjectionScreenV1(
  screen: InjectionScreenV1,
): boolean {
  return screen.verdict === "CLEAN";
}
