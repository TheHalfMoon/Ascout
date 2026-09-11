# Specification 013 Tasks — Current-Head Release Readiness

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED / PUBLICATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #297

## Global rules

For every task:

1. re-read canonical `main`, Constitution, Master Plan, Spec 013 authority, and live GitHub state;
2. use exactly one task-scoped branch/PR for source or metadata commits; T126 repository-native authorization and T127 Git tag/Release mutations are explicit no-source exceptions governed by their task-specific identity and proof rules;
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
- fresh independent substantive exact-head review with zero unresolved material threads;
- immediate pre-merge revalidation of canonical `main`, unique merge base, repository rulesets,
  observable branch protection, and absence of a conflicting release chain;
- unchanged expected head followed by a guarded normal merge;
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
- run a read-only `npm audit --omit=dev --json` against the configured npm advisory service; record
  the npm version, registry/advisory endpoint, UTC execution time, raw report SHA-256, and result;
  any unresolved production advisory is `T125 = NO_GO`;
- exercise representative CLI startup/usage, `init`, `doctor`, `check`, JSON, and agent paths;
- verify final candidate source cleanliness;
- record tarball filename, byte size, and SHA-256.

Any failed required gate means `T125 = NO_GO` until separately repaired and requalified.
## T126 — Record publication authorization

**Depends on:** T125 `QUALIFIED` with immutable candidate and tarball identities.

Create a durable repository-native authorization record as one unedited top-level comment on a
dedicated T126 GitHub issue. The authorization principal is the repository owner/founder GitHub
account `TheHalfMoon`. The record is effective only when GitHub reports that exact account as
the authenticated author and the comment remains unedited (`updated_at == created_at`). Record:

- issue number, comment database ID, comment URL, created/updated timestamps, and SHA-256 of the UTF-8 comment body;
- exact candidate commit/tree;
- tag `v0.1.0`;
- tarball filename/size/SHA-256;
- exact GitHub Release title/body intent;
- explicit permission to create the tag, GitHub Release, and upload that tarball only;
- explicit prohibition on npm publication and source mutation.

Any edit, deletion, author mismatch, or bound-identity change makes the record ineffective. A later
authorization may supersede it only through a new unedited comment by `TheHalfMoon` that names
the prior comment ID in a `SUPERSEDES` field. Candidate or tarball changes require fresh T125
qualification before a replacement authorization can become effective.

No tag or release may be created before this record is effective.

## T127 — Publish GitHub v0.1.0

**Depends on:** T126 `EFFECTIVE` and unchanged bound identities.

- refetch the T126 authorization comment and verify author `TheHalfMoon`, unedited timestamps,
  comment ID/URL/body SHA-256, supersession state, and every bound candidate/artifact/release field;
- require live `refs/heads/main` to equal the exact T125-qualified candidate before publication;
- create `v0.1.0` pointing exactly to that candidate;
- push the tag normally without moving/reusing an existing ref;
- create the GitHub Release from that exact tag;
- upload the exact already-qualified tarball bytes;
- do not rebuild, run `npm publish`, change package metadata, or mutate source.

A collision with an existing tag/release, changed candidate, or artifact mismatch is a hard stop.

## T128 — Post-release verification and closeout

**Depends on:** T127 publication action completed.

Verify live GitHub truth for tag target, release state, release text, candidate ancestry, and the
exact repository relationship: `refs/heads/main` MUST still equal the T125-qualified candidate.
Download the attached release asset, compare its filename, byte size, and SHA-256 with the T125/T126
record, and inspect the downloaded tarball manifest/file surface for exact package name, version,
`private`, `bin`, and `files` identity. Verify that no npm-publication claim exists. Any asset,
package, tag, authorization, or `main` mismatch blocks closeout. Record exact proof in the
execution ledger and close Spec 013 only when every identity matches.
