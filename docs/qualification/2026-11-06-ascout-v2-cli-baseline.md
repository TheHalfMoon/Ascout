# Ascout V2 E0 CLI baseline

**Status: observation only. Nothing here is qualified, and this is not a pass.** This report records how canonical `main` behaved on 2026-11-06. It is not production assurance, it changes no source, and it authorizes no later packet. It follows the proposed E0 procedure in PR #653 at `276c27778d83c6c809bf10600a2fd16f2d62a7fa`, which is itself still an unratified draft.

## Subject

| Field | Value |
| --- | --- |
| Source | `main@ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430` |
| Tree | `045a902969f9f4dbc5490a2b435b76cc7ce2c6b2` |
| Ascout checkouts | Fresh disposable clones; `git status --porcelain` empty in the clone before and after each step |
| Observed | 2026-11-06 |

| Platform | OS | Node | npm | Git |
| --- | --- | --- | --- | --- |
| Windows | Windows 11 Home 10.0.26300 | v24.19.0 | 11.17.0 | 2.56.0.windows.4 |
| Linux | Ubuntu 26.04 LTS on WSL2, kernel 6.18.33.1 | v22.23.3 | 10.9.9 | 2.53.0 |

WSL2 is a real Linux userland on this one machine. It does not stand in for hosted Ubuntu CI. Neither platform here is macOS.

## Result summary

