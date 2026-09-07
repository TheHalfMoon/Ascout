# Security Verification Source Study

**Status:** `RESEARCH_ONLY / NON_AUTHORITATIVE / IMPLEMENTATION_NOT_AUTHORIZED`  
**Research ledger:** Issue #75  
**Planning base:** `f1d6866b54d06322a1a606a0aba4676b37e54c8d`  
**Active canonical program:** Spec 007 T113 recovery remains dependency-ordered and unchanged by this document.  
**Source-admission rule:** `SOURCE_FOUND != SOURCE_ADMITTED != DEPENDENCY_ADMITTED != IMPLEMENTATION_AUTHORIZED`

## 1. Purpose

This study improves Ascout's post-M1 verification strategy using three newly reviewed public sources:

1. `Tencent/AICGSecEval` — repository-level security evaluation of AI-generated code;
2. `Tencent/AI-Infra-Guard` — AI infrastructure, MCP, Agent Skill, and running-agent security scanning;
3. `google/magika` — local content-based file type identification with confidence-aware output.

The goal is not to copy these products into Ascout. The goal is to extract the strongest evidence, benchmark, adapter, and failure-model ideas that reinforce Ascout's existing product thesis:

> Ascout is the independent, source-bound verification judgment layer. It should prove what ran, what evidence was produced, what remained unverified, and why a clean claim is or is not justified.

This document intentionally does **not** authorize:

- security scanner implementation;
- a SARIF adapter;
- Magika integration;
- AICGSecEval dataset import;
- AI-Infra-Guard source import;
- agent/MCP/Skill scanning;
- Docker or sandbox infrastructure;
- cloud/model/API usage;
- new dependencies;
- new receipt fields or schema versions;
- new change-policy classes;
- release/publication work;
- any change to Spec 007, T113, T114, R007-09, or current canonical task ordering.

A future implementation requires its own canonical Spec Kit authority chain and durable implementation authorization after the current canonical program permits successor work.

---

## 2. Canonical Ascout constraints this study must preserve

The existing Ascout master plan and post-M1 roadmap already establish the rules that control this research:

1. **Evidence before claims.** Producer output never outranks bound current-run evidence.
2. **No green by omission.** Missing applicable verification remains visible.
3. **Source-bound truth.** Evidence belongs to exact source/config/environment identity.
4. **Local-first core.** No account, cloud, model, or API key is required for core verification.
5. **No implicit installs.** Optional tools are never silently provisioned.
6. **Native capability first.** Prefer stable native formats and existing project tools.
7. **Minimal core.** Do not turn Ascout into a scanner platform, workflow engine, or generic plugin host.
8. **Bounded execution.** Every integration must have explicit runtime/output/resource bounds.
9. **Evidence privacy.** Egress, credentials, logs, and retained artifacts must remain explicit.
10. **License/provenance integrity.** Design reference, data use, dependency use, and source reuse are separate decisions.
11. **Benchmark-driven expansion.** No broad default without measured benefit.
12. **Fresh-head governance.** Research artifacts cannot implicitly authorize code mutation.

Security expansion must strengthen these constraints rather than introduce a parallel truth system.

---

## 3. Exact reviewed upstream identities

### 3.1 Tencent/AICGSecEval

Reviewed upstream identity:

```text
repository: Tencent/AICGSecEval
default_branch: master
commit: 94428ebf45141bf4ecd365a51d596dcd51caa690
tree: 1789b060d079a49a436a9affb6237e6c39b9bd9d
```

Observed relevant surfaces:

- repository-level AI-generated-code security benchmark;
- real GitHub repositories and CVE-derived tasks;
- project-level context;
- static and dynamic security evaluation;
- agent evaluation support;
- CVE/CWE metadata;
- vulnerable base and fixed/patch commit identities;
- functional tests and vulnerability PoCs;
- containerized project evaluation;
- bounded command timeouts;
- static scanner output with explicit scanner failure representation.

Observed license surface: the repository contains an Apache-2.0-oriented root license/third-party notice bundle. This research treats AICGSecEval as a design/benchmark reference only. Any future dataset or source-byte reuse requires an exact path-level rights, data-use, attribution, and redistribution review at the then-current immutable upstream identity.

### 3.2 Tencent/AI-Infra-Guard

