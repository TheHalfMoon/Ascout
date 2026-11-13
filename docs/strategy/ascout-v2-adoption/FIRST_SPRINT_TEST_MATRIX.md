# First Sprint — Truth Tables, Native Gates and Rollback

**Planning-only.** Exact source parent `main@ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430`; re-fetch parent at implementation start. This supplements [IMPLEMENTATION_FREEZE.md](IMPLEMENTATION_FREEZE.md) and [ENGINE_PROFILE_AND_INGESTION.md](ENGINE_PROFILE_AND_INGESTION.md). No execution/authorization is created by adding the document.

## 1. E0 deterministic observational fixtures (no donor or untrusted code execution)

- **Root:** disposable temp path `$env:TEMP/ascout-v2-e0-<random>`, never the owner worktree, a patient repository, or the source checkout under review. Create `fixture-empty` with `git init`, `git config user.name Test`, `git config user.email test@example.invalid`, `git commit --allow-empty -m empty`; create `fixture-changed` with one plain `readme.txt` committed and then one benign text modification. No external code, dependencies, secrets, network or scripts in fixtures.
- **Ascout binary:** build from a separate clean, disposable clone of the exact current `main`; use absolute `node <clone>/dist/cli.js` with `cwd` set to each fixture. Capture process exit, stdout/stderr lengths, SHA256 of sanitized output and whether a child engine actually ran. Do not persist unredacted output.
- **Baseline expectations to **observe**, not assert as desirable:** `review` empty may emit `NOT_RUN/0`; changed `review` may emit `NOT_RUN/0`; `test --profile standard` is a plan with code `0`; `security --format json` currently emits `NOT_RUN/1`; `check` follows receipt v1.0 precedence. If the real output differs, record **ACTUAL** and re-audit before coding.
- **Source drift:** use the already-existing source-drift/receipt contract tests (e.g. `tests/check-receipt-end-to-end.contract.test.ts`, `tests/receipt-model.integrity.test.ts`) for actual drift-on-check behavior. Do not invent a race by mutating a user's repo. `review/test/security` cannot generate failed-engine or source-drift execution evidence on current main, so record their cells `N/A — no engine invocation`.
- **Artifact:** `docs/qualification/2026-11-06-ascout-v2-cli-baseline.md` in a separate evidence-only PR. Table columns: `fixture | source_sha | command | requested_scope | actual_outcome | actual_exit | executed_count | omissions | stdout_digest | source_stability | expectation | verdict | NOT_RUN reason`. Do not suppress disagreements.

## 2. E1 hostile-Git protection (GIT-CONFIG-EXEC; private spec still required)

**BLOCKED** until a privately reviewed security patch provides the exact safe Git argv/environment policy and target platform effects. The public acceptance matrix is non-exploit-specific:

| Fixture class | Required observation | Failure if |
|---|---|---|
| repository-selected Git helpers | no helper marker created, required Git query remains bounded | marker exists or Git invocation succeeds through an unapproved process |
| environment-selected Git configuration/path | allowlisted executable and sanitized environment are used, no marker created | any repository/user config overrides trusted policy |
| hooks and filters | verification performs only authorized read-only Git operations | hook/filter has an effect or an inherited credential reaches its child |
| traversal/invalid repository | fail closed without executing project command | command execution or false receipt completeness |
| legitimate clean Git checkout | existing Git metadata and `check` parity preserved | prior valid receipts or source identities drift |

Native fixtures must run on Windows, Ubuntu and macOS **only in a disposable hostile test harness**. Record marker-absent assertions, exit code, source SHA, and clean control. Until qualified, no untrusted repository code executes and the change cannot claim safe T1 containment.

## 3. E2 exit-code migration test grid (FD-1/A07 not approved)

| Future operation and qualified actual observation | Proposed exit | Required JSON/terminal claim |
|---|---:|---|
| `check` complete, clean | 0 | existing v1.0 bytes unchanged |
| `check` verified finding/failed task | 1 | finding + completeness independent |
| `check` internal error | 2 | ERROR, no successful claim |
| `check` detected tree drift | 3 | stale evidence rejected |
| `check` missing required capabilities | 4 | explicit INCOMPLETE/omission |
| `review` selected eligible files, no admitted engine | 4 | NOT_RUN, `completeness=false` |
| `review` proved no applicable eligible scope | 0 | NOT_APPLICABLE, `executed_count=0`, not reviewed |
| proposed `review --delegate` spec render only | 0 | NON_ASSURANCE_PLAN, independence=HOST_AGENT, not review PASS |
| proposed `test --plan` successful plan rendering only | 0 | NON_ASSURANCE_PLAN, not test PASS |
| `test --profile standard` real `check` complete | `check` result | same tree/HEAD, executed and omitted scope reported |
| `test --profile deep` mutation engine absent | 4 | required mutation NOT_RUN, complete=false |
| `security` scanner absent (current baseline: NOT_RUN/1) | 4 | **breaking compatibility change**; README & existing security tests migrate in same A07 scope |
| `security` verified finding, with other requested scan missing | 1 | verified negative finding **and** incomplete remaining coverage |
| any command malformed envelope / unknown engine exit | 2 | ERROR/diagnostic; no unsupported PASS |

