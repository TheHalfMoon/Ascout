# Third-Party Notices

**Status:** T086 exact-version dependency license/provenance review  
**Scope:** direct dependencies intentionally selected for Ascout M1, bound to the current committed manifest and lockfile.

This file records the exact direct third-party packages selected by Ascout and the evidence used to bind those selections to the committed lockfile. Exact transitive versions, registry locations, integrity digests, and license metadata are recorded in `package-lock.json` where npm provides those fields.

## Current candidate binding

T086 revalidated this ledger against canonical `main` at `a9bae09a71b4ff92097182a8d97f5ff6a0511603`.

- `package.json` blob: `e5d99fcd1bb87fa3adec2629d949bde933000bf7`
- `package-lock.json` blob: `e51f0bddb953235c1a391718eabfab5a6c680832`
- Product runtime dependency count: 1 (`cross-spawn@7.0.6`)
- Direct development dependency count: 6 (`@types/node`, `@vitest/coverage-v8`, `jest`, `typescript`, `vite`, `vitest`)
- Direct manifest/lockfile reconciliation: complete; no direct dependency is omitted from this notice ledger.

The committed npm lockfile is the canonical machine-readable graph for this candidate. The T086 review does not upgrade dependencies, regenerate the lockfile, alter package identity, publish to npm, or claim that a point-in-time security audit is permanent.

## Lock generation evidence

- Evidence branch: `evidence/t003-lockgen-2026-08-22` (the date component is the Asia/Riyadh local date; the corresponding GitHub Actions timestamps are on 2026-08-21 UTC).
- Evidence commit containing the generated lockfile: `81e2850e06a097abed5a7566aded39fceb330800`
- Original generated `package-lock.json` blob: `751fdf89c10d26a1875844626ad6c336b28d051b`
- GitHub Actions generation run: `32535056565`
- Runner OS: Ubuntu 24.04
- Node: `22.0.0`
- npm resolver: `10.9.4`
- Generation command: `npm install --package-lock-only --ignore-scripts --audit=false --fund=false`
- Reproduction check: `npm ci --ignore-scripts --audit=false --fund=false` — PASS
- Exact direct-resolution check — PASS
- `npm ls --all` — exited successfully; its tree truthfully reports platform-, peer-, and engine-inapplicable optional dependencies as `UNMET OPTIONAL DEPENDENCY` rather than treating them as required install failures.
- Tool execution on Node 22.0.0: TypeScript `6.0.3`, Vite `6.4.3`, Vitest `4.1.10` — PASS
- Generation-time security check: `npm audit --package-lock-only --audit-level=high` reported `found 0 vulnerabilities`.

### Node 22.0.0 engine-strict verification

A follow-up evidence run `32535678363` used the same package manifest and unchanged lockfile blob on Node `22.0.0` with npm `10.9.4` and added an engine-strict installation gate:

- `npm ci --engine-strict --ignore-scripts --audit=false --fund=false` — PASS
- `@napi-rs/lzma-linux-x64-gnu@1.5.1`, an optional dependency of `rollup@4.62.5` whose own engine range starts at Node 22.20, was omitted by npm on Node 22.0.0 as an inapplicable optional dependency.
- The workflow asserted that this optional package was absent after the engine-strict install.
- Vite `6.4.3` executed on Node `22.0.0` after that install — PASS.
- Vitest `4.1.10` executed on Node `22.0.0` after that install — PASS.
- The follow-up audit again reported `found 0 vulnerabilities` for the resolved lockfile graph.

The stricter engine range of an omitted optional package therefore does not redefine Ascout's Node `>=22` support floor. The evidence above is deliberately scoped to the tested Ubuntu x64 environment and does not claim an untested platform result.

Security/audit results are evidence for the specific resolved graph at the cited runs; they are not permanent security claims.

## T086 license/provenance reconciliation

All seven direct packages declared by the current candidate are represented below at their exact locked versions. The current direct set contains Apache-2.0 and MIT licenses only. No direct copyleft, source-available, non-commercial, field-of-use, database, or data-license restriction was identified in the manifest/lockfile evidence reviewed for T086.

This conclusion is scoped to the exact direct package versions below. Transitive packages remain separately represented by the committed lockfile and may use other permissive SPDX licenses. A future dependency/version change requires a fresh provenance/license reconciliation before release claims are updated.

