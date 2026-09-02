# Specification 005 Cross-Artifact Analysis

## Inputs

- `.specify/memory/constitution.md`
- `docs/founding/MASTER_PLAN_V1.md`
- `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`
- `specs/005-environment-identity-hardening/spec.md`
- `clarifications.md`
- `COMPATIBILITY_POLICY.md`
- `ponytail-review.md`
- `plan.md`
- `plan-ponytail-review.md`
- `tasks.md`
- `checklists/requirements.md`

## Findings

### A1 — Roadmap alignment

`PASS`. The scope implements only M1.1-B environment/tool identity depth. Task-level tool identity already exists and is not redesigned.

### A2 — Constitutional evidence integrity

`PASS`. Environment identity is additional current-run metadata and cannot substitute for source-bound evidence or missing verification.

### A3 — No-green-by-omission

`PASS`. No requirement converts missing environment sub-observations into PASS. Existing completeness semantics remain unchanged.

### A4 — Trust/authority

`PASS`. No new process execution or implicit install is authorized. `discovery.packageManager` remains the sole package-manager authority decision and the observer cannot repair, replace, or broaden it.

### A5 — Privacy

`PASS`. The specification prohibits raw host/user/path/network/env/secret identity and constrains paths to repository-relative canonical form.

### A6 — Receipt compatibility policy

`PASS_AFTER_RECONCILIATION`. The prior claim that additive optional fields imply generic forward compatibility was unsafe under strict `additionalProperties: false`. The explicit policy is now `RECEIPT_V1_ADDITIVE_LOCKSTEP`:

- updated validators accept canonical older v1 receipts;
- updated validators accept new environment-bearing receipts;
- prior strict schema rejection of a new environment-bearing receipt is expected unsupported version skew and must be proven;
- all repository-supported consumers/validators in a producing revision move together;
- `run.ascout_version` is the producer-revision signal;
- no receipt 1.1/v2 negotiation is introduced.

This policy matches the canonical additive-v1 direction established by Spec 004 while correcting its overly broad old-parser assumption for strict validators.

### A7 — Package-manager provenance

`PASS_WITH_EXPLICIT_RULE`. Current discovery stores the resolved manager and exact source paths but does not preserve declaration version. Therefore version recovery is permitted only from the same authoritative root `package.json` already named by discovery, with a required same-manager consistency check. A contradiction is an integrity failure; no alternate manager may be selected.

### A8 — Lockfile provenance

`PASS_WITH_EXPLICIT_RULE`. Lockfile identity is supplemental evidence only. A lockfile-derived manager hashes only the exact discovery source lockfile. A package-json-derived manager may inspect only the fixed root lockfile matching that already-resolved manager. Non-matching lockfiles cannot affect authority. Absent/unsafe/unreadable supplemental identity remains null.

### A9 — Discovery mutation boundary

`PASS`. `src/discovery.ts` is intentionally excluded from the expected implementation surface. If T105 cannot satisfy provenance from current discovery truth plus its exact authoritative source files, the task must stop `NO_GO` and return to planning.

### A10 — Integrity failure vs optional absence

`PASS_WITH_EXPLICIT_RULE`. Optional metadata absence is not material incompleteness. Internal contradiction/failure while constructing a claimed object follows existing integrity-error semantics.

### A11 — Task ordering

`PASS`. T104 establishes schema/model and compatibility proof first, T105 establishes observer without publication, T106 wires publication last.

### A12 — Mutation surface

`PASS`. Expected product scope is four paths at most across the specification, plus focused proof paths/current consumer tests. No package/dependency/workflow/benchmark-result mutation is planned.

### A13 — Benchmark-driven growth

`PASS`. The measured gap is concrete: product receipt lacks run-level environment identity while existing benchmark evidence models environment identity as reproducibility context. No broader feature is promoted from this observation.

### A14 — Reviewer findings reconciliation

`PASS_PENDING_FRESH_HEAD_REVIEW`. Independent review found two material planning concerns across stale heads: package-manager/lockfile provenance and strict-validator compatibility. Both are now explicitly reconciled in canonical planning artifacts. Because the planning head changed, neither prior review qualifies the repaired head; fresh exact-head independent review remains mandatory.

## Cross-artifact consistency result

`PASS / NO_MATERIAL_CONFLICTS_AFTER_PROVENANCE_AND_COMPATIBILITY_RECONCILIATION`

No implementation authority is granted by this analysis.