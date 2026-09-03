# Spec 006 Technical Plan — Self-Verification Shadow Receipt

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Canonical base:** `c8126773a63be744b121fbabc5e427600f671ae8`

## 1. Objective

Add one observational CI path that executes the exact pull-request-head Ascout build against the exact committed pull-request change and retains receipt evidence **only for same-repository trusted PR branches**. No `src/**` product mutation is needed or allowed.

## 2. Planned implementation surfaces

T107:
- `benchmarks/self-verify.mjs`
- `tests/t107-self-verification-harness.contract.test.ts`

T108:
- `.github/workflows/self-verify.yml`

T109: ledger/governance reconciliation only by default.

No current Project CI, package/runtime dependency, receipt/schema, historical benchmark-result, release/tag/publication mutation.

## 3. Trust eligibility

Before checkout/install/build/execution of PR-head code, T108 MUST prove:

`github.event.pull_request.head.repo.full_name == github.repository`

or an equivalent exact same-repository predicate.

Fork/external PRs are skipped before any PR code executes and produce no self-verification receipt claim. `pull_request_target`, secret-backed fork execution, elevated token permissions, or any untrusted-PR workaround is prohibited.

## 4. Identity model

- `B` = exact GitHub event base-tip SHA, provenance only;
- `H` = exact PR head SHA;
- `M` = unique merge base of `B` and `H`;
- `HT` = exact tree SHA `H^{tree}`;
- `V` = exact Ascout executable built from `H` before reconstruction.

## 5. Required eligible-PR sequence

```text
prove same-repository eligibility before executing H
  -> checkout exact H with enough history
  -> prove HEAD == H
  -> prove clean tracked/index state
  -> record HT; prove git write-tree == HT
  -> npm ci --ignore-scripts --no-audit --no-fund
  -> npm run build
  -> prove no nonignored source drift
  -> prove B and H exist
  -> compute all merge-base candidates(B,H)
  -> require exactly one M
  -> git reset --soft M
  -> prove HEAD == M
  -> prove git write-tree == HT
  -> prove no unstaged tracked divergence
  -> prove no unrelated nonignored untracked files
  -> execute preserved V: check --format json
  -> capture exact stdout/stderr/exit
  -> current-schema + semantic validate receipt
  -> prove process exit == receipt.summary.exit_code
  -> hash exact receipt bytes
  -> emit privacy-safe envelope binding B/M/H/HT
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

Production verifier is exact pre-reconstruction `H` build `dist/cli.js`.

## 7. Validator loading boundary

Project CI runs tests before build. Therefore `benchmarks/self-verify.mjs` MUST NOT import `dist/**` validators at module top level.

Production execution lazily imports exact `H`-built validators only after the workflow has built `H`. Focused Vitest contracts may pass the same current source validator functions into an internal validation adapter as test-only in-process dependencies. This is not a CLI option, product API, second validator, or runtime dependency.

T108 live workflow is mandatory proof of the real built-dist validator path.

## 8. Git proof

Before reset: `HEAD == H`, `git write-tree == HT`, clean tracked/index state, no unrelated nonignored untracked material.

Compute all Git-native merge-base candidates and require exactly one `M`. No `B is ancestor of H` assumption.

After `git reset --soft M`: `HEAD == M`, `git write-tree == HT`, no unstaged tracked divergence, no unrelated nonignored untracked material.

## 9. Receipt semantics

Capture exact stdout receipt bytes; run exact head-built current JSON Schema + semantic validation; require process exit equals `receipt.summary.exit_code`; require receipt source start HEAD equals `M`; compute SHA-256 over exact retained bytes.

Valid exits `0/1/3/4` are shadow capture success. Exit `2` without valid receipt, malformed output, validator rejection, identity mismatch, digest mismatch, or artifact failure is capture failure.

## 10. Envelope

Bind only:
- schema/version + `SHADOW_NON_GATING`;
- verifier `H/HT`;
- event base tip `B`;
- subject merge base `M`;
- target `H/HT`;
- receipt exit/digest/filename.

No repository/run URL, raw/absolute path, actor/user, host/home, env dump, credential/token, or arbitrary diagnostics.

## 11. Workflow design

New `.github/workflows/self-verify.yml` only:

- trigger `pull_request`;
- job-level same-repository `if` evaluated before checkout;
- fork/external PR => skipped job, no receipt claim;
- `permissions: contents: read`;
- Ubuntu 24.04 / Node 24;
- exact H checkout with sufficient history;
- exact-head guard;
- setup Node;
- exact `npm ci`;
- build H;
- invoke T107 with B/H;
- upload only receipt/envelope;
- `if-no-files-found: error`;
- `retention-days: 30`;
- never use `pull_request_target` or secrets.

Workflow green means capture integrity, not a clean receipt verdict.

## 12. Artifact dependency

Planning-reviewed: official `actions/upload-artifact`, MIT, `v7.0.1`, exact commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`, Node 24 runtime. Reverify before implementation and full-SHA pin only.

## 13. Focused T107 proof

Include exact-H precondition; wrong H; missing B; `B==M`; advanced base `B!=M`; multiple merge-base rejection; exact soft-reset/tree proof; added/deleted/renamed/content-change identity; drift/untracked rejection; ignored paths; valid exits 0/1/3/4; exit mismatch; malformed/schema-invalid/semantic-invalid/no-receipt; exact digest; envelope privacy/B-M-H-HT binding; no auto-admission; test-before-build validator injection behavior.

T108 additionally proves same-repository eligibility and live exact-head built-dist artifact path. A workflow syntax/static test alone is insufficient.

## 14. Ordering / qualification

`T107 -> T108 -> T109`

T107/T108 each require exact predecessor main, exact path purity, focused/full proof, six-lane Project CI on exact head, fresh independent substantive review, zero material threads, guarded expected-head merge, post-merge parent/tree/signature/PR/main verification.

T108 additionally requires live self-verification workflow artifact on exact final **eligible same-repository** PR head and proof that fork/external PR execution is excluded by workflow eligibility.

## 15. Stop conditions

Return to planning if implementation cannot prove same-repository eligibility before PR-code execution, exact B/H availability, unique M, exact HT preservation, exact H verifier identity, current-validator acceptance, exit consistency, no auto-admission, least-privilege bounded artifact upload, and zero product-core mutation.

Do not add `pull_request_target`, fork secrets, product PR-range mode, receipt fields, trust bypass, second validator, generalized workflow infrastructure, or write permissions.

## 16. Authorization

Planning merge does not authorize implementation. Separate durable authorization must bind exact planning merge and T107–T109 boundaries.