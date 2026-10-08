# 14 — Critical Design Challenge

This is a deliberately hostile review of documents 00–13, written on the assumption that the design has serious weaknesses. Each item is classified and either mitigated (with a verification requirement) or left explicitly open.

## 1. Where V2 could still produce a wrong claim

| # | Scenario | Why it can happen | Mitigation / verification | Residual |
|---|---|---|---|---|
| W1 | Tests pass but do not test the change | Test quality is outside any runner's knowledge | Existing changed-line exercise (`NOT_EXERCISED` → exit 4); DEEP profile mutation testing; claim wording "tests passed" never "correct" | **Open by nature**; partially measured by mutation score |
| W2 | Security engines miss a real vulnerability and the claim is `SUPPORTED` | Every static engine has false negatives | ADV-19 wording; coverage listed per capability; `UNSUPPORTED_LANGUAGE` explicit; B-SEC-2 recall published | **Open by nature** |
| W3 | Under T0, a malicious test fakes runner output before Ascout reads it | Same-user execution | T1 tiers (V3); the receipt states the tier; untrusted policy (A07-4) | Open on macOS and Windows until G17/G18 |
| W4 | Host agent reviews its own code in delegation mode | Delegation uses the caller's model | `HOST_AGENT` independence; cannot satisfy "independent review" (REV-06) | Users may still over-read it; mitigated by labeling in all outputs |
| W5 | OCR silently skips files | Engine-side filters | ADV-17 | — |
| W6 | Sentrdel reconciler and Ascout kernel disagree on severity | Two severity models | Ascout uses Sentrdel severity as an observation attribute; Ascout's threshold policy decides | Must be documented in V1-T06 |
| W7 | A stale receipt is reused by an agent | Agents cache | Freshness engine; MCP `receipt_get` always returns the current-head validity | — |

## 2. Architectural attacks

**A1 — "Two Rust codebases plus TypeScript is too much for a small team."** *Valid. Revision 2 reduces this: the Linux helpers are the ported Kodac C launcher plus a namespace launcher, not a new Rust crate ([16](16_KODAC_CONVERGENCE_ANALYSIS.md) K-6).* V2 adds `native/ascout-exec` (Rust) and depends on Sentrdel (Rust). Mitigation: `ascout-exec` scope is fixed (apply containment, then `exec`; no analysis), with a budget of about 3k LOC excluding ported code. A sunset rule applies: if T1 cannot be qualified on at least 2 OSes by the end of V3, the helper is reduced to Linux only and the others declare T0. **Residual: high maintenance item, accepted knowingly.**

**A2 — "Sentrdel is a second trust kernel in disguise."** *Partially valid.* Sentrdel has its own Finding model, reconciler, policy engine (regorus), SQLite store, and MCP guard with ALLOW/ASK/DENY. In V2, Ascout uses only `sentrdel review` output, treated as observations. Sentrdel's guard/policy is **not** used by Ascout in V1–V5, so there is no conflicting decision surface. Sentrdel persistence must not touch the target repository (ADV-18; a V1-T01 requirement for `--state-dir`/`--no-persist`). **Residual: if V6 adopts the Sentrdel MCP guard, a decision record is required for how its DENY interacts with Ascout claims.**

**A3 — "Cross-repository dependency makes V1 fragile."** *Valid.* V1 cannot finish without Sentrdel CLI and release work. Mitigation: V1-T00…T02 are small, compose existing tested functions, and can start in parallel with V0. Fallback if FD-2 is refused: Ascout records `security` as `NOT_RUN(engine_unavailable)` and V2 proceeds; the plan does not stall.

**A4 — "The containment helper is a TCB written in native code; a bug produces false confidence."** *Valid.* Mitigations: achieved-tier probing at runtime (the helper must report the Landlock ABI and seccomp status it achieved; anything less → T0); a hostile probe suite in CI per release; the tier declaration lives in receipts so errors are auditable. No tier is claimed on a platform without a passing probe suite.

**A5 — "The exit-code change breaks the ecosystem."** *Valid but required.* Today's exit 0 is a false signal. Mitigations: `--plan` and `--delegate` are explicit non-assurance modes; release notes; the change is gated by A07.

