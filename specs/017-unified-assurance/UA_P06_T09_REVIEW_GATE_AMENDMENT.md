# UA-P06-T09 Review Gate Amendment

**Status:** `PROPOSED / NOT_EFFECTIVE / FOUNDER_APPROVAL_REQUIRED`
**Ledger:** Issue #602
**Amends:** `UA_P06_IMPLEMENTATION_AUTHORIZATION.md` section 16 (task qualification discipline), for the UA-P06-T09 chain only
**Canonical base at proposal creation:** `ca6b6f514e5a8881e2cfa2789b5e5ea43e3aaaad`
**Prepared by:** a Claude coding agent. This document is a proposal; it is not a founder decision.

## 1. Purpose

UA-P06 section 16 requires, for every task PR, "Alibaba Open Code Review bound
to the exact head with zero unresolved material findings". Under the
zero-cost constraint no qualified OCR configuration is available. This
document proposes the narrowest substitute for **the five UA-P06-T09 PRs
only**, so they can reach a lawful merge decision without pretending an OCR
review happened.

```text
AMENDMENT_EFFECTIVE = NO
OCR_REQUIREMENT_WAIVED_FOR_T09 = NO
APPLIES_TO_T10_OR_LATER = NO
CONSTITUTION_CHANGED = NO
```

## 2. Preserved OCR evidence

All attempts used Alibaba OpenCodeReview `v1.12.13` (upstream `fabbdb29`).

| Attempt | Configuration | Result |
|---|---|---|
| #593 local 1 | Ollama 0.40.2, `qwen3:4b-instruct-2507-q4_K_M`, Windows host, CPU | `failed: timeout`, 0/1 files, session `6c8b3230-e15c-4766-9f1d-d98ce0c437e7` |
| #593 local 2 | same | `NOT_RUN`: owner RAM rule (start ≥ 6 GiB available) not met |
| Model qualification | same model on a GitHub-hosted runner, run `37969387764` of `AbdulazizShehri/ascout-ocr-review` | **NOT_QUALIFIED** against a rule fixed before any run: planted run timed out, 2 of 3 planted defects missed (path-prefix traversal, off-by-one), 1 critical false positive on the clean control |

Evidence: Issue #602 comments, PR #593 comments, `AbdulazizShehri/ascout-ocr-review` issue #1.
No OCR output from that model is review evidence. OCR status for every T09
PR is recorded as `NOT_RUN` or `NOT_QUALIFIED`, never `PASS`.

## 3. Why section 16 cannot be satisfied literally

1. Paid inference is outside the zero-cost gate (section 3.3 item 7).
2. The only zero-cost local model that runs on available hardware failed
   qualification and needs 2 to 2.5 hours per 30-line file.
3. A larger local model exceeds the available RAM and the runner time limit.

## 4. Proposed substitute (T09 chain only)

For PRs #593, #598, #594, #595 and #606 only, the OCR condition in section 16
is replaced by **all** of:

1. A founder GitHub review with state `APPROVED`, submitted from an account
   that did not author the PR, bound to the PR's exact head at merge time.
   Any later head change voids it. The review must be submitted by the
   founder personally. Automated agents have working credentials for more
   than one founder account, so no agent may submit, approve, or dismiss a
   review, and an approval whose origin is an agent session does not count.
2. The AI maintainer exact-head review remains recorded and labeled as not
   independent. It does not count toward item 1.
3. OCR status is recorded as `NOT_RUN` or `NOT_QUALIFIED` with links.

Every other section 16 condition stays in force unchanged: exact base and
predecessor, one-task scope, focused tests, exact-head Self Verification and
Project CI attempt 1 success on all six lanes, Jev evidence or exact
limitation, zero unresolved material threads, unchanged main/base/head/scope
before merge, guarded normal merge, verified merge result, and post-merge
Project CI attempt 1 success on all six lanes.

## 5. Explicit non-claims

- This does not change the requirement for UA-P06-T10 through T16.
- This does not amend the Constitution or weaken evidence-integrity,
  no-green-by-omission, source-binding or trust-boundary principles.
- This does not retroactively qualify #574, #575 or #576, which merged with
  OCR recorded as `NOT_RUN`; that deviation stays on record.
- A founder approval is a human review, not a security proof.

## 6. Effectiveness

This amendment becomes effective only when the founder approves this
document's exact head and it is merged canonically. Until then
`AMENDMENT_EFFECTIVE = NO` and no T09 PR may merge.
