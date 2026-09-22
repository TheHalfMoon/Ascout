# ARTEMIS-A2 — Isolated Sidecar Availability

Ledger: Issue #457.
Predecessor: ARTEMIS-A1 CLOSED_CANONICAL / COMPLETE.

## Scope

A2 validates availability only: TypeScript to versioned local protocol
to isolated Python sidecar to pinned snapshot. Python, donor, sidecar,
and ADB-binary presence are probed and reported as structured states.
No mutation of any kind.

## Artifacts

- `python/ascout_mobile_bridge/sidecar.py`
  Stdlib-only sidecar. Exactly one JSON request line on stdin yields
  exactly one JSON response line on stdout. Commands: `handshake`.
  No network, no subprocesses, no file writes, no device access.
- `python/ascout_mobile_bridge/README.md`
  Operational contract of the bridge.
- `src/assurance/engines/mobile-artemis/availability.ts`
  Availability probe returning a frozen-style report with per-check
  verdicts, machine-readable reasons, and an always-empty `mutations`
  list. ADB is probed with `adb version` only, which never starts a
  server and never enumerates devices.
- `tests/assurance-mobile-artemis-a2.test.ts`
  Unit matrix over fixture runners plus one live probe that asserts
  report well-formedness and byte-level non-mutation of the donor
  snapshot and the bridge directory.
- This document.

## Availability semantics

`AVAILABLE` requires all three gates: pinned donor snapshot present,
Python 3.12 release pin satisfied, and stdio handshake `READY` with
matching sidecar version and donor pin. Anything else is `UNAVAILABLE`
with explicit reasons. The handshake is still attempted on a
version-mismatched interpreter so protocol health is reported
separately from pin compliance. ADB presence is informational at this
phase and never gates `AVAILABLE`; device enumeration belongs to A3.

## Non-goals for A2

Sidecar execution beyond the handshake (A3+), read-only device
evidence (A3), bounded input (A4), dependency pinning for release
(A13), and everything after. No `pip install`, no virtualenv creation,
no APK or helper installation, no MCP registration.
