# E10 Design: Bring Your Own AI (BYOAI) review providers

**Status:** design, revision 3, for review. It authorizes no implementation.

- E10a and E10b follow the standard engineering loop.
- E10c (remote egress), E10d (delegated review) and E10f (AI review in PRs) each need a founder
  decision before any code.

Model reviews of this document are advisory, are listed at the end, and are not human R1.

## Goal

A team can use the AI model it already pays for, or runs itself, to add advisory review findings to
Ascout. Three rules hold throughout:

1. **Ascout never pays for inference.** It never creates an account, key, or subscription, and it
   operates no inference service.
2. **Ascout never silently sends source code off the machine.** Ascout opens a non-loopback
   connection only for a remote provider that the operator configured for this repository **and**
   confirmed for this run (see "Two keys for egress").
3. **A model can never make anything pass.** A model's findings can fail a review. A model's
   silence, or its statement that code is safe, is never a completed review and never exit 0.

## What exists today (E6)

`ascout review --local-model` already does the narrowest form of this.

- **Provider:** Ollama only.
- **Endpoint:** must be exactly `http://127.0.0.1` or `http://[::1]` (any port). `localhost`,
  IPv4-mapped IPv6, userinfo, paths, queries, and fragments are refused, and so are redirects.
- **Config:** read from `review-provider.json` in the user's config directory. A config whose real
  path is inside the repository under review is refused. `authorized_by_founder` must be literally
  `true`.
- **Policy:** the decision gate (E6B) hardcodes `allow_paid: false` and `allow_source_egress:
  false`. It also blocks any provider that needs a credential.
- **Payload:** numbered excerpts of each changed file. These are the changed lines with ±10 lines of
  context, not a unified diff. Until E10b, the prompt called it one.
  - Redaction removes the values of four token variables only (`GITHUB_TOKEN`, `GH_TOKEN`,
    `NPM_TOKEN`, `NODE_AUTH_TOKEN`). Secrets written in the code are **not** redacted.
  - Untracked files that git does not ignore are included.
  - Limits: 120 KiB per run and 1 MiB per file.
- **Results:**

  | Situation | Result | Exit |
  |---|---|---|
  | Findings on changed lines | Findings | 1 |
  | No findings ("a model's silence is advice, never a completed review") | `NO_FINDINGS`, not a pass | 4 |
  | Provider absent, refused, failed, or timed out | Not run | 4 |
  | Invalid config | Error | 2 |
  | Source changed during the call | Source drift | 3 |

  No path leads to exit 0.
- **Report:** `advisory: true`, `satisfies_human_r1: false`, and the model and its independence.
- **MCP:** no model; `ascout mcp` takes no options.
- **GitHub PR integration:** no model. `collect.ts` runs review without one.

## Gaps in E6 this review found (fixed in E10a)

- **The config location is controlled by the environment.** `ASCOUT_CONFIG_HOME` is honored on every
  run, though E6C describes it as test-only. So are `XDG_CONFIG_HOME` and `APPDATA`. A repository's
  `.envrc`, devcontainer, or script could point Ascout at a config it wrote outside the repository.
  Checking who owns the file doesn't help, because such a script runs as the same user.
  - **Fix:** derive the config path from the operating-system account, never from environment
    variables:
    - the home directory from the account database (`os.userInfo().homedir`), not `HOME`;
    - on Windows, the account's Roaming AppData folder, not `APPDATA`.
  - **Fix:** honor `ASCOUT_CONFIG_HOME` only in an explicit test mode.
  - **Fix:** also refuse a config writable by other users (POSIX). This is defense in depth, not the
    main control.
- **Proxy environment variables.** The call uses the global `fetch`. **Fix:** use an explicit
  connection with no proxy, and test that the `HTTP_PROXY`, `HTTPS_PROXY` and `NODE_USE_ENV_PROXY`
  variables, and proxy settings in `NODE_OPTIONS`, have no effect.
- **"Loopback" does not mean the code stays on the machine.** A local proxy (for example a gateway
  server or an SSH tunnel) can forward `127.0.0.1` to a remote API, and some local servers can serve
  cloud-backed models. Ascout can't see past the loopback socket.
  - **Fix (docs):** say exactly what is guaranteed: Ascout opens no non-loopback connection for a
    loopback provider. Where the local server sends data is the operator's responsibility.
