# REA engineering maintenance run

This run is scoped by [the proposed maintenance packet](specs/018-rea-engineering-qualification/spec.md). It does not replace the canonical unified-assurance registry or ratify a new phase.

| Task | State | Spec |
| --- | --- | --- |
| REA-E00 / Task021-T01 native timing repair | focused task CLOSED_CANONICAL PR643/mainaf5de7d; six actual postmerge native passes; closing evidence remotely verified at1f24cc6; localbrowserFAIL retained; E00BLOCKED | [closing evidence](https://github.com/TheHalfMoon/Ascout/blob/1f24cc68d837145224510d184dbbe10e0c326232/qualification/git-head-query/2026-10-24-closeout/REPORT.md) |
| REA-E01 diagnostic accounting | merged (#638), verified main 48902389 | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E02 conservative selection | merged (#639), verified main 23fe4037 | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E03 Stryker producer translation | merged (#640), verified main 36d1e504 | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E04 deterministic browser assertions | merged (#641), verified main4688ecc5 and six post-merge native CI passes; local timing failures retained under E00 | [tasks](specs/018-rea-engineering-qualification/tasks.md) |
| REA-E05 / Task022-T01 development dependency repair | focused PR644 merged/main62e588a; six actual postmerge native suites PASS; closing publication/readback pending; both localFAILs retained; E00/releaseBLOCKED | [qualification](docs/qualification/REA-E05.md) |
| Task020-T01 Ascout Durable Harness | CLOSED_CANONICAL PR642/main92433f7; six actual postmerge native suites PASS; closing evidence remotely verified ate4a12b3; historical localFAIL retained | [spec](specs/020-ascout-durable-harness/spec.md) |

Existing applicable canonical, CI, review and exact-head qualification gates remain visible. The 2026-10-21 founder directive authorizes completing Spec 018 and eligible merges when its actual gates pass. UA-P06-specific review/authorization conditions are not automatically applied to independent maintenance. No release readiness claim is made.
