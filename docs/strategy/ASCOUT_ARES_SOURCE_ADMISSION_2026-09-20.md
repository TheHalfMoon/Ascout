# Ascout ARES Source Admission Dossier — 2026-09-20

**Status:** `PLANNING_CANONICALIZATION_CANDIDATE / SOURCE_UNAVAILABLE / IMPLEMENTATION_NOT_AUTHORIZED`  
**Ledger:** Issue #419  
**Planning amendment authority:** Issue #420  
**Planning base:** `088624f5922d26e4c3a5ffb3e757e08864c16ae8`  
**Requested upstream:** `https://github.com/GoCodeAlone/ARES`

## 1. Purpose

This dossier prepares Ascout to copy, adapt, characterize, and integrate the requested ARES source when the exact requested upstream becomes accessible.

It records explicit repository-owner authorization to copy and adapt all source code from the requested donor while preserving Ascout provenance, attribution, evidence, and phase/effect boundaries.

This dossier does not claim that source bytes were fetched, reviewed, admitted, copied, or implemented.

## 2. Founder source-use authorization

```text
REQUESTED_DONOR = https://github.com/GoCodeAlone/ARES
FOUNDER_COPY_ADAPT_AUTHORIZATION = YES
COPY_ALL_REQUESTED = YES
ASCOUT_DESTINATION = TheHalfMoon/Ascout
```

The authorization establishes project-owner intent to reuse the donor. It does not replace immutable source binding, embedded third-party attribution, license/NOTICE obligations, dependency review, or technical qualification.

## 3. Live discovery truth

At the 2026-09-20 admission attempt:

- the connected GitHub API returned `404 Not Found` for `GoCodeAlone/ARES`;
- repository search under `GoCodeAlone` did not return a repository named `ARES`;
- exact repository/fork searches did not produce a trustworthy fork or relocation tied to the requested upstream;
- no replacement repository identity was established.

```text
SOURCE_BYTES_AVAILABLE = NO
IMMUTABLE_UPSTREAM_COMMIT = UNRESOLVED
IMMUTABLE_UPSTREAM_TREE = UNRESOLVED
UPSTREAM_PATH_INVENTORY = UNRESOLVED
ROOT_LICENSE = UNRESOLVED
PATH_LEVEL_LICENSE_NOTICE = UNRESOLVED
EMBEDDED_THIRD_PARTY_INVENTORY = UNRESOLVED
SOURCE_ADMITTED = NO
SOURCE_COPY_PERFORMED = NO
```

No similarly named ARES repository may be substituted without a new exact identity decision.

## 4. Copy-all interpretation

`COPY_ALL_REQUESTED = YES` means the complete accessible upstream tree must be inventoried and dispositioned before integration rather than selecting an undocumented subset.

Every upstream path must receive one disposition:

```text
COPY_AS_IS
ADAPT
TRANSLATE
VENDOR_AS_SEPARATE_COMPONENT
DEPENDENCY_ONLY
FIXTURE_OR_TESTDATA_ONLY
REFERENCE_ONLY
EXCLUDE_GENERATED
EXCLUDE_BINARY
EXCLUDE_SECRET_OR_CREDENTIAL
EXCLUDE_UNRESOLVED_PROVENANCE
EXCLUDE_INCOMPATIBLE_RIGHTS
EXCLUDE_IRRELEVANT
```

Every exclusion must be explicit. Silent omission is prohibited.

## 5. Immutable source qualification

Before any source byte is copied into Ascout, establish:

1. canonical upstream repository URL;
2. full immutable commit SHA and tree SHA;
3. complete tracked path list;
4. exact submodule and Git LFS identities when present;
5. root and nested legal files;
6. generated, vendored, binary, model, dataset, fixture, and third-party directories;
7. exact release artifact checksums when an artifact is part of the source basis.

A branch, tag, release name, README, or website description is not sufficient immutable identity.

## 6. Path-level rights, NOTICE, and attribution

For every selected path or homogeneous path group record:

- governing license;
- copyright owner or notice;
- NOTICE and attribution obligations;
- donor-authored versus generated, vendored, or externally copied provenance;
- redistribution or source-availability conditions;
- dataset/model/content terms separate from code license;
- compatibility with Ascout Apache-2.0 distribution intent;
- exact required destination notices.

No path with unresolved provenance or obligations may be merged as imported/adapted source.

## 7. Required Ascout provenance

Every import PR must declare `imported_or_adapted_source: YES` and include Class C provenance containing the exact upstream repository, immutable commit, upstream paths, license/copyright, use type, Ascout destination paths, modifications, compatibility review, attribution, and reviewer record.

`THIRD_PARTY_NOTICES.md` must be updated for copied, adapted, bundled, or newly introduced dependency material that requires disclosure.

## 8. Full-tree capability inventory

After immutable source acquisition, classify the entire donor tree before selecting implementation slices. At minimum inventory:

- CLI/API/SDK surfaces;
- engine/plugin registries;
- review, test, security, and cyber capabilities;
- browser/web/app control;
- runtime/process/network/filesystem authority;
- model/provider and credential integrations;
- persistence/workflow/orchestration;
- evidence, findings, coverage, and report formats;
- retries/recovery;
- publication/GitHub effects;
- UI/IDE/MCP surfaces;
- benchmarks/fixtures/test corpora;
- supply-chain/build/release tooling.

Every capability must map to an existing Unified Assurance phase or be marked `NO_AUTHORIZED_PHASE`.

## 9. Authority mapping

Source admission never widens runtime authority.

