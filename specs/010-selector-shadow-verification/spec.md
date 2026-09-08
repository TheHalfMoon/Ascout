# Specification 010 — Selector Shadow Verification

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #261
**Canonical base:** `ec78d0225f66390ad45804fb122b6d51c4f6980f`
**Milestone:** M1.2-C — Selector shadow mode

## Problem

Ascout has a canonical same-repository self-verification receipt and a separate full Project CI suite, but it does not continuously produce one source-bound, machine-readable observation comparing failed tests from a full-suite reference against the exact failed-test identities present in Ascout's affected-selection receipt.

Historical benchmark evidence proved one real Ascout selector miss in T078. T091 repaired that known defect in the six-case founding corpus and published zero current misses, but three of six Ascout comparator outcomes remained unavailable. The current repository therefore has evidence that selector misses can occur and insufficient evidence to claim they cannot recur.

Spec 010 adds only a **non-gating, Ascout-on-Ascout selector-shadow observation** for eligible same-repository pull requests. It does not change selector behavior, Receipt v1, or merge policy.

## Trust scope

Spec 010 inherits the Spec 006 execution boundary:

- same-repository Ascout pull-request branches only;
- no fork/external PR execution;
- no `pull_request_target`;
- no secrets or elevated permissions;
- no changed-command-surface auto-admission;
- no untrusted-repository sandbox claim.

The shadow comparison is observational. A selector miss MUST remain visible but MUST NOT make the shadow workflow a verdict or merge gate under this specification.

## Identity model

For one eligible observation:

- `B` — exact GitHub event base-tip SHA from the Spec 006 envelope;
- `H` — exact pull-request head SHA / target source tree owner;
- `M` — exact unique merge base used by Spec 006 reconstruction;
- `HT` — exact target tree SHA `H^{tree}`;
- `R` — exact retained self-verification receipt bytes;
- `RD` — SHA-256 of `R`, already bound by the Spec 006 envelope;
- `A` — exactly one comparable executed Ascout `test` task inside `R`;
- `F` — one structured full-suite Vitest observation executed against the same reconstructed `HEAD == M`, `git write-tree == HT` subject state.

Spec 010 MUST verify the existing envelope/receipt digest binding before using `R` as comparison input. It MUST NOT silently trust a replaced receipt file.

## Acceptance stories

### 1. Observe selector misses without changing selector behavior

For an eligible same-repository PR, compare failed test identities from full-suite observation `F` against the failed test identities attached to Ascout test task `A`.

A full-suite failure identity is a tuple:

```text
(repository-relative test path, runner fullName)
```

An observed selector miss exists only when that exact tuple is present as a failed test in valid structured full-suite evidence and absent from Ascout test findings for `A`.

No miss is inferred from test count differences, duration differences, absent output, plain nonzero process exit, or location-only similarity.

### 2. Fail closed on incomparable observations

The shadow comparison MUST be marked unavailable and MUST NOT publish selector misses when any required comparison fact is unavailable, including:

- missing/invalid self-verification envelope;
- receipt digest mismatch;
- current Git subject identity mismatch;
- not exactly one comparable test task;
- test task `BLOCKED`, `ERROR`, `NOT_RUN`, or `NOT_APPLICABLE`;
- admission-refused test task;
- unsupported/changed full-suite command contract;
- full-suite timeout/spawn/integrity failure;
- missing/malformed structured runner JSON;
- path/test-identity ambiguity;
- source drift after the reference run.

Unavailable shadow evidence is not a selector pass.

### 3. Preserve no-green-by-omission

Spec 010 MUST NOT convert unavailable comparison into `NO_MISS_OBSERVED`. It must retain a non-empty machine reason and human-readable explanation.

### 4. Preserve source binding

Before full-suite launch, prove:

```text
HEAD == M
git write-tree == HT
no unstaged tracked changes
no nonignored untracked files
```

After the reference run, prove the same subject identity and cleanliness again. Any drift makes the shadow observation unavailable and prevents selector-miss publication from that run.

### 5. Preserve command authority

Reference execution is allowed only when the exact self-verification test task is comparable and its `execution_admission == normal` with `command_surface_changed == false`.

The bounded Spec 010 Ascout-only reference command is the exact current local Vitest full-suite shape equivalent to the canonical root test script `vitest run`, augmented only with Vitest's native JSON reporter/output-file arguments required for structured observation.

