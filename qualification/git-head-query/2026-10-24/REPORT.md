# Task021-T01 qualification observations

Base `92433f7039393d6a08b8f993bc50da8470de2b5c`; source candidate `e855b16b668d490cf6e3b5bfbe11b0e36724ae0d`, tree `bfb9cbdbf0d54d6bd49afec7e6cec52331bc5e5c`. Final documentation/hosted/canonical qualification remains pending. This packet records observations, not release approval.

The bounded change reduces successful Git HEAD metadata reads from four processes to two, with strict exact-shape parsing and unchanged sequential fallback. It adapts only existing Ascout commitbb7ff354's small HEAD-query subset. Existing PR589/614 drafts and their broader security/hash changes remain untouched. Production scope is src/git.ts; tests/git-identity.test.ts adds14budget/fallback cases while retaining existing semantic assertions. Native deadlines, command authority, package/lock, configuration and workflows are unchanged.

## Executed local controls

| Control | Native result |
| --- | --- |
| Unchanged current-main four-file baseline | FAIL39passed/2Git deadlines/9existing platform skips;166.12s |
| Committed tests on old production source | FAIL15failed/11passed; all14new cases are RED |
| Candidate identity/focused controls | PASS26/26; PASS67passed/9existing platform skips |
| Typecheck/build | Both0 |
| Real-Git same-fixture diagnostic, five reads/source |20→10actual Git launches;1761.96→861.15ms; identical output |
| Complete canonical serial local suite | FAIL2390passed/1browser-disposal deadline/34existing platform skips,total2425;701.20s |
| Unchanged browser-only diagnostic afterward | PASS8/8; disposal215ms; does not erase full-suite FAIL |

The sole complete-suite failure is the unchanged browser test "fails an in-flight assertion on disposal and refuses reuse", observed5016ms against its original5000ms deadline. No exact cause is established and no browser repair is claimed. All Git/drift/CLI/T107 cases pass in the full control. Historical six failed deadlines and300/900-second capture failures remain historical failures. Native diagnostic timing and aggregate host context do not isolate a sole cause. E00 and release readiness remain BLOCKED.

The fresh qualification interpretation cites Spec021 requirements6/7 and CONTRIBUTING's distinction between task failures and separately owned debt. It permits conditional focused-task eligibility after actual exact-head reviews/CI/postmerge evidence, while requiring complete local PASS and qualified integrated main before E00/release resolution. This is an interpretation record, not a governance change or waiver. The current evidence does not itself grant merge approval.

## Evidence and limits

[evidence.zip](evidence.zip) contains61members, including native manifests and full stdout/stderr, real-Git benchmark inputs/results/helper, host observations, fresh plan/consistency/correctness/security reviews, actual D1 advisory response and local Alibaba OCR/Graft execution. [evidence-lock.json](evidence-lock.json) binds the ZIP SHA256 `7745b78c564ac305dd392166ef75199ccafaef691ca08ae631a56eaeb804521a`. The archive's MANIFEST.json preserves both original and sanitized-public SHA256 values. Raw local identities are transformed explicitly; originals remain local. Rebuilding the ZIP with identical inputs uses fixed member timestamps.

Fresh PStack source reviews report no actionable issues but disclose shared OpenAI lineage. Actual Alibaba preview/rules and Graft static execution are not an external model review. D1's advisory output and known600M security limitation cannot approve or replace gates. Native Git/CLI/T107 E2E ran; no new browser surface or TesterArmy execution is claimed in this Git task. No Codex Security plugin scan or UA-P07 authority is claimed.

Actual final-head six-lane hosted suites, Self source/artifact verification, live review threads, guarded merge and actual postmerge controls are still pending. Self green must retain any inner packaging FAIL/material incompleteness/selector UNAVAILABLE. Development advisories remain open for a separate prospective repair. Completed research and Spec018/020 source/evidence are preserved.
