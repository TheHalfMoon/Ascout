# Specification 009 — Implementation Authorization

## Status

`SPEC_009_IMPLEMENTATION_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE`

`T115_IMPLEMENTATION_AUTHORIZED = NO`

This artifact is the repository authorization candidate for Issue #256. It grants no implementation authority until it is independently qualified, guarded-merged, post-merge verified, and Issue #256 is closed `CLOSED_CANONICAL / EFFECTIVE`.

## Canonical predecessor

Specification 009 planning is canonically closed at:

- planning merge: `ef628798c0b266a5a368d86473bf47eeeceb374f`
- planning merge tree: `d7c47b3ebbcb84028957b7a294fcd74a71fc2e63`
- planning PR: #253
- final planning head: `9b70f10c729a7c3afaf7689f0220df6da9e6db1d`
- final planning Project CI: run `34261138465`, `run_attempt=1`, six of six required lanes successful
- final planning Self Verification: run `34261138469`, `run_attempt=1`, successful
- final independent exact-head review: CodeRabbit comment `5589691439`, exact range `9093ee06c45234d1dee0fbe30d3a0d8fd415fe6f..9b70f10c729a7c3afaf7689f0220df6da9e6db1d`, no material planning or governance finding
- unresolved material planning review threads: `0`
- planning ledger: Issue #252, closed `completed`
- planning closeout comment: `5589783087`

The authoritative planning contract is the exact canonically merged content under `specs/009-receipt-adversarial-corpus/**`, including `CASE_REGISTRY.md` version `SPEC009-CASE-REGISTRY-V1`.

## Authority activation boundary

Until this artifact itself becomes canonical and Issue #256 closes effective:

- T115 mutation is forbidden;
- `tests/receipt-adversarial-corpus.contract.test.ts` is not authorized to be created or changed under Spec 009;
- T116 is not eligible;
- no product, schema, validator, workflow, package, dependency, benchmark-result, release, or Spec 007 mutation follows from this candidate.

After this artifact becomes canonical and Issue #256 closes `CLOSED_CANONICAL / EFFECTIVE`, the following bounded authority becomes effective.

## T115 authorized tracked surface

Exactly one tracked repository path is authorized for T115:

- `tests/receipt-adversarial-corpus.contract.test.ts`

No second helper, fixture, generated registry file, snapshot, product file, schema file, workflow file, package file, result artifact, or release file is authorized.

The implementation must remain test-only and must use existing repository validation surfaces.

## Frozen registry and accounting

T115 is bound exactly to:

- registry version: `SPEC009-CASE-REGISTRY-V1`;
- valid controls: `2`;
- invalid cases: `44`;
- schema-invalid cases: `8`;
- semantic-invalid cases: `36`;
- total declared executions: `46`;
- task order: `T115 -> T116`.

The implementation must preserve the canonically merged registry exactly. It may not add, remove, rename, merge, split, skip, reorder for semantic effect, reclassify, weaken, or substitute any frozen control or invalid case.

## Exact frozen controls

T115 must construct both controls exactly as the complete JSON values canonically frozen in `CASE_REGISTRY.md`:

1. `control-valid-line-receipt`;
2. `control-valid-branch-receipt`.

No required or optional control field used by the corpus may be implementation-selected, normalized, substituted, inferred from runtime state, or replaced by an equivalent-looking value.

The branch control is exactly the complete frozen line control plus the five exact branch-group properties frozen in the registry. Every pre-existing line-control field remains unchanged.

Before any invalid case is credited, both frozen controls must pass exact current `validateReceiptJsonSchema` and exact current `validateReceiptSemantics` unchanged.

A rejected or baseline-divergent frozen control is not permission to repair the control or product. It is a fail-closed return-to-planning condition.

## Exact candidate construction

For every frozen invalid case, T115 must:

1. deep-copy exactly the frozen source control named by the registry;
2. apply exactly the listed assignments/additions/removals for that case;
3. change no unlisted field;
4. execute the case exactly once per focused corpus run;
5. preserve stable declared case identity and order;
6. use no alternate baseline, fallback candidate, compensating bookkeeping, normalization-to-pass, random mutation, adaptive mutation, or implementation-selected equivalent.

If the exact candidate cannot reach its frozen declared validator boundary on the canonical implementation base, T115 stops and returns to planning.

## Validator-boundary requirements

For every case declared `schema`:

- exact current `validateReceiptJsonSchema` must reject the exact candidate;
- no later semantic rejection may substitute for schema rejection.

For every case declared `semantic`:

- exact current `validateReceiptJsonSchema` must first accept the exact candidate;
- exact current `validateReceiptSemantics` must then reject it;
- every required semantic issue code frozen for that case must be observed;
- deterministic additional issue codes may be observed but may not substitute for a missing required code.

No validator, schema, or expected result may be changed inside T115 merely to obtain green.

## Required focused accounting

A T115 GO candidate must prove exactly:

```text
registry_version = SPEC009-CASE-REGISTRY-V1
valid_control_count = 2
invalid_case_count = 44
schema_case_count = 8
semantic_case_count = 36
total_declared_execution_count = 46
total_executed_count = 46
accepted_invalid_case_ids = []
skipped_or_unexecuted_case_ids = []
undeclared_qualification_case_ids = []
baseline_control_deviations = []
candidate_construction_deviations = []
```

Additionally:

- both exact frozen controls pass schema + semantic validation unchanged;
- all 8 schema cases fail schema validation;
- all 36 semantic cases pass schema first and fail semantic validation;
- every required semantic issue code is observed;
- every declared invalid case executes exactly once;
- no undeclared case contributes to qualification counts.

Partial execution, percentage thresholds, retries, alternate controls, or substituted candidates do not qualify.

## T115 failure dispositions

