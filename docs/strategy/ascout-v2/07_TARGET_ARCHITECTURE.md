# 07 — Target Architecture (Option B+)

## 1. Component view

```text
                Human / CI / Coding agent
                   │            │
         ascout CLI │            │ ascout mcp (stdio, V4)
                   ▼            ▼
┌──────────────────────────────────────────────────────────────┐
│ ASCOUT CORE (TypeScript, Node ≥ 22, single process)          │
│                                                              │
│  Intent & Policy ──► Deterministic Planner ──► Plan          │
│        (K01)              (K01)          (selected/omitted)  │
│                              │                               │
│                              ▼                               │
│  Engine Registry + Qualification (K01) ── Engine Protocol v1 │
│                              │                               │
│                              ▼                               │
│  EXECUTION BROKER (new, V3) — sole owner of child processes  │
│   • tier selection + declaration  • env/credential scrubbing │
│   • time/output/resource bounds   • network effect gate      │
│                              │                               │
│  Normalizers (K03 review, K04 security, K05 test, K02 check) │
│                              ▼                               │
│  Evidence Store (per-user state dir, content-addressed, V3)  │
│                              ▼                               │
│  Claim Assessment (K01) ──► Receipt + unified exit code      │
│                              ▼                               │
│  Publication (K08 + P04, explicit effect, dry-run default)   │
└──────────────────────────────┬───────────────────────────────┘
                               │ spawns (through ascout-exec when tier > T0)
          ┌────────────────────┼────────────────────┬──────────────────┐
          ▼                    ▼                    ▼                  ▼
   sentrdel (Rust)        ocr (Go)          user test runners     Playwright
   companion binary       adapter            (npm/pytest/…)       (in-repo dep)
          │ fans in (optional, user-installed)
          ▼
   opengrep/semgrep · trivy · osv-scanner · syft · gitleaks  (SARIF/JSON)
```

`ascout-exec` is a small native helper (Rust, built in Ascout CI, shipped prebuilt per platform) that applies containment before `exec`. Containment sources: Golam P01 (Linux), Winds P02 (Windows Job Objects), plus new work for AppContainer and macOS. Core claims at tier T0 do not need the helper, which keeps Constitution V and A06 rule 6 intact.

## 2. Command surface (V2 end state)

| Command | Executes | Default effects | Exit taxonomy |
|---|---|---|---|
| `ascout check` | Existing behavior, unchanged | E1 local process | 0/1/2/3/4 (unchanged) |
| `ascout test [--profile quick\|standard\|deep\|release] [--plan]` | `check` path + profile engines (Stryker for deep/release when installed; browser journeys in V7) | E1–E3 | unified; `--plan` → 0 with `kind: plan` |
| `ascout review [--engine ocr] [--delegate] [--endpoint local\|configured]` | OCR review, or the delegation spec | E0; `source_egress` policy required when the endpoint is remote | unified |
| `ascout security [--scanners …]` | Sentrdel (+ fan-in) | E0/E1; network only with explicit approval | unified |
| `ascout assure --claim <id>` (V6) | Composite plan across review/test/security | union | unified |
| `ascout doctor` | Engine availability, versions, tiers, qualification table | none | 0 healthy / 2 broken setup |
| `ascout setup` (V5) | Checksum-verified download of pinned companion binaries into the user's state dir | network effect, explicit | 0/2 |
| `ascout mcp` (V4) | stdio MCP server | inherits per tool | n/a |
| `ascout verify-receipt <path>` (V3) | Re-validates digests, schema, and source binding | none | 0 valid / 1 invalid |

## 3. Capability architecture (status per capability)

Status legend: **HAVE** = executing today; **CONTRACT** = contracts exist, no producer; **V1…V8** = phase that delivers; **DEFER** = not in V2 scope.

### A. Review
| Capability | Status | Mechanism |
|---|---|---|
| Deterministic code checks (typecheck, lint) | HAVE | `check` tools |
| AI-assisted review | CONTRACT → **V2** | OCR (BYOK/local endpoint) |
| Review without an Ascout-paid model | **V2** | OCR delegation mode: Ascout emits a delegation spec; the host agent reviews; the result is recorded with `independence: HOST_AGENT` |
| Independent review | **V6** | Different agent CLI or model than the author, recorded as `independence: SEPARATE_AGENT`; adapters from F03 |
| Defect prioritization, dedup, false-positive control | CONTRACT → V2 | K03 dedup/correlation + benchmark corpus |
| Cross-file reasoning | V2 (by OCR) | OCR bundling + tool use; Ascout records coverage, not reasoning quality |
| Patch/regression comparison | V2 | base/head binding already in K01 |
| Model/provider qualification | V6 | MSTR method (F05); qualification records per endpoint+model |
| Verified GitHub comments | **V5** | K08 policy + P04 transport; publish only for the exact fresh head |

