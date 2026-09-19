# Ascout Unified Assurance — Implementation Task Registry

**Status:** IMPLEMENTATION-READY PLANNING / NO IMPLEMENTATION AUTHORITY  
**Date:** 2026-09-19  
**Task namespace:** `UA-*` planning namespace only  
**Important:** These IDs do not replace active Spec 016 task IDs. Exact successor spec numbering is assigned only after live reconciliation.

## 0. Execution rule

A task is executable only when:

1. all listed dependencies are canonically complete;
2. its phase has explicit implementation authority;
3. live `main`, Constitution, source pins, branch rules, and required engines are reverified;
4. the task remains within its effect ceiling;
5. acceptance evidence can be produced on exact head.

Status vocabulary for this registry:

```text
PLANNED
BLOCKED_BY_PREDECESSOR
AUTHORIZED
IN_PROGRESS
QUALIFYING
CLOSED_CANONICAL
DEFERRED
REJECTED
```

Current status of all tasks below: `PLANNED`.

---

# P0 — Planning canonicalization

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P00-T01 | none | Reconcile planning branch to live main | Exact base/head/tree recorded; no stale frontier claim |
| UA-P00-T02 | T01 | Constitution compatibility matrix | Every phase classified compatible/amendment-required/deferred |
| UA-P00-T03 | T01 | Owner-wide repository source inventory | All accessible owner repos considered; relevant candidates dispositioned |
| UA-P00-T04 | T03 | Source Candidate Registry seed | Exact repo/revision/class/disposition for selected candidates |
| UA-P00-T05 | T04 | Re-pin Alibaba/Cloudflare/Kernux/Kodac/Sentrdel | Exact implementation-time identities + license/notice review |
| UA-P00-T06 | T02,T05 | Planning cross-artifact consistency pass | No contradictions across master/source/gaps/contracts/blueprint/tasks |
| UA-P00-T07 | T06 | Independent final planning review | Zero unresolved material findings |
| UA-P00-T08 | T07 | Exact-head planning CI/self-verification | Required checks success; failures preserved |
| UA-P00-T09 | T08 | Canonical planning merge | Guarded expected-head merge |
| UA-P00-T10 | T09 | First-wedge implementation authorization | Authority covers UA-P1 only |

---

# P1 — Shared assurance contracts

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P01-T01 | P00-T10 | AssuranceTarget type/validator | Exact source identity preserved; malformed/cross-target rejected |
| UA-P01-T02 | T01 | AssuranceIntent | Requested claim/profile/scope/effect budget validated |
| UA-P01-T03 | T02 | AssurancePolicySnapshot | Trusted/advisory policy sources separated; deterministic digest |
| UA-P01-T04 | T03 | AssurancePlan | Selected/omitted checks + effect requirements visible |
| UA-P01-T05 | T04 | EngineDescriptor | Exact identity/capabilities/effects/authority ceiling encoded |
| UA-P01-T06 | T05 | EngineQualification | Exact implementation/config/platform qualification refs |
| UA-P01-T07 | T06 | EngineRun | Immutable run occurrence + context/config/runtime identity |
| UA-P01-T08 | T07 | EvidenceRef | Resolvable target/run/artifact lineage + classification |
| UA-P01-T09 | T08 | Finding + lifecycle | Append-only lifecycle; clean engine cannot erase finding |
| UA-P01-T10 | T09 | CoverageClaim | Multidimensional coverage + explicit unknown |
| UA-P01-T11 | T10 | OmissionRecord + ContradictionRecord | Missing/conflicting evidence first-class |
| UA-P01-T12 | T11 | ClaimAssessment | Supporting/contradicting/missing/stale/refused evidence visible |
| UA-P01-T13 | T12 | Structural schemas | Strict schemas/versioning for P1 contracts |
| UA-P01-T14 | T13 | Semantic validator | Referential/source/claim invariants enforced |
| UA-P01-T15 | T14 | Deterministic serialization/digest | Stable fixtures across repeated runs |
| UA-P01-T16 | T15 | Contract adversarial corpus | Cross-target/dangling/stale/invalid state rejection |
| UA-P01-T17 | T16 | Existing `ascout check` compatibility suite | No semantic regression |
| UA-P01-T18 | T17 | P1 exact-head qualification | Full tests/typecheck/build/CI/review pass |

