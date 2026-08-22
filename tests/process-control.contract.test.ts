import { describe, expect, it } from "vitest";

type HostPlatform = "posix" | "win32";
type CleanupResult = "timed_out" | "error";
type TerminationTarget = "process_group" | "native_process_tree";

interface LaunchContract {
  readonly file: string;
  readonly argv: readonly string[];
  readonly shell: false;
  readonly platform: HostPlatform;
  readonly termination_target: TerminationTarget;
  readonly dedicated_process_group: boolean;
}

interface BoundedCapture {
  readonly bytes: Buffer;
  readonly captured_bytes: number;
  readonly observed_bytes: number;
  readonly truncated: boolean;
}

interface PosixTerminationAction {
  readonly platform: "posix";
  readonly target: "process_group";
  readonly process_group_id: number;
  readonly phase: "graceful" | "forceful";
  readonly signal: "SIGTERM" | "SIGKILL";
}

interface WindowsTerminationAction {
  readonly platform: "win32";
  readonly target: "native_process_tree";
  readonly root_pid: number;
  readonly phase: "tree_termination";
}

type TerminationAction = PosixTerminationAction | WindowsTerminationAction;

interface TimeoutCleanupReport {
  readonly timed_out: true;
  readonly cleanup_complete: boolean;
  readonly result: CleanupResult;
  readonly actions: readonly TerminationAction[];
}

function createLaunchContract(
  file: string,
  argv: readonly string[],
  platform: HostPlatform,
): LaunchContract {
  if (file.length === 0) throw new Error("launch file must be non-empty");

  return {
    file,
    argv: [...argv],
    shell: false,
    platform,
    termination_target: platform === "win32" ? "native_process_tree" : "process_group",
    dedicated_process_group: platform === "posix",
  };
}

function captureBounded(chunks: readonly Buffer[], capBytes: number): BoundedCapture {
  if (!Number.isSafeInteger(capBytes) || capBytes < 0) {
    throw new Error("capture cap must be a non-negative safe integer");
  }

  const kept: Buffer[] = [];
  let capturedBytes = 0;
  let observedBytes = 0;

  for (const chunk of chunks) {
    observedBytes += chunk.length;
    const remaining = capBytes - capturedBytes;
    if (remaining <= 0) continue;

    const piece = chunk.subarray(0, Math.min(remaining, chunk.length));
    if (piece.length > 0) {
      kept.push(piece);
      capturedBytes += piece.length;
    }
  }

  return {
    bytes: Buffer.concat(kept),
    captured_bytes: capturedBytes,
    observed_bytes: observedBytes,
    truncated: observedBytes > capturedBytes,
  };
}

function terminationPlan(
  platform: HostPlatform,
  pid: number,
  posixGracefulExitObserved = false,
): readonly TerminationAction[] {
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error("pid must be a positive safe integer");

  if (platform === "win32") {
    return [{
      platform: "win32",
      target: "native_process_tree",
      root_pid: pid,
      phase: "tree_termination",
    }];
  }

  const graceful: PosixTerminationAction = {
    platform: "posix",
    target: "process_group",
    process_group_id: pid,
    phase: "graceful",
    signal: "SIGTERM",
  };
  if (posixGracefulExitObserved) return [graceful];

  return [
    graceful,
    {
      platform: "posix",
      target: "process_group",
      process_group_id: pid,
      phase: "forceful",
      signal: "SIGKILL",
    },
  ];
}

function timeoutCleanupReport(
  actions: readonly TerminationAction[],
  terminationSucceeded: boolean,
): TimeoutCleanupReport {
  if (actions.length === 0) throw new Error("timeout cleanup requires a tree-termination action");

  return {
    timed_out: true,
    cleanup_complete: terminationSucceeded,
    result: terminationSucceeded ? "timed_out" : "error",
    actions: [...actions],
  };
}

function assertNeverParentOnly(actions: readonly TerminationAction[]): void {
  for (const action of actions) {
    expect(action.target === "process_group" || action.target === "native_process_tree").toBe(true);
  }
}

