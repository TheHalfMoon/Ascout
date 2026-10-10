# UA-P06 Qualified OCR Configuration Proposal

**Status:** `PROPOSED / NOT_EFFECTIVE / FOUNDER_APPROVAL_REQUIRED`
**Ledger:** Issue #602
**Would amend:** `UA_P06_IMPLEMENTATION_AUTHORIZATION.md` section 16 (task qualification discipline), for UA-P06-T10 through T16
**Canonical base at proposal creation:** `ca6b6f514e5a8881e2cfa2789b5e5ea43e3aaaad`
**Prepared by:** a Claude coding agent. This document is a proposal, not a founder decision.

## 1. Problem

Section 16 requires "Alibaba Open Code Review bound to the exact head with
zero unresolved material findings" for every UA-P06 task, but does not define
which OCR configuration counts. Under the zero-cost gate (section 3.3 item 7)
no configuration has met that bar so far. PR #609 proposes a one-time T09
substitute; this document instead proposes a **standing definition** so that
later tasks neither block indefinitely nor inherit the T09 exception.

```text
PROPOSAL_EFFECTIVE = NO
REVIEW_REQUIREMENT_WEAKENED = NO
T09_EXCEPTION_EXTENDED = NO
```

## 2. Routes assessed (evidence as of 2026-10-10)

| Route | Cost | Independence from authoring model | OCR evidence strength | Status |
|---|---|---|---|---|
| Local small model (`qwen3:4b-instruct-2507`) via OCR | none | yes | full OCR manifest | **NOT_QUALIFIED**: missed 2/3 planted defects, 1 critical false positive, 2–2.5 h per 30-line file (#602) |
| Larger local model | none | yes | full | infeasible: available RAM and runner time limit |
| GitHub Models via `GITHUB_TOKEN` | none | yes | full | **unavailable**: inference API retired on 2026-07-30 per GitHub documentation |
| OCR-managed run on a free hosted inference tier | none in money; one-time founder key setup | yes | full OCR manifest | **candidate**, unqualified |
| OCR Delegation Mode via an independent host agent (for example Codex) | existing subscription | yes | **partial**: OCR outputs file selection and rules only; no session, manifest, or range-bound verdict | candidate for advisory use only |
| Founder human review | founder time | yes | not OCR | T09 only, via #609 |
| Paid inference API | money | yes | full | excluded by section 3.3 item 7 |

## 3. Proposed standing definition

An OCR review satisfies section 16 for a task PR only when **all** hold:

1. **OCR-managed execution.** `ocr review --format json` ran under OCR's own
   orchestration, and its run manifest binds `resolved_base` and
   `resolved_head` to the PR's exact base and head. Delegation Mode output
   does not qualify.
2. **Qualified configuration.** The exact provider, model identifier, and
   OCR version passed the pre-registered planted/clean qualification
   (`AbdulazizShehri/ascout-ocr-review`, `harness/ground-truth.json`): all
   planted defects found, no material false positive on the clean control,
   both runs complete. The qualification is valid for 90 days and is void on
   any change to the provider, model identifier, or OCR version.
3. **Complete coverage.** Every selected item is `completed`. Any `failed`,
   `timeout`, or budget-truncated item makes the review `INCOMPLETE`, never
   `PASS`. Excluded files are recorded as `NOT_REVIEWED`.
4. **Independence.** The model family differs from the one that authored the
   change, and no agent session may edit, filter, or summarize OCR output
   before it is recorded.
5. **Adjudication.** Every material finding is fixed with a forward commit
   (which requires a fresh review of the new head) or rejected with a
   recorded reason. The founder may override a rejection.
6. **Egress control.** Only public-repository content may be sent to a
   free hosted tier, and only after a secret scan of the reviewed diff
   returns zero hits. The workflow runs with `contents: read`, holds only
   the provider key as a secret, and pins OCR and every action by SHA.

If no qualified configuration is available, the gate is `BLOCKED`. It is
never waived by this definition.

## 4. Security and governance tradeoffs

- **Disclosure.** Free tiers may retain prompts, use them for training, and
  allow human review (for example, Gemini's free-tier terms). Acceptable
  only because Ascout is public; the secret scan in item 6 reduces, but does
  not eliminate, accidental disclosure of credentials or personal data in a
  diff.
- **Prompt injection.** Reviewed code is untrusted input to the reviewer.
  OCR's tools are read-only, the runner has no repository write token, and
  OCR output is advisory input to adjudication, never an automatic merge
  signal.
- **Provider volatility.** Free models and quotas change without notice.
  Requalification on any change (item 2) and `BLOCKED` on absence (section 3)
  prevent silent downgrade to a weaker model.
- **Quota truncation.** Rate limits can cut a review short; item 3 turns
  that into `INCOMPLETE` rather than a clean result.
- **Model fallibility.** A qualified model can still miss defects. OCR
  remains one gate among exact-head CI, maintainer review, and Jev evidence,
  not a security proof.

## 5. Founder actions required for effectiveness

1. Ratify or reject this exact document head.
2. If ratified and a hosted candidate is wanted: create a free account with
   a provider whose terms you accept, and store its key only as a secret in
   the runner repository. Agents must not create accounts or handle the key.
3. Qualification then runs; only a `QUALIFIED` result makes the route usable.

## 6. Non-claims

- Does not change the Constitution or any principle protecting evidence
  integrity, no-green-by-omission, source binding, or trust boundaries.
- Does not apply to the T09 chain, which is governed by #609 or by this
  section 16 as written.
- Does not retroactively qualify #574, #575, or #576.
