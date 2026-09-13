# Specification 015 — P015-03 First-Wedge Implementation Authorization

## Status

`SPEC_015_P015_03_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE`

`FIRST_WEDGE_IMPLEMENTATION_AUTHORIZED = NO`

This artifact is the prospective P015-03 authorization candidate for Issue #330. It grants no implementation authority until it is qualified, guarded-merged, post-merge verified, becomes canonical, and Issue #330 closes `CLOSED_CANONICAL / EFFECTIVE`.

## Canonical predecessor

Spec 015 planning is closed canonical:

- planning ledger: Issue #318 (planning direction; implementation not authorized by planning alone)
- planning PR: #329, merged/closed
- planning merge: `2d6cf5f675f6ed157a3fa36c1c028dc5657aef0d`
- post-merge Project CI run `34667153942`: attempt 1 / SUCCESS / all six required OS/Node lanes SUCCESS
- authorization ledger: Issue #330, `PROPOSED / NOT_EFFECTIVE`
- authorization base (this branch): `2d6cf5f675f6ed157a3fa36c1c028dc5657aef0d`
- release: `v0.1.0` published; Spec 013 T128 `CLOSED_CANONICAL`; npm publication not performed

The authoritative first-wedge contract remains the canonically merged Spec 015 planning package (`spec.md`, `plan.md`, `clarifications.md`, `GAP_EVIDENCE.md`, architecture contracts, `BENCHMARK_DESIGN.md`, `SOURCES_AND_PROVENANCE.md`).

## Founder authority element

Founder implementation authorization dated 2026-09-12 explicitly authorizes Spec 014 and Spec 015 implementation subject to live canonical repository governance and measured evidence. It does not waive third-party licenses, NOTICE/provenance obligations, clean-room boundaries, credential secrecy, or constitutional gates. This artifact records that authorization as one satisfied element of P015-03; every other gate element below must still be proven on the exact head before merge.

## Founder governance decision — external review removed

Founder direction dated 2026-09-13 removes any independent/external-human-review requirement as a blocking gate for P015-03 and successor first-wedge implementation slices.

- No external reviewer is required.
- No distinct reviewer identity is required.
- GitHub `APPROVE` from a second person is not required.
- Exact-head verification remains required and may be performed by the founder, maintainer, or implementing agent.
- Exact-head verification may be recorded as a PR conversation comment or equivalent durable evidence; a submitted GitHub review is not required.
- Automated review tools are advisory only and are never a required merge gate.
- Zero unresolved material review threads remains required.
- CI, source binding, branch purity, benchmark/evidence integrity, pre-merge revalidation, guarded merge, and post-merge verification remain mandatory.

This is an explicit governance change, not a bypass. Review evidence must not be fabricated, but the project must not wait for unavailable third-party reviewers.

## Authority activation boundary

Until this artifact is qualified, guarded-merged, post-merge verified, becomes canonical, and Issue #330 closes effective:

- first-wedge product source mutation is forbidden;
- benchmark corpus import remains blocked;
- no donor import, dependency adoption, service addition, or Constitution amendment follows from this candidate.

After activation, only the bounded first-wedge authority below becomes effective. Each wedge implementation slice remains a separate task-scoped branch/PR with its own exact-head qualification and maintainer verification; no external reviewer gate applies.

## Frozen first-wedge scope

The authorized wedge is exactly the hardened first vertical slice from canonical planning:

Requirement / Change / Risk
-> conflict-aware intent (`RequirementConflict`, code never wins silently)
-> minimal structural map (native AST/symbol facts; extracted vs inferred labeled)
-> Test Obligation Plan (`TestObligation`, `Oracle` classification)
-> unit-test gap detection (existing-test mapping, coverage/exercise binding)
-> candidate test generation in a disposable isolated candidate worktree (core read-only)
-> stability gate (bounded reruns; flaky vs environment recorded separately)
-> discrimination proof (mutant, controlled revert, property, differential, or withheld evidence where applicable; without it the candidate remains a proposal)
-> failure reproduction / minimization
-> defect report with reproduction evidence
-> regression obligation recording
-> residual-risk and release-decision rendering (enumeration only; no score-over-failure)

First language: JavaScript/TypeScript on current Vitest/Jest project paths only. No new test runner, no new language, no new service.

## YAGNI reduction (binding)

The following remain planning concepts, explicitly NOT authorized by this artifact:

- graph database or persistent graph service (simplest deterministic serializable structure first)
- persistent memory service (memory non-authority invariant; no memory PASS authority)
- public plugin SDK, hosted control plane, dashboards
- browser farm / E2E execution, mobile/device testing
- security / performance / accessibility / AI-system tracks (each requires a separate benchmark-justified authorization)
- full Spec 014 runtime bridge (only the frozen `RuntimeObservation` reconciliation contract: runtime observations feed the graph as evidence and never become retroactive pre-release PASS)
- automatic source merge, auto-commit, or promotion without explicit human admission
- single-model lock-in; any model use is proposal-only under "models propose, evidence decides"

## Donor and license qualification (reference-only, no import)

Fresh exact qualification at 2026-09-12 HEADs, top-level license observed via live repository metadata:

