export const KODAC_CHARACTERIZATION_SCHEMA_VERSION = 1 as const;

export const KODAC_INTEGRATION_MODE = "PATTERN_ONLY" as const;

export const KODAC_SELECTED_SCHEMA_IDS = Object.freeze([
  "o2-durable-workflow-evidence-kernel",
  "p9-r1-freshness-dependency-invalidation",
  "p7-exact-target-head-review-run-evidence-binding",
  "p7-exact-target-head-complete-review-context-evidence-binding",
  "p7-done-gate-proof-binding",
  "o4f-safe-github-publication-admission",
  "o4g-bounded-github-review-publication",
  "kri-reviewer-qualification",
]) as readonly string[];

export const KODAC_RETRY_CLASSES = [
  "INITIAL",
  "SAFE_REPLAY",
  "IDEMPOTENT_REREAD",
  "NEW_INTELLIGENCE_ATTEMPT",
  "SIDE_EFFECT_RETRY",
] as const;

export type KodacRetryClassV1 = (typeof KODAC_RETRY_CLASSES)[number];

export function isSideEffectRetryV1(retryClass: KodacRetryClassV1): boolean {
  return retryClass === "SIDE_EFFECT_RETRY";
}

export const WORKFLOW_FRESHNESS_STATES = [
  "CURRENT",
  "STALE",
  "UNKNOWN",
] as const;

export type WorkflowFreshnessStateV1 =
  (typeof WORKFLOW_FRESHNESS_STATES)[number];

const GIT_SHA_HEX = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;

export function evaluateWorkflowFreshnessV1(
  observedHead: string,
  expectedHead: string,
): WorkflowFreshnessStateV1 {
  if (!GIT_SHA_HEX.test(observedHead) || !GIT_SHA_HEX.test(expectedHead)) {
    return "UNKNOWN";
  }
  return observedHead === expectedHead ? "CURRENT" : "STALE";
}

export const PUBLICATION_PHASES = [
  "GENERATION",
  "INTENT",
  "AUTHORIZATION",
  "EFFECT",
  "RECEIPT",
] as const;

export type PublicationPhaseV1 = (typeof PUBLICATION_PHASES)[number];

export function isPublicationEffectV1(phase: PublicationPhaseV1): boolean {
  return phase === "EFFECT";
}

export function generationImpliesPublicationV1(): boolean {
  return false;
}

export interface ReviewerLineageV1 {
  readonly model: string;
  readonly provider: string;
  readonly context: string;
}

export function isSelfReviewV1(
  first: ReviewerLineageV1,
  second: ReviewerLineageV1,
): boolean {
  return (
    first.model === second.model &&
    first.provider === second.provider &&
    first.context === second.context
  );
}

export interface DoneGateInputV1 {
  readonly required_proofs: readonly string[];
  readonly provided_proofs: readonly string[];
}

export function isDoneGateSatisfiedV1(input: DoneGateInputV1): boolean {
  return input.required_proofs.every((proof) =>
    input.provided_proofs.includes(proof),
  );
}

export interface TransitionBindingV1 {
  readonly run_identity: string;
  readonly step_identity: string;
  readonly attempt_identity: string;
  readonly idempotency_identity: string;
  readonly prior_attempt_identity: string | null;
  readonly subject_head: string;
  readonly retry_class: KodacRetryClassV1;
}

const SHA256_HEX = /^[a-f0-9]{64}$/u;

export function isCompleteTransitionBindingV1(
  binding: TransitionBindingV1,
): boolean {
  if (
    !SHA256_HEX.test(binding.run_identity) ||
    !SHA256_HEX.test(binding.step_identity) ||
    !SHA256_HEX.test(binding.attempt_identity) ||
    !SHA256_HEX.test(binding.idempotency_identity)
  ) {
    return false;
  }
  if (
    binding.prior_attempt_identity !== null &&
    !SHA256_HEX.test(binding.prior_attempt_identity)
  ) {
    return false;
  }
  if (!GIT_SHA_HEX.test(binding.subject_head)) {
    return false;
  }
  return (KODAC_RETRY_CLASSES as readonly string[]).includes(
    binding.retry_class,
  );
}
