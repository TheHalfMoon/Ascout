# ARTEMIS-A0 Vendor Test Discovery Scoping Amendment

**Status:** `PROPOSED / NOT_EFFECTIVE / FOUNDER_APPROVAL_REQUIRED`  
**Ledger:** Issue #451  
**Trigger:** ARTEMIS-A0 PR #448 exact head `86159434fa0edfa6223117c83b10979a1bebe490`  
**Canonical base at proposal creation:** `25c6dcbd75d62d6e1422bb7681f29c5b2381e5ad`

## 1. Purpose

This document proposes the narrowest authorization amendment needed to allow a fresh ARTEMIS-A0 successor to coexist with Ascout's existing native Vitest lane without modifying the immutable donor snapshot or weakening qualification.

This document is proposal-only.

```text
AMENDMENT_APPROVED = NO
AMENDMENT_EFFECTIVE = NO
A0_SUCCESSOR_IMPLEMENTATION_AUTHORIZED = NO
```

Founder/maintainer approval and canonical admission are required before any source/config mutation described here becomes lawful.

## 2. Preserved failure evidence

PR #448 at exact head:

```text
86159434fa0edfa6223117c83b10979a1bebe490
```

produced:

```text
Self Verification #297 = SUCCESS
Project CI #781 = FAILURE
Project CI lanes failed = 6 of 6
```

The failure occurred in the Ascout root Vitest test step after importing the complete pinned ARTEMIS snapshot.

Observed donor test discovery included files under:

```text
vendor/google-artemis/apps/showcase_ui/**/*.spec.ts
```

Observed failure classes included:

- `ERR_MODULE_NOT_FOUND` for donor-only Angular packages such as `@angular/core` and `@angular/core/testing`;
- `ReferenceError: describe is not defined` for donor Jasmine-style specifications discovered by Ascout root Vitest.

The failure is preserved as negative evidence.

PR #448 MUST NOT be merged, rewritten, rebased, force-pushed, or converted into a qualified success by rerunning the same unmodified head.

## 3. Root cause

ARTEMIS-A0 correctly requires a complete immutable donor snapshot under:

```text
vendor/google-artemis/**
```

Ascout root currently executes:

```text
npm test
-> vitest run
```

without a root Vitest configuration that excludes vendored source trees.

Vitest therefore recursively discovers donor-local test files that belong to the donor's own Angular/Jasmine test environment, not to Ascout's root test environment.

The problem is test ownership and discovery scope.

It is not evidence that:

- the donor snapshot is incomplete;
- ARTEMIS tests should be deleted;
- donor files should be modified;
- donor dependencies should be installed into Ascout root;
- Project CI should be weakened;
- failing lanes should be skipped;
- donor tests should be relabeled as Ascout native tests.

## 4. Existing authorization boundary

The effective ARTEMIS authorization currently permits the following implementation surface:

```text
vendor/google-artemis/**
docs/mobile/**
schemas/mobile-artemis/**
python/ascout_mobile_bridge/**
src/assurance/engines/mobile-artemis/**
tests/assurance-mobile-artemis-*.test.ts
THIRD_PARTY_NOTICES.md (A0 and A13 attribution only)
```

The required root test-runner scoping path is outside that surface.

Therefore no correction is currently authorized.

## 5. Proposed additional mutation surface

If and only if this amendment becomes canonically effective, add exactly:

```text
vitest.config.ts
```

to the allowed ARTEMIS-A0 successor mutation surface.

No other root command/config/workflow path is added by this amendment.

In particular, this amendment does NOT authorize:

```text
package.json
package-lock.json
.github/workflows/**
tsconfig.json
vite.config.*
eslint*
vendor/google-artemis/** modification
dependency installation
workflow changes
test skipping
runtime activation
network authority
provider authority
ADB authority
device authority
telemetry authority
publication authority
```

## 6. Required configuration semantics

The permitted root Vitest configuration must have one narrow purpose:

> prevent Ascout native Vitest discovery from treating immutable vendored donor tests as Ascout root tests.

Preferred implementation:

```ts
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "vendor/**"],
  },
});
```

An equivalent implementation is permitted only if it proves all of the following:

1. Vitest's default exclusions remain preserved.
2. `vendor/**` is excluded from Ascout root-native test discovery.
3. No existing Ascout native test path is excluded.
4. No test environment/global behavior is altered merely to make donor tests pass.
5. No donor test dependency is installed into Ascout root.
6. No include pattern is narrowed in a way that can silently hide future Ascout tests.

