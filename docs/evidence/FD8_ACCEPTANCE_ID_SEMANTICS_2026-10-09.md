# FD8 Acceptance Identifier Semantics — 2026-10-09

**Status:** READ_ONLY_RESEARCH / NOT_RATIFIED / UNMERGED. No FD8-B authorization.

## Exact-source qualification boundary

- Canonical Ascout main: `ca6b6f514e5a8881e2cfa2789b5e5ea43e3aaaad`.
- Proposed planning-verifier parent #605: `e0513bfc265fb7a3d6fe5f1e50cb7ba731697793` (stacked on proposed #585).
- Original V2 planning source #578: `512b5bc14bdbe875a01c4a137ef134564c6bd1c8`.
- Windows 11, Node 24: original `docs/strategy` exported from exact source using `git archive -o` into an OS temp directory. `docs/strategy/ascout-v2` contained 20 Markdown files. No original source changes.

## Semantics proposed, not yet adopted

The proposed `--ids` parser recognizes only pipe-table and Markdown-heading definitions. The V2 acceptance program uses ID-led prose in a named `## 2. Capability acceptance suites` section, sometimes with several entries separated by middle dots. This research grain additionally recognizes individually described identifiers **only inside that named section**. Other mentions, compound benchmark identifiers, and unexpanded ranges are not definitions.

Acceptance-narrative grammar is not a general Markdown semantic parser. First-position identifiers with prose might still be ambiguous in other document styles; independent review remains required.

## Measured results on exact V2 source

| Observation | Prior parser | Proposed scoped-acceptance parser |
|---|---:|---:|
| Unique missing-ID diagnostics | 65 | **16** |
| Independently described acceptance IDs newly recognized | 0 | 49 |
| `--ids` result on the original source | FAIL | **FAIL** |

The remaining **16 exact-source IDs** are `SEC-09`..`SEC-16` (eight V6 future extension IDs), `DUR-01`..`DUR-03` (three grouped durability tests) and `ASR-01`..`ASR-05` (five grouped assure tests). These are references without individual acceptance definitions, not evidence that those tests were executed.

This experiment does **not** repair the original canonical `docs/strategy` baseline's no-identifier-references diagnostic, validate Markdown anchors/reference-style links, or prove staged-placeholder document completeness. Those remain separately tracked by #602 and #604.

## Explicit nonclaims and merge gate

The candidate still fails closed for the 16 unresolved acceptance IDs. No founder decision, V2 plan adoption, scanner security claim, independent OCR review, or merger is inferred. Exact-head CI and genuine independent review are required before any normal merge.