**P1 exit:** contracts exist with no external engine, model, network, Sentrdel, or Kernux execution.

---

# P2 — Engine registry and planner

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P02-T01 | P1 exit | Engine Registry | Register internal/external descriptors by exact identity |
| UA-P02-T02 | T01 | Availability model | AVAILABLE/UNAVAILABLE/NOT_QUALIFIED reasons explicit |
| UA-P02-T03 | T02 | Authority ceiling enforcement | Engine output cannot exceed descriptor ceiling |
| UA-P02-T04 | T03 | Effect-class evaluator | Plans fail closed above authorized ceiling |
| UA-P02-T05 | T04 | Qualification lookup/invalidation | Version/config change invalidates prior qualification |
| UA-P02-T06 | T05 | Deterministic planner | Identical snapshot produces identical plan |
| UA-P02-T07 | T06 | Omission planner | Required unavailable engine becomes claim-impacting omission |
| UA-P02-T08 | T07 | Plan preview renderer/JSON | User can inspect before effects |
| UA-P02-T09 | T08 | Native Ascout engine adapter | Existing check/test facts normalized |
| UA-P02-T10 | T09 | No-silent-fallback adversarial tests | Weaker substitute never preserves stronger claim |
| UA-P02-T11 | T10 | P2 qualification | Exact-head CI/review |

---

# P3 — Review v1 / Alibaba OpenCodeReview

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P03-T01 | P2 exit | Re-pin OpenCodeReview source | Exact revision/license/NOTICE/dependency delta |
| UA-P03-T02 | T01 | Review profile contract | diff/pr/workspace/spec/correctness scopes normalized |
| UA-P03-T03 | T02 | Review Context Capsule | Bounded source/spec/test/architecture context with provenance |
| UA-P03-T04 | T03 | OpenCodeReview adapter | Machine-readable execution; provider/model/config identity recorded |
| UA-P03-T05 | T04 | Raw review observation schema | Untrusted output isolated from canonical Finding |
| UA-P03-T06 | T05 | Location/source validator | Hallucinated/stale path/line cannot promote |
| UA-P03-T07 | T06 | Logical-group coverage accounting | Reviewed/unreviewed groups/files visible |
| UA-P03-T08 | T07 | Finding normalization | Preserve producer observation and provenance |
| UA-P03-T09 | T08 | Dedup/correlation | Group duplicates without destroying independent evidence |
| UA-P03-T10 | T09 | Provider absence/timeout handling | NOT_RUN/INCOMPLETE, never fabricated clean review |
| UA-P03-T11 | T10 | Prompt-injection boundary tests | Repository text cannot widen tools/authority |
| UA-P03-T12 | T11 | Independent-review policy | Independence derived from model/provider/context lineage |
| UA-P03-T13 | T12 | Review benchmark corpus v1 | Seeded defect + safe controls + stale/hallucination cases |
| UA-P03-T14 | T13 | `ascout review` CLI/JSON | No write/publication by default |
| UA-P03-T15 | T14 | P3 qualification | Hard gates zero; CI/review pass |

---

