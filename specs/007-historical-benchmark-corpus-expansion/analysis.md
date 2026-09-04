# Spec 007 Cross-Artifact Analysis

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

## Inputs reviewed

- canonical constitution and founding Master Plan;
- non-authoritative post-M1 roadmap;
- Spec 006 canonical closeout evidence;
- `benchmarks/README.md`;
- `benchmarks/manifest.json` revision 11;
- historical T078 publication;
- T091 post-Spec-002 replay;
- current benchmark runner/harness/metrics interfaces;
- Spec 007 gap/spec/clarifications/YAGNI/plan/tasks/checklist/candidate review;
- exact public Jotai, Immer, and rejected ofetch metadata reviewed during planning.

## A1 — Successor ordering

Finding: `PASS`.

M1.2-A self-verification is canonically closed by Spec 006. Historical corpus expansion is the next roadmap candidate before selector shadow/adversarial work. Planning does not treat the roadmap as direct implementation authority; it creates a new Spec Kit chain instead.

## A2 — Measured gap vs proposed scope

Finding: `PASS`.

The measured gap is limited: six frozen selection cases, with current Ascout membership evidence available in 3 and unavailable in 3. The proposed response is exactly two additional independently reviewed cases. No selector repair or score target is smuggled into the scope.

## A3 — Founding 5–6 bound vs successor 5–8 bound

Finding: `PASS_WITH_HISTORICAL_DISTINCTION`.

The founding manifest's `maximum_cases: 6` is part of the historical founding corpus contract. Spec 007 does not rewrite that historical publication. It proposes a successor manifest revision with maximum 8 while keeping historical results immutable and the minimum at 5.

No benchmark code search found a separate hard-coded `maximum_cases` limit outside the manifest policy. Therefore raising the successor manifest bound does not currently imply a harness/metrics architecture change.

## A4 — Case lifecycle

Finding: `PASS`.

Current `validateReplayCase` requires a `CASE_REVIEWED` input with no existing oracle observation. The runner produces replay output carrying `BENCHMARK_ACTIVE` status/lifecycle after successful qualification. Metrics consume replay evidence.

Therefore new manifest records should remain `CASE_REVIEWED`; no manifest schema/lifecycle redesign is needed.

## A5 — T113 current-metrics compatibility

Finding: `PASS_WITH_LEGACY_NAMING`.

Current metrics logic binds a replay prerequisite to the case revision and manifest revision, then supports aggregate inputs through repeated `--aggregate-input` arguments. Internal variables/error labels still refer to the historical prerequisite as `T075`, but this is legacy naming rather than a fixed result filename or six-case constraint.

Spec 007 does not authorize renaming that internal terminology solely for aesthetic cleanup.

## A6 — Jotai candidate

Finding: `PASS_FOR_PLANNING`.

Exact direct base/fix identities, production/test paths, package/lock/config stability, MIT license identity, and no observed external oracle dependency are documented.

Runtime install/oracle/membership/determinism evidence remains correctly deferred to T110/T111.

## A7 — Immer candidate

Finding: `PASS_FOR_PLANNING_WITH_RUNTIME_GATE`.

Exact direct base/fix identities and the two-path production/test fix are documented. Root package/lock/Vitest config and license are unchanged across base/fix.

Material caveat: the oracle uses ES2025 Iterator behavior. The plan explicitly requires exact runtime capability proof and forbids adding a polyfill merely to make the case qualify.

## A8 — Hermeticity policy

Finding: `PASS`.

The ofetch candidate was rejected because its new regression test invokes a live external URL. No network-replay/mocking/egress subsystem was added to save the candidate. This is consistent with fail-closed corpus admission and YAGNI.

## A9 — Regression-test anti-leakage

Finding: `PASS`.

Spec, clarifications, plan, tasks, candidate review, and checklist consistently require the measured source tree to contain the production fix while withholding the regression-test delta. The oracle is independent evidence, not part of the measured source change.

## A10 — Historical results

Finding: `PASS`.

T078/T091/T095 are explicitly immutable. T113 is additive under a new filename and task identity. No planning artifact permits overwriting prior publications.

## A11 — Result honesty

Finding: `PASS`.

All artifacts preserve `hit | miss | unavailable`, explicitly reject a universal recall threshold, and allow a new miss/unavailable outcome to be published without triggering product mutation inside Spec 007.

## A12 — Implementation surfaces

Finding: `PASS`.

Default repository mutations are reduced to:

T110:
- `benchmarks/README.md`
- `benchmarks/manifest.json`

T113:
- `benchmarks/results/t113-historical-corpus-expansion.json`

T111/T112/T114 are repository-mutation-free/ledger-only by default. No benchmark script/test/product path is pre-authorized.

## A13 — Exact byte digests

Finding: `DEFERRED_CORRECTLY`.

The current manifest case schema requires exact byte SHA-256 fields in addition to Git blob identities. Planning has not fabricated those values from partial content inspection.

T110 must compute/reverify exact bytes through an authorized read-only retrieval route before final manifest mutation. Failure to obtain exact bytes blocks T110; Git blob SHA-1 must not be substituted for SHA-256.

## A14 — Runtime version selection

Finding: `DEFERRED_CORRECTLY`.

Planning records candidate constraints but does not invent executable runtime evidence. T110 must select exact package-manager/Node versions and T111/T112 must prove them during replay.

## A15 — Governance sequence

Finding: `PASS`.

Planning remains non-authoritative. After planning exact-head qualification and guarded merge, a separate implementation authorization must bind the exact planning merge and T110–T114 before any benchmark mutation or donor execution.

Each repository-mutating task independently requires exact-head CI/review and guarded merge. Any head mutation invalidates stale evidence.

## A16 — Unresolved material inconsistencies

`0`

## Analysis result

`ANALYSIS_007 = PASS / PLANNING_COHERENT`

This result is limited to planning coherence. It does not authorize implementation or claim either candidate is executable/qualified.
