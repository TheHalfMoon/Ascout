import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Synthetic fixtures only. Each payload does nothing but create an empty marker
// file in that fixture's own temp directory. Bounded hardening, not a sandbox.
const PROJECT_ROOT = resolve(__dirname, "..");
const OUT_DIR = join(PROJECT_ROOT, "node_modules", ".cache", "ascout-e1-cli");
const CLI = join(OUT_DIR, "cli.js");
const SCHEMA_PATH = join("specs", "001-changed-code-verification-receipt", "contracts", "receipt-v1.schema.json");
const COPIED_SCHEMA = join(PROJECT_ROOT, "node_modules", ".cache", SCHEMA_PATH);
const TIMEOUT_MS = 300_000;
const COMMANDS = [["doctor"], ["review", "--format", "json"], ["check", "--format", "json"]] as const;

const temporaryRoots: string[] = [];

interface Fixture {
  readonly root: string;
  readonly marker: string;
  readonly home: string;
}

function posix(path: string): string {
  return path.replaceAll("\\", "/");
}

// The fixture's own global config is isolated from the host's, for setup and for the run.
function isolatedEnv(fixture: Pick<Fixture, "home">, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.toUpperCase().startsWith("GIT_")) env[key] = value;
  }
  return {
    ...env,
    HOME: fixture.home,
    USERPROFILE: fixture.home,
    XDG_CONFIG_HOME: join(fixture.home, ".config"),
    GIT_CONFIG_NOSYSTEM: "1",
    ...extra,
  };
}

function git(fixture: Fixture, ...args: readonly string[]): void {
  const result = spawnSync("git", [...args], { cwd: fixture.root, env: isolatedEnv(fixture), encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
}

function fixture(): Fixture {
  const parent = mkdtempSync(join(realpathSync(tmpdir()), "ascout-e1-"));
  temporaryRoots.push(parent);
  const root = join(parent, "repo");
  const home = join(parent, "home");
  mkdirSync(root);
  mkdirSync(home);
  const value: Fixture = { root, home, marker: posix(join(parent, "MARKER")) };
  git(value, "init", "-q");
  git(value, "config", "user.name", "Ascout E1");
  git(value, "config", "user.email", "e1@example.invalid");
  git(value, "config", "commit.gpgsign", "false");
  writeFileSync(join(root, "a.txt"), "one\n");
  writeFileSync(join(root, "b.dat"), "one\n");
  git(value, "add", ".");
  git(value, "commit", "-qm", "baseline");
  writeFileSync(join(root, "a.txt"), "one\ntwo\n");
  writeFileSync(join(root, "b.dat"), "one\ntwo\n");
  return value;
}

function run(value: Fixture, args: readonly string[], extra: NodeJS.ProcessEnv = {}, cwd = value.root) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    env: isolatedEnv(value, extra),
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error !== undefined) throw result.error;
  return result;
}

function writeHomeConfig(value: Fixture, text: string): void {
  writeFileSync(join(value.home, ".gitconfig"), text);
}

function hasReceipt(root: string): boolean {
  const runtime = join(root, ".ascout");
  if (!existsSync(runtime)) return false;
  return readdirSync(runtime, { recursive: true }).some((entry) => String(entry).endsWith("receipt.json"));
}

beforeAll(() => {
  rmSync(OUT_DIR, { recursive: true, force: true });
  const compile = spawnSync(
    process.execPath,
    [join(PROJECT_ROOT, "node_modules", "typescript", "bin", "tsc"), "-p", join(PROJECT_ROOT, "tsconfig.json"), "--outDir", OUT_DIR],
    { cwd: PROJECT_ROOT, encoding: "utf8" },
  );
  expect(compile.status, compile.stdout + compile.stderr).toBe(0);
  writeFileSync(join(OUT_DIR, "package.json"), JSON.stringify({ type: "module" }));
  // The compiled receipt module resolves its schema relative to itself.
  mkdirSync(dirname(COPIED_SCHEMA), { recursive: true });
  copyFileSync(join(PROJECT_ROOT, SCHEMA_PATH), COPIED_SCHEMA);
}, TIMEOUT_MS);

