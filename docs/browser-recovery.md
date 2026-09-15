# Recovery Semantics — P016-07

Seventh Spec 016 implementation slice under P016-01 authorization
(predecessor: P016-06 deterministic locator policy, PR #350).

## What this slice adds

`src/browser/recovery.ts`: pure deterministic recovery evidence model,
implemented before any autonomous recovery:

- Three explicit classes: `resolver_recovery` (locator drift with
  demonstrable target equivalence), `execution_recovery` (transient
  overlay, late navigation, bounded delay), `semantic_recovery`
  (material flow change). Unknown classes throw.
- Append-only histories: `createRecoveryHistory` binds one session,
  one source, and one retry budget; `appendRecoveryAttempt` enforces
  gapless index order plus session/source/budget binding, and throws
  `E_RECOVERY_HISTORY_GAP` / `E_RECOVERY_BINDING_MISMATCH` on
  violation.
- Original failure preserved: every attempt requires
  `trigger_attempt_index`, `trigger_error_code`, and
  `trigger_error_message`; verdict facts carry the full
  `original_failures` list, so recovery can never orphan its cause.
- Visible retry budgets: `createRecoveryBudget` declares a fixed
  `max_attempts`; `recoveryBudgetRemaining` is computed data, and
  appending past exhaustion throws `E_RECOVERY_BUDGET_EXHAUSTED`
  instead of silently extending the budget.
- Semantic blocking: `semantic_recovery` requires an
  `obligation_ref` (other classes must not carry one);
  `evaluateRecoveryVerdict` forces `blocked` with
  `E_RECOVERY_SEMANTIC_BLOCKED` until that exact obligation appears
  in the revalidated set. Automatic green is forbidden.
- Verdict facts without vocabulary weakening: `clean` (empty history
  only), `pass_with_recovery` (nonempty, no failure or blocker —
  never `clean`), `blocked`, `failed`. Every verdict carries the
  history digest, per-outcome counts, pending semantic obligations,
  original failures, and sorted blocking reasons: no
  final-state-only truth collapse.
- Explicit integrity condition: `measureRecoveryHistoryErasure`
  counts missing/duplicated/reordered indexes and must equal
  `RECOVERY_HISTORY_ERASURE` (0) for intact histories;
  `verifyRecoveryHistoryIntact` throws otherwise.
- Deterministic JSON round-trip with strict revalidation plus stable
  sha256 digests; tampered order or over-budget histories fail
  parsing. Free text rejects raw secret markers, and `E_RECOVERY_*`
  codes stay disjoint from locator-layer codes.

## What this slice does not do

No autonomous recovery agent (P016-16): nothing here retries, heals,
or replans — it records recovery evidence and integrates it into
verdicts. No evidence-bundle merge (histories stay standalone until
trace/artifact ingestion, P016-08), no benchmark harness (P016-09),
no donor code, no dependency change.

## Evidence

`tests/browser-recovery.contract.test.ts` proves budget validation,
history binding, mandatory failure triggers, class/outcome closure,
semantic obligation rules, append-order and binding gates, budget
exhaustion, erasure measurement (gap and truncation), the full
verdict lattice including semantic revalidation, secret rejection,
strict JSON round-trips, digest determinism, and code-namespace
separation.
