# Specification 005 Ponytail / YAGNI Review

## Decision

`PASS_WITH_REDUCTIONS`

The roadmap candidate is narrowed to the smallest run-level reproducibility identity that can be observed without adding execution authority or infrastructure.

## Retained

- Node runtime name/version;
- OS/platform;
- architecture;
- existing-discovery package-manager identity;
- package-manager version only when already validated without execution;
- one safely selected supported lockfile path and SHA-256 digest;
- additive optional receipt-v1 object;
- deterministic validation and privacy tests.

## Removed or deferred

- function coverage;
- browser/test-environment identity;
- libc/kernel/distribution details;
- CPU model/count;
- hostname/user identity;
- environment-variable capture;
- dependency inventory/SBOM;
- package-manager process probing;
- executable/tool binary digests;
- full config-file digest graph;
- new policy/completeness semantics;
- receipt v2;
- new CLI command/flag;
- cloud/history aggregation.

## Complexity test

No new runtime dependency, daemon, database, external service, child process, workflow engine, or plugin abstraction is justified. Node built-ins and current discovery/file-reading infrastructure are sufficient.

## Result

Proceed to technical planning only with the retained bounded surface.