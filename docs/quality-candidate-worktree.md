# Isolated Candidate Worktree — Wedge Slice 5

Fifth Spec 015 implementation slice under P015-03 authorization
(effective after PR #331 merge `1299346`, Issue #330 closeout; predecessors:
PR #332 merge `9145812`, PR #333 merge `e4e6fb0`, PR #334 merge `930d03e`,
PR #335 merge `fec143a`).

## What this slice adds

`src/quality/worktree.ts`: disposable native git worktrees that pin a
candidate to the exact source tree its proposal targets:

- `createCandidateWorktree` creates a detached worktree at an exact
  40-hex source identity under a caller-owned parent directory, then
  verifies HEAD identity and cleanliness before returning. Existing
  targets are never overwritten;
- `materializeProposal` writes a proposed candidate into the worktree
  only. It refuses proposals bound to another tree, rejected proposals,
  and any test file that does not resolve strictly inside the
  worktree. Core source is never written;
- `verifyCandidateWorktreeIdentity` returns the verified HEAD and
  throws when the worktree drifted from its pinned tree;
- `disposeCandidateWorktree` removes the worktree through git, prunes
  admin state, and verifies it is gone. Anything outside the recorded
  parent directory — and the repository root itself — is refused.

Git is invoked with argv arrays only (never a shell), bounded timeouts,
and no credential prompts. Candidate bodies stay caller-supplied model
or template proposals; this module binds them to isolated state without
executing them.

## What this slice does not do

No test execution, no candidate stability or discrimination evaluation,
no admission decision, no auto-merge, no benchmark corpus, no donor
code, no dependency change, no CLI surface change. Execution evidence
collection inside the worktree arrives in later slices under the same
authorization.

## Evidence

`tests/quality-candidate-worktree.integration.test.ts` builds synthetic
temporary git fixtures (no external corpus) and proves exact-tree
creation with a clean core, worktree-only materialization, cross-tree
and rejected-proposal refusal, escape refusal, disposal with double-
disposal failure, creation-boundary refusal, and drift detection.
