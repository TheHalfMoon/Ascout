# Spec 015 Clarifications

**Status:** `PLANNING_ONLY`
**Base:** `55688b5bca22f2e9979b71739bb6802c652bda9d`

1. Requirement disagreement: code does not win silently. Requirement sources carry provenance. PRD, tests, and code conflicts become `RequirementConflict` nodes with explicit resolution policy and human-review gate where applicable. Unresolved conflicts block release PASS for affected obligations.
2. Oracle gating: only oracles with proven independence and calibration may gate release. All other oracles remain advisory with explicit labels. Circular oracles fail closed.
3. Discrimination minimum: a generated test must show stability across bounded reruns and discriminating power via mutant, revert, property, differential, or withheld evidence where applicable. Without such evidence it remains a proposal, never admitted proof.
4. Write authority: generated tests live in an isolated candidate worktree during evaluation. Promotion to a developer branch requires explicit human admission. No auto-merge or auto-commit authority in the first slice.
5. Proven root cause: a root cause is proven only with reproduction, minimization, localization consensus where applicable, and comparative verification that the proposed cause explains the failure and its removal resolves it. All else remains hypothesis.
6. Reruns: bounded reruns distinguish reproduced, contradictory/flaky, and unknown. Reruns never convert a failure to PASS by repetition. Quarantine is visible.
7. Flakiness vs environment: flakiness is a test property shown by contradictory observations under stable environment identity. Environment instability is shown by environment binding changes. The two are recorded separately.
8. Production data: production-derived data and credentials are redacted and access-controlled. Tests use synthetic or scrubbed data with provenance disclosure. No secrets in artifacts.
9. Budgets: scheduler budgets are explicit. Exhausted budgets produce `NOT_RUN(budget_*)` with reasons, never silent omission.
10. Statistics: nondeterministic assertions require sample sizes, confidence bounds, and seed disclosure. Single observations never become statistical claims.
11. Contamination: public, eval, hidden holdout, post-cutoff, synthetic, and adversarial partitions are separated. Contaminated evidence is disclosed and excluded from gating claims.
12. Languages: first slice canonical is JavaScript/TypeScript with current Vitest/Jest paths. Others deferred pending benchmark justification.
13. Donor need: first slice requires no donor code. Any later donor needs exact-version and component provenance review before import.
14. Spec 014 relationship: runtime observations feed the Test Obligation Graph as `RuntimeObservation` evidence. They never become retroactive pre-release PASS. Spec 015 owns obligation, risk, defect, regression, and release-decision semantics. No second verdict graph.
15. Competitor comparison: only executable comparisons with permitted automation are reported. Where terms bar automation, report `COMPARISON_UNAVAILABLE`, never marketing synthesis.

```text
CLARIFICATIONS = FROZEN_AS_PLANNING_INPUT
```
