# Spec 006 Technical Plan — Self-Verification Shadow Receipt

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Canonical base:** `c8126773a63be744b121fbabc5e427600f671ae8`

## 1. Design objective

Add one observational CI path that executes the exact pull-request-head Ascout build against an exact reconstruction of that same pull-request change and retains the resulting receipt plus an external identity envelope.

No `src/**` product behavior changes are needed or allowed.

## 2. Planned implementation surfaces

### T107 — Self-verification harness

Product-core mutation: none.

Authorized candidate surfaces:

- `benchmarks/self-verify.mjs` — new repository-local CI/benchmark harness;
- `tests/t107-self-verification-harness.contract.test.ts` — focused contract tests.

No existing benchmark result file is modified.

### T108 — Shadow workflow

Authorized candidate surface:

- `.github/workflows/self-verify.yml` — new workflow only.

No modification to `.github/workflows/ci.yml` is planned.

### T109 — Canonical observation closeout

No product/code mutation is planned. T109 is a durable ledger closeout after T108's exact-head workflow produces a valid retained self-verification artifact and all qualification gates are reconciled.

If closeout requires repository mutation beyond issue comments/governance records, planning must be amended prospectively before mutation.

## 3. Self-verification state model

Let:

- `B` = exact pull-request base SHA from the GitHub event;
- `H` = exact pull-request head SHA from the GitHub event;
- `HT` = exact tree SHA of `H`;
- `V` = Ascout executable built from exact `H` before reconstruction.

Required sequence:

```text
checkout H
  -> prove HEAD == H
  -> prove clean tracked checkout/index
  -> record HT = H^{tree}
  -> npm ci --ignore-scripts --no-audit --no-fund
  -> npm run build
  -> prove build/install created no nonignored source drift
  -> verify B exists and is the declared PR base
  -> git reset --soft B
  -> prove HEAD == B
  -> prove git write-tree == HT
  -> prove no unstaged tracked divergence
  -> prove no unrelated nonignored untracked files
  -> execute V: ascout check --format json
  -> capture stdout/stderr/exit
  -> parse + current-schema validate + semantic validate receipt
  -> prove process exit == receipt summary exit
  -> hash exact receipt bytes
  -> write qualification envelope
  -> upload receipt + envelope with bounded retention
```

`git reset --soft` is used only in the ephemeral CI workspace. It moves HEAD but preserves the exact target index/worktree tree, allowing exact equality proof with `HT`.

## 4. Harness interface

`benchmarks/self-verify.mjs` is a repository-internal qualification tool, not a user-facing Ascout command.

Preferred invocation:

```text
node benchmarks/self-verify.mjs \
  --base-sha <B> \
  --head-sha <H> \
  --output-dir <runner-temp-path>
```

The harness may accept an explicit verifier entry path when needed for tests, but production workflow must point only to the exact head-built `dist/cli.js`.

No repository-relative output is required; output should live under `runner.temp` so receipt/envelope files do not enter Ascout's subject source identity.

## 5. Pre-reconstruction checks

Before any reset:

1. `git rev-parse HEAD` equals `H` exactly;
2. `git rev-parse H^{tree}` resolves to `HT`;
3. `git write-tree` equals `HT`;
4. no staged or unstaged tracked changes exist;
5. no nonignored untracked files exist;
6. ignored build/install paths may exist and do not participate in source identity.

If any check fails, the harness stops before Ascout execution.

## 6. Base availability and relationship

The workflow checkout must fetch enough history for `B` and `H` to resolve locally.

Before reconstruction:

- `git cat-file -e B^{commit}` must succeed;
- the event-provided base/head values must match guarded checkout inputs;
- `git merge-base --is-ancestor B H` must succeed for the normal pull-request case.

If the declared Git relationship cannot be proven, stop rather than invent a diff.

## 7. Reconstruction proof

After `git reset --soft B`:

- `git rev-parse HEAD == B`;
- `git write-tree == HT`;
- `git diff --quiet` reports no unstaged tracked difference between working tree and index;
- repository nonignored untracked set is empty;
- `git diff --cached --binary B` is therefore the tracked `B -> HT` change represented to Ascout.

The harness does not need to parse or persist the diff bytes to prove target-tree identity.

## 8. Verifier execution

The verifier must be the exact pre-reconstruction build from `H`.

The harness executes:

```text
node dist/cli.js check --format json
```

or an equivalent explicit absolute/contained path to that same ignored head-built output.

It MUST NOT pass `--allow-changed-command-surface`.

Execution inherits the normal bounded Ascout check behavior. Spec 006 does not add a second timeout/process-management layer except a conservative outer harness ceiling preventing a hung qualification job from becoming unbounded.

## 9. Output capture

Capture stdout and stderr separately.

For a valid receipt-producing run:

- exact stdout bytes become `self-verification-receipt.json`;
- stderr may be retained only in bounded/redacted diagnostic form when necessary for harness failure debugging;
- stdout is parsed only after process completion;
- the retained receipt bytes are not pretty-printed or rewritten.

The harness must not append explanatory text to receipt stdout.

## 10. Validation

Use exact head-built current validators from `dist`:

- JSON Schema validator;
- semantic receipt validator.

The harness checks:

- stdout parses to one JSON receipt;
- current JSON Schema accepts it;
- semantic validation accepts it;
- receipt summary exit code is an integer in canonical range;
- process exit equals receipt summary exit;
- receipt source start HEAD equals `B`;
- receipt source start/end stability semantics remain internally valid under existing validators.

The harness does not add new product validation rules.

## 11. Shadow classification

