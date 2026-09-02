# Specification 005 Cross-Artifact Analysis

## Findings

### A1 — Roadmap / evidence integrity

`PASS`. Only measured M1.1-B environment evidence depth; no function coverage/M2 and no change to PASS/completeness authority.

### A2 — Trust / privacy

`PASS`. No new process execution/install. Discovery remains sole manager authority. Host/user/network/environment/secret identity is prohibited.

### A3 — Receipt compatibility / exact revision truth

`PASS_AFTER_RECONCILIATION`. Additive lockstep honestly records stale strict-schema rejection. `ascout_version` is not a unique source/schema key. No negotiation/v2 expansion.

### A4 — Prior-schema evaluator proof

`PASS_AFTER_RECONCILIATION`. T104 includes only the narrow `src/receipt/json.ts` same-evaluator reuse needed to run current and pinned prior schemas through canonical validator semantics. No duplicate evaluator/dependency/runtime schema selection.

### A5 — Package-manager / lockfile provenance

`PASS_AFTER_RECONCILIATION`. Declaration-led exact version comes from the same discovery snapshot; lockfile discovery values are presence sentinels. Authority failure is integrity; supplemental failure may be null without fallback.

### A6 — Lockfile object binding / TOCTOU

`PASS_AFTER_RECONCILIATION`. A realpath check followed by a later independent open would permit path replacement between containment and read. T105 now requires a single object-bound descriptor sequence: contained pre-open object identity, one read-only open, immediate descriptor identity match before bytes, descriptor-only bounded-memory hashing, pre/post descriptor stability checks, and post-read contained path/object identity recheck. Path/size/timestamps alone cannot substitute for object identity. Persistent replacement or in-place mutation invalidates the observation. Supported Linux/macOS/Windows × Node 22/24 object identity must be proven; otherwise T105 is `NO_GO` with no weaker fallback.

### A7 — Discovery boundary

`PASS`. `src/discovery.ts` remains excluded; insufficiency is `NO_GO` + replanning.

### A8 — Environment integrity-error process semantics

`PASS_AFTER_RECONCILIATION`. Live generic non-usage CLI exceptions return `1` while canonical Spec 001/Master Plan reserve exit `2` for internal/integrity errors. T105 owns a typed environment-integrity error; T106 observes before project-task execution, emits no receipt on failure, and narrowly maps only that type in `src/cli.ts` to redacted diagnostic + exit `2`. No synthetic receipt field/task and no generic CLI redesign.

### A9 — Task ordering / mutation surfaces

`PASS_AFTER_RECONCILIATION`.

- T104: model + current schema + narrow JSON evaluator reuse + exact prior fixture/tests.
- T105: `src/environment.ts` + local object-bound descriptor logic + focused observer/race/privacy tests.
- T106: `src/check.ts` pre-task observation/publication + `src/cli.ts` typed integrity-error exit mapping + focused integration tests.

No package/dependency/workflow/benchmark mutation.

### A10 — Findings reconciliation

`PASS_PENDING_FRESH_HEAD_REVIEW`. Reconciled:

- F1 package-manager/lockfile authority provenance;
- F2 strict-validator compatibility;
- F3 false exact revision binding via `ascout_version`;
- F4 declaration-led manager null-version ambiguity;
- F5 lockfile sentinel/byte-source and authority-reread semantics;
- F6 prior strict-schema proof lacked an authorized canonical-evaluator route;
- F7 environment observation integrity failure would otherwise fall into generic CLI exit `1`, conflicting with canonical integrity-error exit `2`;
- F8 lockfile containment check and later open were not object-bound, leaving a check-to-read replacement race.

Every repair changes planning head; earlier CI/reviews are stale. Fresh exact-head CI and independent review are mandatory.

## Cross-artifact consistency result

`PASS / NO_MATERIAL_CONFLICTS_AFTER_F1_F2_F3_F4_F5_F6_F7_F8_RECONCILIATION`

No implementation authority is granted by this analysis.