Reviewed upstream identity:

```text
repository: Tencent/AI-Infra-Guard
default_branch: main
commit: e4e622af3ad2b8228ce82dd62b01415dd8ce2b9c
tree: 19aca1c5f39358e59c80b0e4f282d69b048134d3
```

Observed relevant surfaces:

- MCP security scanning;
- Agent Skill security auditing;
- dynamic black-box agent security testing;
- static pre-scan for high-risk patterns;
- SARIF 2.1.0 output in standalone scanner modes;
- structured JSON output for dynamic agent scanning;
- explicit rule/taxonomy identifiers;
- provider/model configuration;
- external API/credential usage;
- source-location and fingerprint-like fields;
- deliberate vulnerable agent fixtures;
- OWASP-oriented agent threat categories.

Important license/provenance gap:

- the repository root exposes Apache-2.0 `LICENSE` and `NOTICE` surfaces;
- `skill-scan/NOTICE` carries explicit attribution language;
- subproject documentation is not perfectly uniform about license wording;
- `mcp-scan` documentation states MIT while no `mcp-scan/LICENSE` was observed at the reviewed pin;
- therefore **root-license inference is not sufficient for source reuse**.

This study consequently permits design/evidence-format reference only. Any future code/data/rules reuse must qualify the exact subproject/path and its governing license/NOTICE chain independently.

### 3.3 google/magika

Reviewed upstream identity:

```text
repository: google/magika
default_branch: main
commit: 26b6a9ba7e92f2b0a3745970a9190ec0dde9bf83
tree: 641a57cb590b66a0dd4f296b16dd04548da96271
license: Apache-2.0 at reviewed root LICENSE
```

Observed relevant surfaces:

- local file-content classification;
- CLI and language bindings;
- hundreds of content-type outputs covering source, executable, archive, package, config, document, and binary classes;
- separate raw model output and final tool output;
- per-content-type trust thresholds;
- explicit unknown/generic output instead of forced certainty;
- score-bearing output;
- local CPU-oriented use.

Magika is not a security scanner and must not be represented as one. Its fit is limited to future artifact/content identity evidence where benchmark data proves that extension/declared-type ambiguity is materially useful to Ascout.

---

## 4. Source role decisions

| Source | Best Ascout role | Must not become |
| --- | --- | --- |
| AICGSecEval | benchmark methodology and candidate CVE corpus reference | core runtime dependency or copied evaluation platform |
| AI-Infra-Guard | security threat taxonomy, SARIF/output contract, optional adapter/reference | required LLM scanner, default cloud dependency, or cloned red-team platform |
| Magika | optional local artifact/content identity experiment | proof of safety, malware scanner, or mandatory core dependency |

Priority:

```text
P0: AICGSecEval benchmark methodology
P0: security evidence contract learned from AI-Infra-Guard failure modes
P1: SARIF normalization experiment
P1: AI agent / MCP / Skill security evidence research
P2: Magika artifact-type observation experiment
```

This priority is strategic only. It creates no implementation order while Spec 007 remains active.

---

## 5. Gaps exposed in the current Ascout strategy

### GAP-S01 — No canonical security-evidence adapter contract

The current roadmap says selected security scanners may be integrated later, but it does not yet define the evidence contract that separates:

- scanner applicability;
- scanner execution success;
- scanner configuration validity;
- parser validity;
- findings;
- no findings;
- scanner failure;
- scanner unavailable;
- unresolved source mapping.

Without this separation, a future scanner integration could accidentally turn operational failure into a false clean result.

### GAP-S02 — No CVE-based functional + security counterfactual benchmark

Ascout's historical benchmark work is strong on selection and exercise evidence, but the future security roadmap lacks a canonical benchmark that simultaneously proves:

```text
known vulnerable state:
  builds/starts as expected
  functional control executes
  security oracle observes the known vulnerability

known fixed state:
  builds/starts as expected
  required functionality remains correct
  the exact vulnerability oracle no longer observes the vulnerability
```

AICGSecEval's base/patch, functional-test, and PoC structure is a strong reference for this missing benchmark shape.

### GAP-S03 — Zero findings can be produced by invalid adapter configuration

AI-Infra-Guard's running-agent documentation gives a concrete failure mode: a custom response parser can be absent or wrong, causing target responses to parse as `None` and producing zero detections.

