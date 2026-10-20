# Ascout REA: competitive verification engines (evidence-first)

> Status: **RESEARCH / NOT_IMPLEMENTED / NOT_AUTHORIZATION**.
> Date: 2026-10-20. Ascout canonical baseline inspected: `ea93553a5423fd47f12a6bf282820dd199b994d4`.
> All conclusions marked EXECUTED refer only to synthetic Windows black-box checks against reviewdog, not to Ascout execution.

## Mission and current frontier

Ascout's differentiator is exact-source, evidence-bound verification, not another general-purpose AI code reviewer. This REA examines open-source components and observable behavior that might improve affected-code selection, review diagnostics, test strength, security observations, and audit orchestration without inventing evidence or changing trust boundaries.

Source inspection of Ascout main:
- `src/assurance/review/review-command.ts`: structured review normalization/absence/correlation exists; default live engine is unavailable.
- `src/assurance/test/test-plan-command.ts`: `ascout test` renders a plan, not an executed test profile.
- `src/assurance/security/security-command.ts`: `ascout security` deliberately emits `NOT_RUN` with exit 1; Sentrdel was not executed in UA-P06.
- `src/assurance/security/sentrdel-sarif-import.ts`: bounded SARIF is an **INFERENCE**-class interchange observation; not canonical truth or a finding.
- `README.md`: `ascout check` works on trusted local repos; changed effective command surfaces require per-invocation human admission.
- PR #635 and issue #634: UA-P07 deep security audit is a proposal, not an effective authorization. No REA recommendation overrides that gate.

## Evidence classification

- **EXECUTED**: official donor binary verified by digest and run on a bounded synthetic fixture, with raw output saved here.
- **SOURCE_INSPECTED**: pinned source code read at a known revision; behavior inferred from implementation, not independently executed.
- **DOC_INSPECTED**: upstream documentation / license read; applicability only proposed.
- **UNTESTED**: no runtime claim. Planned comparisons are not results.

## Donor matrix

| Donor | Evidence | Source/license | Useful transplant or independently authored behavior | Major caveat |
| --- | --- | --- | --- | --- |
| reviewdog | **EXECUTED + SOURCE_INSPECTED** | MIT; `73c79487a087e1696b3e70a0ae5d2a7233343567` | Diff-aware location mapping, review formatting, separate surfaced vs hidden observations | Acceptable SARIF suppressions are dropped upstream; do not mistake filtered output for complete scan |
| Nx | **SOURCE_INSPECTED** | MIT; `48b15f3bd73a4b4bba328009b491d47e89202db9` | Touched project locators + reverse dependency graph for monorepo affected selection | A dependency graph cannot be assumed complete; ambiguous config and source links must produce unresolved state |
| StrykerJS | **DOC_INSPECTED** | Apache-2.0; examined `c931a93237816901f1e9f48da411170beeb3dfca` Vitest docs | Optional mutation-based strength checks for DEEP/RELEASE profile | Expensive, runner-dependent, tests outside import graph may be missed |
| Semgrep OSS | **SOURCE_LOCATED + LICENSE_INSPECTED** | LGPL-2.1; SARIF output modules in `51602ad27f09ef9342a5620601de5ef8f572fbc6` | Source-backed rule diagnostics and SARIF producer contracts | Distribution/linking/modified-code license obligations; OSS/paid capability boundary; no engine qualified here |
| Cloudflare security-audit-skill | **DOC_INSPECTED** | MIT; proposed donor in PR #635 | Architecture mapping, coverage ledger, distinct hunter/verifier, disconfirmation, reproduction | Agent/model workflow conflicts with default deterministic/no-required-LLM constraint; proposal not authorized |
| OpenSSF Scorecard | **DOC + LICENSE_INSPECTED** | Apache-2.0 | Optional repository security posture heuristics | Remote repository metadata and scores are not local source proof |
| CodeQL CLI | **LICENSE_INSPECTED; EXCLUDED FROM TRANSPLANT** | CLI license separately restricted, despite MIT queries | Refer to SARIF interoperability only | Private-repo/commercial automation terms and reverse-engineering restrictions make it unsuitable as a general donor under zero-cost requirements |

### Direct code anchors

