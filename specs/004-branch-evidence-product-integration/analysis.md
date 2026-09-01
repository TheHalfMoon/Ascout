# Cross-Artifact Analysis: Branch-Evidence Product Integration

**Spec:** 004  
**Date:** 2026-09-01  
**Status:** PLANNING  

## A-001 — Architecture review alignment

- Architecture review (`docs/architecture/M4_BRANCH_EVIDENCE_PRODUCT_INTEGRATION_REVIEW_2026-09-01.md`) identifies the gap at three points: LCOV parser, exercise builder, receipt model.
- Feature specification (`spec.md`) maps exactly to these three points via FR-001 through FR-013.
- Plan (`plan.md`) proposes file changes at exactly these three points plus `src/check.ts` for wiring.
- Tasks (`tasks.md`) decompose implementation into T101 (parser), T102 (exercise), T103 (model/validation), matching the architecture review's smallest integration point.

**Conclusion:** No divergence. Artifacts are aligned.

## A-002 — Constitutional alignment

- Constitution demands Evidence Before Claims: branch evidence is added only after Spec 003 proved the gap with deterministic evidence.
- No Green by Omission: unknown/malformed branch data fails closed or remains unresolved; never silently converted to PASS.
- Source-Bound Truth: branch observations use the same repository-relative path normalization as line coverage; path containment is fail-closed.
- Native Capability Before Invention: implementation uses only Node.js standard library and existing project code.
- Conservative Affected Verification: branch evidence intersects only changed new-line ranges; branches outside changed ranges do not count as changed-branch gaps.
- Benchmark-Gated Growth: Spec 003 `GO` result is the measured gate; product integration is planned only after that gate.
- Minimal Core: no new dependencies, no AST/CFG, no plugin architecture.

**Conclusion:** All constitutional constraints are satisfied.

## A-003 — Master Plan alignment

- Master Plan V1 defines M1 as changed-code verification receipt. Spec 004 enriches the receipt's exercise section without redesigning it.
- Master Plan does not authorize function coverage, AST/CFG, or unrelated expansion. Spec 004 explicitly prohibits these.
- Master Plan requires CI across Ubuntu, macOS, Windows. Spec 004 requires six-lane Project CI.

**Conclusion:** Aligned with Master Plan.

## A-004 — Roadmap alignment

- Post-M1 Verification Roadmap defines verification phases. Spec 004 is a product-integration step within the measured evidence-depth review phase.
- Roadmap does not select unrelated domains (agent, browser, security). Spec 004 does not expand into these.

**Conclusion:** Aligned with roadmap.

## A-005 — Research ledger alignment

- Research Ledger 2026-08-26 records Spec 003 as the branch-exercise qualification slice. Spec 004 is the direct successor product-integration slice.
- No ledger entry conflicts with Spec 004 scope or prohibitions.

**Conclusion:** Aligned with research ledger.

## A-006 — Spec 003 authority chain alignment

- Spec 003 `spec.md` requires that `GO` authorizes only future planning; product integration is unauthorized until a separate canonical Spec Kit chain and explicit implementation authorization are complete.
- Spec 004 is that separate canonical Spec Kit chain.
- Spec 003 `plan.md` requires product-surface immutability during qualification. Spec 004 explicitly limits `src/` mutation to authorized surfaces.
- Spec 003 `IMPLEMENTATION_AUTHORIZATION.md` binds T093–T096 to benchmark-only scope. Spec 004 does not overlap with T093–T096 scope; it is a new authorization chain.

**Conclusion:** Spec 004 is subordinate to and consistent with Spec 003 authority.

## A-007 — Receipt v1 schema alignment

- Architecture review concludes receipt v1 needs only an additive extension, no version bump.
- Feature specification requires schema version to remain `"1.0"` (FR-010).
- Plan adds optional `branch_records` and optional branch summary counts.
- `validateExercise` in `model.ts` currently validates line records only; extension must add branch validation when present without failing when absent.
- Receipt builder (`receipt/build.ts`) is generic over `ExerciseV1`; no change needed unless terminal summary is extended.

**Conclusion:** Schema extension is backward-compatible and minimal.

## A-008 — Completeness and exit-code alignment

- Architecture review concludes branch gaps are additive to line gaps; exit-code derivation does not need a new branch.
- Feature specification requires completeness derivation to include branch gaps (FR-011) and exit code 4 for materially incomplete branch evidence (FR-012).
- Plan updates `exerciseHasMaterialGap` and confirms `decideReceiptExitCode` needs no new branch.
- Tasks T102 and T103 include contracts proving completeness and exit code behavior.

**Conclusion:** Completeness and exit-code logic are correctly aligned.

## A-009 — Backward compatibility alignment

- Architecture review explicitly requires line-only repositories to behave identically.
- Feature specification includes SC-010: line-only repositories produce identical exercise records, completeness, and exit code.
- Plan preserves existing line parsing and exercise building behavior.
- Tasks T102 and T103 include backward-compatibility contracts.

**Conclusion:** Backward compatibility is fully specified and tested.

## A-010 — Test strategy alignment

- Architecture review requires contract tests for branch-only gap, fully exercised, unknown/malformed/containment, deterministic serialization, backward compatibility.
- Feature specification SC-001 through SC-010 map to these requirements.
- Plan defines T101–T103 with specific contract test scopes.
- Tasks decompose tests into three focused test files plus fixtures.

**Conclusion:** Test strategy is complete and aligned.

## A-011 — CI and platform alignment

- Architecture review requires six-lane Project CI (Ubuntu 24.04, macOS 14, Windows 2025 × Node 22/24).
- Feature specification SC-006 requires the same.
- Plan and tasks require exact-head CI before merge.

**Conclusion:** CI requirements are consistent across all artifacts.

## A-012 — YAGNI alignment

- Architecture review rejects function coverage, AST/CFG, thresholds, receipt v2, CLI flags, new dependencies, browser/API/security, plugin architecture, agent/RAG/memory.
- Feature specification Non-Goals section lists the same rejections.
- YAGNI review documents 14 explicit rejections with reasons.
- Plan YAGNI review documents 14 explicit rejections with reasons.

**Conclusion:** YAGNI discipline is applied consistently.

## A-013 — Authorization boundary alignment

- Architecture review concludes `PRODUCT_INTEGRATION = AUTHORIZED_BY_THIS_REVIEW` but implementation requires separate authorization.
- Feature specification does not include implementation code.
- Plan does not include implementation code.
- Tasks define implementation scope but require separate authorization before T101 begins.
- No artifact backdates implementation authority.

**Conclusion:** Authorization boundaries are correctly maintained.

## A-014 — Evidence discipline alignment

- No artifact fabricates evidence, CI, review, or completion.
- All claims bind to measured Spec 003 evidence or canonical repository state.
- No artifact bypasses exact-head gates, review requirements, or branch-purity checks.

**Conclusion:** Evidence discipline is preserved across all artifacts.

## A-015 — Cross-artifact consistency

- No material inconsistency found between architecture review, feature specification, clarifications, YAGNI reviews, plan, plan YAGNI review, tasks, requirements checklist, or this analysis.
- All artifacts derive from the same canonical base and measured evidence.
- All artifacts agree on scope, prohibitions, backward compatibility, and authorization boundaries.

**Conclusion:** Cross-artifact consistency is verified.
