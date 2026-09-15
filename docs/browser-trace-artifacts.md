# Trace/Artifact Ingestion — P016-08

Eighth Spec 016 implementation slice under P016-01 authorization
(predecessor: P016-07 recovery semantics, PR #351).

## What this slice adds

`src/browser/trace-artifacts.ts`: bounded ingestion of Playwright
trace/screenshot/log artifact references into Ascout evidence
discipline:

- Closed fact-source map: `trace` artifacts yield `trace-action` /
  `trace-error` / `trace-screenshot` facts, `screenshot` yields
  `trace-screenshot`, `console-log` yields `trace-console`, and
  `network-log` yields `trace-network`. DOM/accessibility snapshots
  stay raw refs in this wedge, and any unmapped combination throws
  `E_TRACE_KIND_REJECTED` — ingestion can never silently widen into
  Trace Viewer duplication.
- Every ingested fact carries fixed `trace-derived` provenance plus
  an explicit redaction state (`redacted`, `not-sensitive`, or
  `redaction-unsupported` as a visible limitation). Summaries reject
  raw secret markers.
- Coded retention policy: positive-integer bounds on artifact count,
  total bytes, and age. `evaluateRetention` expires aged artifacts
  first, then evicts oldest-first (artifact-id tie-break) for count
  and bytes — fully deterministic, unknown sizes forbidden.
- Corroboration without override: `corroborateWithTrace` matches on
  exact claim keys and marks each fact `corroborated`, `trace-only`,
  or `conflict`. Conflicts resolve to Ascout evidence with the
  conflict recorded; trace-only facts stay advisory and are never
  promoted. Trace facts therefore cannot override, upgrade, or
  substitute Ascout execution evidence.
- Ingestion assembly binds one session and one source with unique
  fact ids and known-artifact refs; cross-tree input throws
  `E_TRACE_BINDING_MISMATCH`.
- Deterministic JSON round-trips with strict revalidation (parsed
  provenance must read `trace-derived`) plus stable sha256 digests;
  `E_TRACE_*` codes stay disjoint from recovery and locator codes.

## What this slice does not do

No Trace Viewer duplication (raw traces stay in Playwright-owned
storage behind portable refs), no payload-level redaction engine
(unsupported redaction stays honestly visible), no benchmark
harness (P016-09), no donor code, no dependency change.

## Evidence

`tests/browser-trace-artifacts.contract.test.ts` proves policy
validation, age/count/byte retention with deterministic eviction,
the closed fact-source map including snapshot rejection,
session/source binding, secret rejection, assembly gates,
corroboration with Ascout-wins conflicts, strict JSON round-trips,
digest determinism, and code-namespace separation.
