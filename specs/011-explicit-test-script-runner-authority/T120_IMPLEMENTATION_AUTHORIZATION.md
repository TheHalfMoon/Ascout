# Specification 011 — T120 Implementation Authorization

## Status

`SPEC_011_T120_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE`

`T120_IMPLEMENTATION_AUTHORIZED = NO`

This artifact is the repository successor-authorization candidate for Issue #279. It grants no T120 implementation authority until it is independently qualified, guarded-merged, post-merge verified, and Issue #279 closes `CLOSED_CANONICAL / EFFECTIVE`.

## Canonical predecessor

Spec 011 planning is durably closed canonical:

- planning ledger: Issue #277, closed `completed` with `SPEC_011_PLANNING = CLOSED_CANONICAL / GO`;
- planning PR: #278, merged/closed;
- planning merge: `1988a3e43172342839c90a63af135aba7f83a1db`;
- ordered merge parents: `1483c481c0ad6ab4a8b4dd15cdf9120afe86e967` + `8fa81d32329b7ab59d9632a46aab3e8debe28351`;
- merge tree = reviewed-head tree `9e753164f171224abc7d36766af754588c96a499`;
- this authorization base: `1988a3e43172342839c90a63af135aba7f83a1db`.

The authoritative T120 contract remains the canonically merged Spec 011 `spec.md`, `plan.md`, `tasks.md`, and supporting planning artifacts.

## Authority activation boundary

Until this artifact itself becomes canonical and Issue #279 closes effective:

- T120 repository mutation is forbidden;
- T121 remains blocked;
- no other repository surface follows from this candidate.

After this artifact is independently qualified, guarded-merged, post-merge verified, becomes canonical, and Issue #279 closes `SPEC_011_T120_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`, only the bounded T120 authority below becomes effective.

## T120 authorized tracked surface

Exactly four tracked repository paths are authorized for T120:

- `src/discovery.ts`;
- `src/tools/vitest.ts`;
- `src/tools/jest.ts`;
- `tests/t120-explicit-script-authority.contract.test.ts` (new).

No fifth path — including `benchmarks/**`, workflows, receipts, schemas, selectors, CLI, config surface, package metadata, lockfiles, benchmark results, Spec 007, release/tag/publication material — is authorized as T120 implementation surface.

## Frozen behavior delta

T120 may make only the bounded discovery change required by canonical Spec 011:

1. add one pure, synchronous, total, deterministic resolver over the already-collected in-scope root `package.json` `scripts.test` value with no I/O, process launch, network, clock, randomness, or environment read;
2. accept only exact string equality: `"vitest run"` -> `vitest`, `"jest"` -> `jest`; no trimming, case folding, quote handling, substring search, regex, shell tokenization, or repair;
3. apply authority only when the existing `discoverRunner` outcome is `ambiguous` with exactly candidates `{jest, vitest}` and ambiguous `sourcePaths` exactly `["package.json"]`;
4. on resolution return the existing resolved shape `{ state: "resolved", value, sourcePaths: ["package.json"] }` with no new runtime provenance field;
5. on every non-resolving path preserve the existing outcome byte-for-byte (reason code, reason text, candidates, source paths), including nested-declaration ambiguous preservation with no provenance loss;
6. never change `absent`, `unsupported`, or already-`resolved` outcomes and never map a non-ambiguous state to ambiguous;
7. make `planVitestTask` and `planJestTask` consume the single post-authority `input.discovery.jsTestRunner` value without duplicating script parsing;
8. preserve all downstream planner gates (Ascout config handling, changed-path validation, scope-root selection, config-ambiguity refusal, local runtime, coverage provider, run-id safety, artifact paths);
9. preserve existing `classifyCommandSurfaces` test authority and per-invocation changed-surface admission;
10. cover the plan.md section 8 fail-closed taxonomy plus section 12 planner-level assertions in the new focused contract file.

## Hard prohibitions

No allowlist widening, argument tolerance, executor support, nested-script authority, shell parsing, dependency/action/service addition, workflow/permission change, receipt/schema change, selector/widening change, threshold/recall/causal claim, persistent trust, auto-admission, or Spec 007 reinterpretation. On any material mismatch: `NO_GO / RETURN_TO_PLANNING`.

## Qualification gate

Before T120 may merge, the T120 branch must prove on its exact head:

- reverified canonical base;
- branch purity (exactly the four authorized paths);
- focused contract tests pass;
- full `npm test`, `npm run typecheck`, `npm run build` pass as applicable;
- exact-head Self Verification success;
- original-attempt six-lane Project CI success;
- fresh independent substantive exact-head review with no material unresolved findings and zero unresolved material threads;
- live rulesets/protection revalidation;
- unchanged base immediately before guarded expected-head normal merge;
- post-merge ordered-parent/tree/signature/PR/main proof with merge tree equal to the reviewed-head tree.

```text
SPEC_011_T120_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
T120_IMPLEMENTATION_AUTHORIZED = NO
T121 = BLOCKED_BY_T120
```
