# Quality Obligation Model — Wedge Slice 1

First Spec 015 implementation slice under P015-03 authorization
(`P015_03_FIRST_WEDGE_IMPLEMENTATION_AUTHORIZATION.md`, effective after
PR #331 merge `1299346` and Issue #330 closeout).

## What this slice adds

`src/quality/obligation.ts`: deterministic serializable data plus
fail-closed predicates for the head of the frozen wedge pipeline:

- requirement sources with explicit kind and provenance;
- `RequirementConflict` nodes for PRD/test/code disagreements. A conflict
  starts `unresolved` and blocks release for affected obligations. There is
  no silent code-wins outcome; every resolution records an accountable
  resolver;
- oracle classification across the ten canonical classes with
  independence (`independent`, `derived`, `circular`, `unknown`) and a
  calibration flag. Only proven independent calibrated oracles may gate
  release. Circular oracles fail closed and stay advisory;
- `TestObligation` nodes with behavior text, requirement/risk links,
  oracle, status, bound evidence ids, and linked conflict ids.
  `deriveObligationStatus` never reports `covered` without bound evidence
  (no green by omission) and forces `blocked-by-conflict` while any linked
  conflict is unresolved. Dangling conflict links yield `unresolved`;
- deterministic JSON round-trip with strict validation. Malformed input
  raises `TypeError`; nothing is manufactured.

## What this slice does not do

No test generation, no worktree execution, no stability or discrimination
gates, no reproduction, no benchmark corpus, no donor code, no dependency
change, no CLI surface change. Those arrive in later slices under the same
authorization, each with its own qualification and maintainer verification.

## Evidence

`tests/quality-obligation.contract.test.ts` proves each rule above,
including conflict blocking, oracle gating, circular fail-closed behavior,
no-covered-without-evidence, and JSON round-trip integrity.
