# 001 — Independent Final Plan Audit

**Date:** 2026-08-21  
**Audit target exact head:** `033bfc4839fc80e4c639ef71a8c09c80bfd7d4af`  
**Branch:** `planning/000-ascout-foundation`  
**Verdict:** `PASS_READY_FOR_FRESH_EXACT_HEAD_PR_REVIEW`  
**Implementation authorization:** **NO**  
**Merge authorization:** **NO — a fresh external review of the post-audit PR head is required**

This is the renewed adversarial final audit after internal analysis, the independent changed-command admission audit, Qodo exact-head review, CodeRabbit exact-head review, and all accepted repairs.

It supersedes all earlier final-audit verdicts for merge-readiness purposes.

The audit target contains no product implementation. Writing this audit creates a governance-only successor commit; that successor still requires fresh exact-HEAD external review and branch-purity verification. Any later **material** mutation to constitution/spec/plan/data model/contracts/tasks invalidates affected audit claims and requires reconciliation before merge or implementation authorization.

## 1. Review History Consumed

This audit consumes four independent layers:

1. internal cross-artifact analysis + Ponytail/YAGNI reduction;
2. independent pre-PR adversarial audit, which found the changed-command warning-only authorization blocker;
3. Qodo exact-head review, which found four machine-contract defects; and
4. CodeRabbit exact-head review, which found stale-head governance, evidence-reference integrity, privacy-enforcement, semantic validation, benchmark, pytest-admission, and documentation-integrity defects/confirmations.

External findings are not accepted merely because a bot emitted them. Every finding was checked against the constitution/product contract and either repaired or already independently satisfied.

## 2. Internal High-Severity Repairs Revalidated

### False-green exercise gap

A stable run with material changed executable lines remaining `NOT_EXERCISED` or `UNRESOLVED` after permitted widening cannot return exit `0`; absent higher precedence it is `materially_incomplete`, exit `4`.

**Result:** `PASS`

### Changed command/config execution authority

If the current diff changes an effective authority/config file the task would execute/load:

- ordinary check refuses the affected task before launch/load;
- task is `NOT_RUN(command_surface_changed)` with non-empty reason text/code;
- at least one changed authority path is recorded;
- admission is `refused_changed_surface`;
- a human may use `--allow-changed-command-surface` only for that invocation;
- explicit override is receipt-visible and never persisted/auto-added by agent integration.

The same generic mechanism covers `pytestBasic` effective configuration.

**Result:** `PASS_WITH_EXPLICIT_TRUSTED_LOCAL_SCOPE`

## 3. Qodo Reconciliation Revalidated

### Q1 — explicit omission/error reasons

`NOT_RUN`, `BLOCKED`, and `ERROR` require non-empty `reason_code` and `reason_text` in receipt v1 and implementation tests.

**Result:** `PASS`

### Q2 — rename identity

`change_kind=renamed` requires `previous_path`; non-renames do not fabricate it.

**Result:** `PASS`

### Q3 — exercise state/count/reason integrity

- `EXERCISED` requires integer count > 0;
- `NOT_EXERCISED` requires count 0;
- `UNRESOLVED` requires null count + non-empty reason.

**Result:** `PASS`

### Q4 — fixed task identifier parity

Canonical config/receipt/model/plan task IDs:

```text
typecheck
lint
test
pytestBasic
```

No name-translation layer exists.

**Result:** `PASS`

All Qodo review threads were observed resolved after repair.

## 4. CodeRabbit Reconciliation Revalidated

### CR1 — fresh exact-HEAD authorization gate

Constitution, `.specify/PROVENANCE.md`, and Master Plan require:

```text
final audit
→ fresh exact-HEAD cross-artifact consistency + branch-purity review
→ explicit implementation authorization
```

Material post-audit mutation invalidates affected claims until reconciled and re-reviewed.

**Result:** `PASS`

### CR2 — Master Plan command-admission consistency

Master Plan no longer contains warning-only semantics. It matches constitution/spec/plan: default refusal, explicit per-invocation human admission only.

**Result:** `PASS`

### CR3 — Markdown analysis integrity

Malformed analysis-table cells were rewritten without raw separator characters inside cells. Governance evidence remains readable/reviewable.

**Result:** `PASS`

### CR4 — root evidence collection and reference integrity

Receipt v1 contains required root `evidence[]`.

Each evidence entry includes:

