# Ascout UI Design System

**Status:** IMPLEMENTATION-READY UI DIRECTION  
**Date:** 2026-09-19  
**Depends on:** `ASCOUT_BRAND_IDENTITY.md`

## 1. Product principle

The UI must make evidence legible before it makes the product feel impressive.

The interface should answer five questions at all times:

1. What exact target are we looking at?
2. What did Ascout plan to verify?
3. What actually ran?
4. What evidence exists?
5. What claim is supported, blocked, incomplete, stale, or unknown?

## 2. Main application shell

Desktop target:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Ascout   target: repo / branch / commit          runtime     status     ⌘K  │
├──────────┬─────────────────────────────────────────────────┬─────────────────┤
│ Review   │                                                 │ Evidence        │
│ Test     │              Main Work Surface                  │ Inspector       │
│ Security │                                                 │                 │
│ Cyber    │                                                 │                 │
│ Assure   │                                                 │                 │
│          │                                                 │                 │
│ Lab      │                                                 │                 │
├──────────┴─────────────────────────────────────────────────┴─────────────────┤
│ Run timeline / attempts / recovery / target drift                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Left rail

Width:

- expanded: 188 px;
- collapsed: 56 px.

Contains:

- Scout Frame mark;
- Review;
- Test;
- Security;
- Cyber;
- Assure;
- Lab;
- Runs;
- Settings.

Mode name uses Geist Sans in navigation; large mode landing headings use PP Mondwest.

### Target bar

The target bar is always visible.

Show:

```text
repository
branch/worktree
short commit SHA
dirty state
policy
runtime
source drift
```

The target is a trust surface, not breadcrumb decoration.

## 3. Home screen

Primary hero:

```text
What do you want to prove?
```

Set in PP Mondwest.

Below, five large mode cards:

```text
Review
Read the change like a senior reviewer.

Test
Challenge the behavior.

Security
Check the invariants.

Cyber
Model and validate adversarial risk.

Assure
Ask whether the claim is actually supported.
```

Secondary card:

```text
Lab
Test the real product in a bounded runtime.
```

Home background uses a restrained Evidence Field.

## 4. Review workspace

Three-pane structure:

```text
Change groups / files
        |
        v
Code + review thread
        |
        v
Finding/evidence inspector
```

Top summary:

```text
Reviewed 18/21 logical groups
2 unsupported
1 truncated
3 findings
```

Never display "Review complete" when material scope is unreviewed.

Finding card contains:

- severity;
- state;
- exact file/symbol/line;
- reviewer/engine identity;
- source target;
- evidence refs;
- reproduction if present;
- independent verification state.

## 5. Test workspace

Top-level subviews:

```text
Plan
Runs
Coverage
Journeys
Reality
Failures
```

Test class matrix:

```text
Build         PASS
Typecheck     PASS
Unit          PASS
Integration   PASS
Mutation      NOT_RUN — no qualified engine
Browser       FAIL
Reality       INCOMPLETE — lab unavailable
```

The UI must distinguish task status from claim status.

## 6. Reality / Lab workspace

This should feel like an instrument panel, not a CI log viewer.

Main layout:

```text
Journey steps              Live product / browser / app
Runtime state              Evidence stream
Process tree               Network/filesystem effects
Cleanup                    Claim/oracle inspector
```

Every real action records the mechanism:

```text
typed API
DOM/accessibility
terminal/file
semantic browser
vision fallback
```

Vision fallback is visually labeled and never presented as deterministic.

## 7. Security workspace

Subviews:

```text
Overview
Findings
Coverage
Dependencies
Secrets
Supply chain
Invariants
Reachability
Retest
```

Use the visual system to show coverage debt.

Example:

```text
SAST            covered
Dependencies    covered
IaC             partial
Runtime auth    not run
Dynamic         not authorized
```

Avoid security-score gamification.

## 8. Cyber workspace

Cyber begins with scope and authority.

Before dynamic activity, show:

```text
Target
Allowed origins
Ports/protocols
Credential scope
Request/rate budget
Forbidden actions
Stop conditions
Lab/runtime
Authorization expiry
```

No "Start attack" primary button.

Use:

```text
Start authorized validation
```

## 9. Assure workspace

Assure is claim-oriented.

Primary input:

```text
What are you trying to claim?
```

Examples:

- Change verified;
- Review complete;
- Security checked;
- Reality tested;
- Release ready.

Claim view:

```text
SUPPORTED BY
CONTRADICTED BY
MISSING
STALE
REFUSED
```

Overall state:

```text
SUPPORTED
BLOCKED
INCOMPLETE
INCONCLUSIVE
STALE
REFUSED
```

Never use a numeric risk/quality score as terminal authority.

## 10. Evidence inspector

Right-side inspector is shared across all modes.

Header:

```text
Evidence EVD-8F31
```

Sections:

- producer;
- exact target;
- run;
- engine/runtime;
- observation;
- artifact;
- digest;
- classification;
- freshness;
- lineage;
- related finding;
- related claim.

The inspector should make it easy to answer:

> Why does Ascout believe this?

## 11. Run timeline

Bottom rail or dedicated page.

Timeline preserves:

- attempts;
- failures;
- retries;
- recoveries;
- source drift;
- runtime disconnect;
- cleanup;
- publication effects.

A recovered run visibly remains recovered.

Do not visually collapse:

```text
FAIL -> retry -> PASS
```

into one green PASS event.

## 12. Status presentation

### Task PASS

Use green status only for the exact task.

### Claim SUPPORTED

