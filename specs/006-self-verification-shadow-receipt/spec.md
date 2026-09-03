# Specification 006 — Self-Verification Shadow Receipt

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Canonical base:** `c8126773a63be744b121fbabc5e427600f671ae8`
**Milestone:** M1.2-A — Ascout-on-Ascout

## Problem

Project CI proves Ascout typechecks, tests, and builds across the supported matrix, but it does not run the exact pull-request-head Ascout executable against the pull request's own source change and retain the resulting receipt.

Spec 006 adds only an observational self-verification path. It does not make the self-receipt a merge gate and it does not authorize execution of untrusted fork PR code.

## Trust scope

Spec 006 self-verification applies only to **same-repository pull-request branches** whose head repository is the canonical Ascout repository. This is the bounded trusted-repository scope already permitted by the Constitution.

Fork/external-repository PRs are out of scope for the self-verification execution job. The workflow MUST skip them before checkout/install/build/execution and MUST NOT switch to `pull_request_target`, inject secrets, or otherwise obtain authority to execute untrusted fork code.

A skipped fork PR produces no self-verification receipt claim. Supporting untrusted PR execution requires a separately planned sandbox/admission design.

## Identity terminology

For one eligible same-repository pull request:

- `B` — exact GitHub event base-tip SHA, retained as provenance;
- `H` — exact pull-request head SHA;
- `M` — the unique merge base of `B` and `H` computed from the fetched Git graph;
- `HT` — exact tree SHA `H^{tree}`;
- `V` — exact Ascout verifier build produced from `H` before subject reconstruction.

The subject observed by Ascout is `HEAD == M` with index/worktree content exactly equal to `HT`. `B` is not assumed to be an ancestor of `H` and is not automatically used as subject HEAD.

## User Story 1 — Inspect Ascout verifying its own trusted repository pull request

A maintainer can inspect a retained machine receipt produced by exact verifier `V` against the exact committed same-repository pull-request change `M -> H`.

### Acceptance

- workflow proves the PR head repository equals the canonical repository before executing PR code;
- checkout/build is exact `H`;
- `M` is resolved as the unique merge base of exact `B` and `H`;
- the subject has `HEAD == M`;
- `git write-tree == HT` before observation;
- no unstaged tracked divergence or unrelated nonignored untracked material exists;
- the verifier is the exact pre-reconstruction `H` build;
- receipt v1 is unchanged;
- receipt plus a separate qualification envelope are retained as CI artifacts.

## User Story 2 — Preserve command authority

The workflow never supplies or persists changed-command-surface admission. A valid receipt that is incomplete because command authority changed is retained as factual shadow evidence.

## User Story 3 — Separate receipt truth from harness integrity

Valid receipt exits `0`, `1`, `3`, and `4` are observational results. They are not rewritten. The shadow workflow remains non-gating for those receipt verdicts.

Missing/invalid receipt, exit `2` without a valid receipt, Git identity failure, reconstruction failure, schema/semantic rejection, digest mismatch, or artifact failure is a harness-integrity failure and fails the eligible shadow job.

## User Story 4 — Bind external qualification identity

The qualification envelope is not receipt truth. It records only privacy-safe qualification metadata:

- envelope schema version;
- classification `SHADOW_NON_GATING`;
- exact verifier head SHA and head tree SHA;
- exact event base-tip SHA `B`;
- exact subject merge-base SHA `M`;
- exact subject target head SHA `H` and target tree SHA `HT`;
- observed receipt exit code;
- SHA-256 of exact retained receipt bytes;
- receipt filename.

It contains no raw repository URL/path, absolute path, actor/user, hostname, home directory, environment dump, credentials, tokens, or secrets.

## Functional Requirements

### FR-006-001 — Trusted same-repository eligibility

Before checkout/install/build/execution of PR head code, the workflow MUST prove the pull request head repository equals the canonical Ascout repository. Fork/external PRs MUST skip the self-verification execution job without a receipt claim.

