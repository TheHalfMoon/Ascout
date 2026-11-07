# E4 Bounded Execution Broker Specification

**Status:** implementation specification for packet E4. It ships a broker and no engine.
No real scanner is admitted, and no CLI command calls the broker yet.

## Scope

| File | Change |
|---|---|
| `src/assurance/engines/engine-profile-v1.ts` | New: profile type, validator, digest |
| `src/assurance/engines/engine-envelope-v1.ts` | New: `ascout-engine/1` output parser |
| `src/assurance/engines/execution-broker.ts` | New: `runQualifiedEngineV1` |
| `src/process.ts` | Modified: optional stdin, abort signal, per-stream cap, stop on cap, tree exit check |
| `src/git.ts` | Modified: Git resolves to an absolute path outside the repository |

`src/git.ts` is outside the file list frozen for E4 in the adoption plan. It is included
because packet E1 recorded this gap and moved it here: a `PATH` entry could select a planted
Git. The broker binds source through Git, so the binding depends on this fix.

Existing `runProcess` callers set none of the new options and see no change.

## Frozen signatures

```ts
validateEngineProfileV1(input: unknown): EngineProfileV1;
engineProfileSha256V1(profile: EngineProfileV1): string;
parseEngineEnvelopeV1(input: Uint8Array, expectedRequestId: string): EngineEnvelopeV1;
runQualifiedEngineV1(
  request: EngineRequestV1,
  profile: EngineProfileV1,
  signal: AbortSignal,
): Promise<EngineRunResultV1>;
```

The complete types are exported by the modules above. Their fields:

- **`EngineProfileV1`:** `schema`, `engine_id`, `profile_id`, `release_version`, `platform`,
  `arch`, `artifact`, `executable_absolute_path`, `argv`, `environment`,
  `config_absolute_path`, `config_sha256`, `requested_capabilities`, `native_exit_map`,
  `output_format`, `coverage_mode`, `budget`, `source_egress`, `network`, `independence`.
- **`EngineRequestV1`:** `schema`, `request_id`, `source` (`root_absolute_path`, `head_sha`,
  `tree_digest`), `capabilities`, `qualification` (`registry`, `qualification_set`,
  `benchmark_corpus_identity`, `platform_identity`).
- **`EngineEnvelopeV1`:** `protocol`, `request_id`, `engine` (`id`, `version`, `build`),
  `profile_sha256`, `source` (`head_sha`, `tree_digest`), `execution` (`state`, timestamps),
  `capabilities[]` (`id`, `state`, `coverage`), `observations[]`, `diagnostics[]`.
- **`EngineRunResultV1`:** `schema`, `request_id`, `engine_id`, `profile_id`,
  `profile_sha256`, `qualification_id`, `status`, `reason_code`, `exit_code`, `signal`,
  `started_at_epoch_ms`, `ended_at_epoch_ms`, `source_start`, `source_end`,
  `executable_sha256`, `stdout`, `stderr`, `stderr_excerpt`, `output_withheld`, `envelope`,
  `cleanup_complete`, `limitations`.

## Rules

1. **Admission stays in the kernel.** A profile is adapter configuration. The broker refuses
   to start unless `evaluateEngineQualificationV1` returns `QUALIFIED` for the registry entry
   matching the profile's executable digest, configuration digest, and version. A qualification
   must name the profile's full digest as `profile-sha256:<digest>`, so changing `argv`, the
   environment, the exit map, or the budget under the same `profile_id` is `PROFILE_DRIFT`. The
   broker reads the clock itself.
2. **Fixed executable.** The path is absolute, not UNC, and canonical, and it lies outside the
   source root. Its SHA-256 is checked before the run and again after it. On Windows it must be
   an `.exe`. The broker starts the file directly, so `cross-spawn` cannot route it through
   `cmd.exe`.
3. **Fixed configuration.** The configuration file follows the same path rules, and its
   digest is checked the same way. `argv` must pass its path to the engine. Whether an engine
   also reads configuration from its working directory is for that engine's qualification.
4. **Sanitized environment.** The child starts from an empty environment. A profile may set
   only `LANG`, `LC_ALL`, `TZ`, `NO_COLOR`, and `ASCOUT_ENGINE_*`. Nothing else is inherited,
   including `PATH`. On Windows the broker sets `SystemRoot` and `WINDIR`, and sets the other
   variables libuv would copy from the parent (such as `PATH` and `USERPROFILE`) to empty.
5. **Hard caps.** 60,000 ms wall time, 1,048,576 bytes stdout, 262,144 bytes stderr, 65,536
   bytes stdin, and zero network requests. A profile may lower them and may not raise them. A
   cap hit stops the process and is never reported as a truncated clean result.
6. **Source binding.** HEAD and the tree digest must match the request before the start and
   again after the end.
7. **Output handling.** Raw stdout and stderr never leave the broker. Stdout is returned only
   as a parsed envelope. Stderr is returned only as a short excerpt with paths replaced and
   control characters removed, and not at all if it hit its cap. Output holding a recognized
   secret shape or the value of a sensitive parent environment variable, in raw form or after
   JSON decoding, is withheld entirely, and the run fails closed.
8. **`EXECUTED` is narrow.** It requires a clean process end, a known native exit code, a valid
   envelope that agrees with the exit code, every requested capability executed with complete
   coverage, and unchanged HEAD, tree digest, executable, and configuration. It describes a run.
   It is not a claim that the source is safe.

## Status mapping

