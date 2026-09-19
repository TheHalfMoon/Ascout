# Ascout Unified Assurance — Gap Audit and Closure Matrix

**Status:** PLANNING_AUDIT / KNOWN_GAPS_MAPPED / IMPLEMENTATION_NOT_AUTHORIZED  
**Date:** 2026-09-19  
**Canonical planning base:** e23331a46ea04bbcfd4dc4e2b538dbb410125a1a  
**Documents audited:**
- ASCOUT_UNIFIED_ASSURANCE_MASTER_PLAN_2026-09-19.md
- ASCOUT_UNIFIED_ASSURANCE_SOURCE_MAP_2026-09-19.md
- live Ascout/Kodac/Sentrdel/WePLD planning and implementation evidence available during this review

## 1. Audit conclusion

The unified direction is architecturally coherent if Ascout remains the sole claim/evidence authority and Review/Test/Security/Cyber are profiles over one assurance fabric.

No known design area identified in this audit requires a competing truth kernel, a second canonical finding model, or a wholesale merge of Kodac/Sentrdel runtimes.

However, "no gaps" cannot honestly mean "no unknown future implementation defect." It means:

- all currently identified material product/architecture/trust/migration/source/operations gap classes have an explicit owner and closure gate;
- no material gap is silently treated as implemented;
- future implementation may not claim completion while any required row remains unproven.

The completion system therefore uses PROVEN / PARTIAL / MISSING / NOT_APPLICABLE rather than a narrative declaration.

## 2. Current live-state constraint

At the planning base, Ascout main is at:

~~~text
e23331a46ea04bbcfd4dc4e2b538dbb410125a1a
~~~

Spec 016 work through P016-13 is merged. The unified plan MUST NOT silently replace, renumber, or bypass P016-14+.

Gap: successor sequencing could conflict with current browser/agentic work.

Closure:

- keep this package planning-only;
- reconcile against then-current main before implementation;
- either complete the remaining authorized Spec 016 chain or explicitly amend it through canonical governance;
- reuse P016 browser evidence and generated-test admission rather than duplicating it.

Status: MAPPED / NOT YET PROVEN.

## 3. Gap matrix

### G01 — Three competing truth authorities

Risk:
Ascout, Kodac, and Sentrdel each contain strong evidence/governance semantics. A naive merge could create contradictory sources of PASS/VERIFIED/completion.

Closure:
Ascout Assurance Kernel owns target, evidence, findings, coverage, freshness, and ClaimAssessment. Kodac/Sentrdel outputs are engine/capability inputs with explicit authority ceilings.

Acceptance:
No engine-specific path can create a terminal Ascout claim without kernel reconciliation.

Status: DESIGN_CLOSED / IMPLEMENTATION_MISSING.

### G02 — Review engine dependence on a model/provider

Risk:
Alibaba OpenCodeReview is high-value but agent review may require model/provider capability. Local/offline users must not lose all review semantics or receive false green.

Closure:
- deterministic target/context/rule/file-selection remains available;
- provider requirement is explicit;
- missing provider becomes NOT_RUN/INCOMPLETE;
- delegation mode may use the host agent while preserving provider/model provenance;
- deterministic review evidence and test/security evidence remain separate;
- no model is required for Test core.

Acceptance:
No provider configured -> Review does not report full completion.

Status: DESIGN_CLOSED / IMPLEMENTATION_MISSING.

### G03 — AI reviewer self-certification and circularity

Risk:
The model that generated/fixed code may review itself; multiple calls to the same context/model may appear independent.

Closure:
Reviewer identity includes provider/model/config/context lineage. Acceptance-critical policies can require independent reviewer identity/context. Second-review independence is a policy fact, not a boolean supplied by the engine.

Acceptance:
Circular reviewer chains cannot satisfy INDEPENDENT_REVIEW.

Status: DESIGN_CLOSED / IMPLEMENTATION_MISSING.

### G04 — Prompt injection and malicious repository text

Risk:
Source files, comments, docs, issue text, test output, or dependencies may contain instructions aimed at review/security agents.

Closure:
- repository content is untrusted data;
- prompts separate policy/instructions from source;
- tools have capability allowlists;
- agents are proposal-only;
- source cannot grant network/write/publication authority;
- tool calls and egress are evidence;
- malicious fixture corpus required.

Acceptance:
Seeded prompt-injection content cannot expand authority or suppress required checks.

