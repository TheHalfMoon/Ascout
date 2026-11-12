# E11 Design: expanding the MCP server safely

**Status:** design, revision 2, for review.

- **Part A (two read-only tools)** follows the standard engineering loop. It amends E8 explicitly
  (see "E8 amendment").
- **Part B (a confirmed run tool)** authorizes no implementation. E8 keeps tools that run repository
  code out until FD-4 is decided and either T1 exists or the founder approves a human-confirmation
  design. This document gives the founder that design to decide on, including its limits.
- Model reviews of this document are advisory and are not human R1.

## Goal

The founder's directive: expand MCP safely, with **no arbitrary command execution** and **explicit
permission for anything that runs repository code**.

E8's contract otherwise stays in force:
- MCP adds a transport and no authority;
- tools take no arguments and run one at a time;
- no tool returns a PASS the CLI wouldn't give;
- `ascout mcp` takes no options, because MCP host config often lives inside the repository and is the
  repository's choice, not the person's.

## Part A: two read-only tools (build now)

Neither tool runs repository code, writes anything, or touches the network. Both take no arguments
and have an entry in `MCP_TOOL_LIMITS_MS`. Their assurance is always `NONE`: they describe
configuration and records, never verification.

**"Runs no repository code" here means what it means for E8's `ascout_review` and `ascout_doctor`.**
`ascout_last_check` uses Git with the same hardened invocation:
- the same flags and environment;
- no hooks, fsmonitor, textconv, external diff, or filter attributes.

It runs nothing else.

### `ascout_policy`

