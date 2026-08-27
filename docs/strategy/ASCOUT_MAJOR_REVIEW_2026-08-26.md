# Ascout Major Review — 2026-08-26

**Status:** `NON-AUTHORITATIVE / STRATEGIC REVIEW`

**Repository:** `TheHalfMoon/Ascout`  
**Review date:** 2026-08-26  
**Observed canonical main at review start:** `9d2b365f0f12ccec04c5c2306de8a78e7f4dd843`

This review is a strategic input for future canonical planning. It does **not** replace the founding master plan or current Spec Kit artifacts and does not independently authorize implementation.

---

## 1. Executive conclusion

Ascout should **not** become another test runner and should not attempt to replace Playwright, Cypress, Stryker, Schemathesis, Testcontainers, k6, axe-core, security scanners, or language-native test frameworks.

Its strongest differentiated role is the layer above them:

> **Ascout is the evidence-bound verification authority for software changes. It determines what changed, what evidence actually challenged that change, what passed, what failed, what remains unverified, and whether the resulting claim is safe to use.**

The founding thesis is already unusually strong: source-bound receipts, no green by omission, explicit incompleteness, command authority/admission, bounded execution, current-run evidence identity, and conservative widening. The next major product opportunity is to deepen the meaning of verification without weakening those invariants.

The long-term moat is not the number of scanners Ascout invokes. It is the trustworthy **judgment layer** that normalizes heterogeneous evidence without inventing certainty.

---

## 2. Founding strengths to preserve

The following should remain constitutional:

1. **Evidence before claims.** Current-run evidence outranks tool, model, or agent assertions.
2. **No green by omission.** Applicable verification that did not run remains visible and prevents clean success when material.
3. **Source-bound truth.** Evidence belongs to an exact source/config state; drift invalidates stable claims.
4. **Local core.** No required Ascout account, repository upload, cloud service, or model/API key.
5. **Native capability first.** Prefer project-native runners, selectors, coverage, caches, and formats.
6. **Conservative affected verification.** Narrow only when justified; widen when uncertainty remains.
7. **Command provenance and admission.** Changed execution/config authority cannot be silently trusted by the same change being evaluated.
8. **No implicit installs.** Missing dependencies become visible non-execution.
9. **Read-only by default.** Ascout should not silently rewrite product source or tests.
10. **Bounded execution.** Timeouts, process cleanup, output caps, retention caps, and no unbounded adaptive loops.
11. **Evidence privacy.** Secrets and raw repository-location material must not leak into receipts.
12. **Benchmark-driven expansion.** Architecture should expand because measured gaps justify it, not because an adjacent tool exists.
13. **No fake confidence score.** Ascout should report observed evidence and unresolved dimensions, not fabricate a universal correctness percentage.

---

## 3. Live repository findings at review time

These are a dated snapshot and must be re-verified against live GitHub before any action.

### 3.1 Current implementation is split between main and an active PR

At review time, canonical `main` was `9d2b365f0f12ccec04c5c2306de8a78e7f4dd843`.

PR `#41` was open on head `2f985c1c7d784c6b89f4ecfa5a4235b4355ad138`, with material implementation beyond `main`, including `src/check.ts`, `src/tools/pytest.ts`, `src/coverage/lcov.ts`, receipt building, CLI wiring, and additional contracts.

The active head was observed as **10 commits ahead and 2 behind** current main, with merge base `f24437d37b4fe5115728cc69918aec7fef049b3c`.

### 3.2 Exact-head CI evidence was absent

At review time, GitHub Actions returned zero workflow runs for the observed PR head. No CI PASS should be inferred from local intent, review comments, or prior heads.

### 3.3 Material open review findings existed

The observed PR had twelve unresolved review threads. Material themes included:

- incorrect nested `package.json` scope expansion;
- malformed/unrelated manifests entering workspace authority;
- nonexistent root manifest fabrication;
- package script authority broader than actual script ownership;
- multi-config ESLint fallback potentially selecting an unrelated package script;
- `runCli` API breakage;
- `doctor` error paths reporting success;
- persisted argv redaction bypass for non-executed tasks;
- CLI exit status contradicting the canonical receipt exit status;
- duplicated LCOV terminators;
- incorrect run start timestamp capture;
- misleading override diagnostic text.

### 3.4 Immediate conclusion

