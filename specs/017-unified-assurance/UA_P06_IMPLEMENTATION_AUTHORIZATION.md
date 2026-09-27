# UA-P06 Implementation Authorization — Sentrdel Security Integration

**Status:** `PROPOSED / NOT_EFFECTIVE / FOUNDER_APPROVAL_REQUIRED`
**Ledger:** Issue #566
**Authorization base:** `7cb3c2594c86dae3e5fa489af1fff121a46b3dee`
**Phase:** `UA-P06 — Sentrdel Security integration`

## 1. Purpose

This artifact defines the only implementation authority that may make UA-P06 product-source mutations after it becomes canonically effective.

It is authorization-only. This artifact does not implement UA-P06 and grants no source mutation authority merely by existing on a branch or pull request.

```text
UA_P06_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
UA_P06_IMPLEMENTATION_AUTHORIZED = NO
UA_P06_CONSTITUTION_AMENDMENT = PROPOSED / NOT_RATIFIED
ASCOUT_PROJECT_COMPLETE = NO
```

Founder direction recorded in the session authorizes creation, review, qualification, and canonical admission of this bounded governance proposal. It does not pre-authorize implementation before this artifact becomes EFFECTIVE.

## 2. Canonical predecessors

At this authorization base:

```text
CANONICAL_MAIN = 7cb3c2594c86dae3e5fa489af1fff121a46b3dee
UA_P05 = CLOSED_CANONICAL / COMPLETE (T01-T12, post-merge CI 6/6 each)
UA_P04 = CLOSED_CANONICAL / COMPLETE
UA_P03 = CLOSED_CANONICAL / COMPLETE
UA_P02_ENGINE_REGISTRY_AND_PLANNER = CLOSED_CANONICAL / COMPLETE
UA_P01_SHARED_ASSURANCE_CONTRACTS = CLOSED_CANONICAL / COMPLETE
CONSTITUTION_VERSION = 1.2.0 (Amendments A04, A05 ratified)
UA_P06_IMPLEMENTATION_AUTHORIZED = NO
```

No UA-P06 task has started. No security-engine capability exists beyond the M1 `ascout check` core and the UA-P05 Test profile. No Sentrdel material exists in-tree (`vendor/` holds only `google-artemis`; no Sentrdel entry in `THIRD_PARTY_NOTICES.md`).

## 3. Constitution compatibility review and bounded amendment

### 3.1 Classification

The P0 canonicalization matrix classifies UA-P06 as:

```text
UA-P06 = CONSTITUTION_AMENDMENT_REQUIRED
```

Reason: security-suite orchestration and a security evidence/control-plane subsystem are outside the M1 wedge, which excludes security-suite orchestration, and Principle V admits no Rust requirement while Sentrdel is a Rust codebase.

This review confirms that classification. UA-P06 cannot proceed as compatible without a bounded amendment.

### 3.2 What is preserved

```text
PRINCIPLE_I_EVIDENCE_BEFORE_CLAIMS = PRESERVED
PRINCIPLE_II_NO_GREEN_BY_OMISSION = PRESERVED
PRINCIPLE_III_SOURCE_BOUND_TRUTH = PRESERVED
PRINCIPLE_IV_TRUST_BOUNDARY_CORE = PRESERVED (core check remains local and keyless)
PRINCIPLE_V_MINIMAL_CORE = EXTENDED_ONLY_BY_THIS_DELTA (no new mandatory runtime; no bundled Rust toolchain)
PRINCIPLE_VI_CONSERVATIVE_VERIFICATION = PRESERVED
PRINCIPLE_VII_PRIVACY_AND_BOUNDS = PRESERVED
PRINCIPLE_VIII_PROVENANCE_AND_LICENSE = PRESERVED
M1_RECEIPT_CONTRACT = PRESERVED
AMENDMENT_A04_WORKFLOW_AND_PUBLICATION = PRESERVED
AMENDMENT_A05_UNIFIED_TEST = PRESERVED
```

A security PASS never becomes a broader assurance PASS. Unsupported security scope remains visible. `ascout check` and `ascout test` semantics are unchanged.

### 3.3 Bounded delta (ratification candidate v1.2.0 to v1.3.0)

Upon effectiveness of this authorization, the following delta is ratified as Constitution v1.3.0. The mechanical application to `.specify/memory/constitution.md` must land on canonical main before any UA-P06-T01 implementation branch is created.

```text
AMENDMENT_ID = A06
AMENDMENT_SCOPE = UA-P06 Sentrdel security effects only
VERSION_CHANGE = 1.2.0 -> 1.3.0
```

