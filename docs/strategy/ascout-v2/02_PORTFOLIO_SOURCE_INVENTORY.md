# 02 — Portfolio Source Inventory

**Method (OBSERVED):** The GitHub API (`user/repos?affiliation=owner,collaborator,organization_member`) was enumerated with each of the four authenticated accounts available to this session. Results were de-duplicated, and every non-empty repository was shallow-cloned (`--depth 1`) except five very large public repositories, one archived private repository, and one third-party fork, which were inspected through the API (metadata, README, and default-branch HEAD).

**Result:** **55 unique accessible repositories** (43 public, 12 private), including every name in the founder's 47-repository discovery seed. **8 repositories were found beyond the seed:** 4 under a second personal account (1 public, `safeOCR`; 3 private) and 4 under the `wepld` organization (`wepld/wepld`, `wepld/AGILLE`, `wepld/Fehrest`, and a fork of `hapifhir/org.hl7.fhir.core`).

| Inspection depth | Count |
|---|---|
| Cloned (full history for Ascout, depth 1 otherwise) | 45 |
| …of which built, run, or test-executed | 4: Ascout (build + CLI probes), Sentrdel (Linux build, workspace tests, adapter probe with real SARIF), Kodac (CLI + full test suite, 2,725 tests), Winds (build + `verify` probe) |
| …of which inspected at module/file level | 15 (the 4 above + Golam, Deskal, kernux, Diffcipline, SpecGrain, Delethos, commandF, wepld, Orcel, HarnessMind, and **Ecra in revision 2**) |
| …of which inspected at README/structure/LOC level only | 28 |
| …of which empty on clone | 2 (`Trcel`, 1 private) |
| API-only (metadata, README, HEAD) | 10 (Gomrey, Qdrat, Inercative, Signthos, MedScale, the archived private repository, the FHIR fork, `wepld/AGILLE`, `wepld/Fehrest`, 1 private size-0 repository) |
| **Total** | **55** |

Every repository received a disposition.

**Wording rule (revision 2, [18](18_CONTRADICTION_RESOLUTION_LEDGER.md) C-17):** "55" is the number of repositories *discovered and dispositioned*. Only the 15 listed above were examined at code level, and only 4 were executed. A README-level disposition is a triage decision, not a technical assessment.

Disposition vocabulary: **SELECTED** (component-level reuse in V2), **REFERENCE** (patterns/methods only, no code import planned), **GOVERNANCE_TOOL** (used to develop Ascout, not shipped), **NOT_RELEVANT** (business domain unrelated to verification), **REJECT** (rights or risk problem), **EMPTY**.

## 1. High-value internal sources (code-level inspection)

