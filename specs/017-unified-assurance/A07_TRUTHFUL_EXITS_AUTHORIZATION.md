# A07 Implementation Authorization — Truthful Exit Semantics

**Status:** `PROPOSED / NOT_EFFECTIVE / FOUNDER_CONFIRMATION_AND_R1_REQUIRED`
**Ledger:** Issue #655
**Authorization base:** `ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430`
**Packet:** `E2 — truthful CLI exits`

## 1. Purpose

This artifact defines the only authority that may change the exit semantics of `ascout review`, `ascout test`, and `ascout security`, and of operational errors on all commands, after it becomes canonically effective.

It is authorization-only. It implements nothing and grants no source mutation authority merely by existing on a branch or pull request.

```text
A07_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
A07_IMPLEMENTATION_AUTHORIZED = NO
A07_CONSTITUTION_AMENDMENT = PROPOSED / NOT_RATIFIED
```

## 2. Canonical predecessors and evidence

```text
CANONICAL_MAIN = ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430
CONSTITUTION_VERSION = 1.3.0 (Amendments A04, A05, A06 ratified)
```

The problem is recorded in the E0 baseline in draft PR #654. At this base:

| Situation | Current exit | Problem |
| --- | --- | --- |
| `review` with changed files and no engine | 0 | A caller checking the exit code sees success, though nothing was reviewed |
| `test`, any profile | 0 | Prints a plan and runs no test, even outside a repository |
| `security` | 1 | Same code `check` uses for a verified finding, though nothing was scanned |
| Operational error, such as running outside a repository | 1 | Same code as a finding |

PR #653, which proposes this taxonomy, remains an unratified draft. This artifact stands on its own and does not ratify PR #653.

## 3. Founder decision record

```text
FD-1 | selected: section 3.1 | base: ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430 | date: 2026-11-06
identity: repository founder, in a working session; to be confirmed on this PR
conditions: section 3.2 | human R1 reference: PENDING
```

An assistant transcribed this record from the founder's answers. It is not effective until the founder confirms it on this pull request.

### 3.1 Selected options

| Question | Founder's choice |
| --- | --- |
| Adopt the truthful exit taxonomy for `review`, `test`, and `security` | Ratify as proposed: one breaking switch with no legacy flag. `REFUTED` is allowed only with a separately qualified contradiction, never from a raw scanner finding |
| `test --profile standard` before real execution exists | Exit 4, and add `test --plan`, labeled `NON_ASSURANCE_PLAN`, which exits 0 |
| `review` with an empty scope | Exit 0 as `NOT_APPLICABLE`, only when no eligible scope is proved, with `executed_count` 0 and an explicit "not reviewed" label |
| Operational errors | Move to exit 2 on all commands, including `check` errors before a receipt exists, and `doctor` |

### 3.2 Conditions added by drafting, for founder review

These follow from the choices above but were not separately put to the founder. Confirming this record accepts them.

1. **Deletion-only changes are not empty scope.** `src/cli.ts:300-303` removes deleted files before testing for an empty scope, so a change that only deletes files currently reports no changed files. That case must exit 4, not 0.
2. **Every `test` profile follows the same rule.** The choice names `standard`, but `quick`, `deep`, and `release` also print only a plan today. All must exit 4 until real execution exists. A bare `ascout test` uses the default profile and follows the same rule.
3. **`A05` and `A06` are narrowly superseded.** See section 4.2.

## 4. Bounded amendment

### 4.1 Delta (ratification candidate v1.3.0 to v1.4.0)

```text
AMENDMENT_ID = A07
AMENDMENT_SCOPE = CLI exit semantics only
VERSION_CHANGE = 1.3.0 -> 1.4.0
```

Amendment text to be appended as a bounded subsection titled `Amendment A07 — Truthful exit semantics`:

1. `ascout review`, `ascout test`, and `ascout security` use these exits: 0 for complete applicable work or a proved non-applicable or explicitly non-assurance operation; 1 for a verified finding or failure; 2 for an error or invalid evidence; 3 for source drift; 4 for required verification that did not complete. When several apply, precedence is 2, then 3, then 1, then 4, then 0.
2. Required verification that did not execute MUST NOT exit 0. A verified finding with missing coverage exits 1 and MUST keep the incomplete coverage visible.
3. `review` may exit 0 for an empty scope only when no eligible scope is proved. Its output MUST report `NOT_APPLICABLE` and zero executed work, and MUST state that nothing was reviewed. A change containing only deletions is not an empty scope.
4. An operation that only renders a plan may exit 0 only when explicitly requested and labeled `NON_ASSURANCE_PLAN`. It MUST NOT be presented as a test PASS.
5. Operational errors on all commands, including `check` before a receipt exists and `doctor`, exit 2 and MUST NOT be presented as repository findings.
6. Receipt schema v1.0 and its bytes are unchanged, as are the exits of `check` runs that produce a receipt.
7. A claim may be `REFUTED` only with a separately qualified contradiction, never from a raw scanner finding.
8. This amendment adds no engine, sandbox, network, service, dependency, or isolation claim. An exit code is one field of the evidence contract and is not proof of correctness.

No other Constitution text changes.

### 4.2 Narrow supersession