Status: MAPPED / BENCHMARK_MISSING.

### G05 — Review coverage hidden behind a few comments

Risk:
A reviewer may produce useful findings while silently missing files/groups.

Closure:
Review CoverageClaim records changed files, logical groups, rule scopes, reviewed/unreviewed paths, truncation/budget, unsupported languages, and model/context omissions.

Acceptance:
Unreviewed applicable scope blocks unqualified "review complete."

Status: DESIGN_CLOSED / IMPLEMENTATION_MISSING.

### G06 — Conflicting reviewers/scanners

Risk:
One engine reports a vulnerability while another is clean.

Closure:
Findings are append-only lifecycle objects. Clean results are evidence, not deletion. Reconciler records contradiction/disposition; only supporting invalidation evidence can reject a finding.

Acceptance:
"clean engine B" alone cannot delete validated finding A.

Status: DESIGN_CLOSED / IMPLEMENTATION_MISSING.

### G07 — Finding deduplication destroys provenance

Risk:
Merging similar findings may hide independent observations or locations.

Closure:
Dedup creates grouping/correlation identities while preserving producer observations and EvidenceRefs. Fingerprints are weak/versioned matching aids, never global proof identity.

Status: DESIGN_CLOSED / IMPLEMENTATION_MISSING.

### G08 — Test selection false confidence

Risk:
Changed/affected test selection can miss relevant tests.

Closure:
Unknown impact widens or remains coverage debt. Selection evidence records graph/coverage/history inputs and omitted categories. Release policy can require wider suites.

Status: EXISTING_AScout_PRINCIPLE / ADVANCED_INTEGRATION_MISSING.

### G09 — Passing tests without behavioral coverage

Risk:
A green runner does not prove changed behavior was exercised.

Closure:
Preserve changed-code exercise semantics; extend CoverageClaim to branch/function/journey/mutation/property/API dimensions where meaningful.

Status: PARTIAL_EXISTING / EXPANSION_MISSING.

### G10 — Flake/retry laundering

Risk:
Retry-until-green hides instability.

Closure:
Append-only attempts; FLAKY distinct from PASS; retry budget; recovered PASS visible; original failure retained; claim policy can reject flaky evidence.

Status: STRONG_EXISTING_PATTERN / UNIFIED_CONTRACT_MISSING.

### G11 — Generated tests self-prove

Risk:
An agent generates a test that merely matches its own implementation.

Closure:
Reuse P016 generated-test admission and Spec 015 stability/discrimination concepts. Generated tests are candidates until independent evidence shows discriminating value.

Status: P016_SUCCESSOR_DEPENDENT.

### G12 — Browser evidence duplicated or weakened

Risk:
Unified plan could create another browser model.

Closure:
P016 remains browser substrate; Assurance consumes browser evidence/oracles/journeys. No new browser protocol or parallel browser truth model.

Status: DESIGN_CLOSED.

### G13 — SAST/SCA/scanner output treated as truth

Risk:
SARIF severity or scanner confidence is mistaken for a verified security claim.

Closure:
External results are Evidence/Observations; Sentrdel-derived reconciler/invariant layer owns canonical findings. SARIF is interchange only.

Status: DESIGN_CLOSED / IMPLEMENTATION_MISSING.

### G14 — Security coverage gaps disappear

Risk:
Unsupported languages, unreadable binaries, failed tools, huge files, generated code, reflection/dynamic semantics disappear from a clean result.

Closure:
Coverage ledger includes unreadable/unsupported/opaque/deferred regions with explicit reason and claim impact.

Status: STRONG_SENTRDEL/CLOUDFLARE_PATTERN / UNIFIED_IMPLEMENTATION_MISSING.

### G15 — Model-only security finding becomes verified

Risk:
LLM assertion promoted directly to VERIFIED.

Closure:
Model findings start CANDIDATE/REQUIRES_MORE_EVIDENCE. Verification requires policy-defined evidence. Model output cannot lower authoritative severity/proof state by itself.

Status: DESIGN_CLOSED.

### G16 — Cloudflare audit method assumes agent/sandbox features unavailable in standalone CLI

Risk:
Deep audit workflow may depend on subagents or sandbox infrastructure.

Closure:
Split method from execution substrate:
- deterministic reconnaissance/coverage contracts exist in Ascout;
- agent hunter/verifier waves are optional engine capabilities;
- missing agent host becomes visible;
- effectful verifier requires qualified sandbox;
- no feature claim until its execution profile exists.

