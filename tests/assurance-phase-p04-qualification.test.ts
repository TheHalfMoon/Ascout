import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { CliUsageError, parseCliArgs, usageText } from "../src/cli.js";
import {
  validatePublicationRequestV1,
  type PublicationAuthorizationV1,
} from "../src/assurance/publication/github-publication-adapter.js";
import {
  buildPublicationIntentV1,
  type PublicationIntentInputV1,
} from "../src/assurance/publication/publication-intent.js";
import { evaluateRedactionGateV1 } from "../src/assurance/publication/redaction-gate.js";
import {
  recordPublicationReceiptV1,
  retryFromReceiptV1,
} from "../src/assurance/publication/publication-receipt.js";
import {
  FRESHNESS_ENGINE_SCHEMA_VERSION,
  validateEvidenceCurrencyV1,
} from "../src/assurance/workflow/freshness-engine.js";
import {
  IDEMPOTENCY_SCHEMA_VERSION,
  buildIdempotencyRecordV1,
  requestRetryV1,
} from "../src/assurance/workflow/idempotency-reconciliation.js";
import {
  KODAC_CHARACTERIZATION_SCHEMA_VERSION,
  KODAC_INTEGRATION_MODE,
  generationImpliesPublicationV1,
} from "../src/assurance/workflow/kodac-capability-characterization.js";
import {
  buildKodacCharacterizationFixturesV1,
  digestKodacFixturesV1,
} from "../src/assurance/workflow/kodac-characterization-fixtures.js";
import {
  buildKodacSourcePinV1,
  KODAC_PINNED_REVISION,
  validateKodacSourcePinV1,
} from "../src/assurance/workflow/kodac-source-pin.js";
import {
  REVIEWER_ROLE_SCHEMA_VERSION,
  enforceRoleSeparationV1,
} from "../src/assurance/workflow/reviewer-role-separation.js";
import {
  STAGE_ATTEMPT_SCHEMA_VERSION,
  buildWorkflowRunV1,
  recoverWorkflowRunV1,
  resumeWorkflowRunV1,
} from "../src/assurance/workflow/stage-attempt-model.js";
import {
  PUBLICATION_ADAPTER_SCHEMA_VERSION,
} from "../src/assurance/publication/github-publication-adapter.js";
import {
  PUBLICATION_INTENT_SCHEMA_VERSION,
} from "../src/assurance/publication/publication-intent.js";
import {
  REDACTION_GATE_SCHEMA_VERSION,
} from "../src/assurance/publication/redaction-gate.js";
import {
  PUBLICATION_RECEIPT_SCHEMA_VERSION,
} from "../src/assurance/publication/publication-receipt.js";

function hex64(seed: string): string {
  return createHash("sha256").update(seed, "utf8").digest("hex");
}

const HEAD = "2".repeat(40);
const STALE_HEAD = "3".repeat(40);
const AUTHORITY = hex64("t11/authority");

const PRODUCER = {
  model: "producer-model",
  provider: "producer-provider",
  context: "producer-context",
};

const REVIEWER = {
  model: "reviewer-model",
  provider: "reviewer-provider",
  context: "reviewer-context",
};

function intentInput(): PublicationIntentInputV1 {
  return {
    target: {
      repository_identity: "repo:example",
      kind: "PULL_REQUEST",
      number: 541,
      comment_identity: null,
    },
    source_head: HEAD,
    payload_digest: hex64("t11/payload"),
    classification: "PUBLIC",
    redaction: { redacted: false, redacted_fields: [] },
    authority_identity: AUTHORITY,
    idempotency_identity: hex64("t11/idempotency"),
    attempt_identity: hex64("t11/attempt"),
    generation_evidence: "generation:11",
  };
}

function authorization(): PublicationAuthorizationV1 {
  return {
    authority_identity: AUTHORITY,
    network_permitted: true,
    provider_permitted: true,
    egress_permitted: true,
  };
}

