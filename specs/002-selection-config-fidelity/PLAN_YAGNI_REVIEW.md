# Spec 002 Plan Ponytail / YAGNI Review

**Gate:** Post-plan complexity reduction  
**Result:** PASS

## Review question

Can the technical plan remove any subsystem, abstraction, state, parser, dependency, or task without weakening the measured acceptance target?

## Findings

### Keep: existing recursive discovery

The repository already performs one bounded recursive discovery pass and already recognizes nested Jest/Vitest config filenames. A second filesystem index or watcher would be redundant.

### Keep: existing flat `configPaths` model

Spec 002 does not need a new configuration graph or package-to-config registry. The single-package fallback can be represented by the existing path list plus deterministic planner rules.

### Keep: explicit argv

The existing Jest/Vitest planner already owns `--config` argv construction. No command wrapper or shell reconstruction is needed.

### Keep: existing command authority model

The selected config path can flow through existing authority classification. A second admission/security model is forbidden.

### Remove: package-script extraction

Even a restricted package-script tokenizer would create a new grammar/security surface not required by the measured case. Removed.

### Remove: workspace nested fallback

Basic-workspace config ownership would require extra semantics and fixtures. Removed from M2.

### Remove: generic relation graph

The benchmark miss can be repaired at configuration fidelity before any dependency graph is justified. Removed.

### Remove: new benchmark framework

Reuse T075–T078 harness/assertion machinery and publish only fresh M2 evidence. No second benchmark framework.

### Remove: receipt changes

No new receipt field is necessary. Removed.

## Final implementation shape

The smallest expected product delta remains:

1. modify Jest/Vitest config candidate filtering in `src/discovery.ts` for single-package fallback;
2. modify existing Jest/Vitest planner config selection to accept exactly one nested candidate at repository scope;
3. preserve authority/admission through existing paths;
4. validate with existing test/benchmark infrastructure.

## Decision

**PASS.** No additional architecture is justified. Any implementation need beyond this shape triggers a return to planning.
