# Statement-level coverage and the receipt version: design note

**Status:** design only, 2026-11-16. **Not authorized to implement.** Any change to the receipt schema
conflicts with constitution Amendment A07 clause 6 ("Receipt schema v1.0 and its bytes are
unchanged…"), so shipping either option below needs a founder-ratified amendment first.

**Origin:** `STATE.md` lists one item still open from the 2026-11-08 security review: "statement-level
coverage, which needs a receipt version change". No spec designed it until now.

## 1. The gap today

- **Line-based evidence.** The receipt's exercise evidence is line-based. `src/exercise.ts`
  `buildChangedLineExercise` intersects LCOV `DA:` points with the changed line ranges. `DA` is "the
  exclusive source for line-level exercise records".
- **Branch evidence** is an additive, optional v1 extension: `BRDA:` records and `branch_records`.
- **What a line can hide.** A line counts as EXERCISED when its `DA` count is above zero. A line
  holding several statements, such as `a(); if (x) b(); c();` or a chained or short-circuit
  expression, can be "exercised" while one statement on it never ran. Branch records catch some of
  these (the `if`), but not straight-line statements after an early `return` or `throw` on the same
  line, or statements inside a single-line arrow body.
- **Lines with no `DA` point** (comments, blank lines, continuations) produce no record. That is
  correct and unchanged by this design.
- **Pytest** collects no coverage today, so its exercise falls back to empty. That is out of scope
  here.

## 2. Where statement data comes from

| Runner and provider | Statement data available | Notes |
|---|---|---|
| Vitest, istanbul provider | `coverage-final.json`: `statementMap` and `s` counts per file | Exact statement spans |
| Vitest, V8 provider | V8 block ranges, converted by `v8-to-istanbul` into the same istanbul JSON | Approximate around source maps; the conversion is already what produces LCOV today |
| Jest (babel or v8) | `coverage-final.json` with `--coverageReporters=json` | Same istanbul shape |
| Pytest | None (no coverage collected) | Unchanged |

Collecting it means adding the `json` reporter beside `lcov` (Vitest:
`--coverage.reporter=lcov --coverage.reporter=json`; Jest: `--coverageReporters=lcov
--coverageReporters=json`), parsing `coverage-final.json`, and mapping each statement whose span
touches a changed line.

## 3. Option A (recommended): additive v1 statement records

Follow the established precedent (Spec 004 branches, Spec 005 environment) under
`RECEIPT_V1_ADDITIVE_LOCKSTEP`. Stay at `schema_version: "1.0"` and add optional fields to `exercise`:

- `statement_records[]`: `{ path, start_line, start_column, end_line, end_column, state:
  EXERCISED|NOT_EXERCISED|UNRESOLVED, execution_count, source_task_ids, reason? }`;
- `exercised_statements`, `not_exercised_statements`, `unresolved_statements`.

**Semantics:**
- Any NOT_EXERCISED or UNRESOLVED changed statement makes the receipt `materially_incomplete` (exit 4),
  as lines and branches already do.
- A line can no longer be EXERCISED when a changed statement on it is NOT_EXERCISED. The semantic
  validator enforces the lock-step: line state must be consistent with its statements.
- When no statement data exists (pytest, or a provider without JSON), the fields are absent. Line
  evidence alone then governs, exactly as today. No false PASS can come from missing statement data.

**Compatibility:**
- Older receipts stay valid under the new validator.
- Older strict validators reject new receipts that carry statement fields. That is the documented,
  unsupported pairing from the Spec 005 policy.
- `ascout_last_check` and `ascout test` read with the same-revision validator.

**Cost:**
- schema and semantic validator;
- the istanbul JSON parser;
- mapping in `exercise.ts`;
- renderers (agent, terminal, JSON);
- the adversarial corpus;
- the embedded-schema equality test.

## 4. Option B: receipt v2

`schema_version: "2.0"`, with statement records required whenever coverage exists. This makes every
consumer handle two versions:
- `ascout_last_check`, `testRunResultFromReceiptV1` (`receipt_schema_version: "1.0"`), and PR
  evidence collection;
- at least 19 test files that pin `"1.0"`;
- the adversarial corpus, which today expects `"2.0"` to be **rejected**.

It also needs a version-negotiation design that Spec 005 deliberately deferred. **Not recommended:**
the extra breakage buys no assurance over Option A.

## 5. Gates before any implementation

1. **A constitution amendment**, founder-ratified, that replaces A07 clause 6's "receipt schema v1.0
   and its bytes are unchanged" with the chosen evolution rule. The governance section of the
   constitution requires an explicit delta, the affected artifacts, a trust review, and a version
   increment from 1.4.0. **This is founder-only.**
2. **A spec**, written like Spec 004 and Spec 005. It covers the exact schema delta, the semantic
   rules, the producer/consumer matrix, adversarial cases (statement spans outside the file, overlaps,
   counts on unchanged lines, provider mismatch), and the pinned prior-schema rejection proof.
3. **Native qualification on three OSes**, with the real istanbul and V8 providers, using fixtures
   where a line is executed but one of its statements is not.

## 6. Decision recorded

Under the founder's delegation of 2026-11-16: **recommend Option A, and implement nothing** until
gate 1 exists. Until then, receipts stay v1.0 exactly as shipped, and the line and branch evidence
already shipped is unchanged.
