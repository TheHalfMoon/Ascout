# E7-CONTAIN Part One: Trusted-Local T0 Boundary

**Status:** packet specification. This packet states the containment Ascout has today and removes
an overclaim. It adds no isolation. The packet is named E7-CONTAIN so it can't be confused with
the effect class `E7_ACTIVE_SECURITY_VALIDATION`.

## T0, which is all Ascout provides

Code that Ascout runs runs with the user's full rights, whether it is a `check` task or a brokered
engine. Nothing limits what that code reads, writes, or connects to. T0 provides only these:

- process-tree teardown, with the limits on detached descendants already documented;
- output and time caps;
- a sanitized environment for brokered engines only (`check` tasks inherit the user's).

A Job Object, a process group, or a timeout is lifetime control. None of them is isolation.

## Changes

| File | Change |
|---|---|
| `src/assurance/containment/containment-tier.ts` | New. `currentContainmentV1()` returns the frozen T0 record: `TRUSTED_LOCAL`, filesystem and network isolation `NONE`, `untrusted_code_supported: false`. There is no T1 value. |
| `src/assurance/test/profile-policy.ts` | No test profile predicts `E3_ISOLATED_LOCAL_EXECUTION` any more. |
| `src/assurance/test/test-run-command.ts` | Every `ascout test` report carries `containment`, and the terminal report prints it. The change is additive. |
| `tests/containment-t0.test.ts`, `tests/assurance-test-profile-policy.test.ts` | The T0 record, no isolated-execution prediction, and the record in every report |

`check` receipt v1.0 is unchanged; it is byte-frozen.

## Still blocked: T1

T1, or the filesystem-only T1-FS, needs all of these:

- founder decision **FD-4**;
- an approved host-specific spec, kept private because it includes probe details;
- native hostile-probe proof on each claimed OS, version, and architecture;
- an independent human security review.

None exists. Until they do, no Ascout output may say "sandboxed", "contained", "isolated", or T1. Untrusted code is unsupported, and the broker refuses any engine whose descriptor requires a sandbox.

## Rollback

Revert the commit. Test profiles would then predict E3 again. That overclaim is why this packet exists.
