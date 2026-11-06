# A07 Implementation Authorization — Truthful Exit Semantics

**Status at creation:** `PROPOSED / NOT_EFFECTIVE / FOUNDER_CONFIRMATION_REQUIRED`. Issue #655 holds the live status, because editing this file after confirmation would move the confirmed head.
**Ledger:** Issue #655
**Authorization base:** `ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430`. This must be updated before founder confirmation, as section 9 item 1 requires.
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

The E0 baseline in draft PR #654 records the problem. At the base above:

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
AMENDMENT_SCOPE = CLI exit and result-reporting semantics only
VERSION_CHANGE = 1.3.0 -> 1.4.0
```

Amendment text to be appended as a bounded subsection titled `Amendment A07 — Truthful exit semantics`:

1. `ascout review`, `ascout test`, and `ascout security` use these exits: 0 for complete applicable work or an explicitly requested non-assurance operation; 1 for a verified finding or failure; 2 for an error or invalid evidence; 3 for source drift detected by comparing observations at the start and end of a completed read; 4 for required verification that did not complete, including timeouts and partial coverage. When several apply, precedence is 2, then 3, then 1, then 4, then 0.
2. Required verification that did not execute MUST NOT exit 0. A verified finding with missing coverage exits 1 and MUST keep the incomplete coverage visible.
3. `review` MUST NOT exit 0 for an empty working tree while it cannot compare against a base. Its output MUST state that committed changes and ignored files were not considered. A later amendment or authorized packet may permit exit 0 only with a defined, source-bound proof that no reviewable change exists.
4. An operation that only renders a plan may exit 0 only when explicitly requested and labeled `NON_ASSURANCE_PLAN`. It MUST NOT be presented as a test PASS.
5. Operational errors on all commands exit 2 and MUST NOT be presented as repository findings. This includes `init`, `doctor`, and `check` when no valid receipt reaches the caller.
6. Receipt schema v1.0 and its bytes are unchanged, as are the exits of `check` runs that emit a valid receipt.
7. This amendment introduces no `REFUTED` claim state. Any such state requires a separately authorized qualified contradiction and MUST NOT arise from a raw scanner finding.
8. This amendment adds no engine, sandbox, network, service, or dependency, and no isolation claim. An exit code is one field of the evidence contract and is not proof of correctness.
9. For the semantics above only, this amendment supersedes the statement in Amendment A05 clause 8 that `ascout check` remains unchanged, and the statement in Amendment A06 clause 5 that `ascout check`, `ascout review`, and `ascout test` remain unchanged. Those clauses otherwise stay in force.

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

Nothing is deleted. `src/git.ts` may gain only new exported readers built on its existing constrained Git invocation, for staged paths and the repository prefix. Its existing functions stay byte-identical.

The new test compiles the CLI with `tsc --outDir node_modules/.cache/ascout-a07-cli`, because Project CI runs tests before the build step and workflows are frozen. That ignored location lets the compiled copy resolve dependencies and module type. `tests/npm-package-content.test.ts` shows the compile step only, since it never runs the output.

### 5.2 Frozen

`src/receipt/**`, existing `src/git.ts` functions, `src/assurance/test/profile-policy.ts`, receipt schemas and their fixtures, `check` receipt bytes, the task-status vocabulary, dependencies, workflows, and `vendor/`.

### 5.3 Required output fields

Under Constitution principle II, every `NOT_RUN` carries non-empty machine-readable and human-readable reasons. When a command exits 0, 1, 3, or 4, its JSON output for `review`, `test`, and `security` MUST include these fields, and `exit_code` MUST equal the process exit:

| Field | Values |
| --- | --- |
| `outcome` | `NOT_RUN`, or `NON_ASSURANCE_PLAN` for `test --plan` |
| `exit_code` | The process exit |
| `reason_code` | `ENGINE_NOT_EXECUTED` for `review` and `test`, `PLAN_ONLY` for `test --plan`, and the existing `ENGINE_NOT_EXECUTED_IN_UA_P06` for `security` |
| `reason_text` | Non-empty |
| `executed_count` | 0 at this baseline |

`review` JSON MUST also include `comparison: { kind: "working_tree_vs_head", base_ref }`, and `unreviewed_changes`, a list of `{ path, change_kind, previous_path? }` covering every changed path. Source drift (exit 3) reports `outcome: "ERROR"` with reason code `SOURCE_DRIFT`. On exit 2, stdout is empty and the error goes to stderr. Existing fields stay. Terminal output keeps its current stream and states the same outcome.

The usage line becomes `ascout test [--plan] [--profile quick|standard|deep|release] [--format json|terminal]`. `parseCliArgs` omits the new field when `--plan` is absent. The benchmark case id becomes `engine.missing-not-run-exit-4`.

### 5.4 Required acceptance grid

| Case | Exit | Required result |
| --- | --- | --- |
| `review`, changed files, no engine | 4 | `NOT_RUN`, `complete: false` |
| `review`, edit plus deletion | 4 | Every changed path listed as unreviewed, including deleted paths |
| `review`, rename | 4 | New and previous paths both visible |
| `review`, deletions only | 4 | Deleted paths listed; not reported as empty |
| `review`, untracked-only change | 4 | Paths listed |
| `review`, ordinary staged change | 4 | Paths listed |
| `review`, staged change with the working copy restored to HEAD content, or a staged new file removed from disk | 4 | Paths listed, using the new staged-path reader |
| `review`, binary or mode-only change | 4 | Path listed |
| `review`, clean tree, including with unpushed commits | 4 | `NOT_RUN`; states committed changes and ignored files were not considered |
| `review`, only gitignored files changed | 4 | Same statement |
| `review` from a subdirectory, with a tracked or an untracked change, inside or outside it | 2 | Error names the repository root; not reported as empty |
| `review`, unborn HEAD | 2 | Error; not reported as empty |
| `review`, HEAD or tree digest differs after a completed read | 3 | `SOURCE_DRIFT`; no `NOT_RUN` claim about the changed state |
| `review`, read fails because the source changed mid-read | 2 | Error |
| `test` with each profile, and bare `test` | 4 | `NOT_RUN`, required work and reason visible |
| `test` outside a repository | 4 | `NOT_RUN` |
| `test --plan` with each profile, inside and outside a repository | 0 | `NON_ASSURANCE_PLAN`; no test PASS implied |
| `--plan` on another command, or repeated | 2 | Usage error |
| `security`, no engine, inside and outside a repository | 4 | `NOT_RUN`; JSON `exit_code` 4; benchmark case expects `NOT_RUN/4` |
| `check`, `review`, `doctor` outside a repository | 2 | Error on stderr, empty stdout, no implied finding |
| `init` failure | 2 | Error on stderr |
| Unexpected exception in `runCli`, and at the entry-point handler in `src/cli.ts` | 2 | Path-redacted error on stderr, empty stdout. Exit 2 is set before any logging, so a failing `process.cwd()` cannot leave exit 1 |
| Stdout write error, such as a closed pipe | 2 | A process-level stream error handler sets the exit; never reported as a finding |
| `check` receipt render failure | 2 | Error on stderr |
| Usage error | 2 | Unchanged |
| `doctor` and `init` success | 0 | Unchanged |
| `check` emitting a valid receipt | Unchanged | Receipt bytes unchanged under existing golden tests |

Each `review`, `test`, and `security` row applies to both JSON and terminal formats.

`tests/a07-cli-exit-native.test.ts` MUST prove, as a real child process of the compiled CLI on every CI platform, each row that can be triggered from outside: every `review`, `test`, `security`, and outside-a-repository row, usage errors, and a closed stdout pipe. It covers POSIX `$?` on Linux and macOS, and `$LASTEXITCODE` and `$?` under `pwsh` or Windows PowerShell on Windows. A failed compile or a missing shell MUST fail the test rather than skip it.

These rows may be proved in-process through `runCli` or an existing injection point, and through the listed tests: mid-read source change, post-read drift, receipt render failure, `init` failure, and unexpected exceptions. If the entry-point handler can't be triggered that way, its assignment of exit 2 is verified by a source-level test.

Importing `dist/cli.js` without running it as the entry point performs no work and is not a CLI invocation. This artifact does not change that path.

A finding combined with incomplete coverage cannot occur at this baseline because no engine exists. That case stays `N/A` until an engine packet and MUST NOT be simulated as an executed result.

### 5.5 Rollback

Revert the E2 pull request with a new reviewable commit, then rerun typecheck, build, the full test suite, and the `check` receipt golden comparison. A revert restores old exits that violate amendment clauses 1 to 5 once v1.4.0 is ratified, so it MUST be recorded as an open violation on a new ledger issue, since Issue #655 will be closed, and resolved by a fix-forward or a separate governance change.

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

1. PR #652 merged, or a recorded founder change to this lane set, and this artifact's base updated to the resulting `main`.
2. Founder confirmation of section 3 on the exact pull-request head, which also serves as R1 with findings recorded. Any later change to the head requires reconfirmation.
3. Project CI success on that head across all six lanes, and Self Verification success on that head. A cancelled lane is not a success.
4. Alibaba Open Code Review with no unresolved material findings, or its exact recorded limitation. On this Markdown-only diff, `ocr delegate preview` is expected to report the file as excluded.
5. Jev evidence, or its exact recorded limitation.
6. Zero unresolved review threads, and canonical `main` still equal to the base recorded in this artifact immediately before merge.
7. Guarded normal merge with exact expected head, then verified merge tree, parents, and signature.
8. Post-merge Project CI success across all six lanes.
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
