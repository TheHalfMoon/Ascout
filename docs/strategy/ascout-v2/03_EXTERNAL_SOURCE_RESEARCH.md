# 03 — External Source Research

**Method (OBSERVED, 2026-10-08):** Each candidate's canonical repository was resolved through the GitHub API (`repos/{owner}/{repo}`, following redirects). License SPDX, last push date, archive state, and the latest release tag were recorded. Two tools were installed and executed locally: OCR v1.12.12 through npm into an isolated directory, and the already-installed Diffcipline/Jev/Graft CLIs. Nothing else was executed. Licenses marked *GitHub: NOASSERTION* must have their LICENSE file reviewed before admission.

Disposition vocabulary (from the founder brief): **ADAPTER** (Ascout/Sentrdel launches the upstream binary the user installed), **COMPANION** (separately distributed binary Ascout depends on optionally), **SELECTIVE_PORT**, **VENDORED_DONOR**, **REFERENCE_ONLY**, **REJECT**.

## 1. Review

| Candidate | Canonical repo | License | Latest | Disposition | Evidence and reasoning |
|---|---|---|---|---|---|
| Alibaba Open Code Review | `alibaba/open-code-review` (Go) | Apache-2.0 | v1.12.12 (`182898cf…`) | **ADAPTER (primary review engine)** | Installed and run (OBSERVED). Binary is `ocr`. `ocr delegate preview` works offline with no LLM. `ocr review --format json` fails closed (exit 1) without an endpoint and accepts `OCR_LLM_URL`/`OCR_LLM_TOKEN`/`OCR_LLM_MODEL`, so it works with any user-funded or local OpenAI-compatible endpoint. Its npm package uses a postinstall that selects a platform binary through `optionalDependencies` (`@alibaba-group/ocr-{darwin,linux,win32}-{x64,arm64}`); Ascout must resolve the platform binary directly and must not depend on postinstall. |
| Semgrep CE | `semgrep/semgrep` | LGPL-2.1 (engine); registry rules under the Semgrep Rules License | v1.180.0 | **ADAPTER (revision 2: Ascout broker + ingestors, [17](17_SECURITY_EVIDENCE_INTEROPERABILITY.md)) (optional, user-installed)** | Strong multi-language SAST. LGPL is acceptable for an unmodified, separately installed binary. Registry rules must not be bundled or redistributed by Ascout. |
| Opengrep | `opengrep/opengrep` | LGPL-2.1 | v1.30.2 | **ADAPTER (revision 2: Ascout broker + ingestors, [17](17_SECURITY_EVIDENCE_INTEROPERABILITY.md)) (preferred default over Semgrep when the user has neither)** | Community fork with an open rule ecosystem; same engine interface |
| CodeQL | `github/codeql` (queries, MIT); `github/codeql-cli-binaries` (GitHub: NOASSERTION; GitHub CodeQL terms) | Mixed | CLI v2.27.2 | **REJECT as default; ADAPTER only when the user's license permits** | CLI terms restrict use on non-open-source code without a GitHub license. Ascout cannot recommend it as a zero-cost default |
| Kodac review pipeline | internal | Apache-2.0 | — | **SELECTIVE_PORT** (publication only) | See [04](04_CAPABILITY_REUSE_MATRIX.md) |
| tree-sitter / ast-grep | `tree-sitter/tree-sitter`, `ast-grep/ast-grep` | MIT | v0.27.0 / 0.45.3 | **Already used by Sentrdel** (ast-grep-core 0.45.2, tree-sitter 0.26.13) | No new dependency in Ascout |

## 2. Security

