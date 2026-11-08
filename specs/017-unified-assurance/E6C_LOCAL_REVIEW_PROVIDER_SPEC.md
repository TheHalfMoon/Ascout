# E6 Part Three: Local Review Provider

**Status:** packet specification. The founder authorized a local model for `ascout review` on
2026-11-09: Ollama on this machine, serving a code model of a different family from the author
(Qwen2.5-Coder). This packet adds the provider; the next one wires `ascout review` to it.

## What a local review is, and isn't

- **Advisory only.** The model's findings are untrusted raw observations. They never satisfy
  human R1, and every report says so.
- **Independent only by model family.** A model of another family counts as independent advice,
  per the provider decision in E6B; the same family is reported as `SAME_MODEL_FAMILY`.
- **Nothing leaves the machine.** The provider talks only to loopback.

## Authorization

The founder writes a config file in their own config directory:

| Platform | Path |
|---|---|
| Windows | `%APPDATA%\ascout\review-provider.json` |
| Linux, macOS | `$XDG_CONFIG_HOME/ascout/review-provider.json`, else `~/.config/ascout/review-provider.json` |
| Tests | `$ASCOUT_CONFIG_HOME/review-provider.json` |

```json
{
  "version": 1,
  "provider": "ollama",
  "endpoint": "http://127.0.0.1:11434",
  "model": "qwen2.5-coder:7b",
  "model_family": "qwen",
  "authorized_by_founder": true
}
```

- A config that resolves inside the repository under review is refused: a repository must never
  authorize its own reviewer.
- Exactly these keys; anything else is refused, so no API key or remote setting can be added.
- `authorized_by_founder` must be the boolean `true`.
- The resulting candidate goes through `decideReviewProviderV1` with paid inference and source
  egress both disallowed. Only `RUNNABLE_ADVISORY` runs.

## Transport

- The endpoint must be `http://127.0.0.1:<port>` or `http://[::1]:<port>`. Host names are refused,
  so no DNS answer can send the diff elsewhere.
- Redirects are refused, the whole exchange has a timeout, and the response is size-bounded.
- The request is deterministic (`temperature: 0`, JSON format). The diff goes in its own message,
  fenced as data, and the instructions tell the model never to follow instructions inside it.

## Output

The reply must be `{"findings":[...]}`. Each finding becomes a `RawReviewObservationV1` with
authority `NONE_UNTRUSTED` and producer `MODEL`. Malformed findings are dropped and counted; a
reply that isn't that object yields no observations and is reported as malformed. The existing
pipeline then validates locations, screens for injection, accounts coverage, and correlates.

## Scope

| File | Change |
|---|---|
| `src/assurance/review/local-review-provider.ts` | New: config reader, candidate, loopback client, request builder, parser |
| `tests/local-review-provider.test.ts` | New: config rules, decision, client limits against a fake local server, parser |

## Known limits

- **Wiring.** `ascout review --local-model` calls this; see `E6D_LOCAL_REVIEW_WIRING_SPEC.md`.
- **CI has no model.** Tests use a fake local server; a real-model run is a local qualification.
- **Quality is the model's.** A small local model misses issues and reports false ones. That is why
  its output is advisory.

## Rollback

Revert the commit. Nothing depends on the module yet.
