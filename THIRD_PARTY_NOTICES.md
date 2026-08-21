# Third-Party Notices

**Status:** T003 direct-dependency provenance ledger  
**Scope:** direct dependencies intentionally selected for Ascout M1.

This file records the exact direct third-party packages selected by Ascout and the evidence used to bind those selections to the committed lockfile. Exact transitive versions, registry locations, integrity digests, and license metadata are recorded in `package-lock.json`.

## Lock generation evidence

- Evidence branch: `evidence/t003-lockgen-2026-08-22`
- Evidence commit containing the generated lockfile: `81e2850e06a097abed5a7566aded39fceb330800`
- `package-lock.json` blob: `751fdf89c10d26a1875844626ad6c336b28d051b`
- GitHub Actions run: `32535056565`
- Runner OS: Ubuntu 24.04
- Node: `22.0.0`
- npm resolver: `10.9.4`
- Generation command: `npm install --package-lock-only --ignore-scripts --audit=false --fund=false`
- Reproduction check: `npm ci --ignore-scripts --audit=false --fund=false` — PASS
- Exact direct-resolution check — PASS
- `npm ls --all` — PASS
- Tool execution on Node 22.0.0: TypeScript `6.0.3`, Vite `6.4.3`, Vitest `4.1.10` — PASS
- Generation-time security check: `npm audit --package-lock-only --audit-level=high` reported `found 0 vulnerabilities`.

The audit result is evidence for that specific resolved graph at that run; it is not a permanent security claim.

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

`package-lock.json` is the canonical machine-readable record for the exact resolved transitive graph used by this revision, including registry `resolved` URLs, SRI `integrity` values, and license metadata where npm records it. This file does not replace any license text or attribution that a future packaged distribution is legally required to carry.
