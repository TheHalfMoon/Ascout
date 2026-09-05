# Specification 008 — Requirements Quality Checklist

## Scope

- [x] Problem is limited to the missing isolated replay executor.
- [x] Product, selector, receipt, schema, CLI, dependency, release, manifest, harness, and historical-result changes are out of scope.
- [x] Proposed future tracked mutation surface is exactly one workflow file.
- [x] Proposed execution-control refs are exactly two fixed task branches.
- [x] No implementation or run-ref creation authority is claimed by planning artifacts.

## Trust and security

- [x] GitHub `create` event is the only trigger.
- [x] Replay job is admitted only for branch ref type plus two exact branch names.
- [x] Case identity is fixed by branch-to-case mapping; no arbitrary case/repository/command input.
- [x] Exact event/source SHA checkout and guard required.
- [x] Run refs must be newly created from canonical main and cannot be repointed/reused.
- [x] Repository permission is read-only.
- [x] Checkout credentials are not persisted.
- [x] No secrets or credentialed hosted service is required.
- [x] User-controlled shell command interpolation is forbidden.
- [x] Execution and artifact retention are bounded.

## Evidence integrity

- [x] Existing canonical harness remains the sole benchmark semantic/evidence authority.
- [x] Network-isolation claims are not invented.
- [x] Failed execution remains failed evidence.
- [x] No rerun-until-green or run-ref recreation behavior is authorized.
- [x] Exact Node/Yarn versions must be verified at runtime.
- [x] Exactly two repetitions remain required.
- [x] Historical T078/T091/T095 bytes remain immutable.

## Operational executability

- [x] The connected repository authority can create exact branches/refs.
- [x] Official GitHub semantics define `create` as firing when a Git branch/tag ref is created through repository Git-reference operations.
- [x] The design does not depend on an unavailable workflow-dispatch operation.
- [x] T111 and T112 remain separately ordered because their run refs are distinct and creation authority is predecessor-gated.

## Complexity

- [x] Existing Project CI/Self Verification are not expanded.
- [x] No reusable workflow, custom action, wrapper script, Docker image, daemon, service, cache protocol, or generalized framework is introduced.
- [x] No wildcard execution-ref namespace is required.
- [x] Linux-only is sufficient for the current replay contract.

## Governance

- [x] Clarifications are closed for planning.
- [x] First Ponytail/YAGNI review completed.
- [x] Technical plan completed.
- [x] Second Ponytail/YAGNI review completed.
- [x] Implementation tasks are dependency ordered.
- [x] Cross-artifact analysis is required before merge.
- [ ] Independent final plan audit must be observed on the final exact planning head.
- [ ] Fresh exact-head cross-artifact/branch-purity review must be observed on the final exact planning head.
- [ ] Separate implementation authorization must become canonical before workflow or task-run ref mutation.

## Planning verdict

`REQUIREMENTS_QUALITY = PASS_WITH_EXTERNAL_REVIEW_GATES_PENDING`