# P4 — Kodac workflow and GitHub publication convergence

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P04-T01 | P3 exit | Kodac capability characterization | Selected workflows frozen by fixtures |
| UA-P04-T02 | T01 | Exact-head freshness engine | Changed head stales review evidence |
| UA-P04-T03 | T02 | Durable stage/attempt model | Crash/resume does not erase incomplete work |
| UA-P04-T04 | T03 | Idempotency/reconciliation | Unknown result does not duplicate side effect |
| UA-P04-T05 | T04 | Reviewer-role separation | Acceptance-critical independence enforceable |
| UA-P04-T06 | T05 | PublicationIntent | Generation separate from GitHub effect |
| UA-P04-T07 | T06 | Redaction/classification gate | Sensitive evidence cannot publish accidentally |
| UA-P04-T08 | T07 | GitHub publication adapter | Exact target/head/comment identities |
| UA-P04-T09 | T08 | PublicationReceipt | Result/retry/reconciliation durable |
| UA-P04-T10 | T09 | Duplicate/stale publication tests | Zero duplicate or stale current claims |
| UA-P04-T11 | T10 | P4 qualification | CI/review + exact-head publication fixtures |

---

# P5 — Unified Test profile

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P05-T01 | P2 exit | Test profile policy | QUICK/STANDARD/DEEP/RELEASE semantics |
| UA-P05-T02 | T01 | Existing check adapter | Preserve task status/receipt semantics |
| UA-P05-T03 | T02 | Unified test Coverage projection | Test selection/execution/changed exercise visible |
| UA-P05-T04 | T03 | P016 browser evidence projection | Reuse IntentTest/oracle/journey truth |
| UA-P05-T05 | T04 | Contract/schema adapter boundary | External runner outputs normalized |
| UA-P05-T06 | T05 | Property/fuzz adapter contract | Counterexamples/effect requirements explicit |
| UA-P05-T07 | T06 | Mutation adapter contract | Attempted/killed/survived visible |
| UA-P05-T08 | T07 | Performance/recovery adapter contracts | No generic PASS from omitted classes |
| UA-P05-T09 | T08 | `ascout test` CLI | Additive; `ascout check` unchanged |
| UA-P05-T10 | T09 | Test benchmark v1 | Seed selection/flake/exercise/mutation/property/browser misses |
| UA-P05-T11 | T10 | Backward-compat qualification | Existing check golden fixtures unchanged |
| UA-P05-T12 | T11 | P5 qualification | CI/review hard gates pass |

---

# P6 — Sentrdel Security integration

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P06-T01 | P2 exit | Re-pin Sentrdel | Exact source/binary/config/provenance |
| UA-P06-T02 | T01 | Sentrdel capability characterization | Evidence/Coverage/UNKNOWN semantics frozen |
| UA-P06-T03 | T02 | Security engine adapter | Versioned request/response |
| UA-P06-T04 | T03 | Sentrdel Evidence normalization | External output does not self-attest |
| UA-P06-T05 | T04 | Coverage loss/UNKNOWN mapping | Unsupported scope blocks totality |
| UA-P06-T06 | T05 | SAST normalization | Rule/location/provenance preserved |
| UA-P06-T07 | T06 | Secrets checks | Synthetic secret benchmark; no plaintext in Ascout artifacts |
| UA-P06-T08 | T07 | SCA/dependency/SBOM | Inventory + advisory freshness + reachability states |
| UA-P06-T09 | T08 | IaC/CI security checks | Config/workflow findings normalized |
| UA-P06-T10 | T09 | Security invariant regression | Trusted-base comparisons preserve uncertainty |
| UA-P06-T11 | T10 | SARIF import/export boundary | SARIF is interchange, not canonical truth |
| UA-P06-T12 | T11 | Proof/reproduction refs | Finding can link deterministic reproductions |
| UA-P06-T13 | T12 | Remediation/retest lifecycle | Fix cannot verify without new evidence |
| UA-P06-T14 | T13 | `ascout security` CLI | Local/read-only default |
| UA-P06-T15 | T14 | Security benchmark v1 | Known regressions/safe controls/coverage gaps |
| UA-P06-T16 | T15 | P6 qualification | Hard gates zero |

---

