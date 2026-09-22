# ARTEMIS-A5 — Locating Stack

Ledger: Issue #463.
Predecessor: ARTEMIS-A4 CLOSED_CANONICAL / COMPLETE.

## Scope

A5 freezes locator strategy routing, literal dynamic-target matching,
platform framework classification, and locator path evidence binding.
No vision models, no OCR engine execution, no device execution.

## Rules

- Eight strategies in frozen accessibility-first order. Concrete
  selectors bind at attempt time; plans order strategies only.
- `COORDINATE_FALLBACK` sorts last, is flagged, and requires a 1..512
  character justification. Fragile coordinates never hide as ordinary
  locators.
- Dynamic targets use literal `exact`, `prefix`, and `contains` rules
  only. There is no regex or pattern-program matching; match rules are
  evidence, not programs.
- Framework classification maps class-name prefixes to native, Compose,
  Flutter, Canvas, WebView, or explicit unknown. Unknown is fail-visible,
  never silently native.
- Locator evidence preserves the ordered attempt path, the first
  winning strategy, and whether coordinate fallback decided the match.
  Attempt lists are bounded and frozen.

## Non-goals for A5

OCR/vision execution, coordinate execution, Flash/Pro orchestration
(A6/A7), and everything after. No A5 code runs a model and no A5 test
touches a device.
