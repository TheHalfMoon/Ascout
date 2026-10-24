# Task021 source qualification

Base `92433f7039393d6a08b8f993bc50da8470de2b5c`; candidate `e855b16b668d490cf6e3b5bfbe11b0e36724ae0d`, tree `bfb9cbdbf0d54d6bd49afec7e6cec52331bc5e5c`. Hosted/final-head/canonical qualification is pending. E00 and release readiness remain BLOCKED.

## Actual sequence and bounded change

Plan commit0d87b85 received a fresh PLAN_CLEAR audit (SHA256 `6a429341ca4ca8cd6fe5fa89cb03cd3f8d80bf605ea897dc2b19447831e38443`). After the factual audit observation commit8358611, a different fresh context returned CONSISTENCY_CLEAR (SHA256 `d655074919cafb7ac638ca5c37c49a871ff2da757662d9d268eff24b6e609a88`). Tests-only54b7631 ran against unchanged production source:15failed/11passed, including all14new budget/fallback cases. Source-onlye855b16 then introduced the small strict fast path, adapting only existing Ascout commitbb7ff354's HEAD-query subset. Draft PR589/614 and their security/hash changes remain untouched/unmerged.

Only production path src/git.ts and test path tests/git-identity.test.ts changed. Valid exact LF records with true inside-worktree, boolean shallow state and lowercase40/64-hex full HEAD use two native queries. Any failed/unsupported/malformed batch takes the unchanged sequential classifier. Existing detached-state/error semantics and semantic assertions remain. No cache, dependency, command authority, runner, deadline, platform skip, tree-digest/hash/filter/configuration/workflow change.

## Native evidence

All captures retain native exits, original streams/hashes, clean identical source-start/end and the original individual deadlines. The capture helper's own successful exit only means capture completed.

| Execution | Actual outcome |
| --- | --- |
| Clean-main four-file baseline | FAIL39passed/2Git digest deadline failures/9existing platform skips;166.12s |
| Tests-first old source | FAIL15failed/11passed;3.07s |
| Candidate identity contract | PASS26/26;3.13s |
| Candidate typecheck/build | Both native0;4.24s/5.26s |
| Candidate five-file focused control | PASS67passed/9existing platform skips;137.74s |
| Candidate complete canonical serial suite | FAIL2390passed/1failed/34existing platform skips,total2425;701.20s |
| Unchanged browser-file diagnostic after full failure | PASS8/8;5.95s capture, disposal case215ms |

The complete suite's only failure is tests/browser-text-assertion.integration.test.ts, "fails an in-flight assertion on disposal and refuses reuse", exceeding its original5000ms test deadline (observed5016ms). The browser source/test bytes are unchanged from main; the later focused pass does not erase the failure, establish its exact cause, or prove reliability. No source fix is claimed for this residual deadline. It remains E00 debt for prospective diagnosis rather than being skipped, relabeled or assigned a larger deadline.

All native Git/drift/CLI/T107 cases pass in the complete control. The two baseline-reproduced cases complete at10247ms under15000ms and3856ms under5000ms. Historical six deadline failures and300/900-second captures retain their original outcomes and attribution limits.

The separate real-Git diagnostic executes five reads on the same controlled fixture with identical outputs:20actual Git launches/1761.96ms at baseline0d87b85 versus10/861.15ms at candidatee855b16. Source/compiled/helper/Git/fixture hashes are retained. Controlled diagnostic configuration/counters differ from the native suite; no sole historical cause or universal speedup is inferred. Aggregate host snapshots (about87%memory used) are observations, not a causal finding.

## Reviews and tools

Fresh manual PStack combined correctness/product/parsimony review SHA256 `3ceabf48516df1916a134473b36f58134d7956c1a9c3d36278e3cdb778616ae3` and separate scoped security review SHA256 `c34c1daa50c98d86b77fd68564c06f91d27729c3db326c5a1d85d790d639d705` found no actionable source issues at e855b16. Reviews disclose shared OpenAI lineage; procedural separation is not provider independence. Final qualification/evidence reconciliation remains pending.

Actual local Alibaba OCR1.12.13 preview/rules both exit0; default selection covers src/git.ts only, with excluded tests/docs covered manually. No external model/provider/Claude verdict ran. Actual Graft static build exits0:146files,3042nodes,6051edges,146cards; no model/deep mode, with telemetry disabled. Actual local D1 advisory triage ran; its600M known security miss and non-gating status remain explicit. It does not approve the patch. Native Git/CLI/T107 E2E controls ran; no changed browser surface makes a new TesterArmy claim appropriate to the Git repair.

Sanitized reproducible captures, helper scripts, reviews and dual original/published hashes are in [the qualification packet](../../../qualification/git-head-query/2026-10-24/REPORT.md). No paid service, cloud requirement, release/deployment or UA-P07 authority was added. Development advisories and the Self shadow packaging failure remain separate open debt.
