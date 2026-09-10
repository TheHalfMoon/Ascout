# Spec 011 Second Ponytail Plan Reduction

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Purpose

Apply Ponytail/YAGNI a second time directly to the technical plan in `plan.md`, ensuring the implementation design did not reintroduce complexity while specifying how the rule is built.

## Plan elements reviewed

### 1. Separate authority storage versus resolved-value reuse

**Reduced.** No new discovery field, receipt field, or artifact is needed to carry script authority. The existing `jsTestRunner` resolved outcome plus its `sourcePaths` already conveys the decision to planners. The resolved shape is intentionally identical to an existing root-only single-declaration outcome; explicit authority is proven by focused contracts showing that an otherwise-ambiguous root-manifest input became resolved, not by a new runtime marker. No new persisted object is justified, and `spec.md` FR-011-005 is aligned with this reuse.

### 2. Planner-side script parsing

**Removed.** Both planners already receive `input.discovery.jsTestRunner`. Duplicating root-script reads inside `src/tools/vitest.ts` and `src/tools/jest.ts` would create two authority sources. Planners consume the single post-authority discovery value only.

### 3. Configurable allowlist

**Rejected.** A configurable allowlist would create a new trust-grant surface and require its own admission review. The two exact strings are frozen in code and reviewed as part of T120. Any future entry needs a separately reviewed planning amendment.

### 4. Argument-tolerant matching

**Rejected again at plan level.** Even a small flag grammar (`--coverage`, `--ci`) would require per-runner safety review and would weaken the exact-string guarantee that makes review tractable. Flagged scripts stay ambiguous.

### 5. Workspace-aware script fan-out

**Rejected again at plan level.** Considering nested scripts or per-package authority would require workspace-scope attribution rules beyond the measured single-package Ascout case. Root-only stands.

### 6. New error codes or reason strings

**Rejected unless proven necessary during implementation review.** Preserving the exact existing `js_test_runner_ambiguous` code, text, candidates, and source paths on non-resolving paths is simpler and keeps all existing tests, receipts, and shadow-reason handling valid. A new code is justified only if exact preservation proves impossible, which would itself require return to planning.

### 7. New timeout, retry, or async machinery

**Removed.** Discovery is synchronous pure computation. No timeout, retry, process, or async surface is authorized.

### 8. Shadow-harness change

**Removed.** `benchmarks/selector-shadow.mjs` keeps its frozen exact `vitest run` check. Discovery resolution may make future bound test tasks comparable, but the shadow reference command itself is not widened.

### 9. Additional test helper or fixture framework

**Rejected.** Focused contracts use the existing in-memory `discoverProjectFromFiles` and existing planner input shapes plus minimal local executable fixtures already established by current discovery tests. No new harness library is justified.

### 10. Benchmark or live-observation gate beyond standard CI

**Rejected.** T120 needs no new benchmark corpus, historical replay, or separate live-observation artifact beyond the standard exact-head Self Verification receipt already required for every task. Selector-shadow live behavior can be observed after T120 closes, but it is not a T120 merge gate.

## Retained minimal plan

```text
pure explicitTestScriptAuthority(root scripts.test) in src/discovery.ts
  -> ambiguous {jest,vitest}-only integration, exact preservation otherwise
  -> Vitest/Jest planners consume post-authority value, no duplicated parsing
  -> one focused deterministic contract file covering frozen allowlist plus exhaustive fail-closed taxonomy
```

## Retained surfaces unchanged from first reduction

T120:

- `src/discovery.ts`
- `src/tools/vitest.ts`
- `src/tools/jest.ts`
- `tests/t120-explicit-script-authority.contract.test.ts`

T121:

- ledger/governance only by default.
