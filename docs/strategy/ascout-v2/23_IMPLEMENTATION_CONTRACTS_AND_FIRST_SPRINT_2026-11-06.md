# 23 — Implementation Contracts and First Executable Sprint

**As of 2026-11-06; PROPOSED, not ratified.** Companion to [22](22_EGM_EXECUTION_HANDOFF_2026-11-06.md), [09](09_ASSURANCE_EVIDENCE_CONTRACTS.md), [12](12_TASK_REGISTRY.md), and [13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md). The source snapshot is canonical `main@ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430`. Re-audit current `main` before implementing. This document specifies executable acceptance contracts; it is **not** a source patch, approved governance change, or evidence that a real engine has run.

## 1. One authority, one transport, no false PASS

- **Ascout TypeScript kernel** alone computes claim state, completeness, coverage, exit code, and receipt. A runner's exit 0 is only a *transport observation*, never an assurance verdict.
- **Execution broker** wraps the current `src/process.ts`; it is not a competing task scheduler. It owns one absolute executable path, PID/process-tree cancellation, bounded output, environment, exact-run state, and redaction before persistence. For Windows, ordinary `taskkill`/process-tree cleanup is not filesystem/network isolation.
- **Engine adapter** maps a qualified pinned native CLI's exit semantics and output into [Engine Protocol v1](09_ASSURANCE_EVIDENCE_CONTRACTS.md#4-engine-protocol-v1). It emits observations/coverage, never `SUPPORTED`. Adapters for non-native protocol engines must not forward untrusted JSON directly as a claimed first-party envelope.
- **Claim assessor** applies authoritative qualified evidence, requested-capability coverage, and fresh source identities; `REFUTED` requires A07 and independently checked contradiction facts, not a raw finding count or a model-generated summary.
- **UI/MCP/CI** consume the same claim, never separately summarize a partial run as success. Every surface includes `completeness`, omitted capabilities, achieved containment tier, and engine independence.
- Existing `ascout check`, receipt v1.0, and the [durable harness journal on canonical main](https://github.com/TheHalfMoon/Ascout/blob/ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430/docs/ascout-durable-harness.md) remain unchanged until an explicitly scoped, compatibility-tested migration. The durable harness is a caller-owned journal, not automatic retry authorization.

## 2. Exit and output decision table (source fit)

At `main@ecada2b`, `src/cli.ts` dispatches `check`, `review`, `test`, and `security`. `test` calls the plan builder only; `security` calls the NOT_RUN-only report builder and returns its current code 1. The README admits review/test may return 0 without executing engines. Do not change these silently.

| Invocation / scenario | Current baseline to reproduce | Proposed behavior after the proper authority and code change |
|---|---|---|
| `check` on qualified empty scope | Existing receipt rules | Preserve existing empty-scope `NOT_APPLICABLE` and exit 0 **only if** the source/task selection actually proves no requested work is applicable. Not a blanket no-op PASS. |
| `review` on changed eligible code with no engine | No review execution; possible exit 0 | With **FD-1/A07**: required review `NOT_RUN`, incomplete, exit 4. |
| `review` on verified empty eligible scope | Empty-scope report available | Exit 0 for non-applicable scope only if selection and requested scope are explicitly established; outcome must say `NOT_APPLICABLE`, not `reviewed`. |
| `review --delegate` | Not currently a supported CLI flag | When implemented, output a spec and exit 0 **as non-assurance only**; it cannot satisfy independent review until the separate actual ingestion/qualification. |
| `test --plan` | Not currently a supported CLI flag | When implemented after A07, output a non-assurance plan; successful plan rendering exits 0 but **must not** set `SUPPORTED`. |
| `test --profile standard` | Plan only, may exit 0 | After A07 and executable adapter: invoke `check` once against the **same source binding**; propagate its result and completeness, with no simulated successful task. |
| `security` missing every engine | Currently `NOT_RUN`, code 1 | New additive real-engine command: `INCOMPLETE` / code 4; preserve an explicitly documented migration note for existing consumers that saw 1. |
| Scanner reports confirmed findings *and* other work NOT_RUN | No real scanner today | Exit 1 by precedence, **with completeness=false** and missing capabilities listed. A findings exit does not prove entire scan succeeded. |
| Malformed output, wrong request ID, changed checksum | No first real-engine path | Error/integrity outcome, exit 2 or 4 per [09](09_ASSURANCE_EVIDENCE_CONTRACTS.md) semantics; never code 0. |
| Source changes while checking | `check` already detects drift | Exit 3 unless a higher-ranked internal error applies; all observations remain tied to the captured start HEAD and tree digest. |

**Canonical precedence:** 2 error > 3 drift > 1 verified problem > 4 incomplete > 0 complete clean. Do not conflate task `FAIL` with claim `REFUTED`, or missing scanner with negative findings. Validate the exact expected shape against the current kernel before adding new statuses.

## 3. First real scanner decision: bounded Gitleaks vertical slice

**Proposed E5 primary engine: Gitleaks 8.30.1**, *because* the 2026-10-08 [real-scanner experiment](17_SECURITY_EVIDENCE_INTEROPERABILITY.md#2-experiment-observed-2026-10-08-windows-11) already records that exact version with published SHA-256 checksum verification and synthetic secrets. This is a **historical research pin, not a claim that 8.30.1 is current**. Before implementing, choose verified release bytes for each claimed OS and store the full artifact SHA-256/URL/rights in the exact source manifest; a version string alone is not pinning. If that supply chain cannot be established without cost, leave the engine `UNAVAILABLE` and the slice BLOCKED.

| Task | Engineer action | Objective pass/fail evidence |
|---|---|---|
| E5.1 — Pin | Provide signed/checksummed Gitleaks binary for claimed Windows/Linux/macOS platform; inspect vendor and nested notice obligations; compare digest at every execution | Exact bytes match manifest, no PATH-shadow fallback, native `--version` matches admitted profile; any mismatch `VERSION_MISMATCH` |
| E5.2 — Broker | Launch from sanitized working directory/environment via E4 broker; cap output and runtime; never use shell interpolation or default global repository config | Process-tree timeout/kill and env-dump probes; no secret-shaped env; reject unknown args/config and unexpected filesystem writes |
| E5.3 — Synthetic fixture | Generate a fresh **synthetic-only** changed `config.js` secret, an unrelated clean file, and a known uncovered/unsupported file with exact head and worktree digest | Real native binary executes; finding is sanitized, source-bound, correctly located, and a clean control run proves expected coverage |
| E5.4 — Native exit adapter | Interpret only version-qualified Gitleaks exit meanings: findings, clean, no-input, transport failure; reject stderr fatal warnings and malformed output | Findings do not become `ENGINE_ERROR`; missing/failed process does not become `SUPPORTED`; unexpected exit fails closed |
| E5.5 — Evidence intake | Normalize engine observations through `src/assurance/security/*` and single kernel assessment; record required vs observed capabilities | No plaintext secret in receipt, no raw absolute path, no stale cross-HEAD replay, no raw scanner verdict promoted to claim |
| E5.6 — Real qualification | Windows real executable first; Ubuntu and macOS separate exact-head validation before L3 claim | L2 first real claimed platform; L3 only after all named platforms pass actual executable probe; CI artifact URLs/versions recorded |

**First-slice acceptance IDs:** `SEC-01`, `SEC-04`, `SEC-05`, `SEC-06`, `SEC-07`, `ADV-03`, `ADV-04`, `ADV-15`, `ADV-19`, `PROTO-01`…`PROTO-03` where the profile produces its internal envelope. `SEC-02` and CI workflow/Trivy/Syft/OSV capabilities remain explicitly NOT_RUN, never silently counted complete. Sentrdel CLI, release, and Windows toolchain remain separate FD-2-gated work.

## 4. Interface and policy decisions implementers must not improvise

1. **Request:** protocol identifier `ascout-engine/1`, opaque request ID, immutable privacy-safe target identity/full HEAD/tree/base SHA, capabilities, budget, network and source-egress policy. Native input cap 64 KiB. Treat the descriptor as the only authority over argv and engine path.
2. **Response:** exactly one bounded document containing matching request ID, engine identity, execution state, coverage for **each** requested capability, observations and diagnostics. Missing requested capability becomes a named omission; unknown field/state is rejected under its versioned schema.
3. **Engine admissions:** a SHA-256 checksum proves *byte identity*, not publisher authenticity. Provenance/rights, source release, platform, transitive dependencies, binary verification and user trust decision are separate gates. Never accept an executable from changed project config or arbitrary PATH.
4. **Redaction:** secret-bearing engine stdout is an owner-only ephemeral input, capped and cleared on failure; sanitized observations enter the persisted store. Failure to establish restrictive storage or redaction → BLOCKED/ERROR, not raw upload or masked PASS. Artifacts must not write into the checked repository's source tree.
5. **Untrusted inputs:** G30 hardening [#589](https://github.com/TheHalfMoon/Ascout/pull/589) must be qualified in hostile fixtures before any repository-controlled command execution. T0 process bounds are not T1 containment. Without a *hostile-probe-qualified* filesystem plus network deny tier, reject untrusted execution. No MCP agent may pass a human trusted-local override.
6. **Independence:** OCR delegation is `HOST_AGENT`; a same-session self-review cannot assert separate model/human sign-off, and Pstack skills cannot produce security evidence. Deterministic validation is what upgrades claims, not agent confidence.
7. **Rollback:** no in-place rewrite of receipt v1.0; new engine paths behind explicit feature admission until tests and rights/CI pass. On any failed stage, revert only the scoped PR and leave existing `ascout check` working. An uncertain side effect must be reconciled, never auto-retried.
8. **Cost:** no default remote model endpoint, telemetry, hosted device, cloud browser, registry publication, paid API, or background daemon. Network needed to retrieve a release artifact is a separate explicit setup event, never verification-time egress.

## 5. Implementation dependency graph and stopping conditions

```text
E0 baseline/repro -> E1 Git/process guard -> E4 trusted broker -> E5.1..E5.6 real scanner
                                         \-> E3 notices/provenance (parallel)
FD-1/A07 -> E2 truthful exits -----------+-> E6 executable test and review
FD-2 -> Sentrdel CLI/release (optional to first Gitleaks slice)
FD-4 -> E7 platform containment -> E8 untrusted agent execution (otherwise blocked)
FD-5/7/8 + independent review -> canonical plan ratification
FD-6 + actual L3/exact-head CI/independent security review -> E9 release
```

- **P0 candidate:** E0, E1, E3, E4, E5 (scoped trusted-local), and E2/E6 when FD-1 is adopted. Do not conflate this first product slice with a public release.
- **P1 candidate:** E7+E8 agent-native/MCP and optional Gitleaks/Sentrdel scanner expansion; multi-OS actual evidence. Keep any previously ratified UA phase active unless FD-5 explicitly changes it.
- **No-go conditions:** false success on missing work; untrusted process executes as T1 without proof; secret/identity exfiltration; degraded output silently counted; stale/source-mixed evidence; no credible engine provenance; broken `check` v1.0 golden; upstream code rights not evidenced; required reviewer/FD gate absent; any exact-head CI failure or skipped check promoted to pass.
- **Milestone proof:** per scoped PR record target/parent SHA, source-pin checksum, precise commands and OS versions, test counts, failed/NOT_RUN exclusions, source/rights provenance, threat/rollback note, independent review disposition, live CI URLs and post-main verification.
- **Release standard:** no target OS claimed merely because tests were green on mocks; one real engine on one platform is L2, each advertised platform needs its own actual execution. A safe local demo can coexist with non-ready release status.

## 6. Review and acceptance boundary

A fresh-context **Goldfish** must read this file, [22](22_EGM_EXECUTION_HANDOFF_2026-11-06.md), [09](09_ASSURANCE_EVIDENCE_CONTRACTS.md), the cited code, and the [EGM implementation-readiness persona](https://github.com/google/elephant-goldfish-model/blob/main/agents/implementation_readiness.md). It must explicitly list unresolved decisions, exact code-path mismatches and negative tests. If OpenCode cannot spawn isolated subagents or fails to return, record `NOT_RUN`: an author review is not an independent EGM PASS. Required R1 human/authorized external review, FD decisions, canonical adoption, and real OS tests remain separate mandatory gates.
