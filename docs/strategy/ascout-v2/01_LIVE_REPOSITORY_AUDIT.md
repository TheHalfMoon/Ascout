# 01 — Live Repository Audit

**Audit date:** 2026-10-08. **Auditor environment:** Windows 11 (x86_64, 12 logical CPUs), Node v24.19.0, Rust 1.98.0, plus WSL2 Ubuntu (kernel 6.18) for Linux-only builds.

## 1. Canonical identity (OBSERVED)

| Item | Value |
|---|---|
| Repository | `TheHalfMoon/Ascout` (public) |
| Default branch | `main` |
| HEAD | `ca6b6f514e5a8881e2cfa2789b5e5ea43e3aaaad` — "Merge pull request #576 from TheHalfMoon/feat/ua-p06-t08-sca-sbom", 2026-09-30 |
| Commits on main | 1,524 |
| Remote branches | 610 |
| PRs (all states) | 379; open: #577 (Graft agent policy, `AGENTS.md` only), #359 (brand identity/UI docs) |
| Issues (all states) | 198; open: #419 ARES admission, #342 Spec 016, #300 Spec 014, #296 frontier assessment, #171 Spec 007 replay route, #75 research, #6 research |
| CI on HEAD | `Project CI` success on `ca6b6f51` (matrix: ubuntu-24.04 / macos-14 / windows-2025 × Node 22 / 24) |
| Workflows | `ci.yml`, `self-verify.yml`, `spec-007-isolated-replay.yml`, `spec-007-t113-metrics.yml`. No release, publish, signing, or provenance workflow. |
| Constitution | `.specify/memory/constitution.md` v1.3.0, last amended 2026-09-27 (A06) |

The historical reference values in the founder brief were re-verified: HEAD is still `ca6b6f5…`, UA-P06-T08 merged in #576, #577 is Graft, and #359 is brand/UI. UA-P06-T09 (IaC/CI security) has not started; no branch or PR exists for it.

## 2. Size and composition (OBSERVED)

| Area | Measure |
|---|---|
| `src/**/*.ts` | 54,795 lines |
| `src/assurance/**` | 31,040 lines across contracts (15), kernel (7), engines (mobile-artemis 15, native 1, review 1), review (14), security (9), test (10), workflow (7), publication (4), output (1) |
| `tests/` | 224 files; about 2,003 `it`/`test` call sites |
| Runtime dependencies | `cross-spawn@7.0.6`, `playwright@1.63.0` |
| Vendored | `vendor/google-artemis` (796 files, 37 MB, Apache-2.0) |
| Python | `python/ascout_mobile_bridge` |

## 3. Phase status reconciliation (OBSERVED from merged PR titles)

| Phase | Planned tasks | Status | What actually exists |
|---|---|---|---|
| UA-P00 | 10 | Complete | Planning canonicalization |
| UA-P01 | 16 | Complete | Shared contracts and validators |
| UA-P02 | 11 | Complete | Registry, availability, qualification, planner, omissions |
| UA-P03 | 15 | Complete | Review normalization pipeline, absence handling, injection boundary, independence policy, benchmark corpus, `ascout review` (absence-only) |
| UA-P04 | 11 | Complete | Freshness, stage attempts, idempotency, reviewer separation, publication intent/adapter/receipt, redaction gate (all in-process models; no GitHub call) |
| UA-P05 | 12 | Complete | Test profile policy, check adapter, coverage projection, browser projection, external observation normalizers (contract, property/fuzz, mutation, performance), `ascout test` (plan-only) |
| UA-P06 | 16 | T01–T08 complete; T09–T16 not started | Sentrdel pin (`REFERENCE_ONLY`), characterization, adapter request/response validators, normalization of evidence/coverage/SAST/secrets/dependency deltas. **No execution path and no `ascout security` command.** |
| ARTEMIS A0–A13 | — | Complete | Mobile engine modules + vendored donor; not exposed in the CLI |
| UA-P07–P18 | — | Not started | — |

## 4. Executed probes (OBSERVED)

Probe repository: a fresh Git repository with `package.json` (test script), a committed `a.js` containing an AWS-documentation example key string and `eval(...)`, then a working-tree modification that adds `require("child_process").exec(process.argv[2])`. Ascout was built from HEAD with `npm ci --ignore-scripts && npm run build` (exit 0).

