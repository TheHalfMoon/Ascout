# 21 — TesterArmy e2e and Pstack Adoption Design (Revision 3 Proposal)

**Status: PROPOSED; not executed, admitted, merged, or founder-ratified.**
This supplement augments [11](11_IMPLEMENTATION_MASTER_PLAN.md), [12](12_TASK_REGISTRY.md),
and [13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md), without altering the currently
canonical Ascout constitution, UA-P06 work, CLI authority, or V2 FD-1…FD-8 decisions.

## 1. Founder direction and exact source evidence

The founder explicitly requested inclusion, reuse, modification and rebranding
of `tester-army/e2e` and Pstack. This is donor-use direction, **not** an
unqualified upstream license override or acceptance of a specific implementation.

| Source | Inspected identity | License / embedded rights | Facts verified from source |
|---|---|---|---|
| [TesterArmy e2e](https://github.com/tester-army/e2e) | `9a32bd4d46412847ef4ee62d7e3e1692aa4cebdc` (2026-10-08); `packages/e2e/package.json` version `0.18.0`, `packages/web/package.json` version `0.13.0` | Apache-2.0, upstream `LICENSE` and `NOTICE` (TesterArmy 2026); retain these with any port | TypeScript monorepo; web Playwright and optional mobile engines; fixed assertions and natural-language agent steps; replay cache; opt-out telemetry; no sandbox for test code |
| [Pstack original](https://github.com/cursor/plugins/tree/main/pstack) | `cursor/plugins/pstack` (read on 2026-10-08; exact subtree and file blob SHAs must be captured before port) | MIT, Lauren Tan 2026; keep permission/copyright notice | Engineering skills, playbooks, verification routines; agent host skill, **not** a testing runtime or reviewer verdict |
| [Portable Pstack](https://github.com/reshif/pstack) | `4a07b056091a9ec3957d1dc8a3feef37a60e3134` (2026-09-12) | MIT, Lauren Tan 2026; inspect imported upstream and packaged dependencies at admission | Host adapters for Cursor, Codex, Claude Code and Copilot; `pstack init --dry-run`, `status`, `doctor`; per-file install receipts and host degradation tiers |

**Source handling:** ADAPTER/SELECTIVE_PORT, not a monorepo wholesale copy.
Every imported file needs a licensed-path/embedded-rights audit, exact blob SHA,
reproduced tests and a provenance entry. An upstream name or logo is not adopted
as Ascout branding. Legal attribution and notices remain intact even when code
is renamed under founder permission.

## 2. Product boundary and existing-engine compatibility

- **Keep:** existing `ascout check`, Playwright 1.63.0 / Chromium path
  (E2E-02), Ascout evidence authority and exact-head claim rules.
- **TesterArmy:** optional web E2E provider behind Ascout's single broker and
  test Engine Protocol. First admit deterministic `test/expect` flows with
  *no model calls*. Prove result → coverage → receipt → exit end-to-end.
  AI `agent.act/assert` is separate, disabled by default, conditional on an
  explicitly configured local or user-funded endpoint, with declared egress,
  request consent and `MODEL_UNAVAILABLE` / `NOT_RUN` semantics.
- **Mobile:** retain existing Artemis frozen; explore `@e2e-dev/mobile`
  only after local Android emulator / actual iOS simulator feasibility,
  permissions and resource budgets are proven. No promise that hosted
  Kernel/EAS services or macOS virtualization are free or local.
- **Pstack:** optional agent engineering workflow for bounded planning,
  adversarial review, blast-radius analysis and repeatable verification.
  Pstack suggestions are **never** scanner output, independent review,
  executable-engine evidence, or proof of GitHub CI completion.
  No background scheduler, host agent or model is silently enabled.
- **Authority:** neither source may bypass constitution, Diffcipline, exact
  head, founder gates, human approvals, G30 Git hardening, or the broker.

## 3. Risk controls required before runtime integration

1. **Untrusted code:** TesterArmy `SECURITY.md` states that test/config code,
   service commands, custom tools and replay cache execute with normal OS
   authority, *without sandboxing*. PR-origin tests, configs and cache must
   be rejected in trusted-local mode unless explicitly authorized; use a
   separately qualified containment tier with no secrets or write credentials.
   Never infer Ascout's T1 merely because the donor has input validation.
2. **Navigation:** donor web engine permits arbitrary HTTP(S) navigation;
   it does not offer a global origin allowlist. Ascout must enforce its own
   target/egress policy at the broker boundary, including redirects/popups,
   or block untrusted/remote tests. An agent's prompt cannot grant egress.
3. **Telemetry / services:** donor CLI telemetry is enabled by default.
   Set `E2E_TELEMETRY_DISABLED=1` and verify no outbound traffic on the
   default profile. Kernel/EAS, telemetry, remote model, and hosted reporter
   uploads are disabled until a separately authorized, cost-declared effect.
4. **Replay and evidence:** caches are executable code-trust, not neutral
   findings. No cross-head replay, cache poisoning, stale action reuse, or
   model output promotion into a security finding; log pin, action replay
   status, test assertion, source HEAD and dependency lock digest separately.
5. **Credential/privacy:** never send secrets, screenshots, browser state,
   prompts, local Pstack session transcripts, or tool history to a model,
   upstream telemetry, CI artifacts, or GitHub. Redact before persistence.
   Pstack local `serve` may read sensitive agent session logs; default OFF,
   loopback only, separate explicit opt-in, restricted storage/retention.
6. **Supply chain:** lock exact source/package version, transitive dependencies,
   integrity digests and Node requirements (`e2e` requires Node
   `^22.22.3 || >=24.8.0` as inspected); verify release and bootstrap
   without unsafe postinstall, ambiguous PATH lookup, or silent major upgrade.
7. **Independence:** Pstack Tier 0/1/2 cannot be reported as independent
   cross-vendor multi-model agreement. Record real host, capability tier,
   stance, model identity and whether review was independent.
8. **Rights/branding:** keep Apache-2.0 and MIT notices, upstream `NOTICE`,
   modifications and nested third-party rights; ship Ascout-branded UI/CLI
   without concealing required origin or claiming original authorship.

## 4. Bounded engineering work packets

| Order | Task | Scope (one bounded PR per task) | Exact acceptance |
|---|---|---|---|
| 1 | V0-T10 | Pin and rights-audit the two donors and portable Pstack; verify no unsafe bootstrap; record test/cost baseline | MCP-07, MCP-08 |
| 2 | V4-T08 | Optional Pstack skills adapter (verification only), `init --dry-run` and receipt-based uninstall; never write global agent policies automatically | MCP-09, MCP-010 |
| 3 | V7-T01 | TesterArmy deterministic web Engine Profile using installed/pinned runner, no model, no telemetry | E2E-15 |
| 4 | V7-T02 | Broker-bound local app fixture and typed result adapter (no duplicate authority), cache and provenance controls | E2E-16 |
| 5 | V7-T03 | Cross-platform local web qualification and benchmarks on exact heads; compare native Playwright to detect duplication | E2E-17 |
| 6 | V7-T04 | Explicitly consented optional model-assisted branch and feasibility-only mobile research; never a default release gate | E2E-18 |

**Dependencies:** V0-T10 precedes V4-T08 and V7-T01. V7-T01 requires
V1-T03 (execution broker), V1-T05 (Engine Protocol), and V2-T06
(executable `test` command). V7-T02 follows T01, T03 follows T02,
T04 follows T03 and V3 containment for untrusted inputs.
Pstack does not block V1/V2 real-engine completion and is not a new FD.

## 5. Evidence, failure behavior, and acceptance boundaries

- **L0:** schema/unit mocks; insufficient for integration.
- **L1:** captured real donor outputs revalidated against exact versions;
  insufficient for execution.
- **L2:** actual pinned `e2e` binary executes a deterministic local
  fixture through Ascout on one claimed OS; immutable receipt includes
  matched assertions, URL/egress policy, exit code and source identity.
- **L3:** L2 independently succeeds on Ubuntu, macOS and Windows if all
  three are claimed; no claim for any unavailable mobile platform.
- **Negative cases:** missing engine or model, wrong binary checksum, Node
  mismatch, failed assertion, malicious redirect, untrusted replay cache,
  mixed-HEAD evidence, telemetry leakage, secret-shaped artifacts, and
  Pstack skipped review. Each reports its actual omission/error, never PASS.
- **Benchmark:** report local first-run vs replayed deterministic runs,
  startup/RSS, cache hit validity, false-PASS count (must be zero), egress
  count (must be zero by default) and cross-head contamination (zero).
  A vendor performance number is not an Ascout measurement.

## 6. Adoption and governance status

This supplement is **design-ready for human/independent review only**.
No `e2e` or Pstack package is installed, bundled or executed by this plan.
No previously open FD-1…FD-8 is ratified by adding these donor sources.
Do not merge this document's stacked PR to canonical `main` before the
base V2 planning stack and its required independent-review / Diffcipline
gates qualify. Then implement each bounded task with Jev, genuine Alibaba
OCR or an explicitly authorized review fallback, Graft and exact-head CI;
normal merge commits and post-main checks only.
