import { describe, expect, it } from "vitest";

import {
  assertEvidenceRefResolvesV1,
  createEvidenceRefV1,
  parseEvidenceRefV1,
} from "../src/assurance/contracts/evidence-ref.js";
import { createEngineRunV1 } from "../src/assurance/contracts/engine-run.js";
import { createAssuranceTargetV1 } from "../src/assurance/contracts/target.js";
import type { SourceStateV1 } from "../src/receipt/model.js";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const D = "d".repeat(64);
const E = "e".repeat(64);
const F = "f".repeat(64);
const HEAD = "b".repeat(40);
const BASE = "c".repeat(40);

function source(): SourceStateV1 {
  return {
    repository_id: "remote:" + A,
    repository_id_kind: "remote",
    portable: true,
    head_sha: HEAD,
    detached: false,
    shallow: false,
    tree_digest_version: 1,
    tree_digest: B,
    tracked_index_entry_count: 18,
    unstaged_changed_count: 0,
    included_untracked_count: 0,
  };
}

function target(targetId = "target:ua-p01-t08") {
  return createAssuranceTargetV1({
    target_id: targetId,
    source_start_identity: source(),
    base_revision: BASE,
    change_set_identity: "changeset:ua-p01-t08",
    worktree_generation: "generation:8",
    policy_snapshot_id: "policy:canonical-v1",
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P01-T08",
      acceptance_id: "acceptance:evidence-ref-v1",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
}

function run(runId = "run:ua-p01-t08:1", targetId = "target:ua-p01-t08") {
  return createEngineRunV1({
    run_id: runId,
    plan_id: "plan:ua-p01-t08",
    target_id: targetId,
    engine_id: "engine:ascout-native",
    qualification_id: "qualification:ascout-native-v1",
    configuration_identity: {
      configuration_id: "configuration:release-v1",
      configuration_sha256: C,
    },
    command_identity: {
      command_id: "command:assurance-test-v1",
      command_sha256: D,
    },
    runtime_identity: {
      runtime_id: "runtime:node24-linux-x64",
      runtime_sha256: E,
      platform_identity: {
        platform_id: "platform:linux-x64-node24",
        platform_sha256: F,
      },
    },
    started_at_epoch_ms: 900,
    ended_at_epoch_ms: 1_200,
    exit_class: "EXIT_ZERO",
    result_class: "PASS",
    input_context_manifest: {
      manifest_id: "manifest:ua-p01-t08",
      input_refs: ["input:plan", "input:target"],
      context_refs: ["context:policy", "context:qualification"],
    },
    output_artifact_refs: [
      "artifact:stderr",
      "artifact:stdout",
      "artifact:test-result",
    ],
    retained_stream_artifact_refs: {
      stdout_artifact_ref: "artifact:stdout",
      stderr_artifact_ref: "artifact:stderr",
    },
    finding_refs: [],
    coverage_refs: ["coverage:tests"],
    coverage_limitations: ["No external network behavior was exercised."],
    omissions: [],
    limitations: ["Execution authority is not represented by this record."],
    retry_recovery_lineage: {
      attempt_number: 1,
      retry_of_run_id: null,
      recovery_of_run_id: null,
    },
  });
}

function evidenceInput() {
  return {
    evidence_id: "evidence:ua-p01-t08:primary",
    producer: {
      producer_id: "producer:ascout-native",
      producer_kind: "ENGINE",
    },
    run_id: "run:ua-p01-t08:1",
    target_id: "target:ua-p01-t08",
    kind: "TEST_RESULT",
    content_artifact_identity: {
      identity_kind: "CONTENT" as const,
      identity_id: "content:test-result-v1",
    },
    digest_sha256: A,
    trust_class: "QUALIFIED_ENGINE",
    data_classification: "INTERNAL",
    freshness: {
      observed_at_epoch_ms: 1_000,
      expires_at_epoch_ms: 5_000,
    },
    redaction_state: "NOT_REDACTED",
    retention: {
      retention_class: "LOCAL_DEFAULT",
      retain_until_epoch_ms: 10_000,
    },
    lineage: {
      parent_evidence_refs: [
        "evidence:parent-b",
        "evidence:parent-a",
        "evidence:parent-b",
      ],
      derivation_ref: "derivation:test-normalization-v1",
    },
  } as const;
}

function resolutionContext() {
  return {
    target: target(),
    run: run(),
    available_evidence_ids: [
      "evidence:parent-a",
      "evidence:parent-b",
      "evidence:other",
    ],
    as_of_epoch_ms: 2_000,
  };
}

describe("UA-P01-T08 EvidenceRef", () => {
  it("constructs canonical classified evidence lineage data", () => {
    const evidence = createEvidenceRefV1(evidenceInput());

    expect(evidence.schema_version).toBe(1);
    expect(evidence.lineage.parent_evidence_refs).toEqual([
      "evidence:parent-a",
      "evidence:parent-b",
    ]);
    expect(evidence.producer).toEqual({
      producer_id: "producer:ascout-native",
      producer_kind: "ENGINE",
    });
    expect(evidence.content_artifact_identity).toEqual({
      identity_kind: "CONTENT",
      identity_id: "content:test-result-v1",
    });
  });

  it("round-trips strict persisted evidence and resolves exact content lineage", () => {
    const evidence = createEvidenceRefV1(evidenceInput());

    expect(parseEvidenceRefV1(structuredClone(evidence))).toEqual(evidence);
    expect(() =>
      assertEvidenceRefResolvesV1(evidence, resolutionContext()),
    ).not.toThrow();
  });

  it("resolves artifact-backed evidence only through the bound EngineRun", () => {
    const evidence = createEvidenceRefV1({
      ...evidenceInput(),
      evidence_id: "evidence:ua-p01-t08:artifact",
      content_artifact_identity: {
        identity_kind: "ARTIFACT",
        identity_id: "artifact:test-result",
      },
      lineage: {
        parent_evidence_refs: [],
        derivation_ref: null,
      },
    });

    expect(() =>
      assertEvidenceRefResolvesV1(evidence, {
        ...resolutionContext(),
        available_evidence_ids: [],
      }),
    ).not.toThrow();
  });

  it("accepts explicitly retained stdout/stderr artifacts as run outputs", () => {
    for (const identityId of ["artifact:stdout", "artifact:stderr"]) {
      const evidence = createEvidenceRefV1({
        ...evidenceInput(),
        evidence_id: "evidence:" + identityId.replace(":", "-"),
        content_artifact_identity: {
          identity_kind: "ARTIFACT",
          identity_id: identityId,
        },
        lineage: {
          parent_evidence_refs: [],
          derivation_ref: null,
        },
      });

      expect(() =>
        assertEvidenceRefResolvesV1(evidence, {
          ...resolutionContext(),
          available_evidence_ids: [],
        }),
      ).not.toThrow();
    }
  });

  it("rejects artifact evidence that does not resolve in the bound run", () => {
    const evidence = createEvidenceRefV1({
      ...evidenceInput(),
      content_artifact_identity: {
        identity_kind: "ARTIFACT",
        identity_id: "artifact:missing",
      },
    });

    expect(() =>
      assertEvidenceRefResolvesV1(evidence, resolutionContext()),
    ).toThrow(
      "artifact-backed evidence does not resolve in EngineRun output_artifact_refs",
    );
  });

  it("rejects cross-target evidence", () => {
    const evidence = createEvidenceRefV1({
      ...evidenceInput(),
      target_id: "target:other",
    });

    expect(() =>
      assertEvidenceRefResolvesV1(evidence, resolutionContext()),
    ).toThrow("evidence target_id does not match AssuranceTarget");
  });

  it("rejects cross-run evidence", () => {
    const evidence = createEvidenceRefV1({
      ...evidenceInput(),
      run_id: "run:other",
    });

    expect(() =>
      assertEvidenceRefResolvesV1(evidence, resolutionContext()),
    ).toThrow("evidence run_id does not match EngineRun");
  });

  it("rejects a bound run that belongs to another target", () => {
    const evidence = createEvidenceRefV1(evidenceInput());

    expect(() =>
      assertEvidenceRefResolvesV1(evidence, {
        ...resolutionContext(),
        run: run("run:ua-p01-t08:1", "target:other"),
      }),
    ).toThrow("EngineRun target_id does not match AssuranceTarget");
  });

  it("rejects dangling parent evidence lineage", () => {
    const evidence = createEvidenceRefV1(evidenceInput());

    expect(() =>
      assertEvidenceRefResolvesV1(evidence, {
        ...resolutionContext(),
        available_evidence_ids: ["evidence:parent-a"],
      }),
    ).toThrow(
      "evidence lineage contains dangling parent evidence ref: evidence:parent-b",
    );
  });

  it("rejects self-referential evidence lineage", () => {
    expect(() =>
      createEvidenceRefV1({
        ...evidenceInput(),
        lineage: {
          parent_evidence_refs: [
            "evidence:ua-p01-t08:primary",
            "evidence:parent-a",
          ],
          derivation_ref: null,
        },
      }),
    ).toThrow("evidence lineage cannot reference itself");
  });

  it("rejects stale evidence as current", () => {
    const evidence = createEvidenceRefV1(evidenceInput());

    expect(() =>
      assertEvidenceRefResolvesV1(evidence, {
        ...resolutionContext(),
        as_of_epoch_ms: 5_000,
      }),
    ).toThrow("evidence is stale at as_of_epoch_ms");
  });

  it("rejects evidence before its observation time", () => {
    const evidence = createEvidenceRefV1(evidenceInput());

    expect(() =>
      assertEvidenceRefResolvesV1(evidence, {
        ...resolutionContext(),
        as_of_epoch_ms: 999,
      }),
    ).toThrow("evidence is not yet observable at as_of_epoch_ms");
  });

  it("allows an explicitly non-expiring evidence record", () => {
    const evidence = createEvidenceRefV1({
      ...evidenceInput(),
      freshness: {
        observed_at_epoch_ms: 1_000,
        expires_at_epoch_ms: null,
      },
    });

    expect(() =>
      assertEvidenceRefResolvesV1(evidence, {
        ...resolutionContext(),
        as_of_epoch_ms: 99_999_999,
      }),
    ).not.toThrow();
  });

  it("rejects invalid freshness ordering", () => {
    expect(() =>
      createEvidenceRefV1({
        ...evidenceInput(),
        freshness: {
          observed_at_epoch_ms: 1_000,
          expires_at_epoch_ms: 1_000,
        },
      }),
    ).toThrow(
      "freshness.expires_at_epoch_ms must be greater than observed_at_epoch_ms",
    );
  });

  it("rejects retention that ends before evidence observation", () => {
    expect(() =>
      createEvidenceRefV1({
        ...evidenceInput(),
        retention: {
          retention_class: "LOCAL_DEFAULT",
          retain_until_epoch_ms: 999,
        },
      }),
    ).toThrow(
      "retention.retain_until_epoch_ms cannot be before freshness.observed_at_epoch_ms",
    );
  });

  it("keeps classification states explicit without fabricating a closed vocabulary", () => {
    const evidence = createEvidenceRefV1({
      ...evidenceInput(),
      kind: "CUSTOM_OBSERVATION",
      trust_class: "INDEPENDENT_VERIFIER",
      data_classification: "SYNTHETIC_CONFIDENTIAL",
      redaction_state: "PARTIALLY_REDACTED",
      retention: {
        retention_class: "BOUNDED_LOCAL",
        retain_until_epoch_ms: null,
      },
    });

    expect(evidence.kind).toBe("CUSTOM_OBSERVATION");
    expect(evidence.trust_class).toBe("INDEPENDENT_VERIFIER");
    expect(evidence.data_classification).toBe("SYNTHETIC_CONFIDENTIAL");
    expect(evidence.redaction_state).toBe("PARTIALLY_REDACTED");
    expect(evidence.retention.retention_class).toBe("BOUNDED_LOCAL");
  });

  it("rejects malformed classification states", () => {
    expect(() =>
      createEvidenceRefV1({
        ...evidenceInput(),
        trust_class: "qualified engine",
      }),
    ).toThrow("trust_class must be an uppercase bounded state identifier");

    expect(() =>
      createEvidenceRefV1({
        ...evidenceInput(),
        data_classification: "internal",
      }),
    ).toThrow(
      "data_classification must be an uppercase bounded state identifier",
    );
  });

  it("rejects an invalid content/artifact identity kind", () => {
    expect(() =>
      parseEvidenceRefV1({
        ...createEvidenceRefV1(evidenceInput()),
        content_artifact_identity: {
          identity_kind: "FILE",
          identity_id: "artifact:test-result",
        },
      }),
    ).toThrow(
      "content_artifact_identity.identity_kind must equal CONTENT or ARTIFACT",
    );
  });

  it("rejects malformed evidence digests", () => {
    expect(() =>
      createEvidenceRefV1({
        ...evidenceInput(),
        digest_sha256: "not-a-digest",
      }),
    ).toThrow("digest_sha256 must be lowercase sha256");
  });

  it("rejects raw path material in durable content/artifact identity", () => {
    expect(() =>
      createEvidenceRefV1({
        ...evidenceInput(),
        content_artifact_identity: {
          identity_kind: "CONTENT",
          identity_id: "/private/evidence.json",
        },
      }),
    ).toThrow("content_artifact_identity.identity_id");
  });

  it("rejects noncanonical persisted parent lineage", () => {
    const evidence = createEvidenceRefV1(evidenceInput());

    expect(() =>
      parseEvidenceRefV1({
        ...evidence,
        lineage: {
          ...evidence.lineage,
          parent_evidence_refs: [
            "evidence:parent-b",
            "evidence:parent-a",
          ],
        },
      }),
    ).toThrow(
      "lineage.parent_evidence_refs must be unique and canonically sorted",
    );
  });

  it("rejects duplicate persisted parent lineage", () => {
    const evidence = createEvidenceRefV1(evidenceInput());

    expect(() =>
      parseEvidenceRefV1({
        ...evidence,
        lineage: {
          ...evidence.lineage,
          parent_evidence_refs: [
            "evidence:parent-a",
            "evidence:parent-a",
          ],
        },
      }),
    ).toThrow(
      "lineage.parent_evidence_refs must be unique and canonically sorted",
    );
  });

  it("rejects unknown authority-like fields", () => {
    const evidence = createEvidenceRefV1(evidenceInput());

    expect(() =>
      parseEvidenceRefV1({
        ...evidence,
        artifact_read_authority: true,
      }),
    ).toThrow("evidence ref contains missing or unknown fields");

    expect("artifact_read_authority" in evidence).toBe(false);
    expect("content_read_authority" in evidence).toBe(false);
    expect("execution_authority" in evidence).toBe(false);
    expect("network_authority" in evidence).toBe(false);
    expect("provider_authority" in evidence).toBe(false);
    expect("credential_authority" in evidence).toBe(false);
    expect("publication_authority" in evidence).toBe(false);
  });

  it("rejects unknown producer fields", () => {
    const evidence = createEvidenceRefV1(evidenceInput());

    expect(() =>
      parseEvidenceRefV1({
        ...evidence,
        producer: {
          ...evidence.producer,
          provider_claimed_trust: true,
        },
      }),
    ).toThrow("producer contains missing or unknown fields");
  });

  it("does not read a hidden wall clock for freshness", () => {
    const evidence = createEvidenceRefV1(evidenceInput());

    expect(() =>
      assertEvidenceRefResolvesV1(evidence, {
        ...resolutionContext(),
        as_of_epoch_ms: Number.NaN,
      }),
    ).toThrow("as_of_epoch_ms must be a non-negative safe integer epoch ms");
  });
});
