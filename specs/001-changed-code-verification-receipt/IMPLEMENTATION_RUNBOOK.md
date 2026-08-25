# Ascout M1 Implementation Runbook

**Purpose:** make the already-approved M1 plan easy for implementation agents to execute without changing its product, trust, receipt, or safety semantics.

**Authority:** this document is an execution aid only. If it conflicts with `.specify/memory/constitution.md`, `spec.md`, `plan.md`, `data-model.md`, contracts, or `tasks.md`, the canonical artifacts win.

**Baseline when this runbook was created:**

- `main`: `4c6125761b354530a22dbdc80afa8343f04ac62d`
- T036: `CLOSED_CANONICAL`
- T037: next task
- Current product runtime dependency budget remains exactly one reviewed runtime dependency: `cross-spawn@7.0.6`.

Live GitHub truth always overrides this baseline when the repository moves.

---

## 1. Builder Rule: One Small Task at a Time

The easiest safe way to finish M1 is **not** to redesign the architecture and not to implement a whole phase in one PR.

Default execution rule:

1. Start from current canonical `main`.
2. Select exactly the next unfinished task from `tasks.md`.
3. Read the adjacent production modules and the tests/contracts that already define its inputs and outputs.
4. Implement the smallest coherent delta that satisfies that task only.
5. Do not pre-build the next task unless the current task is impossible without it; if that occurs, stop and reconcile the plan instead of silently expanding scope.
6. Run focused tests first. Run typecheck/build/full tests when the repository dependencies are already available.
7. Never install dependencies implicitly merely to obtain evidence.
8. Publish one task-scoped PR, qualify the exact head honestly, merge it, then advance.

This keeps every PR reviewable, prevents future-task leakage, and makes regressions easy to locate.

---

## 2. Remaining M1 in Six Buildable Milestones

The canonical task IDs stay unchanged. The milestones below are only a mental/execution grouping so an agent can understand what each block is trying to make usable.

### Milestone A — Complete the first usable local `ascout check`

**Tasks:** T037–T043

**Goal:** a trusted local repository can be discovered, planned, admission-checked, executed through the existing bounded primitives, and rendered honestly through the first CLI path.

Build order:

- **T037** — basic pytest task planner in `src/tools/pytest.ts`.
- **T038** — effective command-surface classification/intersection in `src/discovery.ts`.
- **T039** — per-run changed-surface admission decision in `src/check.ts`.
- **T040** — terminal receipt from the single receipt truth model.
- **T041** — wire `ascout check` and `--allow-changed-command-surface`.
- **T042** — `ascout doctor`, discovery/authority only; no verification execution.
- **T043** — minimal `ascout init`; no installs/hooks/persistent trust grant.

**Milestone A exit condition:** an ordinary local run can show what was planned, what ran or did not run, and why; changed authority is refused before launch unless the human explicitly admits it for that invocation; no false green by omission.

### Milestone B — Prove changed executable code was exercised

**Tasks:** T044–T056

**Goal:** add the M1 differentiator: test execution is not enough; changed executable lines must have observable exercise evidence or remain an explicit gap.

Build order:

- T044–T049: lock LCOV, Vitest/Jest, exercise, widening, and exit behavior with tests first.
- T050: strict line-only LCOV normalization.
- T051: concrete Vitest integration.
- T052: concrete Jest integration.
- T053: conservative pre-run widening.
- T054: at most one bounded post-run widening pass.
- T055: changed-line exercise intersection.
- T056: render exercise/widening/completeness; remaining material gaps -> exit `4` absent higher precedence.

**Milestone B exit condition:** stable changed production code that is not exercised or cannot be resolved cannot return exit `0`.

### Milestone C — Selection integrity, drift, and flake truth

**Tasks:** T057–T064

**Goal:** make narrowed verification honest under selection accounting, repository mutation, and flaky failures.

Build order:

- T057–T060: tests first for selection, drift, flake, and exit precedence.
- T061: finalize strict SelectionAccount, maximum two passes.
- T062: end-source rehash and stability finalization.
- T063: exact failing-test rerun helpers, bounded observations only.
- T064: normalized reproduction/flake semantics.

**Milestone C exit condition:** source drift, unsafe selection, and contradictory failures are all visible and cannot be misreported as a clean stable pass.

### Milestone D — Agent-ready receipt without creating a second truth model

**Tasks:** T065–T070

**Goal:** expose factual test/snapshot changes and a compact agent-facing receipt while keeping terminal/JSON/agent derived from one semantically validated model.

Build order:

- T065–T067: tests first.
- T068: factual test/snapshot diff facts only.
- T069: bounded agent renderer, default maximum 16 KiB UTF-8.
- T070: `--format json|agent` from the same receipt truth source.

**Milestone D exit condition:** terminal, JSON, and agent output cannot disagree about source identity, status, admission, evidence, completeness, or exit semantics.

### Milestone E — Founding benchmark

**Tasks:** T071–T078

**Goal:** measure Ascout's actual claims before architecture expansion.

Do not add architecture merely to improve a hypothetical benchmark. Use the canonical corpus and publish misses honestly.

Absolute gates remain:

- cross-tree evidence leakage = 0
- binding-integrity violations = 0
- stable material exercise gap returning exit 0 = 0

**Milestone E exit condition:** the founding benchmark can be reproduced and Ascout cannot hide known binding/gap failures behind a green result.

### Milestone F — Cross-platform release candidate

**Tasks:** T079–T088

**Goal:** make the package releasable without inventing a second product surface.

Includes Windows/macOS/Linux CI, native Windows process-tree proof, deterministic receipt/path checks, package-content checks, security/contribution/readme/provenance updates, package ownership decision, and a clean-checkout release-candidate rehearsal.

**Milestone F exit condition:** T088 release-candidate evidence is recorded from a clean checkout; this does not by itself publish a release.

---

## 3. Stable Module Boundaries

Prefer extending the concrete modules that already exist rather than introducing abstraction layers.

Current core:

- `src/cli.ts` — CLI parsing/wiring boundary.
- `src/config.ts` — Config v1 parsing and digest.
- `src/discovery.ts` — bounded repository/project/tool discovery and later authority classification.
- `src/git.ts` — repository identity, HEAD, tree digest, changed scope.
- `src/process.ts` — bounded argv-only process execution and tree cleanup.
- `src/lock.ts` — run lock.
- `src/run.ts` — run lifecycle/retention.
- `src/redact.ts` — redaction/truncation.
- `src/receipt/model.ts` — receipt truth model, semantic validation, completeness/exit semantics.
- `src/receipt/json.ts` — JSON emission gate.
- `src/tools/typescript.ts` — typecheck planning.
- `src/tools/eslint.ts` — lint planning.

Expected additions should remain concrete and task-owned, for example `src/tools/pytest.ts`, `src/check.ts`, coverage/runner modules, and renderers when their canonical tasks arrive.

Do **not** create a generic plugin framework, workflow graph, daemon, database, semantic repository graph, VFS/path-policy subsystem, sandbox, or AI subsystem for M1.

---

## 4. Definition of Done for Every Implementation Task

A task is implementation-complete only when all applicable items below are true:

1. **Exact task scope:** the diff implements the named task and no future task semantics.
2. **Canonical contract preserved:** constitution/spec/plan/task invariants remain true.
3. **Fail-closed behavior:** ambiguity, missing capability, unsafe authority, or integrity uncertainty cannot become a fabricated PASS.
4. **Tests:** focused task tests cover normal behavior plus the material failure/refusal edges for that task.
5. **No hidden install:** Ascout does not install repository/tool dependencies implicitly.
6. **No shell-string execution:** repository commands remain argv-based; no arbitrary `shell:true` surface.
7. **Truthful validation report:** only claim tests/typecheck/build/CI that actually ran on the exact candidate.
8. **No dependency creep:** adding a second product runtime dependency requires returning to planning.
9. **Reviewable PR:** changed files are bounded enough for exact-head review.
10. **Advance only after closeout:** do not begin the next task inside the current task's merge/closeout.

