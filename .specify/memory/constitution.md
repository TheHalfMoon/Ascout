<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Modified principles: none (initial ratification)
- Added principles:
  - I. Evidence-Bound Truth
  - II. No Green by Omission
  - III. Source-Bound Integrity
  - IV. Native Capability and Minimal Core
  - V. Trusted, Bounded Local Execution
- Added sections:
  - Product and Safety Constraints
  - Development Workflow and Quality Gates
- Removed sections: none
- Follow-up TODOs: none
-->

# Ascout Constitution

## Core Principles

### I. Evidence-Bound Truth
Every material Ascout result MUST identify the task that produced it and the evidence bound to
that task. Evidence MUST be run-bound and MUST NOT silently transfer between source trees.
Finding fingerprints MAY help match apparent findings across runs, but MUST remain weak,
versioned identifiers and MUST NOT be treated as evidence or proof of sameness. AI-generated
hypotheses, if introduced in the future, MUST NOT be promoted to evidence without an independent
verification mechanism. The reason is foundational: Ascout exists to prove what was checked,
not to amplify unverified claims.

### II. No Green by Omission
`PASS` MUST mean that the task actually ran and completed successfully. Deselected, disabled,
unavailable, budget-limited, blocked, unsupported, or otherwise unexecuted verification MUST
remain visible in the receipt and MUST NOT be collapsed into green status. Ascout MUST preserve
a distinct status for repository/test failure, flakiness, blocked work, Ascout/task execution
error, non-applicability, and reason-coded non-execution. The product MUST prefer an honest gap
over a false assurance.

### III. Source-Bound Integrity
Every run MUST bind evidence to the exact repository and source state it observed, including HEAD
when available and a digest of the relevant dirty tree. Ascout MUST detect source drift between
the beginning and end of verification and MUST NOT represent drifted evidence as stable.
`in_changed_lines` MUST remain a locational fact only; `introduced_by_change` MUST remain a
separate causal field and MUST default to `unknown` unless comparative evidence proves causation.
Tracked source mutations caused by verification tools, including tracked snapshot changes, MUST
remain visible rather than being hidden by digest exclusions.

### IV. Native Capability and Minimal Core
Ascout MUST use proven ecosystem-native capabilities before inventing replacement infrastructure.
Git diff, Vitest/Jest related-test selection, native coverage formats, TypeScript project behavior,
workspace metadata, and tool-native incremental caches are preferred when they satisfy the
requirement. M1 MUST NOT introduce a daemon, server, graph database, SQLite requirement, Rust
rewrite, semantic repository graph, public plugin SDK, local LLM, or cloud control plane without
new evidence that the simpler design is insufficient. Architecture MUST be earned by demonstrated
need, not prepared speculatively for roadmap items.

### V. Trusted, Bounded Local Execution
Ascout v0.x MUST operate only on the developer's own trusted local repository. Arbitrary
third-party repositories and untrusted PR branches are out of scope until a separately authorized
sandbox/admission design exists. Ascout MUST never install dependencies implicitly. Every executed
task MUST record command provenance (`user_config`, `repo_config`, or `discovery`) and its relevant
source path. Changes to the command surface MUST be surfaced before execution. All tasks MUST be
bounded by timeouts; concurrent M1 runs MUST be refused rather than queued. Automation MUST NOT
silently expand command authority.

## Product and Safety Constraints

- The core verification path MUST require no Ascout account, SaaS backend, repository upload,
  cloud model, or model/API key.
- Ascout MUST NOT claim that child processes, tests, or third-party tools were offline unless
  their network behavior was actually controlled and verified.
- M1's primary product contract is an evidence-bound changed-code verification receipt showing:
  changed scope, verification that ran, verification that did not run and why, selected and
  deselected test accounting, changed executable lines exercised by tests, changed executable
  lines not exercised by tests, factual test-file changes, and exact source identity.
