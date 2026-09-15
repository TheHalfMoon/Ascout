# BrowserExecutor Contract — P016-03

Third Spec 016 implementation slice under P016-01 authorization
(predecessor: P016-02 Intent IR, PR #346).

## What this slice adds

`src/browser/executor.ts`: internal browser-execution contract types with no
coupling to Playwright APIs and no browser launch:

- `createSessionIdentity` binds session id, source identity, engine
  declaration (closed to `chromium` for the first wedge), environment
  identity (os/arch/runtime/version), explicit application origin, and
  browser profile.
- Action/assertion request envelopes carry kind, target/statement, optional
  value, and bounded timeouts (1..120000 ms, 30000 ms default constant).
- Action/assertion response envelopes carry status, duration, error
  consistency (ok/passed carries no error; anything else names one),
  canonicalized evidence refs, and an `oracle_ref` slot (null until P016-05
  populates concrete oracle records).
- `createArtifactRef` binds artifact id, session, source, kind, optional hex
  digest, optional portable uri (relative ref or URL; never filesystem-absolute
  or machine-local, so refs stay portable across producer machines), optional
  byte size, and redaction state.
- `requireBoundResponse` / `requireBoundArtifact` throw on cross-session or
  cross-tree records instead of leaking across boundaries.
- Cancellation is immutable data (`activeCancellation` / `cancelState`);
  `deadlineExceeded` / `remainingMs` are pure predicates over explicit
  millisecond readings with no clock.
- Deterministic JSON round-trip with strict revalidation for all six
  envelope types.

There is intentionally no plugin registry, loader, shell construction, or
dynamic capability surface.

## What this slice does not do

No browser launch, no Playwright import or dependency (`package.json`
untouched), no execution behavior, no oracle evidence (refs only), no
recovery behavior, no benchmark. The first Playwright-backed implementation
arrives in P016-04.

## Evidence

`tests/browser-executor.contract.test.ts` proves session identity, engine and
origin rejection, request timeout bounds, response error consistency,
assertion oracle refs, artifact digest/uri/kind rules, session binding,
cancellation immutability, deadline predicates, and JSON round-trip
integrity for every envelope.
