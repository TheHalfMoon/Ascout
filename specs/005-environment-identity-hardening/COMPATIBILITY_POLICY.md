# Specification 005 Receipt v1 Compatibility Policy

**Status:** PLANNING POLICY / IMPLEMENTATION_NOT_AUTHORIZED

## Decision

`RECEIPT_V1_ADDITIVE_LOCKSTEP`

Receipt `schema_version = "1.0"` identifies the receipt-v1 semantic family. It does **not** promise that every older strict JSON Schema revision accepts every receipt produced by a newer Ascout revision.

Spec 005 follows the already-canonical Spec 004 additive-v1 precedent, but makes version-skew behavior explicit instead of claiming generic forward compatibility.

## Supported compatibility guarantees

1. **Backward receipt compatibility:** updated supported v1 validators MUST continue to accept canonical older v1 receipts without `environment`.
2. **Current producer compatibility:** validators and consumers shipped/supported from the same canonical source/build revision as the producer MUST understand the optional `environment` extension or mechanically ignore it where they do not inspect that field.
3. **No stale-strict-validator guarantee:** an older strict validator whose schema has `additionalProperties: false` and no `environment` property is expected to reject a newer environment-bearing receipt. That version-skew pairing is unsupported.
4. **No silent forward-compatibility claim:** documentation/tests MUST record expected rejection by the exact prior strict schema.
5. **No false in-receipt revision binding:** `run.ascout_version` is a product-version label, not a guaranteed unique source/schema-revision identifier. It MUST NOT select a schema revision, negotiate compatibility, or claim exact producer-source identity.
6. **No mixed-schema self-validation:** Ascout MUST validate emitted receipts with the semantic validator and JSON Schema from the same canonical source/build revision.
7. **One evaluator, multiple proof schemas:** current-schema acceptance and the pinned prior-schema rejection proof MUST run through the same canonical JSON Schema evaluator implementation. T104 may narrowly refactor `src/receipt/json.ts` so a repository-local test can supply an exact parsed schema to that evaluator. The normal `validateReceiptJsonSchema()` entry point MUST continue to load only the current bundled schema.

## Why not introduce `1.1` or receipt v2 here?

A new schema-version negotiation mechanism would widen this M1.1 evidence-depth slice into receipt-version architecture. Current canonical Spec 004 already established additive optional receipt-v1 evolution, and Spec 005 does not authorize publication/release migration.

A future independently authorized release/versioning milestone may replace this policy with explicit minor-version negotiation or an in-receipt schema-revision identifier. Spec 005 does not pre-authorize that work.

## Supported consumer set for Spec 005

Repository-supported receipt consumers/validators affected by the contract are:

- TypeScript `ReceiptV1` model and semantic validation in `src/receipt/model.ts`;
- JSON Schema validation through `src/receipt/json.ts` using the current `receipt-v1.schema.json`;
- current-source/build JSON/agent/terminal consumers that accept `ReceiptV1` and do not independently pin an older schema revision.

No external stale schema copy is declared supported for environment-bearing receipts.

## Required T104 compatibility proof

T104 MUST prove:

1. old receipt + new semantic validator = `ACCEPT`;
2. old receipt + new current JSON Schema = `ACCEPT`;
3. new environment receipt + new semantic/current JSON Schema validators = `ACCEPT`;
4. new environment receipt + exact prior strict schema = `REJECT_EXPECTED_VERSION_SKEW`.

The fourth case is a policy proof, not a product failure. The prior schema MUST be bound to the exact canonical pre-Spec-005 schema identity through an immutable repository-local fixture or equivalent exact source identity. The fourth case MUST use the same JSON Schema evaluator implementation as current validation; a test-local duplicate validator does not qualify.

The compatibility matrix is repository/source-revision proof. It does not imply that a receipt can identify the exact validator revision from `run.ascout_version` alone.

## Current consumer proof

T104/T106 MUST also prove:

- JSON rendering remains deterministic;
- agent rendering continues without bespoke environment presentation;
- terminal behavior is unchanged unless existing generic rendering mechanically includes the field;
- no current-source/build consumer independently validates with a stale schema.

## Hard boundary

This policy does not authorize:

- receipt `1.1` or v2;
- runtime schema negotiation, schema selection, or arbitrary external schema ingestion;
- an in-receipt commit/schema-revision field;
- a second JSON Schema evaluator or a new validation dependency;
- publication or release migration;
- compatibility promises for unknown third-party validators;
- relaxing `additionalProperties: false` globally;
- deleting strict validation.
