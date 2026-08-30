# Ascout

> **Verify everything AI ships.**  
> **Know exactly what passed, failed, and was never checked.**

Ascout is a local, evidence-bound verification layer for AI-built software. It inspects the exact Git working-tree state, discovers supported project-local verification tools, runs bounded checks, and emits a receipt that distinguishes what was proved from what failed, was refused, remained unresolved, or was not run.

Ascout's M1 goal is deliberately narrow: make changed-code verification harder to overclaim without turning the tool into a CI platform, cloud service, agent framework, or untrusted-code sandbox.

## Status

Ascout is in **M1 release hardening** and has not published a stable npm release. The repository package is currently `private: true` and version `0.0.0`; do not treat the unscoped `ascout` npm name as released or owned by this project yet. Canonical task T087 will verify package ownership or choose the scoped fallback while preserving the `ascout` executable name.

GitHub `main`, the canonical Spec Kit artifacts under `specs/001-changed-code-verification-receipt/`, and merged task PRs are the source of current implementation truth. The simplified builder map is in `specs/001-changed-code-verification-receipt/IMPLEMENTATION_RUNBOOK.md`.

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

## What M1 does not claim

Ascout M1 does **not** claim to be:

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

Until T087 resolves the publishable package identity, use an exact source checkout rather than installing an unverified npm name.

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
ascout doctor
ascout check [--allow-changed-command-surface] [--format json|agent]
```

When running directly from this repository before package publication, substitute `node /path/to/Ascout/dist/cli.js` for `ascout` in the examples below.

### Install after package identity is resolved

T087, not this README, is authoritative for the eventual npm package identity. After T087 is canonically closed and an actual release is separately authorized/published, this section can be replaced with the exact verified install command. Until then, **do not install a registry package merely because it is named `ascout`**.

The executable name is locked to:

```text
ascout
```

A scoped package fallback may therefore still expose the same `ascout` binary.

## Quickstart in a trusted project

Run the built Ascout executable from the root of the Git repository you want to verify.

### 1. Initialize minimal local configuration

```sh
ascout init
```

`init` creates `ascout.config.json` with version 1 when it is absent and ensures `.ascout/` appears in `.gitignore`. It does not install dependencies, create hooks, or grant command-surface admission.

### 2. Inspect discovery without running verification tasks

```sh
ascout doctor
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
- source state is rehashed at the end so drift is reported independently from task completeness;
- persisted paths are canonical repository/run-relative slash-separated paths;
- invalid raw absolute, drive, UNC, URI, backslash, traversal, duplicate-separator, or trailing-separator spellings are rejected before lossy normalization can repair them into valid-looking evidence;
- evidence/artifact references must resolve inside the run/task contract.

The repository identity itself is privacy-safe: Ascout persists a hashed normalized remote identity when available or a hashed canonical-local identity, rather than persisting raw credential-bearing origins or raw absolute local repository paths.

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

## Package boundary

T082 added a positive npm `files` allowlist and a real package-content gate. The current release surface is limited to the built `dist` tree plus npm-mandated metadata; tests, source, specs, benchmarks, `.ascout/`, fixtures, logs, secrets, and coverage output are not intended package contents.

That packaging proof does **not** mean a package has been published. `package.json` remains `private: true` until the canonical package-identity task resolves the release name.

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

The final T088 release-candidate rehearsal will run the canonical quickstart, contract/semantic/integration gates, package inspection, benchmarks, and platform evidence from a clean exact candidate checkout. It records evidence only; it does not publish npm or create a release by itself.

## Contributing and security

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before proposing material changes. Ascout uses a constitution/Spec Kit/Ponytail workflow, one canonical task per task-scoped branch/PR, forward-only review repairs, exact-head evidence, and provenance review for third-party material.

For vulnerabilities and the trusted-local execution boundary, see [`SECURITY.md`](SECURITY.md). Do not disclose an undisclosed vulnerability in a public issue or pull request.

## License and provenance

Ascout is licensed under Apache-2.0. See [`LICENSE`](LICENSE).

Third-party dependency/code provenance is tracked in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and [`docs/legal/CODE_PROVENANCE.md`](docs/legal/CODE_PROVENANCE.md). T086 will reconcile those records against the exact release-candidate lockfile before release readiness can be claimed.

The founding specification workflow is pinned in [`.specify/PROVENANCE.md`](.specify/PROVENANCE.md).

## Strategic research

The 2026-08-26 major product/testing review and post-M1 roadmap are preserved under [`docs/strategy/`](docs/strategy/README.md). These documents are **non-authoritative research/planning inputs**. They do not reorder or expand the current M1 Spec Kit plan, and future capabilities require separate canonicalization and authorization before implementation.
