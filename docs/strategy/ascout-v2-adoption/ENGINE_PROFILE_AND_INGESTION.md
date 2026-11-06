# Engine Profile v1 and Security Evidence Ingestion

**Status: PROPOSED ENGINE CONTRACT, not shipped.** First primary scanner candidate is **Gitleaks 8.30.1**, because the October V2 research ran that binary on Windows with synthetic credentials; that is a historical feasibility result, **not** an admission of current Windows/macOS/Linux bytes or a claim that 8.30.1 is latest. The first real-engine path is **BLOCKED** until each used platform's exact bytes, license and provenance are qualified. Ascout claim kernel remains the only PASS authority.

## 1. Exact proposed module structure and trust boundary

| File (new unless noted) | Responsibility |
|---|---|
| `src/assurance/engines/engine-profile-v1.ts` | **C:** type + structural validator for a serialized EngineProfileV1 and exact trusted manifest match |
| `src/assurance/engines/engine-envelope-v1.ts` | **C:** parse and validate `ascout-engine/1` envelope, request ID/source/capabilities, bounded output |
| `src/assurance/engines/execution-broker.ts` | **C:** own absolute binary path, argv, env, cwd, process-tree timeout and bounded capture via current `src/process.ts` |
| `src/assurance/engines/gitleaks-profile.ts` | **C:** fixed per-OS release profiles whose source SHA and native command flags must be proven by real `--version`/`--help` capture before enabling |
| `src/assurance/engines/gitleaks-adapter.ts` | **C:** version-specific native exit decoding, secret redaction, source path rebasing, coverage/omission mapping |
| `src/assurance/security/security-command.ts` | **M only after earlier gates:** request capabilities, run one admitted scanner, submit observations to kernel; never self-mark SUPPORTED |
| `tests/assurance-engine-profile-v1.test.ts`, `tests/assurance-engine-envelope-v1.test.ts`, `tests/assurance-execution-broker.test.ts`, `tests/assurance-gitleaks-real.test.ts` | **C:** positive, error and malicious-configuration fixtures; real binary tests are explicitly L2/L3 |
| `.github/workflows/real-engines.yml` | **C:** pinned engine acquisition, no actual secrets, three OSes × 2 supported Node versions, native captures and immutable artifacts (subject to admission) |

No other `src/**` change is allowed by this spec, and no code is written by this documentation PR. Existing `src/process.ts` is **M** only in bounded broker PR. A new renderer, daemon, database, model endpoint, downloader at verification time, arbitrary plugin or user-controlled executable path is **out of scope**.

## 2. EngineProfileV1 — normative design-level shape

**Serialization choice:** TypeScript `Readonly<EngineProfileV1>` constants in `gitleaks-profile.ts` with one canonical JSON representation for its SHA-256 policy digest; **no JSON file from the subject repository is trusted to modify runtime policy**. Validate all fields strictly, reject extra/unknown keys in serialized data, reject unknown versions/OS/arch/exit statuses. Structure proposed to the implementer:

```ts
type OS = "win32" | "linux" | "darwin";
type Architecture = "x64" | "arm64";
type NativeExit = "CLEAN" | "FINDINGS" | "NO_INPUT" | "ERROR";
type EngineProfileV1 = Readonly<{
  schema: "ascout-engine-profile/1";
  engine_id: "gitleaks"; profile_id: string;
  release_version: string; platform: OS; arch: Architecture;
  artifact: Readonly<{
    source_url: string; sha256: string; license_spdx: string;
    provenance_reference: string; pinned_release_digest: string;
  }>;
  executable_absolute_path: string;
  argv: readonly string[]; // fixed from independently probed exact binary
  requested_capabilities: readonly string[];
  config_sha256: string; // verified fixed config, never repository-selected
  native_exit_map: Readonly<Record<string, NativeExit>>;
  output_format: "gitleaks-json-v1"; coverage_mode: "explicit_changed_files";
  budget: Readonly<{
    max_wall_ms: number; max_stdout_bytes: number; max_stderr_bytes: number;
    max_input_bytes: 65536; max_network_requests: 0;
  }>;
  source_egress: "DENY"; network: "DENY";
  independence: "DETERMINISTIC_TOOL";
}>;
```

**Admission state is external to the profile.** A 64-character SHA-256 establishes bytes, not publisher authenticity. A trusted provenance record and exact release artifact, license, notices, platform and configuration digest must be validated and recorded before an executable is eligible. Unknown checksum, invalid rights, missing artifact or a contradictory `--version`/help probe => `UNAVAILABLE` or `VERSION_MISMATCH`, never fallback to PATH or latest release. **No example hash is fabricated here.** Platform matrix rows without exact admitted bytes are **BLOCKED**. Record all download/access events during explicit setup; no network needed for verification runs.

The broker must not inherit full host environment or project Git configuration. It enforces no shell, absolute executable path, exact argv templates, scrubbed env, user-owned isolated temp report directory, bounded stdin/stdout/stderr, cancellation and complete owned process-tree cleanup. Timeout or cleanup uncertainty is ERROR/BLOCKED; T0 is not containment. **No untrusted Git, model, package or script execution is authorized.**

## 3. Engine Protocol v1, wrapper and deterministic outcomes

The protocol is `ascout-engine/1`, a request bounded to **64 KiB stdin** and an exact matching `request_id`, target full HEAD/tree/base digest, requested capability IDs, budget, network/source-egress policy. Native scanners do not speak it; the **Ascout-side wrapper** produces a validated envelope from real native output after checking executable identity, actual process completion, native exit semantics and coverage.

