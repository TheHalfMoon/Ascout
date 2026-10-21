# REA-E03: bounded Stryker JSON translation

This is a session-authorized engineering candidate against base
`ea93553a5423fd47f12a6bf282820dd199b994d4`. It does not establish canonical
admission, waive historical OCR/Claude policy, close UA-P07, or authorize merge.
Local review follows the founder's session direction; same-model review cannot
establish provider independence. Full qualification and required external gates
remain separate.

## Contract and compatibility

`translateStrykerOutputV1` consumes original UTF-8 bytes and an explicit expected
and observed source/head/attempt envelope. It verifies byte SHA-256 and envelope
equality before translating. The caller must obtain the expected digest and
binding independently; passing matching caller-authored fields cannot prove
historical producer provenance, source content, completeness, or source drift.
Stryker's report itself carries no authenticated Ascout attempt identity.

The translator accepts the consumed subset of mutation-testing report schema
`1.0` from `StrykerJS` exactly `10.0.0`. Required consumed fields are the schema,
framework name/version, files object, each file's mutants array, and each mutant's
unique producer ID and supported status. Optional `testsCompleted` must be a
nonnegative safe integer; optional `statusReason` must be bounded text. It does
not validate or expose unrelated producer configuration, source text, thresholds,
test-file metadata or source locations. Aggregate counts are derived from the
inventory, never from a score or process exit alone.

The existing `normalizeExternalMutationOutputV1` is called unchanged. All existing
mutation API signatures and output shapes remain intact. The additive return
contains the normalized observation, attempt ID, generated count, immutable
status counts and immutable per-mutant entries. No runner, CLI, dependency or
automatic execution path is added. The implementation is independently written;
no Stryker implementation material is copied.

Each identity is original repository-relative file spelling plus `#` plus original
producer ID, ordered by code-unit comparison. Producer IDs must also be globally
unique within the report. Raw path spellings are checked before any normalization;
absolute, drive, backslash, traversal, empty/dot segments, controls, percent/query/
fragment characters, Windows special/device names and trailing-dot segments are
refused. No path repair occurs.
JSON grammar is validated first and the parsed value is retained internally.
Duplicate JSON keys (including escaped equivalent keys) and excessive depth are
then rejected before any parsed value can reach translation. Running the token
scan only on valid JSON prevents repeated regex retries on malformed strings.

## Accounting and trust

Generated count includes every inventory entry. Adapter `attempted_count` counts
classified attempt/analysis outcomes: Killed, Survived, Timeout, NoCoverage,
CompileError and RuntimeError. Ignored and Pending remain in generated/status
counts and inventory but are excluded from attempted count. NoCoverage means a
producer analysis outcome, not proof that tests executed. Only Killed contributes
to killed count; only Survived contributes to survived count and explicit survivor
IDs. Every other status produces an explicit limitation.

| Condition | Producer source status |
| --- | --- |
| Missing/nonzero process exit or CompileError/RuntimeError | ERROR |
| Any survivors, absent the above errors | FAIL |
| Incomplete flag, empty inventory, Timeout/NoCoverage/Ignored/Pending | NOT_RUN unless already FAIL/ERROR |
| Complete nonempty all-Killed, exit zero | PASS as producer observation only |

Every result contains `stryker:untrusted-report`, an existing-normalizer blocking
reason, `authority=NONE_UNTRUSTED` and `canonical_status=UNTRUSTED_OBSERVATION`.
There is no quality/admission verdict. A producer PASS cannot remove that block.
Unknown statuses, malformed JSON, invalid UTF-8, binding/hash mismatches and
unsupported versions throw; no partial successful observation is returned.

`status_reason` preserves bounded producer text without interpreting it. This is
transient, potentially sensitive untrusted text, which may contain paths/secrets.
It is excluded from the normalized adapter result and must be sanitized by any
future persistence/presentation caller. This task adds neither caller. Qualification
artifacts persist only reason lengths/hashes, never raw reason text.

## Resource bounds

