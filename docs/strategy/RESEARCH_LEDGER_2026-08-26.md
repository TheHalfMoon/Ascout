# Ascout Verification Research Ledger — 2026-08-26

**Status:** `NON-AUTHORITATIVE / DESIGN-REFERENCE LEDGER`

**Purpose:** preserve the external research behind the 2026-08-26 major Ascout review so future planning can distinguish reusable product lessons from unsupported ideas.

This ledger does **not** authorize source import, package installation, execution, dependency admission, license compatibility, data sharing, or implementation. Exact-version license/use/data/security review remains mandatory before any donor code or third-party runtime becomes part of Ascout.

---

## 1. Research principles

For each external source, prefer extracting one of four things:

1. **Native capability to reuse** — Ascout should consume it instead of rebuilding it.
2. **Evidence format to normalize** — Ascout can bind its output into a receipt.
3. **Product/trust lesson** — useful design principle without source reuse.
4. **Benchmark competitor/reference** — compare Ascout claims against it.

Avoid turning every researched project into a dependency.

---

# 2. User-specified primary sources

## 2.1 Microsoft Playwright

**Source:** https://github.com/microsoft/playwright  
**Docs:** https://playwright.dev/

### Relevant capabilities

- browser automation across Chromium, Firefox, and WebKit;
- Playwright Test runner;
- test isolation through browser contexts;
- auto-waiting and web-first assertions;
- traces, screenshots, video, network/console evidence;
- agent-oriented CLI and MCP surfaces;
- AI-agent testing workflows.

### Ascout lesson

Do **not** rebuild browser automation. Build a future Playwright evidence adapter that records exactly which browsers/projects/tests ran and binds traces/artifacts to the exact source state.

### Potential future evidence

```text
browser/project matrix
selected/deselected tests
PASS/FAIL/FLAKY/retry observations
trace artifact digest
screenshot/video digest
console/network errors
runtime/browser version
```

### Important trust question

Agent-generated/healed browser tests can manufacture green if test semantics change. Ascout should report verification-asset changes and may require independent evidence under policy.

---

## 2.2 Karpathy micrograd

**Source:** https://github.com/karpathy/micrograd

### Relevant capability/lesson

micrograd deliberately keeps the implementation small and understandable, then tests gradient correctness against PyTorch as a reference implementation.

### Ascout lesson

Two useful principles:

1. **Keep the trusted semantic core small enough to reason about.**
2. **Treat differential/reference-oracle testing as high-value evidence.**

Future differential verification examples:

```text
new parser vs trusted parser
optimized implementation vs known-correct slow implementation
Rust rewrite vs Python reference
new serializer vs canonical implementation
new API path vs legacy fixture/oracle
```

No source reuse is implied.

---

## 2.3 Karpathy autoresearch

**Source:** https://github.com/karpathy/autoresearch

### Relevant design choices

- small mutable surface;
- fixed execution budget;
- one clear evaluation metric;
- repeated keep/discard experiments;
- reviewable diffs;
- self-contained design.

### Ascout lesson

Reuse the **bounded adaptive search discipline**, not autonomous source mutation.

Future Ascout could spend a fixed verification budget incrementally:

```text
source trust
-> static checks
-> affected tests
-> changed-code exercise
-> bounded widening
-> challenge/counterfactual evidence if still required and budget permits
```

Budget exhaustion must remain visible incompleteness.

---

## 2.4 Shiplight

**Source:** https://www.shiplight.ai

### Relevant product direction

Shiplight represents the emergence of agent-native QA/browser workflows where coding agents create, execute, inspect, and repair tests.

### Ascout lesson

Ascout should not compete primarily on autonomous browser test generation. It should sit **above** generated/executed tests as an independent verification authority.

Potential relationship:

```text
agent -> Shiplight/Playwright/Cypress -> evidence -> Ascout receipt/policy
```

### Trust boundary

A system that creates or heals tests must not be the sole authority deciding those tests prove the change is safe.

---

## 2.5 Cypress AI Toolkit

**Source:** https://github.com/cypress-io/ai-toolkit

### Relevant capabilities

- agent skills for authoring/explaining/operating Cypress workflows;
- MCP connectivity;
- explicit support for Claude, Cursor, GitHub Copilot, and other AI coding environments.

### Ascout lesson

Distribution through **agent skills + MCP + CLI** is becoming a practical integration model. Future Ascout should be invokable from agent workflows without letting the agent weaken policy or silently grant changed-command-surface admission.

Candidate future skills:

```text
/ascout-verify
/ascout-explain-gap
/ascout-review-tests
/ascout-plan-verification
```

---

## 2.6 Cypress

**Source:** https://github.com/cypress-io/cypress  
**Docs:** https://docs.cypress.io/

### Relevant capabilities

- browser end-to-end/component testing;
- rich interactive debugging;
- cloud/history ecosystem;
- current AI-assisted testing features;
- UI Coverage concepts in the broader Cypress product.

### Ascout lesson

