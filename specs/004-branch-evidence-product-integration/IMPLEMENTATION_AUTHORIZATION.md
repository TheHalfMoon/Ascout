# Implementation Authorization: Spec 004 Branch-Evidence Product Integration

**Spec:** 004  
**Status:** AUTHORIZATION_PENDING_MERGE  
**Canonical base:** `e7a99dbc13942138b280b018fc425acabb6fc05c`  
**Date:** 2026-09-01

## Authority chain

This authorization binds the following canonical artifacts in order:

1. `.specify/memory/constitution.md`
2. `docs/founding/MASTER_PLAN_V1.md`
3. `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`
4. `docs/strategy/RESEARCH_LEDGER_2026-08-26.md`
5. `docs/architecture/M3_BRANCH_EXERCISE_QUALIFICATION_REVIEW_2026-09-01.md`
6. `docs/architecture/M4_BRANCH_EVIDENCE_PRODUCT_INTEGRATION_REVIEW_2026-09-01.md`
7. `specs/004-branch-evidence-product-integration/spec.md`
8. `specs/004-branch-evidence-product-integration/CLARIFICATIONS.md`
9. `specs/004-branch-evidence-product-integration/YAGNI_REVIEW.md`
10. `specs/004-branch-evidence-product-integration/plan.md`
11. `specs/004-branch-evidence-product-integration/PLAN_YAGNI_REVIEW.md`
12. `specs/004-branch-evidence-product-integration/tasks.md`
13. `specs/004-branch-evidence-product-integration/checklists/requirements.md`
14. `specs/004-branch-evidence-product-integration/analysis.md`
15. `specs/004-branch-evidence-product-integration/FINAL_PLAN_AUDIT.md`
16. `specs/004-branch-evidence-product-integration/HEAD_CROSS_ARTIFACT_REVIEW.md`
17. `specs/004-branch-evidence-product-integration/BRANCH_PURITY_REVIEW.md`
18. `specs/003-branch-exercise-qualification/IMPLEMENTATION_AUTHORIZATION.md`
19. `benchmarks/README.md`
20. `benchmarks/manifest.json`
21. `benchmarks/results/t095-branch-exercise-qualification.json`

## Canonical planning merge binding

- **Planning merge SHA:** `e7a99dbc13942138b280b018fc425acabb6fc05c`
- **Planning merge tree:** `63e939fa8fa16ce4d29b554c65ca7ee3efd8451f`
- **Planning merge parent 1:** `ae620e7a2bd152f3e6ea2a89d393483c038c5840` (canonical main before Spec 004 planning)
- **Planning merge parent 2:** `479440f0dc34d55cfd0cee234b015ef290fca3e5` (Spec 004 planning head)
- **Planning merge signature:** GitHub-verified PGP signature present
- **Planning PR:** #110
- **Planning merge state:** `MERGED`

This authorization becomes effective only when this file itself is merged into canonical `main` and the merge identity is verified. It does not backdate or fabricate implementation authority before that point.

## Measured predecessor binding

- **Spec 003 qualification result:** `GO`
- **Spec 003 scope limit:** `future planning only`
- **T095:** `CLOSED_CANONICAL`
- **T096:** `CLOSED_CANONICAL`
- **SPEC_003:** `CLOSED_CANONICAL`
- **product_integration_authorized:** `false` (before this authorization)
- **function_coverage_qualified:** `false`

Spec 004 product integration is authorized only because the successor planning package has been canonically merged and reviewed. This authorization does not retroactively authorize Spec 003 product integration.

## Authorized task sequence

T101 → T102 → T103, executed in canonical order. Each task begins only after the prior task is canonically closed. No task may begin before this authorization is itself canonically merged.

### T101 — Extend LCOV parser for branch observations

**Authorized file surfaces:**
- `src/coverage/lcov.ts` — extend LCOV parser to optionally parse `BRDA:` records and return branch observations alongside existing line points.

**Required scope:**
- Add `LcovBranchPoint` interface and branch observation types.
- Parse `SF:` mapping for branch records.
- Parse `BRDA:` four-field records: `line,block,branch,taken`.
- `taken` is non-negative safe integer or `-` for unknown.
- Deterministic tuple identity: `(canonical_path, line, block_id, branch_id)`.
- Repeated numeric identities aggregate by safe addition.
- Any unknown observation for an identity keeps it unresolved.
- Malformed/incomplete/path-unsafe input fails closed with machine-stable reason.
- Existing line parsing behavior is unchanged.

