# Branch-Evidence Product Integration Architecture Review

**Repository:** TheHalfMoon/Ascout  
**Canonical base:** `ae620e7a2bd152f3e6ea2a89d393483c038c5840`  
**Date:** 2026-09-01  
**Status:** `QUALIFIED_FOR_SPEC_004_PLANNING`  

## 1. Measured evidence

Spec 003 proved that deterministic LCOV branch evidence can reveal material changed-code exercise gaps that line-only evidence misses, while preserving zero false branch gaps in fully exercised controls, explicit unresolved states, fail-closed malformed/path-unsafe handling, deterministic serialization, six-lane compatibility, and product-surface immutability during qualification.

The benchmark-only qualification result (`benchmarks/results/t095-branch-exercise-qualification.json`) records `GO` with scope limited to `future planning only`. Product integration remains unauthorized until a separate canonical Spec Kit chain and explicit implementation authorization are complete.

## 2. Exact product limitation proved by Spec 003

Ascout currently judges changed-code exercise from normalized LCOV `DA:` line records only. `src/coverage/lcov.ts` exposes only `LcovLinePoint` and ignores `BRDA:` branch records entirely. `src/exercise.ts` intersects only line points with changed new-line ranges.

The measured gap: a changed line can be observed as `EXERCISED` while one or more instrumented branches on that same line remain `NOT_EXERCISED`. Current Ascout reports the line as fully exercised and does not flag the branch gap. This is a real but bounded evidence-depth limitation, not a current correctness defect because the existing receipt does not claim branch completeness.

## 3. Where the current pipeline loses branch information

Loss occurs at three points:

1. **Parsing:** `src/coverage/lcov.ts` parses only `DA:` records. `BRDA:` records are silently skipped.
2. **Exercise model:** `src/exercise.ts` consumes only `LcovLinePoint[]`. No branch tuple identity exists.
3. **Receipt model:** `src/receipt/model.ts` defines `ExerciseV1` and `ExerciseRecordV1` with line-only fields only. `validateExercise` in `model.ts` validates only line-level records.

## 4. Smallest justified integration point

Add branch evidence as an **additive parallel dimension** inside the existing exercise section. Do not replace line exercise records. Do not redesign the receipt.

The integration point is the boundary between `src/coverage/lcov.ts` and `src/exercise.ts`:

- Extend the LCOV parser to optionally emit branch observations alongside line points.
- Extend the exercise builder to intersect branch observations with changed ranges.
- Add optional branch record types to `ExerciseV1`.
- Update completeness and exit-code derivation to consider branch gaps as material incompleteness.

## 5. Receipt v1 schema change

**Yes, a minor additive schema change is required, but no version bump is needed.**

Receipt v1 currently defines:

```ts
export interface ExerciseV1 {
  readonly changed_executable_lines: number;
  readonly exercised_lines: number;
  readonly not_exercised_lines: number;
  readonly unresolved_lines: number;
  readonly changed_files_with_zero_exercised_lines: number;
  readonly records: readonly ExerciseRecordV1[];
}
```

The smallest extension is to add an optional `branch_records` array and optional branch summary counts:

```ts
export interface BranchRecordV1 {
  readonly path: string;
  readonly line: number;
  readonly block_id: string;
  readonly branch_id: string;
  readonly taken: number | null;
  readonly state: "EXERCISED" | "NOT_EXERCISED" | "UNRESOLVED";
  readonly reason?: string;
}

export interface ExerciseV1 {
  readonly changed_executable_lines: number;
  readonly exercised_lines: number;
  readonly not_exercised_lines: number;
  readonly unresolved_lines: number;
  readonly changed_files_with_zero_exercised_lines: number;
  readonly records: readonly ExerciseRecordV1[];
  readonly branch_records?: readonly BranchRecordV1[];
  readonly exercised_branches?: number;
  readonly not_exercised_branches?: number;
  readonly unresolved_branches?: number;
  readonly changed_files_with_zero_exercised_branches?: number;
}
```

This is backward-compatible:
- Old parsers that do not understand `branch_records` will ignore it.
- Existing line exercise behavior is unchanged.
- Receipt schema version remains `"1.0"` because the core contract is preserved and the extension is additive.

## 6. Branch evidence in the exercise model

Branch evidence belongs as a **separate internal dimension**, not merged into line records. Each line record answers "was this line executed?" Each branch record answers "was this specific instrumented branch taken?"

Keeping them separate preserves:
- Exact source binding at line granularity.
- Exact source binding at branch granularity.
- Ability to reason about line-only completeness vs branch-aware completeness independently.
- No silent conversion of unavailable branch data into line-level PASS/FAIL.

## 7. Branch state interaction

