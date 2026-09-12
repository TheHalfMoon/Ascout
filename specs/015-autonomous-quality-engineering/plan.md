# Spec 015 Technical Plan

**Status:** `PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`
**Base:** `55688b5bca22f2e9979b71739bb6802c652bda9d`

## 1. Architecture

Bounded internal components (no public plugin loading):

```text
RequirementResolver
RiskModel
RepositoryStructureReader
TestObligationPlanner
OracleResolver
ExistingTestMapper
UnitTestGapAnalyzer
CandidateTestGenerator
CandidateWorktreeManager
TestAdmissionEvaluator
FailureReproducer
FailureMinimizer
FaultLocalizationEnsemble
RootCauseVerifier
RegressionObligationRecorder
ResidualRiskEvaluator
QualityReportRenderer
```

Internal adapter boundaries (contract only, no SDK):

```text
LanguageAnalyzer
TestRunnerAdapter
CoverageAdapter
MutationAdapter
PropertyAdapter
```

First-slice recommendation: JavaScript/TypeScript, current Vitest/Jest paths, smallest mutation and property mechanism justified by benchmark, no new service.

## 2. Storage

Test Obligation Graph storage uses the simplest deterministic serializable structure supporting required queries with source, run, and provenance identity on every material node and edge. Graph database not authorized by abstraction alone.

## 3. Execution authority

Candidate generation and evaluation occur in a disposable candidate worktree isolated from core product source. Core remains read-only. Every execution binds authority, environment, and source identity with drift detection. Concurrent runs refuse rather than queue where claims would conflict.

## 4. Evidence discipline

Models propose. Deterministic or explicitly classified evaluators observe. Bound evidence decides. AI output alone never becomes proof. Generated tests require stability and discrimination proof. Reruns never manufacture PASS. Budgets produce visible omission. Memory never authorizes. Runtime observations never become retroactive PASS.

## 5. No new subsystem without benchmark

Each component above needs a benchmark-backed need linked to a measured gap in `GAP_EVIDENCE.md`. Unjustified components remain planning concepts, not implementation.

```text
TECHNICAL_PLAN = GO_AS_PLANNING / IMPLEMENTATION_AUTHORITY = NO
```
