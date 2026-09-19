# Ascout Unified Assurance — P0 Canonicalization Record

**Status:** P0 PLANNING GATES MATERIALIZED / FINAL HEAD QUALIFICATION PENDING  
**Date:** 2026-09-19  
**Repository:** `TheHalfMoon/Ascout`  
**Planning PR:** #358  
**Canonical planning base:** `e23331a46ea04bbcfd4dc4e2b538dbb410125a1a`

This record closes the planning-time artifacts required by `UA-P00-T01` through `UA-P00-T06`. It does not authorize `UA-P01` implementation. `UA-P00-T07` through `UA-P00-T10` remain exact-head review/CI/merge/authorization gates.

## 1. Live frontier reconciliation

At the planning base:

```text
main = e23331a46ea04bbcfd4dc4e2b538dbb410125a1a
Spec 016 canonical implementation frontier = P016-13 merged
open implementation PR chain conflicting with this planning package = none found
unexecuted Spec 016 frontier = P016-14+
```

Historical authority reconciliation is separately recorded as G75:

```text
Issue #344 effective authority = P016-02..P016-09 only
P016-10..P016-13 code presence = canonical fact
separate pre-merge P016-10..P016-13 authorization ledger found by this audit = NO
retroactive authority fabrication = FORBIDDEN
```

The successor `UA-P01` authorization must acknowledge this and explicitly decide the P016-14+ frontier.

## 2. Constitution compatibility matrix

Current Constitution:

```text
version = 1.0.0
ratified = 2026-08-21
amended by this planning PR = NO
```

Classification vocabulary:

```text
COMPATIBLE_CURRENT
COMPATIBLE_IF_EFFECT_FREE
FRESH_DECISION_REQUIRED
AMENDMENT_LIKELY_REQUIRED
INHERITS_PREDECESSOR_AUTHORITY
```

| Phase | Current classification | Reason / authorization condition |
| --- | --- | --- |
| UA-P00 Planning canonicalization | COMPATIBLE_CURRENT | Documentation, provenance, review, CI, merge, and bounded authorization artifacts do not widen product execution authority. |
| UA-P01 Shared assurance contracts | COMPATIBLE_CURRENT | Pure contracts/validators/tests only; no model, network, donor engine, publication, sandbox, remote runtime, or source mutation. |
| UA-P02 Engine registry/planner | COMPATIBLE_IF_EFFECT_FREE | Declarative registration/planning is compatible while it does not execute external engines or widen the M1 core requirement set. |
| UA-P03 Review v1 / OpenCodeReview | FRESH_DECISION_REQUIRED | Introduces optional AI/provider review execution beyond M1. It must remain non-authoritative, optional/local-first compatible, and separately authorized. If it becomes required core or requires mandatory cloud/API-key operation, amendment review is required. |
| UA-P04 Kodac workflow/publication | FRESH_DECISION_REQUIRED | Durable workflow is compatible in principle; GitHub/publication side effects need explicit effect authority and cannot be inferred from repository ownership. |
| UA-P05 Unified Test | FRESH_DECISION_REQUIRED | Expands beyond M1 into mutation/property/fuzz/performance/API/browser and related test classes explicitly excluded from M1. Fresh compatibility review must bind exact adapters/effects. |
| UA-P06 Sentrdel Security | AMENDMENT_LIKELY_REQUIRED | Security-suite orchestration is explicitly outside M1 and adds a new security evidence/control-plane subsystem. |
| UA-P07 Deep Security Audit | AMENDMENT_LIKELY_REQUIRED | Multi-agent/deep security audit orchestration and validation exceed the current M1 surface. |
| UA-P08 Kernux Reality contracts T01..T07 | COMPATIBLE_IF_EFFECT_FREE | Contract/schema work only may proceed after UA-P01 if separately authorized. |
| UA-P08 Kernux Reality execution T08..T17 | AMENDMENT_LIKELY_REQUIRED | Real browser/app/process/host execution introduces a broader capability/effect kernel and must not inherit authority from P016 or repository ownership. |
| UA-P09 Isolated Lab/runtime qualification | AMENDMENT_LIKELY_REQUIRED | Untrusted/isolation/sandbox execution is explicitly outside M1. |
| UA-P10 Remote runtime | AMENDMENT_LIKELY_REQUIRED | Remote host enrollment, mutual identity, remote effects, and revocation require a constitutional decision before authorization. |
| UA-P11 Cyber/threat model | FRESH_DECISION_REQUIRED | Threat-model data contracts may be effect-free; threat-intel/adversarial execution must not start without a fresh decision. |
| UA-P12 Dynamic authorized security | AMENDMENT_LIKELY_REQUIRED | External/active/adversarial targets are outside trusted-local M1 and require explicit target/effect authority plus constitutional approval. |
| UA-P13 Assure composite claims | INHERITS_PREDECESSOR_AUTHORITY | Claim reconciliation itself adds no execution authority; it may only combine evidence already valid under upstream authorities and cannot upgrade missing evidence. |
| UA-P14 Explain/reproduce/retest | INHERITS_PREDECESSOR_AUTHORITY | Explain is effect-free; reproduce/retest may only use executors already authorized for the target/effect class. |
| UA-P15 CLI/MCP/IDE/GitHub surfaces | FRESH_DECISION_REQUIRED | New product/control surfaces require review; public arbitrary plugin execution remains prohibited unless explicitly amended. |
| UA-P16 Donor migration/parity | INHERITS_PREDECESSOR_AUTHORITY | Migration may occur only for already-authorized capabilities and qualified sources; migration itself cannot widen authority. |
| UA-P17 Packaging/supply-chain/release | FRESH_DECISION_REQUIRED | Packaging/attestation can be effect-free; publication, update channels, signing keys, or release writes require separate authority. |
| UA-P18 Conformance/closeout | COMPATIBLE_CURRENT | Evidence-only conformance and completion accounting create no new runtime authority. |

