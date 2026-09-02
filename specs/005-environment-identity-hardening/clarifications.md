# Specification 005 Clarifications

## C1 — Why environment identity now?

Spec 004 completed branch evidence. The next roadmap-backed M1.1 evidence-depth gap with direct current-repository proof is environment identity: benchmark evidence already records runtime context while the product receipt does not.

## C2 — Why not function coverage next?

Function coverage remains unqualified by the existing branch benchmark and was explicitly outside Spec 004. No measured current gap proves that function coverage should precede environment reproducibility. This specification does not authorize it.

## C3 — Is `environment` required by receipt v1?

No. It is optional at the schema level for backward compatibility. Existing persisted/consumer fixtures remain valid. After implementation, Ascout-produced new receipts must include it when identity observation succeeds.

## C4 — Can Ascout run `npm --version`, `pnpm --version`, or `yarn --version` to fill the field?

No. Spec 005 adds evidence metadata, not new executable verification or authority. Package-manager version is recorded only from already validated, non-executing discovery information. If unavailable, it remains `null`.

## C5 — Which lockfile is hashed?

Only one effective supported lockfile if existing discovery semantics establish it safely and unambiguously. This spec does not invent a new resolver. Multiple/ambiguous or unavailable candidates produce no lockfile identity rather than a guessed choice.

## C6 — Does a missing package-manager version or lockfile make the verification incomplete?

No by itself. Environment identity quality is explicit metadata. Missing optional sub-observations must not fabricate data or alter task/exercise completeness. Integrity failure while constructing a claimed environment object is different: it must fail closed rather than emit contradictory identity.

## C7 — What is privacy-sensitive and prohibited?

Raw absolute paths, hostname, username, home directory, environment-variable inventory, IP/network identity, machine IDs, credentials, tokens, and secret-bearing values are prohibited. `lockfile_path` is repository-relative only.

## C8 — Does this change task `tool_name` / `tool_version`?

No. Existing task-level tool identity remains unchanged. Spec 005 adds complementary run-level execution environment identity.

## C9 — Does environment identity become source identity?

No. Source identity and tree binding remain authoritative for repository state. Environment identity is additional run evidence and must not transfer evidence across source states.

## C10 — Does this authorize terminal/UI changes?

No output redesign is authorized. JSON/agent/terminal changes are limited to what is mechanically required by the existing one-receipt truth architecture; any human-facing expansion beyond existing generic receipt rendering requires separate authority.