| Candidate | Canonical repo | License | Latest | Disposition | Reasoning |
|---|---|---|---|---|---|
| Sentrdel | internal | Apache-2.0 | no release | **COMPANION (primary security engine)** | [01](01_LIVE_REPOSITORY_AUDIT.md) §5A |
| Trivy | `aquasecurity/trivy` | Apache-2.0 | v0.75.0 | **ADAPTER (revision 2: Ascout broker + ingestors, [17](17_SECURITY_EVIDENCE_INTEROPERABILITY.md)) (optional)** for IaC misconfiguration, container images, and SBOM | One binary covers IaC, images, and licenses. Vulnerability DB is downloaded from GHCR (network effect, data terms vary by source) and must be an explicit, user-approved effect |
| OSV-Scanner | `google/osv-scanner` | Apache-2.0 | v2.6.0 | **ADAPTER (revision 2: Ascout broker + ingestors, [17](17_SECURITY_EVIDENCE_INTEROPERABILITY.md)) (optional)** for full-tree SCA | Sentrdel already has OSV lookup for deltas; OSV-Scanner adds whole-lockfile coverage and offline DB mode. OSV data is mostly CC-BY-4.0, so attribution applies |
| Syft | `anchore/syft` | Apache-2.0 | v1.54.1 | **ADAPTER (optional) for SBOM**, CycloneDX output | Closes the SBOM gap recorded by UA-P06-T08 |
| Grype | `anchore/grype` | Apache-2.0 | v0.120.1 | **REJECT (overlap)** | Duplicates OSV-Scanner/Trivy SCA. One SCA path is enough |
| Gitleaks | `gitleaks/gitleaks` | MIT | v8.30.1 | **ADAPTER (revision 2: Ascout broker + ingestors, [17](17_SECURITY_EVIDENCE_INTEROPERABILITY.md)) (optional)** for full-history secret scans | Sentrdel's native scanner covers changed content; Gitleaks covers history |
| Checkov | `bridgecrewio/checkov` | Apache-2.0 | 3.3.26 | **REJECT for V2 (overlap with Trivy IaC; heavy Python runtime)** | Revisit only if benchmark misses justify it |
| Cloudflare Security Audit Skill | `cloudflare/security-audit-skill` | MIT | `c1c8a8c1…` (unchanged since the prior pin) | **REFERENCE_ONLY (method)** | An agent prompt method, not an engine. Its value is a structured audit checklist for V6 agent-assisted deep audit. UA-P07 (a whole phase) is not justified |
| ARES | `GoCodeAlone/ARES` | — | — | **BLOCKED (inaccessible)** | API returns 404 for the repository and the owner (OBSERVED). Issue #419 stays open; no plan depends on it |
| OpenSSF Scorecard | `ossf/scorecard` | Apache-2.0 | v5.5.0 | **REFERENCE_ONLY** | Repository-posture heuristics; Sentrdel's GitHub Actions review covers the actionable CI subset locally |

**Single security ingestion path.** Ascout never parses Trivy/OSV/Syft/Gitleaks/Semgrep output itself. Sentrdel already owns a bounded SARIF 2.1.0 adapter (`crates/sentrdel-engine/src/adapter.rs`, `adapt_sarif`) and the sole external process runner (`crates/sentrdel-engine/src/process_tree.rs`, Job Object / process group). Routing all scanners through Sentrdel avoids a second normalization authority. *(Revision 2: superseded by [17](17_SECURITY_EVIDENCE_INTEROPERABILITY.md); real-scanner experiments showed this design rejects 20 of 22 real SARIF results and has no SBOM path.)*

## 3. Testing