**A6 — "Delegation mode and BYOK make review quality unmeasurable by Ascout."** *Valid.* Ascout cannot vouch for an arbitrary model. Mitigation: Ascout claims **coverage integrity** (every selected file reviewed or explicitly not), not review quality. Model qualification (V6) is opt-in and per endpoint+model.

**A7 — "Moving evidence out of the repository breaks CI artifact upload and confuses users."** *Partially valid.* Mitigation: `--export-dir` (default `.ascout/` in CI mode) plus the existing `.gitignore` handling.

**A8 — "Constitution V forbids a Rust requirement."** *Tension acknowledged.* The helper is required only for T1+ tiers, never for `check` or other core claims at T0. A07 rule 5 records this explicitly so it is not a silent reinterpretation.

**A9 — "GitHub Action could become a CI-poisoning vector."** *Valid.* The Action must document and enforce `pull_request` (not `pull_request_target`), run with `permissions: contents: read`, and never publish. Publication happens only from a trusted local or trusted-workflow context with explicit E6. The test is part of MCP-06/PUB-*.

**A10 — "OCR could be abandoned or change license."** *Low probability, high impact.* Engine Protocol v1 isolates it; the review normalizers are engine-agnostic; the pin preserves a working version indefinitely under Apache-2.0.

**A11 — "Differentiation is unclear versus well-funded PR-review SaaS."** *Valid; unresolved by engineering alone.* Ascout's defensible difference is (a) local, zero operator cost, (b) one claim across review, tests, and security bound to an exact tree, and (c) refusal to show green by omission, exposed to agents. Whether users pay for that is a market question this plan cannot answer. Mitigation: ship V0–V4 quickly and measure adoption before V6–V8 investment.

**A12 — "Interrupted runs leave partial evidence that looks valid."** *Valid until V5.* Interim rule (V3-T08): unsealed runs are never readable as receipts; `verify-receipt` rejects them. V5 adds the journal for recovery.

**A13 — "Cross-platform claims are aspirational."** *Valid.* Only `check` has 3-OS CI today. Each capability row in [10](10_LOCAL_ZERO_COST_PACKAGING_AND_PLATFORM.md) §3 is a target, not a fact, until its acceptance suite runs on that OS.

**A14 — "Copying from unlicensed owner repositories could taint Ascout's Apache-2.0 license."** *Valid.* FD-3 per file; nested third-party code is checked (Golam's containment depends on the `landlock` and `seccompiler` crates as dependencies, not copied code; to be verified at port time).

**A15 — "Private-source leakage."** No private repository content is included in this package. Future tasks must not copy private code into public Ascout without a distribution decision.

**A16 — "Resource exhaustion on macOS."** No Job Objects. Mitigation: process-group kill + `RLIMIT_*` where available; the gap is declared in the platform matrix.

## 3. Adversarial alternative designs considered

| Alternative | Strongest argument for it | Why not chosen |
|---|---|---|
| Rewrite Ascout in Rust and merge Sentrdel | One language and one binary; containment native | Discards 54k LOC of working TypeScript plus its tests; long stall before any user value |
| Make Sentrdel the product, with Ascout as a TS front end | Sentrdel is the most mature engine | Sentrdel's scope is security; test/browser/review evidence and claims live in Ascout |
| Container-only execution (Docker for everything) | Real isolation on all OSes | Heavy dependency; Docker Desktop licensing for companies; violates the laptop-friendly goal. Kept as an optional T2 path |
| Wait for Kernux as the runtime | Unified agent OS vision | Kernux says implementation has not started; blocking on it would stall Ascout indefinitely |

## 4. Classification summary

| Class | Items |
|---|---|
| Confirmed defects | G01, G02, G03, G11, G12, G13, G14, G26, G29 |
| Confirmed capability gaps | G04, G05, G06, G08, G09, G15, G17, G18 |
| Architectural risks | G07, G10, G20, G21, G23, G24, G25, A1–A16 |
| Open questions | FD-1…FD-6 |
| External dependencies | G16, G19, G22; OCR upstream; scanner upstreams |
| Deferred features | UA-P07, P08, P10–P12; plugin SDK; UI before V5; fuzzing; dynamic security |

No critical blocker is described as resolved. G01, G04, and G05 are the three critical items. All three have mitigations scheduled (V1, V1–V2, V3), and none is closed by this planning PR.
