# Ascout Constitution

## Core Principles

### I. Evidence Before Claims
Every material verification result MUST identify the task that produced it and the evidence bound to that run. A receipt that exposes `evidence_ids` MUST also contain resolvable current-run evidence entries; opaque/dangling evidence references are invalid. AI-generated hypotheses, if added later, MUST NOT be treated as proof by themselves. Ascout MUST prefer directly observed compiler, test, coverage, and tool evidence over inferred confidence.

### II. No Green by Omission
`PASS` means a task ran successfully; it MUST NOT mean that nothing ran. Unavailable, disabled, budget-limited, blocked, unsupported, admission-refused, or otherwise unexecuted applicable verification MUST remain visible with a reason. Reports MUST NOT use unqualified totality language when material verification did not run.

The M1 task-status vocabulary is fixed as:

- `PASS`
- `FAIL`
- `FLAKY`
- `BLOCKED`
- `ERROR`
- `NOT_APPLICABLE`
- `NOT_RUN(reason_code, reason_text)`

`NOT_RUN`, `BLOCKED`, and `ERROR` MUST carry non-empty machine-readable and human-readable reasons. `ERROR` describes failure of Ascout/task execution and MUST NOT be presented as a repository failure. Deselected tests MUST NOT be presented as passed; valid affected-test deselection is selection accounting, not a fabricated task-level `NOT_RUN`.

A changed executable line that remains `NOT_EXERCISED` or `UNRESOLVED` after the permitted conservative widening policy is a material verification gap and MUST prevent clean success exit `0`. `UNRESOLVED` MUST retain a non-empty reason explaining the mapping uncertainty.

### III. Source-Bound Truth
Every run MUST bind evidence to the exact source state observed. Evidence from one run/tree MUST NOT silently become evidence for another. The source identity contract MUST include secret-safe repository identity, HEAD when available, start tree identity, configuration identity, and start/end drift detection.

Persisted repository identity MUST be privacy-safe and schema-enforceable. For a repository with a remote, M1 persists `remote:<sha256(normalized-credential-free-remote-identity)>` with `portable=true`; raw origin strings, credentials/userinfo/query/fragment material MUST NOT be written to receipts or run artifacts. For a repository with no remote, M1 persists `local:<sha256(canonical-real-repository-path)>` with `portable=false`; the raw absolute local path MUST NOT be written to receipts or run artifacts.

All non-gitignored untracked files except `.ascout/` participate in M1 source identity; there is no heuristic hidden untracked-source omission list. Current worktree type/mode changes MUST be represented even when file bytes are unchanged. A rename MUST preserve both current path and previous path in the machine contract.

Finding fingerprints MAY assist weak run-to-run matching, but are not evidence. `in_changed_lines` MUST NOT be interpreted as `introduced_by_change`; causal attribution remains `unknown` without comparative evidence.

### IV. Trusted Local Scope and Explicit Authority
Ascout v0.x supports only the developer's own trusted local repository. Arbitrary third-party repositories and untrusted PR branches are out of scope until separately reviewed sandbox/admission design is authorized.

Ascout MUST NOT install dependencies implicitly. Every executed task MUST record command provenance (`user_config`, `repo_config`, or `discovery`) and its effective authority/config sources when known.

**A changed command surface MUST NOT be merely warned about and then executed by default.** If the current diff changes an effective command/config source that would be evaluated or loaded for a task (for example package scripts, Ascout command override, TypeScript/ESLint/Vitest/Jest/pytest configuration), that task MUST be refused by default as `NOT_RUN(command_surface_changed)` and the changed authority paths MUST be shown. Execution is allowed only when the human caller gives an explicit **per-invocation** changed-surface admission. That admission MUST be recorded in the receipt. It MUST NOT be persisted as a trust grant in config, automatically supplied by agent instructions/hooks, or inferred from prior runs.

`command_surface_changed=true` MUST require at least one changed authority path and MUST NOT coexist with normal admission.

This is a narrow M1 admission boundary, not untrusted-repository sandboxing. Automation MUST NOT silently expand authority.

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

Every executable verification task MUST have bounded execution semantics. Timeouts, internal errors, blocked downstream work, admission refusal, and concurrent-run behavior MUST fail closed with respect to claims. M1 MUST refuse concurrent Ascout runs rather than queueing them.