| Candidate | Canonical repo | License | Latest | Disposition | Reasoning |
|---|---|---|---|---|---|
| Playwright | `microsoft/playwright` | Apache-2.0 | v1.64.0 (Ascout pins 1.63.0) | **Existing dependency; keep exact pin** | Re-pin is a routine task. **Missing from THIRD_PARTY_NOTICES** (OBSERVED) |
| TesterArmy e2e | `tester-army/e2e` | Apache-2.0 + `NOTICE` | `9a32bd4`, SDK 0.18.0, web 0.13.0 | **OPTIONAL ADAPTER / SELECTIVE_PORT (PROPOSED)** | Deterministic web tests before model mode; native test code/replay cache is unsandboxed, telemetry on by default; compare with current Playwright before adoption ([21](21_TESTER_ARMY_E2E_AND_PSTACK_ADOPTION.md)) |
| Pstack | `cursor/plugins/pstack`; `reshif/pstack` | MIT | portable `4a07b05` | **OPTIONAL WORKFLOW/SKILL ADAPT (PROPOSED)** | Verification playbooks, host-aware degradation and receipt-based install; not an independent review engine or test runner ([21](21_TESTER_ARMY_E2E_AND_PSTACK_ADOPTION.md)) |
| Vitest / Jest / pytest | `vitest-dev/vitest` (MIT, v5.0.3), `jestjs/jest` (MIT, v30.5.2), `pytest-dev/pytest` (MIT, 9.1.1) | MIT | — | **ADAPTER (existing `src/tools/*`)** | The user's runner, invoked as the repository configures it |
| StrykerJS | `stryker-mutator/stryker-js` | Apache-2.0 | v10.0.0 | **ADAPTER (DEEP/RELEASE profile, user-installed)** | Feeds the existing mutation normalizer (`src/assurance/test/mutation-adapter.ts`) |
| fast-check | `dubzzz/fast-check` | MIT | v4.10.2 | **REFERENCE_ONLY** | Used inside the user's tests; Ascout observes results through the runner. No Ascout dependency |
| Hypothesis | `HypothesisWorks/hypothesis` | MPL-2.0 (GitHub: NOASSERTION) | v6.168.5 | **REFERENCE_ONLY** | Same as fast-check |
| Atheris / cargo-fuzz / OSS-Fuzz | `google/atheris`, `rust-fuzz/cargo-fuzz`, `google/oss-fuzz` | Apache-2.0 | — | **DEFER** | Fuzzing needs containment (V3) and per-language harness generation. Not P0/P1 |

## 4. Browser, computer, and mobile verification

| Candidate | Canonical repo | License | Disposition | Reasoning |
|---|---|---|---|---|
| Playwright | above | Apache-2.0 | **Existing** | Ascout's qualified browser executor |
| Google ARTEMIS | `google/artemis` | Apache-2.0 | **VENDORED_DONOR (existing, pinned `371aa6df…`; upstream now `351ca842…`)** | 37 MB vendored. Keep, but freeze further investment until V7 |
| TinyFish / AgentQL | `tinyfish-io/agentql` (MIT SDK for a hosted API) | MIT | **REJECT** | Hosted API means per-user runtime cost or egress |
| Desktop Commander | `wonderwhy-er/DesktopCommanderMCP` | MIT | **REFERENCE_ONLY** | Deskal already covers bounded desktop/process MCP with approvals |
| open-computer-use | `e2b-dev/open-computer-use` | Apache-2.0 | **REJECT** | Depends on hosted E2B sandboxes |
| WebMCP | `webmachinelearning/webmcp` | GitHub: NOASSERTION (W3C CG) | **REFERENCE_ONLY** | Specification is still incubating |
| Deskal / Golam / kernux | internal | — | See [04](04_CAPABILITY_REUSE_MATRIX.md) | — |

## 5. Sandbox and execution

| Candidate | Canonical repo | License | Disposition | Reasoning |
|---|---|---|---|---|
| gVisor | `google/gvisor` | Apache-2.0 | **ADAPTER (optional Linux tier `ISOLATED_STRONG`)** | Linux-only. Kodac has qualification research for it (`src/trust/sandbox-observer-gvisor*.ts`). Requires a container runtime the user installs |
| OpenSandbox | `opensandbox-group/OpenSandbox` (redirected from `alibaba/OpenSandbox`) | Apache-2.0 | **REFERENCE_ONLY** | Server/Kubernetes-oriented; violates the no-daemon core constraint |
| Linux Landlock + seccomp | kernel features; Golam `crates/golamd/src/native_containment_v2.rs` | — | **SELECTIVE_PORT from Golam** | See [08](08_SECURITY_AND_TRUST_MODEL.md) |
| Windows Job Objects / AppContainer | OS features; Winds `src/process_scope.rs`, Deskal `crates/qdral-lifecycle/src/runtime.rs` | — | **SELECTIVE_PORT (Job Objects); AppContainer = NEW WORK** | Deskal only probes AppContainer; no donor launches into one |
| macOS Seatbelt (`sandbox-exec`) | OS feature (deprecated interface) | — | **NEW WORK, research-gated** | No internal donor. Deprecated status is a sustainability risk |

