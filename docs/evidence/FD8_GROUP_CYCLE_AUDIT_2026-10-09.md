# FD8 Group-Cycle Audit — 2026-10-09

**Status:** `BLOCKED_FORWARD_LINKS`; founder FD8-B **PENDING**.  
**Scope:** a read-only, owner-trusted audit, not a ratified planning update,
independent code review, merge authorization, or V2 product execution.

## Pinned sources and reproducibility

- Repository: `TheHalfMoon/Ascout`.
- Base `main`: `ca6b6f514e5a8881e2cfa2789b5e5ea43e3aaaad`.
- Original PR #578: `512b5bc14bdbe875a01c4a137ef134564c6bd1c8`.
- Parent audit: PR #599, `b1e48e0eb9c4e12db119dd45d492fbf2f196e97f`.
- Graph implementation: `scripts/planning/fd8-link-graph.mjs`;
  integration: `scripts/planning/audit-fd8-root.mjs`.
- Reproduce after fetching the two pinned commits into a trusted checkout:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npx vitest run tests/fd8-root-reslice-audit.test.ts tests/fd8-link-graph.test.ts
node scripts/planning/audit-fd8-root.mjs scripts/planning/fd8-root-manifest.json
```

The final command intentionally exits **2** when its link order is blocked.

## Actual read-only Windows execution against pinned source

| Check | Observed |
|---|---|
| T09-independent graph + root audit Vitest | 12/12 PASS (2 files) |
| TypeScript | PASS |
| Original source files / unique mapped files | 21 / 21 |
| Original added lines | 1,821 |
| Forward links for proposed five-part sequence | 20 |
| Direct reciprocal group pairs (older check) | 6 |
| **Full strongly connected components containing cycles** | **[0, 1, 2, 3, 4]** (all five groups) |
| Source/relative-link inconsistencies | 0 |
| Audit response | `BLOCKED_FORWARD_LINKS`, exit 2 |
| Merge authorization / independent review | `false` / `false` |

Indices are **zero-based** and correspond to `FD8-B-R1…FD8-B-R5`.
Every proposed group is part of one strongly connected component under
the currently extracted Markdown dependencies. Thus **there is no
dependency-first permutation of these five intact groups** that can
make all links available at every intermediate stage.

## Conservative interpretation

This is a useful *blocking certificate* for the current exact file
grouping, not proof that FD8-B is impossible. A different grouping or
an explicit, reviewed staging strategy with
`INCOMPLETE / NOT EFFECTIVE` placeholders could remove the problem.
Any design must still preserve exact source-text identity,
link/acceptance-ID verifiability, genuine independent review, and normal
merge commits; it cannot promote partial documentation into canonical
V2 authority. No FD8-A/B decision was recorded by this computation.

The checker currently extracts ordinary inline Markdown links rather
than parsing every Markdown feature or arbitrary dynamically constructed
references. It does not replace the full planning-document verifier.
