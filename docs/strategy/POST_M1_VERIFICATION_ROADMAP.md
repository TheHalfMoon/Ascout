# Ascout Post-M1 Verification Roadmap

**Status:** `NON-AUTHORITATIVE / CANONICALIZATION CANDIDATE`

This roadmap records the intended strategic sequence after the current founding M1 work. It does **not** authorize implementation and must not reorder or broaden the active Spec Kit tasks. Each future milestone requires its own planning, contracts, acceptance criteria, security/license review, and exact-head authorization before implementation.

---

## 1. Ordering rule

```text
P0 TRUST CLOSURE
  -> M1 FOUNDING RECEIPT COMPLETE
  -> M1.1 EVIDENCE DEPTH
  -> M1.2 DOGFOOD + BENCHMARK
  -> M2 TEST STRENGTH + CAUSALITY
  -> M3 BEHAVIORAL / PROJECT VERIFICATION
  -> M4 ENTERPRISE POLICY + ATTESTATION
  -> M5 VERIFICATION ECOSYSTEM
```

No later milestone may pull generic abstractions, dependencies, or workflow machinery into M1 merely for future convenience.

---

# P0 — Current Implementation Trust Closure

## Goal

Make the current live implementation capable of supporting Ascout's own trust claims before adding breadth.

## Required work

1. Re-read live `main`, open PRs, exact heads, review threads, changed-file sets, CI, and mergeability before mutation.
2. Resolve all material active review findings or reject them with explicit evidence.
3. Ensure CLI exit status is exactly the canonical semantically validated receipt exit status.
4. Apply persisted argv/output redaction consistently across executed, refused, not-run, and not-applicable tasks.
5. Restore precise workspace/package scope and script ownership.
6. Prevent nonexistent or undeclared manifests from becoming command authority.
7. Preserve correct public CLI/module contracts during async wiring.
8. Make `doctor` operational failures machine-visible as nonzero outcomes.
9. Capture run start/end times at observation time.
10. Make LCOV normalization deterministic and semantically strict.
11. Remove debug/temporary files from intended release/package scope.
12. Reconcile active branch with current main without force-push/rebase/destructive history rewriting.
13. Add/qualify project CI on Linux, Windows, and macOS with supported Node versions.
14. Require exact-head build, typecheck, test, receipt semantic validation, golden receipt, and package-content evidence.

## Exit gate

```text
OPEN_MATERIAL_REVIEW_FINDINGS = 0
CLI_RECEIPT_EXIT_CONTRADICTIONS = 0
PERSISTED_SECRET_LEAK_PATHS = 0
EXACT_HEAD_CI = PASS
CROSS_PLATFORM_REQUIRED_GATES = PASS
```

---

# M1 — Finish the Founding Changed-Code Verification Receipt

## Goal

Complete the already-canonical founding promise without redesign.

## Canonical scope remains

- trusted developer-owned local Git repository;
- exact source identity and start/end drift;
- fixed semantic tasks;
- TypeScript/ESLint;
- Vitest/Jest;
- basic pytest;
- changed-code exercise from native line coverage;
- conservative related-test selection and one bounded widening pass;
- explicit PASS/FAIL/FLAKY/BLOCKED/ERROR/NOT_APPLICABLE/NOT_RUN semantics;
- command-surface admission;
- factual test/snapshot changes;
- terminal/JSON/agent representations from one validated truth;
- benchmark and cross-platform release hardening.

## No additions merely because of this strategic roadmap

Do not add in M1:

- mutation/property/fuzzing;
- Playwright/Cypress orchestration;
- generic plugin SDK;
- security suite;
- performance/accessibility;
- arbitrary workflow graphs;
- DB/daemon/control plane;
- required LLM;
- signed attestation infrastructure.

## M1 exit gate

Use the canonical Spec Kit acceptance/benchmark/release gates. The strategic minimum is:

```text
source-bound receipt = proven
no-green-by-omission = proven
material changed-code exercise gap returning 0 = 0
cross-tree evidence leakage = 0
binding-integrity violations = 0
Linux/Windows/macOS release gates = PASS
```

---

# M1.1 — Evidence Depth Hardening

## Purpose

Improve the information quality of the existing receipt without changing Ascout into a broader verification platform yet.

## Candidate scope

### A. Branch/function coverage

