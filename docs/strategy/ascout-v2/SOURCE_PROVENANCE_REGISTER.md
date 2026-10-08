# Source Provenance Register — Ascout V2 Planning

Records the exact source identity of every component this plan proposes to copy, adapt, or invoke. **No code has been copied by this planning PR.** Each row must be re-verified at implementation time (the HEAD may have moved). A port PR must cite the exact file blob SHA it copies.

Founder authorization (from the planning brief) covers owner-controlled rights only. It does not cover nested third-party code or upstream vendors.

## 1. Owner repositories (selected components)

| Ref | Repository | Revision (observed 2026-10-08) | Path(s) | License evidence | Reuse | FD-3 needed |
|---|---|---|---|---|---|---|
| C01/C02 | `TheHalfMoon/Sentrdel` | `f5747319a50831ef7cee983d253c0ca5503c9a64` | `crates/*` (invoked as a binary, not copied) | `LICENSE` Apache-2.0; workspace `license = "Apache-2.0"` | COMPANION | No |
| P01 | `TheHalfMoon/Golam` | `13a379ac478a3abaff7ed1da3db14ff9c1ac2188` | `crates/golamd/src/native_containment_v2.rs`; `crates/golamd/src/bin/golam-native-exec-helper-v2.rs`; `crates/golamd/src/bin/golam-native-containment-hostile-probe-v2.rs` | **No LICENSE file; no `license` field in Cargo.toml** | SELECTIVE_PORT | **Yes** |
| P02 | `TheHalfMoon/Winds` | `3bfe45fec5c36ef1e407edf12c96ff5444f03847` | `src/process_scope.rs` | `LICENSE-APACHE`, `LICENSE-MIT`; `license = "MIT OR Apache-2.0"` | SELECTIVE_PORT | No (preserve the MIT/Apache notice) |
| P03 | `TheHalfMoon/Winds` | same | `README.md` §0.1 verification contract; `src/check.rs`; `src/git.rs` | as above | ADAPT semantics | No |
| P04 | `TheHalfMoon/Kodac` | `406b335277f2df1e3dedf24cdb45847dff919d44` | `packages/kodac-runtime/src/github-review/o4b-bounded-read-only-github-context.ts`, `o4g-bounded-github-review-publication.ts`, `o4i-bounded-production-publication-wiring.ts` | `LICENSE` Apache-2.0; `packages/kodac-runtime/THIRD_PARTY_NOTICES.md` to be checked for nested sources at port time | SELECTIVE_PORT | No |
| P05 | `TheHalfMoon/Diffcipline` | `1e6d14f77b95bb132b42276f10d67f1018ab5bb6` | `skills/diffcipline/`, `skills/diffcipline-review/`, `action.yml` | `LICENSE` MIT | ADAPT structure | No |
| P06 | `TheHalfMoon/commandF` | `f82565cca917d119e1c774b2c470e2ac20e0d6dd` | `crates/commandf-pkg/src/check_sarif.rs` | **No LICENSE file** | REFERENCE (re-implement if FD-3 is not granted) | Yes if copied |
| P07 | `TheHalfMoon/Deskal` | `be21813d29e4faf4887a9b23f67b2158ce247832` | `crates/qdral-approval/src/lib.rs` | `LICENSE` Apache-2.0 | ADAPT semantics | No |
| F01 | `TheHalfMoon/Kodac` | as P04 | `packages/kodac-runtime/src/trust/sandbox-observer-gvisor*.ts`, `src/execution/gateway-gvisor-*.ts`, `native/gvisor-*.c`, `native/landlock-run.c` | Apache-2.0 | REFERENCE | No |
| K-1…K-15 | `TheHalfMoon/Kodac` | `406b335277f2df1e3dedf24cdb45847dff919d44` | `packages/kodac-runtime/src/execution/gateway.ts`; `src/evidence/{store,receipt,ledger}.ts`; `src/trust/approval.ts`; `src/verification/engine.ts` (env allowlist); `native/landlock-run.c` + `src/trust/confinement-linux-landlock.ts`; `src/reviewer-intelligence/qualification*.ts`; `src/continuous-assurance/p9-*.ts`; `src/workflow/o2-durable-workflow-evidence-kernel.ts`; `src/compatibility/*`; `provenance/`, `schema/provenance-*.schema.json`, `tools/validate_provenance.py` | Apache-2.0. **`native/landlock-run.c` is BSD-3-Clause, adapted from `deepseek-ai/deepseek-harness` @ `47f943859bef60e4160492346772ded9b24f765a`**; the notice must travel with the port. Other listed files are not named in Kodac's THIRD_PARTY_NOTICES (re-verify per file) | PORT ([16](16_KODAC_CONVERGENCE_ANALYSIS.md)) | No (third-party BSD notice for K-6) |
| K-13 (retained) | `TheHalfMoon/Kodac` | same | `src/edit/patch.ts` (OpenCode, MIT); `src/agent/{tool-result-pruning,repeat-call-signal,guarded-tool-pipeline}.ts` (HKUDS DeepCode, MIT) | Embedded third-party MIT | RETAIN in Kodac; not copied | — |
| F02 | `TheHalfMoon/Deskal` | as P07 | `apps/qdral-mcp/` | Apache-2.0 | REFERENCE | No |
| F03 | `TheHalfMoon/Winds`; `TheHalfMoon/Delethos` (`5b8f5f28239bbd0b2a366824fd14c1b6c01058b8`) | as above | `src/agentic_claude.rs`, `src/agentic_codex.rs`; `packages/adapters/src/*.ts` | Winds MIT/Apache; Delethos MIT | REFERENCE | No |
| F05 | `TheHalfMoon/MSTR` | `e87328872232471fa0e1eb05d74223bc0aeaafd3` | `src/mstr_qualify/` | **No LICENSE file** | REFERENCE (method only) | Only if copied |
| F06 | `TheHalfMoon/kernux` | `2085b6ed1121b1a94c66c076bdd6b578da4dad0d` | `crates/kernux-policy/src/egress.rs`, `crates/kernux-store/src/cas.rs` | `LICENSE` Apache-2.0 | REFERENCE | No |

