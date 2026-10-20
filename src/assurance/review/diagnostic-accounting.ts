import { isDeepStrictEqual } from "node:util";

import {
  computeReviewCoverageV1,
  type ReviewCoverageInputV1,
  type ReviewCoverageV1,
} from "./coverage-accounting.js";
import {
  validateObservationLocationV1,
  type LocationValidationContextV1,
  type LocationValidationV1,
} from "./location-validator.js";
import {
  assertRawReviewObservationV1,
  type ObservationExecutionBindingV1,
  type RawReviewObservationV1,
} from "./raw-observation.js";

export interface DiagnosticExclusionV1 {
  readonly observation_id: string;
  readonly execution_binding: ObservationExecutionBindingV1;
  readonly kind: "PRODUCER_SUPPRESSION" | "DIFF_EXCLUSION";
  readonly reason: string;
}

export interface DiagnosticNormalizationEntryV1 {
  readonly observation: RawReviewObservationV1;
  readonly validation: LocationValidationV1;
}

export interface DiagnosticBatchInputV1 {
  readonly execution_binding: ObservationExecutionBindingV1;
  /** Original producer inventory, captured before any filtering or normalization. */
  readonly observations: readonly RawReviewObservationV1[];
  readonly entries: readonly DiagnosticNormalizationEntryV1[];
  readonly exclusions: readonly DiagnosticExclusionV1[];
  readonly location_context: LocationValidationContextV1;
  readonly coverage: ReviewCoverageInputV1;
}

export interface DiagnosticAccountingEntryV1 {
  readonly observation_id: string;
  readonly state: "RETAINED" | "REJECTED_INPUT" | "MISSING_OUTPUT"
    | DiagnosticExclusionV1["kind"];
  readonly reasons: readonly string[];
}

export interface DiagnosticAccountingV1 {
  readonly schema_version: 1;
  readonly execution_binding: ObservationExecutionBindingV1;
  readonly entries: readonly DiagnosticAccountingEntryV1[];
  /** Only input/output reconciliation; never scan, location, or quality completeness. */
  readonly complete: boolean;
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

/** Prepare one source-bound batch; normalized records remain the sole finding representation. */
export function accountReviewDiagnosticsV1(input: DiagnosticBatchInputV1): {
  readonly entries: readonly DiagnosticNormalizationEntryV1[];
  readonly coverage: ReviewCoverageV1;
  readonly accounting: DiagnosticAccountingV1;
} {
  const fail = (reason: string): never => {
    throw new TypeError("invalid diagnostic accounting input: " + reason);
  };
  const binding = input.execution_binding;
  if (
    ![binding.engine_id, binding.binary_name, binding.profile_id, binding.capsule_id]
      .every((value) => typeof value === "string" && OPAQUE_ID.test(value)) ||
    typeof binding.observed_version !== "string" || binding.observed_version.length === 0
  ) {
    fail("execution binding invalid");
  }
  // Existing coverage validation also validates the source head and scope shape.
  const coverage = computeReviewCoverageV1(input.coverage);
  if (coverage.head_sha !== binding.head_sha ||
    input.location_context.expected_head_sha !== binding.head_sha) {
    fail("coverage/location source binding mismatch");
  }
  if (!Array.isArray(input.observations) || !Array.isArray(input.entries) ||
    !Array.isArray(input.exclusions)) {
    fail("inventory, entries and exclusions must be lists");
  }
  const originals = new Map<string, RawReviewObservationV1>();
  const rejected = new Map<string, readonly string[]>();
  for (const observation of input.observations) {
    const id = observation.observation_id;
    if (typeof id !== "string" || !OPAQUE_ID.test(id)) {
      fail("original observation id invalid");
    }
    if (originals.has(id)) {
      fail("duplicate original observation id: " + id);
    }
    if (!isDeepStrictEqual(observation.execution_binding, binding)) {
      fail("original execution binding mismatch: " + id);
    }
    originals.set(id, observation);
    const check = assertRawReviewObservationV1(observation);
    const reasons = [...check.reasons];
    // The legacy raw-path regex coerces runtime values; do not repair their type.
    if (observation.location_hint !== null &&
      typeof observation.location_hint.path !== "string" &&
      !reasons.includes("location path invalid")) {
      reasons.push("location path invalid");
    }
    if (reasons.length > 0) {
      rejected.set(id, reasons);
    }
  }

  const outputs = new Map<string, DiagnosticNormalizationEntryV1>();
  const exclusions = new Map<string, DiagnosticExclusionV1>();
  const claim = (id: string): RawReviewObservationV1 => {
    const original = originals.get(id);
    if (original === undefined) {
      return fail("undeclared diagnostic id");
    }
    if (outputs.has(id) || exclusions.has(id)) {
      return fail("duplicate diagnostic disposition: " + id);
    }
    return original;
  };
  for (const entry of input.entries) {
    const id = entry.observation.observation_id;
    const original = claim(id);
    if (!isDeepStrictEqual(entry.observation, original)) {
      fail("output differs from original observation: " + id);
    }
    if (!rejected.has(id)) {
      const expected = validateObservationLocationV1(original, input.location_context);
      if (!isDeepStrictEqual(entry.validation, expected)) {
        fail("output location validation mismatch: " + id);
      }
    }
    outputs.set(id, entry);
  }
  for (const exclusion of input.exclusions) {
    const id = exclusion.observation_id;
    claim(id);
    if (!isDeepStrictEqual(exclusion.execution_binding, binding)) {
      fail("exclusion execution binding mismatch: " + id);
    }
    if (rejected.has(id) ||
      !["PRODUCER_SUPPRESSION", "DIFF_EXCLUSION"].includes(exclusion.kind) ||
      typeof exclusion.reason !== "string" || exclusion.reason.trim().length === 0) {
      fail("exclusion kind/reason invalid or original input rejected: " + id);
    }
    exclusions.set(id, exclusion);
  }

  const entries: DiagnosticNormalizationEntryV1[] = [];
  const accounting: DiagnosticAccountingEntryV1[] = [];
  for (const id of originals.keys()) {
    const rejection = rejected.get(id);
    const output = outputs.get(id);
    const exclusion = exclusions.get(id);
    let state: DiagnosticAccountingEntryV1["state"];
    let reasons: readonly string[];
    if (rejection !== undefined) {
      state = "REJECTED_INPUT";
      reasons = rejection;
    } else if (output !== undefined) {
      state = "RETAINED";
      reasons = output.validation.reasons;
    } else if (exclusion !== undefined) {
      state = exclusion.kind;
      reasons = [exclusion.reason];
    } else {
      state = "MISSING_OUTPUT";
      reasons = ["declared diagnostic has no output or explicit exclusion"];
    }
    accounting.push(Object.freeze({ observation_id: id, state, reasons: Object.freeze([...reasons]) }));
  }
  // Preserve the existing batch API's output order while rejecting invalid raw inputs.
  for (const [id, output] of outputs) {
    if (!rejected.has(id)) {
      entries.push(output);
    }
  }
  return Object.freeze({
    entries: Object.freeze(entries),
    coverage,
    accounting: Object.freeze({
      schema_version: 1,
      execution_binding: Object.freeze({ ...binding }),
      entries: Object.freeze(accounting),
      complete: accounting.every((item) => item.state !== "MISSING_OUTPUT"),
    }),
  });
}
