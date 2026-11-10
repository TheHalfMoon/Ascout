import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createRequire } from "node:module";

import { afterAll, describe, expect, it } from "vitest";

// FD-6 preparation: a release checksum is only meaningful if the tarball can be rebuilt bit for
// bit, and a Windows-built tarball must start on Linux and macOS. So two independent builds must
// pack to the same SHA-256, and no packed file may contain a carriage return (a CRLF shebang
// fails with "env: 'node\r'"). This checks one OS and Node version per CI lane; matching digests
// across lanes is a release-time check.
const repositoryRoot = resolve(__dirname, "..");
const crossSpawn = createRequire(import.meta.url)("cross-spawn") as { sync: typeof spawnSync };
const scratch = realpathSync(mkdtempSync(join(tmpdir(), "ascout-repro-")));
afterAll(() => rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

function npm(argv: readonly string[], cwd: string): string {
  const env = { ...process.env, npm_config_audit: "false", npm_config_fund: "false", npm_config_update_notifier: "false" };
  const npmCli = process.env.npm_execpath;
  const result = npmCli !== undefined && npmCli.endsWith(".js")
    ? spawnSync(process.execPath, [npmCli, ...argv], { cwd, env, encoding: "utf8", windowsHide: true })
    : crossSpawn.sync("npm", [...argv], { cwd, env, encoding: "utf8", windowsHide: true });
  if (result.error != null || result.status !== 0) throw new Error(`npm ${argv.join(" ")}: ${String(result.stderr).slice(-1500)}`);
  return String(result.stdout);
}

function buildAndPack(label: string): string {
  const source = join(scratch, label);
  const out = join(scratch, `${label}-out`);
  mkdirSync(source);
  mkdirSync(out);
  for (const file of ["package.json", "README.md", "LICENSE"]) copyFileSync(join(repositoryRoot, file), join(source, file));
  execFileSync(process.execPath, [join(repositoryRoot, "node_modules", "typescript", "bin", "tsc"), "-p", join(repositoryRoot, "tsconfig.json"), "--outDir", join(source, "dist")], { stdio: "pipe", windowsHide: true });
  const packed = JSON.parse(npm(["pack", "--json", "--ignore-scripts", "--pack-destination", out], source)) as { filename: string }[];
  return join(out, basename(packed[0]!.filename));
}

function listFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

describe("FD-6 release preparation: reproducible package", () => {
  it("packs two independent builds to the same SHA-256, with LF-only files and an exact shebang", () => {
    const first = buildAndPack("one");
    const second = buildAndPack("two");
    const digest = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
    expect(digest(second)).toBe(digest(first));

    // Relative paths, so GNU tar on Windows doesn't read "C:" as a remote host.
    const extracted = join(scratch, "one-out");
    execFileSync("tar", ["-xzf", basename(first)], { cwd: extracted, stdio: "pipe", windowsHide: true });
    const files = listFiles(join(extracted, "package"));
    expect(files.length).toBeGreaterThan(10);
    const withCarriageReturn = files.filter((file) => file.endsWith(".js") && readFileSync(file).includes(0x0d));
    expect(withCarriageReturn).toEqual([]);
    expect(readFileSync(join(extracted, "package", "dist", "cli.js"), "utf8").startsWith("#!/usr/bin/env node\n")).toBe(true);
  }, 600_000);
});
