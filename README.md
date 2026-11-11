# Ascout

> **Verify everything AI ships.**
> **Know exactly what passed, failed, and was never checked.**
>
> **Free • Open Source • Community-Driven** — Apache-2.0 · [Contribute](CONTRIBUTING.md) · [Community and product commitments](docs/COMMUNITY_AND_PRODUCT.md)

Ascout is a local, evidence-bound verification layer for AI-built software. It inspects the exact Git working-tree state, discovers supported project-local verification tools, runs bounded checks, and emits a receipt that distinguishes what was proved from what failed, was refused, remained unresolved, or was not run.

Ascout's M1 goal is deliberately narrow: make changed-code verification harder to overclaim without turning the tool into a CI platform, cloud service, agent framework, or untrusted-code sandbox.

## Status

**Latest public release: [v0.2.0](https://github.com/TheHalfMoon/Ascout/releases/tag/v0.2.0), published November 10, 2026.** Download the verified tarball and checksum from GitHub Releases; Ascout is **not** published to the npm registry, and the package manifest retains `private: true` to prevent accidental registry publication. The release supports Windows x64, Linux x64, and macOS arm64 on Node.js 22 or 24, with Git installed. Its published features are a local CLI and a bounded, read-only stdio MCP server. **No desktop GUI, hosted service, GitHub PR bot, paid team plan, or enterprise control plane is currently released.** M1 and M2 verification remain bounded by the documented trust and evidence contracts.

Canonical T087 selected the repository package identity `@thehalfmoon/ascout` while preserving the executable name `ascout`. The scoped identity is a repository decision, not a claim that authenticated npm scope ownership or publication authority has been proven; any future publication requires separate authenticated npm scope/ownership evidence and separate release/publication authority.

GitHub `main`, the canonical Spec Kit artifacts under `specs/001-changed-code-verification-receipt/` and `specs/002-selection-config-fidelity/`, and merged task PRs are the source of current implementation truth. The simplified M1 builder map remains in `specs/001-changed-code-verification-receipt/IMPLEMENTATION_RUNBOOK.md`.

## Free and community-led by design

Ascout is **free to use, open source under Apache-2.0, and open to community contributions**. Individuals, students, independent developers, maintainers, and open-source projects can use the same locally executable verification core without paying Ascout. There is no Ascout cloud account, mandatory subscription, hosted AI inference, or per-run metering for the core.

The intended product experience is **CLI + MCP first**, with future CI/GitHub integration. A desktop application is **not required** for the current direction. Users choose their own local tools and optional AI providers; Ascout does not supply or pay for model tokens, hosted compute, or GitHub runner minutes. Some upstream services or user-provided providers may charge the user independently.

**Community-driven** means contributions, bug reports, reproducible benchmarks, accessibility improvements, and documented governance proposals are welcome. It does not imply an elected governance body or existing community vote. See [Contributing](CONTRIBUTING.md) and [Community and product commitments](docs/COMMUNITY_AND_PRODUCT.md).

### Business model: free core, optional paid organizational capabilities

The future **Teams, Business, and Enterprise** offering is intended to charge organizations for *additional* organizational value: centrally administered policies, fleet-wide verification visibility, audit and compliance exports, organization permissions/SSO, customer-hosted deployment support, commercial SLAs, and managed organization integrations. **These features and subscriptions are proposals, not shipping features, prices, or current entitlements.** AI inference and verification execution should run on customer-owned infrastructure with customer-authorized models.

Apache-2.0 permits commercial use of the existing open-source core, including by companies. **Companies are not required to pay just to run or modify Ascout Core.** Future paid capabilities, licensing, support, and commercial terms must be separately defined; do not misrepresent the Apache-licensed core as restricted to noncommercial use. See [product and community policy](docs/COMMUNITY_AND_PRODUCT.md).

### Identity and source transparency

**Ascout** is the only active product name for its CLI, MCP, reports, packages, documentation, and future integrations. Third-party tool names may still appear when accurately identifying a compatible tool or retaining legally required notices, licenses, historical citations, and provenance. See [branding policy](docs/BRAND_IDENTITY.md). Source attribution is not another product brand.

## What M1 does

For a supported trusted local repository, `ascout check` can:

- bind verification to a privacy-safe repository identity and the exact full Git source-start object ID;
- compare the working tree against that exact source-start HEAD rather than a guessed or later-resolved base;
- include tracked and nonignored untracked source state in a deterministic tree digest while excluding Ascout's own `.ascout/` runtime area;
- discover fixed semantic tasks for TypeScript, ESLint, Vitest, Jest, and basic pytest workflows when the required local tools/configuration are present;
- execute project-local commands without constructing an arbitrary shell command string;
- bound command runtime, captured output, widening, flake observations, run retention, and agent-receipt size;
- refuse changed effective command/configuration surfaces by default until the human caller explicitly admits that surface for one invocation;
- record task `PASS`/`FAIL`/`FLAKY`/`BLOCKED`/`ERROR`/`NOT_APPLICABLE`/`NOT_RUN` distinctions instead of collapsing omissions into green;
- use native related-test selection where supported, with at most one bounded widening pass when evidence requires it;
- normalize LCOV line evidence and report changed executable lines as `EXERCISED`, `NOT_EXERCISED`, or `UNRESOLVED`;
- detect source drift between the beginning and end of a check;
- perform bounded exact failing-test reruns to distinguish reproduced failure, contradictory/flaky observations, and unknown reproduction;
- emit terminal, JSON, or bounded agent receipts from one semantically validated truth model;
- persist evidence under `.ascout/` with bounded completed-run retention and documented redaction/truncation facts.

## What M2 adds

M2 is deliberately narrower than the broader post-M1 research roadmap. For a supported **single-package** JavaScript/TypeScript repository, when no existing root-level Jest/Vitest configuration is effective, Ascout may use exactly one recognized nested Jest or Vitest config as the runner's explicit `--config` authority. Root configuration keeps precedence, multiple nested candidates fail closed, and a changed selected nested config still requires explicit per-invocation changed-command-surface admission.

The founding `react-hook-form-value-as-date@2` selector miss was replayed after the repair: the frozen oracle test became an Ascout selector hit, historical T078 publication remained unchanged, and unavailable benchmark evidence remained unavailable. M2 did not add arbitrary package-script execution, generic command reconstruction, dependency/import graphs, basic-workspace nested-config ownership, a new runtime dependency, a receipt version, persistent trust, npm publication, a GitHub Release, or a release tag.

## What M1/M2 do not claim

Ascout M1/M2 do **not** claim to be:

- an untrusted-repository sandbox or malware containment system;
- a child-process network isolation layer;
- a dependency installer or environment provisioner;
- a CI/CD service, remote execution service, or SARIF platform;
- a generic workflow engine or plugin SDK;
- a database-backed test intelligence service;
- a semantic code graph, model-powered reviewer, or autonomous fixing agent;
- proof that a passing selected test set means every possible regression has been excluded;
- proof of causality that a failure was introduced by the current change when comparative evidence is absent;
- universal secret detection;
- a published stable npm package yet.

A stable receipt is evidence of the observations Ascout actually made. It is not permission to infer evidence that was never collected.

## Trust model

Ascout v0.x is intended for the developer's own **trusted local Git repository**. Repository commands, package scripts, compilers, linters, test runners, and configuration loaded by those tools execute with the developer's local process authority. They may read or modify files, start processes, access credentials available to the process, or use the network according to their own environment.

Ascout does not silently install repository dependencies and does not make an otherwise untrusted repository safe to execute. See [`SECURITY.md`](SECURITY.md) for the security/reporting boundary.

## Requirements

For the current source build:

- Node.js **22 or newer**;
- Git;
- npm for the committed lockfile workflow;
- project-local verification tools required by the tasks you expect Ascout to run.

Project CI runs Node 22 and Node 24 on Linux, macOS, and Windows Server 2025. Supported-platform evidence is kept explicit: platform-specific test debt is not converted into a false green result.

## Use from the repository today

The canonical package identity is selected, the package remains `private: true`, and Ascout is not published to npm. Use an exact source checkout, or an exact verified GitHub Release tarball asset when one is available; GitHub Release distribution does not imply npm-registry publication.

```sh
git clone https://github.com/TheHalfMoon/Ascout.git
cd Ascout
npm ci --ignore-scripts --no-audit --no-fund
npm run build
node dist/cli.js
```

The last command prints usage and exits with a usage error because a command is required. The CLI surface is:

```text
ascout init
ascout doctor [--format json|terminal]
ascout check [--allow-changed-command-surface] [--format json|agent]
ascout review [--local-model] [--format json|terminal]
ascout test [--plan] [--profile quick|standard|deep|release] [--format json|terminal]
ascout pr-evidence [--skip-tests] [--pr-head <sha>]
ascout pr-publish <bundle>
ascout security [--format json|terminal]
ascout mcp
```

**Current command semantics (`main`, after the `v0.1.0` release; see `CHANGELOG.md`):** `ascout check` executes supported local verification tasks and produces an evidence receipt, and must run from the repository root. `ascout review` reports unreviewed working-tree and index changes; it does **not** run a code-review engine unless you opt in to a local model with `--local-model`, as described below, and it does not consider committed changes or ignored files. `ascout test` runs `check` for the `standard` (default), `deep`, and `release` profiles, so inside a repository it executes the same admitted verification commands as `ascout check` and returns its result. `deep` and `release` also require mutation, property-fuzz, browser, and other engines that do not run yet, so they exit `4` unless `check` found a failure or drift. `quick` has no qualified engine and runs nothing. `ascout security` runs no scanner unless you opt in to Gitleaks, as described below. Without an engine, these commands exit `4` because required verification did not run, and that exit status is never an assurance PASS. `ascout test --plan` renders a plan labeled `NON_ASSURANCE_PLAN` and exits `0`; that is not a test result.

When running directly from a source checkout rather than an installed release asset, substitute `node /path/to/Ascout/dist/cli.js` for `ascout` in the examples below.

### Package identity and future installation

The canonical repository package identity is:

```text
@thehalfmoon/ascout
```

The executable name remains:

```text
ascout
```

This identity selection does not prove authenticated ownership of the npm scope and does not mean the package has been published. Do not run a registry install based only on this repository decision. If a future task separately proves npm scope ownership, authorizes publication, and publishes the package, the expected global-install shape is:

```sh
npm install --global @thehalfmoon/ascout
```

Until separate npm publication evidence exists, do not use an npm-registry install. Use the source-checkout workflow above, or an exact verified GitHub Release tarball asset when one is available.

## Quickstart in a trusted project

Run the built Ascout executable from the root of the Git repository you want to verify.

### 1. Initialize minimal local configuration

```sh
ascout init
```

`init` creates `ascout.config.json` with version 1 when it is absent and ensures `.ascout/` appears in `.gitignore`. It does not install dependencies, create hooks, or grant command-surface admission.

### 2. Inspect discovery without running verification tasks

```sh
ascout doctor [--format json|terminal]
```

`doctor` reports privacy-safe repository identity, project/tool discovery, configuration source, effective command-authority counts, and changed-file facts. It does not execute the verification task matrix.

### 3. Run verification

```sh
ascout check
```

The default terminal receipt tells you what ran, what passed or failed, what Ascout refused or could not prove, changed-code exercise state, source stability, completeness, and the resulting exit code.

For machine-readable output:

```sh
ascout check --format json
```

For a bounded agent-oriented receipt:

```sh
ascout check --format agent
```

All formats derive from the same semantically validated receipt model.

## Changed-command admission

A changed command surface is an effective repository file that influences a command Ascout would execute or configuration a supported tool would load. Examples can include package scripts, `ascout.config.json`, TypeScript/ESLint/Vitest/Jest configuration, and the effective basic-pytest configuration.

If such a surface is part of the current source change, ordinary `ascout check` refuses the affected task before launch and records:

```text
NOT_RUN(command_surface_changed)
```

That refusal is intentional. Review the changed command/configuration surface yourself. If you decide it is safe for this invocation, run:

```sh
ascout check --allow-changed-command-surface
```

Important properties of this admission:

- it is explicit and human-supplied;
- it applies only to that invocation;
- it is recorded in the receipt with the affected paths;
- it is not persisted as a trust grant;
- the next ordinary invocation refuses again when the changed surface is still relevant;
- agent instructions, hooks, and automation must not inject the flag automatically.

The override admits execution of the reviewed changed surface; it does not turn the repository into sandboxed or trusted-by-Ascout code.

## Fixed verification tasks

M1 has four fixed semantic task keys:

| Task | Purpose | Typical local authority |
| --- | --- | --- |
| `typecheck` | TypeScript type checking | explicit Ascout override, package script, or unambiguous project-local `tsc` |
| `lint` | ESLint verification | explicit override, package script, or supported project-local ESLint/configuration |
| `test` | JavaScript/TypeScript tests and changed-code exercise evidence | supported project-local Vitest or Jest workflow |
| `pytestBasic` | basic pytest execution | supported project-local pytest invocation/configuration |

Discovery is fail-closed when the project/tool/configuration state is ambiguous or unavailable. M1 does not invent a command, install a missing tool, or silently reinterpret an unsupported workflow as verified.

`ascout.config.json` can configure the fixed task surface, but M1 does not support arbitrary task keys, generic prerequisite graphs, or a persistent admission setting.

## Changed-code exercise evidence

Passing tests are not the same as proving that changed executable lines were exercised. For supported JavaScript test paths, Ascout binds final LCOV evidence to changed new-line ranges and reports each material changed executable line as:

- `EXERCISED` — the final valid coverage evidence observed execution;
- `NOT_EXERCISED` — the line is executable and final valid evidence observed zero execution;
- `UNRESOLVED` — Ascout cannot make a valid exercise claim and records why.

If a narrowed related-test pass leaves insufficient evidence, Ascout may run at most one bounded wider pass. It does not recursively widen until green. A stable run with a remaining material exercise gap does not become exit 0 merely because selected tests passed.

## Source and evidence binding

A receipt is bound to the source Ascout actually observed:

- `source.start.head_sha` is the exact full Git object ID resolved at source start;
- for `working_tree_vs_head`, `comparison.base_ref` must equal that same exact object ID;
- SHA-1 repositories use 40-hex object IDs and SHA-256 repositories use 64-hex object IDs;
- the start fingerprint is taken before Ascout reads any configuration, and the tree is fingerprinted again once discovery, configuration, and the changed-file list are read; if they differ, `check` stops with an error instead of acting on a mixed reading;
- source state is rehashed at the end so drift is reported independently from task completeness;
- persisted paths are canonical repository/run-relative slash-separated paths;
- invalid raw absolute, drive, UNC, URI, backslash, traversal, duplicate-separator, or trailing-separator spellings are rejected before lossy normalization can repair them into valid-looking evidence;
- evidence/artifact references must resolve inside the run/task contract.

The repository identity itself is privacy-safe: Ascout persists a hashed normalized remote identity when available or a hashed canonical-local identity, rather than persisting raw credential-bearing origins or raw absolute local repository paths.

### Limits of the source fingerprint

The fingerprint follows Git's view of the working tree, not raw file bytes, so a change Git itself treats as no change is not seen as a change or as drift:

- **Attribute conversions.** A tracked file whose working copy matches the index after Git's conversions counts as unchanged. Those conversions are line endings (`text`, `eol`, `core.autocrlf`), `ident` keyword expansion, and `working-tree-encoding`. Text placed inside an `$Id: ... $` keyword, or a line-ending flip, can therefore go unseen.
- **Mode bits.** With `core.fileMode=false`, a permission change is not seen.
- **Git's stat cache.** Git decides which tracked files to re-read from size and timestamps. An edit that keeps the size and restores the timestamps can be missed, and `core.checkStat=minimal` widens that.

Executable filters (`clean`, `smudge`, `process`) are refused outright. These conversions are not, because refusing them would block the many repositories that use `text=auto`. If a repository's command or configuration files must be byte-exact, don't apply `ident`, `eol`, or `working-tree-encoding` attributes to them.

## Receipts and local artifacts

Runtime evidence lives under:

```text
.ascout/
```

The directory is ignored by default. Completed-run retention is bounded (20 by default), and an active run is not removed to satisfy retention.

Evidence can contain repository/tool output and should be treated as potentially sensitive. Ascout applies its documented redaction boundary for recognized and configured secret-bearing environment values and records truncation/redaction facts, but redaction is best-effort rather than universal secret discovery.

Do not commit `.ascout/` runtime evidence or put unnecessary real secrets/private customer data into reproductions.

## Exit semantics

Ascout uses exit status as part of the evidence contract. The important rule is that stronger failures are not hidden behind a success status, and a materially incomplete stable run cannot report green by omission.

At a high level:

- `0` means the semantically validated run reached the repository's success conditions;
- source drift has higher precedence than a remaining exercise gap;
- a remaining material `NOT_EXERCISED` or `UNRESOLVED` changed-code gap maps to the dedicated incomplete/gap exit rather than 0;
- internal/control validity failures remain distinct from ordinary repository-command failure;
- refused or unrun required work remains visible in receipt completeness/status rather than being counted as passed.

Consumers should use the receipt fields together with the exit status instead of reducing the receipt to a single boolean.

All commands use the same meanings under Constitution Amendment A07:

| Exit | Meaning |
| --- | --- |
| `0` | Complete applicable work, or an explicitly requested non-assurance operation such as `test --plan` |
| `1` | A verified finding or a `FAIL` or `FLAKY` task |
| `2` | An error or invalid evidence, including running `check`, `review`, or `doctor` outside a repository, or `check`, `review`, `doctor`, or `test` from a subdirectory |
| `3` | Source drift detected between the start and end of the operation |
| `4` | Applicable verification that did not complete, including `review` today and `test --profile quick`, because no engine runs. `test` and `security` exit `4` outside a repository too |

**`ascout security` with Gitleaks.** Set `ASCOUT_GITLEAKS_PATH` to a Gitleaks 8.30.1 executable from the official release, on linux-x64, macOS arm64, or Windows x64. Ascout runs it only if its bytes match the digest pinned for that platform. It never searches `PATH` or downloads anything. Findings exit `1` and list each rule, file, and line, never the secret. A scan with no findings exits `4`, because Gitleaks cannot show which files it scanned, so no scan is a clean result. A repository's own `.gitleaksignore` can hide findings, and the report says so when one exists. Errors, including a repository Ascout refuses, exit `2` with nothing on stdout, and a source change during the scan exits `3`. Neither reports findings. See [`E5B_SECURITY_GITLEAKS_SPEC.md`](specs/017-unified-assurance/E5B_SECURITY_GITLEAKS_SPEC.md).

**`ascout review --local-model`.** Reviews the working-tree changes with a code model served by [Ollama](https://ollama.com) on your own machine. You authorize it in `review-provider.json` in your account's config directory: `AppData\Roaming\ascout` under your home folder on Windows, `~/.config/ascout` elsewhere. The location comes from your operating-system account, and no environment variable (`HOME`, `XDG_CONFIG_HOME`, `APPDATA`, `ASCOUT_CONFIG_HOME`) can move it. A config inside the repository, or one other users can write, is refused.

Ascout connects only to `http://127.0.0.1` or `http://[::1]` and ignores proxy settings. What that local server does with the data is up to you: a local gateway or tunnel could forward it elsewhere.

The model never sees these files, which stay unreviewed:
- untracked files;
- files named like secrets: `.env*`, `*.pem`, `*.key`, `id_rsa*`, `id_ed25519*`, `id_ecdsa*`, `*.p12`, `*.pfx`, `.npmrc`, `.pypirc`, `.netrc`, `credentials*`.

The values of the token variables Ascout knows (`GITHUB_TOKEN`, `GH_TOKEN`, `NPM_TOKEN`, `NODE_AUTH_TOKEN`) are removed from what the model sees and from its reply. Other secrets written in your code are not removed.

The review is **advisory**: a small local model misses problems and reports false ones, and its output never counts as human review. Findings it can place on the changed lines exit `1`. A finding on an untouched line, or with no line, does not count. If it reports nothing it can place, it exits `4`: a model's silence is advice, not a review, so the change still counts as unreviewed. A missing provider, a refused one, or a model that fails or times out also exits `4`. A malformed config exits `2`, and a source change during the review exits `3`. See [`E6D_LOCAL_REVIEW_WIRING_SPEC.md`](specs/017-unified-assurance/E6D_LOCAL_REVIEW_WIRING_SPEC.md).

**`ascout mcp`.** This runs a local [MCP](https://modelcontextprotocol.io) server on stdio, so an agent in an MCP host can ask for the same reports. It opens no socket and takes no options. It must start at a repository root, which it fixes at launch, along with `ASCOUT_GITLEAKS_PATH`. It offers four read-only tools: `ascout_review` (without a model), `ascout_security`, `ascout_doctor`, and `ascout_test_plan`. Each tool takes no arguments, runs one at a time, and runs no repository code. `check`, `test`, `init`, and the local model are not available over MCP. Each result carries the command's JSON report unchanged, its exit code, and an `assurance` field: `COMPLETE`, `FINDINGS`, `DRIFT`, `INCOMPLETE`, or `NONE`. A plan or a diagnostic is always `NONE`, never `COMPLETE`. Report text comes from the repository and is untrusted. See [`E8_MCP_E2E_DESIGN.md`](specs/017-unified-assurance/E8_MCP_E2E_DESIGN.md).

**This is a breaking change.** Earlier versions exited `0` for `review` and `test` and `1` for `security` without running anything, and exited `1` for most operational errors. Failures while Ascout itself is still loading, and output streams closed before it starts, are outside this guarantee.
Ascout refuses to read a partial clone, a repository that contains a Git submodule, or one where any tracked or included untracked path has a Git `filter` attribute, because these can run commands. This includes `git-lfs` repositories. It exits `2` and says why. This is bounded process hardening, not a sandbox, and Ascout still supports only your own trusted repository.

## Package boundary

T082 added a positive npm `files` allowlist and a real package-content gate. The current release surface is limited to the built `dist` tree plus npm-mandated metadata; tests, source, specs, benchmarks, `.ascout/`, fixtures, logs, secrets, and coverage output are not intended package contents.

T087 selected `@thehalfmoon/ascout` as the canonical repository package identity while preserving `bin.ascout = "./dist/cli.js"`. That packaging and identity proof does **not** mean a package has been published: `package.json` remains `private: true`, and future publication still requires separate authenticated npm scope/ownership evidence and separate publication authority.

## Benchmarks

The founding benchmark under [`benchmarks/`](benchmarks/) is evidence for selector behavior, changed-code gap behavior, drift/determinism/flake semantics, and integrity assertions. It preserves unavailable comparator evidence as unavailable and publishes selector misses rather than hiding them behind an aggregate.

It is not a claim that Ascout has perfect recall or that historical corpus performance predicts every repository. See [`benchmarks/README.md`](benchmarks/README.md) and [`benchmarks/manifest.json`](benchmarks/manifest.json) for the frozen corpus, acquisition/licensing rules, and exact evidence identities.

## Project verification

From an Ascout source checkout:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm test
npm run build
```

Project CI runs this matrix on Linux, macOS, and Windows with Node 22 and Node 24. Release hardening records supported-platform debt explicitly instead of skipping or suppressing it.

T088 performs the final clean-checkout M1 release-candidate rehearsal across the canonical quickstart, contract/semantic/integration gates, package inspection, benchmark evidence, and supported-platform proof. T092 performs the bounded M2 selection-config-fidelity closeout against the same six-lane platform matrix and Spec 002 benchmark evidence. Neither task publishes npm or creates a GitHub Release/tag.

## Contributing and security

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before proposing material changes. Ascout uses a constitution/Spec Kit/Ponytail workflow, one canonical task per task-scoped branch/PR, forward-only review repairs, exact-head evidence, and provenance review for third-party material.

For vulnerabilities and the trusted-local execution boundary, see [`SECURITY.md`](SECURITY.md). Do not disclose an undisclosed vulnerability in a public issue or pull request.

## License and provenance

Ascout is licensed under Apache-2.0. See [`LICENSE`](LICENSE).

Third-party dependency/code provenance is tracked in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and [`docs/legal/CODE_PROVENANCE.md`](docs/legal/CODE_PROVENANCE.md). T086 reconciled those records against the exact release-hardening dependency graph; the canonical lockfile remains the machine-readable transitive dependency source for the current candidate.

The founding specification workflow is pinned in [`.specify/PROVENANCE.md`](.specify/PROVENANCE.md).

## Strategic research

The 2026-08-26 major product/testing review and post-M1 roadmap are preserved under [`docs/strategy/`](docs/strategy/README.md). These documents are **non-authoritative research/planning inputs**. They do not reorder or expand the current canonical Spec Kit authority chain, and future capabilities require separate canonicalization and authorization before implementation.