- **Untracked files in the payload.** An un-ignored `.env` would be sent to the model. **Fix:** never
  include untracked files in a model payload, and apply the built-in excludes below to every
  provider.

## Non-goals

- No Ascout-hosted or Ascout-paid inference, proxy, relay, or account.
- No use of a consumer chat subscription as if it were an API credential. Ascout only calls a
  documented API with credentials the operator supplies.
- No telemetry, and no upload of prompts, payloads, receipts, or reports to anything Ascout runs.
- No model output that sets exit 0, clears a deterministic finding, or changes a test or security
  result.
- No model calls over MCP (unchanged from E8).
- No model call from the privileged GitHub publish job, and none from any job that runs pull
  request code with a model credential present.
- No `pull_request_target` workflows.
- No automatic retries that multiply cost. Each run makes at most one review request.

## Provider classes

| Class | What Ascout connects to | Who pays | Gate |
|---|---|---|---|
| **None** (default) | Nothing | Nobody | Review reports not run, exit 4. |
| **Loopback** | `127.0.0.1` / `[::1]` only | The operator's own hardware | Operator config. Today Ollama; E10b adds OpenAI-compatible local servers. |
| **Remote** | A third-party API the operator chose | The operator, on their own account | Two keys plus a payload secret scan. Founder decision required (E10c). |
| **Delegated** | Nothing | The operator, through their own agent | Ascout exports a task and validates the returned findings. Founder decision required (E10d). |

## Provider interface (E10a)

One interface replaces the Ollama-specific call seam. Payload building, parsing, location checks,
and report mapping stay shared, so every provider follows the same truth rules.

```ts
interface ReviewProviderV2 {
  readonly id: string;                 // "ollama", "openai-compatible"
  readonly egress: "NONE" | "REMOTE";  // derived from the validated endpoint, never declared by config
  readonly cost: "OPERATOR_LOCAL" | "OPERATOR_ACCOUNT";
  disclosure(): ProviderDisclosureV1;  // host, model, egress, limits: printed before any request
  review(payload: ReviewPayloadV1, signal: AbortSignal): Promise<RawModelReplyV1>;
}
```

- **`egress` is computed by Ascout** from the endpoint after validation. A loopback address is
  `NONE`, and anything else is `REMOTE`. A config file can't claim a remote host is local.
- **`review` returns raw text only.** Shared code parses it with the existing `parseReviewFindingsV1`.
  After JSON decoding, it removes the run's selected secret values from every string the model
  returned, so a secret written with escapes is caught too. It marks every finding
  `producer_class: "MODEL"` and `authority: "NONE_UNTRUSTED"`. Credentials (E10c) join the same
  redaction set.
- **There is a single egress choke point.** In E10a it is a gate in the review run that refuses any
  provider whose egress is not `NONE`, before any call. E10c adds the only function that may open a
  non-loopback connection, and the network-sentinel test with it.

### As built (E10a)

- **Implemented:**
  - the interface;
  - Ollama behind it;
  - the egress gate;
  - the config location derived from the account. On POSIX, a config is refused when it isn't owned
    by the account, or when it or its folder is writable by others. Windows ACLs are not checked;
  - proxy-free loopback HTTP, tested against `NODE_USE_ENV_PROXY` and `NODE_OPTIONS=--use-env-proxy`.
    A positive control shows that Node 24's `fetch` does use the proxy, even for `127.0.0.1`;
  - untracked files and the built-in secret names are never sent;
  - reply redaction after decoding.
- **Not yet:** `disclosure()` exists but isn't printed. Printing it before a request matters when
  code can leave the machine, so it comes with E10c.

Beyond the E6 fixes above, E10a changes no behavior. The tests prove that exit codes are otherwise
unchanged.

## Loopback, OpenAI-compatible (E10b)

Many local servers speak the OpenAI `/v1/chat/completions` format. E10b adds an `openai-compatible`
provider with exactly the same loopback rule as Ollama. Ascout makes no non-loopback connection, and
nothing is paid. No new decision is needed.

### As built (E10b)

- **Config:** version 1 accepts `"provider": "openai-compatible"` alongside `"ollama"`. Anything else
  is refused, and the same loopback endpoint rule applies, with an explicit port.
