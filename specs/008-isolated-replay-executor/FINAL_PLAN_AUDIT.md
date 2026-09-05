# Specification 008 — Final Plan Audit Gate

## Status

`FINAL_PLAN_AUDIT = PENDING_INDEPENDENT_EXACT_HEAD_REVIEW`

This file defines the audit gate. It does **not** claim that an independent audit has already occurred.

All review/CI evidence from the pre-amendment and pre-rerun-repair planning heads is stale and cannot qualify the final repaired head.

## Exact-head audit questions

An independent reviewer must examine the complete final Spec 008 planning diff and answer whether any material issue exists in:

1. canonical authority or task ordering;
2. trust-boundary expansion;
3. workflow permissions or secret exposure;
4. arbitrary/untrusted execution risk;
5. exact `create`-event branch-ref admission and fixed branch-to-case mapping;
6. exact `github.run_attempt == '1'` admission and prevention of native GitHub rerun execution;
7. one-shot run-ref creation, source/head binding, and no-repoint/no-recreate/no-rerun rule;
8. exact runtime/package-manager provenance;
9. donor acquisition versus measured-oracle network claims;
10. benchmark evidence integrity or no-green-by-omission;
11. historical-result immutability;
12. scope creep into product/harness/manifest/dependency/release surfaces;
13. unnecessary complexity versus the observed T111 blocker;
14. practical executability through the connected Git ref authority without workflow dispatch;
15. missing implementation qualification or post-merge gates.

## Required audit outcome

Planning may merge only if independent exact-head evidence reports no unresolved material findings. Any material finding requires prospective repair and makes all prior exact-head review evidence stale.

## Fresh review gate

After the final-plan audit is satisfied, canonical governance additionally requires fresh exact-head cross-artifact consistency and branch-purity review before merge. If one independent review explicitly and substantively covers both this final-plan audit checklist and exact-head cross-artifact/branch-purity on the unchanged final head, the planning closeout ledger must state that dual coverage precisely; otherwise a separate fresh review is required.

## Implementation boundary

Even a clean planning audit grants no workflow implementation or task-run ref creation authority. A separate explicit authorization remains mandatory.