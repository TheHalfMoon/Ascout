# 10 — Local Zero-Cost Model, Packaging, and Platform Requirements

## 1. Economic objective

The goal is near-zero **operator-funded variable runtime cost per subscriber**. It does not mean zero company cost.

| Cost category | Who pays | V2 design | Estimate (unverified unless marked) |
|---|---|---|---|
| Inference for review | User (BYOK or local model) or the user's existing coding-agent subscription (delegation mode) | No Ascout-operated endpoint; no hidden fallback | Operator: 0 |
| Execution of tests/scanners | User's machine or user's CI | Local only | Operator: 0 |
| Vulnerability data | Public sources (OSV, Trivy DB), downloaded by the user's machine | Explicit network effect | Operator: 0; attribution obligations apply |
| Evidence storage | User's disk | Per-user state dir | Operator: 0 |
| Telemetry | None | No telemetry in V2 | Operator: 0 |
| Distribution | GitHub Releases + npm (public) | Free for public repositories (REPORTED by GitHub/npm public terms; re-verify before release) | ≈ 0 |
| CI | GitHub-hosted runners | Public repositories use standard runners at no charge (REPORTED; re-verify); private repositories consume minutes | ≈ 0 for public Ascout/Sentrdel |
| macOS notarization | Company | Apple Developer Program | ≈ USD 99/year (public price; re-verify) |
| Windows code signing | Company | Certificate or a cloud signing service | ≈ USD 120–500/year depending on provider (unverified) |
| Domain/docs site | Company | GitHub Pages | ≈ domain fee only |
| Engineering and support | Company | Founder + agents | Dominant real cost; see effort estimates in [11](11_IMPLEMENTATION_MASTER_PLAN.md) |

**Subscription value in a local-first product** has to come from software capability (engine integrations, qualification, updates, curated rules, the UI) and not from hosted compute. Entitlement checks must never gate the truth of a result (existing local-zero-cost gate "entitlement truth independence").

**Licensing risks**

| Risk | Treatment |
|---|---|
| Semgrep registry rules license | Ascout never bundles or redistributes them; default to Opengrep with open rules, or let the user choose |
| CodeQL CLI terms | Not a default engine |
| OSV data (mostly CC-BY-4.0) | Attribution in receipts' engine identity section and in docs |
| Trivy DB sources | Treated as user-downloaded data; no redistribution by Ascout |
| Owner repositories without LICENSE | FD-3 per file |
| Vendored ARTEMIS (Apache-2.0) | Already noticed in `THIRD_PARTY_NOTICES.md` |

## 2. Packaging and distribution plan (V5, except where noted)

| Artifact | Channel | Integrity |
|---|---|---|
| `@thehalfmoon/ascout` (JS) | npm, after scope ownership is proven (existing package-identity decision in `docs/npm-package-identity.md`) | npm provenance attestation |
| Same, as tarball | GitHub Release asset | SHA-256 + GitHub artifact attestation |
| `sentrdel` binary (V1) | Sentrdel GitHub Releases: linux-x64, linux-arm64, darwin-arm64, darwin-x64, windows-x64 | SHA-256 + attestation + cosign; Windows/macOS signing when certificates exist |
| `ascout-exec` helper (V3) | Ascout GitHub Releases, same matrix | Same |
| `ocr` | Upstream GitHub Releases; Ascout ships only a manifest of pinned versions + SHA-256 | Hash verification by `ascout setup` |
| Agent Skill + GitHub Action (V4) | In the Ascout repository | Tag-pinned |

`ascout setup` downloads only what the user asks for, only from manifest URLs, verifies hashes before writing into the state dir, and never runs postinstall scripts. Offline installation: `ascout setup --from <dir>` with the same verification.

**Updates:** no auto-update. `ascout doctor` reports when a newer pinned manifest is available, but only if the user enables the check (network effect).

## 3. Platform support matrix (target)

| Capability | Linux x64 | Linux arm64 | macOS arm64 | Windows x64 |
|---|---|---|---|---|
| `check`, `test`, `review` (T0) | ✔ (CI today for check) | ✔ (new CI cell) | ✔ (CI today) | ✔ (CI today) |
| `security` (Sentrdel) | V1 | V1 | V1 | V1 (prebuilt only; G19) |
| T1 containment | V3 (P01) | V3 (new work) | Research (G17) | V3 (new work, G18) |
| T2 containment | optional gVisor | optional gVisor | — | WSL2 path |
| Browser verification | ✔ | ✔ | ✔ | ✔ |

## 4. Performance and resource budgets

All targets are **PROPOSED** and unmeasured unless marked OBSERVED. Each must be measured by the V-phase benchmark that introduces the capability ([13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md)). A missed budget is reported, not hidden.

| Budget | Target (PROPOSED) | Current observation |
|---|---|---|
| CLI startup to first output (`ascout --help`, warm) | ≤ 300 ms | `ascout test` plan render ≈ 291–323 ms warm, 2,260 ms cold (OBSERVED, one Windows laptop) |
| `ascout check` on a small repository | ≤ 10 s excluding the repository's own test time | 6.3 s on the probe repository (OBSERVED, includes discovery) |
| `ascout security` on a typical PR (≤ 50 changed files, ≤ 5k changed lines), native Sentrdel only | ≤ 15 s p50, ≤ 60 s p95 | unmeasured |
| `ascout review` (OCR) | Bounded by endpoint latency; Ascout overhead ≤ 2 s | unmeasured |
| Peak RSS, Ascout core | ≤ 300 MB | unmeasured |
| Peak RSS, Sentrdel on a typical PR | ≤ 500 MB | unmeasured |
| Evidence per run | ≤ 1 MB typical; hard cap via existing `max_artifact_bytes` (50 MiB STANDARD, 500 MiB RELEASE) | two `check` runs = 47 KB (OBSERVED) |
| Evidence retention | Default 30 days or 200 runs per repository, whichever is smaller; `ascout gc` | — |
| Optional local model for review | ≥ 16 GB RAM machines; 7–9B quantized class; quality must be qualified before it counts (V6) | unmeasured; no local runtime was available in this session |
| Dependency installation | Never by Ascout | — |
| Background watch processes | None in V2 | — |
| Browser verification | One Chromium instance per run; ≤ 1.5 GB RSS | unmeasured |
