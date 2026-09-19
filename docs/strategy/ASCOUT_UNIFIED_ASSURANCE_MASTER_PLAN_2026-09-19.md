# Ascout Unified Assurance Platform — Master Plan

**Status:** PLANNING_ONLY / NO_IMPLEMENTATION_AUTHORITY  
**Date:** 2026-09-19  
**Planning branch:** plan/unified-assurance-platform  
**Canonical base at creation:** e23331a46ea04bbcfd4dc4e2b538dbb410125a1a  
**Current Ascout frontier at base:** Spec 016 through P016-13 merged; P016-14 and later work remain successor work  
**Founder direction:** converge Ascout, Kodac, and Sentrdel into one product and one repository named Ascout

## 1. Executive decision

Ascout becomes the single engineering-assurance product.

It MUST NOT become three products hidden behind one CLI. Review, testing, application security, cyber assurance, browser verification, evidence, and release confidence must share one target identity, one evidence model, one coverage model, one finding lifecycle, one freshness model, and one policy/authority system.

The product thesis is:

> For this exact source/project/change identity, Ascout shows what was reviewed, tested, security-checked, attacked or challenged, what evidence supports each claim, what remains unknown, what became stale, and what is still unsafe to claim.

The user-facing product is intentionally simple:

~~~text
ascout review
ascout test
ascout security
ascout cyber
ascout assure
~~~

The user chooses the assurance intent. Ascout chooses only qualified engines needed for that intent and makes omissions explicit.

The merger strategy is selective capability convergence, not repository concatenation:

~~~text
ASCOUT = TRUST KERNEL + USER EXPERIENCE + TEST/BROWSER FOUNDATION
KODAC = REVIEW / WORKFLOW / GITHUB / QUALIFICATION CAPABILITIES
SENTRDEL = SECURITY-INVARIANT / EVIDENCE / COVERAGE / RETEST CAPABILITIES
WEPLD ASSURANCE FABRIC = SHARED ARCHITECTURE PATTERN
ALIBABA OPEN CODE REVIEW = PRIMARY AI REVIEW ENGINE CANDIDATE
CLOUDFLARE SECURITY AUDIT SKILL = DEEP SECURITY AUDIT METHOD CANDIDATE
~~~

Ascout remains the final evidence and claim authority. No donor engine, scanner, reviewer, model, sandbox, CI job, or threat-intelligence source independently grants PASS, VERIFIED, release readiness, or completion.

## 2. Non-negotiable product invariants

The following rules survive every migration:

1. Evidence before claims.
2. No green by omission.
3. Every material result is bound to an exact target/source identity.
4. Engine output is untrusted input until normalized and validated.
5. A model finding is not proof merely because multiple models agree.
6. A clean scanner does not delete another valid finding.
7. A passing test does not imply untested behavior is correct.
8. Coverage is multidimensional and omissions remain visible.
9. A changed source/head invalidates stale acceptance-critical evidence unless an explicit reconciliation proves applicability.
10. Retry PASS is not silently equivalent to clean PASS.
11. Dynamic security execution never inherits authorization from repository ownership, browser login, a URL in source, or a model request.
12. Source-use permission does not replace exact provenance, license/notice, dependency, security, and behavioral qualification.
13. Tool availability is not tool authority.
14. A plan is not execution authority.
15. A fix proposal is not write authority.
16. Review publication is a separate effect from review generation.
17. Secrets are never needed merely to produce deterministic local evidence.
18. Local-first operation remains the default.
19. Missing engines fail visible; Ascout never silently substitutes a weaker engine while preserving a stronger claim.
20. Historical Kodac/Sentrdel evidence remains historical and MUST NOT be relabeled as Ascout proof for a new source tree.

## 3. Product surfaces

### 3.1 Review

Primary commands:

~~~text
ascout review
ascout review --diff
ascout review --pr <ref>
ascout review --workspace
ascout review --architecture
ascout review --spec
ascout review --correctness
ascout review --performance
ascout review --security
ascout review --full
~~~

