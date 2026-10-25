# REA engineering maintenance run

This run is scoped by [the proposed maintenance packet](specs/018-rea-engineering-qualification/spec.md). It does not replace the canonical unified-assurance registry or ratify a new phase.

| Task | State | Spec |
| --- | --- | --- |
| REA-E00 / Task021-T01 native timing repair | focused task CLOSED_CANONICAL PR643/mainaf5de7d; six actual postmerge native passes; closing evidence remotely verified at1f24cc6; localbrowserFAIL retained; E00BLOCKED | [closing evidence](https://github.com/TheHalfMoon/Ascout/blob/1f24cc68d837145224510d184dbbe10e0c326232/qualification/git-head-query/2026-10-24-closeout/REPORT.md) |
| REA-E01 diagnostic accounting | merged (#638), verified main 48902389 | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E02 conservative selection | merged (#639), verified main 23fe4037 | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E03 Stryker producer translation | merged (#640), verified main 36d1e504 | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E04 deterministic browser assertions | merged (#641), verified main4688ecc5 and six post-merge native CI passes; local timing failures retained under E00 | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E05 / Task022-T01 development dependency repair | focused CLOSED_CANONICAL PR644/main62e588a; six actual postmerge native passes; closing bytes/reviews remotely verified at5da4c23; both localFAILs retained; E00/releaseBLOCKED | [closing record](https://github.com/TheHalfMoon/Ascout/blob/5da4c2362ce4acd130b629b4901def2c59745e98/qualification/development-dependencies/2026-10-25-closeout/REPORT.md) |
| REA-E00 / Task023-T01 combined native index observation | focused CLOSED_CANONICAL PR645/main96c18b3; six actual final-head and six postmerge native passes; closing packet/reviews/receipt remotely verified at1d65483; local T103 FAIL and inner Self FAIL retained; E00/release BLOCKED | [closing record](https://github.com/TheHalfMoon/Ascout/blob/1d65483e0bbe8291bc1ceb6d62285d277dde2355/qualification/git-index-observation/2026-10-25-closeout/REPORT.md) |
| REA-E00 / Task024-T01 browser cleanup ownership | focused CLOSED_CANONICAL PR646/mainfe3064a; six actual final-head and six postmerge native passes, fresh closing reviews and actual core/sidecar readback543eb40 verified; local T107 FAIL and inner Self FAIL/incompleteness retained; E00/release BLOCKED | [closing evidence](qualification/browser-cleanup/2026-10-26-closeout/REPORT.md) |
| Task020-T01 Ascout Durable Harness | CLOSED_CANONICAL PR642/main92433f7; six actual postmerge native suites PASS; closing evidence remotely verified ate4a12b3; historical localFAIL retained | [spec](specs/020-ascout-durable-harness/spec.md) |

Existing applicable canonical, CI, review and exact-head qualification gates remain visible. The 2026-10-21 founder directive authorizes completing Spec 018 and eligible merges when its actual gates pass. UA-P06-specific review/authorization conditions are not automatically applied to independent maintenance. No release readiness claim is made.