| Donor | HEAD pin | Observed top-level license | Disposition |
|---|---|---|---|
| opensandbox-group/OpenSandbox | `09e3584c5f71dd4887555d7ba3db6a24ddd9c404` | Apache-2.0 | REFERENCE_ONLY |
| Graphify-Labs/graphify | `23f2ffaa43fd12f25d9eabe91e6d184b5d89b474` | Apache-2.0 | REFERENCE_ONLY |
| tt-a1i/archify | `6db72a9aea3d0f67a6a034e41f8a5491476a11c1` | MIT | REFERENCE_ONLY |
| vitali87/code-graph-rag | `ec40213febb3ca71b3a4d7894a5f919bdd7cc6c5` | MIT | REFERENCE_ONLY |
| rohitg00/agentmemory | `e04ba88819c365c9acf9d6661ea802143e728bd6` | Apache-2.0 | REFERENCE_ONLY |
| mem0ai/mem0 | `c7ee362aff94a369af70f13f2b4f853f6793ff4c` | Apache-2.0 | REFERENCE_ONLY |

Per canonical clarification #13, the first slice requires no donor code. No donor component is imported, no nested-license review is claimed, and no future import may rely on this table alone: any later import requires its own exact-version/component provenance, nested-license/NOTICE inventory, dependency/security review, and benchmark-need justification. ISTQB/OWASP/NIST/ISO/OpenTelemetry materials remain professional knowledge references; no copyrighted text is copied.

## Benchmark readiness (no corpus import)

Wedge implementation must extend the repository benchmark harness (`benchmarks/`) with owned synthetic targets first, measuring: obligation-to-evidence traceability, gap-closure honesty (no green by omission), stability across bounded reruns, discrimination success (mutant/revert/property/differential/withheld), minimization quality, fault-localization rank where applicable, cost/runtime visibility, and the absolute zero-tolerance gates (cross-tree leakage = 0, false PASS by omission = 0, source-binding violations = 0, secret leakage = 0, memory-derived PASS = 0). No external corpus (Defects4J, BugsJS, BugsInPy, TestGenEval, SWE-bench) is imported under this authorization; each requires separate license/contamination qualification. Contamination partitions (public / eval / hidden holdout / post-cutoff / synthetic / adversarial) apply from the first benchmark addition.

## Authorized tracked surface for successor wedge slices

Successor implementation PRs under this authorization (each separately exact-head qualified and maintainer-verified; no external reviewer required) may touch only:

- `src/` additions bounded to the frozen wedge pipeline (obligation/intent/risk model, oracle classification, gap analysis, worktree-isolated generation, stability/discrimination evaluation, reproducer/minimizer, regression recorder, residual-risk renderer)
- `tests/` additions proving each new behavior plus zero-tolerance integrity gates
- `benchmarks/` additions for owned synthetic targets and harness expansion
- `docs/` additions for wedge behavior and evidence semantics

They MUST NOT: add a runtime dependency, service, database, daemon, model requirement, plugin framework, graph database, or sandbox dependency; amend the Constitution; implement Spec 014 beyond the reconciliation contract; copy donor code; import external corpora; auto-merge generated tests; weaken admission, redaction, drift, selection-accounting, or exit-mapping gates; publish to npm; or create tags/releases.

## This artifact PR's own purity

This authorization PR changes exactly one tracked path:

- `specs/015-autonomous-quality-engineering/P015_03_FIRST_WEDGE_IMPLEMENTATION_AUTHORIZATION.md` (this file)

No product source, test, benchmark, workflow, dependency, or configuration path changes here.

## Qualification gate for this artifact

Before this artifact may merge, its exact head must prove:

- reverified canonical base (`2d6cf5f675f6ed157a3fa36c1c028dc5657aef0d`) and live governance state (0 conflicting chains);
- branch purity: exactly the one new file above;
- exact-lockfile install, typecheck, full tests, build qualification under repository evidence rules;
- original-attempt six-lane Project CI success on the exact head;
- exact-head maintainer/founder verification recorded durably; no external or independent reviewer is required;
- zero unresolved material review threads;
- pre-merge revalidation of canonical `main`, unique merge base, rulesets/protection, and expected head;
- guarded normal merge with unchanged expected head;
- post-merge ordered-parent/tree/main proof and push-triggered Project CI success before Issue #330 closes.

Any material mismatch is `NO_GO / RETURN_TO_AUTHORIZATION_OR_PLANNING`. Failed attempts are preserved unmerged; no failed-attempt evidence is reused by a successor.

## Downstream boundary

This authorization, once effective, authorizes only the bounded first-wedge slices above. It does not authorize Spec 014 planning/implementation (separate chain from Issue #300), later Spec 015 quarters (Q2-Q5), any Constitution amendment, any donor import, any external corpus, or any publication action.

```text
SPEC_015_P015_03_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
FIRST_WEDGE_IMPLEMENTATION_AUTHORIZED = NO
EXTERNAL_REVIEW_GATE = NOT_REQUIRED
WEDGE_IMPLEMENTATION = BLOCKED_BY_P015_03
SPEC_014 = SEPARATE_CHAIN
```