afterAll(() => {
  rmSync(OUT_DIR, { recursive: true, force: true });
  rmSync(join(PROJECT_ROOT, "node_modules", ".cache", "specs"), { recursive: true, force: true });
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

interface Vector {
  readonly name: string;
  readonly arrange: (value: Fixture) => NodeJS.ProcessEnv;
}

const touch = (value: Fixture): string => `touch ${value.marker}`;

const script = (value: Fixture): string => {
  const path = posix(join(value.home, "payload.sh"));
  writeFileSync(path, `#!/bin/sh\ntouch ${value.marker}\n`, { mode: 0o755 });
  return path;
};

// None of these may launch a helper, and all must leave normal results in place.
const NON_EXECUTING_VECTORS: readonly Vector[] = [
  { name: "core.fsmonitor in repository config", arrange: (v) => { git(v, "config", "core.fsmonitor", touch(v)); return {}; } },
  { name: "core.fsmonitor in global config", arrange: (v) => { writeHomeConfig(v, `[core]\n\tfsmonitor = ${touch(v)}\n`); return {}; } },
  { name: "core.fsmonitor through include.path", arrange: (v) => {
    const included = posix(join(v.home, "included.cfg"));
    writeFileSync(included, `[core]\n\tfsmonitor = ${touch(v)}\n`);
    git(v, "config", "include.path", included);
    return {};
  } },
  { name: "core.fsmonitor through includeIf", arrange: (v) => {
    const included = posix(join(v.home, "included.cfg"));
    writeFileSync(included, `[core]\n\tfsmonitor = ${touch(v)}\n`);
    git(v, "config", "includeIf.gitdir:**.path", included);
    return {};
  } },
  { name: "diff.external", arrange: (v) => { git(v, "config", "diff.external", touch(v)); return {}; } },
  { name: "diff driver command", arrange: (v) => {
    git(v, "config", "diff.p.command", touch(v));
    writeFileSync(join(v.root, ".gitattributes"), "*.dat diff=p\n");
    return {};
  } },
  { name: "diff driver textconv", arrange: (v) => {
    git(v, "config", "diff.p.textconv", touch(v));
    writeFileSync(join(v.root, ".gitattributes"), "*.dat diff=p\n");
    return {};
  } },
  { name: "repository hooks through core.hooksPath", arrange: (v) => {
    const hooks = join(v.home, "hooks");
    mkdirSync(hooks);
    for (const hook of ["post-index-change", "pre-commit", "post-checkout", "reference-transaction"]) {
      writeFileSync(join(hooks, hook), `#!/bin/sh\ntouch ${v.marker}\n`, { mode: 0o755 });
    }
    git(v, "config", "core.hooksPath", posix(hooks));
    return {};
  } },
  { name: "core.sshCommand", arrange: (v) => { git(v, "config", "core.sshCommand", touch(v)); return {}; } },
  { name: "core.pager", arrange: (v) => { git(v, "config", "core.pager", touch(v)); return {}; } },
  { name: "submodule recursion", arrange: (v) => { git(v, "config", "submodule.recurse", "true"); return {}; } },
  { name: "GIT_EXTERNAL_DIFF", arrange: (v) => ({ GIT_EXTERNAL_DIFF: script(v) }) },
  { name: "GIT_PAGER", arrange: (v) => ({ GIT_PAGER: touch(v) }) },
  { name: "GIT_SSH_COMMAND", arrange: (v) => ({ GIT_SSH_COMMAND: touch(v) }) },
  { name: "GIT_CONFIG_COUNT", arrange: (v) => ({
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "core.fsmonitor",
    GIT_CONFIG_VALUE_0: touch(v),
  }) },
  { name: "GIT_CONFIG_PARAMETERS", arrange: (v) => ({ GIT_CONFIG_PARAMETERS: `'core.fsmonitor=${touch(v)}'` }) },
  { name: "GIT_CONFIG_GLOBAL", arrange: (v) => {
    const config = posix(join(v.home, "selected.cfg"));
    writeFileSync(config, `[core]\n\tfsmonitor = ${touch(v)}\n`);
    return { GIT_CONFIG_GLOBAL: config };
  } },
];

describe("E1 repository and environment selected helpers", { timeout: TIMEOUT_MS }, () => {
  it.each(NON_EXECUTING_VECTORS.map((vector) => [vector.name, vector] as const))(
    "does not launch a helper for %s, and keeps normal results",
    (_name, vector) => {
      for (const args of COMMANDS) {
        const value = fixture();
        const extra = vector.arrange(value);
        const result = run(value, args, extra);
        expect(existsSync(value.marker), `${args[0]} ran a helper`).toBe(false);
        expect(result.status, `${args[0]}: ${result.stderr}`).toBe(args[0] === "doctor" ? 0 : 4);
      }
    },
  );

  it("ignores GIT_DIR and GIT_WORK_TREE that point at another repository", () => {
    const value = fixture();
    const other = fixture();
    git(other, "config", "core.fsmonitor", touch(other));
    const report = run(value, ["review", "--format", "json"], {
      GIT_DIR: posix(join(other.root, ".git")),
      GIT_WORK_TREE: posix(other.root),
    });
    expect(report.status, report.stderr).toBe(4);
    expect(existsSync(other.marker)).toBe(false);
    const expected = run(value, ["review", "--format", "json"]);
    expect(JSON.parse(report.stdout)).toEqual(JSON.parse(expected.stdout));
  });

  it("keeps the subdirectory guard working when GIT_DIR is set", () => {
    const value = fixture();
    mkdirSync(join(value.root, "sub"));
    for (const command of ["review", "check"]) {
      const result = run(value, [command], { GIT_DIR: posix(join(value.root, ".git")) }, join(value.root, "sub"));
      expect(result.status, result.stderr).toBe(2);
      expect(result.stderr).toContain("must run from the repository root");
    }
  });
});

describe("E1 executable filter refusal", { timeout: TIMEOUT_MS }, () => {
  const drivers: readonly [string, (value: Fixture) => void][] = [
    ["a clean driver in repository config", (v) => git(v, "config", "filter.p.clean", `${touch(v)}; cat`)],
    ["a smudge driver in repository config", (v) => git(v, "config", "filter.p.smudge", `${touch(v)}; cat`)],
    ["a process driver in repository config", (v) => git(v, "config", "filter.p.process", touch(v))],
    ["a clean driver in global config", (v) => writeHomeConfig(v, `[filter "p"]\n\tclean = ${touch(v)}; cat\n`)],
    ["no driver at all", () => undefined],
  ];

  it.each(drivers)("refuses a filter attribute with %s", (_name, arrange) => {
    for (const args of COMMANDS) {
      const value = fixture();
      arrange(value);
      writeFileSync(join(value.root, ".gitattributes"), "*.dat filter=p\n");
      const result = run(value, args);
      expect(existsSync(value.marker), `${args[0]} ran a filter`).toBe(false);
      expect(result.status, `${args[0]}: ${result.stderr}`).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("b.dat");
      expect(result.stderr).toContain("filter attribute");
      expect(result.stderr).not.toContain(posix(value.root));
      expect(result.stderr).not.toContain(value.root);
      expect(hasReceipt(value.root)).toBe(false);
    }
  });

  it("refuses when only an untracked path matches", () => {
    const value = fixture();
    git(value, "config", "filter.p.clean", `${touch(value)}; cat`);
    writeFileSync(join(value.root, ".gitattributes"), "*.new filter=p\n");
    writeFileSync(join(value.root, "only.new"), "new\n");
    const result = run(value, ["review"]);
    expect(result.status, result.stderr).toBe(2);
    expect(result.stderr).toContain("only.new");
    expect(existsSync(value.marker)).toBe(false);
  });

  it("refuses when the attribute comes from a global attributes file", () => {
    const value = fixture();
    const attributes = posix(join(value.home, "attributes"));
    writeFileSync(attributes, "*.dat filter=p\n");
    writeHomeConfig(value, `[core]\n\tattributesFile = ${attributes}\n[filter "p"]\n\tclean = ${touch(value)}; cat\n`);
    const result = run(value, ["review"]);
    expect(result.status, result.stderr).toBe(2);
    expect(existsSync(value.marker)).toBe(false);
  });

  it("refuses a git-lfs style repository", () => {
    const value = fixture();
    writeFileSync(join(value.root, ".gitattributes"), "*.dat filter=lfs diff=lfs merge=lfs -text\n");
    const result = run(value, ["review"]);
    expect(result.status, result.stderr).toBe(2);
    expect(result.stderr).toContain("b.dat");
  });

  it("does not refuse -filter, or text, eol, and binary attributes", () => {
    const value = fixture();
    writeFileSync(join(value.root, ".gitattributes"), "*.dat -filter\n*.txt text eol=lf\n*.bin binary\n");
    for (const args of COMMANDS) {
      const result = run(value, args);
      expect(result.status, `${args[0]}: ${result.stderr}`).toBe(args[0] === "doctor" ? 0 : 4);
    }
  });
});

describe("E1 legitimate repository results", { timeout: TIMEOUT_MS }, () => {
  function clean(): Fixture {
    const value = fixture();
    git(value, "checkout", "-q", "--", ".");
    return value;
  }

  it("keeps honoring core.autocrlf from global config", () => {
    const value = clean();
    writeHomeConfig(value, "[core]\n\tautocrlf = true\n");
    writeFileSync(join(value.root, "a.txt"), "one\r\n");
    const report = JSON.parse(run(value, ["review", "--format", "json"]).stdout) as { unreviewed_changes: unknown[] };
    expect(report.unreviewed_changes).toEqual([]);
  });

  it("keeps honoring core.excludesFile from global config", () => {
    const value = clean();
    const excludes = posix(join(value.home, "excludes"));
    writeFileSync(excludes, "*.globalignored\n");
    writeHomeConfig(value, `[core]\n\texcludesFile = ${excludes}\n`);
    writeFileSync(join(value.root, "x.globalignored"), "x\n");
    const report = JSON.parse(run(value, ["review", "--format", "json"]).stdout) as { unreviewed_changes: unknown[] };
    expect(report.unreviewed_changes).toEqual([]);
  });

  it("produces a stable source identity across equivalent environments", () => {
    const value = fixture();
    const first = run(value, ["doctor"]);
    const second = run(value, ["doctor"], { GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "core.autocrlf", GIT_CONFIG_VALUE_0: "true" });
    expect(second.status).toBe(first.status);
    expect(second.stderr).toBe(first.stderr);
  });
});