- evidence ID;
- run ID;
- task ID;
- sequence;
- evidence kind;
- SHA-256 digest;
- optional artifact ID;
- redaction/truncation state.

Task/finding `evidence_ids` are references into this collection, not free-floating claims.

**Result:** `PASS`

### CR5 — schema-enforceable repository privacy

Receipt source identity is constrained to:

```text
remote:<64 lowercase hex>  + repository_id_kind=remote     + portable=true
local:<64 lowercase hex>   + repository_id_kind=local_only + portable=false
```

Raw remote origins and raw absolute local paths cannot satisfy the intended schema branches.

**Result:** `PASS`

### CR6 — changed surface cannot be normal admission

`command_surface_changed=true` requires at least one changed authority path and admission `refused_changed_surface` or `explicit_changed_surface_override`; `normal` is not valid.

**Result:** `PASS`

### CR7 — semantic receipt validation

JSON Schema remains field-shape validation. One Ascout-owned **pure semantic validator** is required before receipt emission and reused by any internal/future receipt acceptance path.

It checks:

- unique/resolvable evidence/task/artifact references;
- evidence run/task linkage;
- source start/end vs stability;
- task status/reason/admission consistency;
- exercise record vs aggregate consistency;
- task/finding aggregate counts;
- completeness;
- exit-code precedence.

This is a pure receipt invariant function, not a service, DB, or alternate receipt interpretation.

**Result:** `PASS`

### CR8 — benchmark gap-to-exit assertion

Benchmark absolute gates now include:

```text
stable material exercise gap returning exit 0 = 0
```

T077 requires the same assertion.

**Result:** `PASS`

### CR9 — pytest admission coverage

T028 and plan/spec include `pytestBasic` effective configuration in the admission integration matrix.

**Result:** `PASS`

## 5. False-Green Audit

Clean exit `0` requires:

- source stability `stable`;
- receipt schema + semantic validation success;
- no higher-precedence integrity/config/task-execution error;
- at least one material applicable task executed;
- no repository finding/flake;
- no applicable `NOT_RUN`/`BLOCKED`;
- no changed-command admission refusal;
- safe affected selection/widening;
- no remaining material changed executable exercise gap;
- current-run evidence references resolve.

No reviewed contract path allows opaque omission, dangling evidence, unresolved mapping, or admission refusal to become green.

**Result:** `PASS`

## 6. Evidence / Source-Binding Audit

Required properties:

- opaque privacy-safe repository ID;
- HEAD/index/worktree/all non-gitignored untracked source binding except `.ascout/`;
- mode/type changes represented;
- rename old/new path fidelity;
- start/end drift;
- root current-run evidence collection;
- evidence IDs unique and resolvable;
- evidence run/task/artifact linkage validated;
- no evidence transfer across runs/trees;
- weak fingerprints never substitute for evidence;
- locational `in_changed_lines` remains distinct from causal attribution.

