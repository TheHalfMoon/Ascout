# Specification 009 — Tasks

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`  
**Canonical order:** `T115 -> T116`

## T115 — Deterministic receipt adversarial corpus

### Default authorized candidate surface

Exactly one path:

- `tests/receipt-adversarial-corpus.contract.test.ts`

No other tracked path is authorized by planning. A separate implementation authorization must become effective before mutation.

### Required implementation

1. Construct one deterministic known-good Receipt v1 fixture that passes exact current `validateReceiptJsonSchema` and `validateReceiptSemantics`.
2. Define one explicit stable adversarial case registry with unique case IDs.
3. Every case declares `schema` or `semantic` as its expected rejection layer.
4. Every semantic case declares at least one required current semantic issue code.
5. Every case mutates a fresh control; no mutation leaks between cases.
6. Semantic cases must pass schema before semantic rejection is evaluated.
7. Schema cases must fail schema; they are not credited for a later semantic failure.
8. Include valid controls that must pass both validators.
9. Cover the final authorized domains from `spec.md` and `plan.md` without combinatorial duplication.
10. Fail if an invalid case is accepted, a required issue code is missing, a valid control is rejected, a case ID is duplicated, expectation metadata is incomplete, or any declared case is unexecuted.
11. Do not add dependencies, workflows, product APIs, CLI commands, benchmark result files, network calls, random mutation engines, or generated opaque cases.
12. Do not mutate `src/**`, receipt schema, historical results, selector behavior, Spec 007 workflow/evidence, package files, release surfaces, or any second test/helper path.

### Focused qualification

The exact implementation head must show:

- the new test file passes under the repository's existing Vitest setup;
- valid controls pass schema + semantic validation;
- all declared cases execute;
- all invalid cases are rejected at declared layer;
- semantic required-code assertions pass;
- no mutation expectation is changed merely to obtain green;
- one-path purity against the exact canonical base.

### Product-gap rule

If any authorized invalid case is accepted by current validators:

`T115 = NO_GO / PRODUCT_GAP_DISCOVERED`

Preserve the failing case and exact observed output. Do not repair `src/**` or schema in T115. Create a separately reviewed recovery planning unit before any product mutation.

### Merge qualification

Before T115 merge require:

1. exact one-path diff;
2. focused test proof;
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
- exact focused test evidence;
- exact Project CI and Self Verification evidence;
- exact independent review identity/result;
- rules/protection truth;
- canonical merge proof;
- final corpus case count and executed count;
- valid-control count;
- schema-rejection count;
- semantic-rejection count;
- accepted invalid case IDs, if any;
- unexecuted/skipped case IDs, if any;
- explicit statement that no product/schema/dependency/workflow/historical-result mutation occurred.

If T115 qualified with no accepted invalid case and complete accounting:

`T116 = CLOSED_CANONICAL`

`SPEC_009 = CLOSED_CANONICAL / GO`

If T115 found an accepted invalid case:

`SPEC_009 = NO_GO / RETURN_TO_PLANNING`

T116 MUST NOT mark the discovered product gap repaired.

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
- no release/tag/npm publication;
- no force-push/rebase/destructive history rewrite;
- no fabricated test/CI/review/qualification/closure/completion.

## Authorization gate

T115 cannot begin until this planning package is independently qualified, guarded-merged, post-merge verified, Issue #252 closes canonical, and a separate durable Spec 009 implementation authorization explicitly binds the exact planning merge and exact T115/T116 authority.
