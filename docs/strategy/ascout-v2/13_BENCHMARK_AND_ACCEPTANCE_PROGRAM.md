# 13 — Real-Engine Acceptance and Benchmark Program (Revision 2)

Revision 2 replaces the prose test list of revision 1. Revision 1 referenced 65 acceptance identifiers it never defined (found by `scripts/planning/verify-planning-docs.mjs --ids`). Every identifier is now defined in a table. Security-format tests FMT-01…FMT-11 are defined in [17](17_SECURITY_EVIDENCE_INTEROPERABILITY.md) §8.

## 1. Evidence levels and the counting rule

| Level | Meaning | Counts as integration? |
|---|---|---|
| L0 | Unit/contract test on handwritten input | **No** |
| L1 | Replay of golden output captured from the pinned real binary | **No**. It protects normalizers from drift |
| L2 | The pinned real binary executes in CI on one OS against a real fixture repository | Yes, for that OS only |
| L3 | L2 on every OS the capability is claimed for | Required before a capability is described as supported on all platforms |

**Rule:** an engine integration is reported as working only at L2 or above, per OS, with the CI job and artifact hashes cited. A manual run in a planning session (as in [17](17_SECURITY_EVIDENCE_INTEROPERABILITY.md)) is feasibility evidence, not integration evidence.

**CI vehicle (PROPOSED):** `.github/workflows/real-engines.yml` on ubuntu-24.04, macos-14, and windows-2025. It installs pinned engines from the companion manifest (hash-verified), runs the E2E tests below against fixture repositories committed under `tests/fixtures/real-engines/` (synthetic credentials generated at test time, never committed), and uploads redacted receipts plus artifact SHA-256 lists.

## 2. Real-engine end-to-end tests

"Observed" = seen in this planning session (manual, feasibility only). "Expected" = the assertion the CI test must make.

