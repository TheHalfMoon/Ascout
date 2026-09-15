# Architecture Contract — Recovery and Healing Semantics

**Status:** `PLANNING_ONLY`

## Principle

Recovery may improve execution reliability, but it must never erase evidence or silently change the meaning of the test.

## Recovery classes

### resolver_recovery

Target selection changes while intended behavior remains the same.

Examples:

- accessible name changed but role/business action is equivalent;
- test id changed but user-facing semantic target is unchanged;
- element moved/reordered without behavioral change.

Automatic recovery may be allowed when equivalence evidence satisfies policy.

### execution_recovery

The intended target/action is unchanged, but transient execution state blocks progress.

Examples:

- temporary overlay/cookie banner;
- bounded slow navigation;
- transient network delay;
- animation/interception condition.

Corrective action must be explicit, bounded and visible.

### semantic_recovery

The recovery changes the intended business flow, required step, action meaning, or expected outcome.

Examples:

- required checkout review step disappears;
- recovery clicks a different business action;
- alternate flow bypasses an obligation;
- assertion is weakened or replaced;
- a different endpoint/action is accepted because final UI looks similar.

Semantic recovery MUST NOT produce ordinary clean PASS without revalidation of intent/obligation.

## Append-only attempt history

Every attempt is retained in logical evidence order:

```text
original attempt
-> failure observation
-> recovery proposal
-> recovery action(s)
-> retried original action/assertion
-> result
```

Do not rewrite the record into a single successful attempt.

## Verdict facts

Ascout should retain structured facts such as:

```text
recovery_used
recovery_classes[]
recovery_count
semantic_revalidation_required
semantic_revalidation_status
original_failure_preserved
final_execution_status
```

Rendering may expose labels such as `PASS_WITH_RECOVERY`, but the underlying constitutional task status must remain consistent with Ascout's canonical vocabulary and completeness rules.

## Equivalence proof

Resolver recovery may be treated as semantically equivalent only with evidence appropriate to the target, such as:

- stable accessible role + business label lineage;
- explicit test-id migration mapping supplied by trusted project configuration;
- deterministic DOM/accessibility relationship;
- separately admitted human/maintainer confirmation.

Model confidence alone does not prove equivalence.

## Recovery budget

Every intent/test has bounded policy:

```text
max_retry_attempts
max_recovery_actions
allowed_recovery_classes
per_action_timeout
overall_timeout
```

Budget exhaustion is visible non-success/incompleteness, never hidden.

## Retry semantics

Retry classifies behavior; retry does not erase history.

Failure then pass may contribute to flaky/recovery classification but cannot become evidence that the original execution was deterministic-pass.

Reuse Spec 015 stability semantics wherever applicable.

## Healed test revisions

A persistent healed test is a new candidate revision:

```text
old_intent_digest
new_intent_digest
heal_reason
heal_diff
recovery_evidence_refs
```

It must re-enter stability/discrimination/admission gates. No in-place canonical mutation that retroactively changes historical meaning.

## Assertions

Recovery MUST NOT silently:

- remove an assertion;
- weaken expected values;
- change required oracle class;
- convert deterministic oracle to model-only oracle;
- mark unavailable evidence as pass.

Any such proposal is semantic recovery and requires revalidation/admission.

## Cache healing

Updating a locator cache is a recovery event. Record old/new cache entry identities and source/environment binding. Cache update cannot by itself prove the test remains semantically valid.

## Security

Recovery agents must not expand origin/network/file/credential authority beyond the original test policy. A recovery step that requires new authority is blocked pending explicit admission.

## Benchmark invariants

Qualifying recovery benchmarks require:

```text
silent_semantic_heal = 0
recovery_history_erasure = 0
retry_to_green_misreported_as_clean = 0
assertion_weakening_without_revalidation = 0
authority_expansion_without_admission = 0
```

```text
HEALING_IS_A_NEW_EVIDENCE_EVENT = YES
FINAL_GREEN_ERASES_PRIOR_FAILURE = NO
SEMANTIC_RECOVERY_AUTO_PASS = FORBIDDEN
```