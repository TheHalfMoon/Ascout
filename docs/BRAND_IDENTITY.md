# Ascout identity and source attribution policy

## Single active product identity

**Product:** Ascout  
**Tagline:** Verify everything AI ships.  
**Community position:** Free • Open Source • Community-Driven  
**Repository:** `TheHalfMoon/Ascout`  
**CLI executable:** `ascout`  
**Source package:** `@thehalfmoon/ascout` (the current package identity; **not published to npm**).

There must be no upstream project's name displayed as an alternative **product identity** in active Ascout user-facing experiences. Active reports, CLI usage, MCP metadata, help text, future PR comments, GitHub Action names, docs introductions, installer names, release notes, logos, badges, templates, errors, and future commercial UI must clearly identify the product as **Ascout**.

### What must NOT be erased or falsely renamed

A rename of *product branding* does **not** authorize falsifying authorship, renaming third-party libraries, or hiding licenses and provenance.

Keep accurate names in:
- `LICENSE`, `THIRD_PARTY_NOTICES.md`, copyright and SPDX headers, original license texts, and required NOTICE files.
- Historical commits, evidence, benchmarks, source-admission records, vulnerability references, and third-party attributions.
- Accurate names of integrations/tools such as Git, npm, Gitleaks, Jest, Vitest, Playwright, Ollama, and supported providers.
- APIs, package imports, protocols, or compatibility identifiers where incorrect renaming would break functionality, versioning, storage, migrations, or user trust.
- Open-source contributors' genuine attribution, without suggesting they endorsed Ascout.

If a copied source's original name appears as an *active product label*, replace that label with Ascout. If it appears in a *legal attribution or real dependency*, retain it as a properly scoped reference.

## Required repository-wide audit for the implementing engineer

Inspect the entire tracked tree, including documentation, package files, CLI, MCP, schemas, tests, snapshots, templates, generated assets, workflow names, and metadata:

1. Inventory every product or donor identity and classify **active product UI**, **compatibility surface**, **tool/provider reference**, **historical evidence**, or **legally required attribution**.
2. Fix misbranded active product surfaces with small, reviewable PRs. Do not use one sweeping blind string replacement.
3. Re-run baseline builds, tests, exact-head CI, and supported install/run/uninstall and MCP journeys.
4. Add a narrow brand-regression test for **active surfaces** with a documented allowance mechanism; do not scan legal/provenance files as though proper attribution were a bug.
5. Where identifiers are persisted or externally consumed, provide tested compatibility and migrations. Do not silently break existing receipts, CLI paths, MCP tool IDs, config paths, or release assets.
6. Preserve source provenance and clearly distinguish Ascout-owned modifications from upstream work.
7. Verify the public README, current release instructions, and repository metadata agree on `v0.2.0` and on what is or is not actually released.

**Passing a text grep is not proof of branding completion.** Compare observed CLI and MCP output, package metadata, real artifacts, screenshots (if any UI is implemented), and historical/legal exceptions.

**This document instructs an audit; it does not claim the full audit has been completed.**
