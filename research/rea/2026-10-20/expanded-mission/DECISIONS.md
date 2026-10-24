# Candidate decisions

Status: research recommendations only. No production change is authorized by this document.

| Candidate | Tier | Decision | Tested scope |
| --- | --- | --- | --- |
| Sentrdel | A | **ADAPT** | Source + Ascout contract controls; donor runtime NOT_RUN |
| pytest-testmon | A | **BENCHMARK FURTHER** | Finite executable fixtures; source audit |
| Nx | A | **ADAPT** | Finite executable fixtures; source audit |
| reviewdog | A | **ADAPT** | Finite executable fixtures; source audit |
| in-toto | A | **BENCHMARK FURTHER** | Finite executable fixtures; source audit |
| StrykerJS | B | **ADAPT** | Finite executable fixtures; source audit |
| OpenGrep | B | **BENCHMARK FURTHER** | Finite executable fixtures; source audit |
| ast-grep | B | **ADAPT** | Finite executable fixtures; source audit |
| OSV-Scanner | B | **BENCHMARK FURTHER** | Finite executable fixtures; source audit |
| Gitleaks | B | **BENCHMARK FURTHER** | Finite executable fixtures; source audit |
| TesterArmy E2E | B | **ADAPT** | Finite executable fixtures; source audit |
| Semgrep OSS | C | **REJECT** | Finite executable fixtures; source audit |
| Trivy | C | **BENCHMARK FURTHER** | Finite executable fixtures; source audit |
| pytest-impact | C | **REJECT** | Finite executable fixtures; source audit |
| SLSA Verifier | C | **ADOPT** | Finite executable fixtures; source audit |

## Sentrdel — ADAPT

Source: `TheHalfMoon/Sentrdel@f5747319a50831ef7cee983d253c0ca5503c9a64` (`f5747319a50831ef7cee983d253c0ca5503c9a64`). License: **Apache-2.0**. Retain license/copyright, mark modifications, preserve applicable NOTICE attribution and patent terms.

**Existing equivalent:** Ascout already has source pin, engine descriptor, request/response authority checks, evidence/coverage normalization, SAST/secrets/dependency/IaC/CI normalization, SARIF interchange, reproduction and remediation contracts.

**Demonstrated gap:** Runtime admission and a released executable are not qualified; the CLI still reports NOT_RUN. Live repository visibility is PRIVATE while the frozen characterization says public. Source pin and tree are unchanged.

**Tested behavior:** Inspected Rust EvidenceAuthority::seal, Evidence::verify_identity, CoverageRecord, TrustedExecutable::resolve, run_engine_process, structural matching, secret rules, lockfile delta and OSV lookup/cache. No Sentrdel binary or Cargo command executed. The 332 focused Ascout tests qualify contracts, not donor detection.

**Proposed integration:** Reuse current Ascout/Sentrdel boundary and observation types. Reconcile live availability metadata separately from immutable source identity. Qualify an explicit executable identity and effect admission before any runtime bridge; no UA-P07 authorization follows.

**Measurable benefit / target:** Target zero duplicated evidence authorities and zero unavailable-to-PASS promotions. This is a proposed acceptance target, not a measured detection improvement.

**Complexity and performance cost:** Low for metadata reconciliation; substantial qualification for a real process bridge. Keep Rust optional and outside the Node core.

**Unknowns and limits:** No runtime accuracy, false-positive, latency or process-containment benchmark for Sentrdel. Private source availability requires authorized access.

