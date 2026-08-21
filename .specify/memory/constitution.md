# Ascout Constitution

## Core Principles

### I. Evidence Before Claims
Every material verification result MUST identify the task that produced it and the evidence bound to that run. AI-generated hypotheses, if added later, MUST NOT be treated as proof by themselves. Ascout MUST prefer directly observed compiler, test, coverage, and tool evidence over inferred confidence.

### II. No Green by Omission
`PASS` means a task ran successfully; it MUST NOT mean that nothing ran. Unavailable, disabled, budget-limited, blocked, unsupported, or otherwise unexecuted applicable verification MUST remain visible with a reason. Reports MUST NOT use unqualified totality language when material verification did not run.

The M1 task-status vocabulary is fixed as:

- `PASS`
- `FAIL`
- `FLAKY`
- `BLOCKED`
- `ERROR`
- `NOT_APPLICABLE`
- `NOT_RUN(reason_code, reason_text)`

`ERROR` describes failure of Ascout/task execution and MUST NOT be presented as a repository failure. Deselected tests MUST NOT be presented as passed; valid affected-test deselection is selection accounting, not a fabricated task-level `NOT_RUN`.

A changed executable line that remains `NOT_EXERCISED` or `UNRESOLVED` after the permitted conservative widening policy is a material verification gap and MUST prevent clean success exit `0`.

### III. Source-Bound Truth
Every run MUST bind evidence to the exact source state observed. Evidence from one run/tree MUST NOT silently become evidence for another. The source identity contract MUST include secret-safe repository identity, HEAD when available, start tree identity, configuration identity, and start/end drift detection.

Persisted remote identity MUST NOT expose raw credentials/userinfo/query/fragment material. All non-gitignored untracked files except `.ascout/` participate in M1 source identity; there is no heuristic hidden untracked-source omission list. Current worktree type/mode changes MUST be represented even when file bytes are unchanged.

Finding fingerprints MAY assist weak run-to-run matching, but are not evidence. `in_changed_lines` MUST NOT be interpreted as `introduced_by_change`; causal attribution remains `unknown` without comparative evidence.

### IV. Trusted Local Scope and Explicit Authority
Ascout v0.x supports only the developer's own trusted local repository. Arbitrary third-party repositories and untrusted PR branches are out of scope until separately reviewed sandbox/admission design is authorized.

Ascout MUST NOT install dependencies implicitly. Every executed task MUST record command provenance (`user_config`, `repo_config`, or `discovery`) and its source when one exists. If the current change modifies the command surface Ascout intends to execute, Ascout MUST warn before execution. Automation MUST NOT silently expand authority.

The core path requires no Ascout account, repository upload, SaaS backend, cloud service, or model/API key. This local-first property MUST NOT be misrepresented as network isolation of child processes/tests.

M1 configuration MUST remain a correction/override surface for fixed product tasks; it MUST NOT become an arbitrary task/workflow/prerequisite graph language.

### V. Native Capability Before Invention
Ascout MUST use proven platform/tool capabilities before building proprietary substitutes: Git diff/state, runner-native related/changed selection, native coverage, basic workspace metadata, and trustworthy native caches.

M1 MUST remain a minimal CLI core: no daemon, server, graph database, SQLite requirement, Rust requirement, public plugin SDK, required LLM, or cloud control plane. New subsystems require demonstrated need. Roadmap optionality MUST NOT shape current abstractions.

### VI. Conservative Affected Verification
Runtime reduction is subordinate to avoiding false confidence. When affected scope cannot be narrowed safely, Ascout MUST widen verification. Selection mode, widening triggers, selected/deselected counts when knowable, unknown-count limitations, and skipped scope MUST be visible.

Changed-code coverage proves observed execution only; it MUST NOT be described as correctness proof. Coverage/source-map uncertainty MUST remain visible and blocks clean success when it leaves material changed executable code unresolved.

