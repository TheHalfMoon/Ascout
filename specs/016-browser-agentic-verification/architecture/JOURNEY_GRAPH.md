# Architecture Contract — Journey Evidence Model

**Status:** `PLANNING_ONLY`

## Purpose

The Journey Evidence Model connects browser-observed behavior to Ascout requirements, obligations, source facts, executions and defects without introducing a second verdict system.

## Design rule

Start with deterministic serializable collections and stable IDs. A graph database is not authorized by this model.

## Core entities

```text
RequirementRef
ObligationRef
SourceFactRef
Journey
JourneyState
JourneyTransition
JourneyVariant
BrowserTestRef
BrowserExecutionRef
EvidenceRef
DefectRef
```

## Journey

Represents a user/business flow such as login, checkout, profile update or search.

Minimum fields:

```text
journey_id
title
requirement_refs[]
obligation_refs[]
risk_refs[]
entry_conditions[]
variants[]
provenance
```

## JourneyState

Observed or declared application state relevant to verification.

Examples:

```text
authenticated_dashboard
cart_with_item
checkout_review
order_confirmation
```

State may be `declared`, `observed`, or `inferred`. These truth classes are not interchangeable.

## JourneyTransition

Represents an action/change between states and may link:

```text
intent_action_ref
resolved_target_ref
source_fact_refs[]
network_observation_refs[]
oracle_refs[]
recovery_refs[]
```

## JourneyVariant

Captures meaningful variants such as role, feature flag, browser engine, responsive state, locale or experiment when these materially change behavior.

Variants must be explicit if they affect required verification. Unobserved required variants remain visible coverage gaps.

## Edge classes

Representative relationships:

```text
requirement REQUIRES obligation
source_fact IMPLEMENTS requirement
journey EXERCISES obligation
journey HAS_VARIANT variant
transition OBSERVES evidence
transition CALLS endpoint_fact
browser_test COVERS journey
execution RUNS browser_test
execution OBSERVES journey_variant
defect VIOLATES obligation
defect OBSERVED_IN execution
```

Each edge has provenance/truth class:

```text
declared
observed
inferred
```

Only appropriately authoritative observed/declarative evidence may close an obligation. Inferred links help selection but cannot silently become PASS evidence.

## Source binding

Observed journey nodes/edges bind to exact execution and source tree. A journey template may survive source revisions, but execution evidence never transfers automatically.

## Selection use

Change-to-journey selection can use both observed and inferred edges, but uncertainty must widen execution. An inferred absence of relation must not deselect a potentially affected journey when impact cannot be established safely.

## Coverage semantics

Journey coverage is not just "test exists".

A journey/variant counts as verified only when:

1. a required obligation maps to the journey;
2. a qualifying test executed on the exact source/environment scope;
3. required oracle evidence passed with appropriate authority;
4. no blocking semantic recovery/source drift/gap remains.

## Evolution

When UI flow changes, preserve old journey revision and create a new revision. Semantic recovery may propose migration but does not rewrite historical journey evidence.

## App graph inspiration boundary

Managed testing platforms may build app graphs from execution traces. Ascout adopts the useful observed-journey concept but extends it with requirement, source, obligation, oracle, defect and evidence truth classes. It does not copy a donor graph schema as canonical Ascout truth.

## Storage

First implementation candidate:

```text
Map<id, entity>
Edge[] sorted by deterministic tuple
canonical JSON serialization
content digests
```

Only benchmarked query/scale limitations may justify SQLite/graph storage later.

## Integrity gates

```text
cross_tree_observed_edge_transfer = 0
inferred_edge_promoted_to_proof_without_evidence = 0
required_variant_hidden_as_covered = 0
semantic_drift_rewrites_history = 0
```

```text
JOURNEY_GRAPH = EVIDENCE_RELATION_MODEL
GRAPH_DATABASE = NOT_AUTHORIZED
INFERENCE_IS_PROOF = NO
```