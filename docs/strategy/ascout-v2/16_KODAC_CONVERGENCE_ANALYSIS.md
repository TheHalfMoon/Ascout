# 16 — Kodac Convergence Analysis (Revision 2)

**Status:** PROPOSED. This analysis supersedes the Kodac dispositions in [00](00_EXECUTIVE_DECISION.md) §1.4, [04](04_CAPABILITY_REUSE_MATRIX.md) P04/F01/S01, and DECISION_LOG D-10. Those changes take effect only on founder ratification.

**Source:** `TheHalfMoon/Kodac` @ `406b335277f2df1e3dedf24cdb45847dff919d44` (unchanged since the first audit; re-verified 2026-10-08).

## 1. Why revision 2 was needed

Revision 1 ported one Kodac component, the GitHub review transport. The founder review correctly found this too narrow for a product meant to combine Ascout, Sentrdel, and Kodac. Revision 2 compares Kodac against Ascout module by module at code level.

## 2. Evidence base (OBSERVED in this session)

| Evidence | Result |
|---|---|
| Kodac runtime test suite, Windows 11, Node v24.19.0 (`node --experimental-strip-types --test test/*.test.ts`) | **2,725 tests: 2,622 pass, 0 fail, 103 skipped**, 54.9 s |
| Kodac CI (`k2-runtime.yml`) | Matrix ubuntu/windows/macos-latest; last run on `main` success |
| CLI | `kodac ask`, `kodac solve`, `kodac apply-patch` run (`--help` observed) |
| Test files referencing each module (grep of `test/*.ts`) | `execution/gateway` 58 · `evidence/receipt` 56 · `agent/loop` 39 · `trust/approval` 23 · `verification/engine` 21 · `evidence/store` 19 · `reviewer-intelligence/qualification` 18 · `verification/done-gate` 18 · `evidence/ledger` 13 · `github-review/o4b` 8 · `trust/confinement-linux-landlock` 5 · `continuous-assurance/p9` 4 · `github-review/o4g` 2 · `workflow/o2` 1 |
| Embedded third-party rights (`packages/kodac-runtime/THIRD_PARTY_NOTICES.md`) | Patch engine adapted from OpenCode (MIT); Landlock launcher adapted from DeepSeek Harness (BSD-3-Clause); tool-result pruning, repeat-call signal, and guarded tool-pipeline contract adapted from HKUDS DeepCode (MIT); spec-kit contract adaptation |

The 103 skipped tests were not individually inspected. Their platform dependence is INFERRED from Linux-only modules (Landlock, gVisor); it is not verified.

## 3. Capability-by-capability comparison

Decision vocabulary: **PORT** (copy into Ascout with provenance and adapt to Node 22 / `tsc`), **INTEGRATE** (Kodac and Ascout interoperate through a contract; code stays in Kodac), **RETAIN** (stays in Kodac; not needed by a verifier), **REFERENCE**, **REJECT**.

