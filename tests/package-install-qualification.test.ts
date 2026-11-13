import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// E9 preparation: prove the packed tarball installs into a consumer project, runs through npm's
// own bin shim, and uninstalls cleanly. Nothing is published. The install is --offline: every
// runtime dependency resolves through overrides to this checkout's own node_modules, so the test
// never reaches a registry and a missing dependency fails it.
const repositoryRoot = resolve(__dirname, "..");
const IS_WINDOWS = process.platform === "win32";
const crossSpawn = createRequire(import.meta.url)("cross-spawn") as { sync: typeof spawnSync };
const temporary: string[] = [];
const RUNTIME_DEPENDENCIES = ["cross-spawn", "which", "isexe", "path-key", "shebang-command", "shebang-regex"];

afterAll(() => {
  for (const directory of temporary) rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

function npm(argv: readonly string[], cwd: string): string {
  const env = { ...process.env, npm_config_audit: "false", npm_config_fund: "false", npm_config_update_notifier: "false" };
  const npmCli = process.env.npm_execpath;
  const result = npmCli !== undefined && npmCli.endsWith(".js")
    ? spawnSync(process.execPath, [npmCli, ...argv], { cwd, env, encoding: "utf8", windowsHide: true })
    : crossSpawn.sync("npm", [...argv], { cwd, env, encoding: "utf8", windowsHide: true });
  if (result.error != null || result.status !== 0) {
    throw new Error(`npm ${argv.join(" ")} failed (status ${String(result.status)}): ${String(result.stderr).slice(-2000)}`);
  }
  return String(result.stdout);
}

describe("E9 package install qualification", () => {
  it("installs the packed tarball offline, runs the shim, and uninstalls cleanly", () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "ascout-e9-")));
    temporary.push(root);
    const source = join(root, "source");
    const consumer = join(root, "consumer");
    mkdirSync(source);
    mkdirSync(consumer);
    for (const file of ["package.json", "README.md", "LICENSE"]) copyFileSync(join(repositoryRoot, file), join(source, file));
    execFileSync(process.execPath, [join(repositoryRoot, "node_modules", "typescript", "bin", "tsc"), "-p", join(repositoryRoot, "tsconfig.json"), "--outDir", join(source, "dist")], { stdio: "pipe", windowsHide: true });

    const packed = JSON.parse(npm(["pack", "--json", "--ignore-scripts", "--pack-destination", root], source)) as { filename: string }[];
    const tarball = join(root, basename(packed[0]!.filename));
    expect(existsSync(tarball)).toBe(true);

    const overrides = Object.fromEntries(RUNTIME_DEPENDENCIES.map((name) => [name, `file:${join(repositoryRoot, "node_modules", name).replaceAll("\\", "/")}`]));
    writeFileSync(join(consumer, "package.json"), JSON.stringify({ name: "ascout-e9-consumer", version: "1.0.0", private: true, overrides }));
    npm(["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", "--no-save", `@thehalfmoon/ascout@file:${tarball.replaceAll("\\", "/")}`], consumer);

    const packageDir = join(consumer, "node_modules", "@thehalfmoon", "ascout");
    const shim = join(consumer, "node_modules", ".bin", IS_WINDOWS ? "ascout.cmd" : "ascout");
    expect(existsSync(join(packageDir, "dist", "cli.js"))).toBe(true);
    expect(existsSync(shim)).toBe(true);

    // Outside a repository, security runs nothing and says so: exit 4 and a JSON report.
    const outside = join(root, "outside");
    mkdirSync(outside);
    const run = crossSpawn.sync(shim, ["security", "--format", "json"], { cwd: outside, encoding: "utf8", windowsHide: true });
    expect(run.error ?? null).toBeNull();
    expect(run.status).toBe(4);
    expect(JSON.parse(String(run.stdout))).toMatchObject({ exit_code: 4 });

    // No command runs without a command: usage, exit 2.
    const usage = crossSpawn.sync(shim, [], { cwd: outside, encoding: "utf8", windowsHide: true });
    expect(usage.status).toBe(2);
    expect(String(usage.stderr)).toContain("Usage:");

    npm(["uninstall", "--offline", "--no-save", "@thehalfmoon/ascout"], consumer);
    expect(existsSync(packageDir)).toBe(false);
    const binDir = join(consumer, "node_modules", ".bin");
    expect(existsSync(binDir) ? readdirSync(binDir).filter((name) => name.toLowerCase().startsWith("ascout")) : []).toEqual([]);
  }, 300_000);
});