- declarative engine descriptors/availability: separately authorized UA-P02;
- review execution: separately authorized UA-P03;
- testing execution: separately authorized UA-P05;
- security engine integration: separately authorized UA-P06;
- deep audit: separately authorized UA-P07;
- real web/app/process execution: separately authorized UA-P08/P09;
- cyber planning/dynamic security: separately authorized UA-P11/P12;
- donor migration/parity: separately authorized UA-P16;
- packaging/notices/SBOM: separately authorized UA-P17.

Capabilities without an authorized phase remain inventoried but unimplemented.

## 10. Characterization before adaptation

Before changing donor behavior:

1. record exact upstream paths and blobs;
2. freeze public entry points and observable outputs;
3. capture deterministic fixtures where possible;
4. capture error and failure behavior;
5. capture authority, persistence, and egress requirements;
6. bind characterization to exact upstream identity;
7. define the Ascout adaptation contract;
8. prove parity or classify each intentional semantic difference.

Passing Ascout tests after a rewrite does not substitute for donor characterization.

## 11. Integration model

```text
exact donor capability
  -> characterization
  -> provenance-qualified source slice
  -> Ascout-owned adapter/contract boundary
  -> normalized evidence
  -> Ascout reconciliation
  -> Ascout claim policy
```

Donor findings, scores, verdicts, or success states remain producer observations until Ascout validates source identity, applicability, coverage, freshness, and required evidence.

## 12. Security, privacy, and dependency admission

Before copied code can run, enumerate process execution, network destinations, credentials, source/context egress, filesystem writes, persistence, subprocess/tool installation, browser/app control, destructive operations, telemetry/update checks, and dynamic plugin loading.

Review donor dependencies, install/build scripts, native binaries, platform payloads, mutable ranges, and transitive runtime implications. Source admission alone grants no network, provider, credential, publication, or process-execution authority.

## 13. Destination layout

The destination layout must preserve source traceability. Prefer a clearly bounded vendored subtree for substantially intact source, Ascout-owned modules for adapted source with Class C records, and dedicated fixture/testdata paths for characterization material.

Do not flatten donor files into unrelated modules in a way that destroys origin traceability.

## 14. Copy-all completion accounting

```text
UPSTREAM_TRACKED_PATHS = N
PATHS_DISPOSITIONED = N
UNCLASSIFIED_PATHS = 0
UNRESOLVED_RIGHTS_PATHS_SHIPPED = 0
UNMAPPED_COPIED_OR_ADAPTED_PATHS = 0
UNMAPPED_REQUIRED_NOTICES = 0
UNCHARACTERIZED_SELECTED_BEHAVIOR = 0
HIDDEN_EFFECT_AUTHORITY_EXPANSIONS = 0
```

The final source-migration report must publish counts by disposition and exact upstream-to-destination mapping.

## 15. Work-packet sequence once source access exists

### ARES-A01 — Source identity and tree freeze

Freeze repository, commit, tree, complete path inventory, legal files, submodules, and LFS objects. No source import.

### ARES-A02 — Path-level provenance qualification

Classify license/NOTICE/copyright, embedded third-party material, copy/adapt/exclude dispositions, and destination proposal. No runtime integration.

### ARES-A03 — Capability characterization

Produce capability/effect/egress/dependency inventory, characterization fixtures/tests, and phase mapping. No authority widening.

### ARES-A04 — Bounded source intake slices

Use one separately authorized task/branch/PR per coherent source slice. Include exact provenance, required notices, copied/adapted source, characterization/parity tests, full CI, exact-head review, guarded merge, and post-merge qualification.

### ARES-A05 — Whole-tree reconciliation

Require every pinned upstream path dispositioned, every copied/adapted destination mapped, every exclusion justified, no unresolved provenance, and no hidden runtime dependency.

## 16. Per-intake qualification gate

```text
exact_upstream_pin = verified
selected_upstream_paths = exact
selected_upstream_blob_ids = recorded
path_level_rights = PASS
required_notices = present
embedded_third_party = dispositioned
dependency_delta = reviewed
effect_delta = reviewed
characterization = PASS
parity_or_intentional_delta = explicit
ascout_exact_head_ci = PASS
independent_exact_head_review = PASS
unresolved_material_threads = 0
guarded_expected_head_merge = PASS
post_merge_ci = PASS
```

Any failed required gate remains failure evidence and is not rerun-to-green.

## 17. Current executable boundary

```text
FOUNDER_COPY_ADAPT_AUTHORIZATION = YES
COPY_ALL_REQUESTED = YES
REQUESTED_SOURCE_URL = https://github.com/GoCodeAlone/ARES
REQUESTED_SOURCE_ACCESSIBLE = NO
SOURCE_ADMITTED = NO
DONOR_CODE_COPIED = NO
UA_P02_IMPLEMENTATION_AUTHORIZED = NO
ASCOUT_PROJECT_COMPLETE = NO
```

The next executable source transition is recovery of the exact requested repository or an owner-provided exact archive/mirror. ARES-A01 then begins from that recovered immutable identity; discovery may not silently substitute another ARES project.

## 18. Dossier completion state

After this dossier is merged canonically:

```text
ARES_FOUNDER_PERMISSION_RECORDED = YES
ARES_COPY_ALL_INTENT_RECORDED = YES
ARES_SOURCE_ADMISSION_PLAN_DEFINED = YES
ARES_SOURCE_BYTES_ADMITTED = NO
ARES_IMPLEMENTATION_AUTHORIZED = NO
UA_P02_IMPLEMENTATION_AUTHORIZED = NO
```

Refs #419  
Refs #420