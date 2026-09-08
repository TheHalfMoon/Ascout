# Spec 010 Technical Plan — Selector Shadow Verification

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #261
**Canonical base:** `ec78d0225f66390ad45804fb122b6d51c4f6980f`

## 1. Objective

Add one bounded same-repository selector-shadow measurement to the existing Spec 006 self-verification path without changing Ascout product behavior.

The measurement compares exact full-suite failed test identities against exact test-finding identities already present in the validated self-verification receipt and publishes every unmatched full-suite identity as a non-gating selector miss.

## 2. Planned implementation surfaces

### T117 — Comparator/harness

Exactly:

- `benchmarks/selector-shadow.mjs` — new repository-internal selector-shadow harness;
- `tests/t117-selector-shadow.contract.test.ts` — new focused deterministic contracts.

### T118 — Workflow integration

Exactly:

- `.github/workflows/self-verify.yml` — add the T117 invocation, set the prospectively frozen end-to-end job timeout, and upload the additional observation artifact.

### T119 — Reconciliation

Ledger/governance only by default. No tracked repository mutation is planned.

No `src/**`, Receipt v1, package/dependency, selector, historical-result, Spec 007, Project CI, release, tag, or publication mutation.

## 3. Input contract

T117 CLI candidate:

```text
node benchmarks/selector-shadow.mjs \
  --receipt <absolute path to self-verification-receipt.json> \
  --envelope <absolute path to self-verification-envelope.json> \
  --output <absolute new file outside repository>
```

The CLI operates with `cwd` at the reconstructed Ascout subject repository after successful Spec 006 capture.

Inputs are exact files produced by the immediately preceding self-verification step in the same job.

## 4. Self-verification input verification

Before reference execution:

1. read envelope JSON;
2. require current schema/classification expected from Spec 006 (`schema_version == 1`, `classification == "SHADOW_NON_GATING"`);
3. require full lowercase Git object IDs for B/M/H/HT fields;
4. read exact receipt bytes;
5. compute SHA-256 over exact receipt bytes;
6. require equality with `envelope.receipt_sha256`;
7. parse the receipt JSON;
8. require `receipt.summary.exit_code == envelope.receipt_exit_code`;
9. require current repository `HEAD == envelope.subject_merge_base_sha`;
10. require current `git write-tree == envelope.subject_target_tree_sha`;
11. require no unstaged tracked change;
12. require no nonignored untracked file.

T117 does not rerun the Receipt v1 JSON Schema/semantic validators. Spec 006 already performed those validations before publication; T117 proves it is consuming the exact bound published bytes rather than a replacement.

If any check fails, T117 terminates as harness-integrity failure without publishing selector conclusions.

## 5. Comparable Ascout test-task gate

From the bound receipt:

- require exactly one task where `task_type == "test"`;
- require `execution_admission == "normal"`;
- require `command_surface_changed == false`;
- require task status in `PASS | FAIL | FLAKY`;
- require non-empty `task_id`;
- require the receipt selection mode is not `no_test_task`.

If exactly one test task exists but it is `BLOCKED`, `ERROR`, `NOT_RUN`, `NOT_APPLICABLE`, admission-refused, or command-surface changed, emit an `UNAVAILABLE` observation without running the full suite.

If test-task identity is missing/ambiguous or receipt structure is insufficient to interpret safely, fail harness integrity rather than invent a comparison.

## 6. Full-suite command authority

T117 is intentionally Ascout-repository-specific.

Before launch:

1. read root `package.json`;
2. require `scripts.test` equals exactly `vitest run`;
3. require local `node_modules/.bin/vitest` resolves to a file/executable path inside the current repository's `node_modules` tree;
4. read local `node_modules/vitest/package.json` and require a non-empty version string;
5. do not invoke npm install, npm exec, npx, Corepack, network, shell expansion, or package-script execution.

The reference argv is fixed conceptually as:

```text
<local vitest binary> run --reporter=json --outputFile=<ephemeral json path>
```