UI interaction coverage is useful evidence but is **not behavioral correctness proof**. A control can be clicked without the resulting state being asserted.

Future Ascout UI evidence should therefore distinguish:

```text
interaction surface exercised
vs
behavior/assertion evidence observed
```

---

# 3. Test-strength research

## 3.1 Stryker Mutator

**Source:** https://stryker-mutator.io/  
**Repository organization:** https://github.com/stryker-mutator

### Core idea

Mutation testing deliberately modifies program behavior and checks whether tests fail. Surviving mutants reveal tests that execute code but may not challenge the changed semantics strongly enough.

### Ascout relevance

This is the clearest post-M1 bridge from **coverage** to **test strength**.

Recommended future direction:

- changed-code-focused mutation;
- bounded candidate count/time;
- exact mutant/source identity;
- killed/survived/error/timeout semantics;
- never treat mutation score as universal correctness.

### Ecosystem candidates

- Stryker — JS/TS and related ecosystems;
- mutmut / Cosmic Ray — Python;
- cargo-mutants — Rust;
- PIT — Java;
- Stryker.NET — .NET.

Each requires separate exact-version review before admission.

---

# 4. Property-based and fuzz testing

## 4.1 fast-check

**Source:** https://fast-check.dev/  
**Repository:** https://github.com/dubzzz/fast-check

### Core ideas

- generate many test inputs from properties;
- deterministic seeds;
- shrink failures toward smaller counterexamples;
- works alongside common JS/TS test runners.

### Ascout evidence opportunity

Preserve:

```text
property identity
seed
generated case count
minimal counterexample
runner/tool version
source identity
```

The LLM must not be required to invent the property in the trusted core.

---

## 4.2 Native fuzzers / stateful generators

Candidate future references include language-native fuzzing and stateful testing systems.

### Ascout rule

Prefer existing project-native fuzz targets and corpora. Do not import a universal fuzz framework into core before benchmark evidence justifies it.

Crash/counterexample evidence must be reproducible and source-bound.

---

# 5. API and contract verification

## 5.1 Schemathesis

**Source:** https://schemathesis.io/  
**Repository:** https://github.com/schemathesis/schemathesis

### Relevant capabilities

- generated API verification from OpenAPI/GraphQL contracts;
- property-based input exploration;
- negative/edge case generation;
- stateful workflow exploration.

### Ascout lesson

When API schemas/routes/controllers/DTOs change, contract/stateful evidence can become applicable under policy.

Ascout should normalize results, not rebuild the generator.

---

## 5.2 RESTler

**Source:** https://github.com/microsoft/restler-fuzzer

### Relevance

Stateful REST API exploration and sequence generation are useful references for deeper API verification.

### Ascout rule

Future integration requires separate security/execution/licensing review because generated requests can be operationally powerful.

---

## 5.3 Pact / Dredd / project-native contract tests

**Sources:**

- https://pact.io/
- https://github.com/apiaryio/dredd

### Ascout relevance

Contract testing evidence can complement schema generators, especially for service-to-service compatibility.

---

# 6. Real-environment testing

## 6.1 Testcontainers

**Source:** https://testcontainers.com/  
**GitHub organization:** https://github.com/testcontainers

### Core idea

Run tests against disposable instances of real infrastructure rather than relying only on mocks/in-memory substitutes.

### Ascout lesson

Whole-project verification often depends on environment fidelity.

Potential future evidence:

```text
container/service image digest
database/broker/cache version
runtime/architecture
project environment configuration digest
isolation facts when observable
```

Ascout should record/judge evidence, not become a replacement infrastructure orchestrator.

---

# 7. Performance verification

## 7.1 Grafana k6

**Source:** https://github.com/grafana/k6  
**Threshold docs:** https://grafana.com/docs/k6/latest/using-k6/thresholds/

### Relevant idea

Performance requirements can be encoded as explicit thresholds whose violation fails the run.

### Ascout lesson

Performance evidence should be **policy-bound and environment-aware**, not a universal local requirement.

Potential receipt facts:

```text
metric
threshold
baseline value where comparable
current value
delta
environment caveat
PASS/FINDING
```

---

# 8. Accessibility verification

## 8.1 axe-core

**Source:** https://github.com/dequelabs/axe-core

### Relevant idea

Automated accessibility checks can find many issues but also return incomplete/manual-review items; zero automated violations is not universal accessibility proof.

### Ascout lesson

Accessibility fits Ascout's honesty model well:

```text
automated violations
incomplete/manual review items
actual scanned scope
```

Unresolved manual items stay unresolved when policy requires them.

---

# 9. New-code / affected-change quality models

## 9.1 Sonar new-code model

**Source:** https://docs.sonarsource.com/sonarqube-server/user-guide/about-new-code

### Relevant idea

Focus quality decisions on code introduced or modified in the current change rather than only repository-wide aggregates.

### Ascout lesson

Ascout already has a stronger source-bound foundation. Future applicability/risk classification can build on changed scope without relying on global quality percentages.

Candidate factual/rule-derived change classes:

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

