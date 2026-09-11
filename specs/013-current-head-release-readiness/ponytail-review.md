# Spec 013 Ponytail / YAGNI Review — Specification Reduction

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED / PUBLICATION_NOT_AUTHORIZED`

## Proposed and rejected

### Reject npm publication in Spec 013

Reason: authenticated npm scope ownership is not proven and npm publication would require
removing the existing `private: true` safety barrier. GitHub release progress does not need
that authority surface.

### Reject release automation/workflow creation

Reason: one initial release does not justify a new release subsystem. Existing GitHub,
project CI, self-verification, npm CLI, and repository evidence primitives are sufficient.

### Reject semantic-release / Changesets / release-please

Reason: there is no measured recurring release-management burden. Adding dependencies,
bots, configuration, generated metadata, or lifecycle coupling before repeated need would
violate minimal-core and benchmark/evidence-gated growth principles.

### Reject installer/updater/channel design

Reason: an exact npm-compatible tarball attached to a GitHub Release is enough for this
bounded initial release. Auto-update, binary wrapping, platform installers, and channels
are unrelated new product surfaces.

### Reject SBOM/signing framework expansion

Reason: current provenance and package-content gates already define the release obligation.
Spec 013 may record hashes and existing GitHub commit verification, but it does not invent
a new signing/SBOM subsystem without a measured requirement.
## Retained minimal shape

The minimal justified release-readiness surface is:

1. version-only package metadata change to `0.1.0` while keeping `private: true`;
2. exact-candidate release qualification using existing CI/self-verification/npm/Git primitives;
3. one immutable tarball with recorded SHA-256;
4. separate durable publication authorization bound to that exact candidate and artifact;
5. GitHub tag/Release publication only after qualification and authorization;
6. post-publication identity verification;
7. npm publication deferred to a separate future chain.

No product runtime code, benchmark implementation, workflow, dependency, installer, release bot,
registry integration, or account mutation is required by the measured gap.

```text
PONYTAIL_SPEC_REDUCTION = PASS
SPEC_SURFACE_FROZEN = YES
NPM_PUBLICATION_SURFACE = EXCLUDED
NEW_RUNTIME_SUBSYSTEM = NONE
```
