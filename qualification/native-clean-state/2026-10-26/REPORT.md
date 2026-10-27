# Native clean-state validation qualification

The benchmark now avoids two redundant Git diff launches at each clean checkpoint when porcelain status reports no tracked change. It retains fresh HEAD and index-tree checks, all checkpoints, native error handling, and the original staged/unstaged diff decisions for ambiguous or tracked status rows. Production `src`, existing tests, deadlines, dependencies, workflows and authority are unchanged.

The fixed representative controls observed **29 to 23 Git invocations**, with both original npm operations and positive assertions retained. This establishes six fewer launches in that case. Two ordered samples do not establish statistical speedup, explain historical timeouts, or exonerate candidate contributions to a failed suite.

| Actual check | Result |
| --- | --- |
| Initial seven-case native baseline | 7 passed |
| Source typecheck and build | Both native exit 0 |
| First supplemental test typing invocation | Native exit 1, TS5112 before checking; preserved |
| Corrected explicit supplemental typing | Native exit 0 |
| Candidate focused regressions plus existing T107 | 32 passed, 9 existing Windows skips |
| Fixed invocation baseline | Native exit 1, qualified budget RED: 29 Git, 2 npm; functional assertions returned |
| Fixed invocation candidate | Native exit 0, qualified budget GREEN: 23 Git, 2 npm; functional assertions returned |
| Complete serial local suite | **Native exit 1: 2,429 passed, 6 failed, 34 existing skips; 2,469 tests in 246 files, plus a failed browser teardown hook; 1,955.951 seconds** |
| Routing adversarial control | Controller exit 0; actual selected test exit 1, one failed and six filtered; owned sentinel unchanged |
| First native-init adversarial capture | **Controller exit 1, child exit 1, UNQUALIFIED**; intended Git error occurred but JSON-only reporter omitted diagnostic console proof |
| Corrected native-init capture | Controller exit 0; child exit 1, native Git exit 128; original error, bounded metadata and retained fixture identity observed; one failed and six filtered |
| First diagnostic seven-case followup | **Native exit 1: 6 passed, 1 failed**; required submodule status row absent under the fixture's explicit ignore setting; both roots retained |
| Corrected fixture strict typing and seven-case check | Native exit 0 for both; **7 passed**, including native diff and actual status-row assertions; 58.544 seconds for the test capture |
| Current dependency audit | Native exit 0; zero reported vulnerabilities across installed production/development dependencies |

The complete suite's literal failures are retained in [first-full-suite.json](first-full-suite.json): Vitest 15-second timeout; Jest 90-second and 15-second timeouts; runtime-data Git-index identity error; the new submodule fixture's native repository-recognition error; browser disposal 5-second timeout and additional teardown 10-second timeout. The new fixture error occurred before that case invoked reconstruction. Its original filesystem was discarded by the original fixture cleanup, so the native cause remains unknown. Subsequent passing cases cannot recover or explain it. No host cause, deletion actor or blanket candidate exoneration is inferred.

The forward fixture correction rejects Git routing environment before mutation, binds Git to owned metadata/worktrees, records bounded failure-time metadata without reading configuration contents, preserves the original native exception, and retains failed fixtures. Negative controls verify those behaviors with owned artifacts and child-local environment. Three adverse controller drafts and their reviews are preserved. The reporter-only correction adds the installed default reporter alongside JSON; it does not change assertions or deadlines. Expected negative failures remain failures, never original-case passes.

The later positive failure exposed a separate fixture setup defect: explicit `diff.ignoreSubmodules=untracked` hid the required status row. The correction moves that explicit setting into the tracked-edit rejection case. The positive case exercises native defaults and still requires both native diff exit 0 and a real modified-submodule row. No assertion was removed, no case added or skipped, and no deadline changed. The original native Git initialization cause remains unresolved.

Source correctness and separate native-boundary/security reviews at c80bb24308483c0ef1fff07c44e92c2a42968a8a found no scoped must-fix. They verified 433 other source/test/benchmark entries and 15 control hashes unchanged. Index-flag tests establish flag preservation with another tracked change, not exhaustive flagged-only equivalence. Windows numeric inode metadata can lose integer precision; this is disclosed without claiming an observed replacement or escape. The reviews share OpenAI provider lineage and do not constitute provider-independent certification.

Actual local D1 fixture triage is advisory only. Alibaba preview and rule lookup ran locally at c80bb24; they are scope/rule evidence, not Claude or model review. Graft, TesterArmy and browser implementation are unchanged by this task; no fresh unrelated execution is claimed. Existing evidence remains bound in the baseline, and the actual browser failure stays open. No paid service, new dependency, required cloud runtime, unsupported REA Windows capture, UA-P07 or changed-command-surface admission was used.

[evidence.zip](evidence.zip) contains 118 explicit minimized members. [evidence-lock.json](evidence-lock.json) binds its SHA256; its manifest records original and published hashes. It includes all native capture metadata and streams, observer records, runner reports, adverse reviews and source drafts, reference hashes and reproducible scripts. Local paths, personal emails/profiles and raw signatures are minimized. Full manual pages, installed dependencies/caches and private REA expansion are excluded. A transformed script is a public derivative; its original hash is not the hash of its published bytes.

To inspect the evidence, verify the ZIP SHA256 against the lock, check its CRC and member hashes against MANIFEST.json, then read the source HEAD, leaf hashes, native exit and inner qualification for each run. The capture wrapper itself exits 0 even when its captured command fails. For reproduction, use the recorded source revision, Node/Git/npm versions, locked dependencies and script argument lists, adapting only redacted local roots. Review controller bindings before execution; original controls are consumed and are not automatically repeated by publication or verification. Negative-control runner output deliberately contains one failed and six filtered cases.

Current source hashes: benchmark `151eb52a59ee68674b3f4000c47ee6e5282ac573ed8d872d0909a5498ce188ad`; final new test `dafd92e594e8a8a0a2ec082e1115073855bdaed81e0d0be7e1b5fd3d0f95c5b8`. Earlier controls bind their own exact leaves and whole source revisions; equality of unchanged leaves does not mean those controls executed on a later whole tree. No third cost observation or blind full-suite retry occurred.

Fresh integrated and publication/privacy reviews at a757b2a found no scoped must-fix; their finalized reports and original/published hashes are separate sidecars so the fixed packet stays unchanged. A nonblocking historical Task026 wording ambiguity is corrected in the timing overview. Native commands remain successive observations rather than an atomic snapshot; moving status before fallback diffs can change native-fault ordering while still failing closed. No hostile concurrent-writer immunity or identical corrupt-state error precedence is claimed.

Final metadata delta review, actual final-head CI and inner Self truth, live eligibility, canonical/postmerge qualification and closing remote-byte verification remain pending. The original local failures and provenance/selector limitations remain visible. **E00 and release remain BLOCKED.**