**Prohibited mutations:**
- No `src/` behavior change for existing line parsing.
- No receipt, package, dependency, historical result, publication, release, or tag change.

**Acceptance:**
- repository-safe `SF:` mapping for branch records;
- exact `BRDA` four-field parsing;
- numeric taken / unknown `-` semantics;
- deterministic tuple identity and ordering;
- repeated numeric aggregation with safe overflow handling;
- any unknown observation for an identity remains unresolved;
- malformed/incomplete/path-unsafe input fails closed;
- existing line parsing behavior is unchanged.

**Benchmark gates:**
- Existing `benchmarks/results/t095-branch-exercise-qualification.json` must remain unchanged.
- T101 must not overwrite or modify any historical benchmark result.

**CI/Review gates:**
- Exact-head six-lane Project CI must be green: Ubuntu 24.04, macOS 14, Windows 2025 × Node 22/24.
- Fresh exact-head review must reconcile all material findings.
- If head changes during T101, requalify from scratch.

**Merge requirements:**
- Guarded merge with expected head SHA.
- Verify ordered parents, tree, signature, PR state, canonical main.

### T102 — Extend exercise builder for branch records

**Authorized file surfaces:**
- `src/exercise.ts` — accept branch observations; build branch records and branch summary counts; preserve line records exactly.
- `src/check.ts` — wire branch observations from LCOV parser to exercise builder.

**Required scope:**
- Add branch observation parameter to `buildChangedLineExercise`.
- Build `branch_records`, `exercised_branches`, `not_exercised_branches`, `unresolved_branches`, `changed_files_with_zero_exercised_branches`.
- Sort branch records deterministically by `(path, line, block_id, branch_id)`.
- Preserve existing line records, counts, and `changed_files_with_zero_exercised_lines` exactly.

**Prohibited mutations:**
- No receipt, package, dependency, historical result, publication, release, or tag change.

**Acceptance:**
- branch-only gap is identified only when the declared changed line is line-exercised and at least one changed branch is not exercised;
- fully-exercised control yields no branch gap;
- unknown branch remains unresolved;
- branches outside changed ranges do not count as changed-branch gaps;
- deterministic semantic result ordering/serialization;
- existing line exercise tests pass unchanged;
- backward compatibility: line-only fixtures produce identical line records, completeness, and exit code.

**Benchmark gates:**
- Existing `benchmarks/results/t095-branch-exercise-qualification.json` must remain unchanged.

**CI/Review gates:**
- Exact-head six-lane Project CI must be green.
- Fresh exact-head review must reconcile all material findings.

**Merge requirements:**
- Guarded merge with expected head SHA.
- Verify ordered parents, tree, signature, PR state, canonical main.

### T103 — Update receipt model and validation

**Authorized file surfaces:**
- `src/receipt/model.ts` — add `BranchRecordV1`; extend `ExerciseV1` with optional branch fields; update `exerciseHasMaterialGap`; update `validateExercise` for branch records.
- `tests/t101-lcov-branch-parser.contract.test.ts` — parser/path/aggregation/fail-closed contracts.
- `tests/t102-branch-exercise.contract.test.ts` — branch-line interaction, completeness, exit code, backward compatibility contracts.
- `tests/t103-branch-receipt-validation.contract.test.ts` — receipt validation contracts for optional branch fields.
- `tests/fixtures/lcov/branch-cases.json` — deterministic branch fixtures with declared changed ranges and expected outcomes.

**Required scope:**
- Add `BranchRecordV1` interface.
- Extend `ExerciseV1` with optional `branch_records`, `exercised_branches`, `not_exercised_branches`, `unresolved_branches`, `changed_files_with_zero_exercised_branches`.
- Update `exerciseHasMaterialGap` to include branch gaps as additive material incompleteness.
- Update `validateExercise` to validate branch records when present and not fail when absent.
- Add focused contract tests proving all acceptance criteria.

**Prohibited mutations:**
- No `src/cli.ts`, `src/run.ts`, `src/selection.ts`, `src/receipt/json.ts`, `src/receipt/agent.ts`, `src/receipt/build.ts` change.
- No receipt schema version change.
- No package, dependency, historical result, publication, release, or tag change.