| Command | Exit | Observed behavior |
|---|---|---|
| `ascout review` | **0** | `outcome: NOT_RUN`; "no qualified review engine available"; lists 3 unreviewed files |
| `ascout review --format json` | **0** | `kind: absence`, `execution_status: UNAVAILABLE`, `binary_name: open-code-review`, `resolved_path: unresolved` |
| `ascout test` | **0** | "Ascout Test Plan (plan only, no execution)", profile STANDARD |
| `ascout test --profile release --format json` | **0** | Plan JSON; nothing executed |
| `ascout check --format json` | **4** | `completeness: materially_incomplete`; 4 tasks `NOT_APPLICABLE`; `js_test_runner_not_discovered` |
| `ascout doctor` | 0 | Discovery and authority classification printed |

Interpretation:

- **`check` is honest and mature.** Exit 4 correctly signals incompleteness.
- **`review` and `test` are honest in their text but not in their exit codes.** Exit 0 tells any automated caller (CI, coding agent, MCP host) that the command succeeded. This violates the intent of Constitution II ("No green by omission") at the process-interface level. The constitution's exit-4 rule is currently written only for `check`'s changed-line exercise; V2 proposes extending it (A07).
- **`check` writes `.ascout/runs/*` into the target repository even when `init` was never run.** A subsequent `ocr delegate preview` then listed `.ascout/runs/*/receipt.json` as reviewable added files (OBSERVED). Ascout's own artifacts can pollute other tools' review scope.
- **No secret or dangerous-call signal was produced by any Ascout command.** This is expected (there is no security command), but it confirms that a user who runs every available command gets no security evidence.
- **Version identity mismatch:** receipt `run.ascout_version` is `0.1.0-m1`; `package.json` version is `0.1.0`.

Single-machine timings (OBSERVED, not benchmarks): `ascout test` plan rendering took 2,260 ms cold and about 300 ms warm; `ascout check` on the probe repository took 6,262 ms.

## 5. Investigation of the founder brief's specific observations

### A. Sentrdel integration — CONFIRMED, and worse than stated

