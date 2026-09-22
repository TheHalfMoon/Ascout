# Ascout × ARTEMIS Full Integration Master Plan

Status: IMPLEMENTATION_READY / DONOR_NOT_YET_IMPORTED
Planning base: Ascout main @ e10130fc29b4a8d2030fdb0278620a5248bb875a
ARTEMIS donor: google/artemis @ 371aa6df56880643da57b30da936e9812fb0ec66

## 1. Objective

Integrate the full reusable capability surface of Google's ARTEMIS into Ascout without weakening Ascout's evidence-first trust model.
Ascout remains the authority for intent, policy, effect ceilings, engine registration, phase authority, execution admission, evidence binding, receipts, provenance, completeness, refusal, review, and release governance.
ARTEMIS contributes bounded mobile-device implementation capabilities behind that authority.

## 2. Product outcome

A user can operate Review, Test, Security, Cyber, Mobile/Device Reality, Assure, and Lab through one Ascout evidence model.
For Android targets, Ascout can support natural-language scenarios, explicit test cases, exploratory testing, accessibility inspection, vision fallback, screenshots, video/replay, Logcat diagnostics, crash/dialog detection, checkpoint assertions, long-horizon workflows, and structured mobile evidence.

## 3. Architecture

Mandatory layering:
1. Ascout governance and assurance kernel.
2. Mobile Assurance Adapter.
3. ARTEMIS compatibility boundary.
4. Pinned ARTEMIS donor snapshot and isolated Python sidecar.
5. Android device or emulator.

ARTEMIS internals must not be merged directly into src/assurance/kernel and must not silently inherit authority.

## 4. Repository shape

