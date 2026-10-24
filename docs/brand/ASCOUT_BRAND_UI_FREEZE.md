# Ascout Brand + UI Freeze

**Status:** FROZEN_DESIGN_DIRECTION  
**Date:** 2026-09-19  
**Freeze branch:** `plan/brand-identity-ui`  
**Purpose:** Preserve the agreed Ascout identity while product implementation proceeds.

## 1. Freeze intent

The Ascout brand and UI direction is now intentionally frozen until the unified Ascout product is substantially implemented.

This prevents repeated visual redesign from becoming a dependency or distraction during architecture, assurance-kernel, Review, Test, Security, Kernux Reality, Cyber, migration, and release-engineering work.

The freeze is a **design-direction freeze**, not a runtime implementation claim.

## 2. Frozen brand decisions

The following are frozen:

```text
Brand name: Ascout
Master tagline: Verify everything AI ships.
Positioning: The evidence layer for AI-built software.
Core metaphor: Scout the evidence.
Visual sequence: FIELD -> SCAN -> CHALLENGE -> TRACE -> LOCK -> REPORT
Primary symbol concept: Scout Frame
Secondary graphic system: Evidence Field
Primary display typeface: PP Mondwest
UI/body typeface direction: Geist Sans
Code/evidence typeface direction: Geist Mono / JetBrains Mono
Primary palette:
  Field Night   #0A0D17
  Proof Blue    #3867FF
  Scan Cyan     #43D4F3
  Evidence Lime #D8F36A
  Signal Violet #8A73FF
  Paper         #F4F3EC
Primary product modes:
  Review
  Test
  Security
  Cyber
  Assure
  Lab
Core UI truth rule:
  incomplete verification must never look complete
```

## 3. Frozen product-UI principles

These are frozen:

- exact target is always visible;
- evidence is inspectable;
- task status and claim status remain distinct;
- omissions/unknown/stale/refused states stay visible;
- recovery history is not visually erased;
- Reality/Lab shows execution-host truth, not just UI claims;
- Cyber begins with scope/authority;
- Assure is claim-oriented rather than score-oriented;
- semantic status never relies on color alone;
- PP Mondwest is display identity, not dense-body typography;
- evidence-dense UI prioritizes readability over visual effects.

## 4. Prototype freeze

The static prototype in `docs/brand/prototype/` freezes the agreed interaction and composition direction for:

- Home;
- Review;
- Test;
- Security;
- Cyber;
- Assure;
- Lab / Reality;
- Evidence Inspector;
- Target Bar;
- Run Timeline;
- dark/light mode;
- keyboard mode navigation;
- responsive collapse behavior.

The prototype is not production code and does not dictate the final application framework.

## 5. What remains deliberately unfrozen

The following may still change during product implementation without reopening the identity:

- exact frontend framework;
- component library internals;
- routing implementation;
- data-fetching/state architecture;
- desktop shell technology;
- icon drawing refinements;
- microcopy required by real contracts;
- table density after usability testing;
- responsive breakpoint tuning;
- accessibility fixes;
- production motion tuning;
- technical implementation of themes;
- exact PP Mondwest delivery method subject to license;
- final optical kerning/wordmark vectorization using legally licensed font material.

## 6. Conditions that may reopen the brand freeze

Do not reopen the freeze for taste changes.

Reopen only if one of these becomes true:

1. the product architecture changes so materially that Review/Test/Security/Cyber/Assure/Lab are no longer the correct information architecture;
2. the PP Mondwest license cannot legally support the intended product/website distribution;
3. accessibility testing proves a frozen choice materially harms core product use;
4. trademark/legal review requires a name or mark change;
5. implementation proves the Scout Frame/Evidence Field cannot operate at required product scales;
6. a founder decision explicitly authorizes a brand revision after substantive new evidence.

## 7. Prohibited drift during implementation

Do not casually introduce:

- a second logo;
- a second primary display typeface;
- a replacement primary palette;
- independent sub-brand logos for product modes;
- generic shield/robot/sparkle identity;
- a pill-heavy generic SaaS redesign;
- score-first assurance dashboards;
- hidden unknown/not-run/stale states;
- decorative green states that imply unsupported safety/completion.

## 8. PP Mondwest licensing gate

PP Mondwest remains the frozen display direction.

However:

```text
FONT_DIRECTION_FROZEN = YES
FONT_BINARY_ADMISSION = NOT_YET_AUTHORIZED
```

Before production UI implementation:

- verify the exact license;
- document web/app/desktop rights;
- define authorized delivery;
- never commit or redistribute font binaries unless permitted.

## 9. Implementation handoff rule

During Ascout build:

```text
use this brand package as a constraint
do not redesign it
implement product truth first
refine only when real usability/evidence demands it
```

At product-design re-entry, the first task is not "invent a new identity."

It is:

```text
revalidate the frozen identity against the finished Ascout product
-> make only evidence-backed refinements
-> finalize production wordmark/assets
-> qualify accessibility
-> ship
```

## 10. Freeze statement

```text
BRAND_STRATEGY_FROZEN = YES
VISUAL_DIRECTION_FROZEN = YES
TYPOGRAPHY_DIRECTION_FROZEN = YES
COLOR_DIRECTION_FROZEN = YES
PRODUCT_UI_INFORMATION_ARCHITECTURE_FROZEN = YES
STATIC_HIGH_FIDELITY_PROTOTYPE_FROZEN = YES

PRODUCTION_UI_IMPLEMENTED = NO
FONT_LICENSE_ADMISSION_COMPLETE = NO
FINAL_PRODUCTION_WORDMARK_VECTORIZATION = DEFERRED
DESIGN_REOPEN_TARGET = AFTER_SUBSTANTIAL_ASCOUT_IMPLEMENTATION
```