Ascout must adopt the stronger invariant:

> `ZERO_FINDINGS != CLEAN` unless adapter execution, parser validity, applicability, scope binding, and expected producer contract are all proven.

### GAP-S04 — No formal distinction between deterministic and model-mediated security evidence

Future security evidence may come from:

- deterministic static analyzers;
- deterministic or replayable PoCs;
- dynamic black-box probes;
- LLM-mediated audits;
- LLM-mediated vulnerability review/consolidation.

These cannot share one implicit authority level.

### GAP-S05 — No security finding semantics that preserve uncertainty

A scanner result is not automatically a proven vulnerability. Future semantics should distinguish at least:

```text
OBSERVED_FINDING
REPRODUCED_VULNERABILITY
NO_SIGNAL_OBSERVED
UNRESOLVED
TOOL_ERROR
NOT_APPLICABLE
NOT_RUN
```

The exact final names require a future canonical spec. The important rule is that `NO_SIGNAL_OBSERVED` is not equivalent to universal security proof.

### GAP-S06 — No multi-axis security benchmark result

A single aggregate score can hide the difference between:

- code that fails to build;
- code that builds but breaks functionality;
- code that works but remains vulnerable;
- a scanner that failed;
- a scanner that did not cover the relevant surface.

Future benchmark records should keep independent axes:

```text
BUILD_OR_STARTUP
FUNCTIONAL
SECURITY_SIGNAL
EVIDENCE_INTEGRITY
APPLICABILITY
```

No weighted score may convert a failed mandatory axis into an overall PASS.

### GAP-S07 — SARIF is listed as a future format but not given a trust contract

SARIF is promising because AI-Infra-Guard emits it and it is ecosystem-standard. A future Ascout SARIF adapter must still validate and bind:

- producer/tool name;
- exact producer version or immutable identity where available;
- invocation/config identity;
- source identity;
- run identity;
- rule identity;
- artifact URI/path safety;
- region/range validity;
- result severity as producer metadata, not Ascout truth;
- fingerprints as weak correlation aids, never evidence identity;
- tool execution/error state;
- result parse/schema validity;
- coverage/applicability limitations.

A syntactically valid SARIF document is not sufficient evidence for a clean security verdict.

### GAP-S08 — No explicit external-egress evidence class for scanners

AI-Infra-Guard scanner modes may use model APIs, API keys, base URLs, remote targets, or dynamic network probes. Future Ascout integration must identify execution as one of at least:

```text
LOCAL_NO_DECLARED_EGRESS
LOCAL_WITH_SUBJECT_EGRESS
CONFIGURED_EXTERNAL_PROVIDER
REMOTE_TARGET_PROBE
REPLAYED_CAPTURE
```

Exact names require a future spec. Core Ascout must remain usable when all remote classes are disabled.

### GAP-S09 — No immutable container/image policy for security benchmarks

AICGSecEval benchmark examples frequently name public container images by tag. Ascout's evidence model should be stricter before adopting this pattern:

- immutable image digest required where the image affects evidence;
- image tag may be retained only as descriptive metadata;
- build inputs/scripts must be content-bound;
- container runtime identity should be recorded when material;
- mutable `latest` must never be sufficient provenance for a canonical benchmark claim.

### GAP-S10 — No producer-score containment rule

AI-Infra-Guard subprojects expose security/project scores. Magika exposes confidence scores. These scores are producer-specific.

Future Ascout rule:

> Producer scores may be retained as raw observation metadata, but cannot become an Ascout correctness/security percentage or override mandatory deterministic evidence unless a separately benchmarked policy explicitly defines that interpretation.

This preserves the existing prohibition on fake confidence/correctness percentages.

### GAP-S11 — No content-identity evidence dimension

Ascout binds paths and content digests but does not currently plan a distinct optional observation for cases where a file's extension/declared purpose conflicts with its observed content class.

Potential future use cases:

- binary content under source-looking extension;
- executable/archive content introduced where text is expected;
- evidence artifact type mismatch;
- generated package/artifact classification;
- suspicious untracked file preflight.

Magika makes this technically plausible, but usefulness must be benchmarked before admission.

### GAP-S12 — No model-asset identity rule for local ML-based evidence tools

