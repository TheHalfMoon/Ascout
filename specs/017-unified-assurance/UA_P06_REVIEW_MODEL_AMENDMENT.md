# UA-P06 Review Model Amendment — OCR Delegation Mode with Claude Code

**Status:** `FOUNDER_DECISION_RECORDED / EXACT_HEAD_APPROVAL_REQUIRED / NOT_EFFECTIVE`
**Ledger:** Issue #618
**Amends:** `UA_P06_IMPLEMENTATION_AUTHORIZATION.md` section 16 (task qualification discipline)
**Canonical base at proposal creation:** `489db3081aff2833050848a29a1441f8ce4b2827`
**Prepared by:** a Claude coding agent, on the founder's instruction of 2026-10-11.

## 1. Purpose

UA-P06 section 16 requires, for every task PR, a "fresh maintainer exact-head
review with zero material findings" and "Alibaba Open Code Review bound to
the exact head with zero unresolved material findings". It does not define
which OCR mode or which reviewer satisfies the OCR condition. No zero-cost
model-backed OCR configuration has qualified (see #602, #609, #613), so the
condition has blocked every UA-P06-T09 merge.

On 2026-10-11 the founder decided the Ascout review policy (section 2). This
document applies that decision to section 16 through the established
founder-authorization process: an exact-head founder approval of this
document, canonical admission, and a recorded effectiveness check (the
#566/#567 precedent).

```text
FOUNDER_POLICY_DECISION = RECORDED (2026-10-11, section 2)
EXACT_HEAD_FOUNDER_APPROVAL = PENDING
AMENDMENT_EFFECTIVE = NO
CONSTITUTION_CHANGED = NO
```

## 2. Founder decision (2026-10-11)

The founder authorized:

1. the official Alibaba Open Code Review (https://github.com/alibaba/open-code-review)
   **delegation mode** with **Claude Code as the reviewer**, together with Jev
   and the applicable CI, security, and E2E checks;
2. the exclusion of Codex from all future review workflows;
3. no paid review services and no usage-based API billing;
4. truthful labeling: a Claude review of Claude-authored code is a
   **self-review**, never an independent review;
5. this amendment, so that the review model is permitted under section 16.

## 3. Amended section 16 conditions

For every UA-P06 task PR merged after this amendment becomes effective, the
two review conditions of section 16 are satisfied **only** by an exact-head
review record meeting **all** of the following. Every other section 16
condition stays in force unchanged.

1. **OCR delegation bound to the exact range.** The output of
   `ocr delegate preview --from <merge_base> --to <head>` and
   `ocr delegate rule <selected paths>` from the official OCR release (its
   version and upstream commit recorded), for the PR's exact base-branch
   tip and head.
2. **Reviewer.** Claude Code performs the review of every OCR-selected file,
   applying the OCR rules and the delegation-mode severity policy (High and
   Medium reported; Low discarded).
3. **Complete coverage.** Every changed file that OCR excludes (for example
   tests by `default_path`) is reviewed separately, and the record lists each
   excluded file and how it was reviewed. A changed file with no review is
   `INCOMPLETE`, never a pass.
4. **Findings.** Zero unresolved High or Medium findings at the exact head.
   A finding is resolved only by a fix reviewed at the new head or by a
   written adjudication in the record. Any head change requires a fresh
   record for the changed range.
5. **Truthful independence labeling.** The record identifies which reviewed
   commits are Claude-authored (self-review) and which are not. It never
   describes a Claude self-review as independent. For commits whose
   authoring tool is not recorded, it does not claim independence.
6. **Evidence on GitHub.** The OCR outputs, diff, findings, record, and Jev
   result are committed to an evidence repository or to the PR, bound to
   the exact SHAs, and secret-scanned before publication. A summary comment
   on the PR links the record.
7. **Excluded routes.** Codex, paid review services, and usage-billed APIs
   (including DashScope and paid cubic/Qodo/CodeRabbit tiers) are not used
   and do not count. Free automated comments that arrive without request
   may be read, and their material findings resolved, but they do not
   satisfy this condition.

The same record satisfies the "fresh maintainer exact-head review" condition.

## 4. Accepted risk

Under this model, Claude-authored UA-P06 code is reviewed only by Claude.
The founder accepts that this is **not independent review** and that model
blind spots shared between author and reviewer are not mitigated by this
condition. Jev, exact-head CI on all six lanes, focused tests, security
checks, and E2E checks remain mandatory and are the independent mechanical
controls.

## 5. Scope

- Applies to UA-P06 task PRs, including the T09 chain (#593, #598, #594,
  #595, #606), which must be **revalidated at their exact current heads**
  after effectiveness. Records made before effectiveness are not reused as
  gate evidence.
- Applies to PRs that make UA-P06 governance documents effective, in place
  of the OCR and maintainer-review items of section 19.

## 6. Superseded proposals

- #609 (founder GitHub approval as the T09-only substitute): superseded.
- #613 (standing qualified model-backed OCR configuration using free hosted
  providers): superseded for UA-P06; it would require account and key
  handling the founder has not authorized.

Both are closed as superseded only after this amendment becomes effective.

## 7. Explicit non-claims

- This does not amend the Constitution. Constitution v1.3.0 does not require
  OCR or independent code review; its "independent final plan audit" is a
  planning-sequence step and is unaffected.
- This does not weaken evidence-integrity, no-green-by-omission, source
  binding, or trust-boundary principles.
- This does not retroactively qualify #574, #575 or #576; that deviation
  stays on record.
- Earlier Codex review records stay on record as history and are not gate
  evidence under this amendment.
- This does not authorize any new task, path, or mutation surface.

## 8. Effectiveness gate

This amendment becomes effective only when all of the following hold:

1. one-file diff (this document) against an exact canonical base;
2. exact-head Self Verification attempt 1 success and Project CI attempt 1
   success on all six lanes;
3. an exact-head review record under section 3 (labeled self-review) and Jev
   evidence or an exact recorded limitation;
4. zero unresolved material threads;
5. explicit founder approval of this document's **exact head**;
6. unchanged main, base, and head immediately before merge; guarded normal
   merge with the exact expected head; verified merge tree, parents,
   signature, and main;
7. post-merge Project CI attempt 1 success on all six lanes;
8. an effectiveness record on Issue #618.

Only after all conditions:

```text
UA_P06_REVIEW_MODEL_AMENDMENT = EFFECTIVE
UA_P06_SECTION_16_OCR_CONDITION = SATISFIABLE_BY_SECTION_3_RECORD
```
