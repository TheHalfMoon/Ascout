import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const cliPath = fileURLToPath(new URL("../benchmarks/misses.mjs", import.meta.url));

describe("T078 selector-miss CLI source binding", () => {
  it("rejects a T076 input whose measured bytes do not match the declared SHA-256", () => {
    const directory = mkdtempSync(join(tmpdir(), "ascout-t078-cli-"));
    const inputPath = join(directory, "t076-aggregate.json");
    writeFileSync(inputPath, "{}\n", "utf8");

    try {
      let stderr = "";
      try {
        execFileSync(process.execPath, [
          cliPath,
          "--input",
          inputPath,
          "--qualification-run-id",
          "33236015286",
          "--t076-aggregate-sha256",
          "0".repeat(64),
          "--t077-aggregate-sha256",
          "1".repeat(64),
          "--aggregate-artifact-digest",
          `sha256:${"2".repeat(64)}`,
        ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
        throw new Error("expected T078 CLI digest mismatch to fail");
      } catch (error: any) {
        stderr = String(error?.stderr ?? "");
      }

      expect(stderr).toContain("T076 aggregate SHA-256 mismatch");
      expect(stderr).toContain("expected " + "0".repeat(64));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