Amendment text to be appended as a bounded subsection titled `Amendment A06 — Sentrdel Security integration`:

1. Ascout may integrate Sentrdel security capability as a first-class Security profile, adapter-first, with engine descriptors, versioned requests, and evidence normalization; Sentrdel outputs are observations and findings inputs, never a second truth kernel and never global PASS.
2. Sentrdel capability is characterized before use: Evidence, Coverage, and UNKNOWN semantics are frozen per capability, and unsupported scope blocks totality claims rather than degrading silently.
3. SAST, secrets, SCA/dependency/SBOM, and IaC/CI security outputs are normalized with rule, location, provenance, inventory, advisory freshness, and reachability states preserved. Synthetic secrets benchmarks must never place plaintext secrets in Ascout artifacts.
4. SARIF is interchange only, never canonical truth. Proof and reproduction references must link deterministic reproductions. A fix cannot verify without new evidence; remediation without retest remains open.
5. An additive `ascout security` command may exist with local, read-only default. `ascout check`, `ascout review`, and `ascout test` remain unchanged and `ascout security` is additive only.
6. No Rust toolchain, daemon, server, database, or mandatory network is required for any core claim. The Sentrdel engine is integrated through an external-engine adapter boundary; absence, version mismatch, or denial yields explicit NOT_RUN or INCOMPLETE, never PASS.
7. All local-zero-cost gates remain enforced: zero operator runtime cost, offline core, no mandatory Ascout backend, no silent paid fallback, telemetry off by default, local artifact retention by default, explicit data egress, optional engine absence explicit, entitlement truth independence, model source and weight provenance, donor permission and notice, and clean-machine local execution.
8. No mandatory network, account, key, provider, daemon, server, database, or paid fallback is introduced for any core claim. Missing capability remains explicit NOT_RUN or INCOMPLETE.

No other Constitution text changes. Any future phase needing broader effects requires its own amendment.

### 3.4 Ratification mechanics

```text
CONSTITUTION_CHANGE_IN_THIS_PR = NO
MECHANICAL_APPLICATION_PR_REQUIRED_BEFORE_T01 = YES
MECHANICAL_APPLICATION_SCOPE = .specify/memory/constitution.md exact section-3.3 text plus version 1.3.0 only
T01_START_BLOCKED_UNTIL = this authorization EFFECTIVE and constitution v1.3.0 on canonical main
```

## 4. Authorized task set after effectiveness

Exactly:

```text
UA-P06-T01
UA-P06-T02
UA-P06-T03
UA-P06-T04
UA-P06-T05
UA-P06-T06
UA-P06-T07
UA-P06-T08
UA-P06-T09
UA-P06-T10
UA-P06-T11
UA-P06-T12
UA-P06-T13
UA-P06-T14
UA-P06-T15
UA-P06-T16
```

No UA-P07 or later implementation is authorized by implication.

One task, one branch, one PR remains mandatory.

## 5. Task definitions

| Task | Deliverable | Acceptance boundary |
|---|---|---|
| UA-P06-T01 | Re-pin Sentrdel | Exact source/binary/config/provenance at the live-verified pin |
| UA-P06-T02 | Sentrdel capability characterization | Evidence/Coverage/UNKNOWN semantics frozen per capability |
| UA-P06-T03 | Security engine adapter | Versioned request/response across the adapter boundary |
| UA-P06-T04 | Sentrdel Evidence normalization | External output never self-attests |
| UA-P06-T05 | Coverage loss/UNKNOWN mapping | Unsupported scope blocks totality |
| UA-P06-T06 | SAST normalization | Rule/location/provenance preserved |
| UA-P06-T07 | Secrets checks | Synthetic secret benchmark; no plaintext secrets in artifacts |
| UA-P06-T08 | SCA/dependency/SBOM | Inventory plus advisory freshness plus reachability states |
| UA-P06-T09 | IaC/CI security checks | Config/workflow findings normalized |
| UA-P06-T10 | Security invariant regression | Trusted-base comparisons preserve uncertainty |
| UA-P06-T11 | SARIF import/export boundary | SARIF is interchange, not canonical truth |
| UA-P06-T12 | Proof/reproduction refs | Findings link deterministic reproductions |
| UA-P06-T13 | Remediation/retest lifecycle | Fix without new evidence stays open |
| UA-P06-T14 | `ascout security` CLI | Additive only; local/read-only default; check/review/test unchanged |
| UA-P06-T15 | Security benchmark v1 | Known regressions, safe controls, coverage gaps |
| UA-P06-T16 | P6 qualification | CI, review, and exact-head fixtures with hard gates zero |

## 6. Frozen inputs

