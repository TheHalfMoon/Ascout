# Ascout Durable Harness

Status: prospective bounded task; implementation waits for the independent final plan audit and fresh exact-head consistency review. Base89e5f01d7b77a92099961dff21e28052e5fa8dcc. User request2026-10-24: continue and add Vercel's making-every-harness-durable, with permission to copy and rename. This authorizes the described integration work, not UA-P07, deployment, paid services or a new security phase.

## Constitution compliance and intent

AmendmentA04 permits bounded local durable workflow evidence. Existing stage/attempt, freshness and idempotency contracts remain authoritative. The integration is named **Ascout Durable Harness**; upstream authorship and Apache-2.0 notices stay visible. It adds a local journal seam for a caller-owned harness, not a second agent platform, model driver or claim kernel. Completed operations must survive process restart; an intent without a result must remain explicitly uncertain.

## Requirements

1. Persist a bounded journal in an explicitly supplied trusted local state directory, using Node's filesystem and crypto only. No implicit installation, network, daemon, database, provider, sandbox or paid fallback. Do not modify package/lock/workflows, CLI, admission, kernel, existing workflow/publication contracts or completed Spec018 evidence.
2. Bind a journal to run identity, subject head, source tree digest, configuration digest and policy identity. Reuse existing WorkflowRunV1 construction/freshness and idempotency decisions; changed bindings never reuse prior results as current.
3. Record intent durably before a caller could perform a call, then record an explicit SUCCEEDED/FAILED outcome and evidence digest. Persist only validated opaque digests/identifiers/statuses, never raw arguments, model text, paths, secrets or error strings. This metadata is not canonical verification evidence and never grants execution/publication authority.
4. Stable call identity includes name, input digest, replay policy and attempt identity. Reject changed calls under a reused identity, duplicate outcomes, foreign attempts, malformed states, unexpected fields and missing evidence. Preserve failed records; no retry overwrites earlier failure.
5. Recovery returns recorded terminal results as historical observations without re-execution. An unfinished `never` call requires reconciliation. An unfinished `safe` call may only be proposed for revalidation/retry; the journal itself executes nothing. Failed calls need a distinct call/attempt identity and original failure remains. Missing or corrupt journals are explicit unavailable/error, never an empty successful run.
6. Bound journal bytes and call count; use atomic replacement with flushed file contents. Serialize mutations with a per-run exclusive filesystem lock and reject concurrent/stale locks rather than stealing them. Reject symlink/nonregular state files and lock targets. A crash during a locked write may need explicit local repair; do not promise automatic lock recovery or hardware power-loss durability on every filesystem.
7. Prove actual cross-process restart, completed result reuse, intent-only interruption, original-failure retention, source drift, corruption, bounds and competing-writer behavior using free deterministic controls. Run focused tests, strict typecheck/build, a complete native control, current security/review gates and hosted CI. Retain all prior E00/dependency debt distinctly.

## Acceptance

- A child persists an intent/outcome and exits; a new process recovers the exact binding and historical result without invoking an effect.
- A child exits after intent only; `never` recovery explicitly requires reconciliation and does not authorize replay; `safe` proposes revalidation only.
- Failed outcomes, malformed/truncated/tampered files, wrong identities, changed sources, bounds and locks fail closed. No local metadata alone yields product PASS.
- Existing workflow and publication tests remain unchanged and pass; no new dependency or cloud requirement.
- Exact upstream pin, article reference, applicable license/notice, adaptations and limitations are recorded. No wholesale vendoring or implied upstream endorsement.

## Hard stops and limits

No edits to frozen authority/policy/admission contracts; no arbitrary command execution; no agent/provider credentials; no publication or autonomous effect replay. Existing Spec018 local timing and development advisories remain open. This task may prepare a focused PR; do not infer the Spec018-only merge grant as a new phase authorization. Any actual merge must meet independently applicable authority and gates.
