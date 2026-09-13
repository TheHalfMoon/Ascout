# Spec 016 Benchmark Design — Browser and Agentic Verification

**Status:** `PLANNING_ONLY`
**Planning ledger:** Issue #342

## 1. Benchmark objective

Measure Ascout's truthfulness and defect-finding capability, not donor feature count. Browser benchmark success requires useful detection with zero integrity violations.

## 2. Benchmark partitions

```text
public_development
synthetic_gating
eval
hidden_holdout
post_cutoff
adversarial
```

Synthetic gating cases are owned by Ascout and are the first implementation requirement. External corpora require separate license/redistribution/contamination qualification.

## 3. Synthetic application families

Build small deterministic web fixtures representing:

1. authentication/session flow;
2. checkout/order submission;
3. async search/results;
4. settings/profile form;
5. modal/overlay-heavy workflow;
6. multi-step wizard;
7. responsive/conditional UI;
8. network/API-backed state change.

Each fixture must support seeded variants without changing the benchmark oracle after seeing Ascout output.

## 4. Seeded defect / drift taxonomy

Minimum cases:

```text
locator_label_rename_equivalent
locator_role_change_non_equivalent
ambiguous_duplicate_control
copy_only_change
reordered_controls
transient_overlay
slow_navigation
slow_api
failed_api_with_success_like_ui
console_exception
page_error
duplicate_submission
missing_required_step
wrong_endpoint
stale_state
state_not_persisted
incorrect_auth_state
cross_browser_behavior_difference
visual_regression
accessibility_name_loss
semantic_flow_change
source_tree_mismatch
recovery_changes_business_action
cache_stale_across_revision
sensitive_value_in_artifact
```

## 5. Comparator tracks

Where operationally and legally permitted:

- native hand-authored Playwright Test;
- Playwright planner/generator/healer agent flow;
- Momentic web execution/agentic flow;
- Ascout deterministic browser flow;
- Ascout agentic flow after separately authorized.

If a comparator cannot be automated or reproduced under permitted terms, record `COMPARISON_UNAVAILABLE(reason)` rather than inventing a result.

## 6. Primary metrics

```text
defect_recall
false_pass_rate
false_fail_rate
obligation_coverage
semantic_drift_detection_rate
unsafe_heal_rate
locator_drift_recovery_rate
flake_classification_accuracy
cross_browser_defect_recall
discrimination_success_rate
reproduction_success_rate
minimization_quality
evidence_completeness
source_binding_accuracy
maintenance_edits_per_change
median_runtime
p95_runtime
model_calls
token_cost_if_applicable
artifact_volume
```

No single score may override integrity failures.

## 7. Absolute integrity gates

All must equal zero for a qualifying benchmark:

```text
fabricated_pass
hidden_applicable_not_run
cross_tree_evidence_leakage
source_binding_violation
silent_semantic_heal
cache_authority_escalation
secret_leakage_from_ascout_owned_artifacts
unqualified_model_only_pass
recovery_history_erasure
```

## 8. Recovery benchmark

For each recoverable case record:

- initial failure;
- recovery category;
- corrective actions;
- retry count;
- final state;
- semantic-equivalence evidence;
- resulting Ascout verdict.

A final pass after semantic drift is a benchmark failure if Ascout reports an ordinary clean PASS.

## 9. Locator benchmark

Measure deterministic locator policy first against controlled refactors:

- accessible-name-preserving DOM refactor;
- text change with stable role/test-id;
- test-id change with stable user-facing semantics;
- duplicated accessible names;
- hidden/disabled duplicate controls;
- reordered layout.

Only introduce model-based resolver benchmarking after deterministic misses are measured.

## 10. Agent benchmark

After agent authorization, evaluate:

- proposal relevance;
- unsupported/hallucinated steps;
- obligation traceability;
- generated-test pass rate;
- generated-test discrimination rate;
- semantic-drift safety;
- recovery safety;
- cost/budget exhaustion visibility.

A high test-generation count is not success.

## 11. Journey selection benchmark

Seed changes that affect:

- one journey;
- multiple variants;
- shared component across journeys;
- API client used by unrelated pages;
- ambiguous dependency relation.

Ascout must widen when safe narrowing is not established. A missed required journey that produces green is a false PASS.

## 12. Browser artifact benchmark

Verify:

- trace/screenshot refs resolve;
- artifact digests are stable for retained bytes;
- missing artifact is visible;
- retention bounds are enforced;
- sensitive-value test fixtures do not leak through Ascout-owned normalized evidence;
- unsupported third-party artifact redaction limitations are disclosed.

## 13. Release criterion

The deterministic Spec 016 first wedge may close when:

1. all absolute integrity gates are zero;
2. all declared required synthetic cases have reproducible results;
3. source/browser/environment identity is reconstructable;
4. recovery/semantic-drift behavior matches the specification;
5. no benchmark-required work is silently omitted;
6. comparative claims are limited to available evidence.

Agentic phases require their own benchmark delta before closeout.

```text
BENCHMARK_POLICY = CLAIM_FOCUSED
SYNTHETIC_OWNED_CASES_FIRST = YES
SCORE_OVER_INTEGRITY_FAILURE = FORBIDDEN
```