| Repository | HEAD | Lang / size (OBSERVED) | License (OBSERVED) | Maturity | Disposition | Rationale |
|---|---|---|---|---|---|---|
| **Ascout** | `ca6b6f51…` | TS 54.8k LOC | Apache-2.0 | Implemented kernel; engines unexecuted | **CANONICAL** | Trust kernel and product |
| **Sentrdel** | `f5747319…` | Rust 100.7k LOC, 9 crates | Apache-2.0 | Libraries implemented + tested; CLI is a stub; no releases | **SELECTED — COMPANION ENGINE** | Only internal security engine; SARIF fan-in, process-tree runner, reconciler, policy, MCP guard all exist |
| **Kodac** | `406b3352…` | TS 167.9k LOC + C 1.9k | Apache-2.0 | Runtime implemented (`ask`/`solve`/`apply-patch`); K2 CI green | **SELECTED — SELECTIVE_PORT (1 component) + REFERENCE** | Port the GitHub review transport (O4b/O4g/O4i); use gVisor/Landlock research as a reference; the rest overlaps Ascout or is agent-authoring scope |
| **Winds** | `3bfe45fe…` | Rust 121.1k LOC | MIT OR Apache-2.0 | v0.1.0 released 2026-08-15; `verify` refuses native Windows (exit 1, OBSERVED) | **SELECTED — SELECTIVE_PORT** | Detached-candidate verification contract, Windows Job Object process scope, agent CLI adapters (`agentic_claude.rs`, `agentic_codex.rs`) |
| **Golam** | `13a379ac…` | Rust 112.3k LOC | **No LICENSE file** | Implemented ledger/kernel/daemon; README still says "planning" | **SELECTED — SELECTIVE_PORT (gated on FD-3)** | Linux native containment v2 (Landlock v4 + seccomp, hostile probes), approval binding, egress permits, secret broker patterns |
| **Deskal** | `be21813d…` | Rust 86.5k + TS 18.7k | Apache-2.0 | Released product; 31 MCP tools | **SELECTED — REFERENCE + SELECTIVE_PORT** | Local MCP gateway design, per-effect approval bound to content hash, Windows process launch and Job assignment; AppContainer is probe-only (not a launch path) |
| **kernux** | `2085b6ed…` | Rust 19.3k + TS 9.8k | Apache-2.0 | README says "implementation has not started"; code contains policy/egress/secret/CAS crates | **REFERENCE** | Capability-kernel ideas overlap Ascout's effect authority; README/code mismatch must be resolved before any reuse |
| **Diffcipline** | `1e6d14f7…` | Rust 2.1k LOC + Agent Skills + Action | MIT | v1.0.0 released | **GOVERNANCE_TOOL + SELECTIVE_PORT (skills packaging)** | Proof-before-done gate for this project's own development; its Agent Skill packaging is the model for Ascout's agent skill |
| **SpecGrain** | `5de7d649…` | Python 9.1k LOC, zero runtime deps | MIT | v0.3.0 released | **GOVERNANCE_TOOL** | Bounded work packets/readiness for Ascout development; not shipped in Ascout |
| **Delethos** | `5b8f5f28…` | TS 5.1k LOC | MIT | Early implementation | **REFERENCE (adapters)** | Agent invocation adapters (claude/codex/opencode/pi) and worktree runtime; Winds' Rust adapters are more mature |
| **commandF** | `f82565cc…` | Rust 30.8k LOC | **No LICENSE file** | Implemented FHIR package checker | **REFERENCE** | SARIF 2.1.0 writer (`crates/commandf-pkg/src/check_sarif.rs`) is a clean reference; domain is healthcare interoperability |
| **wepld** (TheHalfMoon) | `0a843a2c…` | Rust 17.5k LOC | **No LICENSE file** | Reconstitution in progress | **REFERENCE** | Assurance-fabric concepts were already absorbed into Ascout's master plan; no further import |
| **Orcel** | `91954ec7…` | TS (fork lineage of `vercel/eve`, Apache-2.0) | Apache-2.0 + NOTICE | Implemented | **REFERENCE** | Filesystem-first agent framework; third-party lineage means any reuse must carry Vercel NOTICE; not needed |
| **HarnessMind** (private) | — | withheld (private) | withheld | withheld | **REFERENCE (agent-harness audit concept, V6)** | Already named in canonical public Ascout documents; only the concept (auditing what an agent harness loaded and why) is referenced. No content is reproduced |

## 2. Supporting and research repositories

| Repository | Visibility | Summary (from README) | Disposition | Reason |
|---|---|---|---|---|
| MSTR | public | Local code model research; `src/mstr_qualify` 16.2k LOC | REFERENCE | Model-qualification methodology for V6 local-model review qualification; no license file |
| commandMed | public | Medical intelligence research | REFERENCE | Uncertainty/abstention methodology only |
| MESC (MedScale research) | public | Clinical AI evidence research | NOT_RELEVANT | Medical domain |
| MedScale | public | Rust medical platform | NOT_RELEVANT | Medical domain |
| DAL | public | Clinical decision assurance research | REFERENCE | Calibrated abstention concept; medical domain |
| safeOCR | public | Clinical OCR verification | NOT_RELEVANT | Medical domain |
| MedOrigin | public | Clinical evidence workstation (planning) | NOT_RELEVANT | Planning only |
| Ecra | public | Browser/agent platform; `ecra-run`, `ecra-verify` crates | REFERENCE | Overlaps Deskal/Golam; no license file |
| Morize | public | Agent memory OS | NOT_RELEVANT | Memory is out of Ascout scope (YAGNI) |
| Tarif | public | Agent authority runtime (planning) | REFERENCE | Same thesis as Ascout effect authority; no code |
| Skelet | public | Design intelligence | NOT_RELEVANT | — |
| Lilac | public | Design workspace | NOT_RELEVANT | — |
| Wispral | public | Voice control for agents | NOT_RELEVANT | — |
| Olax | public | Digital-company OS (planning) | NOT_RELEVANT | — |
| ottari (Himsat) | public | Conversation intelligence (planning) | NOT_RELEVANT | — |
| Gomrey | public | Knowledge/creation platform (very large) | NOT_RELEVANT | API-only inspection |
| Inercative | public | AI product builder (P00) | NOT_RELEVANT (future consumer) | A future *user* of Ascout, not a donor |
| Signthos | public | Document signing (research) | NOT_RELEVANT | — |
| Zyara | public | Healthcare discovery | NOT_RELEVANT | — |
| CommunityFinance-CoFi | public | Local-first financial ledger | NOT_RELEVANT | — |
| Balott, Mckani, acarat | public | Planning-only shells | NOT_RELEVANT | — |
| Qdrat | public | Contains Horilla HRMS (third-party, LGPL-2.1) | REJECT | Third-party domain code; LGPL; unrelated |
| Golam-research | public fork | Reconstruction of a third-party proprietary desktop application | **REJECT** | Third-party rights cannot be cleared by owner authorization |
| Trcel | public | Empty | EMPTY | — |
| wepld/wepld | public | Architecture master plan (docs, proprietary notice) | REFERENCE | Docs only |
| wepld/AGILLE, wepld/Fehrest | public | Empty | EMPTY | — |
| wepld/org.hl7.fhir.core | public fork | HL7 FHIR core fork | NOT_RELEVANT | Third-party |

