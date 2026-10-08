# 11 — Implementation Master Plan

**Ordering principle:** every phase ends with a user-runnable command that executes a real engine (or a real containment mechanism) and produces a real, exit-coded claim. No phase may consist only of contracts.

**Priority:** P0 = V0–V2 (minimum honest product); P1 = V3–V5 (safe, agent-native, installable); P2 = V6–V8.

**Effort estimates** are PROPOSED order-of-magnitude figures in focused engineer-weeks (founder + agents), for planning only.

```text
V0 ─► V1 ─► V2 ─► V3 ─► V4 ─► V5 ─► V6 ─► V7 ─► V8
      (Sentrdel repo work V1-T00..T02 starts in parallel with V0)
```

---

## V0 — Truthful baseline · P0 · ~1 week

1. **Objective:** make every existing command's exit code and documentation truthful; fix compliance defects. No new capabilities.
2. **Reuse:** `src/cli.ts`, `src/receipt/model.ts` (`decideReceiptExitCode`), `src/assurance/review/review-command.ts`, `src/assurance/test/test-plan-command.ts`.
3. **New code:** an exit-mapping function shared by `review`/`test`; a `--plan` flag; a notices-completeness test.
4. **Sources:** Ascout only.
5. **Dependencies:** FD-1 (A07) for the behavior change.
6. **Risks:** breaking callers that rely on exit 0 (mitigation in §4).
7. **Tasks:** V0-T01…T07 ([12](12_TASK_REGISTRY.md)).
8. **Acceptance:** ADV-01, ADV-02, ADV-08; existing golden fixtures unchanged.
9. **Benchmarks:** none new.
10. **Security gates:** no new process execution paths.
11. **CI:** existing 6-cell matrix green at the exact head.
12. **Evidence:** CI run URLs + probe transcript re-run (the `01` §4 table with new exits).
13. **Exit criteria:** `review`/`test` never exit 0 without execution; notices complete; README parity test passes.
14. **Blockers:** FD-1.
15. **Maintenance burden:** negligible.

## V1 — First real engine: Sentrdel security slice · P0 · ~3–4 weeks

1. **Objective:** `ascout security` executes a released Sentrdel binary on the working tree or a base..head range and produces a normalized claim with the unified exit code. This absorbs UA-P06-T09 (CI workflow security) and UA-P06-T14 (`ascout security` CLI).
2. **Reuse:** Sentrdel libraries (C01); Ascout K04 normalizers; `src/process.ts` bounded execution; Engine Protocol types (new, thin).
3. **New code:** Sentrdel `main.rs` dispatch + protocol envelope (Sentrdel repo); Sentrdel release workflow; Ascout `sentrdel-runner.ts`, `security` command, binary resolver with manifest hash check.
4. **Sources:** `Sentrdel@f5747319` `crates/sentrdel-cli/src/{lib.rs,main.rs,review.rs}`, `crates/sentrdel-review/src/{git.rs,secrets.rs,github_actions.rs,dependency.rs,reconcile.rs,coverage.rs}`.
5. **Dependencies:** V0; FD-2.
6. **Risks:** G10 (normalizer/real-output mismatch); G19 (Windows build). Sentrdel's `CliEnvelope` may need a version bump.
7. **Tasks:** V1-T00…T10.
8. **Acceptance:** SEC-01…SEC-08 ([13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md) §2); ADV-03, ADV-04.
9. **Benchmarks:** security latency/RSS on the 3-repository corpus (B-SEC-1).
10. **Security gates:** Sentrdel runs with `network: DENY`; credential-scrubbed env; binary hash verified; output size cap.
11. **CI:** Sentrdel release workflow on 5 targets; Ascout CI downloads the pinned release and runs the V1 acceptance suite on 3 OSes.
12. **Evidence:** release attestations; golden fixtures captured from the real binary at the pinned version.
13. **Exit criteria:** planted fixtures detected; missing binary → exit 4; tampered binary → exit 4 with `VERSION_MISMATCH`; clean control → exit 0 with explicit coverage (including `UNSUPPORTED_LANGUAGE` where applicable).
14. **Blockers:** FD-2; Sentrdel Windows build (prebuilt via the CI image).
15. **Maintenance:** one pinned companion; re-pin per Sentrdel release.

