# E5 Part Two: `ascout security` Runs Gitleaks

**Status:** packet specification under Amendment A07. It does not change A07's clauses. It uses
clause 2: a finding with missing coverage exits 1 and keeps the gap visible, and a packet that
adds an engine defines how findings behave on exits 2 and 3. It was adopted under the founder's
standing approval of 2026-11-07, not by a separate ratification.

## Opting in

`ascout security` runs Gitleaks only when `ASCOUT_GITLEAKS_PATH` names an executable. Without
it, or with an empty value, the command is unchanged: the existing NOT_RUN report with exit 4 and
reason `ENGINE_NOT_EXECUTED_IN_UA_P06`, reading nothing. Every existing A07 row still holds.

The variable selects a copy, never what runs. The file must hash to the executable digest
pinned for this platform. The Real Engines workflow measures that digest from the verified
release archive on both Node versions, and checks it on every run. Ascout does not search
`PATH`, download anything, or accept another version.

| Platform | Pinned executable SHA-256 |
|---|---|
| linux-x64 | `88f91962aa2f93ac6ab281d553b9e125f5197bbbce38f9f2437f7299c32e5509` |
| darwin-arm64 | `ba52fb1bfabbcde42f032afad3d6e0b19dff8ed105229a16e7caa338bbc0e84f` |
| win32-x64 | `17157e2ee8b76fc8b1d8bee607a250e34b8a8023c8bc81822d4b5ee4d78fcb7c` |

Other platforms have no pin, so they report NOT_RUN with `ENGINE_PLATFORM_UNQUALIFIED`.

## Qualification

The command issues its own qualification record on each run, naming exactly the profile it
runs. That record cannot fail, so the kernel's evaluation is a formality here. **The real
authority is the pinned executable digest and the fixed configuration digest**, which the
broker checks before and after the run. The record's digest fields are derived from those pins.
The record does not cite a specific workflow run: the pins were measured by the Real Engines
workflow, and that workflow re-checks them on every run.

## Exits and reports

| Situation | Exit | Output |
|---|---|---|
| Variable unset or empty | 4 | Unchanged v1 NOT_RUN report |
| Platform has no pinned executable | 4 | v2 report, `NOT_RUN`, `ENGINE_PLATFORM_UNQUALIFIED` |
| Configured file missing | 4 | v2 report, `NOT_RUN`, `ENGINE_UNAVAILABLE` |
| Not inside a Git work tree, or no working directory | 4 | v2 report, `NOT_RUN`, `NO_REPOSITORY` |
| Run from a repository subdirectory | 2 | Error on stderr, stdout empty |
| A repository Ascout refuses (partial clone, submodule, Git filter), no commits yet, or a failed Git read | 2 | Error on stderr naming the kind, stdout empty |
| Launch fails for another reason, such as no execute permission | 2 | Error on stderr, stdout empty |
| The source can't be re-read around the scan | 2 | Error on stderr, stdout empty |
| Findings | 1 | v2 report, `FINDINGS`, coverage `PARTIAL`, each finding's rule, path, lines, and message |
| No findings | 4 | v2 report, `INCOMPLETE`, `COVERAGE_UNPROVEN` |
| Run stopped early (cancelled, output cap, escaped process, no input) | 4 | v2 report, `INCOMPLETE`, no findings |
| Source changed before or during the scan | 3 | Drift report with start and end observations, no findings |
| Digest mismatch, policy refusal, malformed output, secret in output, engine error, timeout | 2 | Error on stderr, stdout empty, no findings |

Precedence follows A07: an error beats drift, and drift beats a finding or incomplete work. The
broker's decision order was changed in this packet to match (see the E4 specification).

**Findings on exits 2 and 3:** none are reported, not even a count. A failed run's output isn't
trusted, and the broker decides drift before it decodes the report. A07 clause 2 asks a packet to
define how findings stay visible on these exits. This packet defines them as not visible, which
meets the clause's wording but not its intent: a real match can disappear when the tree also
changed. Neither exit is a clean result, and rerunning on a stable tree shows the findings.

The v2 report always carries `security_pass: false` and `clean_claimed: false`. It also carries
every broker limitation, including the one for a source `.gitleaksignore`.

The command now reads the repository and starts a process when the variable is set. It writes
only a temporary configuration directory, which it removes when the run ends. If removal fails,
for example because Windows still holds the file, the result stands and the directory, which
holds only the fixed public configuration, is left behind. An interrupted run also leaves it.

Terminal output escapes control and bidirectional characters in repository file names.

## Scope

| File | Change |
|---|---|
| `src/assurance/security/security-gitleaks.ts` | New: runner, exit mapping, report, terminal output |
| `src/cli.ts` | Modified: `security` runs Gitleaks when the variable is set |
| `src/assurance/engines/execution-broker.ts` | Modified: decision order follows A07 precedence |
| `specs/017-unified-assurance/E4_EXECUTION_BROKER_SPEC.md` | Modified: status table reordered to match |
| `tests/a07-cli-exit-native.test.ts`, `tests/assurance-security-t14.test.ts` | Modified: clear the opt-in variable, since their rows describe the command without an engine |
| `src/assurance/engines/gitleaks-profile.ts` | Modified: pinned executable digests |
| `.github/scripts/acquire-gitleaks.mjs` | Modified: fails when the extracted executable differs from its pin |
| `tests/assurance-security-gitleaks.test.ts` | New: each exit row, without a binary |
| `tests/assurance-gitleaks-real.test.ts` | Modified: compiled CLI runs against the real binary |
| `README.md` | Modified: documents the variable and exits |

## Known limits

- **A finding is a scanner match, not a verified credential.** Exit 1 means Gitleaks matched a
  rule. It can be a false positive, and A07 clause 7 still forbids treating it as `REFUTED`.
- **Exit 4 on every clean scan.** Gitleaks cannot show what it scanned. A caller that wants a
  pass has no way to get one from this engine.
- **One version, three platforms.** Gitleaks 8.30.1 only, on linux-x64, darwin-arm64, and
  win32-x64.
- **The E4 and E5 limits still apply.** They include no sandbox, no network enforcement, and the
  source `.gitleaksignore`.

## Rollback

Revert this packet's commit. `ascout security` then reports NOT_RUN with exit 4 whether or not the
variable is set.
