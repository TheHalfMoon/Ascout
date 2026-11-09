import { describe, expect, it, vi } from "vitest";

vi.mock("playwright", async (importOriginal) => {
  const actual = await importOriginal<typeof import("playwright")>();
  return {
    ...actual,
    chromium: { ...actual.chromium, executablePath: () => "/nonexistent/ascout-test/chrome" },
  };
});

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    execFileSync: vi.fn(() => {
      throw new Error("provisioning must not run");
    }),
  };
});

const { ensureChromiumInstalled } = await import("../src/browser/playwright-adapter.js");
const childProcess = await import("node:child_process");

describe("ensureChromiumInstalled without Chromium", () => {
  it("fails with the install command and installs nothing", () => {
    expect(() => ensureChromiumInstalled()).toThrow(/npx playwright install chromium/u);
    expect(childProcess.execFileSync).not.toHaveBeenCalled();
  });
});