## V2 — Review and test execution · P0 · ~3–4 weeks

1. **Objective:** `ascout review` executes OCR (local/BYOK endpoint) or emits a delegation spec and ingests the host agent's result. `ascout test` executes its profile.
2. **Reuse:** K03 review pipeline, K05 test profile policy and check adapter, K02 `check`, OCR (C03).
3. **New code:** `opencode-review-runner.ts` (resolve `ocr`, run `ocr review --format json --output <state>` with `--from/--to`, parse); a delegation round-trip (`ascout review --delegate` → spec; `ascout review --ingest <file>` → observations with `HOST_AGENT` independence); `test` executor wiring; Stryker runner for DEEP when present.
4. **Sources:** `alibaba/open-code-review@182898cf` CLI contract (JSON output, `delegate` subcommands); Ascout internal.
5. **Dependencies:** V0. Independent of V1 and can run in parallel with it.
6. **Risks:** OCR JSON schema drift across versions (pin + golden fixtures); egress (G20); injection (G21).
7. **Tasks:** V2-T01…T09.
8. **Acceptance:** REV-01…REV-07, TST-01…TST-04; ADV-05, ADV-06.
9. **Benchmarks:** review coverage completeness on the existing review benchmark corpus (`src/assurance/review/benchmark-corpus.ts`) with a real local endpoint when available; otherwise reported as NOT_RUN.
10. **Security gates:** remote endpoint requires `source_egress = EXPLICIT_POLICY_ONLY` + per-invocation endpoint id; tokens never persisted.
11. **CI:** OCR delegation-mode tests (no LLM) on 3 OSes; LLM-mode tests use a recorded-response stub endpoint (a local HTTP fixture), labeled as such.
12. **Evidence:** fixtures from real `ocr` v1.12.12 output.
13. **Exit criteria:** an unreviewed file can never appear reviewed; review without an endpoint → exit 4; `test --profile standard` runs `check` and returns its exit.
14. **Blockers:** none beyond FD-1.
15. **Maintenance:** OCR re-pin cadence (upstream is very active: 16 commits in about 2 weeks).

## V3 — Execution Broker, containment tiers, evidence integrity · P1 · ~5–7 weeks

1. **Objective:** all child processes go through one broker; the achieved tier is declared; T1 exists on Linux x86_64 (and Windows if G18 succeeds); evidence moves out of the repository with sealed digests; untrusted-mode policy (A07 rule 4) is enforced.
2. **Reuse:** `src/process.ts`; Golam P01; Winds P02/P03; Kodac F01 (method).
3. **New code:** `src/execution/broker.ts`; `native/ascout-exec` (Rust) with `linux.rs`, `windows.rs`, `macos.rs` (stub declaring T0); `src/evidence/store.ts`; `ascout verify-receipt`.
4. **Sources:** `Golam@13a379ac` `crates/golamd/src/native_containment_v2.rs`, `bin/golam-native-exec-helper-v2.rs`, hostile probes; `Winds@3bfe45fe` `src/process_scope.rs`.
5. **Dependencies:** V1, V2; FD-3 (Golam license); FD-4.
6. **Risks:** Landlock ABI variance; AppContainer complexity; adding a Rust build to Ascout CI.
7. **Tasks:** V3-T01…T10.
8. **Acceptance:** CON-01…CON-08 (hostile probes), ADV-07, ADV-10.
9. **Benchmarks:** broker overhead per spawn (B-EXE-1, PROPOSED ≤ 50 ms).
10. **Security gates:** hostile probe suite must show 0 escapes at the declared tier; any unexpected escape → the tier is downgraded in the manifest.
11. **CI:** probe suite on ubuntu-24.04 (T1), windows-2025 (T0 + T1 if delivered), macos-14 (T0 declaration test).
12. **Evidence:** probe receipts per platform.
13. **Exit criteria:** every receipt states the achieved tier; untrusted execution on a T0-only platform is `BLOCKED` without an override.
14. **Blockers:** FD-3, FD-4.
15. **Maintenance:** Medium. Native code on 3 OSes is the largest new maintenance item in V2.