describe("T013 process-control contract", () => {
  it("preserves argv exactly and never converts it into a shell command string", () => {
    const argv = [
      "--name",
      "hello world",
      "semi;colon",
      "$(touch should-not-run)",
      "a&b",
      'quote"inside',
      "single'quote",
      "C:\\Program Files\\Ascout\\fixture.js",
      "--literal=*.ts",
    ] as const;

    const request = createLaunchContract("node", argv, "posix");

    expect(request.file).toBe("node");
    expect(request.argv).toEqual(argv);
    expect(request.argv).not.toBe(argv);
    expect(request.shell).toBe(false);
    expect(request).not.toHaveProperty("command_string");
    expect(request).not.toHaveProperty("shell_command");
  });

  it("keeps Windows-native argv as discrete arguments with shell disabled", () => {
    const argv = [
      "C:\\repo with spaces\\script.js",
      "--pattern",
      "a&b|c>d<e",
      "%TEMP%",
      "^caret",
    ] as const;

    const request = createLaunchContract("C:\\Program Files\\nodejs\\node.exe", argv, "win32");

    expect(request.argv).toEqual(argv);
    expect(request.shell).toBe(false);
    expect(request.platform).toBe("win32");
    expect(request.termination_target).toBe("native_process_tree");
    expect(request.dedicated_process_group).toBe(false);
  });

  it("caps captured bytes exactly and marks truncation without hiding observed size", () => {
    const capture = captureBounded([
      Buffer.from("abc", "utf8"),
      Buffer.from("defgh", "utf8"),
      Buffer.from("ijk", "utf8"),
    ], 7);

    expect(capture.bytes.toString("utf8")).toBe("abcdefg");
    expect(capture.captured_bytes).toBe(7);
    expect(capture.observed_bytes).toBe(11);
    expect(capture.truncated).toBe(true);
  });

  it("applies capture caps in bytes for multibyte/binary-safe streams", () => {
    const utf8 = Buffer.from("A€B", "utf8");
    const binary = Buffer.from([0x00, 0xff, 0x01, 0x02]);

    const utf8Capture = captureBounded([utf8], 4);
    const binaryCapture = captureBounded([binary], 3);

    expect([...utf8Capture.bytes]).toEqual([...Buffer.from("A€", "utf8")]);
    expect(utf8Capture.captured_bytes).toBe(4);
    expect(utf8Capture.observed_bytes).toBe(5);
    expect(utf8Capture.truncated).toBe(true);

    expect([...binaryCapture.bytes]).toEqual([0x00, 0xff, 0x01]);
    expect(binaryCapture.captured_bytes).toBe(3);
    expect(binaryCapture.observed_bytes).toBe(4);
    expect(binaryCapture.truncated).toBe(true);
  });

  it("does not report truncation when a stream fits exactly at or below the cap", () => {
    const exact = captureBounded([Buffer.from("1234")], 4);
    const below = captureBounded([Buffer.from("12")], 4);
    const zero = captureBounded([Buffer.from("discard")], 0);

    expect(exact.truncated).toBe(false);
    expect(exact.captured_bytes).toBe(4);
    expect(below.truncated).toBe(false);
    expect(below.captured_bytes).toBe(2);
    expect(zero.truncated).toBe(true);
    expect(zero.captured_bytes).toBe(0);
    expect(zero.observed_bytes).toBe(7);
  });

  it("uses a dedicated POSIX process group and graceful-then-forceful group cleanup", () => {
    const launch = createLaunchContract("node", ["child.js"], "posix");
    const fullPlan = terminationPlan("posix", 4242);
    const gracefulOnly = terminationPlan("posix", 4242, true);

    expect(launch.dedicated_process_group).toBe(true);
    expect(launch.termination_target).toBe("process_group");
    expect(fullPlan).toEqual([
      {
        platform: "posix",
        target: "process_group",
        process_group_id: 4242,
        phase: "graceful",
        signal: "SIGTERM",
      },
      {
        platform: "posix",
        target: "process_group",
        process_group_id: 4242,
        phase: "forceful",
        signal: "SIGKILL",
      },
    ]);
    expect(gracefulOnly).toEqual([fullPlan[0]]);
    assertNeverParentOnly(fullPlan);
  });

  it("requires native Windows process-tree termination rather than parent-PID-only cleanup", () => {
    const launch = createLaunchContract("node.exe", ["child.js"], "win32");
    const actions = terminationPlan("win32", 5151);

    expect(launch.termination_target).toBe("native_process_tree");
    expect(actions).toEqual([{
      platform: "win32",
      target: "native_process_tree",
      root_pid: 5151,
      phase: "tree_termination",
    }]);
    expect(actions).not.toContainEqual(expect.objectContaining({ target: "parent_process" }));
    assertNeverParentOnly(actions);
  });

  it("normalizes successful timeout cleanup separately from termination failure", () => {
    const posixActions = terminationPlan("posix", 1234);
    const windowsActions = terminationPlan("win32", 5678);

    const posixTimeout = timeoutCleanupReport(posixActions, true);
    const windowsTimeout = timeoutCleanupReport(windowsActions, true);
    const cleanupFailure = timeoutCleanupReport(windowsActions, false);

    expect(posixTimeout).toMatchObject({
      timed_out: true,
      cleanup_complete: true,
      result: "timed_out",
    });
    expect(windowsTimeout).toMatchObject({
      timed_out: true,
      cleanup_complete: true,
      result: "timed_out",
    });
    expect(cleanupFailure).toMatchObject({
      timed_out: true,
      cleanup_complete: false,
      result: "error",
    });
    expect(cleanupFailure.result).not.toBe("fail");
  });

  it("fails closed for invalid capture caps, PIDs, and empty timeout-cleanup plans", () => {
    for (const cap of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => captureBounded([], cap)).toThrow();
    }
    for (const pid of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => terminationPlan("posix", pid)).toThrow();
      expect(() => terminationPlan("win32", pid)).toThrow();
    }
    expect(() => timeoutCleanupReport([], true)).toThrow();
  });
});
