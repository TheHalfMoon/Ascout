import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_ADB_CANDIDATES,
  DEFAULT_INTERPRETER_CANDIDATES,
  HANDSHAKE_TIMEOUT_MS,
  nodeCommandRunnerV1,
  probeMobileSidecarAvailabilityV1,
  VERSION_PROBE_TIMEOUT_MS,
  type AvailabilityProbeInputV1,
  type CommandRunRequestV1,
  type CommandRunResultV1,
} from "../src/assurance/engines/mobile-artemis/availability.js";
import { MOBILE_ARTEMIS_DONOR_SHA } from "../src/assurance/engines/mobile-artemis/descriptor.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");
const SIDECAR_PATH = join(
  REPO_ROOT,
  "python",
  "ascout_mobile_bridge",
  "sidecar.py",
);
const BRIDGE_DIR = join(REPO_ROOT, "python", "ascout_mobile_bridge");
const LICENSE_PATH = join(REPO_ROOT, "vendor", "google-artemis", "LICENSE");

function fakeRunner(
  handler: (request: CommandRunRequestV1) => CommandRunResultV1,
): AvailabilityProbeInputV1["runner"] {
  return { run: (request) => Promise.resolve(handler(request)) };
}

function exitOk(stdout: string): CommandRunResultV1 {
  return {
    exitCode: 0,
    signal: null,
    stdout,
    stderr: "",
    timedOut: false,
  };
}

function readyHandshake(pythonVersion: string): string {
  return (
    JSON.stringify({
      protocol_version: 1,
      status: "READY",
      sidecar_version: "1.0.0",
      python_version: pythonVersion,
      donor_sha_pinned: MOBILE_ARTEMIS_DONOR_SHA,
    }) + "\n"
  );
}

function probeInput(
  overrides: Partial<AvailabilityProbeInputV1> = {},
): AvailabilityProbeInputV1 {
  return {
    repoRoot: REPO_ROOT,
    interpreterCandidates: [...DEFAULT_INTERPRETER_CANDIDATES],
    adbCandidates: [...DEFAULT_ADB_CANDIDATES],
    sidecarScriptPath: SIDECAR_PATH,
    requestId: "req:a2-unit",
    versionTimeoutMs: 5000,
    handshakeTimeoutMs: 5000,
    runner: fakeRunner(() => exitOk("")),
    ...overrides,
  };
}

describe("ARTEMIS-A2 donor snapshot validation", () => {
  it("accepts the pinned snapshot and rejects a foreign root", async () => {
    const live = await probeMobileSidecarAvailabilityV1(
      probeInput({ runner: nodeCommandRunnerV1() }),
    );
    const donor = live.checks.find((check) => check.name === "donor_snapshot");
    expect(donor?.ok).toBe(true);

    const foreign = await probeMobileSidecarAvailabilityV1(
      probeInput({
        repoRoot: join(REPO_ROOT, "specs"),
        interpreterCandidates: ["definitely-not-python-xyz"],
        adbCandidates: ["definitely-not-adb-xyz"],
      }),
    );
    expect(foreign.status).toBe("UNAVAILABLE");
    expect(foreign.reasons).toContain("DONOR_UNAVAILABLE");
    expect(foreign.reasons).toContain("INTERPRETER_UNAVAILABLE");
    expect(foreign.mutations).toEqual([]);
  });
});

describe("ARTEMIS-A2 interpreter pin tiers", () => {
  it("distinguishes pinned, mismatched, and absent interpreters", async () => {
    const pinned = await probeMobileSidecarAvailabilityV1(
      probeInput({
        runner: fakeRunner((request) =>
          request.args[0] === "--version"
            ? exitOk("Python 3.12.4\n")
            : exitOk(readyHandshake("3.12.4")),
        ),
      }),
    );
    expect(
      pinned.checks.find((check) => check.name === "interpreter_pin")?.ok,
    ).toBe(true);
    expect(pinned.status).toBe("AVAILABLE");

    const mismatched = await probeMobileSidecarAvailabilityV1(
      probeInput({
        runner: fakeRunner((request) =>
          request.args[0] === "--version"
            ? exitOk("Python 3.11.9\n")
            : exitOk(readyHandshake("3.11.9")),
        ),
      }),
    );
    expect(mismatched.status).toBe("UNAVAILABLE");
    expect(mismatched.reasons).toContain("INTERPRETER_PIN_MISMATCH");
    expect(
      mismatched.checks.find((check) => check.name === "sidecar_handshake")?.ok,
    ).toBe(true);

    const absent = await probeMobileSidecarAvailabilityV1(
      probeInput({
        runner: fakeRunner(() => ({
          exitCode: null,
          signal: null,
          stdout: "",
          stderr: "not found",
          timedOut: false,
        })),
      }),
    );
    expect(absent.status).toBe("UNAVAILABLE");
    expect(absent.reasons).toContain("INTERPRETER_UNAVAILABLE");
    expect(absent.reasons).toContain("HANDSHAKE_SKIPPED");
  });
});

