# Ascout Durable Harness qualification

This packet records task020-T01, [PR642](https://github.com/TheHalfMoon/Ascout/pull/642), against base89e5f01d7b77a92099961dff21e28052e5fa8dcc. **Whole-product readiness remains BLOCKED.** Local timing failures and development dependency findings are preserved; no release, UA-P07 or new effect authority is claimed.

## Source and checks

Code control: `f8c0825f936bcac836c77098296888e8c2b1ac10`, tree `404877e6fc4ba06a02a2db244f26e6841d8ea355`. Subsequent packet changes are documentation/evidence only and require their own exact-head hosted checks and consistency review. The source implementation is two additive files; existing workflow, freshness, idempotency, kernel, command admission, CLI, package/lock and workflows are unchanged.

| Actual control | Result |
| --- | --- |
| Independent plan audit / fresh consistency | PASS atabf8a72/41ef2e5 before source edits; initial two required plan fixes retained |
| Committed initial RED | Native1, module absent and zero cases executed; not an assertion-level proof |
| Demonstrated stale-never defect RED | Native1 on9c4a02a, actual new assertion failure; prior model bytes equal f689 |
| Fixed focused controls | Native0,6files/60tests including27new cases and3real native child-process restart/interruption controls |
| Strict typecheck/build | Native0/0 on clean unchanged f8 |
| [Project40068578216](https://github.com/TheHalfMoon/Ascout/actions/runs/40068578216) | Six actual complete native/typecheck/build lanes PASS atf8; Windows2,377passed/34existing skips, macOS2,384/27, Ubuntu2,406/5; total2,411each |
| [Self40068578134](https://github.com/TheHalfMoon/Ascout/actions/runs/40068578134) | Valid source-bound capture PASS; actual inner exit1/T082-T0873/3 packaging FAIL, materially incomplete, selectorUNAVAILABLE |
| Complete local npm suite | Native1,1,083.29seconds,243files:239passed/4failed;2,371passed/6failed/34existing platform skips; source unchanged |
| New durability cases in complete local suite | All27PASS, including3cross-process cases |
| Fresh source/security reviews | Initial P2 recovery-honesty finding retained; fixed f8 delta reviews clear, source/RED/GREEN/log hashes verified |
| Production / full dependency audit | Native0/1: production0advisories; full5affected-package entries,2high/3moderate and8underlying advisories; no dependency change |

The six local deadlines are CLI doctor privacy5s, tracked-source drift5s, tree-digest complete-state15s/stale-stat5s/large-chunk5s, and T107 tracked-content preservation5s. Their four test-file blobs match base89e5 exactly. The four Git/drift cases recur from the prior main control; CLI/T107 deadlines are additionally observed here. Actual passing hosted controls and unchanged source do not prove a single environmental cause. One aggregate host snapshot observed about517MBfreeC:/2.5GBavailableRAM; no process ownership or causal conclusion follows. No test/platform condition/deadline changed, and no local failure becomes PASS.

The local whole-suite timing debt remains owned under E00 and the Git/runtime workstream. CONTRIBUTING distinguishes unrelated infrastructure/historical debt from a task's source findings; exact-head six-lane full-suite passes are real qualification controls. They do not erase the local failure, authorize deadline changes or certify a production release. Final merge eligibility remains subject to fresh exact-head gates and finding reconciliation. Dependency repair E05 remains separately deferred and unimplemented.

## Actual methods and limits

Local D1 selected crash recovery as advisory test priority and approved no gate. PStack used separate fresh contexts for plan, consistency, correctness/product/parsimony and security, with the same provider/model lineage disclosed. Alibaba OCR actually executed local delegate preview/rules; tests/docs/vendor exclusions were manually covered. No Alibaba/Claude external-model verdict is claimed. Graft actually indexed9workflow files/99nodes/164edges without a model; its cache is outside the repository and DO_NOT_TRACK was set. Three real native child-process controls are the applicable end-to-end checks; no browser surface changed, so no new TesterArmy/browser run is claimed.

The integration is a local metadata seam, not turnkey upstream agent drivers, queues or transcript restoration. The caller supplies freshly captured expected bindings and owns actual effect admission/evidence resolution. Every recovery call returns execute:false. Unknown never-effects still need reconciliation after source drift. An abandoned lock requires operator verification/repair; checksums are not signatures, and hostile concurrent filesystem replacement or universal hardware power-loss durability is not promised.

## Evidence and reproduction

`evidence.zip` contains source-bound native manifests, full stdout/stderr, initial/fixed plan/source reviews, RED/GREEN history, raw hosted logs and sanitized extracted Self JSON, exact artifact hashes, source references and tool records. `MANIFEST.json` distinguishes original/published hashes; public derivatives are not authenticated originals or canonical receipts. Opaque original hosted ZIPs remain local and excluded from the publication allowlist. `evidence-lock.json` identifies the snapshot. Canonical raw local evidence remains retained.

Use the recorded exact source with the unchanged lockfile and pinned Chromium. Install explicitly with scripts disabled, then run `npm run typecheck`, `npm run build`, the six recorded focused files, and canonical `npm test -- --maxWorkers=1 --reporter=verbose`. Keep original individual deadlines unchanged. New tests transpile actual sources into an owned temporary package, avoiding shared dist mutation; native children use fixed argv, no model/network, and explicit exit72/73 interruption controls. Temporary test fixtures are owned and cleaned by the tests.

The upstream article/repository pin, unchanged Apache-2.0 license and adaptation notice live in vendor/vercel-durable-harness; no upstream runtime dependency is installed. This packet preserves the already merged Spec018 work and closing evidence at6b3055c without restarting REA or mixing those outcomes into task020's actual execution. Final-head and post-merge evidence is added only after it exists.