## 2. External upstreams (invoked, not copied)

| Ref | Upstream | Identity (observed) | License | Notes |
|---|---|---|---|---|
| C03 | `alibaba/open-code-review` | `182898cf522da3d04157b422752d028417974e19`, v1.12.12 | Apache-2.0 | Ascout's current pin is `5f8e5ab328e1449ba4d5f14d2a7542117543d753` (16 commits behind) |
| C04 | `microsoft/playwright` | 1.63.0 pinned (upstream v1.64.0) | Apache-2.0 | **Notice missing** (G11) |
| — | `cloudflare/security-audit-skill` | `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8` | MIT | REFERENCE (method) |
| — | `google/artemis` | vendored `371aa6df56880643da57b30da936e9812fb0ec66` (upstream `351ca8422f7b5b54e80a9c1ce03a222e02415b6b`) | Apache-2.0 | Existing vendored donor; frozen |
| — | `aquasecurity/trivy` v0.75.0, `google/osv-scanner` v2.6.0, `anchore/syft` v1.54.1, `gitleaks/gitleaks` v8.30.1, `opengrep/opengrep` v1.30.2, `semgrep/semgrep` v1.180.0, `stryker-mutator/stryker-js` v10.0.0, `google/gvisor` release-20260928.0 | latest release tags observed | Apache-2.0 / MIT / LGPL-2.1 | User-installed; never bundled |

## 3. Explicitly not admitted

| Source | Reason |
|---|---|
| `TheHalfMoon/Golam-research` | Reconstruction of a third-party proprietary application |
| `TheHalfMoon/Qdrat` (Horilla HRMS) | Third-party LGPL domain application |
| `GoCodeAlone/ARES` | Inaccessible (404) |
| Private owner repositories | Not selected; Ascout is public |
| `anthropics/skills` | No license detected; we write our own skill |
| CodeQL CLI binaries | Use-restricted terms |
