# Specification 010 Tasks — Selector Shadow Verification

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #261

## Dependency order

```text
T117 -> T118 -> T119
```

No successor starts before its predecessor is durably closed canonical.

---

## T117 — Selector-shadow comparator and contracts

**State:** `PLANNED / IMPLEMENTATION_NOT_AUTHORIZED`

### Authorized candidate paths after separate implementation authorization

Exactly:

- `benchmarks/selector-shadow.mjs`
- `tests/t117-selector-shadow.contract.test.ts`

### Required behavior

Implement the repository-internal comparator defined by `spec.md` and `plan.md`:

1. consume exact Spec 006 receipt/envelope;
2. verify envelope shape/classification and exact receipt SHA-256 binding;
3. prove current reconstructed M/HT subject cleanliness;
4. require exactly one comparable normal-admission Ascout test task;
5. require root `scripts.test == "vitest run"` and already-installed local Vitest;
6. execute one bounded full-suite structured JSON reference with no shell, retry, or implicit install and an exact 10-minute timeout;
7. extract exact full-suite failed `(path, fullName)` identities;
8. extract exact Ascout test-task `(path, rule_or_test_id)` identities;
9. compare exact sets and publish every unmatched full-suite identity;
10. repeat source-stability proof after reference;
11. write one bounded deterministic `SELECTOR_SHADOW_NON_GATING` observation outside repository source identity;
12. preserve `UNAVAILABLE` separately from no-miss;
13. make an observed selector miss a successful measurement, not a harness failure.

### Focused proof

The focused contract file must cover all material cases listed in `plan.md §14`, including digest replacement, source mismatch/drift, task comparability states, command-contract refusal, no implicit install, exact 10-minute timeout/no retry, structured report failures, path/test identity boundaries, exact match/miss behavior, deterministic ordering, privacy, and non-gating miss semantics.

### Hard prohibitions

No `src/**`; Receipt v1/schema/validator; selector/widening; CLI; package/dependency; Project CI; workflow; benchmark-result; Spec 007; release/tag/publication mutation.

### Qualification gate

Before T117 may merge:

- exact current canonical base reverified;
- branch contains only the two authorized paths;
- focused tests pass;
- full repository `npm test`, `npm run typecheck`, and `npm run build` pass as applicable;
- exact-head Self Verification succeeds for the PR head as governed;
- Project CI original attempt succeeds in all six required OS/Node lanes;
- fresh independent substantive exact-head review has no material unresolved findings;
- unresolved material review threads = `0`;
- live rulesets/protection reverified;
- canonical base unchanged before guarded merge;
- expected-head normal merge only;
- post-merge ordered parents/tree/signature/PR/main proof recorded;
- T117 issue closed `completed` with exact evidence.

On any material mismatch: `NO_GO / RETURN_TO_PLANNING`.

---

## T118 — Existing self-verification workflow integration + live observation

**State:** `BLOCKED_BY_T117 / IMPLEMENTATION_NOT_AUTHORIZED`

### Authorized candidate path after separate successor authorization

Exactly:

- `.github/workflows/self-verify.yml`

### Required behavior

After T117 is canonical:

1. retain all existing same-repository eligibility, permissions, exact-head, install/build, and self-verification steps unchanged except the bounded integration and timeout-budget change authorized here;
2. change the existing job `timeout-minutes` exactly from `30` to `60`;
3. preserve the frozen budget: 20 minutes checkout/setup/install/build/artifact reserve, 20 minutes existing Spec 006 self-verification allowance, 10 minutes T117 full-suite reference timeout, and 10 minutes contingency/orderly-cleanup reserve;
4. invoke canonical `benchmarks/selector-shadow.mjs` immediately after successful Spec 006 capture using the exact just-produced receipt/envelope;
5. write `selector-shadow-observation.json` under the same runner-temp self-verification evidence directory;
6. add exactly that file to the existing pinned artifact upload path list;
7. retain existing artifact name, retention, least privilege, and exact action pins unless implementation-time revalidation requires a separately reviewed amendment;
8. do not fail because selector misses exist;
9. fail/stop only on workflow/harness integrity conditions defined by the plan;
10. do not increase either the 60-minute job timeout or 10-minute reference timeout after observing live behavior.

### Required live evidence

The exact final eligible same-repository T118 PR head must produce one downloadable selector-shadow observation bound to the exact PR head receipt/envelope **within the frozen 60-minute job budget**. Static YAML review is insufficient.

If the observation is unavailable for a reason outside the planned exhaustive boundary, or if the frozen timeout budget is insufficient, do not patch around, rerun-to-green, or increase the time allowance. Record the reason and return to planning.

### Hard prohibitions

No new workflow/action/dependency/permission/secret/fork execution; no `pull_request_target`; no selector/product/receipt/schema/Project-CI/historical-result/release mutation; no post-observation timeout widening.

### Qualification gate

All T117-style exact-head gates apply, plus:

- workflow job timeout is exactly 60 minutes;
- canonical T117 reference timeout is exactly 10 minutes;
- live final-head selector-shadow artifact exists before successful job completion;
- artifact classification is `SELECTOR_SHADOW_NON_GATING`;
- source/receipt bindings match the exact final head evidence;
- observation disposition is explicit and internally consistent;
- miss or no-miss truth is not used as merge authority;
- upload remains bounded and privacy-safe.

---

## T119 — Reconciliation and closeout

**State:** `BLOCKED_BY_T118`

Ledger/governance only by default. No tracked repository mutation is authorized merely by reaching T119.

Reverify live canonical truth and record:

- T117/T118 bases, heads, trees, PRs, CI, review, merges, signatures, and closeout issues;
- exact first live selector-shadow run/artifact identity available from GitHub;
- proof that T118 used the frozen 60-minute job / 10-minute reference budget without post-observation widening;
- observation disposition and any exact selector misses or unavailable reason;
- historical T078/T091 remain immutable;
- no selector/Receipt v1/product/dependency/benchmark-result mutation occurred;
- all Spec 010 acceptance criteria;
- next-frontier decision from then-live repository governance.

If all acceptance criteria are proven:

```text
T119 = CLOSED_CANONICAL
SPEC_010 = CLOSED_CANONICAL / GO
```

Otherwise:

```text
SPEC_010 = NO_GO / RETURN_TO_PLANNING
```

Do not call project completion from Spec 010 alone. Re-read the canonical Master Plan and then-live Spec Kit frontier.

## Global task rules

- no force-push/rebase/history rewrite;
- no rerun-to-green substitution where original-attempt evidence is required;
- no fabricated/missing evidence promotion;
- no threshold invented after observing live data;
- no selector repair hidden inside measurement work;
- no authority expansion from roadmap/research text;
- no timeout budget expansion after live evidence;
- every later material unit requires its own prospective authorization.