If a future local tool such as Magika influences an Ascout verdict, the evidence must bind not only the CLI/package version but also the model asset/revision/digest or equivalent immutable classifier identity.

### GAP-S13 — No source-admission refresh rule for security integrations

Security tools and taxonomies evolve quickly. A future adapter must not silently inherit new behavior from a moving dependency or remote model.

Required future source qualification should bind:

- repository and exact source revision;
- license/NOTICE at the exact used path;
- package/runtime identity;
- rule/taxonomy version;
- model/provider identity if applicable;
- output schema/format version;
- known limitations;
- removal/disable path.

### GAP-S14 — No explicit benchmark distinction between producer quality and Ascout adapter quality

Ascout must separately measure:

1. whether the underlying scanner detects a known issue;
2. whether Ascout faithfully admits/parses/binds the scanner's evidence.

A poor scanner result must not be misclassified as an adapter defect, and a broken adapter must not be hidden by a capable scanner.

### GAP-S15 — No path-level rights qualification rule for heterogeneous donor repositories

AI-Infra-Guard demonstrates why repository-root license inference is insufficient. Future donor qualification must determine rights for the exact path/subproject/data/rules being considered.

---

## 6. Proposed future architecture: Security Evidence Contract

This is a research model, not a committed receipt schema.

### 6.1 Adapter envelope

A future security observation should be reconstructible from an envelope conceptually equivalent to:

```text
SecurityEvidenceEnvelope
  subject_source_identity
  producer_identity
  producer_version_or_digest
  producer_mode
  configuration_identity
  execution_environment_identity
  execution_class
  egress_class
  started_at
  ended_at
  exit_or_transport_status
  parse_status
  applicability_status
  scope_accounting
  findings[]
  producer_metadata
  artifact_references[]
  limitations[]
  errors[]
```

Every material field that can change a verdict must be reconstructible from current-run evidence or explicitly classified as unavailable.

### 6.2 Four gates before interpreting an empty result

A security adapter may interpret `findings.length == 0` only after all four gates pass:

1. **EXECUTION_VALID** — the intended producer actually ran/answered under the declared mode.
2. **OUTPUT_VALID** — the intended output was parsed and schema/contract validated.
3. **APPLICABILITY_VALID** — the producer/rules were applicable to the target and requested policy.
4. **SCOPE_BOUND** — the observed target/source scope is bound and sufficient for the claimed result.

If any gate is false or unknown:

```text
NO CLEAN SECURITY CLAIM
```

### 6.3 Evidence authority classes

Research classification:

```text
DETERMINISTIC_STRUCTURED
REPLAYABLE_DYNAMIC
LIVE_DYNAMIC
MODEL_MEDIATED_ADVISORY
```

Rules:

- deterministic evidence may support deterministic policy only within proven applicability;
- replayable dynamic evidence must bind the capture and replay environment;
- live dynamic observations are explicitly time/environment dependent;
- model-mediated output remains advisory unless a future benchmarked policy narrowly promotes a specific use;
- model-mediated output cannot silently negate deterministic evidence;
- disagreement is visible, not averaged away.

### 6.4 Finding identity

A future security finding should bind at least:

- producer/rule identity;
- source/run identity;
- safe repository-relative location when valid;
- evidence/artifact reference;
- producer severity/classification as producer metadata;
- deterministic/replay/live/model-mediated evidence class;
- reproducibility status when independently tested.

A producer fingerprint may help deduplicate but must not carry evidence across source trees.

---

## 7. AICGSecEval-inspired security benchmark design

### 7.1 Benchmark unit

Candidate future record:

```text
case_id
repository_identity
vulnerable_source_revision
fixed_source_revision
language
cve_id
cwe_id
vulnerability_class
severity_source_metadata
changed_or_target_paths
functional_oracle_identity
security_oracle_identity
build_or_startup_identity
runtime_or_container_identity
provenance_digests
rights_record
```

### 7.2 Dual-control requirement

Every promoted security case should prove both sides before use:

#### Vulnerable control

- exact vulnerable revision materializes;
- environment/tool identities validate;
- functional control has the expected baseline behavior;
- security oracle reliably observes the target vulnerability;
- observation is deterministic or its variability is explicitly quantified.

#### Fixed control

