# Engineering qualification — current findings

Status: IN_PROGRESS. Research remains separate in PR636. Canonical main ea93553a; proposed maintenance plan PR637.

The historical 300/900-second outputs remain failures and lack sufficient per-run source/error binding to identify a universal production defect. A new untouched-main direct-Vitest control completed 235 files, with 234 passed and one packaging error caused by missing npm_execpath; 2,230 tests passed, one failed, and 34 existing platform skips. The corrected canonical npm test control completed on unchanged main ea93553a: 235 files passed; 2,231 tests passed and 34 existing platform skips; native exit 0; wall 582.29 seconds. Individual test/process/CI deadlines remained unchanged. This fixes the external invocation harness, with no demonstrated production defect to patch.

A source-drifted diagnostic run was interrupted and retained, never qualified. A fail-closed cleanup helper did not terminate any process.

Instrumented single-case probes each made129Git launches and all passed under the unchanged native deadline. Measured Git time dominates this case, but none/20ms/100ms/none sampler variants did not reproduce the historical failure cluster. Source changes overlapping PR589/614 are not duplicated.

Hosted CI remains externally blocked before execution by GitHub account billing/spending restrictions. No billing, workflow or admission setting was changed. The founder directed local review; records preserve shared provider lineage and pending canonical policy admission.
