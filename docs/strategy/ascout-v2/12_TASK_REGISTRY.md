# 12 — Dependency-Ordered Task Registry

One task = one branch = one PR, merged with a normal merge commit after exact-head CI and review (existing governance). The "Repo" column says where the change lands. Acceptance IDs refer to [13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md).

## V0 — Truthful baseline (P0)

| Task | Repo | Depends | Deliverable | Acceptance |
|---|---|---|---|---|
| V0-T01 | Ascout | — | Amendment A07 proposal PR (text in [09](09_ASSURANCE_EVIDENCE_CONTRACTS.md) §5) | Founder ratification recorded |
| V0-T02 | Ascout | T01 | `review`/`test` unified exit mapping; `test --plan` | ADV-01, ADV-02 |
| V0-T03 | Ascout | — | Playwright notice; single version source (`ascout_version` = package version); notices-completeness test | ADV-08 |
| V0-T04 | Ascout | — | OCR identity `ocr`; re-pin OCR to an exact upstream commit; update fixtures | REV-00 |
| V0-T05 | Ascout | T02 | README command surface + docs/CLI parity test | DOC-01 |
| V0-T06 | Ascout | — | `check` excludes `.ascout/` via `.git/info/exclude` when `.gitignore` lacks it | ADV-12 |
| V0-T08 | Ascout | — | Neutralize repository-controlled Git configuration and environment in every Git invocation (G30); details are handled through a private security path | ADV-20 |
| V0-T09 | Ascout | — | Port Kodac's provenance admission lifecycle and validator to Node (K-15); add `scripts/planning/verify-planning-docs.mjs` and a Diffcipline policy (proposed separately) | Provenance validator rejects a record without rights/pin/audit fields; docs verifier PASS |
| V0-T10 | Ascout | — | Audit and pin TesterArmy e2e, original/portable Pstack, package/toolchain requirements, notices, and default egress | PST-01, PST-02; no donor code admitted yet |
| V0-T07 | Ascout | T02–T06, T08 | V0 qualification: re-run the [01](01_LIVE_REPOSITORY_AUDIT.md) §4 probe table and the G30 probe; record results | Probe table matches the expected exits; ADV-20 passes |

## V1 — Execution Broker and federated security slice (P0)

| Task | Repo | Depends | Deliverable | Acceptance |
|---|---|---|---|---|
| V1-T00 | Sentrdel | FD-2 | Stub `main` exits non-zero with `NOT_IMPLEMENTED` (stop false success immediately) | `sentrdel` → exit ≠ 0 |
| V1-T01 | Sentrdel | T00 | CLI dispatch: `sentrdel review --base <ref> --head <ref>|--worktree --format json` composing the existing library functions; Engine Protocol v1 envelope; `--version --json`; `--state-dir` / `--no-persist` | Sentrdel e2e tests; never exit 0 without `EXECUTED`; ADV-18 |
| V1-T02 | Sentrdel | T01 | Release workflow (5 targets), checksums, attestations; Windows build (G19) | Release dry-run artifacts verified |
| V1-T03 | Ascout | V0-T08 | Port Kodac execution gateway (K-1) over `src/process.ts`, with env allowlist (K-5) and the G30 neutralization | Ported Kodac gateway tests pass under Ascout `tsc` + Vitest on 3 OSes; CON-01, CON-02 |
| V1-T04 | Ascout | T03 | Port Kodac private store, receipts, and JSONL ledger (K-2, K-3); per-user state dir for new engine runs | Ported tests; ADV-12, ADV-18 |
| V1-T05 | Ascout | T03 | Engine Protocol v1 types + validator; companion manifest + resolver (absolute path, SHA-256) | PROTO-01…PROTO-03; SEC-05, SEC-06 |
| V1-T06 | Ascout | T05 | Engine Profiles for Gitleaks, OSV-Scanner, Syft, Trivy (exit meanings, coverage signals, required flags) | FMT-07, FMT-08, FMT-11 |
| V1-T07 | Ascout | T04 | Redaction pass before persistence | FMT-06, SEC-01 |
| V1-T08 | Ascout | T06, T07 | Format ingestors: SARIF (URI rebasing), CycloneDX, SPDX, OSV JSON, Trivy JSON; critical-field mapping tables | FMT-01…FMT-05 |
| V1-T09 | Ascout | T08 | Alias-based correlation; union aggregation; coverage records | FMT-04, ADV-15 |
| V1-T10 | Ascout | T09 | `ascout security` (scanners; Sentrdel when available) → ClaimAssessment → exit 0/1/2/3/4 | SEC-01…SEC-08, FMT-09, ADV-03, ADV-04, ADV-19 |
| V1-T11 | Ascout | T10, Sentrdel T02 | Sentrdel runner + wiring into the existing UA-P06 normalizers; CI-workflow normalization (CI part of UA-P06-T09) | E2E-03, SEC-02, SEC-08 |
| V1-T12 | Ascout | T10 | `real-engines.yml` CI on 3 OSes; `ascout doctor` engine table | E2E-04…E2E-07 at L3; DOC-02 |
| V1-T13 | Ascout | T10–T12 | V1 qualification + B-SEC-1 measurement | Exit criteria in [11](11_IMPLEMENTATION_MASTER_PLAN.md) V1 |