Tests to update: `tests/exit-precedence.contract.test.ts`, `tests/cli-format.contract.test.ts`, `tests/cli.smoke.test.ts`, `tests/assurance-test-cli-test-plan.test.ts`, `tests/assurance-security-t14.test.ts`; add shell fixtures for POSIX `$?`, Windows PowerShell `$LASTEXITCODE` and PowerShell command-success `$?`. Output schema may not gain mandatory keys in existing **receipt v1.0**. Proposed `review --delegate` and `test --plan` do not exist yet and are *not* baseline probes. **FD-1 needed before changing exits.**

## 4. E3/E4/E5 implementation admission, not a simulated pass

- **E3 is BLOCKED** until OCR exact commit+tree SHA and `ocr --version/--help` from the chosen pinned binary are documented, and the current Playwright notice and `tests/third-party-notices.test.ts` are reproduced. Do not modify current OCR pin on a guess.
- **E4 proposed initial broker hard caps:** 60,000 ms wall time, 1,048,576 bytes stdout, 262,144 bytes stderr, 65,536 bytes stdin and zero network requests for the first secrets-scan profile. These are *design defaults pending host/memory/fixture validation*, not observed engine limits; any cap hit means incomplete/error, never truncated clean. Immutable profile + source binding are required at start and end. Hardening and tests must prove cancellation kills the entire **owned** process tree without claiming sandbox isolation.
- **E4 planned signatures, all to be review-frozen before writing code:** `validateEngineProfileV1(input: unknown): EngineProfileV1`; `parseEngineEnvelopeV1(input: Uint8Array, expectedRequestId: string): EngineEnvelopeV1`; `runQualifiedEngineV1(request: EngineRequestV1, profile: EngineProfileV1, signal: AbortSignal): Promise<EngineRunResultV1>`. Unspecified `EngineRequestV1`, `EngineEnvelopeV1`, `EngineRunResultV1` fields must be fully typed in the E4 PR spec; **E4 stays BLOCKED** until then. No arbitrary project-selected binary/path, no inherited secrets, no shell interpolation.
- **E5 real scanner gate:** `.github/workflows/real-engines.yml` (new) must use `pull_request`/manual workflow only; OS matrix ubuntu-24.04, macos-15, windows-2025 × Node 22/24; exact pinned action SHA and checksum-verified per-platform Gitleaks binary with archived URL/version/help/license. No binary means **test is explicitly NOT_RUN in general developer tests**, but qualification workflow must **FAIL/BLOCKED**, not quietly skip. Test-time synthetic positive fixture is generated under OS temp and deleted even on failure; committed fixtures contain only non-secret metadata. Upload redacted receipts, never raw scanner reports.
- **E5 8.30.1 is only a historic first-candidate pin.** Do not invent URLs or checksums; actual native execution begins after complete artifact admission and rights checks. Unsupported scanner families and unqualified OSes stay NOT_RUN/BLOCKED.

## 5. Rollback checklist for each isolated source PR

1. Capture and independently verify the current `origin/main` full SHA and **exact signed source-PR commit** before touching the branch. Revert only that scoped PR using a new reviewable revert commit against an authorized disposable integration branch; **never rewrite shared history**.
2. Run `npm ci --ignore-scripts --no-audit --no-fund`, `npm run typecheck`, `npm run build`, the PR's named focused Vitest tests and the exact previous `check` receipt-v1.0 golden comparison on that disposable branch. Inability to run any gate is NOT_RUN, not PASS.
3. E2 rollback additionally proves old review/test/security CLI exit contracts and documents caller compatibility; E4/E5 rollback ensures no new engine binary can execute and all staged temp reports are cleared without deleting user data.
4. Compare full HEAD/tree digests, required CI jobs, sanitized receipt hashes, and known negative fixtures against the pre-change signed report. Any unresolved effect blocks production/release GO.

**Final criterion:** a planning document is review-ready when all tests/gates/unknowns are explicit. A software implementation packet is GO only when every **specific** required FD, R1, engine identity and native admission is independently satisfied; future E1–E9 remain BLOCKED unless proven otherwise.
