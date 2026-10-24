# 0001. Local durable call metadata through existing workflow contracts

Status: accepted (2026-10-24)

## Context

The user requested durable-harness capabilities under the existing local, zero-cost and minimal-dependency constraints. Vercel's Apache-2.0 project records intents before work, reuses completed calls and distinguishes interrupted safe/never effects. Ascout already owns workflow, freshness and idempotency semantics; the full experimental upstream runtime adds backends, queues and provider integrations that this seam does not need.

## Decision

Add Ascout Durable Harness as a bounded local digest-only journal under ignored `.ascout/durable-harness/`. Use Node atomic replacement with file sync and a conservative per-mutation lock. Reuse existing workflow/idempotency models and bind repository, run, source, configuration and policy. Preserve upstream provenance and replay vocabulary. Keep execution, evidence resolution, reconciliation authority and publication with their existing owners. No new dependency or core CLI wiring.

## Consequences

Acknowledged metadata survives process restart and uncertainty remains visible. A completed record is historical evidence metadata, not a task PASS. An abandoned lock stops recovery until an operator verifies the writer stopped and repairs owned state. There is no automatic queue, process resurrection, transcript restoration, hostile-filesystem sandbox or universal hardware power-loss guarantee. Revisit only if a separately authorized actual harness integration needs a broader backend.
