# UA-P05-CLI-SMOKE CI Recovery Authorization — Doctor Path Timing

**Status:** `PROPOSED / FOUNDER_AUTHORIZED / AWAITING_CANONICAL_ADMISSION`
**Ledger:** Issue [#552](https://github.com/TheHalfMoon/Ascout/issues/552)
**Authorization base:** `0bb87efff8cda7c3159d48e4a1e598c87a7838bd`
**Scope:** single prospective CLI smoke fixture repair only

## 1. Purpose and authority

This artifact is the only prospective authority for the preserved post-merge
`tests/cli.smoke.test.ts` timing failure. It grants no production, workflow,
dependency, configuration, CI-matrix, runner, or Node-version mutation authority.

```text
RECOVERY_AUTHORITY = BOUNDED / CLI_SMOKE_FIXTURE_ONLY
PRODUCT_SOURCE_MUTATION = NO
WORKFLOW_MUTATION = NO
CONFIGURATION_MUTATION = NO
TIMEOUT_WIDENING = FALLBACK_ONLY_AFTER_MEASUREMENT
```

Issue #549 remains the separate T064 recovery ledger. This artifact and Issue
#552 do not reinterpret or erase the T064 evidence.

## 2. Preserved failure record

```text
CANONICAL_MAIN = 0bb87efff8cda7c3159d48e4a1e598c87a7838bd
POST_MERGE_PROJECT_CI_RUN = 36031431379
POST_MERGE_HEAD = 0bb87efff8cda7c3159d48e4a1e598c87a7838bd
FAILED_JOB = 107740877777
FAILED_LANE = ubuntu-24.04 / node-24
FAILED_FILE = tests/cli.smoke.test.ts
FAILED_CASE = T007 CLI startup smoke / keeps doctor output opaque to local and repository-relative paths plus configured command secrets
FAILED_TEST_LINE = 125
FAILURE = Test timed out in 5000ms
OBSERVED_FAILED_CASE_DURATION = approximately 24.3 seconds
OTHER_LANES = 5/5 successful
SUITE_FILES = 203 passed / 1 failed / 1 skipped
SUITE_TESTS = 1883 passed / 1 failed / 5 skipped
T064_REPAIR = independently qualified before this failure
PR_548 = OPEN / UNMERGED / BLOCKED
RERUN_TO_GREEN = NO
FAILURE_EVIDENCE_ERASED = NO
```

Run `36031431379` is permanent negative evidence. No later run, rerun, retry,
or replacement interpretation changes this record.

## 3. Source-traced diagnosis

`tests/cli.smoke.test.ts` creates a real temporary repository, commits a
baseline, changes a sensitive untracked file, dynamically imports the real CLI,
and invokes `runCli(["doctor"])`. The doctor path performs real project
discovery, config loading, repository identity and HEAD resolution, two complete
tree-digest observations, working-tree comparison, and command-surface
classification. The traced path performs approximately 27 synchronous Git child
processes for this fixture, in addition to filesystem work. The integration
smoke contract and all path/secret assertions remain in force.

Local diagnostic measurements (not CI qualification):

- Focused Windows repetitions: 4/4 passed; file duration 3.25–3.78 seconds.
- Persistent identity configuration: total 2.26–2.72 seconds; doctor execution
  1.75–2.13 seconds; configuration phase approximately 0.27–0.33 seconds.
- Command-local identity/signing values: total 2.03–2.43 seconds; configuration
  phase approximately 0.13–0.17 seconds; the same real doctor assertions passed.
- A full local default-worker run reproduced this timeout together with three
  unrelated timing failures, evidence of parallel resource contention rather
  than proof of product misbehavior. It does not authorize broader mutation.

The diagnosis identifies fixture process-startup overhead as removable and
retains the real external Git and doctor work as required. It does not label the
failure flaky without evidence.

## 4. Authorized repair surface

```text
tests/cli.smoke.test.ts = REPAIR_ALLOWED
tests/helpers/** = REUSE_ONLY / NEW_HELPER_ONLY_IF_STRICTLY_REQUIRED
```

Hard exclusions:

```text
src/** = NO
.github/workflows/** = NO
package.json = NO
package-lock.json = NO
vitest configuration = NO
global testTimeout = NO
CI matrix = NO
runner selection = NO
Node versions = NO
test skip = NO
assertion deletion or weakening = NO
Git, runDoctor, or working-tree comparison mocking = NO
hidden network/provider behavior = NO
```

## 5. Preferred repair order

First remove only proven unnecessary fixture process startups:

1. Retain persistent `core.autocrlf=false` because it is applied before
   `git add` and is required for deterministic cross-platform fixture bytes.
2. Replace the three standalone persistent `user.name`, `user.email`, and
   `commit.gpgsign=false` child processes with command-local `-c` values on the
   same real `git commit` invocation.
3. Preserve the same repository, baseline commit, changed sensitive filename,
   real `runCli(["doctor"])`, output, and every secrecy/path-opacity assertion.

A bounded per-test timeout is a fallback only if the optimized real fixture is
still shown by cross-platform measurement to exceed the default 5000ms budget.
If used, it must be local to this test, justified as a test-harness budget for
real Git/process work, and must not be presented as a product-performance
guarantee. No arbitrary value may be selected solely from the failed run's
approximately 24-second duration.

## 6. Repair acceptance

The repair must prove:

```text
real_doctor_path = unchanged
repository_identity_opaque = true
local_absolute_path_absent = true
configured_secret_absent = true
ascout_config_path_absent = true
sensitive_changed_filename_absent = true
changed_file_summary_present = true
authority_path_summary_present = true
production_behavior_changed = false
cli_semantics_changed = false
assertions_weakened = false
hidden_network_or_provider_behavior = false
runtime_stability = materially improved OR bounded_timeout_evidence_recorded
```

## 7. Governance and qualification

This authorization artifact is admitted only through its own exact-head PR with
path purity, focused checks, typecheck, Self Verification attempt-1 success,
Project CI attempt-1 6/6 success, Alibaba Open Code Review evidence, Jev
exact-head evidence, manual review, zero material findings, and zero unresolved
material threads. The repair PR repeats the same gates on its exact fresh
canonical base, followed by guarded normal merge and push-triggered Project CI
attempt-1 6/6 success.

No squash, rebase, force-push, history rewrite, CI rerun-to-green, production
source change, or assertion weakening is permitted. If post-merge qualification
exposes another unrelated timing failure, that failure is preserved and paused
for systemic-cause analysis rather than handled by an endless timeout sequence.

Qualification evidence for this artifact and the later repair is recorded in
Issue #552 and the corresponding exact-head PR records; it is not fabricated in
this authorization file.