**reviewdog (read source; pinned `73c7948`)**
- https://github.com/reviewdog/reviewdog/blob/73c79487a087e1696b3e70a0ae5d2a7233343567/filter/filter.go
- https://github.com/reviewdog/reviewdog/blob/73c79487a087e1696b3e70a0ae5d2a7233343567/filter/diff_filter.go
- https://github.com/reviewdog/reviewdog/blob/73c79487a087e1696b3e70a0ae5d2a7233343567/parser/sarif.go
- `FilterCheck` records `ShouldReport`, `InDiffFile` and `InDiffContext` separately. `DiffFilter.ShouldReport` has distinct `added`, `diff_context`, `file`, and `nofilter` modes. SARIF parsing can drop accepted suppressions before filtering. This code does *not* itself prove that every diagnostic was collected.

**Nx (read source; pinned `48b15f3`)**
- https://github.com/nrwl/nx/blob/48b15f3bd73a4b4bba328009b491d47e89202db9/packages/nx/src/project-graph/affected/affected-project-graph.ts
- `filterAffected` locates touched projects, reverses the project graph, traverses dependent nodes, and reconstructs affected edges. Shared visited sets reduce redundant traversal. This is an algorithmic reference, not evidence that Nx was run against an Ascout corpus.

**StrykerJS (read upstream docs; pinned `c931a93`)**
- https://github.com/stryker-mutator/stryker-js/blob/c931a93237816901f1e9f48da411170beeb3dfca/docs/vitest-runner.md
- Documents `vitest.related=true` and per-test mutation coverage. Source-to-test import selection misses tests that access code only through remote/API calls. No Stryker mutation benchmark has been run here.

**Semgrep, Cloudflare, Scorecard**
- https://github.com/semgrep/semgrep/blob/51602ad27f09ef9342a5620601de5ef8f572fbc6/cli/src/semgrep/formatter/sarif.py
- https://github.com/cloudflare/security-audit-skill
- https://github.com/ossf/scorecard
- These are *next investigation candidates*, not verified donor execution.

**CodeQL exclusion**
- https://github.com/github/codeql-cli-binaries/blob/main/LICENSE.md
- Do not reverse engineer the separately licensed CodeQL CLI or incorporate its binary as a default commercial scanner absent an appropriate license.

## Executed reviewdog black-box experiment

Environment: connected Windows device; Node v24.19.0, Git v2.56.0.windows.2, reviewdog v0.21.2.
Binary: official GitHub release asset `reviewdog_0.21.2_Windows_x86_64.tar.gz`.
Verified archive SHA-256: `397959e250bfc6bc801fba34b7d4922f2eaa4763deacf7d32ef11bffb284a315`.
The archive matched the release's published digest. No provider credentials, API calls, or real project source were used by the experiment.
Target git fixture: `a.js` line 2 changed from 2 to 20; `b.js` unchanged.
Synthetic SARIF has four rules: `R-CHANGED` at a.js:2; `R-UNCHANGED` at a.js:3; `R-OTHER` at b.js:1; `R-SUPPRESSED` at a.js:2 with accepted external suppression.

| Input mode | Expected visible | Actual visible | CLI exit |
| --- | --- | --- | --- |
| `-filter-mode=added` | R-CHANGED | R-CHANGED | 0 |
| `-filter-mode=file` | R-CHANGED, R-UNCHANGED | R-CHANGED, R-UNCHANGED | 0 |
| `-filter-mode=nofilter` | R-CHANGED, R-UNCHANGED, R-OTHER | R-CHANGED, R-UNCHANGED, R-OTHER | 0 |

`R-SUPPRESSED` was not emitted under any tested mode. This corroborates parser suppression handling, but **does not prove** how other suppression statuses or every SARIF extension behaves.
The `rdjson` reporter exited 0 despite synthetic error diagnostics: process success != security/quality PASS.

Reproduction assets:
- `reviewdog/run-fixture.mjs`: reconstructs the isolated Git fixture and repeats all three probes; requires Node, Git, and the verified `reviewdog.exe` inside `%TEMP%/ascout-rea-20261020/`.
- `reviewdog/evidence.json`: original full captured stdout/stderr, SHA of synthetic Git baseline, Git diff, actual rule IDs, exit codes.
- Reproduction rerun should compare **rule sets**, not the synthetic Git commit SHA: Git commit time is variable.

## Ascout-oriented findings and implementation candidate boundaries