## 6. Agent intelligence and engineering tools

| Tool | Located | Nature | Disposition |
|---|---|---|---|
| Jev (TypeSafe) | Installed locally: `jev 2026.919.0` | CLI for a **hosted** judgment model. Needs a TypeSafe API key (`jev login`) | **GOVERNANCE_TOOL (advisory)**. Cannot be a product dependency, because it would be operator-funded or user-account-bound. Output is never proof |
| Graft | Installed locally: `graft 0.21.1` (npm) | Context-graph builder, optional LLM pass, **anonymous telemetry on by default** (`graft telemetry`) | **GOVERNANCE_TOOL**, only with telemetry turned off; context only, never evidence (consistent with PR #577) |
| PStack | Not found on this machine or in the accessible portfolio | — | **UNAVAILABLE**; not used; no claim made |
| Treg, Laya, SemIf, Decider | Mentioned in prior Ascout research documents; no repository or binary was located in this session | — | **UNVERIFIED**; no plan dependency |
| Bespoke Nimble 9B | Not located | — | **UNVERIFIED**; local-model review is qualified generically (V6), not tied to one model |
| MCP | `modelcontextprotocol/modelcontextprotocol` | Spec release `2026-07-28` | **ADOPT (stdio server, V4)** |
| ACP (Agent Client Protocol) | `agentclientprotocol/agent-client-protocol` | Apache-2.0, schema-v1.24.1 | **REFERENCE_ONLY** (Ascout is not an editor agent) |
| A2A | `a2aproject/A2A` | Apache-2.0, v1.0.1 | **DEFER** (no remote-agent use case in V2) |
| Agent Skills | Diffcipline `skills/`; `anthropics/skills` (no license detected by GitHub) | — | **ADOPT pattern (V4)**. Ship an Ascout Agent Skill written by us; copy nothing from `anthropics/skills` |

## 7. Supporting systems

| Need | Choice | Disposition |
|---|---|---|
| Artifact signing | `sigstore/cosign` v3.1.3 (Apache-2.0) + GitHub artifact attestations | **ADOPT in release CI only** (no runtime dependency) |
| Build provenance | `slsa-framework/slsa-github-generator` v2.1.0 | **ADOPT in release CI** |
| SBOM format | CycloneDX 1.7 spec | **ADOPT as interchange** |
| SARIF | OASIS SARIF 2.1.0 | **Interchange only** (A06 rule 4) |
| Policy engine | OPA v1.21.1 / `microsoft/regorus` (used by Sentrdel) | **No new Ascout dependency**. Ascout policy remains typed TypeScript; Sentrdel keeps regorus |
| Evidence storage | Ascout `.ascout/` JSON + SHA-256 content identities | **KEEP**; no database (Constitution V) |

## 8. Competitor benchmark (design reference only)

These summaries come from public product positioning known as of this plan. **They were not re-verified live in this session** and are used only to locate gaps, never as copied designs. Proprietary source is not a donor.

| Product class | Examples | What they do well | Where Ascout can be genuinely different |
|---|---|---|---|
| AI PR review SaaS | CodeRabbit, Qodo, Greptile, GitHub Copilot code review | Fast PR comments, repository context, IDE/PR integration | Ascout records **what was not reviewed** and refuses green by omission; local-first with BYOK or delegation; review is one evidence input among tests and security |
| SAST/SCA platforms | Snyk, Semgrep AppSec Platform, SonarQube, Aikido, GitHub Advanced Security | Rule depth, vulnerability DBs, dashboards, autofix | Ascout does not compete on rule count. It adds exact-source binding, a cross-engine claim model, and explicit coverage gaps, using those engines' open CLIs where licenses allow |
| Agent verification | Coding-agent built-in "verify" steps, CI | Convenience | Independence: the verifier is not the author agent, and independence class is recorded in every receipt |

**Differentiation that is real only after V1–V4 ship:** one local command that runs review, tests, and security against an exact tree; reports PASS / FAIL / NOT_RUN / UNKNOWN per capability with evidence; exposes this to agents over MCP; and costs the operator nothing per run.
