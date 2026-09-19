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

Classification vocabulary is exactly the frozen contract vocabulary:

```text
CONSTITUTION_COMPATIBLE
CONSTITUTION_AMENDMENT_REQUIRED
DEFERRED
```

| Phase | Frozen classification | Reason / authorization condition |
| --- | --- | --- |
| UA-P00 Planning canonicalization | CONSTITUTION_COMPATIBLE | Documentation, provenance, review, CI, merge, and bounded authorization artifacts do not widen product execution authority. |
| UA-P01 Shared assurance contracts | CONSTITUTION_COMPATIBLE | Pure contracts/validators/tests only; no model, network, donor engine, publication, sandbox, remote runtime, or source mutation outside the bounded contract implementation. |
| UA-P02 Engine registry/planner | CONSTITUTION_COMPATIBLE | Declarative registration/planning only. External engine execution remains outside this phase. |
| UA-P03 Review v1 / OpenCodeReview | CONSTITUTION_AMENDMENT_REQUIRED | Adds AI/provider review execution beyond M1. The amendment/review must preserve optional/local-first core behavior, non-authoritative model output, provenance, and no silent publication. |
| UA-P04 Kodac workflow/publication | CONSTITUTION_AMENDMENT_REQUIRED | Adds durable workflow/publication effects beyond the current M1 product surface. GitHub effects need explicit authority independent of repository ownership. |
| UA-P05 Unified Test | CONSTITUTION_AMENDMENT_REQUIRED | Expands into verification classes explicitly outside M1, including mutation/property/fuzz/performance/API/browser-related orchestration. |
| UA-P06 Sentrdel Security | CONSTITUTION_AMENDMENT_REQUIRED | Security-suite orchestration and a security evidence/control-plane subsystem are outside M1. |
| UA-P07 Deep Security Audit | CONSTITUTION_AMENDMENT_REQUIRED | Multi-agent/deep security audit orchestration exceeds the current M1 surface. |
| UA-P08 Kernux Reality contracts T01..T07 | CONSTITUTION_COMPATIBLE | Contract/schema work is effect-free and creates no runtime authority. |
| UA-P08 Kernux Reality execution T08..T17 | CONSTITUTION_AMENDMENT_REQUIRED | Real browser/app/process/host execution introduces a broader capability/effect kernel beyond M1. |
| UA-P09 Isolated Lab/runtime qualification | CONSTITUTION_AMENDMENT_REQUIRED | Untrusted/isolation/sandbox execution is explicitly outside M1. |
| UA-P10 Remote runtime | DEFERRED | Remote host enrollment/trust/effects remain blocked until a future constitutional amendment and explicit runtime authority exist. |
| UA-P11 Cyber/threat model | CONSTITUTION_AMENDMENT_REQUIRED | Cyber/threat-intelligence/adversarial capability is outside M1; purely descriptive planning does not authorize execution. |
| UA-P12 Dynamic authorized security | DEFERRED | External active/adversarial targets remain blocked until Lab/isolation predecessors, a constitutional amendment, and exact DynamicTargetAuthorization authority exist. |
| UA-P13 Assure composite claims | CONSTITUTION_COMPATIBLE | Claim reconciliation adds no execution authority and may only consume evidence valid under already-authorized predecessors. |
| UA-P14 Explain/reproduce/retest | CONSTITUTION_COMPATIBLE | Explain is effect-free; reproduce/retest may only call already-authorized executors and cannot widen their effect ceilings. |
| UA-P15 CLI/MCP/IDE/GitHub surfaces | CONSTITUTION_AMENDMENT_REQUIRED | Adds product/control/publication surfaces outside M1; arbitrary public plugin execution remains prohibited absent explicit ratification. |
| UA-P16 Donor migration/parity | CONSTITUTION_COMPATIBLE | Migration is limited to already-authorized capabilities and separately qualified source intake; it cannot widen authority. |
| UA-P17 Packaging/supply-chain/release | CONSTITUTION_AMENDMENT_REQUIRED | Release/update/signing/publication effects exceed current M1 authority even though local packaging analysis may be effect-free. |
| UA-P18 Conformance/closeout | CONSTITUTION_COMPATIBLE | Evidence-only conformance and completion accounting create no new runtime authority. |

Hard rules:

1. `CONSTITUTION_COMPATIBLE` is compatibility classification only; it never grants implementation authority.
2. `CONSTITUTION_AMENDMENT_REQUIRED` blocks phase implementation until the amendment is canonically ratified and the phase receives separate implementation authority.
3. `DEFERRED` blocks all phase implementation until a future canonical decision reclassifies the phase and all predecessor/authority gates are satisfied.
4. A compatible phase may consume only effects/evidence already within its explicit authorization; compatibility never widens a predecessor executor's authority.

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

### 4.1 P0 root license and NOTICE disposition

The P0 gate performs a bounded planning-time root legal-file review at the exact planning revisions. It does **not** claim path-level or dependency-level source admission.

| Source | Exact revision | Root license observation | Root NOTICE / third-party notice observation | P0 disposition |
| --- | --- | --- | --- | --- |
| `TheHalfMoon/Kodac` | `406b335277f2df1e3dedf24cdb45847dff919d44` | Apache-2.0 `LICENSE` present | no root `NOTICE`, `THIRD_PARTY_NOTICE`, or equivalent legal-notice file observed in the root listing | ROOT_LICENSE_REVIEWED / ROOT_NOTICE_ABSENT / SELECTED_PATH_NESTED_REVIEW_REQUIRED |
| `TheHalfMoon/Sentrdel` | `f5747319a50831ef7cee983d253c0ca5503c9a64` | Apache-2.0 `LICENSE` present | no root `NOTICE`, `THIRD_PARTY_NOTICE`, or equivalent legal-notice file observed in the root listing | ROOT_LICENSE_REVIEWED / ROOT_NOTICE_ABSENT / SELECTED_PATH_NESTED_REVIEW_REQUIRED |
| `TheHalfMoon/kernux` | `aefc90d753af6d0b2111976bcc38d2d675d7f352` | Apache-2.0 `LICENSE` present | no root `NOTICE` file observed; `third_party/notices/` exists with README, machine-readable inventory, and preserved license snapshots | ROOT_LICENSE_REVIEWED / THIRD_PARTY_NOTICE_SYSTEM_PRESENT / SELECTED_COMPONENT_NOTICE_REVIEW_REQUIRED |
| `alibaba/open-code-review` | `bedfeb1085819b563e6db38496cc6f9c9dfcc9b9` | Apache-2.0 `LICENSE` present | no root `NOTICE`, `THIRD_PARTY_NOTICE`, or equivalent legal-notice file observed in the root listing | ROOT_LICENSE_REVIEWED / ROOT_NOTICE_ABSENT / SELECTED_PATH_NESTED_REVIEW_REQUIRED |
| `cloudflare/security-audit-skill` | `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8` | MIT `LICENSE` present | no separate root `NOTICE` file observed; the MIT copyright and permission notice in `LICENSE` must be preserved where its terms require | ROOT_LICENSE_REVIEWED / LICENSE_NOTICE_TEXT_PRESENT / SELECTED_PATH_NESTED_REVIEW_REQUIRED |

For Kernux, the existing third-party notice inventory is evidence about Kernux's recorded third-party material only. It does not automatically satisfy Ascout's future notice/provenance obligations for whichever Kernux components Ascout may select.

For all five sources:

```text
P0_ROOT_LICENSE_NOTICE_REVIEW = COMPLETE
PATH_LEVEL_LICENSE_REVIEW = NOT_COMPLETE
DEPENDENCY_NESTED_LICENSE_REVIEW = NOT_COMPLETE
SOURCE_ADMISSION = NOT_GRANTED
```

Path-level/nested license, NOTICE, attribution, dependency, and security review remains mandatory immediately before any copied/derived/dependency intake. Source use permission does not replace those gates.

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
UA-P00-T05 FRESH PRIMARY PINS + ROOT LICENSE/NOTICE DISPOSITION = SATISFIED_AS_PLANNING
UA-P00-T06 CROSS-ARTIFACT CONSISTENCY = SATISFIED_AS_PLANNING

UA-P00-T07 FINAL EXACT-HEAD REVIEW = PENDING
UA-P00-T08 EXACT-HEAD CI / SELF VERIFICATION = PENDING
UA-P00-T09 CANONICAL PLANNING MERGE = PENDING
UA-P00-T10 UA-P01 IMPLEMENTATION AUTHORIZATION = NOT_STARTED
```

No `UA-P01` source mutation may begin before T10 becomes canonical/effective.
