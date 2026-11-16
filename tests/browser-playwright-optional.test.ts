import { describe, expect, it } from "vitest";

import {
  PLAYWRIGHT_MISSING_TEXT,
  chromiumOrThrowV1,
  isMissingPlaywright,
  loadPlaywrightV1,
} from "../src/browser/playwright-adapter.js";

// An installed Ascout package does not carry Playwright (a development dependency). The browser
// adapter must import cleanly there and fail with a clear message only when a browser is driven,
// while a broken installation surfaces its real cause. (Importing the built module from a folder
// with no node_modules was also checked by hand when this landed.)
describe("loading Playwright", () => {
  it("gives null only for a missing package, rethrows a broken one, and returns a working one", async () => {
    const missing = Object.assign(new Error("Cannot find package 'playwright' imported from x"), { code: "ERR_MODULE_NOT_FOUND" });
    await expect(loadPlaywrightV1(async () => { throw missing; })).resolves.toBeNull();
    await expect(loadPlaywrightV1(async () => { throw new SyntaxError("Unexpected token in playwright/lib/index.js"); })).rejects.toThrow(/Unexpected token/u);
    const module = { chromium: { name: "chromium" } } as unknown as typeof import("playwright");
    await expect(loadPlaywrightV1(async () => module)).resolves.toBe(module);
    expect(chromiumOrThrowV1(module)).toBe(module.chromium);
  });

  it("says the browser engine is missing when there is no Playwright", () => {
    expect(() => chromiumOrThrowV1(null)).toThrow(PLAYWRIGHT_MISSING_TEXT);
    expect(PLAYWRIGHT_MISSING_TEXT).toContain("playwright@1.63.0");
  });
});

describe("telling a missing Playwright from a broken one", () => {
  it.each([
    [{ code: "ERR_MODULE_NOT_FOUND", message: "Cannot find package 'playwright' imported from x" }, true],
    [{ code: "MODULE_NOT_FOUND", message: "Cannot find module \"playwright\"" }, true],
    [{ code: "ERR_MODULE_NOT_FOUND", message: "Cannot find package 'playwright-core' imported from playwright" }, false],
    [{ code: "ERR_MODULE_NOT_FOUND", message: "Cannot find package 'some-dependency'" }, false],
    [new SyntaxError("Unexpected token in playwright/index.mjs"), false],
    [null, false],
    ["playwright", false],
  ])("%j is missing: %s", (error, missing) => {
    expect(isMissingPlaywright(error)).toBe(missing);
  });
});
