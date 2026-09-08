# Specification 010 Clarifications — Selector Shadow Verification

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## C1 — Is this selector repair?

No. Spec 010 observes selector behavior. It does not change selection, widening, command admission, test planning, receipt semantics, or exit semantics.

## C2 — Why is planning justified after T091 published zero current misses?

Because the bounded six-case replay is not universal evidence. T078 previously proved one real selector miss, and T091 still had three unavailable Ascout comparator outcomes out of six. A continuous same-repository observation increases evidence depth without assuming a new defect exists.

## C3 — Why not move directly to M2 mutation/counterfactual work?

The roadmap places selector shadow inside M1.2 trust measurement before broader M2 evidence types. The Founder has authorized the next planning chain, not arbitrary roadmap skipping. A bounded selector-shadow slice is the smallest remaining M1.2 candidate.

## C4 — Why Ascout-on-Ascout only?

Spec 006 already provides a reviewed same-repository trust boundary, exact PR-head verifier, exact reconstructed subject identity, and retained receipt. Reusing it avoids a generic external-project execution system, new sandbox/admission design, donor acquisition, or plugin abstraction.

Broader project selector shadow remains future work unless this bounded slice proves value and a later spec authorizes expansion.

## C5 — Why not compare Project CI status to Self Verification status?

Separate workflow statuses are too coarse and not one source-bound evidence object. They do not identify exact failing tests or prove the compared commands observed the same reconstructed source state. Spec 010 requires one local comparison with exact receipt/envelope binding and structured full-suite failure identity.

## C6 — What is a selector miss?

Only this exact set difference for a comparable observation:

```text
(full-suite failed repository-relative path, fullName)
  MINUS
(Ascout test-finding repository-relative path, rule_or_test_id)
```

Every unmatched full-suite failed identity is a selector miss observation.

No miss is inferred from counts, durations, messages, exit codes alone, path suffixes, fuzzy names, or causal assumptions.

## C7 — What if full suite exits nonzero but no valid failed assertion identity exists?

The shadow observation is unavailable for selector-miss publication. A nonzero exit can represent assertion failure, configuration failure, runner failure, or another integrity problem. Spec 010 does not upgrade nonzero into test-failure identity without structured evidence.

## C8 — What if Ascout's test task is `BLOCKED`, `ERROR`, `NOT_RUN`, or `NOT_APPLICABLE`?

The comparison is unavailable. These states are not selector misses and not selector passes. Their existing receipt reasons remain authoritative.

## C9 — What if the test task is admission-refused because a command/config surface changed?

Do not execute the full-suite shadow reference. Record `UNAVAILABLE_ASCOUT_TEST_TASK` with the existing receipt reason/admission facts. Automation must not bypass the command-surface boundary merely to obtain a shadow metric.

## C10 — What if a future PR changes the root test script?

The bounded Spec 010 reference contract requires root `package.json` `scripts.test` to remain exactly `vitest run`. If that contract changes, the shadow observation is unavailable and planning must be revisited before another command shape is admitted.

## C11 — Why use Vitest JSON reporter arguments instead of plain `npm test`?

Exact selector misses require structured failing-test identity. Current Ascout root `npm test` is exactly `vitest run`; adding native `--reporter=json` and `--outputFile=<ephemeral>` arguments preserves full-suite selection while producing machine evidence. The local already-installed Vitest runtime is used directly; no implicit install is permitted.

## C12 — Does structured full-suite execution itself become Ascout product evidence?

No. It is Spec 010 CI qualification evidence classified `SELECTOR_SHADOW_NON_GATING`. It does not enter Receipt v1 and does not change Ascout's verdict.

## C13 — Can a selector miss fail the shadow job?

No under Spec 010. A reliably observed miss is a successful measurement and must be published. Harness-integrity failure may fail the shadow integration step if it prevents trustworthy evidence production, but the miss itself is non-gating.

Project CI remains independently responsible for its own full-suite result.

## C14 — What if the full suite modifies source files or creates nonignored files?

The observation becomes unavailable. Pre/post Git subject identity and cleanliness must match. Spec 010 does not publish selector claims from a drifting reference run.

## C15 — What if full-suite and Ascout failures share the same name in different files?

They are different identities. Matching is exact `(repository-relative path, test id)` tuple equality.

## C16 — What if a receipt finding has a test ID but no path, or a full-suite path cannot be reduced safely to a repository-relative path?

That identity is not comparable. If this prevents a complete comparison of full-suite failed identities, the observation is unavailable rather than partially claiming recall.

## C17 — What about retries/flakes?

Ascout receipt truth remains authoritative for its `FAIL`/`FLAKY` classification. The shadow reference records the one full-suite observation required by this spec. Spec 010 does not add flake reproduction logic or reinterpret Ascout's existing findings.

## C18 — What durations are recorded?

Record raw Ascout test-task `duration_ms` from the receipt and raw full-suite wall-clock duration. Do not claim a universal speedup percentage because the two execution paths can include different instrumentation/reproduction work.

## C19 — Is a recall percentage required?

No. The artifact may record exact counts of full-suite failed identities, matched identities, and misses, but no acceptance threshold or universal recall claim is authorized. Every miss is published directly.

## C20 — Does Spec 010 create trend storage?

No. Each PR artifact is self-contained and retained through the existing bounded GitHub artifact mechanism. No database, aggregation service, dashboard, or long-term telemetry store is authorized.

## C21 — Can historical T078/T091 results be rewritten or folded into the new artifact?

No. They are immutable gap evidence. Spec 010 observations are new current-run evidence and never rewrite historical benchmark results.

## C22 — Does Spec 010 reopen Spec 007?

No. Spec 007 remains `NO_GO / TERMINAL_UNDER_CURRENT_SPEC`. No donor execution, T113 successor ref, result synthesis, or recovery reinterpretation is authorized.

## C23 — What are the exact implementation surfaces planned?

T117 candidate:

- `benchmarks/selector-shadow.mjs` — new bounded comparison harness;
- `tests/t117-selector-shadow.contract.test.ts` — new focused contracts.

T118 candidate:

- `.github/workflows/self-verify.yml` — reuse existing lane, invoke T117 after successful self-verification capture, upload the additional exact observation artifact.

T119 is ledger/governance reconciliation only by default.

No other tracked file is planned.

## C24 — What stops implementation?

Planning merge alone does not authorize T117. A separate implementation authorization must bind the exact canonical planning merge and exact file/task boundaries.

## C25 — What happens if the first live T118 observation is unavailable?

Do not repair ad hoc. Record the exact reason. If the reason violates the planned acceptance boundary or exposes an unplanned command/runtime/source-identity requirement, T118 stops and returns to Spec 010 planning. No threshold, fallback parser, alternate runner, or auto-admission may be invented after seeing the result.