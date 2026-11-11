# Paid offering design: Teams, Business, Enterprise (proposal)

**Status:** a design proposal for the founder, revision 2. **Nothing in it is built, priced,
approved, offered, or advertised.**

- No billing is active, no payment processor is chosen, no contract exists, and no commercial license
  terms are published. Each of those needs a separate founder decision, and legal review where noted.
- Every commitment below, including what stays free, is *proposed* until the founder approves it.
- This document must not be quoted as a product description. Public copy may describe only what
  ships.
- No human has reviewed it.

Inputs: `docs/COMMUNITY_AND_PRODUCT.md` (principles and targets),
`docs/COMPETITOR_RESEARCH_2026-11-11.md` (market), `docs/GITHUB_INTEGRATION.md` (what exists), and
`specs/017-unified-assurance/E10_BYOAI_PROVIDER_DESIGN.md` (AI).

## Proposed principles

1. **The core stays free and Apache-2.0.** Everything Ascout ships today stays free for everyone,
   companies included. Payment buys separately offered value or support, never permission to use the
   core. No paid feature may be carved out of what is already free.
2. **Ascout pays for no inference and resells none.** Paid tiers never include model tokens. Teams
   bring their own AI (E10).
3. **Ascout never needs a customer's source.** No paid feature uploads source, diffs, prompts, or
   receipts to anything Ascout runs. Where a paid feature needs a server or a secret, the customer
   holds it.
4. **The truth rules are the same everywhere.** The free core and every paid tier have the same exit
   codes:
   - incomplete is never a pass;
   - a model never makes anything pass;
   - untrusted evidence is capped.

   No tier can buy a looser gate.
5. **Nothing is sold before it exists.** Each capability below lists what must be true before it may
   be offered or advertised.

## What stays free (proposed commitment)

Free means no account, no telemetry, and no cloud, for any user, including commercial organizations.

