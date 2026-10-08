# Traceability Matrix

`Requirement → Source/Component → Task → Test → Benchmark → Evidence → Release gate`

Nothing in this table is complete because a document describes it. The "Today" column states the observed status.

| Req | Requirement | Today | Source / component | Tasks | Tests | Benchmark | Evidence | Gate |
|---|---|---|---|---|---|---|---|---|
| R-01 | No command exits 0 without executing what was requested | **Violated** (G02, G03, G01) | `src/cli.ts`, `src/receipt/model.ts`; Sentrdel `main.rs` | V0-T02, V1-T00 | ADV-01, ADV-02, ADV-03 | B-CLM-1 | CI logs; V0-T07 probe table | V0 exit |
| R-02 | Claims can express "false" distinctly from "unknown" | **Missing** (G29) | `contracts/claim-assessment.ts` | V0-T01 (A07), V1-T10 | ADV-09 | B-CLM-1 | Schema diff + fixtures | V1 exit |
| R-03 | Security checks execute end to end | **Missing** (G04) | Scanners via broker (D-17); Sentrdel C01; K04 | V1-T03…T13 | SEC-01…08, FMT-01…FMT-11, ADV-03/04/15/18/19, E2E-03…E2E-07 | B-SEC-1, B-SEC-2 | Real-engine CI (L3) artifacts; release attestations | V1 exit |
| R-04 | Review executes, with coverage integrity | **Missing** | C03, K03 | V2-T01…T05 | REV-00…07, ADV-05/06/17 | B-REV-1 | Real `ocr` fixtures | V2 exit |
| R-05 | Review without operator-paid inference | **Missing** | OCR delegation | V2-T04 | REV-05, REV-06 | — | Delegation round-trip transcript | V2 exit |
| R-06 | `test` executes its profile | **Plan-only** | K02, K05 | V2-T06…T08 | TST-01…04 | B-TST-1 | Receipts | V2 exit |
| R-07 | Untrusted code is not executed with full user privileges without consent | **Not enforced** (G05) | Broker tiers; Kodac K-6, Winds P02 (Golam P01 only with FD-3) | V3-T01…T10 | CON-01…08, ADV-10 | B-EXE-1 | Probe receipts per OS | V3 exit |
| R-08 | Evidence tampering after sealing is detectable | **Not detectable** (G07) | Evidence store | V3-T08, T09 | ADV-07 | — | `verify-receipt` output | V3 exit |
| R-09 | Agents can request verification and receive exit-equivalent outcomes | **Missing** (G09) | `src/mcp/`, F02, P05, P07 | V4-T01…T07 | MCP-01…06, ADV-11 | MCP overhead | Recorded sessions | V4 exit |
| R-10 | Installable with verified integrity on 3 OSes | **Missing** (G06) | Release CI, manifest | V1-T02, V5-T01…T03, T08 | REL-01…06 | Install time | Attestations | V5 exit |
| R-11 | Reviews publish only for an exact fresh head | **Model only** (G23) | K08, P04 | V5-T06, T07 | PUB-01…04 | — | Recorded fixtures | V5 exit |
| R-12 | Crash-safe runs | **Missing** (G15) | Journal | V5-T04 | DUR-01…03 | — | Kill tests | V5 exit |
| R-13 | Third-party notices complete | **Violated** (G11) | `THIRD_PARTY_NOTICES.md` | V0-T03 | ADV-08 | — | CI | V0 exit |
| R-14 | Zero operator variable runtime cost | **Holds today** | Whole design | all | Egress tests (ADV-05) | — | No hosted endpoint in code (grep gate) | Every release |
| R-15 | Multi-language security coverage or explicit gap | **Gap implicit** (G08) | V1 ingestion path + Opengrep/Semgrep profiles (D-17) | V6-E1, E2 | ADV-15, SEC-09…16 | B-SEC-2 | Coverage matrix | V6 exit |
| R-17 | No critical evidence lost across SARIF, CycloneDX, SPDX, and native JSON | **Violated by revision 1 design** (G31) | Format ingestors ([17](17_SECURITY_EVIDENCE_INTEROPERABILITY.md)) | V1-T06…T09 | FMT-01…FMT-05, FMT-10 | B-SEC-2 | Mapping tables + real-engine CI artifacts | V1 exit |
| R-18 | Zero-coverage scanner runs never yield green | **Violated by engines themselves** (G32) | Engine Profiles | V1-T06 | FMT-05, FMT-07 | B-CLM-1 | CI | V1 exit |
| R-19 | Kodac completion depends on Ascout's verdict | **Not integrated** | Kodac K-12 | V6-E5 | E2E-14 | — | Recorded Kodac session | V6 exit |
| R-20 | Repository-controlled configuration cannot execute commands during verification | **Violated** (G30) | Git invocation layer; ported gateway | V0-T08, V1-T03 | ADV-20 | B-CLM-1 | Probe transcript | V0 exit |
| R-21 | Optional real deterministic web E2E with no model, telemetry or hosted cost by default | **Proposed, not integrated** | TesterArmy e2e C05, existing Playwright and broker | V0-T10, V7-T01…T04 | E2E-15…E2E-18 | B-E2E-1, B-CLM-1 | Locked binary, L2/L3 run receipts, no-egress captures | V7 exit |
| R-22 | Engineering playbooks cannot self-attest an independent review or change agent policy without consent | **Proposed, not integrated** | Pstack C06, existing Diffcipline/governance | V0-T10, V4-T08 | PST-01…PST-04 | B-CLM-1 | Installation receipts, host-tier logs, adverse tests | V4 exit |
| R-16 | Source binding: zero cross-tree leakage | **Holds** (existing) | K01, K02 | — (preserve) | existing benchmark | B-SRC-1 | Existing | Every release |
