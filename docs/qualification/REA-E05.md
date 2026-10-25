# Task022 development dependency qualification

This task patches existing development dependencies to remove the current known advisories. Runtime dependencies, production code, Node support, commands, configuration, test semantics and deadlines remain unchanged. The canonical base is af5de7d1c56030d8842fc85c334cb8933d63fc08. The implemented native-control source is43848672b2c68380d8b01797004ee57a02cbf984, treecac725ffcbf21b382b7c9469f4b0ca353933c148.

## Dependency and source binding

Direct development pins change to Vite 6.4.5, Vitest 4.1.12 and coverage-v8 4.1.12. The lock retains 417 identities:root pins plus 11 existing records change, including the installed Vitest family and transitive source-map-js 1.2.2. All other parsed entries are identical. Only three fixture/expected-version literals across two test lines change; every assertion and timeout remains intact. Current direct notices reconcile exact registry URLs, SRI values and MIT licenses; the transitive source-map-js license is BSD-3-Clause.

Native scripts-disabled npm resolution eagerly upgraded 34 unrelated records. A native prefer-dedupe retry produced the same intermediate5ee90fe321c80669cec8eadb2eeddf828655e9c2abdb27c82bf473d72b2a3952. The selected lock684abc899b555f6e8e929f68a7721c0823281ef7e43e83f1504177573d61c7aa copies the native root/11 records verbatim and retains every other canonical entry. Native npm semver and a separate reviewer verified all 85 target edges and the complete graph, including aliases, with no new range failure. Exact-lock npm ci and npm ls subsequently exited0. No overrides, new direct dependency or synthesized tarball metadata were used.

The initial resolver report raced a reusable snapshot filename and misidentified the selected lock as the original native intermediate. Its original bytes remain in evidence. The corrected forward report explicitly binds immutable first-native files and both different hashes; a separate correctness reviewer verified the correction. No source/dependency result is inferred from the erroneous report.

## Advisory findings

The baseline full native audit exited1 with five aggregate development entries and eight underlying advisories. Actual input bytes matched the earlier retained enrichment. NPMScan ranked only three first-per-package findings as monitor based on low EPSS; it explicitly skipped two aggregate entries and warned that additional advisories were not ranked. This did not defer the repair. All eight official records and exact-version queries are retained. The candidate full and production audits both exit0 with zero findings.

