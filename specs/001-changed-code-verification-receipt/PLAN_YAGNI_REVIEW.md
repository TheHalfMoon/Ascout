# 001 — Post-Plan Ponytail/YAGNI Review

**Gate:** `PASS_AFTER_REPAIR`  
**Date:** 2026-08-21

## Decision

The repaired technical plan remains the minimum credible M1 architecture after internal analysis, the independent admission audit, Qodo review, and two CodeRabbit exact-head review rounds.

Earlier designs failed the Ponytail test in two material ways and were deleted before implementation:

1. config v1 briefly behaved like a workflow/task-runner DSL; and
2. changed command/config surfaces were only warned about before execution.

Qodo then tightened four existing machine-contract concepts. CodeRabbit subsequently exposed stale-head governance, evidence-reference integrity, privacy-enforceability, semantic receipt consistency, benchmark, pytest admission, persisted-path containment, and plan-summary consistency gaps.

The accepted review repairs do **not** justify a new service, database, policy engine, code-generation pipeline, schema package, plugin layer, trust store, path subsystem, or task range.

## Dependency ladder

### `cross-spawn` — KEEP

Windows command-shim/PATHEXT/shebang launch behavior is security-sensitive plumbing outside Ascout's wedge. Reuse is smaller than reimplementing it.

Boundary: launch normalization only. Ascout owns timeout, bounded capture, process-tree termination, result semantics, and tests.

### All other product runtime libraries — REJECT FOR M1

- No CLI framework: `node:util.parseArgs` is enough.
- No executable config framework/parser: JSON is enough.
- No coverage database/library: strict line-level LCOV parser is enough.
- No Git library: Git CLI is canonical.
- No logging framework: bounded receipt/artifact writers are enough.
- No dedicated receipt-validation framework: one pure validator in the receipt model is enough.
- No path-normalization/virtual-filesystem framework: Node path primitives plus Git-style persisted path normalization are enough.
- No schema-generation/shared-type package solely because config/receipt contracts are strict.
- No new schema-validation runtime dependency unless implementation proves the existing minimal approach cannot safely uphold fixed v1 contracts.

## Abstraction audit

- `src/tools/*` remain concrete integrations, not a plugin hierarchy.
- `receipt/model.ts` is justified because three renderers share one truth model and one semantic invariant function.
- Root `evidence[]` is data already required by “Evidence Before Claims”; it is not a persistence service.
- The semantic receipt validator is a **pure function over one receipt**, not a validator service, workflow engine, or repository.
- Canonical persisted path validation is another rule in that same pure function, not a filesystem abstraction or path policy engine.
- `process.ts` is justified by launch/timeout/tree-kill safety.
- `git.ts` is justified by source identity/diff/drift sharing Git semantics.
- Fixed internal prerequisite ordering is allowed; user-defined task/prerequisite graphs are not.
- Config and receipt use the same fixed task identifiers; no translation/mapping layer is justified.
- Opaque `remote:<sha256>` and `local:<sha256>` IDs reduce privacy state rather than add identity infrastructure.
- No repository graph, event bus, DI container, persistence abstraction, workflow engine, sandbox manager, trust database, schema-generation pipeline, virtual filesystem, or distributed validator is permitted.

## Boundaries locked

### B1 — No recursive widening engine

A narrowed test run may trigger at most one post-run widening pass. If the wider pass still leaves material changed executable code unexercised/unresolved, Ascout reports incomplete exit `4`; it does not invent recursive impact analysis.

### B2 — No semantic test-weakening analyzer

M1 reports factual changed/deleted test/snapshot paths only. Semantic weakening inference waits for a reliable future detector with benchmark evidence.

### B3 — No config workflow DSL

Config v1 can override only fixed semantic tasks (`typecheck`, `lint`, `test`, `pytestBasic`) plus timeout/budget/redaction. Arbitrary task names, user prerequisites, workspace orchestration, expressions, hooks, and admission grants are deleted from M1.

### B4 — No green exercise gap

Remaining material `NOT_EXERCISED`/`UNRESOLVED` changed executable lines produce stable incomplete exit `4`, not clean success. The benchmark explicitly asserts the same mapping.

