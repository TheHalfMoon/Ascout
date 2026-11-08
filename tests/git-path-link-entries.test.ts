import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { trustedCommandExecutable } from "../src/git.js";
import { writeNodeCommandShim } from "./helpers/native-command-shim.js";

const SHIM = process.platform === "win32" ? "ascout-probe.cmd" : "ascout-probe";

let scratch: string;
let repo: string;
let outside: string;
let savedPath: string | undefined;

function linkDirectory(target: string, path: string): void {
  // A junction needs no special rights on Windows; POSIX uses a directory symlink.
  symlinkSync(target, path, process.platform === "win32" ? "junction" : "dir");
}

beforeEach(() => {
  scratch = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-path-links-")));
  repo = join(scratch, "repo");
  outside = join(scratch, "outside-bin");
  mkdirSync(repo);
  writeNodeCommandShim(outside, "ascout-probe", "process.exit(0);\n");
  savedPath = process.env.PATH;
});

afterEach(() => {
  if (savedPath === undefined) delete process.env.PATH;
  else process.env.PATH = savedPath;
  rmSync(scratch, { recursive: true, force: true });
});

describe("trustedCommandExecutable with linked PATH entries", () => {
  it("does not let a repository entry that links outside pick the command", () => {
    linkDirectory(outside, join(repo, "tools"));
    process.env.PATH = join(repo, "tools");
    expect(trustedCommandExecutable(repo, "ascout-probe")).toBeNull();
  });

  it("returns the real path of a command found through an outside link", () => {
    const linked = join(scratch, "linked-bin");
    linkDirectory(outside, linked);
    process.env.PATH = [linked].join(delimiter);
    expect(trustedCommandExecutable(repo, "ascout-probe")).toBe(join(outside, SHIM));
  });
});
