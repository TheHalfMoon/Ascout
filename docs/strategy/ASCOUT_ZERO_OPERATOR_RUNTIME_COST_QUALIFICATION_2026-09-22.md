# Ascout Zero Operator Runtime Cost Qualification Protocol

**Status:** PLANNING_ONLY / FINAL-QUALIFICATION REQUIREMENT  
**Date:** 2026-09-22  
**Planning base:** 25c6dcbd75d62d6e1422bb7681f29c5b2381e5ad

## 1. Claim under test

The claim is narrow and technical:

> Normal Ascout verification does not require Ascout-operated customer runtime infrastructure and does not cause Ascout to fund per-user compute, model inference, browser execution, device execution, worker queues, runtime databases, vector stores, or artifact storage.

This claim does not mean the business has no ordinary expenses.

Payment processing, taxes, domains, code signing, support, legal/accounting, and release hosting are outside this runtime-infrastructure claim.

## 2. Required final state

A qualifying release must establish:

- OPERATOR_HOSTED_COMPUTE_REQUIRED = NO
- OPERATOR_HOSTED_MODEL_REQUIRED = NO
- OPERATOR_HOSTED_BROWSER_REQUIRED = NO
- OPERATOR_HOSTED_DEVICE_FARM_REQUIRED = NO
- OPERATOR_HOSTED_TEST_WORKER_REQUIRED = NO
- OPERATOR_HOSTED_QUEUE_REQUIRED = NO
- OPERATOR_HOSTED_DATABASE_REQUIRED = NO
- OPERATOR_HOSTED_VECTOR_DATABASE_REQUIRED = NO
- OPERATOR_HOSTED_ARTIFACT_STORAGE_REQUIRED = NO
- OPERATOR_PROVIDER_CREDENTIAL_REQUIRED = NO
- MANDATORY_ASCOUT_RUNTIME_API = NO
- MANDATORY_TELEMETRY = NO
- SILENT_PAID_PROVIDER_FALLBACK = NO
- USER_OWNED_COMPUTE_SUPPORTED = YES
- USER_OWNED_STORAGE_SUPPORTED = YES
- OFFLINE_USEFUL_CORE = YES

## 3. What counts as operator runtime infrastructure

The following are disallowed as mandatory customer execution dependencies:

- Ascout-owned API used to plan/execute ordinary verification;
- Ascout-owned model endpoint;
- Ascout-owned GPU/CPU worker;
- Ascout-owned browser farm;
- Ascout-owned Android/iOS device farm;
- Ascout-owned hosted sandbox required for core verification;
- Ascout-owned queue for customer runs;
- Ascout-owned hosted PostgreSQL/SQLite proxy/vector DB for customer runtime state;
- Ascout-owned object storage for evidence/artifacts;
- Ascout-owned secret proxy required for local engines;
- Ascout-owned paid third-party API account used as fallback;
- Ascout-owned always-on license server required for each run.

## 4. Permitted infrastructure

Permitted without violating the claim:

- user's local machine;
- user's local browser;
- user's local emulator/device;
- user's local models;
- user's own GitHub/GitLab/CI resources;
- user's SSH server/VM/Kubernetes environment;
- user's own object store/database when explicitly configured;
- user's own provider API key/account;
- user's paid model/browser/security provider when explicitly selected;
- static release downloads;
- payment/commerce systems;
- optional support/telemetry systems that are not required for verification.

## 5. Clean-machine qualification environments

At least the supported release platforms must run a clean-machine qualification:

- Linux x64;
- macOS arm64 where supported;
- Windows x64.

Each environment starts with:

- no Ascout account session;
- no Ascout runtime service;
- no OpenAI/Anthropic/Google/Jev/TinyFish or other provider API keys;
- no cloud credentials unless the test explicitly targets BYO infrastructure;
- no existing Ascout state except the installed product and fixture;
- telemetry disabled/default state;
- a controlled local repository fixture.

Where a release supports additional architectures, add them explicitly.

## 6. Offline strict qualification

Create an OFFLINE_STRICT lane with all non-loopback network denied after installation.

The lane must prove as applicable:

