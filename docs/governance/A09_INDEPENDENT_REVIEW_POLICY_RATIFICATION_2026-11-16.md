# Amendment A09: independent review policy (ratification record)

**Status: ratified by the founder on 2026-11-16.** The constitution moves from version 1.4.0 to 1.5.0.
The amendment text is in `.specify/memory/constitution.md`, under "Amendment A09 — Independent review
policy". The engineering agent (Claude, AI) drafted this record and the amendment text. A
fresh-context AI agent reviewed both before merge. Neither is a human review.

## 1. The founder's decision

On 2026-11-16, the founder gave the engineering agent a written decision titled "Founder decision:
remove mandatory human review gates and complete the project". Its operative points:

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
   - the comments in `src/assurance/containment/*.ts` that name a human security review. These are
     reconciled in the T1 engineering PRs.
   - These stay as they are on purpose. Labels that say an AI review "is not human review" stay true
     and are kept: E10, E6B and E6C, `pr-ai-review`, and the review-provider code. Principle IV's
     per-invocation human admission of a changed command surface is a runtime control, not a review
     gate, and is unchanged.
4. **Trust, scope, licensing, and complexity review** (the agent's assessment):
   - **Trust:** the gates themselves stay; only who may perform the review changes. Clause 4 keeps
     native evidence and controls mandatory for containment claims, and forbids a review from
     turning a failing or missing result into a pass.
   - **Residual risk:** an AI reviewer can miss what a specialist would find. Clause 5 states that
     limit in every claim, by forbidding "externally certified" or "human-audited".
   - **Scope:** unchanged. Clause 5 keeps the trusted-local scope until the founder separately
     authorizes otherwise.
   - **Licensing:** none.
   - **Complexity:** none added.
5. **Reconciliation of affected canonical specs:** this PR updates `STATE.md`, the FD-4 research doc,
   the #653 reviewer package, and the A08 draft. The containment source comments follow in the T1 PRs.

## 3. What did not change

- A08 is still only proposed. Ratifying A09 does not ratify A08.
- No release is authorized.
- Containment stays T0 until a tier passes A09 clauses 2 and 4 on its final commit.
- Exact-head CI, coverage, receipts, A07 exits, and receipt v1.0 are unchanged.
