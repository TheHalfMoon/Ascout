# Specification 006 Tasks — Self-Verification Shadow Receipt

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Canonical order:** T107 → T108 → T109

## Identity terms used by every task

- `B` = exact GitHub event base-tip SHA (provenance only);
- `H` = exact PR head SHA;
- `M` = unique merge base of `B` and `H`;
- `HT` = exact tree `H^{tree}`.

The subject HEAD is `M`, not `B`. Any implementation that cannot establish a unique `M` fails closed.

## T107 — Implement exact-tree self-verification harness

### Authorized candidate surfaces

- `benchmarks/self-verify.mjs`
- `tests/t107-self-verification-harness.contract.test.ts`

### Required behavior

- accept exact `B`, `H`, and output directory;
- prove initial exact `H` checkout/index/tree;
- compute all Git merge-base candidates for `B` and `H` and require exactly one `M`;
- preserve `B` separately as provenance;
- use ephemeral CI-only `git reset --soft M` after exact verifier build exists;
- prove post-reset `HEAD == M` and `git write-tree == HT` with no unstaged tracked divergence or unrelated nonignored untracked files;
- run only the exact pre-reset `H` build with `check --format json` and without changed-command admission;
- preserve exact stdout receipt bytes;
- require current head-built JSON Schema and semantic validation;
- require process exit equals `receipt.summary.exit_code`;
- classify valid exits `0/1/3/4` as shadow capture without rewriting verdict;
- fail on absent/multiple merge base, missing/invalid receipt, exit `2` without valid receipt, identity/reconstruction/validation/digest failure;
- emit privacy-safe envelope binding `B/M/H/HT`, receipt exit/digest/filename;
- place generated evidence outside repository source identity;
- make no `src/**`, workflow, receipt/schema, dependency, historical benchmark-result, release/tag/publication mutation.

### Focused acceptance proof

At minimum:

1. correct exact-H precondition;
2. wrong H rejection;
3. missing B rejection;
4. simple `B == M` case;
5. advanced base-tip `B != M` case proving subject uses M;
6. multiple merge-base ambiguity rejection;
7. exact soft-reset `HEAD == M`, `write-tree == HT`;
8. added/deleted/renamed/content-change tree identity;
9. pre/post tracked drift rejection;
10. unrelated nonignored untracked rejection;
11. canonical ignored build/install paths allowed;
12. valid exits 0/1/3/4 retained as shadow truth;
13. process/receipt exit mismatch rejection;
14. malformed/schema-invalid/semantic-invalid/no-receipt rejection;
15. exact receipt-byte SHA-256;
16. envelope privacy and exact B/M/H/HT binding;
17. no `--allow-changed-command-surface` in executed argv.

### T107 hard boundary and qualification

Exactly the two T107 paths above. No `.github/workflows/**` or `src/**`. T107 requires exact-head Project CI 6/6, fresh independent substantive review, zero material findings/threads, guarded expected-head merge, post-merge ordered parent/tree/signature/PR/main verification, then durable `T107 = CLOSED_CANONICAL` before T108.

---

## T108 — Add non-gating self-verification workflow

### Authorized candidate surface

- `.github/workflows/self-verify.yml`

T108 uses the canonically merged T107 harness unchanged unless prospective authority is separately amended.

### Required workflow behavior

- trigger on `pull_request`;
- `permissions: contents: read` only;
- Ubuntu 24.04 / Node 24;
- checkout exact `H` with enough history for exact `B` and merge-base resolution;
- exact-head guard;
- exact `npm ci --ignore-scripts --no-audit --no-fund`;
- build exact `H`;
- invoke T107 harness with event `B` and `H`;
- never pass changed-command admission;
- upload only generated receipt/envelope;
- artifact name bound to exact `H`;
- `if-no-files-found: error`;
- `retention-days: 30`;
- use exact pinned `actions/upload-artifact` commit approved by implementation authorization;
- no repository/PR/status/comment write, secrets, release, tag, publication, or hidden-file upload.

### Shadow semantics

Job green means trustworthy capture succeeded, even when valid receipt exit is `1`, `3`, or `4`. It MUST NOT be presented as clean receipt truth.

### Live qualification proof

Exact final T108 head must show:

- Project CI 6/6 success;
- successful new workflow on exact `B/H` event identities;
- envelope with exact `B`, unique `M`, `H`, `HT`;
- subject receipt source HEAD bound to `M`;
- exact receipt digest and validator success;
- no automatic admission;
- downloadable bounded artifact;
- fresh independent exact-head review;
- zero unresolved material threads;
- exact one-path T108 purity.

No `.github/workflows/ci.yml`, T107 harness/test, `src/**`, package/dependency, receipt/schema, benchmark-result, release/tag/publication mutation.

After guarded merge and post-merge verification record `T108 = CLOSED_CANONICAL`.

---

## T109 — Reconcile first canonical shadow observation

Ledger/governance only by default.

Record the exact qualified T108 workflow run/artifact, verifier `H/HT`, event base-tip `B`, subject merge base `M`, target `H/HT`, receipt exit/digest, artifact identity/retention, and observed clean/non-clean/incomplete state. Preserve `SHADOW_NON_GATING`.

T109 MUST NOT promote required gating, extend retention, add trend aggregation, start selector shadow/historical corpus/adversarial receipt mutation, or begin M2.

If acceptance is proven record `T109 = CLOSED_CANONICAL` then `SPEC_006 = CLOSED_CANONICAL / GO`; otherwise record `NO_GO` and return to planning.

## Execution discipline

For T107/T108: reread live governance, branch from exact predecessor main, mutate only current-task paths, preserve historical benchmark-result blobs, qualify exact head with six-lane Project CI and fresh independent review, reconcile every material thread, guarded expected-head merge, verify parents/tree/signature/PR/main, and close predecessor canonically before successor.

Any head mutation invalidates earlier exact-head CI/review evidence.

## Authorization gate

T107 MUST NOT begin until the final Spec 006 planning package is canonically merged/post-merge verified and a separate durable implementation authorization binds that exact planning merge, T107–T109 paths, supply-chain decision, acceptance criteria, and prohibitions.