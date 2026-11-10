# E8 Design: Local MCP Server and End-to-End Proof

**Status:** design, revision 2, for review. It authorizes no implementation. Before E8 code lands,
this design needs human R1 and the adoption-plan gate: core real-engine claims qualified (E5 and
E6 are) and a reviewed protocol spec, which this document is meant to become. Model reviews of it
are advisory and are listed at the end.

## Goal

An agent in an MCP host, such as an IDE or a desktop assistant, can ask Ascout the same questions a
person asks the CLI. It gets the same truthful, source-bound reports. MCP adds a transport and no
authority: no new capability, no PASS the CLI would not give, and no way for an agent to widen what
Ascout does.

## Non-goals

- No network transport: no HTTP, SSE, WebSocket, or remote MCP.
- No hosted model, telemetry, account, or paid service.
- No tool that runs repository code in v1.
- No local-model review over MCP in v1 (see "Threat: who launches the server").
- No writes to the repository and no publication.

## Prerequisite: E8 part zero, command functions

Today the commands are not callable in-process. They write reports and errors straight to
stdout and stderr (`src/cli.ts`). `doctor` only produces text. Several paths end the process. So a
server that called them would corrupt the JSON-RPC stream on stdout, and one fault would kill it.

Part zero refactors, with no change to CLI behavior:

- Each of `review`, `security`, `doctor`, and `test --plan` becomes a function
  `run<Command>(root, signal) → { report, exit_code, error_message }`. It never writes to stdout or
  stderr, and never ends the process. The CLI becomes a thin printer over these functions.
- `doctor` gets a versioned JSON report, `--format json`, with its own tests.
- The Gitleaks run and the local-model run take an `AbortSignal`, as `check` already does.
- The tests prove that the CLI's bytes and exit codes are unchanged.

"Returns the report unchanged" below means byte-identical to that command's `--format json` output.

## Transport and process

- `ascout mcp` starts a server on **stdio only**, speaking JSON-RPC 2.0 framed by newlines, as the
  MCP stdio transport defines. It opens no socket and no listener. Only framed messages go to stdout;
  every log goes to stderr.
- **The scope is fixed at launch.** At startup the server takes its working directory, resolves
  the real repository root, and applies the same refusals `check` applies. That root must be the
  repository root itself, not a subdirectory. If any of this fails, the server refuses to start: it
  writes the error to stderr and exits `2`. The resolved root is then passed to each tool. Nothing
  reads `process.cwd()` again.
- **The environment is read once, at launch.** `ASCOUT_GITLEAKS_PATH` is captured then. A tool call
  can't change it.
- No tool takes arguments. Every input schema in `tools/list` is
  `{"type":"object","properties":{},"additionalProperties":false}`. A call with any argument is
  rejected as invalid params.
- Bounds:
  - one request in flight; a second gets a busy error;
  - a 64 KiB inbound message cap;
  - a 4 MiB result cap; a larger result becomes an error, never a truncated report;
  - per-tool wall-clock limits: `ascout_test_plan` 5 s, `ascout_doctor` 60 s, `ascout_review`
    120 s, `ascout_security` 600 s.

  A tool past its limit is aborted through its signal, its process tree is torn down, and the call
  returns an error with no report.
- **Shutdown:** when stdin closes, a running tool is aborted the same way, and the server exits.

## Threat: who launches the server

MCP hosts often launch servers from workspace config inside the repository, such as
`.vscode/mcp.json` or `.cursor/mcp.json`. **Treat that config as the repository's choice, not the
person's.** So v1 accepts no opt-in flags at all:

- `ascout mcp` takes no options, and `--local-model` is refused.
- Gitleaks still runs only if `ASCOUT_GITLEAKS_PATH` is set. A repository-shipped config can set
  it, but the binary must match a pinned digest (E5), so that path can only run the real Gitleaks.
- The local-model config must already live outside the repository (E6C), and v1 doesn't use it.

## Tools (v1)

| Tool | Equivalent CLI | Runs repository code? |
|---|---|---|
| `ascout_review` | `ascout review --format json`, no model | No; hardened Git reads only |
| `ascout_security` | `ascout security --format json` | No; pinned Gitleaks reads files |
| `ascout_doctor` | `ascout doctor --format json` (from part zero) | No |
| `ascout_test_plan` | `ascout test --plan --format json`, default profile | No; it reads no repository |

`ascout_test_plan` always uses the default profile, because tools take no arguments.

## Result mapping

Every successful result is a single JSON text content block with this shape:

```json
{
  "exit_code": 4,
  "outcome": "NOT_RUN",
  "assurance": "INCOMPLETE",
  "untrusted_repository_text": true,
  "report": { "...": "the command's --format json report, unchanged" }
}
```

- **`assurance`** is the only summary an agent should act on:
  - `INCOMPLETE` for exit 4;
  - `FINDINGS` for exit 1;
  - `DRIFT` for exit 3;
  - `COMPLETE` for exit 0, from `review` or `security` only;
  - `NONE` for `ascout_test_plan`, which is a plan, not a result.

  No field is a bare "passed" boolean.
- **Exit 2** returns `isError: true`, with the error message after local paths are redacted the same
  way the CLI redacts them, and no report.
- **`untrusted_repository_text: true`** is always present. The report contains repository text,
  such as paths, rule IDs, and change lists, and the server never interprets it.

