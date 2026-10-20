# REA-E01 diagnostic loss accounting candidate

Canonical base: `ea93553a5423fd47f12a6bf282820dd199b994d4`. Bounded session plan: `442b999e28bfd94080ba752795cb4eb2af2a6b3c`, with a separate fresh-context local audit recorded as clear for candidate implementation. Session authority permits this maintenance candidate; it does not ratify UA-P07, change review policy, or authorize merge/release.

`normalizeReviewBatchWithAccountingV1` composes the existing batch normalizer, raw-observation checker, location validator and file-coverage calculator. The original `normalizeReviewBatchV1` return contract and existing consumers are unchanged. Callers of the additive API supply the original producer inventory captured before filtering, output entries, explicit exclusions and the same execution/source identity. Reconstructing the inventory from retained output would defeat omission detection and is not a supported provenance claim.

Every original ID receives exactly one disposition, in original inventory order. Retained output preserves its existing output order and normalized-record representation. Suppression and diff exclusion require an explicit reason and the matching execution binding. Invalid original raw inputs remain `REJECTED_INPUT`; they cannot be suppressed, repaired or normalized into valid-looking output. Missing output remains `MISSING_OUTPUT`. Duplicate IDs/dispositions, undeclared output/exclusion IDs, altered original payloads, stale execution bindings and inconsistent location validations throw instead of returning a partial result. Runtime non-string paths are rejected before the legacy regex can make their type look valid through coercion.

`accounting.complete` means only that every original diagnostic has a disposition other than missing output. It does not mean clean scan, valid locations, quality PASS or complete file coverage. The returned existing coverage object remains separate, and rejected inputs, explicit exclusions and non-promotable normalized records remain visible even when accounting is complete. No new canonical finding, status, receipt, scan-completeness or CLI authority is introduced. Existing consumers do not automatically gain the additive accounting until they supply the original inventory.

## Deterministic original fixture

The independently written frozen eight-observation fixture is in `tests/review-diagnostic-accounting.test.ts`. Its exact bytes are UTF-8 `JSON.stringify(originals)`, without a trailing newline. SHA-256: `b263eca813c783238e59a96fc468000f34f379460f41b95ccdde7ba2b22fde29`. The fixture inventory is independent of the retained-output selection; no third-party implementation or diagnostic content was copied.

| Original ID | Expected disposition |
| --- | --- |
| `diag:retained` | RETAINED, valid location |
| `diag:suppressed` | PRODUCER_SUPPRESSION, explicit accepted reason |
| `diag:locationless` | RETAINED, NO_LOCATION, non-promotable |
| `diag:diff-excluded` | DIFF_EXCLUSION, explicit reason |
| `diag:invalid-path` | REJECTED_INPUT, original traversal spelling |
| `diag:invalid-body` | REJECTED_INPUT, invalid raw observation |
| `diag:missing` | MISSING_OUTPUT |
| `diag:unknown-location` | RETAINED, HALLUCINATED_PATH, non-promotable |

## Local checks and limits

Tests were written first. The initial RED run recorded 23 failures and 3 passes: the additive implementation was absent. A further regression RED run recorded four failures for non-string raw paths; the bounded accounting guard then made those cases green. The final focused test file contains 30 cases.

Qualification commands use the existing pinned installation: `rtk proxy node node_modules/vitest/vitest.mjs run ...`, `rtk proxy node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`, and the same compiler command without `--noEmit` for build. Existing review unit controls are P03 T01 through T13 and T15; T14 CLI/subprocess tests and the full suite are deferred to the orchestrator's sequential controls. Test/process deadlines, platform branches, configuration and dependencies are unchanged. `git diff --check` checks patch whitespace; no formatter script is configured in this repository.

Raw JSON/log evidence is retained outside the repository under the task's `phase-e01` evidence directory for sanitization and exact-head publication by the orchestrator. It includes the original RED evidence, non-string-path RED evidence, focused/review unit results, compiler logs and a source-bound manifest. No raw host paths are copied into this document.

The worktree reuses an existing identical-lock `node_modules` installation through a junction. These checks are not clean-machine qualification. Full native controls, exact-head independent review, security/platform/hosted CI and any required canonical admission remain separate gates. Fresh-context local review has the same model/provider lineage and cannot be called independent-provider verification. No push, PR publication, merge, deployment or release is performed by this builder.
