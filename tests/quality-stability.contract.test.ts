import { describe, expect, it } from "vitest";
import {
  createStabilityObservation,
  evaluateStability,
  isDeterministicStability,
  isStablePass,
  stabilityReportFromJson,
  stabilityReportToJson,
} from "../src/quality/stability.js";
import type { StabilityObservation } from "../src/quality/stability.js";

const SOURCE = "tree:9f53c4d000000000000000000000000000000000";
const CANDIDATE = "candidate:checkout-total-v1";
const TEST = "test:checkout-total";
const ENV_A = "env:node22-linux";
const ENV_B = "env:node24-windows";

function observation(
  index: number,
  overrides?: Partial<StabilityObservation>,
): StabilityObservation {
  return createStabilityObservation({
    candidate_id: CANDIDATE,
    duration_ms: 12,
    environment_id: ENV_A,
    failure_class: null,
    outcome: "pass",
    run_index: index,
    source_id: SOURCE,
    test_id: TEST,
    ...overrides,
  });
}

function fail(index: number, failureClass: string | null, env = ENV_A) {
  return observation(index, {
    duration_ms: 31,
    environment_id: env,
    failure_class: failureClass,
    outcome: "fail",
  });
}

describe("spec015 wedge1 stability gate", () => {
  it("classifies repeated passes as deterministic-pass", () => {
    const report = evaluateStability({
      max_runs: 5,
      observations: [observation(0), observation(1), observation(2)],
      required_runs: 2,
    });
    expect(report.verdict).toBe("deterministic-pass");
    expect(report.passes).toBe(3);
    expect(report.failures).toBe(0);
    expect(report.unavailable).toBe(0);
    expect(report.environments).toEqual([ENV_A]);
    expect(isStablePass(report)).toBe(true);
    expect(isDeterministicStability(report)).toBe(true);
  });

  it("classifies repeated equivalent failures as deterministic-fail", () => {
    const report = evaluateStability({
      max_runs: 5,
      observations: [fail(0, "assertion"), fail(1, "assertion")],
      required_runs: 2,
    });
    expect(report.verdict).toBe("deterministic-fail");
    expect(report.failures).toBe(2);
    expect(isStablePass(report)).toBe(false);
    expect(isDeterministicStability(report)).toBe(true);
  });

  it("treats failure-then-pass as flaky, never deterministic-pass", () => {
    const report = evaluateStability({
      max_runs: 5,
      observations: [
        fail(0, "assertion"),
        observation(1),
        observation(2),
      ],
      required_runs: 2,
    });
    expect(report.verdict).toBe("flaky");
    expect(isStablePass(report)).toBe(false);
  });

  it("treats pass-then-failure as flaky", () => {
    const report = evaluateStability({
      max_runs: 5,
      observations: [observation(0), fail(1, "assertion")],
      required_runs: 2,
    });
    expect(report.verdict).toBe("flaky");
  });

  it("reports consistent cross-environment divergence as environment-sensitive", () => {
    const report = evaluateStability({
      max_runs: 6,
      observations: [
        observation(0, { environment_id: ENV_A }),
        observation(1, { environment_id: ENV_A }),
        fail(2, "assertion", ENV_B),
        fail(3, "assertion", ENV_B),
      ],
      required_runs: 2,
    });
    expect(report.verdict).toBe("environment-sensitive");
    expect(report.environments).toEqual([ENV_A, ENV_B].sort());
    expect(isDeterministicStability(report)).toBe(false);
  });

  it("rejects cross-source observations instead of combining them", () => {
    expect(() =>
      evaluateStability({
        max_runs: 5,
        observations: [
          observation(0),
          observation(1, { source_id: "tree:other000000000000000000000000000000000" }),
        ],
        required_runs: 2,
      }),
    ).toThrow(TypeError);
  });

  it("rejects cross-candidate and cross-test mixing", () => {
    expect(() =>
      evaluateStability({
        max_runs: 5,
        observations: [
          observation(0),
          observation(1, { candidate_id: "candidate:other" }),
        ],
        required_runs: 2,
      }),
    ).toThrow(TypeError);
    expect(() =>
      evaluateStability({
        max_runs: 5,
        observations: [
          observation(0),
          observation(1, { test_id: "test:other" }),
        ],
        required_runs: 2,
      }),
    ).toThrow(TypeError);
  });

  it("keeps unavailable executions unavailable and empty work not-run", () => {
    const unavailable = observation(0, {
      duration_ms: null,
      outcome: "unavailable",
    });
    const second = observation(1, {
      duration_ms: null,
      outcome: "unavailable",
    });
    expect(
      evaluateStability({
        max_runs: 5,
        observations: [unavailable, second],
        required_runs: 2,
      }).verdict,
    ).toBe("unavailable");
    expect(
      evaluateStability({
        max_runs: 5,
        observations: [unavailable],
        required_runs: 2,
      }).verdict,
    ).toBe("unavailable");
    const empty = evaluateStability({
      max_runs: 5,
      observations: [],
      required_runs: 2,
    });
    expect(empty.verdict).toBe("not-run");
    expect(isStablePass(empty)).toBe(false);
    expect(isDeterministicStability(empty)).toBe(false);
  });

  it("reports insufficient evidence below the required runs", () => {
    expect(
      evaluateStability({
        max_runs: 5,
        observations: [observation(0)],
        required_runs: 2,
      }).verdict,
    ).toBe("insufficient-evidence");
    expect(
      evaluateStability({
        max_runs: 5,
        observations: [observation(0), observation(1)],
        required_runs: 3,
      }).verdict,
    ).toBe("insufficient-evidence");
  });

  it("fails closed on malformed observations and bounds", () => {
    expect(() =>
      evaluateStability({
        max_runs: 5,
        observations: [observation(0, { source_id: "" })],
        required_runs: 2,
      }),
    ).toThrow(TypeError);
    expect(() =>
      evaluateStability({
        max_runs: 5,
        observations: [observation(0, { environment_id: "" })],
        required_runs: 2,
      }),
    ).toThrow(TypeError);
    expect(() =>
      evaluateStability({
        max_runs: 5,
        observations: [
          observation(0),
          observation(2),
        ],
        required_runs: 2,
      }),
    ).toThrow(TypeError);
    expect(() =>
      evaluateStability({
        max_runs: 5,
        observations: [observation(1)],
        required_runs: 2,
      }),
    ).toThrow(TypeError);
    expect(() =>
      evaluateStability({
        max_runs: 5,
        observations: [observation(0, { failure_class: "assertion" })],
        required_runs: 2,
      }),
    ).toThrow(TypeError);
    expect(() =>
      evaluateStability({
        max_runs: 5,
        observations: [
          observation(0, { duration_ms: null, outcome: "unavailable" }),
        ],
        required_runs: 1,
      }),
    ).toThrow(TypeError);
    expect(() =>
      evaluateStability({
        max_runs: 1,
        observations: [observation(0), observation(1)],
        required_runs: 2,
      }),
    ).toThrow(TypeError);
    expect(() =>
      evaluateStability({
        max_runs: 2,
        observations: [observation(0), observation(1), observation(2)],
        required_runs: 2,
      }),
    ).toThrow(TypeError);
    expect(() =>
      evaluateStability({
        max_runs: 5,
        observations: [observation(0, { duration_ms: -1 })],
        required_runs: 2,
      }),
    ).toThrow(TypeError);
  });

  it("treats divergent failure classes under one environment as flaky", () => {
    const report = evaluateStability({
      max_runs: 5,
      observations: [fail(0, "assertion"), fail(1, "timeout")],
      required_runs: 2,
    });
    expect(report.verdict).toBe("flaky");
  });

  it("treats unknown-versus-known failure classes as non-equivalent", () => {
    const report = evaluateStability({
      max_runs: 5,
      observations: [fail(0, null), fail(1, "assertion")],
      required_runs: 2,
    });
    expect(report.verdict).toBe("flaky");
  });

  it("preserves unavailable counts alongside sufficient valid evidence", () => {
    const report = evaluateStability({
      max_runs: 5,
      observations: [
        observation(0),
        observation(1),
        observation(2, { duration_ms: null, outcome: "unavailable" }),
      ],
      required_runs: 2,
    });
    expect(report.verdict).toBe("deterministic-pass");
    expect(report.unavailable).toBe(1);
    expect(report.runs).toBe(3);
  });

  it("classifies a stable outcome across environments as deterministic", () => {
    const report = evaluateStability({
      max_runs: 5,
      observations: [
        observation(0, { environment_id: ENV_B }),
        observation(1, { environment_id: ENV_A }),
      ],
      required_runs: 2,
    });
    expect(report.verdict).toBe("deterministic-pass");
    expect(report.environments).toEqual([ENV_A, ENV_B].sort());
  });

  it("round-trips reports through deterministic JSON", () => {
    const report = evaluateStability({
      max_runs: 5,
      observations: [observation(0), observation(1)],
      required_runs: 2,
    });
    const first = stabilityReportToJson(report);
    const second = stabilityReportToJson(stabilityReportFromJson(first));
    expect(second).toBe(first);
    expect(stabilityReportFromJson(first)).toEqual(report);
    expect(stabilityReportToJson(evaluateStability({
      max_runs: 5,
      observations: [observation(0), observation(1)],
      required_runs: 2,
    }))).toBe(first);
    expect(() => stabilityReportFromJson("not json")).toThrow(TypeError);
    const tampered = {
      ...(JSON.parse(first) as Record<string, unknown>),
      verdict: "covered-by-magic",
    };
    expect(() => stabilityReportFromJson(JSON.stringify(tampered))).toThrow(
      TypeError,
    );
  });
});
