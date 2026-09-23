# UA-P03-T14 Post-Merge Recovery Amendment

**Status:** `PROPOSED / NOT_EFFECTIVE / FOUNDER_APPROVAL_REQUIRED`
**Ledger:** Issue #522
**Trigger:** PR #521 post-merge Project CI attempt-1 failure on canonical main `144f0d152aed51678ae76de39a0c901998f81466`
**Canonical base at proposal creation:** `144f0d152aed51678ae76de39a0c901998f81466`

## 1. Purpose

This document proposes the narrowest one-incident recovery path for the
preserved PR #521 post-merge qualification failure, so that Issue #520 can
still reach a legitimate effectiveness decision without rewriting history,
weakening tests, or inventing a general CI retry policy.

This document is proposal-only.

```text
RECOVERY_APPROVED = NO
RECOVERY_EFFECTIVE = NO
REPAIR_IMPLEMENTATION_AUTHORIZED = NO
AMENDMENT_520_EFFECTIVE = NO
T14_SUCCESSOR_IMPLEMENTATION_AUTHORIZED = NO
```

Founder approval and canonical admission are required before any
source/test mutation described here becomes lawful.

## 2. Preserved PR #521 admission evidence

PR #521 exact approved head:

```text
21dea3bd6aa1a51c6f907b16bacfb33f43ff120e
```

Canonical base at approval:

```text
f54ee3a110406fcd3543a9e5a5ce2e01faac2ad1
```

Pre-merge exact-head qualification bound to `21dea3b`:

```text
Self Verification = SUCCESS (run 35892664181, attempt 1)
Project CI = SUCCESS (run 35892664386, attempt 1, 6/6 lanes)
Review threads = 0
Submitted reviews = 0
Founder exact-head proposal review = zero material findings
Founder approval for exact head = recorded in session before merge
```

Guarded normal merge with exact-head binding
(`--match-head-commit 21dea3bd6aa1a51c6f907b16bacfb33f43ff120e`):

```text
Merge commit = 144f0d152aed51678ae76de39a0c901998f81466
Ordered parents = f54ee3a110406fcd3543a9e5a5ce2e01faac2ad1
                  21dea3bd6aa1a51c6f907b16bacfb33f43ff120e
Merge diff f54ee3a..144f0d15 = exactly 1 added file:
  specs/017-unified-assurance/UA_P03_T14_SENTINEL_ALIGNMENT_AMENDMENT.md (+278/-0)
```

The merge itself is valid. What failed is the post-merge gate below.

## 3. Preserved post-merge attempt-1 failure

Push-triggered post-merge Project CI on the merge commit:

```text
Run = 35897969496 (event push, head 144f0d152aed51678ae76de39a0c901998f81466)
Conclusion = FAILURE (attempt 1)
ubuntu-24.04 / node-22 = SUCCESS
ubuntu-24.04 / node-24 = SUCCESS
windows-2025 / node-22 = SUCCESS
macos-14 / node-22 = SUCCESS
macos-14 / node-24 = SUCCESS
windows-2025 / node-24 = FAILURE (job 107306560446)
```

Failed test:

```text
tests/post-run-widening-jest-run-check.integration.test.ts
T054 Jest runCheck bounded post-run widening
Error: Test timed out in 60000ms.
Test files: 1 failed | 188 passed (189)
Tests: 1 failed | 1747 passed | 34 skipped (1782)
```

The failed job's build step succeeded; the failure is exactly the one
integration test timeout. No assertion in the test failed; the vitest
`it` budget expired before completion.

This failure is preserved permanently as negative evidence. It must not
be deleted, rewritten, or re-labeled as success.

## 4. Why Section 10 cannot be satisfied literally

The UA-P03-T14 sentinel alignment amendment section 10 requires:

```text
push-triggered post-merge Project CI succeeds on attempt 1
```

Attempt 1 (run 35897969496) produced 5/6 SUCCESS and 1/6 FAILURE.
That outcome is immutable CI history.

Therefore:

```text
SECTION_10_LITERAL_SATISFACTION = IMPOSSIBLE
RERUN_AS_ATTEMPT_1 = FORBIDDEN
```

Any rerun of run 35897969496 is observational diagnostics only. A rerun
success, if it occurs, proves nothing about the original gate and must
never be represented as attempt-1 success. No observational rerun was
performed during diagnosis because identical-content pass/fail evidence
across existing runs already proves intermittence (section 5.15).

## 5. R0 diagnosis (read-only, no source mutated)

Diagnosis was performed on a detached worktree at exact canonical main
`144f0d15`. No canonical source file was modified.

### 5.1 Test implementation

`tests/post-run-widening-jest-run-check.integration.test.ts` (122 lines)
runs a single `it` with a 60_000 ms vitest budget. Inside that budget:

1. `initializeFixture()` (synchronous): mkdtemp, full recursive
   `cpSync` of `node_modules` into the fixture, shim writes, fixture
   file writes, `git init / config / add / commit` via `spawnSync`,
   then two production source edits.
2. `await runCheck(root)`: narrow `--findRelatedTests` jest pass,
   LCOV exercise-gap analysis, exactly one full second pass
   (`post_run_exercise_gap`, `pass-2` artifacts), receipt validation.
3. 17 assertions on selection, passes, evidence sequences, artifacts.
4. `finally rmSync(root, recursive, force)` of the whole fixture tree.

### 5.2 Subprocesses

- Fixture: 4 synchronous `git` invocations plus discovery-time `git`
  metadata calls inside `runCheck` (all `spawnSync`, OS-bounded).
- Execution: 2 jest invocations through `runProcess` (600_000 ms task
  budget each) targeting a one-shot Node shim that writes one JSON
  result plus one `lcov.info` and exits immediately.
- No servers, watchers, or long-lived children exist on this path.

### 5.3 runCheck and widening behavior

`planJestTask` (`src/tools/jest.ts`) builds narrow vs full argv;
`src/selection.ts` records the single permitted T054 second pass only
after the full pass launches, keeping recursive widening impossible by
construction. With shims, both passes plus LCOV parsing are
millisecond-scale. The semantic operation is not the cost driver.

### 5.4 Windows and Node behavior

- Windows Server 2025 runners carry the dominant variable cost:
  recursive copy, git scan, and recursive delete of ~6k files under
  shared-disk and antivirus conditions.
- Local probe on Windows (informational magnitude only):
  copy 93.4 MB / 6192 files = 10346 ms; recursive delete = 2330 ms.
  CI runners are slower and concurrently loaded (suite runs serially
  with `--maxWorkers=1` for 8-9 minutes).
- Node 24 specificity: none found. No version-dependent branch exists
  in the test, the shim, or the planning path, and windows-2025 /
  node-22 passed the same commit. This is not a Node version defect.

### 5.5 Lifecycle, tmpdir, coverage

- No orphan-subprocess evidence: the CI job completed normally with a
  recorded test failure instead of hanging at the 30-minute job level.
- `runProcess` (`src/process.ts`) binds tree cleanup
  (`taskkill /T /F` on Windows, process-group signal on POSIX) with a
  600 s task budget that was never reached; the binding constraint is
  the 60 s vitest `it` budget, not task execution.
- `TMPDIR` maps to runner temp; no tmpdir defect found.
- Coverage/LCOV widening inputs are shim-generated and trivial; the
  widening logic is exonerated as a delay source.

### 5.6 Timeout position

The log contains zero assertion errors and exactly one error:

```text
Test timed out in 60000ms.
```

The timeout therefore fired before the assertion path could fail. The
CI log cannot localize the stall between synchronous fixture setup and
`runCheck`, but fixture I/O is the largest measured cost inside the
same 60 s envelope (section 5.4).

### 5.7 Budget history

- Commit `5db26b3 test(t088): widen T054 Jest integration budget`
  already widened this test 30_000 ms to 60_000 ms.
- The sibling `tests/post-run-widening-run-check.integration.test.ts`
  (same fixture pattern, vitest widening) carries 180_000 ms.
- Nine integration test files perform the full `node_modules` copy;
  their budgets range from 60_000 ms to 180_000 ms. T054-jest sits at
  the tightest end for its fixture cost.

### 5.8 Review-tool evidence (bound to exact SHAs)

- Jev (`jev-1.13.0`, TypeSafe): amendment content cannot have caused
  the timeout (yes, 0.88); dominant cost driver is fixture I/O
  (fixture_io, probability 1.00); pre-approval merge gate correctly
  classified blocked (0.99). A post-merge qualification judgment
  returned weak affirmation (0.54) and is preserved as uncertainty,
  not proof. Jev output is evidence, never authority.
- Alibaba Open Code Review (open-code-review v1.12.9):
  `delegate preview` on merge range `f54ee3a..144f0d15` records
  0 reviewable / 1 total (`unsupported_ext` markdown);
  `scan --preview` on the failure surface records 2 reviewable
  (`src/process.ts`, `src/tools/jest.ts`) with the test file excluded
  by `default_path` rules; `delegate rule` resolves the TypeScript
  rule group for all three paths; actual LLM review is NOT_RUN
  (no `anthropic` api_key configured). No clean review is claimed
  where no reviewable file was processed.

### 5.9 Classification

Intermittent platform-specific timing marginality of the T054 60 s
vitest budget against Windows fixture I/O cost, proven by:

- identical test content passing the same lane at `f54ee3a` push
  (run 35890198734, 6/6) and at PR-head `21dea3b` CI (run
  35892664386, 6/6), then failing at `144f0d15` push (run
  35897969496, 5/6);
- content delta `f54ee3a..144f0d15` proven docs-only (1 added `.md`);
- all five other lanes passing the same merge commit.

