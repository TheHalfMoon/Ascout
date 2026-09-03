# Spec 006 Technical Plan — Self-Verification Shadow Receipt

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Canonical base:** `c8126773a63be744b121fbabc5e427600f671ae8`

## 1. Objective

Add one observational CI path that executes exact PR-head Ascout against the exact committed PR change and retains trustworthy receipt evidence **only for same-repository trusted PR branches**. No `src/**` product mutation is allowed.

## 2. Planned implementation surfaces

T107:
- `benchmarks/self-verify.mjs`
- `tests/t107-self-verification-harness.contract.test.ts`

T108:
- `.github/workflows/self-verify.yml`

T109: ledger/governance reconciliation only by default.

No current Project CI, package/runtime dependency, receipt/schema, historical benchmark-result, release/tag/publication mutation.

## 3. Trust eligibility

Before checkout/install/build/execution, T108 must prove `github.event.pull_request.head.repo.full_name == github.repository` or an equivalent exact same-repository predicate. Fork/external PRs skip before PR code executes and produce no receipt claim. `pull_request_target`, secrets, elevated permissions, or untrusted-PR workarounds are prohibited.

## 4. Identity model

- `B` = exact event base-tip SHA, provenance only;
- `H` = exact eligible PR head SHA;
- `M` = unique merge base of `B` and `H`;
- `HT` = exact `H^{tree}`;
- `V` = exact Ascout executable built from `H` before reconstruction;
- `S` = canonical expected `SourceStateV1` captured by exact `H`-built `composeSourceState(repositoryRoot)` after reconstruction and immediately before `V` launch.

## 5. Required eligible-PR sequence

```text
prove same-repository eligibility
  -> checkout exact H with enough history
  -> prove HEAD == H, clean tracked/index state, write-tree == HT
  -> npm ci --ignore-scripts --no-audit --no-fund
  -> npm run build
  -> prove no nonignored source drift
  -> prove B/H exist; compute all merge-base candidates; require exactly one M
  -> git reset --soft M
  -> prove HEAD == M, write-tree == HT, no tracked/untracked contamination
  -> lazily import exact H-built dist/check.js::composeSourceState
  -> capture expected canonical source snapshot S
  -> execute preserved V: check --format json
  -> capture exact stdout/stderr/exit
  -> parse receipt; exact H-built current-schema + semantic validate
  -> prove process exit == receipt.summary.exit_code
  -> prove receipt.source.start matches S for six required fields
  -> hash exact retained receipt bytes
  -> emit privacy-safe B/M/H/HT envelope
  -> upload receipt/envelope with bounded retention
```

Absent/multiple merge bases fail closed. Do not substitute `B`.

## 6. Harness interface

Repository-internal qualification tool:

```text
node benchmarks/self-verify.mjs \
  --event-base-sha <B> \
  --head-sha <H> \
  --output-dir <runner-temp>
```

Production executable is exact pre-reconstruction `H` build `dist/cli.js`.

No public CLI surface, product API, or persisted trust option is introduced.

## 7. Built-code loading boundary

Project CI tests before build, so `benchmarks/self-verify.mjs` MUST NOT top-level import `dist/**`.

Production execution lazily imports exact `H`-built:

- `dist/check.js::composeSourceState`;
- current receipt JSON Schema validator;
- current semantic validator.

Focused Vitest contracts may inject the same current source functions into internal adapters as test-only in-process dependencies. This is not a CLI option, runtime dependency, second validator, or second source-state implementation.

T108 live workflow is mandatory proof of the real built-dist path.

## 8. Git reconstruction proof

Before reset: `HEAD == H`, `git write-tree == HT`, clean tracked/index state, no unrelated nonignored untracked material.

Compute all Git-native merge-base candidates and require exactly one `M`; no `B is ancestor of H` assumption.

After `git reset --soft M`: prove `HEAD == M`, `git write-tree == HT`, no unstaged tracked divergence, no unrelated nonignored untracked material.

## 9. Independent canonical source snapshot

Immediately after §8 succeeds and immediately before verifier launch, call exact `H`-built canonical `composeSourceState(repositoryRoot)` once to capture expected snapshot `S`.

The harness MUST NOT reconstruct or duplicate the underlying tree-digest algorithm.