## Direct dependencies

### `cross-spawn` 7.0.6

- Role: product runtime dependency
- License: MIT
- Upstream: `moxystudio/node-cross-spawn`, tag `v7.0.6`
- Registry tarball: `https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz`
- SRI: `sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==`

### `@types/node` 22.20.1

- Role: development-only Node.js type declarations aligned to the Node 22 support floor
- License: MIT
- Upstream: `DefinitelyTyped/DefinitelyTyped`, package path `types/node`
- Registry tarball: `https://registry.npmjs.org/@types/node/-/node-22.20.1.tgz`
- SRI: `sha512-EANqOCF9QFyra+4pfxUcX9STKJpCLjMbObVzljIJomAWSnuSIEAvyzEU53GaajbXJEgdh0iEcPL+DGvpUd4k1Q==`

### `@vitest/coverage-v8` 4.1.10

- Role: development-only V8 coverage provider used by the Vitest integration and changed-code exercise tests
- License: MIT
- Upstream: `vitest-dev/vitest`, tag `v4.1.10`, package path `packages/coverage-v8`
- Registry tarball: `https://registry.npmjs.org/@vitest/coverage-v8/-/coverage-v8-4.1.10.tgz`
- SRI: `sha512-IM49HmthevbgAO4anp1hwtoT9wYe59w0LR00gr+eagHE+ZJ5lK4sLPeO0ubgoJcwLk6dehU3R24N+FbEEKDc8g==`

### `jest` 30.4.2

- Role: development-only Jest runner used to qualify Ascout's supported Jest integration
- License: MIT
- Upstream: `jestjs/jest`, tag `v30.4.2`
- Registry tarball: `https://registry.npmjs.org/jest/-/jest-30.4.2.tgz`
- SRI: `sha512-Yi1jqNC/Oq0N4hBgNH/YvBpP1P57QqundgytzYqy3yqAa7NZPNjSoi4SGbRAXDMdBzNE6xBCi5U7RgfrvMEUVQ==`

### `typescript` 6.0.3

- Role: development-only compiler/typechecker
- License: Apache-2.0
- Upstream: `microsoft/TypeScript`, tag `v6.0.3`
- Registry tarball: `https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz`
- SRI: `sha512-y2TvuxSZPDyQakkFRPZHKFm+KKVqIisdg9/CZwm9ftvKXLP8NRWj38/ODjNbr43SsoXqNuAisEf1GdCxqWcdBw==`

### `vite` 6.4.3

- Role: development-only peer/runtime substrate selected for Vitest while preserving the Ascout Node `>=22` floor
- License: MIT
- Upstream: `vitejs/vite`, tag `v6.4.3`, package path `packages/vite`
- Registry tarball: `https://registry.npmjs.org/vite/-/vite-6.4.3.tgz`
- SRI: `sha512-NTKlcQjlAK7MlQoyb6LgaqHc8sso/pVyUJYWMws3jg21uTJw/LddqIFPcPqP6PzpgbIcZyKI85sFE4HBrQDA8A==`

### `vitest` 4.1.10

- Role: development-only test runner
- License: MIT
- Upstream: `vitest-dev/vitest`, tag `v4.1.10`, package path `packages/vitest`
- Registry tarball: `https://registry.npmjs.org/vitest/-/vitest-4.1.10.tgz`
- SRI: `sha512-R9jUTe5S4Qb0HCd4TNqpC7oGcrMssMRGXLW80ubjWsW9VH5GF8y1Y0SFLY9AbqSk6nt0PnOx4H4WNJYZ13GUPw==`

## Transitive dependencies

`package-lock.json` is the canonical machine-readable record for the exact resolved transitive graph used by this revision, including registry `resolved` URLs, SRI `integrity` values, and license metadata where npm records it. Optional entries can legitimately remain recorded even when npm omits them on a particular platform or Node version.

The T086 review does not treat process isolation, development-only status, or npm registry availability as a substitute for license terms. It also does not assume that a permissive direct package makes every possible future bundled artifact attribution-free. The T082 package-content gate proves the current Ascout tarball surface separately; any future bundling/vendor change must re-evaluate redistribution and notice obligations.

This file does not replace any third-party license text or attribution that a future packaged distribution is legally required to carry.