1. **Critical — observation ledger before filtering.** Build an append-only normalized internal observation set bound to donor identity, tool version, exact source snapshot, and raw evidence digest. Report separate totals for raw parsed, suppressed-by-producer (when knowable), excluded-by-diff, invalid, reviewed and unreviewed. If upstream suppressions are unobservable, mark suppression completeness **UNKNOWN**, never 0. Do not upgrade SARIF severity into verified Ascout assurance.
2. **High — location fidelity before annotation.** Preserve exact path spelling, Git source start, new/old-side line mapping and changed-hunk status. Treat rename/case/encoding/abs-path conflicts as UNRESOLVED, not as silently missing findings. Leverage existing Ascout canonical path validation and source-drift protection rather than importing reviewdog's path normalization indiscriminately.
3. **High — monorepo affected tests.** Qualify touched-project ownership, reverse reachability, source closure and tests *independently* before reporting selection completeness. Compare to project-native Nx/Jest/Vitest oracles on frozen fixtures; require fail-closed semantics when graphs/configurations are incomplete. Maintain no arbitrary shell reconstruction and never auto-admit changed command surfaces.
4. **Medium — deep mutation strength.** Introduce only opt-in, bounded `DEEP`/`RELEASE` mutation experiments after official task execution exists. Preserve `SURVIVED`, `KILLED`, `TIMED_OUT`, `NO_COVERAGE`, `NOT_RUN` as distinct observations; don't replace changed-line exercise receipts.
5. **High — security producer execution.** Keep current Sentrdel observation taxonomy and `NOT_RUN` guarantees. An optional locally installed Semgrep-compatible producer may supply SARIF observations, but no external output automatically becomes canonical proof. No UA-P07 execution without the separate gate.
6. **Medium — security audit orchestration.** Borrow the *method* of reconnaissance, ledger, fresh verifier and disproof from Cloudflare's MIT skill, provided use is optional, offline-compatible, bounded, with independently falsifiable evidence. No required model, paid provider, or hidden token/egress.
7. **Medium — repository scorecards.** If adopted, label external supply-chain heuristics as supplemental remote observations, never source-specific test proof; offline absence = NOT_RUN.

## Proposed REA qualification suite (NOT YET EXECUTED)

Use identical fixture corpus for each donor and Ascout, with pinned hashes/versions and machine-readable comparison of findings, selection and unknowns:
- Diff: one added line, same-file unchanged line, unchanged file, rename, deletion, zero-width hunk, CRLF, Windows casing, symlink, and traversal-form input.
- SARIF: accepted vs under-review suppression, no location, external path URI, multiple runs, duplicate rule ID, huge payload, escaped URI, missing producer version.
- Selection: single package; two packages importing a shared module; cyclic graph; changed config; nested Vitest/Jest; missing dependency closure; tests through HTTP instead of import.
- Mutation: detectable equivalent, surviving mutant, timeout, test flake, no coverage; budgets enforced without claiming quality PASS.
- Security: SAST rule with valid match, false positive, unsupported language, scanner missing, engine version mismatch, lost SARIF provenance.
- Deterministic outcome: each probe includes actual invocation, source/fixture hash, observation cardinality, exact exit, output digest, limitations and explicit NOT_RUN reasons when absent.

## Priority order / research-only decision

**P1: reviewdog diff & diagnostics mapping** — first executed proof. Short bounded adapter research targeting `src/assurance/review` with no CLI behavior change yet.
**P2: Nx affected project selection** — frozen 2-package and missing-graph oracle before new implementation.
**P3: Semgrep producer ↔ Sentrdel observation bridge** — licensing and policy qualified; no provider launch without authorization.
**P4: StrykerJS mutation tests** — optional DEEP/RELEASE after a real Ascout test executor exists.
**P5: Cloudflare audit method** — incorporate only under effective UA-P07 authorization.
**P6: Scorecard** — optional supplemental posture, not core assurance.

Keep this REA research independent of PR #635 or any security implementation. Before any code transplant, record license-specific redistribution/attribution terms, exact source path and blob, version pin, threat model, synthetic failing test first, measured behavioral comparator, code-owner diff and safety checks. Respect existing Diffcipline and do not treat this document, agent assertions or a successful test as founder authorization.

## Nonclaims

This is **not** a full black-box REA of all candidates. Only reviewdog v0.21.2 was executed. Others were inspected at source/documentation/license level. No Ascout CLI code was modified, no donor production vulnerability was asserted, no cloud benchmark run, no security engine qualification, no automatic release approval, and no PR merge authorization are claimed.
