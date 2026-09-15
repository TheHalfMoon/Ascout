# Architecture Contract — Browser Executor and Evidence

**Status:** `PLANNING_ONLY`

## BrowserExecutor boundary

Conceptual contract:

```ts
interface BrowserExecutor {
  createSession(input: BrowserSessionInput): Promise<BrowserSession>;
  executeAction(session: BrowserSession, action: BrowserAction): Promise<BrowserActionResult>;
  executeAssertion(session: BrowserSession, assertion: BrowserAssertion): Promise<BrowserAssertionResult>;
  closeSession(session: BrowserSession): Promise<BrowserSessionCloseResult>;
}
```

This is an internal contract, not a public plugin SDK.

## First implementation

`PlaywrightBrowserExecutor` is the first candidate implementation. It should use qualified public APIs before any donor source reuse.

## Session identity

Each session records:

```text
run_id
source_tree
repository_identity
intent_digest
executor_id/version
playwright_version
browser_engine
browser_version
browser_context_id
browser_project/config_digest
application_origin_ref
environment_fingerprint
start_time
end_time
source_drift_state
```

A missing required identity prevents a clean evidence-bearing verdict.

## Isolation

Default execution uses a fresh BrowserContext. Reused storage/auth state must be explicit input with a digest/reference and sensitivity classification.

## Action evidence

Every action attempt records at minimum:

```text
action_id
attempt_index
intent_action_ref
resolved_target_ref
locator_strategy
start/end timing
status
error_class/message_safe
recovery_ref if any
artifact/evidence refs
```

Failed attempts are never removed when a later attempt succeeds.

## Locator resolution evidence

Record:

```text
resolution_id
description/intent ref
strategy kind
candidate count where knowable
selected target facts
ambiguity state
cache state if applicable
resolver kind/version
```

Deterministic locator evidence should be sufficient to reconstruct why an element was selected without storing unnecessary sensitive DOM data.

## Browser observation evidence

Typed families:

### DOM/accessibility

Capture bounded facts relevant to assertions/resolution. Do not persist full page DOM by default as Ascout-owned normalized evidence.

### Network

Capture method, normalized URL/origin policy, status, timing and selected metadata needed by declared assertions. Raw bodies are opt-in and sensitivity-aware.

### Console/page errors

Capture severity/type and redacted/bounded message evidence. Page exceptions are first-class observations even if the visual flow appears successful.

### Screenshots

Store artifact reference, digest, dimensions, sensitivity/retention metadata. Screenshot bytes are artifacts, not embedded receipt truth.

### Trace

Store trace artifact reference/digest and extracted Ascout facts. Playwright Trace Viewer remains the native deep-inspection tool.

## Assertion evidence

Each assertion records:

```text
assertion_id
expected_outcome_ref
oracle_kind
oracle_authority
observed_facts
evidence_refs
status
attempt/retry facts
```

A model semantic assertion must remain classified as model-based evidence.

## Environment fingerprint

Include only truth-relevant and privacy-safe facts, for example:

```text
os family/version class
node version
playwright version
browser engine/version
viewport/device profile
locale/timezone when material
feature flags/config digest where explicit
```

Do not persist raw secret environment values.

## Source drift

Source identity must be checked before browser execution and before final verdict. Material source drift invalidates clean binding according to existing Ascout source-drift rules.

## Artifact retention

Browser artifacts can be large/sensitive. The implementation must specify bounded retention and cleanup. Artifact deletion after retention expiry must not rewrite historical receipt facts; the receipt may retain digest/metadata and mark bytes unavailable.

## Failure behavior

Browser executor failures are not automatically repository/product failures. Preserve distinction among:

```text
product assertion failure
browser action failure
environment unavailable
executor internal error
timeout
source drift
recovery-required
semantic drift
```

Map final task state through canonical Ascout status semantics without losing browser-specific reason codes.

## Security constraints

- no raw credential persistence;
- no shell interpolation from intent text;
- bounded browser/process lifetime;
- explicit origin policy;
- no arbitrary third-party browsing by default;
- storage state treated as secret-bearing;
- trace/network payload limitations documented honestly.

```text
BROWSER_EXECUTOR_IS_EVIDENCE_PRODUCER = YES
BROWSER_EXECUTOR_IS_VERDICT_AUTHORITY = NO
FRESH_CONTEXT_DEFAULT = YES
PLAYWRIGHT_PUBLIC_API_FIRST = YES
```