| # | Kodac capability (path, LOC) | Maturity | Ascout today | Decision | Rationale |
|---|---|---|---|---|---|
| K-1 | **Execution gateway**: policy → one-shot approval with durably committed evidence → bounded no-shell execution → persisted receipt; persistence failure raises `ExecutionUnprovenError` (`src/execution/gateway.ts`, 886) | Implemented; 58 test files | `src/process.ts` bounds processes but has no policy/approval/receipt layer | **PORT → V1** | It is the Execution Broker that revision 1 planned to write from scratch in V3. Its "unpersisted evidence = unproven" rule is exactly Ascout's no-green-by-omission rule at the process boundary |
| K-2 | **Private evidence store** (`src/evidence/store.ts`, 399): `0o700` directories, `O_NOFOLLOW`, `O_EXCL` exclusive create, append-only files | Implemented; 19 | `.ascout/` writes without these protections | **PORT → V1** | Closes part of G07 early |
| K-3 | **Receipt + JSONL receipt ledger** (`src/evidence/receipt.ts` 189, `ledger.ts` 96) | Implemented; 56 / 13 | Receipt v1.0 for `check` only | **PORT → V1** as the per-engine-run record under the existing claim model; `check` receipt v1.0 unchanged | One durable record per engine execution |
| K-4 | **One-shot approval runtime** (`src/trust/approval.ts`, 187): outcomes `allowed-once / rejected / cancelled / unavailable`, bound to request identity | Implemented; 23 | Effect authority (K01) defines ceilings, but no human approval channel | **PORT → V4** (MCP effects, publication) | Replaces the plan to adapt Deskal approval semantics (P07). Deskal remains a design reference |
| K-5 | **Sanitized verification environment** (`src/verification/engine.ts`, `sanitizedVerificationEnv`) | Implemented; 21 | Redact-on-persist only | **PORT → V1** | Strip-on-launch allowlist |
| K-6 | **Linux Landlock launcher** (`native/landlock-run.c`, 419; `src/trust/confinement-linux-landlock.ts`) with probe output `abi=<N> … enforcement=<full\|partial>` | Implemented; 5. **Filesystem only** (no network, no seccomp) | None | **PORT → V3** as tier `T1-FS`, carrying the BSD-3-Clause notice | Licensed, available now. Golam's fs+net+seccomp helper (unlicensed, FD-3) remains the path to full `T1` |
| K-7 | **Reviewer qualification** (`src/reviewer-intelligence/qualification*.ts`, 513): gold benchmark; thresholds for accuracy, accepted precision/recall, rejected recall, decision coverage; outcomes `QUALIFIED / NOT_QUALIFIED / INSUFFICIENT_EVIDENCE`; abstention and provider-failure counted | Implemented; 18 | `EngineQualification` (K01) records identity/applicability but **computes no quality metrics** | **PORT → V2** (OCR + endpoint + model) and V6 | Ascout has no way to measure whether a review engine is good enough; Kodac does |
| K-8 | **Continuous assurance** (`src/continuous-assurance/p9-r1…r3`, 1,065): dependency-driven freshness invalidation (`CURRENT/STALE/UNKNOWN`), impacted-subject resolution, targeted requalification | Implemented; 4 | `workflow/freshness-engine.ts` decides currency per evidence item but not *what to re-run* | **PORT → V6** (assurance intelligence, [07](07_TARGET_ARCHITECTURE.md) §3F) | Deterministic "minimum sufficient re-verification" input |
| K-9 | **Durable workflow semantics** (`src/workflow/o2-durable-workflow-evidence-kernel.ts`, 636): retry classes (`SAFE_REPLAY`, `IDEMPOTENT_REREAD`, `SIDE_EFFECT_RETRY` blocked), leases with epochs, `COMMITTED_NO_UNDO`, definition-drift `MIGRATION_REQUIRED` | **Model only**: imported by its own test and nothing else | `stage-attempt-model.ts`, `idempotency-reconciliation.ts` (also model only) | **PORT semantics → V5 run journal**, merged with Ascout's models; neither repository has persistence today | One durable journal, not two models |
| K-10 | **GitHub context read + review publication** (`src/github-review/o4b`, `o4f`, `o4g`, `o4i`) | Implemented; origin-pinned to `https://api.github.com` | Publication models only (K08) | **PORT → V5** (unchanged from revision 1) | — |
| K-11 | **Model-backed reviewer execution** (`o4c`, `o4d`, `o4e`) and reviewer runtime (`reviewer-intelligence/executor.ts`, `runtime.ts`) | Implemented | OCR is the planned review engine | **INTEGRATE → V6** as a second review engine: `kodac ask` (read-only) behind Engine Protocol v1, giving a different agent/model than the author, recorded as `SEPARATE_AGENT` independence when it is not the authoring agent | A second engine makes independent review possible without new code in Ascout |
| K-12 | **Done Gate** (`src/verification/done-gate.ts`; `p7-done-gate-proof-binding.ts`) and **K5 proof judge/adjudication** (`src/proof-review/*`) | Implemented; 18 | `ClaimAssessment` (K01) | **INTEGRATE, not port**: Kodac's Done Gate consumes an Ascout receipt as the evidence for its `verification.commands` check and must not reach `PROVEN_READY` unless the Ascout claim is `SUPPORTED` for the same head | Porting would create a second completion authority inside Ascout. The integration makes Kodac's "done" depend on Ascout's verdict |
| K-13 | **Agent loop, guarded tool pipeline, repeat-call signal, tool-result pruning, session history, patch engine, remediation bindings, evidence router** (`src/agent`, `src/session`, `src/edit`, `src/remediation`, `src/evidence-router`) | Implemented; several adapted from third-party MIT sources | Not applicable (Ascout does not author code) | **RETAIN in Kodac** | Authoring capability; importing it would make Ascout a coding agent and pull in third-party notices without benefit |
| K-14 | **Compatibility catalogs**: MCP catalog evidence, ACP method catalog, Agent Skill package and governance-claim evidence (`src/compatibility/*`, schemas `k4-r2…r5`) | Implemented | None | **PORT → V6** (agent-harness/permission audit) | Public, Apache-2.0 alternative to the private HarnessMind concepts (F04) |
| K-15 | **Provenance admission lifecycle and validator** (`provenance/*.yaml`, `schema/provenance-*.schema.json`, `tools/validate_provenance.py`, 335): `RIGHTS_CONFIRMED → SOURCE_PINNED → AUDITED → BENCHMARKED → QUALIFIED → ADMITTED → CANONICALLY_ADOPTED` | Implemented; runs in Kodac `governance.yml` | Markdown provenance register only | **PORT → V0** (re-implemented in Node so Ascout CI gains no Python dependency) | Makes FD-3 attestations machine-checkable per file |
| K-16 | **Authenticated GitHub event ingress** (`src/event-ingress/o1-…`, 934) | Implemented | None | **RETAIN** | Requires a hosted webhook receiver, which is an operator-funded runtime |
| K-17 | **gVisor/Docker sandbox lifecycle and observers** (`src/execution/gateway-gvisor-*`, `src/trust/sandbox-*`) | Implemented, Linux only | None | **REFERENCE → optional `T2`** | Requires a container runtime the user installs |
| K-18 | **Model provider adapters** (`src/model/openai*.ts`, `provider.ts`) | Implemented | None | **RETAIN** | OCR and Kodac resolve endpoints themselves; Ascout needs no provider layer |

