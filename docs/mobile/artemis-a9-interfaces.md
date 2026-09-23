# ARTEMIS-A9 — Ascout MCP and CLI Interfaces

Ledger: Issue #471.
Predecessor: ARTEMIS-A8 CLOSED_CANONICAL / COMPLETE.

## Scope

A9 freezes governed mobile interfaces: eight Ascout-owned tools with
effect routing, exact-keys argument validation, and admission checks,
plus their CLI verb mapping. No executables, no wiring, no product
expansion in code.

## Rules

- Tool names live in the `mobile_*` namespace only. Raw donor
  namespaces never validate and never admit; the catalog itself is
  asserted free of donor naming.
- Every tool binds exactly one mobile effect. Calls whose required
  effect is not admitted are refused with an explicit reason.
- Arguments validate with exact keys per tool. `mobile_run` admits
  only plans that already pass A7 planner-output validation within
  the admitted step budget; `mobile_replay` admits recorded ranges
  with non-negative origins.
- CLI verbs (`mobile doctor`, `mobile run`, ...) map one to one from
  tool names. The mapping is contractual for later wiring phases; A9
  adds no `bin` commands, no MCP server, and no product surface.
- Intent, policy, effect ceilings, and phase authority stay sovereign
  in Ascout. These interfaces request admission; they never grant it.

## Non-goals for A9

Server and CLI implementation (later work under product authority),
product UI (A10), hardening (A11), and everything after. No A9 code
spawns, serves, or executes anything.
