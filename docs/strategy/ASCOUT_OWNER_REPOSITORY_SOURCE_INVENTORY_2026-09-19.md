# Ascout Owner Repository Source Inventory — 2026-09-19

**Status:** P0 SOURCE DISCOVERY COMPLETE / NO SOURCE INTAKE AUTHORITY  
**Repository:** `TheHalfMoon/Ascout`  
**Purpose:** prove that the unified Ascout planning pass considered the full accessible owner repository portfolio without silently treating repository availability as source-admission authority.

## 1. Live inventory result

The authenticated owner-wide enumeration on 2026-09-19 returned:

```text
ACCESSIBLE_OWNER_REPOSITORIES = 33
PUBLIC_REPOSITORIES = 26
PRIVATE_REPOSITORIES = 7
ARCHIVED_REPOSITORIES = 0
```

This artifact intentionally names only public repositories because Ascout is public.

The seven private repositories were included in the discovery/relevance pass, but their names, contents, and capability descriptions are not published here. No public Ascout architecture claim depends on an undisclosed private source.

If a private repository becomes necessary for implementation, it requires a separate source-admission record that preserves confidentiality while proving exact revision, permission/license, third-party obligations, security review, selected components, and authority ceiling. Publication of private provenance requires separate explicit authority.

## 2. What "considered" means

`CONSIDERED` means the repository was enumerated and screened for capabilities relevant to the unified Ascout product.

It does **not** mean:

- imported;
- copied;
- dependency-approved;
- license-qualified;
- security-qualified;
- benchmark-qualified;
- current enough for implementation;
- authorized to publish;
- authorized to execute.

Exact implementation intake always re-pins the selected repository/component immediately before use.

## 3. Disposition vocabulary

```text
CANONICAL_PRODUCT
PRIMARY_CAPABILITY_SOURCE
HIGH_VALUE_REFERENCE
SELECTIVE_DONOR_CANDIDATE
BENCHMARK_OR_METHOD_REFERENCE
DOMAIN_REFERENCE_ONLY
PROVENANCE_CAUTION_REFERENCE
EMPTY_OR_NO_CURRENT_VALUE
PRIVATE_CONSIDERED_UNDISCLOSED
```

A repository may have more than one disposition.

## 4. Primary public sources

| Repository | Disposition | Ascout value | Intake direction |
| --- | --- | --- | --- |
| `TheHalfMoon/Ascout` | CANONICAL_PRODUCT | Sole assurance truth kernel, source binding, receipts, check semantics, browser P016 foundation | Native canonical source; preserve compatibility |
| `TheHalfMoon/Kodac` | PRIMARY_CAPABILITY_SOURCE | Review workflow, exact-head freshness, durable attempts, publication discipline, qualification, Done Gate | Adapter/characterization first; selective port only after parity |
| `TheHalfMoon/Sentrdel` | PRIMARY_CAPABILITY_SOURCE | Security evidence, invariants, coverage honesty, reachability, proof/retest lifecycle | Companion adapter first; preserve Rust semantics and UNKNOWN states |
| `TheHalfMoon/kernux` | PRIMARY_CAPABILITY_SOURCE | Reality execution fabric: browser/web, computer/app, process/files/PTY, local/lab/remote runtime, grants/evidence | Protocol adapter first; capability availability and qualification explicit |
| `TheHalfMoon/wepld` | PRIMARY_CAPABILITY_SOURCE / HIGH_VALUE_REFERENCE | Assurance Fabric pattern: one target/evidence/finding/coverage model across review/security/testing | Pattern/contract adoption; not a second runtime |

These five define the main product convergence.

## 5. High-value public supporting sources