- **Request:** one `POST <endpoint>/v1/chat/completions` with `model`, `stream: false`,
  `temperature: 0`, and the same two messages as Ollama, so the change is fenced as data. It sends no
  `response_format`, because servers differ in what they accept.
- **Reply:** `choices[0].message.content` is used as the reply. One surrounding Markdown fence tagged
  `json`, or untagged, is removed. Any other shape is refused as malformed, exit 4. The server
  reports no version, so the version is `unknown`.
- **Reports** name the engine `engine:review-openai-compatible` and the provider identity
  `provider:openai-compatible-<model>`.
- **Same truth rules as Ollama:** findings on changed lines exit 1, silence exits 4, and nothing
  exits 0.

## Remote providers (E10c, approved 2026-11-13)

Sending source to a third party is the one action BYOAI adds that can't be undone. It changes three
parts of the E6B policy, not one:

- egress, which is blocked today;
- a provider that needs a credential, which is blocked today;
- a paid provider. This needs a new definition: **operator-paid** means the operator's own account is
  billed. It is distinct from Ascout paying, which stays forbidden.

### Two keys for egress

Neither key alone does anything, and neither may come from the repository or its environment.

1. **Operator config,** version 2, at the per-user location derived from the operating-system account
   (see the E6 gaps above). No environment variable can move it outside test mode.

   ```json
   {
     "version": 2,
     "provider": "openai-compatible",
     "endpoint": "https://api.example-provider.com/v1",
     "model": "example-model",
     "model_family": "example",
     "credential_env": "EXAMPLE_API_KEY",
     "allow_remote_egress": true,
     "operator_authorized": true,
     "repositories": ["/home/me/src/project-a"],
     "limits": { "max_payload_bytes": 122880, "max_output_tokens": 4000 }
   }
   ```

   `repositories` lists the real paths of the repository roots that may be sent.
   - Ascout compares real paths, not a remote URL, because a repository controls its own remote URL.
   - The match is exact equality, not a prefix, with case folded on Windows and macOS. A nested clone
     or a git dependency inside a listed repository therefore does not match.
   - A repository that isn't listed sends nothing.

2. **Per-run confirmation by a person.** Ascout prints the disclosure (host, model, file count,
   bytes) and asks the operator to type the host name.
   - The answer is read from the controlling terminal (`/dev/tty`, or `CONIN$` on Windows), not from
     standard input. Both input and output must be a real terminal.
   - Ascout shows when the host differs from the one last confirmed for this repository.
   - Neither a flag nor an environment variable can supply this key.
   - With no terminal, as in CI, remote egress is refused. CI is handled separately, under "AI review
     in pull requests (E10f)".

   This key confirms intent. It stops non-interactive scripts. It does **not** stop a script that
   drives a pseudo-terminal, and a person may type whatever host is shown. That is why the first key
   must be out of the repository's reach: a config at an account-derived location that lists this
   repository.

### Rules for remote

- **Endpoint:**
  - HTTPS only, with an exact host match after lowercasing and trailing-dot normalization.
  - Ports must match exactly.
  - Refused: userinfo, a query, a fragment, and redirects.
  - Refused: any address that resolves to a loopback, private, or link-local range (for example
    `169.254.169.254`). Internationalized names are compared in their punycode form.
  - The address is resolved once per run and used for the connection.
- **No proxies,** and the connection is made explicitly. `NODE_EXTRA_CA_CERTS` is recorded in the
  report when it is set, because it changes which servers are trusted.
- **Payload safety before sending:**
  - The built-in excludes always apply: `.env*`, `*.pem`, `*.key`, `id_rsa*`, `id_ed25519*`,
    `*.p12`, `*.pfx`, `.npmrc`, `.pypirc`, and `credentials*`. An operator `exclude` list can only add
    to them.
  - Untracked files are never sent.
  - The exact payload is scanned with the qualified Gitleaks engine (E5), and **any hit refuses the
    send.** It is not merely redacted, and the run reports not run, exit 4, naming the files. The
    repository must not be able to switch the scan off:
    - the scan runs on a copy in a temporary folder, with a fixed configuration;
    - the repository's `.gitleaksignore` and Gitleaks settings are never used;
    - inline `gitleaks:allow` markers are removed from the scanned copy.
  - If Gitleaks isn't available, remote egress is refused.
  - This scan is a **best effort**. Gitleaks recognizes common secret patterns, not every secret, so
    the docs must not promise that no secret can leave.