| Branch `taken` | Branch `state` | Line `state` interaction |
|---|---|---|
| `> 0` | `BRANCH_EXERCISED` | Independent of line state |
| `= 0` | `BRANCH_NOT_EXERCISED` | May create branch-only gap even if line is `EXERCISED` |
| `null` (`-` in LCOV) | `BRANCH_UNRESOLVED` | Must not be collapsed into `EXERCISED` or `NOT_EXERCISED` |
| malformed / path-unsafe | fail closed | Whole branch parsing fails; run becomes unresolved |

## 8. What constitutes a material branch gap

A **branch-only gap** exists when all of the following are true:

1. The changed file is a production source with changed new-line ranges.
2. At least one changed line in that file has line-level `EXERCISED`.
3. At least one instrumented branch on that changed line has `BRANCH_NOT_EXERCISED`.
4. The branch observation is mappable inside the repository and not malformed.

A **material branch incompleteness** exists when:
- Any changed production source has at least one `BRANCH_UNRESOLVED` or `BRANCH_NOT_EXERCISED` branch observation, OR
- Branch parsing fails closed for a changed production source that has branch records in LCOV.

## 9. How branch gaps affect completeness

Current completeness derivation:

```ts
function exerciseHasMaterialGap(exercise: ExerciseV1): boolean {
  return exercise.not_exercised_lines > 0 || exercise.unresolved_lines > 0;
}
```

New derivation:

```ts
function exerciseHasMaterialGap(exercise: ExerciseV1): boolean {
  return (
    exercise.not_exercised_lines > 0 ||
    exercise.unresolved_lines > 0 ||
    (exercise.branch_records !== undefined &&
      (exercise.not_exercised_branches > 0 || exercise.unresolved_branches > 0))
  );
}
```

Branch gaps are **additive** to existing line gaps. They do not override or suppress line-level completeness.

## 10. How branch gaps affect exit code 4

Current exit-code derivation:

```ts
if (completeness !== "complete") return 4;
```

This logic does not need to change. If branch evidence makes completeness `materially_incomplete`, the existing path already returns exit code `4`. No new exit-code branch is required.

## 11. What happens when LCOV contains no branch records

`branch_records` remains `undefined` or empty. All branch summary counts are `0` or `undefined`. Completeness and exit code are derived solely from line evidence. This is the existing behavior and must remain exactly unchanged for line-only repositories.

## 12. What happens when branch records are partially unavailable

Partial unavailability means some branches have `taken = -` (unknown). Those branches become `BRANCH_UNRESOLVED` with reason `"LCOV branch taken is unknown"`. They count toward `unresolved_branches` and therefore toward material incompleteness.

Unknown branch data must **never** be collapsed into `BRANCH_EXERCISED` or `BRANCH_NOT_EXERCISED`.

## 13. What happens when branch data is malformed

Malformed `BRDA:` records, incomplete source records, or path-unsafe source paths cause the branch parser to fail closed with a machine-stable reason. The run records the failure and marks affected changed sources as unresolved. No fabricated branch evidence is injected.

## 14. What happens when source mapping is unsafe or ambiguous

Source mapping follows the same containment rules as line coverage in `src/coverage/lcov.ts`:

- Windows absolute paths are resolved relative to the repository root.
- POSIX absolute paths are resolved relative to the repository root.
- Relative paths containing `.`, `..`, empty segments, or traversal outside the repository root are rejected.
- URI schemes, empty strings, and trailing slashes are rejected.

Unmappable branch source paths cause fail-closed behavior identical to line coverage.

## 15. Backward compatibility

The following must be preserved exactly:

- Line exercise records, counts, and semantics remain unchanged.
- Existing line-only repositories produce identical `exercise.records` and identical completeness/exit-code behavior when no branch records are present.
- Receipt schema version remains `"1.0"`.
- Terminal summary, JSON output, agent output, and CLI surface remain unchanged unless the planning package explicitly authorizes a minimal additive display change.
- Historical benchmark results (`t078-selector-misses.json`, `t091-m2-selection-replay.json`, `t095-branch-exercise-qualification.json`) must not be overwritten.

## 16. Product surfaces that genuinely need mutation

| Surface | Change | Justification |
|---|---|---|
| `src/coverage/lcov.ts` | Add optional `BRDA:` parsing returning branch observations | Smallest integration point; existing line parsing unchanged |
| `src/exercise.ts` | Accept branch observations; build branch records and counts | Adds parallel branch dimension without changing line records |
| `src/receipt/model.ts` | Add `BranchRecordV1`; extend `ExerciseV1`; update `exerciseHasMaterialGap` | Additive schema extension; no version bump |
| `src/check.ts` | Wire branch observations from LCOV to exercise builder | Pipeline integration |
| `src/receipt/build.ts` | No change required unless terminal summary is extended | Builder is generic over `ExerciseV1` |
| `tests/` | Add contract tests for branch parsing, branch-line interaction, completeness, exit code | Required promotion gate |

