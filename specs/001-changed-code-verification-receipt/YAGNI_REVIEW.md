# 001 — Post-Clarify Ponytail/YAGNI Review

**Gate:** PASS  
**Date:** 2026-08-21

## What the feature actually needs

The specification has four independently testable user outcomes:

1. a source-bound verification receipt;
2. changed-code exercise gaps from tests that actually ran;
3. honest affected-selection/drift/flake semantics;
4. factual test-change signals plus bounded agent consumption.

## What was deliberately not added

The spec does not require:

- a repository knowledge graph;
- a database;
- a daemon;
- a plugin ecosystem;
- a browser harness;
- an AI model;
- test generation or code fixing;
- CI/SARIF;
- security/adversarial/non-functional suites;
- cross-tree causal attribution;
- untrusted-repository sandboxing;
- automatic dependency installation.

## Native-capability ladder

The technical plan MUST first evaluate and reuse:

1. Git's own diff/status primitives;
2. project/package-manager metadata already present;
3. test-runner native changed/related selection;
4. test-runner/native coverage output;
5. tool-native caching/incrementality;
6. minimal general-purpose dependencies only where platform behavior is insufficient.

A custom semantic index is forbidden for M1 unless a benchmark demonstrates a concrete miss that cannot be handled by conservative widening.

## Spec-quality check

- No unresolved product clarification remains.
- User stories are independently testable.
- Requirements describe externally observable behavior rather than a speculative module hierarchy.
- The M1 ecosystem boundary is explicit.
- Long-term roadmap capabilities do not impose M1 abstractions.

**Disposition:** proceed to technical planning without widening feature scope.
