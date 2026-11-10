# FD-6 Release Decision Packet

**Status:** prepared 2026-11-10 for the founder. **No decision is recorded here**, and nothing has been
published, tagged, or signed. Each section states facts observed on that date, then the options.

## Where things stand

| Fact | Evidence |
|---|---|
| A GitHub release already exists: `v0.1.0`, published 2026-09-12 by `TheHalfMoon` from 55688b5 | `gh release view v0.1.0`; asset `thehalfmoon-ascout-0.1.0.tgz`, SHA-256 `0d2e6dd3…7cd5`, 2 downloads |
| Nothing is on npm under either name | `npm view @thehalfmoon/ascout` and `npm view ascout` both return 404 |
| `main` is 750 commits past `v0.1.0`, including breaking exit-code changes | `git rev-list --count v0.1.0..main`; `CHANGELOG.md` |
| `package.json` is version `0.1.0`, `private: true`, `license: Apache-2.0`, bin `ascout`, with no `repository` field | `package.json` |
| The package builds reproducibly: two independent builds pack to the same SHA-256, with LF-only files | `tests/package-reproducible.test.ts`, in every CI lane |
| The packed tarball installs offline, runs through npm's shim, and uninstalls cleanly on Windows, Linux, and macOS | `tests/package-install-qualification.test.ts` (#704) |
| `main` is unprotected, and private vulnerability reporting is off | `docs/governance/REPOSITORY_SETTINGS_CHECKLIST.md` |

## E9 release gates, and whether each is met

| Gate (E9 spec) | Met? |
|---|---|
| Zero false PASS | Yes, by A07 and its tests. Re-check on the release head. |
| Real-engine qualification on each claimed OS | Yes, for Gitleaks on linux-x64, darwin-arm64, and win-x64 |
| Install, run, and uninstall from the tarball on each OS | Yes |
| Reproducible tarball | Yes, per OS and Node version. Cross-lane digest equality is a release-time step. |
| Notices for shipped and invoked components | Yes (E3). Re-check on the release head. |
| Containment stated honestly | Yes: T0 trusted-local, said in every test report and in the README |
| Independent **human** security review of the release head | **Waived by the founder; not performed** |
| Human R1 of the release PR | **Waived by the founder; not performed** |
| FD-6 disposition and owner release authority | Disposed on 2026-11-10 (see the decision record). Publication still needs the founder's explicit approval. |

## Decisions needed

### 1. Whether to release now, and what version

| Option | Effect |
|---|---|
| **A. Release 0.2.0 as a GitHub release only** *(recommended)* | Same channel as 0.1.0. Users get the current, truthful exits. No npm account or scope proof is needed. |
| B. Release 0.2.0 on GitHub and npm | Wider reach. Needs proof of `@thehalfmoon` scope ownership, `private` removed, and an npm token or provenance setup. |
| C. Don't release yet | `v0.1.0` stays the only release. Its exits are the old, untruthful ones, and the README already describes newer behaviour. |

If you hold (C), consider marking `v0.1.0` superseded in its notes. Its exit codes contradict the
current README.

### 2. Signing and provenance

| Option | Effect |
|---|---|
| **A. A SHA-256 checksum in the release notes, plus a GitHub build-provenance attestation from CI** *(recommended)* | The asset is built and attested by the workflow, never on a laptop. It is free for public repositories. |
| B. Checksum only, built locally (as 0.1.0 was) | Simple. Trust rests on the person who built it. |
| C. npm `--provenance` | Only with npm (1B). |

### 3. Supported platforms

Recommended: claim exactly the qualified triple, **linux-x64, darwin-arm64, and win-x64**, on
Node 22 and 24. Name any other platform "unsupported", not "untested".

### 4. Gates you may choose to waive, or not

The human security review and human R1 of the release head are unmet. The E9 spec makes both
required. They can only be met by a person, or waived by you explicitly in writing. A model
review doesn't satisfy either.

### 5. Repository settings before a release (recommended, not required)

Turn on private vulnerability reporting, so `SECURITY.md` is accurate for release users, and
protect `main`. See the checklist.

## What happens after your decision

For option 1A with 2A, these steps follow, each its own PR with checks:

1. Bump the version to `0.2.0`, and turn the CHANGELOG's "Unreleased" into `0.2.0`.
2. Add a `release` workflow, run manually, that builds on one pinned runner, packs, writes the
   SHA-256, attests provenance, and creates a **draft** GitHub release with the tarball attached.
3. You review the draft and publish it yourself. Publication stays a human action.

For option C, nothing ships. The CHANGELOG keeps its "Unreleased" section.

## Decision record

Founder decisions given in chat on 2026-11-10, in this order:

1. A message waiving both human reviews.
2. A direction keeping both reviews mandatory.
3. **The final decision: "NO HUMAN REVIEW REQUIRED."** The founder explicitly waived the independent
   human security review and human R1 for v0.2.0. The clarification is also posted on PR #712
   (2026-11-10 14:25 UTC).

The final decision governs. **Neither human review was performed.** The waivers below are
recorded as waivers, not as completed reviews.

| Item | Decision | Date | Conditions |
|---|---|---|---|
| Prepare a release candidate | Approved: v0.2.0 | 2026-11-10 | No publication, final tag, npm publication, signing, attestation, or deployment without separate explicit founder authorization |
| Channel | GitHub Releases only | 2026-11-10 | Not npm |
| Checksums | SHA-256 | 2026-11-10 | |
| Provenance | GitHub Actions build-provenance attestation | 2026-11-10 | It signs, so it runs only after separate authorization. The workflow ships with it off. |
| Platforms | Linux x64, macOS arm64, Windows x64; Node 22 and 24 | 2026-11-10 | Based on verified CI evidence |
| Containment | T0 trusted-local limits stay documented | 2026-11-10 | |
| Independent human security review | **WAIVED by the founder. Not performed.** | 2026-11-10 | Replaced by three independent AI security reviews in separate contexts, a dependency audit, a secret scan, a static scan, and full CI. None of these is a human review. |
| Human R1 of the release PR (#712) | **WAIVED by the founder. Not performed.** | 2026-11-10 | No human read the release head. |
| Merge of #712 | Authorized | 2026-11-10 | After every required check passes on the final commit |
| Publication and final `v0.2.0` tag | **Not authorized** | 2026-11-10 | Needs the founder's explicit approval |
| Signing and attestation | **Not authorized** | 2026-11-10 | Needs the founder's explicit approval. Set up the `release-attest` environment with a required reviewer first (settings checklist §7). |
| Accepted residual risk | No shrinkwrap: transitive runtime dependencies float within semver ranges | 2026-11-10 | From the supply-chain AI review (Medium). Shipping a shrinkwrap would change the tarball's tested contents; the release notes recommend `--ignore-scripts`. Revisit for 0.3.0. |
