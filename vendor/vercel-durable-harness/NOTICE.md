# durable-harness attribution

Ascout Durable Harness uses the `safe`/`never` replay vocabulary and stable call/intent/outcome recovery discipline described by Vercel's durable-harness project. Upstream source: https://github.com/vercel-labs/durable-harness, commit `ea8aa4060cf4fb8cd39737ce8ab21c4e0f40c741`, package0.0.1. See PROVENANCE.json for exact source hashes and LICENSE for the unchanged Apache-2.0 terms. No upstream NOTICE file was present in the inspected revision.

The originating article is [Making every harness durable](https://vercel.com/blog/making-every-harness-durable), published2026-10-19, by Pranay Prakash and Eric Dodds. The user explicitly permitted copying and renaming in the2026-10-24 request; the verified Apache license independently governs redistributed code. Upstream attribution is retained.

Changes: Ascout's independently implemented bounded local snapshot store replaces the upstream World/queue/provider runtime. The small replay type is adapted into Ascout naming; Ascout's preexisting workflow/freshness/idempotency contracts govern observations. No upstream engine, provider SDK, cloud sandbox or Workflow dependency is copied or installed. The integration name does not rename the upstream project or imply endorsement or feature parity. This metadata journal does not execute agents or replay their effects.
