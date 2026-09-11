# Specification 013 Gap Evidence — Current-Head Release Readiness

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED / PUBLICATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #297
**Canonical base:** `bc5e1d807a5a116ec3286e3f68907751b67d2814`

## Measured current truth

At planning start, canonical `main` is `bc5e1d807a5a116ec3286e3f68907751b67d2814`.
The latest observed Project CI run is `34557139443`, `run_attempt=1`, `success`.
Its matrix contains six successful jobs:

- Ubuntu 24.04 / Node 22;
- Ubuntu 24.04 / Node 24;
- macOS 14 / Node 22;
- macOS 14 / Node 24;
- Windows Server 2025 / Node 22;
- Windows Server 2025 / Node 24.

Open pull requests are `0`. GitHub Releases are `0`.
The package manifest remains intentionally non-release state:

```json
{
  "name": "@thehalfmoon/ascout",
  "version": "0.0.0",
  "private": true
}
```
## Historical release-candidate evidence is stale for current main

M1 T088 previously qualified clean candidate
`982fb95c55005814fbd7d172c8c14f6b861e67db` and explicitly did not publish npm,
create a tag, or create a GitHub Release.

The historical candidate is an ancestor of current `main`, but current `main` is 571 commits
after that candidate. The base-to-current delta includes material changes to runtime source,
receipt/schema behavior, runner discovery, changed-code exercise, environment evidence,
benchmark machinery/results, CI/self-verification workflows, and post-M1 specifications.

Because Ascout governance requires source-bound truth, T088 evidence cannot be transferred
to `bc5e1d8` as release-candidate proof.

## Publication authority gap

`docs/npm-package-identity.md` selects `@thehalfmoon/ascout` as repository package identity
but explicitly does not prove authenticated control of the `@thehalfmoon` npm scope.
No authenticated npm scope/ownership evidence is present in the canonical repository.

Therefore current evidence supports a new release-readiness planning chain, not publication.
The planning chain must determine the minimal current-head qualification and authority sequence,
and must keep GitHub release/tag authority distinct from npm registry publication authority.

```text
MEASURED_RELEASE_READINESS_GAP = PRESENT
CURRENT_HEAD_PROJECT_CI = SIX_LANE_SUCCESS
CURRENT_HEAD_RELEASE_CANDIDATE_QUALIFICATION = NOT_PROVEN
GITHUB_RELEASE = ABSENT
NPM_PUBLICATION = ABSENT
NPM_SCOPE_CONTROL = NOT_PROVEN
IMPLEMENTATION_AUTHORITY = NO
PUBLICATION_AUTHORITY = NO
```