- **Credentials by reference only.** The config names an environment variable. The key's value is
  never written to a config, report, receipt, log, PR bundle, or error message. It is redacted from
  server errors, and from the model's reply before parsing.
- **`--dry-run`** prints the disclosure and the exact payload, then exits 4 without sending.
- **Recorded in the report:**
  - `egress: "REMOTE"`, the host, and a SHA-256 of the exact payload sent;
  - the model's name and its independence.

  The credential and the payload text are never recorded.
- **Cost bound.** One request, with `max_output_tokens` enforced and no retries. The operator's
  account is billed; Ascout's never is.

### As built (E10c)

- **Command:** `ascout review --remote-model [--dry-run]`. Off by default; with no remote config it
  reports not run (exit 4) and makes no connection. The code is
  `src/assurance/review/remote-review.ts`, the only module that may open a non-loopback connection.
- **First key:** `review-remote.json`, version 2, in the same account-derived folder as
  `review-provider.json`, so version 1 is untouched.
  - The config is refused inside the repository and, on POSIX, when it isn't the account's own or
    is writable by others.
  - Strict keys. `provider` is `openai-compatible`. `allow_remote_egress` and `operator_authorized`
    must both be `true`.
  - `credential_env` names the variable holding the key; the key itself is never in the config.
  - `repositories` lists absolute paths, compared by exact real path and case-folded on Windows and
    macOS.
  - `limits` (payload at most 120 KiB, output 1 to 32000 tokens) and an optional `exclude` list of
    repository-relative prefixes that only add to the built-in exclusions.
- **Endpoint:** HTTPS to a DNS name. Refused: user info, a query, a fragment, a trailing dot, an IP
  literal, `localhost`, and single-label names. Internationalized names are compared in punycode.
  Requests go to `<endpoint path>/chat/completions`.
- **Gates, in order, before anything is sent:**
  1. config and both flags;
  2. this repository listed;
  3. the credential variable set;
  4. a non-empty payload (same builder as local review, plus the operator's exclusions);
  5. a clean Gitleaks scan of the exact payload, run on a copy in a new temporary repository with
     `gitleaks:allow` removed and no `.gitleaksignore`. Each file keeps its own name, so rules that key
     on a file name still apply, and the copy is committed with the same trusted Git lookup the rest
     of Ascout uses.
     - Any hit refuses the send and names the file.
     - Clean has exactly one shape: Gitleaks ran to the end, wrote its report, and found nothing
       (`COVERAGE_UNPROVEN`). Every other result refuses, including output over the cap,
       cancellation, or a missing Gitleaks;
  6. DNS resolved once, and every answer must be public unicast;
  7. the host typed by a person at the controlling terminal (`/dev/tty`, or `CONIN$`/`CONOUT$` on
     Windows; never standard input). The last host confirmed for the repository is kept in the
     operator's config folder and shown when it changes.
- **Transport:** Node's `https` with its own agent, so proxy variables don't apply. Certificate checks
  are set explicitly, so `NODE_TLS_REJECT_UNAUTHORIZED` can't turn them off. Besides the idle timeout,
  an overall deadline applies. The resolved
  address is pinned through `lookup`, and the TLS name stays the host. One request, no redirects
  (a 3xx is a refusal), a 5-minute timeout, and a reply capped at 1 MiB. `max_tokens` comes from the
  config. The credential is sent as a bearer token and removed from everything reported, including a
  reply that echoes it.
- **`--dry-run`** prints the disclosure and the exact payload, exits 4, and resolves, scans,
  confirms, and sends nothing.
- **Reports:** the same truth rules as local review (findings on changed lines exit 1, everything
  else 4, never 0), with `advisory: true`, `satisfies_human_r1: false`, and
  `remote: { egress: "REMOTE", host, payload_sha256, cost: "OPERATOR_ACCOUNT", node_extra_ca_certs }`.
- **Review record:** an independent AI security review found a high-severity defect: a payload with
  thousands of secrets overflowed Gitleaks' output cap and was reported clean. It also found a
  transport that couldn't connect on Node 20 and later (its `lookup` didn't answer `all: true`),
  rules lost by renamed scan files, and missing 6to4, Teredo, and documentation ranges. All are fixed
  with regression tests, and the first two are verified against the real Gitleaks and a loopback TLS
  server.
