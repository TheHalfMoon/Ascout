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
   - No: environment metadata is additive current-run context and cannot substitute for verification evidence.
5. Is receipt-v1 compatibility now explicit rather than assumed?
   - Yes: `COMPATIBILITY_POLICY.md` defines `RECEIPT_V1_ADDITIVE_LOCKSTEP`. New validators accept old/new receipts; the exact prior strict schema is expected to reject environment-bearing receipts and must be tested as unsupported version skew. Same-revision supported consumers cannot pin stale schemas.
6. Does it create a second package-manager resolver?
   - No: `discovery.packageManager` is the sole manager-authority decision. The observer may derive version only from the exact already-authoritative package.json source and may not choose another manager.
7. Can lockfile evidence alter manager authority?
   - No. Lockfile identity is supplemental only. Lockfile-derived authority uses its exact discovery source; package-json-derived authority may inspect only the matching fixed root lockfile after the manager is already resolved.
8. Is discovery itself being widened?
   - No. `src/discovery.ts` is outside the expected implementation surface; insufficiency requires `NO_GO` and replanning.
9. Is privacy bounded?
   - Yes: no raw absolute paths, hostname, username, machine ID, network identity, environment inventory, credentials, or secrets.
10. Is task ordering dependency-valid?
   - Yes: contract/compatibility proof → observer → publication.
11. Are implementation surfaces bounded?
   - Yes: expected `src/environment.ts`, `src/check.ts`, `src/receipt/model.ts`, receipt-v1 schema, and focused tests/current-consumer proof only.
12. Are CI/review/merge gates explicit?
   - Yes: exact-head six-lane CI, independent review, zero unresolved material threads, guarded expected-head merge, post-merge verification.

## Reviewer-findings ledger

### F1 — package-manager / lockfile provenance

`RECONCILED_IN_PLAN`. Manager authority is discovery-only; package version and lockfile rules are derivations/supplemental evidence with explicit fail-closed boundaries.

### F2 — stale strict receipt-v1 validator compatibility

`RECONCILED_IN_COMPATIBILITY_POLICY`. The plan no longer claims forward compatibility. It defines supported lockstep pairings and requires the exact prior schema rejection case as proof.

Because these repairs changed the planning head, a fresh independent review of the complete repaired diff is mandatory before merge.

## Known fresh-review focus

Independent review must challenge:

- whether the additive-lockstep policy is sufficiently explicit and bounded for the current private/unreleased project;
- whether `run.ascout_version` is an adequate producer-revision binding without new schema negotiation;
- whether the compatibility test matrix proves both supported and unsupported pairings honestly;
- whether recovering package-manager version from the exact discovery-authoritative package.json is genuinely derivation rather than a second resolver;
- whether same-manager consistency failure is correctly classified as integrity failure rather than fallback selection;
- whether lockfile evidence is strictly supplemental and cannot override package-manager authority;
- whether excluding `src/discovery.ts` is viable and insufficiency is explicitly fail-closed to planning;
- whether any proposed field leaks sensitive host identity;
- whether T104–T106 surfaces are narrow enough.

## Internal dossier result

`READY_FOR_INDEPENDENT_EXACT_HEAD_PLAN_REVIEW_AFTER_ALL_KNOWN_RECONCILIATIONS`

No implementation authorization is granted here.