## V4 — Agent-native surfaces · P1 · ~3 weeks

1. **Objective:** coding agents can call Ascout through MCP and are taught, through an Agent Skill, what "verified" means.
2. **Reuse:** CLI internals; Deskal F02 (design), P07 approval semantics, Diffcipline P05 packaging.
3. **New code:** `src/mcp/` stdio server (no network listener); tool schemas; approval binding; Agent Skill; GitHub Action.
4. **Sources:** `Deskal@be21813d` `apps/qdral-mcp`, `crates/qdral-approval/src/lib.rs` (semantics only); `Diffcipline@1e6d14f7` `skills/`, `action.yml`.
5. **Dependencies:** V2 (tools must execute); V3 for untrusted-default execution through MCP.
6. **Risks:** an agent self-approving effects (mitigation: approval requires a human channel; MCP tool calls cannot carry approval tokens they minted themselves).
7. **Tasks:** V4-T01…T07.
8. **Acceptance:** MCP-01…MCP-06; ADV-11 (agent cannot approve its own publication).
9. **Benchmarks:** MCP round-trip overhead.
10. **Security gates:** effectful tools refused without approval; read-only tools cannot mutate.
11. **CI:** MCP conformance tests against the pinned MCP spec revision.
12. **Evidence:** recorded MCP sessions.
13. **Exit criteria:** an agent session can run `ascout_assure` and receives exit-code-equivalent outcomes and omissions.
14. **Blockers:** none.
15. **Maintenance:** MCP spec churn (moderate).

## V5 — Distribution, durability, publication · P1 · ~4 weeks

1. **Objective:** a user can install Ascout and companions on 3 OSes with verified integrity; runs are crash-recoverable; reviews can be published to GitHub safely.
2. **Reuse:** `docs/npm-package-identity.md`; K08 + Kodac P04; Winds journal patterns.
3. **New code:** release workflows, `ascout setup`, manifest, `ascout gc`, a file-based run journal, `github-transport.ts`.
4. **Sources:** `Kodac@406b3352` `src/github-review/o4b…`, `o4g…`, `o4i…`.
5. **Dependencies:** V1–V4.
6. **Risks:** signing certificates (cost/time); npm scope ownership proof.
7. **Tasks:** V5-T01…T09.
8. **Acceptance:** REL-01…REL-06, PUB-01…PUB-04, DUR-01…DUR-03.
9. **Benchmarks:** clean-machine install time; download size.
10. **Security gates:** hash and attestation verification before install; publication only on an exact fresh head; dry-run default.
11. **CI:** release dry-runs on every tag candidate; clean-VM install tests.
12. **Evidence:** attestations; install transcripts.
13. **Exit criteria:** first public pre-release (0.2.0) with honest limitations in the README.
14. **Blockers:** FD-6 (publication timing) — founder decides when to publish.
15. **Maintenance:** release engineering is recurring.

## V6 — Security breadth, assurance intelligence, independent review · P2 · ~6–8 weeks

Covers UA-P06-T10…T13, T15, T16, scanner fan-in (C02), SBOM, IaC, multi-language SAST, SARIF export (P06), the remediation/retest lifecycle, composite `ascout assure`, deterministic risk-based planning (07 §3F), the separate-agent reviewer (F03), local-model qualification (F05), and agent-harness audit (F04). Acceptance: SEC-09…SEC-16, ASR-01…ASR-05. Gate: benchmark precision/recall reported per scanner with known ground truth; no claim of coverage for an unsupported language.

## V7 — Real application verification · P2 · ~4–6 weeks

`ascout test --browser` exposes the existing Playwright executor through the CLI, with explicit app start commands, an E4 effect, and T1 when available. API test environments come through the user's runners only. Mobile (ARTEMIS) is reconsidered only with a demand signal. Acceptance: the browser benchmark is reproduced through the CLI path.

## V8 — Professional desktop UI · P2 · scope after V5 usage data

A read-mostly UI over receipts and plans that calls the same CLI/MCP interfaces. No new authority. PR #359 (brand) informs styling. Not started until V5 ships.

---

## 3. Reconciliation with UA-P00–UA-P18

