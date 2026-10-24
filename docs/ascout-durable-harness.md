# Ascout Durable Harness

Ascout Durable Harness is a local call-metadata journal for an existing caller-owned harness. It records an intent before authorized work and a terminal outcome after evidence is produced, then recovers those observations after process restart. It reuses Ascout's workflow, freshness and idempotency contracts. It does not run an agent, resume a process, restore a transcript, execute tools or grant effect/publication authority. No network, API key, service or new dependency is required.

## Usage

Import `AscoutDurableHarness` from `src/assurance/workflow/durable-harness-store.ts` (or its compiled `dist/` path). This is an additive internal API, not a new CLI command. Supply the trusted repository's absolute root and a binding containing its already captured privacy-safe repository identity, run identity, subject head, source tree digest, configuration digest and policy identity. All identities and evidence references are digests, except the bounded tool label and replay enum. Never put credentials or secrets in a tool label; opaque labels are caller-owned and not universally redacted.

```ts
const journal = await AscoutDurableHarness.create(repositoryRoot, binding);
// For an existing run, explicitly open(repositoryRoot, expectedBinding).
await journal.begin({
  call_identity, attempt_identity, tool_name: "observe_tests",
  input_sha256, replay: "safe",
});
// Only now may the caller perform work under its separately established authority.
// Resolve and retain actual evidence through the existing artifact owner.
await journal.complete({
  call_identity, attempt_identity, state: "SUCCEEDED", evidence_sha256,
});
const recovery = await journal.recover();
```

An actual failed operation must record `FAILED` with its retained evidence digest. A callback/process exception with uncertain effect must leave its unfinished intent visible; never fabricate a terminal outcome. The API intentionally accepts no execution callback. A caller must not interpret an idempotent `begin()` acknowledgement as permission to rerun a completed or uncertain effect: consult recovery and its existing admission/reconciliation contracts first.

| Recovery disposition | Meaning |
| --- | --- |
| RECORDED_SUCCESS | A terminal success was recorded for this exact binding. Resolve the original evidence before relying on it. No re-execution. |
| RECORDED_FAILURE | The recorded failure remains visible. A later independent attempt must have distinct call/attempt identities. |
| RECONCILIATION_REQUIRED | An unfinished `never` intent may have taken effect. Do not blindly retry. |
| REVALIDATION_REQUIRED | Binding changed, or an unfinished `safe` intent needs caller-owned revalidation. No automatic retry. |

Every recovered call has `execute:false`. A stale binding exposes no current evidence digest and cannot mutate the old journal. A missing, corrupt, conflicting, oversized or locked journal throws; it never becomes an empty successful run. An explicitly created empty journal reports no calls and proves no execution. Terminal failure/success records cannot be overwritten. Reusing a memo identity with a different name, input, attempt or policy is rejected.

Source revalidation and effect reconciliation can both be required. An unfinished `never` call retains RECONCILIATION_REQUIRED even after source drift; `workflow.revalidation_required` separately stays true. Revalidating the source alone never settles that uncertain effect.

## Local storage and retention

Storage is fixed beneath `<repository>/.ascout/durable-harness/`; arbitrary output filenames are not accepted. A local `.gitignore` containing `*` keeps all managed state ignored even without a root rule. Conflicting ignore content, symlink managed directories/files and nonregular snapshots are rejected. The repository identity itself is the existing hashed `remote:` or `local:` form with matching kind/portability; raw origins and absolute paths are not persisted.

Each run has at most256 calls and a1MiB snapshot. Reaching a bound fails explicitly and preserves the old snapshot; do not silently evict history. State is retained until the operator explicitly removes the completed run. There is no automatic expiry or pruning; operators own retention and free-space management across runs. Keep evidence artifacts while any recovered digest relies on them.

A per-run exclusive lock prevents cooperative competing writers. A process that dies during atomic replacement can leave `<run>.lock` and an owned `<run>.<uuid>.tmp`. Never steal a lock based only on age or PID. First independently verify the original writer is stopped and identify the exact run/root. Preserve and validate the existing snapshot and relevant evidence. Only then may the operator remove that run's abandoned lock/temp; do not promote a partial temporary file or delete a valid snapshot to force recovery. Tests exercise a real child exit just before rename and verify blocked recovery and unchanged prior bytes.

File contents are flushed before atomic replacement. The design covers process restart with acknowledged filesystem operations. Directory fsync and arbitrary hardware power-loss durability are not promised on every supported platform. Checksums detect accidental corruption; they are not signatures or authenticated evidence. The supported boundary is a trusted local repository and cooperative writers, not hostile concurrent path replacement, same-user tampering or an untrusted-repository sandbox.

## Provenance and qualification

The integration draws the replay vocabulary and durable intent/outcome discipline from [Vercel durable-harness](https://github.com/vercel-labs/durable-harness/tree/ea8aa4060cf4fb8cd39737ce8ab21c4e0f40c741) and [the article](https://vercel.com/blog/making-every-harness-durable). The upstream Apache license, notice and hashes are in `vendor/vercel-durable-harness/`. It is not the complete upstream World/queue/provider product.

Focused contract/native tests cover actual cross-process restart and interruption, historical failure retention, source/repository drift, strict schema/digest bounds, ignored status, symlink rejection and concurrency. Exact-head qualification and review results are retained under `qualification/durable-harness/2026-10-24/` as they finish. Spec018's prior local Git/drift timing debt and development advisories remain independently open; this feature does not clear them or declare release readiness.
