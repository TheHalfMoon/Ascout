# Spec 016 Cross-Artifact Analysis

**Status:** `PLANNING_ONLY`
**Planning ledger:** Issue #342

## Scope

This analysis checks `spec.md`, `plan.md`, `tasks.md`, benchmark/provenance/risk/decision artifacts, architecture contracts and requirements checklist for one implementation-ready dependency chain.

## Requirement-to-task ownership

| Requirement | Primary task owner | Secondary validation |
|---|---|---|
| REQ-INTENT-IR | P016-02 | P016-09 |
| REQ-BROWSER-EXECUTOR | P016-03 / P016-04 | P016-09 |
| REQ-BROWSER-EVIDENCE | P016-05 | P016-08 / P016-09 |
| REQ-ORACLE-MESH | P016-05 | P016-09 |
| REQ-LOCATOR | P016-06 | P016-09 |
| REQ-RECOVERY | P016-07 | P016-09 / P016-16 |
| REQ-NO-SILENT-HEAL | P016-07 | P016-09 / P016-16 |
| REQ-CACHE | P016-15 | P016-20 |
| REQ-JOURNEY | P016-10 | P016-11 / P016-20 |
| REQ-AGENT-BOUNDARY | P016-12 / P016-13 | P016-20 |
| REQ-ADMISSION | P016-14 | P016-20 |
| REQ-LOCAL-FIRST | P016-01 / P016-04 | every execution slice |
| REQ-PRIVACY | P016-05 / P016-08 | P016-09 |
| REQ-BENCHMARK | P016-09 / P016-20 | closeout |

## Dependency findings

1. `P016-00` is a hard predecessor gate and must precede P016-01.
2. Intent IR precedes browser execution so natural-language text cannot become direct execution authority.
3. BrowserExecutor contract precedes Playwright adapter to avoid leaking Playwright APIs into Ascout truth contracts.
4. Browser evidence and oracle records precede recovery/benchmark decisions.
5. Deterministic locator/recovery semantics and trace ingestion precede the deterministic benchmark.
6. Agentic proposal authorization occurs only after deterministic browser truth is benchmark-qualified.
7. Multimodal resolution/recovery agents are downstream of deterministic evidence and agentic authority.

## Integrity vocabulary reconciliation

`spec.md` and `BENCHMARK_DESIGN.md` use one canonical nine-gate integrity vocabulary:

```text
fabricated_pass
hidden_applicable_not_run
cross_tree_evidence_leakage
source_binding_violation
silent_semantic_heal
cache_authority_escalation
secret_leakage_from_ascout_owned_artifacts
unqualified_model_only_pass
recovery_history_erasure
```

No artifact may silently substitute a second name without an explicit mapping.

## YAGNI / complexity analysis

Rejected from the deterministic first wedge:

- browser protocol reimplementation;
- Playwright fork by default;
- graph database;
- persistent memory service;
- browser farm;
- cloud control plane;
- public plugin SDK;
- mobile;
- autonomous exploration;
- model-based locator resolution;
- automatic source/test mutation or merge.

These remain later candidates only after benchmark evidence.

## Donor/reuse analysis

Playwright should be consumed through a qualified dependency/adapter first. Selective source reuse or fork requires a component-specific measured need.

Momentic patterns may inform intent, resolver/cache, recovery, exploration and agent UX. Source import remains separately gated on an exact accessible snapshot, permission/provenance evidence, nested-license inventory, security review and component-level need.

## Remaining pre-implementation work

The plan is not implementation authority. Before P016-02 product mutation:

1. close or canonically bound Spec 015 via P016-00;
2. forward-reconcile the planning branch against final canonical main;
3. refresh exact-head planning audit and branch-purity evidence;
4. merge the planning package canonically;
5. activate P016-01 through its separate authorization chain.

```text
CROSS_ARTIFACT_ANALYSIS = CONSISTENT_AFTER_RECONCILIATION
OPEN_MATERIAL_DESIGN_CONTRADICTIONS = 0
IMPLEMENTATION_AUTHORITY = NO
```