| Surface | Where it is today |
|---|---|
| CLI: `init`, `doctor`, `check`, `review`, `test`, `security` (Gitleaks) | v0.2.0 |
| Local-model review, Ollama on loopback | v0.2.0 |
| Local-model review, OpenAI-compatible servers on loopback (#724) | `main` only |
| Read-only MCP server (`ascout mcp`) | v0.2.0 |
| Customer-run GitHub PR integration: `pr-evidence`, `pr-publish`, both workflows (#716–#718) | `main` only |
| Per-repository team policy (#719) | `main` only |
| Product identity guard (#715, #720) | `main` only |
| Release build-provenance attestations | v0.2.0 |

**Where the free line sits.** Improvements to how a single repository is verified stay free: new
engines, providers, checks, and the E10 packets if the founder approves them. **New capabilities that
coordinate many repositories or an organization** (C2–C4 below) are the candidates for paid
offerings. The free per-repository features never lose function to make room for them. The founder
decides whether this line is right (decision 2).

## What organizations would pay for

Competitors charge for inference and hosting: `$24–$200` per developer per month, or `$1–$10` per
review on credit pricing (see the research). Ascout has neither cost, so a paid offer can only stand
on organizational control, evidence, and assurance. The candidates, none of them built:

| # | Capability | Why an organization pays | Who runs it | Hard prerequisites before offering |
|---|---|---|---|---|
| C1 | **A customer-registered GitHub App for the Ascout check** | Today Ascout publishes with the GitHub Actions token, and a PR's own workflow can post a check of the same name through the same app. GitHub rulesets can require a check from a specific app (`integration_id`), and any other source then fails the rule. A dedicated App, whose private key PR workflows can't reach, closes this known gating weakness. | The customer registers the App from a manifest Ascout provides. The default-branch publish job mints an installation token from the App key, stored, for example, in an environment limited to the default branch. No webhook server is needed. | A design spec. Proof that a same-repository PR workflow cannot read the key, and that a forged check from another source fails the pinned rule. A security review.<br>Design: `specs/017-unified-assurance/C1_GITHUB_APP_GATE_DESIGN.md`. Use one App per trust boundary, because a shared key lets any repository admin forge the check everywhere. On private repositories it needs a paid GitHub plan, and merge queue is unsupported in v1. |
| C2 | **Organization policy distribution:** one policy for many repositories, version-pinned, with signed exceptions | Large organizations need one rule set across hundreds of repositories, plus an audit trail of who waived what | Customer: a policy repository plus the publisher reading it | A policy schema extension, signed-exception design, and tests showing an exception can never excuse a finding |
| C3 | **A verifiable merge-evidence archive:** each merge's evidence bundle and receipt, signed, retained, and exportable | Auditors and regulated teams need proof of what was verified at merge time | Customer storage (an artifact store or object bucket they own) | A signing design (keys stay with the customer), retention controls, and a verifier tool |
| C4 | **A cross-repository view:** incomplete checks, repeated failures, policy coverage | Engineering leads want to see where verification isn't happening | Customer-hosted, reading only the evidence metadata from C3, never source | C3 first, and a privacy review of exactly which fields leave each repository |
| C5 | **Support and response commitments:** a named contact, response targets, and help with upgrades | Procurement often requires a support contract | Ascout (people, not infrastructure) | Founder decisions on capacity; legal review of service-level and warranty terms |
| C6 | **Enterprise qualification:** SSO/SCIM for C4, security questionnaires, deployment guides | Enterprise procurement gates | Customer-hosted components | Only when there are real C1–C4 deployments to qualify; no compliance claim without an audit |

Out of scope for all tiers: hosted inference, a hosted review service, a desktop app, and any feature
that needs Ascout to hold customer source, keys, or write tokens.

## Tier sketch (capabilities only; no prices)

| | **Teams** | **Business** | **Enterprise** |
|---|---|---|---|
| **Free core** (everything above) | Yes | Yes | Yes |
| **C1, customer-registered GitHub App** | Yes (or free; decision 3) | Yes | Yes |
| **C2, organization policy, signed exceptions** | One organization | Many repositories | Multiple organizations, delegated policy owners |
| **C3, evidence archive** | None | Yes | Yes, plus custom retention |
| **C4, cross-repository view** | None | Yes | Yes |
| **C5, support** | A direct contact, best-effort response | Business-hours response targets | Contractual response targets |
| **C6, enterprise qualification** | None | None | Yes |

Rationale:
- **Every exception is signed, in every tier.** An unsigned waiver is an audit trail nobody can
  check, and `COMMUNITY_AND_PRODUCT.md` targets immutable approval receipts.
- **Teams versus Business.** They differ on scale and evidence, not on trust.
- **Teams support** is a direct contact, which free users don't get. Public issues stay open to
  everyone.
- **C1 placement is open.** C1 fixes a gating weakness, so there is a case for putting it in the free
  core instead (decision 3).

## Pricing model options (for the founder; no numbers proposed)

- **Per organization, flat by tier.** Simple, and nothing grows with AI-agent PR volume. The
  research shows usage surprises are the most common complaint about competitors.
- **Per active committer.** Familiar to buyers, but it has to stay clear that the free core has no
  seat limit.
- **Support-only contracts first.** C5 can start before any software is built. It earns revenue
  without selling anything unbuilt.

Whatever is chosen, the price can't be metered on inference or on reviews, because Ascout incurs
neither cost.

## Licensing boundary (founder and legal decision)

New commercial components (C1's manifest and tooling, C2–C4) would live in separate packages or
repositories, so the core's Apache-2.0 license is never touched. Three options, each needing legal
review before anything is published:
1. Proprietary components under a commercial license.
2. Source-available components, under a license that permits non-production use.
3. Open source under Apache-2.0. What's sold is support, signed and qualified builds, and response
   commitments, not the software itself, which anyone could redistribute.

No option is recommended here.

## Risks

- **Liability and warranty.** Apache-2.0 software is provided "as is". Paid support or service-level
  terms would add obligations that need legal review before any contract.
- **Names.** The founder should confirm the right to use "Ascout" in commerce, and whether "Teams /
  Business / Enterprise" are the right tier names.
- **Maintenance load.** Paid components need owners and security response. The founder decides who
  maintains them before anything is sold.
- **Payments.** Choosing a processor brings tax, export, and data-handling questions. That decision
  is separate and comes last.
- **Free versus paid tension.** If the free line in "What stays free" is drawn badly, the community
  will read paid features as carved out of the core. Decision 2 exists to prevent that.

## Cost honesty

Customer-run components keep Ascout's infrastructure cost near zero, but not at zero. Commercial
distribution still costs:
- payment processing, once chosen;
- support time;
- signing and release infrastructure;
- security reviews;
- legal work.

No public copy may promise "zero cost to operate".

## Sequencing proposal

1. **C1 design** (a spec, like E8/E10). It needs no billing, and it informs decision 3.
2. **C2 design** on top of the team policy (#719).
3. **C5 support pilot**, if the founder wants revenue before software.
4. **C3, then C4,** only after C1 and C2 are in use.
5. **C6** only when an enterprise buyer exists.

Each step runs through the normal engineering loop. Nothing is offered until its prerequisites in the
capability table are met.

## Decisions the founder owns

1. Approve the principles as binding for any paid offer.
2. Approve "What stays free" as a public commitment, and where the free line sits (single repository
   versus organization).
3. Decide whether C1 goes in the free core or in all paid tiers.
4. Choose the pricing model, and when to set numbers.
5. Choose the licensing boundary (option 1, 2, or 3), with legal review.
6. Confirm the names: "Ascout" in commerce, and the tier names.
7. Decide who maintains paid components, and whether to start with a support-only pilot (C5).
8. Choose a payment processor and contract templates. **Separate approval; not before items 1–5.**

## Review record

- **Revision 1:** independent AI review (subagent). It found no high issues, 5 medium, 6 low, and 3
  nits. Revision 2 addresses all of them:
  - **Medium:**
    - "forever" was an unapproved commitment;
    - the free line contradicted C2 and C3;
    - C1 had a webhook receiver on a runner, and its key-reachability gap went unstated;
    - C1 claimed to "own" the check name rather than pin its source;
    - licensing option 3 implied an Ascout-run service.
  - **Low and nits:**
    - the per-review price range;
    - released versus `main`-only items, and the missing identity guard;
    - the principle on truth rules now includes the free core;
    - Teams support added nothing over free;
    - unsigned exceptions;
    - missing risks;
    - three wording fixes.
- **GitHub fact checked for C1:** rulesets and branch protection can require a status check from a
  specific app (`integration_id`), and a status set by another app then fails the rule. Source: GitHub
  docs, "Available rules for rulesets" and "Troubleshooting required status checks". Whether a
  default-branch-only environment fully keeps the key from same-repository PR workflows is for the C1
  design to prove.

No human has reviewed this proposal.