| Package | Recorded issues | Exact repair | Source |
| --- | --- | --- | --- |
| Vite | GHSA-698v-4r3x-3vcv / CVE-2026-112943 (medium); GHSA-r825-w8mm-5pxw / CVE-2026-112944 (medium); GHSA-587h-7wmj-h5pm / CVE-2026-112942 (high); GHSA-9jrq-w75r-8gcw / CVE-2026-112945 (low); GHSA-rq7h-c2jc-7f22 / CVE-2026-112946 (medium) |6.4.3 to6.4.5; the6.x advisory fix is6.4.4 and6.4.5 additionally repairs server.fs checks after query stripping | [NPMScan](https://npmscan.com/package/vite) |
| source-map-js | GHSA-68fv-2mgg-jv7q / CVE-2026-93749 (high) |1.2.1 to1.2.2 | [NPMScan](https://npmscan.com/package/source-map-js) |
| @vitest/mocker | GHSA-qxg6-89mg-rqv8 / CVE-2026-112949 and GHSA-xp26-3454-mjgp / CVE-2026-112950 (both medium) |4.1.11 to4.1.12 through the existing Vitest family | [NPMScan](https://npmscan.com/package/%40vitest%2Fmocker) |
| Vitest and coverage-v8 | Native audit aggregate effects of the mocker findings; direct-package OSV cleanliness alone does not prove the transitive graph clean | Pin both existing packages to4.1.12 | [Vitest](https://npmscan.com/package/vitest), [coverage](https://npmscan.com/package/%40vitest%2Fcoverage-v8) |

Official severities above remain distinct from NPMScan's first-advisory ranking/aggregate fields. Exact official fixed-version branches are preserved; a flattened latest-major Vite8 field is not adopted. The resolved before/after NPMScan diff reports zero added/removed packages,11 upgrades, no new lifecycle script, no source swap or identity mismatch, and fixed findings for Vite, mocker and source-map-js. Parent Vitest/coverage fields say still-clean for their own package advisories; the native full graph audit supplies the aggregate check.

## Supply-chain and license limits

All 22 old/target official registry responses are hash bound. None of the 11 target packages adds a dependency identity or preinstall/install/postinstall/prepare script. Actual installed metadata matches registry and lock names, versions, URLs, SRI and MIT/BSD-3-Clause identifiers. Native npm audit signatures exits0 with invalid[] and missing[]; no verified-package count or universal attestation guarantee is inferred from that JSON.

Vite/Vitest exact structural SLSA provenance matches their declared repositories, commits and GitHub hosted publishing workflows. Those structural checks are not cryptographic verification. source-map-js 1.2.2 has no publish provenance, consistent with the sampled peers; absence is a recorded trust limit, not compromise proof. Vitest's two added-maintainer account checks scored high 54 for clustered publication, predominantly a 93%-single-scope coordinated monorepo release. Those warnings and the tool's account-list truncation limit remain explicit. They neither approve the upgrade nor prove malicious publication.

Vite 6.4.5 was published2026-10-21 and Vitest 4.1.12 on2026-10-15. Both are under 14 days on the qualification date. Actual applicability review found PR616's own minimum and the AI-prepared historical617 follow-up, without a universal maintenance age gate. #618's effective provider-specific conditions remain scoped to UA-P06; no outside-provider review or age exception is claimed. Native installation also reports unchanged inflight1.0.6/glob7.2.3/glob10.5.0 deprecations; audit zero does not erase those maintenance warnings.

## Reviews, controls and remaining work

Fresh PStack plan and separate consistency reviews preceded implementation. Candidate combined correctness/product/parsimony and separate supply-chain/security reviews found no actionable source issue. They share OpenAI lineage; fresh context is not provider independence. Actual local D1 triage is advisory only. Actual Alibaba OCR preview selects package.json only and excludes 13 paths; local rules run is not a Claude or external-model verdict. Excluded files receive fresh manual review. Graft is not rerun for unchanged production source, and no new TesterArmy execution is claimed for this dependency-only task.

The first complete native run overlapped a reviewer helper that launched 834 Git processes. Root's permission for a supposedly lightweight read-only review to overlap timing qualification was an orchestration error. The process churn is a real confounder; it neither invalidates any native FAIL nor establishes causality. That run exits1 after 984.97s:2,387 passed,4 deadline failures,34 existing platform skips. The failures are T107 exact-tree preservation and three Git tree-digest cases, at their original5000/15000ms deadlines.

The subsequent strictly serial unchanged-source control exits1 after 755.14s:2,390 passed,1 deadline failure,34 existing skips. The remaining case is drift.contract.test.ts, tracked worktree mutation changes tree_digest_v1,5,485 ms against 5,000 ms. No reviewer, install, model or audit ran alongside it; other user/OS activity was not measured or controlled. Both results remain FAIL. Exact matching T107/drift failures occurred before Task022 with Vitest 4.1.11, while Task021 later passed them. This documents historical recurrence but does not prove dependency contribution absent or identify a sole cause. There is no further repeat-until-green or deadline/source change in this task.

Actual native control results are appended from finished source-bound capture records. Final-head hosted native/Self checks, live governance/review/threads, guarded eligible merge and six actual canonical postmerge suites remain required. A successful Self capture is not an inner clean receipt; changed-command-surface refusal/incompleteness must remain visible and no admission flag is injected. Historical300/900-second and other failures, the demonstrated concurrent browser-disposal ownership gap, and packaging direct-Vitest incompatibility remain separate E00/release work. This focused repair makes no release-readiness claim.

## Actual native controls

All ten controls bind clean, unchanged source `43848672b2c68380d8b01797004ee57a02cbf984`, tree `cac725ffcbf21b382b7c9469f4b0ca353933c148`. Native evidence was captured on October 24; live main/governance were refreshed on October 25 and remained unchanged. Native exit codes are distinct from the capture wrapper's exit.

| Control | Native result |
| --- | --- |
| Exact-lock installation, scripts disabled | exit 0; 64.39 s |
| npm ls --all | exit 0 |
| Full and production npm audits | exit 0; zero findings each |
| npm audit signatures | exit 0; invalid: [], missing: [] |
| Strict typecheck and build | exit 0 each |
| Focused native runner/coverage/package controls | exit 0; 4 files, 20 passed |
| Complete suite with review overlap | **FAIL**, exit 1; 2,387 passed, 4 deadline failures, 34 existing skips; 984.97 s |
| Complete suite without overlapping agent work | **FAIL**, exit 1; 2,390 passed, 1 drift deadline failure, 34 existing skips; 755.14 s |

Both complete controls executed all 2,425 cases across 243 files. No failure, skip or deadline was hidden, weakened or relabeled. The source remains implemented and reviewed; exact-head hosted qualification and canonical close are pending. E00 and release readiness remain **BLOCKED**.

The fresh native-gate interpretation (`ec671b58f2da9f2d54246cb98dde904c9fa4c5b28a55ceae8197dc73ee79ed8a`) permits proceeding to CI for this focused task under the audited contract. It grants no merge approval, exception or causal finding. A demonstrated dependency regression must be repaired or block eligibility. Final integrated review, actual hosted execution and every effective live gate remain required.

## Reproducible evidence

[Evidence archive](../../qualification/development-dependencies/2026-10-24/evidence.zip) and [lock](../../qualification/development-dependencies/2026-10-24/evidence-lock.json): 172 members, SHA256 `29ead476a64393f75f5d069072ef9f16a2e49d4fb7818cecdc3ca35fe3d02ae8`. The manifest binds original and public-derivative hashes. It includes exact registry/advisory responses, both native resolver attempts and selection proof, all native command streams, review corrections, source bindings, local tool execution and reproduction scripts. Local home paths, public emails and author/committer/raw signature profiles are minimized; public source references remain verifiable. No registry cache, installed dependencies, opaque Self archive or private REA expansion is published.

## Forward publication precision correction

Initial exact-head publication/integration review at28dd81a found that an overly broad email pattern also masked package@numeric-version identifiers, attestation URL suffixes and deprecation labels. Finding P022-PUB-EMAIL-PACKAGE-VERSION is preserved with both original review reports and the original packet in Git history. The forward publisher requires an alphabetic email domain suffix, retains explicit email/profile minimization and preserves package/version source fields. Actual corrected derivatives were compared against original identities, tarballs, integrity digests, complete attestation URLs and deprecation labels in35source-field checks. Fresh corrected-head review remains required; this is not security or release approval. The October25 audit/signature captures at28dd81a both exit0 with identical earlier output bytes and are included in the corrected172-member packet.