If the canonical root test script is no longer exactly `vitest run`, or the expected local Vitest runtime is unavailable, Spec 010 MUST classify the shadow observation unavailable rather than guessing a new command.

No persistent or automatic admission is authorized.

### 6. Preserve structured failure identity

Only runner JSON with a `testResults[]` collection and failed assertions containing a non-empty `fullName` under a repository-contained test path may establish full-suite failure identity.

Ascout-side captured identities come only from receipt findings linked to `A` with both:

- repository-relative `path`;
- non-empty `rule_or_test_id`.

Unknown or malformed identities are not repaired into valid-looking evidence.

### 7. Preserve non-gating semantics

The observation artifact classification is:

`SELECTOR_SHADOW_NON_GATING`

A valid selector miss is an important measurement, but under Spec 010 it does not change:

- Receipt v1;
- Ascout exit code;
- Project CI result;
- Self Verification receipt truth;
- branch protection;
- merge eligibility;
- selector/widening policy.

### 8. Record useful bounded measurement

For each valid comparable observation record:

- B/M/H/HT identity;
- receipt SHA-256;
- Ascout test task ID/status/duration;
- selection mode;
- selected/deselected/total counts when known;
- widening boolean and triggers;
- full-suite Vitest version;
- full-suite duration;
- failed full-suite identities;
- failed Ascout identities;
- exact unmatched selector-miss identities;
- comparison disposition.

Do not invent a recall threshold. Every observed miss is published.

## Functional Requirements

### FR-010-001 — Same-repository scope

Run only inside the existing eligible same-repository Spec 006 workflow boundary. Fork/external PRs remain skipped before PR code execution.

### FR-010-002 — Receipt/envelope integrity

Read exact retained Spec 006 receipt/envelope files, require envelope schema/classification expected by current canonical self-verification, recompute receipt SHA-256, and require equality with the envelope binding before parsing comparison facts.

### FR-010-003 — Current subject proof

Require current repository `HEAD == envelope.subject_merge_base_sha` and `git write-tree == envelope.subject_target_tree_sha` before reference execution, with no unstaged tracked or nonignored untracked contamination.

### FR-010-004 — Comparable Ascout test task

Require exactly one receipt task with `task_type == "test"` that is an executed comparison candidate. `execution_admission` MUST be `normal`; `command_surface_changed` MUST be false; status MUST be `PASS`, `FAIL`, or `FLAKY`.

Any other state is `UNAVAILABLE`, not a miss/pass observation.

### FR-010-005 — Frozen Ascout-only full-suite command contract

Require root `package.json` `scripts.test` to equal exactly `vitest run`. Resolve the already-installed local Vitest runtime and execute the full suite with JSON reporter/output-file arguments using no shell and no implicit install.

If this exact contract is not present, classify unavailable. Do not infer another script/runner command.

### FR-010-006 — Bounded end-to-end execution

T118 MUST set the existing `self-verify` job timeout to exactly `60` minutes before selector-shadow execution becomes canonical.

The 60-minute budget is allocated prospectively as follows:

```text
checkout + setup + exact install/build + artifact publication reserve = 20 minutes
existing Spec 006 self-verification allowance                         = 20 minutes
Spec 010 full-suite reference timeout                                = 10 minutes
contingency / orderly cleanup reserve                                 = 10 minutes
TOTAL                                                                 = 60 minutes
```

T117 MUST enforce the full-suite reference timeout at exactly 10 minutes. T118 MUST NOT increase either the 60-minute job timeout or the 10-minute reference timeout after observing a live result. Any need for more time requires return to planning and a separately reviewed amendment.

Reference execution MUST use reliable process completion semantics. Timeout, spawn error, missing report, malformed report, or runner integrity failure is unavailable shadow evidence.

Full-suite assertion failures are valid observations and MUST NOT be converted into harness failure merely because the runner exits nonzero.

### FR-010-007 — Structured full-suite failure extraction

Extract only failed assertions with non-empty `fullName` from valid Vitest JSON and bind them to normalized repository-relative test paths proven to remain inside the subject repository.

Duplicate identities are deduplicated deterministically.

### FR-010-008 — Ascout failure extraction

Extract only receipt findings linked to the exact comparable test task with non-empty `path` and non-empty `rule_or_test_id`. Preserve repository-relative path spelling already accepted by Receipt v1.

