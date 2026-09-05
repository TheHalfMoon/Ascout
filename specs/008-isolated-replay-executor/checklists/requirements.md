# Specification 008 — Requirements Quality Checklist

## Scope

- [x] Problem is limited to the missing isolated replay executor.
- [x] Product, selector, receipt, schema, CLI, dependency, release, manifest, harness, and historical-result changes are out of scope.
- [x] Proposed future mutation surface is exactly one workflow file.
- [x] No implementation authority is claimed by planning artifacts.

## Trust and security

- [x] Manual dispatch only.
- [x] Closed two-case enum; no arbitrary repository or command input.
- [x] Exact Ascout SHA input and guard required.
- [x] Repository permission is read-only.
- [x] Checkout credentials are not persisted.
- [x] No secrets or credentialed hosted service is required.
- [x] User-controlled shell command interpolation is forbidden.
- [x] Execution and artifact retention are bounded.

## Evidence integrity

- [x] Existing canonical harness remains the sole benchmark semantic/evidence authority.
- [x] Network-isolation claims are not invented.
- [x] Failed execution remains failed evidence.
- [x] No rerun-until-green behavior is authorized.
- [x] Exact Node/Yarn versions must be verified at runtime.
- [x] At least two repetitions remain required.
- [x] Historical T078/T091/T095 bytes remain immutable.

## Complexity

- [x] Existing Project CI/Self Verification are not expanded.
- [x] No reusable workflow, custom action, wrapper script, Docker image, daemon, service, cache protocol, or generalized framework is introduced.
- [x] Linux-only is sufficient for the current replay contract.

## Governance

- [x] Clarifications are closed for planning.
- [x] First Ponytail/YAGNI review completed.
- [x] Technical plan completed.
- [x] Second Ponytail/YAGNI review completed.
- [x] Implementation tasks are dependency ordered.
- [x] Cross-artifact analysis is required before merge.
- [ ] Independent final plan audit must be observed on exact planning head.
- [ ] Fresh exact-head cross-artifact/branch-purity review must be observed before planning merge.
- [ ] Separate implementation authorization must become canonical before workflow mutation.

## Planning verdict

`REQUIREMENTS_QUALITY = PASS_WITH_EXTERNAL_REVIEW_GATES_PENDING`