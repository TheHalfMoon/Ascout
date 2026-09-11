# Spec 012 Requirements Quality Checklist

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

- [x] Each functional requirement is atomic, testable, and bounded to named files.
- [x] FR-012-001 states the exact accepted shapes (`"-"`, `^-\d+$`) with no ambiguity.
- [x] FR-012-002 enumerates representative still-invalid shapes and preserves reasons.
- [x] FR-012-003 pins aggregation behavior including order-independence of poisoning.
- [x] FR-012-004 explicitly excludes line coverage from the change.
- [x] FR-012-005 forbids new persisted surfaces.
- [x] FR-012-006 requires determinism and purity with no I/O/process/network/clock/env.
- [x] FR-012-007 preserves privacy and path integrity.
- [x] FR-012-008 forbids product-core expansion with a named exclusion list.
- [x] Acceptance stories map one-to-one onto FRs and the plan taxonomy.
- [x] No requirement uses unqualified totality language or promises universal coverage.
- [x] No requirement authorizes implementation; all states read
  `PLANNED / IMPLEMENTATION_NOT_AUTHORIZED` or equivalent.
- [x] Task order is exactly `T122 -> T123` with T123 ledger-only by default.
- [x] T120/T121 are referenced as blocked/unchanged, never absorbed.

```text
REQUIREMENTS_CHECKLIST = PASS
```