Status: DESIGN_CLOSED / EXECUTION_BACKENDS_MISSING.

### G17 — Security vs Cyber product confusion

Risk:
Users cannot tell when a command is harmless local analysis versus higher-authority active verification.

Closure:
Security = default local AppSec/invariant analysis.
Cyber = threat/intel/adversarial/dynamic assurance with explicit effect classes.
Command preview always shows process/network/credential/browser/provider requirements.

Status: DESIGN_CLOSED.

### G18 — Unauthorized dynamic security targets

Risk:
A source URL, repo ownership, login session, or user typo could trigger scanning against a third party.

Closure:
DynamicTargetAuthorization binds exact host/origin/port/protocol/scope, authority source, expiry, budgets, credentials, forbidden actions, and target proof. No inherited authorization across redirects.

Acceptance:
Out-of-scope target fails closed before first request.

Status: DESIGN_CLOSED / IMPLEMENTATION_MISSING.

### G19 — Credential leakage or forwarding

Risk:
Tools inherit broad environment credentials or follow redirects with secrets.

Closure:
Credential capabilities are least privilege, explicit, redacted in evidence, and rebound on every destination/origin. Child environments are allowlisted. Sensitive credentials require authenticated TLS with certificate validation. Sensitive credentials are rejected on cleartext HTTP. Redirects and destination changes re-run the transport and destination authorization checks before credentials may be forwarded. HTTP test paths are permitted only with explicitly classified non-sensitive synthetic credentials.

Acceptance:
A sensitive credential presented to an HTTP target, invalid/untrusted TLS endpoint, or unauthorized redirect is withheld before transmission; only explicitly non-sensitive synthetic credentials may use an approved HTTP-only fixture.

Status: DESIGN_CLOSED / HOST_EXECUTION_WORK_MISSING.

### G20 — Sandbox marketing claims mistaken for proof

Risk:
A provider says "network disabled" or "isolated" without Ascout proving configured behavior.

Closure:
Kodac qualification-profile model. Exact provider version/config is benchmarked against hostile cases. Weaker provider cannot satisfy stronger profile.

Status: DESIGN_CLOSED / PROVIDER_QUALIFICATION_MISSING.

### G21 — Local-first promise broken by hidden cloud requirements

Risk:
Review/security features silently require SaaS.

Closure:
Core Test and deterministic Security remain local. Review/provider and threat-intel/cloud features declare egress/provider dependencies. Assure profile shows omissions if optional cloud/model capability is absent.

Status: DESIGN_CLOSED / PACKAGING_VALIDATION_MISSING.

### G22 — Multi-language product packaging

Risk:
Ascout is Node/TypeScript; Sentrdel is Rust; Alibaba OpenCodeReview is Go. A naive merge forces users to install three toolchains.

Closure:
- Ascout remains primary CLI/kernel;
- external/bundled companions communicate through versioned machine contracts;
- build-time language toolchains do not automatically become end-user requirements;
- release may ship qualified native companion binaries per platform;
- unavailable companion is explicit;
- selective port only if packaging/maintenance benchmark justifies it.

Acceptance:
Windows/macOS/Linux installation matrix proves behavior or visibly documents unsupported lanes.

Status: DESIGN_CLOSED / RELEASE_ENGINEERING_MISSING.

### G23 — Companion binary substitution/tampering

Risk:
Wrong binary/version on PATH produces evidence under a trusted engine name.

Closure:
EngineDescriptor binds executable/source version, digest where feasible, configuration, and qualification. Unknown/mismatched binary cannot satisfy qualified engine identity.

Status: DESIGN_CLOSED / IMPLEMENTATION_MISSING.

### G24 — Source permission mistaken for third-party rights

Risk:
Founder permission covers a donor repository but not embedded third-party assets/dependencies.

Closure:
Source Candidate Registry records selected paths, license, notices, third-party boundary, dependencies, and separate permission basis. Path-level review required.

Status: DESIGN_CLOSED.

### G25 — "Use all GitHub sources" becomes uncontrolled copying

Risk:
Feature bloat and incompatible licenses/architectures.

Closure:
Owner-wide discovery is mandatory, but every source receives a disposition. Considered != imported. Adapter/reference/rejected are valid outcomes.

Status: DESIGN_CLOSED / OWNER-WIDE_REGISTRY_EXECUTION_MISSING.

### G26 — Stale donor pins/upstream drift