# P7 — Cloudflare-derived deep audit

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P07-T01 | P6 exit | Re-pin Cloudflare skill | Exact source/method/license |
| UA-P07-T02 | T01 | AuditPlan | Recon + coverage + hunt + verify stages explicit |
| UA-P07-T03 | T02 | Reconnaissance evidence | Read-only source facts with provenance |
| UA-P07-T04 | T03 | CoverageLedger | Reviewed/unreviewed/unreadable scope explicit |
| UA-P07-T05 | T04 | Bounded hunter orchestration | Agents cannot gain new effect authority |
| UA-P07-T06 | T05 | Candidate finding intake | Model output remains CANDIDATE |
| UA-P07-T07 | T06 | Fresh-context independent verifier | No blind restatement of originating model |
| UA-P07-T08 | T07 | Validation policy | Required concrete evidence per finding class |
| UA-P07-T09 | T08 | Deep audit report/JSON | Coverage debt and rejected findings visible |
| UA-P07-T10 | T09 | Injection/consensus adversarial corpus | Consensus alone never validates |
| UA-P07-T11 | T10 | P7 qualification | Read-only deep audit proven |

---

# P8 — Kernux Reality local bridge

| Task | Depends on | P05 exit | Deliverable | Acceptance |
|---|---|---|---|---|
| UA-P08-T01 | P1 exit | — | RealityTestPlan | Exact substrate/effects/oracles/cleanup |
| UA-P08-T02 | T01 | — | RealityRun | Source/build/runtime/browser/app identity |
| UA-P08-T03 | T02 | — | LabManifest contract | Reproducible environment identity |
| UA-P08-T04 | T03 | — | SubstrateClass enforcement | Mock cannot satisfy REAL_COMPONENT |
| UA-P08-T05 | T04 | — | Re-pin Kernux protocol | Exact implementation/protocol identity |
| UA-P08-T06 | T05 | — | Kernux capability discovery adapter | Runtime capabilities negotiated, not inferred |
| UA-P08-T07 | T06 | — | Grant/effect mapping | Ascout intent cannot self-authorize |
| UA-P08-T08 | T07 | P05 | Real web bridge | Real app/service + isolated browser + trace/oracles |
| UA-P08-T09 | T08 | P05 | Real API/service bridge | Real process/port/request/side-effect/termination |
| UA-P08-T10 | T09 | P05 | Process/files/PTY evidence import | Execution-host truth preserved |
| UA-P08-T11 | T10 | P05 | Real desktop/app bridge | Typed/accessibility first; vision fallback visible |
| UA-P08-T12 | T11 | P05 | Cleanup contract | Required cleanup outcome claim-bearing |
| UA-P08-T13 | T12 | P05 | Build artifact/source binding | Wrong artifact blocks claim |
| UA-P08-T14 | T13 | P05 | Reality benchmark fixture app | Complete owned fixture with 12 seeded defects |
| UA-P08-T15 | T14 | P05 | Reality benchmark v1 | All seeded defects detected honestly |
| UA-P08-T16 | T15 | P05 | `ascout test --real` local profile | No hidden mock substitution |
| UA-P08-T17 | T16 | P05 | P8 qualification | Reality hard gates zero |

---

# P9 — Isolated Lab and provider qualification

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P09-T01 | P8 exit | Container Lab provider | Exact image/mount/network/resource identity |
| UA-P09-T02 | T01 | Isolation qualification profile | Hostile path/network/resource tests |
| UA-P09-T03 | T02 | OpenSandbox candidate adapter study | Capability != qualification |
| UA-P09-T04 | T03 | VM/microVM provider interface | Optional; only if stronger isolation justified |
| UA-P09-T05 | T04 | WSL provider | Distro/path/env identity explicit |
| UA-P09-T06 | T05 | Seed-data/service composition | Reproducible fixture startup |
| UA-P09-T07 | T06 | Teardown/recovery | Dirty cleanup visible and claim-impacting |
| UA-P09-T08 | T07 | Cross-runtime parity benchmark | Local + isolated same workload semantics |
| UA-P09-T09 | T08 | `ascout test --lab` | Qualified provider only |
| UA-P09-T10 | T09 | P9 qualification | Isolation hard gates zero |

