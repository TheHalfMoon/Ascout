# Proposed engineering roadmap

Status: **PROPOSED RESEARCH RECOMMENDATIONS — NOT IMPLEMENTATION AUTHORIZATION**.

The user explicitly prohibited production implementation in this mission. These recommendations use PStack's decision-record discipline while retaining proposed status; they are not accepted canonical ADRs or amendments. Future product work must follow Ascout's constitution, Spec Kit task ordering, current dependency closure, independent review and explicit implementation authorization.

## 1. Account for observations before presentation

Reuse `src/assurance/review/raw-observation.ts`, `location-validator.ts`, `finding-normalization.ts` and `coverage-accounting.ts`, together with the existing Sentrdel normalization boundary. Do not create a second evidence ledger or security authority.

Acceptance: the eight-result SARIF fixture retains a source-bound account of every input. Accepted producer suppression, no-location input, excluded-by-diff and invalid raw path spellings are explicitly represented or marked unknown. Dot/parent/percent normalization cannot silently repair evidence identity. No exit 0, SARIF severity or external signature becomes canonical quality/security PASS. Retry/fix evidence must be newly source-bound.

Revisit/reject when: existing contracts already express the required state without new fields; prefer the smaller adaptation. No publication effect is bundled into normalization.

## 2. Close selection gaps before optimizing runtime

Reuse `src/selection.ts`, runner-native related selection, native full pytest and current selection/exercise accounting. Consume project-local Nx graphs only for repositories that already use Nx. Keep testmon optional; it has not earned default narrowing.

Acceptance: source, conftest and text-input fixtures have zero missed relevant tests after conservative widening. A missing project edge or source/environment/cache mismatch produces widening/unknown. Deselected tests never count as passed. Full native controls, selected/deselected counts and source-start/end identity remain inspectable. Establish project-scale speed benefit on frozen native corpora only after recall qualifies.

Revisit/reject when: graph provenance, ownership or data dependencies cannot be established; run the full native suite. Do not add Nx Cloud, a semantic database, a required SQLite cache or a new daemon.

## 3. Populate the existing mutation adapter

Reuse `src/assurance/test/mutation-adapter.ts`. A minimal Stryker JSON translator can preserve generated mutant identity, killed/survived counts, source/head/digest and limitations. No new testing framework is needed.

Acceptance: strong native-passing tests distinguish 5/5 killed from weak native-passing tests with four survivors. Process exit 0 cannot erase survivors. Add separately authorized, falsifiable cases for timeout, no coverage, malformed output, version mismatch, cancelled run and stale report. Qualify the project's actual runner before claiming Vitest/per-test selection; this mission used command runner with coverage analysis off.

Revisit/reject when: native test execution or source mapping is unavailable; record an omission. Bound mutation wall time, concurrency and artifacts visibly.

## 4. Extend deterministic browser assertions narrowly

Reuse `src/browser/playwright-adapter.ts`, `executor.ts`, `locators.ts` and `evidence.ts`. The useful TesterArmy behavior here is a real role-based click followed by a text assertion, not a replacement orchestration system.

Acceptance: a real local browser distinguishes working/broken state; unavailable assertion classes remain explicit, source/locator/attempt identities bind, and a retry never erases an earlier failure. Empty selection is visible. No model endpoint, cached synthetic success, hidden remote browser, telemetry or egress is introduced. Qualify supported native platforms independently; CDP observations on Windows alone do not settle support.

Revisit/reject when: existing readTargetText/locator/oracle primitives already implement the goal; expose/reuse those rather than invent another executor.

## Optional security producers and provenance

Sentrdel is the first candidate, with its existing exact pin and explicit unavailable runtime. Its embedded ast-grep and OSV-compatible primitives take precedence over duplicate engines. Reconcile private availability metadata before assuming public acquisition.

Gitleaks has a concrete additional GitLab token-type observation, but needs a larger negative/encoded/history/redaction corpus. OpenGrep is the preferred local-metadata challenger in the tested output format; a single structural rule proves no security-accuracy advantage. OSV-Scanner and Trivy need explicit ecosystem/check/data freshness gaps before admission. Semgrep remains a comparator rather than an additional default dependency. Every producer must preserve unsupported/failed/partial scope and separately qualify engine, rules and data licenses.

Use SLSA Verifier in research acquisition where provenance exists. Consider in-toto only for optional export/handoff of already canonical evidence, with explicit key/trust policy and strict artifact closure. Never replace source-bound verification with a signature. No mandatory signing service is justified.

## Outstanding qualification work

- Full native Ascout suite remains unresolved after 300- and 900-second bounded runs. Preserve the failed/time-limited controls; resolve their cause in a separately scoped task before a release claim.
- No Sentrdel runtime artifact or native-rule accuracy comparison was executed. Source inspection cannot close that gate.
- No populated OSV offline DB was qualified; freshness and redistribution remain explicit open conditions.
- Cross-platform and project-scale recall/performance are not established. WSL resource samples cover only the Windows wrapper.
- Reviewdog rename/delete/CRLF/Unicode/multi-location cases, mutation timeout/no-coverage/equivalence, and browser mobile/model/cache behavior remain unqualified.

There are **zero required new production dependencies** in this roadmap as written. The research supports improving the existing adapters and qualification discipline first.