If any frozen invalid case is accepted by current validators:

`T115 = NO_GO / PRODUCT_GAP_DISCOVERED`

The exact case and observed validator output must be preserved as durable evidence. T115 must not repair `src/**`, schema, validator semantics, baseline controls, candidate construction, or registry expectation. Any product repair requires a separately reviewed planning and authorization chain.

If either frozen control is rejected, an exact frozen candidate cannot reach its declared boundary, or a frozen candidate/layer/required-code fact is proven wrong:

`T115 = NO_GO / RETURN_TO_PLANNING`

T115 must preserve the observation and must not substitute another baseline, candidate, expected layer, or required code.

## Explicitly unauthorized surfaces

This authorization does not permit T115 changes to:

- `src/**`;
- Receipt v1 JSON Schema;
- receipt validator semantics;
- CLI, selector, command-admission, or product behavior;
- `.github/workflows/**`;
- package or dependency files;
- `benchmarks/results/**`;
- benchmark harnesses or manifests;
- Spec 007/T113/T114 workflow, refs, evidence, or historical results;
- release, tag, or npm publication surfaces;
- generalized fuzzing/property-testing frameworks;
- generated corpus frameworks or reusable mutation engines;
- network, hosted services, donor repositories, models, databases, credentials, or secrets;
- any second T115 tracked helper/fixture path.

No force-push, rebase, destructive history rewrite, rerun-to-green, skip-to-green, expectation weakening, stale-review substitution, or fabricated evidence is authorized.

## Existing capability reuse

T115 must use the current repository-owned testing and validation surfaces, including:

- existing Vitest/TypeScript test infrastructure;
- `validateReceiptJsonSchema` from the canonical receipt JSON boundary;
- `validateReceiptSemantics` from the canonical semantic receipt model;
- current canonically merged Receipt v1 schema and types.

No new dependency, workflow, service, network source, model, database, or generalized mutation framework is authorized.

## T115 qualification gate

A future T115 implementation may become canonical only after all of the following are proven on its exact unchanged final head:

1. repository diff is exactly `tests/receipt-adversarial-corpus.contract.test.ts`;
2. focused execution proves exact frozen-control fidelity and exact `2 / 44 / 8 / 36 / 46` accounting;
3. exact candidate construction and required semantic-code assertions all pass;
4. accepted invalid case IDs, skipped/unexecuted case IDs, undeclared qualification case IDs, baseline-control deviations, and candidate-construction deviations are all empty for GO;
5. exact-head Self Verification succeeds where applicable on the original qualifying attempt;
6. exact-head Project CI succeeds across all six required OS/Node lanes on the original qualifying attempt;
7. fresh independent substantive exact-head review covers registry fidelity, candidate construction, validator boundaries, issue-code correctness, test-only scope, failure separation, security/evidence integrity, governance, and branch purity;
8. every material finding is reconciled on that same final head;
9. unresolved material review threads equal zero;
10. live repository ruleset / observable branch-protection state is recorded;
11. canonical `main` and exact implementation head remain unchanged immediately before merge;
12. merge uses normal merge-commit method with exact expected-head protection;
13. post-merge proof verifies ordered parents, merge tree, GitHub signature, PR merged/closed state, canonical `main`, and exact one-path scope;
14. T115 receives durable canonical closeout before T116 begins.

If all gates pass:

`T115 = CLOSED_CANONICAL / QUALIFIED`

## T116 authority

T116 is ledger/governance reconciliation only by default and becomes dependency-ready only after T115 reaches durable canonical closeout.

T116 may record:

- exact T115 canonical base/head/merge/tree;
- exact changed path;
- registry version and exact accounting;
- focused test evidence;
- Self Verification and Project CI identities/results;
- independent review identity/result;
- rules/protection truth;
- merge proof;
- accepted-invalid, skipped/unexecuted, undeclared-case, baseline-deviation, and candidate-deviation sets;
- explicit statement that no product/schema/dependency/workflow/historical-result mutation occurred.

If T115 qualifies with complete exact accounting and no accepted invalid case:

`T116 = CLOSED_CANONICAL`

`SPEC_009 = CLOSED_CANONICAL / GO`

If T115 returns a product gap or planning-truth mismatch, T116 must not mark that gap repaired or claim Spec 009 GO.

After T116, live governance must be re-read before any successor roadmap unit is promoted.

## Authorization qualification gate

This authorization artifact itself may become effective only after all of the following are proven on its exact unchanged final head:

1. repository diff is exactly `specs/009-receipt-adversarial-corpus/IMPLEMENTATION_AUTHORIZATION.md`;
2. the artifact binds exact planning merge `ef628798c0b266a5a368d86473bf47eeeceb374f` and tree `d7c47b3ebbcb84028957b7a294fcd74a71fc2e63`;
3. it binds `SPEC009-CASE-REGISTRY-V1`, exact controls/candidates, `2 / 44 / 8 / 36 / 46` accounting, one-path T115 authority, T116 ledger-only scope, and fail-closed dispositions;
4. exact-head Self Verification succeeds on the original qualifying attempt;
5. exact-head Project CI succeeds across all six required OS/Node lanes on the original qualifying attempt;
6. fresh independent substantive exact-head review finds no unresolved material authority, security, evidence-integrity, or governance defect;
7. unresolved material review threads equal zero;
8. live ruleset and observable branch-protection truth are reverified;
9. expected canonical `main` and authorization PR head remain unchanged immediately before merge;
10. guarded normal merge uses the exact expected head SHA;
11. post-merge proof verifies ordered parents, merge tree, GitHub signature, PR merged/closed state, canonical `main`, and exact authorization-file bytes;
12. Issue #256 receives durable closeout as:

`SPEC_009_IMPLEMENTATION_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`

Only after that closeout does this artifact authorize T115.