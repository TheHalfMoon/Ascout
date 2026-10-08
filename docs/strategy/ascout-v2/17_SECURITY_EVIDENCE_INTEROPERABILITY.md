# 17 — Security Evidence Interoperability and Degraded Modes (Revision 2)

**Status:** PROPOSED. Supersedes decision D-05 ("Sentrdel is the only security engine Ascout calls") and the "single security ingestion path" text in [00](00_EXECUTIVE_DECISION.md) §1.2, [03](03_EXTERNAL_SOURCE_RESEARCH.md) §2, and [06](06_ARCHITECTURE_OPTIONS.md) §6. Takes effect only on founder ratification.

## 1. Question

Does routing every scanner through Sentrdel create a single failure bottleneck? Can SARIF, CycloneDX, SPDX, scanner-native JSON, coverage metadata, and missing-scanner states be ingested without losing critical evidence?

## 2. Experiment (OBSERVED 2026-10-08, Windows 11)

**Engines:** official release binaries, SHA-256 verified against each project's published checksums: Gitleaks 8.30.1, OSV-Scanner 2.6.0, Syft 1.54.1, Trivy 0.75.0 (vulnerability DB downloaded from GHCR with founder approval).

**Probe repository** (synthetic, never published): two planted synthetic credentials (AWS-style and GitHub-PAT-style) in `config.js`; a `pull_request_target` workflow that checks out the PR head and interpolates the PR title into a shell step; `lodash@4.17.15` and `minimist@1.2.0` in `package-lock.json`; a `node:14` Dockerfile; and a Terraform file with a public bucket ACL and SSH open to `0.0.0.0/0`.

Raw artifacts were kept locally and **not committed**, because they contain secret-shaped strings. Their SHA-256 values are recorded in [SOURCE_PROVENANCE_REGISTER](SOURCE_PROVENANCE_REGISTER.md) §4.

### 2.1 Results by engine

| Engine / format | Exit | Findings | Observations |
|---|---|---|---|
| Gitleaks JSON / SARIF | **1** | 2 secrets | Unredacted JSON contains both planted values; SARIF contains them in `region.snippet`. `--redact` removes them (0 occurrences). SARIF reports tool version `v8.0.0` while the binary is 8.30.1 |
| OSV-Scanner JSON / SARIF / CycloneDX 1.5 / SPDX 2.3 | **1** | 8 advisories (GHSA IDs, all with aliases and `max_severity`) | SARIF has no line regions; URIs are **absolute `file:///C:/…` paths**, which leaks the local path. CycloneDX output includes 8 vulnerabilities; SPDX output includes none |
| Trivy `fs` JSON / SARIF / CycloneDX 1.7 / SPDX 2.3 | **0** with findings | 9 vulnerabilities (CVE IDs plus `NSWG-ECO-516`), 2 Dockerfile misconfigurations, 1 secret | SARIF results **omit** `FixedVersion`, `InstalledVersion`, `PkgName`, `CVSS`, `PublishedDate` (CVSS appears only as rule properties). SARIF has no fingerprints. Masks the secret it detected but **prints the undetected AWS-style value in `Code.Lines` context** |
| Trivy on the Terraform file (single-line HCL) | **0** | **0 failures, "Successes: 51"** | The file did not parse. The only signal is an `ERROR [terraform parser]` line on **stderr**, which `--quiet` suppresses. With valid HCL the same content yields 3 failures (AWS-0099, AWS-0107, AWS-0124) |
| Syft CycloneDX 1.7 / SPDX 2.3 / native JSON | 0 | 3 npm PURLs (including the root package) | — |
| Gitleaks on a non-Git directory | **0** | "0 commits scanned … no leaks found" | Zero coverage reported as clean |
| OSV-Scanner with no lockfiles | **128** | — | "No package sources found" |
| Trivy with no vulnerability DB and `--skip-db-update` | **1** | — | Fatal; same exit value Gitleaks/OSV use for "findings present" |
| Syft on an empty directory | **1** | no output | — |
| Missing binary | **127** | — | Shell-level |

### 2.2 Cross-engine agreement

