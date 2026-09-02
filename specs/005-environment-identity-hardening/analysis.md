# Specification 005 Cross-Artifact Analysis

## Inputs

- `.specify/memory/constitution.md`
- `docs/founding/MASTER_PLAN_V1.md`
- `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`
- `spec.md`
- `clarifications.md`
- `COMPATIBILITY_POLICY.md`
- `plan.md`
- `tasks.md`
- `checklists/requirements.md`

## Findings

### A1 — Roadmap alignment

`PASS`. Only M1.1-B environment/tool identity depth; task-level tool identity is not redesigned.

### A2 — Evidence integrity / no-green-by-omission

`PASS`. Environment metadata cannot substitute for source-bound verification or missing evidence.

### A3 — Trust / execution authority

`PASS`. No new process execution/install; discovery remains sole manager authority.

### A4 — Privacy

`PASS`. Raw host/user/network/env/secret identity is prohibited; lockfile reads remain within canonical root with realpath containment.

### A5 — Receipt compatibility

`PASS_AFTER_RECONCILIATION`. Additive lockstep honestly records stale strict-schema rejection. `run.ascout_version` is not a unique source/schema key; exact repository revisions bind proof. No negotiation/v2 expansion.

### A6 — Prior-schema evaluator proof

`PASS_AFTER_RECONCILIATION`. Live `src/receipt/json.ts` has one canonical evaluator, but `validateReceiptJsonSchema()` currently reaches it only through the current bundled schema loader. A prior-schema rejection test would otherwise require a copied evaluator, forbidden dependency, or unsafe schema-file manipulation. T104 therefore explicitly includes a narrow `src/receipt/json.ts` reuse/testability refactor: current runtime validation remains current-schema-only, while repository-local proof may invoke the same evaluator with the immutable exact prior schema. No second evaluator, dependency, runtime schema selection, or negotiation is authorized.

### A7 — Package-manager provenance

`PASS_WITH_EXPLICIT_RULE`. Declaration-led exact version comes from the same discovery package.json snapshot; contradiction is integrity failure; no disk reread/second resolver.

### A8 — Lockfile sentinel / byte-source boundary

`PASS_AFTER_RECONCILIATION`. Discovery lockfile map values are presence sentinels and are never hashed. Exact filesystem bytes are reread from the already-authorized path with containment rechecked and bounded-memory hashing.

### A9 — Lockfile authority vs supplemental identity

`PASS_WITH_EXPLICIT_RULE`. Authority lockfile reread/hash failure is integrity failure; package-json supplemental matching-lockfile failure is nullable and cannot trigger fallback.

### A10 — Discovery mutation boundary

`PASS`. `src/discovery.ts` remains excluded; insufficiency is `NO_GO` + replanning.

### A11 — Task ordering

`PASS`. T104 contract/compatibility → T105 observation → T106 publication.

### A12 — Mutation surface

`PASS_AFTER_RECONCILIATION`. T104 explicitly includes `src/receipt/model.ts`, receipt-v1 schema, and the narrow `src/receipt/json.ts` evaluator-reuse refactor plus immutable prior-schema/current JSON proof. T105 is `src/environment.ts`; T106 is minimal `src/check.ts` wiring. No package/dependency/workflow/benchmark mutation.

### A13 — Benchmark-driven growth

`PASS`. Gap is directly measured against existing benchmark environment evidence; no unrelated capability promoted.

### A14 — Findings reconciliation

`PASS_PENDING_FRESH_HEAD_REVIEW`. Reconciled findings:

- F1 package-manager/lockfile authority provenance;
- F2 strict-validator compatibility;
- F3 false exact revision binding via `ascout_version`;
- F4 declaration-led manager could degrade to null version;
- F5 discovery lockfile sentinel/byte-source and authority-reread semantics;
- F6 prior strict-schema proof was not implementable through the canonical evaluator within the stated T104 surface.

Every repair changed planning head; all earlier independent review evidence is stale. Fresh exact-head independent review is mandatory.

## Cross-artifact consistency result

`PASS / NO_MATERIAL_CONFLICTS_AFTER_F1_F2_F3_F4_F5_F6_RECONCILIATION`

No implementation authority is granted by this analysis.
