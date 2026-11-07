# UA-P07 Implementation Authorization — Deep Security Audit Orchestration

**Status:** `PROPOSED / NOT_EFFECTIVE / FOUNDER_APPROVAL_REQUIRED`
**Ledger:** Issue #634
**Authorization base:** `ea93553a5423fd47f12a6bf282820dd199b994d4`
**Phase:** `UA-P07 — Deep Security Audit orchestration`
**Prepared by:** a Claude coding agent. This is a decision packet, not a founder decision. Claude may not authorize, approve, or make it effective.

## 1. Purpose

This artifact proposes the only implementation authority that may make UA-P07 product-source mutations after it becomes canonically effective. It grants no authority while proposed.

```text
UA_P07_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
UA_P07_IMPLEMENTATION_AUTHORIZED = NO
UA_P07_CONSTITUTION_AMENDMENT_A07 = PROPOSED / NOT_RATIFIED
ASCOUT_PROJECT_COMPLETE = NO
```

## 2. Canonical predecessors

```text
CANONICAL_MAIN = ea93553a5423fd47f12a6bf282820dd199b994d4
UA_P06 = CLOSED_CANONICAL / COMPLETE (T01-T16; closeout record on Issue #602)
CONSTITUTION_VERSION = 1.3.0 (A04, A05, A06 ratified)
UA_P07_IMPLEMENTATION_AUTHORIZED = NO
```

## 3. Founder decision points

The phase cannot be authorized without these decisions. Recommendations are the agent's; the founder decides.

### D1 — Model execution policy for hunter and verifier stages

The blueprint's bounded hunters and fresh-context verifier are model-driven. Constitution Principle V and the M1 constraints forbid a required LLM and any model or API key on the core path.

| Option | Meaning |
|---|---|
| **D1-A (recommended)** | Deterministic core only: reconnaissance, coverage ledger, candidate intake, validation policy, and report are deterministic. Hunter and verifier waves are **optional engines** that run only through a user-installed local agent CLI or explicit user-funded key (BYOK), recorded with provider identity and budget; absent, they are explicit `NOT_RUN`. No Ascout-operated inference. |
| D1-B | Deterministic only: no agent execution in UA-P07 at all; agent waves deferred to a later phase. |
| D1-C | Require an agent engine for deep audit (conflicts with the Constitution; would need a broader amendment). Not recommended. |

### D2 — CLI surface

The master plan lists `ascout security --deep`. The effective T14 amendment (decision B) limits `ascout security` to `--format json|terminal`.

| Option | Meaning |
|---|---|
| **D2-A (recommended)** | Add exactly `--deep` to `ascout security` in a single task (T09), local and read-only by default; without a configured agent engine the deep stages report `NOT_RUN` and the command exits 1, consistent with decision A. Requires a bounded CLI amendment inside this authorization. |
| D2-B | No CLI change in UA-P07; deep audit exists only as a library contract and report, and the CLI follows in a later phase. |

### D3 — Donor admission (`cloudflare/security-audit-skill`)

Live-verified: public, MIT, pin `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8` (2026-09-14, "Clarify guidance and full audit modes"). The repository holds Markdown method guides, `report-schema.json`, and two validators (`validate-coverage-ledger.cjs`, `validate-findings.cjs`).

| Option | Meaning |
|---|---|
| **D3-A (recommended)** | Method donor only: re-express stages, coverage-ledger and finding schemas as Ascout-owned TypeScript contracts with attribution in `THIRD_PARTY_NOTICES.md`; vendor no code. |
| D3-B | Vendor `report-schema.json` and the two validators under `vendor/` with the MIT notice. |

### D4 — Constitution amendment A07

Required because model-assisted hunting and verification are outside the M1 wedge and Amendment A06. Proposed text in section 4.

## 4. Proposed bounded amendment A07 (v1.3.0 to v1.4.0)

Ratified only if the founder ratifies it with this authorization. Mechanical application to `.specify/memory/constitution.md` must land before UA-P07-T01.

