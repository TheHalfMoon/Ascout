# M1 Redaction Policy v1

**Status:** Canonical clarification for `FR-029` / R19  
**Scope:** M1 exact-value redaction only  
**Feature:** `001-changed-code-verification-receipt`

## Decision

M1 uses a deliberately narrow, deterministic baseline of recognized secret-bearing environment variable names:

```text
GITHUB_TOKEN
GH_TOKEN
NPM_TOKEN
NODE_AUTH_TOKEN
```

These names are product defaults. `ascout.config.json.redactEnv` adds user-specified environment variable names to this set for the current configuration.

M1 does **not** infer secret names from suffixes or substrings such as `*_TOKEN`, `*_SECRET`, `*_PASSWORD`, or `*_KEY`. Broad name heuristics are outside this policy because they can cause unpredictable evidence corruption and are not required to satisfy the founding local verification receipt.

## Matching semantics

1. The configured/recognized name set is de-duplicated.
2. Each selected environment variable contributes its current exact non-empty value only when that value satisfies the existing minimum-value-byte safety threshold.
3. Selected values are de-duplicated and longer overlapping values are processed before shorter values.
4. Redaction is exact-value replacement in persisted/rendered material; no regex/content inference is performed.
5. The same selected-value set is applied to:
   - executed task stdout/stderr before persistence;
   - executed task persisted/rendered argv;
   - refused / `NOT_RUN` / `NOT_APPLICABLE` task persisted/rendered argv when resolved argv exists.
6. Raw argv and child-process environment may exist transiently for execution but secret-bearing raw values are not written to receipt artifacts.
7. Empty values and values below the minimum-byte threshold do not become redactors.

## Name case semantics

The canonical recognized names above are exact uppercase names. Ascout does not add its own case-folding or fuzzy-name matching. Environment lookup follows the runtime environment map supplied to the redaction primitive; tests use exact canonical names so cross-platform product policy remains explicit rather than heuristic.

## Extensibility

Users may protect additional exact environment names through `redactEnv`, for example project-specific API credentials. Adding another product-default recognized name requires a reviewed policy update and regression coverage; it is not inferred dynamically.

## Non-claims

This policy is best-effort evidence hygiene, not universal secret detection. It does not inspect arbitrary source files for secrets, scan entropy, parse credential formats, or guarantee that unknown secret values cannot appear in child-process output.

## Required regressions

M1 regression coverage must prove:

- each built-in recognized name is selected when populated with a value above the safety threshold;
- an unrelated environment variable is not selected automatically;
- `redactEnv` adds a custom exact name;
- built-in/user values use the same redaction path for output and argv;
- refused/non-executed resolved argv cannot bypass selected-value redaction;
- empty/short values do not create unsafe global redactors;
- overlapping values are deterministic.

This clarification does not authorize new runtime dependencies or any Phase 4+ capability.