- **Known limits:**
  - The Gitleaks scan is best effort, as above.
  - The terminal confirmation proves intent, not identity: a script that drives a pseudo-terminal
    can type the host. That is why the first key must be out of the repository's reach.
  - Windows ACLs on the config aren't checked.
  - A host whose DNS answer changes between resolution and connection is still pinned to the checked
    address.

## Delegated review (E10d, approved 2026-11-13)

Many teams already run an AI agent that can see their code. Ascout can hand it the review task, then
check what comes back. Ascout makes no network call in this mode.

1. `ascout review --export-task <path>` writes the payload, the instructions, a payload digest, and
   the source fingerprint.
   - `<path>` must be outside the repository, so the export can neither change the fingerprint nor
     be committed.
   - The file is created readable by its owner only (0600 on POSIX), because it contains source.
   - The same built-in excludes and untracked-file rule apply.
2. The operator's agent writes findings as JSON.
3. `ascout review --ingest <findings.json>` then checks the result. `<findings.json>` must also be
   outside the repository.
   - **size and shape:** at most 1 MiB and strict keys. A file with more than 200 findings is refused
     whole, not truncated;
   - **digest:** Ascout recomputes the payload digest from the current tree and never trusts the
     digest written in the file. If the file names a different task, it is refused as an error,
     exit 2;
   - **fingerprint:** if the source changed since export, that is source drift, exit 3;
   - **every path:** relative, with no `..` and no absolute or drive path, and one of the exported
     files;
   - **every line:** a changed line.

   It reports with the same truth rules: exit 1 with findings, otherwise exit 4.

The digest is a plain hash, not a signature. It proves which task the findings answer, not who wrote
them. Replaying findings against the same unchanged source can only re-report findings on that code,
so it can't produce a pass.

The model's identity in an ingested file is **asserted and unverified**. The report records it as
such, and never as `INDEPENDENT_MODEL`.

This is also the safe route to AI help over MCP later: an agent could request the task and submit
findings without Ascout calling any model.

### As built (E10d)

- **Commands:** `ascout review --export-task <path>` and `ascout review --ingest <findings.json>`, each
  exclusive with the other and with `--local-model`. The code is in
  `src/assurance/review/delegated-review.ts`; it imports no network module.
- **Export:**
  - The task holds the instructions, the numbered payload (built by the same code as the local
    review, so untracked and secret-named files are left out and selected secret values removed),
    the changed lines, and `task_sha256`. That digest covers the HEAD commit, the tree fingerprint,
    the file list, and the payload.
  - It is written with `wx` and mode 0600, so an existing file is never overwritten. On Windows,
    0600 doesn't apply and the file takes its folder's permissions; the report says to keep it out
    of shared folders.
  - Exit 0 with assurance `NONE` when a task is written, exit 4 when nothing has text lines to
    review.
  - Each export is recorded under `.ascout/review-tasks/`, which the fingerprint leaves out. The
    record is written to a new file and renamed into place, so a link planted there is replaced,
    never written through.
- **Outside the repository** means the real path of the nearest existing ancestor climbs out of the
  repository's real path (`..` followed by a separator), compared without case on Windows and macOS.
  A folder named `..cache` is inside.
- **Ingest:**
  - The file is read through a descriptor bound to the checked file (BigInt device and inode) and
    capped at 1 MiB even if it grows.
  - Strict keys, at most 200 findings, model and family names limited to
    `[A-Za-z0-9._:/@+-]`, and every finding path a plain repository-relative path among the exported
    files. Any problem refuses the whole file, exit 2.
  - The digest is recomputed from the current source. A match is reported under the truth rules: exit
    1 with findings on changed lines, otherwise 4. A mismatch is source drift (exit 3) when the
    repository recorded exporting that task from a different source, and a different task (exit 2)
    otherwise.
  - The repository can write that record, so it can only move a result between 2 and 3. Both are
    non-pass, and neither accepts findings. A record that isn't well formed is ignored.