These classes select evidence requirements; they do not themselves prove risk or correctness.

---

# 10. Monorepo and affected-selection references

## 10.1 Nx affected

**Source:** https://nx.dev/ci/features/affected

### Relevant idea

Use repository/project graph information to reduce tasks to affected projects.

### Ascout lesson

Prefer native delegation when trustworthy, then measure selector recall through shadow full-suite runs.

---

## 10.2 Turbo

**Source:** https://turbo.build/repo/docs

### Relevant idea

Task/package graph and cache awareness can be useful for monorepo verification planning.

### Ascout rule

Do not recreate Turbo/Nx/Bazel graphs in M1. Integrate only when benchmark misses show native delegation materially helps.

---

## 10.3 Bazel

**Source:** https://bazel.build/

### Relevance

Mature build/test dependency graphs and reproducible execution provide a future affected-verification reference for large repositories.

---

# 11. Flake and historical test intelligence

Representative product/reference categories include CI test analytics, flaky-test detection, and predictive/affected selection systems.

### Ascout lesson

Historical information is useful for **planning**, never for current-run proof.

Future history may store:

```text
test runtime
failure frequency
flake observations
change/test relationship
selector misses
coverage relationship
widening history
```

A current failure cannot be dismissed merely because history says the test is flaky.

---

# 12. Provenance, attestations, and interoperable evidence

## 12.1 SLSA provenance

**Source:** https://slsa.dev/spec/

### Relevant idea

Verifiable provenance binds artifacts to information about how/where they were produced.

### Ascout lesson

A future signed verification attestation should reuse established provenance concepts rather than invent a proprietary trust island.

Candidate binding:

```text
artifact digest
source identity
receipt digest
policy identity
tool/runtime/environment identity
evidence digests
signer/provenance metadata
```

---

## 12.2 in-toto

**Source:** https://in-toto.io/  
**Repository:** https://github.com/in-toto/in-toto

### Relevance

Supply-chain attestations and signed metadata are a useful future interoperability reference.

---

# 13. CI/CD telemetry and standard findings

## 13.1 OpenTelemetry CI/CD semantic conventions

**Source:** https://opentelemetry.io/docs/specs/semconv/cicd/

### Relevance

Standard pipeline/task telemetry can make Ascout organization/fleet integration interoperable rather than dashboard-specific.

### Ascout lesson

Telemetry is observability context, not current-run proof unless the receipt explicitly binds the relevant evidence.

---

## 13.2 SARIF / GitHub code scanning

**Source:** https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github

### Relevance

SARIF is a mature interchange surface for static-analysis findings.

### Ascout lesson

Future Ascout may ingest/export compatible findings while keeping the semantic receipt as its canonical run-truth model.

---

# 14. Candidate standard evidence formats

Future format review candidates:

```text
JUnit XML
LCOV
Cobertura
coverage-final.json
SARIF
Playwright results/traces
Cypress results
OpenTelemetry CI/CD telemetry
SLSA/in-toto attestations
language-native test JSON
```

For every format, define:

- parser strictness;
- source/path mapping rules;
- evidence identity;
- truncation/redaction;
- ambiguity/unresolved semantics;
- version compatibility;
- security boundaries.

---

# 15. Strategic synthesis

The researched ecosystem is strongest when each tool owns its specialized domain:

```text
Playwright/Cypress/Shiplight -> browser behavior
Stryker/etc.               -> mutation strength
fast-check/fuzzers          -> generated input space
Schemathesis/RESTler        -> API/stateful exploration
Testcontainers              -> real dependency fidelity
k6                          -> performance thresholds
axe-core                    -> accessibility automation
Nx/Turbo/Bazel              -> native affected/task graph capability
SLSA/in-toto                -> provenance/attestation patterns
SARIF/OTel                  -> interoperability
```

Ascout should own the layer **above** them:

```text
source binding
+ applicability
+ command admission
+ evidence normalization
+ completeness semantics
+ no-green-by-omission
+ policy judgment
+ attestable receipt
```

---

# 16. Research-derived priorities

```text
P0  fix current trust contradictions
M1  complete source-bound changed-code receipt
M1+ add branch/environment evidence only after measurement
M2  mutation strength + counterfactual causality + property/differential evidence
M3  browser/API/real-environment/performance/accessibility/security adapters
M4  organization evidence policy + CI + signed attestations
M5  agent/CI/release ecosystem standardization
```

The research does **not** justify collapsing these stages into one broad platform build.

---

# 17. Mandatory review before adopting any source

For each future donor/tool dependency or integration, record:

1. exact repository and commit/version;
2. exact license and notices;
3. source reuse vs executable integration vs design reference;
4. network/data behavior;
5. credential expectations;
6. code-execution boundary;
7. sandbox/admission requirements;
8. artifact sensitivity;
9. platform/runtime requirements;
10. update/versioning policy;
11. benchmark reason for adoption;
12. removal/fallback behavior if unavailable.

No source in this ledger bypasses that review.
