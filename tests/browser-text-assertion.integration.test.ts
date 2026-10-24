import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createActionRequest, createAssertionRequest, createSessionIdentity,
  createTextAssertionRequest, requireBoundResponse,
} from "../src/browser/executor.js";
import { launchPlaywrightSession } from "../src/browser/playwright-adapter.js";
import type { PlaywrightRuntime } from "../src/browser/playwright-adapter.js";

const SOURCE = "tree:rea-e04-fixture";
const PAGE = '<!doctype html><div id="result" role="status" aria-label="Order status"> Ready\nexact </div><div class="duplicate">Ready</div><div class="duplicate">Ready</div><div id="empty"></div><div id="literal">${process.exit(1)}</div><button id="expire" onclick="document.getElementById(\'result\').remove()">Expire target</button>';
const server = createServer((request, response) => {
  response.writeHead(200, { "content-type": "text/html" });
  response.end(request.url === "/broken" ? PAGE.replace(" Ready\nexact ", "Broken UI state") : PAGE);
});
let runtime: PlaywrightRuntime;

function request(patch = {}) {
  return createTextAssertionRequest({
    expected_text: " Ready\nexact ", kind: "exact_text", request_id: "req-text",
    session_id: "session-text", source_identity: SOURCE, target: "result",
    timeout_ms: 1000, ...patch,
  });
}
const resolve = (target: string) => `#${target}`;

async function navigate(target: string): Promise<void> {
  expect((await runtime.executeAction(createActionRequest({
    kind: "navigate", request_id: "req-nav", session_id: "session-text", target,
    timeout_ms: 30000, value: null,
  }), resolve)).status).toBe("ok");
}

beforeAll(async () => {
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  runtime = await launchPlaywrightSession(createSessionIdentity({
    application_origin: origin, browser_profile: "chromium-default",
    engine: { name: "chromium", channel: "bundled-chromium", version: "1.63.0" },
    environment: { arch: process.arch, os: process.platform, runtime: "node", runtime_version: process.versions.node },
    session_id: "session-text", source_identity: SOURCE,
  }), { headless: true });
  await navigate("/");
}, 600000);

afterAll(async () => {
  await runtime?.dispose();
  server.closeAllConnections();
  await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
});

describe("REA-E04 exact text with real pinned Chromium", () => {
  it("passes exact literal text with the existing bound response envelope", async () => {
    const response = await runtime.executeTextAssertion(request(), resolve);
    expect(response).toMatchObject({ status: "passed", error: null, request_id: "req-text",
      session_id: "session-text", source_identity: SOURCE, evidence_refs: [], oracle_ref: null });
    requireBoundResponse(response, runtime.identity);
    expect(runtime.playwright_version).toBe("1.63.0");
    expect(runtime.executable_path).toContain("1243");
    expect((await runtime.executeTextAssertion(request({ target: "empty", expected_text: "" }), resolve)).status).toBe("passed");
    expect((await runtime.executeTextAssertion(request({ target: "literal", expected_text: "${process.exit(1)}" }), resolve)).status).toBe("passed");
    expect((await runtime.executeTextAssertion(request({ target: "order status" }),
      () => 'role=status[name="Order status"]')).status).toBe("passed");
  });

  it("preserves the broken-state observation across a later successful request", async () => {
    await navigate("/broken");
    const failed = await runtime.executeTextAssertion(request({ request_id: "req-broken" }), resolve);
    expect(failed).toMatchObject({ request_id: "req-broken", status: "failed", error: { code: "E_TEXT_MISMATCH" } });
    await navigate("/");
    const passed = await runtime.executeTextAssertion(request({ request_id: "req-working" }), resolve);
    expect(passed).toMatchObject({ request_id: "req-working", status: "passed" });
    expect(failed.status).toBe("failed");
    expect(failed.error?.code).toBe("E_TEXT_MISMATCH");
  });

  it("times out a previously present target after it expires", async () => {
    expect((await runtime.executeTextAssertion(request(), resolve)).status).toBe("passed");
    expect((await runtime.executeAction(createActionRequest({
      kind: "click", request_id: "req-expire", session_id: "session-text", target: "expire",
      timeout_ms: 1000, value: null,
    }), resolve)).status).toBe("ok");
    expect((await runtime.executeTextAssertion(request({ timeout_ms: 40 }), resolve)).status).toBe("timeout");
    await navigate("/");
  });

  it("fails wrong text, whitespace changes, ambiguity and invalid selectors", async () => {
    for (const expected_text of ["wrong", "Ready\nexact", "/Ready/", "ready\nexact"]) {
      const response = await runtime.executeTextAssertion(request({ expected_text }), resolve);
      expect(response.status).toBe("failed");
      expect(response.error?.code).toBe("E_TEXT_MISMATCH");
    }
    for (const selector of [".duplicate", "["]) {
      expect((await runtime.executeTextAssertion(request(), () => selector)).status).toBe("failed");
    }
  });

  it("times out missing targets and includes resolver time in one deadline", async () => {
    const missing = await runtime.executeTextAssertion(request({ target: "absent", timeout_ms: 40 }), resolve);
    expect(missing.status).toBe("timeout");
    expect(missing.error?.code).toBe("E_TIMEOUT");
    const slow = await runtime.executeTextAssertion(request({ timeout_ms: 20 }), () => {
      const end = performance.now() + 35;
      while (performance.now() < end) { /* deterministic synchronous resolver overrun */ }
      return "#result";
    });
    expect(slow.status).toBe("timeout");
    expect(slow.error?.code).toBe("E_TIMEOUT");
    // A resolver cannot consume most of the budget and receive a fresh read timeout.
    const shared = await runtime.executeTextAssertion(request({ timeout_ms: 500 }), () => {
      const end = performance.now() + 350;
      while (performance.now() < end) { /* consume part of the shared deadline */ }
      return "#absent";
    });
    expect(shared.status).toBe("timeout");
    expect(shared.duration_ms).toBeLessThan(750);
  });

  it("revalidates session, source and malformed requests before resolution", async () => {
    for (const patch of [{ session_id: "foreign" }, { source_identity: "tree:foreign" },
      { timeout_ms: 0 }, { kind: "contains" }, { expected_text: null }, { target: "" }]) {
      await expect(runtime.executeTextAssertion({ ...request(), ...patch } as never, () => {
        throw new Error("resolver must not run");
      })).rejects.toThrow(TypeError);
    }
  });

  it("keeps free-text assertions unavailable", async () => {
    const response = await runtime.executeAssertion(createAssertionRequest({
      kind: "dom", statement: "result has exact text Ready", request_id: "req-free",
      session_id: "session-text", timeout_ms: 1000,
    }));
    expect(response.status).toBe("unavailable");
  });

  it("fails an in-flight assertion on disposal and refuses reuse", async () => {
    const pending = runtime.executeTextAssertion(request({ target: "absent", timeout_ms: 1000 }), resolve);
    await runtime.dispose();
    expect((await pending).status).not.toBe("passed");
    expect(runtime.isConnected()).toBe(false);
    await runtime.dispose();
    await expect(runtime.executeTextAssertion(request(), resolve)).rejects.toThrow("disposed");
  });
});
