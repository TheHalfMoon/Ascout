# Engineering qualification — current findings

Status: IN_PROGRESS. Research remains separate in PR636. Canonical main ea93553a; proposed maintenance plan PR637.

The historical300/900-second outputs remain failures and lack sufficient per-run source/error binding to identify a universal production defect. A new untouched-main control completed235files, with234passed and one packaging error caused by direct Vitest invocation missing npm_execpath;2230tests passed, onefailed,34existingplatformskips. Canonical npm test control is running. Individual test/process/CI deadlines remain unchanged.

A source-drifted diagnostic run was interrupted and retained, never qualified. A fail-closed cleanup helper did not terminate any process.

Instrumented single-case probes each made129Git launches and all passed under the unchanged native deadline. Measured Git time dominates this case, but none/20ms/100ms/none sampler variants did not reproduce the historical failure cluster. Source changes overlapping PR589/614 are not duplicated.

Hosted CI remains externally blocked before execution by GitHub account billing/spending restrictions. No billing, workflow or admission setting was changed. The founder directed local review; records preserve shared provider lineage and pending canonical policy admission.
