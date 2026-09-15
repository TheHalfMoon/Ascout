# Playwright Adapter — P016-04

Fourth Spec 016 implementation slice under P016-01 authorization
(predecessor: P016-03 executor contract, PR #347).

## What this slice adds

- `src/browser/playwright-adapter.ts`: the first Playwright-backed executor
  behind the P016-03 contract. Exact-pin self-enforcement (`1.63.0`),
  Chromium provisioning check, fresh browser + fresh BrowserContext + one
  page per launch, navigation/action primitives with bounded timeouts,
  console/page-error assertion subset, text/input reads, version capture,
  and reliable disposal.
- `tests/browser-playwright-adapter.contract.test.ts`: browser-free unit
  contract (pin, error mapping, semantic refusal, origin join, install
  fast path).
- `tests/browser-playwright.integration.test.ts`: hermetic integration
  against an inline localhost fixture app (ephemeral port, no external
  network): versions, fresh-page isolation, checkout flow, hostile-text
  handling, timeout mapping, console assertions, deferred-kind
  unavailability, refusal, and disposal.
- `package.json` / `package-lock.json`: the single authorized dependency
  change of this wedge — `playwright@1.63.0` exact pin (plus its
  `playwright-core@1.63.0` transitive). No other dependency touched.

## Package qualification (handoff section 6, observed 2026-09-15)

- Exact version: `playwright@1.63.0`, `--save-exact`, lockfile v3 with
  resolved tarball URLs and integrity hashes.
- Registry integrity: tarball
  `https://registry.npmjs.org/playwright/-/playwright-1.63.0.tgz`,
  shasum `99b56f9f69b1b70c44f00bf84b2fe52348ae2511` (matches), sha256
  `195a5ee9bfed7c6e9c03965950e32e5e4dbedaa02e740e5a530eb4b87dae050c`.
- Repository research pin: `d1ead3ecca23182f2d06d761c28e3d4edafb6595`
  (microsoft/playwright); implementation pins the package version, not the
  repository head.
- License: Apache-2.0 (`package.json` field, LICENSE text, and
  `playwright-core` LICENSE all Apache-2.0).
- NOTICE: present in the tarball — Microsoft copyright with Puppeteer
  derivation notice, matching the planning record. `ThirdPartyNotices.txt`
  also ships in the package.
- Node engines: `>=20` for both packages; compatible with the repository
  requirement (`>=22`, CI on 22/24).
- Transitive inventory: exactly `playwright` + `playwright-core`, both
  `1.63.0`; `playwright-core` declares zero dependencies. Lockfile diff
  adds only these two packages and removes none.
- Browser download: pinned Chromium revision v1243 (Chrome for Testing
  `153.0.8010.12`) via the package's own installer; install locations
  honor `PLAYWRIGHT_BROWSERS_PATH`. Observed install: `chromium-1243`
  plus headless-shell and ffmpeg companions.
- CI/browser cache behavior: no workflow change; the integration suite
  provisions the pinned browser on demand with fixed argv
  (`install --with-deps chromium` on Linux for system libs via runner
  sudo, `install chromium` elsewhere), only when the executable is absent.
- Security advisories (`npm audit`, 2026-09-15): 3 moderate in the tree,
  zero touching `playwright`/`playwright-core` (all pre-existing).
- Required browser binaries: Chromium v1243 only (no Firefox/WebKit).
- Artifact size impact: tarball 0.9 MB; `node_modules` +19 MB
  (`playwright` 5 MB, `playwright-core` 14 MB, unpacked core 13.5 MB);
  browser binaries ~660 MB in the Playwright cache (outside the repo).

## Behavior contract

- `launchPlaywrightSession` enforces the exact pin, provisions Chromium if
  absent, and captures Playwright version, browser version, and executable
  path on the runtime object.
- `executeAction` runs navigate/click/fill/type/press/select/
  wait_for_navigation/assert through an injected target resolver (the
  P016-06 policy provides the real one). Timeouts map to `timeout`,
  Playwright failures to `failed`, missing values to `refused` — nothing
  passes silently. Origin-relative navigate targets join the session's
  application origin purely.
- `executeAssertion` evaluates only the console cleanliness subset
  (`no console errors observed`, `no uncaught page error is observed`)
  against page-attached console/page-error listeners; every other kind or
  statement returns `unavailable` with `E_ASSERTION_KIND_DEFERRED`.
- `readTargetText` / `readInputValue` return raw DOM data (fail-closed on
  missing text); `currentUrl` reports the page URL; `isConnected` reports
  liveness. Reads are data, never verdicts.
- `dispose` closes context then browser and is idempotent; use after
  dispose throws loudly. Integration tests assert disconnected state.
- No shell is ever constructed: provisioning uses `execFileSync` with
  literal argv; targets/values flow as literal text into Playwright APIs.

## Compiler accommodation (explicit, minimal)

Adopting the first third-party runtime dependency required one `tsconfig.json`
addition: `"skipLibCheck": true`. Playwright's own `types.d.ts` references
DOM lib globals (`SVGElement`, `HTMLElement`), which fails validation under
the repository's `"lib": ["ES2023"]`. The alternative (`"lib"` + `"DOM"`)
would widen the type environment of project code; `skipLibCheck` instead
stops validating third-party declaration files only, while every strictness
flag (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`verbatimModuleSyntax`, `noEmitOnError`, …) still applies in full to
`src/**`. This is a one-line accommodation forced by the authorized
dependency adoption — without it no P016-04 implementation importing
Playwright can pass the typecheck gate — and it weakens no project-code
check. It is recorded here (not hidden) for founder visibility at merge
review.

## What this slice does not do

No locator policy (P016-06; tests inject a fixture resolver), no oracle
records (P016-05; `oracle_ref` stays null), no recovery behavior (P016-07),
no trace ingestion (P016-08), no benchmark (P016-09), no donor code, no
Momentic import, no Constitution change, no workflow change.

## Evidence

Contract tests prove pin enforcement, install fast path, error mapping,
semantic refusal, and origin join without a browser. Integration tests
prove launch/versions, fresh-page isolation, the fixture checkout flow,
hostile-text literal handling (including selector-injection rejection),
timeout mapping, console assertions, deferred-kind unavailability,
refusal, and disposal against real Chromium.