### VII. Bounded, Read-Only, Private Execution
Ascout MUST NOT silently modify product source. Verification artifacts belong in `.ascout/`; any tracked or included non-gitignored source mutation during verification MUST remain visible as source drift.

Every executable verification task MUST have bounded execution semantics. Timeouts, internal errors, blocked downstream work, and concurrent-run behavior MUST fail closed with respect to claims. M1 MUST refuse concurrent Ascout runs rather than queueing them.

Captured/persisted evidence MUST be treated as potentially sensitive. `.ascout/` MUST be ignored by default. Recognized secret-bearing environment values MUST be redacted from persisted output and persisted/rendered command argv. Raw secret-bearing argv and raw credential-bearing origin strings MUST NOT be written to run artifacts. Retained artifacts MUST be documented and bounded.

### VIII. Provenance, Licensing, and Benchmark-Gated Growth
Code licenses, rules licenses, data licenses, database redistribution terms, and permitted-use restrictions MUST be evaluated separately. Process isolation MUST NOT be assumed to cure use restrictions, AGPL network-service obligations, data attribution obligations, or nested third-party licenses. Donor code MUST NOT enter Ascout without exact-version/component provenance review.

Architecture expansion MUST be justified by observed benchmark misses, adoption friction, or operational limits. The benchmark MUST measure Ascout's own claims—not merely donor-tool detection quality. Cross-tree evidence leakage and source-binding violations have an absolute acceptable count of zero.

## Founding Product Constraints

The M1 product wedge is an **evidence-bound changed-code verification receipt**. After an AI coding change, Ascout MUST show:

- what changed;
- what verification ran;
- what did not run and why;
- what passed, failed, flaked, errored, or was blocked;
- which changed executable lines were exercised;
- which changed executable lines were not exercised or could not be resolved;
- factual changes to tests/snapshots where reliably detectable;
- selected/deselected test accounting or explicit unknown limitations;
- the source state to which current-run evidence belongs.

The public identity is:

> **Ascout — Verify everything AI ships.**  
> **Know exactly what passed, failed, and was never checked.**

The headline is the mission; the receipt is the technical contract.

M1 does not include untrusted-repository sandboxing, CI/SARIF as a first-class Ascout surface, browser orchestration, security-suite orchestration, mutation/property/fuzz/DAST/load testing, accessibility/performance verification, a semantic repository graph, AI reasoning, test generation, or automatic source fixing.

## Development Workflow and Quality Gates

All product work MUST follow the canonical founding sequence unless a constitutional amendment explicitly changes it:

1. constitution compliance;
2. feature specification (`what`/`why`);
3. material clarification;
4. Ponytail/YAGNI reduction;
5. technical plan (`how`);
6. second Ponytail plan reduction;
7. implementation tasks;
8. requirements-quality checklist;
9. cross-artifact analysis;
10. independent final plan audit;
11. explicit implementation authorization.

Planning artifacts do not authorize implementation by themselves. Complexity violations MUST be recorded/justified; otherwise the simpler design wins.

Tests/benchmark cases MUST validate source binding, no green by omission, drift, selection accounting, changed-code exercise reporting, secret-safe persistence, and zero cross-tree evidence leakage.

## Governance

This constitution supersedes informal design discussion for canonical Ascout work. Specifications, plans, tasks, code reviews, and releases MUST demonstrate compliance.

Amendments require:

1. explicit constitutional delta;
2. rationale and affected artifacts;
3. review for trust/scope/licensing/complexity impact;
4. semantic constitution version increment;
5. reconciliation of affected canonical specs.

Principles protecting evidence integrity, no-green-by-omission, source binding, or explicit trust boundaries MUST NOT be weakened through ordinary feature work.

Ponytail/YAGNI is a complexity gate, not an architecture generator. GitHub Spec Kit is the canonical specification workflow, pinned initially by `.specify/PROVENANCE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-08-21 | **Last Amended**: 2026-08-21
