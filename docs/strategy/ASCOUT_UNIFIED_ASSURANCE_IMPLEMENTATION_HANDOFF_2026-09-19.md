# Ascout Unified Assurance — Implementation Handoff

**Status:** READY_AS_PLANNING / IMPLEMENTATION_NOT_AUTHORIZED  
**Date:** 2026-09-19  
**Planning branch:** `plan/unified-assurance-platform`

## 1. Start condition

Do not implement from this handoff until:

1. this planning package is reconciled to live `main`;
2. active Spec 016 authority is closed or successor authority explicitly reconciles overlap;
3. planning PR is canonically merged;
4. exact-head planning qualification is green;
5. a separate implementation authorization explicitly authorizes UA-P01.

## 2. Read order

Implementation agent reads in this order:

1. Ascout Constitution;
2. Unified Master Plan;
3. Contract Freeze;
4. Implementation Blueprint;
5. Task Registry;
6. Gap Audit;
7. Kernux Reality Verification Fabric;
8. Source Map;
9. Final Implementation Readiness Audit;
10. live relevant Spec 015/016 artifacts.

Live repository truth overrides stale planning metadata.

## 3. What not to redesign

Do not redesign:

- Ascout as sole ClaimAssessment authority;
- one target/evidence/finding/coverage/freshness model;
- existing `ascout check` semantics;
- P016 browser truth;
- OpenCodeReview as review engine observation, not authority;
- Sentrdel as security engine observation, not second truth kernel;
- Kernux as reality execution fabric, not claim authority;
- Cloudflare workflow as audit method, not trust root;
- Kodac workflow/publication discipline;
- no-green-by-omission;
- source binding;
- append-only failure/recovery evidence;
- explicit effect authority;
- adapter-first donor strategy.

## 4. First implementation authorization

Canonical first-wedge phase identifier: `UA-P01`.

`UA-P01` is the exact phase/task namespace used by the registry and exact-name checks. References to unpadded `UA-P1` in older planning prose are non-canonical aliases and must not be used for authorization or scheduler matching.

Recommended scope:

```text
UA-P01-T01 .. UA-P01-T18
```

Deliver only shared contracts/validators/adversarial corpus/compatibility.

Forbidden in first wedge:

- OpenCodeReview invocation;
- provider/model network;
- GitHub publication;
- Sentrdel process/binary;
- Kernux process/runtime;
- browser launch beyond existing tests;
- remote runtime;
- dynamic security;
- source auto-fix;
- arbitrary plugin SDK;
- new required daemon/server.

## 5. Suggested first-wedge slices

### U1 — Target + intent

- AssuranceTarget wrapper;
- AssuranceIntent;
- source-binding tests.

### U2 — Policy + plan

- AssurancePolicySnapshot;
- AssurancePlan;
- deterministic serialization.

### U3 — Engine contracts

- EngineDescriptor;
- EngineQualification;
- EngineRun.

### U4 — Evidence + finding

- EvidenceRef;
- Finding;
- lifecycle events.

### U5 — Coverage + omissions + contradictions

- CoverageClaim;
- OmissionRecord;
- ContradictionRecord.

### U6 — Claim assessment

- ClaimAssessment;
- semantic validation.

### U7 — Schemas and adversarial corpus

- structural validators;
- dangling/cross-target/stale cases;
- deterministic fixtures.

### U8 — Compatibility qualification

- current `ascout check` tests;
- typecheck;
- build;
- full test;
- Project CI;
- Self Verification if applicable;
- independent exact-head review.

## 6. Every task loop

```text
reverify live authority
-> branch from exact canonical main
-> implement one bounded task
-> focused tests
-> affected integration tests
-> relevant benchmark/adversarial case
-> full typecheck/test/build
-> exact-head CI
-> Self Verification where applicable
-> independent exact-head review
-> zero unresolved material threads
-> guarded expected-head merge
-> post-merge main/tree/CI proof
-> continue only if next task is already authorized
```

Do not ask for routine founder approval inside an already authorized bounded sequence.

## 7. Source intake

Before donor/dependency intake:

```text
re-pin exact revision
-> select exact paths/components
-> permission/license/NOTICE
-> nested third-party inventory
-> dependency delta
-> characterization
-> security review
-> authority ceiling
-> benchmark plan
-> provenance record
-> implementation
-> parity/reverification
```

## 8. Kernux rule

Do not depend on planned-but-unimplemented Kernux features.

At each Reality task:

- query exact available protocol/capabilities;
- require qualified runtime;
- otherwise report NOT_RUN/NOT_QUALIFIED;
- never fabricate equivalent real evidence with mocks.

## 9. Constitution rule

Before remote/dynamic/high-effect phases, perform a fresh Constitution compatibility decision.

If amendment is required, stop that phase until amendment is canonically effective.

Do not weaken constitutional invariants through feature code.

## 10. Completion language

Never say the project is complete because:

- code compiles;
- tests pass;
- one review engine is clean;
- security scanner is clean;
- Reality benchmark passes on one platform;
- planning tasks are checked.

Project completion requires P18 closeout and exact release-bound evidence.

```text
PLANNING_READY = YES
FIRST_WEDGE_DEFINED = YES
IMPLEMENTATION_TASK_GRAPH = READY
IMPLEMENTATION_AUTHORITY_NOW = NO
```
