# Specification 005 Receipt v1 Compatibility Policy

**Status:** PLANNING POLICY / IMPLEMENTATION_NOT_AUTHORIZED

## Decision

`RECEIPT_V1_ADDITIVE_LOCKSTEP`

Receipt `schema_version = "1.0"` identifies the receipt-v1 semantic family. It does **not** promise that every older strict JSON Schema revision accepts every receipt produced by a newer Ascout revision.

Spec 005 follows the already-canonical Spec 004 additive-v1 precedent, but makes the version-skew behavior explicit instead of claiming generic forward compatibility.

## Supported compatibility guarantees

1. **Backward receipt compatibility:** the updated supported v1 validators MUST continue to accept canonical older v1 receipts that do not contain `environment`.
2. **Current producer compatibility:** all validators and consumers shipped/supported by the same canonical Ascout revision as the new producer MUST understand the optional `environment` extension or mechanically ignore it where they do not inspect that field.
3. **No stale-strict-validator guarantee:** a strict validator from an older Ascout revision whose schema has `additionalProperties: false` and no `environment` property is expected to reject a newer environment-bearing receipt. That version-skew combination is not a supported producer/validator pairing.
4. **No silent claim of forward compatibility:** documentation/tests MUST record the expected rejection by the prior strict schema so users cannot infer that retaining `"1.0"` means stale validators are safe.
5. **Producer revision binding:** `run.ascout_version` remains the producer-revision signal within the v1 family. Consumers that require strict schema validation MUST use a validator revision compatible with that producer revision, or a newer validator explicitly proven to accept that producer's receipt.
6. **No mixed-schema self-validation:** Ascout itself MUST validate receipts it emits with the current canonical semantic validator and current canonical JSON Schema from the same source revision.

## Why not introduce `1.1` or receipt v2 here?

A new schema-version negotiation mechanism would materially widen this M1.1 evidence-depth slice into receipt-version architecture. Current canonical Spec 004 already established additive optional receipt-v1 evolution, and this repository is not authorizing publication/release migration in Spec 005. The bounded correction is to define and test the existing additive-v1 compatibility model honestly.

A future independently authorized release/versioning milestone may replace this policy with explicit minor-version negotiation. Spec 005 does not pre-authorize that work.

## Supported consumer set for Spec 005

Repository-supported receipt consumers/validators affected by the contract are:

- TypeScript `ReceiptV1` model and semantic validation in `src/receipt/model.ts`;
- JSON Schema validation using `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json` through the repository's receipt JSON path;
- current-revision JSON/agent/terminal consumers that accept a `ReceiptV1` and do not independently pin an older schema revision.

No external stale schema copy is declared supported for environment-bearing receipts.

## Required T104 compatibility proof

T104 MUST prove all four cases:

1. **old receipt + new semantic validator = ACCEPT**;
2. **old receipt + new JSON Schema validator = ACCEPT**;
3. **new environment receipt + new semantic/JSON Schema validators = ACCEPT**;
4. **new environment receipt + exact prior strict schema revision = REJECT_EXPECTED_VERSION_SKEW**.

The fourth test is a policy proof, not a product failure. The test must bind the prior schema revision to canonical pre-Spec-005 source identity (commit/blob or an exact immutable fixture) so it cannot silently drift.

## Current consumer proof

T104/T106 MUST also prove that current repository consumers do not break merely because the optional field exists:

- JSON rendering remains deterministic;
- agent rendering continues to operate without needing a bespoke environment presentation;
- terminal behavior is unchanged unless existing generic rendering mechanically includes the field;
- no consumer may independently validate with a stale schema bundled in the same revision.

## Hard boundary

This policy does not authorize:

- receipt `1.1` or v2;
- schema negotiation/protocol machinery;
- publication or release migration;
- compatibility promises for unknown third-party validators;
- relaxing `additionalProperties: false` globally;
- deleting strict validation.
