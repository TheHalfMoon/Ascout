import { createHash } from "node:crypto";

import {
  buildKodacSourcePinV1,
  type KodacSourcePinV1,
} from "./kodac-source-pin.js";
import type {
  DoneGateInputV1,
  ReviewerLineageV1,
  TransitionBindingV1,
} from "./kodac-capability-characterization.js";
import { PUBLICATION_PHASES } from "./kodac-capability-characterization.js";

export const KODAC_FIXTURE_SCHEMA_VERSION = 1 as const;

function hex64(seed: string): string {
  return createHash("sha256").update(seed, "utf8").digest("hex");
}

function head40(seed: string): string {
  return createHash("sha256").update(seed, "utf8").digest("hex").slice(0, 40);
}

export interface KodacCharacterizationFixtureSetV1 {
  readonly schema_version: 1;
  readonly source_pin: KodacSourcePinV1;
  readonly current_head: string;
  readonly stale_head: string;
  readonly transition: TransitionBindingV1;
  readonly retry_transition: TransitionBindingV1;
  readonly independent_first: ReviewerLineageV1;
  readonly independent_second: ReviewerLineageV1;
  readonly self_review_pair: readonly [ReviewerLineageV1, ReviewerLineageV1];
  readonly done_gate_satisfied: DoneGateInputV1;
  readonly done_gate_missing: DoneGateInputV1;
}

export function buildKodacCharacterizationFixturesV1(): KodacCharacterizationFixtureSetV1 {
  const pin = buildKodacSourcePinV1();
  const currentHead = head40("ascout/ua-p04-t01/current-head");
  const staleHead = head40("ascout/ua-p04-t01/stale-head");
  const runIdentity = hex64("ascout/ua-p04-t01/run");
  const stepIdentity = hex64("ascout/ua-p04-t01/step");
  const attemptIdentity = hex64("ascout/ua-p04-t01/attempt-1");
  const retryAttemptIdentity = hex64("ascout/ua-p04-t01/attempt-2");
  const idempotencyIdentity = hex64("ascout/ua-p04-t01/idempotency");
  const independentFirst: ReviewerLineageV1 = {
    model: "reviewer-model-a",
    provider: "provider-a",
    context: "context-a",
  };
  const independentSecond: ReviewerLineageV1 = {
    model: "reviewer-model-b",
    provider: "provider-b",
    context: "context-b",
  };
  const selfFirst: ReviewerLineageV1 = {
    model: "reviewer-model-a",
    provider: "provider-a",
    context: "context-a",
  };
  const selfSecond: ReviewerLineageV1 = {
    model: "reviewer-model-a",
    provider: "provider-a",
    context: "context-a",
  };
  return {
    schema_version: KODAC_FIXTURE_SCHEMA_VERSION,
    source_pin: pin,
    current_head: currentHead,
    stale_head: staleHead,
    transition: {
      run_identity: runIdentity,
      step_identity: stepIdentity,
      attempt_identity: attemptIdentity,
      idempotency_identity: idempotencyIdentity,
      prior_attempt_identity: null,
      subject_head: currentHead,
      retry_class: "INITIAL",
    },
    retry_transition: {
      run_identity: runIdentity,
      step_identity: stepIdentity,
      attempt_identity: retryAttemptIdentity,
      idempotency_identity: idempotencyIdentity,
      prior_attempt_identity: attemptIdentity,
      subject_head: currentHead,
      retry_class: "SIDE_EFFECT_RETRY",
    },
    independent_first: independentFirst,
    independent_second: independentSecond,
    self_review_pair: [selfFirst, selfSecond],
    done_gate_satisfied: {
      required_proofs: Object.freeze(["freshness", "independence", "receipt"]),
      provided_proofs: Object.freeze([
        "freshness",
        "independence",
        "receipt",
      ]),
    },
    done_gate_missing: {
      required_proofs: Object.freeze(["freshness", "independence", "receipt"]),
      provided_proofs: Object.freeze(["freshness"]),
    },
  };
}

export function digestKodacFixturesV1(
  fixtures: KodacCharacterizationFixtureSetV1,
): string {
  return createHash("sha256")
    .update(JSON.stringify(fixtures), "utf8")
    .digest("hex");
}

export function publicationPhasesV1(): readonly string[] {
  return PUBLICATION_PHASES;
}
