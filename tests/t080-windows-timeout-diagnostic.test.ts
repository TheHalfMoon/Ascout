import { describe, expect, it } from "vitest";

import { runProcess } from "../src/process.js";

describe("T080 Windows timeout diagnostic", () => {
  it.skipIf(process.platform !== "win32")(
    "reports the exact timeout cleanup result",
    async () => {
      const result = await runProcess({
        file: process.execPath,
        argv: ["-e", "setInterval(() => {}, 1000)"],
        cwd: process.cwd(),
        timeout_ms: 100,
        termination_grace_ms: 50,
        capture_cap_bytes: 64 * 1024,
      });

      if (result.outcome !== "timed_out") {
        throw new Error(`T080 diagnostic: ${JSON.stringify(result)}`);
      }
      expect(result.cleanup_complete).toBe(true);
    },
  );
});
