# ARTEMIS Implementation Authorization — Pinned Donor Intake and Phased Mobile Integration

**Status:** `PROPOSED / NOT_EFFECTIVE`
**Ledger:** Issue #438
**Authorization base:** `95efee2669edfa20f6afe6aafc322eef6f01273d`
**Phase:** `ARTEMIS A0..A13`

## 1. Purpose

This artifact defines the only implementation authority that may perform ARTEMIS donor intake and mobile integration after it becomes canonically effective.

It is authorization-only. This artifact does not import donor source and grants no runtime, network, provider, ADB, or device authority merely by existing on a branch or pull request.

```text
ARTEMIS_IMPLEMENTATION_AUTHORIZED = NO until effectiveness
```

## 2. Canonical predecessors

At this authorization base:

```text
UA_P02 = CLOSED_CANONICAL / COMPLETE
ARTEMIS_PLAN = CLOSED_CANONICAL / PR #439
CANONICAL_MAIN = 95efee2669edfa20f6afe6aafc322eef6f01273d
```

## 3. Immutable donor binding

Exactly:

```text
DONOR_REPOSITORY = https://github.com/google/artemis
DONOR_SHA = 371aa6df56880643da57b30da936e9812fb0ec66
DONOR_TREE = 697c3fe48b51b8453938989f383b4a8471a4f5a1
```

Only this commit is authorized. Any later ARTEMIS commit requires a separate donor delta with a new immutable SHA and provenance review. No floating upstream ref is authorized.

## 4. Authorized phase set after effectiveness

Exactly:

```text
ARTEMIS-A0
ARTEMIS-A1
ARTEMIS-A2
ARTEMIS-A3
ARTEMIS-A4
ARTEMIS-A5
ARTEMIS-A6
ARTEMIS-A7
ARTEMIS-A8
ARTEMIS-A9
ARTEMIS-A10
ARTEMIS-A11
ARTEMIS-A12
ARTEMIS-A13
```

One phase / one branch / one PR remains mandatory unless a phase explicitly requires bounded forward-only repair history without rewriting shared history.

Dependency order is A0 through A13. A later phase must not start from a base where its prerequisite phase is not canonically closed, unless the phase definition explicitly permits independent preparation without runtime activation.

## 5. Phase definitions

| Phase | Deliverable | Acceptance boundary |
|---|---|---|
| ARTEMIS-A0 | Full immutable donor intake | Complete snapshot at exact SHA under `vendor/google-artemis/` with license, notices, provenance, identity proof; no runtime authority. |
| ARTEMIS-A1 | Protocol and engine contracts | Versioned mobile descriptor, effect classes, request, event, result, artifact schemas, negotiation, context binding, stale rejection; no device execution. |
| ARTEMIS-A2 | Isolated sidecar availability | TypeScript to versioned local protocol to isolated Python 3.12 sidecar to pinned snapshot; Python, donor, sidecar, ADB, discovery validated; no mutation. |
| ARTEMIS-A3 | Read-only device evidence | Metadata, hierarchy, screenshots, Logcat read, app observations, hashing, privacy-safe identity; receipts bind source, device, donor, engine, protocol. |
| ARTEMIS-A4 | Bounded device input | Explicit effect-controlled DEVICE_INPUT and APP_LAUNCH actions including tap, type, swipe, back, home; minimum privilege; no unrestricted ADB. |
| ARTEMIS-A5 | Locating stack | Accessibility-first, hierarchy, OCR, multimodal vision, coordinate fallback, dynamic targets, Compose, Flutter, Canvas; locator path evidence preserved. |
| ARTEMIS-A6 | Flash execution | Bounded step, time, token, artifact ceilings, cancellation, history compression, replay; no unbounded silent loop. |
| ARTEMIS-A7 | Pro execution | Planner, Operator, Checker, checkpoints, final-goal verification, incident recovery, living plan mapped to Ascout evidence; planner output is evidence input. |
| ARTEMIS-A8 | Diagnostics and replay | Recording, video replay and analysis, Logcat correlation, timeline, artifact references, diagnostic report with bounded retention. |
| ARTEMIS-A9 | Ascout MCP and CLI | Governed mobile interfaces through current intent, policy, and effect authority; no raw donor authority exposure. |
| ARTEMIS-A10 | Product UI and Lab | Mobile reality inside Review, Test, Security, Cyber, Assure, Lab with run state, blocked actions, screenshots, timelines, checkpoints, unverified scope, authority visibility. |
| ARTEMIS-A11 | Security and privacy hardening | Egress, provider, telemetry, secrets, screenshots, videos, Logcat, serials, writes, subprocesses, shell, ADB, binding, traversal, fuzzing, timeouts, cancellation, malformed output, untrusted data; donor telemetry OFF. |
| ARTEMIS-A12 | Cross-platform and real-device qualification | Linux x64, macOS arm64, Windows x64 hosts with emulator, physical Android, helper, UIAutomator; unavailable cells remain UNAVAILABLE, never PASS. |
| ARTEMIS-A13 | Release admission | Provenance, notices, dependencies, licenses, security, clean checkout, exact-head CI, Alibaba Open Code Review, forward fixes, re-review, fresh-main qualification, release docs. |

## 6. Positive mutation surface after effectiveness

Only:

```text
vendor/google-artemis/**
docs/mobile/**
schemas/mobile-artemis/**
python/ascout_mobile_bridge/**
src/assurance/engines/mobile-artemis/**
tests/assurance-mobile-artemis-*.test.ts
THIRD_PARTY_NOTICES.md (A0 and A13 only for donor attribution)
```

