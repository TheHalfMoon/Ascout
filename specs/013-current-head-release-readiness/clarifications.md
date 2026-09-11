# Specification 013 Clarifications — Current-Head Release Readiness

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED / PUBLICATION_NOT_AUTHORIZED`

## C1 — Why is historical T088 insufficient?

T088 evidence is bound to candidate `982fb95c...`. Current `main` is 571 commits later with
material product/evidence/workflow changes. Source-bound truth forbids transferring release
qualification from one tree to another.

## C2 — Why `0.1.0`?

There is no existing release tag, the public product constraints still explicitly describe
v0.x trusted-local scope, and the repository does not claim stable `1.0.0` maturity.
`0.1.0` is therefore the smallest honest initial release identity. A different version
requires a planning amendment before release-metadata implementation.

## C3 — Why keep `private: true`?

The flag is the existing fail-closed npm publication barrier. Authenticated ownership of the
`@thehalfmoon` npm scope is not proven. Keeping the flag preserves the existing safety
boundary while still allowing `npm pack` and local installation from an exact tarball.

## C4 — Why permit a GitHub Release without npm publication?

GitHub release publication and npm registry publication are different authority surfaces.
A GitHub Release can publish a source-bound installable tarball without claiming registry
ownership. This avoids converting an external npm-account proof gap into a blocker for all
release progress.

## C5 — What is the release artifact?

One exact `npm pack` tarball generated from the qualified `v0.1.0` candidate. Its SHA-256,
package manifest, file list, and temporary-consumer installation result are part of the
release qualification record. Rebuilding a different tarball after qualification is not
allowed without requalification.
## C6 — Why mutate version before qualification?

Qualification must prove the bytes that will actually be released. Qualifying `0.0.0` and
then changing the package to `0.1.0` would invalidate source identity and package evidence.
The version-only metadata mutation therefore precedes final release qualification.

## C7 — Does current six-lane Project CI already prove release readiness?

No. It proves the current source passes the project CI matrix. Release qualification also
needs exact release metadata, actual pack/archive proof, separate-consumer installation,
release artifact digest, current benchmark/self-verification obligations, and release-specific
source-cleanliness/provenance gates.

## C8 — May Spec 013 rewrite benchmark results if current replay differs?

No. Historical benchmark evidence is immutable. A legitimate current divergence must be
reported and reconciled under the governing benchmark policy before release qualification
can continue.

## C9 — Does successful qualification authorize the tag and GitHub Release?

No. Qualification establishes eligibility only. Publication requires a separate durable
authorization bound to the exact qualified commit and tarball digest. This prevents a
successful test run from silently becoming release authority.

## C10 — What if `@thehalfmoon` npm ownership becomes provable during Spec 013?

Record the evidence but do not expand this spec. npm publication changes the trust and
account surface and requires removing the current `private: true` barrier. Open a separate
canonical authority chain rather than mixing registry publication into the GitHub release.

## C11 — What if release qualification exposes a product defect?

Stop. Do not weaken the gate, patch product code inside the release task, or rerun-to-green
where original-attempt evidence matters. The defect must return to the appropriate planning
and implementation authority sequence; after repair, release qualification starts again on
the new exact candidate.

## C12 — What if the tag/release asset does not match the qualified candidate?

The release is not closed canonically. Correct through normal forward-only GitHub history
and a separately reviewed recovery plan; never move or recreate a published immutable
release identity silently.