Review answers correctness, architecture, maintainability, specification/contract conformance, regression risk, test quality, performance risk, and security-relevant engineering concerns.

Alibaba OpenCodeReview is the primary external AI review engine candidate. Its deterministic selection/grouping/rule pipeline and agent review are wrapped by Ascout rather than made authoritative.

Kodac contributes durable review orchestration, exact-head freshness, provider-neutral reviewer execution patterns, bounded GitHub context, publication admission, review-to-publication lineage, resumable workflow evidence, and Done-gate discipline.

### 3.2 Test

Primary commands:

~~~text
ascout test --quick
ascout test --changed
ascout test --standard
ascout test --workspace
ascout test --deep
ascout test --release
ascout test --adversarial
~~~

Test can plan and, only when authorized, execute:

~~~text
format/style
compile/build
typecheck
lint/static checks
unit
integration
contract/schema
snapshot/golden
coverage
property-based
mutation
fuzz
API/schema-driven
browser/E2E
security regression
platform-specific
formal/model checking
performance/regression
recovery/failure-injection
~~~

The existing Ascout check engine, changed-code evidence, source binding, P016 browser foundation, journey mapping, browser evidence, recovery visibility, and generated-test admission path remain the native base.

### 3.3 Security

Primary commands:

~~~text
ascout security --quick
ascout security --diff
ascout security --workspace
ascout security --sast
ascout security --secrets
ascout security --dependencies
ascout security --supply-chain
ascout security --sbom
ascout security --iac
ascout security --ci
ascout security --reachability
ascout security --threat-model
ascout security --deep
~~~

Security is the local AppSec and invariant-regression surface. Sentrdel is the principal capability donor.

The target stack includes deterministic/structural analysis, secret/private-data detection, SCA and OSV evidence, SBOM, license/policy checks, IaC/CI checks, dependency-risk signals, semantic reachability, security invariants, trusted-base regression, proof artifacts, remediation/retest, and conformance.

### 3.4 Cyber

Primary commands:

~~~text
ascout cyber --quick
ascout cyber --audit
ascout cyber --threat-model
ascout cyber --supply-chain
ascout cyber --intel
ascout cyber --adversarial
ascout cyber --dynamic
~~~

Cyber is deliberately higher-authority than ordinary code security. It owns security-audit campaigns, threat intelligence, attack-surface reasoning, supply-chain admission experiments, adversarial/failure testing, and later explicitly authorized dynamic verification.

Cloudflare Security Audit Skill is the primary audit-method donor: reconnaissance, coverage-led hunting, candidate validation, structured findings, independent finding verification, and target-neutral reporting are adapted into Ascout-owned contracts.

Cyber dynamic execution is never enabled by default and requires exact target authorization, network scope, credential scope, rate/concurrency/time budget, sandbox/containment qualification, stop conditions, and evidence policy.

### 3.5 Assure

Primary commands:

~~~text
ascout assure --quick
ascout assure --standard
ascout assure --deep
ascout assure --release
ascout assure --adversarial
~~~

Assure is the composite claim-oriented surface. It does not average scores.

Given a requested claim, it builds the minimum sufficient review/test/security/cyber plan, records omitted classes and reasons, reconciles findings/evidence, detects contradictions and staleness, and returns a typed claim assessment.

Example:

~~~text
REQUESTED_CLAIM = RELEASE_READY

required evidence:
- exact source identity
- build/type/lint
- affected + required tests
- changed-code exercise evidence
- required browser journeys
- review coverage
- security coverage
- dependency/supply-chain state
- unresolved finding state
- platform matrix required by policy
- provenance/release artifact identity

missing one mandatory class => INCOMPLETE
contradictory evidence => BLOCKED or INCONCLUSIVE
all mandatory evidence satisfied => claim may qualify
~~~

## 4. Shared assurance architecture

The architecture adopts and specializes the strongest pattern already present in TheHalfMoon/wepld Assurance Fabric.

~~~text
User / IDE / MCP / CI
        |
        v
