# Changelog

Ascout follows [Semantic Versioning](https://semver.org) for 0.x releases: a minor version may
break compatibility, and each breaking change is listed under **Breaking**.

## Unreleased (draft for a proposed 0.2.0; nothing is released until FD-6 is decided)

Changes on `main` since `v0.1.0` (55688b5, GitHub release 2026-09-12).

### Breaking

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

### Fixed

- `ascout test` no longer completes when the test task selected no tests, and pytest no
  longer passes on its exit code alone.
- The packed tarball can write receipts, because the receipt schema is embedded.

### Known limits

- Trusted-local only: Ascout runs your repository's own tools with your rights. Do not run it
  on code you don't trust.
- `test --profile deep` and `release` exit `4`, because mutation, fuzz, and browser engines
  don't run yet.
- Uninstalling leaves each repository's `.ascout/` and any review-provider config in your user
  config directory.

## 0.1.0 (GitHub release, 2026-09-12)

M1 changed-code verification receipts, plus nested Jest and Vitest configuration fidelity for a
single package (M2). The release asset is `thehalfmoon-ascout-0.1.0.tgz`, SHA-256
`0d2e6dd35cd1661c57a4765de9a732b4a8339f98072485eef2bf1c3295c17cd5`. It was not published to npm.
