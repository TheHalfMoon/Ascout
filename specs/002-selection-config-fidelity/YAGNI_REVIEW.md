# Spec 002 Ponytail / YAGNI Review

**Gate:** Post-spec complexity reduction  
**Result:** PASS_WITH_REDUCTIONS

## Required problem

The only measured product expansion signal is a published selector miss where the project-native related command depends on a recognized nested Jest config and Ascout does not preserve that configuration fidelity.

## Removed scope

The following were considered and removed from Spec 002:

- package-script shell parsing;
- package-manager script execution for discovery;
- generic command reconstruction;
- JS/TS import/dependency graph construction;
- code-intelligence dependencies;
- workspace package ownership inference for nested configs;
- Python affected-test selection;
- sandboxing;
- agent/memory/retrieval verification;
- browser/API/security integration;
- receipt v2;
- new CLI verbs;
- new product runtime dependencies.

## Minimal design constraint

The implementation may add only the smallest deterministic rule needed for the measured class of failure:

> In a single-package project, preserve existing root-level config behavior; otherwise select exactly one recognized nested config for the resolved runner, and fail closed if there is more than one.

The rule must reuse the existing bounded discovery traversal and existing runner argv/config fields.

## Complexity budget

Expected product mutation is limited to existing discovery/planner/authority code paths. New persistent state, daemon processes, databases, plugin interfaces, generic parsers, background indexing, or new receipt schema fields are forbidden by this plan.

## Deferred items

- nested configs in basic workspaces;
- explicit package-script config extraction;
- richer package-to-config ownership;
- targeted static relation graphs;
- first-class Python affected verification.

These require independent evidence and a separate specification.

## Decision

**PASS.** The reduced scope is the smallest architecture that can plausibly remove the published selector miss while preserving fail-closed semantics and existing M1 contracts.
