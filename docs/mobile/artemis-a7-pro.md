# ARTEMIS-A7 — Pro Execution

Ledger: Issue #467.
Predecessor: ARTEMIS-A6 CLOSED_CANONICAL / COMPLETE.

## Scope

A7 freezes Planner/Operator/Checker orchestration contracts:
validated plans, checkpoint evaluation, final-goal verification,
bounded incident recovery, and living-plan evidence mapping. No
models, no execution.

## Rules

- Planner output is untrusted input. It is validated key by key into a
  typed plan or refused; planner JSON is evidence input, never
  authority, and can never grant effects, budgets, or admission.
- Every step names one of three roles and carries a validated A4
  action. Plans are bounded to 128 steps and must fit the admitted
  step budget.
- Checkpoints attach to steps. Non-planner checkpoints are required by
  default. Evaluation reports per-checkpoint status with an overall
  verdict that fails closed on required violations.
- Final goals verify only when every checkpoint is satisfied and the
  plan declares at least one checkpoint. Anything else is explicitly
  unverified with a reason, never a silent pass.
- Incidents recover boundedly: action failures retry at most three
  times, checkpoint violations skip to the checkpoint, budget
  exhaustion and protocol staleness abort immediately. Unknown or
  malformed incidents abort with a reason.
- Living plans map to frozen summaries (identity, goal, counts, roles)
  for evidence binding downstream.

## Non-goals for A7

Model invocation, plan execution transport, diagnostics (A8), and
everything after. No A7 code calls a provider and no A7 test touches a
device.
