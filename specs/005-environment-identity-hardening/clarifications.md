# Specification 005 Clarifications

## C1 — Why environment identity now?

Spec 004 completed branch evidence. The next roadmap-backed M1.1 evidence-depth gap is environment identity: benchmark evidence records runtime context while product receipts do not.

## C2 — Why not function coverage next?

Function coverage remains unqualified by current benchmark evidence and is outside this scope.

## C3 — Is `environment` required by receipt v1?

No. It is optional for backward receipt compatibility. This does not promise stale strict validators accept newer environment-bearing receipts.

## C4 — Why keep `schema_version = "1.0"`?

Receipt `"1.0"` remains the canonical semantic family under additive-v1 lockstep. Same-source/build validators move together; prior strict-schema rejection is expected/tested skew. No v2 negotiation is authorized.

## C5 — What identifies the producing revision?

No exact in-receipt source-revision identifier is added. `run.ascout_version` is a product label, not a schema lookup key; exact repository identities bind proof.

## C6 — How is package-manager version recovered?

Discovery remains sole authority. Package-json-led version comes from the exact snapshot discovery parsed, with same-manager confirmation; contradiction is integrity failure. No disk reread/command execution.

## C7 — Why not hash `DiscoveryFileMap[lockfilePath]`?

Recognized lockfiles are empty-string presence sentinels, not contents. Exact bytes must come from the authorized filesystem object.

## C8 — Which lockfile is hashed and what if it fails?

Lockfile-led authority uses its exact authority path; safe contained object-bound read/hash failure is integrity failure. Package-json-led authority may use only the matching root lockfile present in the snapshot; supplemental failure yields null with no fallback.

## C9 — Does missing environment metadata make verification incomplete?

Lockfile-led version can legitimately be null; package-json-led version cannot lose the exact validated version. Supplemental lockfile identity may be absent. Authority-source contradiction/failure is not optional absence.

## C10 — What is privacy-sensitive?

Raw absolute paths, host/user/home, environment inventory, network/machine identity, credentials/tokens/secrets are prohibited. Receipt paths are canonical repository-relative.

## C11 — Does this change task tool identity?

No.

## C12 — Does environment identity become source identity?

No. Source/tree binding remains authoritative.

## C13 — Does this authorize terminal/UI changes?

No bespoke output redesign.

## C14 — May T105 modify discovery?

No. If `root + files + discovery` cannot satisfy bounded rules, T105 is `NO_GO` and returns to planning.

## C15 — How does T104 prove prior strict-schema rejection without a second validator?

The same canonical evaluator in `src/receipt/json.ts` runs both current and exact pinned prior schemas. T104 may make only the minimum reuse/testability refactor; normal current validation remains current-schema-only. The prior fixture binds base `7bede70ad2abfb91dc9186fb44d77a824efbfdef`, canonical schema path, and blob `b331de44505f6fbdc5ff033367ef0904fda236b4`. No copied evaluator/dependency/runtime schema selector/negotiation.

## C16 — What happens if environment identity cannot be observed safely?

That is an expected typed integrity failure, not a repository finding and not optional metadata absence. T106 observes before any project task execution. On failure, no receipt is emitted and no synthetic task or `environment_error` field is invented. T106 narrowly authorizes `src/cli.ts` to recognize only this typed environment-integrity failure, emit the existing redacted diagnostic form, and return canonical exit `2`. Generic unexpected-error behavior is not redesigned.

## C17 — How is the lockfile containment-to-read race closed?

A pre-read `realpath` check by itself is insufficient because the authorized path can be replaced before a later open. T105 must bind bytes to the file object: capture the contained target's stable identity, open the authorized path once, immediately `fstat` that descriptor before reading any bytes and require the same regular-file identity, hash only through that descriptor, compare pre/post descriptor stability, then re-resolve/re-stat the authorized path and require it still identifies the opened object before accepting the digest. A swap between containment and open therefore fails before bytes are read; a swap after descriptor binding cannot redirect bytes and a persistent mismatch is rejected post-read. If reliable object identity cannot be proven on any supported OS/Node lane, T105 is `NO_GO`; no weaker fallback is authorized.