## 7. Why vendor exclusion is correct

Vendored source is source evidence and future engine material.

Vendored donor test suites retain provenance and remain available for later donor-specific characterization/qualification under the correct donor runtime.

They are not automatically Ascout root-native tests merely because their filenames match Vitest/Jest/Jasmine discovery globs.

The correct separation is:

```text
Ascout root-native test lane
  -> Ascout-owned tests only

ARTEMIS donor characterization/qualification lanes
  -> donor tests under explicitly qualified donor runtime
```

Excluding `vendor/**` from Ascout root discovery does not delete, modify, suppress, or relabel donor tests.

## 8. Required successor test evidence

A fresh ARTEMIS-A0 successor may be created only after this amendment is effective.

The successor must prove:

### 8.1 Source and donor identity

```text
DONOR_REPOSITORY = https://github.com/google/artemis
DONOR_SHA = 371aa6df56880643da57b30da936e9812fb0ec66
DONOR_TREE = 697c3fe48b51b8453938989f383b4a8471a4f5a1
DONOR_SNAPSHOT_COMPLETE = YES
DONOR_SNAPSHOT_MODIFIED = NO
```

### 8.2 Discovery scope

Prove that the Ascout root Vitest invocation discovers no test file under:

```text
vendor/**
```

This proof must not rely only on a passing exit code.

It should inspect/list the effective root test selection or use an equivalent deterministic assertion.

### 8.3 Native Ascout coverage preservation

Prove that:

- existing Ascout native test files remain discoverable;
- the complete root-native suite passes;
- the dedicated ARTEMIS-A0 Ascout test passes;
- no previously discovered Ascout native test family disappears because of the new config.

Do not freeze a raw test count as the only proof because legitimate future Ascout tests may change that count.

### 8.4 Command-surface acknowledgement

Because `vitest.config.ts` is a test command/config authority path, the successor must explicitly account for command-surface change according to Ascout's existing command-admission/freshness rules.

The config must not be treated as a harmless documentation-only file.

### 8.5 Exact-head qualification

The successor must obtain:

```text
Self Verification = SUCCESS on exact head
Project CI = SUCCESS on all six required lanes on exact head
required exact-head review = PASS
unresolved material threads = 0
```

Alibaba Open Code Review must be executed where the then-effective implementation/review authority requires it.

### 8.6 Fresh-main merge discipline

Before merge:

- canonical main must be reverified;
- predecessor authority must remain effective;
- successor head must be unchanged from qualification;
- guarded normal merge must bind the expected head;
- no force-push/rebase/history rewrite;
- push-triggered post-merge Project CI must pass.

## 9. PR #448 disposition

PR #448 remains:

```text
OPEN / DISQUALIFIED / MUST_NOT_MERGE
```

It is historical negative evidence demonstrating the need for this amendment.

The successor must use a new branch and PR from a fresh canonical base after amendment effectiveness.

PR #448 must not be repurposed as the successor.

## 10. Amendment admission gate

This amendment becomes effective only after all of the following:

1. explicit founder/maintainer approval is recorded for the amendment itself;
2. this amendment PR is exact-head qualified;
3. required Project CI passes;
4. required review passes with zero unresolved material findings;
5. canonical main remains the expected base immediately before merge;
6. guarded merge binds the exact approved amendment head;
7. merge identity is verified;
8. post-merge Project CI passes;
9. Issue #451 is closed as `CLOSED_CANONICAL / EFFECTIVE`.

Only then:

```text
AMENDMENT_APPROVED = YES
AMENDMENT_EFFECTIVE = YES
VITEST_VENDOR_SCOPING_MUTATION_AUTHORIZED = YES
A0_SUCCESSOR_IMPLEMENTATION_AUTHORIZED = YES
```

Until then:

```text
AMENDMENT_APPROVED = NO
AMENDMENT_EFFECTIVE = NO
VITEST_VENDOR_SCOPING_MUTATION_AUTHORIZED = NO
A0_SUCCESSOR_IMPLEMENTATION_AUTHORIZED = NO
PR_448_MERGE_AUTHORIZED = NO
```

## 11. Explicit non-expansion

This amendment does not authorize ARTEMIS-A1 or later phases ahead of A0 closure.

It does not authorize a general vendor policy for every future donor.

A future generalized vendor test-discovery policy may be designed separately, but ARTEMIS-A0 must not wait for or silently assume such a broader program.

This amendment is intentionally narrow: one root Vitest scoping path, one blocked A0 successor, one preserved failure.

Refs #438
Refs #448
Refs #451
