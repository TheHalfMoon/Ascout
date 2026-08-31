# Spec 003 Ponytail / YAGNI Review

**Decision:** `PASS_WITH_REDUCTIONS`

## Keep

- benchmark/test-only LCOV `BRDA` normalization;
- deterministic fixture corpus;
- line-vs-branch divergence measurement;
- fail-closed malformed/path-unsafe behavior;
- exact result artifact and cross-platform qualification;
- explicit `GO | NO_GO` promotion decision.

## Remove / defer

- product `src/` integration;
- receipt schema changes;
- function coverage (`FN/FNDA`);
- AST/control-flow graphs;
- source-map redesign;
- real-world corpus expansion beyond what is needed to establish mechanism value;
- mutation, browser, API, security, performance, accessibility, agent or memory verification;
- generic coverage plugin abstraction;
- new dependencies;
- new CLI flags/commands;
- policy language;
- hosted telemetry/history.

## Simplest defensible design

Use one small benchmark library to normalize `SF` + `BRDA`, one deterministic fixture manifest, one evaluator that compares declared changed ranges against existing line observations and normalized branch observations, and one canonical result JSON.

No abstraction should be introduced unless at least two concrete qualification cases require it.

## Complexity gate

The proposed qualification does not alter the trusted product execution path, does not execute new third-party tools, does not widen trust authority, and does not create a new schema/version. The complexity cost is therefore limited to benchmark parsing, fixtures, tests, and result serialization.

`YAGNI_GATE = PASS`
