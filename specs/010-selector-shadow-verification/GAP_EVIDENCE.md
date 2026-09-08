# Specification 010 Gap Evidence — Selector Shadow Verification

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #261
**Canonical planning base:** `ec78d0225f66390ad45804fb122b6d51c4f6980f`
**Canonical planning-base tree:** `7d2eaf375aa0f65ef9dd4661ec434d9254c78f00`
**Roadmap position:** M1.2-C — Selector shadow mode

## 1. Live repository state

At planning start:

- canonical `main` is `ec78d0225f66390ad45804fb122b6d51c4f6980f`;
- canonical tree is `7d2eaf375aa0f65ef9dd4661ec434d9254c78f00`;
- open pull requests are `0`;
- canonical `specs/` contains exactly `001` through `009`;
- Spec 009 is `CLOSED_CANONICAL / GO`;
- repository rulesets are `[]`;
- observable `main` protection is disabled/off.

The Founder prospectively authorized the next canonical planning chain in Issue #261. That authority is planning-only and does not authorize implementation.

## 2. Roadmap ordering evidence

The non-authoritative post-M1 roadmap lists M1.2 workstreams in this order:

1. self-verification;
2. historical benchmark corpus;
3. selector shadow mode;
4. receipt mutation/adversarial corpus.

Canonical work subsequently established:

- Spec 006: self-verification shadow receipt, closed canonical;
- Spec 007: historical benchmark expansion attempted, later `NO_GO / TERMINAL_UNDER_CURRENT_SPEC` after bounded recovery exhaustion;
- Spec 009: receipt adversarial corpus, closed canonical/GO.

Spec 009 explicitly deferred selector shadow only because the strongest known selector defect had been repaired and receipt-adversarial validation had higher immediate constitutional value at lower complexity. Selector shadow therefore remains a distinct unresolved M1.2 measurement candidate; the roadmap itself still does not authorize implementation.

## 3. Measured selector evidence

### Historical miss

`benchmarks/results/t078-selector-misses.json` canonically published one Ascout selector miss in the six-case founding selection corpus:

- case: `react-hook-form-value-as-date`;
- comparator: `ascout`;
- required oracle test was not observed;
- `published_selector_miss_count = 1`.

The same result also showed Ascout outcome availability was incomplete:

- Ascout hit cases: `2`;
- Ascout miss cases: `1`;
- Ascout unavailable cases: `3`.

This is direct evidence that selector regressions can create false confidence unless compared against a stronger reference observation.

### Bounded repair replay

`benchmarks/results/t091-m2-selection-replay.json` later qualified the bounded Spec 002 repair:

- founding selection case count: `6`;
- Ascout hit cases: `3`;
- Ascout miss cases: `0`;
- Ascout unavailable cases: `3`;
- `published_selector_miss_count = 0`;
- historical T078 result remained immutable.

This proves the known React Hook Form selector defect was repaired in that bounded corpus. It does **not** prove universal selector recall, and half of the six Ascout comparator outcomes remained unavailable for exact oracle-membership publication.

## 4. Current measurement gap

Current repository truth has no periodic same-repository mechanism that compares the exact self-verification receipt's affected-test observation against an independently executed full-suite reference on the same reconstructed PR source state.

Project CI runs the full Ascout test suite, while Self Verification retains an exact-head Ascout receipt, but the two workflows do not produce one source-bound comparison artifact that answers:

- which exact full-suite failing test identities were observed;
- which of those identities were also present in Ascout's test findings;
- whether a full-suite failure identity escaped the affected-selection receipt;
- whether the Ascout test task was comparable or unavailable;
- the receipt's selection mode, widening state, selected/deselected counts, and test-task duration;
- the reference full-suite duration and exact runner identity.

Without that comparison, future selector regressions can be discovered only incidentally or through separately scheduled historical benchmark work.

## 5. Narrow evidence-backed candidate

The smallest candidate is an **Ascout-on-Ascout, same-repository, non-gating selector-shadow observation** layered on the already-canonical Spec 006 self-verification workflow.

The candidate should:

1. consume the already validated self-verification receipt and qualification envelope;
2. verify their digest and reconstructed source binding before comparison;
3. require exactly one comparable executed Ascout `test` task;
4. refuse shadow reference execution when the self-verification test task is admission-refused, blocked, errored, not-run, not-applicable, ambiguous, or otherwise incomparable;
5. execute the current Ascout project's exact local Vitest full suite with structured JSON output only when the existing command-authority state is normal;
6. prove the full-suite run starts and ends on the same reconstructed `M -> H` subject tree without tracked/nonignored-untracked drift;
7. compare full-suite failed `(repository-relative test path, fullName)` identities to Ascout test findings from the receipt;
8. publish every unmatched full-suite failure identity as an observed selector miss;
9. publish no recall threshold and make no causal claim;
10. emit a separate bounded `SHADOW_NON_GATING` artifact without changing Receipt v1.

## 6. Why this is smaller than a generic selector platform

This candidate does **not** add:

- selector-policy changes;
- automatic widening changes;
- receipt/schema/model fields;
- public CLI flags;
- new runtime dependencies;
- a generic project adapter or plugin interface;
- historical benchmark execution;
- external donor execution;
- a database, service, telemetry backend, or trend store;
- a merge gate;
- a recall threshold.

It reuses the trusted same-repository self-verification boundary and the repository's already-installed Vitest toolchain.

## 7. Decision

Measured evidence supports planning a bounded selector-shadow observation because:

- a real selector miss was historically published;
- the known miss was repaired but only inside a six-case bounded replay;
- three of six Ascout replay outcomes remained unavailable;
- no continuous source-bound comparison currently exists;
- a same-repository observation can be implemented without product-core or receipt-contract mutation.

`GAP_EVIDENCE = SUFFICIENT_FOR_PLANNING`

`IMPLEMENTATION_AUTHORITY = NO`