- exact fixed revision materializes;
- required functionality remains valid;
- the exact target security oracle no longer observes the target vulnerability;
- no source/provenance drift invalidates comparison.

A case that cannot prove both controls remains `UNQUALIFIED`, not partial benchmark truth.

### 7.3 Immutable benchmark provenance hardening

Compared with a generic public evaluation harness, Ascout should require stronger provenance before canonical benchmark publication:

- exact Git object IDs;
- exact script bytes/digests;
- exact test/PoC bytes/digests;
- exact container image digest where used;
- exact scanner/tool identity;
- exact config identity;
- explicit network/provider dependency classification;
- explicit artifact retention/digest policy;
- license/data-use record;
- no mutable `latest` identity as canonical evidence.

### 7.4 Security benchmark metrics

Measure at least:

- known-vulnerable security-signal recall;
- known-fixed false-positive rate/burden;
- false-clean rate;
- adapter execution failure rate;
- output/parser failure rate;
- applicability-unresolved rate;
- unsafe/unmappable location rate;
- deterministic rerun agreement;
- cold/warm runtime overhead;
- artifact/storage overhead;
- source/config drift detection;
- model/provider variance for model-mediated producers;
- percentage of cases requiring remote egress;
- percentage of cases that remain useful with all optional cloud/model tools disabled.

No universal numeric promotion threshold should be invented before data exists.

---

## 8. AI-Infra-Guard-informed adapter strategy

### 8.1 SARIF first, scanner-specific second

The strongest reusable idea is the standardized evidence surface, not the scanner implementation.

Research preference:

```text
stable producer-native format
  -> strict Ascout adapter validation
  -> source/evidence binding
  -> explicit incompleteness
  -> policy evaluation
```

Potential first security interchange experiment: SARIF 2.1.0.

Do not build a generic code-executing plugin SDK merely to support scanners.

### 8.2 MCP / Agent Skill / Agent security domains

AI-Infra-Guard demonstrates concrete future test surfaces:

#### MCP

- credential/token exposure;
- privilege/scope creep;
- tool poisoning;
- supply-chain tampering;
- command execution/injection;
- prompt/context injection;
- authentication/authorization gaps;
- missing auditability;
- shadow server/tool identity;
- tool name confusion/rug-pull/shadowing.

#### Agent Skills

- instruction hijacking;
- memory poisoning;
- remote payload execution;
- embedded malicious code;
- privilege escalation;
- persistence;
- tool hijacking;
- insecure dependencies;
- insecure coding practice;
- declared intent vs implemented hidden behavior.

#### Running agents

- authorization bypass;
- data leakage;
- indirect prompt injection;
- tool abuse;
- web exfiltration;
- agentic supply chain;
- unexpected code execution;
- inter-agent communication security;
- cascading failure;
- human-agent trust exploitation.

These taxonomies are research references, not Ascout-owned rules or claims. A future canonical plan must decide which classes have reproducible, source-bound evidence suitable for Ascout.

### 8.3 LLM-mediated scanner boundary

If a scanner uses an LLM/provider:

- integration must be explicitly enabled;
- provider/model/base URL identity must be visible where safely possible;
- secret values must never be persisted;
- source/context egress must be declared before execution;
- output may not become deterministic PASS merely because the model returned no findings;
- temperature/sampling/config identity must be bound when material and observable;
- retries/adaptive loops must remain bounded and receipt-visible;
- provider outage, parse failure, truncation, context overflow, or token limit is `UNRESOLVED`/tool error, never zero findings;
- Ascout core remains fully functional without this integration.

### 8.4 Dynamic target boundary

Black-box agent/MCP testing can mutate or stress a live target. It therefore requires a future separate authority model for:

- target ownership/authorization;
- allowed endpoints;
- allowed attack classes;
- network scope;
- test credentials;
- destructive-operation prevention;
- rate/resource budgets;
- evidence retention/privacy;
- abort/stop conditions.

This is not ordinary trusted-local verification.

---

## 9. Magika-informed artifact identity experiment

### 9.1 Candidate observation

Research-only concept:

```text
ArtifactContentObservation
  path
  content_digest
  declared_or_extension_type
  observed_tool_output_type
  raw_model_type_if_exposed
  score
  prediction_mode
  classifier_package_identity
  model_asset_identity
  mismatch_state
```

### 9.2 Safe semantics

