# Spec 013 Technical Plan — Current-Head Release Readiness

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED / PUBLICATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #297
**Canonical base:** `bc5e1d807a5a116ec3286e3f68907751b67d2814`

## 1. Plan decision

Use a four-stage release chain with no new release subsystem:

1. prepare exact `0.1.0` release metadata while retaining `private: true`;
2. qualify that exact candidate and produce one immutable npm-compatible tarball;
3. record separate publication authorization bound to candidate SHA/tree and tarball SHA-256;
4. create `v0.1.0` Git tag + GitHub Release, attach the exact qualified tarball, then verify publication.

npm registry publication remains outside Spec 013.

## 2. Candidate metadata surface

T124 changes exactly:

- `package.json`: `version` from `0.0.0` to `0.1.0` only;
- `package-lock.json`: top-level `version` and `packages[""] .version` from `0.0.0` to `0.1.0` only.

The historical lockfile root `name: "ascout"` remains unchanged because T087 explicitly left
that dependency-resolution metadata untouched and package identity is proven from the packed
`package.json`. No lock regeneration, dependency resolution, SRI, script, engine, binary,
files allowlist, name, license, or `private` mutation is authorized.
## 3. T124 qualification

T124 receives normal exact-head PR qualification before merge:

- exact-source Self Verification success;
- original-attempt six-lane Project CI success;
- focused package-content contract success;
- exact two-path semantic diff review;
- no unrelated branch delta;
- fresh substantive review and zero unresolved material threads;
- guarded expected-head normal merge and post-merge proof.

T124 does not create a tag, release, or tarball for publication.

## 4. T125 release-candidate qualification

T125 runs from the exact canonical merge commit produced by T124, without source mutation.
A newly materialized clean checkout must record commit/tree, clean status, OS/arch, Git,
Node, and npm versions and then execute the current release obligations.

Required local/candidate gates include exact-lockfile install, typecheck, full tests, build,
current package-content contracts, current self-verification/benchmark obligations, actual
`npm pack --ignore-scripts`, exact tarball file-list/manifest inspection, temporary-consumer
installation, production dependency graph inspection, representative CLI paths, and final
source cleanliness.

The tarball bytes are then frozen by filename, size, and SHA-256. T125 evidence is stored in
repository-native issue/action artifacts, not by committing a post-qualification file onto
the candidate source tree.
## 5. T126 publication authorization

After T125 passes, create a separate durable authorization record bound to:

- exact candidate commit and tree;
- exact tag name `v0.1.0`;
- exact tarball filename, size, and SHA-256;
- exact release title/body intent;
- explicit prohibition on npm publication;
- confirmation that no later source mutation occurred.

Authorization is invalid if any bound identity changes.

## 6. T127 publication and T128 closeout

T127 creates an annotated or lightweight Git tag `v0.1.0` pointing exactly to the qualified
candidate, pushes it normally, creates the GitHub Release from that tag, and uploads the exact
qualified tarball. No rebuild is permitted between qualification and upload.

T128 verifies the live tag target, GitHub Release state, attached asset identity/digest,
release text, candidate ancestry, and absence of npm publication claims. Only then may the
release chain be marked `CLOSED_CANONICAL`.

## 7. Failure discipline

Any product/test/benchmark/package/provenance failure returns to the appropriate planning or
implementation authority. Do not patch product code inside T125, suppress a failing gate,
move/recreate a published tag silently, force-push, rebase shared history, or substitute a
rerun for required original-attempt evidence.

## 8. Supply-chain and security boundary

Spec 013 adds no dependency, external action, service, credential, registry mutation, or new
code ingestion. GitHub publication uses existing repository authority. npm credentials are
not required and MUST NOT be requested or used by this chain.

```text
TECHNICAL_PLAN = GO
TASK_ORDER = T124 -> T125 -> T126 -> T127 -> T128
TARGET_TAG = v0.1.0
NPM_PUBLICATION = FORBIDDEN_IN_SPEC_013
```
