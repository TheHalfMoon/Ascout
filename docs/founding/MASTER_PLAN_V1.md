# Ascout Master Plan v1

**Status:** FOUNDING CANDIDATE / READY FOR SPEC-KIT CANONICALIZATION  
**Repository:** `TheHalfMoon/Ascout`  
**Identity:** **Ascout — Verify everything AI ships.**  
**Required subheadline:** **Know exactly what passed, failed, and was never checked.**

No product implementation is authorized by this document.

This is the reconciled founding source produced from Master Plan v0, Claude adversarial review, GLM 5.3 reconciliation, and final founder-side reconciliation. Spec Kit artifacts derived from it become implementation-authorizing only after their own gates pass.

## 1. Product Thesis

AI coding systems can generate software faster than developers can prove what was actually checked.

Ascout is the **local verification receipt for AI-built software**. After an AI coding change it determines:

- what changed;
- what verification actually ran;
- what passed/failed/flaked/errored/was blocked;
- what did not run and why;
- which changed executable lines the executed tests exercised;
- which changed executable lines remain unexercised or unresolved;
- factual test/snapshot changes;
- exactly which source state the evidence belongs to.

The product is not the number of scanners Ascout can invoke. The product is an honest, source-bound verification receipt.

## 2. M1 Wedge

> **Ascout tells you which parts of an AI change your verification actually exercised — and which parts nothing checked.**

A remaining material changed-code exercise gap is not a clean result merely because selected tests passed.

## 3. Founding Decisions

### FD-ASCOUT-001 — Trust boundary

v0.x runs only in the developer's own trusted local repository. Arbitrary third-party repositories/untrusted PR branches require a future separately authorized sandbox/admission design.

### FD-ASCOUT-002 — Product wedge

M1 is an evidence-bound changed-code verification receipt: changed scope + executed/non-executed verification + exercise gaps + factual verification-asset changes + exact source binding.

### FD-ASCOUT-003 — Local core

Core verification requires no Ascout account, repository upload, SaaS backend, cloud service, or model/API key. Optional hosted integrations may exist later. Ascout does not claim child processes/tests are offline unless egress is actually enforced and verified.

### FD-ASCOUT-004 — Evidence identity

Evidence is run-bound and never transfers between source trees. Finding fingerprints are weak/versioned matching aids, not evidence/global identity. Receipt evidence references must resolve to current-run evidence entries.

### FD-ASCOUT-005 — Result honesty

Task statuses:

```text
PASS
FAIL
FLAKY
BLOCKED
ERROR
NOT_APPLICABLE
NOT_RUN(reason_code, reason_text)
```

`NOT_RUN`, `BLOCKED`, and `ERROR` require non-empty reason code/text. No universal proof ladder. `in_changed_lines` is locational; `introduced_by_change` is causal and defaults `unknown` in M1.

## 4. Constitutional Product Rules

1. **Evidence before claims.** Tool/model assertions do not outrank current-run evidence; exposed evidence references must resolve to current-run evidence entries.
2. **No green by omission.** Unexecuted applicable work and material exercise gaps remain visible and cannot hide behind clean success.
3. **Source-bound truth.** Evidence is tied to exact run/source/config state; start/end drift is explicit.
4. **Local-first, not fake-offline.** No required cloud/account/upload; no unproven child-process network-isolation claim.
5. **Native capability first.** Git, runner-native related selection, coverage formats, workspace metadata, and trustworthy native caches before custom infrastructure.
6. **Conservative affected verification.** When narrowing is unsafe, widen; speed loses to honesty.
7. **Minimal core.** No daemon/server/DB/Rust/public plugin SDK/required LLM/cloud control plane in M1.
8. **No implicit installs.** Missing dependencies become visible non-execution.
9. **Command provenance and admission.** Every executed task records authority/source. If the current diff changes an effective command/config surface Ascout would execute/load, the task is refused by default as `NOT_RUN(command_surface_changed)`; only explicit, receipt-visible, per-invocation human admission may allow execution.
10. **Read-only by default.** No silent product-source rewriting; tracked/non-gitignored mutation during verification remains drift.
11. **Bounded execution.** Timeouts, process-tree cleanup, run lock, bounded retention/output.
12. **Evidence privacy.** `.ascout/` ignored; persisted output/argv redacts recognized secret-bearing env values; raw remote/local repository location material is never persisted.
13. **License/provenance integrity.** Code/rules/data/use restrictions are separate concerns; process isolation does not cure every license obligation.
14. **Benchmark-driven expansion.** Future architecture needs measured evidence.
15. **Fresh-head governance.** A stale plan audit never authorizes implementation; exact-HEAD cross-artifact consistency and branch purity must be reverified after material mutation and before authorization/merge consideration.

## 5. M1 Scope

First-class:

- developer-owned trusted local Git repository;
- JavaScript/TypeScript;
- npm/pnpm/yarn;
- single-package + basic workspaces;
- TypeScript;
- ESLint where configured;
- Vitest or Jest where supported;
- basic explicitly configured/discoverable pytest pass/fail/error only.