- **Known limit:** the payload is redacted with the current environment's secret values before
  hashing. If a selected secret appears on a changed line and the export and ingest shells have
  different environments, ingest exits 2.
- **Reports** carry `advisory: true`, `satisfies_human_r1: false`, independence
  `ASSERTED_UNVERIFIED`, and `delegated: { task_sha256, model_identity: "asserted_unverified",
  network: "none" }`.

## AI review in pull requests (E10f, approved as optional 2026-11-13)

No model runs in PRs today. The collect job runs PR code. In this repository it even builds Ascout
from the PR. So **a model credential must never be present in the collect job**. Anything the
collect job produced would also be forgeable, so it can't be trusted.

If built, PR model review would be a separate job with all of these properties:

- **Default-branch code only.** It runs on `workflow_run`, like the publish job.
- **PR code as data.** It checks out `workflow_run.head_sha` as data and never installs or runs it.
  Before sending, it confirms that commit is still the PR head, and otherwise reports the run as
  stale, as publish does.
- **Trusted PRs only.** It runs only where the publisher would trust the evidence: a same-repository
  PR from an allowlisted maintainer.
- **No write token next to the model key.** The job's token has `contents: read` only. The model key
  and `checks: write` or `pull-requests: write` are never in the same job.
- **Validated hand-off.** The job uploads its findings as an artifact. The publish job downloads it
  and validates it under the same strict rules as an ingested findings file. Nothing else reads it.
- **Remote rules apply.** The repository allowlist and the confirmation are replaced by the
  workflow's own trust check, which only maintainers can change on the default branch.

Two warnings for that design:

- **Secrets and forks.** "Fork PRs get no secrets" is not always true. Private repositories can send
  secrets to fork workflows, and Dependabot PRs get Dependabot secrets. The trust check, not that
  GitHub default, is what protects the key.
- **Bundle schema.** AI findings would need their own check id (`ai-review`) in the bundle, so a team
  policy can treat them as optional and the deterministic `review` result stays separate. That is a
  schema change.

## Truth rules (all providers)

These rules are invariants, and each one needs a test.

1. AI review exits only with 1 (at least one finding on a changed line), 4, 2 (invalid config), or 3
   (source drift). It never exits 0.
2. AI output never clears, downgrades, or overrides a deterministic finding, a test result, or a
   security result.
3. Findings off the changed lines are reported as rejected and never counted.
4. Every AI result carries `advisory: true` and `satisfies_human_r1: false`, and names the model and
   its independence. For delegated results, that identity is asserted and unverified.
5. No connection leaves loopback unless the run's egress decision is `REMOTE`, which requires both
   keys and a clean payload scan.
6. Credentials never appear in any output, file, or error, including when a model echoes them back.
7. No model runs in the privileged publish job, or in any job that runs PR code with a model
   credential present.

## Security regression tests (required with each packet)

- **Network sentinel:** with no provider, with a loopback provider, or with a remote provider missing
  either key, no connection leaves loopback.
- **Environment cannot supply keys:**
  - `ASCOUT_CONFIG_HOME`, `XDG_CONFIG_HOME`, `APPDATA` or `HOME` pointing at a config the repository
    wrote is ignored, because the path comes from the account;
  - a nested repository or a case variant of a listed path is not on the list;
  - so is a config owned by another user or writable by others;
  - so is a repository not on the `repositories` list;
  - with no terminal, remote egress is refused.
- **Proxy variables:** `HTTP_PROXY`, `HTTPS_PROXY` and `NODE_USE_ENV_PROXY`, and proxy settings in
  `NODE_OPTIONS`, have no effect.
- **Endpoint tricks:** each of these is refused:
  - `localhost`, `127.0.0.2`, IPv4-mapped IPv6, and userinfo;
  - a redirect to another host, and an `http` remote endpoint;
  - a trailing dot, punycode, and a port mismatch;
  - a host that resolves to a private, loopback, or link-local address.
- **Payload safety:**
  - a `.env` file, a key file, or an untracked file is never sent;
  - a Gitleaks hit in the payload refuses the send;
  - a `gitleaks:allow` marker or a repository `.gitleaksignore` cannot suppress that hit;
  - a missing Gitleaks refuses remote.
