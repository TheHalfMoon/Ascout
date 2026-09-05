# Specification 008 — Tasks

## Status

`TASKS = PLANNING_ONLY`

Canonical implementation order, if and only if Spec 008 later receives explicit implementation authorization:

### P008-01 — planning closeout

- merge only planning artifacts;
- require fresh independent exact-head semantic/security review;
- require zero unresolved material review threads;
- close planning canonically;
- no workflow or run-ref mutation.

### P008-02 — implementation authorization

- create a separate authorization artifact/ledger after planning is canonical;
- authorize exactly `.github/workflows/spec-007-isolated-replay.yml`;
- authorize only one future creation of each exact task-run branch when its task is eligible:
  - `run/spec007-t111-jotai`
  - `run/spec007-t112-immer`
- forbid repointing, force-updating, reuse, or recreation of either run ref to obtain another attempt;
- name exact behavioral constraints from Spec 008;
- independently review and canonically merge the authorization before implementation.

### P008-03 — minimal workflow implementation

Authorized tracked surface, if P008-02 closes effectively:

- `.github/workflows/spec-007-isolated-replay.yml` only.

Required implementation:

- GitHub `create` event only;
- replay job admitted only for branch ref type and the two exact task-run branch names;
- fixed branch-to-case mapping;
- exact event SHA checkout and source guard;
- Ubuntu 24.04;
- Node 24.15.0 verification;
- Yarn 1.22.22 activation and verification;
- read-only permissions and no secrets;
- exact Ascout npm lockfile install/build;
- direct unchanged `benchmarks/run.mjs` execution with exactly 2 repetitions;
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
- durable implementation closeout before any run ref creation.

### P008-04 — T111 Jotai replay

Only after P008-03 canonical closeout:

- reopen/recreate T111 against exact canonical main;
- verify canonical manifest/verifier/toolchain identities;
- verify `run/spec007-t111-jotai` does not exist;
- create that exact branch once from exact canonical main;
- verify the resulting GitHub `create`-event run is bound to that SHA and mapped case;
- preserve any failure as evidence; do not move/recreate the branch and do not rerun-until-green;
- if the harness emits genuine `BENCHMARK_ACTIVE` evidence satisfying all gates, close T111 `CLOSED_CANONICAL / QUALIFIED`.

### P008-05 — T112 Immer replay

Only after T111 qualified:

- prove exact Node runtime supports the Iterator behavior required by the frozen oracle without polyfill/rewrite;
- verify `run/spec007-t112-immer` does not exist;
- create that exact branch once from exact then-canonical main;
- reconcile its single create-event replay run;
- preserve failure as evidence; do not move/recreate the branch;
- close qualified only on genuine harness evidence.

### P008-06 — T113 publication

Only after both replays qualify:

- mutate exactly `benchmarks/results/t113-historical-corpus-expansion.json` under existing Spec 007 authority;
- publish one additive complete eight-case result;
- preserve T078/T091/T095 byte identities;
- exact-head CI/review/guarded merge/post-merge proof.

### P008-07 — T114 reconciliation

- reconcile Spec 007/008 ledgers and governance;
- close execution-route recovery Issue #171 if its exit criteria are met;
- determine whether any successor work is genuinely authorized;
- do not invent later scope.