## 4. Resulting integration model

```text
            Kodac (authoring agent, separate repository)
   plan → edit (patch engine) → Done Gate ──requires──► Ascout receipt: SUPPORTED @ same head
                                     ▲
                                     │ Engine Protocol v1 (V6): `kodac ask` as a read-only reviewer
Ascout (verifier)                    │
   kernel (K01) ◄── observations ── engines: Sentrdel · OCR · scanners · runners · Kodac-reviewer
   Execution Broker = ported Kodac gateway (K-1, K-2, K-3, K-5) + tiers (K-6, Golam)
   approvals (K-4) · reviewer qualification (K-7) · continuous assurance (K-8)
   run journal (K-9 semantics) · GitHub transport (K-10) · provenance lifecycle (K-15)
```

Of 18 compared capabilities, Ascout **ports 12** (K-1…K-10, K-14, K-15), **integrates 2** (K-11, K-12), **retains 3 in Kodac** (K-13, K-16, K-18), and **references 1** (K-17). Revision 1 ported 1. There is still one claim authority: Kodac's Done Gate becomes a consumer of Ascout's verdict.

## 5. Port requirements (all ported modules)

1. Per-file provenance through the ported K-15 lifecycle: source path, blob SHA, Kodac commit, license, and a check of `THIRD_PARTY_NOTICES.md` for nested upstream origin. None of K-1…K-5, K-7…K-10, K-14, K-15 is listed in the notices; each port PR re-verifies this per file.
2. Port the Kodac tests that cover each module with it. A port is accepted only when the ported tests pass under Ascout's `tsc` + Vitest on 3 OSes.
3. Kodac targets Node ≥ 24 with `--experimental-strip-types` and `.ts` import specifiers. Ascout targets Node ≥ 22 with `tsc`. Ports must compile under Ascout's `tsconfig.json` without enabling strip-types.
4. The gateway must neutralize repository-controlled Git and tool configuration that can launch commands before it runs any Git command on an untrusted workspace. Revision 1 did not record this requirement; see [05](05_GAP_AND_RISK_REGISTER.md) G30.
5. No ported module may emit a claim-level state. Gateway receipts are evidence inputs to the kernel.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Kodac's dense one-line style is hard to review | Port with reformatting through `tsc`/lint; behavior pinned by the ported tests before refactoring |
| Two copies diverge (Kodac keeps evolving) | Ported files record the Kodac source commit; a quarterly diff review is part of the maintenance budget; no automatic sync |
| Ported modules widen Ascout's scope | Each port is tied to a V-phase acceptance test that needs it; no speculative ports |
| K-6 is filesystem-only | Receipts declare `T1-FS`; the untrusted-code policy requires network denial, so `T1-FS` alone does not satisfy it ([08](08_SECURITY_AND_TRUST_MODEL.md)) |
