# Specification 006 Tasks — Self-Verification Shadow Receipt

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Canonical order:** T107 → T108 → T109

## Shared identity/trust terms

- `B` = exact event base-tip SHA, provenance only;
- `H` = exact same-repository PR head SHA;
- `M` = unique merge base of `B` and `H`;
- `HT = H^{tree}`.

Subject HEAD is `M`, not `B`. Missing/multiple merge base fails closed. T108 self-verification executes only when the PR head repository equals the canonical repository; fork/external PRs are skipped before any head-code checkout/install/build/execution.

## T107 — Exact-tree self-verification harness

### Authorized candidate surfaces
- `benchmarks/self-verify.mjs`
- `tests/t107-self-verification-harness.contract.test.ts`

### Required behavior

- accept exact B/H + output directory;
- prove exact H checkout/index/tree;
- compute all merge bases; require exactly one M;
- preserve B separately as provenance;
- soft-reset M only after exact H verifier build exists;
- prove HEAD=M, write-tree=HT, no tracked/untracked contamination;
- execute only exact H build with `check --format json`, no changed-command admission;
- retain exact receipt bytes;
- use current head-built schema + semantic validators and process/receipt exit consistency;
- valid exits 0/1/3/4 remain shadow observations;
- fail on identity/merge-base/reconstruction/no-valid-receipt/validation/digest failure;
- emit privacy-safe B/M/H/HT envelope;
- outputs outside source identity;
- no `src/**`, workflow, receipt/schema, dependency, benchmark-result, release/tag/publication mutation.

### Test-before-build boundary

T107 harness MUST NOT top-level import `dist/**`. Production validation loads exact H-built validators lazily. Focused Vitest contracts may inject the same current source validator functions into the internal validation adapter. No CLI injection option, product API, second validator, or new dependency.

### Focused proof

Cover exact H, wrong H, missing B, B==M, advanced-base B!=M, multiple merge-base rejection, exact soft-reset/tree proof, added/deleted/renamed/content changes, drift/untracked rejection, ignored paths, valid exits 0/1/3/4, exit mismatch, malformed/schema-invalid/semantic-invalid/no-receipt, exact digest, envelope privacy/B-M-H-HT binding, no auto-admission, and test-before-build adapter behavior.

### T107 qualification

Exactly two T107 paths. Exact-head Project CI 6/6, fresh independent substantive review, zero material findings/threads, guarded expected-head merge, post-merge parents/tree/signature/PR/main verification, then `T107 = CLOSED_CANONICAL` before T108.

---

## T108 — Same-repository non-gating self-verification workflow

### Authorized candidate surface
- `.github/workflows/self-verify.yml`

### Required workflow behavior

- trigger `pull_request`;
- job-level eligibility condition **before checkout** proving `github.event.pull_request.head.repo.full_name == github.repository` or equivalent exact same-repository predicate;
- fork/external PR => skipped self-verification job, no receipt claim, no PR-head code execution;
- MUST NOT use `pull_request_target`, secrets, elevated permissions, or fork-code workaround;
- `permissions: contents: read` only;
- Ubuntu 24.04 / Node 24;
- eligible PR: checkout exact H with sufficient history for B/M;
- exact-head guard, exact npm ci, build H;
- invoke canonically merged T107 with B/H;
- no changed-command admission;
- upload only receipt/envelope with head-bound name, `if-no-files-found: error`, `retention-days: 30`;
- full-SHA pinned approved `actions/upload-artifact`;
- no repository/PR/status/comment writes, hidden files, release/tag/publication.

### Shadow semantics

Job green = trustworthy capture, not clean receipt verdict. Valid receipt exit 1/3/4 remains non-clean factual data.

### Live qualification proof

Exact final T108 head must show:
- Project CI 6/6;
- static/workflow proof that fork/external PR execution is excluded before checkout;
- successful self-verification workflow on exact eligible same-repository B/H;
- exact B/M/H/HT envelope and receipt source HEAD=M;
- exact receipt digest/current validators;
- actual production lazy built-dist validator path;
- no auto-admission;
- downloadable bounded artifact;
- fresh independent exact-head review, zero material threads, exact one-path purity.

No current CI, T107, `src/**`, package/dependency, receipt/schema, benchmark-result, release/tag/publication mutation.

After guarded merge/post-merge verification record `T108 = CLOSED_CANONICAL`.

---

## T109 — Reconcile first canonical shadow observation

Ledger-only by default. Record exact T108 workflow run/artifact, verifier H/HT, event B, merge base M, target H/HT, receipt exit/digest, retention, same-repository eligibility, and observed clean/non-clean/incomplete state. Preserve `SHADOW_NON_GATING`.

Do not promote required gating, fork execution, retention, trends, selector shadow, corpus work, adversarial mutation, or M2.

If all acceptance is proven: `T109 = CLOSED_CANONICAL`, then `SPEC_006 = CLOSED_CANONICAL / GO`; else `NO_GO` and return to planning.

## Execution discipline

T107/T108: exact predecessor main, exact path purity, historical benchmark-result immutability, focused/full proof, Project CI 6/6, fresh independent exact-head review, zero material threads, unchanged qualified head, guarded expected-head merge, post-merge identity verification, durable predecessor closeout.

Any head mutation invalidates prior exact-head CI/review evidence.

## Authorization gate

T107 cannot begin until final Spec 006 planning is canonically merged/verified and a separate durable implementation authorization binds exact planning merge, T107–T109 paths, trust scope, supply-chain decision, acceptance, and prohibitions.