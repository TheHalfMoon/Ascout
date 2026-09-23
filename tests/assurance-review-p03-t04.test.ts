import { describe, expect, it } from "vitest";

import {
  executeReviewV1,
  type ReviewExecutionRequestV1,
  type ReviewRunnerV1,
} from "../src/assurance/engines/review/opencode-review-adapter.js";
import { createReviewProfileV1 } from "../src/assurance/review/review-profile.js";

function profile() {
  return createReviewProfileV1({
    profile_id: "profile:t04",
    scope_kind: "diff",
    scope_ref: "scope:t04",
    target_id: "target:t04",
  });
}

function request(
  overrides: Partial<ReviewExecutionRequestV1> = {},
): ReviewExecutionRequestV1 {
  return {
    profile: profile(),
    capsule_id: "capsule:t04",
    head_sha: "c".repeat(40),
    binary: {
      binary_name: "open-code-review",
      expected_version: "1.2.3",
      resolved_path: "/usr/local/bin/open-code-review",
    },
    timeout_ms: 60000,
    argv: ["review", "--format=json"],
    ...overrides,
  };
}

function fakeRunner(
  handler: (argv: readonly string[]) => {
    readonly exit_code: number;
    readonly stdout: string;
    readonly stderr: string;
  },
): ReviewRunnerV1 {
  return {
    run: ({ argv }) => Promise.resolve(handler(argv)),
  };
}

function healthyRunner(): ReviewRunnerV1 {
  return fakeRunner((argv) =>
    argv[0] === "--version"
      ? { exit_code: 0, stdout: "open-code-review 1.2.3\n", stderr: "" }
      : { exit_code: 0, stdout: '{"reviews":[]}', stderr: "" },
  );
}

describe("UA-P03-T04 review adapter", () => {
  it("executes with recorded identity and raw payload", async () => {
    const result = await executeReviewV1(request(), healthyRunner());
    expect(result.status).toBe("COMPLETED");
    expect(result.exit_code).toBe(0);
    expect(result.raw_stdout).toBe('{"reviews":[]}');
    expect(result.reasons).toEqual([]);
    expect(result.execution_identity.binary_name).toBe("open-code-review");
    expect(result.execution_identity.observed_version).toContain("1.2.3");
    expect(result.execution_identity.profile_id).toBe("profile:t04");
    expect(result.execution_identity.argv).toEqual(["review", "--format=json"]);
  });

  it("refuses invalid profiles and malformed requests", async () => {
    const badProfile = await executeReviewV1(
      request({
        profile: { ...profile(), scope_ref: "" },
      }),
      healthyRunner(),
    );
    expect(badProfile.status).toBe("REFUSED");
    expect(badProfile.reasons[0]).toMatch("invalid review profile");

    const badArgv = await executeReviewV1(
      request({ argv: ["review", "a;rm -rf /"] }),
      healthyRunner(),
    );
    expect(badArgv.status).toBe("REFUSED");
    expect(badArgv.reasons).toContain("argv rejected");

    const badHead = await executeReviewV1(
      request({ head_sha: "not-a-sha" }),
      healthyRunner(),
    );
    expect(badHead.status).toBe("REFUSED");
  });

  it("maps absence and mismatch to explicit states", async () => {
    const unreachable = await executeReviewV1(request(), {
      run: () => Promise.reject(new Error("spawn ENOENT")),
    });
    expect(unreachable.status).toBe("UNAVAILABLE");
    expect(unreachable.reasons).toContain("binary unreachable");

    const mismatch = await executeReviewV1(
      request(),
      fakeRunner(() => ({ exit_code: 0, stdout: "9.9.9\n", stderr: "" })),
    );
    expect(mismatch.status).toBe("NOT_QUALIFIED");
    expect(mismatch.reasons).toContain("binary version mismatch");
  });

  it("maps timeout and non-zero exit without promoting output", async () => {
    const timeout = await executeReviewV1(request(), {
      run: ({ argv }) =>
        argv[0] === "--version"
          ? Promise.resolve({ exit_code: 0, stdout: "1.2.3\n", stderr: "" })
          : Promise.reject(new Error("timeout")),
    });
    expect(timeout.status).toBe("TIMEOUT");
    expect(timeout.timed_out).toBe(true);
    expect(timeout.raw_stdout).toBeNull();

    const error = await executeReviewV1(
      request(),
      fakeRunner((argv) =>
        argv[0] === "--version"
          ? { exit_code: 0, stdout: "1.2.3\n", stderr: "" }
          : { exit_code: 2, stdout: "partial", stderr: "boom" },
      ),
    );
    expect(error.status).toBe("ERROR");
    expect(error.exit_code).toBe(2);
    expect(error.raw_stdout).toBe("partial");
    expect(error.reasons).toContain("review binary exited non-zero");
  });
});
