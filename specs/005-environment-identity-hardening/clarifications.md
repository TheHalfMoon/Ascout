# Specification 005 Clarifications

## C1 — Why environment identity now?

Spec 004 completed branch evidence. The next roadmap-backed M1.1 evidence-depth gap with direct current-repository proof is environment identity: benchmark evidence already records runtime context while the product receipt does not.

## C2 — Why not function coverage next?

Function coverage remains unqualified by the existing branch benchmark and was explicitly outside Spec 004. No measured current gap proves it should precede environment reproducibility. This specification does not authorize it.

## C3 — Is `environment` required by receipt v1?

No. It is optional for backward receipt compatibility. Canonical older receipts remain valid under updated validators. This does not promise stale strict validators accept newer environment-bearing receipts; see `RECEIPT_V1_ADDITIVE_LOCKSTEP`.

## C4 — Why keep `schema_version = "1.0"` if an older strict schema rejects the new field?

Receipt `"1.0"` remains the canonical semantic family under the established additive-v1 direction. Same-source/build supported validators move in lockstep. Prior strict schema rejection is expected/tested unsupported version skew, not hidden forward compatibility. No receipt 1.1/v2 negotiation is authorized here.

## C5 — What identifies the producing revision?

Spec 005 introduces no exact in-receipt source-revision identifier. `run.ascout_version` is a product-version label, not guaranteed to distinguish commits/builds, and must not select a schema revision or claim exact source identity. Strict compatibility is proven operationally against exact repository/source revisions.

## C6 — How is package-manager version recovered without a second resolver?

`discovery.packageManager` remains sole authority. For package-json-led authority, use the exact `files["package.json"]` content snapshot discovery itself parsed. Confirm its exact `manager@x.y.z` names the resolved manager and emit that non-null version. Missing/malformed/mismatched snapshot state is integrity failure. Do not re-read package.json from disk and do not execute a command or choose another manager.

## C7 — Why not use `DiscoveryFileMap[lockfilePath]` as the lockfile content?

Because discovery intentionally records recognized lockfiles as presence/path sentinels with empty-string values; only content-required metadata such as package.json is read into the map. Hashing the lockfile map value would hash an empty sentinel rather than the lockfile. T105 must use discovery only for authority/path/presence and safely re-read exact lockfile bytes from the canonical repository root.

## C8 — Which lockfile is hashed and what happens if it cannot be read?

Lockfile identity never changes manager authority. If manager authority came from a recognized lockfile, hash that exact discovery authority path. Re-check realpath/symlink containment at read time; failure to safely re-read/hash the authority source is integrity failure. If authority came from package.json, consider only the fixed matching root lockfile that was present in the discovery snapshot; supplemental read failure yields null identity and never triggers fallback.

## C9 — Does a missing package-manager version or lockfile make verification incomplete?

Lockfile-derived manager legitimately has version null. Package-json-derived manager cannot lose the exact version discovery already validated; that is integrity failure. Supplemental matching lockfile identity may be absent without changing verification completeness. Authority-source failure is not optional absence.

## C10 — What is privacy-sensitive and prohibited?

Raw absolute paths, hostname, username, home directory, environment-variable inventory, IP/network identity, machine IDs, credentials, tokens, and secret-bearing values are prohibited. Lockfile paths are canonical repository-relative only.

## C11 — Does this change task `tool_name` / `tool_version`?

No. Existing task-level tool identity remains unchanged. Spec 005 adds complementary run-level environment identity.

## C12 — Does environment identity become source identity?

No. Source identity/tree binding remain authoritative. Environment identity is additional current-run evidence and cannot transfer evidence across source states.

## C13 — Does this authorize terminal/UI changes?

No output redesign. JSON/agent/terminal changes are limited to existing generic receipt mechanics; bespoke human-facing expansion requires separate authority.

## C14 — May T105 modify discovery to make implementation easier?

No. `src/discovery.ts` is outside T105. `collectDiscoveredProject()` already provides canonical root, files snapshot, and discovery result. If those bounded inputs cannot satisfy the rules, T105 stops `NO_GO` and returns to planning.
