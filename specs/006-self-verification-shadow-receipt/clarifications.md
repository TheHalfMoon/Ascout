# Spec 006 Clarifications — Self-Verification Shadow Receipt

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

## C1 — Why shadow first?

The measured gap is absence of Ascout-on-Ascout evidence, not evidence that a self-receipt is already reliable enough to gate merges. Spec 006 captures and validates truth first; any future gating decision needs separate measured evidence and authorization.

## C2 — What do B, H, M, and HT mean?

For one PR:

- `B` = exact event base-tip SHA;
- `H` = exact event head SHA;
- `M` = unique merge base computed from `B` and `H`;
- `HT` = exact tree SHA of `H`.

`B` is provenance for the target branch state seen by the workflow. `M` is the subject HEAD used to represent the pull-request change.

## C3 — Why not use event base tip B as subject HEAD?

The base branch can advance independently after the PR diverges. If `B` contains commits not in `H`, resetting the subject to `B` would make the reconstructed change include inversions/removals unrelated to the PR.

Using unique `M = git merge-base B H` represents the committed PR change as `M -> H` and avoids charging the PR for independent base-branch movement.

If no unique merge base can be proven, fail closed and replan rather than approximate.

## C4 — How is the subject reconstructed?

1. checkout and guard exact `H`;
2. prove clean tracked/index state and record `HT = H^{tree}`;
3. install/build exact verifier from `H`;
4. ensure build artifacts exist only in canonical ignored paths;
5. prove exact `B` and `H` are locally available;
6. compute all merge bases and require exactly one `M`;
7. perform ephemeral CI-only `git reset --soft M`;
8. prove `HEAD == M`;
9. prove `git write-tree == HT`;
10. prove no unstaged tracked divergence and no unrelated nonignored untracked files;
11. run the preserved exact `H` verifier.

A soft reset changes HEAD only, so additions/deletions/renames/content changes represented by `HT` stay exactly in the index/worktree.

## C5 — Why build the verifier from H?

The purpose is to qualify the proposed Ascout code. Base/merge-base Ascout would answer a different question. Exact verifier SHA/tree therefore live in the external envelope; `run.ascout_version` remains only a version label.

## C6 — What happens when the PR changes a command surface?

The workflow MUST NOT pass `--allow-changed-command-surface`. If Ascout refuses affected work and emits a valid incomplete receipt, that is useful shadow truth and is retained.

## C7 — Which exits are successful captures?

Valid receipt exits `0`, `1`, `3`, and `4` are observational capture success after schema/semantic validation and exit consistency proof. They are not rewritten.

Exit `2` without a valid receipt, malformed/no output, identity failure, validator failure, digest failure, or artifact failure is harness failure.

## C8 — Does a non-clean receipt fail the workflow?

No, not in Spec 006. Workflow green means trustworthy capture succeeded, not that the receipt verdict is clean. This distinction must be explicit in workflow naming/documentation and ledger closeout.

## C9 — What is the envelope?

A small JSON qualification record outside receipt v1. Planned fields:

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
  "receipt_sha256": "<64 lowercase hex>",
  "receipt_file": "self-verification-receipt.json"
}
```

It contains no repository URL/path, absolute path, actor/user, host, home, environment dump, token, credential, or arbitrary diagnostics.

## C10 — How are receipt bytes validated?

Capture exact stdout bytes, parse once, run exact head-built `validateReceiptJsonSchema` and `validateReceiptSemantics`, prove process exit equals `receipt.summary.exit_code`, then hash the exact retained bytes. Do not pretty-print or rewrite the receipt before hashing/upload.

## C11 — Where do harness outputs live?

Outside repository source identity, preferably under GitHub runner temp. Only `.ascout/`, `node_modules/`, `dist/`, `coverage/`, and other already-canonical ignored paths may remain inside the subject checkout as build/runtime artifacts.

## C12 — Artifact action and retention

Reviewed planning candidate: official GitHub `actions/upload-artifact`, MIT, release `v7.0.1`, exact commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`, Node 24 action runtime. Reverify before implementation and pin the full commit SHA. Retention: 30 days. Upload only receipt/envelope files. Workflow permissions: `contents: read` only.

## C13 — Is this local/offline?

No claim is made that GitHub Actions or artifact transport is offline. Ascout core remains local-first; this is optional repository qualification infrastructure.

## C14 — Does this change Project CI?

No. Preferred design is one separate Ubuntu 24.04 / Node 24 observational workflow. Existing six-lane Project CI remains the independent product qualification matrix.

## C15 — Does this authorize later M1.2/M2 work?

No. Selector shadow, historical corpus expansion, adversarial receipt mutation, trend aggregation, required gating, and all M2 capabilities remain separate future decisions.

## C16 — How can T107 tests run when Project CI tests before build?

Canonical Project CI executes `npm test` before `npm run build`, so focused T107 tests MUST NOT require a pre-existing repository `dist/` directory.

The T107 harness therefore MUST NOT import `dist/**` validators at module top level. The production execution path may load the exact head-built `dist/receipt/json.js` and `dist/receipt/model.js` validators lazily only when running real self-verification after the workflow has built `H`.

For focused Vitest contracts, the same harness validation adapter may receive the current source validator functions as explicit in-process dependencies from the TypeScript test environment. This is test-only dependency injection, not a CLI option, product API, runtime dependency, second validator, or alternate acceptance rule.

T108's live workflow is the mandatory end-to-end proof that the production harness actually loads and uses the exact `H`-built `dist` validators. If that built-dist path cannot be proven without widening the approved surfaces, stop and return to planning.