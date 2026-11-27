# Amendment A10: Master Execution Directive & Governance Simplification (2026-11-27)

**Status: Adopted on 2026-11-27 under the founder's written Master Execution Directive ("ASCOUT — MASTER EXECUTION DIRECTIVE").** The constitution moves from version `1.5.0` to `1.6.0`. The amendment text is in `.specify/memory/constitution.md`, under "Amendment A10 — Autonomous platform expansion, governance simplification, and qualified contradiction". An AI engineering agent (Antigravity / Gemini 4) drafted this record and the exact amendment text under the founder's written directive. The founder authorized the directive but did not inspect this exact constitutional text before merge, and may change it. Section 4 records every independent A09 review started for this change.

## 1. The founder's directive (verbatim governance passages)

On 2026-11-27, the founder gave the engineering agent, in the session prompt, a written directive titled "ASCOUT — MASTER EXECUTION DIRECTIVE". These are its governing authorization passages, verbatim:

> You have founder authorization to:
> - Review, challenge, simplify, and improve the existing architecture and roadmap.
> - Resolve unnecessary administrative and historical planning blockers.
> - Implement outstanding capabilities.
> - Reuse, adapt, integrate, and rebrand authorized source code.
> - Replace weak implementations with stronger existing implementations where appropriate.
> - Create and update tests, specifications, documentation, and architectural decisions.
> - Open, review, repair, and merge properly qualified pull requests.
> - Perform independent AI reviews.
> - Continue autonomously through all implementation phases.
> - Make reasonable technical and product decisions without repeatedly requesting founder approval.
>
> Do not interpret an outdated planning restriction or an exhausted implementation frontier as evidence that Ascout is complete.
> Record this directive as the updated founder authorization where necessary.

> Review the complete governance system and simplify it.
> Retain: Evidence integrity. Security boundaries. Reproducibility. Independent review. Regression testing. Accurate release qualification. Source provenance. Honest reporting.
> Remove or consolidate: Repetitive authorization requirements. Redundant planning documents. Circular approval dependencies. Unnecessary founder decision packets. Artificial implementation freezes. Duplicated acceptance criteria. Excessive procedural barriers. Documentation that does not improve the actual product.
> The founder authorizes autonomous implementation within this directive.
> Follow Amendment A09 and remove mandatory human-review dependencies wherever consistent with the updated project governance.
> Independent AI agents may perform architecture reviews, security reviews, code reviews, and acceptance reviews.
> Do not represent AI review as human review, external certification, or independent external security accreditation.
> However, never weaken an actual security or correctness requirement merely to obtain a passing result.

> Ask only when an action genuinely requires unavailable credentials, external legal authority, a financial commitment, or an irreversible operation outside the authorized project scope.
> Do not publish to an external registry unless the required package ownership and publication authority are established.
> Do not introduce paid signing or distribution infrastructure without explicit founder approval.
> Do not market Ascout as safe for hostile repositories until the complete relevant execution boundary has been independently qualified.

Verbatim capability, scoped-review, and claim-verification passages from Sections 7, 9, 15, 17, 18, and 21 of the same directive:

> Evaluate and improve the following proposed architecture. These are Ascout-owned capability boundaries, not a requirement to create unnecessary microservices.
> Ascout Core ... Ascout Review ... Ascout Security ... Ascout Test ... Ascout Browser ... Ascout Runtime ... Ascout Sandbox ... Ascout Agent ... Ascout Evidence ... Ascout Benchmark ... Ascout Release ... Ascout Studio ... Ascout Connect.

> Make Ascout Review a genuinely useful code intelligence and verification engine. It must support: Working-tree review. Staged changes. Commit review. Branch comparison. Pull-request review. Full repository review.

> Build a structured claim-verification engine capable of returning: VERIFIED. REFUTED. PARTIALLY VERIFIED. INCOMPLETE. NOT VERIFIED. Agent confidence is not evidence. Agent output must never be allowed to override deterministic contradictory observations.

> Provide a coherent command surface, such as: ascout init, ascout doctor, ascout check, ascout review, ascout security, ascout test, ascout browser, ascout runtime, ascout verify, ascout evidence, ascout report, ascout benchmark, ascout release, ascout mcp, ascout serve.
> Provide a documented local API for automated verification and evidence retrieval. Use authenticated local access where sensitive operations are exposed.
> Create a real, functional Ascout graphical application ... Produce a meaningful release verdict with supporting evidence.

The founder has not been recorded as examining this exact drafted text or code, and this record does not claim that they did.

## 2. Governance procedure (constitution, Governance section)

