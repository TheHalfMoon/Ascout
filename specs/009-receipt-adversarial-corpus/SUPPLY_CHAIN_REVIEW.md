# Specification 009 — Supply Chain Review

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Planned external inputs

None.

Spec 009 implementation is designed to use only repository-existing capabilities:

- Node already supported by the repository;
- existing Vitest setup;
- current TypeScript codebase;
- current `validateReceiptJsonSchema` implementation;
- current `validateReceiptSemantics` implementation;
- current Receipt v1 contract/schema.

## Dependency decision

`NEW_DEPENDENCY = NO`

No runtime or development dependency is justified.

Rejected candidates include:

- property-testing libraries;
- mutation-testing libraries;
- fuzzers;
- external receipt corpora;
- hosted security/evaluation services;
- LLM-generated case providers.

## Network and data boundary

`NETWORK_REQUIRED = NO`

The planned corpus uses deterministic in-repository test data only. It requires no donor source checkout, package fetch beyond the repository's existing exact lockfile installation, external API, model, browser, credential, secret, or telemetry endpoint.

## Licensing/provenance impact

No third-party source, fixture, dataset, rule corpus, or copied implementation is planned to enter the repository. Therefore no new redistribution notice or dependency license review is required for the planned T115 surface.

If implementation later proposes any third-party corpus or dependency, this supply-chain decision becomes stale and implementation MUST return to planning before that material enters the branch.

## Security boundary

The corpus itself must not contain real credentials or secret material. Synthetic placeholder values may be used only when needed to test a deterministic format rule and must not be represented as universal secret-detection evidence.

## Conclusion

`SUPPLY_CHAIN_REVIEW = PASS / ZERO_NEW_EXTERNAL_SURFACE`
