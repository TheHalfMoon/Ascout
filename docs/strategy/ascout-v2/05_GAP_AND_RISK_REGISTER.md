# 05 — Gap and Risk Register

Classes: **DEFECT** (confirmed wrong behavior), **CAPABILITY** (confirmed missing capability), **ARCH-RISK** (design weakness not yet exploited or observed), **EXTERNAL** (depends on a party outside Ascout), **OPEN** (needs a decision).
Severity: Critical / High / Medium / Low. Status for every entry is **OPEN** unless stated; this planning PR resolves none of them in code.

## 1. Critical and High

### G01 — Sentrdel binary is a stub that exits 0 · DEFECT · Critical
- **Evidence:** `Sentrdel/crates/sentrdel-cli/src/main.rs` (`println!("Sentrdel bootstrap — implementation in progress"); CliExitCode::Success`); built and run on Linux (OBSERVED)
- **Impact:** no security engine can execute; any automation calling `sentrdel` reads success
- **Root cause:** Sentrdel prioritized library capability (R1–R3) and deferred command parsing
- **Reusable solution:** `crates/sentrdel-cli/src/lib.rs` already defines `CliEnvelope`, `CliCommand {init, review, explain}`, `CliExitCode`, and `CliDecision`; library entry points exist
- **Action:** V1-T01 implements dispatch for `review --format json`; until it ships, the stub must exit non-zero (V1-T00)
- **Dependencies:** FD-2
- **Validation:** Sentrdel CLI e2e tests; Ascout V1 acceptance suite
- **Deferred risk:** none acceptable; V1 cannot start without it

### G02 — `ascout review` exits 0 when nothing was reviewed · DEFECT · High
- **Evidence:** probe ([01](01_LIVE_REPOSITORY_AUDIT.md) §4): `outcome: NOT_RUN`, exit 0
- **Impact:** CI/agents treat an unreviewed change as reviewed
- **Root cause:** `src/cli.ts` `runReview` returns 0 unconditionally; A06 rule 5 froze `review` behavior
- **Action:** A07 + V0-T02: map `NOT_RUN`/`INCOMPLETE` to exit 4 and an empty review scope to exit 0 with `NOT_APPLICABLE`
- **Validation:** adversarial test ADV-01 ([13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md))
- **Compatibility:** breaking for callers that relied on exit 0; documented in [11](11_IMPLEMENTATION_MASTER_PLAN.md) §4

### G03 — `ascout test` exits 0 with plan-only output · DEFECT · High
- **Evidence:** probe: "plan only, no execution", exit 0
- **Action:** A07 + V0-T02: bare `ascout test` returns 4 until V2 execution lands; `ascout test --plan` returns 0 and is explicitly labeled a plan
- **Validation:** ADV-02

### G04 — No end-to-end execution of any review, security, or advanced test engine · CAPABILITY · Critical
- **Evidence:** no `spawn`/`execFile` in `src/assurance/{review,security,test}`; only `mobile-artemis/availability.ts` probes a binary (OBSERVED)
- **Impact:** the product promise (verify, show pass/fail/unknown) holds only for `check`
- **Root cause:** contract-first sequencing (UA-P01–P06) with adapters defined as validators
- **Action:** V1 (security), V2 (review, test), the V3 Execution Broker
- **Validation:** V1/V2 acceptance suites run in CI against real binaries

### G05 — No containment for untrusted code on any platform · ARCH-RISK/CAPABILITY · Critical
- **Evidence:** Constitution IV; no containment in Ascout `src/`; donors: Golam (Linux x86_64 only), Kodac (Linux only), Winds/Sentrdel (process-tree lifetime only), Deskal (AppContainer probe only) (OBSERVED)
- **Impact:** "verify what AI agents build" requires running code the user did not write. Today that code runs with the user's full privileges
- **Action:** V3 Execution Broker with honest tiers ([08](08_SECURITY_AND_TRUST_MODEL.md)); untrusted mode refused when no qualified tier exists
- **Deferred risk:** macOS and Windows remain `TRUSTED_LOCAL_ONLY` until G17/G18 close. This must be stated in every receipt