Use:

- Evidence Lime accent;
- lock/frame glyph;
- word `SUPPORTED`;
- list of mandatory evidence classes.

### Incomplete

Use neutral/amber:

- open frame;
- missing cell count;
- clear reason.

### Unknown

Use open/empty cell.

Unknown must not look like neutral success.

## 13. Component language

### Cards

Square/medium-radius:

- 6 px default;
- 10 px large;
- avoid 24 px pill-heavy SaaS aesthetic.

### Buttons

Primary:

- solid Proof Blue on light;
- Paper/White on Field Night where appropriate.

Danger:

- semantic red only for destructive/effectful operations.

### Inputs

Flat, crisp, 1 px border.

No excessive inner shadows.

### Tables

Dense but breathable:

- 40 px row;
- sticky header;
- monospace IDs;
- expandable evidence rows.

### Tabs

Underline/frame treatment.

Avoid pill tabs unless representing compact filters.

## 14. Design tokens

### Radius

```text
radius-1  4px
radius-2  6px
radius-3  10px
radius-round 999px only for status dot/avatar/filter chip
```

### Spacing

4 px base:

```text
4, 8, 12, 16, 24, 32, 48, 64, 96
```

### Shadows

Use sparingly.

Dark surfaces rely on border/contrast before blur.

```text
shadow-panel: 0 12px 40px rgb(0 0 0 / 0.20)
shadow-float: 0 18px 60px rgb(0 0 0 / 0.28)
```

## 15. Grid

Brand grid and UI layout grid are related but not identical.

Marketing:

- visible 32 px Evidence Field;
- large type can align to cell boundaries.

Product:

- 12-column responsive content grid;
- 4 px spacing base;
- subtle evidence field only in large blank/overview areas.

Never place strong graph-paper lines under dense code or data tables.

## 16. Light mode

Light mode:

```text
background      Paper
surface         #FFFFFF
text            Field Night
border          #D9DDE5
subtle grid     #0A0D17 at 5%
```

Use signal colors with accessible contrast.

## 17. Dark mode

Dark mode is the flagship Ascout expression.

```text
background      Field Night
surface         #111526
raised          #171C30
text            Paper
muted           #9CA5B8
border          #2A3147
subtle grid     #FFFFFF at 5–7%
```

Avoid pure black for large surfaces.

## 18. Responsive behavior

Desktop-first because evidence density is high.

Breakpoints:

```text
>= 1440   full 3-pane
1024-1439 collapsible inspector
768-1023  rail + single main pane
< 768      read/triage mode; limited complex execution setup
```

Mobile can inspect runs/findings/claims.

Complex lab/cyber authorization setup should remain desktop-first unless separately designed.

## 19. Keyboard interaction

Core shortcuts:

```text
⌘/Ctrl K     command palette
G R          Review
G T          Test
G S          Security
G C          Cyber
G A          Assure
G L          Lab
E            Evidence inspector
] / [        next/previous finding
Shift Enter  run currently reviewed plan where authorized
```

Effectful shortcuts must still respect confirmation/authority policy.

## 20. Empty states

Empty state copy should explain why.

Good:

```text
No Reality evidence yet.
This claim requires a real application run.
Configure a qualified local Lab to continue.
```

Bad:

```text
Nothing here yet ✨
```

## 21. Loading states

Use scan-field motion.

Show exact stage:

```text
Binding target
Planning checks
Starting engine
Collecting evidence
Reconciling findings
Assessing claim
```

Do not use an endless generic spinner for long verification runs.

## 22. Error states

Separate:

- project failure;
- engine error;
- policy refusal;
- missing authority;
- missing capability;
- stale target;
- source drift;
- runtime disconnect;
- cleanup failure.

The visual treatment can share structure but not wording.

## 23. Marketing website direction

Hero:

```text
Ascout

Verify everything AI ships.

Know what ran.
What failed.
What was never checked.
```

Use:

- PP Mondwest hero;
- Evidence Horizon background;
- visible Field grid;
- Scout Frame animation;
- real product evidence UI, not abstract AI art.

Second section:

```text
Review.
Test.
Secure.
Challenge.
Prove.
```

Then show one target moving through the five modes.

## 24. Product launch visual

Launch sequence:

```text
AI says: "Done."
screen goes dark
Scout Frame locks onto commit
Review / Test / Security / Reality evidence cells illuminate
one required cell stays empty
claim remains open
missing test runs
cell fills
frame locks
"Now it's verified."
```

This communicates the product better than feature-card marketing.

## 25. Implementation technology direction

When UI implementation is authorized:

- React/TypeScript;
- use existing Ascout architectural constraints first;
- CSS variables/tokens as source of truth;
- Radix/shadcn-style primitive concepts may be referenced, but visual output must be custom Ascout;
- no imported SaaS dashboard theme;
- motion via a small explicit animation layer;
- charts/graphs must expose underlying evidence.

The exact application framework must be selected under canonical implementation planning rather than by brand documents alone.

## 26. UI acceptance criteria

The identity is successful only if:

1. Ascout is recognizable without the logo from type/grid/frame/color behavior.
2. PP Mondwest feels intentional, not novelty pixel decoration.
3. dense engineering evidence remains easier to read than a generic terminal UI.
4. incomplete verification cannot look complete.
5. Review/Test/Security/Cyber/Assure feel like one product.
6. brand graphics and product information architecture share the same visual logic.
7. the system works in light/dark and reduced-motion modes.
8. the design remains credible to senior engineers and security teams.
