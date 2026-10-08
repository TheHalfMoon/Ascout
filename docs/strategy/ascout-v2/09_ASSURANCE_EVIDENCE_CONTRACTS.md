# 09 — Assurance Evidence Contracts

V2 changes the contract layer as little as possible. The existing contracts (K01) are kept. This document specifies (1) how the three existing state vocabularies relate, (2) the unified exit taxonomy, (3) Engine Protocol v1, and (4) the proposed Amendment A07 text.

## 1. Three vocabularies, one mapping

| Level | Vocabulary (existing unless marked) | Owner |
|---|---|---|
| Task / engine run | `PASS, FAIL, FLAKY, BLOCKED, ERROR, NOT_APPLICABLE, NOT_RUN(reason)` (Constitution II) + adapter execution states `AVAILABLE, EXECUTED, UNAVAILABLE, NOT_QUALIFIED, VERSION_MISMATCH, DENIED_BY_POLICY, NOT_RUN, INCOMPLETE, TIMEOUT, MALFORMED_OUTPUT, ENGINE_ERROR` (`sentrdel-engine-adapter.ts`) | Engine runner |
| Finding | `CANDIDATE, REQUIRES_MORE_EVIDENCE, VALIDATED, OPEN, REJECTED_FALSE_POSITIVE, REPAIRED_PENDING_REVERIFY, VERIFIED_FIXED, ACCEPTED_RISK, SUPERSEDED` (`contracts/finding.ts`) | Kernel |
| Claim | `SUPPORTED, BLOCKED, INCOMPLETE, INCONCLUSIVE, STALE, REFUSED` + **`REFUTED` (proposed A07, G29)** | Kernel only |

Rules (deterministic; implemented in the kernel, never in an engine):

1. Any engine state other than `EXECUTED` for a *required* capability → the claim is at best `INCOMPLETE` (missing) or `BLOCKED` (policy/tier).
2. `MALFORMED_OUTPUT`, `ENGINE_ERROR`, `TIMEOUT` → `ERROR` at task level; the claim cannot be `SUPPORTED`.
3. **Finding intake status** depends on the producer: a deterministic result from a qualified engine enters as `OPEN`; a model or agent result enters as `CANDIDATE` and needs deterministic evidence to become `VALIDATED`. `REFUTED` requires at least one `OPEN` or `VALIDATED` finding at or above the intent's severity threshold, or a required task `FAIL`, bound to the same target and fresh. `CANDIDATE` findings never refute. Stale contradicting evidence yields `STALE`, not `REFUTED` ([18](18_CONTRADICTION_RESOLUTION_LEDGER.md) C-03, C-04).
4. Evidence bound to another source digest → `STALE` (existing freshness engine).
5. A model-originated observation can raise a finding to `CANDIDATE` only. It can never set `VALIDATED`, close a finding, or contribute supporting evidence for a security claim.
6. `SUPPORTED` requires every required capability `EXECUTED`, at least one resolvable supporting evidence ref per required capability, zero contradicting validated evidence, and freshness. These are the existing semantic-validator rules, unchanged.

## 2. Unified exit taxonomy (proposed A07)

Every command that makes or reports an assurance statement uses the existing `check` mapping (`src/receipt/model.ts:375`):

| Exit | Meaning | Claim states / receipt conditions |
|---|---|---|
| 0 | Requested assurance complete and clean | `SUPPORTED`; or nothing applicable (`NOT_APPLICABLE` for an empty scope) |
| 1 | Verified problem | `REFUTED`; findings present; task `FAIL`/`FLAKY` |
| 2 | Ascout or setup error; usage error | `ERROR`; integrity error; unknown stability |
| 3 | Source drifted during the run | `tree_drifted` |
| 4 | Incomplete — something requested did not execute | `INCOMPLETE`, `BLOCKED`, `INCONCLUSIVE`, `STALE`, `REFUSED`, any required `NOT_RUN` |

Non-assurance outputs are explicitly labeled and exit 0 on successful rendering: `ascout test --plan`, `ascout review --delegate` (emits a spec; it is not a review result), `ascout doctor` (0 healthy, 2 broken).

Precedence when several apply: 2 > 3 > 1 > 4 > 0 (identical to `decideReceiptExitCode`). Because exit 1 outranks exit 4, every receipt and MCP response carries `completeness` independently. Exit 1 never implies complete coverage ([18](18_CONTRADICTION_RESOLUTION_LEDGER.md) C-02). `review --ingest` is assurance output and uses this table; `review --delegate` is not.

