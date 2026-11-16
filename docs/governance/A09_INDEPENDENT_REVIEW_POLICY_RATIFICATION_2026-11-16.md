# Amendment A09: independent review policy (ratification record)

**Status: adopted on 2026-11-16 under the founder's written decision and instruction to "prepare and
implement the appropriate founder-authorized governance amendment".** The constitution moves from
version 1.4.0 to 1.5.0. The amendment text is in `.specify/memory/constitution.md`, under "Amendment
A09 — Independent review policy". The engineering agent (Claude, AI) drafted this record and the
amendment text. The founder decided the policy but did not review this exact text before merge, and
may change it. Section 4 lists the independent reviews of this change.

## 1. The founder's decision

On 2026-11-16, the founder gave the engineering agent, in the session chat, a written decision titled
"ASCOUT — FOUNDER DECISION: REMOVE MANDATORY HUMAN REVIEW GATES AND COMPLETE THE PROJECT". These are
its governance passages, verbatim:

> I am the founder of Ascout, and I am explicitly changing our review requirements.
> I no longer require mandatory external human R1 reviews or human security sign-offs for Ascout.
> ChatGPT is authorized to perform technical and security reviews on my behalf. You may also use
> independent AI reviewers, including fresh-context security review agents, OpenCode, and other
> available models.
> This decision applies to PR #653, T1 sandbox security review, and future engineering review gates.
> However, AI reviews must be identified truthfully as AI reviews. Never fabricate a human signature,
> human identity, or human approval.

> Prepare and implement the appropriate founder-authorized governance amendment that:
> Removes mandatory human R1 review requirements. Replaces human-only security review gates with
> independent AI-assisted technical and security reviews. Requires reviewers to inspect exact code
> commits, security boundaries, tests, and evidence. Keeps independent review separate from
> implementation. Preserves explicit founder authorization for constitutional changes, public
> releases, payments, and other reserved actions. Does not weaken runtime security, fail-closed
> behavior, or test requirements.
> Record this message as my explicit founder decision, dated November 16, 2026.

Its further passages on T1 and the project ("A simulated test or an AI opinion is not evidence of successful isolation"; T1 "may be described as internally qualified under the amended AI-review policy … Do not describe it as externally certified or independently human-audited"; "No new public release is authorized by this message") are summarized below with the governance points:

- Mandatory external human R1 reviews and human security sign-offs are no longer required.
- ChatGPT, fresh-context security agents, OpenCode, and other models are authorized to perform
  technical and security reviews on the founder's behalf.
- The decision applies to PR #653, the T1 sandbox security review, and future engineering gates.
- AI reviews must be identified truthfully. No human signature, identity, or approval may be
  fabricated.
- Reviewers must inspect exact commits, security boundaries, tests, and evidence. Independent review
  stays separate from implementation.
- Explicit founder authorization is still required for constitutional changes, public releases,
  payments, and other reserved actions.
- Runtime security, fail-closed behaviour, and test requirements are not weakened.
- A simulated test or an AI opinion is not evidence of isolation. A qualified T1 may be called
  "internally qualified under the amended AI-review policy", never externally certified or
  independently human-audited.
- No new public release is authorized by that decision.

The founder has not been recorded as examining any code, and this record does not claim that they
did.

## 2. Governance procedure (constitution, Governance section)

1. **Explicit constitutional delta:** the amendment text is added as A09 after A07. Items 10 and 11 of
   the founding sequence now name an A09 independent review. The version becomes 1.5.0, and Last
   Amended becomes 2026-11-16.
2. **Rationale:** human-only gates had blocked #653 and the T1 work. The founder has decided that
   independent AI-assisted review, held to an explicit standard (exact commit, boundaries, tests,
   evidence, findings fixed, re-review of the final commit), meets Ascout's needs. The standard keeps
   the property that mattered: review independent of implementation, over real evidence.