- M1 MUST distinguish at least: `PASS`, `FAIL`, `FLAKY`, `BLOCKED`, `ERROR`, `NOT_APPLICABLE`,
  and `NOT_RUN(reason_code, reason_text)`.
- M1 MUST NOT use a universal proof/confidence ladder.
- Verification coverage MUST be described as observed execution, never as proof of correctness.
- Ascout MUST NOT silently rewrite product source. Verification artifacts MUST live in ignored
  Ascout/tool-owned paths. Any tracked-file mutation during verification MUST remain visible.
- Stored evidence MUST be treated as potentially sensitive. `.ascout/` MUST be ignored by default,
  recognized secret-bearing environment values MUST be redacted from captured output, and stored
  artifact behavior MUST be documented.
- Code, rule sets, vulnerability/advisory data, and executables MUST receive separate license and
  provenance review. Process isolation MUST NOT be assumed to cure use restrictions, AGPL network
  obligations, data-redistribution requirements, or nested third-party licenses.
- M1 scope is first-class local JavaScript/TypeScript verification for npm/pnpm/yarn repositories
  with Vitest/Jest where configured. Python MAY have a basic generic pytest execution path, but
  first-class Python affected-selection and coverage-to-diff semantics are deferred.
- CI/SARIF, browser orchestration, security-suite orchestration, mutation, property testing,
  fuzzing, DAST, load testing, accessibility, performance, semantic code graphs, AI reasoning,
  code generation, and automatic fixing MUST NOT shape M1 architecture.

## Development Workflow and Quality Gates

- GitHub repository truth is canonical. Work MUST begin from the exact current branch/head and
  MUST avoid destructive history rewriting.
- The founding input is `docs/founding/ASCOUT_MASTER_PLAN_V1.md`. Spec Kit artifacts derived from
  it MUST remain consistent with this constitution.
- The required planning sequence is:
  `constitution -> specify -> clarify -> Ponytail/YAGNI review -> plan -> Ponytail plan reduction
  -> tasks -> checklist -> analyze -> independent final plan audit -> implementation authorization`.
- Ponytail is a complexity gate, not an architecture generator. Reviews MUST ask whether a proposed
  subsystem is needed now, already exists in the ecosystem, can use a native capability, or can
  wait for benchmark evidence.
- M1 MUST center on `ascout init`, `ascout doctor`, and `ascout check`; additional verbs MUST require
  demonstrated workflow divergence rather than naming convenience.
- Affected verification MUST widen conservatively when selection confidence is reduced. Selection
  mode, selected test count, deselected test count, and widening triggers MUST be visible.
- The benchmark MUST measure Ascout's own contribution rather than merely donor-tool detection.
  Cross-tree evidence leakage and binding-integrity violations MUST be zero. Numeric selection
  thresholds MUST NOT be invented before corpus evidence exists; misses MUST be published and used
  to set later hardening criteria.
- No product implementation is authorized until Spec Kit cross-artifact analysis and the
  independent final plan audit pass.

## Governance

This constitution is the highest project-level governance authority for Ascout implementation and
planning. Specifications, plans, tasks, code reviews, and releases MUST demonstrate compliance.
When a lower-level artifact conflicts with this constitution, the lower-level artifact MUST change
unless the constitution itself is deliberately amended.

Amendments MUST:
1. state the principle or constraint being changed;
2. explain why the current rule is insufficient;
3. document downstream migration or compatibility impact;
4. receive an explicit version bump using semantic-versioning intent for governance:
   MAJOR for incompatible principle removal/redefinition, MINOR for new or materially expanded
   governance, PATCH for non-semantic clarification;
5. update the Sync Impact Report and amendment date.

Complexity MUST be justified by evidence. Roadmap optionality is not sufficient justification.
New external integrations MUST undergo exact-version license/provenance review before adoption.
Every canonical planning PR MUST verify constitution compliance before merge.

**Version**: 1.0.0 | **Ratified**: 2026-08-21 | **Last Amended**: 2026-08-21
