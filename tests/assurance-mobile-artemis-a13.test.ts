import { describe, expect, it } from "vitest";

import {
  admitReleaseV1,
  RELEASE_PHASES,
} from "../src/assurance/engines/mobile-artemis/release.js";
import { MOBILE_ARTEMIS_DONOR_SHA } from "../src/assurance/engines/mobile-artemis/descriptor.js";

function candidate(overrides: Record<string, unknown> = {}) {
  const closeouts: Record<string, unknown> = {};
  for (const phase of RELEASE_PHASES) {
    closeouts[phase] = "issue:" + phase + "-closeout";
  }
  return {
    donor_sha: MOBILE_ARTEMIS_DONOR_SHA,
    provenance_ref: "provenance:artemis-a0-371aa6df56880643da57b30da936e9812fb0ec66",
    license_identity: "license:apache-2.0",
    donor_config: { telemetry_enabled: false },
    closeouts,
    clean_checkout: true,
    ci: {
      head_sha: "a".repeat(40),
      project_ci_six_of_six: true,
      self_verification: true,
    },
    reviews: {
      jev_pass: true,
      alibaba_ocr_pass: true,
      unresolved_material_findings: 0,
    },
    device_matrix_ready: true,
    ...overrides,
  };
}

describe("ARTEMIS-A13 release admission", () => {
  it("admits only fully qualified candidates", () => {
    expect(admitReleaseV1(candidate())).toEqual({ admitted: true, reasons: [] });
    expect(RELEASE_PHASES).toHaveLength(13);
  });

  it("names every missing gate", () => {
    const telemetry = admitReleaseV1(candidate({ donor_config: { posthog_enabled: true } }));
    expect(telemetry.admitted).toBe(false);
    expect(telemetry.reasons.some((reason) => reason.includes("posthog_enabled"))).toBe(true);

    const donor = admitReleaseV1(candidate({ donor_sha: "0".repeat(40) }));
    expect(donor.reasons).toContain("donor sha mismatch");

    const license = admitReleaseV1(candidate({ license_identity: "license:mit" }));
    expect(license.reasons).toContain("license identity mismatch");

    const closeouts = candidate().closeouts as Record<string, unknown>;
    delete closeouts["a7"];
    const phases = admitReleaseV1(candidate({ closeouts }));
    expect(phases.reasons).toContain("phase a7 closeout missing");

    const dirty = admitReleaseV1(candidate({ clean_checkout: false }));
    expect(dirty.reasons).toContain("checkout not clean");

    const ci = admitReleaseV1(
      candidate({ ci: { head_sha: "short", project_ci_six_of_six: true, self_verification: true } }),
    );
    expect(ci.reasons).toContain("ci head sha invalid");

    const lanes = admitReleaseV1(
      candidate({
        ci: { head_sha: "a".repeat(40), project_ci_six_of_six: false, self_verification: true },
      }),
    );
    expect(lanes.reasons).toContain("project ci not six of six");

    const reviews = admitReleaseV1(
      candidate({
        reviews: { jev_pass: true, alibaba_ocr_pass: true, unresolved_material_findings: 2 },
      }),
    );
    expect(reviews.reasons).toContain("unresolved material findings remain");

    const jev = admitReleaseV1(
      candidate({
        reviews: { jev_pass: false, alibaba_ocr_pass: true, unresolved_material_findings: 0 },
      }),
    );
    expect(jev.reasons).toContain("jev review not passing");

    const matrix = admitReleaseV1(candidate({ device_matrix_ready: false }));
    expect(matrix.reasons).toContain("device matrix not ready");
  });
});