- ingest trustworthy branch/function data where the native runner exposes it;
- intersect changed branches/functions with changed scope;
- preserve line coverage as execution evidence, not correctness proof;
- fail unresolved rather than fabricate mappings.

### B. Environment/tool identity

Record non-secret verification context when reliably observable:

- runtime version;
- OS/architecture;
- package-manager version;
- tool versions;
- lockfile digest;
- browser/test environment identity only when used.

### C. Stronger receipt reproducibility

- deterministic normalized artifacts;
- stable semantic ordering;
- tool/config digest binding;
- exact output schema compatibility policy.

## Benchmark questions

- Does branch evidence find material gaps missed by changed-line coverage?
- What is the unresolved mapping rate?
- What runtime overhead is added?
- Does environment binding improve reproducibility of observed failures?

## Exit gate

Promote only evidence dimensions with measured usefulness and acceptable unresolved/error rates.

---

# M1.2 — Ascout-on-Ascout + Benchmark Truth

## Purpose

Make Ascout its own first serious customer and measure claims continuously.

## Workstreams

### A. Self-verification

Run Ascout against its own changes and keep receipt artifacts for release qualification.

### B. Historical benchmark corpus

Expand carefully from the founding corpus using reviewed historical fixes with known regression behavior.

### C. Selector shadow mode

Periodically compare affected selection to a full-suite run and record:

- failure recall;
- selector misses;
- test/runtime reduction;
- widening frequency;
- package/workspace effects.

### D. Receipt mutation/adversarial corpus

Attempt to break semantic validation using:

- dangling evidence;
- cross-run links;
- invalid paths;
- source/base mismatch;
- inverted ranges;
- contradictory status/completeness/exit values;
- secret-bearing output;
- tool/config ambiguity.

## Exit gate

Ascout should not expand aggressively until it can show measured trust behavior on itself and the founding benchmark.

---

# M2 — Test Strength, Causality, and Generative Verification

M2 introduces new evidence types that answer more than "did tests run?".

---

## M2-A — Ascout Challenge: Changed-Code Mutation Evidence

### Goal

Measure whether existing tests can detect plausible faults in changed behavior.

### Native-engine strategy

Candidate adapters, subject to exact-version/license/use review:

- JS/TS: Stryker;
- Python: mutmut / Cosmic Ray;
- Rust: cargo-mutants;
- Java: PIT;
- .NET: Stryker.NET.

### Requirements

- no implicit engine installation;
- exact tool/version identity;
- source-bound mutant identity;
- changed-code-focused mutation where engine semantics permit;
- bounded mutation count/time budget;
- killed/survived/error/timeout distinctions;
- no mutation score treated as universal correctness proof;
- surviving material mutants may be policy-defined gaps.

### Benchmark

Compare changed-code exercise vs mutation evidence on historical regression fixes with deliberately weak tests.

### Exit gate

Mutation evidence must demonstrate meaningful gap detection beyond line/branch exercise before becoming broadly recommended.

---

## M2-B — Ascout Counterfactual

### Goal

Obtain comparative evidence for whether a failure/regression is introduced by the change.

### Design

Use isolated worktrees/containers to compare:

```text
base source state
vs
changed source state
```

### Required semantics

- `OBSERVED_INTRODUCED_BY_CHANGE` only when comparable base passes and changed fails;
- `PREEXISTING_OBSERVATION` when both fail comparably;
- `RESOLVED_BY_CHANGE` where base fails and changed passes, when the target evidence is intentionally comparable;
- `UNRESOLVED` when environment, source, tool, selection, or execution mismatch prevents a defensible comparison.

### Safety

- never destructively switch the user's live working tree;
- bounded disk/runtime;
- exact source identities on both sides;
- command authority/admission independently evaluated for each tree;
- no causality claim from location alone.

---

## M2-C — Property / Fuzz / Differential Evidence

### Property testing

Preserve:

- seed;
- generated-case count;
- minimal/shrunk counterexample;
- property identity;
- exact runner/tool version.

Candidate JS/TS reference: fast-check.

### Fuzzing

Integrate native fuzzers only when the project already has them or policy explicitly configures them. Preserve corpus/crash identity without importing arbitrary fuzz infrastructure into core.

### Differential testing

Make reference-vs-change comparisons a first-class evidence type when projects already define a trusted oracle/reference path.

### Exit gate

Each adapter class must prove reproducibility, boundedness, and source binding before being admitted.

---

