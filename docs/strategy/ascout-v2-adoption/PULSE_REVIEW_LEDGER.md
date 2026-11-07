# Pulse Goldfish — Main-Rooted Second-Round Review Ledger

**Source review snapshot:** signed `5c8f9205982b10da2c87b463157c82b5589c7964` on PR [#653](https://github.com/TheHalfMoon/Ascout/pull/653), based on `main@ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430`. Four source documents were inspected before subsequent edits. **Model:** OpenCode `opencode/pulse-alpha-free` in independent fresh `--agent plan` sessions using Google Elephant-Goldfish personas. No R1 human review or founder approval is asserted.

## Completed advisory reviews

| Persona | Observed independent result | Implementation gate |
|---|---|---|
| Implementation Readiness | **REVISE; E0 observational GO only.** Found unscoped GIT-CONFIG-EXEC details, E2 compatibility matrix absent, E3 OCR pin admission undefined, broker caps/functions absent, E5 per-platform pin/CI unspecified, inadequate fixture and rollback detail. | No E1–E5 implementation GO; see [FIRST_SPRINT_TEST_MATRIX.md](FIRST_SPRINT_TEST_MATRIX.md). |
| Design Critic | **REVISE.** Found parallel-engine qualification risk, network-deny policy without enforcement, vacuous clean from empty/ignored Gitleaks scans, mutable-source TOCTOU, first-trust binary provenance, raw secret output leakage, PATH/UNC invocation and retired macOS CI. | All identified safety controls need independently tested E1/E4/E5 implementations before an engine may be admitted. |
| Codebase Details | **COMPLETED / REVISE; 0 blockers, 2 majors, 2 nits.** All inspected current-main CLI/source claims and existing M paths were verified. Majors: undefined historical `V1-T08` and `G30` colliding with main's unrelated gap ID. Both references have been corrected in this proposal. | Text fixes implemented; final signed-head re-review still required. |

## Response in the revised proposal (not proof of runtime behavior)

1. **Engine single authority:** [ENGINE_PROFILE_AND_INGESTION.md](ENGINE_PROFILE_AND_INGESTION.md) requires mapping every proposed adapter profile to existing `EngineDescriptorV1` / `EngineQualificationV1` and kernel evaluation. The profile is not a second admission authority.
2. **Immutable scope and no false green:** scan only source-bound frozen exports, compare pre/post file digests, require a separate positive canary and independent scope manifest; unsupported/ignored files remain omitted. This is a **proposal** awaiting real evidence.
3. **Egress and privacy:** network `DENY` is a declaration, not enforcement; require per-OS negative socket probe. Raw scanner output stays bounded and owner-only, with mandatory fail-closed redaction before any artifact/log publication.
4. **Provenance:** require reviewable upstream-signed/release identity and per-OS artifact SHA manifest; no self-hashed/"latest" fallback, no secret-shaped committed fixtures.
5. **First sprint:** [FIRST_SPRINT_TEST_MATRIX.md](FIRST_SPRINT_TEST_MATRIX.md) names deterministic E0 synthetic fixtures, exact evidence table, A07 exit migration matrix, proposed broker time/output bounds, planned native CI and rollback. **E1–E5 remain BLOCKED** where externally pinned bytes, private GIT-CONFIG-EXEC security spec or exact implementation API schemas are still missing.
6. **Supported CI:** [REVIEW_AND_RATIFICATION.md](REVIEW_AND_RATIFICATION.md) requires exact-HEAD macOS 15 evidence after separate [#652](https://github.com/TheHalfMoon/Ascout/pull/652) or a formally recorded change in claimed platform scope. It never marks cancelled macOS 14 jobs PASS.

## Open items after this author repair

- [ ] R1 independent authorized human review and explicit FD-1 through FD-8 founder dispositions.
- [ ] Fresh Pulse/EGM review of the **final** amended commit (original second-round REVISE does not transfer to a new HEAD).
- [ ] Approved canonical planning verifier/Diffcipline and exact-head PR CI.
- [ ] GIT-CONFIG-EXEC private safe-Git implementation spec (packet-local ID: **distinct from main's G30 sensitive-retention gap**), complete broker Request/Envelope/Result signatures and rights/OS provenance manifest. Unfinished code-level choices block corresponding implementation packets.
- [ ] Native L2/L3 execution on each claimed OS, verified egress denial, source binding and no data leakage; then source release authorization.

**Review conclusion:** **REVISE for implementation GO; REVIEW-READY candidate for E0/owner ratification.** Codebase reviewer findings about the undefined `V1-T08` and competing `G30` labels were addressed textually without altering source. This is an author repair, **not** a Goldfish sign-off of the final commit. Review findings are evidence of design risks, not tests, legal validation, or an implementation PASS. Do not merge old #578/#651 code histories to fill gaps.