## 3. Identity fields carried by every engine run

Already modeled in `engine-run.ts`/`engine-descriptor.ts`. V2 makes these mandatory for executing engines:

| Identity | Content |
|---|---|
| Target | repository identity (privacy-safe), head SHA, tree digest, comparison base |
| Build | not applicable for static engines; for test runs, lockfile digest + runtime versions |
| Run | run id, start/end, achieved tier, effects used |
| Engine | engine id, resolved absolute path digest, binary SHA-256, `--version` output, pinned-version match boolean, supply source (`SETUP_MANIFEST`/`USER_SUPPLIED`) |
| Configuration | digest of the effective engine config; for OCR, endpoint identity (host + model id, never the token) |
| Independence | `SELF` (author agent), `HOST_AGENT` (delegation), `SEPARATE_AGENT`, `DETERMINISTIC_TOOL`, `HUMAN` |

## 4. Engine Protocol v1

Purpose: a single way for Ascout to invoke any engine and receive bounded, schema-checked output. It is used internally from V1. It is documented so that future admission is possible; it is not a public SDK commitment.

**Invocation.** `argv` is fixed by the engine descriptor (no shell) and `cwd` is the candidate worktree. The request JSON is passed on stdin, at most 64 KiB. The environment is allowlisted.

**Request (stdin)**

```json
{
  "protocol": "ascout-engine/1",
  "request_id": "req_…",
  "target": {"head_sha": "…", "tree_digest": "…", "base_sha": "…"},
  "capabilities": ["security.secrets.changed", "security.ci.github_actions"],
  "limits": {"max_wall_ms": 300000, "max_stdout_bytes": 8388608},
  "policy": {"network": "DENY", "source_egress": "DENY"}
}
```

**Response (stdout, single JSON document)**

```json
{
  "protocol": "ascout-engine/1",
  "request_id": "req_…",
  "engine": {"id": "engine:sentrdel", "version": "…", "build": "…"},
  "execution": {"state": "EXECUTED", "started_at": "…", "finished_at": "…"},
  "capabilities": [
    {"id": "security.secrets.changed", "state": "EXECUTED",
     "coverage": {"files_in_scope": 12, "files_analyzed": 12, "unsupported": []}}
  ],
  "observations": [ /* engine-native, validated by the engine-specific normalizer */ ],
  "diagnostics": []
}
```

**Rules**

- Any non-JSON output, a missing `request_id` match, or an oversize response → `MALFORMED_OUTPUT`.
- A process exit code alone never implies success. A response with `execution.state = EXECUTED` *and* process exit 0 is required; the opposite combination → `ENGINE_ERROR`.
- Every requested capability must appear in the response; an omitted one is `NOT_RUN(capability_omitted_by_engine)`.
- Engines that do not speak the protocol (OCR, Stryker, user test runners) are wrapped by an Ascout-side runner that produces the same internal structure from their native output. Sentrdel implements the protocol natively in V1-T01.

## 5. Proposed Amendment A07 (text for ratification)

> **Amendment A07 — Truthful process interface and claim refutation.** Scope: all Ascout commands.
> 1. A command that is requested to verify, review, test, or security-check MUST NOT exit 0 unless the resulting claim is `SUPPORTED` or the scope is `NOT_APPLICABLE`. Unexecuted requested work exits 4.
> 2. Plan, delegation-spec, and diagnostic outputs MUST be labeled as non-assurance output in both human and machine formats.
> 3. The claim vocabulary gains `REFUTED`, valid only with resolvable validated contradicting evidence, mapped to exit 1.
> 4. Executing source that the user did not author requires an achieved containment tier of full `T1` (filesystem **and** network confinement), or a per-invocation human-only override that caps the claim at `TRUSTED_LOCAL` and is recorded. Repository-controlled Git and tool configuration that can launch commands is neutralized for every untrusted run.
> 5. Companion engines are invoked only through Ascout's bounded process layer (the Execution Broker once it exists), never through a shell, with engine identity and achieved tier recorded per run. A06 rule 6 is reaffirmed: no companion is required for `check`.
> 6. A06 rule 5's "remain unchanged" clause for `review` and `test` is superseded for exit-code semantics only.

Ratification prerequisite: founder decision FD-1.