## V2 — Review and test execution (P0)

| Task | Repo | Depends | Deliverable | Acceptance |
|---|---|---|---|---|
| V2-T01 | Ascout | V0-T04, V1-T05 | OCR in the companion manifest; resolver for the `ocr` platform binary (no npm postinstall) | REV-01 |
| V2-T02 | Ascout | T01 | `opencode-review-runner.ts` (LLM mode) with endpoint identity + `source_egress` policy gate | REV-02, REV-03, ADV-05 |
| V2-T03 | Ascout | T02 | Wire into K03 normalization; golden fixtures from real `ocr` JSON | REV-04 |
| V2-T04 | Ascout | T01 | Delegation mode: `review --delegate` (spec from `ocr delegate preview/rule`) and `review --ingest <file>` with `HOST_AGENT` independence | REV-05, REV-06 |
| V2-T05 | Ascout | T03, T04 | Coverage accounting equals the OCR file selection; engine-excluded files stay visible; unreviewed ≠ reviewed | REV-07, ADV-06, ADV-17 |
| V2-T06 | Ascout | V0-T02 | `test` executes STANDARD via the check adapter | TST-01, TST-02 |
| V2-T07 | Ascout | T06 | DEEP/RELEASE: Stryker runner when installed, else `NOT_RUN(engine_unavailable)` | TST-03 |
| V2-T08 | Ascout | T06 | `test` receipts include profile, executed/omitted engines | TST-04 |
| V2-T10 | Ascout | T02 | Port Kodac reviewer qualification (K-7); qualify OCR + endpoint + model against a gold set | B-REV-2 recorded; unqualified engines labeled |
| V2-T09 | Ascout | T05, T08, T10 | V2 qualification | E2E-08 at L3; E2E-09 at L2 or labeled unqualified |

## V3 — Execution Broker and containment (P1)

| Task | Repo | Depends | Deliverable | Acceptance |
|---|---|---|---|---|
| V3-T01 | Ascout | V1, V2 | Tier selection and declaration in the V1 broker; lint rule forbids `child_process` outside it | CON-01, CON-08 |
| V3-T02 | Ascout | T01 | Env allowlist + credential stripping at launch | CON-02 |
| V3-T03 | Ascout | — | `native/` helpers: Kodac Landlock launcher (K-6, BSD-3-Clause notice) + network-namespace launcher; CI build; provenance entries | CON-03 |
| V3-T04 | Ascout | T03 | Linux `T1-FS` and full `T1` with runtime probes; Golam P01 only if FD-3 is granted for those files | CON-04, E2E-12 |
| V3-T05 | Ascout | T03 | Windows Job Object scope (Winds P02) | CON-05 |
| V3-T06 | Ascout | T05 | Windows AppContainer launch (new work; research-gated) | CON-06 or declared T0 |
| V3-T07 | Ascout | T03 | macOS: T0 declaration + Seatbelt research spike report | CON-07 |
| V3-T08 | Ascout | T01 | Evidence store in the per-user state dir; sealing digests; `.ascout` export | ADV-07 |
| V3-T09 | Ascout | T08 | `ascout verify-receipt` | ADV-07 |
| V3-T10 | Ascout | T04–T09 | Untrusted-mode policy (A07 rule 4) + V3 qualification | ADV-10, CON-08 |

