# 19 — Planning Governance and Independent Review Path (Revision 2)

## 1. Diffcipline on PR #578: result kept, not waived

| Check | Result |
|---|---|
| Diffcipline v1.0.0, default policy, `--base origin/main` on #578 head `512b5bc1` | **FAIL**: 21 files > 12; 1,821 added lines > 400; no verification commands configured |
| Same with the proposed policy (#585: default limits, real verification commands) | **FAIL** on size only; the verification command ran and passed |
| Each revision-2 stacked PR (#579…) with the proposed policy | **PASS** within the default limits |

The limits are **not** relaxed. Diffcipline only supports a repository-wide `.diffcipline.toml`, and an `--enterprise-policy` file is merged with it and can only tighten it, so a documentation-only relaxation is not available. Even if it were, it would remove the scope control the founder asked to keep. #585 adds the missing verification commands and keeps the default limits.

## 2. What to do about #578 (founder decision FD-8)

The #578 diff stays above the limits however it is reviewed. Two compliant options:

| Option | How | Cost | Risk |
|---|---|---|---|
| **A — Review in bounded units, merge with a recorded, scoped exception** | Review #578 in the six units below; the founder records an explicit exception that names #578, its head, and the unit reviews. Diffcipline's FAIL stays visible in the record | Low churn; preserves the stack on top of #578 | The exception must be explicit and scoped to #578; it sets no precedent |
| **B — Re-slice #578 into six bounded PRs** | Re-carry #578's files in six PRs against `main` (no history rewriting; #578 is closed unmerged with a supersession comment); the stack's base changes | Six more PRs; the revision-2 stack must be re-based by merging, not rebasing | Duplicate review of the same text |

Recommendation: **A**. The content is unchanged by re-slicing, so B adds churn without adding scrutiny. A's units give the same bounded review. This is a recommendation only; FD-8 is the founder's decision.

**Review units for #578 (each ≤ 12 files and ≤ 400 added lines):**

| Unit | Files | Added lines |
|---|---|---|
| U1 | `README.md`, `00`, `01`, `docs/strategy/README.md` | 291 |
| U2 | `02`, `03`, `04` | 326 |
| U3 | `05`, `06`, `07` | 326 |
| U4 | `08`, `09`, `10`, `14` | 328 |
| U5 | `11`, `12`, `DECISION_LOG.md`, `SOURCE_PROVENANCE_REGISTER.md` | 357 |
| U6 | `13`, `15`, `TRACEABILITY_MATRIX.md` | 193 |

Units U3, U5, and U6 contain text that revision 2 amends. Reviewers should read them together with the stacked PR that amends them.

## 3. Classification of the review tools

| Tool | Status for architecture documents | Why |
|---|---|---|
| Alibaba Open Code Review | **UNAVAILABLE** | `ocr delegate preview` selected 0 of 21 files (`excluded: unsupported_ext` for all Markdown). LLM mode also had no endpoint configured. This is neither a pass nor a review |
| Jev (TypeSafe) | **ADVISORY** | A hosted judgment model returning probabilities. It prompted fixes to two real contradictions in revision 1, but it is not review and cannot satisfy a review gate |
| cubic, Qodo, CodeRabbit (GitHub apps on #578) | **NOT PERFORMED** | cubic over its monthly quota; Qodo trial ended; CodeRabbit skipped automatic review |
| Diffcipline | **MECHANICAL GATE** | Scope and verification-command gate, not a reviewer |
| `verify-planning-docs` (#585) | **MECHANICAL GATE** | Links, identifier definitions, FD status |
| Self-review by the authoring model | **NOT INDEPENDENT** | Same author |

## 4. Valid independent review path for architecture documents

A planning package is **review-complete** only when all three hold:

1. **R1 — Human review (required).** The founder or a reviewer the founder names reads each review unit and stacked PR and records findings in the PR. Checklist:
   - every OBSERVED claim cites a command, file, or CI run;
   - no FD is presented as approved;
   - every contradiction listed in [18](18_CONTRADICTION_RESOLUTION_LEDGER.md) is resolved or explicitly open;
   - the traceability rows map to defined tests;
   - no private repository content appears;
   - every port names its source file, license, and embedded upstream rights.
2. **R2 — Separate-model review (recommended, advisory).** A model from a different vendor than the authoring model reviews the documents read-only and records its findings. It is labeled `SEPARATE_MODEL_ADVISORY`; it can raise findings but cannot approve.
3. **R3 — Mechanical gates (required).** Diffcipline with the repository policy, and `verify-planning-docs --ids` on the package root, both pass at the exact PR head, or a failure is recorded with a founder decision (FD-8 for #578).

Ratification of any FD requires R1 and R3. R2 is recorded when it is available.

## 5. Founder decision guidance received (recorded as recommendations, not approvals)

The founder's revision-2 brief gave directions for FD-1…FD-6. They are recorded here as **review guidance**. No FD is approved by this record.

| FD | Guidance received | How revision 2 reflects it | Status |
|---|---|---|---|
| FD-1 | Recommend A07 with compatibility tests | ADV-01, ADV-02, receipt-shape tests in V0; `security` decoupled from A07 (C-14) | NEEDS-FOUNDER |
| FD-2 | Recommend Sentrdel CLI and release work | V1-T00…T02; FD-2 no longer blocks the scanner path (C-13) | NEEDS-FOUNDER |
| FD-3 | Reuse owner-controlled source only after exact-file rights and provenance checks | Per-file provenance lifecycle (V0-T09); Golam optional; embedded-rights register ([02](02_PORTFOLIO_SOURCE_INVENTORY.md) §4b) | NEEDS-FOUNDER |
| FD-4 | Permit clearly labeled trusted-local mode temporarily, without false containment claims | Human-only override capping claims at `TRUSTED_LOCAL`; per-platform table ([08](08_SECURITY_AND_TRUST_MODEL.md) §3.1) | NEEDS-FOUNDER |
| FD-5 | Reorder and defer phases rather than permanently delete capabilities | Re-entry criteria for every deferred phase ([11](11_IMPLEMENTATION_MASTER_PLAN.md) §3) | NEEDS-FOUNDER |
| FD-6 | Use evidence-based release gates, not an arbitrary date | Release gate in [13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md) §6 (L3 per claimed OS, B-CLM-1 = 0) | NEEDS-FOUNDER |
| FD-7 | (new) Adopt the repository Diffcipline policy and docs verifier (#585) | — | NEEDS-FOUNDER |
| FD-8 | (new) Option A or B for #578 (§2) | Recommendation A | NEEDS-FOUNDER |
