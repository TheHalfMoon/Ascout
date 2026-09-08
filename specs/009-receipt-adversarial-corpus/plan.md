# Specification 009 — Technical Plan

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

Planning ledger: Issue #252  
Canonical planning base: `fb6bb2ec152e41da05901509b0b62d1eb3636648`

## 1. Design summary

Implement a single deterministic Vitest contract suite that constructs a valid Receipt v1 control, applies explicit named mutations, and checks the exact current receipt JSON Schema and semantic validator boundaries.

No product code, schema, workflow, dependency, historical result, or CLI surface is planned.

Preferred tracked implementation surface:

- `tests/receipt-adversarial-corpus.contract.test.ts`

## 2. Existing canonical surfaces to exercise

The implementation must import and exercise the current repository exports rather than creating alternate validators:

- `validateReceiptJsonSchema` from `src/receipt/json.ts`;
- `validateReceiptSemantics` from `src/receipt/model.ts`;
- Receipt v1 TypeScript types from the current receipt model where useful.

The JSON Schema remains the canonical file already loaded by `src/receipt/json.ts`:

- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json`

No copy of the schema is permitted in the corpus.

## 3. Fixture architecture

Within the test file, define one `validReceiptFixture()` factory that returns a fresh Receipt v1 object per call.

Requirements:

- deterministic literals only;
- valid full lowercase Git object IDs and SHA-256 values;
- stable source start/end identity;
- one executed PASS test task;
- resolvable evidence/artifact references;
- one changed executable line that is exercised;
- complete selection accounting;
- complete timing and observations;
- summary derived consistently with a clean exit 0;
- no absolute paths, credentials, network identity, or real secret values.

The fixture MUST pass both exact validators before any mutation cases execute.

If branch evidence is included as a second valid control, construct it from the base valid fixture and preserve all branch count/state/order invariants.

## 4. Mutation case type

The test may use a local test-only shape equivalent to:

```ts
type AdversarialCase = {
  id: string;
  expectedLayer: "schema" | "semantic";
  requiredSemanticCodes?: readonly string[];
  mutate(candidate: Record<string, unknown>): void;
};
```

This shape is not a product API and MUST remain local to the test file unless one separately authorized test-only helper becomes necessary.

Case IDs must use stable kebab-case names grouped by domain, for example:

- `evidence-dangling-task-reference`;
- `source-comparison-base-mismatch`;
- `path-backslash-changed-file`;
- `command-surface-normal-admission`;
- `timeline-task-outside-run`;
- `summary-clean-exit-with-material-gap`.

## 5. Runner algorithm

For each execution:

1. construct a fresh valid control;
2. prove schema valid;
3. prove semantic valid;
4. verify case IDs are unique and expectation metadata is complete;
5. for every case in stable declared order:
   - construct a fresh control;
   - apply exactly that case mutation;
   - run exact schema validation;
   - if expected layer is `schema`, require schema invalid;
   - if expected layer is `semantic`, require schema valid, then run semantic validation and require invalid;
   - require every declared semantic issue code to be observed;
6. run all valid controls and require both validators valid;
7. fail if any case is not accounted for.

No retries and no mutation of expected outcomes based on observed results.

## 6. Planned case domains

### 6.1 Evidence/reference integrity

Plan representative cases for:

- duplicate evidence ID;
- task dangling evidence ID;
- finding dangling evidence ID;
- evidence wrong run ID;
- evidence unknown/wrong task ID;
- evidence dangling artifact ID;
- task dangling artifact ref;
- duplicate artifact ID if semantic/schema contract requires uniqueness;
- artifact unknown task linkage where current semantics require resolution.

Before implementation, re-read current validator code and schema so every expectation maps to an actually intended invariant. Do not invent a code name.

### 6.2 Source/comparison integrity

Plan cases for:

- invalid HEAD/base object ID shapes;
- base/source-start mismatch;
- remote/local identity shape and portable mismatch;
- start/end repository identity mismatch;
- missing end with `stable`;
- equal trees with `tree_drifted`;
- changed trees with `stable`.

### 6.3 Paths and changed ranges

Plan path spelling cases across at least two receipt path locations so validation is not accidentally specific to one array:

- backslash;
- absolute POSIX;
- drive-like absolute;
- URI/scheme-like;
- leading `./`;
- `../` traversal;
- inner dot/dot-dot segment;
- duplicate separator;
- trailing separator.

Plan range cases:

- zero/negative/fractional endpoint;
- start > end;
- overlap;
- non-text change carrying ranges;
- rename/previous-path contradictions.

Avoid combinatorial duplication once the shared path/range validator itself is proven across representative callers.

### 6.4 Command authority/admission

Re-read current task invariant codes and plan cases that prove:

- authority path must exist in comparison;
- matching changed authority file must be command surface;
- changed surface cannot use ordinary admission;
- explicit changed-surface override requires a changed surface;
- refused changed surface cannot masquerade as executed PASS/FAIL/FLAKY;
- changed authority path list and admission status remain mutually consistent.

### 6.5 Timeline and observations

Plan cases for:

- unparseable timestamps where schema does not already reject;
- reversed run timeline;
- partial task timing tuple;
- executed task without timing;
- task before/after run bounds;
- duration mismatch;
- negative/fractional observation counts;
- failures > runs;
- PASS with failures;
- FAIL with zero failures;
- executed task with zero runs.

### 6.6 Selection and exercise

Plan cases for:

- negative/fractional selection counts;
- selected + deselected != total;
- pass/root selection accounting contradictions;
- unsafe selection but complete summary;
- inconsistent exercise aggregate counts;
- EXERCISED with non-positive/null execution count;
- NOT_EXERCISED with positive execution count;
- UNRESOLVED without non-empty reason;
- exercise source task IDs that do not resolve or are ineligible;
- branch record sort/count/state contradictions when branch evidence is present.

### 6.7 Summary/exit

Plan cases for:

- wrong task status counts;
- wrong finding count;
- wrong completeness;
- wrong exit for ERROR/stability drift/finding/flake/material gap;
- explicit clean exit 0 with remaining NOT_EXERCISED or UNRESOLVED changed executable line.

## 7. Privacy scope

Do not create a case asserting that arbitrary secret-looking text is rejected unless the current deterministic contract actually requires it. Redaction coverage lives in existing execution/persistence tests.

A privacy adversarial case may be included only when it targets a deterministic receipt contract condition such as a forbidden raw absolute path or repository identity shape. The test description must not imply universal secret detection.

## 8. Qualification strategy

### Focused

Run the new contract file through the existing Vitest command used by the repository.

The focused result must prove:

- valid controls pass;
- all declared cases executed;
- no duplicate IDs;
- all invalid cases rejected at declared layer;
- all required semantic codes present.

### Full repository

Use existing Project CI on exact final head. No new CI workflow is authorized.

### Review

Require fresh independent substantive exact-head review covering:

- contract-layer classification;
- expected issue-code correctness;
- mutation minimality;
- no hidden product change;
- no YAGNI violation;
- no Spec 007 scope leakage.

Any mutation after review invalidates review freshness.

## 9. Failure handling

If the corpus finds an accepted invalid case:

1. keep the failing case unchanged;
2. do not change product/schema/validator in T115;
3. record exact case ID and observed validator outputs in the durable task ledger;
4. classify T115 `NO_GO / PRODUCT_GAP_DISCOVERED`;
5. return to a separately reviewed recovery planning unit that may authorize the smallest product repair;
6. after any repair becomes canonical, rerun the same unchanged adversarial case under new exact-head qualification.

This preserves the distinction between measurement and repair.

## 10. No publication artifact

The plan does not create a new `benchmarks/results/**` artifact. The corpus is executable repository contract evidence. Exact commit, CI run, test path, and review/merge evidence are sufficient for canonical closeout.

## 11. Planned task order

`T115 -> T116`

- T115: implement and qualify the one-path adversarial corpus contract.
- T116: ledger/governance reconciliation and next-frontier decision after T115 closes canonically.

A separate result-publication task is removed by YAGNI review.

## 12. Authorization boundary

This plan grants no implementation authority. After planning merges canonically, create a separate authorization artifact that binds the exact planning merge and authorizes exactly the final T115 implementation surface plus T116 ledger-only closeout.