Risk:
Plan uses a historical commit while implementation silently consumes newer behavior.

Closure:
Planning snapshots are evidence of research only. Immediately before intake, re-pin source and rerun source/license/security/behavior delta review. Upstream watch policy required.

Status: DESIGN_CLOSED / INTAKE_REVALIDATION_MISSING.

### G27 — Backward compatibility of existing Ascout users

Risk:
Changing check semantics breaks scripts and invalidates historical receipt assumptions.

Closure:
Keep init/doctor/check unchanged during additive introduction. New profiles get versioned contracts. Any later check remapping requires explicit schema/CLI migration and deprecation evidence.

Status: DESIGN_CLOSED.

### G28 — Receipt/schema explosion

Risk:
Every domain adds a separate incompatible result format.

Closure:
One core AssuranceBundle with typed domain evidence and stable Evidence/Finding/Coverage primitives. Domain-specific payloads remain namespaced/versioned. Existing receipt compatibility is bridged, not overwritten.

Status: DESIGN_CLOSED / SCHEMA_WORK_MISSING.

### G29 — Too-large evidence artifacts

Risk:
Traces, logs, SARIF, coverage, fuzz corpora, screenshots, and models exhaust disk/context.

Closure:
Content-addressed refs, size limits, retention policies, truncation facts, sampling where honest, artifact class budgets, no inline duplication of native deep-inspector data.

Status: PARTIAL_EXISTING / UNIFIED_POLICY_MISSING.

### G30 — Sensitive evidence retention

Risk:
Security traces/findings can contain secrets/customer data.

Closure:
Data classification, per-artifact retention, redaction state, export policy, local ignored storage by default, no automatic commit/upload, delete/GC semantics.

Status: PARTIAL_EXISTING / SECURITY_CLASSIFICATION_EXPANSION_MISSING.

### G31 — Cache authority escalation

Risk:
Cached review/model/security result survives a source/policy/engine change and grants PASS.

Closure:
Cache keys bind target, policy, engine/model/config, relevant context generation, and schema version. Cache hit is evidence; stale cache cannot grant current claim.

Status: STRONG_P016_PATTERN / GENERALIZATION_MISSING.

### G32 — Project/code graph becomes hidden authority

Risk:
Graph relevance or reachability inference is treated as fact when parser coverage is partial.

Closure:
Observed vs inferred edges explicit; graph generation/source/coverage bound; unknown relation widens selection; no mandatory graph database.

Status: DESIGN_CLOSED / GRAPH_ADAPTER_WORK_MISSING.

### G33 — Threat intelligence freshness and false correlation

Risk:
Stale/ambiguous IOC/CVE/intel correlation becomes a project vulnerability finding.

Closure:
Threat intel has source/timestamp/freshness/confidence; project relationship is separately proven; intel enrichment cannot independently create verified source vulnerability.

Status: DESIGN_CLOSED.

### G34 — Supply-chain package analysis executes attacker code

Risk:
Installing a new dependency for analysis runs install scripts on host.

Closure:
No implicit installation. Supply-chain admission lab only inside qualified isolated execution with network/credentials policy. Static registry/package metadata path preferred first.

Status: DESIGN_CLOSED / LAB_MISSING.

### G35 — GitHub publication side effects

Risk:
Reviewer posts duplicate/wrong comments, publishes stale findings, or leaks sensitive evidence.

Closure:
Reuse Kodac admission/idempotency/receipt patterns. Publication target/head/comment identity is exact. Generation and publication are separate phases. Pre-publication redaction/classification gate.

Status: KODAC_CAPABILITY_EXISTS / ASCOUT_PORT_MISSING.

### G36 — IDE/MCP bypass of CLI policy

Risk:
An MCP tool or IDE action gets more authority than terminal workflows.

Closure:
All surfaces construct same AssuranceIntent/Plan and pass through same policy/effect gates. No hidden "fast path."

Status: DESIGN_CLOSED / SURFACES_MISSING.

### G37 — Repository configuration weakens canonical policy

Risk:
A malicious branch edits Ascout config/rules to disable security/review.

Closure:
Policy hierarchy separates canonical/user trusted policy from subject-branch advisory config. Changed authority surfaces require explicit admission. Source branch cannot weaken minimum gates.

Status: STRONG_EXISTING_PATTERN / PROFILE_POLICY_GENERALIZATION_MISSING.

### G38 — Risk acceptance becomes permanent silent suppression

