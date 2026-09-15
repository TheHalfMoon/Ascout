import { describe, expect, it } from "vitest";
import {
  actionSemanticError,
  assertPinnedPlaywrightVersion,
  ensureChromiumInstalled,
  mapPlaywrightError,
  PINNED_PLAYWRIGHT_VERSION,
  resolveNavigateTarget,
} from "../src/browser/playwright-adapter.js";

describe("spec016 p016-04 adapter contract (no browser needed)", () => {
  it("pins exactly playwright 1.63.0", () => {
    expect(PINNED_PLAYWRIGHT_VERSION).toBe("1.63.0");
    assertPinnedPlaywrightVersion("1.63.0");
    for (const other of ["1.62.0", "1.63.1", "", null, undefined]) {
      expect(() => assertPinnedPlaywrightVersion(other)).toThrow(Error);
    }
  });

  it("returns the installed chromium executable without provisioning", () => {
    const executable = ensureChromiumInstalled();
    expect(executable.toLowerCase()).toContain("chrom");
  });

  it("maps playwright failures to timeout or failed, never silent pass", () => {
    const timeout = new Error("waiting failed");
    timeout.name = "TimeoutError";
    expect(mapPlaywrightError(timeout)).toEqual({
      code: "E_TIMEOUT",
      message: "waiting failed",
      status: "timeout",
    });
    expect(mapPlaywrightError(new Error("boom"))).toEqual({
      code: "E_ACTION_FAILED",
      message: "boom",
      status: "failed",
    });
    expect(mapPlaywrightError("string failure")).toEqual({
      code: "E_ACTION_FAILED",
      message: "string failure",
      status: "failed",
    });
    const long = new Error(`first${"x".repeat(1000)}`);
    const mapped = mapPlaywrightError(long);
    expect(mapped.message.length).toBeLessThanOrEqual(501);
    expect(mapped.message.startsWith("first")).toBe(true);
  });

  it("refuses value-setting actions without a value", () => {
    for (const kind of ["fill", "type", "select", "press"]) {
      expect(actionSemanticError(kind, null)).toEqual({
        code: "E_MISSING_VALUE",
        message: `${kind} requires a value`,
      });
      expect(actionSemanticError(kind, "v")).toBeNull();
    }
    expect(actionSemanticError("click", null)).toBeNull();
    expect(actionSemanticError("navigate", null)).toBeNull();
  });

  it("joins origin-relative navigate targets purely", () => {
    expect(
      resolveNavigateTarget("http://127.0.0.1:3100", "/cart"),
    ).toBe("http://127.0.0.1:3100/cart");
    expect(
      resolveNavigateTarget(
        "http://127.0.0.1:3100",
        "https://example.test/x",
      ),
    ).toBe("https://example.test/x");
  });
});