| ID | Engine (pinned) | Current level | Required | Command / fixture | Expected result | Negative variants |
|---|---|---|---|---|---|---|
| E2E-01 | Repository test runners via `ascout check` | L3 (REPORTED by `Project CI`) | L3 | existing runtime tests | Receipt task statuses match runner outcomes; exit taxonomy 0/1/2/3/4 | changed command surface → `NOT_RUN(command_surface_changed)` |
| E2E-02 | Playwright 1.63.0 / Chromium | L3 (REPORTED: `tests/browser-playwright.integration.test.ts` in `Project CI`) | L3 | existing integration test; CLI path in V7 | Browser evidence projected into receipts | Chromium missing → `NOT_RUN(engine_unavailable)` |
| E2E-03 | Sentrdel release | **None** (no CLI; G01) | L3 | `ascout security` on the security probe | Changed-secret, CI-workflow (`pull_request_target` + head checkout), and dependency-delta findings; claim `REFUTED`, exit 1 | binary missing / wrong hash / stub exit → FMT-08 states |
| E2E-04 | Gitleaks 8.30.1 | Observed manually (Windows) | L3 | `--redact`, JSON | 2 secrets; 0 plaintext in the store | non-repository directory → `NOT_RUN(no_inputs_detected)` (FMT-07) |
| E2E-05 | OSV-Scanner 2.6.0 | Observed manually | L3 | JSON (primary) + CycloneDX | 8 advisories with aliases | no lockfiles (exit 128) → `NOT_RUN(no_inputs_detected)` |
| E2E-06 | Syft 1.54.1 | Observed manually | L3 | CycloneDX 1.7 + SPDX 2.3 | PURL set includes `lodash@4.17.15`, `minimist@1.2.0` | empty directory (exit 1) → `NOT_RUN(no_inputs_detected)` |
| E2E-07 | Trivy 0.75.0 | Observed manually | L3 | `fs` JSON (primary), DB timestamp recorded | 9 vulnerabilities, 2 Dockerfile misconfigurations; unparseable Terraform → `PARSE_FAILED` (FMT-05) | DB unavailable → `ERROR` |
| E2E-08 | OCR 1.12.12, delegation mode | Observed manually | L3 | `ascout review --delegate` / `--ingest` | Spec equals `ocr delegate preview` selection; ingested result `HOST_AGENT` | excluded files listed `NOT_REVIEWED(engine_excluded)` (ADV-17) |
| E2E-09 | OCR 1.12.12, LLM mode with a **real** model | **None** | L2 (Linux) | Local OpenAI-compatible server running a small open-weight model on the CI runner (PROPOSED; feasibility and runtime unmeasured) | Comments normalized; locations valid | no endpoint → exit 4. If a real model cannot run in CI, LLM review stays labeled **unqualified** and never counts toward any claim |
| E2E-10 | StrykerJS 10.0.0 | None | L2 (Linux) | fixture JS project, DEEP profile | Mutation score evidence | Stryker absent → `NOT_RUN(engine_unavailable)` |
| E2E-11 | Kodac `ask` as reviewer ([16](16_KODAC_CONVERGENCE_ANALYSIS.md) K-11) | None | L2 | read-only reviewer on fixture diff | Observations with `SEPARATE_AGENT` independence only when the author identity differs | same author → `SELF`, cannot satisfy independent review |
| E2E-12 | Kodac Landlock launcher (T1-FS) | Kodac's own tests (REPORTED) | L2 (Linux) | hostile probes under the broker | Achieved tier `T1-FS` recorded; filesystem escapes denied | kernel without Landlock → `T0` declared, untrusted execution `BLOCKED` |
| E2E-13 | Composite on the security probe | None | L3 | `ascout assure` (review + test + security) | `REFUTED`, exit 1, with per-capability coverage listed | any required engine missing → its capability `NOT_RUN` listed |
| E2E-14 | Kodac Done Gate consuming an Ascout receipt | None | L2 | `kodac solve` with Ascout as the verification step | `PROVEN_READY` only when Ascout reports `SUPPORTED` for the same head | Ascout `INCOMPLETE` → `NOT_READY` |
| E2E-15 | TesterArmy e2e 0.18.0, deterministic web (PROPOSED) | None | L2, then L3 on claimed OSes | Pinned runner, no-model local web fixture | Real assertions reach an Ascout receipt on the exact head | missing engine/Node mismatch → `NOT_RUN`; no telemetry or remote inference |
| E2E-16 | TesterArmy source/replay/egress binding (PROPOSED) | None | L2 | Broker, no-model cache and benign/hostile navigation fixtures | Replayed actions cannot cross head/target; receipt distinguishes assertions from model claims | malicious redirect, cached injection, stale head → BLOCK/INCOMPLETE |
| E2E-17 | Web integration parity and cross-platform (PROPOSED) | None | L3 | Side-by-side pinned Playwright and e2e on local fixtures | Executable outcomes and coverage truthful across 3 OSes; no duplicate authority | unavailable browser/unsupported OS → `NOT_RUN` not false success |
| E2E-18 | Explicit agent/mobile opt-in (PROPOSED) | None | L2 only if proven | Local or user-funded endpoint, optional mobile feasibility | Declared cost/egress and evidence; no auto-enabled hosted provider | no model, mobile device or user approval → `NOT_RUN`; never a release blocker for deterministic web |

## 3. Adversarial tests (wrong-claim scenarios)

| ID | Scenario | Expected |
|---|---|---|
| ADV-01 | `review` with no engine available | exit 4; `NOT_RUN(engine_unavailable)`; every file unreviewed |
| ADV-02 | `test --profile release` with engines missing | exit 4; omitted engines listed; `--plan` exits 0 with `kind: plan` |
| ADV-03 | Sentrdel missing / wrong hash / non-JSON / exit 0 without `EXECUTED` | `UNAVAILABLE` / `VERSION_MISMATCH` / `MALFORMED_OUTPUT` / `ENGINE_ERROR`; never 0 |
| ADV-04 | Engine omits a requested capability | `NOT_RUN(capability_omitted_by_engine)`; claim `INCOMPLETE` |
| ADV-05 | Remote review endpoint with `source_egress = DENY` | refused before any connection; a local listener receives zero connections |
| ADV-06 | Prompt injection in repository content plus a validated secret | finding stays `OPEN`; claim `REFUTED`; review cannot change it |
| ADV-07 | Artifact modified after sealing | `ascout verify-receipt` exit 1 naming the artifact |
| ADV-08 | Runtime dependency missing from THIRD_PARTY_NOTICES | CI fails |
| ADV-09 | `REFUTED` with zero, foreign-target, stale, or model-only contradicting refs | semantic validator rejects ([09](09_ASSURANCE_EVIDENCE_CONTRACTS.md) §1 rule 3) |
| ADV-10 | `--untrusted` execution where the achieved tier does not meet the requirement | `BLOCKED(tier_unavailable)`, exit 4; override caps the claim at `TRUSTED_LOCAL` |
| ADV-11 | MCP client approves its own effect | refused |
| ADV-12 | `.ascout/` artifacts appear as changes to the next tool | must not happen |
| ADV-13 | Head changes between plan and execution | `STALE` or `tree_drifted` (exit 3) |
| ADV-14 | Test script changed to `exit 0` in the diff | `NOT_RUN(command_surface_changed)` through `check`, `test`, and MCP |
| ADV-15 | Unsupported language only, no scanner covers it | `INCOMPLETE` with `UNSUPPORTED_LANGUAGE` |
| ADV-16 | PASS on retry after FAIL | `FLAKY`, never clean PASS |
| ADV-17 | Engine excludes changed files by its own filters | `NOT_REVIEWED(engine_excluded:<reason>)`; coverage not complete |
| ADV-18 | Engine persists state inside the target repository | refused, or invoked with an Ascout-owned state dir; no new repository files |
| ADV-19 | Security claim `SUPPORTED` | wording "no findings from <engines> within <coverage>", never "secure" |
| ADV-20 | Repository-controlled Git configuration defines a command (G30) | the command never executes during any Ascout command; a marker file is never created |

