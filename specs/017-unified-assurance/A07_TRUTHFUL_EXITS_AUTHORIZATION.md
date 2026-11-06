# A07 Implementation Authorization — Truthful Exit Semantics

**Status at creation:** `PROPOSED / NOT_EFFECTIVE / FOUNDER_CONFIRMATION_REQUIRED`. Issue #655 holds the live status, because editing this file after confirmation would move the confirmed head.
**Ledger:** Issue #655
**Authorization base:** `dafd896fdea12c94374dc7cadc4c4c0eda4fa565`, which contains PR #652. The E0 evidence was captured at its first parent, `ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430`; the only difference is the macOS runner in `.github/workflows/ci.yml`.
**Packet:** `E2 — truthful CLI exits`

## 1. Purpose

This artifact defines the only authority that may change the exit semantics and result reporting of `ascout review`, `ascout test`, and `ascout security`, and the exit of operational errors on all commands, after it becomes canonically effective.

It is authorization-only. It implements nothing and grants no source mutation authority merely by existing on a branch or pull request.

```text
A07_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
A07_IMPLEMENTATION_AUTHORIZED = NO
A07_CONSTITUTION_AMENDMENT = PROPOSED / NOT_RATIFIED
```

## 2. Predecessors, rationale, and evidence

```text
CONSTITUTION_VERSION = 1.3.0 (Amendments A04, A05, A06 ratified)
```

The E0 baseline in draft PR #654 records the problem. At `ecada2bc`:

| Situation | Current exit | Problem |
| --- | --- | --- |
| `review` with changed files and no engine | 0 | A caller checking the exit code sees success, though nothing was reviewed |
| `review` on a clean tree with unreviewed commits | 0 | `review` compares only the working tree to HEAD, so committed work looks empty |
| `test`, any profile | 0 | Prints a plan and runs no test, even outside a repository |
| `security` | 1 | Same code `check` uses for a verified finding, though nothing was scanned |
| Generic operational error, such as running outside a repository | 1 | Same code as a finding. `EnvironmentIdentityIntegrityError` and usage errors already exit 2 |

PR #653, which proposes a similar taxonomy, remains an unratified draft. This artifact stands on its own and does not ratify PR #653.

## 3. Founder decision record

```text
FD-1 | selected: section 3.1 | head: to be bound on confirmation | date of choices: 2026-11-06
identity: repository founder, in a working session; to be confirmed on the pull request
conditions: section 3.2 | R1: founder, on the same head
```

An assistant transcribed this record from the founder's answers. It is not effective until the founder confirms it on the pull request.

### 3.1 Selected options

| Question | Founder's choice |
| --- | --- |
| Adopt the truthful exit taxonomy for `review`, `test`, and `security` | Ratify: one breaking switch with no legacy flag |
| `test --profile standard` before real execution exists | Exit 4, and add `test --plan`, labeled `NON_ASSURANCE_PLAN`, which exits 0 |
| `review` with an empty working tree | Exit 4 until `review` can compare against a base. The founder first chose exit 0 as `NOT_APPLICABLE`, then changed this after review showed committed work would get a false exit 0 |
| Operational errors | Exit 2 on all commands, including `check` before a receipt exists, and `doctor` |
| Who satisfies R1 | The founder. This is the same person as the FD-1 approver, so it is not separation of duties |
| macOS gate | Merge PR #652 first, then rebuild this artifact on the resulting `main` |

### 3.2 Conditions added by drafting, for founder review

These follow from the choices above but were not separately put to the founder. Confirming this record accepts them.

1. Every `test` profile, and bare `ascout test`, follows the same rule as `standard`, because all of them only print a plan today.
2. `test` and `security` outside a repository exit 4, not 2, because neither reads the repository and the true state is that required work did not run.
3. A failure rendering a `check` receipt after it was produced exits 2, because no valid result reached the caller.
4. `review` re-observes HEAD and the tree digest after its read. A mismatch exits 3. A read that fails because the source changed mid-read exits 2. `test` and `security` read no source, so exit 3 cannot occur for them at this baseline.
5. `review` from a subdirectory exits 2 and names the repository root as the place to run it, because the current Git readers give inconsistent results from a subdirectory.
6. R1 here means a human reading the exact pull-request head and recording a disposition with any findings.

## 4. Bounded amendment

