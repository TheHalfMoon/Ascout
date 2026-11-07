# E5 First Real Engine: Gitleaks

**Status:** implementation specification for packet E5, part one. It runs the real Gitleaks
8.30.1 through the E4 broker on Linux, macOS, and Windows in CI. No CLI command calls it yet.
Wiring it into `ascout security` is E5 part two, which needs the A07 exit mapping.

## Scope

| File | Change |
|---|---|
| `src/assurance/engines/gitleaks-profile.ts` | New: release manifest, fixed configuration, profile, registry entry |
| `src/assurance/engines/gitleaks-adapter.ts` | New: native JSON report to `ascout-engine/1` envelope |
| `src/assurance/engines/engine-profile-v1.ts` | Modified: `output_format` may be `gitleaks-json-v1`, and `coverage_mode` may be `whole_directory` |
| `src/assurance/engines/execution-broker.ts` | Modified: decodes `gitleaks-json-v1` output with the adapter, and checks Gitleaks' ignore files |
| `.github/workflows/real-engines.yml` | New: acquire, verify, and run Gitleaks on 3 OSes x Node 22/24 |
| `.github/scripts/acquire-gitleaks.mjs` | New: CI-only download, double verification, extraction |
| `tests/assurance-gitleaks-adapter.test.ts` | New: L0 decoder and profile tests |
| `tests/assurance-gitleaks-real.test.ts` | New: L2 tests against the real binary |

The adoption plan listed `security-command.ts` and `THIRD_PARTY_NOTICES.md` for E5. Both move to
part two: nothing here changes a command, and Gitleaks is not bundled or redistributed. The plan
did not list the broker, the profile module, the adapter test, or the acquisition script. Each is
needed for a native format, and the broker change touches only how output is decoded.

## Artifact admission

- **Release:** `v8.30.1`, tag commit `83d9cd684c87d95d656c1458ef04895a7f1cbd8e`, published
  2026-03-21, MIT. It is the latest release and the plan's first candidate.
- **Archives:** each archive's SHA-256 and size come from GitHub's release API and are pinned
  in `GITLEAKS_RELEASE_V1`. Before extraction, CI checks the size, the pinned digest, and the
  line for that archive in the release's own checksum file, whose digest is pinned too.
- **Executable digest:** measured in CI from the verified archive, not pinned in source. A
  qualification names the full profile digest, which includes it.
- **Qualified platforms:** linux-x64, darwin-arm64, and win32-x64, the CI runners. The other
  three archives are pinned but never run, so they stay unqualified.
- **Downloads:** only GitHub's runners download the archive. Nothing is fetched at verification
  time on a user's machine, and nothing is committed.

## Fixed invocation

`gitleaks dir . --config <ascout config> --report-format json --report-path - --exit-code 42
--redact --ignore-gitleaks-allow --gitleaks-ignore-path <config dir> --no-banner --no-color
--log-level error`

Flags were read from the v8.30.1 source. In CI, the acquisition step fails unless every flag in
the profile appears in that binary's `dir --help`.

- **Exit codes:** Gitleaks exits 1 on any error, including a partial scan, so findings use 42.
  The exit map is `0` CLEAN, `42` FINDINGS, `1` and `126` ERROR.
- **Configuration:** the upstream default rules with no changes. The text lives in code and is
  written at run time to a directory Ascout owns, outside the source. A source `.gitleaks.toml`
  and `GITLEAKS_CONFIG` are not used, because `--config` is set and the environment is empty.
- **Redaction:** `--redact` replaces `Secret` and the secret inside `Match`. The adapter refuses
  any finding whose `Secret` is not `REDACTED`, and copies neither field.

## Decoding

The adapter accepts exactly the Gitleaks 8.30.1 finding keys. It refuses unknown keys, missing
keys, a `Fragment` (it would carry a whole file's raw text), a commit (a directory scan has
none), and rule IDs that are not plain identifiers. Paths are rebased to the source root, with
backslashes treated as separators only on Windows. A finding with an unusable path or line keeps
no location.
Descriptions are flattened and cut to 512 characters. Observation IDs hash the index, rule,
path, and lines, so no secret byte contributes to them.

The broker builds the envelope from its own observations: the request, the profile digest, the
source binding, and the run times. The result goes through the same envelope parser as protocol
output, and the broker's checks then apply unchanged.

For a native report, the broker never publishes the stdout digest, and its secret check runs on
the decoded envelope instead of the raw report. `--redact` hides only each finding's own secret,
so a match can hold a second one in raw form. The adapter never copies the match, so findings
survive, and the report's bytes never leave the broker. A secret in a carried field, such as a
description, still withholds the whole result as `SECRET_IN_OUTPUT`.

## What a result can say

- **Coverage is always `PARTIAL`.** Gitleaks does not report which files it scanned. Its run is
  never `EXECUTED`, so a clean scan is `INCOMPLETE`, never a clean result.
- **Findings are real.** A findings run is `INCOMPLETE` with observations, each from a verified
  binary over a bound source.

## Known limits

- **A source `.gitleaksignore` always applies.** Gitleaks loads `<source>/.gitleaksignore` and no
  flag stops it, so a repository can hide its own findings. The broker checks for the file
  before and after the run and adds a limitation when it was present. A real test confirms the
  hiding happens.
- **Ascout's own ignore location must stay empty.** `--gitleaks-ignore-path` names the
  configuration directory. A `.gitleaksignore` there stops the run before launch
  (`ENGINE_IGNORE_FILE_PRESENT`), or makes it `ARTIFACT_CHANGED_DURING_RUN` if it appears during
  the run.
- **Some paths are never scanned.** Archives and symbolic links are skipped by default, and the
  upstream default rules allowlist some paths, such as dependency folders and lockfiles.
- **The scan reads the live worktree, not a frozen export.** The broker's source binding
  detects tracked changes, within the E4 limits.
- **Coverage proof is future work.** The plan's per-file manifest and separate canary run are
  not here. The real tests do check that a planted canary is detected.
- **A shipped qualification cannot exist yet.** It would name one install location's digest.
  Part two must generate records at install or fix the location.
- **A very large report is cut off, never truncated into a result.** The 1 MiB stdout cap is
  reached at roughly 2,000 findings, which is `OUTPUT_CAP_EXCEEDED`. The adapter's own
  4,096-finding limit is a second guard.
- **The error path has no real-binary test.** An exit of 1 maps to `ENGINE_ERROR`, which the L0
  tests cover, but no fixture makes the real binary fail.

## Rollback

Revert this packet's commit. The broker then refuses `gitleaks-json-v1` profiles as invalid,
and the real-engine workflow disappears. No command or stored data depends on it.