## M2-D — Selection Intelligence

### Goal

Select less verification without sacrificing measured failure recall.

### Native delegation candidates

- Vitest/Jest native related selection;
- Nx affected;
- Turbo task graph;
- Bazel query/test graph;
- language-native selectors where trustworthy.

### Requirements

- historical planning data never becomes current proof;
- shadow full-suite validation on a configurable sample;
- publish every selector miss;
- per-selector recall/time metrics;
- automatic widening on declared uncertainty;
- no unsupported universal recall threshold before data.

---

# M3 — Behavioral and Whole-Project Verification

M3 integrates mature domain-specific verification tools and keeps Ascout above them as evidence authority.

---

## M3-A — Browser/UI Evidence

### Candidate sources

- Playwright;
- Cypress;
- Shiplight-generated/project-native browser tests when present.

### Evidence to normalize

- browser/project matrix;
- test outcomes and retries;
- trace/video/screenshot artifacts;
- console/network errors;
- selection accounting;
- UI interaction coverage where trustworthy.

### Test-healing integrity

When tests change in the same source state:

- record changed test/assertion/snapshot/locator facts;
- do not infer semantic weakening automatically;
- allow policy to require independent or stronger verification after material verification-asset changes.

### Non-goal

Do not build a new browser engine or autonomous browser agent inside Ascout.

---

## M3-B — API / Contract / Stateful Evidence

### Candidate sources

- Schemathesis;
- RESTler;
- Pact;
- Dredd;
- project-native integration/contract tests.

### Applicability examples

- OpenAPI/GraphQL schema change;
- route/controller change;
- validation/DTO/serializer change;
- auth policy boundary change.

### Evidence

- changed operations exercised;
- generated case counts/seeds;
- schema violations;
- stateful sequence failures;
- negative-path results;
- reproducible minimal cases.

---

## M3-C — Real Environment Fidelity

### Candidate reference

Testcontainers and equivalent project-native disposable infrastructure.

### Evidence

- service/container image digests;
- database version;
- broker/cache version;
- environment config digest;
- runtime/browser identity;
- test isolation facts when observable.

### Non-goal

Ascout should not become an infrastructure orchestrator. It records and judges verification evidence from project-native environment setup.

---

## M3-D — Performance, Accessibility, Security

### Performance

Candidate reference: k6 thresholds / project-native benchmarks.

Record:

- configured policy/threshold;
- baseline and current value when comparable;
- threshold result;
- environment caveats.

### Accessibility

Candidate reference: axe-core plus project-native/manual review evidence.

Preserve:

- automated violations;
- incomplete/manual-review items;
- scope actually scanned.

### Security

Integrate selected scanners only after separate security/license/use/data review. Ascout should not duplicate SAST/SCA/DAST engines.

---

# M4 — Organization Policy, CI Fleet, and Attestable Verification

## M4-A — Evidence Policy

Introduce policy that declares required evidence, not arbitrary workflow execution.

Candidate change classes:

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

Candidate mapping examples:

```text
DATABASE_SCHEMA -> migration + integration evidence
UI -> browser + accessibility evidence
AUTHORIZATION -> negative-path + configured security evidence
API contract -> contract/stateful API evidence
critical module -> mutation-strength evidence
```

Applicability decisions must be explainable and source-bound.

---

## M4-B — CI/Organization Integration

Candidate surfaces:

- GitHub Action/check;
- GitLab CI component;
- Jenkins/Azure/Buildkite generic CLI use;
- optional hosted fleet/history view.

Core verification remains usable without account/cloud.

Hosted features may provide organization aggregation, policy management, benchmark trends, fleet observability, and retention — never hidden proof substitution.

---

## M4-C — Signed/Verifiable Attestations

Reuse SLSA/in-toto style provenance concepts rather than inventing a proprietary-only format.

Bind:

- artifact digest;
- source identity;
- Ascout receipt digest;
- policy identity;
- evidence digests;
- tool/runtime/environment identity;
- signer/provenance metadata.

Potential commands:

```text
ascout receipt
ascout receipt verify
ascout attest
```

Deployment systems can enforce policy on attestations without trusting human-readable summaries.

---

# M5 — Verification Ecosystem / Standardization

## Goal

Make Ascout the common verification judgment layer used by developers, coding agents, CI systems, and release systems.

## Candidate directions

### A. Agent-native distribution

