# Maintenance tasks and acceptance

| Task | Depends on | Surfaces | Acceptance | Status |
| --- | --- | --- | --- | --- |
| REA-E00 | exact current main | existing tests, external diagnostic harness/evidence | complete suite summary; causes separated from hypotheses; preserved failures | RUNNING |
| REA-E01 | merged review spine + exact plan audit | review normalization/coverage | eight inputs accounted once; suppression/exclusion/locationless/invalid/missing explicit; wrong-source/duplicates fail closed | PLANNED |
| REA-E02 | merged selection spine + exact plan audit | selection | source controls unchanged; data/dependency uncertainty widens; full controls catch seeded failure; no deselected-as-passed | PLANNED |
| REA-E03 | merged mutation spine + exact plan audit | optional JSON translator | strong 5 killed/weak 4 survivors preserved; error/no-coverage/timeout/pending/invalid reports explicit; no process-zero promotion | PLANNED |
| REA-E04 | merged P016 runtime + exact plan audit | browser executor/adapter | real working/broken/timeout/session/disposal cases; literal bounded intent; unsupported still unavailable | PLANNED |

All tasks require one focused branch/PR, tests first, relevant mechanical checks, fresh exact-head local review and explicit canonical/external gate status. No feature task depends on another unmerged feature task. Canonical dependency claims refer only to the verified merged spines, not to an unratified new phase.
