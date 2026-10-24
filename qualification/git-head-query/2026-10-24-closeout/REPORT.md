# Task021-T01 canonical closeout

The focused Git HEAD-query repair is CLOSED_CANONICAL through [PR643](https://github.com/TheHalfMoon/Ascout/pull/643), merged as `af5de7d1c56030d8842fc85c334cb8933d63fc08`. **E00 and release readiness remain BLOCKED.** This evidence branch records closure; it introduces no production source changes.

Reviewed head `200979fc281f17f764446b8f559ca4f4923bcd78` and merge share tree `e06e13872798d0bd11165f4062307e05f99b4d0a`. Ordered parents are base `92433f7039393d6a08b8f993bc50da8470de2b5c`, then reviewed head200979f. GitHub reports the merge signature verified/valid. The last-moment guard verified the exact head/base/main, seven actual successful checks, no changes-requested review and zero unresolved threads; ordinary merge used the matching-head guard, with no administrator/force override.

## Actual qualification

| Evidence | Observed result |
| --- | --- |
| Committed tests on unchanged old source | RED15failed/11passed; all14new budget/fallback cases fail |
| Exact sourcee855b16 |26identity cases PASS;67focused passed/9existing platform skips; typecheck/build native0 |
| Real native Git comparison | Five reads/source, same fixture/output:20→10processes,1761.96→861.15ms; diagnostic configuration is distinct from native qualification |
| Complete local canonical serial control | **FAIL**,2390passed/1browser deadline/34existing platform skips,total2425;701.20s |
| Final-head Project CI [40091538552](https://github.com/TheHalfMoon/Ascout/actions/runs/40091538552) | Six complete native lanes PASS; exact source guards, exact-lock installation, pinned Chromium, typecheck/tests/build verified from steps and raw logs |
| Final-head Self [40091538327](https://github.com/TheHalfMoon/Ascout/actions/runs/40091538327) | Capture contract PASS; uploaded ZIP digest/CRC/member/source/tree/base/receipt binding verified; actual inner packaging **FAIL3/3**,exit1/materially_incomplete; selector comparisonUNAVAILABLE |
| Canonical postmerge [40111193020](https://github.com/TheHalfMoon/Ascout/actions/runs/40111193020) | Six complete native lanes PASS on exact mergeaf5de7d, same required execution verified from raw logs |

Each hosted full suite covers2425cases:Linux2420passed/5existing platform skips,macOS2398/27,Windows2391/34. Existing platform conditionals and native deadlines were unchanged. Full local Git/drift/CLI/T107 cases pass; the sole local failure is the unchanged browser in-flight disposal case,5016ms against its original5000ms limit. The later unchanged browser-only8/8pass (disposal215ms) does not erase it. Historical six deadline failures and300/900-second captures remain failures; no sole host cause is established.

Fresh plan/gate and separate exact-head consistency reviews preceded implementation. Fresh combined source review, separate manual security review, final integrated/publication review and actual CI reconciliation found no actionable source issues. Review reports disclose shared OpenAI lineage: context separation is not provider independence. Actual local Alibaba OCR preview/rules and Graft static execution are not external-model verdicts. Actual D1 output is advisory only. No broad security/plugin scan, paid service, required cloud, new dependency, deadline/skip/configuration/workflow change, release or UA-P07 authority was inferred.

## Residual work remains open

Supported-API browser diagnosis directly times Context.close17.566ms and Browser.close8315.858ms. A concurrent second dispose returns before the first cleanup finishes while the actual browser remains connected. The raw probe's approximately8448ms field is sampled after both disposal and the pending assertion; it is an end-to-end interval, not a precise first-return timestamp. These are current diagnostic observations, not proof of the historical timeout's exact cause or a browser repair. The browser call graph has no changed Git reader path; future lifecycle repairs require separate prospective ownership.

Current direct-Vitest packaging diagnostic fails with the explicit npm_execpath requirement; unchanged canonical npm invocation passes. Historical uploaded Self receipts omit the raw exception, so this current stack is not assigned retrospectively as their proven cause. No authority/environment injection or packaging repair is claimed. Development dependency audit debt remains5entries/8advisories for a separate prospective task; historical Spec019 remains unchanged/deferred. No new task implementation began before this focused canonical close.

## Durable evidence

[evidence.zip](evidence.zip) has117members and SHA256 `63e491fc1ff184ea3bbbf92acbd2694194ab2e97c2b26c2a66960d56cbd6ac0d`, bound by [evidence-lock.json](evidence-lock.json). It contains actual native manifests/full streams, benchmark/host records, reviews, live frontier/gate refreshes, merge proof, both sets of hosted logs, Self plaintext records and reproducible helpers. Original opaque Self ZIP remains local and is excluded from public publication; its digest/member verification observations are retained. Original/public hashes in MANIFEST.json distinguish sanitized derivatives from original bytes. These are qualification observations, not canonical product receipts or authenticated attestations.

The [initial61-member packet](../2026-10-24/REPORT.md) remains frozen at200979f, ZIP7745b78c564ac305dd392166ef75199ccafaef691ca08ae631a56eaeb804521a; actual remote download/byte/member verification is retained. This closing packet's separate final publication review and remote readback follow before disposable cleanup or the next task. No E00/release PASS is implied by archive integrity or focused closure.