| Old phase | Status | V2 disposition |
|---|---|---|
| P00–P05 | Complete | **Preserved** as history; their code is the K01–K08 base |
| P06 T01–T08 | Complete | Preserved; consumers for V1 |
| P06 T09 (IaC/CI) | Next | **Split:** CI-workflow part → V1 (Sentrdel `github_actions.rs` already exists); IaC part → V6 via Trivy fan-in |
| P06 T10–T13, T15–T16 | Not started | → V6 |
| P06 T14 `ascout security` | Not started | → **V1 (pulled forward)** |
| P07 Cloudflare deep audit | Not started | **Superseded:** becomes one agent-assisted audit method inside V6; not a phase |
| P08 Kernux Reality bridge | Not started | **Deferred indefinitely** (G24) |
| P09 Isolated Lab / provider qualification | Not started | **Replaced by V3** (local containment) + V6 (model qualification) |
| P10 Remote runtime | Not started | **Deferred** (contradicts zero operator cost unless user-hosted; no demand) |
| P11 Cyber / threat intel | Not started | **Deferred** |
| P12 Dynamic authorized security | Not started | **Deferred** until V3 tiers are qualified on ≥ 2 OSes |
| P13 Assure composite | Not started | → V6 |
| P14 Explain/reproduce/retest | Not started | → V6 (retest), explanations via Sentrdel `explain` |
| P15 IDE/MCP/GitHub | Not started | → **V4/V5 (pulled forward)** |
| P16 Donor migration/parity | Not started | **Superseded:** no repository migration; companions stay separate |
| P17 Packaging/release | Not started | → **V5 (pulled forward)**; Sentrdel release → V1 |
| P18 Final qualification | Not started | Each V-phase has its own exit gate; a final release qualification at V5 |

The old task registry (`ASCOUT_UNIFIED_ASSURANCE_TASK_REGISTRY_2026-09-19.md`) is **not edited**. On ratification, a supersession record is added to `docs/strategy/README.md` that points here.

## 4. Migration and compatibility

| Change | Who is affected | Mitigation |
|---|---|---|
| `review`/`test` exit 0 → 4 when nothing executes | Scripts and agents that call them | Release note; `--plan` gives the old `test` behavior with exit 0; the review JSON `kind: absence` is unchanged |
| New claim state `REFUTED` | Consumers of claim JSON | Schema version bump; additive enum |
| Evidence root moves out of the repository (V3) | Users reading `.ascout/runs` | `.ascout/` export retained behind `--export-dir`; `check` receipt schema unchanged |
| Sentrdel pin mode `REFERENCE_ONLY` → `COMPANION_BINARY` | Internal validators that hard-code T01 mode | Update with a characterized-capability re-run |
| OCR binary identity `open-code-review` → `ocr` | Absence reports and fixtures | Fixture update in V0-T04 |

`check` receipts (schema 1.0) are byte-compatible through V5.

## 5. YAGNI review — what not to build

| Rejected / deferred | Reason |
|---|---|
| Ascout-hosted inference, browser farm, or scanning service | Operator variable cost; violates the business model |
| Plugin SDK, marketplace, registry | Second authority surface before containment exists |
| Long-running daemon / file watcher | No measured need; Constitution V |
| Database for evidence | Constitution V; JSON + digests suffice |
| Re-implementing SAST rules in TypeScript | Sentrdel + Opengrep exist |
| Direct Ascout integrations with Trivy/OSV/Syft/Gitleaks | Duplicates the Sentrdel fan-in |
| Grype, Checkov | Overlap with OSV-Scanner/Trivy |
| Remote runtime (UA-P10), cyber/threat intel (P11), dynamic attack (P12) | No containment, no demand, high attack surface |
| Kernux bridge (P08) | Source not ready (G24) |
| Kodac runtime import, Kodac Done Gate | Overlap; Ascout ClaimAssessment is stronger |
| A separate "Cloudflare audit" phase (P07) | It is a prompt method, not an engine |
| Model-chosen check selection | Not verifiable; deterministic planner suffices |
| Memory systems (Morize), voice (Wispral), design tools (Lilac/Skelet) | Outside the verification promise |
| UI before V5 | No stable backend contract yet |
| TinyFish/AgentQL, open-computer-use | Hosted dependencies |
