# Changelog

Ascout follows [Semantic Versioning](https://semver.org) for 0.x releases: a minor version may
break compatibility, and each breaking change is listed under **Breaking**.

## Unreleased

On `main`, not in any release.

- GitHub PR integration, run by the customer on the customer's own runners: `ascout pr-evidence`,
  `ascout pr-publish`, and the collect and publish workflows (#716–#718). See
  `docs/GITHUB_INTEGRATION.md`.
- Per-repository team policy for the PR check, `.github/ascout-policy.json` (#719).
- The security NOT_RUN reason no longer shows an internal phase label (#720).
- Local AI review (E10a, #723): a provider interface. Also hardening: the config location comes from
  the OS account, proxy settings are ignored, untracked and secret-named files are never sent, the
  model's reply is redacted, and an explicit port is required.
- Local AI review (E10b, #724): `"provider": "openai-compatible"` for loopback servers that speak the
  OpenAI-compatible chat API.

## 0.2.0 (2026-11-10)

Published as a GitHub Release on 2026-11-10 (tag `v0.2.0` at `0741873`) with a build-provenance
attestation. Not on npm. The founder waived the independent human security review and human R1 for this release; neither
was performed. The release was checked by independent AI security reviews, audits, and CI instead.

Changes on `main` since `v0.1.0` (55688b5, GitHub release 2026-09-12).

### Breaking: exit codes changed since 0.1.0

| Command | 0.1.0 exit when nothing ran | 0.2.0 exit |
|---|---|---|
| `ascout review` | `0` | `4` (not run) |
| `ascout test` | `0` | `4`, or the `check` result for profiles that run it |
| `ascout security` | `1` | `4`; findings exit `1` |
| Most operational errors | `1` | `2` |
| Source changed during the run | — | `3` |

`0` now means the applicable work completed, and `4` is never a pass. Check scripts that test only for
`0` or non-zero.

- **Truthful exits (Amendment A07).** `review`, `test`, and `security` exit `4` when required work
  did not run. Before, `review` and `test` exited `0` and `security` exited `1` without running
  anything. Most operational errors exit `2`, and a source change during an operation exits `3`.
  Scripts that relied on the old codes must change. See README "Exit semantics".
- **Hostile repositories are refused.** Ascout exits `2` on a partial clone, a repository with a
  Git submodule, or a path with a Git `filter` attribute (including `git-lfs`).

### Added

- `ascout test` runs `check` for the standard, deep, and release profiles. Deep and release
  report the engines that don't run yet.
- `ascout security` runs Gitleaks 8.30.1 when you opt in with `ASCOUT_GITLEAKS_PATH`. Each
  binary is digest-pinned for linux-x64, darwin-arm64, and win-x64. A scan with no findings
  exits `4`, because Gitleaks can't show its coverage.
- `ascout review --local-model`: advisory review by a model you run in Ollama on loopback,
  authorized in your own config directory. It is never human review.
- `ascout doctor --format json`.
- `ascout mcp`: a local stdio MCP server with four read-only tools. It opens no socket and
  takes no options.
- Every `ascout test` report states the containment: T0, trusted-local, with no filesystem or
  network isolation.

### Security

- Git runs with hostile configuration neutralized: no fsmonitor, hooks, external diff, pager,
  or repository-chosen helpers.
- A bounded execution broker for pinned engines. It provides an empty environment, output and
  time caps, source binding, and process-tree teardown.
- The fixes from the 2026-11-08 security review (#667–#696).
- Ctrl-C stops a running task's process tree.
- Fixes from independent AI security reviews of this release candidate (separate contexts; not a
  human review, which the founder waived):
  - a local-model finding counts only on a changed line;
  - the model reporting nothing exits `4`, not `0`;
  - the data fence is escaped in any case;
  - an MCP call can't overlap a tool that is still stopping, and synchronous tools respect their
    deadline;
  - MCP output respects backpressure, and the result cap applies to the final frame.

### Fixed

- `ascout test` no longer completes when the test task selected no tests, and pytest no
  longer passes on its exit code alone.
- The packed tarball can write receipts, because the receipt schema is embedded.

### Known limits

- Supported: Linux x64, macOS arm64, and Windows x64, on Node 22 and 24. Other platforms are
  unsupported.
- `check` receipts still record `ascout_version: "0.1.0-m1"`. Receipt v1.0 is byte-frozen, so the
  receipt producer's version string doesn't follow the package version.
- Trusted-local only: Ascout runs your repository's own tools with your rights. Do not run it
  on code you don't trust.
- `test --profile deep` and `release` exit `4`, because mutation, fuzz, and browser engines
  don't run yet.
- Runtime dependencies other than `cross-spawn` and `playwright` resolve to their newest compatible
  versions at install time; no shrinkwrap ships. Install with `--ignore-scripts` to keep any
  dependency's install scripts from running.
- Uninstalling leaves each repository's `.ascout/` and any review-provider config in your user
  config directory.

## 0.1.0 (GitHub release, 2026-09-12)

M1 changed-code verification receipts, plus nested Jest and Vitest configuration fidelity for a
single package (M2). The release asset is `thehalfmoon-ascout-0.1.0.tgz`, SHA-256
`0d2e6dd35cd1661c57a4765de9a732b4a8339f98072485eef2bf1c3295c17cd5`. It was not published to npm.