A05 clause 8 and A06 clause 5 say that `ascout check`, and for A06 also `ascout review` and `ascout test`, remain unchanged. A07 supersedes those statements only for the exit semantics in section 4.1. They otherwise stay in force.

### 4.3 Ratification mechanics

```text
CONSTITUTION_CHANGE_IN_THIS_PR = NO
MECHANICAL_APPLICATION_PR_REQUIRED_BEFORE_E2 = YES
MECHANICAL_APPLICATION_SCOPE = .specify/memory/constitution.md exact section-4.1 text plus version 1.4.0 only
E2_START_BLOCKED_UNTIL = this authorization EFFECTIVE and constitution v1.4.0 on canonical main
```

## 5. Authorized task after effectiveness

One task, `E2`, on one branch from then-current canonical `main`. It changes exit behavior and the output fields needed to report it truthfully, and adds `test --plan`. It adds no engine and no `review --delegate`.

### 5.1 Positive mutation surface

Only these paths may change. No path is created or deleted.

```text
src/cli.ts
src/assurance/review/review-command.ts
src/assurance/test/test-plan-command.ts
src/assurance/security/security-command.ts
README.md
tests/cli.smoke.test.ts
tests/assurance-security-t14.test.ts
tests/assurance-test-cli-test-plan.test.ts
tests/assurance-review-p03-t14.test.ts
tests/t106-environment-publication.integration.test.ts
tests/exit-precedence.contract.test.ts
tests/cli-format.contract.test.ts
```

This list adds `tests/assurance-review-p03-t14.test.ts` and `tests/t106-environment-publication.integration.test.ts` to the list proposed in PR #653, because both pin exits this amendment changes.

If implementation shows another path must change, work stops and this authorization is amended first.

### 5.2 Frozen

`src/receipt/**`, receipt schemas and their fixtures, `check` receipt bytes, the task-status vocabulary, dependencies, workflows, and `vendor/`.

### 5.3 Required acceptance grid

| Case | Exit | Required output |
| --- | --- | --- |
| `review`, changed files, no engine | 4 | `NOT_RUN`, `complete: false`, unreviewed files listed |
| `review`, proved empty scope | 0 | `NOT_APPLICABLE`, zero executed, states nothing was reviewed |
| `review`, deletions only | 4 | `NOT_RUN`, deleted paths visible as unreviewed |
| `test` with each profile, and bare `test` | 4 | `NOT_RUN`, required work and reason visible |
| `test --plan` with each profile | 0 | `NON_ASSURANCE_PLAN`, no test PASS implied |
| `security`, no engine | 4 | `NOT_RUN`; JSON `exit_code` is 4 |
| `check`, `review`, `doctor` outside a repository | 2 | Error on stderr that does not imply a finding |
| Generic unexpected CLI exception | 2 | Error on stderr |
| Usage error | 2 | Unchanged |
| `check` producing a receipt | Unchanged | Receipt bytes unchanged under existing golden tests |

Exit codes must also be proved through the built `dist/cli.js`, not only in-process, on native Windows and POSIX. This includes PowerShell `$LASTEXITCODE` and `$?`, and POSIX `$?`.

A finding combined with incomplete coverage cannot occur at this baseline because no engine exists. That case stays `N/A` until an engine packet and must not be simulated as an executed result.

### 5.4 Rollback

Revert the E2 pull request with a new reviewable commit, then rerun typecheck, build, the tests in section 5.1, and `check` receipt golden comparison. Reverting restores the old exits. It must not touch the amendment without a separate governance change.

## 6. Hard exclusions

No false `PASS`. No skipped or weakened test to reach green. No deadline change. No change to `check` receipt content. No agent may approve this record, R1, or its own review.

## 7. Compatibility

This is a breaking change for any caller relying on the old exits. The package is `private: true` and unpublished, and no repository workflow calls these three commands. External callers on the owner's machines were not surveyed. `README.md` must document the change in the E2 pull request.

## 8. Authorization PR purity

This artifact's own pull request may change exactly one tracked path:

```text
specs/017-unified-assurance/A07_TRUTHFUL_EXITS_AUTHORIZATION.md
```

## 9. Effectiveness gate

Merging this artifact is not sufficient by itself. Before this authority becomes effective, all of the following are required:

1. Founder confirmation of section 3 on the exact pull-request head.
2. Human R1 review of that head, with the reviewer named and findings recorded.
3. Self Verification and Project CI success on that head across all six lanes. `macos-14` can no longer run, so this needs PR #652 or a recorded founder change to the claimed platforms. A cancelled lane is not a success.
4. Alibaba Open Code Review with no unresolved material findings, or its exact recorded limitation.
5. Jev evidence, or its exact recorded limitation.
6. Zero unresolved review threads and unchanged canonical `main` immediately before merge.
7. Guarded normal merge with exact expected head, then verified merge tree, parents, and signature.
8. Post-merge Project CI success across all six lanes.
9. Issue #655 closed as `CLOSED_CANONICAL / EFFECTIVE`.

Only after all conditions:

```text
A07_IMPLEMENTATION_AUTHORIZED = YES
A07_CONSTITUTION_AMENDMENT = RATIFIED
```

Until then, implementation stays forbidden. Model reviews are advisory and satisfy none of items 1 or 2.

Refs #655
Refs #654
Refs #653
