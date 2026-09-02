# Specification 005 Plan Ponytail / YAGNI Review

## Decision

`PASS_AFTER_F8_RECONCILIATION`

The technical plan remains within the reduced specification boundary.

## Required simplifications

1. One new module at most for environment observation; do not create provider/adaptor/plugin abstractions.
2. Do not create a generalized digest service; use local Node crypto/file primitives.
3. Do not create a new package-manager resolver; consume existing discovery truth only.
4. Do not add process execution for version discovery.
5. Do not add a generic host fingerprint or machine identity.
6. Do not add new CLI flags, configuration keys, policy settings, or persistence layers.
7. Keep environment metadata non-authoritative for verification completeness except integrity failures in constructing the claimed object.
8. Keep F8 object-binding logic local to `src/environment.ts`: one contained-target identity, one descriptor, bounded descriptor reads, stability/post-read checks. Do not generalize it into a sandbox, watcher, capability layer, or reusable safe-file framework.
9. Prefer one bounded integration task after model/schema/observer tasks rather than splitting by renderer.

## Complexity violations

None justified or accepted after F8 reconciliation.

## Result

Proceed to task decomposition only after fresh exact-head independent review of the repaired planning package.