### FR-010-009 — Exact selector-miss rule

For comparable observations:

```text
selector_misses = full_suite_failed_identities - ascout_failed_identities
```

using exact `(path, fullName/rule_or_test_id)` tuple equality.

No fuzzy matching, message matching, path suffix matching, or inferred equivalence is allowed.

### FR-010-010 — No threshold

No pre-data or post-data recall threshold is introduced. Every exact observed selector miss is published. Absence of a miss in one observation is `NO_MISS_OBSERVED`, not universal recall proof.

### FR-010-011 — Source stability after reference

After reference execution, re-prove `HEAD == M`, `git write-tree == HT`, no unstaged tracked changes, and no nonignored untracked material. Failure makes the observation unavailable.

### FR-010-012 — Separate bounded artifact

Write exactly one separate `selector-shadow-observation.json` outside repository source identity. It MUST NOT modify the Spec 006 receipt or envelope and MUST NOT persist full stdout/stderr.

### FR-010-013 — Privacy

The observation MUST NOT contain raw repository URL, absolute repository path, actor/user identity, hostname, HOME, environment dump, credentials, tokens, or full runner stdout/stderr. Repository-relative test paths and test IDs are permitted evidence.

### FR-010-014 — No product-core mutation

Spec 010 MUST NOT change `src/**`, Receipt v1 schema/model/validator, CLI flags, selector implementation, widening policy, project configuration, runtime dependencies, package metadata, historical benchmark results, Spec 007 evidence, or release state.

### FR-010-015 — Existing workflow reuse

Use the existing `.github/workflows/self-verify.yml` same-repository lane rather than creating a new workflow or new permission surface. T118 may change `timeout-minutes` only from the current `30` to the prospectively frozen `60` required by FR-010-006. Existing exact-SHA `actions/upload-artifact` remains unchanged except for adding the new bounded artifact path after implementation-time revalidation.

### FR-010-016 — Qualification

Each implementation task requires exact-head focused proof, six-lane Project CI, applicable Self Verification evidence, fresh independent substantive review, zero unresolved material threads, branch-purity proof, live rules/protection revalidation, guarded expected-head merge, and post-merge ordered-parent/tree/signature/PR/main proof.

## Planned task order

`T117 -> T118 -> T119`

- T117: selector-shadow comparator/harness + focused contracts only.
- T118: existing self-verification workflow integration and exact final-head live observation only.
- T119: ledger/governance reconciliation and Spec 010 closeout by default.

Each predecessor must close canonically before the successor begins.

## Non-goals

No selector repair, selector policy, auto-widening change, product-core feature, generic adapter framework, historical benchmark replay, donor execution, new dependency, new action, new workflow, database, trend service, telemetry backend, dashboard, public CLI, receipt version, merge gate, branch protection, recall threshold, mutation/property/fuzz/counterfactual work, release, tag, npm publication, or GitHub Release.

## Success Criteria

Spec 010 may close `GO` only when exact evidence proves:

1. T117 comparator contracts enforce receipt/envelope digest binding;
2. exact reconstructed subject identity is checked before and after reference execution;
3. changed/admission-refused/incomparable test tasks never trigger reference execution or selector-pass claims;
4. the exact current Ascout root `vitest run` contract is frozen and no implicit install occurs;
5. T117 enforces the prospectively frozen 10-minute full-suite timeout and T118 sets exactly a 60-minute job timeout with the documented end-to-end reserve;
6. structured full-suite Vitest JSON is required for failure identity;
7. exact `(path, test_id)` comparison publishes every unmatched full-suite failure;
8. unavailable observations remain unavailable with reasons;
9. no threshold or causal claim is added;
10. observation artifact is separate, bounded, privacy-safe, and non-gating;
11. no `src/**`, receipt/schema/selector/package/dependency/historical-result mutation occurs;
12. T118 produces one valid live same-repository exact-head observation artifact before the frozen budget expires;
13. Project CI remains six-lane qualified;
14. independent exact-head review has no unresolved material findings;
15. guarded merges and post-merge proof close each implementation task canonically.

## Governance

Planning artifacts do not authorize implementation. T117 requires this planning package to merge canonically and a separate durable implementation-authorization artifact/ledger bound to the exact planning merge.