# 04 — Capability Reuse Matrix

Each entry records the 13 fields required by the founder brief. Revisions are the default-branch HEADs observed on 2026-10-08 (full SHAs in [SOURCE_PROVENANCE_REGISTER](SOURCE_PROVENANCE_REGISTER.md)). "Current tests" means evidence observed in this session unless marked REPORTED.

**Totals:** 27 components assessed. 8 are KEEP (existing Ascout code), 4 are COMPANION/ADAPTER engines, 7 are SELECTIVE_PORT/ADAPT, 6 are REFERENCE, and 2 are SUPERSEDE/REJECT.

**Revision 2:** the Kodac dispositions in this matrix (P04, F01, S01) are superseded by [16](16_KODAC_CONVERGENCE_ANALYSIS.md), which compares 18 Kodac capabilities and proposes 12 ports, 2 integrations, 3 retained in Kodac, and 1 reference.

## 1. Existing Ascout components (KEEP)

| ID | Component (path) | Capability | Maturity | Current tests | V2 role | Acceptance |
|---|---|---|---|---|---|---|
| K01 | `src/assurance/contracts/*`, `src/assurance/kernel/*` | Target, intent, policy, plan, engine descriptor/qualification/run, evidence ref, finding, coverage, omission/contradiction, claim assessment, serialization, validators, authority, planner | Implemented | CI green on HEAD (6-cell matrix, REPORTED by GitHub Actions); adversarial corpus tests present | **Sole trust kernel** | Existing golden fixtures byte-stable; no new authority type added in V2 without amendment |
| K02 | `src/check.ts`, `src/run.ts`, `src/tools/*`, `src/receipt/*` | `ascout check` execution, receipts v1.0, exit taxonomy | Implemented, executing | Probe exit 4 behaved correctly (OBSERVED) | Engine behind `ascout test` STANDARD | Receipt schema unchanged; `test` reuses it via `src/assurance/test/check-adapter.ts` |
| K03 | `src/assurance/review/*` | Raw observation, location validation, coverage accounting, dedup, normalization, injection boundary, independence policy, absence handling | Implemented, never fed real output | Unit/contract tests | Consumer of OCR output | Real OCR JSON from the pinned binary passes normalization; malformed output yields `MALFORMED_OUTPUT` and never a clean result |
| K04 | `src/assurance/security/*` | Sentrdel pin, characterization, adapter validators, evidence/coverage/SAST/secret/dependency normalization | Implemented, never fed real output | Unit tests | Consumer of the Sentrdel envelope | Real Sentrdel envelope round-trips; pin moves from `REFERENCE_ONLY` to `COMPANION_BINARY` under A07 |
| K05 | `src/assurance/test/*` | Profile policy, check adapter, coverage/browser projection, external observation normalizers | Implemented; only the check adapter has a real producer | Unit tests | `ascout test` execution planner | DEEP profile runs Stryker when installed, else records `NOT_RUN(engine_unavailable)` |
| K06 | `src/browser/*` | Playwright executor, intent IR, locators, recovery, trace artifacts | Implemented, executing in benchmarks | `benchmarks/browser` | V7 `ascout test --browser` | Existing browser benchmark results reproduced on CLI path |
| K07 | `src/quality/worktree.ts` | Candidate worktree | Implemented | Unit tests | Base for candidate isolation (V3) | Winds semantics ported (R16) |
| K08 | `src/assurance/publication/*`, `src/assurance/workflow/*` | Publication intent/receipt/redaction, freshness, idempotency, reviewer separation | Implemented as models | Unit tests | Policy layer above the ported GitHub transport (R12) | Publication requires an exact-head fresh claim |

## 2. Companion and adapter engines

### C01 — Sentrdel security engine
- **Source:** `TheHalfMoon/Sentrdel` @ `f5747319a50831ef7cee983d253c0ca5503c9a64`
- **Component:** `crates/sentrdel-review` (68.2k LOC), `crates/sentrdel-engine`, `crates/sentrdel-schema`, `crates/sentrdel-policy`; CLI contract types in `crates/sentrdel-cli/src/lib.rs` (`CliEnvelope`, `CliExitCode`, `CliCommand`)
- **Capability:** changed-diff security review: structural SAST (JS/TS), redacted secrets, dependency delta + OSV, GitHub Actions review, Supabase static posture, bounded business-logic invariants, reconciliation, coverage
- **Maturity:** libraries implemented; **CLI dispatch not implemented** (`main.rs` stub); no release
- **Current tests:** at least 790 tests in at least 56 test binaries passed on Linux (OBSERVED, partial capture)
- **License:** Apache-2.0
- **Reuse method:** COMPANION binary (separately built and released; Ascout launches it)
- **Integration target:** `src/assurance/engines/security/sentrdel-runner.ts` (new) → existing `src/assurance/security/*`
- **Dependency impact:** none in Ascout's npm graph; one optional platform binary (~0.5 MB stub today; release size to be measured)
- **Security concerns:** Sentrdel parses untrusted repository content. It must run under the broker's tier and with `NO_NETWORK` unless OSV lookup is explicitly approved
- **Expected advantage:** 100k lines of tested Rust security analysis that already treats engine output as untrusted. Rebuilding this in TypeScript is not justifiable
- **Acceptance:** V1 acceptance suite ([13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md) §2): planted secret, dangerous workflow, vulnerable dependency delta, and a clean control produce the expected normalized findings; a missing binary yields exit 4 `NOT_RUN(engine_unavailable)`; a version mismatch yields `VERSION_MISMATCH`