Absolute future implementation benchmark gates:

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
```

**Result:** `PASS`

## 7. Machine Contract Audit

### Config v1

- versioned non-executable JSON;
- fixed task identifiers only;
- canonical `pytestBasic`;
- no arbitrary task/prerequisite/workflow graph;
- no persistent trust/admission state.

### Receipt v1

- same fixed task identifiers as config;
- strict task/status/selection shapes;
- explicit omission/error reasons;
- strict rename identity;
- strict exercise state/count/reason semantics;
- strict admission invariants;
- privacy-safe repository ID discriminator;
- root current-run evidence collection;
- separate stability/completeness;
- non-executed tasks need not fabricate argv/tool identity;
- redacted persisted argv.

### Semantic validator

One shared pure validator closes referential/cross-field constraints that JSON Schema draft 2020-12 does not express cleanly.

**Result:** `PASS_AFTER_QODO_AND_CODERABBIT_REPAIR`

## 8. Privacy Audit

- raw credential-bearing origin not persisted;
- remote receipt identity always opaque hash-derived form;
- local receipt identity always one-way hash-derived form;
- portability flag schema-bound to identity kind;
- raw absolute path not persisted;
- raw secret argv transient only;
- persisted/rendered argv + captured output apply exact-value redaction policy;
- redaction remains accurately described as best-effort.

**Result:** `PASS`

## 9. Windows / Cross-Platform Audit

The plan does not pretend POSIX process semantics apply to Windows:

- `cross-spawn` only for executable/shim launch normalization;
- Ascout owns timeout/capture/process-tree termination;
- native Windows cases remain release-blocking evidence;
- development CI planned for Windows/macOS/Linux, Node 22/24.

Native proof remains a release gate, not a current claim.

**Result:** `PASS_AS_PLANNING_CONTRACT`

## 10. Benchmark Audit

Selection corpus measures Ascout/native selection vs objective full-suite ground truth. Gap corpus measures changed-code exercise against independent full-run coverage.

Metrics/gates include:

- selection recall;
- false-PASS;
- gap accuracy;
- unresolved mapping;
- cold/warm time;
- drift/determinism/flake;
- cross-tree evidence leakage = 0;
- binding-integrity violations = 0;
- stable material exercise gap returning exit 0 = 0.

No arbitrary pre-data recall threshold is frozen.

**Result:** `PASS`

## 11. Ponytail / YAGNI Audit

The review repairs did **not** introduce:

- database or evidence service;
- validator service;
- schema-generation subsystem;
- shared generated type package;
- task-name mapping layer;
- workflow engine;
- persistent trust state;
- daemon/server;
- plugin SDK;
- semantic graph;
- recursive widening;
- AI subsystem;
- sandbox.

Root `evidence[]`, opaque IDs, exact-head governance, and one pure semantic receipt validator are direct truth-contract requirements, not speculative architecture.

**Result:** `PASS`

## 12. Task Plan Audit

Task range remains **T001–T088**.

Existing tasks were strengthened instead of multiplied:

- T009: schema + semantic receipt invariants, evidence refs, privacy-safe IDs;
- T012/T018: exact repository ID privacy contract;
- T020: rename old/new path fidelity;
- T025/T026: one receipt model + one pure semantic validator before emission/acceptance;
- T028/T037/T038: pytestBasic admission/config coverage;
- T033: E2E dangling/cross-run/cross-task evidence rejection;
- T047/T055: exercise state/count/reason integrity;
- T077: gap-to-exit absolute benchmark gate;
- T088: clean-checkout semantic-validation qualification.

**Result:** `PASS`

## 13. Requirements Gate

Current repaired checklist:

```text
84 / 84 PASS
```

- CHK073–CHK076: Qodo regressions.
- CHK077–CHK084: CodeRabbit regressions/governance checks.

**Result:** `PASS`

## 14. Planning-Branch Purity at Audit Target

Exact comparison of `main` to audited target `033bfc4839fc80e4c639ef71a8c09c80bfd7d4af`:

- ahead by 70 commits;
- behind by 0;
- 18 changed files;
- changed paths only under `.specify/`, `docs/founding/`, `specs/001-changed-code-verification-receipt/`, plus `LICENSE`;
- no `src/`;
- no `tests/`;
- no `benchmarks/`;
- no package manifest;
- no workflow;
- no product implementation.

**Result:** `PASS`

## 15. Residual Implementation / Release Gates — Not Planning Blockers

1. exact `cross-spawn` version/transitive provenance;
2. exact benchmark repositories/commits/licensing/execution terms;
3. npm package identity/ownership or scoped fallback;
4. native Windows process-tree behavior;
5. real Vitest/Jest/pytest version variance and selector/config misses;
6. measured time-to-signal.

None requires speculative architecture today.

## 16. Final Verdict

`PASS_READY_FOR_FRESH_EXACT_HEAD_PR_REVIEW`

At audited target `033bfc4839fc80e4c639ef71a8c09c80bfd7d4af`:

- open internal BLOCKER findings: **0**
- open internal MAJOR findings: **0**
- accepted Qodo findings unrepaired: **0**
- accepted CodeRabbit findings unrepaired in audited artifacts: **0**
- constitutional violations: **0**
- known false-green contract paths: **0**
- known silent changed-command execution paths: **0**
- known dangling-evidence contract paths accepted as valid: **0**
- known raw repository-location receipt forms accepted by intended contract: **0**
- product implementation files: **0**

### Authorization boundary

This verdict authorizes only:

- keeping PR #1 Ready for Review;
- resolving threads whose fixes are independently verified;
- consuming a **fresh external exact-head review** of the post-audit PR head;
- final merge consideration only after that review is clean and head/purity are reverified.

It does **not** authorize:

- merge before fresh repaired-head review completes;
- starting T001;
- writing product implementation;
- publishing a package.

Any material mutation to constitution/spec/plan/data model/contracts/tasks after the audited target requires reconciliation of affected audit claims and a new exact-HEAD review before merge or implementation authorization.