Hard rule:

> A later planning classification is not implementation authority. Every phase marked `FRESH_DECISION_REQUIRED` or `AMENDMENT_LIKELY_REQUIRED` is blocked until a live exact-scope constitutional decision is recorded. A phase marked `INHERITS_PREDECESSOR_AUTHORITY` cannot exceed the authority of the evidence/executors it consumes.

## 3. Owner repository inventory gate

The owner-wide inventory is recorded in:

`docs/strategy/ASCOUT_OWNER_REPOSITORY_SOURCE_INVENTORY_2026-09-19.md`

Result:

```text
ACCESSIBLE_OWNER_REPOSITORIES = 33
PUBLIC_REPOSITORIES = 26
PRIVATE_REPOSITORIES = 7
ACCESSIBLE_REPOSITORIES_CONSIDERED = 33_OF_33
UNCLASSIFIED_OWNER_REPOSITORIES = 0
PUBLIC_DISCLOSURE_OF_PRIVATE_REPOSITORY_NAMES = 0
```

No source was admitted merely because it exists.

## 4. Source Candidate Registry seed

This seed identifies selected planning candidates. It is **not** an import/admission record. Component-level fields such as selected paths, blob digests, dependency deltas, NOTICE obligations, security review, and behavioral characterization are completed immediately before actual intake.

