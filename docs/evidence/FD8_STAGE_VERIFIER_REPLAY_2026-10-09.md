# FD8 Pinned Planning-Verifier Stage Replay — 2026-10-09

**Status: RESEARCH_NOT_RATIFIED / NO MERGE AUTHORIZATION.**
Related: #578, #585, #599, #600, #601, #602, #603.

## Exact pinned inputs

- Canonical base: `ca6b6f514e5a8881e2cfa2789b5e5ea43e3aaaad`.
- V2 root source #578: `512b5bc14bdbe875a01c4a137ef134564c6bd1c8`.
- Proposed, UNMERGED planning verifier #585: `627ce80ea5c66c6b0ce4919c606569b780fc00ba`.
- Corrected research model #603: `e7267397e9f846b45a6eb4442e2d3f2036cf8186`.
- All Git object reads are from an owner-trusted checkout. Experimental files are created under OS temp and deleted in `finally`; original worktrees are not altered by the replay.

## Actual Windows 11 / Node 24 observations

Seven stages: two **new-path** placeholder batches (11 and 9), followed by exact source R2, R3, R4, R5, R1. The already existing `docs/strategy/README.md` is not stubbed, and its exact edit happens last. The final temporary tree has **21/21 source-path contents byte-identical** to pinned #578.

Real **proposed** #585 verifier runs after every stage, in both ordinary relative-link and optional `--ids` modes, over intended `docs/strategy` and focused `docs/strategy/ascout-v2`.

| Stage | Proposed ordinary link check | Full strategy `--ids` matched diagnostics | V2 subtree `--ids` matched diagnostics |
|---|---|---:|---:|
| Canonical base (before stages) | PASS | 1 | N/A |
| S0a (11 stub paths) | PASS | 1 | 1 |
| S0b (9 stub paths) | PASS | 1 | 1 |
| R2 (3 original files) | PASS | 6 | 6 |
| R3 (4 original files) | PASS | 7 | 7 |
| R4 (3 original files) | PASS | 82 | 82 |
| R5 (7 original files) | PASS | 65 | 65 |
| R1 (4 original files; index last) | PASS | **65** | **65** |

Counts above are matched missing-link/identifier/founder-approval diagnostic categories, not a ratified CI gate. The full final source **does not pass** the proposed `--ids` mode. This could reflect limitations in the proposed verifier's definition parser, not necessarily 65 distinct semantic errors in the source plan. Even the canonical base starts with 1 diagnostic.

**Ordinary link PASS is inadequate**: it does not prove that placeholders contain necessary definitions, references, intended anchors, or implementable plan content.

## Execution and qualification boundaries

- Read-only replay: `node scripts/planning/fd8-stage-verifier-replay.mjs scripts/planning/fd8-root-manifest.json`.
- Successful completed local replay returns **intentional exit 2**, `RESEARCH_NOT_RATIFIED`, `original_source_files_identical=21`.
- One earlier Windows process attempt terminated with OS code `3221225773` (`0xC0000135`). It was not qualified and the later successful local replay does not erase that failure.
- The checked verifier is an **unmerged proposed** implementation (#585), not a replacement for canonical governance. It does not validate full Markdown/anchor grammar or real per-PR Git diffs.
- Independent Alibaba OCR, Jev and Graft evidence for this separate replay grain remain NOT_RUN until actually executed.
- No source import, scanner run, founder ratification, merge or product implementation is authorized by these results.

## Admission disposition

**BLOCK path-stub adoption under current checks.** The path-only checks could pass incomplete placeholders; the optional ID checker fails on the canonical baseline and final source plan. Require a separately reviewed interim-document completeness contract, verified real stage patches, exact source identity, reliable ID/anchor checks and explicit founder FD8-B decision before any planning merge.