| Repository | Disposition | Relevant capability/pattern | Current unified-plan use |
| --- | --- | --- | --- |
| `TheHalfMoon/Winds` | HIGH_VALUE_REFERENCE / SELECTIVE_DONOR_CANDIDATE | Exact Git snapshot verification, detached candidate worktrees, independent checks, content-addressed evidence, typed execution ledger | Candidate isolation, exact-target verification, promotion/recovery semantics |
| `TheHalfMoon/SpecGrain` | HIGH_VALUE_REFERENCE | Bounded agent-neutral delivery, dependency-ordered small specs, recoverable/provable changes | Task slicing, implementation handoff, completion discipline |
| `TheHalfMoon/Diffcipline` | HIGH_VALUE_REFERENCE | Proof-before-done, scope/risk/challenge/prove loop, Rust CLI/GitHub Action | Completion challenge and evidence UX patterns |
| `TheHalfMoon/Delethos` | HIGH_VALUE_REFERENCE / SELECTIVE_DONOR_CANDIDATE | Verified delegation, independent review, isolation, exact-change observation | Reviewer independence/delegation and isolated execution patterns |
| `TheHalfMoon/Tarif` | HIGH_VALUE_REFERENCE | Agent authority runtime, exact action/resource/parameter authorization, deterministic policy enforcement | Effect/grant model cross-check; no dependency until mature/qualified |
| `TheHalfMoon/Ecra` | HIGH_VALUE_REFERENCE | Human/agent browser, search, workspace, trusted execution, Rust-native capability boundaries | Browser/runtime trust and capability UX reference |
| `TheHalfMoon/Golam` | HIGH_VALUE_REFERENCE | Local-first Agent OS, local ownership of models/tools/policies/execution history | Local-first policy/runtime/evidence architecture reference |
| `TheHalfMoon/Flake` | HIGH_VALUE_REFERENCE | Work continuity, evidence behind decisions, interruption/resume, bounded external-agent packages | Durable workflow/recovery/context continuity patterns |
| `TheHalfMoon/MESC` | HIGH_VALUE_REFERENCE / BENCHMARK_OR_METHOD_REFERENCE | Validator-grounded outputs, deterministic/reproducible evidence, provider qualification research | Validator/evidence and sandbox-provider qualification methods |
| `TheHalfMoon/MedScale` | HIGH_VALUE_REFERENCE | Local-first privacy, source registers, benchmark/evidence planning | Provenance, benchmark, privacy-first product constraints |
| `TheHalfMoon/MSTR` | BENCHMARK_OR_METHOD_REFERENCE | Local/offline software-engineering model/runtime, verified-completion metrics, resource constraints | Reviewer/model runtime qualification and efficiency benchmark ideas |
| `TheHalfMoon/commandMed` | BENCHMARK_OR_METHOD_REFERENCE | Evidence/safety/security/resource constrained model evaluation and tool use | AI-evaluator provenance, abstention, resource/evidence methodology |
| `TheHalfMoon/commandF` | HIGH_VALUE_REFERENCE | Deterministic package resolution, SHA-bound archives, diff/check/SARIF workflows | Supply-chain/package identity and machine-report interchange patterns |
| `TheHalfMoon/Himsat` | HIGH_VALUE_REFERENCE | Local-first evidence-linked memory, privacy, temporal provenance, capture authorization | Future evidence-memory/privacy/retention reference only |
| `TheHalfMoon/Wispral` | HIGH_VALUE_REFERENCE | Human voice control around agents, session state, interruption, permissions, visible authority | Human-control/approval/interrupt UX reference; not core dependency |

None of these sources becomes a runtime dependency merely because it is relevant.

## 6. Public reference-only / bounded-value sources

| Repository | Disposition | Reason |
| --- | --- | --- |
| `TheHalfMoon/Golam-research` | PROVENANCE_CAUTION_REFERENCE | Source-oriented reconstruction of a third-party application. Useful architecture research, but direct reuse requires especially strict provenance/legal review; no Ascout intake is planned. |
| `TheHalfMoon/Signthos` | DOMAIN_REFERENCE_ONLY | Verifiable signing/evidence and cross-platform planning may inform evidence UX/release thinking, but document-signing product code is outside Ascout core. |
| `TheHalfMoon/Qdrat` | DOMAIN_REFERENCE_ONLY | HR application/domain source; no measured gap currently requires product-source reuse in Ascout. |
| `TheHalfMoon/Zyara` | DOMAIN_REFERENCE_ONLY | Healthcare marketplace/navigation domain; no current Ascout assurance-core gap requires reuse. |
| `TheHalfMoon/Balott` | BENCHMARK_OR_METHOD_REFERENCE | Cryptographic fairness, replayability, server-authoritative competition are useful evidence/replay examples; game product code is not an Ascout dependency. |
| `TheHalfMoon/Trcel` | EMPTY_OR_NO_CURRENT_VALUE | Repository is currently empty; there is no source to qualify or reuse. |