```text
src/assurance/contracts/** = READ_ONLY_UNDER_UA_P06
src/assurance/kernel/** = READ_ONLY_UNDER_UA_P06
src/assurance/engines/native/** = READ_ONLY_UNDER_UA_P06
src/assurance/engines/mobile-artemis/** = READ_ONLY_UNDER_UA_P06
src/assurance/output/** = READ_ONLY_UNDER_UA_P06
src/assurance/review/** = READ_ONLY_UNDER_UA_P06
src/assurance/engines/review/** = READ_ONLY_UNDER_UA_P06
src/assurance/workflow/** = READ_ONLY_UNDER_UA_P06
src/assurance/publication/** = READ_ONLY_UNDER_UA_P06
src/assurance/test/** = READ_ONLY_UNDER_UA_P06
src/cli.ts = READ_ONLY_UNDER_UA_P06 (except UA-P06-T14 additive security command)
ascout.config.json schema = READ_ONLY_UNDER_UA_P06
```

If an implementation task concludes that a frozen input must change, that task stops. A separate authorization amendment and compatibility review are required before such mutation.

## 7. Positive mutation surface after effectiveness

Only:

```text
src/assurance/security/**
tests/assurance-security-*.test.ts
src/cli.ts (UA-P06-T14 only, additive security command)
```

If a task requires any tracked path outside this positive surface, implementation stops and returns to authorization amendment.

## 8. Authority model

```text
SECURITY_OBSERVATION != FINDING
SECURITY_PASS != SUPPORTED_CLAIM
SARIF_IMPORT != CANONICAL_TRUTH
FIX_WITHOUT_RETEST != VERIFIED
UNSCANNED_SCOPE != CLEAN
OMITTED_CLASS != PASS
```

All security construction must remain within the intersection of intent, policy, engine descriptor, phase authority, and explicit network, provider, and data-egress policy ceilings. Any missing intersection fails closed.

## 9. Hard exclusions

UA-P06 does not authorize:

```text
CONSTITUTION_CHANGE_BEYOND_SECTION_3_3 = NO
UA_P01_THROUGH_UA_P05_SURFACE_MUTATION = NO
CLI_SURFACE_CHANGE_BEFORE_T14 = NO
CHECK_TEST_REVIEW_SEMANTIC_REGRESSION = NO
CONFIG_WORKFLOW_LANGUAGE = NO
SCORE_OVER_MISSING_OR_FAILED_EVIDENCE = NO
SECURITY_PASS_AS_ASSURANCE_PASS = NO
SARIF_AS_CANONICAL_TRUTH = NO
FIX_WITHOUT_NEW_EVIDENCE_AS_VERIFIED = NO
SECRET_PLAINTEXT_IN_ARTIFACT = NO
WHOLESALE_SENTRDEL_IMPORT = NO
BUNDLED_RUST_TOOLCHAIN_REQUIREMENT = NO
MANDATORY_NETWORK_PROVIDER_BACKEND = NO
SILENT_PAID_FALLBACK = NO
DEPENDENCY_CHANGE = NO
PACKAGE_CHANGE = NO
LOCKFILE_CHANGE = NO
WORKFLOW_CHANGE = NO
UA_P07_OR_LATER_IMPLEMENTATION = NO
```

## 10. CLI and backward-compatibility boundary

Until UA-P06-T14 the public CLI remains exactly:

```text
ascout init
ascout doctor
ascout check
ascout review [--format json|terminal]
ascout test [--profile quick|standard|deep|release] [--format json|terminal]
```

During UA-P06 before T14:

```text
ascout security = unsupported
```

T14 adds exactly one additive `security` command with local, read-only default. `ascout check` parse, render, exit, receipt, admission, terminal, JSON, and agent semantics, `ascout review` semantics, and `ascout test` plan semantics must remain unchanged throughout UA-P06.

## 11. Required hard-zero invariants

```text
omitted_security_scope_implied_clean = 0
security_pass_presented_as_assurance_pass = 0
unqualified_security_output_self_attests = 0
sarif_presented_as_canonical_truth = 0
fix_without_new_evidence_presented_as_verified = 0
secret_plaintext_in_persisted_artifact = 0
unsupported_scope_preserves_totality_claim = 0
missing_engine_converted_to_pass = 0
mock_substituted_for_real_component = 0
credential_persisted_in_artifact_or_receipt = 0
silent_paid_provider_fallback = 0
existing_check_test_review_semantic_regression = 0
weaker_substitute_preserves_stronger_claim = 0
```

Any hard-zero failure blocks the task regardless of aggregate pass rate.

## 12. Determinism requirements

