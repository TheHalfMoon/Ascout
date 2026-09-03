# Implementation Authorization: Spec 006 Self-Verification Shadow Receipt

**Spec:** 006  
**Status:** AUTHORIZATION_PENDING_MERGE  
**Canonical base:** `8181439a894e47d20a968e8631398694da20364c`  
**Date:** 2026-09-03

## Authority chain

This authorization binds, in order:

1. `.specify/memory/constitution.md`
2. `docs/founding/MASTER_PLAN_V1.md`
3. `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`
4. `specs/006-self-verification-shadow-receipt/GAP_EVIDENCE.md`
5. `specs/006-self-verification-shadow-receipt/spec.md`
6. `specs/006-self-verification-shadow-receipt/clarifications.md`
7. `specs/006-self-verification-shadow-receipt/ponytail-review.md`
8. `specs/006-self-verification-shadow-receipt/plan.md`
9. `specs/006-self-verification-shadow-receipt/plan-ponytail-review.md`
10. `specs/006-self-verification-shadow-receipt/tasks.md`
11. `specs/006-self-verification-shadow-receipt/checklists/requirements.md`
12. `specs/006-self-verification-shadow-receipt/SUPPLY_CHAIN_REVIEW.md`
13. `specs/006-self-verification-shadow-receipt/analysis.md`
14. `specs/006-self-verification-shadow-receipt/FINAL_PLAN_AUDIT.md`
15. `specs/006-self-verification-shadow-receipt/HEAD_CROSS_ARTIFACT_REVIEW.md`

## Canonical planning merge binding

- **Planning merge SHA:** `8181439a894e47d20a968e8631398694da20364c`
- **Planning merge tree:** `290a9fde9f340d3bad7c117375e4c20f6e5903d4`
- **Planning merge parent 1:** `c8126773a63be744b121fbabc5e427600f671ae8`
- **Planning merge parent 2:** `06246bb11835dd22c870faf776f73a16a726cd38`
- **Planning merge signature:** GitHub-verified PGP signature present (`verified=true`, `reason=valid`)
- **Planning PR:** #146 (`MERGED`)
- **Planning Project CI:** run `33778570402`, exact-head six-lane success
- **Planning independent review:** CodeRabbit issue comment `5528860758`, exact head `06246bb11835dd22c870faf776f73a16a726cd38`, all 12 planning files reviewed, no material planning inconsistency or unsafe ambiguity
- **Planning review threads:** zero unresolved threads at merge gate
- **Planning ledger:** Issue #145, `SPEC_006_PLANNING = CLOSED_CANONICAL`
- **Planning findings:** F1–F6 reconciled before exact-head qualification and merge

This authorization becomes effective only when this file itself is merged into canonical `main` and that authorization merge identity is post-merge verified. It does not backdate or fabricate implementation authority.

## Material planning constraints incorporated into implementation authority

### F1 — PR source identity

For one eligible same-repository pull request:

- `B` = exact GitHub event base-tip SHA, provenance only;
- `H` = exact pull-request head SHA;
- `M` = unique merge base of `B` and `H`;
- `HT = H^{tree}`;
- exact subject reconstruction uses ephemeral `git reset --soft M`;
- post-reconstruction proof requires `HEAD == M`, `git write-tree == HT`, no unstaged tracked divergence, and no unrelated nonignored untracked material;
- missing or multiple merge bases fail closed; `B` MUST NOT be substituted for `M`.

### F2 — Tests-before-build boundary

Project CI runs tests before build. T107 MUST NOT top-level import `dist/**`.

Production self-verification may lazily load exact `H`-built canonical composer/validators only after T108 has built `H`. Focused T107 tests may inject the same current source functions into internal test adapters only. This is not a CLI option, product API, runtime dependency, second evaluator, or alternate acceptance rule.

### F3 — Trusted execution scope

Spec 006 self-verification executes only for same-repository PR heads.

T108 MUST evaluate exact same-repository eligibility before checkout/install/build/execution of PR-head code. Fork/external PRs skip execution and produce no self-verification receipt claim.