| Condition | Status | Reason code |
|---|---|---|
| Invalid profile or request | `DENIED_BY_POLICY` | `INVALID_PROFILE`, `INVALID_REQUEST` |
| Signal already aborted | `NOT_RUN` | `CANCELLED_BEFORE_START` |
| Other platform or architecture | `UNAVAILABLE` | `PLATFORM_MISMATCH` |
| Capability outside the profile or descriptor | `DENIED_BY_POLICY` | `CAPABILITY_NOT_ADMITTED` |
| No matching registry entry, or descriptor needs network, sandbox, or a provider | `DENIED_BY_POLICY` | `ENGINE_NOT_REGISTERED`, `DESCRIPTOR_NOT_ADMISSIBLE` |
| Qualification refused | `DENIED_BY_POLICY` | The kernel's reason code |
| Executable or configuration absent | `UNAVAILABLE` | `EXECUTABLE_MISSING`, `CONFIG_MISSING` |
| Symlinked or otherwise non-canonical path | `DENIED_BY_POLICY` | `NON_CANONICAL_PATH` |
| Path inside the source root | `DENIED_BY_POLICY` | `REPOSITORY_CONTROLLED_PATH` |
| Digest differs before the run | `VERSION_MISMATCH` | `EXECUTABLE_DIGEST_MISMATCH`, `CONFIG_DIGEST_MISMATCH` |
| Source differs or cannot be read before the run | `NOT_RUN` | `SOURCE_DRIFT_AT_START`, `SOURCE_BINDING_UNAVAILABLE` |
| Request larger than the stdin cap | `DENIED_BY_POLICY` | `REQUEST_TOO_LARGE` |
| Launch failed | `UNAVAILABLE` or `ENGINE_ERROR` | `EXECUTABLE_MISSING`, `PROCESS_CONTROL_ERROR` |
| Teardown could not be confirmed | `ENGINE_ERROR` | `CLEANUP_INCOMPLETE` |
| Source differs or cannot be read after the run | `INCOMPLETE` | `SOURCE_DRIFT_AT_END`, `SOURCE_BINDING_UNAVAILABLE` |
| Executable or configuration changed during the run | `VERSION_MISMATCH` | `ARTIFACT_CHANGED_DURING_RUN` |
| Wall limit reached | `TIMEOUT` | `WALL_TIME_EXCEEDED` |
| Caller cancelled | `INCOMPLETE` | `CANCELLED` |
| Stream cap reached | `INCOMPLETE` | `OUTPUT_CAP_EXCEEDED` |
| Descendant outlived the root process | `INCOMPLETE` | `TREE_ESCAPE` |
| Secret found in output | `MALFORMED_OUTPUT` | `SECRET_IN_OUTPUT` |
| Ended by signal, unmapped exit, or exit mapped to `ERROR` | `ENGINE_ERROR` | `TERMINATED_BY_SIGNAL`, `UNMAPPED_EXIT`, `NATIVE_ERROR_EXIT` |
| Exit mapped to `NO_INPUT` | `INCOMPLETE` | `NATIVE_NO_INPUT` |
| Invalid envelope, disagreement with the run, or a `FAILED` envelope on a success exit | `MALFORMED_OUTPUT` | `INVALID_ENVELOPE`, `REQUEST_ID_MISMATCH`, `ENVELOPE_BINDING_MISMATCH`, `EXIT_ENVELOPE_DISAGREEMENT` |
| Valid envelope with partial coverage | `INCOMPLETE` | `PARTIAL_COVERAGE` |
| All conditions in rule 8 met | `EXECUTED` | `RUN_COMPLETE` |

The first matching row after the process ends wins, in table order. A later packet maps these
results to exit codes. Source drift keeps its own reason code so it can become exit 3.

## Known limits

A run's result repeats the limits that apply to it in `limitations`. A refusal before launch
leaves `limitations` empty.

- **The caller supplies the trust root.** The registry, the qualification records, and the
  platform identity come from the request and are parsed, not authenticated. The broker checks
  the profile's OS and architecture against the host, but a caller could present another host's
  platform identity or its own records. Callers must pass records shipped with Ascout and never
  records read from the subject repository.
- **Source binding sees HEAD and the tree digest only.** An engine could change an ignored file,
  `.git/info/exclude`, or a hook and leave both the same. A frozen export in E5 removes this.

- **This is not a sandbox.** The engine runs with the user's rights. E7 owns containment.
- **Network denial is a request, not enforcement.** Nothing blocks a socket. A scanner that
  can reach the network cannot be treated as network-free until a later packet qualifies an
  enforcement mechanism on each operating system.
- **A detached descendant can survive.** On Windows the tree can be killed only while the root
  lives, and on POSIX teardown covers the process group. A descendant that detaches and holds
  the output pipes is detected and reported as `CLEANUP_INCOMPLETE`, and it may keep running.
  One that detaches and closes those pipes is not detected at all.
- **The digest check has a small race.** A file can be swapped between hashing and launch. The
  second hash catches a swap that persists, not one that is reverted in time.
- **Secret detection recognizes known shapes and exact values.** An encoded or unrecognized
  secret passes it. Native scanner output needs its own adapter in E5.
- **Source binding uses the live worktree.** Running over a frozen export belongs with the
  first real scanner in E5.
- **Trusted Git means outside the repository.** A `PATH` directory the user controls is still
  the user's authority. UNC `PATH` entries are skipped. If no Git remains, the Git read fails
  closed, and the current error message describes an unusable repository rather than missing
  Git. `src/quality/worktree.ts` still launches `git` by name, and nothing in `src/` calls it.

## Rollback

Revert the three new modules, `src/process.ts`, and `src/git.ts`, then run
`tests/process-control.test.ts` and `tests/git-config-hostile.test.ts`. No command depends on
the broker, so reverting changes no command's behavior except the Git path check.