Planned components:
- vendor/google-artemis/** — exact immutable donor snapshot
- src/assurance/engines/mobile-artemis/** — TypeScript descriptor, authority, adapter, receipts, redaction, artifacts
- python/ascout_mobile_bridge/** — isolated Python 3.12 sidecar
- schemas/mobile-artemis/** — versioned request/event/result/artifact schemas
- tests/assurance-mobile-artemis-*.test.ts — governance/adapter/evidence qualification
- docs/mobile/** — architecture, trust boundary, setup, privacy, evidence and troubleshooting

## 5. Donor intake

Import the entire donor repository at exactly 371aa6df56880643da57b30da936e9812fb0ec66.
Preserve upstream license and copyright notices.
No production path may depend on google/artemis/main or any floating ref.
Future ARTEMIS updates are explicit old-SHA -> new-SHA donor-delta tasks with provenance, license, behavior, security and compatibility review.

## 6. Capability inventory

The implementation backlog must account for the entire reusable donor surface, including:
- Android drivers and ADB interaction
- UI hierarchy providers and accessibility helper
- UIAutomator fallback
- screenshot, OCR, image and video processing
- multimodal locating and coordinate fallback
- fast action sequences
- Flash reactive profile
- Pro planner/operator/checker profile
- pre-action safety checks
- incident and recovery handling
- session transcript/history compression
- history search and replay
- video analyzer
- Logcat diagnostics
- MCP server concepts and tools
- Python SDK/client
- device lifecycle and task state
- web console concepts
- structured results and donor tests/configuration

Nothing is silently dropped. A capability may be preserved-but-disabled when it is not admitted.

## 7. Explicitly disabled by default

Source presence does not activate:
- automatic toolchain/system installation
- automatic dependency installation
- global MCP installation
- IDE/global rule mutation
- unrestricted shell or ADB shell
- cloud integrations
- telemetry/PostHog
- external model providers
- credential discovery
- unrestricted outbound network
- automatic app install/uninstall
- long-running monitoring without bounded intent
- externally exposed web server

## 8. Runtime protocol

Use an isolated Python sidecar over a strict versioned stdio or local RPC protocol.
Every request binds Ascout run ID, source digest, engine descriptor, ARTEMIS donor SHA, device target, app target when known, scenario/test identity, effect classes, action ceiling, time/step budget, artifact policy, network policy, shell/ADB policy, model/provider policy and redaction policy.
Every result returns explicit completion state, unverified scope, attempted/blocked actions, checkpoints, final review, artifact references, Logcat references, device facts, timing, truncation/redaction facts, and exact source/donor/protocol bindings.

## 9. Evidence semantics

Mobile verification must never collapse to a boolean.
Canonical states: PASS, FAIL, BLOCKED, INCOMPLETE, INCONCLUSIVE, REFUSED, ERROR, NOT_RUN, STALE, UNKNOWN.
Evidence classes include hierarchy snapshots, screenshots, target crops, recording segments, Logcat excerpts, app/process state, package/version facts, requested actions, actual action results, pre-action observations, checkpoint observations, final-goal observations, replay pointers, and timing samples.

## 10. Device/source binding

Receipts bind both repository source and device context, including source start/end digests, run ID, engine descriptor digest, ARTEMIS SHA, bridge protocol, privacy-safe device identity, model/API level, screen geometry, target package/version, APK digest when available, installation observation and execution timestamps.
Raw device serial persistence is prohibited by default; use a privacy-safe hash unless explicitly required.

## 11. Model/provider governance

ARTEMIS provider defaults are not inherited.
Policy must explicitly control provider allow/deny, model allowlist, local-only mode, screenshot/source upload permission, retention assumptions, credential source, spend/token/time ceilings and fallback.
No provider fallback is silent. Zero-cost/local policy may refuse if no admitted local model/provider exists.

## 12. Network governance

Every run uses an explicit network mode: DENY_ALL, DEVICE_ONLY, LOCALHOST_ONLY, ALLOWLIST, or UNRESTRICTED_EXPLICIT.
Qualification defaults fail-closed. Every network-needing action declares its requirement before execution.

## 13. ADB/effect governance

Split authority into DEVICE_READ, DEVICE_INPUT, APP_LAUNCH, APP_INSTALL, APP_UNINSTALL, FILE_PUSH, FILE_PULL, LOGCAT_READ, SCREEN_CAPTURE, SCREEN_RECORD, ADB_SHELL_READ, ADB_SHELL_MUTATE and DEVICE_SETTINGS_MUTATE.
A scenario receives the minimum required set. Generic unrestricted ADB shell is never implied by mobile testing.

## 14. Safety precedence

ARTEMIS safety checks become evidence, not authority.
Before an action, Ascout evaluates intent ceiling, policy ceiling, descriptor ceiling, phase authority, device policy, scenario policy, then optional donor safety result.
An ARTEMIS safe classification can never override an Ascout refusal.

## 15. Privacy and secrets

- Disable donor telemetry by default.
- Never persist API keys.
- Hash device serials by default.
- Treat screenshots/video as potentially sensitive.
- Keep mobile artifacts local by default with bounded retention.
- Record external-provider screenshot transfer.
- Redact configured secrets and report redaction/truncation.
- Prevent runtime evidence from being committed accidentally.
- Refuse unknown telemetry destinations.

## 16. Dependency strategy

Do not inject ARTEMIS Python dependencies into the Node runtime.
Node/TypeScript Ascout communicates with an isolated Python 3.12 environment.
Qualification pins the Python dependency graph and exact versions/hashes before release admission.

## 17. Installation boundaries

Separate donor source presence, Python dependency installation, helper installation, target APK installation, MCP registration and IDE rule installation.
Only donor source presence belongs to A0. Every other mutation needs explicit command authority and evidence.

## 18. MCP and CLI

Expose Ascout-owned MCP tools rather than the donor namespace directly: mobile doctor, devices, run, status, cancel, evidence, replay and diagnose.
Planned CLI family: ascout mobile doctor/devices/check/explore/replay/diagnose.
Do not freeze CLI surface before protocol and receipt contracts are frozen.

## 19. Product UI

Mobile is an execution target/dimension inside the frozen Review/Test/Security/Cyber/Assure/Lab IA.
UI must show target device/app, run status, current step, blocked action, screenshot, replay timeline, checkpoints, unverified scope and current provider/network authority.
Incomplete verification must never look complete.

## 20. Test plan

Contract: schemas, version negotiation, malformed/unknown fields and artifact refs.
Authority: denied network/shell/install/provider, descriptor mismatch, stale donor/policy/registry, phase ceiling violation.
Adapter: Python missing/wrong version, donor missing/digest mismatch, ADB missing, no/multiple devices, disconnect, helper unavailable, UIAutomator fallback, sidecar crash, timeout, cancellation.
Evidence: screenshot hashing, video/logcat references, truncation, secret redaction, device privacy, retention, stale replay, incomplete evidence.
Real-device: emulator plus physical Android device, API-level coverage, Linux/macOS/Windows hosts, helper backend and UIAutomator fallback.
Unavailable matrix cells remain unavailable, never synthesized green.

## 21. Benchmark plan

Create an Ascout-owned mobile corpus using permitted AndroidWorld tasks plus deterministic fixture apps and synthetic edge cases for Compose, Flutter, Canvas, overlays, permission dialogs, crash dialogs, dynamic lists, transient controls, deep navigation, background/foreground, offline behavior and restarts.
Measure task completion, checkpoint correctness, false-pass rate, blocked-action correctness, locator success, recovery success, evidence completeness, step latency, timeout rate and reproducibility.
Do not inherit ARTEMIS benchmark claims as Ascout claims without independent replay.

## 22. Security qualification

Before activation perform dependency vulnerability review, secret scan, telemetry audit, outbound-host audit, subprocess/shell/ADB inventory, file-write inventory, global-config mutation inventory, server-bind audit, path traversal tests, protocol fuzzing, cancellation/timeouts, malformed model-output tests and untrusted-device-data tests.

## 23. Cross-platform qualification

Minimum host matrix: Linux x64, macOS arm64, Windows x64.
Each proves Python 3.12 bridge startup, ADB discovery, device selection, screenshot, Logcat, cancellation, artifact persistence and clean shutdown.

## 24. Implementation phases

A0 — Import exact donor snapshot, preserve notices, add donor manifest, prove snapshot identity; no runtime activation.
A1 — Freeze mobile engine descriptor, effect classes, versioned protocol and evidence/result contracts.
A2 — Sidecar availability: validate Python, donor SHA, ADB and device enumeration without mutation.
A3 — Read-only evidence: screenshot, hierarchy, metadata and Logcat.
A4 — Bounded input: tap/type/swipe/back/home/app launch under explicit ceilings.
A5 — Locator integration: accessibility-first, OCR/vision/coordinate fallback with evidence.
A6 — Flash profile with step/time budgets, history compression and replay.
A7 — Pro profile with planner/operator/checker, checkpoints, final review and recovery.
A8 — Diagnostics/replay: recording, video analysis, Logcat correlation and artifact budgets.
A9 — Ascout MCP and CLI surfaces.
A10 — Product UI/Lab integration.
A11 — Network/provider/privacy/security hardening.
A12 — Linux/macOS/Windows + emulator/physical-device qualification.
A13 — Release admission: provenance, dependencies, docs, clean checkout, exact-head Alibaba Open Code Review and fresh-main verification.

## 25. Review/evidence record

Every implementation leaf preserves BASE_SHA, HEAD_SHA, CHANGED_PATHS, DONOR_SHA, PROTOCOL_VERSION, ENGINE_DESCRIPTOR_DIGEST, TEST_COMMANDS, TEST_RESULTS, NEGATIVE_EVIDENCE, CODE_PROVENANCE, REVIEW_RESULT, REVIEW_REPAIRS and POST_REPAIR_REVIEW.
Alibaba Open Code Review is the required code-review engine where phase authority permits it; it does not replace canonical tests or runtime qualification.

## 26. Rollback

Mobile capability is additive. Rollback is possible by disabling the engine descriptor/mobile authority and sidecar activation while leaving donor source inert and historical receipts intact.
A broken mobile integration must never break ordinary Ascout verification.

## 27. Definition of done

Complete means: immutable donor snapshot imported; provenance complete; no floating upstream dependency; fail-closed mobile authority; isolated Python sidecar; governed network/model/ADB effects; screenshots/video/Logcat as first-class evidence; bounded Flash/Pro; Ascout-governed MCP/CLI/UI; telemetry disabled by default; host/device qualification explicit; donor benchmark claims independently replayed before reuse; negative evidence visible; Alibaba Open Code Review on exact heads where authorized; release-complete notices/dependency ledger; clean-checkout qualification; no regressions in existing verification.

## 28. Current frontier

PLAN_COMPLETE = YES
ARCHITECTURE_DECIDED = YES
DONOR_SHA_PINNED = YES
LICENSE_COMPATIBILITY_IDENTIFIED = YES
PROVENANCE_TEMPLATE_READY = YES
CAPABILITY_INVENTORY_READY = YES
AUTHORITY_MODEL_READY = YES
EVIDENCE_MODEL_READY = YES
SECURITY_PLAN_READY = YES
PRIVACY_PLAN_READY = YES
TEST_PLAN_READY = YES
BENCHMARK_PLAN_READY = YES
CROSS_PLATFORM_PLAN_READY = YES
ROLLBACK_PLAN_READY = YES
FULL_DONOR_COPY = NOT_YET_EXECUTED
IMPLEMENTATION = NOT_YET_STARTED
RUNTIME_AUTHORITY = NOT_GRANTED

Next canonical leaf: A0 — import and verify the exact donor snapshot without enabling runtime execution.