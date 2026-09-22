# ARTEMIS-A6 — Flash Execution

Ledger: Issue #465.
Predecessor: ARTEMIS-A5 CLOSED_CANONICAL / COMPLETE.

## Scope

A6 freezes bounded reactive execution governance: ceilings, a
deterministic run-state machine, cancellation, history compression
with digests, and replay plans. No device execution, no transport.

## Rules

- Absolute hard caps bound every ceiling; requested ceilings must also
  fit the admitted ceilings or the run is refused before it starts.
- Runs move READY to RUNNING to exactly one terminal state. Terminals
  are immutable: stepping, finishing, or cancelling a terminal run is
  refused, never silently applied.
- Every step declares token, artifact, and elapsed consumption up
  front. Crossing any ceiling lands on the matching `EXHAUSTED_*`
  terminal with the evidence preserved in state.
- Cancellation is available in READY and RUNNING with a mandatory
  1..512 character reason. There is no state from which a run cannot
  be cancelled or finished.
- History compression keeps an explicit tail and digests the dropped
  prefix with the canonical assurance hash, so forgetting is evidence,
  not silent loss.
- Replay plans reference recorded steps only; empty ranges are
  refused. Replay re-issues evidence, never invents actions.

## Non-goals for A6

Execution transport, planner/operator/checker orchestration (A7),
diagnostics (A8), and everything after. No A6 code loops without a
ceiling: every iteration is bounded by validated input lengths or
explicit step budgets, and every loop terminates on a terminal state.
