# Specification 016 — P016-01 First-Wedge Implementation Authorization

## Status

`SPEC_016_P016_01_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE`

`FIRST_BROWSER_WEDGE_IMPLEMENTATION_AUTHORIZED = NO`

This artifact is the P016-01 authorization candidate for Issue #344. It grants
no implementation authority until it is qualified, guarded-merged, post-merge
verified, becomes canonical, and Issue #344 closes `CLOSED_CANONICAL / EFFECTIVE`.

## Canonical predecessor

Spec 016 planning is closed canonical:

- planning ledger: Issue #342 (planning direction; implementation not authorized by planning alone)
- planning PR: #343, MERGED
- planning merge: `3151dde029759c61ec8e98df4fda1b85fe95dd0a`
  (ordered parents `d3e79aa5` + `b36997b`, tree `6e0554cd6efdb66cea0212b089b70c4eae965364`)
- PR-head qualification: Project CI run `34941953378` attempt 1 / SUCCESS /
  all six lanes SUCCESS; Self Verification run `34941953365` SUCCESS;
  maintainer verification recorded; zero unresolved material threads
- post-merge Project CI run `34942521785`: attempt 1 / SUCCESS / all six lanes SUCCESS
- authorization ledger: Issue #344, `PROPOSED / NOT_EFFECTIVE`
- authorization base (this branch): `3151dde029759c61ec8e98df4fda1b85fe95dd0a`
- open PRs at ledger creation: 0
- Spec 014: separate chain (Issue #300); zero Spec 014 paths on canonical `main`

The authoritative planning contract remains the canonically merged Spec 016
planning package (`spec.md`, `plan.md`, `tasks.md`, `clarifications.md`,
`GAP_EVIDENCE.md`, architecture contracts, `BENCHMARK_DESIGN.md`,
`SOURCES_AND_PROVENANCE.md`, `IMPLEMENTATION_HANDOFF.md`).

## Founder authority element

Founder execution directive dated 2026-09-15 (live session) explicitly orders
the canonical Spec 016 sequence — planning merge, P016-00 predecessor
closeout, P016-01 authorization, then dependency-ordered P016-02.. execution —
under live canonical repository governance, with no routine founder approval
between authorized slices and no external/independent-human-review requirement.
It does not waive third-party licenses, NOTICE/provenance obligations,
credential secrecy, or constitutional gates. This artifact records that
directive as one satisfied element of P016-01; every other gate element below
must still be proven on the exact head before merge.

## P016-00 PREDECESSOR_CLOSEOUT evidence

`P016-00 PREDECESSOR_CLOSEOUT = SATISFIED`, proven by the following durable
evidence (this section is the P016-00 deliverable: one durable closeout
reference in the authorization artifact; no code change):

1. Spec 015 first wedge canonically closed: `SPEC_015_FIRST_WEDGE =
   CLOSED_CANONICAL / COMPLETE`. Tenth slice PR #341 merged at
   `d3e79aa59149b13f7f2ae85f6295ea7da9a52bfa` (ordered parents `506bd09e` +
   `4abb9979`, tree `4eade0d9`); post-merge Project CI run `34940899817`
   attempt 1 / SUCCESS / all six lanes SUCCESS; Issue #318 closed 2026-09-15
   with the 10/10 slice closeout (comment `5676426098`).
2. No conflicting implementation PR chain exists: 0 open PRs at authorization
   ledger creation; Spec 014 has no canonical package and is a separate chain.
3. Residual-risk/release-decision semantics needed by browser work are
   canonical: `src/quality/residual.ts` plus contract tests and behavior docs
   merged via PR #341 and present on canonical `main`.
4. First-wedge benchmark/integrity evidence is preserved: all ten slice PR
   heads, exact-head CI runs (including preserved attempt-1 failure
   `34743652966` with founder classification), post-merge CI runs, and contract
   tests (92/92 quality suites) remain durable on GitHub and `main`.

## Frozen first-wedge scope (P016-02 through P016-09 only)

Per planning handoff section 3, this authorization covers exactly:

```text
P016-02 INTENT_IR — deterministic IntentTest domain types and validators
P016-03 BROWSER_EXECUTOR_CONTRACT — internal execution/evidence-identity types
P016-04 PLAYWRIGHT_ADAPTER — qualified adapter on the pinned dependency
P016-05 BROWSER_EVIDENCE — action/console/network/artifact evidence binding
P016-06 DETERMINISTIC_LOCATOR_POLICY — ordered locator policy, ambiguity fails closed
P016-07 RECOVERY_SEMANTICS — resolver/execution/semantic recovery evidence
P016-08 TRACE_ARTIFACT_INGESTION — bounded trace/artifact refs, digests, retention
P016-09 SYNTHETIC_BROWSER_BENCHMARK_V1 — owned fixtures proving zero integrity violations
```

P016-10 and later (journey intelligence, agentic proposals, multimodal
resolution, recovery agents, cross-browser matrix, CLI/MCP surface, comparative
benchmark) are explicitly NOT authorized by this artifact and require a
separate benchmark-justified authorization after deterministic browser truth
is proven.

## Deterministic-first principle

`Models propose. Explicitly classified evaluators observe. Bound evidence decides.`

No slice under this authorization may grant PASS authority to a model,
a cache, a retry, a recovery action, or missing/unavailable work. Semantic
recovery that changes business-flow meaning MUST surface
`SEMANTIC_DRIFT_DETECTED` and MUST NOT silently become ordinary PASS.

## Playwright dependency/version strategy (exact)

- Package: `playwright@1.63.0`, to be adopted with an exact pin
  (`--save-exact`) at P016-04 and recorded in `package-lock.json`.
- Observed 2026-09-15 via npm registry: version `1.63.0`, license Apache-2.0,
  tarball `https://registry.npmjs.org/playwright/-/playwright-1.63.0.tgz`,
  shasum `99b56f9f69b1b70c44f00bf84b2fe52348ae2511`.
- Research repository pin remains `d1ead3ecca23182f2d06d761c28e3d4edafb6595`
  (microsoft/playwright, re-verified upstream 2026-09-15); do NOT pin
  implementation to the research-time repository head — pin the package version.
- Strategy order, binding: `DEPEND -> ADAPT -> SELECTIVELY REUSE -> FORK ONLY
  IF BENCHMARK-JUSTIFIED`. No Playwright fork, wholesale copy, or
  browser-protocol reimplementation in this wedge.
- Browser binaries are acquired only through the pinned package's own
  installer at the package-pinned browser revision. No new workflow files;
  P016-04 must prove all six existing CI lanes green with browser acquisition
  working on each OS.
- P016-04 MUST perform package-level qualification at adoption time per
  handoff section 6: exact version, package integrity/lockfile,
  repository/source pin, license, NOTICE, Node engine compatibility,
  transitive dependency inventory, browser download behavior, CI/browser cache
  behavior, security advisories if available, required browser binaries,
  artifact size impact.
- This authorization artifact itself adds NO dependency; `package.json` /
  `package-lock.json` change only at P016-04 and only for this pin.

## Allowed tracked paths for successor wedge slices

Successor implementation PRs under this authorization (each separately
exact-head qualified and maintainer-verified) may touch only:

- `src/browser/**` additions: Intent IR, executor contract, Playwright
  adapter, browser evidence, locator policy, recovery semantics, artifact
  ingestion (new files; the directory is new)
- `tests/browser-*.test.ts` additions proving each new behavior
  (contract/integration; new files only)
- `benchmarks/browser/**` additions for owned synthetic fixture apps and
  harness expansion (P016-09; new files only)
- `docs/browser-*.md` additions for wedge behavior and evidence semantics
- `package.json` / `package-lock.json` ONLY at P016-04 and ONLY for the
  `playwright@1.63.0` exact pin

They MUST NOT: modify `src/quality/**` (reference-only reuse of Spec 015
stability/discrimination/admission semantics); modify any existing test,
benchmark, workflow, or configuration file; add any other runtime dependency,
service, database, daemon, model requirement, plugin framework, graph
database, or sandbox dependency; amend the Constitution; implement Spec 014;
copy donor code (Playwright or Momentic); import external corpora; auto-merge
generated tests; weaken admission, redaction, drift, selection-accounting, or
exit-mapping gates; create workflows; publish to npm; or create tags/releases.

## Source/provenance requirements

Every slice follows `SOURCES_AND_PROVENANCE.md`: exact version/source,
permission/license, transitive third-party obligations, Ascout modifications,
and benchmark need must all be answerable or the import is blocked.
Playwright package qualification occurs at P016-04 per handoff section 6.
Momentic remains design-reference-only under this authorization (see below).

## Trusted-local browser scope

Browser execution is developer-owned/trusted-local only: loopback and
explicitly allowlisted fixture origins. No persistent trust grants, no
arbitrary third-party browsing by default, no implicit broad internet-agent
authority. Every execution records its explicit origin allowlist.

## Browser/environment identity

Every browser execution and evidence record MUST carry executor identity:
browser engine/version/channel, context options (viewport and material flags),
OS/arch/runtime, exact source state SHA, and environment fingerprint.
Evidence bound to another source tree MUST throw or fail closed, never leak.

## Artifact/privacy rules

Traces, screenshots, storage state, network payloads, and console output are
sensitive artifacts: retention MUST be bounded, references MUST expose
redaction/truncation state where applicable, and recognized secrets or
credentials MUST NOT be persisted in clear text by Ascout-owned artifacts.
No raw credential persistence; storage/auth state treated as sensitive;
no shell interpolation from intent text.

## Canonical benchmark integrity gates (verbatim)

The following counts MUST remain zero in every qualifying benchmark; no
aggregate score may override them:

```text
fabricated_pass = 0
hidden_applicable_not_run = 0
cross_tree_evidence_leakage = 0
source_binding_violation = 0
silent_semantic_heal = 0
cache_authority_escalation = 0
secret_leakage_from_ascout_owned_artifacts = 0
unqualified_model_only_pass = 0
recovery_history_erasure = 0
```

## REQ-ORACLE-MESH ownership (explicit)

P016-05 owns concrete browser oracle-record implementation acceptance: every
material browser assertion MUST carry an explicit oracle classification (such
as DOM, ACCESSIBILITY, NETWORK, CONSOLE, STATE, VISUAL, MODEL, HUMAN) with
authority, provenance, source binding, and evidence references. P016-02
carries oracle policy references that do NOT constitute browser oracle
evidence; P016-09 benchmark-validates oracle behavior. Model output MUST
NEVER silently acquire deterministic PASS authority.

## Hard exclusions

This authorization explicitly excludes:

- cloud control plane (no hosted service as required core);
- browser farm (no remote/multi-device execution grid);
- mobile first wedge (no iOS/Android surfaces);
- Momentic source import (founder permission is attested, but no exact
  snapshot or written permission artifact exists in tracked evidence; import
  requires a separately exact-qualified authorization satisfying handoff
  section 7 — until then, design-reference-only);
- silent semantic healing (see deterministic-first principle);
- graph database, persistent memory service, public plugin SDK, autonomous
  exploration, model-based locator resolution, automatic source/test mutation
  or merge.

## Benchmark targets

P016-09 MUST prove on Ascout-owned synthetic fixture apps with seeded
defect/drift cases: reproducible execution, visible recovery/failed attempts,
`SEMANTIC_DRIFT_DETECTED` surfacing, and all nine integrity gates at zero.
Agentic/multimodal expansion (P016-10+) requires this evidence plus a
separate authorization. Completion means
`SPEC_016_DETERMINISTIC_BROWSER_FOUNDATION_COMPLETE` per handoff section 10;
it does not mean the Ascout project is complete.

## Security/privacy constraints

Trusted-local scope only; bounded artifact retention with disclosed
redaction limits; no credential persistence; no untrusted-repository or
arbitrary-internet execution; no weakening of source binding or
no-green-by-omission. Any slice proposing broader authority MUST stop and
seek a separate authorization.

## This artifact PR's own purity

This authorization PR changes exactly one tracked path:

- `specs/016-browser-agentic-verification/P016_01_FIRST_WEDGE_IMPLEMENTATION_AUTHORIZATION.md` (this file)

No product source, test, benchmark, workflow, dependency, or configuration
path changes here.

## Qualification gate for this artifact

Before this artifact may merge, its exact head must prove:

- reverified canonical base (`3151dde029759c61ec8e98df4fda1b85fe95dd0a`) and live governance state (0 open PRs at authorization; no conflicting chain);
- branch purity: exactly the one new file above;
- exact-lockfile install, typecheck, full tests, build qualification;
- Project CI success on the exact head (attempt-1 failure, if any, preserved with classification; rerun only the failed scope on the unchanged head);
- Self Verification success where applicable;
- exact-head maintainer verification recorded durably; no external or independent reviewer is required;
- zero unresolved material review threads;
- pre-merge revalidation of canonical `main`, rulesets/protection, and expected head;
- guarded normal merge with unchanged expected head;
- post-merge ordered-parent/tree/main proof and push-triggered Project CI success before Issue #344 closes.

Any material mismatch is `NO_GO / RETURN_TO_AUTHORIZATION_OR_PLANNING`.
Failed attempts are preserved unmerged; no failed-attempt evidence is reused
by a successor.

## Downstream boundary

This authorization, once effective, authorizes only P016-02 through P016-09
slices under the per-slice loop (reverify, branch, implement smallest coherent
delta, focused + integration tests, benchmark case where claim-bearing,
exact lockfile/typecheck/build, exact-head CI, maintainer verification, zero
threads, pre-merge revalidation, guarded merge, post-merge proof). It does
not authorize P016-10+, Spec 014, any Constitution amendment, any donor
import, any external corpus, or any publication action.

```text
SPEC_016_P016_01_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
FIRST_BROWSER_WEDGE_IMPLEMENTATION_AUTHORIZED = NO
P016_00_PREDECESSOR_CLOSEOUT = SATISFIED
EXTERNAL_REVIEW_GATE = NOT_REQUIRED
WEDGE_IMPLEMENTATION = BLOCKED_BY_P016_01
SPEC_014 = SEPARATE_CHAIN
```