Explicitly outside M1:

- untrusted repository sandboxing;
- CI/SARIF as Ascout product surface;
- Nx/Turbo/Bazel-specific affected engines;
- deep monorepo dependency graphs;
- browser/Playwright orchestration;
- security suites;
- mutation/property/fuzz/DAST/load testing;
- accessibility/performance verification;
- semantic repository/feature graph;
- AI reasoning/test generation/automatic fixing;
- daemon/server/control plane;
- Rust/SQLite/graph DB/public plugin SDK requirements.

## 6. M1 Command Surface

```text
ascout init
ascout doctor
ascout check
```

Future breadth should prefer flags over new verbs when semantics remain one engine.

## 7. Configuration

Config v1 is a deliberately small discovery-correction surface, not a task runner.

Tracked `ascout.config.json` may override only fixed M1 task categories:

- `typecheck`;
- `lint`;
- `test`;
- `pytestBasic`.

Per category it may enable/disable with required visible reason, override argv command, and bound timeout. Global config may set timeout/termination grace, check budget, and extra redaction env names.

M1 config does **not** define arbitrary task names, user-authored prerequisite graphs, workspace orchestration, expressions, hooks, trust grants, or workflow steps. Ordering among fixed product tasks is internal product logic.

## 8. Task / Result Model

Every executed task records semantic identity/type, command provenance/source, redacted persisted argv, tool/version, timing, status, exit/result metadata, observations, and current-run evidence/artifact references.

`NOT_RUN`, `BLOCKED`, and `ERROR` require non-empty reason code/text. Non-executed tasks MUST NOT fabricate argv/tool identity if command resolution never occurred.

Deselected tests are SelectionAccount disclosure, not task-level `NOT_RUN`.

## 9. Source Identity

M1 stores only schema-enforceable opaque repository identities:

- remote present: `remote:<sha256(normalized-credential-free-remote-identity)>`, `portable=true`;
- no remote: `local:<sha256(canonical-real-repository-path)>`, `portable=false`.

Raw remote origins, credentials/userinfo/query/fragment material, and raw absolute local paths are never written to receipts/run artifacts.

Tree identity covers:

- HEAD;
- canonical index state;
- unstaged tracked current type/mode/content state;
- all non-gitignored untracked files except `.ascout/`.

There is no heuristic hidden untracked-source omission list. Tracked files are never excluded merely because a tool may rewrite them. A rename carries both current path and previous path.

Hash at run start and end. Stability is `stable | tree_drifted | unknown` when integrity failure prevents comparison.

## 10. Evidence / Finding Identity

Evidence IDs are run-bound `(run_id, task_id, sequence)`.

Receipt v1 contains a root current-run `evidence[]` collection. Each evidence entry records its evidence ID, run ID, task linkage, kind, content digest, optional artifact linkage, and redaction/truncation state. Before emission/acceptance, semantic receipt validation must prove:

- evidence IDs are unique;
- each evidence entry belongs to the receipt run;
- each evidence task link resolves to a task in the receipt;
- every task/finding `evidence_id` resolves to a current-run evidence entry;
- referenced artifact IDs resolve when present.

Weak `fingerprint_v1` may hash version + task/rule identity + relative path + normalized message using unambiguous framing. It excludes line/tree identity, may fail across moves/tool-message changes, and never carries evidence.

## 11. Finding / Reproduction Semantics

No confidence ladder. Findings store producer/rule/message/location/severity where supplied safely, evidence refs, observations, determinism, `in_changed_lines`, `introduced_by_change`, and optional weak fingerprint.

For failing tests:

- one observation → `reproduced=unknown`;
- repeated consistent failures → true;
- contradictory valid observations → `FLAKY`, stable-failure reproduction false;
- unavailable/inconclusive rerun → unknown.

## 12. Affected Verification

Default comparison is staged + unstaged + all non-gitignored untracked files except `.ascout/` vs HEAD.

Use native Vitest/Jest related/changed semantics. Widen on dependency/package-manager/compiler/path/test/workspace/non-source relation-risk changes and perform at most one post-run full package/workspace widening pass when narrowed execution cannot establish usable changed-code relation.

Selection mode, known/null selected/deselected counts, limitations, and widening triggers remain visible.

## 13. Changed-Code Exercise

Intersect changed executable lines with coverage from tests that actually ran.

States:

```text
EXERCISED        execution_count > 0
NOT_EXERCISED    execution_count = 0
UNRESOLVED       execution_count = null + non-empty reason
```

Coverage is observed execution, never correctness proof. After permitted widening, any remaining `NOT_EXERCISED` or `UNRESOLVED` changed executable line is a **material verification gap** and prevents clean exit `0`.

## 14. Test-Change Facts

M1 reports factual Git-derived changed/deleted test files and tracked snapshots. Semantic weakening/assertion analysis is deferred unless a reliable detector can be added without speculative AST infrastructure.

## 15. Execution / Privacy

