# Spec 003 Clarifications

## C1 — Is this product branch coverage support?

No. Spec 003 is benchmark/qualification-only. It may add benchmark/test code and a new result file, but it must not modify `src/`, receipt contracts, CLI output, completeness, or exit behavior.

## C2 — Why branch evidence before browser/API/security breadth?

The current repository already consumes LCOV and explicitly discards `BRDA:` as non-line noise. This is a directly observed evidence-depth limit adjacent to the existing core, so it has lower complexity and trust cost than introducing a new verification domain.

## C3 — Is synthetic evidence acceptable?

Yes for mechanism qualification because the question is whether line-only evidence can hide a branch-only gap and whether LCOV branch records can be normalized honestly. Fixtures must be deterministic, explicit, reviewed, and must not be presented as adoption/prevalence evidence. Product promotion still requires a separate future spec and may require broader corpus evidence.

## C4 — What does LCOV `BRDA` taken `-` mean here?

It is not converted to zero. It becomes `taken: null` and `BRANCH_UNRESOLVED`.

## C5 — How are repeated branch observations handled?

The same normalized `(path,line,block,branch)` identity aggregates numeric `taken` counts by safe integer addition. If any repeated observation for that identity is unknown (`-`), the aggregate remains unresolved unless a future spec provides a defensible rule; Spec 003 chooses the conservative unresolved result.

## C6 — Are block/branch identifiers numeric?

Treat them as non-empty opaque LCOV identity tokens with deterministic lexical ordering. Do not invent control-flow semantics from their values.

## C7 — How is changed scope represented?

Qualification fixtures explicitly declare changed line ranges. The benchmark evaluator intersects normalized branch line locations with those ranges. It does not infer executable branches from source text.

## C8 — Can a branch gap change Ascout exit code in Spec 003?

No. Spec 003 has no product authority. A `GO` result only permits a future planning package to propose product semantics.

## C9 — Does the qualification require a new runtime dependency?

No. Node standard library and existing repository test tooling are sufficient.

## C10 — What is the closeout decision?

`GO` means the qualification gates prove branch evidence adds deterministic evidence depth and a future product-integration spec may be planned. `NO_GO` means the evidence does not justify integration. Neither result modifies current product claims by itself.