---

# P10 — Remote runtime

**Predecessor:** fresh Constitution compatibility decision.

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P10-T01 | P9 exit | Constitution decision | Compatible or amendment canonically effective |
| UA-P10-T02 | T01 | Remote runtime identity/enrollment | Mutual identity, revocation |
| UA-P10-T03 | T02 | Host/controller policy intersection | Controller cannot exceed host |
| UA-P10-T04 | T03 | Operation identity/idempotency | Ambiguous retry safe |
| UA-P10-T05 | T04 | Contact vs execution state | Disconnect never equals exit |
| UA-P10-T06 | T05 | SSH runtime | Capability probing/reconnect/process truth |
| UA-P10-T07 | T06 | Paired device adapter | Version/capability negotiation |
| UA-P10-T08 | T07 | Remote evidence/artifact transfer | Digest/classification preserved |
| UA-P10-T09 | T08 | Disconnect/replay corpus | Zero fabricated completion/duplicate effects |
| UA-P10-T10 | T09 | `ascout test --remote` | Explicit runtime trust boundary |
| UA-P10-T11 | T10 | P10 qualification | Remote hard gates zero |

---

# P11 — Cyber planning and threat intelligence

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P11-T01 | P6 exit | ThreatModel contract | Assets/boundaries/entrypoints/effects/secrets |
| UA-P11-T02 | T01 | Threat-model-derived checks | Required security classes generated visibly |
| UA-P11-T03 | T02 | Threat intelligence adapter contract | STIX/TAXII/OpenCTI optional |
| UA-P11-T04 | T03 | Freshness/source/confidence model | Stale intel cannot appear current |
| UA-P11-T05 | T04 | Project correlation policy | Intel alone cannot create verified finding |
| UA-P11-T06 | T05 | Supply-chain admission plan | Static first; install scripts isolated |
| UA-P11-T07 | T06 | Adversarial local/lab profile | No external target needed |
| UA-P11-T08 | T07 | `ascout cyber` planning surface | Plan preview/effects visible |
| UA-P11-T09 | T08 | Cyber benchmark planning corpus | Authorization/intel/supply-chain cases |
| UA-P11-T10 | T09 | P11 qualification | No unauthorized network effects |

---

# P12 — Dynamic authorized security verification

**Predecessor:** fresh Constitution compatibility/amendment + qualified isolated runtime.

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P12-T01 | P11 exit,P9 exit | Constitution/effect authorization | Exact dynamic scope canonically allowed |
| UA-P12-T02 | T01 | DynamicTargetAuthorization | Exact host/origin/port/protocol/method scope |
| UA-P12-T03 | T02 | Credential capability | Least privilege; no plaintext persistence |
| UA-P12-T04 | T03 | Redirect boundary enforcement | Recheck every origin/target hop |
| UA-P12-T05 | T04 | Rate/concurrency/time/request budgets | Hard stop enforced |
| UA-P12-T06 | T05 | Scanner/template qualification | Exact plugin/template identity |
| UA-P12-T07 | T06 | Request/response evidence | Bounded/redacted/classified |
| UA-P12-T08 | T07 | Stop/incident/cleanup behavior | Ambiguity fails closed |
| UA-P12-T09 | T08 | Dynamic refusal/adversarial corpus | Out-of-scope first request = zero |
| UA-P12-T10 | T09 | `ascout cyber --dynamic` | Explicit E7 effect only |
| UA-P12-T11 | T10 | P12 qualification | Credential/scope hard gates zero |

---