### G06 — No release, installer, signing, or provenance for Ascout or Sentrdel · CAPABILITY · High
- **Evidence:** `package.json` `private: true`; no release workflow; Sentrdel has no release (OBSERVED)
- **Action:** V5 (Ascout); V1-T02 (Sentrdel release pipeline, needed earlier because V1 depends on the binary)
- **Validation:** clean-machine install tests on 3 OSes

### G07 — Run evidence lives inside the target repository and is writable by executed repository code · ARCH-RISK · High
- **Evidence:** `ascout check` wrote `.ascout/runs/<id>/receipt.json` inside the probe repository (OBSERVED). Executed tests run as the same OS user (Constitution IV)
- **Impact:** a malicious test or a lingering child process could alter evidence after it is written, or plant fake prior-run evidence. Not exploited in this session
- **Action:** V3: write evidence to a per-user state directory outside the repository; hash-chain each run's artifacts with digests held by the parent process until sealing; receipts carry the digest of every artifact; `ascout verify-receipt` re-validates. Keep `.ascout/` as an optional export location
- **Validation:** ADV-07 (tamper after write → verification failure)

### G08 — Security coverage gaps: SBOM, IaC, non-JS/TS SAST · CAPABILITY · High
- **Evidence:** [01](01_LIVE_REPOSITORY_AUDIT.md) §5E
- **Action:** Syft (SBOM), Trivy (IaC/images), and Opengrep/Semgrep (multi-language SAST) as optional user-installed scanners through Sentrdel (C02). Unsupported languages must surface `coverage: UNSUPPORTED_LANGUAGE`
- **Validation:** language coverage matrix in receipts; benchmark fixtures per language

### G09 — No agent-native surface (MCP server, agent skill, structured agent receipt over MCP) · CAPABILITY · High
- **Evidence:** CLI only; `--format agent` exists only for `check` (OBSERVED)
- **Action:** V4 stdio MCP server, read-mostly, with tools mapping to CLI commands; Agent Skill (P05)

### G10 — Normalizers built without a real producer may not match real engine output · ARCH-RISK · High
- **Evidence:** about 15,400 lines of normalizers and validators (`src/assurance/review` 2,467; `security` 11,047; `test` 1,894) validated only against hand-written fixtures (OBSERVED, line counts)
- **Impact:** the first real integration may require reworking the contracts; there is a risk of shipping normalizers that silently drop fields
- **Action:** V1/V2 golden fixtures captured from real binaries at pinned versions; normalizers must reject unknown required fields rather than ignore them

### G29 — Claim model cannot say "the claim is false" · DEFECT (contract) · High
- **Evidence:** `CLAIM_ASSESSMENT_STATES = SUPPORTED | BLOCKED | INCOMPLETE | INCONCLUSIVE | STALE | REFUSED` (`src/assurance/contracts/claim-assessment.ts:15`; frozen in `ASCOUT_UNIFIED_ASSURANCE_CONTRACT_FREEZE_2026-09-19.md` §4) (OBSERVED)
- **Impact:** a claim with validated contradicting evidence (a failing required test, an open validated security finding) has no distinct state. It collapses into INCONCLUSIVE/BLOCKED, so "verified false" and "could not tell" look alike to users and agents. Task-level FAIL exists; claim-level does not
- **Action:** A07 adds `REFUTED`. It is valid only when at least one contradicting evidence ref resolves to a validated finding or a FAIL task for the same target, and it maps to exit 1. Additive enum change with a schema version bump; existing fixtures unaffected
- **Validation:** ADV-09; semantic validator rejects `REFUTED` with zero contradicting refs

