# Ascout Brand Identity

**Status:** BRAND SYSTEM / IMPLEMENTATION-READY DESIGN DIRECTION  
**Date:** 2026-09-19  
**Branch:** `plan/brand-identity-ui`  
**Relationship:** Brand/UI successor planning for the unified Ascout product direction in PR #358.

## 1. Brand thesis

Ascout is not another code scanner.

Ascout is the evidence layer between software claims and trust.

The brand must communicate four things at once:

1. technical precision;
2. active investigation;
3. visible proof;
4. calm confidence without hype.

The central brand idea is:

> **Scout the evidence. Prove the claim.**

The product promise remains:

> **Verify everything AI ships.**

Supporting line:

> **Know what ran. What failed. What was never checked.**

## 2. Strategy

### Positioning

**Ascout is an engineering assurance system for AI-built software.**

It reviews, tests, challenges, observes, and reconciles evidence across code, security, browser, application, lab, and runtime surfaces.

### Mission

**Make every software claim inspectable.**

### Vision

**A world where software can prove what happened before people are asked to trust it.**

### Brand promise

**Proof before confidence.**

### Brand personality

- exact, not cold;
- skeptical, not cynical;
- technical, not obscure;
- confident, never overconfident;
- fast, never careless;
- visually unconventional, operationally serious.

## 3. Pentagram-inspired design method

The identity follows a concept-first method rather than copying another brand's visual surface.

The design system must begin with one idea native to the name **Ascout**.

A scout:

- enters a field;
- searches systematically;
- distinguishes signal from noise;
- marks what was observed;
- reports what remains unknown;
- returns evidence rather than reassurance.

This becomes the full visual system:

```text
FIELD
-> SCAN
-> CHALLENGE
-> TRACE
-> LOCK
-> REPORT
```

The identity is therefore built from:

- a field/grid;
- a focus frame;
- a scan line;
- evidence cells;
- traces;
- locked states.

The brand system should be as useful in the product UI as it is on a website, slide, terminal, social image, or release artifact.

## 4. Primary identity concept — The Scout Frame

The core symbol is the **Scout Frame**.

It combines:

- four right-angle focus corners;
- a central `A`/aperture geometry;
- one evidence cell.

Meaning:

```text
frame = exact scope
A = Ascout
cell = one observed fact
lock = evidence bound to a claim
```

The symbol must work:

- at 16 px in a CLI/UI;
- at 32–64 px in app chrome;
- at large environmental/marketing scale;
- as a motion container;
- as an evidence-state glyph.

Do not add shields, padlocks, magnifying glasses, generic robot stars, or checkmark-only logos.

Ascout should look like an engineering instrument, not a cybersecurity stock icon.

## 5. Wordmark

Primary wordmark:

```text
Ascout
```

Typography:

- **PP Mondwest** for the wordmark and display identity;
- custom optical kerning is required;
- use the title case `Ascout`, not all caps, for the primary lockup;
- all caps may be used for small labels only;
- do not stretch, outline, bevel, glow, or add faux terminal distortion.

Optional campaign lockup:

```text
Ascout_
```

The terminal cursor form is a campaign/motion device only, not the canonical company name.

## 6. Typography system

### Display / identity

**PP Mondwest**

Use for:

- wordmark;
- hero headings;
- section openers;
- large product-mode labels;
- campaign lines;
- selected numeric moments.

Do not use PP Mondwest for long paragraphs, forms, dense tables, or every control.

The AutoScientist reference uses PP Mondwest as its large display face. Ascout intentionally uses the same licensed typeface, but with a different visual grammar and brand idea.

### Product / body

**Geist Sans**

Use for:

- navigation;
- body copy;
- controls;
- forms;
- tables;
- evidence descriptions;
- documentation UI.

### Code / evidence / identifiers

**Geist Mono** or **JetBrains Mono**

Use for:

- commit SHA;
- task IDs;
- paths;
- engine IDs;
- CLI;
- evidence hashes;
- timestamps;
- structured logs.

### Type scale

