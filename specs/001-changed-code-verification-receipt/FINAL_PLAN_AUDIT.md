# 001 — Independent Final Plan Audit

**Date:** 2026-08-21  
**Audit target exact head:** `3028d3a743516997152770405dc4d7bae8bcfb85`  
**Branch:** `planning/000-ascout-foundation`  
**Verdict:** `PASS_READY_FOR_DRAFT_PR_REVIEW`  
**Implementation authorization:** **NO**

This audit is a fresh adversarial pass over the repaired founding planning set. It does not rely on the earlier 72/72 checklist as proof. The target head contains no product implementation; this audit record is the only intended mutation after the audited head before exact-head PR verification.

## 1. Audit Questions

The review attempted to invalidate the plan on six axes:

1. **False green:** Can Ascout return success while material changed code or applicable verification remains unchecked?
2. **Execution authority:** Can an AI edit the command/config surface and cause Ascout to execute the new authority without explicit human admission?
3. **Source/evidence identity:** Can evidence drift across trees/runs or leak raw repository/workstation identity?
4. **Cross-platform execution:** Does the plan pretend Windows process/command behavior matches POSIX?
5. **Benchmark validity:** Does the benchmark measure Ascout rather than merely donor/test-runner behavior?
6. **YAGNI/scope:** Does M1 contain architecture justified only by future possibilities?

## 2. Final-Audit Findings

### FA-001 — Changed command/config warning was not admission control

**Severity:** BLOCKER / SECURITY  
**Disposition:** RESOLVED BEFORE AUDIT TARGET HEAD

Earlier planning allowed a changed package/test/compiler/lint command surface to be warned about and then executed. Because the expected workflow is “AI changes repository → Ascout checks it,” that was insufficient: the AI could have changed the exact authority Ascout was about to execute/load.

Final contract:

- identify the effective authority files actually used for each task;
- if one changed in the current comparison, refuse that task before launch/load;
- emit `NOT_RUN(command_surface_changed)`;
- record changed authority paths;
- mark `execution_admission=refused_changed_surface`;
- stable result is materially incomplete / exit `4` absent a higher-precedence condition;
- human may explicitly run `ascout check --allow-changed-command-surface` after review;
- override is per invocation only, receipt-visible, not stored in config/trust state, and never automatically added by agent instructions/hooks.

This closes the M1 authority gap without inventing sandbox/trust infrastructure.

### FA-002 — Exercise gaps could previously coexist with clean success

**Severity:** BLOCKER / PRODUCT HONESTY  
**Disposition:** RESOLVED BEFORE AUDIT TARGET HEAD

Final contract: any remaining material changed executable `NOT_EXERCISED` or `UNRESOLVED` line after the bounded widening policy prevents exit `0` and yields stable incomplete exit `4` absent a higher-precedence condition.

### FA-003 — Local repository identity could leak workstation path

**Severity:** MAJOR / PRIVACY  
**Disposition:** RESOLVED BEFORE AUDIT TARGET HEAD

Final local-only identity is `local:<sha256(canonical-real-repository-path)>`, `portable=false`; raw absolute path is never persisted/rendered.

### FA-004 — Config/task extensibility exceeded M1 need

**Severity:** MAJOR / YAGNI  
**Disposition:** RESOLVED BEFORE AUDIT TARGET HEAD

Config v1 overrides fixed semantic tasks only. There is no user task graph, prerequisite DSL, hook system, or persistent admission grant.

## 3. False-Green Audit

### Clean exit `0` requires all of the following

- source stability is `stable`;
- no higher-precedence integrity/config/task-execution error;
- at least one material applicable verification task actually executed;
- no repository finding or flaky result;
- no applicable task remains materially `NOT_RUN` or `BLOCKED`;
- no changed-command admission refusal remains;
- affected selection is valid or widened according to the finite policy;
- no material changed executable exercise gap remains.

### Result

`PASS`

No reviewed path turns omission, admission refusal, coverage uncertainty, or task execution error into clean success.

## 4. Trust / Execution-Authority Audit

The plan explicitly limits v0.x to the developer's own trusted local repository; it does not claim arbitrary untrusted PR safety.

Within that boundary it still treats the **current AI diff** as capable of changing execution authority. Command provenance is recorded; effective changed command/config authority is refused by default; no implicit dependency installation is permitted; argv execution avoids arbitrary shell strings; automation cannot silently add the admission override.

The plan does not claim child-process network isolation.

### Result

`PASS_WITH_EXPLICIT_SCOPE_BOUNDARY`

Untrusted-repository support remains a future separately reviewed design gate.

## 5. Source / Evidence Integrity Audit

Required properties are explicit:

- secret-safe repository identity;
- full current changed source state bound through HEAD/index/worktree/all non-gitignored untracked files except `.ascout/`;
- tracked files are never excluded merely because tools may rewrite them;
- start/end digest detects drift;
- source stability is separate from verification completeness;
- evidence IDs are run-bound;
- weak fingerprints never transfer evidence;
- `in_changed_lines` is locational and never causal attribution;
- raw origin, raw local absolute path, recognized secret values, and persisted argv receive explicit privacy treatment.

### Result

`PASS`

Absolute benchmark gate remains: cross-tree evidence leakage = 0 and binding-integrity violations = 0.

## 6. Windows / Cross-Platform Audit

The plan does not assume POSIX child termination semantics on Windows. It assigns:

- `cross-spawn` only for cross-platform executable/command-shim launch normalization;
- Ascout-owned bounded timeout/capture/process-tree cleanup;
- native Windows cases as release-blocking CI evidence;
- Windows/macOS/Linux project CI on Node 22/24;
- deterministic path/receipt normalization checks across OS boundaries.

Exact Windows termination mechanics/constants are implementation details guarded by explicit tests and release gates rather than guessed in planning.

### Result

`PASS_AS_PLANNING_CONTRACT`

Native Windows evidence is required before release, not claimed today.

## 7. Benchmark Audit

The benchmark measures Ascout-specific claims:

- selection recall and false-PASS against full-suite ground truth;
- Ascout vs native related selection vs full/plain baselines;
- changed-code exercise-gap accuracy against independently established full-run coverage;
- unresolved mapping rate;
- cold/warm time-to-signal;
- drift, deterministic receipt, and flake classification;
- zero cross-tree evidence leakage and zero binding-integrity violations.

Real historical fixes are used; no arbitrary pre-data 98% threshold is fabricated; selector misses must be published.

### Result

`PASS`

Exact repositories/cases remain a reviewed benchmark-acquisition task, not an unproven planning assertion.

## 8. Ponytail / YAGNI Audit

M1 deliberately does **not** contain:

- Rust core;
- DB/SQLite/graph database;
- daemon/server/cloud control plane;
- semantic repository/dependency graph;
- public/generic plugin SDK;
- arbitrary config workflow/task graph;
- persistent trust database;
- untrusted-repository sandbox;
- AI reasoning or test generation;
- browser/security/mutation/property/fuzz/DAST/load/accessibility/performance orchestration;
- first-class user-facing CI/SARIF;
- recursive widening.

Native/platform capability is preferred: Git, Node, project-local TypeScript/ESLint, Vitest/Jest selection and coverage, LCOV. Planned product runtime dependency budget remains one justified dependency (`cross-spawn`), subject to exact-version provenance review.

Changed-command admission is a per-run flag and receipt state, not a new subsystem.

### Result

`PASS`

## 9. Task Plan Audit

Final planning task range: **T001–T088**.

The tasks preserve tests-first ordering on trust-critical primitives and explicitly cover:

- source identity/privacy;
- tree binding/drift;
- process control and Windows behavior;
- output/argv redaction;
- command admission/refusal/per-run override/no agent escalation;
- no-green task and exercise-gap semantics;
- native selection/widening;
- flake/reproduction;
- agent receipt consistency;
- benchmark integrity;
- dependency licensing, package identity, and clean-checkout qualification.

Stop conditions return material architecture changes to planning.

### Result

`PASS`

## 10. Planning-Branch Purity

At the start of final review, the branch diff against `main` contained only:

- `.specify/` provenance/constitution;
- `docs/founding/` planning documents;
- `specs/001-changed-code-verification-receipt/` specification/design/contracts/checklists/tasks/audit artifacts;
- `LICENSE`.

No `src/`, `tests/`, `benchmarks/`, package manifest, workflow, or product implementation was present.

This must be reverified against the final PR head before any merge.

## 11. Residual Gates That Do Not Block the Planning PR

These are explicitly deferred to implementation/release evidence:

1. exact `cross-spawn` version/transitive provenance;
2. exact benchmark repositories/commits/licensing and runnable corpus;
3. npm package identity/ownership or scoped fallback;
4. native Windows process-tree behavior;
5. real runner-version variance and selector misses;
6. measured performance/time-to-signal.

None requires speculative M1 architecture today.

## 12. Final Verdict

`PASS_READY_FOR_DRAFT_PR_REVIEW`

At audit target head `3028d3a743516997152770405dc4d7bae8bcfb85`:

- open BLOCKER findings: **0**
- open MAJOR findings: **0**
- constitutional violations: **0**
- known false-green contract paths: **0**
- known silent changed-command execution paths: **0**
- known cross-tree evidence reuse paths: **0**
- product implementation files: **0**

### Authorization boundary

This verdict authorizes **opening a Draft planning PR and performing an exact-head GitHub review only**.

It does **not** authorize:

- marking the PR Ready;
- merging the planning PR;
- starting T001;
- writing product implementation;
- publishing a package.

Any material mutation to constitution/spec/plan/data model/contracts/tasks after the audited head requires a fresh reconciliation of the affected audit claims before merge.