# Ascout branding audit: 2026-11-10

This audit follows `docs/BRAND_IDENTITY.md` against `main` at `0864b3e`. Its question: does any
active, user-facing surface present another product's name as Ascout's identity? The method was
to observe real output, not just search text.

## Method

1. Searched the tracked tree for inherited and related names: Artemis, Sentrdel, Kodac, OpenCode,
   open-code-review, Graft, Pulse, Skelet, MedScale, Ottari, and AI vendor names.
2. Found which compiled modules `dist/cli.js` actually loads (68 modules), and which of those carry
   such names.
3. Captured the real output of every CLI command, in both terminal and JSON form, inside and
   outside a repository, plus usage and error paths and the MCP server's `initialize`, `tools/list`,
   and tool calls (18,631 bytes), then searched that output.
4. Read package metadata, workflow names, and the README introduction.

## Findings

| Surface | Result |
|---|---|
| CLI usage, help, and errors | Ascout only. Every usage line starts with `ascout`. |
| CLI reports, terminal and JSON | Ascout only, apart from three engine identifiers, classified below |
| MCP `serverInfo`, tool names, and descriptions | `ascout`, `ascout_*`. No other product name. |
| Package metadata | Name `@thehalfmoon/ascout`, bin `ascout`. `keywords`, `homepage`, `repository`, and `bugs` were **missing and are now added**. |
| Workflow names | Project CI, Real Engines, Self Verification, Release Candidate. These are neutral, with no other product name. |
| README introduction | `# Ascout`, "Verify everything AI ships." |
| Shipped tarball | Contains only `dist`, README, LICENSE, and package.json. `vendor/` and `docs/` are not shipped. |
| Web interface, installer, GitHub PR comments or check runs | None exist yet. The future GitHub integration must keep this guard. |

### Names that do appear, and why they stay

| Where | Text | Class | Decision |
|---|---|---|---|
| `ascout review --format json` | `engine_id: "engine:review-opencode-review"`, `binary_name: "open-code-review"` | Tool reference and compatibility identifier. It names Alibaba's open-code-review as the review engine that **did not run**. | Keep. It's accurate, and it's part of the report schema. |
| `ascout security` (terminal and JSON) | `engine:sentrdel … (not executed)` | Tool reference. It names the separate Sentrdel scanner as not executed. | Keep. It's accurate. |
| `src/assurance/engines/mobile-artemis/*` | `engine:mobile-artemis`, `vendor/google-artemis` | Third-party engine reference and provenance pin, Google's Artemis | Keep. It isn't printed by any shipped command. |
| `src/assurance/security/sentrdel-*` | `crates/sentrdel-*` source paths | Source citations for a separate engine | Keep. They are provenance. |
| `src/assurance/workflow/kodac-*` | Kodac characterization fixtures | Historical evidence | Keep. |
| `vendor/`, `specs/`, `docs/` history, `THIRD_PARTY_NOTICES.md`, `LICENSE` | Upstream names and authors | Legal attribution and history | Keep. These are not active surfaces. |

**No active surface presents another product as Ascout.** Nothing needed renaming, and no
compatibility identifier, receipt field, config path, or MCP tool name changed.

## Regression guard

`tests/brand-identity.test.ts` compiles the CLI and runs every command, in and out of a repository,
plus MCP `initialize`, `tools/list`, and tool calls. It fails if any other product name appears in
real output, except a short, documented allowance of exact engine identifiers. Each allowance entry
has a written reason. It also checks that usage lines, the MCP `serverInfo`, package metadata, and
the README introduction present Ascout. A self-test proves the guard flags a foreign name and passes
only the allowed identifiers. It runs on every PR, on all six CI lanes.

When the GitHub integration adds PR comments and check runs, their text must be added to this guard.