- Ascout starts;
- doctor works;
- target/source identity resolves;
- local deterministic planner works;
- local evidence store works;
- native test/check capability works;
- locally installed security capability works where part of the tested edition;
- local browser verification works against a localhost fixture where the required browser is already installed;
- local Decision Fabric works when its model/runtime is already installed;
- local evidence inspection works;
- local claim reconciliation works;
- artifacts remain local;
- no attempted hidden cloud fallback converts absence into success.

Capabilities requiring an unavailable local dependency may report UNAVAILABLE/NOT_RUN. The product may still pass the zero-cost architecture gate if the result is truthful and the mandatory core remains useful.

## 7. No-provider-credential lane

Run with common provider credentials absent.

At minimum clear or isolate:

- OpenAI;
- Anthropic;
- Google/Gemini;
- TypeSafe/Jev;
- TinyFish;
- hosted browser providers;
- hosted sandbox providers;
- hosted security scanners;
- other configured remote model/provider credentials.

Expected behavior:

- no crash solely because a remote key is absent unless the user explicitly requested that provider;
- no silent use of an Ascout-owned key;
- no downgrade from required remote evidence to PASS;
- explicit MISSING_CREDENTIAL / PROVIDER_DENIED / UNAVAILABLE / NOT_RUN semantics.

## 8. Cost-contamination adversarial tests

### 8.1 Remote model unavailable

Given:
- a plan can be satisfied by local deterministic/local qualified engines;
- remote provider unavailable.

Require:
- no remote call;
- no Ascout-funded fallback;
- local result remains valid.

### 8.2 Remote provider explicitly required but not funded/configured

Require:
- NOT_RUN / INCOMPLETE / UNAVAILABLE;
- no operator-funded fallback.

### 8.3 Local GPU absent

Require:
- select a qualified CPU/smaller local engine where the policy permits;
- otherwise explicit UNAVAILABLE;
- never silent remote fallback.

### 8.4 Hosted browser unavailable

Require:
- deterministic/local browser path when sufficient;
- otherwise explicit gap;
- never Ascout-funded managed browser.

### 8.5 User budget exhausted

Require:
- stop/refuse future user-funded external effects according to policy;
- preserve completed evidence;
- record budget-caused omission;
- never use operator funds.

### 8.6 Provider key accidentally present

Require:
- mere credential presence does not authorize provider use;
- provider/network/data-egress policy must independently allow it.

## 9. Network-observation proof

The OFFLINE_STRICT lane should capture network evidence using a platform-appropriate qualified mechanism.

At minimum demonstrate:

- loopback traffic may occur for local sidecars/MCP;
- no non-loopback egress is required for the tested offline workflow;
- no telemetry destination is contacted by default;
- no license/entitlement server is contacted by default during the tested run;
- no model/provider endpoint is contacted.

The exact observation mechanism must be recorded per platform. If full process-level attribution is unavailable on a platform, the claim must be scoped to the evidence actually collected.

## 10. Local storage proof

Record all Ascout-owned runtime writes during the qualification fixture.

Prove:

- evidence/artifacts write to documented local paths;
- no mandatory remote object store;
- no mandatory remote database;
- no raw secrets persisted;
- retention limits are honored;
- uninstall/data-delete documentation identifies owned local state.

## 11. Local entitlement proof

If a commercial edition uses subscription entitlement, qualify an offline-verifiable path.

Preferred test:

1. provision a signed entitlement before network isolation;
2. disable all network;
3. launch paid local capability;
4. verify entitlement locally;
5. run the local capability;
6. prove no license-server call;
7. prove evidence truth semantics are unchanged by entitlement state.

Expired/missing entitlement may disable a paid capability, but must produce a truthful feature-availability state.

It must never convert missing verification into PASS.

## 12. Update independence proof

Normal verification must continue when update infrastructure is unreachable.

A release check may use static GitHub Releases or another static channel, but:

- update failure does not break normal local verification;
- update lookup is not required to start;
- installed engine/model identities remain locally inspectable;
- rollback remains available according to release policy.

For air-gapped distribution, document offline package import and signature/digest verification.

## 13. BYOK/user-funded provider proof