- **Vulnerabilities:** OSV (GHSA IDs) and Trivy (CVE IDs) agree on 8 advisories **only through aliases**. Trivy reports 1 advisory (`NSWG-ECO-516`) that OSV does not. Correlation must use aliases; aggregation must be a union.
- **SBOM:** component counts differ by producer: Syft 6 (CycloneDX) / 5 (SPDX), Trivy 3 / 4, OSV 2 / 3. The npm PURL set agrees on `lodash@4.17.15` and `minimist@1.2.0`; Syft also lists the root package.
- **CI workflow risk:** none of the four engines reported the `pull_request_target` + head checkout + expression-in-shell pattern. Sentrdel's `github_actions.rs` is designed for this, but could not be executed (no CLI; G01).

### 2.3 Sentrdel's SARIF adapter fed with the real SARIF (OBSERVED, Linux)

A temporary, uncommitted test called Sentrdel's `adapt_completed_output` (`crates/sentrdel-engine/src/adapter.rs`) on the real files. Sentrdel's working tree was restored afterwards.

| Input | Result |
|---|---|
| Gitleaks SARIF | Accepted: 2/2 evidence items with locations; **0 plaintext values in the produced evidence** |
| OSV-Scanner SARIF | **Whole file rejected**: "engine result location must be repository-relative without a URI scheme or drive prefix" |
| Trivy SARIF | **Whole file rejected**: "SARIF uriBaseId resolution is not trusted by T028" |

Sentrdel supports only two dialects (`SentrdelJsonV1`, `SarifV2_1_0`). It has **no CycloneDX, SPDX, or OSV JSON ingestion**.

## 3. Conclusions

1. **Sentrdel-only fan-in loses critical evidence today:** 20 of 22 real SARIF results were rejected, and all SBOM and OSV-native evidence has no path. It also makes every scanner unavailable whenever Sentrdel is unavailable, which is true today (G01).
2. **SARIF alone is lossy.** Trivy's fix versions, package identities, and CVSS do not survive in SARIF results; OSV's SARIF has no line regions.
3. **Exit codes cannot signal success.** 0 can mean "clean", "findings present" (Trivy), or "nothing scanned" (Gitleaks on a non-repository). 1 can mean "findings" or "fatal error".
4. **Coverage loss is often invisible in structured output.** It shows up only on stderr (Trivy parse errors) or in prose counts (Gitleaks "0 commits scanned").
5. **Scanner output is secret-bearing,** including secrets the scanner itself did not detect.

## 4. Revised design: federated ingestion, single claim authority

```text
Execution Broker (ported Kodac gateway, doc 16 K-1)
  runs: Sentrdel · Gitleaks · OSV-Scanner · Syft · Trivy · Opengrep  (each with an Engine Profile)
     │ raw stdout/stderr/files (bounded)
     ▼
Redaction pass (before anything is persisted)
     │ redacted artifacts, sealed with SHA-256
     ▼
Format ingestors in Ascout (one per standard, not per tool):
  SARIF 2.1.0 · CycloneDX 1.5–1.7 JSON · SPDX 2.3 JSON · OSV-Scanner JSON · Trivy JSON · Sentrdel JSON v1
     │ observations + coverage records (lossless per §5)
     ▼
Optional Sentrdel reconciliation over the same sealed artifacts
  (correlation, dedup, enrichment; adds observations, never removes)
     ▼
Ascout kernel: findings lifecycle → ClaimAssessment → exit code   (sole authority)
```

**Engine Profile** (data, versioned per engine release) declares:
- argv and required flags (for example Gitleaks `--redact`; Trivy never `--quiet`);
- **version-qualified native** exit-code meaning (`clean`, `findings`, `error`, `no-input`), normalized *before* Engine Protocol v1; a scanner's findings exit (possibly nonzero) does not mean an internal transport failure; a zero native exit with parse errors or zero expected inputs is not a complete scan;
- formats produced, and the primary format per evidence kind (Trivy: native JSON primary, SARIF secondary);
- coverage signals: stderr patterns (Trivy parser `ERROR`), summary counters (Gitleaks commits scanned), required non-zero counts;
- the redaction requirement and a bounded, per-run, access-restricted output destination for each output. Any tool whose native writes cannot be bounded or made secret-safe is not admitted to that execution profile.

