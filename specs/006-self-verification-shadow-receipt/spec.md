# Specification 006 — Self-Verification Shadow Receipt

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Canonical base:** `c8126773a63be744b121fbabc5e427600f671ae8`
**Milestone:** M1.2-A — Ascout-on-Ascout

## Problem

Project CI proves Ascout typechecks, tests, and builds across the supported matrix, but it does not run the exact pull-request-head Ascout executable against the pull request's own source change and retain the resulting receipt.

Spec 006 adds only an observational self-verification path. It does not make the self-receipt a merge gate and it does not authorize execution of untrusted fork PR code.

## Trust scope

Spec 006 self-verification applies only to **same-repository pull-request branches** whose head repository is the canonical Ascout repository.

Fork/external-repository PRs are out of scope for the execution job. The workflow MUST skip them before checkout/install/build/execution and MUST NOT use `pull_request_target`, inject secrets, elevate token permissions, or otherwise obtain authority to execute untrusted fork code.

A skipped fork PR produces no self-verification receipt claim. Supporting untrusted PR execution requires a separately planned sandbox/admission design.

## Identity terminology

For one eligible same-repository pull request:

- `B` — exact GitHub event base-tip SHA, provenance only;
- `H` — exact pull-request head SHA;
- `M` — the unique merge base of `B` and `H`;
- `HT` — exact tree SHA `H^{tree}`;
- `V` — exact Ascout verifier build produced from `H` before subject reconstruction;
- `S` — canonical pre-launch `SourceStateV1` snapshot produced by exact `H`-built `composeSourceState(repositoryRoot)` after reconstruction and immediately before launching `V`.

The subject observed by Ascout is `HEAD == M` with index/worktree content exactly equal to `HT`. `B` is not automatically subject HEAD.

## Acceptance stories

### 1. Inspect Ascout verifying its own trusted repository pull request

A retained machine receipt is produced by exact verifier `V` against exact committed PR change `M -> H`.

Required:

- same-repository eligibility before executing PR code;
- exact `H` checkout/build;
- unique `M = merge-base(B,H)`;
- reconstructed subject `HEAD == M` and `git write-tree == HT`;
- no unstaged tracked divergence or unrelated nonignored untracked material;
- exact `H`-built verifier preserved across reconstruction;
- receipt v1 unchanged;
- receipt + external qualification envelope retained as CI artifacts.

### 2. Preserve command authority

Automation never supplies or persists changed-command-surface admission. A valid incomplete receipt caused by command authority remains factual shadow evidence.

### 3. Separate receipt truth from harness integrity

Only valid, source-bound receipt exits `0`, `1`, `3`, and `4` are successful observational captures and are never rewritten.

**Exit `2` is always a self-verification harness-integrity failure**, even if stdout happens to contain a receipt that is JSON-parseable, current-schema-valid, semantically valid, source-bound to `S`, and process-exit-consistent. The harness MUST reject that case before receipt digest calculation, qualification-envelope emission, or artifact upload.

Missing/invalid receipt, any exit `2`, Git identity failure, reconstruction failure, schema/semantic rejection, source-snapshot mismatch, digest mismatch, or artifact failure is harness-integrity failure.

### 4. Bind retained receipt to the independently reconstructed source state

Immediately after reconstruction proof and immediately before verifier launch, the harness MUST call the exact `H`-built canonical `composeSourceState(repositoryRoot)` and retain expected snapshot `S` in memory.

After receipt parse, current JSON Schema validation, and current semantic validation, the harness MUST require exact equality between `receipt.source.start` and `S` for:

- `head_sha`;
- `tree_digest_version`;
- `tree_digest`;
- `tracked_index_entry_count`;
- `unstaged_changed_count`;
- `included_untracked_count`.

Any mismatch fails capture before envelope emission or artifact upload.

The harness MUST NOT implement another tree-digest/source-state algorithm, add a second evaluator, or add receipt/schema fields. The existing canonical `composeSourceState()` is the only source-state composer authorized for this binding.

### 5. Bind external qualification identity

The external envelope remains separate from receipt truth and records only privacy-safe qualification metadata: schema/classification, verifier `H/HT`, event base `B`, subject merge base `M`, target `H/HT`, receipt exit, exact receipt SHA-256, and receipt filename.

It contains no raw repository URL/path, absolute path, actor/user, hostname, home directory, environment dump, credentials, tokens, or secrets.

## Functional Requirements

### FR-006-001 — Trusted same-repository eligibility

Before checkout/install/build/execution of PR head code, prove the PR head repository equals canonical Ascout. Fork/external PRs skip execution with no receipt claim. `pull_request_target`, repository-write permissions, secret-backed execution, or elevated fork-code execution is prohibited.

### FR-006-002 — Exact verifier

Checkout/build exact `H`, guard `HEAD == H`, and record `HT` before reconstruction.

