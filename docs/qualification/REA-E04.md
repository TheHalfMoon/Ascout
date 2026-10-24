# REA-E04: literal browser text assertion qualification

Base: `ea93553a5423fd47f12a6bf282820dd199b994d4`.
Branch: `ps/rea-browser-assertions`. Bounded local maintenance candidate;
canonical scope admission, required external review, platform/CI gates,
complete native suite qualification and merge remain pending.

The additive executor request and Playwright runtime method support only
literal exact target `textContent` equality. They reuse the existing
resolver, text-read primitive, session/source binding, assertion envelope
and disposal. Existing free-text requests remain unchanged and unsupported
DOM statements remain unavailable. There is no predicate parser, new CLI,
dependency, provider, external target, or donor implementation code.

Tests were added before the implementation. The RED run of the two new
files recorded six failures and two passes: the new factory and runtime
method did not exist. The first GREEN run recorded eight passing tests.
The original RED capture is retained outside the checkout and is not
replaced by the later successful evidence.

The owned inline loopback fixture exercises exact multiline/whitespace
text, empty text, code-looking literals, wrong text/case/whitespace,
role/name selector delegation, an actual broken UI route, retained failure
observations after a later successful request, removed/expired targets,
ambiguous and invalid selectors, missing targets, resolver deadline
overrun, a partially consumed shared read budget, foreign session/source,
malformed runtime requests, unsupported free text, in-flight disposal,
idempotent cleanup and disposed reuse. Tests launch actual installed
`playwright@1.63.0` Chromium revision 1243, without model or external-site
requests. The prior donor research is not rerun or claimed as fresh proof.

Local commands use isolated `npm ci --ignore-scripts --no-audit --no-fund`
dependencies. Build and typecheck are standard package scripts; focused
tests run with `npx vitest run tests/browser-text-assertion.contract.test.ts
tests/browser-text-assertion.integration.test.ts`. The relevant existing
browser regression surface runs with `npx vitest run browser
--fileParallelism=false`. Exact committed-source outcomes, command list,
test/fixture hashes and raw RED/GREEN/build/typecheck/browser captures are
retained in the sibling `phase-e04/` evidence directory. Full-suite controls
are coordinated separately by the session orchestrator; this task does
not run a competing full suite.

Limits: equality is one observed DOM read, without visibility checking or
retry-until-match. Synchronous resolver callbacks cannot be interrupted;
their elapsed time is deducted and an overrun cannot pass. Empty evidence
references and null oracle references remain explicit; local success does
not attest an oracle, task-wide coverage or release readiness. Each request
has its own request identity; this API adds no durable attempt/retry ledger.
Same-model
fresh-context local review cannot satisfy provider-independent review.
No push, pull request, merge, deployment or publication is performed by
this builder.
