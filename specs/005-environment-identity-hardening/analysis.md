# Specification 005 Cross-Artifact Analysis

## Inputs

- `.specify/memory/constitution.md`
- `docs/founding/MASTER_PLAN_V1.md`
- `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`
- `spec.md`
- `clarifications.md`
- `COMPATIBILITY_POLICY.md`
- `ponytail-review.md`
- `plan.md`
- `plan-ponytail-review.md`
- `tasks.md`
- `checklists/requirements.md`

## Findings

### A1 — Roadmap alignment

`PASS`. Only M1.1-B environment/tool identity depth; task-level tool identity is not redesigned.

### A2 — Evidence integrity / no-green-by-omission

`PASS`. Environment metadata cannot substitute for source-bound verification or missing evidence and does not change completeness solely by absence of optional supplemental metadata.

### A3 — Trust / execution authority

`PASS`. No new process execution/install. `discovery.packageManager` remains the sole manager authority.

### A4 — Privacy

`PASS`. Raw host/user/network/env/secret identity is prohibited; paths remain canonical repository-relative and filesystem hash reads re-check realpath containment.

### A5 — Receipt compatibility

`PASS_AFTER_RECONCILIATION`. `RECEIPT_V1_ADDITIVE_LOCKSTEP` explicitly supports old receipts under new validators and new receipts under same-source/build validators while treating prior strict-schema rejection as expected unsupported skew. `run.ascout_version` is not a unique source/schema revision key; exact repository revisions bind compatibility proof. No negotiation/v2 expansion.

### A6 — Package-manager provenance

`PASS_WITH_EXPLICIT_RULE`. Discovery is sole manager authority. Declaration-led authority resolves only after exact `manager@x.y.z` validation; environment version is recovered from the same `DiscoveryFileMap["package.json"]` snapshot and must be exact/non-null. Contradictory snapshot state is integrity failure. No package.json disk reread or second resolver.

### A7 — Lockfile sentinel / byte-source boundary

`PASS_AFTER_RECONCILIATION`. Discovery records recognized lockfiles as empty-string presence sentinels because they are not content-required metadata. Those values are not file bytes and must never be hashed. T105 uses the canonical root plus the already-authorized repository-relative path to re-read exact filesystem bytes with realpath/symlink containment rechecked and bounded-memory hashing.

### A8 — Lockfile authority vs supplemental identity

`PASS_WITH_EXPLICIT_RULE`. If a lockfile supplied manager authority, inability to safely re-read/hash that exact authority source is integrity failure. If package.json supplied authority, only the fixed matching root lockfile present in the discovery snapshot may supply supplemental identity; absent/unsafe/missing/unreadable supplemental state becomes null and cannot trigger fallback or authority change.

### A9 — Discovery mutation boundary

`PASS`. `src/discovery.ts` remains excluded. Existing `root + files + discovery` is the full T105 input boundary; insufficiency is `NO_GO` + replanning.

### A10 — Task ordering

`PASS`. T104 contract/compatibility → T105 observation → T106 publication.

### A11 — Mutation surface

`PASS`. Expected product scope remains `src/environment.ts`, `src/check.ts`, `src/receipt/model.ts`, receipt-v1 schema, plus focused proof paths. No package/dependency/workflow/benchmark mutation.

### A12 — Benchmark-driven growth

`PASS`. Gap is directly measured against existing benchmark environment evidence; no unrelated capability promoted.

### A13 — Findings reconciliation

`PASS_PENDING_FRESH_HEAD_REVIEW`. Reconciled findings:

- F1 package-manager/lockfile authority provenance;
- F2 strict-validator compatibility;
- F3 false exact revision binding via `ascout_version`;
- F4 declaration-led manager could degrade to null version;
- F5 discovery lockfile sentinel could be mistaken for bytes / lockfile authority reread semantics were underspecified.

Every repair changed planning head, so all earlier independent reviews are stale. Fresh exact-head independent review is mandatory.

## Cross-artifact consistency result

`PASS / NO_MATERIAL_CONFLICTS_AFTER_F1_F2_F3_F4_F5_RECONCILIATION`

No implementation authority is granted by this analysis.