This is not a product behavioral defect, not a Node version defect,
not an orphan-process defect, and not amendment-content regression.
The term "flaky" is not used as an explanation; the mechanism above
is the evidenced classification.

## 6. Proposed one-incident substitute path

For THIS INCIDENT ONLY, Issue #520 may become EFFECTIVE only after all
of the following are proven in order:

1. this recovery amendment is approved and admitted per section 9;
2. `RECOVERY_EFFECTIVE = YES` authorizes exactly one repair PR;
3. the repair PR branches fresh from the then-current canonical main;
4. the repair implements only the minimum files proven necessary by
   section 5 (preferred order in section 7);
5. the repair PR is qualified from scratch: authorized-path purity,
   focused tests for the changed behavior, Self Verification
   attempt-1 SUCCESS on the exact head;
6. Project CI attempt-1 SUCCESS across all six lanes on the exact
   repair head;
7. Alibaba Open Code Review on the exact repair head with findings
   recorded and all material findings repaired (the repair must touch
   reviewable code surface; a Markdown-only repair head cannot satisfy
   this step);
8. Jev-backed review and evidence on the exact repair head;
9. zero material findings and zero unresolved review threads;
10. main/base/head/scope unchanged immediately before merge;
11. guarded normal merge binding the exact qualified repair head;
12. merge tree, ordered parents, signature, and canonical main proof;
13. push-triggered post-merge Project CI attempt-1 SUCCESS across all
   six lanes on the repair merge;
14. proof that the original PR #521 amendment content
   (`UA_P03_T14_SENTINEL_ALIGNMENT_AMENDMENT.md`) remains unchanged
   in meaning at the repair merge;
15. only then Issue #520 transitions to `CLOSED_CANONICAL / EFFECTIVE`;
16. only then a fresh T14 successor may be created (PR #519 remains
   permanently closed/unmerged and must not be recycled).

This is not a general CI retry policy and must never be cited as one.

## 7. Repair authority (conditional on section 9)

Implementation of a repair is authorized ONLY after this amendment is
effective, and ONLY the minimum proven necessary. Preferred order:

1. eliminate nondeterministic process/resource leakage;
2. fix deterministic cleanup/wait logic;
3. fix Windows-specific process lifecycle behavior if proven;
4. fix bounded test-harness behavior if proven (e.g. removing the
   full `node_modules` copy while preserving discovery semantics);
5. improve deterministic synchronization if proven.

A change of `60_000` to a larger timeout is NOT automatically
authorized. It is permitted only if diagnosis on the repair branch
proves the semantic operation is correct, deterministic, necessarily
exceeds the bound on the supported Windows runner, and the repair PR
explicitly justifies the new bound. Eliminating the delay cause is
preferred over widening the bound.

## 8. Explicit non-authorization

This recovery program does not authorize:

```text
closing Issue #520 before section 6 completes
marking the amendment EFFECTIVE on rerun evidence
T14 successor creation before Issue #520 is EFFECTIVE
rewriting run 35897969496 history or labels
representing any rerun as attempt-1 success
weakening the T054 assertion to make CI green
global timeout widening
test skipping or test deletion
Windows lane removal or Node 24 removal
unrelated production behavior change
UA-P04 or later implementation
evidence deletion, force-push, rebase of canonical history
donor source intake beyond existing pins
```

## 9. Recovery amendment admission gate

This amendment becomes effective only after all of the following:

1. explicit founder approval recorded for this recovery amendment;
2. this proposal PR is exact-head qualified (single-file diff proof);
3. Self Verification succeeds on the exact head (attempt 1);
4. Project CI succeeds across all six lanes on the exact head
   (attempt 1);
5. exact-head review passes with zero unresolved material findings
   (honest OCR limitation records where applicable);
6. unresolved review-thread count is zero;
7. canonical main remains the expected base immediately before merge;
8. guarded normal merge binds the exact approved head;
9. merge tree, ordered parents, verified signature, canonical main;
10. push-triggered post-merge Project CI succeeds on attempt 1;
11. Issue #522 closes as `CLOSED_CANONICAL / EFFECTIVE`.

Only then:

```text
RECOVERY_APPROVED = YES
RECOVERY_EFFECTIVE = YES
REPAIR_IMPLEMENTATION_AUTHORIZED = YES
```

Until then every flag in section 1 remains NO, and no repair branch
may be created.

## 10. Explicit non-expansion

This amendment does not authorize UA-P03-T15 or any later phase ahead
of T14 closure. It does not authorize a general test-editing policy.
A future incident needing its own path must seek its own bounded
amendment. This amendment is intentionally narrow: one preserved
failure, one diagnosis, one conditional repair, one path to Issue #520
effectiveness.

Refs #481
Refs #518
Refs #519
Refs #520
Refs #521
Refs #522