3. **Affected artifacts:**
   - `STATE.md`: the references to human R1 and human security review gates;
   - `specs/017-unified-assurance/FD4_T1_ISOLATION_RESEARCH.md`: the T1 claim gate;
   - `specs/017-unified-assurance/PR653_HUMAN_R1_REVIEWER_PACKAGE.md`: now historical, because #653
     closed as superseded;
   - `specs/017-unified-assurance/PROPOSED_AMENDMENT_A08_STATEMENT_EVIDENCE.md`: its target version
     moves to 1.6.0;
   - forward-looking gates in `STATE.md` (E7 and FD-8 rows, E7 status), `E7A_TRUSTED_LOCAL_T0_SPEC.md`,
     `E8_MCP_E2E_DESIGN.md`, `E9_DISTRIBUTION_PREPARATION.md`, `GIT_METADATA_RACE_THREAT_MODEL_591.md`,
     `HISTORICAL_PR_DISPOSITION_2026-11-13.md`, `docs/GITHUB_INTEGRATION.md`,
     `docs/governance/REPOSITORY_SETTINGS_CHECKLIST.md`, and the comments in
     `src/assurance/containment/*.ts` and `tests/containment-*.test.ts`.
   - Historical records stay as written, because they describe what happened then: the v0.2.0 FD-6
     packet, the C1 design and C1c proof ("human R1 not verified"), the E8 decision log, and released
     CHANGELOG entries.
   - These stay as they are on purpose. Labels that say an AI review "is not human review" stay true
     and are kept: E10, E6B and E6C, `pr-ai-review`, and the review-provider code. Principle IV's
     per-invocation human admission of a changed command surface is a runtime control, not a review
     gate, and is unchanged. The test that the review-provider decision "never claims human R1" stays
     too: that is a truthful label.
4. **Trust, scope, licensing, and complexity review** (the agent's own assessment; section 4 records
   the independent review):
   - **Trust:** the gates themselves stay; only who may perform the review changes. Clause 4 keeps
     native evidence and controls mandatory for containment claims, and forbids a review from
     turning a failing or missing result into a pass.
   - **Residual risk:** an AI reviewer can miss what a specialist would find. Clause 5 states that
     limit in every claim, by forbidding "externally certified" or "human-audited".
   - **Scope:** unchanged. Clause 5 keeps the trusted-local scope until the founder separately
     authorizes otherwise.
   - **Licensing:** none.
   - **Complexity:** none added.
5. **Reconciliation of affected canonical specs:** this PR updates every artifact listed in item 3.

## 3. What did not change

- A08 is still only proposed. Ratifying A09 does not ratify A08.
- No release is authorized.
- Containment stays T0 until a tier passes A09 clauses 2 and 4 on its final commit.
- Exact-head CI, coverage, receipts, A07 exits, and receipt v1.0 are unchanged.

## 4. Independent reviews of this change

1. **Claude Opus 5.5, fresh-context agent (no access to the drafting conversation), 2026-11-16, commit
   `c2af586`.** It found no weakening of runtime security, A07, receipt v1.0, evidence rules, or
   Principle IV. It found:
   - **High:**
     - this record overclaimed ratification of the exact text;
     - this record stated a review before one had happened;
     - two `STATE.md` cells still required human review.
   - **Medium:**
     - "tool" or a context-sharing model could count as a reviewer;
     - "material change" was undefined, and reviews could be shopped;
     - several references were missed;
     - the decision text was not quoted.
   - **Low:**
     - reviewer labels could be vague;
     - the qualification phrase differed from the decision's wording;
     - the trust review was self-assessed.

   All ten were addressed in commit `b94d9a5`; the re-review below checked them.
2. **Claude Opus 5.5, fresh-context agent, 2026-11-16, commit `b94d9a5`.** It found no Critical or
   High problems, and confirmed in the text that all ten earlier findings were fixed. It found:
   - **Medium:**
     - `STATE.md` still said "founder-ratified";
     - this record claimed a re-review before one existed.
   - **Low:**
     - the #653 row in the disposition table was malformed;
     - three summary points were not quoted;
     - the E9 status was vague;
     - the CHANGELOG was missing from the list of kept records;
     - "all ten were fixed" was stated as fact.

   All seven were addressed in the following commit, and are claimed fixed. A re-review of that
   commit is recorded in the PR once it exists.