1. **Complete explicit constitutional delta:**
   - Adds Amendment A10 (clauses 1–5) after Amendment A09 in `.specify/memory/constitution.md`:
     - **Clause 1 (Authorized platform scope):** Authorizes autonomous engineering across Ascout's 13 defined capability domains — Core, Review, Security, Test, Browser, Runtime, Sandbox, Agent Claim Verification, Evidence, Benchmark, Release readiness evaluation (local verdict/gate only; never creates tags, GitHub Releases, signed attestations, or package publications), Connect, and Studio — superseding M1 scope exclusions and Principle VIII's pre-authorization gate for those domains only, while requiring optionality of new runtime surfaces, loopback-only authenticated read-only-by-default `ascout serve`, zero-option read-only `ascout mcp`, and strict preservation of Principle IV's runtime human admission boundary.
     - **Clause 2 (Simplified engineering workflow):** Simplifies the 12-step founding sequence to architecture/design review (including multi-perspective independent critique where available), implementation, deterministic unit/integration tests covering changed lines and branches, exact-head CI, and independent A09 review.
     - **Clause 3 (Qualified contradiction, amending A07 clause 7):** Authorizes `VERIFIED | REFUTED | PARTIALLY_VERIFIED | INCOMPLETE | NOT_VERIFIED` for `ascout verify` under A07 exit precedence (`2 > 3 > 1 > 4 > 0`), permitting `REFUTED` strictly on deterministic, drift-free, source-bound contradictions on matching `(repository_id, head_sha, tree_digest)` (and config identity where applicable), failing closed when `HEAD` is unborn/unavailable, with resolvable `contradicting_evidence_refs`, and barring heuristic scanners or AI opinions from emitting `REFUTED`.
     - **Clause 4 (Scoped deterministic review, amending A07 clause 3):** Retains A07.3 scope disclosure and non-zero exit for every working-tree-only review (clean or dirty), permitting exit `0` only with an explicit source-bound diff scope proof (`--base`/`--commit`) covering all changed files cleanly or proving zero reviewable changes.
     - **Clause 5 (Preserved reservations):** Explicitly preserves all A09 clause 6 reservations (constitutional amendments including A08, public releases/tags/build-provenance signing, npm or other publication, payments/pricing/paid offerings, creating accounts/GitHub Apps/credentials, repository protection rule changes), preserves separate explicit founder authorization before admitting untrusted repositories under Principle IV (even after all supported OS sandboxes and Issue #591 qualify under A09), and preserves A07 clause 6 (`Receipt schema v1.0 and its bytes remain unchanged`).
   - Increments the constitution version from `1.5.0` to `1.6.0` and updates `Last Amended` to `2026-11-27`.

2. **Rationale:** Historical M1/M2/UA-P06 authorization freezes and planning packets (including Issues #296 "Frontier assessment - no further canonical work currently justifiable", #628 "Founder decision packet: FD8-B", and #634 "UA-P07 authorization ledger — Deep Security Audit orchestration") had stalled end-to-end product completion even after Amendment A09 removed human-only review gates. Amendment A10 operationalizes the founder's 2026-11-27 directive while retaining every technical safety, evidence, security, provenance, and A09 review invariant.

3. **Affected artifacts:**
   - `.specify/memory/constitution.md`: adds Amendment A10 (v1.5.0 -> v1.6.0).
   - `docs/governance/A10_MASTER_EXECUTION_DIRECTIVE_2026-11-27.md`: records the verbatim directive, governance delta, impact assessment, and A09 review history.
   - `specs/017-unified-assurance/PROPOSED_AMENDMENT_A08_STATEMENT_EVIDENCE.md`: updates A08's proposed target constitution version from `1.5.0 -> 1.6.0` to `1.6.0 -> 1.7.0`.
   - `STATE.md`: records the Master Execution Program, updates current release baseline (`v0.3.2`) and merged PR #791 (`fed9134`), reconciles the outdated "without enabling them in check" restriction and #359 UI freeze note, and tracks the live PR queue.

4. **Trust, scope, licensing, and complexity impact assessment** (authoring agent's assessment; Section 4 records independent A09 reviews):
   - **Trust & security:** New runtime surfaces (`ascout serve`, Browser, Runtime, Studio) introduce local attack surface (DNS rebinding, CSRF, XSS-to-RCE, SSRF, arbitrary command execution). A10 Clause 1 bounds these constitutionally: `serve` MUST bind strictly to `127.0.0.1` (rejecting non-loopback `Host`/cross-origin requests), default to read-only, authenticate mutating/privileged requests, and never bypass Principle IV changed-command-surface admission; `mcp` stays strictly zero-option read-only; and `browser`/`runtime` MUST default to loopback-only targets with strict scheme/origin filtering. A10 Clause 5 keeps untrusted-repository admission under Principle IV reserved to separate explicit founder authorization.
   - **Scope:** Expands authorized engineering scope from M1/M2/UA-P06 to the 13 platform domains (superseding M1 scope exclusions and Principle VIII's benchmark-gated architecture-expansion requirement for those domains only) while keeping every new surface optional for core CLI claims and keeping `ReceiptV1` schema bytes unchanged per A07.6.
   - **Licensing & provenance (Principle VIII):** Core remains Apache-2.0 with zero mandatory runtime dependency bloat (`cross-spawn@7.0.6` remains the sole runtime dependency unless a separate notice-reconciled dependency is justified). Any donor code transplant remains subject to Principle VIII separate code/rules/data license evaluation, exact revision provenance, and `THIRD_PARTY_NOTICES.md` integrity (`tests/third-party-notices.test.ts`).
   - **Complexity:** Avoids parallel microservices, external databases, or duplicate `src/` trees; consolidates new engines into existing `src/assurance/`, `src/browser/`, `src/quality/`, and modular greenfield directories (`src/evidence/`, `src/runtime/`, `src/serve/`, `src/benchmark/`), gated by exact-head CI and `self-verify` changed-code exercise checks.

5. **Reconciliation of affected canonical specs:** Performed in this PR for `PROPOSED_AMENDMENT_A08_STATEMENT_EVIDENCE.md` and `STATE.md`.

## 3. What did not change

- All six Amendment A09 clause 6 reservations remain reserved to explicit founder authorization: constitutional amendments (including unratified Proposed Amendment A08, now targeting `1.6.0 -> 1.7.0`), public releases/tags/build-provenance signing, npm or other publication, payments/pricing/paid offerings, creating accounts/GitHub Apps/credentials, and repository protection rule changes.
- Admitting untrusted repositories under Principle IV remains reserved to separate explicit founder authorization.
- Receipt schema v1.0 and its bytes remain unchanged per A07 clause 6.
- Exact-head CI, changed-code coverage/exercise checks, fail-closed containment, and Amendment A09 truthful AI-review labeling remain unchanged.

## 4. Independent reviews of this change

1. **Antigravity / Gemini 4 (fresh-context read-only AI review subagent, no access to authoring conversation; exact internal model build string not exposed to subagent), 2026-11-27, commit `04c3f06fa565173efc03bd4b1b5dd991df419593`.** **Verdict: BLOCKED** (0 Critical, 3 High, 4 Medium, 4 Low):
   - **High:** (H1) overclaimed founder adoption of exact drafted text and omitted verbatim directive quotes, AI-drafting disclosure, and A09 review section; (H2) A10 clause 5 omitted four A09 clause 6 reservations (constitutional amendments/A08, build-provenance signing, other publication, GitHub Apps); (H3) omitted Governance requirements 2/3/5, colliding with A08's `1.6.0` target and leaving `STATE.md` contradictions (lines 41, 93, 133, 143).
   - **Medium:** (M1) weakened A07.6 Receipt v1.0 immutability phrasing; (M2) dirty working-tree-only review ambiguity under A07.3; (M3) missing A07 exit mapping and drift-free/config/unborn-HEAD rules for `ascout verify`; (M4) unreconciled optionality/loopback/admission boundaries for `serve`/`Studio` and Principle VIII pre-authorization gate.
   - **Low:** (L1) undefined `EGM` acronym and wording drift; (L2) stale `STATE.md` entries (`v0.3.1`, `T1 blocked`, self-staling `In progress (this PR)`); (L3) external PR #791 review count and issue titles; (L4) clarifying `Ascout Release` as read-only readiness evaluation only.

   These findings were addressed in commit `3141b4c48baf240b85fd179105573cbf42d7383e`, reviewed below.

2. **Antigravity / Gemini 4 (fresh-context read-only AI review subagent, no access to authoring conversation; exact internal model build string not exposed to subagent), 2026-11-27, commit `3141b4c48baf240b85fd179105573cbf42d7383e`.** **Verdict: BLOCKED** (0 Critical, 1 High, 2 Medium, 3 Low):
   - Confirmed H2, H3, M1, M2, M3, L1, L3, and L4 resolved.
   - **High:** (H1) Section 1 quoted only general governance passages and omitted verbatim directive passages authorizing the 13 capability domains, scoped review, and `REFUTED` / claim verification.
   - **Medium:** (M1) Section 2.4 described Browser/Runtime loopback/scheme filtering and `127.0.0.1`/Clause 5 rules as Clause 1 constitutional constraints not yet present in `constitution.md` Clause 1; (M2) Section 4 reviewer entry 1 omitted product/model identification required by A09 clause 3.
   - **Low:** (L1) premature completion phrasing in `STATE.md` line 13 and Section 4; (L2) minor constitutional wording imprecision on `(except as amended below)` and `Principle VIII's pre-authorization gate`; (L3) minor `STATE.md`/Section 3 consistency nits.

   All findings from Review #2 are claimed addressed in the following commit, which requires a fresh A09 independent review on its exact final SHA before merge.