Profiles are validated against golden outputs captured from the pinned binary ([13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md)).

**Why format ingestors live in Ascout, not only in Sentrdel:** they are the only way to avoid a single point of failure without a second *claim* authority. The ingestors produce observations only. This does add a second SARIF parser alongside Sentrdel's. Mitigation: both repositories run the same **shared conformance corpus** (the real outputs above, redacted, plus future engines) in CI. Any divergence in the critical-field mapping fails both builds.

## 5. No-loss rule and critical fields

Every source field is either (a) mapped to a canonical observation field, (b) preserved in a bounded, redacted `attributes.native` record, or (c) listed as dropped, with a reason, in the ingestor's mapping table. Fields in the following list **may never be dropped**. A missing critical field in the source becomes an explicit `UNKNOWN`, never a default.

| Evidence kind | Critical fields |
|---|---|
| Any finding | engine identity (from the binary, not from SARIF `tool.driver`), rule/advisory ID, repository-relative location (rebased), severity as reported, fingerprint if present |
| Vulnerability | package ecosystem + name + installed version (PURL), all advisory IDs **and aliases**, fixed version(s), severity sources (vendor, CVSS vector/score), advisory source |
| Secret | rule ID, location, commit (history scans), **redaction state** |
| Misconfiguration | check ID, resource, file/line, pass/fail counts **per file** |
| SBOM | format and spec version, component PURLs, relationships, producer identity |
| Coverage | inputs discovered vs analyzed, parse failures (from stderr), skipped/unsupported files, engine-reported counters |

SARIF URI rebasing: `file://` absolute URIs and `uriBaseId` bases are rebased to the repository root only when the resolved real path is inside it. Otherwise the result is `UNRESOLVED_LOCATION`, kept as a finding without a location; the file is never rejected wholesale. The absolute path is never persisted.

## 6. Redaction

1. Run engines with their own redaction where available (Gitleaks `--redact`).
2. Collect every secret value detected by any engine in the run, plus generic credential patterns, and scrub all raw artifacts of those values.
3. Drop code-context fields (Trivy `Code.Lines`, SARIF `snippet`, `contextRegion`) by default. They are the observed leak path for **undetected** secrets.
4. **Never hand a native scanner a repository-controlled or predictable output path.** Capture stdout/stderr through bounded pipes. If an engine necessarily writes files, place them only in a broker-created per-run ephemeral directory outside the source checkout, with owner-only permissions, a strict size limit, controlled symlink policy, and a cleanup strategy for process crashes. Never store raw artifacts in repository paths, CI caches, GitHub uploads, shell transcripts, or diagnostic logs. On a platform without a qualifying restrictive location, refuse that scanner profile (`BLOCKED`) rather than claiming private execution.
5. **Persist only explicitly redacted and schema-validated outputs**, atomically from a bounded staging location; erase temporary raw files on success/failure/cancellation, and perform startup cleanup of abandoned broker-owned directories. Unredacted bytes should exist only transiently in memory **or an explicitly documented, isolated ephemeral spill directory when unavoidable**, not as general-purpose persisted evidence. The design must not claim that deletion guarantees physical erasure or crash-proof confidentiality.
6. If limits, output ownership, scrub coverage, or cleanup cannot be established, mark the run `INCOMPLETE`/`ERROR`, suppress sensitive output from receipts, and reject any `SUPPORTED` confidentiality or completeness claim.
7. Acceptance: scanning the evidence store **and diagnostic/log/artifact destinations** for planted values returns zero hits (FMT-06), including a terminated mid-output process, an interrupted cleanup, an undetected secret in an unrelated code-context field, and an engine that insists on a caller-supplied output path. Failure must not publish a partial unredacted receipt.

## 7. Degraded modes and failure behavior