### C02 — Sentrdel external scanner fan-in
- **Source:** same revision; `crates/sentrdel-engine/src/adapter.rs` (1,548 LOC, `adapt_sarif`), `crates/sentrdel-engine/src/process_tree.rs` (265 LOC, Job Object / process group)
- **Capability:** run user-installed scanners (Trivy, OSV-Scanner, Syft, Gitleaks, Opengrep/Semgrep) and adapt SARIF into Sentrdel Evidence
- **Maturity:** adapter and runner implemented; scanner registrations not implemented
- **License:** Apache-2.0 (scanners keep their own licenses; none is bundled)
- **Reuse method:** COMPANION (inside Sentrdel)
- **Integration target:** Sentrdel engine registry; Ascout sees only the Sentrdel envelope
- **Security concerns:** scanner binaries are untrusted executables chosen by the user; identity (path + hash + version) must be recorded per run
- **Acceptance:** each scanner registration has a fixture SARIF test plus one real-binary smoke test in Sentrdel CI

### C03 — Alibaba Open Code Review
- **Source:** `alibaba/open-code-review` @ `182898cf522da3d04157b422752d028417974e19` (v1.12.12)
- **Capability:** diff review with deterministic file selection, bundling, and rule matching; LLM review with line positioning; delegation mode without an LLM
- **Maturity:** released, actively maintained
- **Current tests:** `ocr --version`, `ocr delegate preview` (exit 0), and `ocr review` without an endpoint (exit 1) executed (OBSERVED)
- **License:** Apache-2.0
- **Reuse method:** ADAPTER (user-installed or Ascout-resolved platform binary)
- **Integration target:** `src/assurance/engines/review/opencode-review-runner.ts` (new) → K03
- **Dependency impact:** none in npm graph if resolved as a binary; optional
- **Security concerns:** sends code to whatever endpoint the user configures, which is data egress. Must be an explicit, recorded effect. The prompt-injection surface (repository content reaching an LLM) is handled by K03's injection boundary, which never grants authority to model output
- **Expected advantage:** OCR's deterministic selection directly addresses agent review failure modes (incomplete coverage, position drift)
- **Acceptance:** V2 suite: coverage accounting matches `ocr delegate preview` file list exactly; every OCR comment location validates against the exact head; an unreviewed file is never reported as reviewed

### C04 — Playwright (existing dependency)
- **Source:** `microsoft/playwright` 1.63.0 (pinned); upstream 1.64.0
- **Reuse method:** existing runtime dependency
- **Action:** add the missing THIRD_PARTY_NOTICES entry (V0)

## 3. Selective ports (code copied and adapted, with provenance)

### P01 — Linux containment (Landlock v4 + seccomp)
- **Source:** `TheHalfMoon/Golam` @ `13a379ac478a3abaff7ed1da3db14ff9c1ac2188`, `crates/golamd/src/native_containment_v2.rs` (834 LOC), `crates/golamd/src/bin/golam-native-exec-helper-v2.rs`, hostile probes `golam-native-containment-hostile-probe-v2.rs`
- **Capability:** fully enforced Landlock ruleset + seccomp deny filter (TSYNC), with an explicit profile token `platform:linux-x86_64-landlock-v4-seccomp-v2`
- **Maturity:** implemented with hostile-probe qualification binaries; **x86_64 Linux only**
- **Current tests:** REPORTED by Golam (probes exist); not executed in this session
- **License:** **No LICENSE file in Golam. Blocked on FD-3** (founder relicensing attestation to Apache-2.0)
- **Third-party deps:** `landlock`, `seccompiler` crates (verify licenses at admission)
- **Integration target:** `native/ascout-exec/src/linux.rs` (new Rust helper in the Ascout repo, prebuilt per platform)
- **Security concerns:** kernel feature availability varies (Landlock ABI). The helper must report the achieved ABI and must fail closed if full enforcement is not achieved
- **Expected advantage:** an existing hostile-probe-qualified implementation; avoids writing containment from scratch
- **Acceptance:** port Golam's hostile probes into Ascout's containment qualification suite; all probes must be denied on ubuntu-24.04 CI

### P02 — Windows process-tree scope (Job Objects)
- **Source:** `TheHalfMoon/Winds` @ `3bfe45fec5c36ef1e407edf12c96ff5444f03847`, `src/process_scope.rs` (1,118 LOC: Job Object limits, accounting, kill-on-close; macOS/Linux process-group branches)
- **Capability:** reliable termination and resource accounting of child process trees. **This is not isolation.**
- **Maturity:** released (Winds v0.1.0)
- **License:** MIT OR Apache-2.0
- **Integration target:** `native/ascout-exec/src/windows.rs`
- **Acceptance:** fork-bomb and orphan tests: no surviving descendants after timeout on windows-2025 CI

