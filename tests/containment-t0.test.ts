import { describe, expect, it } from "vitest";

import { currentContainmentV1 } from "../src/assurance/containment/containment-tier.js";
import { listTestProfilePoliciesV1 } from "../src/assurance/test/profile-policy.js";
import { buildTestNotRunReportV2, renderTestRunTerminalV1 } from "../src/assurance/test/test-run-command.js";
import { TEST_PROFILES } from "../src/assurance/test/profile-policy.js";

// E7-CONTAIN: until native proof and FD-4 exist, Ascout states T0 and claims no isolation anywhere.
describe("trusted-local T0 boundary", () => {
  it("reports T0 with no filesystem or network isolation", () => {
    expect(currentContainmentV1()).toEqual({
      schema_version: 1,
      tier: "T0",
      label: "TRUSTED_LOCAL",
      filesystem_isolation: "NONE",
      network_isolation: "NONE",
      lifetime_control: "PROCESS_TREE_TEARDOWN",
      untrusted_code_supported: false,
      reason_text: expect.stringContaining("no filesystem or network isolation"),
    });
    expect(Object.isFrozen(currentContainmentV1())).toBe(true);
  });

  it("predicts no isolated execution for any test profile", () => {
    for (const policy of listTestProfilePoliciesV1()) {
      expect(policy.predicted_effect_classes).not.toContain("E3_ISOLATED_LOCAL_EXECUTION");
    }
  });

  it.each(TEST_PROFILES)("puts the T0 record in every %s test report, JSON and terminal", (profile) => {
    const report = buildTestNotRunReportV2(profile, "NO_REPOSITORY");
    expect(report.containment).toEqual(currentContainmentV1());
    expect(JSON.parse(JSON.stringify(report)).containment.tier).toBe("T0");
    expect(renderTestRunTerminalV1(report, null)).toContain("containment: T0 TRUSTED_LOCAL.");
  });
});
