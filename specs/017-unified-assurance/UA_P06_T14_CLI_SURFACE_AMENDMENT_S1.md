# UA-P06-T14 CLI Surface Amendment — Supplement S1

**Status:** `PROPOSED / NOT_EFFECTIVE / FOUNDER_APPROVAL_REQUIRED`
**Ledger:** Issue #602
**Supplements:** `UA_P06_T14_CLI_SURFACE_AMENDMENT.md` (#625, effective at main `2025ccd`), section 3
**Prepared by:** a Claude coding agent. Proposal only; Claude may not authorize, approve, or make it effective.

## 1. Gap found while implementing T14

The effective amendment lists the canonical sentinels T14 changes. Running
the full suite with the T14 command applied (scratch head based on T13
`65effa4`) shows that three of the listed files pin the **exact usage text**,
not only the refused-command list:

| File | Pinned usage assertion |
|---|---|
| `tests/assurance-phase-qualification.test.ts` | `expect(usageText()).toBe(EXPECTED_USAGE)` (constant at lines 37–44) |
| `tests/assurance-phase-recovery-qualification.test.ts` | `expect(usageText()).toBe(EXPECTED_USAGE)` (constant at lines 36–43) |
| `tests/assurance-review-p03-t15.test.ts` | `expect(usageText()).toBe([...].join("\n"))` (lines 252–260) |

Section 3 authorizes only removing `"security"` from these files' refused
lists, so the mandated usage line (section 3 item 1, decision B) cannot land
without an edit section 3 does not cover. The amendment did not foresee this;
it is not a scope change.

Full-suite result with T14 applied: the only T14-caused failures are the
five sentinels named in the amendment. Four other local failures
(`cli.smoke`, `drift`, `git-tree-digest`, `npm-package-content`) also fail on
the clean T13 head on the agent's Windows host (5 s Git timeouts) and pass
in CI; they are unrelated.

## 2. Proposed supplement (T14 only)

In each of the three files above, add exactly one line, identical to the line
already authorized for `tests/assurance-check-compatibility.test.ts`:

```text
"  ascout security [--format json|terminal]",
```

immediately after the `ascout test` usage line. No other line in those
constants or files changes beyond what section 3 already authorizes.

## 3. Non-expansion

No new command, option, path, or semantic change. Decisions A and B,
preservation of check/review/test behavior, the no-weakening rule, and the
positive replacement tests stay as recorded in the effectiveness record.

## 4. Admission gate

Same gate as the parent amendment section 6: founder authorization and
exact-head approval of this document, one-file diff, exact-head CI attempt
1, review record, zero threads, guarded merge, post-merge CI, and an
effectiveness record on Issue #602.
