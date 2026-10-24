# Task022-T01: repair current development dependency advisories

Status: PROSPECTIVE_PLAN_ONLY. Base canonical mainaf5de7d1c56030d8842fc85c334cb8933d63fc08. Focused predecessor Task021 is closed through PR643, with six actual postmerge native passes and remotely verified closing evidence at1f24cc68d837145224510d184dbbe10e0c326232. E00/browser reliability, packaging compatibility and release readiness remain BLOCKED; completed REA/features are preserved.

## Constitution compliance and observed need

The user directs "fix that, and keep working" in the continuing engineering mission. This is a fresh bounded task for the current audit, not an extension or retrospective authorization of historical deferred Spec019. No new capability, direct/runtime dependency, major-version migration, service, implicit product installation, command authority, source API or UA-P07 scope is proposed. Existing package count and Node>=22 contract remain.

Native baseline npm audit at clean af5de7d exits1:five development entries, eight underlying advisories; two high/three moderate aggregate entries. Exact stdout SHA256650e77ceac8a440429d5ad7bf262f2729abf0880509be55a7ca6f903e2c4023d matches the earlier retained audit input/enrichment. Official GitHub records for all eight were actually retrieved; target exact-version OSV queries succeeded without vulnerabilityCheckFailed. Neither low exploitation ranking nor development-only use is a reason to omit the requested repair.

## Specification and material clarification

1. Pin existing direct development packages vite6.4.3→6.4.5, vitest4.1.11→4.1.12 and @vitest/coverage-v8 at the same4.1.12. Resolve only their required existing Vitest4.1.12 closure and existing transitive source-map-js1.2.1→1.2.2. No new/removed package identities or unrelated version/metadata changes.
2. Expected lock delta is root dev pins plus11existing package entries:the eight installed @vitest packages (coverage-v8,expect,mocker,pretty-format,runner,snapshot,spy,utils),vitest,vite,source-map-js. All other parsed entries, runtime/direct specifications, scripts, engines, package identity and configuration remain identical. Unexpected graph requirements require prospective reconciliation before proceeding.
3. Preserve all current license/provenance obligations. Reconcile the three changed direct notice entries with exact registry tarball/SRI/license; retain historical T086/generation evidence. In tests/vitest-check.integration.test.ts change only the two version-bearing lines (three4.1.11→4.1.12 literals:vitest fixture,coverage-v8 fixture,expected tool_version); keep every semantic assertion and test deadline. Add no test that merely restates a lock entry.
4. Use scripts-disabled native lock generation and an explicitly owned physical installation. npm ci must use the exact committed lock, no force/legacy-peer/implicit install/advisory suppression. Record npm ls, full/production audits, registry signatures/provenance and target versions. Full audit must actually clear the known findings; any remaining/new finding remains explicit and is reviewed, not relabeled.
5. Run strict typecheck/build, relevant native Vitest/coverage/packaging controls and the complete canonical suite with existing timeouts/skips. Preserve every failure and source start/end. Then fresh correctness/supply-chain/security review, all actual exact-head hosted checks/Self artifact and eligible guarded merge/postmerge proof. Existing local browser failure is separate debt; complete local PASS and qualified integrated main remain required for E00/release resolution.
6. Save sanitized source references, native command streams, exact graph diff, review/findings and verification in GitHub. No disposable cleanup until remote byte/hash readback. One task/branch/PR; no browser/packaging source repair is folded into this task.

The manifest dependency change may affect Ascout's changed-command-surface admission. Do not inject --allow-changed-command-surface or infer per-invocation admission from the general repair instruction. Preserve any actual Self NOT_RUN/FAIL/material incompleteness and native CI independently. A green capture is not a clean receipt.

## Target selection and remaining applicability audit

Official advisories identify source-map-js1.2.2 and @vitest/mocker4.1.12 fixes. Vite6.4.4 fixes the five recorded advisory ranges, but upstream6.4.5 additionally repairs server.fs checks after query stripping (commit91e40d7bf9777057bbd31c3eb036a54c9465697e; official changelog retrieved). Select that bounded current6.x security maintenance patch; do not follow a flattened metadata fixedVersion field into Vite8. Targets published:source-map-js2026-09-30,Vitest2026-10-15,Vite2026-10-21. Vite/Vitest are younger than14days today.

Issue617 is an AI-prepared record and PR616 applied its own two-week release-age rule. No universal release-age rule was identified in the current governing documents during preparation. A fresh independent plan/gate audit must establish applicability from actual sources; this plan neither grants an exception nor invents a global rule. Any effective mandatory outside gate remains a blocker; direct user scope does not silently waive it. Likewise verify that UA-P06-specific #618 reviewer requirements are not silently applied, satisfied or bypassed here.

Ownership/provenance checks retain their real warnings:Vitest maintainer additions/removals at4.1.9 and two account burst heuristics scored high54, largely the93%-single-scope Vitest release plus related monorepo packages. This is not proof of compromise or clearance. Exact Vitest4.1.12/Vite6.4.5 structural SLSA provenance matches declared GitHub source/hosted publish workflows; source-map-js1.2.2 lacks provenance, consistent with sampled peers. Actual cryptographic npm verification and fresh independent judgment remain required; no tool score approves the update.

## First reduction and hard stops

Existing patch families only. No npm audit fix, override, new dependency, package manager migration, vendoring, production source change, test skipping/weakening, deadline increase, workflow/policy change, broad security phase, paid service or release. Historical Spec019 and PR589/614/security drafts remain untouched. Fix only a demonstrated in-scope defect; prospectively reconcile new facts rather than expanding this task silently.
