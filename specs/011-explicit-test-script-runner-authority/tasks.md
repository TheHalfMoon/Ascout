# Specification 011 Tasks — Explicit Test-Script Runner Authority

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #277

## Dependency order

```text
T120 -> T121
```

No successor starts before its predecessor is durably closed canonical.

---

## T120 — Explicit script authority plus planner integration plus contracts

**State:** `PLANNED / IMPLEMENTATION_NOT_AUTHORIZED`

### Authorized candidate paths after separate implementation authorization

Exactly:

- `src/discovery.ts`
- `src/tools/vitest.ts`
- `src/tools/jest.ts`
- `tests/t120-explicit-script-authority.contract.test.ts`

### Required behavior

Implement the repository-internal rule defined by `spec.md` and `plan.md`:

1. derive explicit authority only from the in-scope root `package.json` `scripts.test` exact string;
2. accept only exactly `"vitest run"` as vitest authority and exactly `"jest"` as jest authority;
3. apply authority only when existing runner resolution would otherwise be `ambiguous` with exactly candidates `{jest, vitest}`;
4. resolve to the allowlisted candidate when it is a member of that ambiguous set, otherwise preserve the ambiguous outcome byte-for-byte;
5. never change `absent`, `unsupported`, or already-`resolved` outcomes;
6. make Vitest and Jest planners consume the single post-authority discovery value without duplicating script parsing;
7. preserve all existing scope, config-ambiguity, local-runtime, coverage-provider, run-id, and artifact-path gates;
8. preserve existing `classifyCommandSurfaces` test authority and per-invocation changed-surface admission;
9. preserve `NOT_RUN(js_test_runner_ambiguous)` with identical reason code, text, candidates, and source paths for every non-allowlisted script shape;
10. keep evaluation synchronous, total, deterministic, and free of I/O, processes, network, clock, randomness, and environment reads.

### Focused proof

The focused contract file must cover all material cases listed in `plan.md` section 8, including the frozen two-entry allowlist, the exhaustive fail-closed taxonomy, single/absent/unsupported preservation, and planner-level assertions that newly resolved inputs proceed past runner gating while unresolved inputs still surface `js_test_runner_ambiguous`.

### Hard prohibitions

No `benchmarks/**`, workflow, receipt schema/model/validator, selector/widening, CLI, config surface, package metadata, lockfile/dependency, benchmark-result, Spec 007, release/tag/publication mutation. No new dependency, action, service, database, telemetry, plugin framework, generic script runner, shell parser, executor support, argument grammar, nested-script authority, persistent trust, or auto-admission.

### Qualification gate

Before T120 may merge:

- exact current canonical base reverified;
- branch contains only the four authorized paths;
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
- T120 issue closed `completed` with exact evidence.

On any material mismatch: `NO_GO / RETURN_TO_PLANNING`.

---

## T121 — Reconciliation and closeout

**State:** `BLOCKED_BY_T120`

Ledger/governance only by default. No tracked repository mutation is authorized merely by reaching T121.

Reverify live canonical truth and record:

- T120 base, head, tree, PR, CI, review, merge, signature, and closeout issue;
- proof that Ascout-shaped ambiguous input now resolves while every non-allowlisted shape preserves ambiguous behavior;
- proof that single/absent/unsupported states are unchanged;
- proof that changed-surface admission, source binding, evidence honesty, privacy, determinism, and no-green-by-omission are preserved;
- historical T078/T091 remain immutable;
- no receipt/selector/benchmark-result/Spec 007/dependency/workflow-permission/release mutation occurred;
- all Spec 011 acceptance criteria;
- next-frontier decision from then-live repository governance.

If all acceptance criteria are proven:

```text
T121 = CLOSED_CANONICAL
SPEC_011 = CLOSED_CANONICAL / GO
```

Otherwise:

```text
SPEC_011 = NO_GO / RETURN_TO_PLANNING
```

Do not call project completion from Spec 011 alone. Re-read the canonical Master Plan and then-live Spec Kit frontier.

## Global task rules

- no force-push/rebase/history rewrite;
- no rerun-to-green substitution where original-attempt evidence is required;
- no fabricated/missing evidence promotion;
- no allowlist widening after observing implementation evidence without a separately reviewed planning amendment;
- no selector repair hidden inside discovery work;
- no authority expansion from roadmap/research text;
- every later material unit requires its own prospective authorization.