Exact source anchors: [crates/sentrdel-schema/src/evidence.rs](https://github.com/TheHalfMoon/Sentrdel/blob/f5747319a50831ef7cee983d253c0ca5503c9a64/crates/sentrdel-schema/src/evidence.rs), [crates/sentrdel-schema/src/coverage.rs](https://github.com/TheHalfMoon/Sentrdel/blob/f5747319a50831ef7cee983d253c0ca5503c9a64/crates/sentrdel-schema/src/coverage.rs), [crates/sentrdel-engine/src/runner.rs](https://github.com/TheHalfMoon/Sentrdel/blob/f5747319a50831ef7cee983d253c0ca5503c9a64/crates/sentrdel-engine/src/runner.rs), [crates/sentrdel-review/src/structural.rs](https://github.com/TheHalfMoon/Sentrdel/blob/f5747319a50831ef7cee983d253c0ca5503c9a64/crates/sentrdel-review/src/structural.rs), [crates/sentrdel-review/src/secrets.rs](https://github.com/TheHalfMoon/Sentrdel/blob/f5747319a50831ef7cee983d253c0ca5503c9a64/crates/sentrdel-review/src/secrets.rs), [crates/sentrdel-review/src/osv.rs](https://github.com/TheHalfMoon/Sentrdel/blob/f5747319a50831ef7cee983d253c0ca5503c9a64/crates/sentrdel-review/src/osv.rs).

## pytest-testmon — BENCHMARK FURTHER

Source: `tarpas/pytest-testmon@dccc58d2ed8edec98096ff1974acb7c07d3e3482` (`v2.2.0`). License: **MIT**. Retain upstream copyright and permission notice in copies/substantial portions.

**Existing equivalent:** src/tools/pytest.ts currently plans native pytest; src/selection.ts already implements conservative widening for JS/TS. Python affected selection is not implemented there.

**Demonstrated gap:** A potential Python selection optimization exists, but non-Python data dependencies are not made complete by coverage history.

**Tested behavior:** Two independent four-test fixtures per case. Changed Python function and conftest fixture each select the one relevant failing test; changed text input selects none and exits 0, while native full pytest fails. No measurable speed advantage on this tiny corpus.

**Proposed integration:** Optional project-installed --testmon only after a complete initial native run, source/environment/cache identity checks, selection accounting, and full-suite widening for untracked dependency classes. Never copy the SQLite cache into core truth.

**Measurable benefit / target:** Observed selection reduction from four to one for source/fixture cases; observed data-input recall 0/1. Proposed target is zero missed relevant tests after widening on a representative Python corpus.

**Complexity and performance cost:** Initial full run, coverage tracing and local SQLite cache; optional Python dependency. Tiny-fixture selected runs were often slower than full runs.

**Unknowns and limits:** Large Python projects, subprocess/HTTP/native-extension imports, environment changes, branch-history cache reuse and interactions with coverage plugins remain unqualified.

Exact source anchors: [testmon/pytest_testmon.py](https://github.com/tarpas/pytest-testmon/blob/dccc58d2ed8edec98096ff1974acb7c07d3e3482/testmon/pytest_testmon.py), [testmon/testmon_core.py](https://github.com/tarpas/pytest-testmon/blob/dccc58d2ed8edec98096ff1974acb7c07d3e3482/testmon/testmon_core.py), [testmon/process_code.py](https://github.com/tarpas/pytest-testmon/blob/dccc58d2ed8edec98096ff1974acb7c07d3e3482/testmon/process_code.py), [testmon/db.py](https://github.com/tarpas/pytest-testmon/blob/dccc58d2ed8edec98096ff1974acb7c07d3e3482/testmon/db.py).

## Nx — ADAPT

Source: `nrwl/nx@2b305ee85b8db033e4ab998f31282cbff66ac2a8` (`23.3.0`). License: **MIT**. Retain upstream copyright and permission notice in copies/substantial portions.

**Existing equivalent:** src/selection.ts widening, native Jest/Vitest related execution, selection accounting and native benchmark corpus already exist.

**Demonstrated gap:** Workspace-dependent project ownership can supplement runner selection; an incomplete project graph is not a completeness oracle.

**Tested behavior:** Three-project fixture: explicit lib-to-app relation selects lib+app, and affected tasks and full native tests observe both regressions. Without the declared edge, in-process graph generation selects only lib despite the app importing it. nx.json change selects all three. Isolated plugin workers also failed on Windows in pilot runs; those errors are not selection misses.

**Proposed integration:** Consume the project-local Nx affected graph only in projects already using Nx. Preserve raw graph identity and project/config inputs, and widen on missing ownership or dependency closure. Do not add mandatory Nx or Nx Cloud.

**Measurable benefit / target:** Observed 2/3 projects selected with explicit graph; incomplete graph misses one of two relevant projects. Proposed target: zero silent dependent omissions, not an assumed speedup.

**Complexity and performance cost:** In-process selection about 2–3 seconds on the small fixture; isolated worker startup much larger. Scratch npm audit reported transitive vulnerabilities; this is not a shipping-qualified dependency set.

**Unknowns and limits:** Real monorepo plugin inference, generated files, package-manager changes, cycles, task cache truth and non-Windows native qualification.

Exact source anchors: [packages/nx/src/project-graph/affected/affected-project-graph.ts](https://github.com/nrwl/nx/blob/2b305ee85b8db033e4ab998f31282cbff66ac2a8/packages/nx/src/project-graph/affected/affected-project-graph.ts), [packages/nx/src/project-graph/affected/affected-projects.ts](https://github.com/nrwl/nx/blob/2b305ee85b8db033e4ab998f31282cbff66ac2a8/packages/nx/src/project-graph/affected/affected-projects.ts).

## reviewdog — ADAPT

Source: `reviewdog/reviewdog@a431794dd959800d59924993457dc58b32f03cad` (`v0.21.2`). License: **MIT**. Retain upstream copyright and permission notice in copies/substantial portions.

**Existing equivalent:** Ascout review raw observation binding, strict location validator, finding normalization and coverage accounting already exist.

**Demonstrated gap:** Producer suppression, locationless input and diff-filter exclusions need explicit accounting before presentation.

**Tested behavior:** Eight input results yield 2 added / 3 file / 3 diff_context / 6 nofilter diagnostics, repeated. Accepted suppression and locationless input disappear; under-review suppression remains. Dot, parent-normalized and percent-encoded paths can map to a.js; case and absolute spellings did not surface in the added-mode fixture. Malformed SARIF exits 1; error diagnostics otherwise exit 0.

**Proposed integration:** Adapt mode/location behavior into existing review contracts while retaining raw input cardinality, unresolved locations and suppression uncertainty. Validate original path spelling before donor normalization. Keep publication as a separate effect.

**Measurable benefit / target:** Proposed target: account for all eight fixture inputs, including the two donor omissions; zero silently repaired path identities. No claim that donor output alone is a complete scan.

**Complexity and performance cost:** Small mapping/accounting layer; optional Go CLI only for comparison. Runtime output is fast after startup but no cross-tool performance ranking is inferred.

**Unknowns and limits:** Renames, deleted-side diagnostics, full URI-base combinations, Unicode/case collisions, CRLF and multi-location cardinality still require a larger qualification matrix.

Exact source anchors: [parser/sarif.go](https://github.com/reviewdog/reviewdog/blob/a431794dd959800d59924993457dc58b32f03cad/parser/sarif.go), [filter/filter.go](https://github.com/reviewdog/reviewdog/blob/a431794dd959800d59924993457dc58b32f03cad/filter/filter.go), [filter/diff_filter.go](https://github.com/reviewdog/reviewdog/blob/a431794dd959800d59924993457dc58b32f03cad/filter/diff_filter.go).

## in-toto — BENCHMARK FURTHER

Source: `in-toto/in-toto@c82fe5d21aaa61c7f1a213db20a46f10bb3f411a` (`v3.1.0`). License: **Apache-2.0**. Retain license/copyright, mark modifications, preserve applicable NOTICE attribution and patent terms.

**Existing equivalent:** Ascout has canonical evidence digests, source start/end identity, engine identity and durable workflow provenance; it does not need another truth kernel.

**Demonstrated gap:** Optional cryptographic export or cross-party handoff of existing receipts needs an explicit trust-root and policy model.

**Tested behavior:** Repeated ephemeral Ed25519 probes: strict REQUIRE/MATCH/DISALLOW policy accepts original bytes and rejects changed/missing product, wrong/missing trust root, altered layout signature and expiry. A permissive MATCH-only fixture accepted tampering; this is a fixture-policy counterexample. A re-signed expected-command mismatch remains warning-only by design. Failed process return 7 can be recorded in a signed link.

**Proposed integration:** Optional export/verification around existing canonical receipts. Require artifact presence/closure rules, exact command policy outside warning-only alignment, explicit key ownership and source binding; signatures cannot manufacture verification success.

**Measurable benefit / target:** Observed strict-policy tamper rejection; proposed target zero promotions from signed-but-failed, incomplete or wrong-source evidence.

**Complexity and performance cost:** Python/crypto dependencies, key distribution and revocation, layout policy and extra artifact hashing. No mandatory signing service or Python runtime for core.

**Unknowns and limits:** Key lifecycle, multi-party threshold policy, DSSE interop, complete source inventory and hostile build execution are not qualified.

Exact source anchors: [in_toto/runlib.py](https://github.com/in-toto/in-toto/blob/c82fe5d21aaa61c7f1a213db20a46f10bb3f411a/in_toto/runlib.py), [in_toto/verifylib.py](https://github.com/in-toto/in-toto/blob/c82fe5d21aaa61c7f1a213db20a46f10bb3f411a/in_toto/verifylib.py), [in_toto/models/layout.py](https://github.com/in-toto/in-toto/blob/c82fe5d21aaa61c7f1a213db20a46f10bb3f411a/in_toto/models/layout.py), [in_toto/models/link.py](https://github.com/in-toto/in-toto/blob/c82fe5d21aaa61c7f1a213db20a46f10bb3f411a/in_toto/models/link.py).

## StrykerJS — ADAPT

Source: `stryker-mutator/stryker-js@cb3bd8fe25d5215422c9b632357062d3a43fcf92` (`v10.0.0`). License: **Apache-2.0**. Retain license/copyright, mark modifications, preserve applicable NOTICE attribution and patent terms.

**Existing equivalent:** src/assurance/test/mutation-adapter.ts already normalizes attempted/killed/survived counts, source identity, digest and limitations.

**Demonstrated gap:** A real producer adapter can populate existing observation contracts; test planning alone does not execute mutation testing.

**Tested behavior:** Both native suites pass. Boundary-sensitive suite kills 5/5 mutants twice; weak type-only suite kills 1/5 and leaves 4 survivors twice. Default mutation process still exits 0 for the weak suite. Used command runner with coverageAnalysis=off, not Vitest/per-test coverage selection.

**Proposed integration:** Thin Stryker JSON translator into the existing mutation adapter, opt-in and budgeted. Preserve each survivor and unresolved timeout/no-coverage/error state; do not map process exit 0 to quality PASS.

**Measurable benefit / target:** Observed four weak-test survivors hidden by ordinary passing tests. Proposed target lossless survivor accounting on source-bound native projects.

**Complexity and performance cost:** Repeated scratch runs show mutation costs well above the subsecond native test. See BENCHMARK_RESULTS for every wall/RSS sample; host contention prevents a stable production latency estimate.

**Unknowns and limits:** Vitest integration, per-test selection, equivalent mutants, timeout/no-coverage classification and large project costs remain unqualified.

Exact source anchors: [packages/core/src/mutants/mutant-test-planner.ts](https://github.com/stryker-mutator/stryker-js/blob/cb3bd8fe25d5215422c9b632357062d3a43fcf92/packages/core/src/mutants/mutant-test-planner.ts), [packages/core/src/mutants/test-coverage.ts](https://github.com/stryker-mutator/stryker-js/blob/cb3bd8fe25d5215422c9b632357062d3a43fcf92/packages/core/src/mutants/test-coverage.ts), [packages/core/src/mutants/incremental-differ.ts](https://github.com/stryker-mutator/stryker-js/blob/cb3bd8fe25d5215422c9b632357062d3a43fcf92/packages/core/src/mutants/incremental-differ.ts).

## OpenGrep — BENCHMARK FURTHER

Source: `opengrep/opengrep@87668f6dbd28a9b97bcaf294a564fe79e0a7b56e` (`v1.31.0`). License: **LGPL-2.1**. Review exact component and linking-exception text; preserve notices and applicable source/relinking obligations for redistribution. A separate process does not remove license obligations.

**Existing equivalent:** Sentrdel already embeds ast-grep for bounded native structural rules; Ascout already normalizes SAST observations.

**Demonstrated gap:** Potential broader rule/language/dataflow coverage has not been established by the single structural rule. Local diagnostic metadata is richer than the compared Semgrep JSON output.

**Tested behavior:** Released Windows executable with a local eval($X) rule repeatedly returns danger.js and shadow.js and no safe.js match, exit 0. It retains source lines, fingerprints and metavariables. The shadowed eval parameter is a false positive for a built-in-eval security claim, not a proven vulnerability. Missing local rule exits 7. Pilot --metrics flag was unsupported and was corrected.

**Proposed integration:** Optional installed producer behind existing SAST/engine boundary with pinned, separately licensed rules, supported-language/parse-error coverage, bounded output and no automatic rule downloads.

**Measurable benefit / target:** Observed metadata preservation advantage on this output format; no demonstrated security-accuracy advantage over Sentrdel or Semgrep. Require a differential rule corpus before adoption.

**Complexity and performance cost:** Large native executable and rule-pack maintenance; about 4–6 seconds on this tiny corpus. LGPL component and nested-license review required before redistribution.

**Unknowns and limits:** Taint/interfile accuracy, rule-pack licensing, malformed syntax coverage, suppression completeness and full source-to-binary build attestation.

Exact source anchors: [src/osemgrep/cli_scan/Scan_subcommand.ml](https://github.com/opengrep/opengrep/blob/87668f6dbd28a9b97bcaf294a564fe79e0a7b56e/src/osemgrep/cli_scan/Scan_subcommand.ml), [src/osemgrep/reporting/Sarif_output.ml](https://github.com/opengrep/opengrep/blob/87668f6dbd28a9b97bcaf294a564fe79e0a7b56e/src/osemgrep/reporting/Sarif_output.ml).

## ast-grep — ADAPT

Source: `ast-grep/ast-grep@48b54b3120b70fa9e8cbb40a03bf3bfebe6bf50a` (`0.51.0`). License: **MIT**. Retain upstream copyright and permission notice in copies/substantial portions.

**Existing equivalent:** Sentrdel Cargo.toml already pins ast-grep-core=0.45.2 and structural.rs uses AstGrep/Pattern with fixed JS/TS rules.

**Demonstrated gap:** No demonstrated need for a second structural engine. External CLI 0.51.0 is a comparator for rule/location behavior, not evidence that embedded 0.45.2 should be upgraded.

**Tested behavior:** Official released archive inventoried with REA; executable repeatedly finds the two structural eval calls, excludes the string and JSON.parse sentinel, and rejects an unsupported language with exit 2.

**Proposed integration:** Reuse and qualify the embedded Sentrdel matcher/rule boundary. Borrow tested pattern/location cases; avoid mandatory external CLI and repository-supplied dynamic grammars.

**Measurable benefit / target:** Target zero redundant structural engines and explicit parser/language omissions. The fixture does not demonstrate better vulnerability detection than current Sentrdel.

**Complexity and performance cost:** Small incremental rule qualification within existing Rust engine; broader grammars and rules would increase parser, license and performance surface.

**Unknowns and limits:** Embedded-vs-CLI version differential, byte-to-line mapping, malformed syntax and broader language support were not compared at runtime.

Exact source anchors: [crates/core/src/matcher.rs](https://github.com/ast-grep/ast-grep/blob/48b54b3120b70fa9e8cbb40a03bf3bfebe6bf50a/crates/core/src/matcher.rs), [crates/cli/src/run.rs](https://github.com/ast-grep/ast-grep/blob/48b54b3120b70fa9e8cbb40a03bf3bfebe6bf50a/crates/cli/src/run.rs), [crates/cli/src/scan.rs](https://github.com/ast-grep/ast-grep/blob/48b54b3120b70fa9e8cbb40a03bf3bfebe6bf50a/crates/cli/src/scan.rs).

## OSV-Scanner — BENCHMARK FURTHER

Source: `google/osv-scanner@bfe2f84abd2f09fe0b83ba7f6dad40d296762f40` (`v2.7.0`). License: **Apache-2.0**. Retain license/copyright, mark modifications, preserve applicable NOTICE attribution and patent terms.

**Existing equivalent:** Sentrdel has bounded Cargo/npm lockfile deltas, offline advisory fixtures and OSV-compatible lookup/cache; Ascout preserves advisory freshness and reachability unknowns.

**Demonstrated gap:** Potential additional ecosystem extraction and maintained vulnerability data, not replacement of existing evidence semantics.

**Tested behavior:** Released Windows binary repeatedly reports five advisory IDs for synthetic lodash 4.17.20, including independently sourced GHSA-35jh-r3h4-6jhm. Offline inventory-only mode can exit 0 without vulnerability matching; --offline-vulnerabilities with no DB exits 127 and reports the missing database. A corrected malformed package-lock probe reaches the supported JavaScript/package-lock extractor and repeatedly rejects invalid JSON with exit 127. The earlier npm: selector probe was an invalid-extractor harness argument error, not a malformed-JSON test. SLSA provenance of this exact binary verifies.

**Proposed integration:** Prefer existing Sentrdel OSV boundary. If a scanner adds a measured ecosystem/parser gap, admit it as an optional producer and preserve inventory, database identity/freshness, errors and reachability NOT_COMPUTED. Never enable call-analysis build scripts implicitly.

**Measurable benefit / target:** Observed advisory matching and honest missing-DB failure; broader ecosystem benefit remains a source-backed hypothesis.

**Complexity and performance cost:** Approximately 1–2 seconds for a public one-coordinate lookup; network/cache and offline database storage/licensing costs. Offline provisioning was not completed.

**Unknowns and limits:** A populated offline DB, reachability, new ecosystems, partial extraction and database redistribution terms require further qualification.

Exact source anchors: [pkg/osvscanner/osvscanner.go](https://github.com/google/osv-scanner/blob/bfe2f84abd2f09fe0b83ba7f6dad40d296762f40/pkg/osvscanner/osvscanner.go), [pkg/osvscanner/scan.go](https://github.com/google/osv-scanner/blob/bfe2f84abd2f09fe0b83ba7f6dad40d296762f40/pkg/osvscanner/scan.go), [pkg/osvscanner/internal/scanners/lockfile.go](https://github.com/google/osv-scanner/blob/bfe2f84abd2f09fe0b83ba7f6dad40d296762f40/pkg/osvscanner/internal/scanners/lockfile.go).

## Gitleaks — BENCHMARK FURTHER

Source: `gitleaks/gitleaks@83d9cd684c87d95d656c1458ef04895a7f1cbd8e` (`v8.30.1`). License: **MIT**. Retain upstream copyright and permission notice in copies/substantial portions.

**Existing equivalent:** Sentrdel secrets.rs already has GitHub classic PAT and AWS access-key-ID rules and redaction-before-evidence construction.

**Demonstrated gap:** The tested GitLab PAT type is outside that enumerated Sentrdel rule set. This is a source-contract comparison, not a runtime Sentrdel recall measurement.

**Tested behavior:** Two deterministic synthetic tokens produce GitHub and GitLab PAT findings in repeated released-binary runs; the public-ID sentinel does not. --redact=100 removes plaintext from Match/Secret fields before shared persistence. Findings and invalid configuration both exit 1 and must be distinguished by output.

**Proposed integration:** Optional broader secret producer into existing secret normalization. Preserve rule/location metadata and inventory/skipped states, strip secret material before canonical evidence, and qualify a larger negative corpus.

**Measurable benefit / target:** Demonstrated additional GitLab token-type observation relative to Sentrdel's enumerated source rules. No universal secret-detection claim.

**Complexity and performance cost:** Additional binary/rule lifecycle and entropy/allowlist tuning; measured tiny-fixture timings vary with host load and do not predict production cost.

**Unknowns and limits:** History/encoded/archive scanning, large files, allowlists, false-positive rate and redaction completeness on all output surfaces.

Exact source anchors: [detect/detect.go](https://github.com/gitleaks/gitleaks/blob/83d9cd684c87d95d656c1458ef04895a7f1cbd8e/detect/detect.go), [cmd/directory.go](https://github.com/gitleaks/gitleaks/blob/83d9cd684c87d95d656c1458ef04895a7f1cbd8e/cmd/directory.go), [cmd/git.go](https://github.com/gitleaks/gitleaks/blob/83d9cd684c87d95d656c1458ef04895a7f1cbd8e/cmd/git.go).

## TesterArmy E2E — ADAPT

Source: `tester-army/e2e@393005aa6952eaef62886cd03c8d8060f8f05a4f` (`@e2e-dev/testmu@0.0.1`). License: **Apache-2.0**. Retain license/copyright, mark modifications, preserve applicable NOTICE attribution and patent terms.

**Existing equivalent:** Ascout already has a qualified Playwright executor, locator policy, source-bound browser evidence, journeys and oracle contracts. PR #597 proposes optional TesterArmy adoption only.

**Demonstrated gap:** Narrow real browser role-action/text-assertion capability can improve the existing adapter; another complete browser framework is not demonstrated as necessary.

**Tested behavior:** Earlier repeated local CDP journeys passed without model calls; broken click behavior failed and empty selection exited 2. A later bounded positive attempt failed, while its next positive attempt passed. All observations are retained: this is not stable cross-platform qualification. Chromium 153 attaches over loopback CDP. Initial invalid config/locator calls were harness errors, corrected before those observations. Shipped JavaScript slices were analyzed with REA.

**Proposed integration:** Adapt assertion and run-accounting ideas into existing Playwright adapter; keep existing locator/executor/evidence authority. Treat optional external provider execution as code-trust and separately admitted effects.

**Measurable benefit / target:** Observed real UI state assertion discriminates working and broken behavior with zero model tokens. Proposed target: explicit unavailable assertions become qualified outcomes, without replacing core contracts.

**Complexity and performance cost:** Browser/runner startup and cleanup costs varied substantially with host contention. Later bounded positive failure remains material. Telemetry was disabled; no model or remote browser service was used.

**Unknowns and limits:** Upstream documents Windows via WSL; native Windows CDP observations do not establish general Windows support. Mobile, model steps, cache replay, egress policy and broad journeys remain unqualified.

Exact source anchors: [packages/web/src/engine.ts](https://github.com/tester-army/e2e/blob/393005aa6952eaef62886cd03c8d8060f8f05a4f/packages/web/src/engine.ts), [packages/web/src/browser-connection.ts](https://github.com/tester-army/e2e/blob/393005aa6952eaef62886cd03c8d8060f8f05a4f/packages/web/src/browser-connection.ts), [packages/web/src/surface.ts](https://github.com/tester-army/e2e/blob/393005aa6952eaef62886cd03c8d8060f8f05a4f/packages/web/src/surface.ts).

## Semgrep OSS — REJECT

Source: `semgrep/semgrep@72d3525fe7e02f486428386078f192f8c4756804` (`v1.181.0`). License: **LGPL-2.1**. Review exact component and linking-exception text; preserve notices and applicable source/relinking obligations for redistribution. A separate process does not remove license obligations.

**Existing equivalent:** Existing Sentrdel structural/SAST contracts and the optional OpenGrep challenger cover the evaluated producer role.

**Demonstrated gap:** No unique detection benefit demonstrated in the compared rule. Rejection is for adding a redundant default dependency, not a claim that Semgrep is generally inferior.

**Tested behavior:** Released 1.181.0 Windows wheel and CLI repeatedly report the same two eval matches with exit 0 and missing-rule exit 7. JSON lines/fingerprint fields say 'requires login' where the OpenGrep comparator supplied local values. Deprecated python -m invocation was a harness error, then corrected to the installed CLI.

**Proposed integration:** Retain as a comparator for rule/format contracts; do not add a second default producer. If another task proves unique benefit, requalify exact OSS/paid boundaries and rule licenses.

**Measurable benefit / target:** Avoid duplicate engine and dependency cost; no measured recall improvement is asserted for either challenger.

**Complexity and performance cost:** Python plus native engine and LGPL/nested-license obligations. Scratch transitive installation is not a product dependency approval.

**Unknowns and limits:** Other output formats may expose different metadata; no claim that all offline OSS metadata is unavailable. Rule and taint corpora were not broadly evaluated.

Exact source anchors: [cli/src/semgrep/formatter/sarif.py](https://github.com/semgrep/semgrep/blob/72d3525fe7e02f486428386078f192f8c4756804/cli/src/semgrep/formatter/sarif.py), [cli/src/semgrep/commands/scan.py](https://github.com/semgrep/semgrep/blob/72d3525fe7e02f486428386078f192f8c4756804/cli/src/semgrep/commands/scan.py).

## Trivy — BENCHMARK FURTHER

Source: `aquasecurity/trivy@531360e5d2a88e732373f1614ba99a38738538b8` (`v0.76.0`). License: **Apache-2.0**. Retain license/copyright, mark modifications, preserve applicable NOTICE attribution and patent terms.

**Existing equivalent:** Ascout already normalizes IaC/CI observations; Sentrdel has bounded configuration and workflow detection, not a qualified general Terraform execution path here.

**Demonstrated gap:** Offline embedded Terraform checks may cover a concrete configuration class, but a second broad vulnerability engine is not justified by this fixture.

**Tested behavior:** Linux release runs in WSL. A linked S3 bucket/public-access-block fixture produces seven configuration findings including four deliberately false block controls. Setting those four controls true removes those four while other policy suggestions remain. An unlinked pilot resource produced no findings. Empty vulnerability DB with updates disabled fails explicitly.

**Proposed integration:** Optional IaC producer only after differential fixture qualification. Preserve the exact check bundle, static configuration uncertainty, files skipped and vulnerability-DB state.

**Measurable benefit / target:** Observed sensitivity to four linked Terraform controls; no runtime cloud-posture, exploitability or broad false-positive conclusion.

**Complexity and performance cost:** Large binary, check bundle and vulnerability DB for SCA. WSL target RSS/CPU were not measured; recorded Windows wrapper samples are not Linux resource measurements.

**Unknowns and limits:** Terraform modules/variables, provider versions, policy applicability, secret/SCA modes and native Windows/macOS behavior.

Exact source anchors: [pkg/db/db.go](https://github.com/aquasecurity/trivy/blob/531360e5d2a88e732373f1614ba99a38738538b8/pkg/db/db.go), [pkg/flag/db_flags.go](https://github.com/aquasecurity/trivy/blob/531360e5d2a88e732373f1614ba99a38738538b8/pkg/flag/db_flags.go).

## pytest-impact — REJECT

Source: `az-pz/pytest-impact@4498038f89004c45788df974a2111af746983ea0` (`v0.1.0`). License: **MIT**. Retain upstream copyright and permission notice in copies/substantial portions.

**Existing equivalent:** Native full pytest is the current conservative control; testmon provides a separately tested coverage-history candidate.

**Demonstrated gap:** The inspected selector focuses on tests, fixtures and conftest surfaces; it does not establish arbitrary production import or text-data dependency closure.

**Tested behavior:** Pinned v0.1.0 source plugin executes against two collected tests. A changed imported production function and a changed text input each deselect both tests, exit 5, while corresponding full native runs fail; repeated. This is scoped behavior of the fixture-aware selector, not a donor vulnerability allegation.

**Proposed integration:** Reject as a general affected-test oracle for Ascout. Fixture/conftest widening ideas may inform an independently qualified conservative policy.

**Measurable benefit / target:** Avoid the demonstrated missed relevant test when selecting production/data changes. Do not use zero-selection exit as success.

**Complexity and performance cost:** Small optional Python plugin but static inference and fallback configuration have maintenance costs.

**Unknowns and limits:** Fixture-specific benefits, user-configured fallback patterns and broader native donor tests were not qualified. Executed source plugin, not a wheel artifact.

Exact source anchors: [src/pytest_impact/plugin.py](https://github.com/az-pz/pytest-impact/blob/4498038f89004c45788df974a2111af746983ea0/src/pytest_impact/plugin.py), [src/pytest_impact/selection.py](https://github.com/az-pz/pytest-impact/blob/4498038f89004c45788df974a2111af746983ea0/src/pytest_impact/selection.py), [src/pytest_impact/gitio.py](https://github.com/az-pz/pytest-impact/blob/4498038f89004c45788df974a2111af746983ea0/src/pytest_impact/gitio.py), [src/pytest_impact/astdiff.py](https://github.com/az-pz/pytest-impact/blob/4498038f89004c45788df974a2111af746983ea0/src/pytest_impact/astdiff.py).

## SLSA Verifier — ADOPT

Source: `slsa-framework/slsa-verifier@ea584f4502babc6f60d9bc799dbbb13c1caa9ee6` (`v2.7.1`). License: **Apache-2.0**. Retain license/copyright, mark modifications, preserve applicable NOTICE attribution and patent terms.

**Existing equivalent:** Ascout source/digest binding exists, but ordinary downloaded-artifact checksum comparison does not authenticate the build/source claim.

**Demonstrated gap:** Research artifact acquisition benefits from verifier-backed builder/source binding.

**Tested behavior:** Official v2.7.1 Linux binary verifies OSV-Scanner v2.7.0 Windows executable against published provenance twice, matching builder and source commit bfe2f84abd2f09fe0b83ba7f6dad40d296762f40. Wrong source, changed artifact and omitted provenance are rejected.

**Proposed integration:** ADOPT for the research acquisition procedure where supported provenance exists. This does not add production runtime behavior, install a required service or authorize scanner execution.

**Measurable benefit / target:** Observed rejection of checksum/source substitution cases that a locally computed digest alone cannot authenticate.

**Complexity and performance cost:** Optional verifier executable and Sigstore trust bootstrap/cache; no paid service. WSL wrapper timing includes verification/network work and is not a microbenchmark.

**Unknowns and limits:** Air-gapped trust-root bootstrap, other builders and producer-specific provenance formats remain unqualified; provenance does not prove tool correctness or license compliance.

Exact source anchors: [cli/slsa-verifier/verify/verify_artifact.go](https://github.com/slsa-framework/slsa-verifier/blob/ea584f4502babc6f60d9bc799dbbb13c1caa9ee6/cli/slsa-verifier/verify/verify_artifact.go), [cli/slsa-verifier/verify/options.go](https://github.com/slsa-framework/slsa-verifier/blob/ea584f4502babc6f60d9bc799dbbb13c1caa9ee6/cli/slsa-verifier/verify/options.go).