- The Ascout pin `SENTRDEL_PINNED_REVISION = f5747319…` equals live Sentrdel HEAD (OBSERVED), and `integration_mode` is `REFERENCE_ONLY`.
- Ascout contains **no code that launches Sentrdel.** `src/assurance/security/*` validates request/response shapes and normalizes hypothetical outputs.
- **Sentrdel itself has no runnable CLI.** Built on Linux (WSL2) with `cargo build --locked --release -p sentrdel-cli` (exit 0), the resulting `sentrdel` binary (458 KB) printed `Sentrdel bootstrap — implementation in progress` for `--help` and for `review --help`. Per `crates/sentrdel-cli/src/main.rs`, command parsing is "intentionally deferred", feature modules are compiled with `#[allow(dead_code)]`, and `main` returns `CliExitCode::Success`.
- The Sentrdel **libraries are real and tested.** `cargo test --locked --workspace` on Linux reported at least 56 passing test binaries and at least 790 passing tests (output truncated by the probe's line limit, so the full total is not claimed). Public library entry points include `read_diff`, `scan_changed_secrets`, `scan_changed_workflow`, `dependency_delta`, `parse_lockfile`, OSV `lookup_package`, `reconcile_evidence`, `aggregate_review_coverage`, and `register_r2_pack`/`register_r3_business_logic_review`.
- **Sentrdel does not build on a stock Windows developer machine** (OBSERVED): `regorus 0.11.0` depends on `msvc_spectre_libs 0.1.3`, which panics when Spectre-mitigated MSVC libraries are not installed. Sentrdel CI on Windows passes because the runner images include those libraries.
- Sentrdel has no GitHub release.

**Request → execution → normalization → evidence → claim pathway status:** request validator exists; **execution missing (both sides)**; normalization exists; evidence/claim contracts exist but have never received real Sentrdel output.

### B. Kodac integration — CONFIRMED

- The pin `KODAC_PINNED_REVISION = 406b3352…` equals live Kodac HEAD; `integration_mode: PATTERN_ONLY`.
- What was integrated: re-implementations in Ascout of freshness, stage-attempt, idempotency, reviewer-role separation, and publication intent/adapter/receipt **models**. None calls GitHub, and none is durable across process restarts (no persisted workflow store).
- Kodac itself runs: `node bin/kodac.mjs --help` lists `apply-patch`, `ask`, and `solve` (OBSERVED). The Kodac repository contains 167,915 TypeScript lines; its runtime package (Node ≥ 24, `--experimental-strip-types`) includes `src/github-review/o4a…o4i` (review → publication), `src/verification/done-gate.ts` (`PROVEN_READY` when 6 required checks pass with evidence), and Linux-only confinement (`native/landlock-run.c`, gVisor/Docker gateway modules).
- Kodac's Done Gate is narrower than Ascout's ClaimAssessment (a fixed 6-check list, no omission/contradiction/coverage semantics). It should be superseded, not imported.

### C. Review CLI — CONFIRMED

`ascout review` builds an absence report with `defaultUnavailableExecutionV1`. It never resolves or spawns an engine (no `spawn`/`execFile` in `src/assurance/review` or `src/assurance/engines/review`). The default identity names binary `open-code-review`; the upstream CLI binary is `ocr` (OBSERVED: `ocr --version` → `open-code-review v1.12.12 (182898c)`). The pinned OCR commit `5f8e5ab3…` is 16 commits behind upstream HEAD `182898cf…`.

OCR facts (OBSERVED):

- `ocr delegate preview` runs offline without an LLM and exits 0.
- `ocr review --format json` without a configured endpoint fails closed with exit 1 and names `OCR_LLM_URL`/`OCR_LLM_TOKEN`/`OCR_LLM_MODEL`.

Framework readiness: high. Execution readiness: zero.

### D. Test CLI — CONFIRMED

`ascout test` calls `buildTestPlanV1(profile)` only. The existing `check` runner (Vitest, Jest, pytest, TypeScript, ESLint adapters in `src/tools/*`) is the only executing test path. The UA-P05 mutation/property/contract/performance modules normalize *external observations* that no Ascout command produces.

### E. Security coverage — CONFIRMED GAP

| Capability | Sentrdel library (REPORTED/OBSERVED in code) | Ascout normalization | End-to-end runnable |
|---|---|---|---|
| SAST (structural, small high-signal rule set, JS/TS via tree-sitter/ast-grep) | yes | yes (T06) | no |
| Changed secrets (redacted) | yes | yes (T07) | no |
| Dependency delta + OSV | yes (offline fixture + optional OSV) | yes (T08) | no |
| SBOM | **no** (T08 recorded it as a coverage gap) | gap recorded | no |
| GitHub Actions / CI security | yes (`github_actions.rs`) | not yet (T09) | no |
| IaC (Terraform/K8s/Docker) | **no** | no | no |
| Supabase static posture | yes (R2) | not mapped | no |
| Business-logic invariants (Express/Next.js/Supabase subset) | yes (R3) | not mapped | no |
| SARIF import | yes (`sentrdel-engine/src/adapter.rs`) | planned (T11) | no |
| Reproduction / remediation-retest | contracts only | planned (T12/T13) | no |
| Languages beyond JS/TS | **no** (Python, Go, Java, Rust are unsupported for SAST) | — | no |

### F. Claim and exit-code correctness — CONFIRMED DEFECT

An unavailable mandatory engine (review) and an unexecuted requested capability (test RELEASE profile) both produce **exit 0**. The Sentrdel stub also exits 0. Command success and assurance success are conflated at the process boundary for 2 of Ascout's 5 commands and for the Sentrdel binary.

### G. Trust and execution — CONFIRMED GAP

- Ascout executes repository-defined commands (`npm test`, etc.) as the invoking user with the user's full environment minus redaction-on-persist. There is no filesystem, network, or credential isolation. The changed-command-surface refusal is an admission control, not a sandbox, and the constitution says so explicitly.
- Symlink, traversal, and confusable-path defenses exist in Sentrdel's bounded repository views (REPORTED), not in Ascout's executor.
- Untrusted repositories and untrusted PR branches are out of scope by Constitution IV.

### H. Release and user readiness — CONFIRMED GAP

`private: true`; not on npm; no GitHub release of Ascout; no installer; no signing or provenance; no update channel; `THIRD_PARTY_NOTICES.md` omits the runtime dependency `playwright@1.63.0`; the README does not document `review`/`test`/`doctor`; no MCP server; cross-platform CI exists (good).

## 6. What is complete, partial, blocked, planned, or missing

| State | Items |
|---|---|
| **Complete and executing from the CLI** | `check` (receipts, source binding, drift, changed-command refusal, coverage exercise), `doctor`, `init` |
| **Executing in tests/benchmarks only (no CLI entry point)** | Playwright browser executor (`src/browser/*`, reached only through `src/assurance/test/browser-evidence-projection.ts` and `benchmarks/browser`), candidate worktree (`src/quality/worktree.ts`) |
| **Complete as contracts/normalizers, never fed by a real engine** | Review pipeline, Sentrdel normalization, test external-observation normalizers, publication models, workflow models, mobile ARTEMIS |
| **Partial** | `review` (absence only), `test` (plan only), UA-P06 (8/16) |
| **Blocked** | Real security execution (blocked by the Sentrdel stub CLI and missing releases) |
| **Planned only** | UA-P07–P18 |
| **Missing and not planned with sufficient priority** | Containment for untrusted code on any platform, a release pipeline, an MCP server, a unified exit taxonomy, SBOM generation, IaC scanning, non-JS/TS SAST |
