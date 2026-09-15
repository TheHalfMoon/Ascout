# Deterministic Locator Policy — P016-06

Sixth Spec 016 implementation slice under P016-01 authorization
(predecessor: P016-05 browser evidence, PR #349).

## What this slice adds

`src/browser/locators.ts`: pure deterministic locator policy over the
Playwright user-facing locator taxonomy:

- Eight strategies in canonical priority order: role/name, label, text,
  placeholder, alt text, title, test id, explicitly declared structural
  fallback. Each strategy documents its Playwright binding (`getByRole`,
  `getByLabel`, …) as data.
- `createLocatorCandidate` validates per-strategy shape: role strategy
  requires a known ARIA role from a closed vocabulary (ARIA 1.2 core plus
  graphics roles and `generic`); structural fallback requires an explicit
  non-empty reason; every strategy requires a non-empty value (name-less
  matching stays forbidden in this wedge).
- `orderCandidates` sorts by strategy priority, then value, for
  determinism.
- `resolveLocators` selects the highest-priority candidate with exactly
  one observed match and records the full tried-list. Multi-match fails
  closed to `ambiguous` (`E_LOCATOR_AMBIGUOUS`); all-zero fails closed to
  `unresolved` (`E_LOCATOR_UNRESOLVED`); empty or malformed inputs throw.
- `disambiguate` records explicit nth-match selection with bounds checks;
  nothing is inferred.
- `requireResolved` throws the recorded locator-layer code for
  fail-closed call sites.
- Deterministic JSON round-trip with strict revalidation: parsed
  outcomes/codes must agree with recomputation from inputs, or parsing
  throws.
- Locator-layer codes (`E_LOCATOR_*`) stay disjoint from product
  assertion codes, so locator drift never masquerades as product failure
  (or vice versa).

No model, cache, or heuristic participates anywhere: resolution is a
pure function of candidates plus observed match counts.

## What this slice does not do

No live browser binding: match counts arrive as inputs, and the runtime
binding (driving `getBy*` calls and feeding observed counts through this
policy) arrives with the P016-09 benchmark harness. No selector-string
rendering is attempted here, so no Playwright selector-syntax guessing
can leak into truth contracts. No recovery behavior (P016-07), no
evidence ingestion (P016-08), no donor code, no dependency change.

## Evidence

`tests/browser-locators.contract.test.ts` proves candidate validation,
ARIA role closure, priority ordering, exact-match selection with audit
trail, ambiguity/unresolved fail-closed behavior, malformed-input
rejection, explicit disambiguation bounds, code-namespace separation,
binding-map coverage, strict JSON round-trips, and determinism.
