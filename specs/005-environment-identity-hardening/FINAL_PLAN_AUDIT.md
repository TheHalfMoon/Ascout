# Specification 005 Final Plan Audit Dossier

**Audit role:** repository-side dossier for independent exact-head review; not independent approval.

## Audit questions

1. Measured gap real/minimal? — Yes; M1.1-B environment evidence only.
2. New execution authority? — No.
3. Compatibility honest? — Yes; additive lockstep with exact prior strict-schema rejection through the same canonical evaluator.
4. Prior evaluator route minimal? — Yes; T104-only `src/receipt/json.ts` reuse, current runtime loading unchanged, no second validator/dependency/negotiation.
5. `ascout_version` falsely treated as exact revision? — No.
6. Package-json exact version/source snapshot preserved? — Yes.
7. Lockfile sentinel mistaken for bytes? — No; exact contained filesystem bytes only.
8. Authority vs supplemental lockfile failures separated? — Yes.
9. Discovery widened? — No.
10. Environment integrity failure optional? — No; authority contradiction/unsafe authority reread is typed integrity failure.
11. Can that failure truthfully use canonical exit semantics? — Yes after F7: observer runs before project tasks, no receipt is emitted on failure, and T106 narrowly maps only the typed failure in `src/cli.ts` to existing redacted diagnostic + exit `2`.
12. Does F7 redesign generic CLI errors or invent receipt fields/tasks? — No; both are prohibited.
13. Task order/surfaces bounded? — Yes.
14. CI/review/merge gates explicit? — Yes.

## Findings ledger

### F1 — package-manager / lockfile provenance
`RECONCILED_IN_PLAN`.

### F2 — stale strict receipt-v1 validator compatibility
`RECONCILED_IN_COMPATIBILITY_POLICY`.

### F3 — false exact producer-revision binding via `run.ascout_version`
`RECONCILED_IN_COMPATIBILITY_POLICY_AND_PLAN`.

### F4 — declaration-led manager authority could degrade to null version
`RECONCILED_IN_SPEC_PLAN_TASKS`.

### F5 — discovery lockfile sentinel/byte-source and authority reread semantics
`RECONCILED_IN_SPEC_PLAN_TASKS`.

### F6 — prior strict-schema proof lacked an authorized route through the canonical evaluator
`RECONCILED_IN_COMPATIBILITY_POLICY_PLAN_TASKS`.

### F7 — typed environment integrity failure would otherwise fall through live generic CLI exception handling as exit `1`, conflicting with canonical internal/integrity exit `2`
`RECONCILED_IN_SPEC_PLAN_TASKS`. T105 owns the typed error. T106 observes before project tasks and narrowly updates `src/cli.ts` to map only that typed failure to redacted diagnostic + exit `2`; no receipt/synthetic task/error field is emitted and generic unexpected-error handling is unchanged.

Every repair changed planning head; all earlier CI/review evidence is stale.

## Known fresh-review focus

Independent review must challenge:

- additive-lockstep and same-evaluator exact prior-schema proof;
- narrowness of T104 `json.ts` authority;
- discovery snapshot/lockfile byte provenance and containment;
- authority vs supplemental failure semantics;
- whether typed environment integrity failure is invoked pre-task and correctly maps to no receipt + exit `2` without generic CLI redesign;
- privacy/no-execution boundaries;
- exact T104/T105/T106 surfaces and ordering.

## Internal dossier result

`READY_FOR_INDEPENDENT_EXACT_HEAD_PLAN_REVIEW_AFTER_F1_F2_F3_F4_F5_F6_F7_RECONCILIATION`

No implementation authorization is granted here.