## V4 — Agent-native surfaces (P1)

| Task | Repo | Depends | Deliverable | Acceptance |
|---|---|---|---|---|
| V4-T01 | Ascout | V2 | `ascout mcp` stdio server skeleton pinned to MCP spec 2026-07-28 | MCP-01 |
| V4-T02 | Ascout | T01 | Read-only tools (`plan`, `doctor`, `receipt_get`) | MCP-02 |
| V4-T03 | Ascout | T01, V3-T10 | Executing tools (`check`, `test`, `review`, `security`) defaulting to untrusted | MCP-03 |
| V4-T04 | Ascout | T03 | Port Kodac one-shot approval runtime (K-4); bind approvals to head and diff digest | MCP-04, ADV-11 |
| V4-T05 | Ascout | T03 | Agent Skill (`skills/ascout/SKILL.md`) | MCP-05 |
| V4-T06 | Ascout | V1, V2 | GitHub Action (receipts as artifacts; no publication) | MCP-06 |
| V4-T07 | Ascout | T01–T06 | V4 qualification | — |

## V5 — Distribution, durability, publication (P1)

| Task | Repo | Depends | Deliverable | Acceptance |
|---|---|---|---|---|
| V5-T01 | Ascout | V3-T03 | Release workflow (npm tarball + helpers), attestations | REL-01 |
| V5-T02 | Ascout | T01 | `ascout setup` (manifest-verified downloads, offline `--from`) | REL-02, REL-03 |
| V5-T03 | Ascout | T02 | Clean-machine install tests (3 OSes) | REL-04 |
| V5-T04 | Ascout | — | Run journal + crash recovery using Kodac durable-workflow semantics (K-9) | DUR-01…DUR-03 |
| V5-T05 | Ascout | — | `ascout gc` retention | REL-05 |
| V5-T06 | Ascout | V4 | Port Kodac GitHub transport (K-10) | PUB-01 |
| V5-T07 | Ascout | T06 | Publication under K08 policy (dry-run default, exact fresh head) | PUB-02…PUB-04 |
| V5-T08 | Ascout | T01–T07 | Signing (when certificates exist) | REL-06 |
| V5-T09 | Ascout | all | 0.2.0 pre-release qualification | FD-6 |

## V6–V8 (P2) — epics, to be decomposed after V5

| Epic | Contents |
|---|---|
| V6-E1 | Opengrep/Semgrep and Gitleaks history profiles on the V1 ingestion path; Sentrdel reconciliation over sealed artifacts; shared conformance corpus (FMT-10) |
| V6-E2 | Ascout coverage mapping for fan-in capabilities, including `UNSUPPORTED_LANGUAGE` |
| V6-E3 | UA-P06-T10…T13 (regression, SARIF export, reproduction refs, remediation/retest) |
| V6-E4 | Composite `ascout assure` + deterministic risk inputs |
| V6-E5 | `kodac ask` as separate-agent reviewer (K-11, E2E-11); Kodac Done Gate consuming Ascout receipts (K-12, E2E-14) |
| V6-E6 | Local-model review qualification |
| V6-E7 | Agent-harness/permission audit from ported Kodac compatibility catalogs (K-14); continuous assurance (K-8) |
| V7-E1 | `ascout test --browser` |
| V8-E1 | Desktop UI over receipts |
