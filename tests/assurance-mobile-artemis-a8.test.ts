import { describe, expect, it } from "vitest";

import { canonicalAssuranceSha256V1 } from "../src/assurance/contracts/canonical-serialization.js";
import {
  applyRetentionV1,
  buildDiagnosticReportV1,
  buildTimelineV1,
  correlateLogcatWindowV1,
} from "../src/assurance/engines/mobile-artemis/diagnostics.js";
import type { LogcatEntryV1 } from "../src/assurance/engines/mobile-artemis/evidence.js";

function logcatEntry(time: string, priority: string): LogcatEntryV1 {
  return {
    date: "09-22",
    time,
    pid: 1000,
    tid: 2000,
    priority,
    tag: "Tag",
    message: "msg",
  };
}

describe("ARTEMIS-A8 recording timeline", () => {
  it("accepts ordered events and refuses disorder", () => {
    const timeline = buildTimelineV1([
      { event_id: "e1", at_step: 0, kind: "observation", ref: "a:1" },
      { event_id: "e2", at_step: 0, kind: "action", ref: "a:2" },
      { event_id: "e3", at_step: 1, kind: "checkpoint", ref: "a:3" },
    ]);
    expect(timeline.ok).toBe(true);
    if (timeline.ok) expect(timeline.value).toHaveLength(3);

    const disordered = buildTimelineV1([
      { event_id: "e1", at_step: 2, kind: "observation", ref: "a:1" },
      { event_id: "e2", at_step: 1, kind: "action", ref: "a:2" },
    ]);
    expect(disordered.ok).toBe(false);

    expect(
      buildTimelineV1([{ event_id: "e1", at_step: 0, kind: "teleport", ref: "a:1" }]).ok,
    ).toBe(false);
    expect(
      buildTimelineV1([{ event_id: "e1", at_step: 0, kind: "action", ref: "a:1", extra: 1 }]).ok,
    ).toBe(false);
  });
});

describe("ARTEMIS-A8 logcat correlation", () => {
  it("selects windows with counts and truncation flags", () => {
    const entries = [
      logcatEntry("14:00:01.000", "I"),
      logcatEntry("14:00:02.000", "E"),
      logcatEntry("14:00:03.000", "E"),
      logcatEntry("14:00:09.000", "W"),
    ];
    const window = correlateLogcatWindowV1(entries, "14:00:01.000", "14:00:03.000");
    expect(window.ok).toBe(true);
    if (!window.ok) return;
    expect(window.value.entries).toHaveLength(3);
    expect(window.value.counts).toEqual({ V: 0, D: 0, I: 1, W: 0, E: 2, F: 0 });
    expect(window.value.truncated).toBe(false);

    expect(correlateLogcatWindowV1(entries, "14:00:05.000", "14:00:01.000").ok).toBe(false);
    expect(correlateLogcatWindowV1(entries, "nope", "14:00:01.000").ok).toBe(false);
  });
});

describe("ARTEMIS-A8 bounded retention", () => {
  it("evicts oldest-first with exact accounting", () => {
    const artifacts = [
      { artifact_id: "a:1", byte_length: 100 },
      { artifact_id: "a:2", byte_length: 100 },
      { artifact_id: "a:3", byte_length: 100 },
    ];
    const retained = applyRetentionV1(artifacts, 250, 10);
    expect(retained.ok).toBe(true);
    if (!retained.ok) return;
    expect(retained.value.kept).toEqual(["a:2", "a:3"]);
    expect(retained.value.evicted).toEqual(["a:1"]);
    expect(retained.value.kept_bytes).toBe(200);

    const counted = applyRetentionV1(artifacts, 100000, 2);
    expect(counted.ok).toBe(true);
    if (counted.ok) {
      expect(counted.value.kept).toEqual(["a:2", "a:3"]);
      expect(counted.value.evicted).toEqual(["a:1"]);
    }
    expect(applyRetentionV1([{ artifact_id: "a:1" }], 100, 10).ok).toBe(false);
    expect(applyRetentionV1(artifacts, 0, 10).ok).toBe(false);
  });
});

describe("ARTEMIS-A8 diagnostic report", () => {
  it("binds frozen reports with digests and retention", () => {
    const timeline = buildTimelineV1([
      { event_id: "e1", at_step: 0, kind: "observation", ref: "a:1" },
    ]);
    expect(timeline.ok).toBe(true);
    if (!timeline.ok) return;
    const correlation = correlateLogcatWindowV1(
      [logcatEntry("14:00:01.000", "I")],
      "14:00:00.000",
      "14:00:02.000",
    );
    expect(correlation.ok).toBe(true);
    if (!correlation.ok) return;
    const retention = applyRetentionV1([{ artifact_id: "a:1", byte_length: 33 }], 1000, 10);
    expect(retention.ok).toBe(true);
    if (!retention.ok) return;

    const report = buildDiagnosticReportV1({
      run_id: "run:diag-1",
      completion_state: "INCOMPLETE",
      timeline: timeline.value,
      logcat: correlation.value,
      artifacts: [
        { artifact_id: "a:1", kind: "screenshot", sha256: "a".repeat(64), byte_length: 33 },
      ],
      retention: retention.value,
    });
    expect(report.ok).toBe(true);
    if (!report.ok) return;
    expect(report.value.protocol_version).toBe(1);
    expect(report.value.event_count).toBe(1);
    expect(report.value.logcat_entries).toBe(1);
    expect(report.value.timeline_digest).toBe(
      canonicalAssuranceSha256V1(timeline.value),
    );
    expect(Object.isFrozen(report.value)).toBe(true);

    expect(
      buildDiagnosticReportV1({
        run_id: "run:diag-1",
        completion_state: "GREEN",
        timeline: timeline.value,
        logcat: correlation.value,
        artifacts: [],
        retention: retention.value,
      }).ok,
    ).toBe(false);
  });
});
