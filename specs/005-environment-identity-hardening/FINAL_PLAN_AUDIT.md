# Specification 005 Final Plan Audit Dossier

**Audit role:** repository-side dossier for independent exact-head review; not independent approval.

## Audit questions

1. Is the measured gap real? — Yes; product receipt lacks run-level environment identity already represented in benchmark context.
2. Is scope minimal? — Yes; M1.1-B only, no function coverage/M2.
3. New execution authority? — No.
4. Source binding/no-green weakened? — No.
5. Compatibility explicit? — Yes; additive lockstep with expected stale strict-schema rejection.
6. False exact revision binding via `ascout_version`? — No; it is only a product-version label and exact repository identities bind proof.
7. Declaration-led manager exact version preserved? — Yes; exact non-null x.y.z comes from discovery's package.json content snapshot; contradiction fails integrity.
8. Package.json re-read creates TOCTOU source? — No; version derivation uses the exact discovery snapshot rather than disk reread.
9. Can lockfile discovery sentinel be mistaken for bytes? — No; planning explicitly records that recognized lockfile map values are empty presence sentinels and prohibits hashing them.
10. Where do lockfile digest bytes come from? — Exact filesystem bytes at the already-authorized repository-relative path under canonical root, with realpath/symlink containment rechecked and bounded-memory hashing.
11. What if lockfile authority source cannot be re-read? — Integrity failure; manager authority cannot be emitted with an unobservable authority source.
12. What if package-json supplemental lockfile cannot be read? — Null supplemental identity, no fallback, no authority change.
13. Second package-manager resolver? — No; discovery remains sole authority.
14. Discovery widening? — No; `src/discovery.ts` excluded; insufficiency => NO_GO/replan.
15. Privacy bounded? — Yes.
16. Task order valid? — Yes; contract → observer → publication.
17. Implementation surfaces bounded? — Yes.
18. CI/review/merge gates explicit? — Yes.

## Findings ledger

### F1 — package-manager / lockfile provenance
`RECONCILED_IN_PLAN`.

### F2 — stale strict receipt-v1 validator compatibility
`RECONCILED_IN_COMPATIBILITY_POLICY`.

### F3 — false exact producer-revision binding via `run.ascout_version`
`RECONCILED_IN_COMPATIBILITY_POLICY_AND_PLAN`.

### F4 — declaration-led manager authority could degrade to `package_manager_version=null`
`RECONCILED_IN_SPEC_PLAN_TASKS`.

### F5 — discovery lockfile sentinel could be hashed as bytes / lockfile authority reread semantics underspecified
`RECONCILED_IN_SPEC_PLAN_TASKS`. `collectDiscoveredProject.files` retains recognized lockfiles as empty-string presence sentinels, not contents. T105 must never hash the sentinel. Package.json version comes from discovery's retained content snapshot. Lockfile digest comes from exact filesystem bytes at the already-authorized path with containment rechecked. Failure to re-read a lockfile authority source is integrity failure; supplemental matching lockfile failure is nullable and never causes fallback.

Every repair changed planning head; all earlier independent review evidence is stale.

## Known fresh-review focus

Independent review must challenge:

- additive-lockstep policy and exact repository-bound compatibility proof;
- non-unique `ascout_version` treatment;
- package-json exact-version snapshot derivation and no disk reread;
- lockfile sentinel-not-bytes rule;
- distinction between authority lockfile read failure (integrity) and supplemental lockfile read failure (null);
- realpath/symlink containment and bounded-memory exact-byte hashing;
- no second resolver/discovery mutation;
- privacy and no-execution boundaries;
- T104–T106 surface/order.

## Internal dossier result

`READY_FOR_INDEPENDENT_EXACT_HEAD_PLAN_REVIEW_AFTER_F1_F2_F3_F4_F5_RECONCILIATION`

No implementation authorization is granted here.
