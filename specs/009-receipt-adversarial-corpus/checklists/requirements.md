# Specification 009 — Requirements Quality Checklist

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Scope and authority

- [x] CHK001 Planning is explicitly non-authoritative for implementation.
- [x] CHK002 Canonical planning base and Issue #252 are identified.
- [x] CHK003 Spec 009 is explicitly independent of Spec 007 T113/T114 continuation.
- [x] CHK004 No product, schema, workflow, dependency, selector, historical-result, release, or execution-ref mutation is authorized by planning.
- [x] CHK005 Separate post-planning implementation authorization is mandatory.

## Product and trust contract

- [x] CHK006 The corpus tests current Receipt v1 contract rather than inventing a new receipt version.
- [x] CHK007 Existing `validateReceiptJsonSchema` remains the schema authority.
- [x] CHK008 Existing `validateReceiptSemantics` remains the semantic authority.
- [x] CHK009 Semantic cases must pass schema before semantic rejection.
- [x] CHK010 Required semantic issue codes are explicit per semantic case.
- [x] CHK011 Accepted invalid cases are treated as product gaps, not expectation-rewrite opportunities.
- [x] CHK012 Valid controls prevent an always-rejecting harness from passing.
- [x] CHK013 Complete case accounting prevents green by omission.

## Corpus design

- [x] CHK014 Stable unique case IDs are required.
- [x] CHK015 One-fault mutation is preferred; compound cases require rationale.
- [x] CHK016 No random/unbounded mutation generator is permitted.
- [x] CHK017 No property/fuzz dependency is required.
- [x] CHK018 Representative cases cover shared validators without combinatorial duplication.
- [x] CHK019 Evidence/reference integrity is covered.
- [x] CHK020 Artifact/task binding is covered.
- [x] CHK021 Source/comparison binding is covered.
- [x] CHK022 Path and changed-range integrity is covered.
- [x] CHK023 Command-surface authority/admission is covered.
- [x] CHK024 Timeline and observation integrity is covered.
- [x] CHK025 Selection/exercise consistency is covered.
- [x] CHK026 Summary/completeness/exit consistency is covered.
- [x] CHK027 Privacy examples are limited to deterministic current contract rules.
- [x] CHK028 The plan avoids universal secret-detection claims.

## YAGNI and architecture

- [x] CHK029 Preferred implementation is one new test path.
- [x] CHK030 No product-facing adversarial API is introduced.
- [x] CHK031 No new CLI command is introduced.
- [x] CHK032 No new workflow is introduced.
- [x] CHK033 No benchmark-result publication is required.
- [x] CHK034 No generalized mutation DSL/framework is introduced.
- [x] CHK035 No test helper is authorized by default.
- [x] CHK036 Existing Project CI is reused.

## Failure and qualification

- [x] CHK037 T115 has an explicit `NO_GO / PRODUCT_GAP_DISCOVERED` disposition.
- [x] CHK038 Product repair is prohibited inside T115.
- [x] CHK039 Exact one-path implementation purity is required.
- [x] CHK040 Focused test evidence is required.
- [x] CHK041 Exact-head Project CI all-lane success is required.
- [x] CHK042 Fresh independent substantive exact-head review is required.
- [x] CHK043 Every material finding must be reconciled after the last mutation.
- [x] CHK044 Zero unresolved material review threads are required.
- [x] CHK045 Live rules/protection truth is required before merge.
- [x] CHK046 Guarded expected-head merge is required.
- [x] CHK047 Ordered-parent/tree/signature/PR/main post-merge proof is required.
- [x] CHK048 T116 cannot close GO after an accepted invalid case.

## Cross-spec safety

- [x] CHK049 T078/T091/T095 historical result mutation is prohibited.
- [x] CHK050 T113 r1/r2 rerun/reuse/reclassification is prohibited.
- [x] CHK051 Spec 007 replay workflow mutation is prohibited.
- [x] CHK052 Spec 009 does not claim selector correctness or historical corpus success.

## Planning completeness

- [x] CHK053 Gap evidence exists.
- [x] CHK054 Feature specification defines what/why and non-goals.
- [x] CHK055 Material clarifications are resolved.
- [x] CHK056 First Ponytail/YAGNI reduction is complete.
- [x] CHK057 Technical plan defines implementation boundary and failure behavior.
- [x] CHK058 Second Ponytail/YAGNI review removes unnecessary publication/helper surfaces.
- [x] CHK059 Tasks are dependency-ordered.
- [x] CHK060 Cross-artifact analysis is required before final planning qualification.
- [x] CHK061 Independent final plan audit remains separate from founder/self review.
- [x] CHK062 Fresh exact-head external review remains required before planning merge.

`CHECKLIST_RESULT = PASS / READY_FOR_CROSS_ARTIFACT_ANALYSIS`