Every task has bounded execution. Concurrent checks are refused, not queued. `.ascout/` holds ignored run artifacts with bounded retention.

Persisted stdout/stderr and persisted/rendered argv redact recognized/user-specified exact secret-bearing environment values. Raw argv exists transiently only for process launch. Redaction is best-effort, not a universal secret detector.

Changed effective package/Ascout/TypeScript/ESLint/Vitest/Jest/pytest authority is refused by default before launch/load. A human may admit it only for the current invocation; that admission is visible in the receipt and is never remembered or auto-added by agent integration.

## 16. Reporting / Completeness

One internal receipt truth feeds:

- concise terminal;
- versioned JSON;
- bounded agent output.

Schema validation is necessary but not sufficient. One Ascout-owned semantic receipt validator checks cross-field invariants before emission/acceptance, including evidence-reference integrity, source stability, task status/reasons, admission, exercise state, completeness, and exit-code consistency.

Clean `0` requires stable + materially complete + no finding/flake/error. Material incompleteness includes task `NOT_RUN`/`BLOCKED`, nothing material executing, unsafe selection that cannot be resolved, admission refusal, or remaining changed executable exercise gaps.

Exit semantics:

```text
0 clean/stable/complete
1 repository finding or flake
2 usage/config/internal/task-execution integrity error
3 source drift (absent higher-precedence error)
4 stable but materially incomplete/gapped
```

## 17. Donor / License Policy

- TestSprite: design reference only in founding phase; no source import.
- IntelliJ Community: open-source design reference/selective component reuse only after component audit.
- Proprietary products/Qodana commercial capabilities: design reference/optional future user-configured integration.
- CodeQL: optional license-gated user-configured future integration; never arbitrary auto-run.
- Vitest/Jest: native selection/execution dependencies of the user's project.
- tree-sitter/ast-grep/SCIP/Kythe: benchmark-gated future code intelligence references.
- Playwright/Stryker/Schemathesis/RESTler/Trivy/Syft/Grype/Gitleaks/Semgrep/Opengrep/ClusterFuzzLite: later only under exact-version license/use/data review.

Candidate project license: Apache-2.0, independently justified by developer-infrastructure fit and patent grant.

## 18. Benchmark

Small benchmark measures Ascout's claims, not donor detection quality.

Selection corpus: 5–6 reviewed real JS/TS historical fix + regression-test cases. Compare full suite, plain project test, native related selector, and Ascout.

Gap corpus: 3–4 historical production fixes with regression-test change withheld; compare exercise reporting against independent full-run coverage ground truth.

Metrics include selection recall, false-PASS, gap accuracy, unresolved mapping, cold/warm time, determinism, drift, flake classification.

Absolute M1 integrity gates:

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
stable material exercise gap returning exit 0 = 0
```

No invented pre-data 98% threshold.

## 19. Roadmap

### M0 — Canonical specification

Constitution, feature spec, trust/evidence/config/benchmark contracts, plan, tasks, analysis, independent final audit, fresh exact-HEAD review.

### M1 — Changed-code verification receipt

The smallest daily-use product defined above.

### M2 — Selection hardening / ecosystem expansion

Potential first-class Python affected verification, stronger monorepo delegation, binary packaging if adoption friction proves need, richer run delta, untrusted sandbox research, benchmark-driven targeted parsing.

### M3 — Behavioral / broader verification

Potential Playwright/browser, API/OpenAPI, CI/SARIF decision, selected security integration.

### Long-term optional

Mutation, property testing, fuzz/stateful API testing, richer code intelligence, accessibility, performance, optional AI reasoning. None may shape M1 abstractions before evidence justifies them.

## 20. M1 Exit Condition

A developer runs `ascout check` and receives a fast source-bound receipt that identifies exact source state; accounts for applicable verification; exposes selection/widening; distinguishes task states; reports changed executable exercise/unexercise/unresolved lines; reports factual verification-asset changes; contains resolvable current-run evidence; detects drift; emits consistent terminal/JSON/agent truth; and passes binding-integrity benchmark gates.

M1 does not prove universal correctness. It proves what it actually verified and refuses green while material changed executable code remains unchecked.

## 21. Public Truth

> # **Ascout — Verify everything AI ships.**
> ### **Know exactly what passed, failed, and was never checked.**

The headline is the mission. The receipt is the technical contract.

Ascout never reports fully verified when material work/gaps remain, deselected as passed, execution `ERROR` as repository `FAIL`, old evidence as new evidence, dangling evidence IDs as proof, changed-line location as causation, network isolation it did not enforce, or untrusted-repository safety it does not provide.

## 22. Spec Kit Handoff

```text
Master Plan v1
  → constitution
  → specify
  → clarify
  → Ponytail/YAGNI
  → plan
  → Ponytail plan reduction
  → tasks
  → checklist
  → analyze
  → independent final plan audit
  → fresh exact-HEAD cross-artifact + branch-purity review
  → explicit implementation authorization
```

Ponytail is a complexity gate, not an architecture generator. A stale audit never authorizes implementation. No implementation begins before all gates pass.
