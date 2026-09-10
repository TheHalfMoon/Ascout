# Specification 011 Supply-Chain Review

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Decision

Spec 011 requires no new package, runtime dependency, GitHub Action, service, model, donor source, external API, or network acquisition.

`NEW_DEPENDENCIES = 0`

`NEW_ACTIONS = 0`

`NEW_SERVICES = 0`

`NEW_DONOR_CODE = 0`

## Existing components reused

### TypeScript and Node standard library

The explicit authority rule is independently written minimal TypeScript over the already-collected discovery file map. It uses only exact string comparison and existing workspace-scope filtering. No parser library, shell library, glob library, or executor library is required.

Implementation must reverify the exact then-current TypeScript and lockfile identity before T120 execution work. No dependency version change is planned.

### Existing discovery and planner code

T120 reuses the current `discoverProjectFromFiles`, `discoverRunner`, workspace scoping, `classifyCommandSurfaces`, `planVitestTask`, and `planJestTask` structure. No new runtime module, shared helper package, or cross-tree import is planned.

### Existing test toolchain

Focused contracts reuse the repository's existing Vitest setup and existing in-memory discovery/planner input shapes. No new test runner, assertion library, snapshot service, or coverage provider is required.

### Existing CI workflows

T120 uses the existing Self Verification and Project CI lanes unchanged. No workflow, action pin, permission, secret, timeout, or retention change is planned.

## Data/security boundary

The new logic handles only:

- in-scope `package.json` dependency names already processed by discovery;
- the exact root `scripts.test` string already present in the discovery file map;
- the existing resolved runner value and `sourcePaths`.

It must not persist, log, or transmit:

- secrets/tokens/credentials;
- environment dumps;
- HOME/hostname/user/actor identity;
- absolute repository paths;
- repository URL;
- raw stdout/stderr;
- arbitrary script text beyond the two exact allowlisted matches.

Non-matching script values leave no new persisted authority field.

## License/use conclusion

No new third-party license or donor-use decision is introduced by this specification. Existing repository dependencies retain their existing governance and must be reverified at implementation time.

`SUPPLY_CHAIN_REVIEW = PASS / NO_NEW_SURFACE`

`IMPLEMENTATION_AUTHORITY = NO`
