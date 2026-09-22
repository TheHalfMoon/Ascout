import { describe, expect, it } from "vitest";

import {
  buildQualificationMatrixV1,
  probeHostCapabilitiesV1,
  recordQualificationCellV1,
  summarizeMatrixV1,
} from "../src/assurance/engines/mobile-artemis/qualification.js";

function hostCell(os: string, arch: string, state: string) {
  return {
    host_os: os,
    host_arch: arch,
    device_target: "EMULATOR",
    backend: "ACCESSIBILITY_HELPER",
    state,
    evidence_refs: state === "PASS" ? ["evidence:host-lane"] : [],
    reason: state === "NOT_RUN" ? "no emulator under CI authority" : "",
  };
}

describe("ARTEMIS-A12 matrix honesty gates", () => {
  it("refuses evidence-free PASS, reason-free NOT_RUN, and duplicates", () => {
    const matrix = buildQualificationMatrixV1([
      hostCell("linux", "x64", "PASS"),
      {
        host_os: "windows",
        host_arch: "x64",
        device_target: "PHYSICAL_ANDROID",
        backend: "UIAUTOMATOR",
        state: "NOT_RUN",
        evidence_refs: [],
        reason: "no physical device provisioned",
      },
    ]);
    expect(matrix.ok).toBe(true);
    if (!matrix.ok) return;
    expect(matrix.value.cells).toHaveLength(2);

    expect(buildQualificationMatrixV1([hostCell("linux", "x64", "PASS")]).ok).toBe(true);
    const noEvidence = {
      ...hostCell("linux", "x64", "PASS"),
      host_arch: "arm64",
      evidence_refs: [],
    };
    expect(buildQualificationMatrixV1([noEvidence]).ok).toBe(false);

    const noReason = {
      host_os: "darwin",
      host_arch: "arm64",
      device_target: "EMULATOR",
      backend: "UIAUTOMATOR",
      state: "NOT_RUN",
      evidence_refs: [],
      reason: "",
    };
    expect(buildQualificationMatrixV1([noReason]).ok).toBe(false);

    expect(
      buildQualificationMatrixV1([hostCell("linux", "x64", "PASS"), hostCell("linux", "x64", "PASS")]).ok,
    ).toBe(false);
    expect(buildQualificationMatrixV1([{ odd: 1 }]).ok).toBe(false);
  });

  it("appends without silent overwrite and summarizes readiness", () => {
    const empty = buildQualificationMatrixV1([]);
    expect(empty.ok).toBe(true);
    if (!empty.ok) return;
    const one = recordQualificationCellV1(empty.value, hostCell("linux", "x64", "PASS"));
    expect(one.ok).toBe(true);
    if (!one.ok) return;
    expect(recordQualificationCellV1(one.value, hostCell("linux", "x64", "PASS")).ok).toBe(false);

    const pending = recordQualificationCellV1(
      one.value,
      hostCell("darwin", "arm64", "NOT_RUN"),
    );
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;
    const summary = summarizeMatrixV1(pending.value);
    expect(summary.total).toBe(2);
    expect(summary.by_state["PASS"]).toBe(1);
    expect(summary.by_state["NOT_RUN"]).toBe(1);
    expect(summary.ready).toBe(false);

    const decided = recordQualificationCellV1(
      one.value,
      {
        host_os: "darwin",
        host_arch: "arm64",
        device_target: "EMULATOR",
        backend: "UIAUTOMATOR",
        state: "BLOCKED",
        evidence_refs: [],
        reason: "helper backend absent on this host",
      },
    );
    expect(decided.ok).toBe(true);
    if (!decided.ok) return;
    expect(summarizeMatrixV1(decided.value).ready).toBe(true);
  });
});

describe("ARTEMIS-A12 live host capabilities", () => {
  it("reports the real lane without side effects", () => {
    const host = probeHostCapabilitiesV1();
    expect(host.host_os).toBe(process.platform);
    expect(host.host_arch).toBe(process.arch);
    expect(host.node_version).toBe(process.version);
    expect(host.node_version.startsWith("v")).toBe(true);
  });
});
