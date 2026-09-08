# Specification 009 — Clarifications

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## C1 — Is Spec 009 a product feature?

No. It is a bounded trust-verification corpus around existing Receipt v1 validators. It does not change public receipt semantics, CLI behavior, selection behavior, or execution authority.

## C2 — Why is this allowed after Spec 007 became terminal?

Spec 009 is independent of T113/T114. It does not reuse the failed execution route, publish historical-corpus metrics, or change any Spec 007 surface. It advances a separate M1.2 trust workstream named in the roadmap.

## C3 — Why not selector shadow mode first?

T078's known Ascout selector miss was repaired through Spec 002, and T091 published zero selector misses in the six-case replay while preserving unavailable outcomes. That is not universal proof, but it removes the strongest known selector defect as the immediate frontier. A receipt adversarial corpus remains an explicit roadmap gap with direct constitutional relevance and lower implementation complexity.

## C4 — What is the authoritative valid receipt?

Implementation must construct the deterministic Receipt v1 controls required by `CASE_REGISTRY.md` using current repository types/helpers or test-owned local factories. A control is authoritative only as a test control after it passes both exact current validators. Do not copy a stale historical JSON artifact and assume it remains valid.

## C5 — Must every mutation be one field?

Prefer one material fault. A compound mutation is allowed only where `CASE_REGISTRY.md` explicitly permits the minimum bookkeeping necessary to keep a semantic candidate schema-valid and isolate the named semantic invariant. No implementation-time compound case may be invented.

## C6 — What decides schema vs semantic rejection?

The current contract layering decides it:

- malformed shape/type/enum/required/additional-property conditions belong to `validateReceiptJsonSchema`;
- structurally valid but internally contradictory Receipt v1 states belong to `validateReceiptSemantics`.

A semantic case must pass schema first.

## C7 — Are exact semantic issue codes required?

Yes. `CASE_REGISTRY.md` freezes the required semantic issue code set for each semantic case. The runner checks containment, not exact equality, because one minimum mutation can legitimately trigger another dependent invariant. Missing any required code is a failure. Changing a required code requires a separately reviewed planning amendment.

## C8 — Can the corpus use snapshots?

Not as sole authority. Human-readable snapshots may assist review only if separately justified, but case identity, expected layer, required issue codes, and exact accounting remain explicit data/assertions.

## C9 — Can implementation add fast-check, a fuzzer, or a mutation library?

No. The gap is a small known adversarial contract corpus. A generalized generator adds dependency and complexity without evidence that it is needed.

## C10 — How many cases are required?

Exactly the registry frozen in `CASE_REGISTRY.md`:

- `2` valid controls;
- `44` invalid cases;
- `8` schema-boundary invalid cases;
- `36` semantic-boundary invalid cases;
- `46` total declared executions.

T115 may not add, remove, rename, merge, split, skip, or reclassify cases. Any registry change requires a separately reviewed Spec 009 planning amendment that becomes canonical before implementation continues.

## C11 — Is an accepted invalid case automatically a failing test?

Yes. It is a material corpus failure. The implementation task must preserve that failure and return to planning for a separately authorized product repair. Do not modify `src/**`, schema, or a registry expectation in the same task.

## C12 — Can current validators be refactored to make cases easier to test?

No. The corpus must exercise the current validation exports as they exist. Any product refactor requires separate authority.

## C13 — What about privacy/secret mutation cases?

Only deterministic existing contract rules may be tested. The Constitution explicitly rejects claims of universal secret detection. `CASE_REGISTRY.md` therefore authorizes no arbitrary secret-string rejection case; existing execution/persistence redaction tests retain that responsibility.

## C14 — Does the corpus need a published benchmark result file?

No. A durable repository result JSON is not required to prove a deterministic contract test. Exact focused-test evidence, Project CI, review, and canonical merge proof are sufficient. YAGNI rejects a new benchmark-result lifecycle.

## C15 — Should the corpus run in ordinary Project CI?

Yes, by being an ordinary Vitest contract test included by the existing test command. No new workflow is planned.

## C16 — May the corpus invoke the CLI?

No under the current plan. The exact target is schema + semantic validation. CLI end-to-end coverage already exists elsewhere and would broaden this unit. Any need for CLI execution requires a planning amendment.

## C17 — How are valid controls prevented from drifting stale?

Every corpus execution validates both exact controls first against both exact current validators. A rejected control fails the suite and requires reconciliation; it is never silently rewritten during qualification without review.

## C18 — What is the implementation surface?

Exactly one new test path is planned:

`tests/receipt-adversarial-corpus.contract.test.ts`

No second helper or fixture path is authorized. If one file is later proven materially unreviewable, return to planning before adding another path.

## C19 — Does Spec 009 authorize implementation now?

No. Planning must merge canonically first. A separate `IMPLEMENTATION_AUTHORIZATION.md` and durable authorization ledger must then bind the exact planning merge, exact registry, exact one-path T115 surface, and T116 ledger-only authority.