### P03 — Candidate verification contract
- **Source:** Winds, `README.md` §"The 0.1 verification contract", `src/check.rs`, `src/git.rs`
- **Capability:** clean-primary requirement, exact base/candidate object IDs, detached **locked** worktree outside the Git common directory, bounded output, `ELIGIBLE` only when the observed candidate still matches the snapshot
- **License:** MIT OR Apache-2.0
- **Reuse method:** ADAPT semantics into `src/quality/worktree.ts` (TypeScript); copy no Rust
- **Acceptance:** candidate mutated during a run → `tree_drifted` (exit 3); a check in a worktree never writes to the primary checkout

### P04 — GitHub review publication transport
- **Source:** `TheHalfMoon/Kodac` @ `406b335277f2df1e3dedf24cdb45847dff919d44`, `packages/kodac-runtime/src/github-review/o4b-bounded-read-only-github-context.ts`, `o4g-bounded-github-review-publication.ts` (526 LOC), `o4i-bounded-production-publication-wiring.ts` (202 LOC)
- **Capability:** origin-pinned (`https://api.github.com` only) bounded REST calls to read PR context and publish reviews, with response-URL validation
- **License:** Apache-2.0
- **Integration target:** `src/assurance/publication/github-transport.ts` under the existing K08 policy
- **Security concerns:** token handling. The token comes from the environment or `gh auth token` at call time, is never persisted, and is redacted in all artifacts
- **Acceptance:** recorded-fixture tests; publication is refused for a stale head; dry-run is the default

### P05 — Ascout Agent Skill and GitHub Action packaging
- **Source:** `TheHalfMoon/Diffcipline` @ `1e6d14f77b95bb132b42276f10d67f1018ab5bb6`, `skills/diffcipline/`, `skills/diffcipline-review/`, `action.yml`
- **License:** MIT
- **Reuse method:** ADAPT structure; the content is written new for Ascout
- **Acceptance:** the skill instructs agents to call `ascout` via MCP/CLI and to treat exit 4 as "not verified"; the Action uploads receipts as artifacts

### P06 — SARIF 2.1.0 writer
- **Source:** `TheHalfMoon/commandF` @ `f82565cca917d119e1c774b2c470e2ac20e0d6dd`, `crates/commandf-pkg/src/check_sarif.rs` (246 LOC)
- **License:** **No LICENSE file. Blocked on FD-3**; small enough to re-implement in TypeScript if FD-3 is not granted
- **Reuse method:** REFERENCE → TypeScript export in `src/assurance/output/sarif-export.ts` (UA-P06-T11)
- **Acceptance:** output validates against the SARIF 2.1.0 schema; SARIF is never re-imported as Ascout truth

### P07 — Approval bound to exact content
- **Source:** `TheHalfMoon/Deskal` @ `be21813d29e4faf4887a9b23f67b2158ce247832`, `crates/qdral-approval/src/lib.rs` (2,293 LOC)
- **Capability:** an approval is bound to the exact content hash and current state of the affected object
- **License:** Apache-2.0
- **Reuse method:** ADAPT semantics into the MCP effect-approval path (V4); copy no Rust
- **Acceptance:** an approval for one head/diff cannot be replayed against another

## 4. References (no code import planned)

| ID | Source | Use |
|---|---|---|
| F01 | Kodac `src/trust/sandbox-observer-gvisor*.ts`, `src/execution/gateway-gvisor-*.ts`, `native/gvisor-*.c` | Qualification method for the optional Linux `ISOLATED_STRONG` gVisor tier |
| F02 | Deskal `apps/qdral-mcp` (13.7k TS LOC) | Local stdio MCP server structure, tool bounding, approval UX |
| F03 | Winds `src/agentic_claude.rs`, `src/agentic_codex.rs`; Delethos `packages/adapters/src/{claude,codex,opencode,pi}.ts` | V6 "independent reviewer agent" mode (launching a different local agent CLI than the author) |
| F04 | HarnessMind (private; concepts only) | V6 agent-harness/permission audit |
| F05 | MSTR `src/mstr_qualify` | V6 local-model review qualification method |
| F06 | kernux `crates/kernux-policy/src/egress.rs`, `crates/kernux-store/src/cas.rs` | Egress-policy and CAS design cross-check only |

## 5. Superseded or rejected

| ID | Source | Decision | Reason |
|---|---|---|---|
| S01 | Kodac `src/verification/done-gate.ts` | SUPERSEDE (revision 1); **revision 2: INTEGRATE** ([16](16_KODAC_CONVERGENCE_ANALYSIS.md) K-12) | Fixed 6-check list; Ascout ClaimAssessment already models omissions, contradictions, freshness, and coverage |
| S02 | Golam-research, Qdrat | REJECT | Third-party rights (proprietary reconstruction; LGPL HRMS) |
