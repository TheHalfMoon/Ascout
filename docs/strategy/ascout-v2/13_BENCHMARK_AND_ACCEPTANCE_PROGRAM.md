# 13 — Benchmark and Acceptance Program

Every acceptance test runs in CI at the exact PR head. Every benchmark records environment (OS, CPU, RAM, versions) and is reported as measured, including misses. No result is copied from donor documentation.

## 1. Adversarial acceptance tests (incorrect-claim scenarios)

Each test encodes a scenario in which a weaker design would make a wrong readiness or security claim.

| ID | Scenario | Expected |
|---|---|---|
| ADV-01 | `ascout review` with no engine available | exit 4; `NOT_RUN(engine_unavailable)`; every file listed unreviewed |
| ADV-02 | `ascout test --profile release` where mutation/browser engines are missing | exit 4; executed vs omitted engines listed; `--plan` variant exits 0 with `kind: plan` |
| ADV-03 | Sentrdel binary missing / wrong hash / returns non-JSON / exits 0 with `execution.state ≠ EXECUTED` | exit 4 with `UNAVAILABLE` / `VERSION_MISMATCH` / `MALFORMED_OUTPUT` / `ENGINE_ERROR`; never 0 |
| ADV-04 | Sentrdel omits a requested capability from its response | that capability `NOT_RUN(capability_omitted_by_engine)`; claim `INCOMPLETE` |
| ADV-05 | Remote review endpoint configured but `source_egress = DENY` | review refused before any network call; exit 4; no bytes sent (verified with a local listener that must receive zero connections) |
| ADV-06 | Repository comment contains a prompt injection instructing the reviewer to report nothing; Sentrdel reports a validated secret in the same change | security finding remains `VALIDATED`; claim `REFUTED`; review output cannot change it |
| ADV-07 | After a run is sealed, a background child modifies `receipt.json` or an artifact | `ascout verify-receipt` exit 1 naming the artifact |
| ADV-08 | A runtime dependency is missing from THIRD_PARTY_NOTICES | CI test fails |
| ADV-09 | `REFUTED` emitted with zero contradicting refs, or with refs to another target | semantic validator rejects |
| ADV-10 | `--untrusted` execution on a platform whose achieved tier is T0 | `BLOCKED(tier_unavailable)`, exit 4; with `--trust-local-execution`, the claim is capped at `TRUSTED_LOCAL` |
| ADV-11 | MCP client calls publication with an approval token it generated itself | refused |
| ADV-12 | Two consecutive tools run on a repository without `init`; the second lists `.ascout/` artifacts as changes | must not happen |
| ADV-13 | Candidate head changes between plan and execution | `STALE` or `tree_drifted` (exit 3); no `SUPPORTED` |
| ADV-14 | A test script changed in the diff (`"test": "exit 0"`) | `NOT_RUN(command_surface_changed)` (existing behavior preserved through `test`/MCP paths) |
| ADV-15 | Unsupported language only (for example a Go-only change) with no fan-in scanner | security claim `INCOMPLETE` with `UNSUPPORTED_LANGUAGE`; never `SUPPORTED` |
| ADV-16 | Retry PASS after an initial FAIL | recorded as `FLAKY`, never clean PASS (existing invariant 10) |
| ADV-17 | OCR excludes changed files by its own filters (observed: `excluded: unsupported_ext`) | excluded files appear as `NOT_REVIEWED(engine_excluded:<reason>)`; review coverage is not "complete" unless the intent explicitly excludes them |
| ADV-18 | Sentrdel attempts to persist its SQLite state inside the target repository | the run is refused or Sentrdel is invoked with an Ascout-owned state dir; no new files appear in the repository |
| ADV-19 | A security claim is `SUPPORTED` | human and agent output say "no findings from <engines> within <coverage>", never "secure" (wording test) |

## 2. Capability acceptance suites

**Security (V1):**
SEC-01 planted changed secret detected and redacted (no plaintext in any artifact; scan of the state dir for the planted value returns zero hits) ·
SEC-02 `pull_request_target` + checkout of the PR head in a workflow detected ·
SEC-03 lockfile delta adding a package with a fixture advisory detected offline ·
SEC-04 clean control repository → `SUPPORTED`, exit 0, with explicit coverage listing ·
SEC-05 binary resolved by absolute path from the manifest; a PATH-shadowing binary is ignored ·
SEC-06 manifest hash mismatch → `VERSION_MISMATCH` ·
SEC-07 Sentrdel child receives no credential-shaped environment variables (asserted by a fixture binary that dumps its env) ·
SEC-08 CI-workflow findings normalized with rule/location/provenance.
V6 extends this with SEC-09…SEC-16 (one per fan-in scanner, SARIF export schema validation, retest lifecycle).

