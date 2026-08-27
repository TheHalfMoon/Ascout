import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveManagedGeneratedArtifactPath } from "../src/check.js";

describe("T051 managed generated-artifact I/O", () => {
  it("accepts an exact physical file inside the managed run directory", () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-t051-artifact-"));
    try {
      const runPath = join(root, "run");
      mkdirSync(join(runPath, "raw", "test"), { recursive: true });
      const artifact = join(runPath, "raw", "test", "vitest-results.json");
      writeFileSync(artifact, "{}\n");

      expect(resolveManagedGeneratedArtifactPath(runPath, "raw/test/vitest-results.json")).toBe(artifact);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a generated artifact symlink instead of following it outside the managed run", () => {
    if (process.platform === "win32") return;

    const root = mkdtempSync(join(tmpdir(), "ascout-t051-artifact-"));
    try {
      const runPath = join(root, "run");
      mkdirSync(join(runPath, "raw", "test"), { recursive: true });
      const outside = join(root, "outside.json");
      writeFileSync(outside, "secret\n");
      symlinkSync(outside, join(runPath, "raw", "test", "vitest-results.json"));

      expect(() => resolveManagedGeneratedArtifactPath(runPath, "raw/test/vitest-results.json"))
        .toThrow("generated artifact does not resolve to its exact managed run path");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked generated-artifact parent directory", () => {
    if (process.platform === "win32") return;

    const root = mkdtempSync(join(tmpdir(), "ascout-t051-artifact-"));
    try {
      const runPath = join(root, "run");
      const outsideDirectory = join(root, "outside-coverage");
      mkdirSync(join(runPath, "raw", "test"), { recursive: true });
      mkdirSync(outsideDirectory, { recursive: true });
      writeFileSync(join(outsideDirectory, "lcov.info"), "TN:\n");
      symlinkSync(outsideDirectory, join(runPath, "raw", "test", "coverage"), "dir");

      expect(() => resolveManagedGeneratedArtifactPath(runPath, "raw/test/coverage/lcov.info"))
        .toThrow("generated artifact does not resolve to its exact managed run path");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
