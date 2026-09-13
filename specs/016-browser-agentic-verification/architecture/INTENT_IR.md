# Architecture Contract — IntentTest IR

**Status:** `PLANNING_ONLY`

## Purpose

`IntentTest` is Ascout's portable verification-intent representation. It sits above Playwright code and above free-form natural-language prompts. It binds user-visible behavior to requirements, obligations, risks, oracle policy and recovery policy.

## Canonical shape

Conceptual TypeScript shape:

```ts
interface IntentTest {
  version: 1;
  id: string;
  title: string;
  sourceTree: string;
  requirementRefs: string[];
  obligationRefs: string[];
  riskRefs: string[];
  target: IntentTarget;
  goal: string;
  preconditions: IntentCondition[];
  actions: IntentAction[];
  expectedOutcomes: IntentExpectedOutcome[];
  oraclePolicy: IntentOraclePolicy[];
  recoveryPolicy: IntentRecoveryPolicy;
  provenance: IntentProvenance;
}
```

This is a planning contract, not final API syntax.

## Target

Initial target:

```text
surface = web
application_origin = explicit configured local/dev origin
browser_profile = named configuration
```

Future mobile/API targets must not change the meaning of existing web intent fields.

## Action classes

First deterministic browser wedge may support:

```text
navigate
click
fill
type
press
select
wait_for_navigation
assert
```

Do not add an arbitrary scripting language. Complex setup belongs to explicit project fixtures/config under authority rules.

## Preconditions and expected outcomes

Conditions must identify their oracle class. Examples:

```text
dom/accessibility
network
console/page_error
application_state
visual_golden
model_semantic (future)
human (future)
```

A condition without a qualified oracle remains unresolved/advisory and cannot silently close a required obligation.

## Recovery policy

Intent explicitly declares allowable recovery classes and budgets, for example:

```text
allow_resolver_recovery = true
allow_execution_recovery = true
allow_semantic_recovery = false
max_recovery_actions = 2
max_retry_attempts = 1
```

Defaults must be conservative.

## Source binding

`sourceTree` is not optional for evidence-bearing execution. Intent from another source state may be inspected but cannot directly authorize current-tree PASS.

Intent digest covers canonical serialization of all semantic fields. Display-only metadata may be excluded only if explicitly defined.

## Provenance

Record origin, for example:

```text
human_authored
requirement_compiled
agent_proposed
imported_playwright
imported_donor_format
```

Imported formats require transformation provenance; the original artifact identity should be retained when possible.

## Natural language

Natural language is allowed in goal/action descriptions, but execution must compile/resolve it into observable actions under explicit resolver evidence. The original text remains immutable evidence of intended meaning.

## Mutation rules

Intent revisions are forward-only. A healed/generated revision produces a new intent revision/digest. Recovery must not mutate the historical intent in place and then pretend the original passed.

## Validation invariants

- IDs non-empty and canonical.
- Requirement/obligation refs deduplicated and deterministic.
- Source tree is exact and valid under current repository identity rules.
- No absolute filesystem paths in portable intent.
- No raw secrets.
- Required action/condition fields non-empty.
- Recovery budget bounded.
- Unknown enum/type fails closed.
- Serialization deterministic.

## Example

```yaml
version: 1
id: checkout-confirmation
requirementRefs: [PRD-42]
obligationRefs: [OBL-CHECKOUT-07]
riskRefs: [RISK-DUPLICATE-CHARGE]
target:
  surface: web
  applicationOriginRef: local-app
  browserProfile: chromium-default
goal: Complete checkout for an authenticated customer
preconditions:
  - kind: state
    statement: customer is authenticated
  - kind: state
    statement: cart contains one available item
actions:
  - kind: fill
    target: shipping address
  - kind: select
    target: shipping method
    value: Standard
  - kind: click
    target: Place order
expectedOutcomes:
  - kind: network
    statement: exactly one order creation request succeeds
  - kind: dom
    statement: order confirmation is visible
  - kind: console
    statement: no uncaught page error is observed
recoveryPolicy:
  allowResolverRecovery: true
  allowExecutionRecovery: true
  allowSemanticRecovery: false
  maxRecoveryActions: 2
  maxRetryAttempts: 1
```

The YAML above is illustrative; canonical implementation format may be JSON/TypeScript-backed as long as deterministic serialization is preserved.

```text
INTENT_IS_EVIDENCE_INPUT = YES
INTENT_ALONE_IS_PROOF = NO
IN_PLACE_HEAL_MUTATION = FORBIDDEN
```