The output path is under a private temporary directory outside repository source identity.

If the root test script no longer equals `vitest run` or expected local runtime cannot be proven, emit `UNAVAILABLE_FULL_SUITE_CONTRACT` without running an alternate command.

## 7. Bounded reference execution and end-to-end budget

T117 uses one fixed full-suite process with:

- `shell: false`;
- inherited current trusted same-repository CI environment;
- no secret persistence;
- ignored stdout/stderr or bounded in-memory diagnostics only; no raw output in artifact;
- exact `10 minute` reference timeout;
- reliable exit/signal/spawn classification;
- process-group termination on the supported live Ubuntu lane when timeout occurs;
- no retry.

T118 MUST change the existing `self-verify` job from `timeout-minutes: 30` to exactly `timeout-minutes: 60`. The prospective end-to-end budget is frozen before live observation:

```text
checkout + setup + exact install/build + artifact publication reserve = 20 minutes
existing Spec 006 self-verification allowance                         = 20 minutes
T117 full-suite reference timeout                                     = 10 minutes
contingency / orderly cleanup reserve                                 = 10 minutes
TOTAL                                                                 = 60 minutes
```

Neither the 60-minute job timeout nor the 10-minute reference timeout may be increased after observing a T118 live result. A need to exceed either bound is `NO_GO / RETURN_TO_PLANNING`, not permission to retry or widen the budget.

A normal numeric Vitest exit, including nonzero due test failures, is a completed runner observation only if valid structured JSON was produced and parsed.

Timeout/spawn failure/missing report/malformed report is `UNAVAILABLE_FULL_SUITE_EXECUTION` and does not create selector misses.

## 8. Structured Vitest report validation

Require parsed JSON object with `testResults` array.

For each `testResults[]` entry relevant to failure extraction:

- `name` must be a non-empty path;
- normalize only by converting a proven repository-contained absolute/current-worktree path to repository-relative slash form;
- reject path escape, outside-repository path, NUL, or ambiguous path mapping;
- `assertionResults` must be an array when failures are claimed;
- each failed assertion used as evidence must have `status == "failed"` and non-empty `fullName` without NUL.

The full-suite failure identity is exact:

```text
{ path: <repository-relative test path>, test_id: <fullName> }
```

Sort by path then test ID using deterministic code-unit ordering and deduplicate exact duplicates.

If the runner exits nonzero but no trustworthy structured failed identity can be established, the comparison is unavailable rather than treating the exit itself as a selector miss.

## 9. Ascout failure identity extraction

From the validated bound receipt:

1. select findings where `finding.task_id == A.task_id`;
2. require comparable test findings used for matching to have non-empty receipt-valid repository-relative `path` and non-empty `rule_or_test_id`;
3. map exactly to `{ path, test_id: rule_or_test_id }`;
4. deterministic sort/deduplicate.

If a full-suite failure exists but the receipt contains a test-task failure state with malformed/ambiguous finding identities that prevent complete matching, classify the comparison unavailable rather than assuming capture or miss.

No message-text matching or fingerprint use.

## 10. Exact comparison

When both sides are comparable:

```text
full_failed = exact set of F failed identities
ascout_failed = exact set of A receipt failure identities
matched = full_failed INTERSECT ascout_failed
selector_misses = full_failed MINUS ascout_failed
```

Disposition:

- `NO_FULL_SUITE_FAILURES` — valid full suite contains zero failed identities;
- `FULL_SUITE_FAILURES_CAPTURED` — failed identities exist and selector_misses is empty;
- `SELECTOR_MISSES_OBSERVED` — selector_misses is non-empty;
- `UNAVAILABLE` — comparison cannot be established safely.

A `SELECTOR_MISSES_OBSERVED` result is a successful shadow measurement and does not make the harness fail merely because misses exist.

## 11. Source stability after reference

After Vitest exits and before publishing a comparable observation:

- require `HEAD == M`;
- require `git write-tree == HT`;
- require no unstaged tracked changes;
- require no nonignored untracked files.