### B5 — Changed execution authority defaults to refusal

If the current diff changes the **effective authority files actually used** to derive/load a repository task, warning-then-execute is rejected. The task becomes `NOT_RUN(command_surface_changed)` before process launch/load. A human may explicitly admit the changed surface for one invocation with `--allow-changed-command-surface`.

The admission mechanism deliberately does **not** add:

- `.ascout/trust.json`;
- persistent trust grants;
- a sandbox/VM/container layer;
- a generic policy language;
- approval databases;
- agent-autonomous escalation.

The same generic admission mechanism covers `pytestBasic`; no Python-specific trust subsystem is introduced.

### B6 — Contract strictness is not architecture

Qodo repairs stay inside existing receipt/config concepts:

- require reasons where status already needs them;
- preserve `previous_path` where rename semantics need it;
- make the three exercise states internally coherent;
- use `pytestBasic` consistently rather than maintaining a mapping layer.

CodeRabbit repairs also remain inside existing concepts:

- a required root `evidence[]` gives `evidence_ids` something real to reference;
- opaque repository IDs make privacy constraints schema-enforceable;
- one pure semantic validator enforces cross-object relations JSON Schema cannot express cleanly;
- exact-HEAD review is governance freshness, not runtime architecture;
- pytest command admission is reuse of the same generic admission gate;
- benchmark gap-to-exit assertion tests an existing product rule;
- persisted path containment is a schema/validator invariant over fields that already existed;
- adding `pytestBasic` to the opening plan summary fixes scope wording and creates no new behavior.

### B7 — One receipt interpretation only

Schema validation and semantic validation are two layers of **one** receipt contract, not competing interpretations. Any internal/future receipt acceptance path reuses the same pure semantic validator used before emission.

Creating a second acceptance model, alternate summary calculator, validator microservice, or persistence-backed evidence resolver is rejected for M1.

### B8 — Relative persisted paths, not a path subsystem

All persisted repository paths use one canonical slash-separated repository-relative form. `artifact.relative_run_path` uses the same canonical relative shape but is relative to the current run directory. Absolute POSIX, Windows drive/UNC, URI-absolute, backslash-canonicalization violations, and `.` / `..` traversal are rejected after normalization.

This does not require a virtual filesystem, path registry, mount abstraction, or sandbox. It is a privacy/integrity predicate in the existing receipt model.

## Security/privacy reductions

- Raw credential-bearing Git origins are never persisted.
- Remote receipt identity is always opaque `remote:<sha256>` with `portable=true`.
- Local-only identity is `local:<sha256>` with `portable=false`; raw absolute workstation path is never persisted.
- Every persisted path-bearing receipt field is canonical and relative to its declared repository/run namespace; absolute, UNC, URI, traversal, and noncanonical backslash forms are rejected.
- Persisted/rendered argv is redacted; raw argv is transient launch input only.
- All non-gitignored untracked files except `.ascout/` participate in source identity.
- Unstaged type/mode participates in tree identity.
- Changed effective command authority is refused by default rather than merely warned about.
- Omission/error statuses require explicit machine-readable and human-readable reasons.
- Evidence refs must resolve to current-run evidence/task/artifact objects before emission.

## Governance reduction

The fresh exact-HEAD review gate does not require a review service or new workflow engine. It is a process invariant:

```text
final audit
→ material mutation? reconcile affected claims
→ exact-HEAD cross-artifact + branch-purity review
→ only then implementation/merge consideration
```

A stale audit simply has no authority.

## Complexity budget

The source tree remains an upper bound. Adjacent modules SHOULD collapse when trivial. New runtime dependencies, DB/background processes, semantic indexes, generic plugin interfaces, arbitrary config workflow edges, recursive widening, persistent trust state, automatic admission escalation, task-name translation layers, receipt-validator services, path-policy subsystems, or schema-generation subsystems require a plan amendment and constitution check.

**Disposition:** `PASS_AFTER_REPAIR`. Qodo + CodeRabbit reconciliation strengthened existing truth contracts and governance without expanding the product architecture. No implementation is authorized.