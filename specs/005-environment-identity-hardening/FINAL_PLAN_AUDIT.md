# Specification 005 Final Plan Audit Dossier

**Audit role:** repository-side dossier for independent exact-head review; this file is not itself independent approval.

## Audit questions

1. Is the measured gap real on canonical `main`?
   - Yes: receipt run identity lacks environment identity while benchmark evidence already models OS/Node/package-manager context.
2. Is this the narrowest roadmap-aligned next capability?
   - Yes: M1.1-B only; function coverage and M2+ remain deferred.
3. Does the plan add execution authority?
   - No: no new process spawn, install, command, hook, or trust grant.
4. Does the plan weaken source binding or no-green-by-omission?
   - No: environment metadata is additive current-run context and cannot substitute for source-bound verification evidence.
5. Is receipt-v1 compatibility explicit rather than assumed?
   - Yes: `COMPATIBILITY_POLICY.md` defines `RECEIPT_V1_ADDITIVE_LOCKSTEP`. New validators accept old/new receipts; the exact prior strict schema is expected to reject environment-bearing receipts and must be tested as unsupported version skew. Same-source/build supported consumers cannot pin stale schemas.
6. Does the plan falsely claim that `run.ascout_version` uniquely identifies producer revision?
   - No. It is explicitly treated only as a product-version label. Exact compatibility proof binds repository/source revisions directly; Spec 005 does not use receipt fields to select or negotiate schema revisions.
7. Does declaration-led package-manager authority preserve the exact version already validated by discovery?
   - Yes. `package_manager_source=package_json` requires the same resolved manager plus the exact non-null `x.y.z` version recovered from the same authoritative root `package.json`. Missing, unreadable, malformed, or manager-mismatched authoritative declaration state is an integrity failure, never a null-version fallback.
8. Does it create a second package-manager resolver?
   - No: `discovery.packageManager` is the sole manager-authority decision. The observer may derive version only from the exact already-authoritative package.json source and may not choose another manager.
9. Can lockfile evidence alter manager authority?
   - No. Lockfile identity is supplemental only. Lockfile-derived authority uses its exact discovery source; package-json-derived authority may inspect only the matching fixed root lockfile after the manager is already resolved.
10. Is discovery itself being widened?
   - No. `src/discovery.ts` is outside the expected implementation surface; insufficiency requires `NO_GO` and replanning.
11. Is privacy bounded?
   - Yes: no raw absolute paths, hostname, username, machine ID, network identity, environment inventory, credentials, or secrets.
12. Is task ordering dependency-valid?
   - Yes: contract/compatibility proof → observer → publication.
13. Are implementation surfaces bounded?
   - Yes: expected `src/environment.ts`, `src/check.ts`, `src/receipt/model.ts`, receipt-v1 schema, and focused tests/current-consumer proof only.
14. Are CI/review/merge gates explicit?
   - Yes: exact-head six-lane CI, independent review, zero unresolved material threads, guarded expected-head merge, post-merge verification.

## Findings ledger

### F1 — package-manager / lockfile provenance

`RECONCILED_IN_PLAN`. Manager authority is discovery-only; package version and lockfile rules are derivations/supplemental evidence with explicit fail-closed boundaries.

### F2 — stale strict receipt-v1 validator compatibility

`RECONCILED_IN_COMPATIBILITY_POLICY`. The plan no longer claims forward compatibility. It defines supported lockstep pairings and requires the exact prior schema rejection case as proof.

### F3 — false exact producer-revision binding via `run.ascout_version`

`RECONCILED_IN_COMPATIBILITY_POLICY_AND_PLAN`. Current product versions may span multiple commits/builds, so `ascout_version` cannot honestly serve as a unique source/schema-revision key. The repaired policy binds compatibility proof to exact repository/source revisions and prohibits schema selection or negotiation from `ascout_version` alone.

### F4 — declaration-led manager authority could degrade to `package_manager_version=null`

`RECONCILED_IN_SPEC_PLAN_TASKS`. Existing discovery resolves root `package.json` authority only after validating exact `manager@x.y.z`. The repaired contract therefore requires `package_manager_source=package_json` to carry that exact non-null version from the same authoritative declaration. Missing/unreadable/malformed declaration state or a manager mismatch is an integrity failure. Only lockfile-derived authority legitimately carries `package_manager_version=null`.

Because these repairs changed the planning head, a fresh independent review of the complete repaired diff is mandatory before merge.

## Known fresh-review focus

Independent review must challenge:

- whether the additive-lockstep policy is sufficiently explicit and bounded for the current unreleased project;
- whether exact old/new repository-bound compatibility proof is sufficient without an in-receipt schema-revision identifier;
- whether explicitly treating `run.ascout_version` as non-unique avoids false compatibility claims without silently adding negotiation;
- whether the compatibility test matrix proves both supported and unsupported pairings honestly;
- whether package-json-derived authority can always reproduce the exact declaration version from the same authoritative file and correctly fails integrity otherwise;
- whether recovering package-manager version from the exact discovery-authoritative package.json is genuinely derivation rather than a second resolver;
- whether lockfile-derived authority correctly retains `version=null` while declaration-led authority never does;
- whether lockfile evidence is strictly supplemental and cannot override package-manager authority;
- whether excluding `src/discovery.ts` is viable and insufficiency is explicitly fail-closed to planning;
- whether any proposed field leaks sensitive host identity;
- whether T104–T106 surfaces are narrow enough.

## Internal dossier result

`READY_FOR_INDEPENDENT_EXACT_HEAD_PLAN_REVIEW_AFTER_F1_F2_F3_F4_RECONCILIATION`

No implementation authorization is granted here.