- **Required output:** `protocol`, `request_id`, `engine.id/version/build`, `execution.state/timestamps`, every requested `capabilities[].id/state/coverage`, normalized redacted `observations`, `diagnostics`, digest of effective profile. Missing requested capability becomes explicit NOT_RUN, not an empty success.
- **Status lattice:** `EXECUTED` only for an actual qualified and correctly parsed run; `NOT_RUN` never started, `UNAVAILABLE` missing executable, `VERSION_MISMATCH` checksum/version failed, `DENIED_BY_POLICY` blocked, `MALFORMED_OUTPUT` invalid or unbounded results, `ENGINE_ERROR` unexpected process/exit, `TIMEOUT`, `INCOMPLETE` partial coverage. Observations themselves are not claim assessments.
- **Native findings exit:** a version-admitted engine may return a nonzero findings exit that must be interpreted via the *verified profile*, not as automatic wrapper failure or automatic PASS. Unknown exit/fatal stderr => ERROR; clean exit with no valid report/coverage => INCOMPLETE/ERROR; executable absence => NOT_RUN.
- **Claim mapping:** an admitted deterministic contradictory finding may yield claim REFUTED *only after A07 and independently checked source scope, rule, severity and evidence*. `SUPPORTED` requires complete qualified requested coverage, current start/end tree and no qualified contradictory evidence. Missing work => proposed exit 4; source drift => 3; verified problem => 1 **with independent completeness flag**; internal/unknown => 2; complete clean => 0. No new CLI status without FD-1. Existing `check` v1.0 is unchanged.

## 4. First Gitleaks JSON mapping, no-loss rules

| Input field or condition (native Gitleaks JSON) | Ascout normalized observation | Failure/redaction behavior |
|---|---|---|
| `RuleID` | `rule_id`, engine provenance and pinned descriptor | Unknown rule never becomes an invented severity; no self-assigned validated claim |
| `File` and `StartLine/StartColumn/EndLine` | relative location only after canonical realpath under selected source tree | Outside-root/absolute URI leaks become `UNRESOLVED_LOCATION` with finding kept but path stripped; no traversal |
| `Description` | bounded diagnostic text after secret/path redaction | Error on unsafe/unredactable payload; no raw secret in receipt |
| `Secret`, `Match`, `Fingerprint` | **never persist raw**; record a scoped nonsecret local finding ID not derived from raw secret bytes | Raw scanner output lives only in restricted ephemeral temp; forbid cloud upload/CI logs; erase promptly |
| `Commit` | only if verifiably bound to the requested repository/head and scan intent | Stale/unmatched history => STALE/INCOMPLETE, not current evidence |
| clean JSON with full declared scope | zero observed findings + coverage record with actual files selected and analyzed | Empty input or skipped files are NOT_RUN/INCOMPLETE, never conclusively clean |
| malformed/oversize/truncated output, unexpected exit, fatal stderr | error diagnostic and omitted required capability | no wrapper `EXECUTED`, no claimed PASS |

**Config provenance:** test-time configuration must come from a fixed hash-verified bundled profile; a repository `.gitleaks.toml` or user-supplied config **must never silently replace** it. Future opt-in configuration requires a separately reviewed policy digest and explicit downgraded trust/coverage. Normalize findings before persistence; do not record raw matching text, realpaths, tokens or a secret-derived fingerprint. Document all unsupported languages/files in `coverage.unsupported`.

**Other engine formats are not implicitly implemented by this Gitleaks slice.** SARIF 2.1.0, CycloneDX, SPDX 2.3, OSV JSON and Trivy JSON need separately approved per-format mapping specs before V1-T08. Fixed invariant: preserve rule ID, severity, locations/URIs, artifact identity, SBOM PURL/version, aliases, redaction state and coverage. For SARIF, only rebase absolute/`uriBaseId` locations within repository root; outside roots become `UNRESOLVED_LOCATION` rather than discarding findings. Unknown severities are UNKNOWN, not LOW. A future multi-engine aggregate is set union of attributed findings plus independently visible coverage; it does not suppress disagreement. Missing format implementation = NOT_RUN, not QUALIFIED.

## 5. Real first-slice test/evidence contract

**L0:** pure parser/normalizer tests with synthetic malformed output; **L1:** captured pinned native output parsed without executing; **L2:** actual checksum-verified Gitleaks executed through Ascout broker on one named OS; **L3:** independently qualified execution through Ascout on **every OS/arch claimed** with exact-head CI and verified receipts. Unit-test green never promotes L0 to L2.

The native test suite must include synthetic-only planted secret generated at runtime in a disposable OS temp tree, clean negative control, known-uncovered file, stale tree digest, forged manifest, bad runtime exit, unknown rule ID, path traversal, raw-secret redaction, no explicit config, malformed/truncated JSON, PATH-shadow binary, plugin-controlled argv/env and enforced network-deny. **Do not commit secret-shaped fixtures**, even synthetic ones. Capture artifact SHAs and redacted receipts only. Verify only that what actually executed is reported; unsupported capabilities (e.g. CI IaC, Trivy/Syft/OSV) remain explicit NOT_RUN. Distribution claims are denied until all named targets actually pass their native runs.

**This file is a spec to review; it is not proof of a qualified Gitleaks artifact, complete field mapper, source rights or deployed scanner.** Any unreviewed sub-interface, missing per-platform byte or inconsistent native help trace blocks code implementation and requires its own narrowed spec change.
