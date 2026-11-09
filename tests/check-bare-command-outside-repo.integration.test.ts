import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { trustedCommandExecutable } from "../src/git.js";
import { runProcess } from "../src/process.js";
import { writeNodeCommandShim } from "./helpers/native-command-shim.js";

const SHIM = process.platform === "win32" ? "ascout-probe.cmd" : "ascout-probe";

function git(root: string, argv: readonly string[]): void {
  const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${argv.join(" ")} failed: ${result.stderr}`);
}

function markerScript(marker: string): string {
  return `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "ran");\n`;
}

let scratch: string;
let repo: string;
let outside: string;
let markers: string;
let savedPath: string | undefined;

beforeEach(() => {
  scratch = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-bare-command-")));
  repo = join(scratch, "repo");
  outside = join(scratch, "outside-bin");
  markers = join(scratch, "markers");
  mkdirSync(repo);
  mkdirSync(markers);
  writeNodeCommandShim(repo, "ascout-probe", markerScript(join(markers, "planted")));
  writeNodeCommandShim(outside, "ascout-probe", markerScript(join(markers, "trusted")));
  savedPath = process.env.PATH;
  // "." is relative, so both POSIX lookup and Windows cwd-first lookup would reach the planted copy.
  process.env.PATH = [".", outside, savedPath ?? ""].join(delimiter);
});

afterEach(() => {
  if (savedPath === undefined) delete process.env.PATH;
  else process.env.PATH = savedPath;
  rmSync(scratch, { recursive: true, force: true });
});

describe("trustedCommandExecutable", () => {
  it("finds the command outside the repository, never the planted copy", () => {
    expect(trustedCommandExecutable(repo, "ascout-probe")).toBe(join(outside, SHIM));
  });

  it("returns null when the only copy is inside the repository", () => {
    process.env.PATH = [".", repo].join(delimiter);
    expect(trustedCommandExecutable(repo, "ascout-probe")).toBeNull();
  });
});

describe("runProcess with resolve_bare_file_outside", () => {
  const request = () => ({
    file: "ascout-probe",
    argv: [],
    cwd: repo,
    timeout_ms: 30_000,
    termination_grace_ms: 1_000,
    capture_cap_bytes: 1024,
    resolve_bare_file_outside: repo,
  });

  it("runs the outside copy from inside the repository", async () => {
    const result = await runProcess(request());
    expect(result).toMatchObject({ outcome: "exited", exit_code: 0 });
    expect(existsSync(join(markers, "trusted"))).toBe(true);
    expect(existsSync(join(markers, "planted"))).toBe(false);
  });

  it("starts nothing when no copy exists outside the repository", async () => {
    process.env.PATH = [".", repo].join(delimiter);
    const result = await runProcess(request());
    expect(result).toMatchObject({ outcome: "error", exit_code: null, error: { code: "ENOENT" } });
    expect(existsSync(join(markers, "planted"))).toBe(false);
  });
});

describe("check with a command planted in the repository", () => {
  it("runs the configured bare command from outside the repository", async () => {
    writeFileSync(join(repo, ".gitignore"), ".ascout/\n");
    writeFileSync(join(repo, "ascout.config.json"), JSON.stringify({ version: 1, tasks: { typecheck: { command: ["ascout-probe"] } } }));
    git(repo, ["init", "-q"]);
    git(repo, ["config", "user.name", "Ascout Bare Command Fixture"]);
    git(repo, ["config", "user.email", "bare-command@example.invalid"]);
    git(repo, ["add", "."]);
    git(repo, ["commit", "-qm", "baseline with a planted command"]);

    const { receipt } = await runCheck(repo);
    expect(receipt.tasks.find(({ task_id }) => task_id === "typecheck")).toMatchObject({ status: "PASS" });
    expect(existsSync(join(markers, "trusted"))).toBe(true);
    expect(existsSync(join(markers, "planted"))).toBe(false);
  }, 30_000);
});
