# Decision Log — Ascout V2 Planning

Status values: **PROPOSED** (this PR), **NEEDS-FOUNDER** (requires an FD decision), **RATIFIED** (none yet).

| ID | Decision | Alternatives rejected | Evidence | Status |
|---|---|---|---|---|
| D-01 | Architecture B+: one TypeScript trust kernel, out-of-process companions, Engine Protocol v1, one Execution Broker | A monolith; C plugin-first | [06](06_ARCHITECTURE_OPTIONS.md) | PROPOSED |
| D-02 | Reorder the program into vertical execution slices V0–V8 | Continue UA-P07…P18 order | [01](01_LIVE_REPOSITORY_AUDIT.md) §3, [11](11_IMPLEMENTATION_MASTER_PLAN.md) | PROPOSED; FD-5 |
| D-03 | Unified exit taxonomy for all commands (A07) | Keep exit 0 for `review`/`test`; add a `--strict` flag | Probes in [01](01_LIVE_REPOSITORY_AUDIT.md) §4 | NEEDS-FOUNDER (FD-1) |
| D-04 | Add claim state `REFUTED` | Overload `BLOCKED`/`INCONCLUSIVE` | G29 | NEEDS-FOUNDER (FD-1) |
| D-05 | Sentrdel is the only security engine Ascout calls; it fans in scanners through its SARIF adapter | Ascout integrates each scanner | `sentrdel-engine/src/adapter.rs` | PROPOSED; FD-2 |
| D-06 | OCR is the review engine; support BYOK/local and delegation; record independence class | Kodac review pipeline; build a reviewer | OCR probes | PROPOSED |
| D-07 | The containment helper `ascout-exec` lives in the Ascout repository under `native/` and is prebuilt per platform | Host it in Sentrdel; pure-TS containment (not possible); require Docker | [06](06_ARCHITECTURE_OPTIONS.md) §6 | PROPOSED |
| D-08 | Honest tiers T0/T1/T2; untrusted execution needs T1 or a recorded override | Claim a "sandbox" with process-level controls only | [08](08_SECURITY_AND_TRUST_MODEL.md) | NEEDS-FOUNDER (FD-4) |
| D-09 | Evidence moves to a per-user state dir with sealed digests | Keep in-repository `.ascout/` only | G07 | PROPOSED |
| D-10 | Kodac: port only GitHub transport; supersede Done Gate; no runtime import | Import the Kodac runtime | [01](01_LIVE_REPOSITORY_AUDIT.md) §5B | SUPERSEDED by D-16 (proposal) |
| D-11 | No plugin SDK, daemon, database, hosted service, or telemetry in V2 | — | [11](11_IMPLEMENTATION_MASTER_PLAN.md) §5 | PROPOSED |
| D-12 | Kernux downgraded to REFERENCE; UA-P08 deferred | Keep the Kernux bridge phase | Kernux README vs code | PROPOSED; FD-5 |
| D-13 | Copy from unlicensed owner repositories only after per-file Apache-2.0 attestation | Copy under general authorization | G16 | NEEDS-FOUNDER (FD-3) |
| D-14 | No reuse of private repository content in public Ascout | — | Privacy rule | PROPOSED |
| D-15 | No new effect classes; bind new paths to existing E5/E6 and `data_egress_rules` | Add E-classes | `kernel/effect-authority.ts`, `contracts/policy.ts` | PROPOSED |
| D-16 | Kodac revision 2: port 12 capabilities (gateway, private store, receipts/ledger, sanitized env, one-shot approvals, Landlock T1-FS launcher, reviewer qualification, continuous assurance, durable-workflow semantics, GitHub transport, compatibility catalogs, provenance lifecycle); integrate the Done Gate as a consumer of Ascout claims and `kodac ask` as a second review engine; retain authoring capabilities in Kodac | Port only GitHub transport (D-10); import the whole Kodac runtime | [16](16_KODAC_CONVERGENCE_ANALYSIS.md) | PROPOSED |