**Acceptance:**
- branch-only gap is detected when line is `EXERCISED` and branch is `NOT_EXERCISED`;
- fully-exercised branches produce zero false branch gaps;
- unknown/malformed/path-unsafe branch data fails closed or remains unresolved;
- branch evidence is additive and does not alter line-level behavior when absent;
- completeness derivation includes branch gaps;
- exit code 4 is produced for materially incomplete branch evidence;
- deterministic serialization of branch records;
- `validateExercise` accepts receipts with optional `branch_records` and does not fail when absent;
- existing changed-line exercise tests pass unchanged.

**Benchmark gates:**
- Existing `benchmarks/results/t095-branch-exercise-qualification.json` must remain unchanged.
- All T101–T103 contract tests must pass.

**CI/Review gates:**
- Exact-head six-lane Project CI must be green.
- Fresh exact-head review must reconcile all material findings.

**Merge requirements:**
- Guarded merge with expected head SHA.
- Verify ordered parents, tree, signature, PR state, canonical main.

## Schema/version authority

- Receipt schema version remains `"1.0"`.
- `BranchRecordV1` is additive and optional within receipt v1.
- No receipt v2 or additive receipt fields beyond optional branch fields are authorized.
- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json` must not change in a non-additive way.

## Compatibility requirements

- Line-only repositories must produce identical exercise records, completeness, and exit code when no branch records are present.
- Existing changed-line exercise tests must continue to pass unchanged.
- No behavioral change occurs when branch data is absent.

## Benchmark gates

- Existing `benchmarks/results/t078-selector-misses.json` must remain unchanged.
- Existing `benchmarks/results/t091-m2-selection-replay.json` must remain unchanged.
- Existing `benchmarks/results/t095-branch-exercise-qualification.json` must remain unchanged.
- No new benchmark cases are required for T101–T103.

## Review requirements

- Each task PR must receive fresh exact-head review reconciliation.
- Review must verify branch purity, product-surface immutability, and evidence discipline.
- Unresolved material review threads block merge.
- If head changes during a task, stale review/CI evidence is invalidated and requalification is required.

## Hard prohibitions

The following are hard prohibitions for T101–T103:

1. No function coverage.
2. No AST/CFG analysis.
3. No receipt version bump beyond additive v1 extension.
4. No CLI/terminal/agent output changes unless explicitly planned.
5. No new runtime dependencies.
6. No browser/API/security integration.
7. No plugin architecture.
8. No agent/RAG/memory expansion.
9. No sandbox platform functionality.
10. No cloud control plane.
11. No unrelated receipt redesign.
12. No npm publication.
13. No GitHub Release creation.
14. No Git tag creation.
15. No force-push or rebase of shared history.
16. No destructive history rewrite.
17. No hidden Windows CI failure or bypass.
18. No benchmark-result fabrication or overwrite.
19. No fabricated evidence, CI, review, or completion claims.
20. No implementation mutation before this authorization is canonically merged.

## Release/publication/tag boundaries

- T101–T103 do not authorize npm publication.
- T101–T103 do not authorize GitHub Release creation.
- T101–T103 do not authorize Git tag creation.
- Publication, release, and tag boundaries are determined by separate canonical authorization after Spec 004 closeout.

## Founder's standing approval

The founder's standing approval for ordinary repository work is recorded here prospectively. This approval applies only to the exact task sequence, file surfaces, and prohibitions enumerated in this authorization. It becomes effective only when this file itself is merged into canonical `main` and the merge identity is verified. It does not backdate authority before that point.

## Canonical closeout criteria

Spec 004 closes `GO` only when:

1. T101, T102, and T103 are canonically merged in order.
2. Each task merge is verified: ordered parents, tree, signature, PR state, canonical main.
3. All exact-head six-lane Project CI runs are green on each task merge.
4. All fresh exact-head review threads are reconciled with zero unresolved material findings.
5. Branch purity, product-surface immutability, and evidence discipline are verified for each task.
6. Existing changed-line exercise tests continue to pass unchanged.
7. Receipt schema version remains `"1.0"`.
8. Historical benchmark results are unchanged.
9. No prohibited surface, dependency, publication, release, or tag was mutated.

If any gate cannot be satisfied without violating this authorization, close `NO_GO` and return to planning. Do not widen Spec 004.
