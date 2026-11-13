# E9 Preparation: Packaging, Signing Plan, Install, and Qualification

**Status:** preparation, superseded by the v0.2.0 (2026-11-10) and v0.3.0 (2026-11-13) GitHub releases; see `STATE.md`. **Nothing here publishes, tags, releases, or signs.** When this was written, the only existing release was GitHub release `v0.1.0` (2026-09-12); nothing is on npm. E9 is blocked on
founder decision FD-6 and the owner's release authority. `package.json` keeps `private: true`, and
this packet doesn't change it.

## What this packet adds

`tests/package-install-qualification.test.ts` runs on every OS in Project CI. It:

1. builds `dist` into a scratch package and runs `npm pack`;
2. installs that tarball into a scratch consumer project with `npm install --offline`. Every
   runtime dependency resolves through `overrides` to the checkout's own `node_modules`, so no
   registry is contacted, and a missing dependency fails the test;
3. runs the CLI through npm's own bin shim: `ascout.cmd` on Windows, `ascout` elsewhere. It checks
   `security --format json` outside a repository (exit 4, with a report) and no arguments (usage,
   exit 2);
4. runs `npm uninstall` and checks that the package and its shim are gone.

`tests/npm-package-content.test.ts` already pins the package surface: only `dist`, plus the
metadata npm requires.

## Release qualification matrix (to be satisfied before any release)

| Requirement | Today |
|---|---|
| Zero false PASS: no command reports success when work did not run | Held by the A07 exits and tests; re-check on the release head |
| Real-engine qualification on each claimed OS (Gitleaks: linux-x64, darwin-arm64, win-x64) | Real Engines CI, on every PR |
| Install, run, and uninstall from the packed tarball on each OS, Node 22 and 24 | **This packet**, in Project CI |
| Global install (`npm install -g`) on each OS | Not tested. It needs a registry or a populated cache; planned for the release dry run |
| Containment claim | T0 only (E7-CONTAIN part one). The release notes must say "trusted-local only" |
| Third-party notices for every shipped or invoked component | E3; re-check on the release head |
| Independent human security review of the release head | PENDING |
| Human R1 of the release PR | PENDING |
| FD-6 disposition and owner release authority | PENDING |

## Signing and provenance plan (not executed)

- **Checksums.** Publish the SHA-256 of the exact tarball beside it. The digest is computed in CI
  from the tarball that gets published, never rebuilt.
- **npm provenance.** If the founder chooses npm, publish with `npm publish --provenance` from a
  GitHub Actions workflow. That ties the package to the exact commit and workflow through Sigstore.
  This uses a GitHub-hosted runner and the public npm registry. Both cost nothing, but both are
  hosted services, so they need FD-6 explicitly.
- **GitHub release artifact.** Alternatively or as well, attach the tarball and its checksum to a
  GitHub release, with a build-provenance attestation.
- **No private keys in the repository**, and none on a developer machine for signing. Signing
  identity comes from CI's OIDC token only.
- **Scope ownership.** Prove ownership of the `@thehalfmoon` npm scope before the first publish.

## Install and uninstall, as users will see them

- **Install:** `npm install -g @thehalfmoon/ascout`, after a release. Until then, use a source
  checkout, as the README describes.
- **Uninstall:** `npm uninstall -g @thehalfmoon/ascout`. Ascout leaves these behind:
  - run directories under each repository's `.ascout/`, which `init` and `check` created there;
  - the review-provider config, if the founder wrote one, in the user config directory.

  The release notes must list both, with how to remove them.

## Decisions for the founder (FD-6)

1. The channel: npm, GitHub release artifacts, or both.
2. Whether hosted CI may sign, through npm provenance or GitHub attestations.
3. The supported platform list, which must match the Real Engines qualification.
4. The version and changelog policy for the first release.

None of these is decided here.