### B. Test
| Capability | Status | Mechanism |
|---|---|---|
| Unit/integration via the repository's runners | HAVE | `check` |
| `ascout test` execution | **V2** | profile → check adapter |
| Mutation testing | CONTRACT → V2 (DEEP) | Stryker if installed; otherwise `NOT_RUN(engine_unavailable)` |
| Property testing | CONTRACT | Observed through the user's runner; no Ascout generator in V2 |
| Browser E2E | HAVE (library) → **V7** CLI | `src/browser/*` |
| API tests | DEFER | Through the user's runner only |
| Desktop/mobile | DEFER (ARTEMIS frozen) | — |
| Fuzzing | DEFER | Requires V3 tiers |
| Test-impact analysis | HAVE (conservative selection in `check`) | — |
| Flaky diagnosis | HAVE (`FLAKY`, rerun adapters) | — |
| Coverage gaps | HAVE (`NOT_EXERCISED`/`UNRESOLVED`) | — |
| Reproduction/retest | CONTRACT → V6 | UA-P06-T12/T13 semantics generalized |

### C. Security
| Capability | Status | Mechanism |
|---|---|---|
| SAST (JS/TS) | **V1** | Sentrdel native |
| SAST (other languages) | **V6** | Opengrep/Semgrep via Sentrdel SARIF; otherwise `UNSUPPORTED_LANGUAGE` coverage |
| Secrets (changed) | **V1** | Sentrdel native, redacted |
| Secrets (history) | V6 | Gitleaks via Sentrdel |
| Dependency vulnerabilities | **V1** (delta) / V6 (full) | Sentrdel OSV / OSV-Scanner |
| SBOM | V6 | Syft → CycloneDX |
| IaC / containers | V6 | Trivy via Sentrdel |
| CI workflow security | **V1** | Sentrdel `github_actions.rs` (UA-P06-T09 scope) |
| AuthN/AuthZ, tenant isolation, business logic (bounded JS/TS) | V6 | Sentrdel R2/R3 packs |
| SARIF export | V6 | P06 |
| Security regression / retest | V6 | T10/T13 |
| Dynamic verification | DEFER | Needs V3 tiers plus written authorization semantics |

### D. AI and agent assurance
| Capability | Status | Mechanism |
|---|---|---|
| Agent output verification | V1–V4 | The whole product: an agent calls Ascout on its change |
| Tool-call evidence | DEFER → V6 | Sentrdel MCP guard (stdio) as optional companion |
| Agent permission audit | V6 | HarnessMind concepts (F04) |
| Multi-agent disagreement | CONTRACT | `ContradictionRecord`; V6 adds a second reviewer |
| Prompt-injection boundary | HAVE (review) | K03 injection boundary; G21 rule |
| Model uncertainty/abstention | CONTRACT | `INCONCLUSIVE` outcome; model output is never proof |
| Evidence-backed task completion | **V4** | MCP `ascout_assure` returns a claim + receipt; the skill teaches "exit 4 ≠ done" |

### E. Developer and agent integration
CLI (HAVE), MCP stdio server (V4), Agent Skill (V4), GitHub Action (V4), GitHub publication (V5), local JSON schemas (HAVE, extended), IDE integration via MCP (V4; no bespoke IDE plugin), desktop UI (V8).

### F. Assurance intelligence (minimum sufficient checks)
The deterministic planner (K01) already selects checks from intent, profile, availability, and effects. V6 adds deterministic inputs: changed-path classification, dependency-manifest changes, security-sensitive path rules, previous-evidence freshness, and time budget. **No model chooses checks.** An optional model may *suggest* additional checks; a suggestion only adds checks after policy validation, and can never remove a required one.

### G. Evidence and proof
See [09](09_ASSURANCE_EVIDENCE_CONTRACTS.md).

## 4. Agent, MCP, and plugin strategy

1. **MCP server (V4)** — `ascout mcp`, stdio only, no network listener. Tools: `ascout_plan`, `ascout_check`, `ascout_test`, `ascout_review`, `ascout_security`, `ascout_assure`, `ascout_receipt_get`, `ascout_doctor`. Every tool returns `{outcome, exit_code, receipt_ref, omissions[], next_required_actions[]}`. Tools that cause effects (execute repository code, network egress, publication) need per-call approval bound to the exact head and diff digest (P07 semantics). Read-only tools need none.
2. **Agent Skill (V4)** — teaches agents to (a) call Ascout before declaring done, (b) treat exit 4 / `NOT_RUN` as not verified, (c) never edit `.ascout/` or receipts, and (d) report omissions verbatim.
3. **Delegated review (V2)** — Ascout hands the host agent OCR's deterministic delegation spec. The agent's review is recorded as `HOST_AGENT` independence, which satisfies "AI-assisted review" but never "independent review".
4. **Plugins** — deferred (see [06](06_ARCHITECTURE_OPTIONS.md) §4). Engine Protocol v1 is documented so that internal engines are all built against it from V1.
5. **ACP/A2A** — not adopted; no use case requires them.

## 5. Repository layout changes (proposed)

```text
src/assurance/engines/security/sentrdel-runner.ts   (V1)
src/assurance/engines/review/opencode-review-runner.ts (V2)
src/assurance/engines/protocol/                      (V1: Engine Protocol v1 types + validator)
src/execution/broker.ts                              (V3; wraps src/process.ts)
src/evidence/store.ts                                (V3)
src/mcp/                                             (V4)
native/ascout-exec/                                  (V3; Rust helper, built only in CI)
docs/strategy/ascout-v2/                             (this package)
```

No existing file is moved in V0–V2.
