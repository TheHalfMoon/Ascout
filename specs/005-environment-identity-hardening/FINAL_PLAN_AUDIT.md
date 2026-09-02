# Specification 005 Final Plan Audit Dossier

**Audit role:** repository-side dossier for independent exact-head review; not independent approval.

## Audit questions

1. Is the measured gap real? — Yes; product receipt lacks run-level environment identity already represented in benchmark context.
2. Is scope minimal? — Yes; M1.1-B only, no function coverage/M2.
3. New execution authority? — No.
4. Source binding/no-green weakened? — No.
5. Compatibility explicit? — Yes; additive lockstep with expected stale strict-schema rejection.
6. Can T104 actually prove that rejection using the repository's real validator semantics? — Yes after F6 repair: the exact pinned prior schema is evaluated through the same canonical evaluator implementation in `src/receipt/json.ts`; only a narrow reuse/testability refactor is authorized and the normal current-schema entry point remains unchanged.
7. Does F6 create runtime schema negotiation or a second validator? — No; both are explicitly prohibited, as are new validation dependencies and arbitrary schema ingestion.
8. False exact revision binding via `ascout_version`? — No; it is only a product-version label and exact repository identities bind proof.
9. Declaration-led exact version preserved? — Yes; exact non-null x.y.z comes from discovery's package.json content snapshot; contradiction fails integrity.
10. Package.json disk reread? — No.
11. Can lockfile discovery sentinel be mistaken for bytes? — No; sentinel hashing is prohibited.
12. Lockfile digest byte source? — Exact filesystem bytes at the already-authorized path beneath canonical root with containment rechecked and bounded-memory hashing.
13. Lockfile authority source unreadable? — Integrity failure.
14. Package-json supplemental lockfile unreadable? — Null supplemental identity, no fallback.
15. Second package-manager resolver/discovery widening? — No; discovery remains sole authority and `src/discovery.ts` is excluded.
16. Privacy bounded? — Yes.
17. Task order valid? — Yes; contract/compatibility → observer → publication.
18. Implementation surfaces bounded? — Yes, including the newly explicit T104-only `src/receipt/json.ts` proof refactor.
19. CI/review/merge gates explicit? — Yes.

## Findings ledger

### F1 — package-manager / lockfile provenance
`RECONCILED_IN_PLAN`.

### F2 — stale strict receipt-v1 validator compatibility
`RECONCILED_IN_COMPATIBILITY_POLICY`.

### F3 — false exact producer-revision binding via `run.ascout_version`
`RECONCILED_IN_COMPATIBILITY_POLICY_AND_PLAN`.

### F4 — declaration-led manager authority could degrade to `package_manager_version=null`
`RECONCILED_IN_SPEC_PLAN_TASKS`.

### F5 — discovery lockfile sentinel/byte-source and lockfile authority reread semantics
`RECONCILED_IN_SPEC_PLAN_TASKS`.

### F6 — prior strict-schema rejection proof was not implementable through the canonical JSON Schema evaluator within the stated T104 surface
`RECONCILED_IN_COMPATIBILITY_POLICY_PLAN_TASKS`. T104 now explicitly authorizes the minimum `src/receipt/json.ts` evaluator-reuse refactor and immutable prior-schema fixture needed to run both current and prior schemas through one evaluator. Current runtime schema loading remains unchanged; duplicate evaluators, new validator dependencies, arbitrary runtime schema input, and negotiation are prohibited.

Every repair changed planning head; all earlier independent review evidence is stale.

## Known fresh-review focus

Independent review must challenge:

- additive-lockstep policy and same-evaluator exact prior-schema proof;
- whether `src/receipt/json.ts` authority is genuinely minimal and preserves current runtime behavior;
- no duplicate evaluator/dependency/runtime schema selection;
- non-unique `ascout_version` treatment;
- package-json exact-version snapshot derivation;
- lockfile sentinel-not-bytes and authority-vs-supplemental failure rules;
- realpath/symlink containment/bounded-memory hashing;
- no second package-manager resolver/discovery mutation;
- privacy/no-execution boundaries;
- T104–T106 task surfaces/order.

## Internal dossier result

`READY_FOR_INDEPENDENT_EXACT_HEAD_PLAN_REVIEW_AFTER_F1_F2_F3_F4_F5_F6_RECONCILIATION`

No implementation authorization is granted here.