---

## 5. Agent Execution Loop

For each task, the agent should use this loop:

```text
VERIFY LIVE MAIN
  -> READ CANONICAL TASK + ADJACENT CONTRACTS
  -> INSPECT EXISTING INPUT/OUTPUT TYPES
  -> CREATE ONE TASK BRANCH
  -> IMPLEMENT MINIMUM DELTA
  -> RUN FOCUSED VALIDATION
  -> RUN BROADER VALIDATION IF ALREADY AVAILABLE
  -> REVIEW EXACT HEAD / REPAIR ONLY MATERIAL FINDINGS
  -> MERGE / CLOSE TASK
  -> VERIFY NEW MAIN
  -> MOVE TO NEXT TASK
```

When a reviewer asks for future architecture that canonical task ownership assigns to a later task, reconcile that request against `tasks.md` before implementing it. Do not let review accidentally pull T038+ behavior into T037, T044+ behavior into T041, etc.

---

## 6. Immediate Next Task — T037

Canonical task:

> Implement basic pytest task in `src/tools/pytest.ts`; no Python affected/environment/coverage architecture; report effective pytest config source when used.

### T037 should be small

Mirror the planning style already established by `src/tools/typescript.ts` and `src/tools/eslint.ts`.

Expected responsibility:

- consume validated Config v1 plus the existing `ProjectDiscovery.pytestBasic` resolution;
- produce a typed pytestBasic plan with `planned`, `not_run`, or `not_applicable` state;
- support explicit user command override without inventing persistent trust;
- when discovery is used, use only clearly configured basic pytest state already proven by discovery;
- carry the effective pytest config source path when one is used;
- fail closed on absent/ambiguous/unsupported discovery;
- keep argv as an array and reject malformed configured argv;
- do not install Python/pytest;
- do not choose/manage Python environments;
- do not implement affected-test selection;
- do not claim Python coverage or changed-line exercise;
- do not implement T038 authority intersection/admission;
- do not wire full `ascout check` orchestration (T039–T041 own that work).

### T037 likely files

Keep the change bounded around:

- `src/tools/pytest.ts`
- focused T037 tests under `tests/`

Only touch shared discovery/model/config code if a real T037 contract gap makes it necessary; prefer reusing the existing shapes first.

### T037 acceptance questions

Before closeout, a reviewer should be able to answer yes to all of these:

- Does a disabled configured pytestBasic task become an honest non-executed/not-applicable plan with its reason?
- Does an explicit valid argv override remain argv-only and identify user configuration as command provenance?
- Does discovered pytestBasic use exactly one effective config source?
- Does ambiguity/missing capability fail closed rather than guessing?
- Is no Python environment/affected-selection/coverage architecture introduced?
- Is no command-surface admission logic implemented early?

If yes, stop. T038 is the next task.

---

## 7. Hard M1 Non-Goals While Finishing the Plan

Do not add any of the following unless the canonical plan is explicitly amended:

- second product runtime dependency;
- DB/SQLite/graph store;
- daemon/server/cloud control plane;
- generic plugin SDK;
- semantic dependency graph/index;
- automatic dependency installation;
- arbitrary workflow/prerequisite language;
- untrusted-repository sandboxing;
- persistent changed-command trust grants;
- agent-added admission override;
- shell-string repository commands;
- recursive widening;
- AI reasoning/test generation/source fixing;
- CI/SARIF as a new first-class product surface;
- browser/security/mutation/fuzz/load/accessibility orchestration.

The M1 goal is still simple:

> **Ascout — Verify everything AI ships. Know exactly what passed, failed, and was never checked.**
