# Specification 005 Clarifications

## C1 — Why environment identity now?

Spec 004 completed branch evidence. The next roadmap-backed M1.1 evidence-depth gap with direct current-repository proof is environment identity: benchmark evidence already records runtime context while the product receipt does not.

## C2 — Why not function coverage next?

Function coverage remains unqualified by the existing branch benchmark and was explicitly outside Spec 004. No measured current gap proves that function coverage should precede environment reproducibility. This specification does not authorize it.

## C3 — Is `environment` required by receipt v1?

No. It is optional at the schema level for backward receipt compatibility. Canonical older receipts remain valid under the updated validator. This does **not** mean a stale strict validator is forward-compatible with a newer environment-bearing receipt; the explicit policy is `RECEIPT_V1_ADDITIVE_LOCKSTEP` in `COMPATIBILITY_POLICY.md`.

## C4 — Why keep `schema_version = "1.0"` if an older strict schema rejects the new field?

Receipt `"1.0"` is the currently canonical semantic family and Spec 004 already established additive optional v1 evolution. Spec 005 makes the version-skew rule explicit: validators/consumers supported by the same canonical source/build revision move in lockstep. The prior strict schema is expected to reject a newer environment-bearing receipt and that rejection must be tested/documented. Spec 005 does not claim forward compatibility with stale schema copies and does not widen into receipt 1.1/v2 negotiation.

## C5 — What identifies the producing revision?

Spec 005 does not introduce an exact in-receipt source-revision identifier. `run.ascout_version` remains a product-version label but is **not** guaranteed to distinguish commits/builds and must not be used to select a schema revision or claim exact producer-source identity. Strict compatibility is established operationally by using validators bundled with the same canonical source/build revision, or a newer validator explicitly proven against that receipt shape. Adding schema negotiation or an in-receipt commit/schema-revision field requires separate authority.

## C6 — Can Ascout run `npm --version`, `pnpm --version`, or `yarn --version` to fill the field?

No. Spec 005 adds evidence metadata, not new executable verification or authority. `discovery.packageManager` remains the sole manager-authority decision. If discovery resolved the manager from root `package.json`, the observer may read that same already-authoritative file solely to recover the exact version from the already-validated declaration and must confirm it names the same manager. It must not execute a command or choose a manager independently. If the version cannot be recovered consistently, it remains `null` or fails integrity on contradiction.

## C7 — Which lockfile is hashed?

Lockfile identity is supplemental evidence, never package-manager authority. If discovery resolved the manager from a recognized lockfile, hash that exact discovery source path. If discovery resolved the manager from root `package.json`, inspect only the fixed supported root lockfile corresponding to that already-resolved manager (`npm -> package-lock.json`, `pnpm -> pnpm-lock.yaml`, `yarn -> yarn.lock`). If that matching file is absent, unsafe, or unreadable, do not guess another lockfile. Non-matching lockfiles do not override the manager decision.

## C8 — Does a missing package-manager version or lockfile make the verification incomplete?

No by itself. Environment identity quality is explicit metadata. Missing optional sub-observations must not fabricate data or alter task/exercise completeness. Integrity failure while constructing a claimed environment object is different: it must fail closed rather than emit contradictory identity.

## C9 — What is privacy-sensitive and prohibited?

Raw absolute paths, hostname, username, home directory, environment-variable inventory, IP/network identity, machine IDs, credentials, tokens, and secret-bearing values are prohibited. `lockfile_path` is repository-relative only.

## C10 — Does this change task `tool_name` / `tool_version`?

No. Existing task-level tool identity remains unchanged. Spec 005 adds complementary run-level execution environment identity.

## C11 — Does environment identity become source identity?

No. Source identity and tree binding remain authoritative for repository state. Environment identity is additional run evidence and must not transfer evidence across source states.

## C12 — Does this authorize terminal/UI changes?

No output redesign is authorized. JSON/agent/terminal changes are limited to what is mechanically required by the existing one-receipt truth architecture; any human-facing expansion beyond existing generic receipt rendering requires separate authority.

## C13 — May T105 modify discovery to make implementation easier?

Not under the current plan. `src/discovery.ts` is intentionally outside the expected T105 product surface. If the bounded observer cannot satisfy provenance rules from existing discovery state plus the exact already-authoritative source files, T105 must stop and return to planning instead of widening discovery contracts.