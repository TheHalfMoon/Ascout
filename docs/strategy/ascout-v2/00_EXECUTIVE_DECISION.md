# 00 — Executive Decision

**Status:** PROPOSED — requires founder ratification.
**Base:** `main` @ `ca6b6f514e5a8881e2cfa2789b5e5ea43e3aaaad`.

## 1. Decision

Ascout V2 adopts **Option B+ — one trust kernel with out-of-process companion engines behind a single versioned Engine Protocol and a single Execution Broker** (see [06](06_ARCHITECTURE_OPTIONS.md)).

1. **Ascout core (TypeScript, Node 22+) remains the only assurance authority.** It owns targets, intents, plans, evidence normalization, findings lifecycle, coverage, omissions, contradictions, claim assessment, exit codes, and receipts. No engine, model, scanner, sandbox, or CI job can emit PASS or VERIFIED.
2. **Sentrdel remains a separate Rust repository and ships as a prebuilt companion binary.** It becomes Ascout's single security-evidence engine, including fan-in of optional third-party scanners through its existing bounded SARIF adapter. Ascout never talks to Trivy, Gitleaks, OSV-Scanner, or Syft directly. That avoids two security ingestion paths. *(Revision 2: superseded by [17](17_SECURITY_EVIDENCE_INTEROPERABILITY.md); real-scanner experiments showed this design rejects 20 of 22 real SARIF results and has no SBOM path.)*
3. **Alibaba Open Code Review (`ocr`) is the review engine**, run either with a user-funded or local OpenAI-compatible endpoint (BYOK/local) or in OCR **delegation mode**, where the host coding agent performs the LLM step and Ascout records the result with a lower independence class.
4. **Kodac is not imported as a runtime.** Exactly one Kodac component is selectively ported: the origin-pinned GitHub review transport (O4b/O4g/O4i). Its gVisor and Landlock research is used as a qualification reference only. No provider abstraction is needed, because OCR resolves LLM endpoints itself. Kodac's Done Gate is superseded by Ascout ClaimAssessment.
5. **One Execution Broker** (target state from V3) owns every child process Ascout launches. In V1–V2, engines run through the existing bounded process layer (`src/process.ts`: timeouts, output caps, process-tree kill), which V3-T01 then wraps into the broker. Every receipt before V3 declares tier `T0 TRUSTED_LOCAL`. It declares an honest containment tier per platform, sourced from Golam (Linux Landlock + seccomp), Winds/Sentrdel (Windows Job Objects and process-tree lifetime), and Kodac (optional gVisor on Linux). Untrusted-code execution stays refused unless a qualified tier is available. macOS has no qualified isolation donor and is declared `TRUSTED_LOCAL_ONLY` until one is built and qualified.
6. **One exit-code taxonomy for every command.** The existing `check` taxonomy (0 clean-complete, 1 fail/findings, 2 error/unknown, 3 tree drifted, 4 incomplete) is extended to `review`, `test`, and `security`. A command that executes nothing that was requested never exits 0. This is a **compatibility change that requires a constitutional amendment** (proposed A07).
7. **No plugin marketplace, daemon, hosted backend, database, or mandatory model** in V2's P0/P1 scope.

## 2. Why redesign is needed (evidence summary)

| Finding | Evidence | Consequence |
|---|---|---|
| Sentrdel's shipped binary is a stub | `crates/sentrdel-cli/src/main.rs` prints `Sentrdel bootstrap — implementation in progress` and returns `Success`; built and run on Linux (OBSERVED) | UA-P06's "security integration" cannot execute end to end; Ascout's Sentrdel modules are validators over hypothetical output |
| `ascout review` exits 0 without reviewing | Probe: `outcome: NOT_RUN`, exit 0 (OBSERVED, [01](01_LIVE_REPOSITORY_AUDIT.md) §4) | An agent that checks `$?` reads success |
| `ascout test` exits 0 without testing | Probe: "plan only, no execution", exit 0 (OBSERVED) | Same |
| No `ascout security` command exists | `src/cli.ts` command list is `init, doctor, check, review, test` (OBSERVED) | 8 of 16 UA-P06 tasks are done, but zero security checks can run |
| Kodac integration is `PATTERN_ONLY`, Sentrdel is `REFERENCE_ONLY` | `src/assurance/workflow/kodac-source-pin.ts:27`, `src/assurance/security/sentrdel-source-pin.ts:42` (OBSERVED) | Six phases built contracts around engines that never run |
| No untrusted-code containment on any platform in Ascout | Constitution IV; no containment code in `src/` (OBSERVED) | "Verify AI-built software" is out of scope by the current trust model, because agent PRs are untrusted input |
| Release path absent | `package.json` `private: true`; no release workflow; no signing (OBSERVED) | No user can install Ascout, Sentrdel, or Winds-style tools except from source |
| Sentrdel does not build on a stock Windows dev machine | `regorus 0.11.0 → msvc_spectre_libs` build failure (OBSERVED) | Prebuilt binaries are mandatory; building from source is not a user path |