Allowed future claim shapes might include:

```text
TYPE_MATCH_OBSERVED
TYPE_MISMATCH_OBSERVED
TYPE_UNCERTAIN
TYPE_UNSUPPORTED
CLASSIFIER_ERROR
```

Never:

```text
SAFE_FILE
MALWARE_FREE
TRUSTED_ARTIFACT
```

### 9.3 Benchmark questions before admission

- How often do AI-generated changes introduce extension/content mismatches?
- Does content classification expose material cases that Git/path/config logic misses?
- Which file classes create actionable verification decisions?
- What false mismatch rate occurs on generated/build/config files?
- What unresolved rate appears under high-confidence mode?
- What runtime/packaging/model cost is added?
- Can the value be achieved more simply with existing deterministic file signatures/parsers?

If deterministic native techniques provide equivalent evidence more cheaply, Magika should remain a reference and not become a dependency.

---

## 10. Execution tiers to protect Ascout's minimal core

Research tiering:

### Tier 0 — Core local receipt

Current product philosophy:

- no required cloud/LLM;
- no implicit install;
- trusted local repository only;
- fixed bounded verification semantics.

Tier 0 must remain useful when every security integration is absent.

### Tier 1 — Lightweight local optional evidence

Examples:

- already-installed deterministic scanner output;
- optional content-type observation;
- stable local standard-format ingestion.

No network required by Ascout itself.

### Tier 2 — Explicit configured security adapters

Examples:

- project-configured SARIF-producing scanner;
- configured security command already owned by the project;
- optional provider-mediated scanner.

Requires explicit command/config authority and egress/credential classification.

### Tier 3 — Benchmark lab / dynamic red-team evidence

Examples:

- CVE container benchmark;
- vulnerability PoC replay;
- running-agent black-box probes;
- MCP dynamic testing;
- destructive-risk or hostile-input evaluation.

Tier 3 is not normal `ascout check` execution unless a future architecture explicitly proves a safe bounded product design.

---

## 11. Candidate future policy classes

Research-only candidate classes:

```text
SECURITY_RELEVANT
AUTHORIZATION_SENSITIVE
DEPENDENCY_SECURITY
MCP_SERVER
AGENT_SKILL
AI_AGENT
EXTERNAL_TOOL_SURFACE
ARTIFACT_TYPE_SENSITIVE
```

These do not become required policy simply because a path name matches. Any future applicability engine must be explainable, source-bound, benchmarked, and fail unresolved on ambiguity.

Example future policy relationship:

```text
change classification
  -> required evidence declaration
  -> adapter applicability proof
  -> actual current-run evidence
  -> policy verdict
```

Never:

```text
path heuristic
  -> hidden scanner invocation
  -> score
  -> green
```

---

## 12. Security evidence result model

A future canonical spec should avoid one global security boolean.

Research decomposition:

### Producer execution state

```text
EXECUTED
NOT_RUN
BLOCKED
ERROR
```

### Output state

```text
VALID
INVALID
MISSING
TRUNCATED_OR_INCOMPLETE
```

### Applicability state

```text
APPLICABLE
NOT_APPLICABLE
UNRESOLVED
```

### Observation state

```text
FINDINGS_OBSERVED
NO_SIGNAL_OBSERVED
UNRESOLVED
```

### Reproduction state when a deterministic oracle exists

```text
REPRODUCED
NOT_REPRODUCED
CONTRADICTORY
UNKNOWN
```

The exact schema names are future work. The structural requirement is that operational, applicability, observation, and reproduction states cannot collapse into one field.

---

## 13. Privacy and egress requirements

Any future external security evidence must disclose, without exposing secrets:

- whether source bytes leave the local host;
- whether prompts/context leave the local host;
- provider/base endpoint identity;
- target endpoint class;
- whether findings/output are retained remotely;
- credential source class;
- redaction/truncation facts;
- whether network access is required by the subject, producer, or both.

Ascout must not silently upload a repository to obtain a security verdict.

A future user-facing admission should distinguish:

- permission to execute changed project command/config;
- permission to send source/context externally;
- permission to probe a remote target;
- permission to retain remote evidence.

These are separate authorities.

---

## 14. Rights, provenance, and source-admission procedure

Before any source/tool becomes an implementation dependency or source donor:

