# 06 — Architecture Options

## 1. Options

**A — Modular monolith.** One Ascout distribution. Review, security, and test logic all live in Ascout's TypeScript process. Sentrdel's capabilities would be ported to TypeScript or linked through native Node addons (N-API), and OCR would be re-implemented or embedded.

**B — Unified core with companion engines.** Ascout owns all assurance decisions. Qualified engines (Sentrdel, OCR, the user's test runners, scanners) run out of process behind versioned request/response boundaries. Ascout ships or resolves a small, fixed set of companions.

**C — Plugin-first verification platform.** Ascout publishes stable trust contracts plus a public plugin SDK and registry. Any third party can contribute engines; Ascout qualifies them at install or run time.

**B+ (selected hybrid).** B, plus three constraints taken from A and C:
1. **From A:** one process owns authority, policy, and claims; one Execution Broker owns all child processes; no engine talks to another engine directly.
2. **From C:** the engine boundary is a documented, versioned **Engine Protocol v1** (JSON over stdio, schema-validated, bounded) so that a future admitted third-party engine needs no core change. A public SDK, registry, and dynamic plugin loading are **deferred**, not designed in.
3. **Security fan-in is delegated:** Sentrdel is the only security engine Ascout calls, and Sentrdel itself fans in optional scanners. This keeps Ascout's engine set at three kinds: review (OCR), security (Sentrdel), and test (the user's runners plus the existing `check` path).

## 2. Evaluation

Scale: ++ strong, + adequate, − weak, −− poor. Each score is reasoned, not measured.

| Criterion | A Monolith | B Companions | C Plugin-first | B+ | Reasoning |
|---|---|---|---|---|---|
| Security | − | + | −− | ++ | A runs parsers of untrusted repository content inside the authority process. C admits arbitrary code into the trust path. B/B+ isolate engines as processes; B+ adds one broker and one protocol |
| Reliability | + | + | − | + | Out-of-process crashes are contained; C's quality depends on the ecosystem |
| Development complexity | −− | + | − | + | A requires porting 100k Rust LOC (Sentrdel) to TypeScript or N-API builds on 3 OSes |
| Integration cost | −− | + | − | ++ | Sentrdel and OCR already exist as separate binaries; B+ needs the least new code |
| Maintenance | − | + | −− | + | C carries SDK compatibility forever; A merges three codebases |
| Language compatibility | − | + | ++ | + | B+ inherits Sentrdel/Opengrep coverage; new languages come through scanners, not core code |
| CPU/RAM | + | + | − | + | Process start overhead is small relative to analysis |
| Windows/macOS/Linux | − | + | − | + | Companion binaries are built per OS in CI; A's native addons are the worst case |
| Offline usability | + | + | − | ++ | B+ core and Sentrdel run offline; OCR has delegation mode; scanner DB downloads are explicit effects |
| Agent usability | + | + | + | ++ | One MCP surface over one authority |
| Extensibility | − | + | ++ | + | B+ is extensible through the protocol without committing to an SDK |
| Installation complexity | ++ | − | −− | − | Companions add download steps; mitigated by `ascout setup` with checksum-verified pinned downloads (V5) |
| Performance | + | + | + | + | Equivalent at the expected scale |
| Testability | − | + | − | ++ | Protocol fixtures captured from real binaries; engines mockable at the boundary |
| Vendor independence | + | + | + | ++ | No model provider dependency; BYOK/local/delegation for review |
| Source reuse | −− | ++ | + | ++ | B+ reuses Sentrdel as is and OCR unmodified |
| Operational cost (operator) | ++ | ++ | − | ++ | All local; C invites hosted registries |
| Long-term sustainability | − | + | − | + | Smallest permanent surface; plugin SDK only if demand is proven |

## 3. Why not A

Porting Sentrdel into TypeScript discards 100k lines of tested, `unsafe_code = "forbid"` Rust and reintroduces parser risk into the authority process. N-API bindings would make Ascout's npm package architecture-specific and would violate Constitution V/A06 rule 6 ("no Rust toolchain … required for any core claim") for anyone building from source.

## 4. Why not C now

A plugin SDK creates a second source of truth about what an engine means. Each plugin would need qualification, sandboxing, and update security before it could be trusted, which is exactly the capability Ascout does not yet have (G05). C becomes reasonable only after V3 containment and V5 signed distribution exist, and after demand appears for an engine that Sentrdel's SARIF fan-in cannot cover.

## 5. Single authority guarantee

There is one trust kernel. Concretely:

- Only `src/assurance/kernel/*` + `contracts/claim-assessment.ts` may produce a claim outcome.
- Sentrdel's own `Finding` objects arrive as **observations** (A06 rule 1). Sentrdel's reconciler is useful pre-processing, but its output is not a verdict.
- OCR comments arrive as **review observations** with an independence class.
- Test runner exits arrive as **task results** through the existing receipt model.
- Kodac's Done Gate is not imported (S01).

## 6. Options rejected inside B+

| Sub-option | Rejected because |
|---|---|
| Ascout calls Trivy/OSV/Gitleaks directly | Two security ingestion paths; duplicates `sentrdel-engine/src/adapter.rs` |
| Host the containment helper in the Sentrdel repository | Couples execution policy to a security analyzer's release cadence. The helper is Ascout mechanism; see DECISION_LOG D-07 |
| A long-running local daemon for speed | Violates Constitution V; no measured need |
| SQLite evidence store in core | Constitution V; JSON + content digests are sufficient at current scale |
