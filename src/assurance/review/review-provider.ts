import {
  callLocalReviewModelV1,
  isLoopbackEndpoint,
  type LocalReviewCallResultV1,
  type LocalReviewCallV1,
  type LocalReviewProviderConfigV1,
} from "./local-review-provider.js";

/**
 * E10a: the one interface every review provider implements (specs/017-unified-assurance/
 * E10_BYOAI_PROVIDER_DESIGN.md). Payload building, parsing, location checks, and report mapping
 * stay shared, so every provider follows the same truth rules: a model can never make anything pass.
 */

/** The text a provider reviews: changed lines with context, already filtered and redacted. */
export interface ReviewPayloadV1 {
  readonly text: string;
  readonly reviewed_files: readonly string[];
  readonly line_counts: Readonly<Record<string, number>>;
}

/** Where review data goes. Ascout computes it from the validated endpoint; config never declares it. */
export type ReviewEgressV1 = "NONE" | "REMOTE";

/** What a run would send and where, shown before any request. */
export interface ProviderDisclosureV1 {
  readonly provider: string;
  readonly endpoint_host: string;
  readonly model: string;
  readonly egress: ReviewEgressV1;
}

export type RawModelReplyV1 = LocalReviewCallResultV1;

export interface ReviewProviderV2 {
  readonly id: string;
  readonly egress: ReviewEgressV1;
  readonly cost: "OPERATOR_LOCAL" | "OPERATOR_ACCOUNT";
  disclosure(): ProviderDisclosureV1;
  review(payload: ReviewPayloadV1, limits: { readonly timeoutMs: number; readonly maxResponseBytes: number }, signal?: AbortSignal): Promise<RawModelReplyV1>;
}

/** A loopback address is NONE; anything else, including an unparseable endpoint, is REMOTE. */
export function egressForEndpointV1(endpoint: string): ReviewEgressV1 {
  return isLoopbackEndpoint(endpoint) ? "NONE" : "REMOTE";
}

/** The Ollama provider. The call is injectable for tests; it defaults to the loopback-only client. */
export function ollamaProviderV1(
  config: LocalReviewProviderConfigV1,
  call: (call: LocalReviewCallV1) => Promise<LocalReviewCallResultV1> = callLocalReviewModelV1,
): ReviewProviderV2 {
  const egress = egressForEndpointV1(config.endpoint);
  const provider: ReviewProviderV2 = {
    id: "ollama",
    egress,
    cost: "OPERATOR_LOCAL" as const,
    disclosure: () => Object.freeze({
      provider: "ollama",
      endpoint_host: egress === "NONE" ? new URL(config.endpoint).host : "unparsed",
      model: config.model,
      egress,
    }),
    review: (payload, limits, signal) => call({
      endpoint: config.endpoint,
      model: config.model,
      diff: payload.text,
      timeoutMs: limits.timeoutMs,
      maxResponseBytes: limits.maxResponseBytes,
      ...(signal === undefined ? {} : { signal }),
    }),
  };
  return Object.freeze(provider);
}
