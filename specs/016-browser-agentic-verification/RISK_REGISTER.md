# Spec 016 Risk Register

**Status:** `PLANNING_ONLY`

## R016-01 — Browser maintenance explosion

**Risk:** copying/forking large Playwright internals makes Ascout responsible for browser protocol churn.

**Mitigation:** public API dependency first; selective component reuse only after benchmark-backed insufficiency.

## R016-02 — Silent semantic healing

**Risk:** auto-heal reaches a green state through a materially different business flow.

**Mitigation:** explicit semantic-recovery class; ordinary PASS blocked until intent/obligation revalidation.

## R016-03 — Retry-to-green evidence laundering

**Risk:** transient failure disappears from final status.

**Mitigation:** append-only attempt history; reuse Spec 015 stability semantics; original attempt preserved.

## R016-04 — Model oracle false confidence

**Risk:** AI assertion says PASS despite deterministic contradiction.

**Mitigation:** typed oracle mesh; model evidence advisory by default; deterministic contradiction cannot be score-overridden.

## R016-05 — Cache staleness across revisions

**Risk:** cached locator/step from old source silently authorizes current behavior.

**Mitigation:** cache keys bind source/application/environment/resolver version; cache never carries PASS authority.

## R016-06 — Sensitive artifact leakage

**Risk:** traces/screenshots/storage/network capture credentials or PII.

**Mitigation:** bounded retention, sensitivity classification, recognized secret redaction in Ascout-owned normalized evidence, explicit raw-artifact limitations, ignored artifact storage.

## R016-07 — Browser binary / CI operational cost

**Risk:** browser downloads and cross-platform binaries inflate CI time/storage.

**Mitigation:** Chromium-first qualification if YAGNI evidence supports it; reuse package/browser caches safely; cross-browser expansion after baseline proof.

## R016-08 — Flaky browser timing

**Risk:** asynchronous UI/network timing produces noisy failures and pressure to weaken tests.

**Mitigation:** Playwright actionability/auto-wait where native; explicit bounded recovery; no arbitrary timeout inflation without evidence; stability classification.

## R016-09 — Agent authority creep

**Risk:** explore/heal/generate agent starts mutating canonical tests/source or granting PASS.

**Mitigation:** proposal-only contracts; isolated candidate worktree; admission gate; explicit tool capability boundaries.

## R016-10 — Origin/network authority expansion

**Risk:** browser agent navigates arbitrary third-party sites or sends data outside intended app scope.

**Mitigation:** trusted-local scope, explicit origin policy, recovery cannot expand authority, network observations visible.

## R016-11 — Donor lock-in

**Risk:** Ascout canonical model becomes Playwright- or Momentic-shaped and hard to evolve.

**Mitigation:** internal Intent/BrowserExecutor/Evidence contracts; donor-specific adapters; no public plugin abstraction until needed.

## R016-12 — Momentic provenance ambiguity

**Risk:** source copied under informal permission without durable proof or nested rights inventory.

**Mitigation:** block import until permission artifact, exact snapshot, component/third-party inventory and provenance map exist.

## R016-13 — Test generation vanity metrics

**Risk:** project optimizes number of generated tests rather than defect detection.

**Mitigation:** discrimination proof, defect recall, false PASS and obligation coverage are primary metrics.

## R016-14 — Journey graph complexity

**Risk:** early graph DB/semantic infrastructure slows product delivery.

**Mitigation:** deterministic maps/arrays first; query/scale benchmark required for database adoption.

## R016-15 — Browser evidence volume

**Risk:** trace/video/screenshot storage becomes large and hard to retain privately.

**Mitigation:** policy-driven capture, bounded retention, digest/reference model, retain-on-failure/targeted trace strategy where appropriate.

## R016-16 — Visual false positives/negatives

**Risk:** pixel differences are noisy; semantic visual models may miss exact defects.

**Mitigation:** preserve separate golden/model visual oracle classes; controlled environment; deterministic contradiction wins.

## R016-17 — Existing project command authority

**Risk:** Playwright config/scripts changed in the current diff become executable code authority.

**Mitigation:** integrate browser config/command sources with existing changed-command-surface admission; do not auto-admit from agent instructions.

## R016-18 — Parallel planning/execution collision

**Risk:** Spec 016 planning interferes with active Spec 015 implementation.

**Mitigation:** planning branch only while Spec 015 chain is active; no Spec 016 implementation PR/dependency until predecessor closeout.

## R016-19 — Over-scoping into mobile/API/security

**Risk:** browser foundation becomes a universal testing rewrite.

**Mitigation:** first deterministic web wedge, benchmark gate, later separately authorized tracks.

## R016-20 — Competitor comparison overclaim

**Risk:** unavailable/proprietary comparator evidence becomes marketing assertion.

**Mitigation:** `COMPARISON_UNAVAILABLE(reason)`; only reproducible permitted comparisons support claims.

```text
CRITICAL_RISKS_WITHOUT_MITIGATION = 0
RISK_REGISTER_IS_IMPLEMENTATION_INPUT = YES
```