# FD8 Link-Staging Research Candidate — 2026-10-09

**State:** SIMULATED_ONLY_BLOCKED_GOVERNANCE. **FD8-B is not founder-ratified.**
Related: #578, #599, #600, #601, #602.

This change provides a **read-only bounded sizing simulation**, not a complete
planning-document verifier and not a proposal to land incomplete Markdown
documents on canonical main. Its inputs are the existing pinned-root preflight
and its exact manifest; source-file contents are never edited.

## Projected candidate only

The all-five-group SCC in #600 makes simple group reordering impossible.
A conditional path-stub strategy would create all 21 final paths with highly
visible non-effective content before inserting the original source bytes.

| Candidate grain | Changed files | Projected added lines |
| --- | ---: | ---: |
| S0a: first path stubs | 11 | 11 |
| S0b: remaining path stubs | 10 | 10 |
| R1: exact #578 source | 4 | 326 |
| R2: exact #578 source | 3 | 351 |
| R3: exact #578 source | 4 | 367 |
| R4: exact #578 source | 3 | 396 |
| R5: exact #578 source | 7 | 381 |

These are **arithmetic projections, not real Git patch measurements**.
They neither establish document soundness in intermediate states nor
satisfy Diffcipline verification-command policy. Placeholder merges
remain **not authorized**; the founder gate is PENDING.

## Run against trusted, pinned source

In a trusted checkout containing #578 and #600 commits:

    npx vitest run tests/fd8-staging-research.test.ts
    node scripts/planning/fd8-staging-research.mjs scripts/planning/fd8-root-manifest.json

The CLI intentionally exits 2 when its simulation runs as designed, because
it must not be confused with merge qualification. A malformed or stale input
exits 3. The simulator does not run Git writes, network calls, or LLMs.

## Outstanding blocker proof obligations

1. Demonstrate that every actual intermediate stage satisfies effective
   Markdown-link and identifier verification, including anchors, reference
   links, images and cross-document IDs; missing/unsupported cases BLOCK.
2. Establish how an incomplete stub stage could exist without misleading
   canonical consumers or weakening the planning verifier. If this cannot be
   governed safely, reject path-stub staging.
3. Measure **real** per-grain Git diffs, verify exact final pinned source blob
   identities for all 21 Markdown files and eliminate every stub marker.
4. Qualify independent review, Jev advisory, Graft, and exact-head CI
   without treating a diagnostic rerun as an original-attempt PASS.
5. Obtain an explicit founder FD8 decision before changing canonical plans.

No FD8 decision, actual implementation, end-to-end scanner execution, or
independent Alibaba OpenCodeReview result is claimed by this artifact.
