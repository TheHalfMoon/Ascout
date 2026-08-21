# Ponytail / YAGNI Gate — Pre-Plan

**Date:** 2026-08-21
**Scope:** `specs/001-changed-code-verification/spec.md`
**Method:** Apply Ponytail's base ladder as a planning complexity gate. This is not an invocation of
Ponytail's code-only `ponytail-review` skill.

## Verdict

`LEAN_ENOUGH_TO_PLAN`

## Surviving M1 concepts

These exist because removing them would make M1 unsafe, dishonest, or non-differentiated:

- exact source identity and start/end drift detection;
- minimal repository/tool discovery;
- a small configuration escape hatch;
- command provenance and command-surface warnings;
- no implicit dependency installation;
- typecheck/lint/test execution through existing project tools;
- native changed/related-test selection;
- coverage-to-diff intersection;
- conservative widening and visible deselection accounting;
- factual test-change reporting;
- bounded failure reruns only when needed for flake classification;
- terminal, versioned JSON, and bounded agent receipts;
- task timeout, run lock/refusal, evidence redaction, artifact retention;
- a small benchmark that measures Ascout's own selection/binding/gap claims.

## Explicitly rejected from M1 planning

- Rust core or helper;
- SQLite or graph database;
- daemon/server/control plane;
- public plugin SDK;
- universal adapter framework designed for future tools;
- semantic repository/feature graph;
- TestSprite source import;
- browser/dev-server orchestration;
- security-scanner orchestration;
- mutation/property/fuzz/DAST/load testing;
- accessibility/performance subsystems;
- AI reasoning or generated tests;
- CI/SARIF;
- automatic host hooks by default;
- separate `audit`, `report`, or `reproduce` engines/verbs before workflows diverge.

## Planning constraints

1. Reuse Git and the project's installed verification tools rather than recreating them.
2. Prefer direct concrete integrations before extracting a generalized adapter interface.
3. Keep persistence file-based for the first slice; native tool caches may be used when their
   freshness semantics are trustworthy and recorded.
4. Python remains a basic generic execution path in M1 and MUST NOT force Python-specific affected
   architecture into the core plan.
5. Long-term roadmap categories MUST NOT introduce fields, interfaces, services, or storage in M1
   unless an M1 requirement consumes them.
6. If a proposed module has only one consumer and no safety boundary, keep it local until a second
   real use proves an abstraction.

**Ponytail result:** Build the receipt engine, not the future ecosystem.
