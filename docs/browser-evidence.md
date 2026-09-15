# Browser Evidence and Oracle Records — P016-05

Fifth Spec 016 implementation slice under P016-01 authorization
(predecessor: P016-04 Playwright adapter, PR #348).

## What this slice adds

`src/browser/evidence.ts`: Ascout-owned browser evidence records and the
first concrete acceptance surface for `REQ-ORACLE-MESH`:

- `createOracleRecord` validates the ten oracle families with explicit
  producer, version, provenance, independence class, calibration state,
  authority, required evidence types, and source binding. Gating requires
  a deterministic kind with independent provenance; model/human kinds are
  advisory-only; model kinds require calibration state; circular or
  unresolved independence fails closed. Contradictions throw instead of
  silently downgrading.
- `recordActionAttempt` + `appendAttempt` keep ordered append-only attempt
  logs: index continuity enforced, sessions/sources uniform, failures
  preserved with codes.
- `createDomFact` / `createAccessibilityFact` record source-bound
  observations with explicit subjects (and exact role/name for
  accessibility), kept distinguishable by type.
- `createNetworkRecord` enforces the wedge privacy policy: method, bare
  origin, and path only. Credentials, query strings, fragments, headers,
  and bodies are rejected — records carrying them throw.
- `createConsoleRecord` captures console/page-error streams with counts.
- Artifact evidence reuses validated `BrowserArtifactRef` records
  (digests where available).
- `attachOracleRef` binds an oracle reference onto an assertion response
  with envelope revalidation.
- `assembleEvidenceBundle` enforces the assembly gate: one session, one
  source (cross-tree/cross-session input rejected, never merged), ordered
  attempts, unique oracle ids, and every assertion referencing a present
  oracle record.
- `checkSourceDrift` reports match/drift as data; `collectBlockingReasons`
  enumerates drift, non-ok attempts, non-passed assertions, and unmet
  oracle evidence requirements — listed, never scored.
- Deterministic JSON round-trip with strict revalidation for oracle
  records and bundles, plus a sha256 bundle digest.

## What this slice does not do

No browser driving (the P016-04 adapter executes; this module records),
no locator policy (P016-06), no recovery behavior (P016-07), no trace
ingestion (P016-08), no benchmark (P016-09), no verdict computation beyond
blocking-reason enumeration (release authority stays with Spec 015
admission/residual semantics until the journey layers arrive).

## Evidence

`tests/browser-evidence.contract.test.ts` proves oracle authority rules,
model/human advisory-only status, independence fail-closed behavior,
calibration requirements, enum rejection, attempt ordering, network
privacy bounds, console/DOM/accessibility records, secret rejection,
digest-carrying artifacts, bundle assembly, cross-tree/cross-session
rejection, oracle binding/dangling/duplicate rules, drift checks,
blocking-reason enumeration, and strict JSON round-trips.