## 3. Private repositories (aggregate)

12 private repositories were accessible: 9 under `TheHalfMoon` (1 archived) and 3 under a second personal account. HarnessMind is listed above because canonical public Ascout documents already name it. The other 11 are not named or described here, because Ascout is a public repository.

Dispositions for the 11: 1 REFERENCE (concepts only, no import), 10 NOT_RELEVANT or EMPTY.

**No private repository content is selected for import into Ascout.** If a future task selects private code, distribution rights must be established first, because Ascout is public and Apache-2.0.

## 4a. Revision 2 deepened audit

| Repository | Revision 1 depth | Revision 2 finding (OBSERVED) | Disposition |
|---|---|---|---|
| Kodac | Module level | Full comparison of 18 capabilities; test suite executed ([16](16_KODAC_CONVERGENCE_ANALYSIS.md)) | SELECTED: 12 ports, 2 integrations |
| Ecra | README | `crates/ecra-verify` has a hash-chained verification journal (`journal.rs`: `previous_digest` per entry), checkpointing, reconciliation, and a store; `crates/ecra-run` has recovery, SQLite state, and migrations. **No LICENSE file** | REFERENCE for the V3 sealing / V5 journal design; no copy without FD-3 |
| Gomrey | API metadata | Tree contains claim/evidence-bundle/evidence-span JSON schemas; its foundation is an import of `presenton/presenton` (Apache-2.0) per `docs/evidence/P01_PRESENTON_IMPORT.md` | NOT_RELEVANT (presentation/knowledge domain) |
| wepld | Module level | `crates/core/src/evidence_store.rs`, `git_topology.rs`, `doctor.rs`; no LICENSE file | REFERENCE (no new capability over Ascout + Kodac) |
| CommunityFinance-CoFi, safeOCR | README | Tauri desktop ledger; clinical OCR scripts | NOT_RELEVANT |

## 4b. Embedded third-party rights in owner repositories

Founder authorization covers rights the founder controls. It does **not** cover upstream code embedded in owner repositories. Known lineage found in this audit:

| Owner repository | Embedded upstream | Upstream license (OBSERVED unless noted) | Consequence for Ascout |
|---|---|---|---|
| Kodac | OpenCode (patch engine), HKUDS DeepCode (pruning, repeat-call, guarded pipeline), DeepSeek Harness (Landlock launcher), spec-kit contracts | MIT; MIT; **BSD-3-Clause**; per Kodac notices | Only the Landlock launcher is ported; its BSD-3-Clause notice travels with it. The MIT-derived authoring modules stay in Kodac |
| Orcel | `vercel/eve` | Apache-2.0 with NOTICE | Not used |
| Gomrey | `presenton/presenton` | Apache-2.0 | Not used |
| Olax | "Paperclip-derived" (per README; exact upstream not identified in this audit) | Unverified | Not used |
| Lilac | Paper.design ("authorized source/donor" per README) | Not verified | Not used |
| Qdrat | Horilla HRMS | LGPL-2.1 | REJECT |
| Golam-research | Reconstruction of a third-party proprietary application | Proprietary upstream | REJECT |
| Ascout | `google/artemis` (vendored) | Apache-2.0 | Existing notice |

Any future port must check the source file's own header and the repository's notices, not only the repository LICENSE.

## 4. Existing donor records reconciled

`docs/strategy/ASCOUT_OWNER_REPOSITORY_SOURCE_INVENTORY_2026-09-19.md` and `ASCOUT_DONOR_CAPABILITY_ADMISSION_MATRIX_2026-09-22.md` were read. Differences found by this inventory:

1. `safeOCR`, the `wepld` organization repositories, and the second personal account were not in the prior inventory.
2. The prior matrix treats Kernux as a "Reality Verification Fabric" source. Kernux's own README says implementation has not started, while its code contains about 19k Rust lines. V2 downgrades Kernux to REFERENCE until that contradiction is resolved in Kernux itself.
3. The prior plan does not identify Golam's Linux containment, Deskal's Windows launch path, or Winds' Job Object scope as containment donors. V2 does ([04](04_CAPABILITY_REUSE_MATRIX.md) §3).
4. The prior plan assumed Sentrdel was executable behind an adapter. It is not ([01](01_LIVE_REPOSITORY_AUDIT.md) §5A).
