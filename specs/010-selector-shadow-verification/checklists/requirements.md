# Specification 010 Requirements Quality Checklist

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Scope and authority

- [x] Founder planning authority is recorded in Issue #261.
- [x] Planning authority is explicitly separated from implementation authority.
- [x] Canonical planning base and tree are recorded.
- [x] Spec 010 does not reopen Spec 007.
- [x] Historical T078/T091 evidence is treated as immutable input only.
- [x] Roadmap ordering is used as planning input, not direct implementation authority.

## Problem and evidence

- [x] One historical Ascout selector miss is documented from T078.
- [x] T091 repair evidence and remaining unavailable outcomes are documented.
- [x] Current missing continuous source-bound comparison is identified.
- [x] No unsupported universal selector-defect claim is made.

## Trust boundary

- [x] Same-repository PR execution only.
- [x] Fork/external PR execution excluded.
- [x] No `pull_request_target`, secrets, or elevated permission.
- [x] Existing Spec 006 B/M/H/HT identity is reused.
- [x] Receipt/envelope digest binding is rechecked before comparison.
- [x] Current subject cleanliness is proven before and after reference execution.

## Comparison semantics

- [x] Exactly one comparable Ascout test task required.
- [x] Admission-refused/changed command surface never causes reference execution.
- [x] BLOCKED/ERROR/NOT_RUN/NOT_APPLICABLE are unavailable, not pass/miss.
- [x] Current root test contract is frozen to exact `vitest run`.
- [x] Existing local Vitest only; no implicit install.
- [x] Structured JSON is required for full-suite failure identity.
- [x] Failure identity is exact `(repository-relative path, test id)`.
- [x] No fuzzy/message/suffix matching.
- [x] Every unmatched full-suite identity is published as a selector miss.
- [x] Unavailable is distinct from no-miss.
- [x] No recall threshold or universal recall claim.

## Execution budget

- [x] T117 full-suite reference timeout is frozen prospectively at exactly 10 minutes.
- [x] T118 existing `self-verify` job timeout is frozen prospectively at exactly 60 minutes.
- [x] The 60-minute budget explicitly reserves 20 minutes for checkout/setup/install/build/artifact publication, 20 minutes for existing Spec 006 self-verification, 10 minutes for the full-suite reference, and 10 minutes for contingency/orderly cleanup.
- [x] The 60-minute job timeout covers setup, self-verification, reference execution, cleanup, and artifact upload rather than only the reference process.
- [x] Neither timeout may be increased after live evidence; insufficient budget requires `NO_GO / RETURN_TO_PLANNING`.
- [x] T118 live qualification requires artifact publication before successful completion within the frozen 60-minute budget.

## Artifact and privacy

- [x] One separate `SELECTOR_SHADOW_NON_GATING` JSON artifact.
- [x] Receipt v1 remains unchanged.
- [x] No raw stdout/stderr persistence.
- [x] No actor/user/host/HOME/environment/secrets/absolute paths/repository URL.
- [x] Deterministic ordering/deduplication required.
- [x] Existing artifact retention and upload action reused.

## YAGNI and supply chain

- [x] No `src/**` mutation planned.
- [x] No selector/widening mutation planned.
- [x] No new public CLI/config/plugin/API.
- [x] No new dependency/action/workflow/service/database/dashboard.
- [x] No donor execution or historical replay.
- [x] No new license/use decision required beyond implementation-time revalidation of existing components.

## Tasking and qualification

- [x] Exact order is `T117 -> T118 -> T119`.
- [x] T117 candidate paths are exactly two files.
- [x] T118 candidate path is exactly existing `self-verify.yml`.
- [x] T119 is ledger-only by default.
- [x] Exact-head focused proof is defined.
- [x] Six-lane Project CI and Self Verification requirements are defined.
- [x] Fresh independent exact-head review is required.
- [x] Zero unresolved material threads is required.
- [x] Guarded expected-head merge and post-merge identity proof are required.
- [x] First live T118 observation is mandatory before T118 closeout.
- [x] Stop/return-to-planning conditions include timeout-budget insufficiency.

`REQUIREMENTS_QUALITY = PASS`

`IMPLEMENTATION_AUTHORITY = NO`
