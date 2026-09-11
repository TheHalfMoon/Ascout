# Specification 013 Tasks — Current-Head Release Readiness

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED / PUBLICATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #297

## Global rules

For every task:

1. re-read canonical `main`, Constitution, Master Plan, Spec 013 authority, and live GitHub state;
2. use exactly one task-scoped branch/PR when repository mutation is required;
3. bind every qualification claim to the exact current head;
4. preserve historical evidence and never overwrite benchmark/release evidence;
5. do not force-push, rebase shared history, bypass governance, or weaken gates;
6. do not begin a successor before predecessor canonical closeout except read-only preparation;
7. stop and return to planning on a material unexpected defect or scope expansion;
8. keep npm publication outside this spec.

## T124 — Prepare v0.1.0 release metadata

**Depends on:** Spec 013 planning merged and separate T124 implementation authorization.

Authorized candidate mutation is exactly:

- `package.json`: version `0.0.0` -> `0.1.0`;
- `package-lock.json`: top-level version and root package version `0.0.0` -> `0.1.0`.

No other semantic manifest/lockfile field may change. `private: true`, package name,
binary, files allowlist, engines, dependencies, scripts, license, lock resolutions, and SRI
remain unchanged.
T124 gates:

- exact two-path diff and branch purity;
- focused package-content/version assertions;
- exact-head Self Verification success;
- original-attempt Project CI six-lane success;
- fresh substantive exact-head review with zero unresolved material threads;
- guarded expected-head normal merge;
- post-merge exact-parent/tree/PR/main proof.

## T125 — Qualify exact release candidate and freeze tarball

**Depends on:** T124 `CLOSED_CANONICAL`.

No repository source mutation is permitted. From a fresh clean checkout of the exact T124
merge commit:

- record commit/tree, clean status, OS/arch, Git, Node, npm;
- run exact-lockfile install, typecheck, full tests, build;
- run current package-content, process-control, receipt/path, self-verification, and benchmark gates;
- produce one actual npm-compatible tarball without publishing;
- verify package name/version/private/bin/files and forbidden-surface exclusions;
- install the exact tarball into a separate temporary consumer;
- record `npm ls --omit=dev --all --json` for the installed production graph;
- exercise representative CLI startup/usage, `init`, `doctor`, `check`, JSON, and agent paths;
- verify final candidate source cleanliness;
- record tarball filename, byte size, and SHA-256.

Any failed required gate means `T125 = NO_GO` until separately repaired and requalified.
## T126 — Record publication authorization

**Depends on:** T125 `QUALIFIED` with immutable candidate and tarball identities.

Create a durable repository-native authorization record containing:

- exact candidate commit/tree;
- tag `v0.1.0`;
- tarball filename/size/SHA-256;
- exact GitHub Release title/body intent;
- explicit permission to create the tag, GitHub Release, and upload that tarball only;
- explicit prohibition on npm publication and source mutation.

No tag or release may be created before this record is effective.

## T127 — Publish GitHub v0.1.0

**Depends on:** T126 `EFFECTIVE` and unchanged bound identities.

- create `v0.1.0` pointing exactly to the T125-qualified commit;
- push the tag normally without moving/reusing an existing ref;
- create the GitHub Release from that exact tag;
- upload the exact already-qualified tarball bytes;
- do not rebuild, run `npm publish`, change package metadata, or mutate source.

A collision with an existing tag/release, changed candidate, or artifact mismatch is a hard stop.

## T128 — Post-release verification and closeout

**Depends on:** T127 publication action completed.

Verify live GitHub truth for tag target, release state, asset identity, release text, candidate
ancestry, repository state, and no npm-publication claim. Record exact proof in the execution
ledger and close Spec 013 only when every identity matches.
