# E6 Part Two (Provider-Independent): Review Provider Decision

**Status:** packet specification for the zero-cost part of E6's review half. It adds a decision
that any future review provider must pass. `ascout review` is unchanged: it still reports that no
review engine ran. No provider is contacted, and no source leaves the machine.

## Why review stays NOT_RUN

The founder has not authorized paid or hosted inference (2026-11-08). A survey of this machine on
that date found:

| Tool | State |
|---|---|
| `opencode` v2.2.5 and the pinned `ocr` CLI | Installed. Both need a model provider to review anything |
| Local model servers (Ollama on 11434, LM Studio on 1234, llama.cpp on 8080) | None responding on loopback |
| PStack | Not installed as a command |
| Codex | Installed, but excluded by founder instruction |

So no provider can review offline and for free here. Review stays NOT_RUN until an authorized,
qualified provider exists.

## The decision

`decideReviewProviderV1(candidate, policy)` returns `NOT_RUN`, `BLOCKED`, or `RUNNABLE_ADVISORY`.

| Situation | State | Reason codes |
|---|---|---|
| No provider configured | `NOT_RUN` | `NO_PROVIDER_CONFIGURED` |
| Description invalid or self-contradictory | `BLOCKED` | `INVALID_PROVIDER_DESCRIPTION` |
| Not authorized by the founder (anything but a literal `true`) | `BLOCKED` | `PROVIDER_NOT_AUTHORIZED` |
| Costs money while paid inference is not authorized | `BLOCKED` | `PAID_PROVIDER_NOT_AUTHORIZED` |
| Runs off this machine, or sends beyond loopback, while source egress is not authorized | `BLOCKED` | `SOURCE_EGRESS_NOT_AUTHORIZED` |
| Needs a credential | `BLOCKED` | `CREDENTIAL_REQUIRED` |
| Authorized, free, local, a different model family | `RUNNABLE_ADVISORY` | `ADVISORY_ONLY` |
| Same, but the author's own model family | `RUNNABLE_ADVISORY` | `ADVISORY_SAME_MODEL_FAMILY` |

Every applicable refusal is listed, so the caller sees everything that would need authorizing.
`currentReviewProviderPolicyV1` fixes `allow_paid` and `allow_source_egress` to `false`. Changing
either needs a founder decision, not a code change alone.

## What a review can never claim

- **Never human R1.** `satisfies_human_r1` is always `false`.
- **Independence needs a different model family.** The existing independence policy accepts a
  different context digest alone, so the same model reviewing its own change in a fresh session
  counts as independent there. This decision reports `SAME_MODEL_FAMILY` in that case. The
  existing policy is unchanged.
- **Runnable is advisory.** Even a runnable provider's output is advice, not a review gate.

## Scope

| File | Change |
|---|---|
| `src/assurance/review/review-provider-decision.ts` | New: the decision and today's policy |
| `tests/assurance-review-provider-decision.test.ts` | New: every row above |

## Known limits

- **Not wired yet.** Nothing calls the decision. The packet that adds a provider must call it
  before contacting the provider, and report its reason codes.
- **Authorization is a field.** `authorized_by_founder` is only as trustworthy as where it comes
  from. The wiring packet must read it from founder-controlled configuration, never from the
  repository under review.

## Rollback

Revert the commit. Nothing depends on the module.
