# Task023 native index observation qualification

Source candidate: a6baed464db522962e8d4e2e08ae6cb0fd24cd1b, tree463e61bfbf34b0090ecd3638cc242df300eea022. Canonical base62e588adda04dda1a517742fe10af352e5dfa83f. PR645 is merged at96c18b3a300c844e9766d272e8eb4f5c3a790e63, with expected ordered parents, reviewed tree725de8c34aa34f01a5e121641c6960f7406fb481 and GitHub valid signature verified. Six actual final-head and six actual postmerge native suites pass; final reviews reconciled. Closing fresh review and remote readback remain pending. E00/release remain BLOCKED. Later facts and preserved failures are in the [closing record](../../qualification/git-index-observation/2026-10-25-closeout/REPORT.md).

The collector now reads visibility and stage metadata with one fixed `git ls-files --stage -v -z` per complete observation. It retains both complete observations, strict UTF8/path/OID/stage parsing, hidden/unsupported visibility refusal, runner limits, path containment and attribute-aware per-path hashing. Production scope is src/git.ts (+15/-31) and one new 174-line test file; all existing tests/deadlines, manifests, workflows and authority files stay byte-identical.

## Actual native results

Twelve completed captures retain source start/end, argv, deadlines, native exits and stream hashes. The outer capture wrapper succeeding does not make a failed native command pass.

| Control | Actual result |
| --- | --- |
| RED, e427f30, unchanged production source | native1,23failed/2passed; real clean12>10 and modified14>12 launch budgets |
| GREEN, a6baed4 | native0,25passed |
| Strict source typecheck / build | native0 / native0 |
| Supplemental new-test strict typing | first native1 TS5112 invocation error; corrected supported `--ignoreConfig` invocation native0, no source/config edits |
| Focused Git/tree/BOM/diff/drift/CLI/T107/new tests | native0,105passed/11existing platform skips,116cases/9files,161.9566s |
| Complete canonical npm suite, one bounded worker | native1,2415passed/1failed/34existing platform skips,2450cases/244files,772.9023s |
| Diagnostic baseline compilation | native0; compiled subject is canonical62 source, not capture-context candidate |
| Paired T103-shaped diagnostic | initial native1 missing baseline schema asset; forward asset repair then native0; original error retained |

The sole complete-control failure is T103 `invalid_taken` at tests/vitest-check.integration.test.ts:268: unchanged15000ms deadline, observed22242ms. It does not establish the normalizer assertion result. All Git/drift/CLI/T107/browser cases passed in this sample. Reviewers, inference, installs, audits and resource samplers were absent during the serial control; only two bounded artifact reads, time observations and status communication occurred. No repeated full run, skipped failure or altered deadline was used. Earlier Task021/022 local failures remain intact. Changed workloads, cache/order and the local OS prevent interpreting these samples as a controlled whole-suite speedup or historical cause proof.

## Bounded comparative evidence

Twenty actual public-Node-instrumented reads on one owned Git fixture produced equal outputs. Ten baseline reads launched130Git commands; ten candidate reads110. Clean reads12→10, one modified file14→12. Observed aggregate elapsed13694.346→11441.2014ms is order/cache/OS confounded; counts are launch API calls, not all OS descendants. No unsupported REA process capture was used.

The paired public `runCheck` diagnostic used canonical62 baseline sources and the candidate, unchanged check module, the same owned synthetic invalid-LCOV fixture, and exact schema assets. Baseline38 versus candidate34Git launches; both returned ERROR `vitest_evidence_invalid`, summary exit2 and `unknown_due_to_error`, preserving invalid evidence. Setup was measured once and cleanup was not measured; these are not timings of the original15s test. Baseline asset/fixture ownership, source/module/stream hashes and harness errors are retained. Neither comparison proves the candidate caused or fixed the historical T103 timeout.

## Reviews and tools

Prospective PLAN_CLEAR at01f255e and different CONSISTENCY_CLEAR at571522a preceded bounded authority and tests/source. An intermediate report hash was read before reviewer finalization; corrected final b79ebd07e7ed67cfe9ada3c4775475254bafb10a279d9c314d59a89949378e8b was recorded forward at a8272ca before implementation. Both observations remain documented.

Fresh source correctness/product/parsimony report SHA920193d183c5a26140494e66503d152c72af26f544568679e932a39e35c37444 and separate security report SHA73c909056e54596ffbad6a9beb656869fb555956ced320244b632d155b59380d report no actionable in-scope findings at a6baed4. The first correctness reviewer attempt returned a usage error; one same-reviewer retry completed after ordinary availability was confirmed. No paid/provider/model fallback or D1 gate substitution occurred. These are fresh contexts sharing OpenAI lineage; no provider-independent certification, whole-repository scan, merge approval or gate waiver.

Actual local D1 advisory ran; its small model can miss severe bugs and does not approve anything. Alibaba OCR preview/rules ran locally with exit0, one reviewable production source among11changed files; it is configuration inspection, not a Claude/model verdict. Actual Graft static inspection exited0 with146/146files,3041nodes,6044edges and146cards. No TesterArmy execution is claimed for this Git-only delta; applicable browser cases ran in the complete native control. No dependency, paid service or cloud runtime was added.

## Durable evidence and remaining gates

The [packet](../../qualification/git-index-observation/2026-10-25/REPORT.md) binds explicit sanitized plaintext derivatives and reproducible helper sources. Original/published hashes distinguish minimization from raw evidence. Opaque archives, installed packages, graph caches, private REA expansion and private account/usage data are excluded. The reserved public fixture identity in two diagnostic scripts is retained under an exact byte-equality check. Redaction is bounded, not universal secret detection or authentication of originals.

Final-head Project40189086978 and postmerge Project40190225207 each verify all six actual native2450-case/244-file suites with required source/install/Chromium/typecheck/test/build steps. Self40189086992 artifact12597607878 has verified digest/CRC/head/tree/base/receipt bindings, but its inner result remains FAIL/exit1, completeness complete: typecheckPASS/testFAIL, existing T082/T087 packaging case3/3; selector UNAVAILABLE_FULL_SUITE_CONTRACT. Raw exception bodies are absent from that bounded artifact, so its exact cause is not inferred. Final integrated/publication/CI reviews report no actionable focused findings and retain both FAILs. Live gates and ordinary head-matched merge, ordered parents/tree/valid signature are verified; fresh closing review and remote closing readback remain before CLOSED_CANONICAL. No automatic admission override or UA-P07 authority. E00/release still need their own actual passing final complete local and integrated qualification; T103 cause, browser concurrent-disposal ownership gap and direct-Vitest packaging gap remain separately owned work. No disposable artifacts deleted.
