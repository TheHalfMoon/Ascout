# ARTEMIS-A13 — Release Admission

Ledger: Issue #479.
Predecessor: ARTEMIS-A12 CLOSED_CANONICAL / COMPLETE.

## Scope

A13 freezes the release admission gate: provenance, license,
telemetry, thirteen phase closeouts, clean checkout, exact-head CI,
both review layers, zero unresolved findings, and device matrix
readiness. Gate logic, A13 attribution, and release docs only. No
dependency installs, no license changes, no activation.

## Rules

- Admission requires every gate simultaneously. Each missing gate is
  named in the refusal reasons; partial qualification never admits.
- The donor SHA must equal the pinned intake SHA, the license must be
  Apache-2.0, and donor telemetry must audit off with offending flags
  named.
- All thirteen phase closeout references must be present and
  well-formed opaque references.
- CI must bind a 40-hex head with six-of-six Project CI and passing
  Self Verification. Both Jev and Alibaba reviews must pass with
  exactly zero unresolved material findings.
- The device matrix must report ready: every cell decided under A12
  rules, with unprovisioned hardware recorded as reasoned NOT_RUN.

## Non-goals for A13

Distribution, publication, installation, and activation. A13 admits a
release candidate as qualified; it ships nothing and enables nothing.