Risk:
Accepted risk hides forever after source/context changes.

Closure:
Risk acceptance is a lifecycle event with actor/authority, reason, scope, source relation, expiry/review date, and invalidation rules. New target may require re-evaluation.

Status: DESIGN_CLOSED / IMPLEMENTATION_MISSING.

### G39 — Auto-fix or repair gains hidden write authority

Risk:
Review/security model modifies code because it detected a finding.

Closure:
FixProposal is advisory. Separate attempt/write authority owns mutations. Every repair must trigger reverification of original finding and relevant regression scope.

Status: DESIGN_CLOSED.

### G40 — Fix verifies one issue but introduces another

Risk:
Point retest passes while broader invariant/test regression appears.

Closure:
RetestPlan includes point proof plus policy-required affected/regression assurance. "VERIFIED_FIXED" requires both original condition resolved and no mandatory new blocking regression.

Status: DESIGN_CLOSED / IMPLEMENTATION_MISSING.

### G41 — Self-hosted Ascout code review blind spot

Risk:
Ascout reviewing its own changes could share assumptions/bugs across planner and verifier.

Closure:
Protected benchmark holdouts, independent engines, external deterministic tools, reviewer separation where required, and adversarial corpus. Self-verification is evidence, not exclusive qualification.

Status: DESIGN_CLOSED / BENCHMARK_EXPANSION_MISSING.

### G42 — Performance makes full assurance unusable

Risk:
One unified product runs everything all the time.

Closure:
Profiles LIVE/QUICK/STANDARD/WORKSPACE/DEEP/ADVERSARIAL/RELEASE select minimum sufficient evidence. Budgets and predicted effect classes shown in plan. Required omissions visible.

Status: DESIGN_CLOSED / PERFORMANCE_BENCHMARK_MISSING.

### G43 — Concurrency causes conflicting evidence or side effects

Risk:
Parallel reviewers/scanners publish twice or mutate shared runtime state.

Closure:
EngineRun identities immutable; effectful operations have leases/idempotency keys; evidence assembly deterministic; publication serialized by target/action identity.

Status: KODAC_PATTERN_AVAILABLE / UNIFIED_IMPLEMENTATION_MISSING.

### G44 — Crash/resume invents success

Risk:
Long audits restart after partial work and lose missing stages.

Closure:
Durable workflow evidence records states/attempts. Resume revalidates target/policy/engine identity and preserves incomplete stages. Never resume by assuming prior in-memory PASS.

Status: KODAC/LOOPFORGE_PATTERN_AVAILABLE / PORT_MISSING.

### G45 — Configuration/version migration corrupts evidence

Risk:
Schema/tool updates reinterpret old receipts.

Closure:
Version schemas; immutable historical artifacts; migration creates derived view with provenance; old evidence never rewritten in place. Compatibility tests for supported versions.

Status: DESIGN_CLOSED / IMPLEMENTATION_MISSING.

### G46 — Release/update/rollback unplanned

Risk:
Unified CLI ships several companion engines without deterministic install/update rollback.

Closure:
Release manifest binds CLI + companion versions/digests + platform; atomic update where possible; rollback to prior qualified set; never mix unmatched versions while preserving qualified claim.

Status: DESIGN_CLOSED / RELEASE_ENGINEERING_MISSING.

### G47 — Supply-chain integrity of Ascout itself

Risk:
Compromised release/dependency invalidates assurance tool trust.

Closure:
Lockfile/package-content review, SBOM, provenance/attestation, dependency advisory handling, release artifact digests, build identity, signing/attestation where separately adopted.

Status: PARTIAL_EXISTING / UNIFIED_RELEASE_EXPANSION_MISSING.

### G48 — Licensing/notices across merged sources

Risk:
Bundled Alibaba/Kodac/Sentrdel/Tencent/other material lacks notices.

Closure:
Provenance registry drives THIRD_PARTY_NOTICES and build/release license inventory. CI fails on unmapped copied/derived paths.

Status: DESIGN_CLOSED / TOOLING_MISSING.

### G49 — Kodac/Sentrdel are archived too early

Risk:
Capabilities or evidence disappear while Ascout parity is incomplete.

Closure:
No archival until capability inventory, selective migration, parity corpus, operational dependency check, docs redirect, and provenance closure all pass.

Status: DESIGN_CLOSED.

### G50 — Historical evidence relabeled as Ascout evidence