### FR-006-003 — Unique merge-base subject

Fetch enough history to resolve `B` and `H`, compute all merge-base candidates, and require exactly one `M`. Multiple/absent merge bases fail closed. Never substitute `B` merely because it is the target branch tip.

### FR-006-004 — Exact reconstruction

From clean exact `H` after verifier build, use ephemeral CI-only `git reset --soft M`, then prove `HEAD == M`, `git write-tree == HT`, no unstaged tracked divergence, and no unrelated nonignored untracked file. Only already-canonical ignored paths may contain build/harness artifacts.

### FR-006-005 — Canonical pre-launch source snapshot

After FR-006-004 succeeds and immediately before verifier launch, lazily load exact `H`-built `dist/check.js` and call its exported `composeSourceState(repositoryRoot)` exactly for the canonical expected source snapshot `S`.

This production snapshot path MUST use the exact `H` build and MUST NOT reimplement Git/source digest semantics in the harness.

### FR-006-006 — No automatic trust admission

Never pass or persist `--allow-changed-command-surface` automatically.

### FR-006-007 — Exact receipt preservation and validation

Capture exact machine receipt stdout bytes without rewriting. Validate with exact `H`-built current JSON Schema and semantic validators. Process exit must equal `receipt.summary.exit_code`.

### FR-006-008 — Independent source binding

After schema/semantic validation, require the six specified `receipt.source.start` fields to equal `S` exactly. Any mismatch fails capture. The comparison occurs before receipt digest/envelope publication.

### FR-006-009 — Exit-2 capture prohibition

After receipt parsing, current validation, process/receipt exit equality, and source binding, the harness MUST still reject `receipt.summary.exit_code == 2` / process exit `2` as harness-integrity failure.

This rejection applies even when the receipt is otherwise completely valid and source-bound. It MUST occur before receipt SHA-256, envelope emission, or artifact upload. Only exits `0`, `1`, `3`, and `4` may become retained `SHADOW_NON_GATING` observations.

### FR-006-010 — Shadow classification

A valid, source-bound receipt exit `0/1/3/4` is successful capture. Job green means capture integrity, not a clean receipt verdict. Exit `2` is never successful shadow capture evidence.

### FR-006-011 — Qualification envelope

Generate the bounded allowlisted envelope only after receipt validation, independent source binding, and the exit-2 prohibition succeed. Its digest refers to exact retained receipt bytes.

### FR-006-012 — Bounded artifact retention

Upload receipt/envelope with a head-bound artifact name and initial retention of 30 days.

### FR-006-013 — No product-core mutation

Spec 006 implementation MUST NOT change `src/**`, receipt schema/model, CLI flags, planner, discovery, process execution, selection, coverage, environment observation, package/runtime dependencies, or existing Project CI.

### FR-006-014 — Supply chain

Any new action requires exact repository/license/data/security review and full-SHA pinning. Workflow permissions remain least privilege; no write permission is justified.

## Planned task order

`T107 -> T108 -> T109`

- T107: repository-local harness + focused contract tests only.
- T108: new standalone same-repository self-verification workflow only.
- T109: first canonical observation reconciliation in the ledger by default.

Each predecessor must close canonically before the successor begins.

## Non-goals

No fork/untrusted-repository execution, sandboxing, `pull_request_target`, verdict merge gate, auto-admission, selector shadow, historical benchmark expansion, adversarial receipt mutation, product-core feature, new CLI surface, receipt version change, new source-state/digest algorithm, second validator/evaluator, M2 capability, release, tag, npm publication, or GitHub Release.

## Success Criteria

Spec 006 may close `GO` only when exact implementation evidence proves:

1. Project CI remains 6/6 green;
2. workflow is same-repository-only and skips fork/external execution;
3. exact final eligible PR head executes the workflow;
4. exact `B`, `H`, unique `M`, and `HT` are established;
5. reconstruction proves `HEAD == M` and `git write-tree == HT`;
6. exact `H`-built canonical `composeSourceState()` captures pre-launch `S`;
7. exact `H` verifier produces a receipt candidate;
8. current schema + semantic validation succeeds and process exit equals receipt exit;
9. all six required `receipt.source.start` fields equal `S` exactly;
10. any otherwise-valid/source-bound exit-2 receipt is rejected before digest/envelope/upload;
11. only exits `0/1/3/4` can be retained as `SHADOW_NON_GATING` receipt evidence;
12. envelope binds `B/M/H/HT` plus receipt exit/digest;
13. no auto-admission occurs;
14. valid non-clean receipt truth for exits `1/3/4` remains shadow evidence;
15. artifacts are bounded/least-privilege;
16. no product-core/receipt contract change occurs;
17. exact-head review/CI/guarded merge/post-merge gates close canonically.

## Governance

Planning artifacts do not authorize implementation. T107 requires a canonically merged final planning head and a separate durable implementation authorization.