# Ascout: community and product commitments

**Identity:** Ascout — **Free, Open Source, Community-Driven**.  
**Promise:** *Verify everything AI ships. Know exactly what passed, failed, and was never checked.*

This document distinguishes current product facts from planned business capabilities. Ascout v0.2.0 is a released **local CLI** with a limited read-only **stdio MCP** interface; it does not yet have a commercial team service or GitHub PR bot.

## Open-source commitment

- **Ascout Core is free and Apache-2.0 licensed.** Anyone, including companies, can run, study, modify, fork, and distribute the Apache-licensed core in accordance with its license.
- The project's core should remain useful without an Ascout account, payments, compulsory telemetry, a hosted reviewer, or a vendor-controlled license check.
- The current command and receipt semantics must remain truthful: skipped or unavailable checks are not passes; source drift, findings, errors, and incomplete assurance remain distinguishable.
- Community members may propose changes and submit tests, bug fixes, docs, translations, benchmark cases, and security improvements through GitHub PRs and issues. Independent review and maintainers' repository governance remain in place. **Community-driven does not mean that a formal community council or vote currently exists.**
- Keep security reports private through GitHub's [private vulnerability reporting](https://github.com/TheHalfMoon/Ascout/security/advisories/new) rather than disclosing active vulnerabilities in issues.

## Product surfaces

| Surface | Current status (v0.2.0) | Direction |
| --- | --- | --- |
| Local CLI | Released via GitHub Release tarball | Preserve as the reference execution and evidence surface |
| Local MCP | Released; four read-only stdio tools | Extend only through explicit trust, consent, and authority review |
| AI review | Local Ollama advisory review is opt-in through CLI | Support customer-authorized AI runtimes and APIs behind explicit privacy controls |
| CI / GitHub | No complete released PR-review bot or GitHub Action offering yet | Customer-run verification, scoped PR comments/checks, reusable actions |
| Desktop GUI | Not released | Not a priority; CLI, MCP, and CI are the primary interfaces |
| Team/Enterprise | Not released | Optional commercial organizational capabilities, separate from Core |

Ascout does **not** provide an untrusted-code sandbox today. The current **T0 trusted-local** execution boundary remains in effect. Users must not run third-party repository commands as though they were isolated. Containment beyond T0 remains subject to existing security and decision gates, including FD-4.

## Business model: customer-owned AI and compute

**Free for people and open-source projects.** The open-source core remains available with no Ascout per-run fee or artificial per-repository limit. Open-source maintainers must not be forced into paid organizational services to use the core CLI or MCP.

**Paid value for organizations, once built:** centrally managed organization policy and exceptions, audited verification gates across multiple private repositories, role-based access, SSO/SAML/SCIM where justified, organization-wide analytics, evidence retention/export controls, customer-hosted commercial integration, priority support, and service-level agreements.

This is an **open-core / commercial add-on proposal**. Pricing, billing, license terms for new commercial-only components, entitlements, and deployment architecture are **not approved or implemented**. The Apache-2.0 license for existing Ascout Core is not retroactively restricted. Organizations may lawfully use the existing core without payment; they pay only if they choose separately offered value or support.

**Bring Your Own AI (BYOAI):** preferred design is that customers select and pay for any model inference they choose, and run the verifier on their own machine, CI runner, or approved infrastructure. Do not upload source, prompts, private review artifacts, secrets, or receipts to Ascout-controlled services by default. Do not silently install hosted inference or create paid provider accounts. A consumer AI subscription is not automatically an API credential or permission to automate that provider.

**Cost honesty:** customer-owned tokens and runners can keep Ascout's inference/compute costs near zero, but commercial distribution still entails potential payment processing, support, development, signing, and infrastructure expenses. Do not advertise a literal guaranteed zero operating cost.

## What would make a paid offer worth purchasing?

**Not paid AI tokens.** Customers should purchase coordinated verification control, support, and trusted organizational evidence:

1. **Customer-run PR checks:** connect permitted GitHub repos, publish truthful check runs and optional review annotations; preserve direct access to evidence.
2. **Organization policy:** centrally manage which verification is required and who can approve exceptions, including immutable approval receipts.
3. **Cross-repository views:** explain incomplete checks, repeated failures, review load, and policy coverage without copying private source into an Ascout cloud.
4. **Audit and compliance evidence:** versioned, exportable evidence with traceable source, model, rule, and tool provenance and retention controls.
5. **Enterprise deployment and support:** customer-hosted management plane, identity integration, contractual support and SLAs as separately contracted services.

These are **targets**, not claims that any of these features exist in v0.2.0. A GitHub Check Run must never be green if required checks were skipped, refused, unavailable, or timed out.

## Design and release principles

- Maintain **CLI + MCP + CI integration** as the principal product interfaces. Do not add a desktop release as a prerequisite.
- Prefer existing customer-owned runners and self-hosted components; investigate who pays for CI minutes and token use per integration.
- Separate open-source verification data and runtime from optional commercial organization orchestration; document any data flows clearly.
- Never weaken fail-closed safety, source binding, per-invocation command admission, or T0 disclaimers to make a product demo easier.
- Mark unimplemented and platform-unqualified features as such. Versioned public releases and new distribution channels require separate qualified release authorization.
- Use [CONTRIBUTING.md](../CONTRIBUTING.md) for changes and [BRAND_IDENTITY.md](BRAND_IDENTITY.md) for product naming and legally required upstream attribution.
