# Spec 016 Sources and Provenance

**Status:** `PLANNING_ONLY`
**Planning ledger:** Issue #342
**Research date:** 2026-09-14

## 1. Source policy

Research evidence and source reuse are separate decisions.

A public capability may inform design without authorizing code import. Founder permission may authorize consideration of proprietary/private source, but Ascout still requires an exact source snapshot, permission artifact, component inventory, third-party notices, dependency/security review and provenance map before tracked donor code enters the repository.

## 2. Playwright

Repository:

`https://github.com/microsoft/playwright`

Observed planning pin:

`d1ead3ecca23182f2d06d761c28e3d4edafb6595`

Observed top-level license:

`Apache-2.0`

Observed NOTICE:

Playwright copyright Microsoft Corporation; NOTICE states the software contains code derived from Puppeteer, available under Apache-2.0.

Primary public references:

- `https://playwright.dev/docs/locators`
- `https://playwright.dev/docs/trace-viewer`
- `https://playwright.dev/docs/test-agents`
- `https://playwright.dev/docs/test-retries`
- `https://playwright.dev/docs/browser-contexts`
- `https://github.com/microsoft/playwright/blob/main/LICENSE`
- `https://github.com/microsoft/playwright/blob/main/NOTICE`

Planning observations:

- mature browser execution is a native capability Ascout should adapt rather than reimplement;
- locators prioritize user-facing/accessibility semantics;
- Trace Viewer preserves post-run debugging evidence;
- Playwright has planner/generator/healer test agents and supports OpenCode agent loops;
- browser retries distinguish flaky outcomes from stable pass in Playwright Test semantics.

Disposition:

`QUALIFIED_AS_PUBLIC_DESIGN_AND_DEPENDENCY_CANDIDATE`

No source copy is authorized by this planning package. At implementation authorization, pin the actual package version and verify package-level license/NOTICE/dependency metadata. Selective source reuse requires component-level attribution and modified-file notices where Apache-2.0 requires them.

## 3. Momentic

Public product/documentation roots:

- `https://momentic.ai/`
- `https://momentic.ai/docs`
- `https://momentic.ai/docs/get-started/how-momentic-works`
- `https://momentic.ai/docs/core-concepts/agentic-testing`
- `https://momentic.ai/docs/core-concepts/finding-elements`
- `https://momentic.ai/docs/configuration/ai`
- `https://momentic.ai/docs/reference/commands/assert`
- `https://momentic.ai/docs/reference/commands/assert-visually`
- `https://momentic.ai/docs/cli-reference/momentic/overview`
- `https://momentic.ai/docs/cli-reference/momentic-mobile/commands/mcp`
- `https://momentic.ai/blog/failure-recovery`

Publicly documented capability observations:

- natural-language action/intent over browser or emulator;
- DOM, accessibility tree and screenshot context;
- multi-modal locator/step caching and cache bypass controls;
- auto-heal / failure recovery;
- agentic action with explicit pre/post-condition support in newer agent versions;
- AI assertions and screenshot-only visual assertions;
- failure classification and analysis;
- CLI and MCP surfaces;
- web plus iOS/Android product surfaces;
- run visibility including traces/videos/network/recovery information.

Founder attestation:

The founder states that permission exists to copy all Momentic source code.

Current evidence limitation:

The exact source snapshot and written permission artifact are not available in the repository/tool evidence used for this planning package. Therefore this package MUST NOT claim that Momentic source has been audited or imported.

Disposition:

`FOUNDER_AUTHORIZED_DONOR_CANDIDATE / SOURCE_IMPORT_BLOCKED_PENDING_PROVENANCE`

Before source reuse, require:

```text
permission_artifact
exact_source_snapshot_or_commit
component_inventory
copyright_inventory
third_party_license_inventory
NOTICE_or_equivalent_obligations
dependency_lock_inventory
security_review
component_level_provenance_map
modification_boundary
```

## 4. Donor strategy

Use the following order:

```text
PUBLIC_API_DEPENDENCY
-> INTERNAL_ADAPTER
-> DESIGN_ADAPTATION
-> SELECTIVE_COMPONENT_REUSE
-> FORK
```

Move right only when measured evidence shows the earlier option cannot satisfy Ascout's truth contract.

## 5. What must not be copied blindly

Even with permission, do not wholesale-import:

- hosted control-plane code not needed by local-first Ascout;
- telemetry/account/billing infrastructure;
- broad browser-engine maintenance code already provided by Playwright;
- caches/memory that can silently transfer authority across source states;
- recovery logic that hides the original failing evidence;
- proprietary test formats that would lock Ascout's canonical data model to one donor.

## 6. Standards and secondary references

Potential later method references include W3C accessibility semantics, WebDriver/BiDi specifications, OWASP testing guidance and OpenTelemetry conventions. They remain reference material and require rights/fit review before any copied text or rules enter tracked artifacts.

## 7. Provenance invariant

For every donor-derived tracked component, Ascout must be able to answer:

```text
Where did this code/design originate?
What exact version/source was used?
Under what permission/license?
What third-party obligations transitively apply?
What did Ascout change?
Why was reuse necessary instead of a dependency/adapter?
Which benchmark gap justified it?
```

If any answer is unavailable, import is blocked.

```text
PLAYWRIGHT_PUBLIC_LICENSE = APACHE_2_0
PLAYWRIGHT_NOTICE_REQUIRED_IF_RELEVANT_DERIVATIVE_CODE_DISTRIBUTED = YES
MOMENTIC_FOUNDER_PERMISSION_ATTESTED = YES
MOMENTIC_SOURCE_PROVENANCE_COMPLETE = NO
DONOR_CODE_IMPORT_AUTHORIZED_BY_THIS_PLAN = NO
```