- **No review, test, or security engine ran in any cell.** The CLI reports this itself for `review` and `security`.
- **The current limitations the plan predicted are real.** `review` exits 0 with NOT_RUN on both empty and changed scope, `test --profile standard` exits 0 with only a plan, and `security` exits 1 with NOT_RUN. These are limitations, not desired behavior.
- **The full test suite did not pass locally on Windows.** See [Test results](#test-results).
- **Hosted Project CI for `ecada2bc` concluded failure.** Four cells passed and two `macos-14` cells were cancelled. Self Verification has no run for this SHA. See [Exact-head CI](#exact-head-ci).
- **Windows and Linux agree on exit codes and stdout and stderr byte counts in all 30 captures per platform.** They ran different Node, npm, and Git versions, so this does not isolate the effect of the operating system.
- Findings F2 and F4 to F8 go beyond what the plan lists. See [Findings](#findings).

## Terms

- **E0, E1, E2, and so on:** work packets in the proposed plan in PR #653. E0 is this observation.
- **Matrix and freeze:** `FIRST_SPRINT_TEST_MATRIX.md` and `IMPLEMENTATION_FREEZE.md` in that PR.
- **FD-1:** a pending founder decision on exit-code semantics. No FD has been decided.
- **Receipt:** the JSON result of `ascout check`. Its exit precedence is 2 error, then 3 source drift, then 1 finding or failure, then 4 incomplete, then 0 clean.
- **Verdict column:** MATCHES means the observation equals the plan's stated expectation of current behavior, not that the behavior is good. OBSERVED means the plan stated no expectation. NEW points to a finding.

## Build and focused tests

| Step | Windows | Linux |
| --- | --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | exit 0 | exit 0 |
| `npm run typecheck` | exit 0 | exit 0 |
| `npm run build` | exit 0 | exit 0 |
| Six focused files named by the E0 procedure | exit 0, 40 passed, 1 skipped | exit 0, 38 passed, 3 skipped |

The skipped cases are platform-conditional tests in `tests/process-control.test.ts`.

## CLI truth table

Each cell ran twice on each platform against a newly built fixture, for 30 captures per platform. The table shows Windows digests of path-sanitized stdout. "varies" means the two Windows runs differed: `check` output holds run IDs and timestamps, and the `review` difference observed is `target_id`, which hashes the fixture path.

| fixture | source_sha | command | requested_scope | actual_outcome | actual_exit | executed_count | omissions | stdout_digest | source_stability | expectation | verdict | NOT_RUN reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fixture-empty | `98fb9845` | `check --format json` | repository | receipt: 4 tasks NOT_APPLICABLE, `materially_incomplete` | 4 | 0 tasks | no project tooling discovered | varies | HEAD/tree unchanged; `.ascout/` created | receipt v1.0 precedence | MATCHES |  |
| fixture-empty | `98fb9845` | `review --format json` | changed files | NOT_RUN, `kind: empty` | 0 | 0 | empty scope | varies | HEAD/tree unchanged | NOT_RUN/0 | MATCHES | empty scope |
| fixture-empty | `98fb9845` | `test --profile standard --format json` | STANDARD plan | plan JSON; no outcome field | 0 | none reported | plan only; output has no execution or source fields | `e87573e6874f` | HEAD/tree unchanged | plan/0 | MATCHES |  |
| fixture-empty | `98fb9845` | `security --format json` | security profile | NOT_RUN `ENGINE_NOT_EXECUTED_IN_UA_P06` | 1 | 0 (`executed:false`) | `scanned_scope: []` | `2d2abfcb2c60` | HEAD/tree unchanged | NOT_RUN/1 | MATCHES | engine not executed |
| fixture-empty | `98fb9845` | `doctor` | diagnostic | diagnostic text on stderr; stdout empty | 0 | n/a, not an assurance command | n/a | `e3b0c44298fc` | HEAD/tree unchanged | not pre-specified | OBSERVED |  |
| fixture-changed | `5cb2c46a` | `check --format json` | repository | receipt: 4 tasks NOT_APPLICABLE, `materially_incomplete` | 4 | 0 tasks | no project tooling discovered | varies | HEAD/tree unchanged; `.ascout/` created | receipt v1.0 precedence | MATCHES |  |
| fixture-changed | `5cb2c46a` | `review --format json` | changed files | NOT_RUN, `kind: absence`, `UNAVAILABLE`, `complete:false` | 0 | 0 | `readme.txt` unreviewed; no qualified engine | varies | HEAD/tree unchanged | NOT_RUN/0 | MATCHES | no qualified engine |
| fixture-changed | `5cb2c46a` | `test --profile standard --format json` | STANDARD plan | plan JSON; no outcome field | 0 | none reported | plan only; output has no execution or source fields | `e87573e6874f` | HEAD/tree unchanged | plan/0 | MATCHES |  |
| fixture-changed | `5cb2c46a` | `security --format json` | security profile | NOT_RUN `ENGINE_NOT_EXECUTED_IN_UA_P06` | 1 | 0 (`executed:false`) | `scanned_scope: []` | `2d2abfcb2c60` | HEAD/tree unchanged | NOT_RUN/1 | MATCHES | engine not executed |
| fixture-changed | `5cb2c46a` | `doctor` | diagnostic | diagnostic text on stderr; stdout empty | 0 | n/a, not an assurance command | n/a | `e3b0c44298fc` | HEAD/tree unchanged | not pre-specified | OBSERVED |  |
| not-a-repo | `none` | `check --format json` | repository | `GitIdentityError` on stderr; no JSON | 1 | 0 | no receipt | `e3b0c44298fc` | n/a | not pre-specified | NEW: see F4 |  |
| not-a-repo | `none` | `review --format json` | changed files | `GitIdentityError` on stderr; no JSON | 1 | 0 | no receipt | `e3b0c44298fc` | n/a | not pre-specified | NEW: see F4 |  |
| not-a-repo | `none` | `test --profile standard --format json` | STANDARD plan | plan JSON; no outcome field | 0 | none reported | plan only; output has no execution or source fields | `e87573e6874f` | n/a | not pre-specified | NEW: see F2 |  |
| not-a-repo | `none` | `security --format json` | security profile | NOT_RUN `ENGINE_NOT_EXECUTED_IN_UA_P06` | 1 | 0 (`executed:false`) | `scanned_scope: []` | `2d2abfcb2c60` | n/a | not pre-specified | OBSERVED | engine not executed |
| not-a-repo | `none` | `doctor` | diagnostic | `GitIdentityError` on stderr; no JSON | 1 | 0 | no receipt | `e3b0c44298fc` | n/a | not pre-specified | NEW: see F4 |  |

`source_sha` is the fixture's own HEAD. The Ascout source under test is the subject above.

**How `executed_count` was established.** It comes from the CLI's own output and from reading `src/cli.ts`. No process-tree tracing was performed, so this report does not independently prove the absence of child processes.

### Cells not observed through the CLI

The matrix forbids scripts and dependencies in fixtures, so `check` could only reach exit 4 and the not-a-repo error path through the real CLI. The other exits rest on existing tests that call `runCheck` directly. They did not go through `dist/cli.js`.

| Case | Evidence | Windows default-concurrency run |
| --- | --- | --- |
| `check` exit 0 | `tests/vitest-check.integration.test.ts`, "runs project-local related Vitest and binds JSON plus LCOV" | passed |
| `check` exit 1 | `tests/flake-run-check.integration.test.ts` | 7 of 7 passed |
| `check` exit 2 | `tests/t106-environment-publication.integration.test.ts`, "maps only the typed environment integrity failure to exit 2" | passed |
| `check` exit 3, source drift | `tests/source-stability-run-check.integration.test.ts`, "rehashes source at the end" | passed |
| `review`, `test`, `security` failed engine or drift | N/A: no engine invocation exists at this baseline | N/A |

## Test results

Native exit codes are reported as observed. Later runs do not replace earlier failures.

| Run on Windows | Configuration | Exit | Files failed / total | Passed | Failed | Skipped | Time |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Full suite | Vitest default concurrency (12 node processes observed) | 1 | 9 / 246 | 2392 | 15 | 62 | 304 s |
| Five non-browser failed files, rerun | `--maxWorkers=1 --no-file-parallelism` | 0 | 0 / 5 | 49 | 0 | 9 | 377 s |
| Full suite | `--maxWorkers=1`, the same worker setting as Windows CI | 1 | 6 / 246 | 2403 | 4 | 62 | 1007 s |

The full suite was not run on Linux in this packet. In both full runs, 28 of the 62 skipped cases belong to three browser files whose setup failed, so those cases never ran.

**Browser failures.** Four browser files fail in both full runs with `Chromium provisioning failed`. On this host, the Playwright cache at `%LOCALAPPDATA%\ms-playwright` is a junction whose target no longer exists. That is the probable cause, but it was not proven. The junction was left unchanged, no duplicate Chromium was downloaded, and these browser cases are therefore **not qualified on this host**.

**One-worker failures outside the browser files.** All three reached their test deadlines.

| Test | Observed | Deadline |
| --- | --- | --- |
| T055, `tests/changed-line-exercise-run-check.integration.test.ts`, "emits exercised, not-exercised, and unresolved changed executable lines" | 60.3 s | 60 s |
| T019, `tests/git-tree-digest.test.ts`, "binds clean, staged, unstaged, deletion, and all nonignored untracked state" | 15.9 s | 15 s |
| T019, `tests/git-tree-digest.test.ts`, "filters stale-stat false modifications without refreshing the index" | 7.9 s | 5 s |

The failing set moved between runs. The first T019 case above passed in the default-concurrency run and failed at one worker, and these files passed alone at one worker. That pattern fits timing sensitivity on this host, but this report does not establish the cause. No deadline was changed and no test was skipped to reach these results.

## Exact-head CI

[Project CI run 40531354831](https://github.com/TheHalfMoon/Ascout/actions/runs/40531354831) ran on a push of `ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430`, and GitHub reports its conclusion as **failure**. No cell reports a failed result. Self Verification is a separate workflow, listed here because the procedure requires it.

| Cell | Result |
| --- | --- |
| `ubuntu-24.04` / Node 22 | PASS |
| `ubuntu-24.04` / Node 24 | PASS |
| `windows-2025` / Node 22 | PASS |
| `windows-2025` / Node 24 | PASS |
| `macos-14` / Node 22 | CANCELLED |
| `macos-14` / Node 24 | CANCELLED |
| Self Verification | NOT_RUN: no run is recorded for this SHA |

Cancelled cells do not count as PASS, so **macOS is unqualified at `ecada2bc`**. PR #652 proposes `macos-15`, and all seven checks passed on its head `7bbaa7a0`, but that is a different commit and is not evidence for this one.

## Findings

These are observations for review. No source was changed.

- **F1. `review` reports success to shell callers without reviewing anything.** With a changed file and no engine, JSON says `complete:false` and lists the file as unreviewed, but the process exits 0. A caller checking only the exit code sees success. This is the FD-1 case the plan already names.
- **F2. `test --profile standard` is not bound to any source.** It printed identical bytes for the empty fixture, the changed fixture, and a directory that is not a Git repository, always with exit 0. The plan lists the exit 0 but not the absence of a repository requirement.
- **F3. `security` NOT_RUN uses the same exit code as a finding.** Exit 1 is also the `check` exit for a verified finding. The JSON is unambiguous (`security_pass:false`, `clean_claimed:false`), but the exit code alone cannot separate them.
- **F4. Operational errors exit 1, not 2.** Outside a repository, `check` and `review` exit 1 through the generic handler (`src/cli.ts:408-409`), and `doctor` exits 1 through its own handler (`src/cli.ts:456-460`). Under the `check` precedence, 1 means a finding and 2 means an error. The message, "unable to list configured Git remotes", also does not say the directory is not a repository. `tests/t106-environment-publication.integration.test.ts` pins the generic fallback at exit 1 using an injected error ("preserves generic unexpected CLI exception behavior at exit 1"). It does not exercise this not-a-repo path, but changing the fallback would affect it, and that file is **not** on the E2 allowlist in the proposed freeze. The allowlist needs review before E2.
- **F5. Empty scope is treated differently across commands.** On the same empty repository, `check` exits 4 and `review` exits 0. The `check` result is the conservative one. FD-1 should decide the intended rule explicitly.
- **F6. The review identity names a binary not present on this host.** Output names `open-code-review`, while the installed package `@alibaba-group/open-code-review` 1.13.6 provides `ocr`, and no `open-code-review` command exists here. The source pin (`5f8e5ab3`) also differs from the installed build (`891df1b`). E3 and E6 must resolve both.
- **F7. `npm test` at default concurrency differs from Windows CI.** CI uses `--maxWorkers=1` on Windows (`.github/workflows/ci.yml:56`), while the `test` script sets no worker limit. On this host, the default run failed more tests than the one-worker run.
- **F8. `.ascout/` appears as untracked after `check` in a repository that never ran `init`.** Fixtures show `?? .ascout/` in `git status` afterward, on both platforms. Constitution principle VII says `.ascout/` must be ignored by default. HEAD and the tree did not change, and whether this conflicts with that principle needs a decision. `init` was not run, so its behavior is not covered here.

## Verification tools on this host

| Tool | Observed state | Used for this report |
| --- | --- | --- |
| OpenCode with `opencode/pulse-alpha-free` | v2.2.5 | Fresh read-only reviews of this report. They are advisory. Not used to produce any result above |
| Local D1 (a small on-device classifier) | Server online, CPU text mode | One advisory triage of a summary of this report, with no specific findings. Not evidence |
| Alibaba Open Code Review | `ocr` 1.13.6 (`891df1b`) | **No review occurred.** `ocr delegate preview` reports 0 of 1 files reviewable, because this Markdown file is excluded as `unsupported_ext` |
| PStack | `ps-*` skill files only; no executable or version found locally | **Not used as test evidence** |
| Gitleaks | Not installed | Not used |

## Limits of this evidence

- It applies only to this SHA, these two platforms, and these runtimes.
- macOS was not exercised at this head.
- Text and agent output formats were not captured; only the JSON format and `doctor` were.
- `init` was not run.
- Fixtures were benign. No hostile Git configuration was tested, so this report says nothing about E1.
- Raw logs stayed outside the repository and are not durable evidence. The harness below regenerates the matrix.

## Reproducing the matrix

Build a disposable clone at the subject SHA, then run `node e0-harness.mjs <clone> <output-dir>`. Fixture commits use fixed dates, so `fixture-empty` and `fixture-changed` should reproduce the HEADs above.

The harness differs from the matrix in three ways. It sets `commit.gpgsign=false` so host signing settings cannot reach fixtures, fixes commit dates, and adds a `not-a-repo` case.

<details>
<summary>e0-harness.mjs</summary>

```js
// E0 CLI baseline harness. Usage: node e0-harness.mjs <clone> <outDir>
// Observes only: builds synthetic fixtures under the OS temp dir and runs the built CLI against them.
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [clone, outDir] = process.argv.slice(2);
const cli = join(clone, "dist", "cli.js");
const root = realpathSync(tmpdir()) + `/ascout-v2-e0-${randomBytes(4).toString("hex")}`;
mkdirSync(root, { recursive: true });
mkdirSync(outDir, { recursive: true });

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_DATE: "2026-11-06T00:00:00Z",
  GIT_COMMITTER_DATE: "2026-11-06T00:00:00Z",
};
function git(cwd, ...args) {
  const r = spawnSync("git", args, { cwd, env: gitEnv, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}
function init(dir) {
  mkdirSync(dir, { recursive: true });
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "user.name", "Test");
  git(dir, "config", "user.email", "test@example.invalid");
  // Deviation from the matrix text: the host's global signing config must not reach fixtures.
  git(dir, "config", "commit.gpgsign", "false");
}
const fixtures = {
  "fixture-empty"(dir) {
    init(dir);
    git(dir, "commit", "-q", "--allow-empty", "-m", "empty");
  },
  "fixture-changed"(dir) {
    init(dir);
    writeFileSync(join(dir, "readme.txt"), "one\n");
    git(dir, "add", "readme.txt");
    git(dir, "commit", "-q", "-m", "readme");
    writeFileSync(join(dir, "readme.txt"), "one\ntwo\n");
  },
  "not-a-repo"(dir) {
    mkdirSync(dir, { recursive: true });
  },
};
const commands = [
  ["check", "--format", "json"],
  ["review", "--format", "json"],
  ["test", "--profile", "standard", "--format", "json"],
  ["security", "--format", "json"],
  ["doctor"],
];
const sha = (s) => createHash("sha256").update(s).digest("hex");
function state(dir, isRepo) {
  if (!isRepo) return null;
  return {
    head: git(dir, "rev-parse", "HEAD"),
    tree: git(dir, "rev-parse", "HEAD^{tree}"),
    status: git(dir, "status", "--porcelain"),
    ascout_dir: existsSync(join(dir, ".ascout")),
  };
}
const rows = [];
let n = 0;
for (const [name, make] of Object.entries(fixtures)) {
  for (const cmd of commands) {
    for (const run of [1, 2]) {
      const dir = `${root}/${String(++n).padStart(3, "0")}-${name}`;
      make(dir);
      const isRepo = name !== "not-a-repo";
      const before = state(dir, isRepo);
      const t = Date.now();
      const r = spawnSync(process.execPath, [cli, ...cmd], { cwd: dir, encoding: "utf8", timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
      const after = state(dir, isRepo);
      const clean = (s) => (s ?? "").split(dir).join("<FIXTURE>").split(dir.replaceAll("/", "\\")).join("<FIXTURE>");
      const stdout = clean(r.stdout);
      const stderr = clean(r.stderr);
      const label = `${name}__${cmd[0]}__run${run}`;
      writeFileSync(join(outDir, `${label}.stdout.txt`), stdout);
      writeFileSync(join(outDir, `${label}.stderr.txt`), stderr);
      let json = null;
      try { json = JSON.parse(stdout); } catch { /* non-JSON output stays null */ }
      rows.push({
        fixture: name, command: cmd.join(" "), run, exit: r.status, signal: r.signal, ms: Date.now() - t,
        stdout_bytes: Buffer.byteLength(stdout), stderr_bytes: Buffer.byteLength(stderr),
        stdout_sha256: sha(stdout), stderr_sha256: sha(stderr), json_parsed: json !== null,
        top_keys: json ? Object.keys(json) : null, before, after,
      });
    }
  }
}
writeFileSync(join(outDir, "rows.json"), JSON.stringify({ root, node: process.version, rows }, null, 1));
for (const x of rows) {
  console.log([x.fixture, x.command, `run${x.run}`, `exit=${x.exit}`, `${x.ms}ms`, `out=${x.stdout_bytes}`, `err=${x.stderr_bytes}`, x.stdout_sha256.slice(0, 10), `json=${x.json_parsed}`, x.after ? `dirtyAfter=${JSON.stringify(x.after.status)}` : "", x.after ? `.ascout=${x.after.ascout_dir}` : ""].join(" | "));
}
rmSync(root, { recursive: true, force: true });
console.log("fixtures removed:", !existsSync(root));
```

</details>