### G30 — Repository-controlled Git configuration can launch commands during Ascout runs · DEFECT · High
- **Evidence:** a local probe on `ca6b6f51` confirmed that a command defined through repository-local Git configuration executed during `ascout doctor`, `ascout review`, and `ascout check` (OBSERVED 2026-10-08). Exploit details are withheld from this public document per `SECURITY.md`. Kodac's gateway shows the same pattern (no configuration neutralization; not tested)
- **Impact:** under the trusted-local model the repository's own configuration is trusted. Under V2's untrusted-agent model, an agent that can write the workspace can obtain code execution in the verifier, including through the "read-only" `review` command
- **Action:** V0-T08: run every Git command with repository-controlled execution settings neutralized and a scrubbed Git environment; the ported gateway (K-1) must do the same
- **Validation:** ADV-20 ([13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md)); the probe must not execute on any command

### Revision 2 additions (2026-10-08)

| ID | Class · Severity | Gap | Evidence | Action | Validation |
|---|---|---|---|---|---|
| G31 | DEFECT (design) · High | Revision 1's Sentrdel-only fan-in loses evidence and is a single point of failure | Sentrdel's adapter rejected the whole OSV and Trivy SARIF files (20 of 22 results); no CycloneDX/SPDX/OSV path ([17](17_SECURITY_EVIDENCE_INTEROPERABILITY.md) §2.3) | D-17 federated ingestion | FMT-01, FMT-03, FMT-09 |
| G32 | EXTERNAL · High | Scanners report clean with zero coverage | Gitleaks on a non-repository exits 0 ("0 commits scanned … no leaks found"); Trivy reports successes for an unparseable Terraform file, with the error only on stderr | Engine Profiles with coverage signals; stderr capture; never `--quiet` | FMT-05, FMT-07 |
| G33 | EXTERNAL · High | Scanner output carries plaintext secrets, including secrets the scanner missed | Gitleaks JSON/SARIF snippets; Trivy `Code.Lines` printed an undetected credential | Redaction pass before persistence; drop context fields by default | FMT-06 |
| G34 | DEFECT (planning) · Medium | Revision 1 referenced 65 acceptance identifiers it never defined | `verify-planning-docs --ids` on #578 | Fixed in revision 3 ([13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md)) | Verifier PASS on the stack head |
| G35 | PROCESS · High | No working independent review path for architecture documents | OCR excludes Markdown (0 of 21 files reviewable); automated reviewers on #578 did not review (cubic over quota, Qodo trial ended, CodeRabbit skipped); no human review yet | Defined review path in planning governance (revision 7) | Recorded reviews before ratification |
| G36 | CAPABILITY · Medium | Linux containment donors are partial: the licensed Kodac launcher is filesystem-only; Golam's fs+net+seccomp helper is unlicensed; Landlock inside WSL2 is unverified | [16](16_KODAC_CONVERGENCE_ANALYSIS.md) K-6; [18](18_CONTRADICTION_RESOLUTION_LEDGER.md) C-08, C-09 | `T1-FS` + network namespace for full `T1`; runtime probes | CON-04, E2E-12 |

## 2. Medium