```text
Display XL   96/0.94  PP Mondwest
Display L    72/0.96  PP Mondwest
Display M    54/1.00  PP Mondwest
Heading 1    40/1.05  PP Mondwest
Heading 2    30/1.10  PP Mondwest
Heading 3    22/1.20  Geist Sans 600
Body L       18/1.55  Geist Sans
Body M       15/1.55  Geist Sans
Body S       13/1.45  Geist Sans
Label        12/1.20  Geist Sans 600
Code         12/1.45  Geist Mono
Micro        10/1.30  Geist Mono
```

## 7. Typeface licensing rule

PP Mondwest is a commercial typeface.

Do not commit a copied font file into the public repository unless the exact license authorizes repository redistribution.

Implementation must:

1. purchase/hold the correct web/app/desktop license;
2. document the license owner and allowed distribution;
3. load the font only through an authorized delivery method;
4. keep development fallback fonts separate from the canonical visual identity.

Development fallback:

```css
font-family: "PP Mondwest", "Courier New", ui-monospace, monospace;
```

Fallback is for development resilience, not brand equivalence.

## 8. Color system

Ascout is primarily dark-neutral with a controlled signal spectrum.

### Core neutrals

```text
Field Night      #0A0D17
Field Ink        #121728
Graphite         #22283A
Steel            #778096
Mist             #D7DCE6
Paper            #F4F3EC
Pure White       #FFFFFF
```

### Brand signals

```text
Proof Blue       #3867FF
Scan Cyan        #43D4F3
Evidence Lime    #D8F36A
Signal Violet    #8A73FF
```

### Semantic states

```text
Supported        #25C87A
Failed           #FF5964
Warning          #F2B84B
Blocked          #9C7BFF
Unknown          #8A93A6
Not Run          #A7ADB9
```

Semantic color must never be the only state indicator.

Every status also uses:

- icon/glyph;
- word;
- shape or border treatment.

### Evidence Horizon gradient

Brand-only gradient:

```css
linear-gradient(
  180deg,
  #17162A 0%,
  #253D6B 28%,
  #3FBFDE 62%,
  #D8F36A 100%
)
```

Use for:

- hero surfaces;
- launch artwork;
- large empty states;
- motion transitions;
- release graphics.

Do not use the gradient as a PASS/FAIL semantic background.

## 9. The Evidence Field

The secondary identity system is the **Evidence Field**.

Visual structure:

- 8 px base unit;
- 32 px major grid;
- 1 px field lines;
- low-contrast grid on dark or light surfaces;
- selected cells can illuminate;
- trace lines connect observations to claims.

The grid is not decoration.

It means:

```text
scope is bounded
coverage is visible
unknown space remains visible
evidence has coordinates
```

The product should never hide untested/unreviewed regions behind decorative completeness.

## 10. Graphic grammar

### Frame

Right-angle corners indicate exact scope.

Use around:

- selected target;
- active code range;
- browser region;
- runtime/artifact;
- evidence item.

### Scan

A horizontal or vertical scan line means active observation.

Use in motion only.

Do not leave permanent neon scanner lines across dense UI.

### Cell

A square unit represents one evidence atom.

States:

```text
empty     = unknown
outline   = planned
pulse     = running
filled    = observed
crossed   = contradicted
locked    = reconciled
```

### Trace

Thin orthogonal lines connect:

```text
target -> engine -> evidence -> finding -> claim
```

This becomes both brand supergraphic and real product information architecture.

## 11. Motion identity

Ascout motion is procedural, not ornamental.

Canonical sequence:

```text
1. Field appears.
2. Scout Frame defines scope.
3. Scan crosses the scope.
4. Evidence cells activate.
5. Contradictions remain visibly unresolved.
6. Valid evidence converges.
7. Frame locks only when the claim is supported.
```

Never animate an incomplete claim directly into a green check.

Motion timing:

- micro state: 120–180 ms;
- panel transition: 180–260 ms;
- evidence reveal: 240–420 ms;
- brand hero sequence: 1.8–3.5 s.