It reports the team policy (`.github/ascout-policy.json`, from #719) as it stands **in this working
tree**:

- `state` is one of:
  - `default`: no file, so every check is required;
  - `file`: valid;
  - `invalid`: the publisher would refuse.
- `required_checks` is the list of required checks.
- `reason` explains an invalid policy, and is one of the publisher's fixed messages.

It reads the file with the publisher's own loader:
- a link, or anything that isn't a regular file, is refused;
- the file is capped at 16 KiB;
- a byte-order mark is accepted;
- the schema is strict.

It also refuses when `.github` itself is a symbolic link, or when the file's real path isn't inside
the repository root.

The result always says the publisher reads the **default branch's** copy. An agent can check a
policy edit before proposing it, but the result never says what a pull request will be held to.

### `ascout_last_check`

It reports what the newest **completed** `ascout check` run *recorded*. That run is something a
person started from the CLI. The receipt is a file anyone with write access to the repository can
write, the agent included, so:

- **Every field is reported as recorded, never as verified.** The names make that plain:
  `recorded_exit_code`, `recorded_completeness`, `recorded_task_counts`, and
  `recorded_finding_count`. The result also states: "a record on disk, not re-verified; anyone with
  write access could have written it".
- **The assurance is always `NONE`,** even when the record says exit 0 and complete.
- **Freshness is narrow and named for what it is.** `recorded_state_matches_now` is `true` only when
  all of these hold:
  - the receipt's `stability` is `stable`;
  - its recorded start and end states are equal;
  - the end is present;
  - `repository_id`, `head_sha`, and `tree_digest` all equal the working tree now.

  Otherwise it is `false`, or `unknown` with a fixed reason. `unknown` covers the cases where Git is
  refused, a filter attribute is present, or no trusted Git is found. The result states the digest's
  scope: tracked and untracked, non-ignored files, excluding `.ascout`. Changes to ignored files
  (`.env`, `node_modules`, generated fixtures) don't show up. A match therefore means the recorded
  state is the same; it doesn't mean the record is true.
- **Choosing the run:**
  - it reads `.ascout/runs/` only if it, and `.ascout`, are real directories, not links;
  - it lists at most 10,000 entries and refuses if there are more;
  - it accepts only directory names matching `^[0-9]{15}-[0-9a-f]{12}$`, which is the CLI's run-id
    shape;
  - it considers only runs whose `manifest.json` says `completed` and that have no `.active` marker,
    so a run still being written is never read;
  - the newest is the greatest name;
  - the receipt's `run.run_id` must equal the directory name.
- **Reading the receipt.** `receipt.json` must be a regular file, not a link, of at most 1 MiB. It is
  validated with the existing schema and semantic checks.
  - An invalid receipt is reported as `invalid`, giving only which layer failed (`json`, `schema`,
    `semantics`, `binding`) and how many issues were found. No attacker-chosen text is passed on.
- **What it returns:**
  - the run id, which already matches the pattern above;
  - the recorded exit code, completeness, task-status counts, and finding count;
  - freshness, and the fixed caveats.

  It never passes on raw output, task names, paths, finding messages, or receipt text that could
  carry instructions for the model.

## E8 amendment (part of E11a)

E8 lists four tools, and its M-15 test pins that number. E11a amends E8 in the same packet:
- the tool table gains the two tools above;
- M-15 checks six;
- the sentence "no tool runs repository code" stays true, under the meaning given above.

## Part B: a confirmed run tool (design only; needs a founder decision)

Running `check` from MCP would run the repository's own test commands with the user's rights (T0).
An agent must never be able to start that alone. The only per-invocation confirmation MCP offers is
**elicitation**, and it has a hard limit:

**What elicitation can and can't prove.** The MCP specification says the protocol "does not mandate
any specific user interaction model", and treats user approval controls as recommendations. A host
can show the request to a person, or answer it automatically, and Ascout can't tell which happened.
So elicitation gives **host-mediated consent**, not proof that a person approved. Whether that is
enough is the founder's decision.

If the founder accepts host-mediated consent, the tool `ascout_check_with_confirmation` would:

1. **Run only when elicitation was negotiated.** The negotiated protocol must be `2025-06-18` or
   later, and the client must declare the `elicitation` capability at initialization. Otherwise
   nothing runs, exit 4. The server would need to:
   - record the client's capabilities;
   - accept JSON-RPC responses from the client, which it drops today;
   - stop offering protocol versions that predate elicitation for this tool.
2. **Show a bound, escaped prompt.** The prompt names the repository and the exact commands from
   `check`'s plan, and says they run with the person's rights and no sandbox.
   - All repository-controlled text is escaped: control and bidirectional characters are removed.
   - Each command is capped at 200 characters, and the list at 20 entries; anything longer is cut
     off visibly.
   - The prompt carries the plan's digest and the current `tree_digest`.
3. **Re-check before running.** On an explicit `accept`, Ascout recomputes the plan and the
   `tree_digest`. If either changed after the prompt was shown, it refuses with exit 3: the person
   approved different code. For example, an agent could edit `package.json` while the prompt is open.
4. **Fail closed otherwise.** `decline`, `cancel`, a malformed answer, or no answer within 120
   seconds all mean "not run", exit 4. No flag, environment variable, or config can pre-approve. If
   the server's input closes, a pending prompt or run is aborted.
5. **Stay narrow.** It takes no arguments, can't choose commands, paths, or profiles, runs only the
   standard `check` with its existing admission rules, and never runs at the same time as another
   tool.
6. **Return the CLI receipt summary,** with the same truth rules.

**Founder decision:** whether host-mediated consent counts as "a person, per invocation" under FD-4.
If it doesn't, running repository code stays CLI-only until T1.

## Security regression tests (Part A)

- **Both tools:**
  - they take no arguments, and any argument is refused;
  - they start no process except hardened Git, checked by a spawn sentinel that allows only the
    hardened Git invocation;
  - they write nothing, checked by a snapshot of every file under the root, including `.ascout` and
    ignored files, before and after;
  - their assurance is `NONE`.
- **`ascout_policy`:**
  - each of these reports `invalid`, with a fixed reason: a missing-file default aside, a policy that
    is a link, a `.github` folder that is a link, an oversized file, or an invalid policy;
  - a missing file reports `default`;
  - a valid file reports exactly the publisher's normalized list;
  - a BOM is accepted.
- **`ascout_last_check`:**
  - each of these reports "none": no `.ascout`, a link in place of `.ascout` or `runs`, or only
    non-matching directory names;
  - an active run is skipped;
  - the newest completed run is chosen;
  - each of these is refused: a `receipt.json` that is a link or oversized, a `run_id` that differs
    from the directory name, and more than 10,000 entries;
  - each invalid layer is reported with no attacker text, using a receipt whose keys contain
    instruction-like text;
  - `recorded_state_matches_now` is `true` only for stable, equal states that match now;
  - it is `false` for another tree, an unstable run, or a missing end state, and `unknown` when Git
    is refused;
  - even an exit-0, complete record has assurance `NONE`, and every field is `recorded_`.
- **MCP surface:** `tools/list` has exactly six tools, and every other E8 contract test still passes.

## Packets

| Packet | Content | Gate |
|---|---|---|
| E11a | `ascout_policy` and `ascout_last_check`, with tests; the E8 amendment; README MCP section | Standard engineering loop |
| E11b | `ascout_check_with_confirmation` via elicitation | **Founder decision** on host-mediated consent, plus FD-4 |

## As built (E11a)

- **Code:** `src/mcp/read-tools.ts`, wired into `src/mcp/server.ts`. Limits are 5 s for
  `ascout_policy` and 60 s for `ascout_last_check`.
- **Tests:** `tests/mcp-read-tools.test.ts`.
  - It runs a real `ascout check` to get a genuine receipt.
  - A spawn sentinel mocks `node:child_process` and checks that the policy tool starts nothing, and
    that `ascout_last_check` starts only Git carrying the hardening overrides.
  - A snapshot of every file under the root shows nothing is written.
- **E8:** the tool table gains the two tools, and M-15 now checks six (`tests/mcp-server.test.ts`).

## Review record

- **Revision 1:** independent AI review (subagent). It found no critical issues, 3 high, 5 medium, 3
  low, and 2 nits. Revision 2 addresses all of them:
  - **High:**
    - elicitation can't prove a person approved, and the server can't negotiate it yet;
    - a forged receipt could read as fresh and complete;
    - the "no subprocess" test was impossible.
  - **Medium:**
    - freshness compared the end state only;
    - freshness overstated what the digest covers;
    - the run selection was undefined and could be manipulated;
    - attacker text could be passed on to the model;
    - no behavior was defined for an unreadable source state.
  - **Low:**
    - a `.github` folder that is a link;
    - the E8 amendment was implicit;
    - the "writes nothing" test was weak.
  - **Nits:** the prompt time limit, and what ending the session means.

No human has reviewed this design. It is not human R1.