A valid receipt with exit `0`, `1`, `3`, or `4` is a successful **capture**.

The envelope records the exact exit code. The workflow remains green because capture integrity succeeded, not because the repository receipt was clean.

Exit `2`/no valid receipt, malformed output, validator rejection, identity mismatch, or artifact failure causes harness/workflow failure.

This is deliberately different from product receipt success.

## 12. Envelope contract

Planned envelope v1:

```json
{
  "schema_version": 1,
  "classification": "SHADOW_NON_GATING",
  "verifier_head_sha": "<H>",
  "verifier_head_tree_sha": "<HT>",
  "subject_base_sha": "<B>",
  "subject_target_head_sha": "<H>",
  "subject_target_tree_sha": "<HT>",
  "receipt_exit_code": 4,
  "receipt_sha256": "<sha256 exact receipt bytes>",
  "receipt_file": "self-verification-receipt.json"
}
```

The envelope contains no run URL, repository URL, absolute path, actor/user identity, hostname, environment dump, credential, token, or secret.

Stable key ordering is required for deterministic readability but envelope byte digest is not a product contract in Spec 006.

## 13. Workflow design

New workflow: `.github/workflows/self-verify.yml`

Trigger:

```yaml
on:
  pull_request:
```

Permissions:

```yaml
permissions:
  contents: read
```

Initial environment:

- `ubuntu-24.04`
- Node `24`

Required steps:

1. checkout exact PR head with enough history for base commit;
2. exact-head guard;
3. setup Node 24;
4. `npm ci --ignore-scripts --no-audit --no-fund`;
5. `npm run build`;
6. run self-verification harness using exact event base/head SHA;
7. upload exact receipt/envelope artifact with `retention-days: 30` and `if-no-files-found: error`.

No repository write permission, comment permission, PR mutation, cache write beyond existing setup-node behavior, secret injection, or changed-command admission.

## 14. Artifact action review

Candidate action:

- repository: `actions/upload-artifact`;
- owner: GitHub `actions` organization;
- license: MIT;
- reviewed release: `v7.0.1`;
- exact commit: `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`;
- action runtime: Node 24;
- relevant inputs: `path`, `if-no-files-found`, `retention-days`;
- output archive is stored in GitHub Actions artifact storage.

Implementation authorization must reverify this exact ref/repository/license and use the full SHA, not a floating `@v7` tag.

Only generated receipt/envelope files are uploaded. `include-hidden-files` remains false/default.

## 15. Test design

Focused harness tests use temporary local Git repositories and controlled fake verifier entry points where necessary.

Required cases:

1. exact `H` clean precondition succeeds;
2. wrong declared `H` fails before reset;
3. missing/non-ancestor base fails;
4. soft reset yields `HEAD == B` and `write-tree == HT`;
5. added file remains represented through index tree;
6. deleted file remains represented;
7. rename/content change remains represented;
8. unstaged tracked drift before/after reconstruction fails;
9. nonignored unrelated untracked file fails;
10. ignored `dist/`/`node_modules/` do not contaminate source identity proof;
11. fake valid receipt exit 0 capture succeeds;
12. fake valid receipt exit 1 capture succeeds and remains shadow/non-gating;
13. fake valid receipt exit 3 capture succeeds and remains shadow/non-gating;
14. fake valid receipt exit 4 capture succeeds and remains shadow/non-gating;
15. process exit/receipt exit mismatch fails;
16. malformed JSON fails;
17. schema-invalid receipt fails;
18. semantic-invalid receipt fails;
19. no receipt / exit 2 fails;
20. receipt SHA-256 equals exact retained bytes;
21. envelope contains only allowlisted privacy-safe keys;
22. no automatic changed-command admission appears in executed argv.

The implementation PR must additionally prove the real head-built Ascout path end-to-end in the new workflow; focused fake-verifier tests alone are insufficient.

## 16. Task ordering

```text
T107 harness + focused contracts
  -> exact-head CI/review/merge/closeout
  -> T108 workflow integration
  -> exact-head Project CI + live self-verification workflow artifact + review/merge/closeout
  -> T109 canonical observation reconciliation
  -> SPEC_006 closeout decision
```

T108 cannot begin until T107 is `CLOSED_CANONICAL`.

## 17. Security/privacy

- trusted repository only;
- no secrets required;
- no write token required;
- no automatic admission;
- no raw path/repository locator in envelope;
- stdout receipt already uses Ascout privacy rules;
- artifact upload is explicit and limited to two generated files;
- artifact retention bounded to 30 days;
- no claim of child-process network isolation.

## 18. License/provenance

No donor product code is imported.

The only planned new executable workflow dependency is official `actions/upload-artifact` under MIT, full-SHA pinned after revalidation.

Existing `actions/checkout` and `actions/setup-node` are already used by canonical Project CI; Spec 006 does not broaden their conceptual role beyond checkout/runtime setup.

## 19. Compatibility

- receipt schema stays `1.0`;
- no product CLI change;
- no package/runtime dependency change;
- no `src/**` mutation;
- Project CI remains independently unchanged;
- self-verification is additive repository CI evidence only.

## 20. Stop conditions

Stop `NO_GO` and return to planning if implementation cannot prove any of:

- exact base/head/tree reconstruction;
- exact head-built verifier identity;
- current-validator acceptance of captured real receipt;
- process-exit/receipt-exit consistency;
- no automatic admission;
- least-privilege artifact upload;
- no product-core mutation.

Do not add a product PR-range mode, receipt field, trust bypass, second validator, or workflow write permission as a workaround.