Risk:
Old Kodac/Sentrdel successful runs are used as proof for new Ascout implementation.

Closure:
Historical records are migration/reference evidence only. New Ascout implementation must independently qualify exact current target/source.

Status: DESIGN_CLOSED.

### G51 — Private repository/data behavior

Risk:
Review provider sends private source externally without user awareness.

Closure:
Provider data policy and egress are explicit in plan; local/deterministic modes available; remote source upload requires config/policy; no implicit remote review from assure.

Status: DESIGN_CLOSED / PROVIDER_UI_MISSING.

### G52 — Multi-user/team control plane scope creep

Risk:
Unified platform grows auth/tenant/server requirements prematurely.

Closure:
Base remains local single-user/dev-tool. Any future control plane requires separate principal/session/tenant/audit/break-glass design. Not part of merger MVP.

Status: DEFERRED_WITH_BOUNDARY.

### G53 — Windows/macOS/Linux drift

Risk:
Companion process, path, sandbox, browser, and evidence semantics differ.

Closure:
Platform-specific qualification; normalize persisted paths; unsupported isolation profiles fail visible; cross-platform CI/release matrix.

Status: PARTIAL_EXISTING / COMPANION_MATRIX_MISSING.

### G54 — Network-offline developer environments

Risk:
Core commands become unusable without internet.

Closure:
Test/deterministic security/local source review remain useful offline. Remote provider/threat-intel engines show NOT_RUN with reason. Cached external intel cannot pretend to be fresh.

Status: DESIGN_CLOSED.

### G55 — Exit-code and automation ambiguity

Risk:
Five profiles emit inconsistent automation semantics.

Closure:
Define one severity/claim lattice and stable exit family distinguishing:
- qualified success;
- repository finding/failure;
- incomplete/coverage gap;
- policy/authority refusal;
- engine/control error;
- source drift.

Do not collapse to boolean.

Status: DESIGN_CLOSED / CONTRACT_MISSING.

### G56 — One giant public plugin SDK expands attack surface

Risk:
Supporting many engines leads to arbitrary code plugins in core.

Closure:
Start with internal versioned adapter boundary, no public arbitrary plugin execution. Public pack/engine SDK is separately designed after qualification/security model proves need.

Status: DESIGN_CLOSED.

### G57 — Engine-specific configuration becomes arbitrary shell execution

Risk:
Users configure review/test/security commands that bypass process safety.

Closure:
Engine adapters use typed capabilities/arguments and qualified executables. Existing changed-command-surface policy extends to profile config. Generic shell DSL remains non-goal.

Status: DESIGN_CLOSED.

### G58 — Evidence manipulation by subject under test

Risk:
Repository code writes fake coverage/SARIF/results into paths Ascout trusts.

Closure:
Execution owner records producer/run identity and captures outputs through controlled channels. Imported artifacts are untrusted and validated. Subject-generated files do not self-attest.

Status: DESIGN_CLOSED / HOST_EVIDENCE_CAPTURE_MISSING.

### G59 — Time-of-check/time-of-use drift

Risk:
Source changes between review/test/security stages.

Closure:
Target/source identity rechecked at stage boundaries and final assembly. Drift stales/rejects cross-stage claim aggregation.

Status: STRONG_EXISTING_AScout_PATTERN / MULTI_STAGE_GENERALIZATION_MISSING.

### G60 — "Assure" becomes an opaque risk score

Risk:
A numeric score masks missing mandatory evidence.

Closure:
No aggregate score can override mandatory gates. ClaimAssessment is typed with supporting, contradicting, missing, stale, and refused evidence.

Status: DESIGN_CLOSED.

## 4. Cross-artifact consistency review

The Master Plan and Source Map agree on:

- Ascout as sole canonical product/trust kernel;
- adapter-first donor strategy;
- Alibaba OpenCodeReview as primary Review engine candidate;
- Kodac as selective Review/Workflow capability donor;
- Sentrdel as selective Security/Cyber capability donor;
- Cloudflare as audit-method donor;
- WePLD Assurance Fabric as architecture input, not a fourth runtime;
- local-first default;
- explicit dynamic-security authority;
- no wholesale donor merge;
- no current implementation authority;
- no interruption of current Spec 016 by this planning package;
- owner-wide source discovery before any "all sources considered" claim;
- preservation of historical source/evidence without cross-tree credit.

No direct contradiction was found among those planning decisions.

## 5. First-wedge rejection criteria

