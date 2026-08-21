# Ascout Constitution

## Core Principles

### I. Evidence Before Claims
Every material verification result MUST identify the task that produced it and the evidence bound to that run. AI-generated hypotheses, if added later, MUST NOT be treated as proof by themselves. Ascout MUST prefer directly observed compiler, test, coverage, and tool evidence over inferred confidence.

### II. No Green by Omission
`PASS` means a task ran successfully; it MUST NOT mean that nothing ran. Deselected, unavailable, disabled, budget-limited, blocked, unsupported, or otherwise unexecuted verification MUST remain visible with a reason. Reports MUST NOT use unqualified totality language when material verification did not run.

The M1 task-status vocabulary is constitutionally fixed as:

- `PASS`
- `FAIL`
- `FLAKY`
- `BLOCKED`
- `ERROR`
- `NOT_APPLICABLE`
- `NOT_RUN(reason_code, reason_text)`

`ERROR` describes failure of Ascout or task execution and MUST NOT be presented as a repository failure. Deselected tests MUST NOT be presented as passed.

### III. Source-Bound Truth
Every run MUST bind its evidence to the exact source state it observed. Evidence from one run or source tree MUST NOT silently become evidence for another. The source identity contract MUST include repository identity, HEAD when available, a start-of-run tree identity, configuration identity, and start/end drift detection.

Finding fingerprints MAY assist weak matching across runs, but fingerprints are not evidence and MUST NOT carry evidence forward. Location and causation are separate: `in_changed_lines` MUST NOT be interpreted as `introduced_by_change`. Causal attribution remains `unknown` without comparative evidence.

### IV. Trusted Local Scope and Explicit Authority
Ascout v0.x supports only the developer's own trusted local repository. Arbitrary third-party repositories and untrusted PR branches are out of scope until a separately reviewed sandbox/admission design is authorized.

Ascout MUST NOT install dependencies implicitly. Every executed task MUST record command provenance (`user_config`, `repo_config`, or `discovery`) and its source. If the current change modifies the command surface Ascout intends to execute, Ascout MUST warn before execution. Automation MUST NOT silently expand command authority.

The core path requires no Ascout account, repository upload, SaaS backend, cloud service, or model/API key. This local-first property MUST NOT be misrepresented as network isolation of child processes or tests.

### V. Native Capability Before Invention
Ascout MUST use proven platform/tool capabilities before building proprietary substitutes: Git diff, test-runner related/changed selection, native coverage, workspace metadata, and tool-native caches where trustworthy.

M1 MUST remain a minimal CLI core: no daemon, server, graph database, SQLite requirement, Rust requirement, public plugin SDK, required LLM, or cloud control plane. New subsystems require demonstrated need. Roadmap optionality MUST NOT shape current abstractions.

### VI. Conservative Affected Verification
Runtime reduction is subordinate to avoiding false confidence. When affected scope cannot be narrowed safely, Ascout MUST widen verification. Selection mode, widening triggers, selected counts, and deselected counts MUST be visible in the verification receipt.

Changed-code coverage proves observed execution only; it MUST NOT be described as proof of correctness. Coverage/source-map uncertainty MUST remain visible.

### VII. Bounded, Read-Only, Private Execution
Ascout MUST NOT silently modify product source. Verification artifacts belong in ignored Ascout/tool-owned paths; any tracked-file mutation caused during verification MUST remain visible as source drift.

Every executable verification task MUST have bounded execution semantics. Timeouts, internal errors, blocked downstream work, and concurrent-run behavior MUST fail closed with respect to claims. M1 MUST refuse concurrent Ascout runs rather than queueing them.

Captured output MUST be treated as potentially sensitive. `.ascout/` MUST be ignored by default, recognized secret-bearing environment values MUST be redacted from stored output, and retained artifacts MUST be documented.

### VIII. Provenance, Licensing, and Benchmark-Gated Growth
Code licenses, rules licenses, data licenses, database redistribution terms, and permitted-use restrictions MUST be evaluated separately. Process isolation MUST NOT be assumed to cure use restrictions, AGPL network-service obligations, data attribution obligations, or nested third-party licenses. Donor code MUST NOT enter Ascout without exact-version/component provenance review.

Architecture expansion MUST be justified by observed benchmark misses, adoption friction, or operational limits. The benchmark MUST measure Ascout's own claims—not merely the detection quality of donor tools. Cross-tree evidence leakage and source-binding violations have an absolute acceptable count of zero.

## Founding Product Constraints

The M1 product wedge is an **evidence-bound changed-code verification receipt**. After an AI coding change, Ascout MUST show:

- what changed;
- what verification ran;
- what did not run and why;
- what passed, failed, flaked, errored, or was blocked;
- which changed executable lines were exercised by the tests that actually ran;
- which changed executable lines were not exercised;
- factual changes to tests where reliably detectable;
- selected and deselected test accounting;
- the source state to which the evidence belongs.

The public identity is:

> **Ascout — Verify everything AI ships.**  
> **Know exactly what passed, failed, and was never checked.**

The headline is the mission; the verification receipt is the technical contract.

M1 does not include untrusted-repository sandboxing, CI/SARIF as a first-class surface, browser orchestration, security-suite orchestration, mutation/property/fuzz/DAST/load testing, accessibility/performance verification, a semantic repository graph, AI reasoning, test generation, or automatic source fixing.

## Development Workflow and Quality Gates

All product work MUST follow the canonical Spec Kit sequence unless a later constitutional amendment explicitly changes it:

1. constitution compliance;
2. feature specification (`what` and `why`);
3. clarification of material ambiguity;
4. Ponytail/YAGNI reduction pass;
5. technical plan (`how`);
6. second Ponytail plan-reduction pass;
7. implementation tasks;
8. requirements-quality checklist;
9. cross-artifact analysis;
10. independent final plan audit;
11. explicit implementation authorization.

No product implementation is authorized merely because planning artifacts exist. Complexity violations MUST be recorded and justified in the plan; otherwise the simpler design wins.

Tests and benchmark cases MUST validate the trust claims that matter most: source binding, no green by omission, drift detection, selection accounting, changed-code exercise reporting, and zero cross-tree evidence leakage.

## Governance

This constitution supersedes informal design discussion for canonical Ascout work. Specifications, plans, tasks, code reviews, and releases MUST demonstrate compliance.

Amendments require:

1. an explicit proposed constitutional delta;
2. rationale and affected artifacts;
3. review for trust, scope, licensing, and complexity impact;
4. version increment using semantic constitutional versioning;
5. migration/reconciliation of affected canonical specifications.

Principles that protect evidence integrity, no-green-by-omission, source binding, or explicit trust boundaries MUST NOT be weakened through ordinary feature work.

Ponytail/YAGNI is a complexity gate, not an architecture generator. GitHub Spec Kit is the canonical specification workflow, pinned initially by `.specify/PROVENANCE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-08-21 | **Last Amended**: 2026-08-21
