# Specification 009 — Clarifications

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## C1 — Is Spec 009 a product feature?

No. It is a bounded trust-verification corpus around existing Receipt v1 validators. It does not change public receipt semantics, CLI behavior, selection behavior, or execution authority.

## C2 — Why is this allowed after Spec 007 became terminal?

Spec 009 is independent of T113/T114. It does not reuse the failed execution route, publish historical-corpus metrics, or change any Spec 007 surface. It advances a separate M1.2 trust workstream named in the roadmap.

## C3 — Why not selector shadow mode first?

T078's known Ascout selector miss was repaired through Spec 002, and T091 published zero selector misses in the six-case replay while preserving unavailable outcomes. That is not universal proof, but it removes the strongest known selector defect as the immediate frontier. A receipt adversarial corpus remains an explicit roadmap gap with direct constitutional relevance and lower implementation complexity.

## C4 — What is the authoritative valid receipt?

Implementation should construct a deterministic Receipt v1 test fixture using current repository types/helpers or a small test-owned factory. The fixture is authoritative only as a test control after it passes both exact current validators. Do not copy a stale historical JSON artifact and assume it remains valid.

## C5 — Must every mutation be one field?

Prefer one material fault. A compound mutation is allowed only when the invalid semantic state cannot be reached otherwise, and the case must document the minimum necessary compound change.

## C6 — What decides schema vs semantic rejection?

The current contract layering decides it:

- malformed shape/type/enum/required/additional-property conditions belong to `validateReceiptJsonSchema`;
- structurally valid but internally contradictory Receipt v1 states belong to `validateReceiptSemantics`.

A semantic case must pass schema first.

## C7 — Are exact semantic issue codes required?

Yes. Each semantic case declares at least one required issue code. The runner checks containment, not exact equality, because one minimal mutation can legitimately trigger another dependent invariant. Missing the required code is a failure.

## C8 — Can the corpus use snapshots?

Not as sole authority. Human-readable snapshots may assist review only if separately justified, but case identity, expected layer, and required issue codes must remain explicit data/assertions.

## C9 — Can implementation add fast-check, a fuzzer, or a mutation library?

No. The gap is a small known adversarial contract corpus. A generalized generator adds dependency and complexity without evidence that it is needed.

## C10 — How many cases are required?

Planning should target a bounded registry of approximately 25–45 cases, enough to cover the named high-risk domains without creating combinatorial matrices. Exact final count is determined during implementation only within the authorized domains; adding a new domain is out of scope.

## C11 — Is an accepted invalid case automatically a failing test?

Yes. It is a material corpus failure. The implementation task must preserve that failure and return to planning for a separately authorized product repair. Do not modify `src/**` or weaken the expected outcome in the same task.

## C12 — Can current validators be refactored to make cases easier to test?

No by default. The corpus must exercise the current public/internal validation exports as they exist. Any product refactor requires separate authority.

## C13 — What about privacy/secret mutation cases?

Only test deterministic existing contract rules. The Constitution explicitly rejects claims of universal secret detection. If the current contract cannot deterministically classify an arbitrary secret-looking string as invalid, that example is documented as outside corpus authority rather than forced into a fake expectation.

## C14 — Does the corpus need a published benchmark result file?

No by default. A durable repository result JSON is not required to prove a deterministic contract test. Project CI logs and the merged focused contract test are sufficient unless the implementation plan identifies a concrete provenance need that cannot be satisfied otherwise. YAGNI favors no new benchmark-result artifact.

## C15 — Should the corpus run in ordinary Project CI?

Yes, by being an ordinary Vitest contract test included by the existing test command. No new workflow is planned.

## C16 — May the corpus invoke the CLI?

Not required. The primary target is exact schema + semantic validation. CLI end-to-end coverage already exists elsewhere and would broaden this unit. Add CLI execution only through a separately justified task if a corpus case cannot be proven at the validator boundary.

## C17 — How are valid controls prevented from drifting stale?

Every corpus execution validates controls first against both exact current validators. A rejected control fails the suite and requires reconciliation; it is never silently rewritten during qualification without review.

## C18 — What is the implementation surface?

The preferred implementation is exactly one new test path:

`tests/receipt-adversarial-corpus.contract.test.ts`

A second test-only helper path may be authorized only if the final plan proves the single file would materially harm readability or duplicate an existing canonical fixture helper. No product path is authorized by planning.

## C19 — Does Spec 009 authorize implementation now?

No. Planning must merge canonically first. A separate `IMPLEMENTATION_AUTHORIZATION.md` and durable authorization ledger must then bind the exact planning merge and exact implementation path(s).
