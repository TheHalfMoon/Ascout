# Final plan audit and implementation constraints

A fresh independent judge returned PLAN_CLEAR at immutablef0a9da62a06e32fccc29c71d24b9c96ce13c391b, treecf77776c88607cac61354cec1a1a82ceeb715b64, canonical base23abb92c3a37bd936c2d7386aa23ddc9d35a9579. Final original native-timing-plan-audit-f0a9da6.json SHA256a8b554be521de276b01d6b9aefff368082a6c2d34a56afff796b3eab2a1398cf was read/hashed after the final reviewer message. No must-fix findings; all434 frozen entries and16control hashes match. No test/probe/driver/install/project edit or remote action ran in the review.

Four nonblocking constraints govern the concrete implementation and faithfulness review:

1. Spawn visibility covers direct children only. Original fixture Git operations remain execFileSync and count in fixture stage time; nested npm/build descendants have no individually observed lifecycle. Do not change APIs or add interception merely to expand visibility.
2. Delegate exact arguments/options and preserve original return identity, synchronous throws/listeners/completion. Observer listeners cannot throw, consume streams or manufacture close completion. Restore both CommonJS spawn property and synchronized ESM binding in finally; incomplete/changed-contract traces are UNQUALIFIED.
3. Hash captured whole-control streams and fixture commands directly captured by the driver. Original prepareExactHeadRuntime exposes no internal runProcess stream buffers: asynchronous child stdout/stderr hashes must be NOT_OBSERVED with a reason. Never invent empty hashes, attach data listeners, redirect streams or add benchmark exports.
4. UUID/root identities remain in driver memory or an external journal persisted after timed work. Do not add nonignored files, alter tracked fixture trees or move setup outside timing. Label post-timing realpath/existence observations honestly; preserve failed roots without guessed cleanup.

These constraints apply the existing bounded plan; they grant no repair authority or additional capture surface. Fresh different exact-head consistency/purity and bounded direct-user-derived authority remain required before driver/probes, followed by concrete faithfulness review before native measurements. Shared OpenAI lineage is not provider-independent certification; PLAN_CLEAR grants no execution, merge or release authority. E00/release BLOCKED.