### 4.1 Delta (ratification candidate v1.3.0 to v1.4.0)

```text
AMENDMENT_ID = A07
AMENDMENT_SCOPE = CLI exit and result-reporting semantics, and the one claim limit in clause 7
VERSION_CHANGE = 1.3.0 -> 1.4.0
```

Amendment text to be appended as a bounded subsection titled `Amendment A07 — Truthful exit semantics`:

1. `ascout review`, `ascout test`, and `ascout security` use these exits: 0 for complete applicable work or an explicitly requested non-assurance operation; 1 for a verified finding or a `FAIL` or `FLAKY` task; 2 for an error or invalid evidence, including an engine crash or timeout, as in `check`; 3 for source drift detected by comparing observations at the start and end of the operation; 4 for applicable verification that did not complete, including `BLOCKED` or `NOT_RUN` work and partial coverage. When several apply, precedence is 2, then 3, then 1, then 4, then 0.
2. Applicable verification that did not execute MUST NOT exit 0. Absent an error or drift, a verified finding with missing coverage exits 1 and MUST keep the incomplete coverage visible. A packet that adds an engine MUST define how findings stay visible on exits 2 and 3.
3. `review` exits 4 on a clean working tree while it cannot compare against a base. A later amendment or authorized packet may permit exit 0 only with a defined, source-bound proof that no reviewable change exists. Every `review` result MUST state that committed changes and ignored files were not considered, until a base comparison exists.
4. An operation that only renders a plan may exit 0 only when explicitly requested and labeled `NON_ASSURANCE_PLAN`. It MUST NOT be presented as a test PASS.
5. Operational errors on all commands exit 2 and MUST NOT be presented as repository findings. This includes `init` and `doctor`, and any `check` run that does not both complete with a valid receipt and deliver its selected output.
6. Receipt schema v1.0 and its bytes are unchanged, as are the exits of `check` runs that complete with a valid receipt and deliver their selected output.
7. This amendment introduces no `REFUTED` claim state. Any such state requires a separately authorized qualified contradiction and MUST NOT arise from a raw scanner finding.
8. This amendment adds no engine, sandbox, network, service, or dependency, and no isolation claim. An exit code is one field of the evidence contract and is not proof of correctness.
9. For the semantics above only, this amendment supersedes the statement in Amendment A05 clause 8 that `ascout check` remains unchanged, and the statement in Amendment A06 clause 5 that `ascout check`, `ascout review`, and `ascout test` remain unchanged. "Additive only" in those clauses concerned effects on other commands. Those clauses otherwise stay in force.

No other normative Constitution text changes.

### 4.2 Review for trust, scope, licensing, and complexity

- **Trust:** the amendment reduces false assurance and widens no execution authority.
- **Scope:** it adds one flag, `test --plan`, and no engine.
- **Licensing:** no third-party material enters.
- **Complexity:** it adds no dependency or service. No legacy flag is kept.

### 4.3 Affected artifacts

These historical records stay unedited. The amendment governs over them for these semantics.

- `specs/005-environment-identity-hardening/IMPLEMENTATION_AUTHORIZATION.md`, `plan.md`, and `tasks.md`, which keep generic unexpected errors unchanged. This is the direct conflict, and `tests/t106-environment-publication.integration.test.ts` is its pinned form.
- `specs/017-unified-assurance/UA_P06_T14_CLI_SURFACE_AMENDMENT.md`, decision point A, which recommended exit 1 for `security`, and its statement that other commands' exit semantics stay byte-identical. `src/assurance/security/security-command.ts` implements that exit.
- `specs/017-unified-assurance/UA_P06_IMPLEMENTATION_AUTHORIZATION.md`, section 10, on the CLI boundary.
- `specs/017-unified-assurance/UA_P05_IMPLEMENTATION_AUTHORIZATION.md` and `UA_P04_IMPLEMENTATION_AUTHORIZATION.md`, whose statements that `check` exits stay unchanged were bounded to those phases.

### 4.4 Ratification mechanics

```text
CONSTITUTION_CHANGE_IN_THIS_PR = NO
MECHANICAL_APPLICATION_PR_REQUIRED_BEFORE_E2 = YES
MECHANICAL_APPLICATION_SCOPE = .specify/memory/constitution.md only: exact section-4.1 text, a "Ratified by" sentence in the form A04 to A06 use, version 1.4.0, and the Last Amended date
E2_START_BLOCKED_UNTIL = this authorization EFFECTIVE and constitution v1.4.0 on canonical main
```