Limits are fixed: 2 MiB original bytes, 256 files, 10,000 mutants, 300 code units
per path, 128 per producer/attempt ID, 4,096 per status reason and 128 JSON nesting
levels. They bound decoding, parsing and inventory allocations for this optional
small-report seam, allowing substantial headroom over the real 12 KiB/five-mutant
fixtures. They are acceptance limits, not measured performance promises. Inputs
over a bound are rejected without truncating or dropping entries. The byte cap
also bounds ignored producer fields; limits do not make arbitrary reports trusted.

## Qualification evidence

External evidence is retained in sibling `../phase-e03/` outside the checkout:
`red.{log,json}` (22 tests: 20 failed against the throwing stub, two rejection
cases passed), `green-expanded.{log,json}`, exact-head check manifests/logs,
`qualify-reports.mjs`, `frozen-reports.json`, environment and evidence manifests.
Commands use RTK and the existing Vitest/TypeScript tools. Initial checks used a
node_modules junction to sibling `engineering/Ascout/node_modules` with a
byte-identical lockfile; those were not clean dependency installation checks.
Subsequent repair checks use the isolated installation prepared by the parent:
`../runs/e03-isolated-npm-ci-b9283e92-bebd-4fd8-80be-af29bbcb4d11.json` records
successful `npm ci --ignore-scripts --no-audit --no-fund` at the original candidate.
The builder did not alter that installation.

Fresh local review of the initial candidate found P2 `E03-SEC-001` / `REA-E03-C01`:
an unterminated string containing repeated escaped quotes caused quadratic regex
retries before grammar validation. Original review and timing evidence remain in
`review-security.json`, `review-correctness.json` and `security-regex-probe.*`.
The repair validates JSON first and retains its parsed result, preserving all
duplicate/depth/status checks. The new focused regression runs exact-limit 2 MiB
malformed input in a child with a fixed two-second timeout; `repair-red.*` records
the original `ETIMEDOUT`, and `repair-green.*` records successful rejection after
the repair. Existing test deadlines are unchanged. Repair exact-head checks and a
separate bounded child timing probe have distinct `repair-*` evidence names.
The initial finding is not considered independently resolved until fresh review
of the repaired head; local timings establish observations on this host only.

The four original frozen reports were read from completed research at
`work/Ascout/research/rea/2026-10-20/expansion/`. REA was not rerun or edited.
Upstream Stryker v10.0.0 source pin recorded there is
`cb3bd8fe25d5215422c9b632357062d3a43fcf92` (Apache-2.0); schema is 1.0.

| Report | Original SHA-256 | Killed / survived |
| --- | --- | --- |
| strong-0 | `1c01bcee2960f722e7eed1021dea582aba1819eb4d0ab2082151257796c688f3` | 5 / 0 |
| strong-1 | `5e094faf749d1d893a1aa9a7f057fd005e975a70de45d045d6ca06b87ef483de` | 5 / 0 |
| weak-0 | `ef322ead4b139cc3389b7438496f3882efc235464a34f6dad83d73b522f302e0` | 1 / 4 |
| weak-1 | `ec1fc1589e8b497f10456bd4b30edd211b3fdc4d2e30e3e0765ba0174eb79769` | 1 / 4 |

Focused tests cover both aggregates, every supported status, zero-exit survivors,
incomplete/empty/error runs, source/head/attempt and original digest binding,
unsafe raw paths, duplicate keys/IDs, invalid encoding/JSON, version/schema,
counts, reasons, resource overflow, immutability and deterministic ordering.
Real report qualification verifies the same 5/0 and 1/4 totals twice and records
run/fixture manifests. Its explicitly caller-supplied envelope names the historical
fixture and run; its Git head is the qualification base, not a claim that the
historical Stryker report authenticated a Git checkout.

Strict typecheck, build, focused tests and frozen report checks must be rerun on
the committed head. The parent controls the serial full suite. Independent local
correctness/security review, effective scope admission, applicable hosted CI and
platform/release gates remain outstanding until separately evidenced; advisory
D1 is not used to approve this candidate. No push, PR, merge or release occurs in
this builder task.
