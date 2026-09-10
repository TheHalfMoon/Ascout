# Spec 012 Supply-Chain and Provenance Review

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Surface delta

Planning only. Twelve new markdown files under `specs/012-lcov-negative-taken-fidelity/`.
No source, test, workflow, action, dependency, lockfile, service, donor-code, parser,
runner, sandbox, provider, permission, secret, network-access, or executable-integration
change is planned or authorized.

## Prospective implementation surface (not yet authorized)

- `src/coverage/lcov.ts` (independently written repository code; minimal local rule);
- `tests/t122-lcov-negative-taken.contract.test.ts` (new, independently written).

No new dependency, action version, external service, donor code, or permission is
required. The pinned toolchain (Node 22/24, committed lockfile) is unchanged.

## Provenance

All planning text is independently written for this repository. No third-party text,
donor code, or generated provenance is introduced. `THIRD_PARTY_NOTICES.md` and
`docs/legal/CODE_PROVENANCE.md` require no update for this planning package; the
prospective implementation adds no third-party material.

```text
SUPPLY_CHAIN_REVIEW = PASS
NEW_SUPPLY_SURFACE = NONE
```
