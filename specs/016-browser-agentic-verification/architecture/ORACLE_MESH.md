# Architecture Contract — Browser Oracle Mesh

**Status:** `PLANNING_ONLY`

## Principle

Browser verification combines multiple evidence channels, but they do not all carry equal authority. Ascout must preserve oracle class, independence and provenance instead of collapsing everything into one Boolean.

## Initial oracle families

```text
dom_deterministic
accessibility_deterministic
network_deterministic
console_error_deterministic
page_error_deterministic
application_state_deterministic
visual_golden_deterministic
visual_semantic_model
semantic_model
human
```

## Authority

Each oracle record identifies:

```text
oracle_id
oracle_kind
producer
version
provenance
independence_class
calibration_state if applicable
authority = gating | advisory
required_evidence_types[]
```

A model oracle is not upgraded to deterministic authority because it is confident or because it agrees with the implementation.

## Deterministic browser oracles

Examples:

- exact accessible role/name presence;
- deterministic element state/value;
- exact/structured network request count and response status;
- absence/presence of page exception under bounded observation;
- known application-state observation through an independently specified interface;
- approved screenshot golden comparison under controlled environment.

Deterministic does not mean infallible. Source/environment binding and oracle independence still matter.

## Model semantic oracles

Useful for properties difficult to express structurally, such as high-level visual meaning. They require:

```text
model/provider/version provenance
prompt/schema/version identity
input artifact refs
calibration state
nondeterminism policy
retry/sample policy
```

By default they are advisory in the first browser wedge.

## Independence

An oracle is circular when expected truth is derived from the same behavior under test without independent specification.

Examples of unsafe circularity:

- asserting UI copy by asking the implementation-generated copy what it should say;
- accepting a healed flow solely because the same recovery model says it is equivalent;
- using the generated test itself as the only expected outcome source.

Circular or unresolved independence fails closed to advisory/unresolved status.

## Multi-oracle decisions

A browser outcome may require multiple oracles, for example checkout:

```text
DOM confirmation visible
AND network create-order success exactly once
AND no uncaught page error
```

No single visual success should override a deterministic network failure.

## Conflict handling

Conflicting oracle results remain explicit. Do not average them into a score.

Example:

```text
UI confirmation = PASS
network order request = FAIL duplicate submission
```

Overall obligation remains failed/blocked despite visual success.

## Visual oracle policy

Golden/pixel comparisons and semantic visual assertions are different classes.

- Golden comparison can be deterministic only under controlled rendering/environment policy.
- Model visual assertion is semantic/model evidence and remains separately classified.

## Human oracle

Human/maintainer admission or semantic-equivalence confirmation may be authoritative only within the explicit authority granted by governance. It must identify actor/reason/evidence and cannot retroactively erase failed attempts.

## Benchmark requirements

Oracle benchmark cases must include:

```text
visual success + network failure
DOM success + console/page error
model says pass + deterministic assertion fails
circular expected-value derivation
ambiguous visual semantic claim
controlled golden drift
```

Qualifying behavior never allows weaker oracle evidence to override stronger deterministic contradiction.

```text
ORACLE_CLASS_PRESERVED = YES
MODEL_CONFIDENCE_EQUALS_PROOF = NO
SCORE_OVER_DETERMINISTIC_FAILURE = FORBIDDEN
```