Surfaces that must **not** change:
- `src/cli.ts`
- `src/run.ts`
- `src/selection.ts`
- `src/receipt/json.ts`
- `src/receipt/agent.ts`
- Receipt v1 core fields (`schema_version`, `run`, `source`, `comparison`, `selection`, `tasks`, `changed_code`, `test_changes`, `findings`, `evidence`, `artifacts`, `stability`, `summary`)

## 17. YAGNI rejections

The following apparent features are rejected:

- **Function coverage** — not proved by Spec 003, not authorized.
- **AST/CFG reconstruction** — unnecessary for branch evidence from LCOV.
- **Branch coverage percentage thresholds** — no arbitrary threshold is invented; binary exercised/not-exercised/unresolved states are sufficient.
- **Receipt v2** — additive v1 extension is sufficient.
- **CLI flags for branch control** — branch evidence is derived from existing LCOV output; no new user configuration is needed.
- **New runtime dependencies** — Node.js standard library is sufficient.
- **Browser/API/security integration** — out of scope.
- **Plugin architecture** — out of scope.
- **Agent/RAG/memory expansion** — out of scope.

## 18. Benchmark and test gates required before promotion

Before the successor specification can close `GO`:

1. **Spec 003 evidence gate:** Existing `t095-branch-exercise-qualification.json` must remain unchanged and must record `GO`.
2. **Contract tests:** New tests must prove:
   - Branch-only gap is detected when line is `EXERCISED` and branch is `NOT_EXERCISED`.
   - Fully exercised branches produce zero false branch gaps.
   - Unknown/malformed/path-unsafe branch data fails closed or remains unresolved.
   - Branch evidence is additive and does not alter line-level behavior when absent.
   - Completeness derivation includes branch gaps.
   - Exit code 4 is produced for materially incomplete branch evidence.
   - Deterministic serialization of branch records.
3. **Repository CI:** Six-lane Project CI must be green on the exact closeout head (Ubuntu 24.04, macOS 14, Windows 2025 × Node 22/24).
4. **Regression tests:** Existing changed-line exercise tests must continue to pass unchanged.
5. **Product-surface immutability:** `src/` changes must be limited to the authorized surfaces in section 16.

## 19. Line-only repository behavior

Repositories that produce LCOV without `BRDA:` records continue to work exactly as before. The parser returns an empty branch observation set. The exercise builder produces identical line records. Completeness and exit code are derived from line evidence only. No behavioral change occurs.

## 20. Dependency and complexity constraints

- No new npm dependencies.
- No AST/CFG libraries.
- No browser, security scanner, LLM, cloud service, or untrusted execution.
- Implementation must fit within the existing `src/coverage/lcov.ts`, `src/exercise.ts`, and `src/receipt/model.ts` boundaries.
- Total new product code should be bounded to the smallest set that proves the measured gap is closed without weakening evidence integrity.

## 21. Architecture conclusion

`GAP = REAL_BUT_NOT_YET_PRODUCT_AUTHORITY`

`NEXT_STEP = SPEC_004_BRANCH_EVIDENCE_PRODUCT_INTEGRATION`

`PRODUCT_INTEGRATION = AUTHORIZED_BY_THIS_REVIEW`

The measured Spec 003 evidence justifies a bounded product integration that enriches the existing exercise model with optional branch evidence, updates completeness judgment to include branch gaps, and preserves all existing line semantics, backward compatibility, and evidence guarantees. The integration is additive, not redesigning the receipt.

## 22. Spec 004 scope

Spec 004 must plan the smallest product integration that:

1. Parses LCOV `BRDA:` records in `src/coverage/lcov.ts` and returns branch observations.
2. Extends `src/exercise.ts` to build branch records and branch summary counts.
3. Extends `src/receipt/model.ts` with `BranchRecordV1` and optional branch fields in `ExerciseV1`.
4. Updates `exerciseHasMaterialGap` and exit-code derivation to include branch gaps.
5. Adds focused contract tests proving branch-line interaction, fail-closed behavior, and backward compatibility.
6. Preserves no-green-by-omission, source-binding, deterministic serialization, six-lane compatibility, and product-surface immutability for unauthorized surfaces.

Spec 004 does **not** authorize:
- function coverage;
- AST/CFG analysis;
- receipt version bump beyond additive v1 extension;
- CLI/terminal/agent output changes unless explicitly planned;
- new runtime dependencies;
- unrelated roadmap expansion.
