# Ascout Founding YAGNI Audit

**Verdict:** `LEAN_ENOUGH_FOR_SPEC_KIT`

This audit applies Ponytail's lazy-senior-developer principle to the founding plan: reuse native/platform capabilities, avoid abstractions before real instances exist, and preserve only complexity required for correctness, trust boundaries, evidence integrity, security, or the product wedge.

## Required in M1

These survive because removing them makes Ascout unsafe, dishonest, unusable, or undifferentiated:

- Git/source identity plus start/end drift detection.
- Minimal repository/tool discovery.
- Small explicit configuration escape hatch.
- Command provenance and no implicit installs.
- Typecheck/lint/test execution.
- Native related/changed test selection.
- Coverage-to-diff intersection.
- Conservative widening and selected/deselected accounting.
- Factual test-change reporting.
- Bounded flake handling.
- Terminal, versioned JSON, and token-bounded agent output.
- Task timeouts, `ERROR`/`BLOCKED`, concurrent-run refusal, output redaction.
- A small benchmark measuring Ascout's own trust claims.

## Deleted or deferred from M1 architecture

- Rust core.
- SQLite or graph DB.
- Daemon/server/control plane.
- Public plugin SDK.
- Feature graph / semantic repository index.
- TestSprite source import.
- Browser orchestration.
- Security-suite orchestration.
- Mutation/property/fuzz/DAST/load testing.
- Accessibility/performance verification.
- AI reasoning/test generation/automatic fixing.
- Automatic host-level execution hooks by default.
- First-class CI/SARIF.
- Untrusted-repository sandbox architecture.

## Simplification decisions

1. `ascout audit` is not a separate M1 engine; future whole-scope behavior can be a `check` mode.
2. `ascout reproduce` is not required to prove the M1 wedge.
3. Finding fingerprints are weak run-matching aids, not a structural cross-tree identity system.
4. There is no universal proof/confidence ladder.
5. Python may use a basic generic task path without forcing Python-specific affected architecture into M1.
6. Native test/coverage capabilities are used before custom dependency analysis.
7. No code-intelligence graph is justified until benchmark misses show native selection plus widening is insufficient.
8. Spec Kit implementation internals are not vendored into Ascout; the project pins workflow provenance and owns only project-specific specification artifacts.

## Remaining questions belong in the technical plan

The following are not founding-plan blockers:

- exact config serialization;
- exact tree-digest canonical serialization;
- numeric exit codes;
- coverage normalization representation;
- Vitest/Jest invocation details;
- retry defaults;
- workspace detection details;
- JSON schema layout/versioning mechanics;
- Windows process-tree termination implementation;
- benchmark repository selection.

They must be resolved or explicitly bounded by the Spec Kit plan before implementation.

**Final:** the founding scope is lean enough to enter Spec Kit planning. No product implementation is authorized by this audit.
