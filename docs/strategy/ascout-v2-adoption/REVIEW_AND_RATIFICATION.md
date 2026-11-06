# Review, Founder Decisions and Ratification Gates

**As of 2026-11-06 — PROPOSED, NOT RATIFIED.** This is a new docs-only branch rooted at current canonical `main@ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430`. No source, tests, vendor, registry metadata, CI file or runtime rights have been changed by this plan.

## 1. Actual EGM/Pulse review evidence

Google [Elephant-Goldfish Model](https://github.com/google/elephant-goldfish-model) reviewer personas/standards were obtained from `google/elephant-goldfish-model@6a8001ea31ccf72430ba0603a467ec6df9f69dd7`. On Windows, OpenCode CLI used **`opencode/pulse-alpha-free`** with fresh, separate `--agent plan` sessions and no conversation carry-over, each reading the target proposal and relevant sources read-only. This is an **EGM-style fresh-context review using the Google source personas**, not a native EGM plugin orchestration run.

| Reviewer | Review of the older stacked proposal | Result |
|---|---|---|
| Comprehension | Complete, exited 0; contradictory old executive summary and ambiguous proposal/adoption lineage | REVISE |
| Codebase details | Complete, exited 0; current `main` vs proposal source audit; 7 major source/plan defects | REVISE |
| Implementation readiness | Complete, exited 0; **6 Blocker, 11 Major, 6 Nit** findings, especially code lineage, unspecified engine profile and file scopes | REVISE |
| Design critic | Model accessed an older dirty local Ascout checkout before attempting to verify current GitHub source; it did not return a final report | INCOMPLETE / NOT COUNTED |

The full first-round summary is in [historical Pulse report, signed proposal commit](https://github.com/TheHalfMoon/Ascout/blob/4cce1e4460b33eff8388dac6559e7022d5cb2af5/docs/strategy/ascout-v2/26_PULSE_GOLDFISH_FIRST_ROUND_2026-11-06.md). Reports are advisory **not human R1, founder authorization, proof of actual scanner execution or release evidence**.

**Second-round advisory progress:** new main-rooted PR [#653](https://github.com/TheHalfMoon/Ascout/pull/653) at signed first commit `5c8f9205982b10da2c87b463157c82b5589c7964` has an independently completed Pulse **Implementation Readiness** review (verdict **REVISE**, E0 observation GO; blockers in E1–E5) and Pulse **Design Critic** review (verdict **REVISE**, existing engine qualification/egress/coverage/immutable-snapshot/provenance/secret-handling findings). We have revised the draft to add explicit safeguards and [first-sprint test matrix](FIRST_SPRINT_TEST_MATRIX.md); the final post-edit HEAD must be reviewed again. This does not change FD/R1 status.

**This main-rooted rewrite addresses the critical lineage concern without merging the historical code tree.** The revised document now fixes current CLI baseline, names packet file allowlists, defines an EngineProfileV1/type envelope, an initial Gitleaks field map, and a reproducible E0 truth-table artifact. **A new independent Pulse Goldfish review of this exact revised branch is still mandatory; old reviewer verdicts do not transfer.**

## 2. Founder decisions — recommendations only

Do not infer an FD decision from a request to finish a plan. The table is a bounded, ready-to-review decision packet; every row remains **NEEDS FOUNDER** pending scoped written disposition.

| Decision | Recommended founder choice | Material restriction |
|---|---|---|
| FD-1 / A07 | Ratify truthful exit taxonomy and independently qualified `REFUTED`; migrate `security` NOT_RUN exit 1→4 plus `review/test` false-green exits with compatibility tests. | No silent switch in `check` receipt v1.0 or old shell callers. |
| FD-2 | Permit a separate Sentrdel CLI/release PR; first Gitleaks vertical slice proceeds independently after its own security gates. | No Sentrdel stub PASS or unreviewed cross-repository release. |
| FD-3 | Defer third-party files whose exact embedded rights and provenance are unverified; admit only pinned, rights-cleared source. | User ownership or permission for top-level donor does not waive nested licenses. |
| FD-4 | Permit labeled human-only T0 trusted-local mode on owner-controlled code, but default-block untrusted code pending host-specific filesystem+network isolation proof. | No agent override or false T1 claim from a Job Object. |
| FD-5 | Prioritize executable V0–V5, defer UA-P07/08/10–12 with explicit re-entry triggers and preserve earlier history. | No silent deletion of canonical requirements. |
| FD-6 | Release only after zero false PASS, actual L3 on each claimed OS, independent security review, rights/privacy/egress checks, signing and install/uninstall. | No date-based waiver or release now. |
| FD-7 | Admit a source-pinned planning verifier/Diffcipline policy only with qualified negative fixtures and explicit approved scope. | Experimental #585/#607 PASS does not itself change governance. |
| FD-8 | **Prefer safely superseding root #578 unmerged** with this new compact, main-rooted **docs-only proposal**, while preserving the old document commits as reference; no oversized/unknown-source merge. | This is an alternative to original Option A exception / B re-slice and requires a specific founder disposition; no automatic closure of #578 or constitutional re-interpretation. |

**Decision record required:** `FD-N | selected option | exact PR/SHA | founder/reviewer identity | date | conditions | human R1 review reference`. A blank record is PENDING, not YES. Any change to the constitution requires the separately established amendment process; no assistant/model can self-approve an FD or overrule an existing policy.

## 3. Independent R1, mechanical and platform gates

| Gate | Required evidence / present state |
|---|---|
| **R1 human** | Founder or named reviewer reads **the new main-rooted docs-only PR**, records line-level findings and formal disposition. If founder instead chooses root #578 Option A, original review units U1–U6 must be reviewed and exception scoped. **PENDING.** |
| **R2 advisory** | Fresh Pulse Goldfish pass on the **exact final signed branch HEAD after fixes**, independently checking comprehension, design, codebase fit and zero-decision implementation readiness. Initial second-round Design Critic and Implementation Readiness were REVISE; fixes require a **new** review. No PASS is claimed by those runs. **PENDING final verdict.** |
| **R3 mechanics** | Source-bound `git diff --check`, zero link/ID verifier defects under approved policy, bounded Diffcipline file/line budget, DCO/signed commit, package/notice tests and exact-head CI. The original [#607](https://github.com/TheHalfMoon/Ascout/pull/607) script is *proposed* not adopted; do not claim it is constitutional. **PENDING on new HEAD.** |
| **CI supported OSes** | Windows 2025, Ubuntu 24.04, and macOS 15 (not retired macOS 14), with Node 22/24; exact-HEAD `Project CI` and `Self Verification`. New macOS 15 CI fix is separate [#652](https://github.com/TheHalfMoon/Ascout/pull/652). **PENDING for this branch.** If #652 is not adopted, project CI macOS 14 cancellation is recorded as **CANCELLED**, never PASS. Doc review may proceed, but full cross-platform ratification/claimed-macOS release remains BLOCKED until a supported-runner exact-head CI passes or the founder explicitly changes the claimed platform scope via recorded governance. No silent macOS waiver. |
| **Security/rights** | Real emitted artifacts and pin/rights evidence for any native engine; hostile Git config and untrusted runtime must fail closed. **NOT RUN / BLOCKED** until own source/host qualification. |
| **Release** | End-to-end real engines and all claimed-platform L3, zero false PASS, no unconsented source export, reproducible releases. **NOT READY**. |

## 4. Technical closure rules and next source change

- **E0 evidence-only observation may begin on a disposable clone**, because it records actual behavior and changes no production files. It is **not** permission for a source patch or to execute untrusted code. Record exact full SHA, outputs, omissions and fixture provenance as described in [IMPLEMENTATION_FREEZE.md](IMPLEMENTATION_FREEZE.md).
- **E1 Git hardening** remains blocked by the confidential GIT-CONFIG-EXEC implementation specification and hostile fixtures; do not publish exploit-sensitive details in a public planning PR.
- **E2 exits and E6 execution** remain blocked until FD-1/A07; **E4/E5** remain blocked by native profile/pin/privilege approvals and zero-decision schema/test review.
- **E7–E9** are dependency-ordered future phases with explicit missing qualification. No engineer or agent may decide a new confinement technique, cloud endpoint or release exception outside a reviewed packet.
- **Plan can be labeled READY FOR FOUNDER RATIFICATION only** after second-round reviewers return and new PR's mechanical checks pass; **IMPLEMENTATION GO** additionally needs founder FD authorization and R1/constitutional approval. Document quality and source runtime readiness are different claims.

**Final proposed disposition:** SAFE DOCS-ONLY PLAN FOR REVIEW; no source merge, donor copy, model-generated R1 approval, automatic implementation or release.