## 7. Private repository boundary

Seven accessible owner repositories are private.

Disposition:

```text
PRIVATE_REPOSITORIES_CONSIDERED = 7
PRIVATE_REPOSITORY_NAMES_PUBLISHED_HERE = 0
PUBLIC_ASCOUT_DEPENDENCY_ON_UNDISCLOSED_PRIVATE_SOURCE = 0
```

Some private repositories contain potentially relevant verification, authority, workflow, or research patterns. They remain **non-public candidate context**, not public-source dependencies.

If one is selected later:

1. create a confidentiality-preserving Source Candidate Record;
2. bind exact repository/revision/tree and selected paths;
3. prove permission/license and nested third-party obligations;
4. determine whether provenance can be published;
5. characterize behavior and security boundary;
6. establish an authority ceiling;
7. define a benchmark/parity need;
8. admit only the minimum component needed.

If public provenance is required for an Ascout release and cannot be disclosed, that source cannot silently remain a claim-bearing dependency.

## 8. Portfolio synthesis

The owner portfolio reinforces six useful design families.

### A. Evidence and verification

Strongest sources:

```text
Ascout
Sentrdel
Winds
MESC
Diffcipline
commandF
```

Use for:

- exact subject identity;
- deterministic evidence;
- explicit unknown/omission;
- independent verification;
- package/artifact identity;
- proof-before-completion.

### B. Authority and effects

Strongest sources:

```text
Kernux
Kodac
Tarif
Delethos
Ecra
Golam
```

Use for:

- capability grants;
- effect ceilings;
- side-effect boundaries;
- host/runtime authority;
- publication separation;
- delegation/reviewer independence.

### C. Bounded delivery and recovery

Strongest sources:

```text
SpecGrain
Flake
Kodac
Winds
Diffcipline
```

Use for:

- small dependency-ordered slices;
- crash/resume;
- durable attempts;
- idempotency;
- completion gates.

### D. Real execution

Strongest sources:

```text
Kernux
Winds
Ecra
Golam
```

Use for:

- real browser/app/process/runtime operation;
- isolated candidate execution;
- local/remote capability negotiation;
- host-truth evidence.

### E. Model/evaluator qualification

Strongest sources:

```text
MSTR
MESC
commandMed
MedScale
```

Use for:

- exact model/provider identity;
- benchmark evidence;
- abstention and uncertainty;
- cost/resource constraints;
- reproducibility.

### F. Human control and explainability

Strongest sources:

```text
Wispral
Diffcipline
Kodac
Ascout
```

Use for:

- visible authority;
- interrupt/approval;
- clear scope/evidence;
- explainable completion.

## 9. YAGNI rule

The owner portfolio is deliberately broader than the implementation plan.

Ascout must **not** become a collage of every good repository.

A source enters implementation only if:

```text
measured capability gap
+ source is materially better than native implementation
+ provenance/license/security qualified
+ authority semantics fit
+ benchmark/parity requirement defined
+ minimum integration surface selected
```

Otherwise its disposition remains reference-only.

## 10. P0 source-discovery completion

This artifact closes the discovery/accounting portion of P0:

```text
OWNER_REPOSITORY_ENUMERATION = COMPLETE
ACCESSIBLE_REPOSITORIES_CONSIDERED = 33_OF_33
PUBLIC_REPOSITORIES_CLASSIFIED = 26_OF_26
PRIVATE_REPOSITORIES_CONSIDERED_WITH_NON_DISCLOSURE = 7_OF_7
UNCLASSIFIED_OWNER_REPOSITORIES = 0
SOURCE_IMPORTS_AUTHORIZED_BY_THIS_ARTIFACT = 0
```

It does **not** close implementation-time source admission.

Every selected source must still be freshly re-pinned and qualified immediately before intake.