Before broadening Ascout, the current exact-head implementation must be able to satisfy its own claims. The first strategic priority is therefore **trust closure**, not feature breadth.

---

## 4. P0 trust-closure requirements

Before post-M1 expansion is considered, require all of the following:

- every material review finding resolved or explicitly rejected with evidence;
- CLI process exit code derived from the semantically validated canonical receipt, never re-derived independently;
- redaction applied consistently to executed and non-executed persisted argv/output;
- workspace/package scope tied to declared/real project ownership rather than arbitrary nested manifests;
- no fabricated tool/config/manifests in non-applicable projects;
- exact run timestamps captured at observation time rather than reconstructed later;
- deterministic LCOV normalization with strict malformed-input handling;
- no stray debugging files in package/release scope;
- current branch reconciled with live main without destructive history rewriting;
- Linux, Windows, and macOS CI with supported Node versions;
- build, typecheck, tests, semantic receipt validation, golden receipts, and packaging gates green on the exact head;
- Ascout used to verify Ascout once the current M1 vertical slice is capable of doing so.

---

## 5. The major conceptual gap: exercise is necessary but not sufficient

The M1 changed-line model is a strong wedge:

- `EXERCISED`
- `NOT_EXERCISED`
- `UNRESOLVED`

But execution coverage does not prove that tests can detect a broken result. A changed branch can execute while no assertion challenges its behavior. A browser element can be clicked while the user-visible outcome is never checked.

Therefore Ascout should evolve from:

> **Did verification touch the changed code?**

into:

> **What evidence actually challenged the changed behavior?**

This change should happen through additional evidence dimensions, not by redefining line coverage as correctness.

---

## 6. Target product model: Verification Assurance Matrix

Do not produce a universal 0–100 correctness or confidence score.

Instead, future receipts should be able to expose a multidimensional matrix where each applicable dimension is independently evidenced.

Candidate dimensions:

| Dimension | Evidence examples |
|---|---|
| Compile/type correctness | compiler, TypeScript, mypy, Rust compiler |
| Static correctness | ESLint, static analyzers |
| Example behavior | unit/integration tests |
| Changed-line exercise | LCOV/V8/Istanbul |
| Changed-branch exercise | branch coverage |
| Test strength | mutation testing |
| Input-space exploration | property/fuzz testing |
| UI behavior | Playwright/Cypress |
| UI interaction surface | UI coverage |
| API contract | OpenAPI/GraphQL generated verification |
| Stateful behavior | model-based/stateful API sequences |
| Environment fidelity | real disposable infrastructure |
| Reproduction | deterministic reruns |
| Counterfactual causality | base-vs-change replay |
| Performance | policy-bound k6/benchmark thresholds |
| Accessibility | axe-core/manual unresolved evidence |
| Security | selected configured scanners |
| Verification-asset integrity | test/snapshot/config changes |
| Source integrity | Ascout tree binding |
| Environment integrity | runtime/tool/lockfile/image identity |
| Evidence integrity | receipt/reference validation |

Suggested per-dimension states:

```text
PASS
FINDING
GAP
UNRESOLVED
NOT_APPLICABLE
```

The matrix is evidence disclosure, not a substitute for policy.

---

## 7. Signature capability candidate: Ascout Challenge

### Purpose

Determine whether existing verification is strong enough to detect plausible faults in changed behavior.

### 7.1 Changed-code mutation testing

Mutation testing should be a high-priority post-M1 capability because it directly addresses the distinction between coverage and test strength.

Example receipt evidence:

```text
TEST STRENGTH
changed mutation candidates: 17
killed: 15
survived: 2

GAP
src/pricing.ts:84
mutant: > changed to >=
existing tests still passed
```

### 7.2 Native engines first

Ascout should not embed one universal mutation engine into its core. Candidate adapters:

- JavaScript/TypeScript: Stryker
- Python: mutmut / Cosmic Ray
- Rust: cargo-mutants
- Java: PIT
- .NET: Stryker.NET

Ascout owns admission, selection, evidence normalization, source binding, and final completeness semantics.

### 7.3 Property and fuzz evidence

Future adapters should preserve deterministic seeds, minimized counterexamples, generated-case counts, and exact source/tool identity.

Example:

```text
PROPERTY
serialize/deserialize roundtrip
cases: 1000
seed: 3419861
result: FAIL
minimal counterexample: {"value": -0}
```