| source_id | repository | exact planning revision | source class | planning integration mode | authority ceiling | disposition/status |
| --- | --- | --- | --- | --- | --- | --- |
| SRC-KODAC | `TheHalfMoon/Kodac` | `406b335277f2df1e3dedf24cdb45847dff919d44` | owner capability donor | PATTERN_ONLY / selective REIMPLEMENTED or COPIED only after qualification | workflow/review observations; never Ascout ClaimAssessment | SELECTED_FOR_LATER_CHARACTERIZATION |
| SRC-SENTRDEL | `TheHalfMoon/Sentrdel` | `f5747319a50831ef7cee983d253c0ca5503c9a64` | owner security engine/donor | EXTERNAL_ENGINE_ADAPTER first | security observations/findings only; never global PASS | SELECTED_FOR_LATER_ADAPTER |
| SRC-KERNUX | `TheHalfMoon/kernux` | `aefc90d753af6d0b2111976bcc38d2d675d7f352` | owner reality runtime/donor | EXTERNAL_ENGINE_ADAPTER / protocol integration | runtime events/artifacts only; never Ascout claim authority | SELECTED_FOR_LATER_REALITY_ADAPTER |
| SRC-WEPLD-AF | `TheHalfMoon/wepld` | `765f9d4ae0588ca06b0f65cd76de16eaa8a5c246` | owner architecture donor | PATTERN_ONLY | no runtime authority | SELECTED_ARCHITECTURE_REFERENCE |
| SRC-ALIBABA-OCR | `alibaba/open-code-review` | `bedfeb1085819b563e6db38496cc6f9c9dfcc9b9` | external review engine | EXTERNAL_ENGINE_ADAPTER first | external review observation only; no direct PASS/publication | SELECTED_PRIMARY_REVIEW_ENGINE_CANDIDATE |
| SRC-CLOUDFLARE-AUDIT | `cloudflare/security-audit-skill` | `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8` | external audit-method donor | PATTERN_ONLY / DERIVED method only after provenance | method guidance only; no trust-root authority | SELECTED_PRIMARY_AUDIT_METHOD_REFERENCE |

Observed external root licenses at this planning head:

```text
SRC-ALIBABA-OCR = Apache-2.0
SRC-CLOUDFLARE-AUDIT = MIT
```

Source use permission does not replace nested third-party/license/security qualification.

## 5. Freshness result

Immediately before final planning qualification:

```text
Kodac = unchanged from first planning observation
Sentrdel = unchanged from first planning observation
Cloudflare Security Audit Skill = unchanged from first planning observation
Kernux = advanced by 10 commits; protocol/conformance role revalidated
Alibaba OpenCodeReview = advanced by 3 commits; observed delta is IDE/editor integration; core review role unchanged
WePLD = fresh planning pin established
```

Implementation must re-pin again immediately before each source intake.

## 6. Cross-artifact consistency gate

The planning package now has one canonical meaning for:

- `UA-P01` as the first implementation phase;
- contract-only first wedge;
- Ascout as sole ClaimAssessment authority;
- typed hard-gate states;
- target/effect authorization;
- P016-10..13 historical authority debt;
- P016-14+ as an unexecuted frontier requiring successor decision;
- 75 mapped material gap classes;
- 33-of-33 owner repository consideration;
- private-source non-disclosure;
- fresh primary-source planning observations.

No planning document authorizes runtime implementation.

## 7. Remaining P0 gates

```text
UA-P00-T01 LIVE RECONCILIATION = SATISFIED
UA-P00-T02 CONSTITUTION MATRIX = SATISFIED_AS_PLANNING
UA-P00-T03 OWNER SOURCE INVENTORY = SATISFIED
UA-P00-T04 SOURCE REGISTRY SEED = SATISFIED_AS_PLANNING
UA-P00-T05 FRESH PRIMARY PINS = SATISFIED_AS_PLANNING
UA-P00-T06 CROSS-ARTIFACT CONSISTENCY = SATISFIED_AS_PLANNING

UA-P00-T07 FINAL EXACT-HEAD REVIEW = PENDING
UA-P00-T08 EXACT-HEAD CI / SELF VERIFICATION = PENDING
UA-P00-T09 CANONICAL PLANNING MERGE = PENDING
UA-P00-T10 UA-P01 IMPLEMENTATION AUTHORIZATION = NOT_STARTED
```

No `UA-P01` source mutation may begin before T10 becomes canonical/effective.
