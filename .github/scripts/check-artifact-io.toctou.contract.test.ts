import {
  appendFileSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { openManagedGeneratedArtifact } from "../src/check.js";

const CAP_BYTES = 8 * 1024 * 1024;

describe("T051 managed generated-artifact I/O", () => {
  it("accepts an exact physical file inside the managed run directory", () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-t051-artifact-"));
    try {
      const runPath = join(root, "run");
      mkdirSync(join(runPath, "raw", "test"), { recursive: true });
      const artifact = join(runPath, "raw", "test", "vitest-results.json");
      writeFileSync(artifact, "{}\n");

      const handle = openManagedGeneratedArtifact(runPath, "raw/test/vitest-results.json");
      try {
        expect(handle.expectedPath).toBe(artifact);
        expect(handle.readBounded().toString("utf8")).toBe("{}\n");
        expect(() => handle.assertStillBound()).not.toThrow();
      } finally {
        handle.close();
      }
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

      expect(() => openManagedGeneratedArtifact(runPath, "raw/test/vitest-results.json"))
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

      expect(() => openManagedGeneratedArtifact(runPath, "raw/test/coverage/lcov.info"))
        .toThrow("generated artifact does not resolve to its exact managed run path");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects hard-linked generated artifacts so descriptor rewrites cannot alias outside the run", () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-t051-artifact-"));
    try {
      const runPath = join(root, "run");
      mkdirSync(join(runPath, "raw", "test"), { recursive: true });
      const outside = join(root, "outside.json");
      const artifact = join(runPath, "raw", "test", "vitest-results.json");
      writeFileSync(outside, "secret\n");
      linkSync(outside, artifact);

      expect(() => openManagedGeneratedArtifact(runPath, "raw/test/vitest-results.json"))
        .toThrow("single-link physical file");
      expect(readFileSync(outside, "utf8")).toBe("secret\n");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps reads and redaction rewrites bound to the opened descriptor after pathname replacement", () => {
    if (process.platform === "win32") return;

    const root = mkdtempSync(join(tmpdir(), "ascout-t051-artifact-"));
    try {
      const runPath = join(root, "run");
      mkdirSync(join(runPath, "raw", "test"), { recursive: true });
      const artifact = join(runPath, "raw", "test", "vitest-results.json");
      const moved = join(runPath, "raw", "test", "opened-original.json");
      const outside = join(root, "outside.json");
      writeFileSync(artifact, "inside\n");
      writeFileSync(outside, "outside-secret\n");

      const handle = openManagedGeneratedArtifact(runPath, "raw/test/vitest-results.json");
      try {
        renameSync(artifact, moved);
        symlinkSync(outside, artifact);

        expect(handle.readBounded().toString("utf8")).toBe("inside\n");
        handle.replace(Buffer.from("redacted\n", "utf8"));
        expect(readFileSync(moved, "utf8")).toBe("redacted\n");
        expect(readFileSync(outside, "utf8")).toBe("outside-secret\n");
        expect(() => handle.assertStillBound())
          .toThrow("generated artifact does not resolve to its exact managed run path");
      } finally {
        handle.close();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed if an opened artifact grows beyond the evidence cap before capture", () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-t051-artifact-"));
    try {
      const runPath = join(root, "run");
      mkdirSync(join(runPath, "raw", "test"), { recursive: true });
      const artifact = join(runPath, "raw", "test", "vitest-results.json");
      writeFileSync(artifact, "{}\n");

      const handle = openManagedGeneratedArtifact(runPath, "raw/test/vitest-results.json");
      try {
        appendFileSync(artifact, Buffer.alloc(CAP_BYTES + 1));
        expect(() => handle.readBounded()).toThrow("exceeds the evidence size budget");
      } finally {
        handle.close();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
