# Test Obligation Graph — Planning Contract

**Status:** `PLANNING_ONLY`

Node families: RequirementSource, Requirement, RequirementConflict, Risk, Change, Component, Contract, Behavior, TestObligation, Oracle, TestCase, TestSuite, TestDataArtifact, ExecutionEnvironment, Analyzer, Observation, Evidence, Finding, Defect, FailureSignature, RootCauseHypothesis, RootCauseProof, RepairCandidate, RegressionObligation, ResidualRisk, ReleaseDecision, RuntimeObservation, MemoryFact.

Every material node and edge requires source, run, and provenance identity with typed truth classes. Runtime observations feed the graph as evidence and never become retroactive PASS. Memory facts never authorize. Storage is simplest deterministic serializable structure first. No implementation authorized.

```text
TOG_CONTRACT = FROZEN_AS_PLANNING
```
