# Research review and reconciliation

This is research review, not production release, security certification, UA-P07 authorization or a merge decision.

A fresh-context PStack combined judge reviewed all 15 decisions, source audit, README/roadmap, benchmark results, REA identity/coverage, replay locks/controller/harnesses and the archive inventory. The judge executed no donor tool and supplied no remote model/provider verdict. The initial inspected archive had SHA-256 `b59e021ac8085e4c982fe7a7dbc62fcf805098ccefc3d84abb36ee35d4d4c05d`; subsequent corrections produce a new archive recorded in REPLAY_LOCK.json. Do not apply the earlier archive hash to the final bytes.

| Finding | Correction and evidence |
| --- | --- |
| Escaped host paths in intermediate material | Published derivative replaces Windows, relative Users, WSL and Linux home paths. Raw original and sanitized hashes are distinguished. Original REA evidence stays local; the derivative is not authenticated for re-import. |
| Permissive in-toto policy accepted a changed product | Retained as a fixture-policy counterexample. Repeated strict REQUIRE/MATCH/DISALLOW layouts independently reject tampered or absent products, invalid trust roots/signature and expiry. Expected-command mismatch remains explicitly warning-only. |
| Version/source and historical fixture binding gaps | Exact release tags, source commits, artifact hashes, package locks and source acquisition statuses are frozen. Later probes carry fixture/harness/run identities; earlier pilot limitations remain visible. |
| OSV malformed-input claim used an unsupported extractor argument | Earlier `npm:` invocation retained as a harness argument error. Corrected filename-based package-lock extraction rejects invalid JSON twice with exit 127; raw stderr identifies the JSON parse error. |
| Browser replay could copy an old report | The replay helper removes prior source/output reports immediately before each invocation, retains only new reports, and records process run ID, timestamp, outcome and original/published report digests. Mocked regression probes verify missing and newly created report paths. Historical browser reports do not gain this stronger binding retroactively. |
| OpenGrep replay downloaded unexpectedly | Replay requires the installed binary and verifies the release digest. A missing executable fails closed without a network request. Public acquisition occurs in explicit setup. |
| Nx replay omitted native controls | Replay now runs a passing full baseline and failing full mutated control before affected-project probes. Actual rerun: baseline 0, mutated 1; explicit edge selects app/lib, absent edge selects lib, global config selects all three. |
| Stale package manifest and text encoding | Rebuilt final manifest after all report changes; explicit UTF-8 authoring preserves cost ranges. Final independent package verifier checks exact file membership, bytes and digests. |

The judge found all candidate decisions scoped to research authority, no manufactured speed/security winner, and explicit limitations for Sentrdel NOT_RUN, Windows process capture, mutation command runner, TesterArmy instability, WSL measurements and full-suite timeouts. Its bounded scans found no duplicate/traversal ZIP names, host paths or common secret formats in the reviewed package. Final checks repeat these bounded scans on the final archive; they do not certify that every possible sensitive string is absent.

Final read-only delta review found no remaining blockers in the corrected scope. The final archive SHA-256 is `d55191b788fc0387e1383c3710e71633d37cb1ba414f1c076ea76bba847ff1db`: all 707 inventoried records match within 708 members, package file hashes match, and repeated bounded privacy/secret scans found no matches. The judge confirmed the replay fixes and scope limitations; it did not execute donor tools or approve a release.

Typecheck/build and 332 focused tests passed. Both broad native controls timed out with failures. Graft supplied local static navigation, Alibaba supplied delegate-preview output, and D1 supplied advisory classification only. None is represented as an independent security or release gate. Clean-machine replay setup, macOS and Sentrdel runtime qualification remain unqualified.