Captured/persisted evidence MUST be treated as potentially sensitive. `.ascout/` MUST be ignored by default. Recognized secret-bearing environment values MUST be redacted from persisted output and persisted/rendered command argv. Raw secret-bearing argv, raw credential-bearing origin strings, and raw absolute local repository paths MUST NOT be written to run artifacts. Retained artifacts MUST be documented and bounded.

### VIII. Provenance, Licensing, and Benchmark-Gated Growth
Code licenses, rules licenses, data licenses, database redistribution terms, and permitted-use restrictions MUST be evaluated separately. Process isolation MUST NOT be assumed to cure use restrictions, AGPL network-service obligations, data attribution obligations, or nested third-party licenses. Donor code MUST NOT enter Ascout without exact-version/component provenance review.

Architecture expansion MUST be justified by observed benchmark misses, adoption friction, or operational limits. The benchmark MUST measure Ascout's own claims—not merely donor-tool detection quality. Cross-tree evidence leakage and source-binding violations have an absolute acceptable count of zero. The benchmark MUST also verify that a stable run with remaining material `NOT_EXERCISED` or `UNRESOLVED` lines maps to incomplete exit `4`, never clean exit `0`.

## Founding Product Constraints

The M1 product wedge is an **evidence-bound changed-code verification receipt**. After an AI coding change, Ascout MUST show:

- what changed;
- what verification ran;
- what did not run and why, including admission-refused work;
- what passed, failed, flaked, errored, or was blocked;
- which changed executable lines were exercised;
- which changed executable lines were not exercised or could not be resolved;
- factual changes to tests/snapshots where reliably detectable;
- selected/deselected test accounting or explicit unknown limitations;
- the source state to which current-run evidence belongs;
- resolvable current-run evidence for every exposed evidence reference;
- whether any executed task required explicit changed-command-surface admission.

The public identity is:

> **Ascout — Verify everything AI ships.**  
> **Know exactly what passed, failed, and was never checked.**

The headline is the mission; the receipt is the technical contract.

M1 does not include untrusted-repository sandboxing, CI/SARIF as a first-class Ascout surface, browser orchestration, security-suite orchestration, mutation/property/fuzz/DAST/load testing, accessibility/performance verification, a semantic repository graph, AI reasoning, test generation, or automatic source fixing.

### Amendment A04 — Durable workflow and separate publication effect

