# Specification 009 — Tasks

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`  
**Canonical order:** `T115 -> T116`

## T115 — Deterministic receipt adversarial corpus

### Exact candidate surface

Exactly one tracked path:

- `tests/receipt-adversarial-corpus.contract.test.ts`

No other tracked implementation path is authorized by planning. A separate implementation authorization must become effective before mutation.

### Frozen registry authority

T115 is bound to:

- `specs/009-receipt-adversarial-corpus/CASE_REGISTRY.md`;
- registry version `SPEC009-CASE-REGISTRY-V1`;
- exact control anchors and per-case candidate assignments;
- `2` valid controls;
- `44` invalid cases;
- `8` schema-boundary invalid cases;
- `36` semantic-boundary invalid cases;
- `46` total declared executions.

T115 MUST NOT change a control anchor, candidate assignment, case ID, source control, expected layer, or required semantic issue code. It MUST NOT add, remove, rename, merge, split, skip, reclassify, or weaken any registry case. Any registry change requires a separately reviewed planning amendment that becomes canonical before T115 continues.

### Required implementation

1. Construct both deterministic valid Receipt v1 controls conforming exactly to the anchors frozen in `CASE_REGISTRY.md` and prove each passes exact current `validateReceiptJsonSchema` and `validateReceiptSemantics`.
2. Implement the exact frozen adversarial registry with exact stable IDs, source controls, candidate assignments, declared order/layers/codes.
3. Every case deep-copies its frozen source control; no mutation leaks between cases.
4. Apply exactly the assignments/additions/removals listed for that case and change no unlisted field.
5. Semantic cases must pass schema before semantic rejection is evaluated.
6. Schema cases must fail schema; they are not credited for a later semantic failure.
7. Execute every declared case exactly once per focused corpus run.
8. Fail if an invalid case is accepted, a required issue code is missing, a valid control is rejected, a case ID is duplicated, expectation metadata is incomplete, a candidate differs from the frozen construction, an expected case is unexecuted, an undeclared case contributes to qualification counts, or exact registry accounting differs.
9. Do not add dependencies, workflows, product APIs, CLI commands, benchmark result files, network calls, random mutation engines, generated opaque cases, alternative candidates, or second helper/fixture paths.
10. Do not mutate `src/**`, receipt schema, historical results, selector behavior, Spec 007 workflow/evidence, package files, or release surfaces.

### Focused qualification

The exact implementation head must show:

- the one new test file passes under the repository's existing Vitest setup;
- registry version equals `SPEC009-CASE-REGISTRY-V1`;
- both valid controls pass schema + semantic validation;
- declared valid-control count = `2`;
- declared invalid-case count = `44`;
- schema-case count = `8` and every one fails schema validation;
- semantic-case count = `36` and every one passes schema first, then fails semantic validation;
- total declared execution count = `46`;
- every declared ID is unique and executed exactly once;
- every candidate matches its frozen construction;
- every semantic required-code assertion passes;
- accepted invalid case IDs = `[]` for GO;
- skipped/unexecuted case IDs = `[]` for GO;
- no undeclared case contributes to qualification counts;
- no candidate or expectation is changed merely to obtain green;
- exact one-path purity against the exact canonical implementation base.

### Product-gap and planning-truth rule

If any frozen invalid case is accepted by current validators:

`T115 = NO_GO / PRODUCT_GAP_DISCOVERED`

Preserve the failing case and exact observed output. Do not repair `src/**`, schema, candidate construction, or registry expectation in T115. Create a separately reviewed recovery planning unit before any product mutation.

If an exact frozen candidate cannot reach its declared boundary, or a frozen expected layer/required semantic code is shown by exact current source/evidence to be factually wrong, T115 also stops. That observation requires a separately reviewed Spec 009 planning amendment; implementation may not substitute or reclassify the case.

### Merge qualification

Before T115 merge require:

1. exact one-path diff;
2. exact-registry focused test proof;
3. exact-head Self Verification where applicable;
4. exact-head Project CI success across all required OS/Node lanes on the original qualifying attempt;
5. fresh independent substantive exact-head correctness/evidence/governance review;
6. every material finding reconciled on the final head;
7. zero unresolved material review threads;
8. live ruleset / observable branch-protection verification;
9. unchanged expected canonical `main` and exact PR head immediately before merge;
10. guarded normal merge using exact expected head SHA;
11. post-merge ordered-parent/tree/signature/PR/main/path proof;
12. durable task closeout before T116.

If all gates pass:

`T115 = CLOSED_CANONICAL / QUALIFIED`

## T116 — Spec 009 reconciliation and next-frontier decision

Ledger/governance only by default.

Record:

- exact T115 canonical base/head/merge/tree;
- exact changed path;
- registry version;
- exact focused test evidence;
- exact Project CI and Self Verification evidence;
- exact independent review identity/result;
- rules/protection truth;
- canonical merge proof;
- final declared/executed count = `46` for GO;
- valid-control count = `2` for GO;
- schema-rejection count = `8` for GO;
- semantic-rejection count = `36` for GO;
- accepted invalid case IDs, if any;
- unexecuted/skipped case IDs, if any;
- undeclared qualification case IDs, if any;
- candidate-construction deviations, if any;
- explicit statement that no product/schema/dependency/workflow/historical-result mutation occurred.

If T115 qualified with exact complete accounting, exact candidate construction, and no accepted invalid case:

`T116 = CLOSED_CANONICAL`

`SPEC_009 = CLOSED_CANONICAL / GO`

If T115 found an accepted invalid case or planning-truth mismatch:

`SPEC_009 = NO_GO / RETURN_TO_PLANNING`

T116 MUST NOT mark the discovered product/planning gap repaired.

After T116, re-read live canonical governance and determine the next genuinely authorized frontier. Do not promote selector shadow, M2, or any other roadmap item automatically.

## Hard prohibitions

Across T115–T116:

- no `src/**` mutation;
- no schema mutation;
- no Project CI/Self Verification workflow mutation;
- no package/dependency mutation;
- no historical benchmark-result mutation;
- no Spec 007/T113 execution or evidence mutation;
- no product/selector/CLI behavior mutation;
- no generalized fuzzing/property framework;
- no benchmark-result publication;
- no alternate candidate construction;
- no second T115 tracked implementation path;
- no release/tag/npm publication;
- no force-push/rebase/destructive history rewrite;
- no fabricated test/CI/review/qualification/closure/completion.

## Authorization gate

T115 cannot begin until this planning package, including the exact candidate-construction registry, is independently qualified, guarded-merged, post-merge verified, Issue #252 closes canonical, and a separate durable Spec 009 implementation authorization explicitly binds the exact planning merge, registry version, and exact T115/T116 authority.