describe("ARTEMIS-A2 handshake verdicts", () => {
  it("classifies malformed, skewed, failed, and timed-out handshakes", async () => {
    const versionRunner = fakeRunner((request) =>
      request.args[0] === "--version"
        ? exitOk("Python 3.12.0\n")
        : exitOk("NOT_JSON{{{\n"),
    );
    const malformed = await probeMobileSidecarAvailabilityV1(
      probeInput({ runner: versionRunner }),
    );
    expect(malformed.reasons).toContain("MALFORMED_RESPONSE");

    const skewRunner = fakeRunner((request) =>
      request.args[0] === "--version"
        ? exitOk("Python 3.12.0\n")
        : exitOk(
            JSON.stringify({
              protocol_version: 1,
              status: "READY",
              sidecar_version: "9.9.9",
              donor_sha_pinned: MOBILE_ARTEMIS_DONOR_SHA,
            }) + "\n",
          ),
    );
    const skewed = await probeMobileSidecarAvailabilityV1(
      probeInput({ runner: skewRunner }),
    );
    expect(skewed.reasons).toContain("VERSION_SKEW");

    const exitRunner = fakeRunner((request) =>
      request.args[0] === "--version"
        ? exitOk("Python 3.12.0\n")
        : {
            exitCode: 2,
            signal: null,
            stdout: "",
            stderr: "boom",
            timedOut: false,
          },
    );
    const exited = await probeMobileSidecarAvailabilityV1(
      probeInput({ runner: exitRunner }),
    );
    expect(exited.reasons).toContain("SIDECAR_EXIT");

    const slowRunner = fakeRunner((request) =>
      request.args[0] === "--version"
        ? exitOk("Python 3.12.0\n")
        : {
            exitCode: null,
            signal: "SIGKILL",
            stdout: "",
            stderr: "",
            timedOut: true,
          },
    );
    const timedOut = await probeMobileSidecarAvailabilityV1(
      probeInput({ runner: slowRunner }),
    );
    expect(timedOut.reasons).toContain("HANDSHAKE_TIMEOUT");
  });
});

describe("ARTEMIS-A2 ADB binary discovery", () => {
  it("parses adb presence without starting a server", async () => {
    const present = await probeMobileSidecarAvailabilityV1(
      probeInput({
        runner: fakeRunner((request) => {
          if (request.args[0] === "--version") return exitOk("Python 3.12.0\n");
          if (request.command === "adb") {
            return exitOk("Android Debug Bridge version 1.0.41\n");
          }
          return exitOk(readyHandshake("3.12.0"));
        }),
      }),
    );
    const adb = present.checks.find((check) => check.name === "adb_binary");
    expect(adb?.ok).toBe(true);
    expect(adb?.detail).toContain("1.0.41");
    expect(present.status).toBe("AVAILABLE");

    const missing = await probeMobileSidecarAvailabilityV1(
      probeInput({ adbCandidates: ["definitely-not-adb-xyz"] }),
    );
    const adbMissing = missing.checks.find(
      (check) => check.name === "adb_binary",
    );
    expect(adbMissing?.ok).toBe(false);
  });
});

describe("ARTEMIS-A2 live availability probe", () => {
  it("reports a well-formed verdict with zero mutations", async () => {
    const licenseBefore = createHash("sha256")
      .update(readFileSync(LICENSE_PATH))
      .digest("hex");
    const bridgeBefore = readdirSync(BRIDGE_DIR).sort().join("\n");

    const report = await probeMobileSidecarAvailabilityV1(
      probeInput({
        requestId: "req:a2-live",
        versionTimeoutMs: VERSION_PROBE_TIMEOUT_MS,
        handshakeTimeoutMs: HANDSHAKE_TIMEOUT_MS,
        runner: nodeCommandRunnerV1(),
      }),
    );

    expect(report.mutations).toEqual([]);
    expect(report.checks.map((check) => check.name)).toEqual([
      "donor_snapshot",
      "interpreter",
      "interpreter_pin",
      "sidecar_handshake",
      "adb_binary",
    ]);
    if (report.status === "AVAILABLE") {
      expect(
        report.checks.find((check) => check.name === "sidecar_handshake")?.ok,
      ).toBe(true);
    } else {
      expect(report.reasons.length).toBeGreaterThan(0);
    }

    const licenseAfter = createHash("sha256")
      .update(readFileSync(LICENSE_PATH))
      .digest("hex");
    expect(licenseAfter).toBe(licenseBefore);
    expect(readdirSync(BRIDGE_DIR).sort().join("\n")).toBe(bridgeBefore);
  }, 60000);
});
