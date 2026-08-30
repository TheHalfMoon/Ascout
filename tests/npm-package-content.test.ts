import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

interface NpmPackFile {
  readonly path: string;
}

interface NpmPackResult {
  readonly filename: string;
  readonly files: readonly NpmPackFile[];
}

const temporaryDirectories: string[] = [];
const repositoryRoot = resolve(process.cwd());

function runNpm(argv: readonly string[], cwd: string): string {
  const npmCli = process.env.npm_execpath;
  if (npmCli === undefined || npmCli.length === 0) {
    throw new Error("T082 requires npm_execpath from the canonical npm test invocation");
  }
  return execFileSync(process.execPath, [npmCli, ...argv], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      npm_config_audit: "false",
      npm_config_fund: "false",
      npm_config_ignore_scripts: "true",
    },
  });
}

function parsePackResult(output: string): NpmPackResult {
  const parsed = JSON.parse(output) as unknown;
  if (!Array.isArray(parsed) || parsed.length !== 1 || typeof parsed[0] !== "object" || parsed[0] === null) {
    throw new Error("npm pack did not return exactly one JSON package result");
  }
  const result = parsed[0] as Partial<NpmPackResult>;
  if (typeof result.filename !== "string" || !Array.isArray(result.files)) {
    throw new Error("npm pack JSON result is missing filename/files");
  }
  return result as NpmPackResult;
}

function listFiles(root: string): string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() || entry.isSymbolicLink()) {
        files.push(relative(root, absolute).replaceAll("\\", "/"));
      }
    }
  };
  visit(root);
  return files.sort();
}

function assertPackageSurface(paths: readonly string[]): void {
  expect(paths).toContain("package.json");
  expect(paths).toContain("README.md");
  expect(paths).toContain("LICENSE");
  expect(paths).toContain("dist/cli.js");

  for (const path of paths) {
    expect(
      path === "package.json" ||
        path === "README.md" ||
        path === "LICENSE" ||
        path.startsWith("dist/"),
      `unexpected npm package path: ${path}`,
    ).toBe(true);
  }

  for (const forbiddenPrefix of [
    ".ascout/",
    "src/",
    "tests/",
    "specs/",
    "benchmarks/",
    "fixtures/",
    "coverage/",
    "logs/",
    "secrets/",
  ]) {
    expect(paths.some((path) => path === forbiddenPrefix.slice(0, -1) || path.startsWith(forbiddenPrefix))).toBe(false);
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("T082/T087 npm package content and identity", () => {
  it("packs only the positive release surface with the scoped fallback and preserves the ascout binary", () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-t082-package-"));
    temporaryDirectories.push(root);
    const packageRoot = join(root, "package-source");
    const tarballRoot = join(root, "tarballs");
    const consumerRoot = join(root, "consumer");
    mkdirSync(packageRoot);
    mkdirSync(tarballRoot);
    mkdirSync(consumerRoot);

    for (const filename of ["package.json", "README.md", "LICENSE"] as const) {
      copyFileSync(join(repositoryRoot, filename), join(packageRoot, filename));
    }

    const tsc = join(repositoryRoot, "node_modules", "typescript", "bin", "tsc");
    execFileSync(process.execPath, [
      tsc,
      "-p",
      join(repositoryRoot, "tsconfig.json"),
      "--outDir",
      join(packageRoot, "dist"),
    ], {
      cwd: repositoryRoot,
      stdio: "pipe",
      windowsHide: true,
    });

    const dryRun = parsePackResult(runNpm([
      "pack",
      "--dry-run",
      "--json",
      "--ignore-scripts",
    ], packageRoot));
    const dryRunPaths = dryRun.files.map(({ path }) => path).sort();
    assertPackageSurface(dryRunPaths);

    const packed = parsePackResult(runNpm([
      "pack",
      "--json",
      "--ignore-scripts",
      "--pack-destination",
      tarballRoot,
    ], packageRoot));
    const packedPaths = packed.files.map(({ path }) => path).sort();
    expect(packedPaths).toEqual(dryRunPaths);
    assertPackageSurface(packedPaths);

    const tarball = join(tarballRoot, basename(packed.filename));
    expect(existsSync(tarball)).toBe(true);

    execFileSync("tar", ["-xzf", tarball, "-C", consumerRoot], {
      cwd: consumerRoot,
      stdio: "pipe",
      windowsHide: true,
    });

    const extractedRoot = join(consumerRoot, "package");
    const extractedPaths = listFiles(extractedRoot);
    expect(extractedPaths).toEqual(packedPaths);
    assertPackageSurface(extractedPaths);

    const extractedManifest = JSON.parse(readFileSync(join(extractedRoot, "package.json"), "utf8")) as {
      readonly name?: string;
      readonly private?: boolean;
      readonly bin?: Record<string, string>;
      readonly files?: readonly string[];
    };
    expect(extractedManifest.name).toBe("@thehalfmoon/ascout");
    expect(extractedManifest.private).toBe(true);
    expect(extractedManifest.bin).toEqual({ ascout: "./dist/cli.js" });
    expect(extractedManifest.files).toEqual(["dist"]);

    const cliTarget = join(extractedRoot, "dist", "cli.js");
    expect(existsSync(cliTarget)).toBe(true);
    expect(readFileSync(cliTarget, "utf8").startsWith("#!/usr/bin/env node")).toBe(true);
  }, 60_000);
});
