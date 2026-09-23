# ARTEMIS-A12 — Cross-Platform and Real-Device Qualification

Ledger: Issue #477.
Predecessor: ARTEMIS-A11 CLOSED_CANONICAL / COMPLETE.

## Scope

A12 freezes qualification matrix contracts: host, device, and backend
cells with structural honesty gates, a side-effect-free host
capability probe, and readiness rules. Cells without provisioned
hardware stay NOT_RUN with explicit reasons, never PASS. No devices,
no emulators, no activation.

## Rules

- Coordinates are closed vocabularies: three host operating systems,
  two architectures, two device targets, two backends. Unknown
  coordinates are refused.
- PASS requires at least one evidence reference. Evidence-free PASS
  is refused structurally, not by convention.
- NOT_RUN requires a non-empty reason, which is how unprovisioned
  hardware is recorded: known work, explicitly not executed, never
  relabeled as PASS. Reason-free NOT_RUN is refused. This uses the
  frozen canonical vocabulary, which has no separate unavailable
  state by design.
- Duplicate coordinates are refused at build and at record time.
  Cells are never silently overwritten.
- Readiness means every cell decided: no INCOMPLETE, INCONCLUSIVE,
  NOT_RUN, or UNKNOWN remains. Device cells without provisioned
  hardware stay NOT_RUN with explicit reasons until real-device
  runs happen under their own explicit authority.
- The host probe reads `process.platform`, `process.arch`, and
  `process.version` only. It spawns nothing, writes nothing, and
  reports whether the lane matches the matrix vocabularies.

## Non-goals for A12

Device provisioning, emulator startup, physical-device runs, release
admission (A13), and everything after. No A12 code starts a device
and no A12 test touches one.