For each optional remote provider class:

- user explicitly configures a credential/account;
- Ascout displays/records that execution is remote;
- data-egress class is explicit;
- user monetary-cost ownership is explicit;
- Ascout operator credential is absent;
- disabling/removing the user key makes the provider unavailable rather than switching to an Ascout key.

This applies to Jev, hosted TinyFish, remote model APIs, hosted browser services, remote security scanners, and future providers.

## 14. BYO infrastructure proof

For remote runtimes:

- target belongs to or is configured by the user;
- credentials originate from user-controlled local configuration/secure store;
- Ascout controller does not proxy compute through an operator worker;
- remote artifacts may remain on or transfer from the user-owned runtime according to policy;
- operator infrastructure is not required.

## 15. Telemetry proof

Default state must be telemetry OFF.

Qualification should inspect:

- product configuration default;
- donor telemetry defaults;
- companion processes;
- model runtimes;
- browser/mobile sidecars.

If an admitted donor enables telemetry upstream, the Ascout integration must disable it by default or fail admission.

Optional telemetry must be:
- explicit opt-in;
- documented;
- revocable;
- non-essential to verification.

## 16. Optional-engine absence proof

Remove or disable each optional engine class in turn.

Examples:
- Decider/SemIf/Nimble;
- Jev;
- TinyFish-derived engine;
- Desktop capability;
- ARTEMIS;
- Sentrdel;
- optional remote runtime.

Require:
- registry marks availability honestly;
- planner records omissions;
- unaffected native capabilities continue;
- no crash;
- no weaker fallback preserves a stronger claim.

## 17. Model installation proof

A model-dependent capability must distinguish:

- model/runtime installed;
- model missing;
- wrong revision;
- wrong quantization;
- insufficient hardware;
- incompatible runtime;
- corrupted weights.

No verification run in OFFLINE_STRICT may silently download a missing model.

An explicit install command may use network when the user authorizes it, but installation and verification are separate effects.

## 18. Donor/update supply-chain proof

For each bundled companion/vendor source:

- exact revision;
- digest;
- license/notices;
- dependency identity;
- SBOM where applicable;
- update provenance.

A donor's self-update mechanism must not bypass Ascout qualification.

Auto-updating a qualification-critical companion to "latest" without requalification is prohibited.

## 19. Scale/economics architecture proof

This is an architecture claim, not a load-test claim.

The release documentation must demonstrate that increasing customer count does not inherently require proportional Ascout-operated:

- model tokens;
- browser minutes;
- device minutes;
- worker CPU/GPU;
- runtime database rows;
- artifact bytes;
- vector-index bytes;
- queue messages.

Optional commerce/support systems may scale with customers, but they are outside verification execution and may not be required for run completion.

## 20. Failure conditions

The zero-operator-runtime-cost gate fails if any supported core workflow requires:

- a secret owned by Ascout for customer execution;
- an Ascout-hosted compute worker;
- an Ascout-hosted model request;
- an Ascout-hosted browser/device;
- an Ascout-hosted run database;
- an Ascout-hosted artifact store;
- a mandatory runtime license/API heartbeat;
- a silent paid-provider fallback;
- mandatory telemetry.

## 21. Required evidence bundle

Final release evidence should include:

- release SHA/version;
- platform;
- clean-machine image/fixture identity;
- installed component manifest;
- network policy;
- observed network results;
- provider credential inventory showing absent operator credentials;
- local write/artifact inventory;
- test commands;
- test results;
- optional-engine absence results;
- offline entitlement result where applicable;
- update-independence result;
- negative evidence;
- unavailable evidence;
- reviewer;
- exact release artifact digests.

## 22. Release gate

The final release may state ZERO_OPERATOR_RUNTIME_COST only if:

- all mandatory supported-platform lanes pass;
- no mandatory runtime dependency on operator infrastructure exists;
- optional cloud/provider paths are visibly user-funded/user-owned;
- local/offline core remains useful;
- no silent fallback exists;
- privacy/egress evidence is complete for the tested surfaces.

If evidence is incomplete, the claim remains INCOMPLETE rather than inferred.