If a phase requires any tracked path outside this surface, implementation stops and returns to authorization amendment.

ARTEMIS internals must not be merged directly into `src/assurance/kernel` and must not silently inherit authority.

## 7. Authority model

Planning authority is not execution authority. Donor source presence is evidence input, never a grant of runtime authority.

```text
DONOR_SOURCE_PRESENT != RUNTIME_AUTHORIZED
ENGINE_DESCRIPTOR_PRESENT != ENGINE_EXECUTION_AUTHORIZED
ARTEMIS_PLANNER_OUTPUT = EVIDENCE_INPUT (not sovereign authority)
```

All mobile execution remains within the intersection of:

```text
intent effect ceiling
∩ policy effect ceiling
∩ engine descriptor ceiling
∩ phase authority
∩ explicit network policy
∩ explicit provider policy
∩ explicit ADB and effect policy
```

Any missing intersection fails closed.

## 8. Hard exclusions

ARTEMIS does not authorize:

```text
FLOATING_UPSTREAM_DEPENDENCY = NO
SILENT_NETWORK_AUTHORITY = NO
SILENT_PROVIDER_AUTHORITY = NO
SILENT_ADB_MUTATION_AUTHORITY = NO
SILENT_TELEMETRY = NO
GLOBAL_CONFIGURATION_MUTATION = NO
AUTOMATIC_PAID_API_USAGE = NO
FABRICATED_DEVICE_EVIDENCE = NO
BENCHMARK_CLAIM_INHERITANCE = NO
UNRESTRICTED_ADB_SHELL = NO
CREDENTIAL_DISCOVERY = NO
API_KEY_PERSISTENCE = NO
RAW_SERIAL_PERSISTENCE_BY_DEFAULT = NO
```

Default donor telemetry is OFF. Unknown telemetry destination is refused. No automatic paid model API invocation.

## 9. Provenance and license requirements

Class C provenance is required:

```text
upstream_repository = https://github.com/google/artemis
upstream_commit_sha = 371aa6df56880643da57b30da936e9812fb0ec66
upstream_tree = 697c3fe48b51b8453938989f383b4a8471a4f5a1
use_type = copied + adapted
ascout_paths = vendor/google-artemis/** plus separately reviewed adapters
license_compatibility_review = PASS subject to notice preservation
```

LICENSE, copyright headers, notices, and source history identity are preserved. No production path may depend on a floating ref.

## 10. Capability accounting

Every material donor subsystem must receive an explicit disposition of ADOPTED, ADAPTED, PRESERVED_DISABLED, REPLACED_BY_ASCOUT_NATIVE, REJECTED_WITH_REASON, or DEFERRED_WITH_EXPLICIT_GATE, including Android drivers, ADB, accessibility helper, UIAutomator, screenshots, OCR, image processing, multimodal locating, coordinate fallback, action sequences, Flash, Pro, Planner, Operator, Checker, safety checks, incident recovery, history compression, history search, replay, video analyzer, Logcat, MCP, Python SDK, device lifecycle, task lifecycle, configuration, web console concepts, tests, benchmarks, startup tooling, and IDE integration behavior.

## 11. Evidence semantics

Mobile results preserve PASS, FAIL, BLOCKED, INCOMPLETE, INCONCLUSIVE, REFUSED, ERROR, NOT_RUN, STALE, and UNKNOWN. Each important claim points to actual evidence or identifies missing evidence. Incomplete verification must never look complete.

## 12. Review policy

Alibaba Open Code Review at `https://github.com/alibaba/open-code-review` is the required implementation review engine where phase authority permits execution. Other systems may exist as auxiliary checks. Reviews run on exact heads with findings preserved and forward-fixed.

## 13. Failure discipline

Required CI, test, review, and qualification failures are immutable evidence. No rerun-to-green, skipped failing tests, weakened assertions, hidden timing defects, stale CI reuse, reused qualification after drift, force-push, rebase, or rewritten shared history.

## 14. Phase qualification discipline

Every ARTEMIS implementation candidate must prove exact canonical base and prerequisite, authorized-path purity, focused tests, exact-head Self Verification success, exact-head Project CI success across all six required lanes, fresh maintainer exact-head review with zero material findings, zero unresolved material threads, unchanged main, base, head, and scope immediately before merge, guarded normal merge with exact expected head, verified merge identity, and push-triggered post-merge Project CI success.

## 15. Authorization PR purity

This authorization artifact's own PR may change exactly one tracked path:

```text
specs/017-unified-assurance/ARTEMIS_IMPLEMENTATION_AUTHORIZATION.md
```

No source, tests, dependencies, workflows, configs, benchmarks, donor material, or prior authorization artifacts may change in the authorization PR.

## 16. Effectiveness gate

Before this authority becomes effective require exact authorization head bound to this one-file diff, Self Verification success, Project CI success across all six lanes, maintainer exact-head review with zero material findings, zero unresolved threads, canonical main remains the expected base immediately before merge, guarded normal merge with exact expected head, verified merge identity, push-triggered post-merge Project CI success, and Issue #438 closed as `CLOSED_CANONICAL / EFFECTIVE`.

Only after all conditions:

```text
ARTEMIS_IMPLEMENTATION_AUTHORIZED = YES
```

Until then:

```text
ARTEMIS_IMPLEMENTATION_AUTHORIZED = NO
ARTEMIS_SOURCE_MUTATION = FORBIDDEN
```

Refs #438
Refs #439
Refs #424