### 7.4 Differential verification

Ascout should support evidence where a changed implementation is compared against a trusted/reference implementation:

- new parser vs established parser;
- Rust rewrite vs Python implementation;
- optimized algorithm vs slower known-correct implementation;
- new serializer vs canonical library;
- new API path vs legacy contract fixtures.

The key lesson is not to embed reference systems but to make differential evidence a first-class receipt concept.

---

## 8. Signature capability candidate: Ascout Counterfactual

The founding model correctly avoids claiming `introduced_by_change=true` without comparative proof.

A future counterfactual mode can obtain that proof through isolated base-vs-change replay.

Example:

```text
BASE COMMIT
checkout_discount test: PASS

CHANGED TREE
checkout_discount test: FAIL

introduced_by_change: observed_comparative_evidence
```

Another case:

```text
BASE: FAIL
CHANGE: FAIL
=> PREEXISTING_OBSERVATION
```

Requirements:

- use isolated Git worktrees/containers, not destructive checkout switching;
- bind both executions to exact source identities;
- keep environment/tool identity comparable or disclose mismatch;
- preserve bounded execution;
- never infer causality when either side is unresolved;
- make comparative evidence separately addressable in the receipt.

This can become a major differentiator over tools that merely restate a failing test near a changed line.

---

## 9. Bounded adaptive verification

The useful lesson from autonomous experimentation systems is **bounded search**, not uncontrolled self-modifying verification.

Future Ascout modes may accept a fixed time/compute budget and spend it incrementally:

```text
ascout check --budget 30s
ascout check --budget 5m
ascout check --policy release
```

Illustrative progression:

1. source/config trust checks;
2. type/static checks;
3. affected tests;
4. changed-code exercise;
5. bounded widening;
6. if material uncertainty remains and policy allows, mutation/property/counterfactual evidence;
7. stop at budget, report remaining gaps honestly.

Rules:

- fixed maximum passes;
- deterministic planning where inputs are equivalent;
- no recursive unbounded widening;
- no silent installs;
- no agent/model authority to weaken policy;
- budget exhaustion is visible incompleteness, never success by omission.

---

## 10. Browser/UI strategy

Do not rebuild Playwright or Cypress.

Future browser adapters should ingest project-native evidence such as:

- selected projects/browsers;
- passed/failed/flaky tests;
- retries;
- trace artifacts;
- screenshots/video;
- console/network failures;
- selected/deselected counts;
- UI coverage where available.

### Test-healing integrity

A critical AI-era requirement is to detect when the same change alters tests in a way that could manufacture green.

Ascout should distinguish factual changes such as:

```text
application changed
test changed
assertion changed
snapshot changed
locator changed
```

It should not automatically label test changes malicious or weakened. But material verification-asset changes can require independent re-verification or stronger evidence under policy.

Agent/browser tools may generate or heal tests. They must not independently declare the resulting verification complete.

---

## 11. API and stateful verification strategy

Changes to OpenAPI, GraphQL schemas, routes, controllers, DTOs, serializers, or validation layers should make API-contract evidence applicable when configured.

Candidate future evidence sources:

- Schemathesis;
- RESTler;
- Pact;
- Dredd;
- project-native API integration tests.

Receipt questions should include:

- were changed operations exercised?;
- were positive and negative cases checked?;
- did schema and implementation agree?;
- did stateful sequences expose a failure?;
- were generated cases reproducible with stable seeds/inputs?;

Ascout remains the evidence normalizer and policy evaluator.

---

## 12. Real-environment fidelity

Modern project correctness often depends on PostgreSQL, Redis, Kafka, object stores, queues, browsers, auth providers, and external service boundaries.

Future environment evidence should be able to record non-secret identities such as:

- runtime version;
- OS/architecture;
- package-manager version;
- lockfile digest;
- container image digest;
- database/service image versions;
- browser engine/version;
- relevant test-environment configuration digest.

Testcontainers and equivalent native infrastructure should be reused rather than replaced.

This lets Ascout answer: **what environment was this actually verified against?**

---

## 13. Coverage evolution

After line coverage is stable and benchmarked, add support for:

- branch coverage;
- function coverage;
- condition/path evidence only when native data is trustworthy.