## Excluded in v1

- **`check` and `test` without `--plan`.** These run repository code at T0 with the user's rights.
  FD-4's recommended text gives that choice to a person, per invocation, and never to an agent. They
  stay out until FD-4 is disposed of and either T1 exists or the founder approves a
  human-confirmation design.
- **`init`.** It writes files.
- **Local-model review.** See the threat section.
- **MCP resources, prompts, and sampling.** Sampling would hand text generation to the host's model.

## Security regression tests (required with the implementation)

| ID | Attack | Must hold |
|---|---|---|
| M-1 | A tool call with any argument | Invalid params; nothing runs |
| M-2 | An unknown tool, or `check`, `test`, or `init` | Tool not found |
| M-3 | Over 64 KiB, malformed JSON, a batch, a notification, a missing or duplicate id | A JSON-RPC error or ignored as the spec says; the server stays healthy |
| M-4 | A second request while one runs | Busy error; never concurrent |
| M-5 | `ascout mcp --local-model`, or any option | Refused at launch, exit 2 |
| M-6 | Launch from a subdirectory, outside a repository, or in a refused repository | Refused at launch, exit 2 |
| M-7 | stdin closes mid-tool, or a tool passes its limit | Aborted, tree torn down, error result or exit; no report |
| M-8 | Repository text shaped like JSON-RPC or instructions | Inert string data; no extra stdout messages |
| M-9 | Anything but framed JSON-RPC on stdout | Never; logs go to stderr |
| M-10 | A network listener | None, checked on Linux, macOS, and Windows by listing the server's sockets |
| M-11 | A hostile `.git/config` or `.gitattributes` (fsmonitor, hooks, filters) through every tool | No child process besides hardened `git` and pinned Gitleaks |
| M-12 | A result over 4 MiB | An error, never a truncated report |
| M-13 | Exit-2 messages | Local paths redacted |
| M-14 | `ascout_test_plan` | `assurance: "NONE"`; never `COMPLETE` |
| M-15 | `tools/list` | Every schema is empty with `additionalProperties:false`; exactly four tools |

## End-to-end proof

- **E2E-1.** A test spawns the compiled `ascout mcp` and drives it over stdio: `initialize`,
  `tools/list`, then each tool. It compares each `report` byte for byte with the CLI's
  `--format json` output for the same fixture repository and source. This runs on Windows, Linux,
  and macOS in Project CI.
- **E2E-2.** Gitleaks over MCP runs in the Real Engines CI, with the same pinned binaries.

## Open decisions for review

1. **Protocol implementation.** Hand-write the small JSON-RPC subset, with no new dependency, or
   pin `@modelcontextprotocol/sdk` with an E3 notice. *Recommendation:* hand-write it.
2. **Entry point.** An `ascout mcp` subcommand, or a separate binary. *Recommendation:* a subcommand.
3. **Local-model review over MCP later.** It needs a launch path the repository can't influence.
   This is deferred.

## Packets

1. **E8 part zero:** command functions and doctor JSON. A pure refactor, unblocked once this
   design is accepted.
2. **E8 part one:** `ascout mcp`, the four tools, M-1 to M-15, and E2E-1.
3. **E8 part two:** E2E-2 in Real Engines.

## Review record

| Date | Reviewer | Kind | Verdict |
|---|---|---|---|
| 2026-11-09 | Design-critic subagent, fresh context, read-only (Claude) | Advisory, same model family as the author | REVISE: 1 Blocker (in-process wrapper impossible as written), 5 Major, 5 Minor. All are addressed in revision 2. |
| 2026-11-09 | Local OpenCode with Qwen2.5-Coder 7B | Advisory, independent family | NOT_RUN: the local model was no longer installed |
| 2026-11-10 | Alibaba open-code-review v1.13.6, local Qwen | Advisory | NOT_RUN: OCR does not review Markdown ("unsupported_ext") |
| 2026-11-10 | Local OpenCode with Qwen2.5-Coder 7B, on the revision 2 diff | Advisory, independent family | NONE: no findings. A small model's "none" is weak evidence. |
| 2026-11-10 | Founder, in chat | Authorization to proceed | The founder said they would review this, then directed the work to go ahead, with local Alibaba-family review where review is needed. This is recorded as the founder's go-ahead, not as a line-by-line human R1. |

## Implementation notes (part one)

- **M-10 is a static check, not a socket listing.** Node's own stdio may use socket pairs on some
  platforms, so listing the server's sockets can't tell them from a listener. Instead the test
  checks that `src/mcp/server.ts` and `src/command-functions.ts` import no network module
  (`node:net`, `http`, `https`, `http2`, `dgram`, `tls`). The local-model path, which does use
  the network, is unreachable from MCP in v1.
- **Time limits on the two synchronous tools.** `ascout_doctor` and `ascout_test_plan` run
  synchronously, so their limit can't interrupt them mid-run. The Git timeouts inside doctor
  bound it instead. `ascout_review` and `ascout_security` are aborted through their signal.
- **E2E-1 caught a mismatch while this was being built.** The security result first carried an
  internal wrapper. It now returns exactly the `ascout security --format json` report.

## Rollback

E8 is additive. Part zero is behavior-preserving by test. Removing `mcp` returns Ascout to CLI-only.
