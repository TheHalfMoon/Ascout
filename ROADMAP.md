# REA engineering maintenance run

This run is scoped by [the proposed maintenance packet](specs/018-rea-engineering-qualification/spec.md). It does not replace the canonical unified-assurance registry or ratify a new phase.

| Task | State | Spec |
| --- | --- | --- |
| REA-E00 native timeout diagnosis | local control complete; historical attribution limited | [plan](specs/018-rea-engineering-qualification/plan.md) |
| REA-E01 diagnostic accounting | merged (#638), verified main 48902389 | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E02 conservative selection | built/reviewed; hosted suites pass; local timeout investigation and main sync pending (#639) | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E03 Stryker producer translation | current-head native suites and 7/7 checks pass; close metadata refresh pending (#640) | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E04 deterministic browser assertions | current-head native suites, reviews and TesterArmy controls pass; eligible close pending (#641) | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E05 date-eligible development dependency repair | deferred outside current Spec 018 directive; no implementation | [repair packet](specs/019-source-map-js-repair/spec.md) |

Existing applicable canonical, CI, review and exact-head qualification gates remain visible. The 2026-10-21 founder directive authorizes completing Spec 018 and eligible merges when its actual gates pass. UA-P06-specific review/authorization conditions are not automatically applied to independent maintenance. No release readiness claim is made.