Drift produces `UNAVAILABLE_SOURCE_DRIFT`; no miss/pass conclusion is published from the run.

Ignored `node_modules/`, `dist/`, `coverage/`, and `.ascout/` remain governed by existing repository semantics and are not treated as source truth.

## 12. Observation schema

One new external qualification artifact, not Receipt v1:

```json
{
  "schema_version": 1,
  "classification": "SELECTOR_SHADOW_NON_GATING",
  "source": {
    "event_base_tip_sha": "<B>",
    "subject_merge_base_sha": "<M>",
    "subject_target_head_sha": "<H>",
    "subject_target_tree_sha": "<HT>",
    "receipt_sha256": "<RD>"
  },
  "ascout_test_task": {
    "task_id": "<id>",
    "status": "PASS|FAIL|FLAKY",
    "duration_ms": 0,
    "selection_mode": "<mode>",
    "selected_test_count": null,
    "deselected_test_count": null,
    "total_test_count": null,
    "widened": false,
    "widen_triggers": []
  },
  "full_suite": {
    "runner": "vitest",
    "runner_version": "<version>",
    "duration_ms": 0,
    "failed_test_count": 0
  },
  "comparison": {
    "available": true,
    "disposition": "NO_FULL_SUITE_FAILURES|FULL_SUITE_FAILURES_CAPTURED|SELECTOR_MISSES_OBSERVED",
    "reason_code": null,
    "reason_text": null,
    "full_suite_failed": [],
    "ascout_failed": [],
    "matched": [],
    "selector_misses": []
  }
}
```

Unavailable observations keep the same root identity/classification but set:

```text
comparison.available = false
comparison.disposition = UNAVAILABLE
comparison.reason_code = non-empty
comparison.reason_text = non-empty
```

Fields that were not reliably observed remain `null`/empty as specified by the implementation contract; they are not fabricated.

## 13. Output privacy and boundedness

The artifact contains only:

- full object IDs already used by self-verification;
- receipt digest;
- task/selection facts from receipt;
- Vitest version;
- durations/counts;
- repository-relative test paths;
- test IDs;
- bounded reason codes/text.

It excludes raw repository URL, absolute paths, actor/user, host, HOME, environment, token/credential material, full stdout/stderr, stack traces, arbitrary test messages, and GitHub run URLs.

The output is written atomically to one new file outside repository source identity with size bounded by the number of test identities in the structured report. No retention beyond the existing workflow artifact retention is introduced.

## 14. T117 focused contracts

Required deterministic proof includes:

- valid envelope + exact receipt digest;
- receipt replacement/digest mismatch rejection;
- wrong M/HT subject rejection;
- tracked/untracked contamination rejection;
- exactly one comparable test task requirement;
- PASS/FAIL/FLAKY accepted comparison states;
- BLOCKED/ERROR/NOT_RUN/NOT_APPLICABLE unavailable without reference execution;
- admission-refused/changed-command-surface unavailable without reference execution;
- exact `scripts.test == "vitest run"` requirement;
- missing/changed script unavailable without alternate command;
- no implicit install/npm-exec/npx path;
- exact 10-minute reference timeout and no-retry policy;
- bounded timeout/spawn/report failure unavailable;
- valid Vitest JSON full-suite failure extraction;
- outside-repository path rejection;
- NUL/empty/ambiguous test identity rejection;
- exact path+test-id matching;
- same test name in different paths does not match;
- full failure absent from Ascout findings => miss;
- full failure present in Ascout findings => captured;
- full suite no failures => no miss observed;
- nonzero process exit without structured failed identity => unavailable;
- post-run source drift => unavailable;
- deterministic sorting/deduplication;
- bounded privacy-safe output;
- observed miss does not change harness success classification.

The test file may inject process/Git/filesystem adapters into internal exported helpers. It must not require a real full-suite run inside Project CI.

## 15. T118 workflow integration

