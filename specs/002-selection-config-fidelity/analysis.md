# Spec 002 Cross-Artifact Analysis

**Result:** PASS  
**Scope:** architecture review, spec, clarifications, YAGNI, plan, plan YAGNI, tasks, checklist

## Authority consistency

The Constitution requires benchmark-gated architecture growth, fail-closed ambiguity, explicit command authority, native capability before invention, and no green by omission. Spec 002 strengthens those properties rather than weakening them.

Master Plan v1 places selection hardening in M2 and lists benchmark-driven targeted parsing only as a potential future direction. Spec 002 chooses the smaller pre-parser repair because the measured miss is explainable by configuration fidelity.

Issue #75 and Issue #6 remain research-only. Their agent/sandbox/memory domains are not imported into Spec 002.

## Evidence-to-requirement trace

| Evidence / gap | Requirement | Plan | Task |
| --- | --- | --- | --- |
| Founding T078 publishes one Ascout selector miss | FR-008, FR-009 | Benchmark replay | T091 |
| React Hook Form project-native related command requires nested `scripts/jest/jest.config.js` | FR-003, FR-005 | Nested candidate + explicit argv | T089 |
| Current discovery only accepts configs directly at package roots | FR-002, FR-003, FR-004 | Refine runner-only candidate filtering | T089 |
| Config is executable authority | FR-006 | Existing authority/admission propagation | T090 |
| M1 supports Ubuntu/macOS/Windows Node 22/24 | FR-010 | Six-lane qualification | T089–T092 |
| Constitution prohibits hidden gaps | FR-004, FR-009 | Fail closed / zero integrity gates | T089–T092 |

## Requirement-to-task completeness

- FR-001 scope: T089 contracts enforce single-package-only fallback.
- FR-002 root precedence: T089.
- FR-003 single nested candidate: T089.
- FR-004 ambiguity: T089.
- FR-005 explicit argv: T089.
- FR-006 authority/admission: T090.
- FR-007 unchanged receipt/source semantics: T089/T090 regression gates and T092 final reconciliation.
- FR-008 benchmark replay: T091.
- FR-009 integrity gates: T091/T092.
- FR-010 cross-platform: every task plus final T092.
- NFR-001 dependency constraint: guarded in every task and T092.
- NFR-002 bounded discovery: T089.
- NFR-003 determinism: T089.
- NFR-004 backward compatibility: T089/T092.

No requirement is orphaned.

## Task dependency analysis

T089 must precede T090 because authority proof depends on the effective nested candidate being representable.

T090 must precede T091 because benchmark qualification must exercise the final admission/authority semantics, not an intermediate planner state.

T091 must precede T092 because the milestone cannot close before benchmark evidence proves the reason for the milestone was actually repaired.

The order T089 → T090 → T091 → T092 is minimal and acyclic.

## Data-model consistency

No new receipt or persistent configuration field is required.

The existing discovery/planner model already carries:

- config paths;
- planned runner config path;
- argv;
- authority paths;
- admission state;
- selection/evidence output.

Therefore a new schema/version would be unjustified complexity and would conflict with the plan's stop conditions.

## Trust analysis

A nested Jest/Vitest config is executable configuration. Treating it as effective authority is mandatory once Ascout uses it.

The plan does not authorize reading arbitrary config source content for semantic interpretation. Discovery records path presence; the runner loads the config only when normal task execution is authorized.

No new sandbox claim is made.

## Ambiguity analysis

Potential ambiguity sources:

1. existing root config ambiguity;
2. multiple nested recognized configs in a single-package project;
3. basic workspaces containing configs below package roots.

Disposition:

- (1) preserve M1 behavior;
- (2) explicit fail-closed Spec 002 behavior;
- (3) out of scope; no nested fallback in basic workspaces.

No heuristic tie-breaker is authorized.

## Benchmark integrity analysis

Historical T078 publication is immutable historical evidence and must not be rewritten to make the miss disappear.

T091 must produce new exact-candidate M2 evidence. The expected improvement is a fresh Ascout hit for the frozen oracle while historical T078 continues to document the pre-M2 miss.

This avoids rewriting history and preserves evidence provenance.

## Complexity analysis

The plan does not add:

- a parser;
- a graph;
- a dependency;
- a daemon;
- a database;
- a plugin SDK;
- a new receipt version;
- a new CLI command.

Expected product mutation remains within three existing source modules unless T090 exposes a small authority propagation defect.

## Governance analysis

All planning artifacts explicitly remain non-authorizing. The implementation authorization record must be created only after:

1. planning artifacts are complete;
2. final plan audit passes;
3. fresh exact-head branch/artifact review passes;
4. planning PR is merged and post-merge canonical state is verified.

The authorization must bind that exact canonical planning commit before T089 mutation begins.

## Conclusion

**PASS.** No contradiction, orphan requirement, unauthorized research promotion, hidden architecture expansion, or missing task dependency is identified.
