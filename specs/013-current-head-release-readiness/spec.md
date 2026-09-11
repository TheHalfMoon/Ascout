# Specification 013 — Current-Head Release Readiness and Publication Boundary

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED / PUBLICATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #297
**Canonical base:** `bc5e1d807a5a116ec3286e3f68907751b67d2814`

## 1. Problem

Ascout has historical M1 release-candidate evidence, but that evidence is bound to an older
source state. Current canonical `main` contains hundreds of later commits and material
post-T088 product, evidence, benchmark, and workflow changes.

Current `main` is six-lane Project-CI green, but it is not a current release candidate:

- no current-head T088-equivalent release qualification exists;
- package version is still `0.0.0`;
- `private: true` intentionally blocks npm publication;
- no GitHub tag or Release exists;
- authenticated control of the `@thehalfmoon` npm scope is not proven canonically.

## 2. Goal

Create the smallest source-bound path from current canonical product truth to an initial
GitHub release decision without conflating GitHub release publication with npm registry
publication.

The planned first GitHub release version is `0.1.0`, consistent with the Constitution's
v0.x trusted-local scope and the absence of any prior release tag.

## 3. Non-goals

Spec 013 does not authorize or design:

- npm registry publication;
- npm account, organization, token, billing, or scope changes;
- a `1.0.0` stability claim;
- new product behavior or command surface;
- new runtime dependencies, services, actions, daemons, telemetry, databases, or plugins;
- automatic versioning/release automation;
- historical evidence rewriting or replacement;
- treating ordinary Project CI as a substitute for release-candidate qualification.

## 4. Release channel decision

The bounded Spec 013 release channel is **GitHub Release with an exact-candidate package
tarball asset**. The package remains `private: true`; the flag is a registry-publication
safety barrier, not a prohibition on `npm pack` or local tarball installation.

npm registry publication is explicitly deferred to a separate future authority chain after
authenticated npm scope-control evidence exists. Spec 013 MUST NOT remove `private: true`
or execute `npm publish`.

## 5. Functional requirements

### FR-013-01 — Exact release identity

The release candidate MUST use version `0.1.0`. `package.json` and the root package entry
in `package-lock.json` MUST agree on that version. Package name remains exactly
`@thehalfmoon/ascout`; binary name remains exactly `ascout`.

### FR-013-02 — Registry publication barrier

`package.json.private` MUST remain `true` throughout Spec 013. Any attempt to remove it,
run `npm publish`, or claim npm availability is out of scope and MUST stop for a separate
planning/authorization chain.

### FR-013-03 — Exact-source release candidate

Release qualification MUST bind to one exact commit and tree after the version-only
metadata mutation. Historical T088 qualification or ordinary CI on another commit MUST
NOT be transferred to the candidate.

### FR-013-04 — Clean-checkout qualification

Qualification MUST start from a newly materialized clean checkout of the exact candidate
and record OS/architecture, Git, Node, npm, exact commit/tree, and clean initial status.
### FR-013-05 — Current six-lane platform proof

The exact candidate MUST receive original-attempt Project CI success on Ubuntu 24.04,
macOS 14, and Windows Server 2025 with Node 22 and Node 24. Skipped required lanes,
rerun-to-green substitution, or evidence from another head is insufficient.

### FR-013-06 — Product and package gates

The exact candidate MUST pass, without weakening gates:

- exact lockfile install with scripts disabled where the canonical workflow requires it;
- typecheck, full tests, and build;
- focused native Windows process-control and cross-platform Git/receipt/package contracts;
- actual `npm pack` creation and content-policy inspection;
- installation of that exact tarball into a separate temporary consumer;
- CLI startup/usage plus representative `init`, `doctor`, `check`, JSON, and agent paths;
- final tracked/included source cleanliness.

### FR-013-07 — Current benchmark/evidence proof

Release qualification MUST consume or reproduce the current canonical benchmark and
self-verification obligations required by current `main`. Historical result files stay
immutable. Any current replay divergence requiring reinterpretation MUST stop the release
chain for reconciliation; it MUST NOT overwrite historical evidence.

### FR-013-08 — Provenance and distribution truth

The candidate MUST preserve the exact current dependency/provenance boundary and confirm
that the release tarball contains only the authorized package surface. A new dependency,
license obligation, bundled third-party surface, or unresolved current advisory discovered
by release qualification blocks the candidate pending separate reconciliation.

### FR-013-09 — Release artifact identity

The release asset MUST be generated from the exact qualified commit, its SHA-256 recorded,
and its package manifest verified as name `@thehalfmoon/ascout`, version `0.1.0`,
`private: true`, and binary mapping `ascout -> ./dist/cli.js`.
### FR-013-10 — Publication source immutability

The `v0.1.0` tag MUST point to the exact qualified commit. GitHub Release creation MUST use
that tag and MUST NOT introduce or silently rebuild a different source/package artifact.

### FR-013-11 — Publication authority

Qualification success does not itself authorize publication. Tag creation, GitHub Release
creation, and asset upload require a separate durable post-qualification publication
authorization bound to the exact candidate commit and artifact digest.

### FR-013-12 — Post-release verification

After publication, canonical evidence MUST verify tag target, release state, attached asset
digest, downloadable artifact/package identity, repository main relationship, and absence
of npm publication claims. A mismatch prevents release closeout.

## 6. Success criteria

Spec 013 planning succeeds only if it produces a bounded task chain in which:

1. release metadata mutation is minimal and package-publication-safe;
2. current-head qualification occurs after that mutation;
3. release artifact identity is cryptographically bound to the qualified candidate;
4. publication remains a separate authority event;
5. post-publication verification is explicit;
6. npm publication remains outside this spec unless a future canonical amendment with
   authenticated ownership evidence explicitly brings it in.

## 7. Constitutional alignment

- **Evidence before claims:** release readiness is an exact-candidate evidence claim.
- **No green by omission:** missing platform, benchmark, package, or provenance evidence blocks qualification.
- **Source-bound truth:** historical T088 evidence is not transferred across source states.
- **Explicit authority:** release publication is gated separately from qualification.
- **Native capability first:** use Git, npm pack/install, existing CI, and GitHub Release primitives.
- **Minimal core:** no new runtime subsystem is introduced.
- **Provenance/licensing:** current distribution surface is reverified before publication.

```text
SPEC_013_PLANNING_DISPOSITION = GO
TARGET_GITHUB_RELEASE = v0.1.0
NPM_PUBLICATION = OUT_OF_SCOPE
IMPLEMENTATION_AUTHORITY = NO
PUBLICATION_AUTHORITY = NO
```
