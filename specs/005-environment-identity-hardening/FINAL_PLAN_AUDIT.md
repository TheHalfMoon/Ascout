# Specification 005 Final Plan Audit Dossier

**Audit role:** repository-side dossier for independent exact-head review; not independent approval.

## Audit questions

1. Measured gap real/minimal? — Yes; M1.1-B environment evidence only.
2. New execution authority? — No.
3. Compatibility honest? — Yes; additive lockstep with exact prior strict-schema rejection through the same canonical evaluator.
4. Prior evaluator route minimal? — Yes; T104-only `src/receipt/json.ts` reuse, current runtime loading unchanged, no second validator/dependency/negotiation.
5. `ascout_version` falsely treated as exact revision? — No.
6. Package-json exact version/source snapshot preserved? — Yes.
7. Lockfile sentinel mistaken for bytes? — No.
8. Authority vs supplemental lockfile failures separated? — Yes.
9. Does hashing bind bytes to the object that passed containment? — Yes after F8: contained target identity is captured, a single descriptor must match before bytes are read, hashing stays on that descriptor, pre/post descriptor stability is checked, and post-read path/object identity must still match.
10. Can a swap between realpath and open redirect external bytes? — No qualifying implementation may read bytes until descriptor identity matches the contained target; mismatch fails before read.
11. Can a swap after descriptor binding redirect bytes? — No; descriptor reads remain object-bound, and persistent post-read path mismatch is rejected before digest acceptance.
12. Is cross-platform object identity assumed? — No; all six OS/Node lanes must prove it or T105 stops `NO_GO` with no weaker fallback.
13. Discovery widened? — No.
14. Environment integrity failure optional? — No; authority contradiction/unsafe authority observation is typed integrity failure.
15. Can that failure truthfully use canonical exit semantics? — Yes after F7: observer runs before project tasks, no receipt is emitted on failure, and T106 narrowly maps only the typed failure in `src/cli.ts` to existing redacted diagnostic + exit `2`.
16. Task order/surfaces bounded? — Yes.
17. CI/review/merge gates explicit? — Yes.

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

### F7 — typed environment integrity failure would otherwise inherit generic CLI exit `1` instead of canonical integrity exit `2`
`RECONCILED_IN_SPEC_PLAN_TASKS`.

### F8 — lockfile hashing had a containment-check-to-open race and did not bind read bytes to the checked file object
`RECONCILED_IN_SPEC_PLAN_TASKS`. T105 now requires object identity match before bytes, descriptor-only hashing, descriptor stability, post-read path/object recheck, race tests, and six-lane platform proof; inability to provide reliable object identity is `NO_GO`.

Every repair changed planning head; all earlier CI/review evidence is stale.

## Known fresh-review focus

Independent review must challenge:

- additive-lockstep and same-evaluator exact prior-schema proof;
- narrowness of T104 `json.ts` authority;
- discovery snapshot and package-manager provenance;
- F8 object-binding sequence, especially no bytes before descriptor identity match, descriptor-only hashing, pre/post stability, post-read path identity, and cross-platform `NO_GO` rule;
- authority vs supplemental failure semantics;
- typed environment integrity failure pre-task + no receipt + exit `2` without generic CLI redesign;
- privacy/no-execution/YAGNI boundaries;
- exact T104/T105/T106 surfaces and ordering.

## Internal dossier result

`READY_FOR_INDEPENDENT_EXACT_HEAD_PLAN_REVIEW_AFTER_F1_F2_F3_F4_F5_F6_F7_F8_RECONCILIATION`

No implementation authorization is granted here.
