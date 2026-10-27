# Self browser readiness qualification

Self now contains the exact existing Project CI Chromium setup step after exact-lock installation and before build/capture. It asserts the installed Playwright1.63.0 version, resolves its installed CLI, uses fixed argv and propagates launch/nonzero native failures. No original workflow command, guard, action pin, permission, source binding, deadline or upload behavior changed.

This closes an observed prerequisite gap: Project CI explicitly prepared Chromium before testing, while Self relied on the existing runtime's lazy provisioning. It does **not** establish why Task027's installed-Chromium contract failed once across two recorded runs. The original raw failure payload was not uploaded; that cause remains UNKNOWN.

Task027/PR649 closed canonically at main7a089771aaad8f599b2ee342cf2c17eac19f547b. Its final [closing record](https://github.com/TheHalfMoon/Ascout/blob/9812e4abb57d40ac563aa26e37e6fda00b06225c/qualification/native-clean-state/2026-10-27-closeout/REPORT.md),180 packet members,three core files and six sidecars were actually read back at9812e4a before Task028 began. Its twelve native suites passed, but Self inner1/FLAKY/materially_incomplete, local fullFAIL6 plus hook, unknown causes, Task024 provenance and unavailable selector comparison remain. The task's older source-checkpoint pending statuses are historical.

| Actual Task028 observation | Result |
| --- | --- |
| Final plan audit1757f56 | PLAN_CLEAR; no findings |
| Different consistency51fb2f4 | CONSISTENCY_CLEAR; one editorial status note addressed in following authority record |
| Bounded user-derived authority1a5b444 | Recorded before the first workflow edit; model verdicts supply no authority |
| Implementation53efe84 | Only four added YAML lines, including separator; exact655-byte source step SHA2569f40ed49d92ac46d4752de72de02c9942a22eb3856d518ad81de80ea2ff3d4db |
| Mechanical recovery | Removing that inserted block and separator recovers original target SHA2560ad849d2a6c94588d6762fa6925916a1fd521a25602b123e74baeb9c03e5817a byte-for-byte |
| Scope freeze | All435 source/test/benchmark entries and14 nontarget control hashes unchanged |
| Correctness/product/parsimony review53efe84 | No must-fix; pending-implementation roadmap phrase corrected in this status update |
| Separate workflow-boundary/security review53efe84 | SECURITY_BOUNDARY_CLEAR; no findings; static review only |
| Local D1 | Actual advisory medium-risk triage with low confidence; not a security/merge/release gate |
| Local Alibaba preview/rules | Both native exit0;3reviewable/10total, including workflow and two JSON files; Markdown excluded by default; rule lookup is guidance, not model review |
| New local browser installer/test/build/full suite | NOT_EXECUTED; workflow-only change leaves all435 executable product/test/benchmark entries unchanged |
| Task028 hosted setup/matrix/Self | PENDING actual execution; no badge or inner result inferred |

The security reviewer disclosed a first read-only instruction bootstrap command without RTK, an initially misquoted read-only revision query, and bounded read/search corrections. Those deviations are retained in its original report; they executed no project code and changed no project state. All subsequent review commands used RTK. Same OpenAI provider lineage supplies role separation, not provider-independent certification. Actual D1 and local preview/rules do not substitute for the independent reviews.

The final workflow SHA256 is `0f2ae0a554b0f5fa4fb7b80a302a3344dbf3d29624b0b465eefdcbe0348b021f`. Unchanged source-bound predecessor type/build/native/browser results retain their original source/tree/leaf bindings and literal failures. No new local full suite was requested merely to improve presentation, and no YAML-mirroring unit test was added. Actual changed-workflow hosted setup and full suites remain necessary.

[evidence.zip](evidence.zip) contains28 explicit minimized members. [evidence-lock.json](evidence-lock.json) binds the ZIP; its manifest contains original/published hashes, sizes and transformation flags. It preserves prospective ordering, exact step/mechanical observations, source/security reports, local tool outputs and reproducible scripts. Homes/emails/personal authors/raw signatures are minimized. Private REA, full manuals, dependency/cache/browser profiles, credentials, personal account/quota data and opaque artifacts are excluded. A transformed script is a public derivative, not byte-identical to its original hash.

Verify the ZIP SHA256, CRC and all member hashes against the manifest; parse the JSON/Python source without importing executable evidence. Reproduction must use recorded source revisions and pinned installed dependencies, adapting only redacted roots. Actual final-head/canonical setup, source guards, full test counts/skips, original Self receipt/selector/artifact truth and live eligibility are separate from this preparation packet.

Fresh final integrated/publication review, focused PR, actual hosted setup/matrix/inner Self, ordinary eligible merge, canonical postmerge suites, closing reviews and actual final remote proof remain pending. A valid adverse Self capture is SHADOW_NON_GATING under the effective FR-006–010 policy and does not establish clean qualification. Any admission refusal stays explicit without override. No paid service, new dependency, required application cloud runtime, global configuration, unsupported REA capture, UA-P07, security/provider/policy waiver, release or deployment authority. **E00/release remain BLOCKED.**
