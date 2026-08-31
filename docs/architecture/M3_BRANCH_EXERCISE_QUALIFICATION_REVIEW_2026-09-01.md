# Branch Exercise Qualification Architecture Review — 2026-09-01

**Status:** `QUALIFIED_FOR_CANONICAL_PLANNING`  
**Repository baseline:** `92f57989085999aeb4f617f7ec8389afa7caece2`  
**Purpose:** determine whether branch-level execution evidence is worth future product integration without weakening the current receipt contract.

## Current live truth

Ascout M1/M2 currently judges changed-code exercise from normalized LCOV `DA:` line records. `src/coverage/lcov.ts` exposes only `LcovLinePoint` and ignores function/branch records. The canonical LCOV fixture `line-only-with-function-and-branch-noise` explicitly includes `BRDA:` while expecting only line points.

Therefore current behavior has a known evidence-depth limit: a changed line may be observed as executed while one or more instrumented branches on that line remain untaken. The current receipt does not claim branch completeness, so this is not a current correctness defect. It is a measured candidate gap between line execution and stronger exercise evidence.

## Decision

Do **not** modify product receipt semantics yet.

Canonicalize a benchmark-only qualification slice first. The slice should answer one question:

> Can deterministic LCOV branch evidence reveal material changed-code exercise gaps that line-only evidence cannot, with fail-closed parsing and acceptable ambiguity?

If the answer is not demonstrated, close the slice `NO_GO` and leave product semantics unchanged. If demonstrated, a separate future Spec Kit package is required before any receipt/schema/completeness integration.

## Narrow qualification scope

The qualification may:

- parse LCOV `BRDA:` records in benchmark/test-only code;
- normalize repository-relative source identity using the same containment principles as line coverage;
- distinguish `taken > 0`, `taken = 0`, and unknown `taken = -`;
- use deterministic synthetic fixtures designed to isolate branch-only behavior;
- compare line-only and branch-aware observations;
- persist a new qualification result under `benchmarks/results/`;
- run across Linux, macOS, and Windows with Node 22/24.

The qualification must not:

- change `src/` product behavior;
- change receipt v1, JSON schema, terminal output, agent output, completeness, or exit semantics;
- add runtime dependencies;
- run a browser, security scanner, mutation engine, LLM, cloud service, or untrusted repository;
- overwrite historical benchmark results;
- reinterpret unavailable/unknown branch data as covered or missed;
- claim branch coverage support in the product.

## Evidence model for qualification

A normalized branch observation is identified by:

`(repository_relative_path, line, block_id, branch_id)`

with `taken` represented as:

- non-negative safe integer when observed;
- `null` when LCOV reports `-` / not measurable.

Qualification states:

- `BRANCH_EXERCISED` when `taken > 0`;
- `BRANCH_NOT_EXERCISED` when `taken = 0`;
- `BRANCH_UNRESOLVED` when `taken = null` or mapping/record integrity prevents a defensible observation.

Unknown/unresolved branch evidence must never be collapsed into exercised evidence.

## Required qualification cases

At minimum:

1. **branch-only gap** — changed line is line-exercised while one branch has `taken=0`;
2. **fully exercised** — changed line and all instrumented branches are exercised;
3. **unknown branch** — line is exercised but branch `taken=-`, which remains unresolved;
4. **malformed branch record** — fail closed instead of dropping or inventing branch evidence;
5. **repository path containment** — outside-repository branch source cannot become repository-bound evidence;
6. **deterministic aggregation/order** — repeated valid branch observations aggregate safely and serialize deterministically.

## Promotion gate

A future product-integration spec is eligible only if the completed qualification proves all of the following:

- at least one deterministic branch-only gap is detected where current line-only evidence reports the changed line exercised;
- fully exercised fixtures produce zero false branch gaps;
- unknown branch data remains unresolved rather than pass/fail fabrication;
- malformed/path-unsafe evidence fails closed;
- result serialization is deterministic;
- six-lane Project CI is green on the exact closeout head;
- no product/receipt/package/dependency surface changed during qualification.

## Trust, security, and licensing

This slice parses an existing coverage interchange format from project-native test output. It introduces no donor code, no new executable dependency, no network authority, no secret surface, and no untrusted execution. Normal repository containment and evidence-honesty rules remain authoritative.

## Architecture conclusion

`GAP = REAL_BUT_NOT_YET_PRODUCT_AUTHORITY`

`NEXT_STEP = SPEC_003_BRANCH_EXERCISE_QUALIFICATION`

`PRODUCT_INTEGRATION = NOT_AUTHORIZED_BY_THIS_REVIEW`
