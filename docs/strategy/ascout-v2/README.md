# Ascout V2 — Unified Verification Planning Package

**Status:** PROPOSED. This package is a planning input. It does not authorize implementation, does not amend the constitution, and does not supersede any canonical artifact until the founder explicitly ratifies it through the governance sequence in `.specify/memory/constitution.md`.

**Planning base:** `TheHalfMoon/Ascout` `main` at `ca6b6f514e5a8881e2cfa2789b5e5ea43e3aaaad` (verified live on 2026-10-08; merge of PR #576, UA-P06-T08).

**Planning branch:** `plan/ascout-v2-unified-verification`.

## What this package concludes, in one paragraph

Ascout already owns a strong, honest trust kernel (contracts, claim assessment, omission and contradiction semantics, deterministic planning, a mature `ascout check` runner, and a qualified Playwright browser path). What it does **not** yet own is a single end-to-end path in which a real review engine, a real security engine, or a real advanced test engine executes and its evidence reaches a final claim. The live audit found that the Sentrdel binary is a bootstrap stub that prints a placeholder and exits 0, that `ascout review` and `ascout test` exit 0 without executing anything, and that no containment exists for untrusted code on any platform. V2 therefore keeps the kernel, stops adding new contract layers, and reorders the program around **vertical execution slices**: a real Sentrdel CLI, real OCR execution, real test execution, one execution broker with honestly qualified containment tiers, one exit-code taxonomy, and then agent surfaces (MCP) and distribution.

## Revision 2 (2026-10-08)

Revision 2 is delivered as bounded stacked PRs on top of #578, each within Diffcipline's default limits. It strengthens Kodac reuse ([16](16_KODAC_CONVERGENCE_ANALYSIS.md)), replaces Sentrdel-only security fan-in after real-scanner experiments ([17](17_SECURITY_EVIDENCE_INTEROPERABILITY.md)), requires real-engine evidence levels ([13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md)), resolves 20 contradictions ([18](18_CONTRADICTION_RESOLUTION_LEDGER.md)), defines the review path ([19](19_PLANNING_GOVERNANCE_AND_REVIEW_PATH.md)), and records the review attempts and readiness ([20](20_INDEPENDENT_REVIEW_REPORT.md), [15](15_IMPLEMENTATION_READINESS_AUDIT.md)). No founder decision is approved.

## Reading order

| # | Document | Purpose |
|---|---|---|
| 00 | [Executive decision](00_EXECUTIVE_DECISION.md) | The decision, why, and the first work packet |
| 01 | [Live repository audit](01_LIVE_REPOSITORY_AUDIT.md) | Exact current state of Ascout with executed probes |
| 02 | [Portfolio source inventory](02_PORTFOLIO_SOURCE_INVENTORY.md) | All 55 accessible owner repositories with dispositions |
| 03 | [External source research](03_EXTERNAL_SOURCE_RESEARCH.md) | Upstream identities, licenses, dispositions, competitors |
| 04 | [Capability reuse matrix](04_CAPABILITY_REUSE_MATRIX.md) | Component-level COPY / ADAPT / COMPANION decisions |
| 05 | [Gap and risk register](05_GAP_AND_RISK_REGISTER.md) | Confirmed defects, capability gaps, risks |
| 06 | [Architecture options](06_ARCHITECTURE_OPTIONS.md) | Options A/B/C compared; hybrid selected |
| 07 | [Target architecture](07_TARGET_ARCHITECTURE.md) | Components, surfaces, capabilities, agent/MCP strategy |
| 08 | [Security and trust model](08_SECURITY_AND_TRUST_MODEL.md) | Execution tiers, containment, threat model |
| 09 | [Assurance evidence contracts](09_ASSURANCE_EVIDENCE_CONTRACTS.md) | Outcome states, exit codes, Engine Protocol v1 |
| 10 | [Local zero-cost, packaging, platform](10_LOCAL_ZERO_COST_PACKAGING_AND_PLATFORM.md) | Economics, distribution, resource budgets |
| 11 | [Implementation master plan](11_IMPLEMENTATION_MASTER_PLAN.md) | Phases V0–V8, UA-P reconciliation, YAGNI |
| 12 | [Task registry](12_TASK_REGISTRY.md) | Dependency-ordered tasks |
| 13 | [Benchmark and acceptance program](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md) | Acceptance, adversarial, and benchmark suites |
| 14 | [Critical design challenge](14_CRITICAL_DESIGN_CHALLENGE.md) | Hostile review of this plan |
| 15 | [Implementation readiness audit](15_IMPLEMENTATION_READINESS_AUDIT.md) | Readiness verdict, blockers, final recommendations |
| 16 | [Kodac convergence analysis](16_KODAC_CONVERGENCE_ANALYSIS.md) | Revision 2: 18 Kodac capabilities compared; 12 ports, 2 integrations |
| 17 | [Security evidence interoperability](17_SECURITY_EVIDENCE_INTEROPERABILITY.md) | Revision 2: real-scanner experiments; federated ingestion; degraded modes |
| 18 | [Contradiction resolution ledger](18_CONTRADICTION_RESOLUTION_LEDGER.md) | Revision 2: C-01…C-20 and where each is resolved |
| 19 | [Planning governance and review path](19_PLANNING_GOVERNANCE_AND_REVIEW_PATH.md) | Revision 2: Diffcipline handling, review-tool classification, FD guidance |
| 20 | [Review report for revision 2](20_INDEPENDENT_REVIEW_REPORT.md) | Review attempts, mechanical gates, adversarial findings; states that no independent review was available |
| — | [Source provenance register](SOURCE_PROVENANCE_REGISTER.md) | Exact source identities for every selected donor |
| — | [Traceability matrix](TRACEABILITY_MATRIX.md) | Requirement → source → task → test → evidence → gate |
| — | [Decision log](DECISION_LOG.md) | Numbered decisions with status |

## Consolidation note

The founder brief suggested 26 file names. Product capabilities, agent/MCP/plugin strategy, and migration/compatibility are folded into documents 07 and 11, and performance/platform requirements are folded into document 10, to avoid duplicate documents that would drift. Final recommendations are in document 15.

## Evidence conventions used in this package

- **OBSERVED** — directly executed or read in this planning session, with the command or file cited.
- **REPORTED** — stated by a repository's own documentation or CI and not re-executed here.
- **INFERRED** — reasoning from observed facts; never used as proof.
- **PROPOSED** — a target, budget, or design that has not been measured or built.

No benchmark number in this package is an achieved result unless it is labeled OBSERVED with its environment.

## Privacy note

Ascout is a public repository. Private owner repositories are reported here only in aggregate, except where a private repository name is already present in canonical public Ascout documents (HarnessMind). No private repository content is reproduced.
