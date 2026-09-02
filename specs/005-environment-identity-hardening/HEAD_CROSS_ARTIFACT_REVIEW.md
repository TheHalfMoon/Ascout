# Specification 005 HEAD Cross-Artifact Review Checklist

**Purpose:** final repository-side checklist for the planning head that will be independently reviewed in GitHub. This file does not substitute for independent review.

## Canonical references

- `.specify/memory/constitution.md`
- `docs/founding/MASTER_PLAN_V1.md`
- `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`
- complete `specs/005-environment-identity-hardening/` planning package

## Consistency checks

- [x] Problem statement matches M1.1-B evidence-depth roadmap language.
- [x] Scope is bounded to runtime/OS/arch/package-manager/lockfile run identity.
- [x] `schema_version` remains `"1.0"`.
- [x] Legacy receipt acceptance remains possible with no `environment` object.
- [x] No new child process, package installation, or execution authority is planned.
- [x] `discovery.packageManager` remains the sole package-manager authority decision.
- [x] Package-manager version recovery is limited to the same authoritative root package.json and requires same-manager consistency.
- [x] Lockfile identity is supplemental only and cannot change package-manager authority.
- [x] Lockfile-derived authority hashes only its exact discovery source; package-json-derived authority may inspect only the matching fixed root lockfile.
- [x] `src/discovery.ts` is outside the expected implementation surface; insufficiency requires `NO_GO` and replanning.
- [x] Privacy prohibitions exclude raw host/user/path/network/env/secret identity.
- [x] Environment metadata cannot satisfy or weaken verification completeness.
- [x] T104 → T105 → T106 ordering is dependency-valid.
- [x] No function coverage, M2 work, release, publication, tag, dependency, or workflow mutation is authorized.
- [x] Exact-head six-lane CI, independent review, guarded merge, and post-merge verification are required.
- [x] Implementation remains blocked until the planning merge is canonical and a durable authorization binds that merge.

## Branch-purity expectation

Planning PR must change only paths under:

`specs/005-environment-identity-hardening/`

Any product/test/package/workflow/benchmark-result change makes the planning PR `NO_GO`.

## Review disposition

`INTERNAL_CONSISTENCY = PASS_AFTER_PROVENANCE_RECONCILIATION`

`INDEPENDENT_EXACT_HEAD_REVIEW = REQUIRED`

`IMPLEMENTATION_AUTHORIZATION = NOT_YET_EFFECTIVE`