# Specification 008 — Tasks

## Status

`TASKS = PLANNING_ONLY`

Canonical implementation order, if and only if Spec 008 later receives explicit implementation authorization:

### P008-01 — planning closeout

- merge only planning artifacts;
- require fresh independent exact-head semantic/security review;
- require zero unresolved material review threads;
- close planning canonically;
- no workflow mutation.

### P008-02 — implementation authorization

- create a separate authorization artifact/ledger after planning is canonical;
- authorize exactly `.github/workflows/spec-007-isolated-replay.yml`;
- name exact behavioral constraints from Spec 008;
- independently review and canonically merge the authorization before implementation.

### P008-03 — minimal workflow implementation

Authorized surface, if P008-02 closes effectively:

- `.github/workflows/spec-007-isolated-replay.yml` only.

Required implementation:

- `workflow_dispatch` only;
- closed case enum for Jotai/Immer;
- exact SHA input and source guard;
- Ubuntu 24.04;
- Node 24.15.0 verification;
- Yarn 1.22.22 activation and verification;
- read-only permissions and no secrets;
- exact Ascout npm lockfile install/build;
- direct unchanged `benchmarks/run.mjs` execution with 2 or 3 repetitions;
- bounded timeout and artifact retention;
- result upload without success synthesis.

Qualification:

- exact one-path purity;
- exact-head CI/self-verification where applicable;
- fresh independent substantive exact-head review;
- zero unresolved material threads;
- unchanged expected main/head;
- guarded merge;
- post-merge ordered-parent/tree/signature/main verification;
- durable implementation closeout.

### P008-04 — T111 Jotai replay

Only after P008-03 canonical closeout:

- reopen/recreate T111 against exact canonical main;
- verify canonical manifest/verifier/toolchain identities;
- dispatch exactly one Jotai qualification run with repetitions=2;
- preserve any failure as evidence; no rerun-until-green;
- if the harness emits genuine `BENCHMARK_ACTIVE` evidence satisfying all gates, close T111 `CLOSED_CANONICAL / QUALIFIED`.

### P008-05 — T112 Immer replay

Only after T111 qualified:

- prove exact Node runtime supports the Iterator behavior required by the frozen oracle without polyfill/rewrite;
- dispatch exactly one Immer qualification run with repetitions=2;
- preserve failure as evidence;
- close qualified only on genuine harness evidence.

### P008-06 — T113 publication

Only after both replays qualify:

- mutate exactly `benchmarks/results/t113-historical-corpus-expansion.json` under existing Spec 007 authority;
- publish one additive complete eight-case result;
- preserve T078/T091/T095 byte identities;
- exact-head CI/review/guarded merge/post-merge proof.

### P008-07 — T114 reconciliation

- reconcile Spec 007/008 ledgers and governance;
- close execution-route recovery issue if its exit criteria are met;
- determine whether any successor work is genuinely authorized;
- do not invent later scope.