Prefer linear/precise motion with minimal overshoot.

## 12. Photography and imagery

Avoid generic:

- hooded hackers;
- abstract glowing brains;
- humanoid robots;
- floating code rain;
- stock cybersecurity shields.

Preferred imagery:

- real engineering environments;
- precise macro hardware/software details;
- screens, terminals, lab devices;
- abstract evidence maps;
- human hands operating systems;
- real application states;
- documentary rather than staged imagery.

When imagery is absent, the Evidence Field itself is the visual system.

## 13. Illustration and diagrams

Diagrams should inherit product semantics.

Use:

- orthogonal routes;
- square nodes;
- evidence cells;
- frame corners;
- monospace IDs;
- precise legends.

Avoid rounded "AI blob" diagrams unless the underlying entity is genuinely probabilistic/ambiguous.

## 14. Icon system

24 px default, 1.5 px stroke, square/orthogonal bias.

Core icons:

- Review — annotated page / paired brackets;
- Test — pulse/check lane;
- Security — invariant/lock lattice;
- Cyber — scoped radar aperture;
- Assure — converging evidence cells;
- Evidence — square atom;
- Finding — flagged coordinate;
- Unknown — open cell;
- Contradiction — crossed trace;
- Runtime — terminal/window;
- Lab — bounded container frame.

No filled-color-only status icons.

## 15. Verbal identity

### Voice

Ascout speaks like a principal engineer presenting evidence.

Use:

- short sentences;
- exact nouns;
- measured confidence;
- explicit uncertainty;
- direct next action.

Avoid:

- "magic";
- "100% safe";
- "AI-powered revolution";
- "everything looks good";
- vague green language;
- inflated certainty.

### Good

```text
12 checks ran.
2 did not run.
1 finding blocks the requested claim.
```

### Bad

```text
Everything looks great! Your code appears production-ready.
```

### Brand verbs

```text
verify
observe
challenge
reproduce
trace
bind
reconcile
prove
explain
```

### Brand nouns

```text
target
evidence
finding
coverage
claim
run
trace
scope
lab
runtime
```

## 16. Messaging hierarchy

### Master tagline

**Verify everything AI ships.**

### Positioning line

**The evidence layer for AI-built software.**

### Product promise

**Know what ran. What failed. What was never checked.**

### Campaign lines

- **Prove it before you ship it.**
- **A green check is not evidence.**
- **Trust the trace.**
- **Run the claim.**
- **Test it for real.**
- **What did your AI actually verify?**

## 17. Brand architecture

Ascout is the master brand.

Product modes remain descriptive, not sub-brands:

```text
Ascout Review
Ascout Test
Ascout Security
Ascout Cyber
Ascout Assure
Ascout Lab
```

Do not create separate logos for each mode.

Differentiate modes through:

- icon;
- subtle accent;
- layout;
- active frame label.

## 18. Mode accents

Mode accents are secondary; the core brand remains consistent.

```text
Review      Proof Blue
Test        Scan Cyan
Security    Signal Violet
Cyber       Warning Amber
Assure      Evidence Lime
Lab         Neutral Steel + Scan Cyan
```

A mode accent never replaces semantic status color.

## 19. Accessibility

Minimum:

- WCAG AA text contrast;
- semantic state never communicated only with color;
- focus ring always visible;
- reduced motion support;
- PP Mondwest never used where pixel forms materially reduce reading speed;
- data tables remain readable without brand effects;
- keyboard traversal first-class.

## 20. Brand anti-patterns

Reject:

- generic shield logo;
- copied Abridge split-letter treatment;
- copied AutoScientist gradient composition;
- full-screen pixel font everywhere;
- cyberpunk neon overload;
- green-everywhere dashboards;
- glassmorphism on evidence-dense panels;
- excessive rounded pills;
- decorative charts without truth semantics;
- AI sparkles;
- robot mascots.

## 21. Identity rule in one line

> **Ascout looks like a precise instrument scouting a field of software evidence until a claim can be locked—or honestly left open.**
