# Changelog

Ascout follows [Semantic Versioning](https://semver.org) for 0.x releases: a minor version may
break compatibility, and each breaking change is listed under **Breaking**.

## Unreleased

- `check` with Jest: a narrowed Jest pass that selects no test (for example, when only a release
  script changed) now widens to one full pass, instead of exiting 2 with an integrity error. The
  narrowed pass runs with `--passWithNoTests`; the full pass never does, so a project with no test
  at all still fails. This fixes the known limitation in the v0.3.0 release notes.
- `check`: when a narrowed pass selects no test and no full pass is called for (for example, only a
  `.d.ts` file changed), the task stays ERROR, and its reason now says that, instead of claiming the
  runner left no evidence.
- `pr-publish`: `ASCOUT_PUBLISH_MODE=app` requires GitHub App mode, so missing App secrets fail
  instead of falling back to the workflow token; `token` requires the workflow token and no App
  secrets. The App-mode template sets `app`, and the workflow lint requires it wherever the App
  secrets are passed. Unset keeps the previous behaviour.
- `pr-evidence --pr-head` accepts a 64-hex commit ID, so the collect workflow works in SHA-256
  repositories; the bundle validator and the publisher already accepted one.
- `ascout --help` (also `-h`, `help`) prints usage on stdout, and `ascout --version` prints the
  version; both exit 0, and only as the sole argument.
- `init` refuses a repository subdirectory (exit 2), where `check` would never read the config,
  and says what it changed instead of always claiming it created the config.
- Installing Ascout no longer downloads `playwright` and `playwright-core`: no shipped entry point
  loads them, so `playwright` is now a development dependency. It returns when a browser engine ships.
- Fingerprinting the working tree hashes every touched file in one `git hash-object` process per
  observation instead of one per file, keeping the per-file time budget (salvaged from #614).
- `init` refuses to run inside a `.git` directory, and updates `.gitignore` without reading or
  writing through a link swapped in after its check (descriptor read with exact file identity, then
  write and rename).
- Delegated review (E10d): `ascout review --export-task <path>` writes the review task for your own AI
  agent, and `ascout review --ingest <findings.json>` checks the findings it returns against the current
  source. No network call; findings are advisory, and the model named in the file is asserted, not
  verified.

## 0.3.0 (2026-11-13)

Released on GitHub only, not on npm: https://github.com/TheHalfMoon/Ascout/releases/tag/v0.3.0.
Changes since `v0.2.0`:

### Breaking: local AI review (`--local-model`)

- **Config location.** `review-provider.json` is now found from the operating-system account only.
  `HOME`, `XDG_CONFIG_HOME`, `APPDATA`, and `ASCOUT_CONFIG_HOME` no longer move it. Windows uses
  `AppData\Roaming\ascout` under the home folder; elsewhere it is `~/.config/ascout`. A config kept
  somewhere else must be moved there.
- **Endpoint.** The endpoint must name an explicit, nonzero port, for example
  `http://127.0.0.1:11434`.
- **Ownership (POSIX).** A config owned by another account, or one that is writable by others, or
  whose folder is, is refused.
- **What isn't sent.** Untracked files and secret-named files are no longer sent to the model, so
  they stay unreviewed.

### Changes

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
- GitHub App mode for the PR check (C1, #728 and C1b). `pr-publish` can post the Ascout check as
  your own GitHub App, so a ruleset can require it from that App alone. It ships with a
  dependency-free entry point, `dist/github/publish-cli.js`, a hardened workflow template, and a
  setup guide. It is not yet proven live.
- MCP (E11a): two read-only tools. `ascout_policy` reports the team policy in the working tree.
  `ascout_last_check` reports what the newest completed check run recorded, and whether its
  recorded source state equals the working tree. Both have assurance `NONE`.
- `check`: a narrowed Vitest pass that selects no test (for example, when only a release script
  changed) now widens to one full pass, instead of reporting an integrity error (#734, #735).

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
