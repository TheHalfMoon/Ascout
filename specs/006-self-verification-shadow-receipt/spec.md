# Specification 006 — Self-Verification Shadow Receipt

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Canonical base:** `c8126773a63be744b121fbabc5e427600f671ae8`
**Milestone:** M1.2-A — Ascout-on-Ascout

## Problem

Ascout's current Project CI proves that the repository typechecks, tests, and builds across the supported OS/Node matrix, but it does not run Ascout against Ascout's own pull-request change and retain the resulting verification receipt.

The first M1.2 goal is therefore to observe Ascout's own verdict on its own changes without prematurely making that verdict a merge gate.

## Product statement

> Every Ascout pull request should produce a source-bound, inspectable **shadow self-verification receipt** showing what Ascout itself observed about that pull-request change.

Shadow means observational, not authoritative for merge eligibility during this specification.

## User Story 1 — Inspect Ascout verifying its own pull request (P1)

As an Ascout maintainer reviewing a pull request, I need a retained machine receipt produced by the exact pull-request-head Ascout executable against a source state representing that pull-request change, so I can compare ordinary CI truth with Ascout's own receipt truth.

### Acceptance

- the verifier executable is built from the exact pull-request head SHA;
- the subject Git HEAD is the exact pull-request base SHA;
- the subject index and working tree preserve the exact pull-request head tree while HEAD points to the base;
- Ascout runs from the exact verifier-head build against that subject state;
- the emitted receipt remains the canonical receipt v1 shape; no new receipt fields are introduced;
- the workflow retains the receipt and a separate qualification envelope as CI artifacts.

## User Story 2 — Preserve command-surface authority in automation (P1)

As a maintainer, I need self-verification automation to preserve Ascout's explicit changed-command-surface boundary instead of silently auto-admitting changed commands/configuration.

### Acceptance

- the workflow never passes `--allow-changed-command-surface` automatically;
- command-surface refusal remains visible in the shadow receipt;
- a valid non-clean or incomplete shadow receipt does not by itself fail the shadow workflow during Spec 006;
- no persisted trust grant is created.

## User Story 3 — Distinguish receipt truth from harness failure (P1)

As a maintainer, I need the CI surface to distinguish "Ascout produced a non-clean receipt" from "the self-verification harness could not produce/validate evidence."

### Acceptance

- receipt-producing semantic exit codes are captured as observed receipt truth;
- the qualification envelope records the observed receipt exit code without rewriting it;
- a valid receipt with a non-clean verdict is retained and the shadow workflow remains observational;
- harness/bootstrap/identity/parse/validation/artifact-integrity failure fails the self-verification job visibly;
- no synthetic PASS is produced when no valid receipt exists.

## User Story 4 — Bind the shadow artifact to exact Git identities (P1)

As a reviewer, I need the retained artifact to make verifier and subject identities explicit without putting workflow-only metadata into receipt v1.

### Acceptance

A separate qualification envelope records at least:

- envelope schema version;
- exact verifier head SHA;
- exact verifier head tree SHA;
- exact subject base SHA;
- exact subject target head SHA;
- exact subject target tree SHA;
- observed Ascout process exit code;
- SHA-256 digest of the exact retained receipt bytes;
- artifact filenames;
- capture classification `SHADOW_NON_GATING`.

The envelope MUST NOT contain raw repository URLs, credentials, absolute paths, environment dumps, hostnames, usernames, home directories, or secrets.

## Functional Requirements

### FR-006-001 — Exact verifier head

The self-verification workflow MUST checkout and build the exact pull-request head and MUST guard that checkout against the event head SHA before building.

### FR-006-002 — Reconstructed subject state

For exact pull-request base `B` and head `H`, the harness MUST construct a source state whose Git `HEAD == B` while both the index and working tree preserve the exact tree of `H`.

The preferred minimal reconstruction is an ephemeral CI-only `git reset --soft B` performed from an initially clean exact-`H` checkout after verifier build.

The reconstruction MUST fail closed unless it proves:

- before reconstruction, current HEAD equals `H`;
- before reconstruction, the tracked checkout/index tree equals `H^{tree}`;
- `B` is available and is an ancestor-compatible pull-request base for `H`;
- after reconstruction, current HEAD equals `B`;
- after reconstruction, `git write-tree` equals `H^{tree}` exactly;
- the working tree has no unstaged tracked divergence from that index/head-tree content;
- no unrelated nonignored harness file is introduced into subject source identity; only already-canonical ignored paths such as `.ascout/`, `node_modules/`, `dist/`, and `coverage/` may contain harness/build artifacts.

If exact tree preservation cannot be proven, the harness MUST fail rather than approximate the PR change.

### FR-006-003 — No automatic trust admission

Automation MUST NOT pass or persist changed-command-surface admission.

### FR-006-004 — Exact head-built verifier

The executed Ascout CLI MUST come from the build produced before subject reconstruction from the exact PR head. The harness MUST NOT silently rebuild Ascout after Git HEAD moves to the base.