The existing plan (UA-P00–UA-P18) is high quality on **semantics** but is ordered **contract-first, execution-later**. Six phases (P01–P05 plus half of P06) produced roughly 31,000 lines of assurance TypeScript, yet the product still cannot run one third-party engine. V2 changes the ordering principle. **Every phase must end with a user-runnable command that executes a real engine and produces a real claim.**

## 3. What is preserved

"Preserved" means the code, tests, and history are kept and built on. It is **not** a claim that these modules execute end to end. Their observed evidence is limited to: CI green at `ca6b6f51` (unit, contract, and adversarial-fixture tests on 3 OSes × 2 Node versions), plus the CLI probes in [01](01_LIVE_REPOSITORY_AUDIT.md) §4. Per-module execution status is in [01](01_LIVE_REPOSITORY_AUDIT.md) §6: only `check`, `doctor`, and `init` execute from the CLI today.

- The constitution (v1.3.0) and all ratified amendments A04–A06. V2 proposes one new amendment (A07); it weakens nothing.
- All 22 `src/assurance/contracts/*` (15) and `src/assurance/kernel/*` (7) modules: target, intent, policy, plan, engine descriptor/qualification/run, evidence ref, finding, coverage claim, missing/conflict, claim assessment, canonical serialization, validators, authority, effect authority, omissions, and planner.
- `ascout check` and its receipt v1.0 schema, which are byte-compatible.
- The Playwright browser path (`src/browser/*`), quality modules, and the review normalization pipeline (`src/assurance/review/*`).
- The Sentrdel normalization modules (UA-P06-T01..T08), which become the consumer side of the real engine.
- All canonical history, PRs, specs, and evidence. Nothing is deleted or rewritten.

## 4. What changes

| Old | V2 |
|---|---|
| Contract-first phase order (P07 Cloudflare audit, P08 Kernux bridge, P09 lab, P10 remote runtime, P11 cyber…) | Vertical slices V0–V8 ([11](11_IMPLEMENTATION_MASTER_PLAN.md)); P07, P08, P10, P11, and P12 deferred or superseded |
| Ascout normalizes each security tool separately | Sentrdel owns security fan-in; Ascout consumes one Sentrdel envelope |
| Review requires a qualified engine path that never executes | OCR executes in BYOK/local mode or delegation mode, with independence classes recorded |
| `test` is plan-only | `test` executes (STANDARD = `check` adapter + runner execution); `--plan` keeps the plan output |
| Kodac convergence by re-implementing patterns in Ascout | Selective port of three Kodac components; no further Kodac pattern replication |
| Containment deferred to remote runtime (P10) | Local Execution Broker with qualified tiers in V3 |

## 5. First work packet after approval

**V0 — Truthful baseline**, then **V1 — First real engine slice (Sentrdel)**. Details are in [11](11_IMPLEMENTATION_MASTER_PLAN.md) and [12](12_TASK_REGISTRY.md).

V0 (Ascout repository, small, no new dependencies):

1. `V0-T01` — Amendment A07 proposal: unified exit-code taxonomy and `--plan` semantics.
2. `V0-T02` — `ascout review` and `ascout test` return exit 4 when nothing requested was executed. Add adversarial tests.
3. `V0-T03` — Add Playwright to `THIRD_PARTY_NOTICES.md`; reconcile `ascout_version` (`0.1.0-m1` in receipts vs `0.1.0` in `package.json`).
4. `V0-T04` — Correct the OCR binary identity (`ocr`, not `open-code-review`) and re-pin OCR (current pin is 16 commits behind `182898cf…`).
5. `V0-T05` — Update the `README` command surface to match the CLI.

V1 (Sentrdel repository first, then Ascout):

1. `V1-T01` — Sentrdel: implement real CLI dispatch for `sentrdel review --format json` that composes the existing library functions. The binary must never exit 0 without executing.
2. `V1-T02` — Sentrdel: cross-platform release workflow (Linux x64/arm64, macOS arm64/x64, Windows x64) with checksums and provenance attestations; fix the Windows `msvc_spectre_libs` build path.
3. `V1-T03..T08` — Ascout: `ascout security` executes the pinned Sentrdel binary through the Execution Broker, normalizes output through the existing UA-P06 modules, produces a ClaimAssessment, and maps it to the unified exit taxonomy.

This is the smallest end-to-end deliverable that validates the most important architecture decisions: out-of-process engine, single authority, honest absence, exact source binding, and cross-platform distribution of a companion binary.

## 6. Readiness verdict

**Ready for founder review. Not ready for implementation authorization.** Three founder decisions are blocking (see [15](15_IMPLEMENTATION_READINESS_AUDIT.md)):

- **FD-1:** ratify Amendment A07 (exit-code taxonomy across commands; a compatibility change).
- **FD-2:** authorize Sentrdel repository work (CLI dispatch and a release pipeline).
- **FD-3:** attest relicensing of owner repositories that have no LICENSE file before any code is copied from them (Golam, commandF, MSTR, Ecra, and others listed in [SOURCE_PROVENANCE_REGISTER](SOURCE_PROVENANCE_REGISTER.md)).

This plan does not claim to guarantee a best-in-class product. It claims to be the shortest defensible path from the current code to a product that executes real engines and never reports green by omission.
