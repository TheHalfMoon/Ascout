import { describe, expect, it } from "vitest";

import {
  CAPABILITY_PROBE_IDS,
  PROBE_SCRIPT,
  runCapabilityProbesV1,
  t0ProbeRunnerV1,
  type ProbeRunnerV1,
} from "../src/assurance/containment/capability-probes.js";
import { currentContainmentV1 } from "../src/assurance/containment/containment-tier.js";

// FD-4 research: native capability probes. CI runs these on Linux, macOS, and Windows with Node 22 and
// 24, so each run is native evidence of what T0 actually allows on that host. Under T0 every
// capability must be ALLOWED and confirmed by the parent: T0 isolates nothing, and these tests keep
// that statement true. A T1 runner would have to make every probe DENIED, with the parent's agreement,
// before any T1 claim, and the claim would still need an independent human security review.
describe("capability probes under T0", () => {
  it("prove natively that code Ascout runs can read, write, connect, and see secrets outside its workspace", async () => {
    const report = await runCapabilityProbesV1("T0", t0ProbeRunnerV1);
    expect(report).toMatchObject({ schema: "ascout.capability-probes/v1", runner: "T0", platform: process.platform, arch: process.arch, all_denied: false });
    expect(report.results.map((result) => [result.id, result.verdict])).toEqual(CAPABILITY_PROBE_IDS.map((id) => [id, "ALLOWED"]));
    for (const result of report.results) expect(result.parent_observed).toBe(true);
  }, 60_000);

  it("never changes the containment tier: Ascout still reports T0 with no isolation", () => {
    expect(currentContainmentV1()).toMatchObject({ tier: "T0", filesystem_isolation: "NONE", network_isolation: "NONE", untrusted_code_supported: false });
  });
});

describe("the probe harness can't be talked into a denial", () => {
  it("reports INCONSISTENT when a runner claims denials while the effects happened anyway", async () => {
    // A lying runner: it runs the real probe (so every effect happens), then rewrites every claim.
    const liar: ProbeRunnerV1 = async (script, task, env, cwd) => {
      const real = JSON.parse(await t0ProbeRunnerV1(script, task, env, cwd)) as Record<string, unknown>;
      return JSON.stringify(Object.fromEntries(Object.keys(real).map((id) => [id, { claimed: "DENIED" }])));
    };
    const report = await runCapabilityProbesV1("liar", liar);
    expect(report.all_denied).toBe(false);
    for (const result of report.results) {
      expect(result.probe_claimed).toBe("DENIED");
      // Read and secret evidence is withheld, so the parent can't see those effects, but the write and
      // the connection happened, so those two are caught as inconsistent.
      if (result.id === "write_outside_workspace" || result.id === "loopback_network") expect(result.verdict).toBe("INCONSISTENT");
    }
  }, 60_000);

  it("counts a probe that reports nothing as INCONSISTENT, never as a denial", async () => {
    const silent: ProbeRunnerV1 = async () => "not json";
    const report = await runCapabilityProbesV1("silent", silent);
    expect(report.all_denied).toBe(false);
    for (const result of report.results) {
      expect(result.probe_claimed).toBe("MISSING");
      expect(result.verdict).toBe("INCONSISTENT");
    }
  });

  it("treats a report that isn't an object as missing", async () => {
    const report = await runCapabilityProbesV1("array", async () => "[]");
    expect(report.results.every((result) => result.probe_claimed === "MISSING")).toBe(true);
  });

  it("would accept a real denial: claims of DENIED with no observed effect", async () => {
    // A runner that runs nothing and truthfully reports that nothing was reachable.
    const denies: ProbeRunnerV1 = async () => JSON.stringify(Object.fromEntries(CAPABILITY_PROBE_IDS.map((id) => [id, { claimed: "DENIED" }])));
    const report = await runCapabilityProbesV1("denies", denies);
    expect(report.results.every((result) => result.verdict === "DENIED")).toBe(true);
    expect(report.all_denied).toBe(true);
  });

  it("uses only Node built-ins and never reaches beyond loopback", () => {
    expect(PROBE_SCRIPT).not.toMatch(/require\("(?!node:)/u);
    expect(PROBE_SCRIPT).toContain('host: "127.0.0.1"');
    expect(PROBE_SCRIPT).not.toMatch(/https?:\/\//u);
  });
});
