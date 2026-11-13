import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runCli, usageText } from "../src/cli.js";
import { ASCOUT_PACKAGE_VERSION } from "../src/mcp/server.js";

// In-process twins of the compiled-CLI tests in a07-cli-exit-native, so the help, version, and init
// paths are measured by coverage too.
const originalCwd = process.cwd();
const roots: string[] = [];

afterEach(() => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function capture() {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderrWrite = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  return {
    stdout: () => stdout.mock.calls.map((call) => String(call[0])).join(""),
    stderr: () => [...stderrWrite.mock.calls.map((call) => String(call[0])), ...consoleError.mock.calls.flat().map(String)].join("\n"),
  };
}

function repository(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "ascout-help-init-")));
  roots.push(root);
  execFileSync("git", ["init", "-q"], { cwd: root, windowsHide: true });
  return root;
}

describe("ascout --help and --version, in process", () => {
  it.each(["--help", "-h", "help"])("%s prints usage on stdout and exits 0", async (flag) => {
    const io = capture();
    expect(await runCli([flag])).toBe(0);
    expect(io.stdout()).toBe(`${usageText()}\n`);
  });

  it("--version prints the package version and exits 0", async () => {
    const io = capture();
    expect(await runCli(["--version"])).toBe(0);
    expect(io.stdout()).toBe(`${ASCOUT_PACKAGE_VERSION}\n`);
  });
});

describe("ascout init, in process", () => {
  it("creates the config and the ignore entry, then reports that it kept both", async () => {
    const root = repository();
    process.chdir(root);
    let io = capture();
    expect(await runCli(["init"])).toBe(0);
    expect(io.stderr()).toContain("created ascout.config.json; added .ascout/ to .gitignore");
    vi.restoreAllMocks();
    io = capture();
    expect(await runCli(["init"])).toBe(0);
    expect(io.stderr()).toContain("kept the existing ascout.config.json; .ascout/ was already in .gitignore");
    expect(readFileSync(join(root, ".gitignore"), "utf8")).toBe(".ascout/");
  });

  it("appends the ignore entry to an existing .gitignore with or without a final newline", async () => {
    const root = repository();
    process.chdir(root);
    writeFileSync(join(root, ".gitignore"), "dist");
    capture();
    expect(await runCli(["init"])).toBe(0);
    expect(readFileSync(join(root, ".gitignore"), "utf8")).toBe("dist\n.ascout/");
  });

  it("still runs outside any repository, so it can come before git init", async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "ascout-help-init-plain-")));
    roots.push(root);
    process.chdir(root);
    capture();
    expect(await runCli(["init"])).toBe(0);
    expect(existsSync(join(root, "ascout.config.json"))).toBe(true);
  });

  it("refuses to run inside a .git directory and writes nothing there", async () => {
    const root = repository();
    process.chdir(join(root, ".git"));
    const io = capture();
    expect(await runCli(["init"])).toBe(2);
    expect(io.stderr()).toContain("inside a .git directory");
    expect(existsSync(join(root, ".git", "ascout.config.json"))).toBe(false);
    expect(existsSync(join(root, ".git", ".gitignore"))).toBe(false);
  });

  it("leaves no temporary file behind when it updates .gitignore", async () => {
    const root = repository();
    process.chdir(root);
    writeFileSync(join(root, ".gitignore"), "dist\n");
    capture();
    expect(await runCli(["init"])).toBe(0);
    expect(readFileSync(join(root, ".gitignore"), "utf8")).toBe("dist\n.ascout/");
    expect(readdirSync(root).filter((name) => name.startsWith(".gitignore."))).toEqual([]);
  });

  it("refuses a repository subdirectory, naming its place, and writes nothing", async () => {
    const root = repository();
    mkdirSync(join(root, "packages", "app"), { recursive: true });
    process.chdir(join(root, "packages", "app"));
    const io = capture();
    expect(await runCli(["init"])).toBe(2);
    expect(io.stderr()).toContain('this folder is "packages/app" inside a Git repository');
    expect(existsSync(join(root, "packages", "app", "ascout.config.json"))).toBe(false);
  });
});
