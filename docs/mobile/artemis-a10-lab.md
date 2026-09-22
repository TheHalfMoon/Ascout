# ARTEMIS-A10 — Product UI and Lab Views

Ledger: Issue #473.
Predecessor: ARTEMIS-A9 CLOSED_CANONICAL / COMPLETE.

## Scope

A10 freezes mobile run view contracts for the Review, Test, Security,
Cyber, Assure, and Lab surfaces: run state, blocked actions,
screenshot references, timeline digests, checkpoint summaries,
unverified scope, and authority visibility. View models only; no UI
framework and no product code changes.

## Rules

- Views project run state, completion state, blocked actions,
  screenshot references, the timeline digest, checkpoint counts, the
  explicitly unverified scope, and the admitted authority. Every field
  validates with exact keys and the finished view freezes.
- PASS never masks incompleteness: a PASS view with non-empty
  unverified scope, non-empty blocked actions, or violated or pending
  checkpoints is refused. Incomplete verification can never look
  complete, structurally, not by convention.
- Device identity enters only as a hash and is not embedded in the
  view at all. Views carry no serials, raw or otherwise; a view
  without a bound device identity is refused.
- Checkpoint counts must sum to the total. Authority lists admitted
  effects deduplicated and sorted with the donor SHA and the engine
  descriptor digest, so every surface shows exactly what was admitted
  and under which bindings.

## Non-goals for A10

UI implementation, hardening (A11), qualification (A12), release
admission (A13), and everything after. No A10 code renders anything
and no A10 test touches a device.