Assurance Intent
        |
        v
Target + Policy Snapshot + Requested Claim
        |
        v
Assurance Planner
        |
        +-------------------------------+
        |               |               |
        v               v               v
Review profile      Test profile    Security/Cyber profiles
        |               |               |
        +------- Qualified Engine Registry -------+
                        |
                        v
                    Engine Runs
                        |
                        v
            Evidence / Findings / Coverage
                        |
                        v
                Reconciliation Kernel
                        |
                        v
         Reverification + Freshness + Claim Assessment
                        |
                        v
          Terminal / JSON / SARIF / JUnit / MCP / GitHub
~~~

There is exactly one canonical assurance kernel.

### 4.1 Core contracts

The formal successor specification must freeze at least:

- AssuranceTarget
- AssuranceIntent
- AssurancePolicySnapshot
- AssurancePlan
- EngineDescriptor
- EngineQualification
- EngineRun
- EvidenceRecord / EvidenceRef
- Finding
- FindingLifecycleEvent
- CoverageClaim
- OmissionRecord
- ContradictionRecord
- Reproduction
- ProofArtifactReference
- FixProposal
- Reverification
- ThreatModel
- DynamicTargetAuthorization
- SecurityPackManifest
- DonorSourceRecord
- AssuranceBundle
- ClaimAssessment
- PublicationIntent / PublicationReceipt

Every serialized contract requires schema versioning, strict validation, deterministic identity/digest rules where meaningful, bounded fields, and explicit unknown/unsupported states.

### 4.2 One target identity

All profiles bind to one AssuranceTarget. At minimum it carries repository identity, base/head/source-start identity, worktree generation, tree/change-set identity, policy snapshot, specification/task identity where applicable, relevant environment/platform identity, and graph/index generation.

Evidence from a different target cannot be silently reused.

### 4.3 One finding lifecycle

Review, test-quality, security, dependency, runtime, and cyber findings use one lifecycle:

~~~text
CANDIDATE
REQUIRES_MORE_EVIDENCE
VALIDATED
OPEN
REJECTED_FALSE_POSITIVE
REPAIRED_PENDING_REVERIFY
VERIFIED_FIXED
ACCEPTED_RISK
SUPERSEDED
~~~

A later clean run never erases a validated historical finding. Reverification creates a new lifecycle event.

### 4.4 One coverage model

Coverage is not one number. Required dimensions include:

- changed files/symbols reviewed
- logical change groups reviewed
- languages/ecosystems understood
- review rules applied
- tests selected/executed
- statement/branch/function/changed-line exercise where meaningful
- mutation attempts/kills/survivors
- property/fuzz input space and counterexamples
- browser journeys/obligations
- SAST/rule classes
- dependencies inventoried
- reachability paths analyzed
- secrets/IaC/CI/supply-chain classes
- security invariants evaluated
- threat-model assets/boundaries covered
- platforms/runtimes/browsers
- dynamic targets/endpoints exercised
- unsupported/unreadable/opaque regions
- reviewer/engine independence where required

Unknown coverage remains unknown.

## 5. Engine architecture

### 5.1 Engine rule

Every engine is described by:

~~~text
engine identity + exact version/source
capabilities
supported input/output
effect classes
process/network/provider requirements
sandbox requirements
configuration trust boundary
source/license/admission state
qualification evidence
known limitations
authority ceiling
~~~

Engine output cannot exceed its authority ceiling.

### 5.2 Alibaba OpenCodeReview integration

Observed planning snapshot:

~~~text
repository: alibaba/open-code-review
snapshot: 7a571b78d3493b249f6ad14d835c6a79a0a67d2e
license observed: Apache-2.0
~~~

Ascout Review v1 MUST use Alibaba OpenCodeReview as a first-class engine where its provider requirements are satisfiable.

Integration contract:

1. Ascout owns target identity and diff/base/head selection.
2. Ascout constructs a bounded Review Context Capsule from repository facts, specs, obligations, rules, related tests, and architecture context.
3. OpenCodeReview performs deterministic file selection/grouping/rule matching and agent review.
4. Prefer machine-readable JSON/delegation interfaces over parsing terminal prose.
5. Raw OpenCodeReview results are ExternalReviewObservation records, not canonical Findings.
6. Ascout validates locations, source identity, file membership, duplication, severity vocabulary, and evidence references before promotion.
7. Kodac-derived reconciliation/workflow logic governs disposition and optional GitHub publication.
8. OpenCodeReview MUST NOT directly mutate source or publish acceptance-critical comments by default.
9. Provider/model identity, prompt/rule/config identity, budget, and omitted groups are recorded.
10. Missing provider/model capability becomes visible NOT_RUN/INCOMPLETE, never silent fallback.
11. Acceptance-critical review may require a second independent reviewer/engine according to policy.
12. A future selective source port is allowed only after exact path-level provenance and characterization tests.

The implementation strategy is adapter-first. A later bundled Go companion or selective source port is benchmark-justified, not assumed.

### 5.3 Kodac capability convergence

Kodac is not imported wholesale.

Port or adapt, in dependency order:

- immutable patch/review proposal identity
- exact GitHub read-only context
- review-context capsule and provider-neutral execution
- review finding normalization/reconciliation
- exact-head freshness and review invalidation
- safe publication admission
- bounded GitHub review publication
- review-to-publication receipts
- durable/resumable workflow evidence
- retry/idempotency/unknown-result reconciliation
- role/reviewer separation
- K2-style side-effect boundary concepts
- K5/Done-gate claim discipline
- donor provenance machinery
- LoopForge patterns where they strengthen resumability
- SkillHone evaluation patterns where they strengthen reviewer/skill evaluation
- AI-Infra-Guard patterns where they strengthen skill/tool risk visibility

Every port requires parity fixtures against the source behavior being retained.

### 5.4 Sentrdel capability convergence

Sentrdel also is not imported wholesale as a second authority.

Retain as a qualified Rust companion engine initially where that minimizes semantic risk. Ascout owns orchestration and truth reconciliation.

Port or integrate:

- Evidence and Coverage semantics
- deterministic engine boundary
- structural/security parsing
- Semantic Security Graph concepts
- invariant families
- trusted-base invariant regression
- explicit UNKNOWN/COVERAGE_LOST behavior
- external Evidence import
- SAST/SARIF normalization
- dependency/reachability evidence
- proof/reproduction artifact semantics
- remediation -> retest lifecycle
- security pack/conformance contracts
- deployment/runtime observation correlation only in later qualified work
- threat intelligence interfaces without making external intel a base dependency

Long-term language consolidation is optional. It must be justified by measured packaging/latency/maintenance benefit. Rewriting the Rust core merely to make the repository single-language is rejected.

### 5.5 Cloudflare Security Audit method

Observed planning snapshot:

~~~text
repository: cloudflare/security-audit-skill
snapshot: c1c8a8c1471069fb0e188eeaff69b8e8db6564a8
license observed: MIT
~~~

Adapt the audit workflow into Ascout-owned orchestration:

~~~text
reconnaissance
-> attack-surface / coverage ledger
-> parallel bounded hunting
-> candidate finding normalization
-> evidence validation
-> independent per-finding verification
-> target-neutral reporting
-> remediation/retest
~~~

Cloudflare instructions are a method donor, not a new trust root.

Rules:

- Source reconnaissance can remain read-only.
- Build/test/process/browser/fuzzer execution requires qualified containment/authority.
- Every candidate finding needs a concrete principal, resource/asset, violated security property, and evidence chain where applicable.
- Deep mode may use multiple independent agent waves, but agent consensus cannot replace deterministic evidence.
- The coverage ledger is mandatory so unreviewed regions do not disappear.
- Independent finding verification must use fresh context and cannot merely restate the originating model output.
- External network access remains disabled unless the exact cyber task explicitly authorizes it.

## 6. Test architecture

Existing Ascout remains the native deterministic test authority.