# P13 — Assure composite claims

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P13-T01 | P3,P5,P6 | Claim requirement matrix | Mandatory evidence per claim |
| UA-P13-T02 | T01 | Evidence join engine | Exact-target only |
| UA-P13-T03 | T02 | Freshness aggregation | Stale required evidence blocks |
| UA-P13-T04 | T03 | Contradiction reconciliation | Conflict visible; no averaging away |
| UA-P13-T05 | T04 | Omission impact engine | Missing mandatory class -> INCOMPLETE |
| UA-P13-T06 | T05 | CHANGE_VERIFIED pack | Review/test/security policy |
| UA-P13-T07 | T06 | REALITY_TESTED pack | Requires qualified reality evidence |
| UA-P13-T08 | T07 | RELEASE_READY pack | Build/package/platform/provenance requirements |
| UA-P13-T09 | T08 | ADVERSARIAL pack | Requires authorized security/reality evidence |
| UA-P13-T10 | T09 | `ascout assure` CLI/JSON | No opaque score authority |
| UA-P13-T11 | T10 | Composite benchmark | Missing/stale/conflicting evidence cases |
| UA-P13-T12 | T11 | P13 qualification | No false SUPPORTED claim |

---

# P14 — Explain, reproduce, retest

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P14-T01 | P13 exit | `ascout explain` | Show claim/finding provenance and missing evidence |
| UA-P14-T02 | T01 | `ascout evidence` | Inspect exact evidence refs/artifacts |
| UA-P14-T03 | T02 | Reproduction planner | No automatic effect authority |
| UA-P14-T04 | T03 | Counterexample minimization boundary | Preserve original evidence |
| UA-P14-T05 | T04 | FixProposal | Advisory only |
| UA-P14-T06 | T05 | Reverification engine | FIXED/STILL_PRESENT/CHANGED/INCONCLUSIVE |
| UA-P14-T07 | T06 | Affected regression retest | Point fix alone insufficient |
| UA-P14-T08 | T07 | Risk acceptance event | Actor/scope/reason/expiry/invalidation |
| UA-P14-T09 | T08 | P14 qualification | Lifecycle integrity proven |

---

# P15 — IDE, MCP, GitHub surfaces

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P15-T01 | P13 exit | Surface-neutral API | All UI routes share intent/policy path |
| UA-P15-T02 | T01 | MCP read-only assurance tools | No authority bypass |
| UA-P15-T03 | T02 | MCP effectful tool gates | Same effect classes/grants |
| UA-P15-T04 | T03 | IDE diagnostics model | Finding/evidence freshness visible |
| UA-P15-T05 | T04 | GitHub check summary | Exact head/source binding |
| UA-P15-T06 | T05 | GitHub comment flow | Reuse P4 publication receipts |
| UA-P15-T07 | T06 | Surface-equivalence tests | Same request -> same plan/claim semantics |
| UA-P15-T08 | T07 | P15 qualification | No UI/MCP fast-path privilege |

---

# P16 — Donor migration and parity

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P16-T01 | P4,P6 | Kodac retained-capability inventory | Every selected capability dispositioned |
| UA-P16-T02 | T01 | Sentrdel retained-capability inventory | Every selected capability dispositioned |
| UA-P16-T03 | T02 | Donor path-level provenance | Exact selected paths/blobs/notices |
| UA-P16-T04 | T03 | Characterization corpus | Old behavior frozen |
| UA-P16-T05 | T04 | Dual-run parity harness | Semantic differences classified |
| UA-P16-T06 | T05 | Selective Kodac port/adapters | No second review authority |
| UA-P16-T07 | T06 | Selective Sentrdel port/adapters | Unknown/coverage semantics preserved |
| UA-P16-T08 | T07 | Operational dependency audit | No hidden old-repo runtime dependency |
| UA-P16-T09 | T08 | Documentation migration | Ascout becomes canonical product docs |
| UA-P16-T10 | T09 | Archive readiness decision | UNKNOWN capability disposition = block |
| UA-P16-T11 | T10 | P16 qualification | Migration parity proven |

---