## 5. Authorized task after effectiveness

One task, `E2`, on one branch from then-current canonical `main`. It changes exit behavior and the output fields needed to report it truthfully, and adds `test --plan`. It adds no engine, no `review --delegate`, and no base comparison.

### 5.1 Positive mutation surface

Only these paths may change. If another path must change, work stops and this authorization is amended first.

Modify:

```text
src/cli.ts
src/git.ts
src/assurance/review/review-command.ts
src/assurance/test/test-plan-command.ts
src/assurance/security/security-command.ts
src/assurance/security/sentrdel-security-benchmark.ts
README.md
tests/cli.smoke.test.ts
tests/cli-format.contract.test.ts
tests/assurance-check-compatibility.test.ts
tests/assurance-phase-qualification.test.ts
tests/assurance-phase-recovery-qualification.test.ts
tests/assurance-review-p03-t14.test.ts
tests/assurance-review-p03-t15.test.ts
tests/assurance-security-t14.test.ts
tests/assurance-security-t15a.test.ts
tests/assurance-security-t16.test.ts
tests/assurance-test-cli-test-plan.test.ts
tests/t106-environment-publication.integration.test.ts
```

Create:

```text
tests/a07-cli-exit-native.test.ts
```

Nothing is deleted. `src/git.ts` may gain only two new exported readers built on its existing constrained Git invocation: `readStagedChangedPaths(repositoryRoot, headSha)`, which runs `git diff --cached --no-renames --name-status -z <head> --` and returns `readonly { path: string; change_kind: ChangedFileKind }[]`, and `readRepositoryPrefix(repositoryRoot)`, which runs `git rev-parse --show-prefix` and returns a string. Its existing functions stay byte-identical.

The new test compiles the CLI with `tsc --outDir node_modules/.cache/ascout-a07-cli`, because Project CI runs tests before the build step and workflows are frozen. That ignored location lets the compiled copy resolve its dependencies, though not the receipt schema, so native rows must not depend on a `check` receipt. And the test writes `{"type":"module"}` as a `package.json` in it, because Node's package-scope lookup stops at `node_modules`. `tests/npm-package-content.test.ts` shows the compile step only, since it never runs the output.

### 5.2 Frozen

`src/receipt/**`, existing `src/git.ts` functions, `src/assurance/test/profile-policy.ts`, receipt schemas and their fixtures, `check` receipt bytes, the task-status vocabulary, dependencies, workflows, and `vendor/`.

### 5.3 Required output fields

Under Constitution principle II, every `NOT_RUN` carries non-empty machine-readable and human-readable reasons. When a command exits 0 or 4, its JSON output for `review`, `test`, and `security` MUST include these fields, and `exit_code` MUST equal the process exit. Exit 1 cannot occur at this baseline because no engine exists:

| Field | Values |
| --- | --- |
| `outcome` | `NOT_RUN`, or `NON_ASSURANCE_PLAN` for `test --plan` |
| `exit_code` | The process exit |
| `reason_code` | `ENGINE_NOT_EXECUTED` for `review` and `test`, `PLAN_ONLY` for `test --plan`, and the existing `ENGINE_NOT_EXECUTED_IN_UA_P06` for `security` |
| `reason_text` | Non-empty |
| `executed_count` | 0 at this baseline |

When `review` exits 4, its JSON MUST also include `comparison: { kind: "working_tree_vs_head", base_ref }`, `considered: "working_tree_only"`, and `unreviewed_changes`, a list of `{ path, change_kind, previous_path? }` with one entry per path. Entries come first from the tracked results of the working-tree reader, then its untracked results, then `readStagedChangedPaths`. An entry is dropped if its path already appears, or if it equals a `previous_path` already listed. `absence.unreviewed_files` is aligned to the same paths.

Every `review` report's reasons, including those for a clean tree, state that committed changes and ignored files were not considered. A clean-tree report no longer says there are no changed files. It says the working tree matches HEAD, apart from `.ascout/`.

Source drift (exit 3) uses this report and no other fields, so nothing is claimed about a tree that has moved. `drift` joins `REVIEW_REPORT_KINDS`, and terminal output states both observations:

```text
{ kind: "drift", schema_version: 1, target_id, outcome: "SOURCE_DRIFT", exit_code: 3,
  reason_code: "SOURCE_DRIFT", reason_text, executed_count: 0,
  start: { head_sha, tree_digest }, end: { head_sha, tree_digest } }
```

On exit 2, the error goes to stderr and stdout is empty, except when the error is itself a stdout write failure. Other existing fields stay. Terminal output keeps its current stream and states the same outcome.

The usage line becomes `ascout test [--plan] [--profile quick|standard|deep|release] [--format json|terminal]`. `parseCliArgs` adds `plan: true` only when `--plan` is present, and omits the field otherwise. The benchmark case id becomes `engine.missing-not-run-exit-4`.

### 5.4 Required acceptance grid

| Case | Exit | Required result |
| --- | --- | --- |
| `review`, changed files, no engine, including with unpushed commits | 4 | `NOT_RUN`, `complete: false`, `considered: "working_tree_only"`; states committed changes and ignored files were not considered |
| `review`, edit plus deletion | 4 | Every changed path listed as unreviewed, including deleted paths |
| `review`, rename | 4 | New and previous paths both visible |
| `review`, deletions only | 4 | Deleted paths listed; not reported as empty |
| `review`, `git mv a b` | 4 | One entry for `b` with `previous_path: a` |
| `review`, `git rm --cached f` with `f` on disk | 4 | One entry for `f` |
| `review`, untracked-only change | 4 | Paths listed |
| `review`, ordinary staged change | 4 | Paths listed |
| `review`, staged change with the working copy restored to HEAD content, or a staged new file removed from disk | 4 | Paths listed, using the new staged-path reader |
| `review`, binary or mode-only change | 4 | Path listed |
| `review`, clean tree, including with unpushed commits | 4 | `NOT_RUN`; states committed changes and ignored files were not considered |
| `review`, only gitignored files changed | 4 | Same statement |
| `review` from a subdirectory, with a tracked or an untracked change, inside or outside it | 2 | The prefix check runs before any other Git read. Error says to run from the repository root, without printing a path; not reported as empty |
| `review`, unborn HEAD | 2 | Error; not reported as empty |
| `review`, HEAD or tree digest differs after a completed read | 3 | The `drift` report in section 5.3 |
| `review`, read fails because the source changed mid-read | 2 | Error text names the source change |
| `review`, Git metadata read times out | 2 | Error; distinct from an engine timeout |
| `test` with each profile, and bare `test` | 4 | `NOT_RUN`, required work and reason visible |
| `test` outside a repository | 4 | `NOT_RUN` |
| `test --plan` with each profile, inside and outside a repository | 0 | `NON_ASSURANCE_PLAN`; no test PASS implied |
| `--plan` on another command, or repeated | 2 | Usage error |
| `security`, no engine, inside and outside a repository | 4 | `NOT_RUN`; JSON `exit_code` 4; benchmark case expects `NOT_RUN/4` |
| `check`, `review`, `doctor` outside a repository | 2 | Error on stderr, empty stdout, no implied finding |
| `init` failure | 2 | Error on stderr |
| Unexpected exception in `runCli`, and at the entry-point handler in `src/cli.ts` | 2 | Path-redacted error on stderr, empty stdout. Error logging is guarded so it cannot throw, including when `process.cwd()` fails |
| Uncaught exception or unhandled rejection after the entry point starts, including during an in-flight `check` | 2 | Process-level handlers log safely and terminate immediately with exit 2, so no pending result can overwrite it. A run lock left behind must not let the next run exit 0 |
| `init`, `doctor`, `check`, or `review` from a deleted working directory, on Linux and macOS | 2 | Error on stderr. `test` and `security` read no working directory and keep their rows |
| Stdout write error, such as a closed pipe | 2 | A process-level stream error handler terminates with exit 2; never reported as a finding |
| `check` receipt render failure | 2 | Error on stderr |
| Usage error | 2 | Unchanged |
| `doctor` and `init` success | 0 | Unchanged |
| `check` emitting a valid receipt | Unchanged | Receipt bytes unchanged under existing golden tests |

Each `review`, `test`, and `security` row applies to both JSON and terminal formats.

