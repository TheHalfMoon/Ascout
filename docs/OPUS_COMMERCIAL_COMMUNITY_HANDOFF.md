# Engineering handoff: Ascout community-first, customer-run verification platform

**Founder direction (2026-11-10):** Keep **Ascout Core free, open source, and community-driven**. Build a viable paid **Teams / Business / Enterprise** offer around customer-run AI and customer-run verification. Keep **CLI + MCP + GitHub integration** as the main interfaces. **No desktop application is needed now.** Ensure all active product branding is Ascout, while retaining genuine third-party legal and technical attribution.

This document is an implementation directive and product-design input. It does **not** authorize public npm publishing, release tags, paid services, payment-provider onboarding, production deployment, loosening security gates, or changing existing source licenses. Existing founder-controlled decisions, including FD-4 and FD-8, remain open unless separately resolved.

## Baseline

- Released: [Ascout v0.2.0](https://github.com/TheHalfMoon/Ascout/releases/tag/v0.2.0), at `0741873cd27f7fbdcce09f3b53f79aeb60170367`.
- At drafting, post-release main was `87e842af849f9f2f01528ffdf2564ce69bc1cd6e`.
- v0.2.0 is a GitHub Release tarball, **not** an npm registry package. It has CLI + four read-only MCP tools; local Ollama review is optional, advisory and CLI-only. It is limited to T0 trusted-local.
- Current GitHub PR bot / auto review / paid org platform: **not implemented**.
- Preserve all current output and error truth semantics: exit 0 success of applicable work, 1 findings, 2 error, 3 drift, 4 incomplete. A non-assurance plan is not a passing test.

## Product work order

**P0. Branding and truth.** Read [Community and product commitments](COMMUNITY_AND_PRODUCT.md) and [brand identity](BRAND_IDENTITY.md). Audit active user-facing strings, metadata and artefacts. Replace upstream-as-product labels with Ascout; preserve real donor/third-party notices and all required citations. Add tested identity regression guard. Fix stale docs without rewriting versioned historic evidence.

**P1. Customer-run GitHub workflow.** Design and implement an installable GitHub Action or reusable workflow in the customer's repository. It calls the exact supported Ascout CLI on the customer's runner and reports scoped, truthful summaries/check statuses. Start with GitHub API read-only integration and bounded permissions; publishing PR comments/check runs requires narrowly scoped permissions and careful untrusted-PR handling. Never execute untrusted fork PR scripts with writable tokens, privileged workflow contexts, or accessible secrets.

**P2. BYOAI integration, separated from verification truth.** Provide opt-in provider adapters using customer-owned local models or properly authorized customer-owned API credentials. Keep credentials outside repository receipt content. Distinguish advisory model suggestions from deterministic tests, and prevent model output from inventing verification evidence. No hosted inference bill to the Ascout maintainer. Do not assume a personal AI subscription grants API access.

**P3. Extended MCP with consent.** Today MCP is limited to four read-only tools. Evaluate gated verification tools only with explicit user-run approval, command authorization, scoped workspace, and correct T0 warnings; preserve the existing MCP security contract unless an explicit approved revision authorizes change. Do not expose arbitrary shell code over MCP.

**P4. Team control plane (commercial design and implementation).** Maintain a viable free Core. Implement separately scoped, license-reviewed organizational value: central policy distribution, team roles, per-repo merge criteria, auditable exceptions, verifiable check-run receipts, cross-repository metadata views, retention/export, and optional customer-hosted service. Offer paid Teams/Business/Enterprise as **future** plans, not as current entitlements. Commercial new components must be explicitly identified and cannot retroactively revoke rights to Apache-2.0 Core.

**P5. Enterprise qualification.** Evaluate SSO/SAML/SCIM, audit guarantees, support/SLA terms, customer-hosted installation/upgrade/backup, and compliance claims only when tested and commercially reviewed. Verify the cost and operating model without creating a paid account or service.

## Acceptance and implementation discipline

- Check current main, PRs, issues and existing roadmap before beginning each task; prevent duplicate work.
- Branch for bounded work packages; produce code, negative tests, independent security/correctness review, exact-head cross-platform CI and post-merge verification.
- Include concrete evidence of real PR review/report flows, not only mocks; real model outputs remain advisory and must never masquerade as coverage, proof or mandatory human approval.
- Maintain community contribution quality, transparent known limitations, reproducible receipt behavior and the Apache-licensed Core.
- Publish a grounded capability matrix: **shipping / implemented but not shipped / proposed / blocked**.
- Stop at actual external approval gates, not routine engineering work. Any commercial billing or version release needs separate founder approval.
- Do not run hosted model inference, purchase services, deploy production, or use actual customer data without authorization.

**Target positioning:** *Ascout — Verify everything AI ships. Free, Open Source, Community-Driven Core. Customer-owned AI and compute. Paid organizational control and support when delivered.*