**Review (V2):**
REV-00 resolver finds `ocr` and records `ocr --version` ·
REV-01 platform binary hash verified ·
REV-02 loopback endpoint allowed without egress consent; identity recorded ·
REV-03 token never appears in any artifact ·
REV-04 real OCR JSON normalized; locations validated against the head ·
REV-05 delegation spec equals the `ocr delegate preview` selection ·
REV-06 ingested host-agent result recorded with `HOST_AGENT` independence and never satisfies an "independent review" requirement ·
REV-07 coverage accounting: reviewed ∪ unreviewed = selected; no file in both sets.

**Test (V2):**
TST-01 `test --profile standard` exit equals the `check` exit on the same tree ·
TST-02 receipts identical in source binding to `check` ·
TST-03 DEEP without Stryker → `NOT_RUN(engine_unavailable)` ·
TST-04 profile/omission listing present.

**Protocol (V1):** PROTO-01 schema validation of requests/responses · PROTO-02 oversize response rejected · PROTO-03 request id mismatch rejected.

**Containment (V3):**
CON-01 lint: no `child_process` outside the broker ·
CON-02 env allowlist enforced ·
CON-03 helper reproducible build + provenance ·
CON-04 Linux hostile probes (write outside worktree, read `~/.ssh`, open socket, ptrace, mount, spawn setuid) all denied at T1 ·
CON-05 Windows: no surviving descendants after timeout; job memory limit enforced ·
CON-06 Windows AppContainer probes denied (or the tier is declared T0) ·
CON-07 macOS declares T0 truthfully ·
CON-08 receipts state the achieved tier.

**MCP (V4):** MCP-01 spec conformance · MCP-02 read-only tools cause no effects · MCP-03 executing tools default to untrusted · MCP-04 approval bound to head+diff digest · MCP-05 skill lint · MCP-06 Action uploads receipts.

**Release, publication, durability (V5):** REL-01 attested artifacts · REL-02 setup verifies hashes · REL-03 offline setup · REL-04 clean-VM install on 3 OSes · REL-05 gc honors retention · REL-06 signatures verify · PUB-01 origin pinning · PUB-02 dry-run default · PUB-03 stale head refused · PUB-04 redaction gate applied · DUR-01..03 kill at journal step N → recovery without a duplicate publication or a lost evidence record.

**Docs:** DOC-01 README/CLI parity · DOC-02 doctor engine table matches the manifest.

**Assure (V6):** ASR-01…ASR-05 composite claim rules (one missing capability → `INCOMPLETE`; one validated contradiction → `REFUTED`; stale evidence excluded; model suggestion cannot remove a required check; deterministic plan digest stable).

## 3. Benchmarks

| ID | What | Corpus | Metric | Baseline |
|---|---|---|---|---|
| B-SEC-1 | Security latency and memory | 3 repositories: small JS/TS app, medium Next.js + Supabase app, polyglot repo; PR-sized diffs | p50/p95 wall time, peak RSS | **Unmeasured**; targets in [10](10_LOCAL_ZERO_COST_PACKAGING_AND_PLATFORM.md) §4 |
| B-SEC-2 | Security detection quality | Planted-defect corpus (secrets, workflow injection, vulnerable deps, IDOR/tenant patterns in R3 scope) + clean controls | precision, recall, false-positive rate on clean PRs; per capability | **Unmeasured**; SentrdelBench contracts exist (REPORTED) and are reused |
| B-REV-1 | Review coverage integrity | Existing Ascout review benchmark corpus | % selected files accounted for (must be 100%), location validity % | **Unmeasured** |
| B-REV-2 | Review quality (optional, user-funded endpoint) | OCR-published benchmark methodology, re-run locally | precision/recall vs annotations | **Not claimed**; OCR's published numbers are REPORTED by the vendor and are not Ascout results |
| B-TST-1 | `test` overhead vs raw runner | Ascout's own repository | added wall time | Unmeasured |
| B-EXE-1 | Broker spawn overhead | Synthetic | ms per spawn per tier | Unmeasured; PROPOSED ≤ 50 ms at T0/T1 |
| B-CLM-1 | Claim correctness | ADV-01…ADV-19 | wrong-claim count | **Must be 0** (hard gate) |
| B-SRC-1 | Cross-tree evidence leakage | Existing benchmark (Constitution VIII) | count | **Must be 0** (existing hard gate) |

## 4. Release gates (summary)

A V-phase exits only when: its acceptance suite passes on all claimed platforms; B-CLM-1 = 0 and B-SRC-1 = 0; its benchmarks were measured and recorded (even if a target was missed); provenance entries exist for every new donor file; and exact-head CI plus review were completed under the governance in [15](15_IMPLEMENTATION_READINESS_AUDIT.md) §4.