## 4. Capability acceptance tests

| ID | Area | Test | Pass condition |
|---|---|---|---|
| SEC-01 | Security | planted changed secret | detected; zero plaintext in any artifact |
| SEC-02 | Security | `pull_request_target` + head checkout + expression in shell | detected by Sentrdel (E2E-03) |
| SEC-03 | Security | dependency delta with a known advisory, offline fixture | detected without network |
| SEC-04 | Security | clean control repository | `SUPPORTED`, exit 0, coverage listed |
| SEC-05 | Security | PATH-shadowing binary | ignored; manifest path used |
| SEC-06 | Security | manifest hash mismatch | `VERSION_MISMATCH` |
| SEC-07 | Security | child environment | no credential-shaped variables (env-dumping fixture) |
| SEC-08 | Security | CI-workflow findings | rule, location, provenance preserved |
| SEC-09 | Security | Opengrep/Semgrep SARIF, non-JS language | ingested; unsupported files listed |
| SEC-10 | Security | Gitleaks history mode | commits scanned > 0 or `NOT_RUN(no_inputs_detected)` |
| SEC-11 | Security | OSV-Scanner full lockfile | equals E2E-05 expectations |
| SEC-12 | Security | Syft SBOM | equals E2E-06 expectations |
| SEC-13 | Security | Trivy IaC and images | equals E2E-07 expectations |
| SEC-14 | Security | SARIF export | validates against SARIF 2.1.0; never re-imported as truth |
| SEC-15 | Security | remediation without new evidence | finding stays `REPAIRED_PENDING_REVERIFY` |
| SEC-16 | Security | retest after fix with new evidence | `VERIFIED_FIXED` only for the new head |
| REV-00 | Review | resolver finds `ocr` | `ocr --version` recorded |
| REV-01 | Review | platform binary hash | verified against manifest |
| REV-02 | Review | loopback endpoint | allowed without egress consent; identity recorded |
| REV-03 | Review | token handling | token absent from all artifacts |
| REV-04 | Review | real OCR JSON | normalized; locations validated against head |
| REV-05 | Review | delegation spec | equals `ocr delegate preview` selection |
| REV-06 | Review | ingested host-agent result | `HOST_AGENT`; cannot satisfy independent review |
| REV-07 | Review | coverage accounting | reviewed ∪ unreviewed = selected; disjoint |
| TST-01 | Test | `test --profile standard` | exit equals `check` exit on the same tree |
| TST-02 | Test | source binding | identical to `check` |
| TST-03 | Test | DEEP without Stryker | `NOT_RUN(engine_unavailable)` |
| TST-04 | Test | profile listing | executed and omitted engines present |
| PROTO-01 | Protocol | request/response schema | invalid documents rejected |
| PROTO-02 | Protocol | oversize response | `MALFORMED_OUTPUT` |
| PROTO-03 | Protocol | request id mismatch | `MALFORMED_OUTPUT` |
| CON-01 | Containment | `child_process` use outside the broker | lint failure |
| CON-02 | Containment | environment | allowlist enforced at launch |
| CON-03 | Containment | helper build | reproducible; provenance recorded |
| CON-04 | Containment | Linux hostile probes (write outside worktree, read `~/.ssh`, open socket, ptrace, mount, setuid spawn) | all denied at the declared tier; network probes denied only at `T1` (not `T1-FS`) |
| CON-05 | Containment | Windows process tree | no surviving descendants after timeout; job memory limit enforced |
| CON-06 | Containment | Windows AppContainer probes | denied, or tier declared `T0` |
| CON-07 | Containment | macOS | declares `T0` truthfully |
| CON-08 | Containment | receipts | achieved tier present on every execution |
| MCP-01 | MCP | spec conformance (2026-07-28) | conformance suite passes |
| MCP-02 | MCP | read-only tools | no effects observed |
| MCP-03 | MCP | executing tools | default to untrusted |
| MCP-04 | MCP | approvals | bound to head and diff digest (ported K-4) |
| MCP-05 | MCP | Agent Skill | lint passes; teaches exit 4 ≠ done |
| MCP-06 | MCP | GitHub Action | `pull_request` only, read-only permissions, receipts uploaded, no publication |
| REL-01 | Release | artifacts | attested |
| REL-02 | Release | `ascout setup` | verifies hashes before install |
| REL-03 | Release | offline setup | works from a local directory |
| REL-04 | Release | clean machine | installs on 3 OSes |
| REL-05 | Release | `ascout gc` | honors retention |
| REL-06 | Release | signatures | verify |
| PUB-01 | Publication | origin pinning | only `https://api.github.com` |
| PUB-02 | Publication | default | dry-run |
| PUB-03 | Publication | stale head | refused |
| PUB-04 | Publication | redaction | gate applied |
| DUR-01 | Durability | kill during engine run | journal recovers; run marked interrupted |
| DUR-02 | Durability | kill after publication request | no duplicate publication (`SIDE_EFFECT_RETRY` blocked) |
| DUR-03 | Durability | torn journal write | detected; run unsealed |
| DOC-01 | Docs | README/CLI parity | generated usage matches README |
| DOC-02 | Docs | `doctor` engine table | matches the manifest |
| ASR-01 | Assure | one required capability missing | `INCOMPLETE` |
| ASR-02 | Assure | one validated contradiction | `REFUTED` |
| ASR-03 | Assure | stale evidence | excluded from support |
| ASR-04 | Assure | model suggestion | cannot remove a required check |
| ASR-05 | Assure | plan digest | stable across repeated runs |
| PST-01 | Provenance | pinned TesterArmy and Pstack source/license/nested rights | imported-file lineage, blob pin, license/NOTICE and package integrity recorded; no unlicensed embedded import |
| PST-02 | Local runtime | optional donor bootstrap and Node/telemetry safeguards | no paid calls, no default telemetry, no shell side effects or PATH ambiguity; incompatible Node fails closed |
| PST-03 | Agent workflows | Pstack host capability degradation and independence | Tier 0/1/2 recorded honestly; same-model stances never claim cross-vendor agreement |
| PST-04 | Agent integration | Pstack installation and session privacy | `--dry-run` first, no silent global instruction replacement; edited files preserved on uninstall; local `serve` default OFF and no session-log publication |

