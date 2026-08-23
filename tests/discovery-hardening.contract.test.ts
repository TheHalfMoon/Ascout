import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DiscoveryError,
  discoverProject,
  discoverProjectFromFiles,
} from "../src/discovery.js";

function expectDiscoveryError(action: () => unknown, code: string, sourcePath?: string): void {
  try {
    action();
    throw new Error("expected discovery to fail closed");
  } catch (error) {
    expect(error).toBeInstanceOf(DiscoveryError);
    expect(error).toMatchObject({
      code,
      ...(sourcePath === undefined ? {} : { sourcePath }),
    });
  }
}

describe("T034 discovery hardening", () => {
  it("rejects backslash-delimited virtual paths before discovery", () => {
    expectDiscoveryError(
      () => discoverProjectFromFiles({ "src\\package.json": "{}" }),
      "invalid_discovery_path",
      "src\\package.json",
    );
  });

  it("accepts bounded pnpm workspace files with full-line and inline comments", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": JSON.stringify({ name: "root", private: true }),
      "pnpm-workspace.yaml": [
        "# repository workspace declaration",
        "packages:",
        "  # application packages",
        "  - packages/* # one level only",
        "",
      ].join("\n"),
      "packages/app/package.json": JSON.stringify({
        name: "app",
        private: true,
        devDependencies: { jest: "30.0.0" },
      }),
    });

    expect(discovery.workspace).toEqual({
      state: "resolved",
      kind: "basic",
      patterns: ["packages/*"],
      packageJsonPaths: ["package.json", "packages/app/package.json"],
      sourcePaths: ["pnpm-workspace.yaml"],
      reasonCode: null,
      reasonText: null,
    });
    expect(discovery.jsTestRunner).toEqual({
      state: "resolved",
      value: "jest",
      sourcePaths: ["packages/app/package.json"],
    });
  });

  it("fails closed on noncanonical workspace patterns instead of silently dropping packages", () => {
    for (const pattern of ["./packages/*", "packages\\*", "packages/", "packages//app"] as const) {
      const discovery = discoverProjectFromFiles({
        "package.json": JSON.stringify({
          name: "root",
          private: true,
          workspaces: [pattern],
        }),
        "packages/app/package.json": JSON.stringify({
          name: "app",
          private: true,
          devDependencies: { vitest: "4.1.10" },
        }),
      });

      expect(discovery.workspace).toMatchObject({
        state: "unsupported",
        kind: null,
        patterns: [pattern],
        packageJsonPaths: ["package.json"],
        reasonCode: "workspace_declaration_unsupported",
      });
      expect(discovery.jsTestRunner.state).toBe("absent");
    }
  });

  it("uses locale-independent code-unit ordering for discovered manifest evidence", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        name: "root",
        private: true,
        workspaces: ["packages/*"],
      }),
      "packages/a/package.json": JSON.stringify({
        name: "a",
        devDependencies: { vitest: "4.1.10" },
      }),
      "packages/Z/package.json": JSON.stringify({
        name: "Z",
        devDependencies: { vitest: "4.1.10" },
      }),
      "packages/ä/package.json": JSON.stringify({
        name: "unicode",
        devDependencies: { vitest: "4.1.10" },
      }),
    });

    expect(discovery.workspace.packageJsonPaths).toEqual([
      "package.json",
      "packages/Z/package.json",
      "packages/a/package.json",
      "packages/ä/package.json",
    ]);
    expect(discovery.tools.vitest.declarationPaths).toEqual([
      "packages/Z/package.json",
      "packages/a/package.json",
      "packages/ä/package.json",
    ]);
  });

  it("rejects oversized discovery metadata before reading it into memory", () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-discovery-size-"));
    try {
      const oversized = JSON.stringify({ padding: "x".repeat(1024 * 1024) });
      writeFileSync(join(root, "package.json"), oversized, "utf8");
      expectDiscoveryError(
        () => discoverProject(root),
        "repository_read_error",
        "package.json",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects relevant symlinks whose real target escapes the repository", () => {
    if (process.platform === "win32") return;

    const root = mkdtempSync(join(tmpdir(), "ascout-discovery-root-"));
    const outside = mkdtempSync(join(tmpdir(), "ascout-discovery-outside-"));
    try {
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({ name: "root", private: true, devDependencies: { vitest: "4.1.10" } }),
        "utf8",
      );
      writeFileSync(join(outside, "vitest.config.ts"), "export default {};\n", "utf8");
      symlinkSync(join(outside, "vitest.config.ts"), join(root, "vitest.config.ts"));

      expectDiscoveryError(
        () => discoverProject(root),
        "repository_read_error",
        "vitest.config.ts",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("rejects local executable symlinks whose real target escapes the repository", () => {
    if (process.platform === "win32") return;

    const root = mkdtempSync(join(tmpdir(), "ascout-discovery-bin-root-"));
    const outside = mkdtempSync(join(tmpdir(), "ascout-discovery-bin-outside-"));
    try {
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({ name: "root", private: true, devDependencies: { typescript: "6.0.3" } }),
        "utf8",
      );
      mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
      writeFileSync(join(outside, "tsc"), "external executable\n", "utf8");
      symlinkSync(join(outside, "tsc"), join(root, "node_modules", ".bin", "tsc"));

      expectDiscoveryError(
        () => discoverProject(root),
        "repository_read_error",
        "node_modules/.bin/tsc",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