1. Ascout may orchestrate a deep security audit adapted from the Cloudflare security-audit method: reconnaissance, coverage ledger, bounded hunting, candidate findings, validation, independent per-finding verification, and report. The method donor is never a trust root.
2. The deterministic stages are core. Model-assisted hunting and verification are optional engines; when absent, unqualified, over budget, or denied they are explicit `NOT_RUN` or `INCOMPLETE`, never a pass.
3. Model output is always a `CANDIDATE`. A finding becomes validated only with required concrete evidence for its class and an independent fresh-context verification; hunter consensus alone never validates.
4. Repository content is hostile input: instructions found in source, comments, or documents are never followed and never widen authority.
5. Every reviewed, unreviewed, and unreadable region is explicit in the coverage ledger; skipped scope is never clean.
6. UA-P07 is read-only by default and introduces no dynamic network effect against targets.
7. All local-zero-cost gates remain enforced: no Ascout-operated inference, no required model or key, no silent paid fallback; any user-funded provider use is explicit and recorded.

## 5. Authorized task set after effectiveness

Exactly the registry tasks:

| Task | Deliverable | Acceptance boundary |
|---|---|---|
| UA-P07-T01 | Re-pin Cloudflare skill | Exact source, method, license (D3) |
| UA-P07-T02 | AuditPlan | Recon, coverage, hunt, verify stages explicit |
| UA-P07-T03 | Reconnaissance evidence | Read-only source facts with provenance |
| UA-P07-T04 | CoverageLedger | Reviewed/unreviewed/unreadable scope explicit |
| UA-P07-T05 | Bounded hunter orchestration | Agents cannot gain new effect authority (D1) |
| UA-P07-T06 | Candidate finding intake | Model output remains CANDIDATE |
| UA-P07-T07 | Fresh-context independent verifier | No blind restatement of the originating model |
| UA-P07-T08 | Validation policy | Required concrete evidence per finding class |
| UA-P07-T09 | Deep audit report/JSON (and D2 CLI if chosen) | Coverage debt and rejected findings visible |
| UA-P07-T10 | Injection/consensus adversarial corpus | Consensus alone never validates |
| UA-P07-T11 | P7 qualification | Read-only deep audit proven; hard gates zero |

One task, one branch, one PR. No UA-P08 or later implementation is authorized by implication.

## 6. Positive mutation surface after effectiveness

```text
src/assurance/audit/**
tests/assurance-audit-*.test.ts
THIRD_PARTY_NOTICES.md (UA-P07-T01 only: donor attribution)
vendor/cloudflare-security-audit-skill/** (UA-P07-T01 only, and only if D3-B is chosen)
```

If D2-A is chosen, UA-P07-T09 may additionally edit exactly these paths, and in them only the
`ascout security` usage line (`[--format json|terminal]` → `[--deep] [--format json|terminal]`),
`--deep` parsing and dispatch, and the corresponding positive/negative tests:

```text
src/cli.ts
README.md
tests/assurance-check-compatibility.test.ts
tests/assurance-phase-qualification.test.ts
tests/assurance-phase-recovery-qualification.test.ts
tests/assurance-review-p03-t15.test.ts
tests/assurance-security-t14.test.ts
tests/assurance-security-t16.test.ts
```

These are every file on main `ea93553` that pins the `ascout security` usage line (verified by
search). The task PR may not add paths to this list; any further need stops the task and
returns to an amendment.

`src/assurance/security/**` and every earlier-phase surface are read-only; P07 consumes UA-P06 observations only through their exported contracts.

## 7. Required hard-zero invariants

```text
hunter_consensus_validates_finding = 0
model_output_promoted_without_independent_verification = 0
candidate_validated_without_required_evidence = 0
skipped_or_unreadable_scope_presented_as_reviewed = 0
repository_instruction_followed_or_authority_widened = 0
verifier_reuses_hunter_context = 0
network_effect_against_target = 0
required_model_or_key_on_core_path = 0
silent_paid_provider_fallback = 0
existing_check_test_review_security_semantic_regression = 0
```

## 8. Qualification discipline

Same as UA-P06 section 16 under the effective review-model amendment (#619): exact base and predecessor, one-task scope, focused tests, exact-head Self Verification and six-lane Project CI attempt 1, §3 review record (official OCR delegation with Claude, labeled self-review), Jev, Diffcipline, E2E where a built artifact exists, zero unresolved threads, guarded normal merge, post-merge CI attempt 1.

## 9. Effectiveness gate

Effective only after: founder decisions D1–D4 recorded; founder approval of this document's exact head; one-file diff; exact-head CI attempt 1; §3 review record; zero threads; guarded merge; post-merge CI; and an effectiveness record on Issue #634. The Constitution v1.4.0 mechanical application PR must then land before UA-P07-T01.