`tests/a07-cli-exit-native.test.ts` MUST prove, as a real child process of the compiled CLI on every CI platform, every `review`, `test`, `security`, and outside-a-repository row not listed below, usage errors, and a closed stdout pipe using `security --format json`. On Linux and macOS it also proves the deleted working directory rows. It covers POSIX `$?` on Linux and macOS, and `$LASTEXITCODE` and `$?` under `pwsh` or Windows PowerShell on Windows. A failed compile or a missing shell MUST fail the test rather than skip it.

The listed tests prove these rows in-process with `vi.mock`: mid-read source change, post-read drift, Git metadata timeout, receipt render failure, `init` failure, and exceptions inside `runCli`. The new test proves the entry-point and process-level handler rows as a child process started with `node --import <fault module>`, where it generates the fault module itself.

Importing `dist/cli.js` without running it as the entry point performs no work and is not a CLI invocation. This artifact does not change that path. Failures before the handlers are installed, such as a corrupt build or missing dependency during import, and a closed stderr, are outside this packet's guarantee, because they can't be handled by code that never loaded or can't report. They remain known limits.

A finding combined with incomplete coverage cannot occur at this baseline because no engine exists. That case stays `N/A` until an engine packet and MUST NOT be simulated as an executed result.

### 5.5 Rollback

Revert the E2 pull request with a new reviewable commit, then rerun typecheck, build, the full test suite, and the `check` receipt golden comparison. A revert restores old exits that violate amendment clauses 1 to 5 once v1.4.0 is ratified, so it MUST be recorded as an open violation on a new ledger issue, since Issue #655 will be closed, and resolved by a fix-forward or a separate governance change.

### 5.6 E2 merge gate

The E2 pull request requires founder R1 on its exact head, Project CI success on the section 9 lanes, Self Verification success, Alibaba Open Code Review and Jev evidence or their exact recorded limitations, zero unresolved threads, and post-merge Project CI success on the same lanes. The mechanical Constitution pull request in section 4.4 requires founder review on its exact head and the same exact-head and post-merge CI. Its Last Amended date is the date that pull request merges.

## 6. Hard exclusions

No false `PASS`. No skipped or weakened test to reach green. No deadline change. No change to `check` receipt content. No agent may approve this record, R1, or its own review.

## 7. Compatibility

This is a breaking change for any caller relying on the old exits. The package is `private: true`, and no repository workflow calls these three commands. External callers on the owner's machines were not surveyed. `README.md` must document the change in the E2 pull request.

## 8. Authorization PR purity

This artifact's own pull request may change exactly one tracked path, apart from merging canonical `main` into its branch:

```text
specs/017-unified-assurance/A07_TRUTHFUL_EXITS_AUTHORIZATION.md
```

## 9. Effectiveness gate

Merging this artifact is not sufficient by itself. All of the following are required, in terms of this exact set of Project CI lanes: `ubuntu-24.04`, `windows-2025`, and `macos-15`, each on Node 22 and 24.

1. This artifact's base still equals canonical `main`. PR #652 merged at `dafd896` and set these lanes. If `main` moves or the head changes, update the base where needed and repeat items 2 to 5.
2. Founder confirmation of section 3 on the exact pull-request head, which also serves as R1 with findings recorded. Any later change to the head requires reconfirmation.
3. Project CI success on that head across all six lanes, and Self Verification success on that head. A cancelled lane is not a success.
4. Alibaba Open Code Review with no unresolved material findings, or its exact recorded limitation. On this Markdown-only diff, `ocr delegate preview` is expected to report the file as excluded.
5. Jev evidence, or its exact recorded limitation.
6. Zero unresolved review threads, and canonical `main` still equal to the base recorded in this artifact immediately before merge.
7. Guarded normal merge with exact expected head, then verified merge tree, parents, and signature.
8. Post-merge Project CI success across all six lanes. If it fails, this authorization stays not effective until a fix or revert lands.
9. Issue #655 closed as `CLOSED_CANONICAL / EFFECTIVE`.

Only after all conditions:

```text
A07_IMPLEMENTATION_AUTHORIZED = YES
A07_CONSTITUTION_AMENDMENT = RATIFIED
```

E2 still cannot start until the section 4.4 mechanical application lands on `main`. Until then, implementation stays forbidden. Model reviews are advisory and satisfy neither item 2 nor any other human decision.

Refs #655
Refs #654
Refs #653
Refs #652
