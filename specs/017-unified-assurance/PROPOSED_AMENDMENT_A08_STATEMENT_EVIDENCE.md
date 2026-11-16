# Proposed Amendment A08: additive statement-level coverage evidence

**Status: PROPOSED. NOT RATIFIED.** This is a draft for the founder to accept, change, or reject.
Nothing here is in force. Until the founder ratifies it, A07 clause 6 applies unchanged: receipt
schema v1.0 and its bytes stay as they are, and so do `check` exits. This proposal does not edit
`.specify/memory/constitution.md`. An AI agent drafted this text, and an independent AI review
checked it; neither is a human review.

Background: `STATEMENT_COVERAGE_RECEIPT_DESIGN_2026-11-16.md` (#779), sections 3 and 5, gate 1.

## 1. Explicit constitutional delta

On ratification:
- add the amendment below after Amendment A07;
- increment the constitution version from 1.4.0 to 1.5.0;
- update "Last Amended";
- reconcile `STATE.md` and the affected specs (Governance item 5).

> ### Amendment A08 — Additive statement-level coverage evidence
>
> Ratified by `<founder ratification reference>`. Scope is the receipt's changed-code exercise
> evidence. All M1 principles and A07 remain in force, except as clause 8 states.
>
> 1. A `check` receipt MAY carry statement-level exercise evidence for changed code. It stays at
>    `schema_version: "1.0"` under the additive lock-step policy (`RECEIPT_V1_ADDITIVE_LOCKSTEP`),
>    as Spec 004 (branches) and Spec 005 (environment) did.
> 2. A **changed statement** is any statement whose source span touches a changed line, including a
>    statement that spans several lines, only one of which changed.
> 3. Every receipt produced by an Ascout version that implements this amendment MUST carry statement
>    evidence availability **per test task**: `available`, `not_collected`, or `unavailable`.
>    Availability MUST NOT be inferred from an absent field. A consumer reading a receipt without the
>    field MUST treat it as legacy line-only evidence: it MUST show the line-level limit and MUST NOT
>    present it as statement-complete.
> 4. `not_collected` is permitted only for a runner whose engine cannot produce statement data. The
>    list of such runners is closed, and starts as pytest only. Vitest (with the istanbul and V8
>    providers) and Jest MUST be asked to produce statement data. Adding a runner to the list needs a
>    spec change. Under `not_collected`, line and branch evidence governs as before, and the receipt
>    MUST state that the line-level limit applies.
> 5. `unavailable` applies when a runner outside that list did not deliver usable statement data for
>    a changed file: the file was missing, corrupt, unparseable, over its size or shape limits, or had
>    no entry for that file. Every changed statement in the affected files is then UNRESOLVED.
> 6. A changed statement that is NOT_EXERCISED or UNRESOLVED makes the receipt materially incomplete.
>    The exit then follows A07's precedence (2, then 3, then 1, then 4, then 0). A line MUST NOT be
>    EXERCISED when any changed statement touching it is NOT_EXERCISED, and MUST NOT be EXERCISED when
>    any is UNRESOLVED. This only ever makes an existing line state stricter, never looser.
> 7. Provider output that has not passed native qualification on Linux, macOS and Windows with
>    fixtures where a line runs but one of its statements does not MUST NOT be reported as
>    `available`.
> 8. This amendment supersedes A07 clause 6 in two respects only:
>    - receipts may carry the fields and rules above. Receipts written by older Ascout versions stay
>      valid;
>    - the mapping from receipt state to `check` exit is unchanged, but a `check` run that exited 0
>      before MAY now exit 4 because of a statement gap. No run's exit becomes less strict.
>
>    Everything else in A07 clause 6 stays in force.
> 9. This amendment adds no engine, sandbox, network, service, or dependency, and no isolation
>    claim. Statement exercise is evidence that code ran under a test, not proof that it is correct.

## 2. Rationale

A line can be EXERCISED while a statement on it never ran, for example `a() || b()` on one line, or a
one-line arrow function that is defined but never called. Branch evidence closes some of these cases.
Statement records narrow the gap further, without a second receipt version. Some limits stay open:
- statement spans are coarser than expressions;
- the V8 provider approximates statements;
- pytest yields line evidence only.

Option B (receipt v2) would force every consumer to handle two versions, and buys no extra assurance
(#779, section 4).

## 3. Affected artifacts

These are the artifacts an implementation would change, each in its own reviewed PR after
ratification. Nothing changes now.

- **Receipt model and semantic validator:** `src/receipt/model.ts`, including `exerciseHasMaterialGap`
  and the receipt state. Its issue types are in `src/receipt/json.ts`.
- **JSON schema:** `src/receipt/receipt-v1-schema.ts` and the embedded-schema equality test.
- **Receipt construction:** `src/receipt/build.ts`.
- **Mapping:** `src/exercise.ts`.
- **Runner arguments:** `src/tools/vitest.ts` and `src/tools/jest.ts`. They request only `lcov`
  today. They would also request the istanbul JSON report.
- **New parser:** a new parser under `src/coverage/`, beside `lcov.ts`, for the istanbul JSON report.
  Nothing parses that format today.
- **Renderers:** `src/receipt/agent.ts`, `src/receipt/json.ts`, the terminal output, and the PR
  evidence summary.
- **Consumers:** `ascout_last_check` (MCP), `ascout test`, and PR evidence collection.
- **Adversarial receipt corpus:** gains statement cases.
- **Specs:** cross-references in Spec 004 and Spec 005, plus a new spec for the schema delta (gate 2 of
  #779).

## 4. Trust, scope, licensing, and complexity review

These are the agent's assessments, for the founder to check:

- **Trust: stricter outcomes, but a new untrusted input.** The new rules can only turn an exit 0 into
  exit 4, never the reverse. But the istanbul JSON report is a new input, written by a test process
  that repository code controls, and parsed by new code. The spec must set size, depth, and shape
  limits on it, and reject spans outside the file, overlapping spans, and counts for statements that
  do not exist. Any rejection means `unavailable`, never a pass. The adversarial corpus must cover
  each case.
- **Scope:** changed-code evidence only. There is no new command and no new engine.
- **Licensing:** no new dependency. The parser is new code in Ascout, not a library.
- **Complexity:** moderate, a little more than Spec 004 (branches), because of the new parser.
- **Compatibility:**
  - Older receipts validate under the new validator, and are shown as line-only evidence.
  - An older strict validator rejects a receipt carrying statement fields. That is the documented,
    unsupported pairing under the Spec 005 policy.

## 5. What ratification would and would not authorize

- **It would authorize:** writing the gate 2 spec, then implementing it in reviewed PRs, each held to
  the usual exact-head CI and complete-receipt bar, then native qualification on Linux, macOS and
  Windows (gate 3).
- **It would not authorize:** any release, a receipt v2, a weaker exit for any case, or reporting a
  provider as `available` before its qualification.

## 6. Founder decision

Record one of these. The agent records nothing here.

- [ ] Ratify as written (constitution 1.5.0).
- [ ] Ratify with changes: ______
- [ ] Reject; receipts stay as they are.

Founder: ______ Date: ______
