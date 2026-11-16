import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runCheck } from "../src/check.js";

// Issue #591, acceptance item 3: characterize check under Git attribute and configuration changes
// made concurrently, during the run. Here the repository's own task makes the change, as hostile
// code running under T0 could. Ascout must never run a repository-selected Git helper (the marker
// command), and must never finish such a run as COMPLETE with exit 0: drift (3) or a refusal or error
// (2) are the honest outcomes. Synthetic fixtures only; each payload creates an empty marker file in
// its own temporary folder.
vi.setConfig({ testTimeout: 180_000 });

const scratches: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  for (const dir of scratches.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const posix = (path: string): string => path.replaceAll("\\", "/");

function git(root: string, home: string, ...args: string[]): void {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", env: { ...process.env, HOME: home, USERPROFILE: home, GIT_CONFIG_NOSYSTEM: "1" } });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
}

/**
 * A repository whose typecheck task, mid-run, applies `mutation` (a Node snippet with `root`,
 * `marker`, `cp` and `fs` in scope) and then sleeps briefly, so the change lands between Ascout's
 * observations.
 */
function repository(mutation: string, setup: (root: string, home: string) => void = () => undefined): { root: string; marker: string } {
  const scratch = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-git-race-")));
  scratches.push(scratch);
  const root = join(scratch, "repo");
  const home = join(scratch, "home");
  const marker = join(scratch, "helper-ran");
  mkdirSync(root);
  mkdirSync(home);
  vi.stubEnv("HOME", home);
  vi.stubEnv("USERPROFILE", home);
  vi.stubEnv("GIT_CONFIG_NOSYSTEM", "1");
  writeFileSync(join(root, ".gitignore"), ".ascout/\n");
  writeFileSync(join(root, "a.js"), "export const a = 1;\n");
  const task = [
    "const fs = require('node:fs'); const cp = require('node:child_process');",
    `const root = ${JSON.stringify(root)}; const marker = ${JSON.stringify(posix(marker))};`,
    mutation,
    "setTimeout(() => {}, 300);",
  ].join(" ");
  writeFileSync(join(root, "ascout.config.json"), JSON.stringify({ version: 1, tasks: { typecheck: { command: [process.execPath, "-e", task] } } }));
  for (const args of [["init", "-q"], ["config", "user.name", "Ascout Race Fixture"], ["config", "user.email", "race@example.invalid"], ["config", "commit.gpgsign", "false"]]) git(root, home, ...args);
  setup(root, home);
  git(root, home, "add", ".");
  git(root, home, "commit", "-qm", "baseline");
  return { root, marker };
}

// The repository-selected helper: a filter driver that only creates the marker.
const DEFINE_FILTER = "cp.execFileSync('git', ['config', 'filter.evil.clean', 'touch \"' + marker + '\" && cat'], { cwd: root }); cp.execFileSync('git', ['config', 'filter.evil.smudge', 'touch \"' + marker + '\" && cat'], { cwd: root });";

/** The run's exit code; a refusal to read the repository is the CLI's exit 2. */
async function outcome(root: string): Promise<number> {
  try {
    const { receipt } = await runCheck(root);
    return receipt.summary.exit_code;
  } catch (error) {
    expect(String(error)).toMatch(/refusing to read this repository: .* filter attribute/u);
    return 2;
  }
}

describe("check under Git attribute and configuration changes during the run (#591)", () => {
  it("a filter attribute and driver added mid-run: no helper runs, and the run is not COMPLETE", async () => {
    const { root, marker } = repository(`${DEFINE_FILTER} fs.writeFileSync(root + '/.gitattributes', '*.js filter=evil\\n');`);
    const exit = await outcome(root);
    expect(existsSync(marker)).toBe(false);
    expect([2, 3]).toContain(exit);
  });

  it("an attributes file redirected through repository config mid-run: no helper runs, and the run is not COMPLETE", async () => {
    const { root, marker } = repository(`${DEFINE_FILTER} fs.writeFileSync(root + '/../redirected-attributes', '*.js filter=evil\\n'); cp.execFileSync('git', ['config', 'core.attributesFile', root + '/../redirected-attributes'], { cwd: root });`);
    const exit = await outcome(root);
    expect(existsSync(marker)).toBe(false);
    expect([2, 3]).toContain(exit);
  });

  it("an existing attributes file edited mid-run to add a filter: no helper runs, and the run is not COMPLETE", async () => {
    const { root, marker } = repository(`${DEFINE_FILTER} fs.appendFileSync(root + '/.gitattributes', '*.js filter=evil\\n');`, (fixtureRoot) => {
      writeFileSync(join(fixtureRoot, ".gitattributes"), "*.js text eol=lf\n");
    });
    const exit = await outcome(root);
    expect(existsSync(marker)).toBe(false);
    expect([2, 3]).toContain(exit);
  });

  it("a control: the same task without the change completes normally, so the cases above test the change", async () => {
    const { root, marker } = repository("void 0;");
    const exit = await outcome(root);
    expect(existsSync(marker)).toBe(false);
    expect(exit).not.toBe(2);
  });
});
