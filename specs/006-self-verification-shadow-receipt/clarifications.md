# Spec 006 Clarifications — Self-Verification Shadow Receipt

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

## C1 — Why shadow first?

The measured gap is absence of Ascout-on-Ascout evidence, not proof that self-verification is reliable enough to gate merges. Any later gating decision needs separate measured evidence and authorization.

## C2 — What do B, H, M, HT, and S mean?

For one eligible same-repository PR:

- `B` = exact event base-tip SHA, provenance only;
- `H` = exact event head SHA;
- `M` = unique merge base of `B` and `H`;
- `HT` = exact `H^{tree}`;
- `S` = canonical `SourceStateV1` snapshot produced by exact `H`-built `composeSourceState(repositoryRoot)` immediately after reconstruction and immediately before verifier launch.

`M` is subject HEAD; `B` is not automatically subject HEAD.

## C3 — Why use M rather than event base tip B?

The base branch can advance independently after divergence. Using `M -> H` represents the committed PR change without charging unrelated base-branch movement. Missing/multiple merge bases fail closed.

## C4 — How is the subject reconstructed?

1. prove same-repository eligibility before PR-code execution;
2. checkout/guard exact `H`;
3. prove clean tracked/index state and `HT`;
4. install/build exact verifier from `H`;
5. prove `B` and `H` exist;
6. require exactly one merge base `M`;
7. `git reset --soft M`;
8. prove `HEAD == M`, `git write-tree == HT`, no unstaged tracked divergence, no unrelated nonignored untracked files;
9. lazily load exact `H`-built `dist/check.js` and call canonical `composeSourceState(repositoryRoot)` to capture `S`;
10. launch the preserved exact `H` verifier.

## C5 — Why independently snapshot source state if reconstruction is already proven?

Reconstruction proof establishes the harness state **before** verifier launch. Receipt semantic validation establishes consistency **inside** the receipt. Neither alone proves that `receipt.source.start` describes the exact independently reconstructed state.

Therefore the harness must compare `receipt.source.start` with pre-launch `S` for exactly:

- `head_sha`;
- `tree_digest_version`;
- `tree_digest`;
- `tracked_index_entry_count`;
- `unstaged_changed_count`;
- `included_untracked_count`.

Any mismatch is capture failure. This closes the evidence-binding gap without changing receipt v1.

## C6 — Why reuse composeSourceState instead of computing a digest in the harness?

`composeSourceState()` is already the canonical exported source-state composer used by Ascout. Reusing the exact `H`-built function prevents a second source-state algorithm or evaluator. The harness must not independently reproduce `readTreeDigestV1` semantics.

## C7 — Why build the verifier from H?

The purpose is to qualify proposed Ascout code. Base/merge-base Ascout answers a different question. Exact verifier `H/HT` lives in the external envelope; `run.ascout_version` remains a version label.

## C8 — What happens when command authority changes?

The workflow MUST NOT pass `--allow-changed-command-surface`. A valid incomplete receipt is retained as factual shadow truth.

## C9 — Which exits are successful captures?

Only after schema validation, semantic validation, process/receipt exit equality, and source-snapshot equality succeed, valid receipt exits `0`, `1`, `3`, and `4` are observational capture success. Exit `2` without a valid receipt or any identity/source-binding/digest/artifact failure is harness failure.

## C10 — What is the envelope?

A small JSON qualification record outside receipt v1:

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

It contains no repository URL/path, absolute path, actor/user, host/home, environment dump, token, credential, or arbitrary diagnostics. `S` is an in-memory capture-integrity expectation; Spec 006 does not add it to receipt or envelope schema.

## C11 — How are receipt bytes validated?

Capture exact stdout bytes without rewriting, parse once, run exact `H`-built `validateReceiptJsonSchema` and `validateReceiptSemantics`, prove process exit equals `receipt.summary.exit_code`, prove six-field source-start equality with `S`, then hash the exact retained bytes and emit the envelope.

## C12 — How can T107 tests run when Project CI tests before build?

T107 MUST NOT require pre-existing `dist/` or top-level import it. Production lazily loads exact `H`-built `composeSourceState`, JSON Schema validator, and semantic validator after workflow build. Focused Vitest may inject the same current source functions into internal adapters solely for testing. T108 live workflow proves the real built-dist path.

## C13 — Where do outputs live?

Outside repository source identity, preferably runner temp. Only already-canonical ignored paths may contain build/runtime artifacts in the checkout.

## C14 — What happens for fork/external PRs?

They are not eligible. T108 evaluates same-repository eligibility before checkout/install/build/execution. Fork/external PRs skip execution and produce no receipt claim. `pull_request_target`, secrets, elevated permissions, or fork-code workarounds are prohibited.

## C15 — Artifact action / retention

Planning candidate: official `actions/upload-artifact`, MIT, `v7.0.1`, exact commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`; implementation-time reverify + full-SHA pin; 30-day retention; upload only receipt/envelope; `contents: read` only.

## C16 — Does this change Project CI or authorize later work?

No. Project CI remains the six-lane independent qualification matrix. Selector shadow, corpus expansion, adversarial mutation, trend aggregation, required gating, untrusted execution, and M2 remain separate future decisions.