Modify only `.github/workflows/self-verify.yml` after T117 is canonical.

The eligible same-repository job sequence becomes:

```text
existing exact-head checkout/install/build
  -> existing Spec 006 self-verification capture
  -> T117 selector-shadow observation using exact captured receipt/envelope
  -> upload exact three artifacts
```

T118 changes the existing job timeout only from `30` to the pre-authorized `60` minutes. It must not alter the frozen 60-minute budget after observing live behavior.

Artifact upload paths:

- existing `self-verification-receipt.json`;
- existing `self-verification-envelope.json`;
- new `selector-shadow-observation.json`.

Keep:

- `pull_request` trigger;
- same-repository job predicate;
- `permissions: contents: read`;
- Ubuntu 24.04 / Node 24;
- current exact-SHA checkout/setup/upload actions;
- 30-day retention;
- `if-no-files-found: error`.

No new action, permission, secret, fork path, or workflow is added.

## 16. First live observation

T118 cannot close based on static YAML alone. The exact final T118 PR head must produce a downloadable selector-shadow artifact in the eligible same-repository workflow run **within the frozen 60-minute job budget**, with the selector-shadow full-suite reference independently bounded to 10 minutes.

The live artifact must prove:

- exact final head binding through the existing self-verification envelope;
- valid selector-shadow schema/classification;
- one explicit comparison disposition;
- no fabricated missing facts;
- bounded/privacy-safe content;
- no workflow source drift;
- observed selector misses, if any, remain non-gating and are published exactly.

If the first observation is unavailable because the plan's frozen assumptions or timeout budget are wrong, stop and return to planning rather than patching around, rerunning, or increasing the budget after the evidence.

## 17. Task ordering and qualification

`T117 -> T118 -> T119`

For T117 and T118:

1. start from exact current canonical `main` after predecessor closeout;
2. use one task-scoped branch/PR;
3. keep exact authorized path scope;
4. run focused proof as applicable;
5. run exact-head Self Verification and six-lane Project CI;
6. obtain fresh independent substantive exact-head review;
7. resolve every material finding with forward commits only;
8. re-run/re-review the new exact head after mutation as governance requires, without reinterpreting consumed original-attempt evidence;
9. prove zero unresolved material review threads;
10. reverify rulesets/observable protection and unchanged canonical base;
11. guarded expected-head normal merge;
12. verify ordered parents, tree, GitHub signature, PR merged/closed state, and canonical main;
13. durably close the task ledger before the successor.

T118 additionally requires proof that the exact final workflow has `timeout-minutes: 60`, that T117's reference timeout is exactly 10 minutes, and that the live exact-head selector-shadow artifact was published before the job completed successfully.

## 18. T119 closeout

T119 is governance/ledger only by default. It records:

- T117/T118 canonical identities;
- first live observation disposition and exact artifact/run binding;
- any observed selector misses or unavailable reasons without inventing thresholds;
- immutable historical T078/T091 status;
- no selector/product/receipt mutation;
- next-frontier decision.

If all Spec 010 acceptance criteria are proven:

`T119 = CLOSED_CANONICAL`

`SPEC_010 = CLOSED_CANONICAL / GO`

Otherwise record `NO_GO` and return to planning.

## 19. Stop conditions

Return to planning if implementation requires any of:

- product selector/schema/receipt changes;
- command-surface auto-admission;
- generic runner adapter architecture;
- new dependency/action/workflow/permission;
- Project CI API correlation;
- untrusted/fork execution;
- fuzzy failure identity;
- stdout/stderr inference;
- historical benchmark mutation;
- Spec 007 reopening;
- threshold invention;
- new telemetry/trend service;
- unsupported alternate test command;
- source drift suppression;
- increasing the frozen 60-minute T118 job timeout or 10-minute T117 reference timeout after live evidence.

## 20. Authorization

This plan is not implementation authority. A separate durable implementation authorization must bind the exact canonical planning merge, T117–T119 order, and exact file boundaries before T117 mutation.