- **Credential leaks:** the key value appears nowhere in stdout, stderr, the report, the receipt, the
  `.ascout/runs/` artifacts, or the PR bundle. This holds even when the server echoes the key, in an
  error or in a successful finding.
- **Truth:**
  - a reply of `{"findings": []}`, prose saying "the code is safe", or a malformed reply each exit 4;
  - a finding off the changed lines is rejected;
  - `--local-model` with no changes exits 4.
- **Delegation:**
  - a changed fingerprint exits 3;
  - a digest for a different task exits 2, and a digest written in the file is never trusted;
  - each of these is refused: an oversized file, more than 200 findings, extra keys, `..` paths,
    absolute or drive paths, and paths outside the export;
  - an export or findings path inside the repository is refused;
  - the export file is owner-only.
- **MCP:** no tool can reach a provider.

## Packets

| Packet | Content | Gate |
|---|---|---|
| E10a | Provider interface; Ollama behind it; E6 hardening (config location, no proxy, no untracked files, built-in excludes, reply redaction) | Standard engineering loop |
| E10b | `openai-compatible` provider, loopback only | Standard engineering loop |
| E10c | Remote providers: two keys, payload scan, `--dry-run` | **Founder decision** first |
| E10d | Delegated review: `--export-task` and `--ingest` | **Founder decision** first |
| E10f | AI review in PRs as a separate trusted job, with an `ai-review` check id | **Founder decision** first |
| E10e | Docs: README "Bring your own AI", what loopback does and doesn't guarantee, cost honesty, CI guidance | With each packet |

## Founder decisions (2026-11-13)

1. **E10c remote providers: approved for implementation.** Disabled by default, with per-repository
   configuration, per-run human confirmation, payload secret scanning, strict destination checks,
   and operator-owned credentials. Ascout never pays for inference or sends source silently, and all
   AI findings stay advisory.
2. **E10d delegated review: approved,** with no network transmission. Delegated AI review never
   counts as human review.
3. **E10f AI review in PRs: approved as optional,** disabled by default. Provider credentials never
   reach untrusted PR code, and AI review never overrides deterministic verification or turns an
   incomplete receipt into a pass.

## Engineering defaults (reversible)

- Config version 2 uses `operator_authorized`: the person who owns the machine authorizes, not the
  Ascout founder. Version 1 keeps `authorized_by_founder` and keeps working.
- The first remote API shape is OpenAI-compatible only, because one adapter covers many providers.

## Review record

- **Revision 1:** independent AI review (subagent). Verdict: not ready, with no critical issues and 3
  high, 5 medium and 3 low findings. Revision 2 addresses all of them:
  - **High:**
    - PR integration claimed that AI ran in PRs today; it doesn't.
    - Both keys could come from the repository or the environment.
    - Redaction was overstated, and untracked `.env` files were sent.
  - **Medium:**
    - "Loopback" was not the same as "stays on the machine".
    - Proxy variables were honored.
    - The design conflicted with E6B in three ways, not one.
    - Delegated identity and replay were not addressed.
    - Credentials echoed in successful replies were not redacted.
  - **Low:** the exit codes, the fork-secret claim, and the host-matching tests.
- **Revision 2:** re-check by the same reviewer. Of the 13 findings, 11 were resolved and 2 partly
  resolved. It raised 1 high, 3 medium and 3 low new issues. Revision 3 addresses all of them:
  - **High:** `XDG_CONFIG_HOME` and `APPDATA` still chose the config location. The path now comes
    from the operating-system account.
  - **Medium:**
    - The typed confirmation over-promised. It now reads from the controlling terminal, and its
      limits are stated.
    - The repository could suppress the Gitleaks scan. The scan now runs on a fixed-config copy, and
      it is called best effort.
    - A digest mismatch was reported as drift. It is now an error, with the digest recomputed.
    - E10f was missing the head binding, the token split, and the hand-off.
  - **Low:** exact repository matching, the findings path outside the repository, refusing more than
    200 findings, and an owner-only export.
- **Not yet verified:**
  - whether Node 24's built-in `fetch` honors proxy variables by default;
  - whether specific local servers serve cloud-backed models.

  E10a's tests settle the first; the docs handle the second.

No human has reviewed this design. It is not human R1.

## Rollback

Each packet is self-contained. Removing a provider leaves review in its default not-run state, exit
4, which is always safe.
