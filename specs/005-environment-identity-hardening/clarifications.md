# Specification 005 Clarifications

## C1 — Why environment identity now?

Spec 004 completed branch evidence. The next roadmap-backed M1.1 evidence-depth gap is environment identity: benchmark evidence already records runtime context while the product receipt does not.

## C2 — Why not function coverage next?

Function coverage remains unqualified by current benchmark evidence and is outside this scope.

## C3 — Is `environment` required by receipt v1?

No. It is optional for backward receipt compatibility. This does not promise stale strict validators accept newer environment-bearing receipts.

## C4 — Why keep `schema_version = "1.0"`?

Receipt `"1.0"` remains the canonical semantic family under additive-v1 lockstep. Same-source/build supported validators move together; prior strict-schema rejection is expected/tested unsupported skew. No 1.1/v2 negotiation is authorized.

## C5 — What identifies the producing revision?

Spec 005 introduces no exact in-receipt source-revision identifier. `run.ascout_version` is a product-version label and must not select a schema revision or claim exact source identity. Compatibility proof binds exact repository/source revisions.

## C6 — How is package-manager version recovered without a second resolver?

Use `discovery.packageManager` as sole authority and parse the exact `files["package.json"]` snapshot discovery used. Confirm the same exact `manager@x.y.z`; missing/malformed/mismatch is integrity failure. No disk reread or command execution.

## C7 — Why not hash `DiscoveryFileMap[lockfilePath]`?

Recognized lockfiles are empty-string presence sentinels in discovery, not contents. T105 uses discovery only for authority/path/presence and safely re-reads exact filesystem bytes from canonical root.

## C8 — Which lockfile is hashed and what if it cannot be read?

Lockfile-led authority hashes the exact discovery authority path; safe reread/hash failure is integrity failure. Package-json-led authority may use only the fixed matching root lockfile present in the snapshot; supplemental read failure yields null identity with no fallback.

## C9 — Does missing package-manager version or lockfile make verification incomplete?

Lockfile-led manager legitimately has version null. Package-json-led manager cannot lose the exact version discovery already validated; that is integrity failure. Supplemental lockfile identity may be absent without changing verification completeness.

## C10 — What is privacy-sensitive and prohibited?

Raw absolute paths, hostname, username/home, environment-variable inventory, IP/network identity, machine IDs, credentials/tokens/secrets are prohibited. Receipt paths are canonical repository-relative.

## C11 — Does this change task `tool_name` / `tool_version`?

No. Existing task-level tool identity remains unchanged.

## C12 — Does environment identity become source identity?

No. Source identity/tree binding remain authoritative; environment identity is additional current-run evidence.

## C13 — Does this authorize terminal/UI changes?

No output redesign. JSON/agent/terminal changes are limited to existing generic receipt mechanics.

## C14 — May T105 modify discovery?

No. `src/discovery.ts` is outside T105. If `root + files + discovery` cannot satisfy the bounded rules, T105 stops `NO_GO` and returns to planning.

## C15 — How can T104 prove rejection by the prior strict schema without creating a second validator?

Current `src/receipt/json.ts` contains the canonical evaluator but its normal exported validation path loads only the current bundled schema. T104 may narrowly refactor that module so the same evaluator can be called with a controlled parsed schema in repository-local tests. The exact pre-Spec-005 strict schema is pinned as an immutable fixture and evaluated through that same implementation. The normal `validateReceiptJsonSchema()` entry point remains current-schema-only. A copied test validator, new validation dependency, runtime schema selector, arbitrary schema-loading API, or negotiation mechanism is not authorized.