`pull_request_target`, repository secrets, elevated write permissions, and any fork-code workaround are prohibited.

### F4 — Independent receipt/source binding

Immediately after reconstruction proof and immediately before verifier launch, production must call exact `H`-built canonical `composeSourceState(repositoryRoot)` and retain in memory expected `SourceStateV1` snapshot `S`.

After exact receipt parse, current JSON Schema validation, current semantic validation, and process/receipt exit equality, `receipt.source.start` MUST equal `S` exactly for:

- `head_sha`
- `tree_digest_version`
- `tree_digest`
- `tracked_index_entry_count`
- `unstaged_changed_count`
- `included_untracked_count`

Any one-field mismatch is capture failure before receipt SHA-256, envelope emission, or artifact upload.

No second tree/source digest algorithm, second source-state evaluator, receipt field, schema field, or envelope expansion is authorized. The existing canonical composer is the only source-state composer for this binding.

### F5 — YAGNI consistency

Both YAGNI reviews are binding: implementation must reuse the canonical composer, retain only the six-field equality gate, and MUST NOT generalize source-state machinery, Git reconstruction, workflow infrastructure, evidence history, or policy gating.

### F6 — Exit-2 disposition

Exit `2` is always self-verification harness-integrity failure.

Even if stdout contains an otherwise valid, current-schema-valid, semantically valid, process-exit-consistent, six-field source-bound receipt, an agreed process/receipt exit of `2` MUST be rejected before receipt SHA-256, qualification-envelope emission, or artifact upload.

Only exits `0`, `1`, `3`, and `4` may become retained `SHADOW_NON_GATING` observations.

## Authorized task sequence

`T107 → T108 → T109`, executed strictly in canonical order.

T107 may begin only after this authorization is canonically merged and verified. T108 may begin only after `T107 = CLOSED_CANONICAL`. T109 may begin only after `T108 = CLOSED_CANONICAL`.

## T107 — Exact-tree self-verification harness

### Authorized implementation surface

- `benchmarks/self-verify.mjs` — new single-purpose repository qualification harness only

### Authorized proof surface

- `tests/t107-self-verification-harness.contract.test.ts` — new focused contracts only

### Required behavior

The T107 harness MUST:

1. accept explicit event base-tip `B`, exact head `H`, and output directory;
2. prove the starting repository is exact `H`, capture exact `HT`, and reject tracked/index/source contamination;
3. prove `B` and `H` are available locally;
4. compute all Git merge-base candidates and require exactly one `M`;
5. perform ephemeral `git reset --soft M` only after the exact `H` verifier build exists;
6. prove `HEAD == M`, `git write-tree == HT`, no unstaged tracked divergence, and no unrelated nonignored untracked material;
7. execute only the preserved exact `H` build with `check --format json` and never pass `--allow-changed-command-surface`;
8. capture exact stdout receipt bytes and stderr separately without rewriting stdout;
9. lazily use exact `H`-built current JSON Schema + semantic validators in production;
10. capture pre-launch exact `H`-built canonical source snapshot `S` through `composeSourceState(repositoryRoot)`;
11. require process exit equals `receipt.summary.exit_code`;
12. require exact six-field `receipt.source.start == S` binding;
13. reject exit `2` before digest/envelope/upload even if otherwise valid and source-bound;
14. permit only source-bound exits `0/1/3/4` as successful `SHADOW_NON_GATING` captures;
15. compute SHA-256 over exact retained receipt bytes only after all earlier gates pass;
16. emit only the privacy-safe qualification envelope authorized by the canonical plan;
17. place output outside repository source identity;
18. fail closed on identity, merge-base, reconstruction, validation, source-binding, exit-classification, digest, or evidence-output failure.

### Required focused proof

At minimum T107 contracts must cover:

- exact H precondition and wrong H rejection;
- missing B / unresolved identity rejection;
- `B == M` normal case;
- advanced-base `B != M` case;
- multiple merge-base rejection;
- exact soft-reset/tree preservation;
- added, deleted, renamed, and modified tracked content;
- unstaged tracked drift rejection;
- unrelated nonignored untracked-file rejection;
- canonical ignored build/install paths not contaminating source identity;
- valid source-bound exits `0`, `1`, `3`, `4` accepted as shadow captures;
- otherwise-valid/current-schema-valid/semantic-valid/process-consistent/source-bound exit `2` rejected before digest/envelope/output;
- process/receipt exit mismatch rejection;
- malformed JSON rejection;
- current-schema-invalid receipt rejection;
- semantic-invalid receipt rejection;
- no-receipt/internal-failure rejection;
- independent mismatch rejection for each of the six source-state fields;
- exact receipt-byte SHA-256;
- envelope field allowlist/privacy;
- executed verifier argv never includes changed-command-surface admission;
- test-before-build path proves no required pre-existing repository `dist/` and uses only canonical current source functions through internal test adapters.

### T107 hard boundary

No `.github/workflows/**`, `src/**`, package/dependency manifest, receipt/schema, CLI, historical benchmark result, release/tag/publication mutation.

No generalized Git library, generic CI SDK, second source-state/digest algorithm, alternate validator, new product API, or auto-admission.

## T108 — Same-repository non-gating self-verification workflow

### Authorized implementation surface

- `.github/workflows/self-verify.yml` — new workflow only

T108 MUST use the canonically merged T107 harness unchanged unless a prospective authority amendment is separately canonicalized before any harness mutation.

### Required workflow behavior

The T108 workflow MUST:

1. trigger on ordinary `pull_request` only;
2. evaluate same-repository eligibility at job level before checkout using `github.event.pull_request.head.repo.full_name == github.repository` or an equivalently exact predicate;
3. skip fork/external PRs before PR-head checkout/install/build/execution and produce no self-verification receipt claim;
4. declare `permissions: contents: read` only;
5. run one observational lane on Ubuntu 24.04 / Node 24;
6. checkout exact `H` with enough history to resolve `B` and unique `M`;
7. guard exact `H` before install/build;
8. run explicit `npm ci --ignore-scripts --no-audit --no-fund`;
9. run `npm run build` at exact `H`;
10. invoke the canonical T107 harness with exact event `B`, exact `H`, and runner-temp output;
11. never pass changed-command-surface admission;
12. upload only `self-verification-receipt.json` and `self-verification-envelope.json`;
13. bind artifact name unambiguously to exact `H`;
14. use `if-no-files-found: error` and `retention-days: 30`;
15. use the approved exact full-SHA `actions/upload-artifact` pin after immediate implementation-time reverification;
16. use no secrets, repository/PR/status/comment writes, hidden-file upload, `pull_request_target`, release, tag, or publication behavior.

### T108 supply-chain binding

Planning and authorization-time rechecks identify:

- repository: official `actions/upload-artifact`
- reviewed release/tag: `v7.0.1`
- exact commit: `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`
- exact tag currently resolves to that commit
- exact commit has GitHub verification `verified=true`, `reason=valid`
- planning license review: MIT

Immediately before T108 mutation, reverify repository/ref/commit/action metadata/license/security suitability again. If the exact reviewed commit is unsuitable or no longer satisfies the decision, T108 is blocked and returns to planning; no floating tag or silent substitute is authorized.

### Required T108 live qualification proof

The exact final T108 PR head MUST demonstrate:

- Project CI 6/6 success;
- workflow syntax/structure and same-repository eligibility before checkout;
- successful live self-verification run on the exact final same-repository PR head;
- real production lazy-loading of exact `H`-built canonical composer/validators;
- exact `B/M/H/HT` identities;
- exact pre-launch source snapshot binding and six-field receipt equality;
- allowed receipt exit only in `0/1/3/4`;
- exact retained receipt digest matching exact receipt bytes;
- privacy-safe envelope matching the approved allowlist;
- no changed-command admission;
- downloadable bounded artifact containing only the expected receipt/envelope evidence;
- no untrusted fork execution claim.

### T108 hard boundary

No modification to `.github/workflows/ci.yml`, T107 harness/tests, `src/**`, package/dependency manifests, receipt/schema, historical benchmark results, release/tag/publication.

## T109 — First canonical shadow observation reconciliation