1. freeze exact upstream repository and revision;
2. enumerate exact candidate paths/components/data/rules;
3. identify governing license for each exact path;
4. inspect NOTICE/attribution obligations;
5. inspect dataset/model/data-use restrictions separately from code license;
6. inspect trademarks/names separately from copyright license;
7. inspect transitive dependency/runtime implications;
8. inspect model-weight/model-data terms where applicable;
9. inspect network/provider terms where applicable;
10. define why reference, adapter, dependency, or source reuse is necessary;
11. define a removal/disable path;
12. record security/data/privacy risks;
13. benchmark before promotion;
14. obtain separate canonical implementation authority.

The existence of an Apache/MIT license at repository root is never sufficient to skip path-level review in a heterogeneous repository.

---

## 15. Proposed future research sequence

The labels below are **not task IDs and do not authorize implementation**.

### S0 — Source qualification dossier

Output:

- immutable source pins;
- exact path/license/NOTICE classification;
- data/model/provider terms where relevant;
- adopt/reference/reject decision per source surface.

### S1 — Security Evidence Contract

Design only:

- execution/output/applicability/scope separation;
- deterministic vs dynamic vs model-mediated authority classes;
- finding and location binding;
- errors/incompleteness semantics;
- egress metadata;
- producer metadata containment.

### S2 — CVE benchmark corpus

AICGSecEval-inspired but independently qualified:

- small reviewed corpus first;
- vulnerable/fixed controls;
- functional and security axes;
- immutable scripts/images/tools;
- no mutable tags as identity;
- no pre-data universal threshold.

### S3 — SARIF shadow adapter

Read-only/shadow evaluation only:

- strict SARIF parsing;
- safe path normalization;
- source/current-run binding;
- adapter failure accounting;
- no gating clean verdict initially.

### S4 — Agent/MCP/Skill security evidence research

Evaluate whether AI-Infra-Guard-style outputs can satisfy Ascout's evidence standard without making a required LLM/cloud dependency.

### S5 — Artifact content-identity experiment

Compare:

- deterministic signature/parser methods;
- Magika-style classifier evidence;
- incremental detection value and overhead.

### S6 — Promotion decision

Only measured evidence may choose among:

```text
REJECT
RETAIN_AS_RESEARCH
OPTIONAL_ADAPTER
POLICY_ELIGIBLE_OPTIONAL_EVIDENCE
```

No source becomes a default required verifier merely because it performs well on a small benchmark.

---

## 16. Dependency ordering relative to current canonical work

This study MUST NOT reorder the active program.

Current dependency order remains:

```text
Spec 007 / T113 recovery
  -> separately authorized R007-09 implementation, if authorized
  -> any separately authorized successor execution, if justified
  -> T113 publication only on genuine candidate evidence
  -> T114 / Spec 007 terminal reconciliation
  -> canonical whole-project successor-authority reread
```

Only after a then-current canonical reread may the security research sequence be considered for conversion into an active Spec Kit package.

Issue #75 and this document remain research ledgers while that program is active.

---

## 17. Future acceptance gates

A future security-evidence implementation must not close canonical unless it proves, as applicable:

### Integrity

```text
false green caused by producer execution failure = 0
false green caused by missing/invalid output = 0
false green caused by parser/config failure = 0
cross-tree security evidence transfer = 0
unsafe artifact path accepted as valid evidence = 0
mandatory-axis failure hidden by aggregate score = 0
model-mediated no-finding silently converted to deterministic PASS = 0
```

### Provenance

```text
source identity bound = yes
tool identity bound = yes
config identity bound = yes
material model identity bound when applicable = yes
container/runtime identity bound when applicable = yes
egress class explicit when applicable = yes
```

### Product boundary

```text
core works with optional security integrations absent = yes
implicit installs = 0
required LLM/cloud for core = 0
generic arbitrary plugin execution added merely for scanners = 0
```

### Benchmark quality

```text
known-vulnerable controls qualified = yes
known-fixed controls qualified = yes
functional control preserved = yes
security oracle identity preserved = yes
adapter failures measured separately = yes
producer quality measured separately from adapter quality = yes
```

Exact quantitative promotion thresholds require real data and a later canonical decision.

---

## 18. Adversarial test matrix for any future adapter