| ID | Class | Gap | Evidence | Action | Validation |
|---|---|---|---|---|---|
| G11 | DEFECT | `THIRD_PARTY_NOTICES.md` omits runtime dependency `playwright@1.63.0` | grep found no entry (OBSERVED) | V0-T03 | notices-completeness CI check (all direct runtime deps listed) |
| G12 | DEFECT | Review identity uses binary `open-code-review`; upstream binary is `ocr`; OCR pin 16 commits behind | `src/assurance/review/benchmark-corpus.ts:95`; `ocr --version` (OBSERVED) | V0-T04 | resolver test against the real binary name |
| G13 | DEFECT | `check` writes `.ascout/` without `init`; artifacts then appear as reviewable changes to other tools | `ocr delegate preview` listed `.ascout/runs/*` (OBSERVED) | V0-T06 (exclude `.ascout/` via `.git/info/exclude` when no `.gitignore` entry exists) and G07 | probe re-run shows no `.ascout` paths |
| G14 | DEFECT | README omits `review`, `test`, `doctor` | `README.md` (OBSERVED) | V0-T05 | docs/CLI parity test from `usageText()` |
| G15 | CAPABILITY | Workflow models (freshness, idempotency, stage attempts) are not durable across restarts | no persisted workflow store (OBSERVED) | V5: file-based run journal with fsync and recovery tests; no database | kill-at-step-N recovery tests |
| G16 | EXTERNAL | Owner donors without LICENSE files (Golam, commandF, MSTR, Ecra, TheHalfMoon/wepld, Zyara, Lilac, Olax, Skelet, Wispral, Signthos) | `ls` of each clone (OBSERVED) | FD-3 attestation per copied component | provenance register entry required before merge |
| G17 | CAPABILITY | No macOS isolation donor | no Seatbelt/Endpoint Security code in the portfolio (OBSERVED) | V3 research spike; `TRUSTED_LOCAL_ONLY` on macOS until qualified | tier declaration test on macos-14 |
| G18 | CAPABILITY | No Windows AppContainer launch path | Deskal `validate_appcontainer_name`/`probe_appcontainer_profile` only (OBSERVED) | V3 new work in the `native/` Windows helper | hostile probe suite on windows-2025 |
| G19 | EXTERNAL | Sentrdel fails to build on stock Windows (`regorus` → `msvc_spectre_libs`) | build log (OBSERVED) | V1-T02: prebuilt binaries; evaluate `regorus` features or a pinned upgrade (regorus-v0.12.0 available) | release workflow on windows-2025 |
| G20 | ARCH-RISK | Review egress: code sent to a user-configured LLM endpoint | OCR design | Bound to existing `data_egress_rules.source_egress` (default `DENY`) with explicit per-invocation endpoint consent; endpoint identity recorded; local endpoint preferred | ADV-05 |
| G21 | ARCH-RISK | Prompt injection in repository content steers review toward "no issues" | inherent to LLM review | Review results can only add findings or record coverage. They can never close another engine's finding, satisfy a security claim, or upgrade NOT_RUN | ADV-06 |
| G22 | EXTERNAL | ARES inaccessible | API 404 (OBSERVED) | Keep #419 blocked; no dependency | — |
| G23 | ARCH-RISK | GitHub publication never exercised against the real API | K08 models only | P04 port + recorded-fixture tests + one opt-in live test on a sandbox repository | — |
| G24 | ARCH-RISK | Kernux README says unimplemented while code exists | kernux README vs `crates/` (OBSERVED) | Treat as REFERENCE only | — |
| G25 | ARCH-RISK | Vendored ARTEMIS (37 MB) increases clone size and audit surface for a P2 capability | `vendor/google-artemis` (OBSERVED) | Freeze; consider moving to a separate companion repository in V7 (decision deferred, no history rewrite) | — |

## 3. Low

| ID | Gap | Action |
|---|---|---|
| G26 | Receipt `ascout_version` `0.1.0-m1` vs package `0.1.0` | V0-T03: single version source |
| G27 | Graft telemetry on by default (development tool) | Governance note: `graft telemetry off` before use on this repository |
| G28 | PStack, Treg, Laya, SemIf, Decider, Bespoke Nimble 9B could not be located | No dependency; record as unavailable |

## 4. Open questions requiring founder decision

| ID | Question | Recommendation |
|---|---|---|
| FD-1 | Ratify A07 (unified exit taxonomy, including the `review`/`test` behavior change)? | Yes. The current exit 0 conflicts with Principle II's intent |
| FD-2 | Authorize Sentrdel CLI dispatch + release pipeline work in the Sentrdel repository? | Yes. V1 is blocked otherwise |
| FD-3 | Attest Apache-2.0 relicensing for specific files from owner repositories without LICENSE files? | Yes, per file, recorded in the provenance register |
| FD-4 | Accept that macOS/Windows untrusted-code verification is unavailable until V3 qualifies tiers? | Yes. The alternative is an unverifiable claim |
| FD-5 | Accept *deferral with re-entry criteria* (not removal) of UA-P07 (folded into V6), UA-P08, and UA-P10–P12? | Yes; see [11](11_IMPLEMENTATION_MASTER_PLAN.md) §3 (revision 2 wording) |
| FD-6 | When to make the first public pre-release (npm scope proof, signing certificates)? | After V5 exit criteria; not required for V0–V4 |
