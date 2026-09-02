# Specification 005 Cross-Artifact Analysis

## Findings

### A1 — Roadmap / evidence integrity

`PASS`. Only measured M1.1-B environment evidence depth; no function coverage/M2 and no change to PASS/completeness authority.

### A2 — Trust / privacy

`PASS`. No new process execution/install. Discovery remains sole manager authority. Host/user/network/env/secret identity is prohibited; lockfile reads stay contained.

### A3 — Receipt compatibility / exact revision truth

`PASS_AFTER_RECONCILIATION`. Additive lockstep honestly records stale strict-schema rejection. `ascout_version` is not a unique source/schema key. No negotiation/v2 expansion.

### A4 — Prior-schema evaluator proof

`PASS_AFTER_RECONCILIATION`. T104 includes only the narrow `src/receipt/json.ts` same-evaluator reuse needed to run current and pinned prior schemas through canonical validator semantics. No duplicate evaluator/dependency/runtime schema selection.

### A5 — Package-manager / lockfile provenance

`PASS_AFTER_RECONCILIATION`. Declaration-led exact version comes from the same discovery snapshot; lockfile discovery values are presence sentinels and exact filesystem bytes are reread only from authorized contained paths. Authority failure is integrity; supplemental failure may be null without fallback.

### A6 — Discovery boundary

`PASS`. `src/discovery.ts` remains excluded; insufficiency is `NO_GO` + replanning.

### A7 — Environment integrity-error process semantics

`PASS_AFTER_RECONCILIATION`. Live `runCli()` maps a successful receipt to its canonical summary exit code but maps generic non-usage exceptions to `1`; canonical Spec 001/Master Plan reserve exit `2` for internal/integrity errors. Letting the new expected environment-integrity failure fall through generic handling would violate that contract. T105 therefore owns a typed environment-integrity error, and T106 observes before project-task execution, emits no receipt on failure, and narrowly updates `src/cli.ts` to map only that type to redacted diagnostic + exit `2`. No synthetic receipt field/task and no generic CLI error redesign.

### A8 — Task ordering / mutation surfaces

`PASS_AFTER_RECONCILIATION`.

- T104: model + current schema + narrow JSON evaluator reuse + exact prior fixture/tests.
- T105: `src/environment.ts` + focused tests.
- T106: `src/check.ts` pre-task observation/publication + `src/cli.ts` typed integrity-error exit mapping + focused integration tests.

No package/dependency/workflow/benchmark mutation.

### A9 — Findings reconciliation

`PASS_PENDING_FRESH_HEAD_REVIEW`. Reconciled:

- F1 package-manager/lockfile authority provenance;
- F2 strict-validator compatibility;
- F3 false exact revision binding via `ascout_version`;
- F4 declaration-led manager null-version ambiguity;
- F5 lockfile sentinel/byte-source and authority-reread semantics;
- F6 prior strict-schema proof lacked an authorized canonical-evaluator route;
- F7 environment observation integrity failure would otherwise fall into generic CLI exit `1`, conflicting with canonical integrity-error exit `2`.

Every repair changes planning head; earlier CI/reviews are stale. Fresh exact-head CI and independent review are mandatory.

## Cross-artifact consistency result

`PASS / NO_MATERIAL_CONFLICTS_AFTER_F1_F2_F3_F4_F5_F6_F7_RECONCILIATION`

No implementation authority is granted by this analysis.