Changed-branch coverage should be prioritized over repository-wide percentages because changed-line execution can hide untested logical alternatives.

No coverage metric should be relabeled as correctness proof.

---

## 14. Performance, accessibility, and security

These should be policy/applicability-driven evidence dimensions, not mandatory local work on every change.

### Performance

Ingest explicit threshold outcomes and baseline/current deltas where configured. A threshold violation is a finding; missing required performance evidence is a gap.

### Accessibility

Preserve both automated violations and unresolved/manual-review items. Zero automated violations must never be rendered as universal accessibility proof.

### Security

Ascout should integrate selected scanners and security suites only after exact license/use/data review. It should not become a duplicate vulnerability engine. Security evidence should remain source-bound and policy-scoped.

---

## 15. Risk/applicability classification

Ascout should eventually classify changes into factual/rule-derived applicability categories such as:

```text
CODE_BEHAVIOR
PUBLIC_API
DATABASE_SCHEMA
AUTHORIZATION
DEPENDENCY
BUILD
TEST
UI
NETWORK
PERFORMANCE_SENSITIVE
CONCURRENCY
SERIALIZATION
CONFIGURATION
```

These categories do not determine correctness. They determine which verification dimensions may be applicable.

Example future policy mapping:

```text
DATABASE_SCHEMA -> migration/integration evidence
UI -> browser + accessibility evidence
API_CONTRACT -> contract/stateful API evidence
AUTHORIZATION -> security + negative-path evidence
CRITICAL_MODULE -> mutation-strength evidence
```

Applicability must be explainable and fail closed when classification is uncertain.

---

## 16. Verification policy, not workflow language

A future `ascout.policy.json` may describe required **evidence**, not arbitrary commands or user-authored workflow graphs.

Illustrative concept only:

```json
{
  "release": {
    "require": [
      "source_stable",
      "applicable_tasks_complete",
      "changed_code_exercised",
      "required_test_strength_complete"
    ]
  }
}
```

Do not turn Ascout config/policy into another GitHub Actions, Jenkinsfile, or general task runner.

The distinction is constitutional:

- CI/workflow systems decide **what steps to run**;
- Ascout policy decides **what evidence is required to make a verification claim**.

---

## 17. Historical intelligence without evidence leakage

Future local/hosted history may improve planning using:

- test runtime;
- historical flakes;
- change/test relationships;
- selector misses;
- widening history;
- coverage relationships;
- mutation survivors;
- environment-specific failures.

Historical data must never become current-run proof.

Use it to answer **what should we run?**, not **what passed now?**

Example:

```text
current observation: FLAKY
historical context: known intermittent test
```

Never:

```text
ignore current failure because historically flaky
```

---

## 18. Shadow validation for test selection

Affected-test selection is valuable only if its false-negative risk is measured.

Introduce a benchmark/observation mode where selected runs are periodically compared with a full-suite shadow run.

Track:

- selector failure recall;
- selector misses;
- duration saved;
- selected-test reduction;
- package/project-specific behavior;
- cold/warm effects.

Only promote stronger narrowing strategies after measured evidence supports them.

This is aligned with the founding benchmark-first rule.

---

## 19. Enterprise evidence and attestations

Long term, the receipt can become a deployable policy artifact.

Candidate capabilities:

```text
ascout receipt
ascout receipt verify
ascout attest
```

A signed/verifiable attestation could bind:

- artifact digest;
- source digest/SHA;
- receipt digest;
- verification policy identity;
- tool/runtime/environment identities;
- evidence digests;
- signer/provenance metadata.

Deployment systems could then enforce an organization rule such as:

> only deploy artifacts with a valid Ascout verification attestation satisfying policy X.

Reuse provenance/attestation standards rather than inventing an incompatible island.

---

## 20. Interoperability targets

Potential future inputs/outputs include:

```text
JUnit XML
LCOV
Cobertura
coverage-final.json
SARIF
Playwright traces/results
Cypress results
OpenTelemetry CI/CD telemetry
SLSA/in-toto attestations
native runner JSON
```

Ascout's semantic receipt remains Ascout-owned. Ecosystem evidence should reuse standard representations where trustworthy.

---

## 21. Agent-native distribution

Ascout should be available wherever AI coding occurs, while preserving its independent trust boundary.

Candidate future surfaces:

- CLI;
- agent skill/instruction package;
- MCP interface;
- GitHub Action;
- GitLab CI component;
- optional pre-push integration;
- CI/release policy integration.

Candidate agent skills:

```text
/ascout-verify
/ascout-explain-gap
/ascout-review-tests
/ascout-plan-verification
```

Agents may invoke Ascout and consume its receipt. Agents must not silently:

- add changed-command-surface admission;
- downgrade required evidence;
- persist trust grants;
- hide gaps;
- convert incomplete into success.

---

## 22. Target architecture

```text
CODING AGENT / DEVELOPER
          |
          v
    Change Observer
          |
          v
  Risk / Applicability
          |
          v
 Verification Planner
          |
   +------+------+--------------------+
   |             |                    |
   v             v                    v
Native       Behavioral           Challenge
checks       verification          verification
   |             |                    |
Typecheck     Browser             Mutation
Lint          API                 Property
Unit tests    Real infra          Fuzz
Coverage      Performance         Differential
              Accessibility       Counterfactual
   |             |                    |
   +-------------+--------------------+
                 |
                 v
        Evidence Normalization
                 |
                 v
       Semantic Receipt Validator
                 |
                 v
        Assurance Matrix / Policy
                 |
                 v
Terminal / JSON / Agent / CI / Attestation
```

---

## 23. Product positioning

Keep the founding public identity:

> **Ascout — Verify everything AI ships.**

And retain:

> **Know exactly what passed, failed, and was never checked.**

The deeper internal product definition should be:

> **Ascout is the evidence-bound verification authority for software changes.**

This positioning is intentionally different from:

- test runner;
- AI test generator;
- browser automation engine;
- code-review bot;
- security scanner;
- CI orchestrator;
- observability dashboard.

Ascout consumes evidence from those layers and decides whether the verification claim is complete and trustworthy for the exact change.

---

## 24. Strategic moat

The defensible combination is:

```text
exact source binding
+ command authority/admission
+ no-green-by-omission
+ affected verification
+ changed-code exercise gaps
+ test-strength evidence
+ counterfactual causality
+ heterogeneous evidence normalization
+ agent-readable receipts
+ organization policy
+ attestable verification
```

The moat is **trustworthy verification judgment**, not proprietary test execution.

---

## 25. Non-goals / anti-patterns

Do not:

- replace native runners;
- embed every scanner into the core;
- require an LLM to decide truth;
- generate a universal confidence score;
- let historical evidence masquerade as current proof;
- silently auto-fix source/tests as part of verification;
- create a general workflow DSL;
- install missing project dependencies implicitly;
- let agent integrations escalate admission;
- require cloud/account/upload for the core path;
- broaden M1 abstractions preemptively for every future adapter;
- canonicalize future roadmap ideas without a dedicated planning/review gate.

---

## 26. Recommended sequence

The detailed staged sequence is maintained in `POST_M1_VERIFICATION_ROADMAP.md`.

High level:

1. **P0 — trust closure on current implementation**;
2. **M1 — finish the founding source-bound receipt and changed-code exercise promise**;
3. **M1.1/M1.2 — evidence-depth hardening, self-verification, benchmark truth**;
4. **M2 — test strength, counterfactual, generative verification, selection intelligence**;
5. **M3 — browser/API/real-environment/performance/accessibility/security evidence**;
6. **M4 — policy, CI fleet, signed attestations, organization controls**;
7. **M5 — verification network / ecosystem standardization**.

No later stage should pull architecture into M1 unless measured evidence and a separately reviewed Spec Kit change justify it.

---

## 27. Final decision from this review

```text
CURRENT_M1_DIRECTION = KEEP
FOUNDING_TRUST_MODEL = KEEP_AND_PROTECT
CURRENT_ACTIVE_HEAD = REQUIRES_TRUST_CLOSURE
POST_M1_DIRECTION = EXPAND_TO_VERIFICATION_AUTHORITY
PRIMARY_SIGNATURE_FUTURE_CAPABILITIES = ASCOUT_CHALLENGE + ASCOUT_COUNTERFACTUAL
UNIVERSAL_CONFIDENCE_SCORE = REJECT
REBUILD_NATIVE_TEST_TOOLS = REJECT
FUTURE_EXPANSION_AUTHORIZATION = REQUIRES_SEPARATE_SPEC_KIT_CANONICALIZATION
```