# P17 — Packaging, supply chain, release engineering

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P17-T01 | P13 exit | Unified release manifest | CLI + companion versions/digests |
| UA-P17-T02 | T01 | Platform packaging matrix | Windows/macOS/Linux support explicit |
| UA-P17-T03 | T02 | Companion binary discovery/validation | Wrong binary cannot qualify |
| UA-P17-T04 | T03 | SBOM | Ascout + bundled components |
| UA-P17-T05 | T04 | THIRD_PARTY_NOTICES generation | All copied/derived/bundled sources mapped |
| UA-P17-T06 | T05 | Provenance/attestation | Build identity/release checksums |
| UA-P17-T07 | T06 | Install/update/rollback | Atomicity/mismatch behavior tested |
| UA-P17-T08 | T07 | Offline/local-first install test | Core useful without cloud account |
| UA-P17-T09 | T08 | Privacy/egress disclosure | Provider/runtime data movement visible |
| UA-P17-T10 | T09 | P17 qualification | Platform/package gates pass |

---

# P18 — Final qualification and closeout

| Task | Depends on | Deliverable | Acceptance |
|---|---|---|---|
| UA-P18-T01 | P17 exit | Contract adversarial suite | All absolute integrity gates zero |
| UA-P18-T02 | T01 | Review corpus final | Recall/precision/location/coverage integrity |
| UA-P18-T03 | T02 | Test corpus final | Selection/exercise/flake/adversarial integrity |
| UA-P18-T04 | T03 | Security corpus final | Invariant/coverage/reachability/retest integrity |
| UA-P18-T05 | T04 | Reality corpus final | 12 seeded defects + platform variants |
| UA-P18-T06 | T05 | Cyber authorization corpus | Scope/credential/redirect/budget integrity |
| UA-P18-T07 | T06 | Performance/resource report | Budgets measured; no hidden omission |
| UA-P18-T08 | T07 | Privacy/secret report | Zero Ascout-owned secret leakage |
| UA-P18-T09 | T08 | Source/license/provenance audit | No unmapped donor material |
| UA-P18-T10 | T09 | Migration/archive audit | Kodac/Sentrdel retention complete |
| UA-P18-T11 | T10 | Release/install/update/rollback proof | Supported platforms proven |
| UA-P18-T12 | T11 | Final exact-head independent review | Zero material unresolved findings |
| UA-P18-T13 | T12 | Project completion matrix | Every required area PROVEN/N/A |
| UA-P18-T14 | T13 | Canonical closeout | Completion claim bound to exact release identity |

---

# Cross-phase hard predecessors

```text
P0 -> P1 -> P2
P2 -> P3 -> P4
P2 -> P5
P2 -> P6 -> P7
P1 + P5 -> P8 -> P9 -> P10
P6 -> P11
P9 + P11 + Constitution authority -> P12
P3 + P5 + P6 -> P13
P13 -> P14 -> P15
P4 + P6 -> P16
P13 -> P17
P16 + P17 + required prior phases -> P18
```

Reality Verification does not wait for dynamic Cyber. Dynamic Cyber does wait for isolation and explicit authority.

# Suggested parallelism

Allowed after P2:

- P3 Review and P5 Test may proceed in parallel if contract surfaces are frozen.
- P6 Security may proceed in parallel with P4 publication.
- P8 contract work may start after P1, but real execution bridge must wait for actual qualified Kernux capabilities and P5 integration.

Disallowed:

- P12 before P9/P11/constitutional authority.
- P16 retirement before parity.
- P18 completion before P16/P17.
- any later phase that silently invents missing predecessor capability.

# First authorized work packet

Recommended first implementation authorization:

```text
UA-P01-T01 through UA-P01-T18 only
```

No external network.
No donor process.
No model provider.
No Sentrdel binary.
No Kernux execution.
No GitHub publication.
No source mutation beyond Ascout implementation files.

# Implementation-readiness statement

```text
TASK_GRAPH_DEFINED = YES
DEPENDENCIES_DEFINED = YES
ACCEPTANCE_GATES_DEFINED = YES
FIRST_WEDGE_BOUNDED = YES
LATER_EFFECTFUL_PHASES_SEPARATELY_GATED = YES
IMPLEMENTATION_AUTHORITY_NOW = NO
```