- Ascout skill/instructions for Codex/Claude/Cursor/Copilot ecosystems;
- MCP read/invoke surface;
- bounded agent receipt optimized for model context;
- explicit protections preventing agent-side policy/admission escalation.

### B. Evidence adapters

Prefer stable documented adapters for standard/native formats rather than a code-executing plugin SDK in the trusted core.

### C. Standard inputs/outputs

Potential support:

- JUnit XML;
- LCOV;
- Cobertura;
- coverage-final.json;
- SARIF;
- Playwright/Cypress result formats;
- OpenTelemetry CI/CD telemetry;
- SLSA/in-toto attestations.

### D. Verification marketplace only if justified

Do not create a generic public plugin marketplace until multiple real adapter instances prove a stable trust/security contract is necessary.

---

# Cross-Milestone Invariants

Every future canonical plan should preserve:

1. current-run evidence is never replaced by history;
2. source/config/environment mismatches are visible;
3. missing required verification is a gap, not implicit pass;
4. external tool failure is distinguished from repository finding;
5. tool output is not trusted beyond what Ascout can validate/bind;
6. no implicit installs;
7. no required LLM/cloud for core truth;
8. no arbitrary workflow execution hidden in policy;
9. no unbounded adaptive loops;
10. no automatic agent admission escalation;
11. no fake confidence/correctness percentage;
12. every new adapter undergoes exact license/use/data/security review;
13. benchmark evidence is required before promoting broad default use;
14. Ascout remains useful when every optional future integration is absent.

---

# Canonicalization Procedure for Any Future Milestone

Before implementation of any M2+ capability:

1. re-read live repository truth and current master plan;
2. collect measured gap/benchmark evidence showing why the capability is needed;
3. perform donor/tool license/use/data/security review;
4. create a dedicated Spec Kit feature package;
5. define product and trust boundaries;
6. define data/evidence model changes;
7. define failure/incomplete/exit semantics;
8. define deterministic bounded execution;
9. define benchmark/acceptance gates;
10. run adversarial/YAGNI review;
11. obtain exact-head planning authorization;
12. implement in task/dependency order;
13. require exact-head review and CI evidence before merge/canonical closure.

---

# Roadmap Summary

| Priority | Milestone | Result |
|---|---|---|
| P0 | Current-head trust closure | No known receipt/CLI/security/scope contradictions |
| M1 | Founding receipt complete | Source-bound no-green-by-omission changed-code verification |
| M1.1 | Evidence depth | Branch/function/environment evidence where proven useful |
| M1.2 | Dogfood + benchmark | Ascout verifies Ascout; selector and receipt truth measured |
| M2-A | Challenge/mutation | Test strength, not just execution |
| M2-B | Counterfactual | Observed base-vs-change causality evidence |
| M2-C | Generative/differential | Property/fuzz/reference evidence |
| M2-D | Selection intelligence | Faster verification with measured recall |
| M3-A | Browser/UI | Playwright/Cypress/agent-browser evidence |
| M3-B | API/stateful | Contract and generated API evidence |
| M3-C | Environment fidelity | Real service/runtime verification context |
| M3-D | Perf/a11y/security | Policy-scoped quality dimensions |
| M4 | Enterprise | Evidence policy, CI fleet, signed attestations |
| M5 | Ecosystem | Ascout as common verification judgment layer |

---

# Strategic Success Condition

The intended end state is not "Ascout runs every test tool."

It is:

> A developer, coding agent, CI system, or deployment gate can ask Ascout whether an exact software change has enough trustworthy evidence for a defined policy, inspect exactly why, and see every material gap that prevents the claim.

## Spec 003 Closeout Record

**Closeout date:** 2026-09-01
**Canonical closeout head:** `c9df2b47c9b4b59c02274adc79397495363c7eb1`
**Qualification result:** `GO`
**Scope limit:** future planning only
**product_integration_authorized:** `false`
**function_coverage_qualified:** `false`

Spec 003 benchmark-only branch-exercise qualification completed all promotion gates: deterministic branch-only gap detected, fully-exercised false-gap count zero, unknown branch data remains unresolved, malformed/path-unsafe evidence fails closed, deterministic serialization proven, six-lane Project CI green on exact closeout head, and no product/receipt/package/dependency surface changed. Product branch-coverage semantics remain unauthorized until a separate canonical Spec Kit chain and explicit implementation authorization are complete.
