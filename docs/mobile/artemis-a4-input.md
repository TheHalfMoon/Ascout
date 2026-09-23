# ARTEMIS-A4 — Bounded Device Input

Ledger: Issue #461.
Predecessor: ARTEMIS-A3 CLOSED_CANONICAL / COMPLETE.

## Scope

A4 freezes explicit effect-controlled input: tap, type, swipe, back,
home, and bounded app launch. Argument validation, sequence budgets,
minimum-privilege admission, and frozen argv builders only. No
transport, no execution, no unrestricted ADB.

## Rules

- Six actions, each bound to exactly one mobile effect (`DEVICE_INPUT`
  or `APP_LAUNCH`), each mapped to its Ascout ceiling.
- Coordinates are integers 0..100000. Display-geometry clamping belongs
  to execution, not to A4 contracts.
- Type text is allowlisted to 4096 safe characters; shell metacharacters
  never pass validation, and spaces encode as `%s` for `input text`.
- Swipe duration caps at 10 seconds. Sequences cap at 64 actions and
  must fit the admitted step budget from the A1 envelope.
- Minimum privilege: an action whose required effect is not admitted is
  refused with an explicit reason. Missing authority fails closed.
- App launch uses `monkey` with exactly one event against the pinned
  package and launcher category. No `am start` with arbitrary intents,
  no unrestricted shell.

## Non-goals for A4

Transport and execution of input (later phase under effect ceilings),
locating (A5), Flash/Pro orchestration (A6/A7), and everything after.
No A4 code spawns a process and no A4 test touches a device.
