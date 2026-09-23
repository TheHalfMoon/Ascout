# ARTEMIS-A3 — Read-Only Device Evidence

Ledger: Issue #459.
Predecessor: ARTEMIS-A2 CLOSED_CANONICAL / COMPLETE.

## Scope

A3 builds the read-only evidence pipeline: hierarchy, screenshot, and
logcat parsing with hashing, caller-supplied secret redaction,
privacy-safe device identity, five-way receipt binding, and a frozen
read-only ADB command catalog. No device execution, no transport, no
server starts, no device-side writes.

## Artifacts

- `src/assurance/engines/mobile-artemis/evidence.ts`
- `tests/assurance-mobile-artemis-a3.test.ts`
- This document.

## Pipeline rules

- Hierarchy input must be a flat `<node/>` list inside `<hierarchy>`.
  Markup declarations, unknown entities, nested shapes, missing
  bounds, and oversized inputs are rejected or skipped with counts;
  skipped data is never silently treated as observed.
- Logcat accepts threadtime lines within strict bounds; everything
  else counts as skipped, never as evidence.
- Secrets come only from the caller. There is no secret discovery.
  Redaction is literal longest-first matching with exact counts, so
  truncation and redaction facts stay auditable.
- Screenshots are summarized structurally (PNG signature, IHDR
  geometry, byte length, SHA-256). Full pixel decoding belongs to the
  later vision phase, not to A3.
- Device identity is a domain-separated SHA-256 of the serial. Raw
  serials never appear in receipts, logs, or errors from this module.
- Receipts bind run, source digest, descriptor digest, donor SHA,
  device identity hash, canonical completion state, artifacts, and
  observations with exact keys, then freeze.

## Read-only command catalog

Legal reads: `getprop`, `dumpsys window`, `dumpsys package`,
`exec-out screencap -p`, and dumping `logcat -d -v threadtime`.
Builders return frozen argv with strict extra-argument allowlisting and
never spawn a process. `uiautomator dump` is explicitly excluded
because it writes a device-side file; that makes it not read-only.

## Non-goals for A3

Transport and execution of these commands (later phase under its own
effect authority), bounded input (A4), locating (A5), and everything
after. No ADB server is started by A3 code, and no A3 test touches a
device.