Security contract outputs must be deterministic for identical canonical inputs wherever no model or network call is involved, binding exact target, intent, policy, engine descriptor, qualification, source head, and attempt identities. Ordering must not depend on traversal order, clock time, randomness, scheduling, or network results.

## 13. No-silent-fallback, absence, and local-zero-cost rules

Missing, unqualified, timed-out, denied, version-mismatched, or over-budget security capability yields explicit omission with reason propagating as NOT_RUN or INCOMPLETE. Never choose weaker review or nothing while preserving the stronger claim. All economics, offline, privacy, and provenance gates from section 3.3 item 7 remain enforced.

## 14. Donor and external boundary

Live-verified donor facts at this authorization base:

```text
DONOR_REPOSITORY = TheHalfMoon/Sentrdel
DONOR_PIN = f5747319a50831ef7cee983d253c0ca5503c9a64
DONOR_PIN_SUBJECT = Merge PR #333: make Sentrdel developer-first and adoption-ready
DONOR_VISIBILITY = public
DONOR_LICENSE = Apache-2.0 (repository license field; root NOTICE absent per P0 review)
DONOR_IN_TREE_MATERIAL = NONE (vendor/ holds only google-artemis)
NOTICE_STATUS = SELECTED_PATH_NESTED_REVIEW_REQUIRED before adapting any donor code
```

No donor source intake is authorized by this phase beyond what UA-P06-T01 re-pins with exact revision, path-level provenance, license, notice, dependency, and security review under its own authority. No wholesale import is authorized at any task. Sentrdel-derived capability may be referenced as characterization input where the UA-P06 tasks prove value; the engine stays behind the external-engine adapter boundary and is never a second truth kernel.

## 15. Failure discipline

Required CI, test, and review failures are immutable evidence. No rerun-to-green, no skipped failing tests, no weakened assertions, no global timeout widening to hide local defects, no stale CI, no reused qualification after drift, no force-push, rebase, or history rewrite. Proven infrastructure issues require separately prospective repair with preserved original failure evidence.

## 16. Task qualification discipline

Every UA-P06 task PR must prove exact base and predecessor, one-task scope and authorized-path purity, focused tests, exact-head Self Verification attempt 1 success, exact-head Project CI attempt 1 success across all six lanes, fresh maintainer exact-head review with zero material findings, Alibaba Open Code Review bound to the exact head with zero unresolved material findings, Jev evidence bound to the exact head (or exact recorded limitation), zero unresolved material threads, unchanged main, base, head, and scope immediately before merge, guarded normal merge with exact expected head, verified merge tree, parents, signature, and main, and post-merge Project CI attempt 1 success across all six lanes. Only then close the task CLOSED_CANONICAL.

## 17. UA-P06 closeout

`UA-P06-T16` is qualification and closeout only with a bounded sentinel or fixture and no new capability. P6 may close only when T01 through T15 are canonical and all hard-zero invariants are proven on a fresh exact head. On successful T16 post-merge qualification:

```text
UA_P06 = CLOSED_CANONICAL / COMPLETE
UA_P07_IMPLEMENTATION_AUTHORIZED = NO
ASCOUT_PROJECT_COMPLETE = NO
```

## 18. Authorization PR purity

This authorization artifact's own PR may change exactly one tracked path:

```text
specs/017-unified-assurance/UA_P06_IMPLEMENTATION_AUTHORIZATION.md
```

No source, tests, dependencies, workflows, configs, benchmarks, donor material, Constitution text, or prior authorization artifacts may change in the authorization PR.

## 19. Effectiveness gate

Merging this authorization artifact is not sufficient by itself. Before this authority becomes effective require exact authorization head bound to this one-file diff, Self Verification attempt 1 success, Project CI attempt 1 success across all six lanes, maintainer exact-head review with zero material findings, Alibaba Open Code Review with zero unresolved material findings, Jev evidence (or exact recorded limitation), zero unresolved threads, unchanged canonical main immediately before merge, guarded normal merge with exact expected head, verified merge tree, parents, signature, and main, push-triggered post-merge Project CI attempt 1 success across all six lanes, and Issue #566 closed as CLOSED_CANONICAL / EFFECTIVE. Only after all conditions:

```text
UA_P06_IMPLEMENTATION_AUTHORIZED = YES
UA_P06_CONSTITUTION_AMENDMENT_A06 = RATIFIED
```

Until then implementation mutation remains FORBIDDEN and the amendment remains NOT_RATIFIED. After effectiveness and before any T01 branch, the mechanical Constitution v1.3.0 application PR from section 3.4 must land on canonical main.

Refs #566
Refs #527
Refs #542