### FR-006-005 — Receipt preservation

The harness MUST capture exact machine receipt bytes when Ascout emits a valid receipt. It MUST NOT rewrite receipt fields, exit semantics, source identity, environment identity, task results, completeness, or findings.

### FR-006-006 — Current-validator proof

A captured receipt MUST pass the current head-built JSON Schema and semantic validators before being classified as a retained shadow receipt.

### FR-006-007 — Shadow non-gating semantics

During Spec 006, a successfully captured and validated receipt is observational evidence regardless of its repository verdict. The shadow job MUST NOT reinterpret receipt exit `1`, `3`, or `4` as clean success, but those receipt verdicts alone MUST NOT fail the shadow workflow.

An Ascout execution that cannot emit a valid receipt, or any harness identity/integrity failure, MUST fail the shadow workflow.

### FR-006-008 — Qualification envelope

The harness MUST produce a small deterministic-shape JSON envelope separate from receipt v1. The envelope is CI qualification metadata, not Ascout product receipt truth.

### FR-006-009 — Bounded artifact retention

The workflow MUST upload the receipt and qualification envelope using a bounded retention period. Artifact names MUST include or be unambiguously bound to the exact head SHA.

### FR-006-010 — No product-core mutation

Spec 006 implementation MUST NOT change `src/**`, receipt schema/model, CLI flags, planner, discovery, process execution, selection, coverage, environment observation, or runtime dependencies.

### FR-006-011 — Supply-chain review

Any newly introduced GitHub Action or workflow dependency MUST be reviewed for repository/source, license, permissions, data exposure, and exact implementation pinning before implementation authorization. `permissions` MUST remain least-privilege and no write permission is justified by this specification.

### FR-006-012 — No hidden network claim

The workflow may use GitHub-hosted checkout/artifact transport and explicit `npm ci`; it MUST NOT claim that project child processes are network-isolated. No new network-isolation mechanism is authorized.

## Failure Semantics

### Valid shadow receipt

A receipt is retained when:

- the verifier/subject identity contract is proven;
- Ascout emits machine JSON;
- current semantic and JSON Schema validation succeeds;
- receipt bytes and digest are retained exactly.

The Ascout receipt exit remains factual data.

### Harness integrity failure

Examples:

- base/head/tree identity mismatch;
- source reconstruction failure;
- inability to execute exact head-built verifier;
- malformed/non-JSON output where a receipt is required;
- semantic/schema-invalid emitted receipt;
- receipt digest/envelope mismatch;
- artifact creation failure.

These fail the self-verification workflow. They MUST NOT fabricate a receipt or convert to PASS.

## Trust Boundaries

- Subject repository: trusted Ascout repository only.
- GitHub Actions runner: existing project CI trust domain.
- Verifier: exact PR-head Ascout build.
- Subject source: exact PR-base HEAD with exact PR-head tree retained in index and working tree.
- Receipt: Ascout product truth.
- Qualification envelope: workflow evidence binding receipt bytes to CI/Git identities; never product receipt truth.

## Non-Goals

Spec 006 does not authorize:

- required merge gating based on shadow receipt verdict;
- automatic changed-command-surface admission;
- selector shadow mode or full-suite differential metrics;
- historical benchmark corpus expansion;
- adversarial receipt mutation corpus;
- product-core feature changes;
- new CLI verbs/flags;
- receipt schema/version changes;
- M2 mutation/property/fuzz/counterfactual capability;
- untrusted repository sandboxing;
- release, tag, npm publication, or GitHub Release.

## Success Criteria

Spec 006 is successful when an implementation PR for the self-verification surface demonstrates on its exact head that:

1. ordinary Project CI remains six-lane green;
2. the new self-verification workflow runs against the exact PR base/head pair;
3. exact source reconstruction proves `HEAD == base` and `index tree == target head tree` before observation;
4. the exact head-built Ascout executable emits a valid retained receipt against that reconstructed subject state;
5. the envelope binds verifier head/tree, subject base/head/tree, receipt exit code, and receipt digest;
6. no automatic command-surface admission occurs;
7. non-clean valid receipt truth is preserved as shadow evidence rather than rewritten;
8. harness integrity failures are independently testable and fail closed;
9. artifacts are uploaded with bounded retention and least-privilege permissions;
10. no product-core or receipt contract changes occur;
11. exact-head independent review and all required CI/review/merge/post-merge gates close canonically.

## Constitutional Alignment

- Evidence Before Claims: retains actual receipt + digest-bound envelope.
- No Green by Omission: non-clean/incomplete receipt truth is never rewritten as clean.
- Source-Bound Truth: explicitly binds verifier head/tree and subject base/target identities.
- Explicit Authority: never auto-admits changed command surfaces.
- Native Capability Before Invention: uses Git/GitHub Actions and existing Ascout validators; no new product subsystem.
- Bounded/Private Execution: artifact retention is bounded and metadata is privacy-safe.
- Benchmark-Gated Growth: shadow observation precedes any decision to make self-verification gating.