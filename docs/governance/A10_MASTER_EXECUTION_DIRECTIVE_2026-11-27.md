# Amendment A10: Master Execution Directive & Governance Simplification (2026-11-27)

**Status:** Adopted 2026-11-27 under the Founder Master Execution Directive ("ASCOUT — MASTER EXECUTION DIRECTIVE"). Constitution moves from `1.5.0` to `1.6.0`.

## 1. Founder Authorization Summary

On 2026-11-27, the founder of Ascout authorized autonomous end-to-end engineering to complete Ascout as an open-source, local-first, privacy-first, model-agnostic, evidence-driven verification intelligence platform under Apache-2.0 (`Verify everything AI ships. Models propose. Evidence decides.`).

Authorized scope:
- Review, challenge, simplify, and improve the existing architecture and roadmap.
- Resolve obsolete administrative/planning blockers (including M1/M2/UA-P06 implementation freezes and issues #296, #628, and #634).
- Implement, integrate, test, review under Amendment A09, and merge properly qualified pull requests across all 13 Ascout capability domains:
  1. **Ascout Core** (core check hardening, Git #591 elimination)
  2. **Ascout Review** (deterministic-first code review + optional BYOAI)
  3. **Ascout Security** (deterministic deep security audit + optional Gitleaks/AI + SARIF)
  4. **Ascout Test** (quick/standard/deep/release profiles, budgets, mutation, property/fuzz, contract, perf/recovery)
  5. **Ascout Browser** (real Playwright Chromium journeys, live locators, DOM/network/console/screenshot/a11y/visual diff)
  6. **Ascout Runtime** (source-bound local process/HTTP/crash/resource/restart evidence)
  7. **Ascout Sandbox** (Linux bubblewrap, macOS sandbox-exec, Windows AppContainer)
  8. **Ascout Agent** (structured claim verification with Qualified Contradiction)
  9. **Ascout Evidence** (content-addressed store, integrity verification, diff, export, pruning)
  10. **Ascout Benchmark** (reproducible deterministic + optional-AI benchmark suite)
  11. **Ascout Release** (release readiness gate with residual risk and verification omissions)
  12. **Ascout Connect** (unified CLI, zero-option read-only MCP, authenticated local HTTP API, Git/CI)
  13. **Ascout Studio** (local-first graphical UI built on the Ascout Brand/UI Design System, live data only)
- Reuse, adapt, integrate, and rebrand authorized donor code strictly under Ascout product identity while preserving all legally required licenses, notices, and provenance.

## 2. Constitutional Delta (v1.5.0 -> v1.6.0)

1. **Governance simplification:** Replaces redundant per-task authorization packets and circular planning freezes with a streamlined engineering bar: architecture review (including EGM critique where available), implementation, deterministic unit/integration tests covering changed lines and branches, exact-head 13-check CI, and independent fresh-context review under Amendment A09.
2. **Qualified Contradiction (`REFUTED`, amending A07 clause 7):** Permits `ascout verify` to return `VERIFIED | REFUTED | PARTIALLY_VERIFIED | INCOMPLETE | NOT_VERIFIED`, restricting `REFUTED` strictly to typed structured claim predicates contradicted by deterministic, source-bound observations on the exact matching `(repository_id, head_sha, tree_digest)` with resolvable evidence refs. Raw heuristic static-scanner findings and AI opinions never emit `REFUTED`.
3. **Scoped deterministic review (amending A07 clause 3):** Permits `ascout review` to exit `0` only with an explicit source-bound scope proof (e.g., `--base`/`--commit` where every changed file is covered by supported deterministic analyzers with zero findings); working-tree-only clean or unsupported runs retain exit `4` and A07.3 scope disclosure.

## 3. Unchanged Safety & Founder-Reserved Boundaries

- Runtime security, fail-closed execution, no-green-by-omission, source-bound truth, `ReceiptV1` backward compatibility for default `ascout check`, exact-head CI, and Amendment A09 truthful AI-review labeling are **unchanged**.
- Reserved to explicit founder confirmation: public releases/tags/npm publication, paid offerings/billing, external accounts/credentials, repository protection rule changes, and admitting untrusted repositories under Principle IV (until all supported OS sandboxes and Git execution boundaries in Issue #591 are natively qualified under A09).
