import { describe, expect, it, vi } from "vitest";

// An installed Ascout package does not carry Playwright (a development dependency). The browser
// adapter must still import cleanly there, and fail with a clear message only when a browser is
// actually driven.
vi.mock("playwright", () => {
  throw new Error("Cannot find package 'playwright'");
});

const adapter = await import("../src/browser/playwright-adapter.js");

describe("the browser adapter without Playwright installed", () => {
  it("imports, keeping its pure helpers usable", () => {
    expect(adapter.PINNED_PLAYWRIGHT_VERSION).toBe("1.63.0");
    expect(() => adapter.assertPinnedPlaywrightVersion("1.63.0")).not.toThrow();
  });

  it("says the browser engine is missing when a browser is needed", () => {
    expect(() => adapter.ensureChromiumInstalled()).toThrow(adapter.PLAYWRIGHT_MISSING_TEXT);
    expect(adapter.PLAYWRIGHT_MISSING_TEXT).toContain("playwright@1.63.0");
  });
});