Ratified by UA-P04 Implementation Authorization (Issue #527, PR #528, effective on post-merge qualification of merge 11d898fccbed77edbf5d270385881200879660f6). Scope is UA-P04 durable workflow and GitHub publication effects only. All M1 principles remain in force.

1. Ascout may persist local durable workflow evidence (run, stage, attempt, event, freshness, idempotency, and reconciliation records) as bounded local evidence in `.ascout/`, ignored by default, with documented retention, redaction of secret-bearing values, and no mandatory daemon, server, database, cloud storage, or external service.
2. GitHub publication is a separate effect, never part of core verification. A review result, Watch event, model output, Jev result, or local event does not implicitly grant publication authority. Generation, PublicationIntent, authorization, effect, and PublicationReceipt are distinct.
3. Publication requires all of the following bound to the effect: exact repository identity, exact issue, pull request, or comment target, exact source head, exact publication payload digest, redaction and classification decision, authority identity, attempt identity, effect result, and reconciliation state.
4. Never publish from stale evidence. Never publish sensitive evidence without classification and redaction. Unknown publication outcome must not cause blind retry. A retry must not create duplicate comments or effects.
5. Publication requires explicit effect authority intersecting intent ceiling, policy ceiling, engine descriptor ceiling, phase authority, explicit network policy, explicit provider policy, and explicit data-egress policy. Any missing intersection fails closed.
6. Tests and qualification must not perform live GitHub publication. Publication behavior is proven with exact-head fixtures and durable receipt semantics only.
7. Configuration remains a correction and override surface. It must not become a workflow, prerequisite-graph, automation, or notification language.
8. P04 durable stage, attempt, and event semantics may be reused by future Watch work. P04 must not create a generic notification command center, a general workflow automation system, a communication platform, a ChromaDB-dependent system, or any mandatory external service.
9. Kodac-derived patterns are observations and discipline only. Kodac must not become a second policy or claim authority. Ascout owns final evidence, finding, coverage, freshness, and claim semantics.
10. All local-zero-cost gates remain enforced: zero operator runtime cost, offline core, no mandatory Ascout backend, no silent paid fallback, telemetry off by default, local artifact retention by default, explicit data egress, optional engine absence explicit, entitlement truth independence, model source and weight provenance, donor permission and notice, and clean-machine local execution.

### Amendment A05 — Unified Test profile

Ratified by UA-P05 Implementation Authorization (Issue #542, PR #543, effective on post-merge qualification of merge cac7af64820347eaad26f97fbfab1d6b34f7079b). Scope is UA-P05 unified test effects only. All M1 principles remain in force.

1. Ascout may orchestrate deterministic testing as a first-class Test profile with QUICK, STANDARD, DEEP, and RELEASE policies, adapter-first, with budgets and predicted effect classes visible in the plan.
2. The existing check and test selection and execution behavior is preserved with PASS, FAIL, FLAKY, BLOCKED, ERROR, and NOT_RUN semantics unchanged. Affected scope that cannot be narrowed safely must widen visibly.
3. Unified Coverage and Omission projection must keep test selection, execution, changed-code exercise, deselection accounting, and unknown limitations visible. Deselected tests must not be presented as passed.
4. External runner, contract, schema, property, fuzz, mutation, performance, and recovery outputs are normalized as observations. They never self-attest and never override missing or failed mandatory evidence.
5. Property, fuzz, mutation, performance, and recovery adapters are admitted only when qualified with explicit counterexamples, effect requirements, attempted, killed, and survived accounting, and budget enforcement. Unsupported scope yields explicit omission, never clean PASS.
6. P016 browser evidence projection reuses IntentTest, oracle, and journey truth without inventing new browser authority. No hidden mock substitution is permitted.
7. Failure Intelligence observations (reproduced, contradictory, flaky, environment failure, harness failure, product regression, unknown) remain observations. Root-cause probabilities are never canonical facts. Environment and harness failure remain distinguishable from product PASS. Retry success never erases the original failure.
8. An additive `ascout test` command may exist. `ascout check` remains unchanged and `ascout test` is additive only.
9. All local-zero-cost gates remain enforced: zero operator runtime cost, offline core, no mandatory Ascout backend, no silent paid fallback, telemetry off by default, local artifact retention by default, explicit data egress, optional engine absence explicit, entitlement truth independence, model source and weight provenance, donor permission and notice, and clean-machine local execution.
10. No mandatory network, account, key, provider, daemon, server, database, or paid fallback is introduced for any core claim. Missing capability remains explicit NOT_RUN or INCOMPLETE.

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
11. fresh exact-HEAD cross-artifact consistency and branch-purity review;
12. explicit implementation authorization.

A stale audit MUST NOT authorize implementation or merge. Any material mutation after an audited head requires reconciliation of affected claims and a new exact-HEAD review.

Planning artifacts do not authorize implementation by themselves. Complexity violations MUST be recorded/justified; otherwise the simpler design wins.

Tests/benchmark cases MUST validate source binding, evidence-reference integrity, no green by omission, changed-command admission, drift, selection accounting, changed-code exercise reporting, secret-safe persistence, and zero cross-tree evidence leakage.

## Governance

This constitution supersedes informal design discussion for canonical Ascout work. Specifications, plans, tasks, code reviews, and releases MUST demonstrate compliance.

Amendments require:

1. explicit constitutional delta;
2. rationale and affected artifacts;
3. review for trust/scope/licensing/complexity impact;
4. semantic constitution version increment after canonical ratification;
5. reconciliation of affected canonical specs.

Principles protecting evidence integrity, no-green-by-omission, source binding, or explicit trust boundaries MUST NOT be weakened through ordinary feature work.

Ponytail/YAGNI is a complexity gate, not an architecture generator. GitHub Spec Kit is the canonical specification workflow, pinned initially by `.specify/PROVENANCE.md`.

**Version**: 1.2.0 | **Ratified**: 2026-08-21 | **Last Amended**: 2026-09-24
