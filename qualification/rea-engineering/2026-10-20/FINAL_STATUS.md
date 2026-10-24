# Spec 018 qualification status

Updated 2026-10-24. **BLOCKED; not a production-release or whole-Spec completion claim.** All four focused implementation PRs are merged. The remaining E00 operator-PC timing debt and development dependency findings are explicit below.

## Merged work

| Work | PR | Verified merge |
| --- | --- | --- |
| Diagnostic loss accounting | [638](https://github.com/TheHalfMoon/Ascout/pull/638) | 48902389ec37019845fd67c8b8c53c5f499ffc85 |
| Conservative affected-test selection | [639](https://github.com/TheHalfMoon/Ascout/pull/639) | 23fe4037a31f37d78d3add4b08f8393a4ac40671 |
| Bounded Stryker translation | [640](https://github.com/TheHalfMoon/Ascout/pull/640) | 36d1e504b300780d68b7bb692f90179e79b8c8bb |
| Deterministic literal browser assertion | [641](https://github.com/TheHalfMoon/Ascout/pull/641) | 4688ecc5188cc5c4ccf811ce10be04b9156c5e8b |
| Preserved completed REA | [636](https://github.com/TheHalfMoon/Ascout/pull/636) | 576cfaa748d9f88ac752c20b385c69a2e7dd1f58 |

Ordered parents, reviewed-head tree equality, merged/closed state and GitHub-reported valid signatures were read back. Research retained the exact original34c81e18 subtree3e941eff; its PR added25research paths and no production delta. No REA restart occurred. Coordination/evidence remains separately tracked in [PR637](https://github.com/TheHalfMoon/Ascout/pull/637).

## Final code-main controls

The code control is pinned to4688ecc5188cc5c4ccf811ce10be04b9156c5e8b, treeebe4b3530c66e48d3c203ae2c285956fe43c7974. Later research/documentation integration does not change its production/test/package/workflow files; each resulting head still receives its own hosted qualification and merge verification.

| Control | Actual result |
| --- | --- |
| Local strict typecheck/build | Native exit0; source unchanged |
| [Post-merge native CI40055049859](https://github.com/TheHalfMoon/Ascout/actions/runs/40055049859) | Six actual full native/typecheck/build lanes PASS with source guards; both Windows lanes2,350passed/34existing skips |
| Local complete canonical npm suite | Native exit1;755.89seconds;241files:239passed/2failed;2,346passed/4failed/34existing skips; source unchanged |
| Local failures | Three unchanged Git tree-digest deadlines (15s/5s/5s) and unchanged T058 source-drift deadline (5s) |
| Final independent TesterArmy fixture controls | Working exit0/pass1; broken exit1/ASSERTION_FAILED; zero model tokens; pinned Playwright1.63.0/Chromium1243; original fixture hashes preserved |
| Production dependency audit | Native exit0; zero advisories |
| Full development dependency audit | Native exit1; five affected-package entries: two high/three moderate, eight underlying advisories |

The TesterArmy fixture check uses its normalized-text/visibility semantics; it does not add or certify an Ascout visibility API. Ascout's bounded literal API has its own real-browser tests. The four local full-suite failures remain failures despite six passing hosted controls. No timeout/platform condition was changed, no failure was deselected, and no sole environmental cause is asserted.

## Remaining blockers and limits

**E00 local timing qualification:** the canonical untouched baseline previously passed235files/2,231tests. Actual invocation-context and shared-install-junction errors were diagnosed and repaired without weakening tests. Repeated Git launches dominate retained successful traces; source/error binding is insufficient for a single retrospective explanation of the original300/900-second captures. The latest complete local main control still times out in existing Git/drift cases. Low disk/RAM and explicit earlier Windows paging/VirtualAlloc errors are observations, not proof of every failure's cause. Removing three verified disposable installs reclaimed space but did not establish a timing fix. A bounded two-installed-Git comparison did not support switching tools.

Further timing qualification needs a controlled Windows environment with adequate resource headroom, or a separately coordinated and qualified repair on the owning Git/runtime workstream. Existing PR614 declares a stack on589 and its effective review gate; neither branch was imported or silently authorized here. Another blind rerun or deadline increase is not a repair.

**Development dependencies:** the refreshed audit reports source-map-js, Vite and the Vitest/mocker/coverage group. Suggested patched versions in that response are source-map-js1.2.2, Vite6.4.5 and Vitest/coverage4.1.12. No package/lockfile changed. Historical audit20-entry/two-advisory results remain retained; changed registry responses are not evidence that dependencies were repaired. E05 is deferred outside this directive and has no implementation.

**Shadow receipts:** Self Verification green means valid source-bound capture under Spec006 FR-006-010. Actual inner exit1/T082-T087 packaging FAIL/materially-incomplete and unavailable selector comparisons remain explicit, never clean quality PASS.

Local D1 was advisory and missed a material finding. Actual Alibaba OCR local rules, Graft static navigation, fresh PStack correctness/security reviews and real TesterArmy execution are recorded within their capabilities. Reviewers share the session model/provider lineage; provider independence is not claimed. UA-P07 remains unauthorized and no broad security-phase completion is inferred.

## Evidence and cleanup

The archive and evidence-lock contain sanitized source-bound controls, complete hosted logs, benchmark observations, RED/fix/review history, interrupted captures, dependency reports, real E2E reports and inspected synthetic screenshots. Manifest records distinguish original and published hashes. Private process inventories and raw research expansion remain unpublished; original canonical local evidence is retained.

Only a verified owned E04 fixture/profile and the three merged feature worktrees' physical dependency installs were disposed after remote evidence verification. Source worktrees, the original dirty checkout, canonical raw evidence, active browser install and final-main control were preserved. No paid service, global runtime setting, protection rule, security policy, admission flag or unrelated project changed. Final coordination/post-merge checks are recorded against their resulting exact heads in GitHub and the subsequent evidence snapshot.
