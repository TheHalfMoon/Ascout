# Spec 002 Clarifications

**Status:** COMPLETE_FOR_PLANNING  
**Spec:** `002-selection-config-fidelity`

## C-001 — Is the goal to parse package scripts?

No.

Package-script strings remain command authority, but Spec 002 does not introduce shell parsing, tokenization, or execution for config discovery. The repair uses recognized config files already collected by bounded discovery.

## C-002 — What is the supported project shape?

Single-package repositories only.

Basic-workspace nested-config ownership is deferred because selecting a nested config in a workspace requires additional package ownership/disambiguation semantics that are not necessary to repair the measured founding benchmark miss.

## C-003 — What happens when a root-level config exists?

Existing M1 root-level behavior wins unchanged. Nested fallback is considered only when no existing root-level effective config resolves.

## C-004 — What happens when multiple nested configs exist?

Fail closed.

Ascout must not choose by path order, path depth, filename extension, timestamps, package script text, or prior execution history. The test task becomes `NOT_RUN` with explicit config ambiguity.

## C-005 — Does the selected nested config become command authority?

Yes.

The selected nested config is an effective test command/config source. If it is changed by the current diff, the ordinary invocation must refuse the test task as `NOT_RUN(command_surface_changed)` until the user supplies the existing per-invocation admission flag.

## C-006 — Does Spec 002 change receipt schema or status vocabulary?

No.

All new truth fits the existing `configPath`, command-authority, selection, evidence, admission, and task result contracts.

## C-007 — Does the benchmark target become a product-specific hard-coded exception?

No.

The React Hook Form case is acceptance evidence for a general rule: a single-package project with no root config and exactly one nested recognized runner config may use that config explicitly. No upstream repository name, path, oracle ID, or benchmark case ID may appear in product selection logic.

## C-008 — What if nested fallback increases ambiguity in some repository?

That is acceptable and intentional. A newly visible ambiguity is safer than silently invoking a runner under an unproven configuration.

## C-009 — Are Python, sandbox, agent, memory, retrieval, or browser features part of this milestone?

No.

They remain roadmap/research material. This milestone is justified by the existing selector miss and is deliberately bounded to that evidence-backed class of failure.

## C-010 — Is publication/release authorized?

No.

Spec 002 may qualify repository state and benchmark evidence only. npm publication, GitHub Release creation, tags, billing/account changes, or package ownership claims require separate authority.
