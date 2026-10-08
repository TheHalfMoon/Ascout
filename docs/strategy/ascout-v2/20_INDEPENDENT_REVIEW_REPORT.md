# 20 — Review Report for Revision 2

## 1. What this report is, and is not

**This is not an independent review.** No independent reviewer was available in this session (§2). The report has two parts: the mechanical gates (R3), and an adversarial review written by the authoring model, which by definition is *not independent*. It exists so that the human reviewer (R1, required by [19](19_PLANNING_GOVERNANCE_AND_REVIEW_PATH.md) §4) starts from a list of known weaknesses rather than a clean-looking package.

## 2. Review attempts (OBSERVED 2026-10-08)

| Path | Attempt | Result |
|---|---|---|
| R1 human review | — | **NOT PERFORMED** (required before ratification) |
| R2 separate-model review | Gemini CLI 0.62.0, read-only plan mode, isolated copy of the package | **UNAVAILABLE**: `IneligibleTierError` (Google no longer supports this client for individual Gemini Code Assist accounts) |
| R2 separate-model review | `pi` 0.87.1 → OpenRouter → `moonshotai/kimi-k2.6`, tools disabled (founder-approved single run) | **UNAVAILABLE**: HTTP 402 (insufficient OpenRouter credits for the ~60k-token package); nothing was processed |
| R2 separate-model review | Codex CLI | **UNAVAILABLE**: launcher link points to a missing installation |
| GitHub review apps on #578 | cubic, Qodo, CodeRabbit | **NOT PERFORMED** (quota exhausted, trial ended, automatic review skipped) |
| Alibaba OCR | `ocr delegate preview` on #578 | **UNAVAILABLE** for Markdown (0 of 21 files selected) |
| Jev | Revision 1 only | **ADVISORY**; not re-run for revision 2 |

## 3. Mechanical gates (R3)

| Gate | Result |
|---|---|
| `verify-planning-docs --ids docs/strategy/ascout-v2` at each stacked PR head | PASS for #579–#587 (#579 and #580 passed while carrying the 65 inherited undefined identifiers fixed in #581) |
| Diffcipline, proposed policy (default limits), each stacked PR against its base | **PASS**: #579 (5 files / 92 lines), #580 (8 / 180), #581 (2 / 144), #582 (4 / 50), #583 (4 / 80), #584 (2 / 34), #586 (5 / 90), #587 (9 / 17) |
| Diffcipline on #578 against `main` | **FAIL** (21 files / 1,821 lines); kept, decision FD-8 |
| Diffcipline on the whole stack against `main` | **FAIL** (25 files / 2,321 lines), expected, because it includes #578 |
| `Project CI` (3 OS × 2 Node) on #578–#584 and #586 | success (7 of 7 required checks; cubic reported neutral) |
| #585 (governance) `Self Verification` | **FAILED** on the first two commits: the new script had no Vitest coverage evidence (`vitest_evidence_invalid` → receipt exit 2). Fixed forward with an importable library and 10 in-process tests (`627ce80`). The outcome of the re-run is recorded in the #585 conversation |
| Privacy scan of the package for private repository names, account names, and the planted probe secrets | 0 matches |

The #585 self-verification failure is itself evidence that Ascout's own gate works: it refused to treat an untested executable change as verified.

## 4. Adversarial findings on revision 2 (author review, not independent)

| ID | Severity | Finding | Status |
|---|---|---|---|
| F-01 | High | Revision 2 left stale references to a Rust `ascout-exec` crate and to scanners "via Sentrdel" in 03, 04, 05, 07, 08, 10, 11, 14, and D-07 | **Fixed** in #587 |
| F-02 | High | Without Sentrdel, the default `security` claim can never be `SUPPORTED`, so V1 alone would always exit 4 | **Resolved by specification:** C-21 (explicit narrower intents named in the claim). Usability must be validated with users |
| F-03 | Medium | Porting Kodac's gateway is harder than "copy": `ExecutionGateway`'s constructor is coupled to gVisor observer types, the style is dense, and Kodac targets Node 24 with strip-types | Open. V1 effort (4–6 weeks) is unvalidated; port acceptance requires Kodac's own gateway tests to pass under Ascout's toolchain ([16](16_KODAC_CONVERGENCE_ANALYSIS.md) §5) |
| F-04 | Medium | E2E-09 (OCR with a real model in CI) may be infeasible on hosted runners; LLM review could stay unqualified indefinitely | Open; the product must then label LLM review unqualified (E2E-09 text) |
| F-05 | Medium | Engine Profiles depend on stderr text and counters that can change between scanner releases | Open; pinned versions, golden replays (L1) per pin, and profile re-qualification on every re-pin |
| F-06 | Medium | Two SARIF parsers (Ascout, Sentrdel) can drift | Mitigated by the shared conformance corpus (FMT-10), which needs Sentrdel CI changes (FD-2 scope) |
| F-07 | Medium | Private vulnerability reporting is disabled on Ascout, so G30 has no private tracking channel in GitHub | Open; recommendation to enable it. Details were reported to the founder outside the public PRs |
| F-08 | Low | Sentrdel's whole-file SARIF rejection is also a defect for Sentrdel's standalone users | Open; recommend a Sentrdel issue (not filed) |
| F-09 | High | No independent review of any kind has been performed | **Blocking** ratification |
| F-10 | Medium | Landlock inside WSL2 is unverified, so Windows users have no `T1` path today | Open (G36, CON-04 on a WSL runner) |
| F-11 | Low | Effort estimates are order-of-magnitude guesses | Open; replace with measured velocity after V0 |
| F-12 | Medium | Running `benchmarks/self-verify.mjs` with the working repository as the subject rewrote local branch state (it rebuilds the subject in place). This happened in this session and was repaired without rewriting published history | Open: document that the harness must run on a disposable clone, or make it refuse a non-disposable checkout |

## 5. Verdict

Revision 2 is **review-ready**: bounded, mechanically consistent, and explicit about what is unverified. It is **not ratification-ready** (no R1 human review) and **not implementation-ready** (FD-1…FD-8 pending). See [15](15_IMPLEMENTATION_READINESS_AUDIT.md).