The first implementation authorization MUST be rejected if any of these remain unspecified:

- exact successor base and active Ascout frontier;
- versioned AssuranceTarget/Evidence/Finding/Coverage contracts;
- OpenCodeReview exact implementation/source identity;
- model/provider data and credential policy;
- Review coverage accounting;
- external engine authority ceiling;
- result normalization and location validation;
- no-write/no-publication default;
- backward compatibility with check;
- benchmark cases for false finding, missed file, source mismatch, prompt injection, provider absence, truncation, stale result;
- provenance/license/notices;
- cross-platform strategy for the chosen integration mode.

## 6. Security/Cyber wedge rejection criteria

Security/Cyber implementation MUST be rejected if any of these remain unspecified:

- exact Sentrdel integration/port boundary;
- coverage gap semantics;
- external SARIF/scanner trust boundary;
- Cloudflare audit method transformation;
- source-only vs effectful verification boundary;
- sandbox qualification;
- target authorization;
- network/credential budgets;
- secret/evidence classification;
- independent verifier semantics;
- dynamic stop/cleanup behavior;
- threat-intel freshness;
- proof/retest lifecycle.

## 7. Migration completion checklist

Kodac/Sentrdel merger cannot close until every retained capability row has:

~~~text
source capability identity
disposition
Ascout owner module
integration/port mode
provenance mapping
characterization fixture
parity/replacement evidence
known semantic delta
benchmark status
documentation migration
operational dependency check
retirement decision
~~~

Any capability with UNKNOWN disposition blocks archive readiness.

## 8. Project-completion matrix

Future closeout must report counts for:

~~~text
PRODUCT/UX
CORE CONTRACTS
REVIEW
TEST
SECURITY
CYBER
SANDBOX/EFFECTS
PRIVACY/SECRETS
PROVENANCE/LICENSE
MIGRATION
PLATFORM/PACKAGING
INTEGRATIONS
BENCHMARK/CONFORMANCE
RELEASE/OPERATIONS
DOCUMENTATION
~~~

Each row is PROVEN / PARTIAL / MISSING / N/A with evidence.

"Plan implemented" or "all tests green" alone cannot establish unified project completion.

## 9. Audit verdict

Known architecture/product gaps identified during this review have explicit closures or explicit defer boundaries.

No known material design gap is intentionally left ownerless.

The next safe action is not to merge three repositories immediately. It is:

~~~text
finish/reconcile active Ascout authority
-> formalize unified contracts
-> integrate Review first with Alibaba OpenCodeReview
-> bind existing Test to the same model
-> integrate Sentrdel Security
-> add Cloudflare-derived deep audit
-> qualify Cyber effects
-> migrate capabilities with parity
-> close source/provenance/platform/release gates
~~~

Current state:

~~~text
PLAN_COHERENCE = PASS
KNOWN_GAP_CLASSES_WITHOUT_OWNER = 0
IMPLEMENTATION_COMPLETE = NO
MERGER_COMPLETE = NO
PROJECT_COMPLETION = NOT_ESTABLISHED
~~~


---

## 10. Kernux Reality Verification gap-audit amendment — 2026-09-19

The following additional gap classes are now part of the canonical planning audit:

### G61-G74 structured ownership matrix

