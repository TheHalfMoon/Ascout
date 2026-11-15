# Ascout Brand and UI

This directory contains the planning-ready brand and product-interface identity for Ascout.

## Files

- `ASCOUT_BRAND_IDENTITY.md` — strategy, positioning, wordmark, typography, color, graphic grammar, motion, voice, and brand architecture.
- `ASCOUT_UI_DESIGN_SYSTEM.md` — product shell, Review/Test/Security/Cyber/Assure/Lab interface behavior, status semantics, components, responsive rules, and UI acceptance criteria.
- `tokens.css` — implementation-oriented design tokens.
- `assets/ascout-mark.svg` — first vector concept for the Scout Frame symbol.

## Typography

The display identity uses **PP Mondwest**, matching the large AutoScientist display typeface observed on the reference page.

PP Mondwest is commercial. Font binaries must not be copied into this repository unless the license explicitly allows redistribution.

## Design method

The system follows a concept-first identity method:

```text
name/mission
-> core metaphor
-> symbol
-> typography
-> graphic grammar
-> motion
-> interface
```

For Ascout, the metaphor is **scouting an evidence field**:

```text
FIELD -> SCAN -> CHALLENGE -> TRACE -> LOCK -> REPORT
```

This is intentionally distinct from Abridge's bridge-derived letterform system and from AutoScientist's visual composition.

## Status

```text
BRAND_DIRECTION_DEFINED = YES
UI_DIRECTION_DEFINED = YES
TOKENS_DEFINED = YES
INITIAL_SYMBOL_CONCEPT_DEFINED = YES
FONT_LICENSE_INTAKE_REQUIRED = YES
RUNTIME_UI_IMPLEMENTATION_AUTHORITY = NO
```


## High-fidelity prototype

A static interaction prototype is available at:

- `prototype/index.html`
- `prototype/styles.css`
- `prototype/app.js`
- `prototype/README.md`

It demonstrates the frozen direction for Home, Review, Test, Security, Cyber, Assure, Lab/Reality, the Evidence Inspector, Target Bar, and Run Timeline.

No build step is required.

## Freeze

The agreed identity and product-interface direction is frozen in:

- `ASCOUT_BRAND_UI_FREEZE.md`

The freeze exists to prevent visual redesign from distracting from Ascout implementation.

```text
BRAND_STRATEGY_FROZEN = YES
VISUAL_DIRECTION_FROZEN = YES
PRODUCT_UI_INFORMATION_ARCHITECTURE_FROZEN = YES
PRODUCTION_UI_IMPLEMENTED = NO
```