After receipt parse/schema/semantic validation, compare exactly:

```text
receipt.source.start.head_sha                  == S.head_sha
receipt.source.start.tree_digest_version       == S.tree_digest_version
receipt.source.start.tree_digest               == S.tree_digest
receipt.source.start.tracked_index_entry_count == S.tracked_index_entry_count
receipt.source.start.unstaged_changed_count    == S.unstaged_changed_count
receipt.source.start.included_untracked_count  == S.included_untracked_count
```

Any mismatch is capture failure before digest/envelope/artifact publication.

This comparison binds retained receipt truth to the independently reconstructed source state while preserving receipt v1 and the canonical composer.

## 10. Receipt semantics

Capture exact stdout bytes without rewriting. Parse one JSON receipt, run exact `H`-built current JSON Schema + semantic validation, require process exit equals `receipt.summary.exit_code`, then require §9 source equality.

Only after all integrity gates pass is SHA-256 computed over exact retained receipt bytes.

Valid source-bound exits `0/1/3/4` are shadow capture success. Exit `2` without valid receipt, malformed output, validation/source mismatch, identity mismatch, digest mismatch, or artifact failure is capture failure.

## 11. Envelope

Bind only schema/classification `SHADOW_NON_GATING`, verifier `H/HT`, event base `B`, subject merge base `M`, target `H/HT`, receipt exit/digest/filename. No raw repository/run URL, path, actor/user, host/home, env dump, credentials/tokens, or arbitrary diagnostics.

`S` remains an in-memory capture-integrity expectation; Spec 006 does not add its fields to receipt or envelope schema.

## 12. Workflow design

New `.github/workflows/self-verify.yml` only:

- trigger `pull_request`;
- job-level same-repository `if` before checkout;
- fork/external PR => skipped, no receipt claim;
- `permissions: contents: read`;
- Ubuntu 24.04 / Node 24;
- exact H checkout with sufficient history and exact-head guard;
- exact `npm ci`; build H;
- invoke T107 with B/H;
- upload only receipt/envelope;
- `if-no-files-found: error`;
- `retention-days: 30`;
- never use `pull_request_target` or secrets.

Workflow green means capture integrity, not clean receipt truth.

## 13. Artifact dependency

Planning-reviewed official `actions/upload-artifact`, MIT, `v7.0.1`, exact commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`, Node 24 runtime. Reverify before implementation and full-SHA pin only.

## 14. Focused T107 proof

Required proof includes:

- exact-H / wrong-H / missing-B;
- `B==M`, advanced-base `B!=M`, multiple-merge-base rejection;
- soft-reset/tree identity; added/deleted/renamed/content changes; drift/untracked rejection;
- test-before-build injection path and production lazy-import boundary;
- canonical expected snapshot `S` capture adapter;
- exact equality success for all six source fields;
- independent mismatch rejection for each of the six fields;
- valid exits `0/1/3/4`; process/receipt mismatch; malformed/schema-invalid/semantic-invalid/no-receipt;
- exact receipt digest; envelope privacy/B-M-H-HT binding; no auto-admission.

T108 additionally proves same-repository eligibility, live exact-head built `composeSourceState` + validator path, and downloadable artifact. Static workflow proof alone is insufficient.

## 15. Ordering / qualification

`T107 -> T108 -> T109`

T107/T108 each require exact predecessor main, exact path purity, focused/full proof, exact-head six-lane Project CI, fresh independent substantive review, zero material threads, guarded expected-head merge, and post-merge parent/tree/signature/PR/main verification.

T108 additionally requires a live artifact on exact final eligible same-repository PR head.

## 16. Stop conditions

Return to planning if implementation cannot prove same-repository eligibility, exact B/H, unique M, exact HT, canonical pre-launch `S`, six-field receipt-source equality, exact H verifier identity, current-validator acceptance, exit consistency, no auto-admission, least-privilege bounded artifact upload, and zero product-core mutation.

Do not add `pull_request_target`, fork secrets, product PR-range mode, receipt/source fields, new digest algorithm, second evaluator, trust bypass, generalized workflow infrastructure, or write permissions.

## 17. Authorization

Planning merge does not authorize implementation. Separate durable authorization must bind exact planning merge and T107–T109 boundaries.