| Gap | Owner | Closure | Acceptance | Planning evidence | State |
| --- | --- | --- | --- | --- | --- |
| G61 Reality Verification reduced to browser automation | UA-P08 / UA-P09 | Reality covers browser, API/service, native app, process, filesystem, install/recovery, lab, remote, and cross-app journeys | Benchmark demonstrates at least one non-browser real substrate and preserves substrate class in evidence | Reality Fabric §§2, 8-13; Task Registry P8/P9 | DESIGN_CLOSED / IMPLEMENTATION_MISSING |
| G62 Hidden mock substitution | UA-P08 | `SubstrateClass` is mandatory and lower classes cannot satisfy stronger claims | REAL_COMPONENT-required fixture refuses mock/emulator-only evidence | Contract Freeze §3.4; Reality Fabric §§19-20 | DESIGN_CLOSED / IMPLEMENTATION_MISSING |
| G63 Reviewed source differs from executed artifact | UA-P08 | RealityRun binds source/tree and build artifact digest | Wrong artifact/source pairing blocks claim before reconciliation | Contract Freeze §3.2; Reality Fabric §7 | DESIGN_CLOSED / IMPLEMENTATION_MISSING |
| G64 Execution-host truth lost | UA-P08 / UA-P10 | Kernux runtime owns process lifecycle truth; controller/UI state is non-authoritative | Disconnect/timeout fixture cannot become process exit/success | Reality Fabric §§9, 30; Task Registry P10 | DESIGN_CLOSED / IMPLEMENTATION_MISSING |
| G65 Dirty developer environment creates false confidence | UA-P09 | Clean claims require qualified disposable LabManifest environment | Seeded developer-state contamination is detected by clean-lab run | Contract Freeze §3.3; Reality Fabric §§11, 30 | DESIGN_CLOSED / IMPLEMENTATION_MISSING |
| G66 Reality test performs unintended external transaction | UA-P08 / UA-P12 | App/network actions are effect-classified and externally effectful actions require explicit bounded authority | Unauthorized external side effect is refused before first effect | Contract Freeze §§5, 3.2.1; Reality Fabric §§15-16 | DESIGN_CLOSED / IMPLEMENTATION_MISSING |
| G67 Real web test leaks authenticated state | UA-P08 | Browser contexts isolated by default; reuse is explicit and scoped | Cross-project authenticated-state leakage benchmark remains zero | Reality Fabric §§8, 30; Task Registry UA-P08-T15 | DESIGN_CLOSED / IMPLEMENTATION_MISSING |
| G68 Vision fallback presented as deterministic | UA-P08 | Action mechanism and provenance are recorded; deterministic/typed methods preferred | Vision action cannot be labeled deterministic or satisfy deterministic-only oracle requirement | Reality Fabric §§4, 10, 17 | DESIGN_CLOSED / IMPLEMENTATION_MISSING |
| G69 Runtime capability advertisement mistaken for qualification | UA-P02 / UA-P09 | Exact implementation/configuration must match qualification profile | Self-described capability without qualification yields NOT_QUALIFIED | Contract Freeze §§2.5-2.6, 3.2.1; Blueprint P2/P9 | DESIGN_CLOSED / IMPLEMENTATION_MISSING |
| G70 Cleanup omitted from verification | UA-P08 / UA-P09 | Cleanup is part of RealityTestPlan and may be claim-bearing | Required cleanup missing/failing yields MISSING/INCOMPLETE, never clean PASS | Reality Fabric §§11, 29-30; Task Registry UA-P08-T12 | DESIGN_CLOSED / IMPLEMENTATION_MISSING |
| G71 Retry duplicates real-world effects | UA-P04 / UA-P08 / UA-P10 | Side-effect retry requires idempotency or reconciliation; ambiguous outcome fails closed | Retry/reconnect corpus proves no duplicate side effect | Blueprint P4/P10; Reality Fabric §30 | DESIGN_CLOSED / IMPLEMENTATION_MISSING |
| G72 Remote runtime expands trust silently | UA-P10 | Fresh Constitution decision, enrollment, mutual identity, host-policy intersection, revocation, evidence | Remote phase cannot start without effective authority and host/controller policy intersection | Blueprint P10; Task Registry UA-P10-T01..T11 | DESIGN_CLOSED / IMPLEMENTATION_MISSING |
| G73 Planned Kernux capability fabricated as current | UA-P02 / UA-P08 | Availability and qualification are explicit; roadmap-only capability is unavailable | Missing Kernux capability yields NOT_RUN/NOT_QUALIFIED and claim impact | Reality Fabric §26; Blueprint P8 | DESIGN_CLOSED / IMPLEMENTATION_MISSING |
| G74 Reality evidence bypasses Ascout reconciliation | UA-P01 / UA-P08 / UA-P13 | Kernux events are observations; all claim-bearing evidence is normalized/reconciled by Ascout | Direct Kernux event cannot create SUPPORTED ClaimAssessment | Contract Freeze §§1-2; Reality Fabric §§18, 25 | DESIGN_CLOSED / IMPLEMENTATION_MISSING |

Each row has an explicit owner, acceptance condition, planning evidence reference, and closure state. These references prove planning ownership only; they do not constitute implementation evidence.

Updated audit state:

```text
BASE_GAP_CLASSES = 60
KERNUX_REALITY_ADDITIONAL_GAP_CLASSES = 14
TOTAL_MAPPED_GAP_CLASSES = 74
KNOWN_MATERIAL_GAP_CLASSES_WITHOUT_OWNER = 0
IMPLEMENTATION_COMPLETE = NO
```