A future adapter should be attacked with at least:

- valid zero findings;
- scanner process nonzero exit;
- scanner timeout;
- missing output file;
- empty output;
- invalid JSON/XML/SARIF;
- valid schema with missing required semantic fields;
- parser configured against wrong response field;
- stale source identity;
- output from another repository/tree;
- absolute path;
- traversal path;
- URI/path ambiguity;
- duplicate findings;
- invalid line range;
- unknown rule ID;
- producer version mismatch;
- config digest mismatch;
- truncated output;
- remote provider outage;
- rate limit;
- credential unavailable;
- model context overflow;
- model refusal;
- contradictory repeated model-mediated results;
- model/tool output with high score but failed applicability;
- producer score indicating clean while deterministic oracle reproduces vulnerability;
- safe/benign content with misleading extension;
- malicious or executable-looking content where classifier confidence is unresolved;
- missing model asset identity for classifier-backed evidence.

Every failure must terminate in an explicit non-clean state.

---

## 19. YAGNI / rejection boundaries

Do not build merely because the donor sources contain these capabilities:

- an Ascout web dashboard;
- a red-team SaaS;
- a scanner marketplace;
- an LLM orchestration layer;
- multi-model routing;
- an agent framework;
- arbitrary remote target probing in ordinary `ascout check`;
- a proprietary security score;
- a new SAST engine;
- a new DAST engine;
- a generic vulnerability database;
- a Docker control plane;
- a new malware detector;
- a file classifier from scratch;
- a general-purpose plugin SDK.

Prefer evidence adapters around mature producer-native interfaces when measured gaps justify them.

---

## 20. Recommended product direction after the current program

The strongest source-informed evolution is:

```text
exact change
  -> explicit evidence policy
  -> bounded native/project security producer when applicable
  -> strict structured evidence adapter
  -> execution/output/applicability/scope validation
  -> source/evidence binding
  -> independent functional/security/integrity axes
  -> honest receipt with visible gaps
```

Not:

```text
exact change
  -> run many scanners
  -> average scores
  -> PASS
```

This preserves Ascout's differentiation. The product remains the trustworthy judgment layer rather than the collection of scanners underneath it.

---

## 21. Source-specific recommendation summary

### Tencent/AICGSecEval

**Decision:** `PRIMARY_BENCHMARK_REFERENCE`

Use its strongest ideas:

- repository-level security tasks;
- CVE/base/fix source pairing;
- functional + vulnerability oracles;
- static + dynamic evaluation separation;
- agent-generated-code evaluation;
- bounded test commands.

Harden before Ascout use:

- immutable container digests;
- exact script/oracle bytes;
- exact rights/data provenance;
- small independently qualified corpus;
- no assumption that donor dataset validation is sufficient for Ascout.

### Tencent/AI-Infra-Guard

**Decision:** `PRIMARY_SECURITY_ADAPTER_AND_THREAT_REFERENCE`

Use its strongest ideas:

- SARIF 2.1.0 boundary;
- MCP/Skill/Agent threat taxonomies;
- explicit structured scanner outputs;
- concrete vulnerable agent fixtures;
- dynamic and static mode separation.

Reject as Ascout defaults:

- mandatory LLM/provider dependence;
- global security score as truth;
- implicit source egress;
- public deployment assumptions;
- copying a full red-team platform;
- root-license inference across heterogeneous subprojects.

### google/magika

**Decision:** `OPTIONAL_ARTIFACT_IDENTITY_EXPERIMENT`

Use its strongest ideas:

- local content classification;
- confidence-aware fallback;
- raw model output vs final tool output distinction;
- unknown/generic output rather than forced certainty.

Do not claim:

- malware detection;
- security proof;
- trustworthiness from file type;
- clean result from classifier confidence alone.

---

## 22. Completion criteria for this research plan

This research plan is complete when it is canonically present as a non-authoritative strategy artifact and Issue #75 records its identity.

That completion means only:

```text
SOURCE_STUDY_CAPTURED = YES
GAPS_DOCUMENTED = YES
FUTURE_RESEARCH_SEQUENCE_DEFINED = YES
SECURITY_IMPLEMENTATION_AUTHORITY = NO
CURRENT_SPEC_007_ORDER_CHANGED = NO
```

Future implementation remains separately gated.
