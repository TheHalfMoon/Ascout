# Specification 006 Tasks — Self-Verification Shadow Receipt

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Canonical order:** T107 → T108 → T109

## Shared identity/trust terms

- `B` = exact event base-tip SHA, provenance only;
- `H` = exact same-repository PR head SHA;
- `M` = unique merge base of `B` and `H`;
- `HT = H^{tree}`;
- `S` = canonical expected `SourceStateV1` from exact `H`-built `composeSourceState(repositoryRoot)` captured after reconstruction and immediately before verifier launch.

Subject HEAD is `M`, not `B`. Missing/multiple merge base fails closed. T108 executes only same-repository PR heads; forks/external PRs skip before PR-code execution.

## T107 — Exact-tree self-verification harness

### Authorized candidate surfaces

- `benchmarks/self-verify.mjs`
- `tests/t107-self-verification-harness.contract.test.ts`

### Required behavior

- accept exact B/H + output directory;
- prove exact H checkout/index/tree;
- compute all merge bases and require exactly one M;
- preserve B as provenance;
- soft-reset M only after exact H verifier build exists;
- prove HEAD=M, write-tree=HT, no tracked/untracked contamination;
- lazily load exact H-built `dist/check.js::composeSourceState` and capture expected pre-launch snapshot S;
- execute only exact H build with `check --format json`, no changed-command admission;
- retain exact receipt stdout bytes;
- run exact H-built current schema + semantic validators;
- require process exit equals `receipt.summary.exit_code`;
- require `receipt.source.start` equals S exactly for `head_sha`, `tree_digest_version`, `tree_digest`, `tracked_index_entry_count`, `unstaged_changed_count`, `included_untracked_count`;
- any source mismatch fails capture before digest/envelope/upload;
- reject exit `2` even when the receipt is otherwise parseable, current-schema-valid, semantically valid, process-exit-consistent, and source-bound;
- exit `2` rejection occurs before receipt SHA-256, envelope emission, or artifact upload;
- only valid source-bound exits 0/1/3/4 remain shadow observations;
- fail on identity/merge-base/reconstruction/no-valid-receipt/validation/source-binding/exit-2/digest failure;
- emit privacy-safe B/M/H/HT envelope only after all integrity and allowed-exit gates;
- outputs outside source identity;
- no `src/**`, workflow, receipt/schema, dependency, benchmark-result, release/tag/publication mutation;
- no second source-state/digest algorithm or evaluator.

### Test-before-build boundary

T107 MUST NOT top-level import `dist/**`. Production lazily loads exact H-built `composeSourceState` and validators. Focused Vitest contracts may inject the same current source composer/validators into internal adapters. No CLI injection option, product API, second validator/composer, or new dependency.

### Focused proof

At minimum cover:

1. exact H and wrong-H rejection;
2. missing B;
3. B==M;
4. advanced-base B!=M;
5. multiple merge-base rejection;
6. exact soft-reset/tree reconstruction;
7. added/deleted/renamed/content-change identity;
8. tracked/untracked contamination rejection;
9. ignored build paths;
10. test-before-build dependency injection and no top-level dist dependency;
11. canonical S capture adapter;
12. all-six source-field equality success;
13. `head_sha` mismatch rejection;
14. `tree_digest_version` mismatch rejection;
15. `tree_digest` mismatch rejection;
16. `tracked_index_entry_count` mismatch rejection;
17. `unstaged_changed_count` mismatch rejection;
18. `included_untracked_count` mismatch rejection;
19. valid exits 0/1/3/4 retained as shadow truth;
20. otherwise-valid/source-bound/process-consistent exit-2 receipt rejected before receipt digest/envelope/upload;
21. process/receipt exit mismatch;
22. malformed/schema-invalid/semantic-invalid/no-receipt rejection;
23. exact receipt-byte SHA-256 for allowed captures only;
24. envelope privacy/B-M-H-HT binding;
25. no `--allow-changed-command-surface` in executed argv.

### T107 qualification

Exactly the two T107 paths. Exact-head Project CI 6/6, fresh independent substantive review, zero material findings/threads, guarded expected-head merge, post-merge parents/tree/signature/PR/main verification, then `T107 = CLOSED_CANONICAL` before T108.

---

## T108 — Same-repository non-gating self-verification workflow

### Authorized candidate surface

- `.github/workflows/self-verify.yml`

### Required workflow behavior

- trigger `pull_request`;
- job-level eligibility before checkout proving same-repository head;
- fork/external PR => skipped job, no receipt claim, no PR-head code execution;
- no `pull_request_target`, secrets, elevated permissions, or fork-code workaround;
- `permissions: contents: read` only;
- Ubuntu 24.04 / Node 24;
- eligible PR: checkout exact H with sufficient history, guard H, exact npm ci, build H;
- invoke canonically merged T107 with B/H;
- no changed-command admission;
- upload only generated receipt/envelope with head-bound name, `if-no-files-found: error`, `retention-days: 30`;
- full-SHA pinned approved `actions/upload-artifact`;
- no repository/PR/status/comment writes, hidden files, release/tag/publication.

### Live qualification proof

Exact final T108 head must show:

- Project CI 6/6;
- fork/external execution excluded before checkout;
- successful live same-repository self-verification on exact B/H;
- exact B/M/H/HT envelope;
- production exact-H built `composeSourceState` captures S;
- retained receipt passes current validators and all six source-start fields equal S;
- retained receipt exit is one of 0/1/3/4, never 2;
- exact receipt digest;
- no auto-admission;
- downloadable bounded artifact;
- fresh independent exact-head review, zero material threads, exact one-path purity.

Job green means trustworthy capture, not clean receipt verdict. Valid exit 1/3/4 remains non-clean factual data. Exit 2 is harness failure and produces no retained shadow artifact.

After guarded merge/post-merge verification record `T108 = CLOSED_CANONICAL`.

---

## T109 — Reconcile first canonical shadow observation

Ledger-only by default. Record exact T108 workflow run/artifact, H/HT, B, M, receipt exit/digest, retention, same-repository eligibility, source-snapshot equality result, and observed clean/non-clean/incomplete state. Preserve `SHADOW_NON_GATING`.

T109 must verify that the retained receipt exit is one of `0/1/3/4`; exit `2` cannot qualify the first canonical observation.

Do not promote gating, fork execution, retention, trends, selector/corpus/adversarial work, or M2.

If all acceptance is proven: `T109 = CLOSED_CANONICAL`, then `SPEC_006 = CLOSED_CANONICAL / GO`; else `NO_GO` and return to planning.

## Execution discipline

T107/T108 require exact predecessor main, path purity, historical benchmark-result immutability, focused/full proof, Project CI 6/6, fresh independent exact-head review, zero material threads, unchanged qualified head, guarded expected-head merge, post-merge identity verification, and durable predecessor closeout.

Any head mutation invalidates prior exact-head CI/review evidence.

## Authorization gate

T107 cannot begin until final Spec 006 planning is canonically merged/verified and a separate durable implementation authorization binds exact planning merge, T107–T109 paths, F1–F6, trust scope, supply-chain decision, acceptance, and prohibitions.