T109 is ledger/governance reconciliation only by default. No code/product/workflow mutation is authorized.

After T108 closes canonically, T109 MUST record from exact live evidence:

- T108 workflow run ID;
- verifier H and HT;
- event base B;
- unique subject merge base M;
- target H and HT;
- receipt exit;
- exact receipt SHA-256;
- artifact ID/name and bounded retention;
- same-repository eligibility;
- observed clean/non-clean/incomplete receipt state;
- explicit classification `SHADOW_NON_GATING`;
- any measured friction discovered in the first live observation.

T109 MUST NOT promote required merge gating, fork execution, retention duration, trend aggregation, selector shadow, benchmark corpus expansion, adversarial receipt mutation, or M2 work.

## Task qualification and merge discipline

T107 and T108 independently require:

1. branch from exact canonical `main` after predecessor closeout;
2. exact authorized-path purity;
3. historical benchmark-result immutability;
4. focused proof plus full repository typecheck/test/build as applicable;
5. exact-head Project CI success across Ubuntu 24.04, macOS 14, Windows 2025 × Node 22/24;
6. fresh independent substantive review of the exact final head;
7. reconciliation of every material finding;
8. zero unresolved material review threads;
9. unchanged final head after qualification/review;
10. guarded merge with expected head SHA;
11. post-merge verification of ordered parents, tree, GitHub signature, PR state, canonical `main`, and absence of intervening main movement;
12. durable canonical task closeout before successor begins.

T108 additionally requires the live exact-head self-verification artifact proof defined above.

Any head mutation invalidates earlier exact-head CI/review evidence.

## Hard prohibitions

1. No `src/**` product mutation under Spec 006.
2. No receipt schema/model/version or CLI mutation.
3. No new runtime dependency.
4. No product PR-range mode or new comparison mode.
5. No second source-state/digest algorithm or second validator/evaluator.
6. No automatic or persisted changed-command-surface admission.
7. No execution of fork/external PR code under Spec 006.
8. No `pull_request_target`, repository secrets, or elevated write permission for self-verification.
9. No generalized CI SDK, Git reconstruction framework, database/history service, or dashboard.
10. No selector shadow, historical corpus expansion, adversarial receipt mutation, mutation/property/fuzz/counterfactual work, or other M2 capability.
11. No current Project CI mutation.
12. No historical benchmark-result overwrite/fabrication.
13. No npm publication, GitHub Release, or Git tag.
14. No force-push, rebase of shared history, or destructive history rewrite.
15. No fabricated evidence, CI, review, artifact identity, authority, qualification, or completion claim.
16. No task starts before its predecessor and exact authorization/closeout gates are canonical.

## Founder standing approval

The founder's standing approval for ordinary repository work is recorded prospectively. It applies only to the exact T107 → T108 → T109 sequence, file surfaces, F1–F6 constraints, acceptance criteria, supply-chain binding, qualification rules, and prohibitions above.

It becomes effective only when this authorization file itself is merged into canonical `main` and the authorization merge identity is verified.

## Spec 006 canonical closeout criteria

Spec 006 closes `GO` only when:

1. this authorization is canonically merged and verified;
2. T107 and T108 are canonically merged in order and independently qualified;
3. T109 records the exact first canonical shadow observation from the qualified T108 run/artifact;
4. every implementation merge has verified ordered parents/tree/signature/PR/main identity;
5. each implementation task has exact-head six-lane Project CI success and fresh independent review with zero unresolved material findings/threads;
6. F1–F6 remain satisfied in implementation;
7. T108 live evidence proves same-repository-only execution, exact B/M/H/HT reconstruction, canonical pre-launch S, six-field receipt source binding, allowed exit `0/1/3/4`, exact receipt digest, and bounded privacy-safe artifact;
8. receipt schema remains `1.0` and no product-core behavior is changed;
9. historical benchmark results remain unchanged;
10. no prohibited dependency, untrusted execution, publication, release, tag, selector/corpus/adversarial/M2 successor capability is introduced.

If any required gate cannot be satisfied within this authority, stop `NO_GO` and return to planning rather than widening authority.