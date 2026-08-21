# Ascout Founding YAGNI Audit

**Verdict:** `LEAN_ENOUGH_FOR_SPEC_KIT`

This audit applies Ponytail's lazy-senior-developer principle: reuse native/platform capability, avoid abstractions before real instances exist, and preserve only complexity required for correctness, trust boundaries, evidence integrity, security, or the product wedge.

## Required in M1

- Git/source identity plus start/end drift detection.
- Minimal repository/tool discovery.
- Fixed-task configuration override surface only.
- Command provenance and no implicit installs.
- Typecheck/lint/test execution.
- Native related/changed test selection.
- Coverage-to-diff intersection.
- Conservative bounded widening and selection accounting.
- Factual test/snapshot change reporting.
- Bounded flake handling.
- Terminal, versioned JSON, and bounded-agent output.
- Task timeouts, `ERROR`/`BLOCKED`, concurrent-run refusal, output/argv redaction.
- Secret-safe repository identity.
- Small benchmark measuring Ascout's own trust claims.

## Deleted or deferred from M1 architecture

- Rust core.
- SQLite/graph DB.
- Daemon/server/control plane.
- Public plugin SDK.
- Feature graph/semantic repository index.
- TestSprite source import.
- Browser/security-suite orchestration.
- Mutation/property/fuzz/DAST/load testing.
- Accessibility/performance verification.
- AI reasoning/test generation/automatic fixing.
- Automatic host-level execution hooks by default.
- First-class CI/SARIF product surface.
- Untrusted-repository sandbox architecture.
- Arbitrary config task names, user-defined prerequisite graphs, workflow expressions/hooks.
- Heuristic hidden "relevant untracked" source omission list.

## Simplification decisions

1. `ascout audit` is not a separate M1 engine; future whole-scope behavior can be a `check` mode.
2. `ascout reproduce` is not required for M1.
3. Finding fingerprints are weak run-matching aids only.
4. No universal proof/confidence ladder.
5. Python stays basic; no Python affected/coverage architecture in M1.
6. Native runner/coverage capability precedes custom dependency analysis.
7. No code-intelligence graph until benchmark misses justify it.
8. Config v1 overrides only fixed semantic tasks; internal ordering is product logic.
9. One post-run widening pass is the maximum; no recursive impact engine.
10. Remaining changed executable `NOT_EXERCISED`/`UNRESOLVED` lines are exit `4`, not green.
11. All non-gitignored untracked files except `.ascout/` participate in source identity; this is simpler and safer than relevance heuristics.
12. Spec Kit internals are not vendored; workflow provenance is pinned and project-specific artifacts are owned locally.

## Technical questions resolved by the plan

The Spec Kit plan now fixes:

- tracked JSON config shape and fixed task categories;
- versioned tree-digest framing inputs;
- credential-safe remote identity requirement;
- numeric exit codes and completeness rules;
- LCOV line coverage normalization;
- Vitest/Jest native selection/widening boundaries;
- bounded retry semantics;
- receipt schema/stability/completeness split;
- Windows process-tree cleanup requirement;
- benchmark construction and integrity gates.

Implementation constants such as exact termination grace values and exact benchmark repository choices remain implementation/release details, not architecture blockers.

**Final:** founding scope remains lean after analyze-driven reduction. No product implementation is authorized by this audit.
