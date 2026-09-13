# Unit-Test Gap Detection — Wedge Slice 2

Second Spec 015 implementation slice under P015-03 authorization
(effective after PR #331 merge `1299346`, Issue #330 closeout; predecessor
slice: PR #332 merge `9145812`).

## What this slice adds

`src/quality/gap.ts`: deterministic mapping of test obligations to known
existing tests and execution facts, reporting every obligation that lacks
meaningful verification:

- `no-covering-test`: no known test covers the obligation;
- `covering-test-unexecuted`: tests are linked but none executed — a green
  suite never proves an obligation it never exercised;
- `blocked-by-conflict`: an unresolved linked requirement conflict blocks
  release regardless of tests;
- `obligation-unresolved`: a linked conflict id has no record;
- `oracle-advisory-only`: tests ran but the obligation oracle cannot gate
  release (derived, unknown, uncalibrated, or circular).

Output is sorted by obligation id for stable digests. Only obligations
with zero gaps count as verified (`verifiedObligationIds`).

## What this slice does not do

No test discovery automation, no execution, no candidate generation, no
benchmark corpus. Discovery of existing tests and execution facts remains
caller-supplied input; later slices bind them to runner evidence.

## Evidence

`tests/quality-gap.contract.test.ts` proves each gap reason, the
verified-only-with-zero-gaps rule, deterministic ordering, and strict
rejection of malformed test records.
