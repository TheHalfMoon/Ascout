# FD8 Root-Plan Reslice Preflight — 2026-10-09

**Status:** `BLOCKED_FORWARD_LINKS` (expected; **not** an FD8 decision or plan adoption).
**Scope:** trusted-owner, read-only exact-head analysis. No checkout, merge, branch
mutation, independent model review, or runtime source execution.

## Exact source and reproduction

- Repository: `TheHalfMoon/Ascout`.
- Canonical base: `ca6b6f514e5a8881e2cfa2789b5e5ea43e3aaaad`.
- Original V2 root plan #578: `512b5bc14bdbe875a01c4a137ef134564c6bd1c8`.
- Audit PR #599: `a037eb00dbef39c365e9ae4ea868689c567bd20c` (initial qualified head).
- Manifest: `scripts/planning/fd8-root-manifest.json`.
- Command after fetching both commits into a **trusted** checkout:
  `node scripts/planning/audit-fd8-root.mjs scripts/planning/fd8-root-manifest.json`.
- Expected exit code: **2** (preflight blocked). Exit 0 is **not**
  approval or a general merge authorization; it only means the specific
  link-order audit detected no blocker.

## Observed evidence — Windows 11, exact head

| Measurement | Observation |
|---|---:|
| Source files in original diff | 21 |
| Files uniquely assigned to groups | 21 |
| Added lines (source and manifest) | 1,821 |
| R1 — files / added | 4 / 326 |
| R2 — files / added | 3 / 351 |
| R3 — files / added | 4 / 367 |
| R4 — files / added | 3 / 396 |
| R5 — files / added | 7 / 381 |
| Forward links to not-yet-introduced files | **20** |
| Bidirectional inter-group dependency pairs | **6** |
| Missing source/external links in full source | 0 |
| Scope/manifest errors | 0 |

The parent `docs/strategy/README.md` references `ascout-v2/README.md`
in R5; the executive decision in R1 references future architecture,
implementation and readiness documents. R4's master plan and task registry
have reciprocal links, and the full planning index references many stages.
Thus, **size-valid does not mean sequential-merge-ready**.

## Execution and boundaries

- `npm ci --ignore-scripts --no-audit --no-fund`: PASS.
- `npm run typecheck`: PASS.
- Targeted `tests/fd8-root-reslice-audit.test.ts`: **6/6 PASS**.
- Pinned root reslice report: `BLOCKED_FORWARD_LINKS` / exit 2, expected.
- No user code or donor runner executed. No reviewer or FD8 approval inferred.

## Next gate

Founder must explicitly choose FD8-B before any reslice admission. A
link-safe transition/placeholder design must be separately qualified
against the real planning verifier, preserving all 21 original file
identities and all 1,821 lines. Cross-group link cycles mean rearranging
the five groups alone cannot safely fix all references. The revised
design needs normal forward merges, original-content reconciliation,
exact-head CI, actual independent review and post-main verification;
**no** weakening of the existing 12-file/400-line policy.
