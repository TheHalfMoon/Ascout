# Ascout REA mission expansion — evidence and qualification

**2026-10-20 · RESEARCH ONLY · NO PRODUCTION IMPLEMENTATION · NO MERGE AUTHORITY**

This continues PR [#636](https://github.com/TheHalfMoon/Ascout/pull/636) from `d832d390f1ff41b3a8864fc464901c603f00ca3c`. It preserves the original research and supersedes its donor priorities and single-tool execution frontier. Blastline is excluded at the user's explicit direction. This is a finite, source-backed qualification investigation, not a claim of complete reverse engineering or universal tool correctness.

The smallest justified change set is **reuse of existing contracts plus four bounded improvements**: diagnostic loss accounting, conservative selection closure, a real mutation-output adapter, and additional deterministic browser assertions. No new mandatory engine, service, database or inference provider is justified by these experiments.

## Read the evidence

- [DECISIONS.md](DECISIONS.md): all 15 verified donors, exact source links, equivalents, gaps, license obligations, proposed integration, measurable targets, cost, decision and unknowns.
- [SOURCE_AUDIT.json](SOURCE_AUDIT.json): full source commit/tree pins, selected file hashes and declaration anchors, releases, assets and component-license boundaries.
- [BENCHMARK_RESULTS.json](BENCHMARK_RESULTS.json): comparisons and per-invocation exit, wall time, sampled resource consumption, fixture identities and harness hashes.
- [REA_EVIDENCE.json](REA_EVIDENCE.json): actual official MCP evidence IDs, artifact/JavaScript coverage and limitations.
- [evidence.zip](evidence.zip): sanitized stdout/stderr, producer reports, original-input and published-byte hashes, frozen fixture bytes, exact harness snapshots, locks, attribution, pilot errors and REA bundle derivative. `MANIFEST.json` inventories every member.
- [REPLAY_LOCK.json](REPLAY_LOCK.json) and [replay.py](replay.py): pinned acquisition and verification/replay, without refreshing to latest.
- [ROADMAP.md](ROADMAP.md): proposed engineering sequence and disqualifying conditions. It does not authorize implementation.

## Exact live internal frontier

Canonical main remained `ea93553a5423fd47f12a6bf282820dd199b994d4` during this investigation. Production sources and dependency manifests are unchanged on this research branch.

| Surface | Existing behavior | What is still absent / proposed |
| --- | --- | --- |
| `ascout check` | Existing source-bound native runner execution, admission, widening, coverage and receipt contracts | A new graph or engine must not replace the current conservative rules |
| Python | `src/tools/pytest.ts` plans native full pytest | A qualified Python impact selector is not present there |
| `ascout test --profile deep --format json` | Executed CLI renders a DEEP plan with budgets, effect classes and zero model/network/cost budgets; exit 0 | That plan is not test execution; mutation/property/etc. observation contracts exist separately |
| `ascout security --format json` | Executed CLI returns `NOT_RUN`, reason `ENGINE_NOT_EXECUTED_IN_UA_P06`, exit 1 | A qualified live Sentrdel executable is not admitted by that report |
| `ascout review --format json` | Executed CLI returns an absence report: `UNAVAILABLE`, `NOT_RUN`, incomplete scope; exit 0 | Process exit 0 is not an executed-review or quality PASS |
| Security internals | Extensive Sentrdel evidence, findings-input, coverage, normalization, SARIF, reproduction, retest and invariant contracts | They do not prove security engines ran or that source is secure |
| Mutation | `normalizeExternalMutationOutputV1` already carries source/head/digest, attempted/killed/survived and blockers | A real Stryker producer translator and runner qualification are still engineering work |
| Browser | Existing Playwright executor, locators, evidence, journeys, oracles and mapping; the adapter documents a bounded assertion subset | The tested role-action/text-assertion behavior can inform a narrow extension; another framework is unnecessary |

Sentrdel live main is exactly Ascout's existing pin `f5747319a50831ef7cee983d253c0ca5503c9a64`, tree `0d70de477fa403a416a8cff5576498e4c59a1689`. It already embeds `ast-grep-core=0.45.2`, has bounded JS/TS structural rules, GitHub/AWS secret rules, Cargo/npm dependency deltas, OSV-compatible cache/transport boundaries, explicit coverage states and a bounded external-engine runner. Its live repository is **PRIVATE**; Ascout's frozen characterization says public. This availability/visibility delta must not be confused with source-pin drift. No Sentrdel binary was available as a release, and no Cargo/target build commands were executed under its analysis policy.

The previous planning research remains authoritative only as a proposal:

- [#597](https://github.com/TheHalfMoon/Ascout/pull/597), head `931a891b7b6d5852ea9cc7d560e368844f546fff`: TesterArmy/PStack adoption is proposed and unratified. Its e2e 0.18.0/web 0.13.0 pins differ from this investigation's executed 0.21.2/0.15.2; both current package tags resolve to `393005aa6952eaef62886cd03c8d8060f8f05a4f`.
- [#635](https://github.com/TheHalfMoon/Ascout/pull/635), head `b6056e188108e30d5aff780cc0cb25f21d1211ab`: UA-P07 is `PROPOSED / NOT_EFFECTIVE / FOUNDER_APPROVAL_REQUIRED`. This research does not ratify it.
- Cloudflare Security Audit Skill and PStack were compared only against these existing proposals. Their donor research was not duplicated. PStack was used as a review discipline, not as an independent scanner or implementation authority.

## What was actually reverse engineered

The official **REA MCP** ran as `rea-agents@6.3.0`, npm source commit `74cf9e1401fcd89482fe39c27cc898f5858e9b72`. Its package SRI verified, three installed implementation files matched the official artifact byte-for-byte, and MCP package/catalog identity checks returned **aligned**. The upstream source frontier was separately observed at 6.7.0; that is not the version used for these observations.

Release/source alignment is explicit: reviewdog v0.21.2 resolves to `a431794dd959800d59924993457dc58b32f03cad`; the earlier #636 source inspection used master `73c79487a087e1696b3e70a0ae5d2a7233343567`. This continuation audits the released-source pin separately rather than pretending that master and the shipped binary have the same identity.

REA inventoried the actual released ast-grep and Gitleaks ZIP archives and testmon/in-toto wheels. It analyzed shipped Nx affected-graph JavaScript and unmodified Stryker/TesterArmy module slices, with file-to-package digest mappings. The Nx MCP response exceeded the transport budget; the complete retained result was exported, not treated as truncated or discarded. A semantic trace from `touchedProjects` returned **ambiguous / partial** and retained unknowns. Application inventory completeness is limited to the supplied directory/slice; semantic coverage is not complete program understanding.

Native Windows process capture returned `capability_unavailable`: REA cannot verify descendant cleanup on that platform. Native deep analysis also lacked configured Ghidra and a suitable JDK. Those safety restrictions were respected. No native binary disassembly/decompilation or REA process capture is claimed. Runtime observations came from independently executed, bounded local tests; Linux executables ran under WSL. Source inspection is identified as source inspection.

The published REA bundle is a **sanitized inspection derivative**, not an authenticated original suitable for re-import. Its original export digest and byte count, transformed-byte digest and original evidence IDs are retained. Reproduction must create and export fresh original Evidence. Sanitization changes host paths, not the donor artifact byte digests. No reported `unknowns: 0` at the session-ledger level overrides unknown semantic graph coverage.

## Independent expectations and results

The fixture programs and expected consequences were defined separately from donor output: native full tests establish which regression matters; the literal project graph and failing native tests establish relevant projects; input SARIF establishes the eight observations to account for; boundary examples distinguish correct/incorrect age predicates; local UI state establishes working/broken behavior; explicit artifact rules and byte changes establish integrity outcomes. Source-derived donor-format expectations are distinguished from desired Ascout policy. An independently fetched GitHub advisory supplies the lodash version-match oracle.

| Capability / controlled corpus | Observed result | Interpretation |
| --- | --- | --- |
| testmon: four tests, changed production function | Relevant failing test selected, repeated | Useful narrowing; no general dependency-completeness proof |
| testmon: changed conftest fixture | Relevant failing fixture consumer selected, repeated | Fixture relationship preserved in these cases |
| testmon: changed text input | No selected test, exit 0; native full suite fails, repeated | A non-Python dependency gap must trigger widening |
| pytest-impact: imported production function or text input | Both collected tests deselected, exit 5; native full suite fails | Reject as a general affected-test oracle; fixture-aware scope is narrower |
| Nx: declared library/app edge | Both projects selected; native affected tasks and full control fail appropriately | Graph closure is useful only when the edge model is trustworthy |
| Nx: omitted declared edge | Only library selected despite app import; global nx.json selects all three | Missing relationship knowledge cannot justify deselection |
| reviewdog: eight SARIF results | `added=2`, `file=3`, `diff_context=3`, `nofilter=6`, repeated | Accepted suppression and locationless input disappear; raw accounting must precede filtering |
| reviewdog path spellings | Dot/parent/percent spellings can map to `a.js`; case/absolute cases do not surface in tested added filter | Preserve and validate raw spellings before lossy normalization |
| Stryker: five mutants, strong vs weak native-passing tests | Strong kills 5/5; weak kills 1/5, leaves 4 survivors, repeated | Real test-strength discrimination; weak mutation run can still exit 0 |
| OpenGrep / Semgrep / ast-grep, one structural eval rule | Same built-in and shadowed-name candidates; no string/JSON.parse sentinel match | Candidate observations, not a broad security-accuracy comparison; final valid-script control is recorded |
| Gitleaks | GitHub and GitLab synthetic PAT types detected; plaintext redacted before shared persistence | GitLab type is outside Sentrdel's two enumerated source rules; runtime Sentrdel differential remains NOT_RUN |
| OSV | Online lodash 4.17.20 matches the independent advisory oracle; absent offline vulnerability DB errors explicitly | Inventory-only offline success must not become vulnerability verification |
| Trivy, linked Terraform fixture | Four deliberately false S3 controls reported; fixing them removes those four | Narrow static configuration sensitivity; three other policy suggestions remain |
| in-toto | Strict policy accepts original and rejects changed/missing product and invalid trust/layout cases | Trust/policy must be explicit. MATCH-only acceptance was a fixture policy hole; command alignment is warning-only |
| SLSA Verifier + exact OSV artifact | Valid builder/source provenance verified twice; wrong source, changed artifact and absent provenance rejected | Suitable research acquisition check; not proof of scanner correctness |
| TesterArmy, real local browser | Working journey observed passing; broken state and empty selection rejected; repeated bounded runs retained | No model calls; all later timeout/error observations remain visible and limit platform/reliability claims |

No aggregate winner is manufactured across test selection, mutation, structural matching, secret detection, advisory matching, Terraform policy and provenance. The single structural rule cannot rank security engines. Database/rule freshness, unsupported scope, incomplete extraction, location loss and unavailable processes are separate states.

## Measurements and qualification limits

Each saved invocation records exact argv, exit, stdout/stderr, platform, actual wall time and sampled Windows process-tree RSS/CPU. Final probes also record UTC start, unique execution ID, fixture/cache-input manifest, harness hashes and exact retained harness snapshots. Earlier pilot records are explicitly less bound. Scripts regenerate fixtures; UUIDs, temporary directory names, ephemeral keys and Git timestamps are variable, so compare semantic outcomes and relevant input hashes rather than expecting identical signed bytes.

These are single-host observations under variable host contention. Tool startup and tracing overhead dominate tiny fixtures. Wall/RSS samples are retained, but **no credible project-scale speedup, resource efficiency ranking or statistical false-positive rate has been established**. WSL records sample the Windows launcher, not the Linux target's RSS/CPU. Linux resource use remains unknown.

Ascout typecheck and build passed. Focused security/pytest/selection contracts passed **332 tests / 22 files**. Broad native controls were attempted at 300 seconds and again with the CI-style single Windows worker at 900 seconds; both timed out, with failures retained. Neither is a full-suite PASS, and cause attribution is unresolved. Historical T091 native selection data was inspected: Ascout had three hit and three unavailable cases, full control six hits, zero reported misses. That is historical evidence, not a rerun or permission to reinterpret unavailable as success.

Scratch npm signatures verified **324 packages**, with **130 verified attestations**. The separate npm vulnerability audit reported **four affected package entries**, including a high-severity transitive entry. No production dependency was changed. SRI/checksum verification, signature/provenance verification, license review and vulnerability review are distinct checks.

Windows native runtime observations exist for most fixtures; Linux/WSL observations exist for Trivy and SLSA Verifier. macOS was not executed. TesterArmy upstream recommends WSL on Windows; successful native CDP observations do not establish a supported Windows product configuration. A populated OSV offline DB, broad native donor corpora, Sentrdel runtime qualification and complete cross-platform benchmarking remain open.

## Review and zero-cost tooling

- Official REA MCP: real archive inventory, JavaScript analysis, semantic query and evidence exports; explicit unsupported operations retained.
- PStack: one fresh-context combined review identified privacy, policy-oracle, version, stale-report and replay issues. Corrections and final delta review are recorded in the review artifact. This is research review, not an independent release/security certification.
- Alibaba Open Code Review: installed CLI `delegate preview` used without an LLM/provider call. No Alibaba model verdict is invented.
- Graft: local static build/map used with `DO_NOT_TRACK=1`; no `--deep` or model endpoint. Its graph is navigation assistance, not completeness/security proof.
- Local D1: installed/online; a typed advisory triage succeeded after an initial request-format error. The probability is not approval, verification or a gate.

No paid API, hosted browser, cloud GPU or manually launched hosted CI was used. Public release/registry/advisory/Sigstore requests are separated from offline core feasibility. No token/API key was passed to donor experiments. No production behavior, canonical task authority, UA-P07 status, repository security policy, CI definition or admission flag was changed. Research is published on a separate branch; existing CI is not disabled or bypassed.

## Replay

From this directory, verify retained bytes without running any donor:

```powershell
python replay.py
```

For a new, empty Windows workspace with Python 3.12 and Node 24/npm on PATH:

```powershell
python replay.py --work-dir C:\path\to\new-rea-work --setup
python replay.py --work-dir C:\path\to\new-rea-work --run testmon reviewdog security semgrep opengrep nx impact stryker provenance
python replay.py --work-dir C:\path\to\new-rea-work --run e2e --browser C:\path\to\qualified\chrome.exe
python replay.py --work-dir C:\path\to\new-rea-work --run osv slsa --network
python replay.py --work-dir C:\path\to\new-rea-work --run trivy
```

Setup uses hash-locked Python packages, an exact npm lock with lifecycle scripts disabled, and pinned binary SHA256 values. It refuses an existing setup directory. WSL Ubuntu is needed for the Linux executables. No browser is silently downloaded. The acquisition helper's `latest` discovery is historical authoring code; the frozen replay uses `REPLAY_LOCK.json` and the archived locks. Do not use a refreshed latest version as a reproduction of this investigation.

REA itself must be replayed through the official MCP, using archive inputs and the unmodified shipped-module slices described in `metadata/rea-input-slices.json` in the evidence ZIP. The ordinary test script does not masquerade as REA process capture. Inspect per-tool unknowns and independent oracle comparisons; a controller returning 0 does not mean every donor test passed.

Replay verification was executed locally, including archive/member integrity and the provenance orchestration path. Fresh-machine setup was not executed and remains unqualified. Replay fixes also passed bounded regression probes for stale browser reports and missing installed binaries; the Nx replay includes native baseline and mutated full-test controls. See REVIEW.md for exact review scope and reconciled findings.