| Condition | Behavior | Claim effect |
|---|---|---|
| Sentrdel unavailable | Scanners still run and are ingested. Capabilities only Sentrdel provides (JS/TS structural SAST, business-logic invariants, Supabase posture, CI-workflow rules) are `NOT_RUN(engine_unavailable)` | Security claim `INCOMPLETE` (exit 4), unless findings make it `REFUTED` (exit 1) |
| A scanner unavailable (exit 127 / missing) | Its capabilities are `NOT_RUN(engine_unavailable)` | `INCOMPLETE` if required |
| Scanner error (profile maps the exit to `error`, or a fatal on stderr) | `ERROR` for that engine run; partial output is ingested as observations but flagged `partial` | Never `SUPPORTED` |
| Zero inputs analyzed (Gitleaks "0 commits scanned", OSV exit 128, Syft empty) | `NOT_APPLICABLE` only if the planner predicted no inputs; otherwise `NOT_RUN(no_inputs_detected)` | No green by omission |
| Parse failures reported on stderr | Per-file coverage gap `PARSE_FAILED` | Coverage incomplete → `INCOMPLETE` for that capability |
| Malformed or oversize output | `MALFORMED_OUTPUT` | Never `SUPPORTED` |
| Engines disagree (one reports an advisory, another does not) | Union; the finding stays open with its producing engine; `ContradictionRecord` only when an engine explicitly asserts *not affected* | A finding is not removed by another engine's silence |
| Vulnerability DB unavailable or stale | Engine run `ERROR` or freshness `STALE` with DB timestamp recorded | Not `SUPPORTED` for vulnerability capability |
| Sentrdel reconciliation fails | Raw observations remain; findings marked `uncorrelated` | Duplicates possible; no evidence lost |

## 8. Acceptance tests defined by this document

| ID | Test (real binaries, pinned versions) | Pass condition |
|---|---|---|
| FMT-01 | Ingest Gitleaks, OSV-Scanner, and Trivy SARIF from the probe repository | 22/22 results become observations; OSV and Trivy locations rebased; no wholesale rejection |
| FMT-02 | Ingest Trivy JSON and SARIF for the same run | Native-JSON fields from §5 present; SARIF used only for cross-check |
| FMT-03 | Ingest CycloneDX (1.5, 1.7) and SPDX 2.3 from Syft, Trivy, and OSV-Scanner | Component PURLs, spec version, and producer preserved; OSV CycloneDX vulnerabilities ingested |
| FMT-04 | OSV GHSA and Trivy CVE results for the same packages | Correlated through aliases into one finding per advisory; `NSWG-ECO-516` preserved as a Trivy-only finding |
| FMT-05 | Unparseable Terraform | Coverage `PARSE_FAILED` for the file; capability `INCOMPLETE`; never `SUPPORTED` |
| FMT-06 | Planted secrets, including a deliberately terminated scanner, captured stderr, native output-file spill, and crash recovery | Zero plaintext occurrences in persisted evidence, diagnostics, caches, and publishable artifacts; no successful confidentiality claim unless raw-output containment/cleanup controls were verified |
| FMT-07 | Gitleaks on a non-repository directory; OSV with no lockfiles; Syft on an empty directory | `NOT_RUN(no_inputs_detected)` unless predicted; never `SUPPORTED` |
| FMT-08 | Each engine missing, wrong hash, untrusted self-reported version, unqualified supply source, and DB unavailable | `NOT_RUN(engine_unavailable)` / `VERSION_MISMATCH` / `BLOCKED(unqualified_engine)` / `ERROR`; exit 4 or 2; local hash or self-reported version alone is never publisher provenance |
| FMT-09 | Sentrdel absent while scanners present | Scanner evidence present; Sentrdel-only capabilities `NOT_RUN`; claim `INCOMPLETE` or `REFUTED`, never `SUPPORTED` |
| FMT-10 | Shared conformance corpus in Ascout and Sentrdel CI | Identical critical-field mapping on every corpus item |
| FMT-11 | Engine identity, provenance, exit-status translation, and a scanner with native nonzero findings | Record local binary identity separately from publisher/authenticity admission; enforce verified pin or qualified explicit trust. A native findings exit with valid output becomes a finding, not `ENGINE_ERROR`, while an unknown/fatal exit cannot become a clean transport 0 |