describe("UA-P04-T11 phase qualification sentinel", () => {
  it("freezes every P4 schema version at 1", () => {
    expect(KODAC_CHARACTERIZATION_SCHEMA_VERSION).toBe(1);
    expect(FRESHNESS_ENGINE_SCHEMA_VERSION).toBe(1);
    expect(STAGE_ATTEMPT_SCHEMA_VERSION).toBe(1);
    expect(IDEMPOTENCY_SCHEMA_VERSION).toBe(1);
    expect(REVIEWER_ROLE_SCHEMA_VERSION).toBe(1);
    expect(PUBLICATION_INTENT_SCHEMA_VERSION).toBe(1);
    expect(REDACTION_GATE_SCHEMA_VERSION).toBe(1);
    expect(PUBLICATION_ADAPTER_SCHEMA_VERSION).toBe(1);
    expect(PUBLICATION_RECEIPT_SCHEMA_VERSION).toBe(1);
  });

  it("holds the Kodac pin with pattern-only integration", () => {
    const pin = buildKodacSourcePinV1();
    expect(pin.revision).toBe(KODAC_PINNED_REVISION);
    expect(validateKodacSourcePinV1(pin).valid).toBe(true);
    expect(KODAC_INTEGRATION_MODE).toBe("PATTERN_ONLY");
    const fixtures = buildKodacCharacterizationFixturesV1();
    expect(digestKodacFixturesV1(fixtures)).toBe(
      digestKodacFixturesV1(buildKodacCharacterizationFixturesV1()),
    );
  });

  it("counts stale publications as current at zero", () => {
    let stalePublishedAsCurrent = 0;
    const intent = buildPublicationIntentV1(intentInput());
    expect(intent).not.toBeNull();
    if (intent === null) {
      return;
    }
    for (const freshness of ["CURRENT", "STALE", "UNKNOWN"] as const) {
      const decision = validatePublicationRequestV1(
        intent,
        true,
        freshness,
        authorization(),
      );
      if (freshness !== "CURRENT" && decision.accepted) {
        stalePublishedAsCurrent += 1;
      }
    }
    expect(stalePublishedAsCurrent).toBe(0);
  });

  it("counts duplicate effects on retry at zero", () => {
    const effectIdentities: string[] = [];
    const intent = buildPublicationIntentV1(intentInput());
    expect(intent).not.toBeNull();
    if (intent === null) {
      return;
    }
    for (let index = 0; index < 2; index += 1) {
      const decision = validatePublicationRequestV1(
        intent,
        true,
        "CURRENT",
        authorization(),
      );
      expect(decision.accepted).toBe(true);
      if (decision.descriptor !== null) {
        effectIdentities.push(decision.descriptor.effect_identity);
      }
    }
    expect(new Set(effectIdentities).size).toBe(1);
    const receipt = recordPublicationReceiptV1({
      intent_identity: intent.intent_identity,
      effect_identity: effectIdentities[0]!,
      outcome: "RECORDED_SUCCESS",
      attempt_identity: hex64("t11/attempt"),
    });
    expect(receipt).not.toBeNull();
    if (receipt === null) {
      return;
    }
    const replay = retryFromReceiptV1(receipt, hex64("t11/attempt-2"));
    expect(replay.permitted).toBe(true);
    expect(replay.re_execute).toBe(false);
  });

  it("counts sensitive unredacted publications at zero", () => {
    let sensitiveUnredacted = 0;
    const gate = evaluateRedactionGateV1({
      classification: "SENSITIVE",
      redaction: { redacted: false, redacted_fields: [] },
      payload_contains_secrets: true,
    });
    if (gate.permitted) {
      sensitiveUnredacted += 1;
    }
    expect(sensitiveUnredacted).toBe(0);
  });

  it("counts generation-implied publications at zero", () => {
    expect(generationImpliesPublicationV1()).toBe(false);
    let generationImplied = 0;
    if (generationImpliesPublicationV1()) {
      generationImplied += 1;
    }
    expect(generationImplied).toBe(0);
  });

  it("counts unknown outcomes recorded as success at zero", () => {
    let unknownAsSuccess = 0;
    const receipt = recordPublicationReceiptV1({
      intent_identity: hex64("t11/intent"),
      effect_identity: hex64("t11/effect"),
      outcome: "UNKNOWN",
      attempt_identity: hex64("t11/attempt"),
    });
    expect(receipt).not.toBeNull();
    if (receipt === null) {
      return;
    }
    if (receipt.outcome === "RECORDED_SUCCESS") {
      unknownAsSuccess += 1;
    }
    expect(unknownAsSuccess).toBe(0);
    expect(retryFromReceiptV1(receipt, hex64("t11/attempt-2")).permitted).toBe(
      false,
    );
  });

  it("counts erased incomplete stages at zero", () => {
    let erasedIncomplete = 0;
    const run = buildWorkflowRunV1(
      hex64("t11/run"),
      HEAD,
      hex64("t11/policy"),
      ["review", "publish"],
    );
    expect(run).not.toBeNull();
    if (run === null) {
      return;
    }
    const recovered = recoverWorkflowRunV1(JSON.stringify(run));
    expect(recovered.recovered).toBe(true);
    const decision = resumeWorkflowRunV1(
      recovered.run!,
      HEAD,
      hex64("t11/policy"),
    );
    if (!decision.preserved_incomplete.includes("review")) {
      erasedIncomplete += 1;
    }
    if (!decision.preserved_incomplete.includes("publish")) {
      erasedIncomplete += 1;
    }
    expect(erasedIncomplete).toBe(0);
  });

  it("counts self-review independence satisfactions at zero", () => {
    let selfReviewSatisfied = 0;
    if (enforceRoleSeparationV1(PRODUCER, PRODUCER, null, false).satisfied) {
      selfReviewSatisfied += 1;
    }
    expect(selfReviewSatisfied).toBe(0);
    expect(
      enforceRoleSeparationV1(PRODUCER, REVIEWER, null, false).satisfied,
    ).toBe(true);
  });

  it("counts blind unknown retries at zero", () => {
    let blindRetries = 0;
    const record = buildIdempotencyRecordV1(
      hex64("t11/idem"),
      hex64("t11/a1"),
      "UNKNOWN",
    );
    expect(record).not.toBeNull();
    if (record === null) {
      return;
    }
    if (requestRetryV1(record, hex64("t11/a2")).permitted) {
      blindRetries += 1;
    }
    expect(blindRetries).toBe(0);
  });

  it("counts stale evidence usable as current at zero", () => {
    let staleUsable = 0;
    const currency = validateEvidenceCurrencyV1(
      { evidence_id: "evidence:11", bound_head: STALE_HEAD },
      HEAD,
    );
    if (currency.usable_as_current) {
      staleUsable += 1;
    }
    expect(staleUsable).toBe(0);
  });

  it("preserves the read-only review CLI with no publication command", () => {
    expect(usageText()).toContain("ascout review");
    expect(usageText()).not.toContain("ascout publish");
    expect(usageText()).not.toContain("ascout workflow");
    expect(() => parseCliArgs(["publish"])).toThrow(CliUsageError);
    expect(() => parseCliArgs(["test"])).toThrow(CliUsageError);
    expect(() => parseCliArgs(["review", "--publish"])).toThrow(CliUsageError);
  });
});
