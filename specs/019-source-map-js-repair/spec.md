# REA-E05: date-eligible source-map-js repair

Status: DEFERRED_OUTSIDE_CURRENT_SPEC_018_DIRECTIVE (2026-10-21); no implementation. The original proposal and local audit are retained as historical preparation, not an active completion task. This packet extends only REA-E05, leaving active REA-E01 through E04 scopes unchanged.

## Source binding and authority

Base main: ea93553a5423fd47f12a6bf282820dd199b994d4. Issue [617](https://github.com/TheHalfMoon/Ascout/issues/617) records a development-only source-map-js 1.2.1 denial-of-service advisory and a 1.2.2 follow-up eligible on or after 2026-10-14. Current date is 2026-10-20. The issue is an AI-prepared technical record, not founder authorization. The founder's current session authorizes genuine repairs, security checks and focused PR preparation; canonical exact-head scope/review/CI/merge gates remain pending. No UA-P07, paid service, release or merge is authorized here. Existing historical review-policy limitations remain as in the [session scope](../018-rea-engineering-qualification/IMPLEMENTATION_SCOPE.md).

## Specification and clarification

Prepare one main-based branch/PR changing only the existing node_modules/source-map-js lock entry from 1.2.1 to published 1.2.2, with focused documentation/evidence. The baseline full audit identifies GHSA-68fv-2mgg-jv7q / CVE-2026-93749 as high. Baseline production audit has zero advisories. The repair must remove this known high advisory without introducing other dependency movements, lifecycle scripts or runtime dependencies. This is an existing transitive development dependency, not a new capability.

The separate moderate sprintf-js advisory has no published fixed version in current audit enrichment. Do not downgrade Jest, invent a fixed version or claim all advisories are cleared. Preserve this residual finding explicitly.

## First reduction

No package.json override, new dependency, package manager migration, audit suppression, broad npm audit fix or application source change. Use the existing npm lock format and exact pinned target. Verify actual resolution instead of assuming npm update touches only the intended entry.

## Plan and second reduction

1. Freeze the original lock and audit result as RED evidence. Confirm the target version metadata, integrity, development-only path and lack of new install scripts/dependencies using the existing enriched evidence and official registry metadata.
2. Generate the minimal lock-only repair with scripts disabled. Reject unexpected entries or package.json changes. Compare parsed before/after snapshots, preserving all other entries exactly.
3. Perform an isolated npm ci with scripts disabled, npm ls --all, production/full audit and registry-signature verification. Check native typecheck/build and the full canonical npm test suite without changing timeouts/skips. Run relevant focused supply-chain tests only if present; do not add a test mirroring a lock entry.
4. Obtain fresh local review of the exact dependency delta, including upstream patch evidence and dependency-audit enrichment. Record shared model lineage and external independent-review/CI limits. Create a separate draft PR referencing #617; do not close the issue or merge.

Use no custom dependency framework or production API. Keep evidence outside the source tree until sanitized publication in the engineering evidence PR.

## Task, checklist and acceptance

REA-E05 depends only on exact main and this packet's fresh audit. Allowed paths: package-lock.json (only packages.node_modules/source-map-js), docs/qualification/REA-E05.md. No changes to other package entries, package.json, source, workflows, authorization files, active branches or their installations.

- RED audit and original lock hash preserved; target and date eligibility established.
- Exactly one parsed dependency entry changes; package inventory and direct dependency specifications remain identical.
- Target is 1.2.2 with verified registry integrity; no new scripts or dependencies.
- Isolated installation and npm ls pass; production advisories stay zero; high source-map-js advisory removed; remaining moderate findings are explicit.
- Typecheck, build, complete canonical test suite and signature check recorded against the exact source. All failures remain visible.
- Exact-head fresh local dependency review and applicable security evidence recorded. Canonical hosted CI and independent-review admission remain pending if unavailable.
- Separate focused draft PR and sanitized evidence are remotely verified before any disposable cleanup.

## Analysis and plan audit

The change does not overlap the four active feature surfaces. It uses a separate installation; the existing shared node_modules remains untouched. A full suite control will run serially after other active controls. Registry attestation or absence of provenance is evidence about package origin, not proof of security. The known upstream no-published-fix moderate advisory and hosted-CI billing block prevent an unqualified release-ready claim.

Fresh exact-head plan consistency/purity audit: PENDING. No implementation before that verdict; later status updates do not expand the allowed paths.