`pull_request_target`, repository-write permissions, secret-backed execution, or any mechanism that executes fork code with elevated authority is prohibited.

### FR-006-002 — Exact verifier

For an eligible same-repository PR, checkout and build exact `H`, guard `HEAD == H`, and record `HT` before reconstruction.

### FR-006-003 — Unique merge-base subject

The harness MUST fetch enough history to resolve `B` and `H`, compute merge-base candidates, and require **exactly one** merge base `M`. Multiple/absent merge bases are `NO_GO` for that observation.

The harness MUST NOT substitute event base tip `B` for `M` merely because `B` names the target branch tip.

### FR-006-004 — Exact reconstruction

From a clean exact-`H` checkout after verifier build, use an ephemeral CI-only `git reset --soft M`. Then prove:

- `HEAD == M`;
- `git write-tree == HT`;
- no unstaged tracked divergence exists;
- no unrelated nonignored untracked file exists.

Only already-canonical ignored paths such as `.ascout/`, `node_modules/`, `dist/`, and `coverage/` may contain build/harness artifacts.

### FR-006-005 — No automatic trust admission

Never pass or persist `--allow-changed-command-surface` automatically.

### FR-006-006 — Exact receipt preservation

Capture exact machine receipt stdout bytes without rewriting. Validate using the exact head-built current JSON Schema and semantic validators. Process exit must equal `receipt.summary.exit_code`.

### FR-006-007 — Shadow classification

A valid receipt exit `0/1/3/4` is successful capture. Job green means capture integrity, not a clean receipt verdict.

### FR-006-008 — Qualification envelope

Generate the bounded allowlisted envelope described above only after receipt validation succeeds. Its digest refers to exact retained receipt bytes.

### FR-006-009 — Bounded artifact retention

Upload receipt/envelope with bounded retention and a head-bound artifact name. Initial retention: 30 days.

### FR-006-010 — No product-core mutation

Spec 006 implementation MUST NOT change `src/**`, receipt schema/model, CLI flags, planner, discovery, process execution, selection, coverage, environment observation, package/runtime dependencies, or existing Project CI.

### FR-006-011 — Supply chain

Any new action must receive exact repository/license/data/security review and be full-SHA pinned. Workflow permissions remain least privilege; no write permission is justified.

## Planned task order

`T107 -> T108 -> T109`

- T107: repository-local harness + focused contract tests only.
- T108: new standalone same-repository self-verification workflow only.
- T109: first canonical observation reconciliation in the ledger by default.

Each predecessor must close canonically before the successor begins.

## Non-goals

No fork/untrusted-repository execution, sandboxing, `pull_request_target`, verdict merge gate, auto-admission, selector shadow, historical benchmark expansion, adversarial receipt mutation, product-core feature, new CLI surface, receipt version change, M2 capability, release, tag, npm publication, or GitHub Release.

## Success Criteria

Spec 006 may close `GO` only when exact implementation evidence proves:

1. Project CI remains 6/6 green;
2. the new self-verification workflow is restricted to same-repository PR heads and skips fork/external PR execution;
3. the workflow runs on its exact final eligible PR head;
4. exact `B`, `H`, unique `M`, and `HT` identities are established;
5. subject reconstruction proves `HEAD == M` and `git write-tree == HT`;
6. exact `H` verifier produces a valid retained receipt;
7. process exit equals receipt summary exit;
8. envelope binds `B/M/H/HT` plus receipt exit/digest;
9. no auto-admission occurs;
10. valid non-clean receipt truth is preserved as shadow evidence;
11. artifacts are bounded and least privilege;
12. no product-core/receipt contract changes occur;
13. exact-head review/CI/guarded merge/post-merge gates close canonically.

## Governance

Planning artifacts do not authorize implementation. T107 requires a canonically merged final planning head and a separate durable implementation authorization.