The unified test planner adds adapters rather than replacing mature runners.

Prioritized classes:

1. existing type/lint/test/pytest tasks and source/coverage receipts;
2. P016 Playwright/browser journeys and evidence;
3. contract/schema/API tests;
4. property-based and fuzz counterexamples;
5. mutation evidence;
6. performance/regression;
7. platform/browser matrices;
8. formal/model checking where a project already has a qualified tool;
9. failure injection/recovery tests for deep/adversarial profiles.

Test selection must be evidence-backed. Unknown impact widens or marks incompleteness; it never narrows by assumption.

## 7. Security and cyber architecture

### 7.1 Deterministic first

The default path prioritizes deterministic/local evidence:

- structural SAST
- secret/private-data detection
- SCA/OSV
- CycloneDX/SPDX inventory
- license/policy
- IaC/config
- CI/workflow security
- package/supply-chain signals
- semantic reachability
- security invariants
- regression pairs
- security regression tests

Semgrep, CodeQL/SARIF, OSV-compatible sources, package scanners, and other external engines are adapter candidates. Their output is normalized, not treated as truth.

### 7.2 Threat intelligence

Threat intelligence is optional enrichment.

STIX/TAXII/OpenCTI-compatible adapters may correlate CVEs, techniques, indicators, campaigns, and internal assets. The local project remains useful without an OpenCTI server or cloud service.

Threat-intelligence freshness and source identity are explicit. Stale intel never silently becomes current.

### 7.3 Dynamic/adversarial security

Dynamic security requires a separate effect envelope with:

- owned/authorized target proof
- canonical allowed hosts/origins/ports/protocols
- network authority
- safe credential capability with least privilege
- no credential forwarding across unqualified redirects/origins
- rate/concurrency/request/time budgets
- sandbox/container/runtime identity
- scanner/template/plugin identity
- forbidden targets/actions
- stop conditions
- request/response evidence classification/redaction
- rollback/cleanup
- incident handling

No general autonomous exploitation authority is part of the base product.

## 8. Sandbox and execution boundary

OpenSandbox and Kodac sandbox research are high-value references/candidates, but a provider's capability declaration is never proof.

Every proof-bearing provider/configuration must have a qualification profile.

Initial execution classes:

~~~text
READ_ONLY_HOST
TRUSTED_LOCAL_PROCESS
ISOLATED_LOCAL
ISOLATED_NETWORK_DENY
AUTHORIZED_NETWORK
LIVE_EXTERNAL
~~~

Profiles state their required execution class before launch.

A weaker runtime cannot silently satisfy a stronger profile.

## 9. Data, privacy, and secret model

- Local-first is default.
- Raw repository content is not uploaded unless the selected engine/provider explicitly requires it and policy allows it.
- Provider egress is visible before execution.
- Secret-bearing environment variables are allowlisted, not inherited broadly.
- Logs/evidence apply bounded redaction but redaction is not a license to expose broad credentials.
- Synthetic secrets/canaries are preferred in benchmarks.
- Evidence artifacts receive data classification, retention, and export rules.
- User can inspect which engine received which content class.
- No telemetry is required for core operation.
- Future opt-in telemetry cannot contain source, secrets, raw findings, or private paths by default.

## 10. CLI and interaction model

Backward compatibility is mandatory.

Existing commands remain valid until separately versioned:

~~~text
ascout init
ascout doctor
ascout check
~~~

New additive commands:

~~~text
ascout review
ascout test
ascout security
ascout cyber
ascout assure
ascout explain <finding|claim|run>
ascout evidence <run>
ascout engines
ascout doctor --assurance
~~~

Do not silently redefine ascout check as full assurance.

Every effectful command supports a plan/preview form before execution.

Machine surfaces include bounded JSON and agent/MCP outputs. GitHub publication and IDE annotations consume the same canonical result model.

## 11. Repository target structure

A future implementation may converge toward:

~~~text
src/
  assurance/
    kernel/
    contracts/
    planner/
    policy/
    reconciliation/
    freshness/
    profiles/
      review/
      test/
      security/
      cyber/
      assure/
    engines/
      registry/
      adapters/
    output/
    publication/
  browser/
  existing-core/

engines/
  sentrdel/
  optional-companions/

schemas/
  assurance/

benchmarks/
  assurance/
  review/
  test/
  security/
  cyber/

provenance/
  sources/
  imports/

docs/
  assurance/
~~~

The repository MUST NOT create a second canonical graph, evidence store, or finding schema for each profile.

## 12. Migration strategy for Kodac and Sentrdel

### Stage M0 — Freeze identities, do not archive

Record exact donor heads/trees and capability inventories. Keep Kodac and Sentrdel operational and unchanged while parity work begins.

### Stage M1 — Characterization

For each retained capability, create frozen input/output fixtures and invariants in the donor repository or Ascout benchmark corpus.

### Stage M2 — Adapter bridge

Allow Ascout to consume donor/companion engine outputs through strict versioned adapters. This proves product integration before source migration.

### Stage M3 — Selective port

Move only code/components justified by architecture, packaging, or trust needs. Every copied/derived file receives exact donor mapping, source pin, license/permission basis, notices, dependency delta, security review, behavioral equivalence tests, and modification notes.

### Stage M4 — Dual-run parity

For representative corpus cases, run old and new paths and classify semantic differences. Do not require byte-identical output where the new canonical schema is intentionally richer; require claim/evidence invariants.

### Stage M5 — Ascout canonicalization

Only after parity and benchmark gates, make Ascout the sole maintained implementation for the migrated capability.

### Stage M6 — Historical repositories

Kodac/Sentrdel may become read-only/archive references only after:
- all selected capabilities are mapped;
- unresolved capabilities are explicitly deferred/rejected;
- provenance links remain durable;
- migration parity is proven;
- documentation points to Ascout;
- no active release/support obligation still depends on the old repositories.

Never delete history.

## 13. Implementation program

This plan does not steal numbering from the active Spec 016 sequence. Formal task IDs are assigned only after current canonical governance authorizes the successor specification.

Recommended dependency-ordered program:

### UA-00 — Live reconciliation and implementation authorization
Re-read main after P016 successor state, freeze exact source snapshots, reconcile Constitution, define first bounded wedge, and create explicit authority.

### UA-01 — Unified assurance contracts
Implement AssuranceTarget, Intent, Plan, EngineDescriptor/Run, Evidence, Finding, Coverage, Omission, Reverification, Bundle, ClaimAssessment.

### UA-02 — Engine registry and authority ceilings
Versioned adapters, qualification records, capability discovery, explicit unavailability, no silent fallback.

### UA-03 — Review foundation with Alibaba OpenCodeReview
Pinned adapter, context capsule, JSON/delegation ingestion, location/source validation, normalized findings, review coverage, provider/budget evidence.

### UA-04 — Kodac review/workflow convergence
Freshness, role separation, durable workflow state, publication admission/receipts, idempotency, safe GitHub effects.

### UA-05 — Test profile convergence
Wrap existing Ascout check; unify coverage/omission semantics; preserve compatibility.

### UA-06 — Advanced test evidence
Browser/P016 integration plus property/fuzz/mutation/API/performance adapters behind qualification.

### UA-07 — Sentrdel security adapter
Exact Rust engine identity, deterministic result import, invariant/coverage semantics, SARIF/external evidence boundary.

### UA-08 — Native security profile
SAST/secrets/SCA/SBOM/IaC/CI/reachability/invariant-regression plan and reconciliation.

### UA-09 — Cloudflare-derived deep audit orchestration
Recon, coverage ledger, hunter waves, candidate validation, independent verification, machine outputs.

### UA-10 — Cyber profile
Threat model, threat-intel adapters, supply-chain admission, adversarial planning. No dynamic execution yet.

### UA-11 — Qualified sandbox/effect fabric
Execution classes, OpenSandbox/provider qualification, egress/credentials/resource/cleanup evidence.

