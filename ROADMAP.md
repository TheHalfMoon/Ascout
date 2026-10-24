# REA engineering maintenance run

This run is scoped by [the proposed maintenance packet](specs/018-rea-engineering-qualification/spec.md). It does not replace the canonical unified-assurance registry or ratify a new phase.

| Task | State | Spec |
| --- | --- | --- |
| REA-E00 / Task021-T01 native timing repair | prospective bounded HEAD-query plan; clean main92433f7 reproduces2deadline failures in50-case control; no implementation before fresh gates | [plan](specs/021-git-head-query-budget/plan.md) |
| REA-E01 diagnostic accounting | merged (#638), verified main 48902389 | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E02 conservative selection | merged (#639), verified main 23fe4037 | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E03 Stryker producer translation | merged (#640), verified main 36d1e504 | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E04 deterministic browser assertions | merged (#641), verified main4688ecc5 and six post-merge native CI passes; local timing failures retained under E00 | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E05 date-eligible development dependency repair | deferred outside current Spec 018 directive; no implementation | [repair packet](specs/019-source-map-js-repair/spec.md) |
| Task020-T01 Ascout Durable Harness | implemented/reviewed atf8c0825;27new/60focused pass;6native hosted passes; local6legacy deadline failures retained; final-head/canonical close pending | [spec](specs/020-ascout-durable-harness/spec.md) |

Existing applicable canonical, CI, review and exact-head qualification gates remain visible. The 2026-10-21 founder directive authorizes completing Spec 018 and eligible merges when its actual gates pass. UA-P06-specific review/authorization conditions are not automatically applied to independent maintenance. No release readiness claim is made.
