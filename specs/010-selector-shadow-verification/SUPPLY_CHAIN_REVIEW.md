# Specification 010 Supply-Chain Review

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Decision

Spec 010 requires no new package, runtime dependency, GitHub Action, service, model, donor source, external API, or network acquisition.

`NEW_DEPENDENCIES = 0`

`NEW_ACTIONS = 0`

`NEW_SERVICES = 0`

`NEW_DONOR_CODE = 0`

## Existing components reused

### Vitest

The Ascout repository already pins Vitest in the exact lockfile and root package metadata. Spec 010 uses only the already-installed local runtime for one repository-local full-suite observation.

No `npx`, `npm exec`, package fetch, dynamic install, alternate version resolution, or runner substitution is authorized.

Implementation must reverify the exact then-current local Vitest/package-lock identity before T117 execution work. A changed root test contract or unavailable local runtime is an unavailable observation, not permission to acquire another tool.

### Existing GitHub Actions

T118 reuses the current `.github/workflows/self-verify.yml` action set and intends only to add one artifact path to the already-reviewed exact-SHA `actions/upload-artifact` step.

No new action or action version change is planned. T118 must reverify the then-current canonical action pins/license/use boundary before mutation. If a pin must change, that requires a separately reviewed amendment rather than silent substitution.

## Data/security boundary

The new artifact may contain only:

- Git object IDs already used by self-verification;
- receipt digest;
- test task status/duration/selection facts;
- local Vitest version;
- repository-relative test paths;
- test IDs;
- bounded counts and comparison disposition/reason.

It must not persist:

- secrets/tokens/credentials;
- environment dumps;
- HOME/hostname/user/actor identity;
- absolute repository paths;
- repository URL;
- raw stdout/stderr;
- arbitrary stack traces or full test messages.

No outbound network access is required by the selector-shadow harness.

## License/use conclusion

No new third-party license or donor-use decision is introduced by this specification. Existing repository dependencies/actions retain their existing governance and must be reverified at implementation time.

`SUPPLY_CHAIN_REVIEW = PASS / NO_NEW_SURFACE`

`IMPLEMENTATION_AUTHORITY = NO`