### UA-12 — Dynamic cyber
Only after UA-11: explicit target authorization, bounded network security verification, proof artifacts, stop/cleanup controls.

### UA-13 — Cross-domain evidence joins
Review -> changed symbols -> reachability -> tests -> findings -> fixes -> retest. Prefer deterministic/project graph evidence; no mandatory graph database.

### UA-14 — Explain/reproduce/retest
One command can explain why a finding/claim exists, reproduce where authorized, and retest after a fix.

### UA-15 — CLI/MCP/IDE/GitHub product surfaces
Review/test/security/cyber/assure, machine contracts, IDE diagnostics, GitHub checks/comments without duplicate authority.

### UA-16 — Conformance and adversarial benchmark
Frozen corpora, holdouts, malicious engine output, source mismatch, stale cache, evidence injection, contradictory engines, secret leakage, sandbox escape assumptions, incomplete coverage.

### UA-17 — Donor migration and retirement gates
Kodac/Sentrdel parity, selective ports, notices/provenance, archived-repo readiness.

### UA-18 — Release qualification
Cross-platform packaging, optional companion binaries, supply-chain attestations, install/update/rollback, performance/resource budgets, documentation, security reporting.

## 14. First implementation wedge

The first wedge should be deliberately narrow:

~~~text
Unified contracts
+ Engine registry
+ Review profile
+ Alibaba OpenCodeReview adapter
+ existing Ascout test adapter
+ normalized Evidence/Finding/Coverage output
~~~

Do NOT put Sentrdel source migration, Cloudflare deep audit, OpenSandbox, dynamic cyber, threat-intel servers, IDE UI, or auto-fix into the first wedge.

The first killer workflow:

~~~text
ascout review --diff
-> exact target/source binding
-> deterministic change/context selection
-> Alibaba OpenCodeReview review
-> normalized findings
-> explicit review coverage
-> second deterministic/local evidence where relevant
-> Ascout receipt
-> optional separately admitted GitHub publication
~~~

The second workflow:

~~~text
ascout assure --standard
-> Review + existing Test
-> shared target
-> shared evidence
-> shared omissions
-> one claim assessment
~~~

Then add Sentrdel security.

## 15. Benchmarks and hard gates

Aggregate quality scores can guide optimization but cannot override hard integrity gates.

Absolute-zero gates include:

- cross-target evidence leakage
- fabricated PASS
- hidden applicable NOT_RUN
- source-binding violation
- stale evidence accepted as current
- unqualified model-only deterministic PASS
- finding deletion caused only by another clean engine
- recovery-history erasure
- silent weaker-engine fallback
- unrecorded provider/model identity on claim-bearing runs
- secret leakage from Ascout-owned artifacts
- unauthorized source mutation
- unauthorized GitHub publication
- unauthorized network target execution
- credential forwarding outside exact authority
- donor source without provenance mapping
- unsupported region silently counted as covered

Review benchmark metrics:
- validated defect recall/precision on owned/frozen corpus
- changed-scope coverage
- location validity
- duplicate rate
- context/budget efficiency
- false acceptance rate
- independent verification agreement/disagreement accounting

Test benchmark metrics:
- seeded regression detection
- changed behavior exercise
- mutation score where used
- fuzz/property counterexample quality
- flaky classification
- selection precision/recall
- browser journey coverage

Security benchmark metrics:
- invariant regression detection
- known-safe false positives
- coverage loss honesty
- reachability correctness
- external-engine reconciliation
- remediation/retest correctness

Cyber benchmark metrics:
- threat-model coverage
- finding validation rate
- independent-verifier rejection quality
- sandbox/effect containment
- authorization/target-boundary refusal
- cleanup and incomplete-run honesty

## 16. Definition of unified-platform success

The merger is complete only when all of the following are proven:

1. Ascout is the canonical maintained repository/product for selected Review, Test, Security, and Cyber capabilities.
2. Users can intentionally select review, test, security, cyber, or composite assurance without learning donor-tool internals.
3. All profiles share one exact-target/evidence/finding/coverage/freshness model.
4. Alibaba OpenCodeReview is integrated as a qualified Review engine or a documented benchmark-proven successor supersedes it.
5. Kodac review/workflow capabilities selected for retention have parity evidence in Ascout.
6. Sentrdel security/invariant capabilities selected for retention are accessible through Ascout and normalized without loss of uncertainty/coverage semantics.
7. Cloudflare-derived audit workflow is represented in deep security/cyber assurance with coverage-led and independent validation semantics.
8. Existing Ascout check/browser contracts remain backward compatible or are explicitly versioned.
9. Local deterministic use requires no cloud account.
10. Optional model/network/dynamic capabilities reveal their authority and data requirements.
11. Cross-platform packaging and companion-engine behavior are proven.
12. Donor provenance/notices are complete.
13. No active Kodac/Sentrdel capability remains ambiguously duplicated.
14. Old repositories can be archived without losing source history, provenance, or operational dependencies.
15. The release claim is supported by exact-head benchmark, CI, security, review, provenance, and packaging evidence.

Until these are proven:

~~~text
ASCOUT_UNIFIED_PLATFORM_COMPLETE = NO
KODAC_RETIREMENT_AUTHORIZED = NO
SENTRDEL_RETIREMENT_AUTHORIZED = NO
~~~

## 17. Final architectural decision

The key differentiator is not “more scanners.”

Ascout should become an **Engineering Assurance OS**:

~~~text
exact target
+ review intelligence
+ test evidence
+ security invariants
+ cyber audit
+ browser behavior
+ provenance
+ explicit authority
+ freshness/reverification
= claims developers can inspect and trust
~~~

Alibaba, Cloudflare, Kodac, Sentrdel, WePLD Assurance Fabric, and the broader donor/source portfolio are capability inputs.

Ascout is the product.
Ascout owns the truth contract.


---

## 18. Normative Kernux Reality Execution Amendment — 2026-09-19

This section is normative where earlier text is silent or narrower.

Kernux is now a **PRIMARY_EXECUTION_FABRIC_DONOR / ADAPTER_TARGET** for Ascout Reality Verification.

Updated capability map:

```text
ASCOUT = TRUST KERNEL + USER EXPERIENCE + CLAIM AUTHORITY
KODAC = REVIEW / WORKFLOW / GITHUB / QUALIFICATION
SENTRDEL = SECURITY / INVARIANTS / COVERAGE / RETEST
KERNUX = WEB / COMPUTER / APP / LAB / LOCAL-REMOTE RUNTIME EXECUTION
WEPLD ASSURANCE FABRIC = SHARED ASSURANCE ARCHITECTURE
ALIBABA OPEN CODE REVIEW = PRIMARY AI REVIEW ENGINE CANDIDATE
CLOUDFLARE SECURITY AUDIT SKILL = DEEP AUDIT METHOD CANDIDATE
```

`ascout test` therefore has two layers:

```text
CODE VERIFICATION
+ REALITY VERIFICATION
```

Reality Verification may require the exact reviewed candidate to be built and exercised through qualified Kernux browser, web, computer, app, files/process/PTY, local, lab, WSL, container, VM, SSH, or paired-runtime capabilities.

Kernux Events/Artifacts/Evidence are execution observations. They do not grant Ascout PASS. Ascout normalizes them into the canonical Evidence/Coverage/Finding model and retains final ClaimAssessment authority.

The detailed contract is frozen in:

- `ASCOUT_KERNUX_REALITY_VERIFICATION_FABRIC_2026-09-19.md`
- `ASCOUT_UNIFIED_ASSURANCE_CONTRACT_FREEZE_2026-09-19.md`
- `ASCOUT_UNIFIED_ASSURANCE_IMPLEMENTATION_BLUEPRINT_2026-09-19.md`
- `ASCOUT_UNIFIED_ASSURANCE_TASK_REGISTRY_2026-09-19.md`

Implementation must not claim Kernux capabilities that are only planned upstream. Availability and qualification remain explicit.
