import { describe, expect, it } from "vitest";

import { CliUsageError, parseCliArgs } from "../src/cli.js";

// --pr-head takes the commit ID GitHub names: 40 hex in a SHA-1 repository, 64 in a SHA-256 one.
// The bundle validator and the publisher accept both, so the collector must too.
const SHA1 = "a".repeat(40);
const SHA256 = "b".repeat(64);

describe("ascout pr-evidence arguments", () => {
  it("accepts no options, --skip-tests, and a SHA-1 or SHA-256 --pr-head", () => {
    expect(parseCliArgs(["pr-evidence"])).toEqual({ command: "pr-evidence", allowChangedCommandSurface: false });
    expect(parseCliArgs(["pr-evidence", "--skip-tests"])).toMatchObject({ skipTests: true });
    expect(parseCliArgs(["pr-evidence", "--pr-head", SHA1])).toMatchObject({ prHead: SHA1 });
    expect(parseCliArgs(["pr-evidence", "--pr-head", SHA256, "--skip-tests"])).toMatchObject({ prHead: SHA256, skipTests: true });
  });

  it.each([
    ["a 39-hex ID", ["--pr-head", "a".repeat(39)]],
    ["a 41-hex ID", ["--pr-head", "a".repeat(41)]],
    ["a 63-hex ID", ["--pr-head", "a".repeat(63)]],
    ["a 65-hex ID", ["--pr-head", "a".repeat(65)]],
    ["an uppercase ID", ["--pr-head", "A".repeat(40)]],
    ["a non-hex ID", ["--pr-head", "g".repeat(40)]],
    ["a missing ID", ["--pr-head"]],
    ["a second --pr-head", ["--pr-head", SHA1, "--pr-head", SHA1]],
    ["a second --skip-tests", ["--skip-tests", "--skip-tests"]],
    ["an unknown option", ["--format", "json"]],
  ])("refuses %s", (_label, args) => {
    expect(() => parseCliArgs(["pr-evidence", ...args])).toThrow(CliUsageError);
    expect(() => parseCliArgs(["pr-evidence", ...args])).toThrow("a lowercase 40- or 64-hex commit ID");
  });
});
