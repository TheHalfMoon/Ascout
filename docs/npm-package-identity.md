# npm Package Identity Decision

**Canonical task:** T087  
**Decision:** scoped fallback selected  
**Package identity:** `@thehalfmoon/ascout`  
**Executable identity:** `ascout`

## Decision

The repository does not have authoritative authenticated npm account/ownership evidence available in the canonical T087 execution context for the unscoped `ascout` package name. Public search or registry visibility alone is not ownership proof and is not used as one.

T087 therefore takes the authorized fallback path and selects `@thehalfmoon/ascout` as the package identity while preserving the locked CLI executable name `ascout`.

This is a **repository package-identity selection**, not a claim that an npm account or organization currently controls the `@thehalfmoon` scope. Any future publication still requires separate authenticated npm scope/ownership verification and separate release/publication authority.

## Safety boundary

The package remains:

- version `0.0.0`;
- `private: true`;
- unpublished by this task;
- limited to the positive package surface defined by `files: ["dist"]` plus npm's mandatory package metadata files;
- exposed through `bin.ascout = "./dist/cli.js"`.

T087 does not create a release, publish to npm, change repository visibility, alter account/billing state, or claim registry ownership.

## Verification contract

The real npm package-content test must prove from an actual packed tarball that:

1. the extracted package manifest reports `name = "@thehalfmoon/ascout"`;
2. `private = true` remains in force;
3. the executable mapping remains exactly `{ "ascout": "./dist/cli.js" }`;
4. the positive `files` allowlist remains `['dist']`;
5. the T082 exclusions remain effective.

Clean-checkout install/build/test/benchmark rehearsal remains T088 and must be proven separately before any release-candidate claim.
