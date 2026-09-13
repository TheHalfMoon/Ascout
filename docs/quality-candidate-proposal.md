# Candidate Test Proposal — Wedge Slice 4

Fourth Spec 015 implementation slice under P015-03 authorization
(effective after PR #331 merge `1299346`, Issue #330 closeout; predecessors:
PR #332 merge `9145812`, PR #333 merge `e4e6fb0`, PR #334 merge `930d03e`).

## What this slice adds

`src/quality/candidate.ts`: deterministic record of candidate test
proposals before any worktree execution or admission decision:

- `CandidateProposal` nodes binding a proposal id to its target
  obligation, the exact source tree it was written against, a
  repo-relative test file and test name, the proposed body, oracle
  provenance, and the producing model or template (`generated_by`);
- repo-relative path refusal: absolute paths, drive letters,
  backslashes, and dot segments throw, so a proposal can never escape
  its target tree by spelling;
- forward-only rejection with an accountable reason; rejected proposals
  stay rejected and re-proposal requires a new id;
- evidence attachment for later stability and discrimination records;
- deterministic JSON round-trip with strict validation.

A proposal is never verification evidence by itself. Advisory-oracle
proposals are recordable but stay proposals. A bare proposal does not
close a unit-test gap (`detectGaps` still reports `no-covering-test`).

## What this slice does not do

No worktree creation, no file materialization, no execution, no
stability or discrimination evaluation of candidates, no admission
decision, no auto-merge, no benchmark corpus, no donor code, no
dependency change, no CLI surface change. Materialization into a
disposable isolated worktree and admission gating arrive in later
slices under the same authorization.

## Evidence

`tests/quality-candidate.contract.test.ts` proves proposal binding,
path-escape refusal, forward-only rejection, evidence attachment, the
proposal-never-closes-a-gap composition with Slice 2, and deterministic
JSON round-trip integrity.
