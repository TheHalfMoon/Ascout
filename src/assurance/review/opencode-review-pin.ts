export const OPENCODE_REVIEW_REPOSITORY =
  "https://github.com/alibaba/open-code-review" as const;
export const OPENCODE_REVIEW_PINNED_SHA =
  "5f8e5ab328e1449ba4d5f14d2a7542117543d753" as const;
export const OPENCODE_REVIEW_PINNED_TREE =
  "727a2a6d34a26a274ad31a503171435f99f3a171" as const;
export const OPENCODE_REVIEW_LICENSE_IDENTITY = "license:apache-2.0" as const;
export const OPENCODE_REVIEW_PIN_REF =
  "provenance:opencode-review-pin-5f8e5ab328e1449ba4d5f14d2a7542117543d753" as const;

export type OpenCodeReviewNoticeState =
  | "ABSENT_UPSTREAM_AT_PIN"
  | "PRESENT_UPSTREAM_AT_PIN";

export interface OpenCodeReviewPinV1 {
  readonly repository: string;
  readonly commit_sha: string;
  readonly tree_sha: string;
  readonly license_identity: string;
  readonly notice_state: OpenCodeReviewNoticeState;
  readonly adapter_dependency_delta: string;
  readonly use_type: string;
  readonly pin_ref: string;
}

export interface OpenCodeReviewPinCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

const GIT_SHA_HEX = /^[a-f0-9]{40}$/u;

export function createOpenCodeReviewPinV1(): OpenCodeReviewPinV1 {
  const pin: OpenCodeReviewPinV1 = {
    repository: OPENCODE_REVIEW_REPOSITORY,
    commit_sha: OPENCODE_REVIEW_PINNED_SHA,
    tree_sha: OPENCODE_REVIEW_PINNED_TREE,
    license_identity: OPENCODE_REVIEW_LICENSE_IDENTITY,
    notice_state: "ABSENT_UPSTREAM_AT_PIN",
    adapter_dependency_delta: "NO_NEW_NPM_DEPENDENCY",
    use_type: "ADAPTER_EXTERNAL_BINARY",
    pin_ref: OPENCODE_REVIEW_PIN_REF,
  };
  return Object.freeze(pin);
}

export function assertOpenCodeReviewPinV1(
  pin: OpenCodeReviewPinV1,
): OpenCodeReviewPinCheckV1 {
  const reasons: string[] = [];
  if (pin.repository !== OPENCODE_REVIEW_REPOSITORY) {
    reasons.push("repository mismatch");
  }
  if (
    typeof pin.commit_sha !== "string" ||
    !GIT_SHA_HEX.test(pin.commit_sha)
  ) {
    reasons.push("commit sha invalid");
  }
  if (pin.commit_sha !== OPENCODE_REVIEW_PINNED_SHA) {
    reasons.push("commit sha mismatch");
  }
  if (typeof pin.tree_sha !== "string" || !GIT_SHA_HEX.test(pin.tree_sha)) {
    reasons.push("tree sha invalid");
  }
  if (pin.tree_sha !== OPENCODE_REVIEW_PINNED_TREE) {
    reasons.push("tree sha mismatch");
  }
  if (pin.license_identity !== OPENCODE_REVIEW_LICENSE_IDENTITY) {
    reasons.push("license identity mismatch");
  }
  if (
    pin.notice_state !== "ABSENT_UPSTREAM_AT_PIN" &&
    pin.notice_state !== "PRESENT_UPSTREAM_AT_PIN"
  ) {
    reasons.push("notice state invalid");
  }
  if (pin.adapter_dependency_delta !== "NO_NEW_NPM_DEPENDENCY") {
    reasons.push("adapter dependency delta not clean");
  }
  if (pin.use_type !== "ADAPTER_EXTERNAL_BINARY") {
    reasons.push("use type mismatch");
  }
  if (typeof pin.pin_ref !== "string" || pin.pin_ref.length === 0) {
    reasons.push("pin ref invalid");
  }
  return { ok: reasons.length === 0, reasons };
}

export type LzG01Outcome =
  | "COMPATIBLE_WITH_SUPPLEMENTAL_METADATA"
  | "CONTRACT_AMENDMENT_REQUIRED"
  | "DEFERRED";

export interface LzG01DecisionV1 {
  readonly outcome: LzG01Outcome;
  readonly rationale: readonly string[];
  readonly supplementary_dimensions: readonly string[];
}

const LZG01_DIMENSIONS = [
  "execution_location",
  "operator_monetary_cost_class",
  "user_external_monetary_cost_class",
  "data_egress_class",
  "network_requirement",
  "credential_requirement",
  "hardware_requirement",
  "artifact_sensitivity",
  "local_offline_availability",
  "runtime_isolation_requirement",
] as const;

export function decideLzG01V1(): LzG01DecisionV1 {
  const rationale = [
    "Frozen UA-P01 contracts already bind effect classes, process/network/provider requirements, and authority ceilings; the ten supplementary dimensions are additive policy/descriptor metadata, not corrections to frozen semantics.",
    "Review profile, context capsule, and cost/privacy/location metadata are new additive types under src/assurance/review/**; no frozen contract field changes meaning.",
    "Provider-dependent admission stays gated on explicit network/provider/egress authority with absence mapped to NOT_RUN/INCOMPLETE, preserving fail-closed behavior.",
  ];
  return Object.freeze({
    outcome: "COMPATIBLE_WITH_SUPPLEMENTAL_METADATA" as const,
    rationale: Object.freeze([...rationale]) as readonly string[],
    supplementary_dimensions: Object.freeze([...LZG01_DIMENSIONS]) as readonly string[],
  });
}

export function lzG01AdmitsProviderEnginesV1(
  decision: LzG01DecisionV1,
): boolean {
  return decision.outcome === "COMPATIBLE_WITH_SUPPLEMENTAL_METADATA";
}
