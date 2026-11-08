import { describe, expect, it } from "vitest";

import { createSessionIdentity } from "../src/browser/executor.js";
import { isOffOriginRequest, resolveNavigateTarget } from "../src/browser/playwright-adapter.js";

const ORIGIN = "http://127.0.0.1:3100";

function session(application_origin: string) {
  return {
    application_origin,
    browser_profile: "chromium-default",
    engine: { channel: "bundled-chromium", name: "chromium", version: "141.0.7390.37" },
    environment: { arch: "x64", os: "linux", runtime: "node", runtime_version: "24.21.0" },
    session_id: "session-001",
    source_identity: "a".repeat(64),
  } as const;
}

describe("session origin", () => {
  it("refuses an origin that carries credentials, which would point at another host", () => {
    expect(() => createSessionIdentity(session("http://127.0.0.1:3000@attacker.example"))).toThrow(/credentials/u);
    expect(() => createSessionIdentity(session("http://user:pass@127.0.0.1:3000"))).toThrow(/credentials/u);
  });
});

describe("resolveNavigateTarget", () => {
  it.each([
    ["/cart", `${ORIGIN}/cart`],
    [`${ORIGIN}/checkout?step=2`, `${ORIGIN}/checkout?step=2`],
    // Relative to the origin, so "@" is part of the path, not a host.
    ["@attacker.example/x", `${ORIGIN}/@attacker.example/x`],
  ])("keeps %j on the session origin", (target, expected) => {
    expect(resolveNavigateTarget(ORIGIN, target)).toBe(expected);
  });

  it.each([
    "https://attacker.example/collect",
    "http://127.0.0.1:3101/",
    "//attacker.example/x",
    "http://user:pass@127.0.0.1:3100/",
  ])("refuses %j", (target) => {
    expect(resolveNavigateTarget(ORIGIN, target)).toBeNull();
  });
});

describe("isOffOriginRequest", () => {
  it.each([
    ["https://attacker.example/beacon", true],
    ["http://127.0.0.1:3101/x", true],
    [`${ORIGIN}/app.js`, false],
    ["data:text/plain,hello", false],
    ["blob:http://127.0.0.1:3100/uuid", false],
    ["not a url", true],
  ])("treats %j as off-origin: %s", (url, expected) => {
    expect(isOffOriginRequest(ORIGIN, url)).toBe(expected);
  });
});
