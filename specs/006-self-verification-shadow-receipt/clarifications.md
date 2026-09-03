# Spec 006 Clarifications — Self-Verification Shadow Receipt

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

## C1 — Why shadow first instead of a required gate?

The measured gap is absence of Ascout-on-Ascout evidence, not evidence that a self-receipt is already reliable enough to gate merges. Spec 006 therefore captures and validates receipt truth without making repository verdicts merge-authoritative.

A later gate decision requires observed data from real pull requests and separate canonical authorization.

## C2 — What source state does Ascout verify?

For a pull request with exact base `B` and exact head `H`:

1. checkout and guard exact `H`;
2. install/build the verifier from `H`;
3. preserve the head-built verifier output;
4. reconstruct the same checkout so Git `HEAD == B` while the working tree retains `H` content;
5. run the preserved head-built verifier against that working tree.

This matches Ascout's existing `working_tree_vs_head` contract without adding a PR-range mode to product core.

The harness MUST fail closed if it cannot prove `B`/`H` identities or if reconstruction introduces unrelated nonignored source material.

## C3 — Why is the verifier built from H rather than B?

The purpose is to qualify the exact Ascout code proposed by the pull request. Running base Ascout would answer a different question.

Receipt v1 intentionally does not gain a verifier-source field in Spec 006. Exact verifier SHA lives in the separate qualification envelope.

## C4 — Does `run.ascout_version` identify the verifier commit?

No. `ascout_version` remains a product-version label and may not distinguish repository commits. The qualification envelope binds the exact verifier head SHA externally. No receipt revision/negotiation field is introduced.

## C5 — What happens when the PR changes a command surface?

The automation MUST NOT pass `--allow-changed-command-surface` automatically.

If Ascout refuses affected execution and emits a valid incomplete receipt, that receipt is the correct shadow observation and is retained. The workflow remains non-gating during Spec 006.

No workflow, agent instruction, prior receipt, or repository config may manufacture human admission.

## C6 — Which Ascout exits are acceptable shadow observations?

Receipt-producing exits are data, not workflow-success semantics.

Expected receipt-producing outcomes may include:

- `0` clean/stable/complete;
- `1` repository finding/flake;
- `3` source drift when no higher-precedence error applies;
- `4` stable materially incomplete/gapped.

The harness validates the emitted receipt and verifies that the process exit agrees with the receipt's canonical summary exit.

An invocation that does not emit a valid receipt, including an internal/config/integrity exit `2`, is a self-verification execution failure. The harness records bounded diagnostics and fails the self-verification job; it MUST NOT fabricate receipt JSON.

## C7 — Does a non-clean valid shadow receipt fail the workflow?

No. Spec 006 is explicitly `SHADOW_NON_GATING` for receipt verdicts.

The workflow fails only when it cannot establish trustworthy self-verification evidence: bootstrap/identity/reconstruction/execution/output/schema/semantic/digest/artifact failure.

This distinction prevents both false green and premature policy enforcement.

## C8 — How is the subject reconstructed without a second repository clone?

Preferred minimal design:

- use the ordinary pull-request checkout with sufficient history for exact base `B`;
- run `npm ci` and `npm run build` at exact `H`;
- leave ignored `node_modules/` and `dist/` in place;
- perform a non-destructive-to-history, CI-ephemeral `git reset --mixed B` so tracked/untracked/deleted working-tree content continues to represent `H` relative to `B`;
- prove `git rev-parse HEAD == B` before invoking Ascout.

This is allowed only inside the ephemeral self-verification CI job. It MUST NOT force-push, rewrite shared history, or mutate the user's local repository.

If implementation evidence shows that this reconstruction does not faithfully represent all required Git change kinds, stop and replan rather than silently weaken the identity claim.

## C9 — What files may remain from verifier build/install?

Only files already excluded by canonical source identity may remain, principally canonical ignored `node_modules/`, `dist/`, `.ascout/`, and `coverage/` paths.

The harness MUST check that it did not create unrelated nonignored files before Ascout observation.

## C10 — What is the qualification envelope?

A small JSON file outside receipt v1, conceptually:

```json
{
  "schema_version": 1,
  "classification": "SHADOW_NON_GATING",
  "verifier_head_sha": "<git object id>",
  "subject_base_sha": "<git object id>",
  "subject_target_head_sha": "<git object id>",
  "receipt_exit_code": 4,
  "receipt_sha256": "<64 lowercase hex>",
  "receipt_file": "self-verification-receipt.json"
}
```

Exact field names may be finalized in planning, but the envelope MUST stay outside product receipt truth and contain no raw repository locator or machine/user secret material.

## C11 — How are receipt bytes validated?

The exact head-built validator implementation is used. The harness MUST:

1. capture stdout bytes to the receipt file without semantic rewriting;
2. parse JSON;
3. run current JSON Schema validation;
4. run current semantic validation;
5. confirm process exit equals receipt summary exit;
6. compute SHA-256 over the exact retained receipt bytes;
7. write the envelope only after validation succeeds.

## C12 — How long are artifacts retained?

Spec 006 uses bounded CI retention, initially **30 days**, unless implementation-time repository policy requires a lower supported value. This is enough for shadow measurement without creating indefinite evidence storage.

A future release-qualification retention policy is separate work.

## C13 — Which artifact action is allowed?

The reviewed candidate is GitHub's official `actions/upload-artifact`, MIT-licensed.

At planning time, current public release `v7.0.1` resolves to commit:

`043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`

Implementation, if authorized, MUST use a full commit SHA rather than a mutable major tag and MUST reverify that exact commit/repository/license immediately before mutation.

The action receives only the explicitly generated receipt/envelope files. Hidden-file upload is unnecessary. Workflow permissions remain `contents: read`; no repository write permission is justified.

## C14 — Is artifact transport offline/local-first?

No. The core product remains local-first. The optional repository CI workflow runs on GitHub-hosted infrastructure and uploads CI artifacts to GitHub. This MUST be described as CI qualification evidence, not as a property or requirement of Ascout core.

## C15 — Does this change Project CI?

Preferred design is a separate self-verification workflow so the existing six-lane Project CI remains unchanged and continues to qualify code independently.

Spec 006 planning may authorize one new workflow rather than modifying `.github/workflows/ci.yml`, unless exact implementation evidence proves a separate workflow cannot satisfy the contract.

## C16 — Does this authorize selector shadow, benchmark expansion, or adversarial receipt mutation?

No. Those are later M1.2 workstreams. Spec 006 is only the first self-verification shadow receipt slice.