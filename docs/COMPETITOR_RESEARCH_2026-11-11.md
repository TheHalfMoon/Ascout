# Competitor research: CodeRabbit, cubic, Greptile (2026-11-11)

**Status:** internal research for product planning. It sets no prices, terms, or commitments, and it
claims nothing about Ascout that isn't already built. Everything here was read from public pages on
2026-11-11, and prices and features change often. Facts come from each vendor's own pages unless they
are marked third party; anything marked unverified could not be confirmed. The research was done by AI
agents with web access, and the key claims (all three pricing pages and CodeRabbit's check behavior)
were re-read directly. No human has checked this document.

## At a glance

| | CodeRabbit | cubic | Greptile | Ascout today |
|---|---|---|---|---|
| **What it is** | Hosted AI pull-request reviewer | Hosted AI pull-request reviewer, plus fix agents | Hosted AI reviewer with codebase-wide context | Local verifier and customer-run PR check |
| **Code hosts** | GitHub, GitLab, Bitbucket, Azure DevOps | GitHub only | GitHub, GitLab, Bitbucket, Gitea, Perforce (on-prem) | GitHub (PR integration on `main`, not released) |
| **Where it runs** | Vendor SaaS; self-hosting on Enterprise only, 500-seat minimum | Vendor SaaS only (self-hosting not documented) | Vendor SaaS; self-hosting on Enterprise only | The customer's own machine and runners; Ascout operates no service |
| **Paid pricing** | $24–$72 per developer per month (annual), or $30–$90 (monthly); Enterprise custom | $40, $99, or $200 per developer per month (monthly); 20% off yearly | $1 per credit, no seats; a review costs 1, 3, or 10 credits; Enterprise custom | Free, Apache-2.0; no paid offering exists |
| **Free use** | Public repos free; no free plan for private repos | 20 reviews per month per org (from the docs); public repos free under fair use | 1 developer and 50 credits per month; free for qualifying OSS projects | Everything, for everyone |
| **Who pays for AI** | The vendor, bundled into the price | The vendor, bundled into the price | The vendor, bundled into the credit price | No one by default; the opt-in local model runs on the customer's hardware |
| **Your own model** | Self-hosted Enterprise only | No, for hosted review (the CLI can use a Claude Code or ChatGPT subscription) | Self-hosted Enterprise only (OpenAI-compatible APIs listed) | Yes: a loopback Ollama or OpenAI-compatible server (E10a/E10b) |
| **Code leaves your network** | Yes, on SaaS (sent to OpenAI and/or Anthropic) | Yes (to "multiple providers") | Yes, on SaaS (cached until access is revoked) | No; only loopback is reachable |
| **Trains on your code** | Says it never does | Providers are contractually barred | Anonymized and aggregated by default; admins can opt out | Nothing is collected |
| **Security attestation** | SOC 2 Type II, claimed (seen via search only) | SOC 2 Type I, claimed | SOC 2 Type II, claimed | None; Ascout runs no service to attest |

Ascout's column describes what is on `main` as of 2026-11-11. The PR integration and the local-model
providers are not in a release yet; v0.2.0 does not include them.

## How each one gates a merge

This is the part that matters most for a verification product. A required check is only as honest as
what makes it pass.

- **CodeRabbit:** posts a `CodeRabbit` Check Run (or a commit status) that can be required in
  branch protection. Per its own status-check docs:
  - a **completed review passes, even one that posted findings**;
  - a review that errors also passes, unless `reviews.fail_commit_status` is turned on (it is off by
    default);
  - **skipped and rate-limited reviews count as passing, though no review happened**;
  - only pending, cancelled, or missing checks block a merge;
  - Azure DevOps can't require the check.

  Source: https://docs.coderabbit.ai/pr-reviews/status-check
- **cubic:** posts pass/fail checks when a review completes, plus an auto-fix check. Its docs don't
  say whether findings fail the check or whether it works as a merge gate. **Unverified.** Source:
  docs.cubic.dev (privacy-security, llms-full).
- **Greptile:** a `statusCheck` setting posts a status per review, and its docs describe adding it as
  a required check. Whether it is a Check Run or a commit status, and what makes it fail, are
  **unverified**. Its own docs also disagree on whether the setting is on by default. Source:
  greptile.com/docs (config reference).
- **Ascout (on `main`):**
  - exits 0 only when everything the policy requires completed;
  - findings, an error, or a source change fail the check;
  - work that didn't run is `action_required`, never a pass, and `neutral` is never used;
  - a pass needs a trusted maintainer's same-repository PR, and anything else is published under a
    separate "(untrusted)" check;
  - a team policy can choose which checks must complete, but never excuses a finding.

  See `docs/GITHUB_INTEGRATION.md`.

## Where they run your code, and why it matters

All three review on the vendor's servers with the vendor's tokens. That trust model has failed in
public at least once:

- In January 2025, Kudelski Security reported that a crafted linter config in a pull request ran
  code on CodeRabbit's production servers. It exposed secrets, including the GitHub App private key,
  which reportedly gave write access to about a million repositories.
- CodeRabbit says it fixed the issue by 2025-01-30 by sandboxing its tools.

Sources: https://kudelskisecurity.com/research/how-we-exploited-coderabbit-from-a-simple-pr-to-rce-and-write-access-on-1m-repositories
(third party) and CodeRabbit's response,
https://www.coderabbit.ai/blog/our-response-to-the-january-2025-kudelski-security-vulnerability-disclosure-action-and-continuous-improvement.

This is not a claim that any of these products is unsafe today. It shows the class of risk that a
hosted reviewer carries and a customer-run one avoids. Ascout runs on the customer's own runners:
- the job that runs pull-request code has a read-only token and no secrets;
- the privileged job never runs pull-request code.

## Their strengths, honestly

These products are ahead of Ascout on things customers visibly value:

- **AI review quality and breadth.** They use frontier models, context from the whole codebase
  (Greptile), learning from team feedback, PR summaries, chat, and one-click or agent fixes (cubic,
  Greptile). Ascout's AI review is opt-in, local, advisory, and limited by the model the customer runs.
- **Platforms.** CodeRabbit and Greptile cover GitLab, Bitbucket, and more; Ascout covers GitHub only.
- **Product surface.** They offer IDE extensions, CLIs, MCP servers, dashboards, analytics, and
  Slack/Linear integrations. Ascout is a CLI, a GitHub workflow pair, and a read-only MCP server.
- **Zero setup.** They install as an app in one click. Ascout asks a team to copy two workflows and,
  for AI review, to run a local model.
- **Enterprise paperwork.** They claim SOC 2, SSO, data residency, and self-hosting on top tiers.

Their documented or third-party-reported weaknesses:
- **Noise.** Third parties report that large PRs draw many low-value comments, and one study found
  56% of PR-level comments were rejected (CodeRabbit). Cubic's own blog says early versions produced
  too many false positives.
- **Usage pricing that can surprise.** Per-file overage (CodeRabbit), pooled line limits that pause
  reviews (cubic), and per-review credits that grow with the number of AI-agent PRs (Greptile, which
  moved off per-seat pricing in October 2026, per third parties).
- **Fork PRs.** cubic can't auto-fix fork PRs. CodeRabbit's and Greptile's fork handling is not
  documented.

## What this means for Ascout

**Where Ascout is different, and can say so truthfully:**
1. **The check means what it says.** In every competitor whose behavior is documented, a required check
   can pass when no review happened, or when a review posted findings. Ascout's exit codes make
   "incomplete" a non-pass by construction. This is Ascout's clearest, testable difference.
2. **Customer-run.** No vendor server sees the code or holds a write token, and nothing is uploaded.
3. **No inference bill.** Ascout pays for no tokens and resells none. A team can use a model it already
   runs, on loopback.
4. **Free core.** Apache-2.0, with no account, no telemetry, and no cloud requirement.

**Where Ascout should not compete:**
- **Hosted AI review volume or model quality.** That race needs paid inference, which Ascout has
  ruled out (BYOAI).
- **Breadth of platforms and IDE plugins**, before the core verification story is solid.

**Positioning that follows:** Ascout sits next to an AI reviewer, not in place of one. A team can keep
CodeRabbit, cubic, or Greptile for suggestions and use Ascout as the truthful, customer-run merge gate.
Ascout's check fails on real problems and never passes on missing work.

**Inputs for the paid-offering design** (proposals only; nothing here is approved, priced, or built):
- Competitors charge for inference plus hosting: $24–$200 per developer per month, or about $1 per
  review. Ascout's cost structure has neither, so any paid offer has to sell something else:
  - organization-wide policy distribution and audit;
  - verifiable merge evidence;
  - support;
  - a dedicated GitHub App for a tamper-proof check name.
- Security buyers repeatedly ask for **self-hosting**, and every competitor reserves it for Enterprise
  (CodeRabbit with a 500-seat minimum). Ascout is self-hosted by design at every size, which is worth
  stating, but only as fact.
- Usage limits and surprise overages are the most common complaint in third-party reviews. Ascout has
  no metered cost to pass on.

## Sources

Official pages, read 2026-11-11:
- CodeRabbit:
  - pricing: https://www.coderabbit.ai/pricing
  - status check: https://docs.coderabbit.ai/pr-reviews/status-check
  - FAQ: https://docs.coderabbit.ai/faq.md
  - self-hosting: https://docs.coderabbit.ai/self-hosted/overview.md
  - GitHub permissions: https://docs.coderabbit.ai/platforms/github-com.md
- cubic:
  - pricing: https://www.cubic.dev/pricing
  - docs: https://docs.cubic.dev, including privacy-security, subscription, ai-review-usage,
    coding-agents, cli-review, and cubic-yaml
  - blog: https://cubic.dev/blog/learnings-from-building-ai-agents
- Greptile:
  - pricing: https://www.greptile.com/pricing
  - security: https://www.greptile.com/security
  - docs: https://www.greptile.com/docs, including the self-hosting and config reference pages
  - changelog: https://www.greptile.com/changelog
  - open source: https://www.greptile.com/open-source

Third party (opinions, labeled as such where used):
- Kudelski Security disclosure (above)
- https://groundy.com/articles/coderabbit-review-study-56-rejection-rate-demands-targeted-scoping/
- https://curatorbits.com/reviews/coderabbit/
- https://repowise.dev/blog/comparisons/greptile-pricing
