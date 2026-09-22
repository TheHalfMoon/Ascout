# ARTEMIS-A8 — Diagnostics and Replay

Ledger: Issue #469.
Predecessor: ARTEMIS-A7 CLOSED_CANONICAL / COMPLETE.

## Scope

A8 freezes diagnostic contracts: recording timelines, logcat
correlation windows, deterministic bounded retention, and frozen
diagnostic reports with artifact references. No recording execution,
no device access.

## Rules

- Timelines accept exactly-shaped events in non-decreasing step order.
  Disorder, unknown kinds, and extra keys are refused; order is
  evidence integrity.
- Logcat correlation selects threadtime windows with per-priority
  counts and an explicit truncation flag once the 5000-entry cap is
  reached. Inverted or malformed windows are refused.
- Retention evicts oldest-first under byte and count budgets with
  exact kept/evicted accounting. Eviction is deterministic policy,
  never silent loss.
- Diagnostic reports bind run identity, canonical completion state, a
  canonical digest of the timeline, logcat facts, validated artifact
  references, and the retention outcome, then freeze.

## Non-goals for A8

Recording transport, video analysis execution, MCP/CLI surfaces (A9),
and everything after. No A8 code captures pixels or log streams and
no A8 test touches a device.
