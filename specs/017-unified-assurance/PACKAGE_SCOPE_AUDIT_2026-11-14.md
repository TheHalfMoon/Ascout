# Package scope audit (2026-11-14)

**Founder decision (2026-11-13):** "Package scope: preserve compatibility." Audit the modules the
published package ships but no entry point reaches, and remove only content proven unused.

**Result: nothing is removed.** No module is proven unused. This record keeps the evidence so the
question doesn't have to be re-asked.

## What ships

Audited at `main` f860661.

- `package.json` has `"private": true`, `files: ["dist"]` and `bin: { ascout: ./dist/cli.js }`, with no
  `main` and no `exports`. Without an `exports` map, Node doesn't block deep imports: any
  `@thehalfmoon/ascout/dist/<x>.js` path resolves today.
- **Entry points:**
  - `dist/cli.js` (the bin).
  - `dist/github/publish-cli.js`, which runs by path in `.github/scripts/rc-qualify.mjs`,
    `docs/examples/ascout-pr-publish-app.yml` and `docs/GITHUB_INTEGRATION.md`.
- `npm pack --dry-run` lists 179 entries: 176 compiled modules plus LICENSE, README and
  `package.json`. That is 456,734 bytes packed and 2,086,043 bytes unpacked.

## Reachability

- 176 source modules:
  - 78 are reachable from the two entry points.
  - **98 are not.** They account for 1,056,387 of the 2,041,829 bytes of shipped JavaScript.
- Two independent methods agree on exactly the same 98 modules: a regex import graph, and a TypeScript
  compiler program rooted at the two entry points. The source has no dynamic `import()`, and nothing
  loads a `dist/` file by a computed path.

## Classification of the 98

| Group | Count | Who uses it |
| --- | --- | --- |
| `assurance/contracts` | 10 | Tests import each one |
| `assurance/engines/mobile-artemis` | 15 | Tests. `docs/mobile/artemis-*` and the Python bridge README cite the source files |
| `assurance/engines/native/descriptor` | 1 | Tests |
| `assurance/kernel` | 5 | Tests |
| `assurance/output/preview` | 1 | Tests |
| `assurance/publication` | 4 | Tests |
| `assurance/review` (benchmark corpus, context capsule, independence policy, OpenCode pin) | 4 | Tests |
| `assurance/security` `sentrdel-*` | 17 | Tests; `observation-read` through three of the other modules |
| `assurance/test` adapters | 9 | Tests |
| `assurance/workflow` | 9 | Tests. **`durable-harness-store` is a documented deep import** |
| `browser` | 13 | Tests. The `docs/browser-*` design docs cite the source files |
| `quality` | 10 | Tests. The `docs/quality-*` design docs cite the source files |

- **Referenced only by scripts or workflows:** none.
- **Referenced nowhere:** none.
- **Documented deep import:** `docs/ascout-durable-harness.md` tells readers to import
  `AscoutDurableHarness` from `durable-harness-store` "or its compiled `dist/` path". That keeps
  `durable-harness-store` and the modules it imports (`durable-harness`, `idempotency-reconciliation`,
  `stage-attempt-model`) importable.
- **Known defect, not fixed here:** `browser/playwright-adapter` imports `playwright` at the top level.
  `playwright` is a development dependency, so importing that shipped file from an installed package
  fails. Nothing documented imports it.

## Decision and options

- **Removed:** nothing. All 98 modules are covered by tests, and deleting them would also delete those
  tests and the features they document.
- **Not done, because it would break compatibility:** shipping only what the entry points reach
  (a build config rooted at `cli.ts`, `publish-cli.ts` and `durable-harness-store.ts`). That would
  roughly halve the shipped JavaScript. But anyone deep-importing another `dist/` file would break.
  The package is `private` and ships as a GitHub release tarball, so outside use is unlikely, but it
  can't be proven absent. This is a founder decision. If chosen, it ships with a CHANGELOG note and a
  release-qualification rerun from a bare install.
- An `exports` map would be a further, stricter breaking change, and a separate decision.