## 5. Benchmarks

| ID | What | Metric | Baseline |
|---|---|---|---|
| B-SEC-1 | Security latency/memory on 3 repositories | p50/p95 wall time, peak RSS | Unmeasured |
| B-SEC-2 | Detection quality on planted-defect + clean corpora | precision, recall, clean-PR false positives, per engine and per capability | Unmeasured |
| B-REV-1 | Review coverage integrity | selected files accounted for (must be 100%) | Unmeasured |
| B-REV-2 | Review quality (real model) | precision/recall against annotations, through ported K-7 qualification | Unmeasured; vendor figures are not Ascout results |
| B-TST-1 | `test` overhead vs raw runner | added wall time | Unmeasured |
| B-EXE-1 | Broker spawn overhead per tier | ms | Unmeasured; PROPOSED ≤ 50 ms |
| B-CLM-1 | Claim correctness over ADV-01…ADV-20 and FMT-01…FMT-11 | wrong-claim count | **Must be 0** |
| B-SRC-1 | Cross-tree evidence leakage | count | **Must be 0** |

## 6. Release gate

A V-phase exits only when: each capability it claims is at L2 on every claimed OS (L3); B-CLM-1 = 0 and B-SRC-1 = 0; its benchmarks were measured and recorded, even when a target was missed; provenance entries exist for every ported file; and exact-head CI plus the review path in [15](15_IMPLEMENTATION_READINESS_AUDIT.md) were completed.
