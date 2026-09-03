# Spec 006 Technical Plan — Self-Verification Shadow Receipt

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Canonical base:** `c8126773a63be744b121fbabc5e427600f671ae8`

## 1. Objective

Add one observational CI path that executes the exact pull-request-head Ascout build against the exact committed pull-request change and retains receipt evidence. No `src/**` product mutation is needed or allowed.

## 2. Planned implementation surfaces

### T107 — harness
- `benchmarks/self-verify.mjs`
- `tests/t107-self-verification-harness.contract.test.ts`

### T108 — workflow
- `.github/workflows/self-verify.yml`

### T109 — closeout
Ledger/governance reconciliation only by default.

No current Project CI, package/runtime dependency, receipt/schema, historical benchmark-result, release/tag/publication mutation.

## 3. Identity model

- `B` = exact GitHub event base-tip SHA;
- `H` = exact PR head SHA;
- `M` = unique merge base of `B` and `H`;
- `HT` = exact tree SHA `H^{tree}`;
- `V` = exact Ascout executable built from `H` before reconstruction.

`B` is provenance. `M` is the subject HEAD.

## 4. Required sequence

```text
checkout exact H with enough history
  -> prove HEAD == H
  -> prove clean tracked/index state
  -> record HT; prove git write-tree == HT
  -> npm ci --ignore-scripts --no-audit --no-fund
  -> npm run build
  -> prove no nonignored source drift
  -> prove B and H exist
  -> compute all merge-base candidates(B,H)
  -> require exactly one M
  -> git reset --soft M
  -> prove HEAD == M
  -> prove git write-tree == HT
  -> prove no unstaged tracked divergence
  -> prove no unrelated nonignored untracked files
  -> execute preserved V: check --format json
  -> capture exact stdout/stderr/exit
  -> current-schema + semantic validate receipt
  -> prove process exit == receipt.summary.exit_code
  -> hash exact receipt bytes
  -> emit privacy-safe envelope binding B/M/H/HT
  -> upload receipt/envelope with bounded retention
```

Absent or multiple merge-base results fail closed. Do not choose heuristically and do not substitute `B`.

## 5. Why merge base

The event base-tip SHA is the target branch tip at event time and may contain commits not in `H`. The committed PR change is represented from the best common ancestor. Using `M -> H` avoids treating independent base-branch movement as PR change.

## 6. Harness interface

Repository-internal qualification tool, not an Ascout command:

```text
node benchmarks/self-verify.mjs \
  --event-base-sha <B> \
  --head-sha <H> \
  --output-dir <runner-temp>
```

Production verifier is the exact pre-reconstruction head-built `dist/cli.js`.

## 7. Pre-reconstruction proof

Before reset:

1. `HEAD == H`;
2. `H^{tree} == HT`;
3. `git write-tree == HT`;
4. no staged/unstaged tracked drift;
5. no unrelated nonignored untracked file;
6. ignored build/install material is allowed only under existing ignore policy.

## 8. Merge-base proof

Resolve `B^{commit}` and `H^{commit}`. Compute Git-native best common ancestors and require exactly one commit `M`. Preserve `B` in the envelope even when `B != M`. No `B is ancestor of H` requirement is allowed.

## 9. Reconstruction proof

After `git reset --soft M`:

- `HEAD == M`;
- `git write-tree == HT`;
- worktree/index have no unstaged tracked difference;
- unrelated nonignored untracked set is empty.

The staged state then represents exact `M -> HT` through Ascout's existing `working_tree_vs_head` model without a new product PR-range mode.

## 10. Verifier execution

Execute only `V` built from exact `H`; never rebuild after HEAD moves to `M`. Never pass `--allow-changed-command-surface`.

## 11. Receipt validation

Capture exact stdout bytes. Parse one JSON receipt, run exact head-built `validateReceiptJsonSchema` and semantic validation, require `process exit == receipt.summary.exit_code`, require receipt source start HEAD to equal `M`, retain exact bytes, then compute SHA-256 over those bytes.

Valid exits `0/1/3/4` are shadow capture success. Exit `2` without a valid receipt, malformed output, validator rejection, identity mismatch, digest mismatch, or artifact failure is capture failure.

## 12. Envelope v1

```json
{
  "schema_version": 1,
  "classification": "SHADOW_NON_GATING",
  "verifier_head_sha": "<H>",
  "verifier_head_tree_sha": "<HT>",
  "event_base_tip_sha": "<B>",
  "subject_merge_base_sha": "<M>",
  "subject_target_head_sha": "<H>",
  "subject_target_tree_sha": "<HT>",
  "receipt_exit_code": 4,
  "receipt_sha256": "<sha256 exact receipt bytes>",
  "receipt_file": "self-verification-receipt.json"
}
```

No repository/run URL, raw/absolute path, actor/user, hostname, home, environment dump, credential, token, or arbitrary diagnostics.

## 13. Workflow design

New `.github/workflows/self-verify.yml` only:

- trigger `pull_request`;
- `permissions: contents: read`;
- Ubuntu 24.04 / Node 24;
- checkout exact `H` with history sufficient for `B` and merge-base resolution;
- exact-head guard;
- setup Node;
- exact `npm ci`;
- build exact `H`;
- invoke T107 harness with event `B` and `H`;
- upload only receipt/envelope;
- `if-no-files-found: error`;
- `retention-days: 30`.

Workflow green means capture integrity, never a clean receipt verdict.

## 14. Artifact dependency

Planning-reviewed candidate: official `actions/upload-artifact`, MIT, `v7.0.1`, exact commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`, Node 24 action runtime. Reverify before implementation and use full SHA only.

## 15. Focused T107 proof

Required cases include:

1. exact-H clean precondition;
2. wrong H rejection;
3. missing B rejection;
4. simple `B == M` case;
5. advanced base-tip case `B != M`, proving subject uses M;
6. multiple merge-base ambiguity rejection;
7. soft reset proves `HEAD == M` and `write-tree == HT`;
8. added/deleted/renamed/content-change identity;
9. pre/post tracked drift rejection;
10. unrelated nonignored untracked rejection;
11. ignored build/install paths allowed;
12. valid exits 0/1/3/4 retained without rewriting;
13. process/receipt exit mismatch rejection;
14. malformed/schema-invalid/semantic-invalid/no-receipt rejection;
15. exact receipt digest;
16. envelope allowlist/privacy and B/M/H/HT binding;
17. executed argv lacks changed-command admission.

T108 additionally requires real exact-head workflow artifact proof.

## 16. Ordering and qualification

`T107 -> T108 -> T109`

T107/T108 each require exact predecessor main, exact path purity, focused/full proof, six-lane Project CI on exact head, fresh independent substantive review, zero material threads, guarded expected-head merge, and post-merge parent/tree/signature/PR/main verification.

T108 additionally requires the new live self-verification workflow artifact on its exact final head.

## 17. Stop conditions

Return to planning rather than widening scope if implementation cannot prove exact B/H availability, unique M, exact HT preservation, exact H verifier identity, current-validator acceptance, exit consistency, no auto-admission, least-privilege bounded artifact upload, and zero product-core mutation.

Do not add product PR-range mode, receipt fields, trust bypass, second validator, generalized workflow infrastructure, or write permissions as a workaround.

## 18. Authorization

Planning merge does not authorize implementation. A separate durable implementation authorization must bind the exact planning merge and T107–T109 boundaries.