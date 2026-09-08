# Specification 009 — Gap Evidence

## Status

`GAP_EVIDENCE = PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`

Planning ledger: Issue #252  
Planning inception base: `fb6bb2ec152e41da05901509b0b62d1eb3636648`  
Planning inception-base tree: `f2a7331aaac4108375979afda3d706f9aa2e0fd7`  
Live qualification base: `9093ee06c45234d1dee0fbe30d3a0d8fd415fe6f`  
Live qualification-base tree: `79b10c40d72e464c58e8afc52386f27a515fd584`

## Evidence-backed gap

Ascout already has a strong receipt JSON Schema, a semantic receipt validator, focused contract tests, cross-platform Project CI, and canonical self-verification. Those facts prove that many individual invariants are implemented and tested. They do not prove that the receipt contract has been challenged as a bounded adversarial system.

The post-M1 roadmap explicitly identifies a receipt mutation/adversarial corpus as an M1.2 trust workstream. The intended attack classes include dangling evidence, cross-run links, invalid paths, source/base mismatch, inverted ranges, contradictory status/completeness/exit values, secret-bearing output, and tool/config ambiguity.

Current tests are distributed by feature and regression. There is no dedicated corpus with all of the following properties together:

1. one known-good canonical receipt control;
2. explicit named one-fault mutations;
3. a declared expected rejection layer for each mutation (`schema` or `semantic`);
4. exact expected semantic issue codes where the semantic validator is the authority;
5. valid controls proving the harness itself does not simply reject every input;
6. deterministic enumeration and stable case identities;
7. a fail-closed rule that an accepted invalid case is a product gap, not permission to weaken the corpus.

## Why this gap is material

The Constitution makes receipt integrity part of Ascout's product contract. In particular:

- evidence references must resolve to current-run evidence;
- source truth must remain bound to the exact run/source state;
- missing applicable verification must not become green by omission;
- changed command surfaces must remain explicitly admitted or refused;
- invalid raw paths must not be normalized into valid-looking evidence;
- completeness and exit semantics must remain mutually consistent;
- secret-bearing persisted material must remain outside receipt truth where the contract can deterministically identify it.

A validator with only feature-local positive/negative tests can still contain composition gaps. A small explicit corpus is a lower-complexity way to challenge those boundaries before adding broader product scope.

## Current selector evidence does not justify selector mutation first

Historical T078 published one Ascout selector miss in the six-case founding corpus. Spec 002 repaired the bounded nested Jest/Vitest configuration-fidelity defect. T091 then published zero Ascout selector misses in the six-case replay while preserving three unavailable Ascout outcomes and all unavailable comparator facts.

This does not prove universal selector correctness. It does mean the strongest known selector miss already has a bounded canonical repair, while receipt-adversarial coverage remains a named roadmap gap with no dedicated corpus. Spec 009 therefore plans trust testing rather than selector behavior expansion.

## Independence from Spec 007 terminal disposition

Spec 007 is `NO_GO / TERMINAL_UNDER_CURRENT_SPEC` because T113 could not produce an acceptable publication after two immutable failed attempts. Spec 009 does not retry, reinterpret, repair, or depend on T113.

Spec 009 must not:

- create any T113 execution ref;
- change the Spec 007 replay workflow;
- change historical benchmark results;
- infer missing membership evidence;
- use r1/r2 as mutable attempts;
- claim Spec 007 success.

## Candidate adversarial classes

Planning must cover only deterministic contract mutations that can be expressed without adding a dependency, network source, model, or generalized fuzzer.

### A. Evidence and artifact integrity

- dangling task `evidence_ids`;
- dangling finding `evidence_ids`;
- duplicate evidence IDs;
- evidence `run_id` mismatch;
- evidence `task_id` mismatch;
- dangling evidence artifact linkage;
- dangling task artifact reference;
- artifact task mismatch or unknown task where prohibited.

### B. Source and comparison integrity

- comparison base not equal to source-start HEAD;
- invalid full Git object IDs;
- repository identity kind/portable mismatch;
- source-start/source-end repository identity mismatch;
- source-end absence with non-unknown stability;
- stable/tree-drifted contradiction.

### C. Path and changed-range integrity

- backslash, absolute, scheme-like, duplicate-separator, dot-segment, and traversal spellings;
- rename without previous path;
- previous path on a non-rename;
- inverted/non-positive/fractional/overlapping changed ranges;
- non-text change carrying line ranges.

### D. Command-surface authority

- changed authority path absent from comparison;
- changed authority file not marked as command surface;
- changed surface with normal admission;
- explicit override without changed surface;
- refused changed surface with executed outcome;
- contradictory authority-path/admission shape.

### E. Execution and observation integrity

- reversed run/task timestamps;
- incomplete timing tuple;
- task outside run interval;
- duration mismatch;
- negative/fractional observations;
- failures greater than runs;
- PASS with failures;
- FAIL without failures;
- executed outcome with zero runs;
- non-executed status carrying execution-only facts where prohibited.

### F. Exercise and selection integrity

- negative/fractional selection counts;
- selected + deselected != total;
- unsafe selection reported complete;
- exercise count totals inconsistent with records;
- exercised record with zero/null execution;
- NOT_EXERCISED record with positive execution;
- UNRESOLVED without reason;
- source task references that do not resolve to an eligible executed test task;
- branch-record ordering/count/state contradictions where branch evidence is present.

### G. Summary and exit integrity

- incorrect task status counts;
- incorrect finding count;
- incorrect derived completeness;
- incorrect exit code for findings/flakes/errors/drift/material incompleteness;
- clean exit 0 while a material gap remains.

### H. Privacy-sensitive persisted values

Only include cases where current receipt contract and validators can deterministically identify the invalid persisted value. Do not create a fake universal secret detector. If a secret-bearing example is not currently a deterministic contract violation, record that limitation instead of pretending it is rejected.

## Success criterion

Planning succeeds only if it produces a small, explicit, reviewable corpus design whose implementation can determine one of two honest outcomes:

- every authorized invalid mutation is rejected at its declared contract boundary and valid controls pass; or
- at least one invalid mutation is accepted, which becomes durable gap evidence and returns product repair to separate planning.

No acceptance percentage is needed. For the bounded corpus, an authorized invalid case that is silently accepted is a material gap.
