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
| V0-T07 | Ascout | T02–T06 | V0 qualification: re-run the [01](01_LIVE_REPOSITORY_AUDIT.md) §4 probe table; record results | Probe table matches the expected exits |

## V1 — Sentrdel security slice (P0)

| Task | Repo | Depends | Deliverable | Acceptance |
|---|---|---|---|---|
| V1-T00 | Sentrdel | FD-2 | Stub `main` exits non-zero with `NOT_IMPLEMENTED` (stop false success immediately) | `sentrdel` → exit ≠ 0 |
| V1-T01 | Sentrdel | T00 | CLI dispatch: `sentrdel review --base <ref> --head <ref>\|--worktree --format json` composing `read_diff`, `scan_changed_secrets`, `scan_changed_workflow`, `dependency_delta`, the structural matcher, `reconcile_evidence`, `aggregate_review_coverage`; emits Engine Protocol v1 envelope; `--version --json`; `--state-dir <path>` and `--no-persist` so nothing is written into the target repository | Sentrdel e2e tests on fixtures; never exit 0 without `EXECUTED`; ADV-18 |
| V1-T02 | Sentrdel | T01 | Release workflow (5 targets), checksums, attestations; Windows build on the CI image; evaluate `regorus` 0.12 for the local Windows build | Release dry-run artifacts verified |
| V1-T03 | Ascout | V0 | Engine Protocol v1 types + validator (`src/assurance/engines/protocol/`) | PROTO-01…03 |
| V1-T04 | Ascout | T03 | Companion manifest (`engines.lock.json`: engine id, version, per-platform URL + SHA-256) + resolver (absolute path, hash check) | SEC-05, SEC-06 |
| V1-T05 | Ascout | T04, Sentrdel T02 | `sentrdel-runner.ts`: bounded spawn via `src/process.ts`, scrubbed env, `network: DENY` | SEC-04, SEC-07 |
| V1-T06 | Ascout | T05 | Wire the runner output into the existing T04–T08 normalizers; capture golden fixtures from the real binary | SEC-01…SEC-03 |
| V1-T07 | Ascout | T06 | CI-workflow security normalization (the CI part of UA-P06-T09) | SEC-08 |
| V1-T08 | Ascout | T06, T07 | `ascout security [--base] [--format json\|terminal\|agent]` → ClaimAssessment → unified exit | SEC-01…SEC-08, ADV-03, ADV-04, ADV-15, ADV-19 |
| V1-T09 | Ascout | T08 | `ascout doctor` engine table (available/version/pinned/hash/tier) | DOC-02 |
| V1-T10 | Ascout | T08, T09 | V1 qualification + B-SEC-1 measurement | Exit criteria in [11](11_IMPLEMENTATION_MASTER_PLAN.md) V1 |

## V2 — Review and test execution (P0)

| Task | Repo | Depends | Deliverable | Acceptance |
|---|---|---|---|---|
| V2-T01 | Ascout | V0-T04, V1-T04 | OCR in the companion manifest; resolver for the `ocr` platform binary (no npm postinstall) | REV-01 |
| V2-T02 | Ascout | T01 | `opencode-review-runner.ts` (LLM mode) with endpoint identity + `source_egress` policy gate | REV-02, REV-03, ADV-05 |
| V2-T03 | Ascout | T02 | Wire into K03 normalization; golden fixtures from real `ocr` JSON | REV-04 |
| V2-T04 | Ascout | T01 | Delegation mode: `review --delegate` (spec from `ocr delegate preview/rule`) and `review --ingest <file>` with `HOST_AGENT` independence | REV-05, REV-06 |
| V2-T05 | Ascout | T03, T04 | Coverage accounting equals the OCR file selection; engine-excluded files stay visible; unreviewed ≠ reviewed | REV-07, ADV-06, ADV-17 |
| V2-T06 | Ascout | V0-T02 | `test` executes STANDARD via the check adapter | TST-01, TST-02 |
| V2-T07 | Ascout | T06 | DEEP/RELEASE: Stryker runner when installed, else `NOT_RUN(engine_unavailable)` | TST-03 |
| V2-T08 | Ascout | T06 | `test` receipts include profile, executed/omitted engines | TST-04 |
| V2-T09 | Ascout | T05, T08 | V2 qualification | — |

## V3 — Execution Broker and containment (P1)

| Task | Repo | Depends | Deliverable | Acceptance |
|---|---|---|---|---|
| V3-T01 | Ascout | V1, V2 | `src/execution/broker.ts`; all spawns routed through it (lint rule forbids other `child_process` use) | CON-01 |
| V3-T02 | Ascout | T01 | Env allowlist + credential stripping at launch | CON-02 |
| V3-T03 | Ascout | FD-3 | `native/ascout-exec` crate skeleton + CI build on 4 targets + provenance entries | CON-03 |
| V3-T04 | Ascout | T03 | Linux T1 (port of Golam P01) + hostile probe port | CON-04 |
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
| V4-T04 | Ascout | T03 | Approval binding for effects (P07 semantics) | MCP-04, ADV-11 |
| V4-T05 | Ascout | T03 | Agent Skill (`skills/ascout/SKILL.md`) | MCP-05 |
| V4-T06 | Ascout | V1, V2 | GitHub Action (receipts as artifacts; no publication) | MCP-06 |
| V4-T07 | Ascout | T01–T06 | V4 qualification | — |

## V5 — Distribution, durability, publication (P1)

| Task | Repo | Depends | Deliverable | Acceptance |
|---|---|---|---|---|
| V5-T01 | Ascout | V3-T03 | Release workflow (npm tarball + helpers), attestations | REL-01 |
| V5-T02 | Ascout | T01 | `ascout setup` (manifest-verified downloads, offline `--from`) | REL-02, REL-03 |
| V5-T03 | Ascout | T02 | Clean-machine install tests (3 OSes) | REL-04 |
| V5-T04 | Ascout | — | Run journal + crash recovery | DUR-01…DUR-03 |
| V5-T05 | Ascout | — | `ascout gc` retention | REL-05 |
| V5-T06 | Ascout | V4 | Port Kodac P04 GitHub transport | PUB-01 |
| V5-T07 | Ascout | T06 | Publication under K08 policy (dry-run default, exact fresh head) | PUB-02…PUB-04 |
| V5-T08 | Ascout | T01–T07 | Signing (when certificates exist) | REL-06 |
| V5-T09 | Ascout | all | 0.2.0 pre-release qualification | FD-6 |

## V6–V8 (P2) — epics, to be decomposed after V5

| Epic | Contents |
|---|---|
| V6-E1 | Sentrdel scanner fan-in: Opengrep/Semgrep, Trivy, OSV-Scanner, Syft, Gitleaks (Sentrdel repo) |
| V6-E2 | Ascout coverage mapping for fan-in capabilities, including `UNSUPPORTED_LANGUAGE` |
| V6-E3 | UA-P06-T10…T13 (regression, SARIF export, reproduction refs, remediation/retest) |
| V6-E4 | Composite `ascout assure` + deterministic risk inputs |
| V6-E5 | Separate-agent reviewer (`SEPARATE_AGENT` independence) |
| V6-E6 | Local-model review qualification |
| V6-E7 | Agent-harness/permission audit |
| V7-E1 | `ascout test --browser` |
| V8-E1 | Desktop UI over receipts |
