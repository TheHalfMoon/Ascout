# ARTEMIS-A1 — Protocol and Engine Contracts

Ledger: Issue #455.
Predecessor: ARTEMIS-A0 CLOSED_CANONICAL / COMPLETE.

## Scope

A1 freezes contracts only. No device execution, no sidecar, no ADB,
no network, no provider, and no runtime activation.

## Artifacts

- `schemas/mobile-artemis/v1/protocol.json`
  Versioned JSON Schema (`urn:ascout:mobile-artemis:protocol:v1`) for
  request, event, result, and artifact-reference envelopes. Exact keys,
  `protocol_version` pinned to `1`, thirteen mobile effects, ten
  canonical completion states.
- `src/assurance/engines/mobile-artemis/effects.ts`
  Frozen thirteen-effect catalog with conservative Ascout ceiling mapping:
  observations stay read-only, writes need artifact authority,
  interaction needs interaction authority, installs/pushes/settings and
  mutating shell need external side-effect authority.
- `src/assurance/engines/mobile-artemis/descriptor.ts`
  Frozen EXTERNAL engine descriptor with `E0_READ_ONLY_ANALYSIS`
  ceiling, false/empty execution requirements, Apache-2.0 provenance
  bound to the A0 donor record, and a stable canonical digest helper.
  The implementation digest is the unset sentinel (all zeros) because A1
  builds no executable artifact; the sidecar digest binds at A2 at the
  earliest.
- `src/assurance/engines/mobile-artemis/protocol.ts`
  v1-only negotiation, strict context binding (run, source digest,
  descriptor digest, donor SHA), ordered stale rejection
  (donor, then protocol, then descriptor), and exact-keys envelope
  validation for requests and results.
- `tests/assurance-mobile-artemis-a1.test.ts`
  Contract qualification: descriptor freeze, ceiling freeze, negotiation,
  stale matrix, context formats, envelope accept/reject, and schema/TS
  consistency.

## Trust boundary

ARTEMIS internals stay outside `src/assurance/kernel`. The mobile engine
is EXTERNAL: Ascout intent, policy, effect ceilings, and phase authority
remain sovereign. A donor-side safe classification can never override an
Ascout refusal; that rule is enforced by later execution phases, not by
these contract types.

## Non-goals for A1

Sidecar availability (A2), read-only device evidence (A3), bounded input
(A4), and everything after. No Python bridge, no ADB discovery, no
device selection, no screenshots, no execution of any kind.
