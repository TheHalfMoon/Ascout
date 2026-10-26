# REA-E00 packaging invocation compatibility

Task025 repairs a test-helper compatibility defect: direct Vitest can now execute the unchanged real npm packaging assertions without inherited npm_execpath. The explicit inherited npmCLI route is preserved; fallback uses existing cross-spawn7.0.6 and retains failed process results. All production/package/config/authority and complete case/deadline tail are unchanged.

See [actual qualification](../../qualification/packaging-invocation/2026-10-26/REPORT.md) and [prospective gates/source reviews](../../specs/025-packaging-invocation-compatibility/SOURCE_REVIEWS.md). Direct/npm controls and typing/build passed; owned exit42 remains native failure with original outputs. Complete local suite remains FAIL1:2416passed/12deadline failures/34existing skips/2462cases. No cause or candidate exoneration is proved.

Final integration/publication/CI/Self/governance/canonical/remote qualification remains pending. This is not E00 closure or release readiness. Historical failures/incompleteness, no-admission/UA-P07 and effective repository gates remain intact.
