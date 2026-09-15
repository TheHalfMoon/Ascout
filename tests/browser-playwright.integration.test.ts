import { createServer } from "node:http";
import type { AddressInfo, Server } from "node:net";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createActionRequest,
  createAssertionRequest,
  createSessionIdentity,
} from "../src/browser/executor.js";
import type { BrowserSessionIdentity } from "../src/browser/executor.js";
import {
  ensureChromiumInstalled,
  launchPlaywrightSession,
} from "../src/browser/playwright-adapter.js";
import type { PlaywrightRuntime } from "../src/browser/playwright-adapter.js";

const SOURCE = "tree:fixture00000000000000000000000000000000";
const HOOK_TIMEOUT_MS = 600000;
const TEST_TIMEOUT_MS = 120000;

const SHOP_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Fixture Shop</title></head>
<body>
<main>
<h1>Fixture Shop</h1>
<label for="customer-name">Name</label>
<input id="customer-name" data-testid="customer-name" type="text" autocomplete="off">
<label for="shipping-method">Method</label>
<select id="shipping-method" data-testid="shipping-method">
<option value="Standard">Standard</option>
<option value="Express">Express</option>
</select>
<button id="place-order" data-testid="place-order" type="button">Place order</button>
<div id="order-result" data-testid="order-result" aria-live="polite"></div>
</main>
<script>
document.getElementById("place-order").addEventListener("click", () => {
  const name = document.getElementById("customer-name").value;
  const method = document.getElementById("shipping-method").value;
  document.getElementById("order-result").textContent =
    "Order for " + name + " via " + method;
  console.log("order placed");
});
</script>
</body></html>`;

const NOISY_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Noisy</title></head>
<body><div data-testid="noise-marker">noisy</div>
<script>console.error("boom-NOISE-404");</script>
</body></html>`;

/** Fixture-only resolver: test ids with selector metacharacters escaped. */
function fixtureResolver(target: string): string {
  const escaped = target.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `[data-testid="${escaped}"]`;
}

let server: Server;
let origin = "";

function makeSession(session_id: string): BrowserSessionIdentity {
  return createSessionIdentity({
    application_origin: origin,
    browser_profile: "chromium-default",
    engine: {
      channel: "bundled-chromium",
      name: "chromium",
      version: "pinned-by-playwright-1.63.0",
    },
    environment: {
      arch: process.arch,
      os: process.platform,
      runtime: "node",
      runtime_version: process.versions.node,
    },
    session_id,
    source_identity: SOURCE,
  });
}

async function launch(session_id: string): Promise<PlaywrightRuntime> {
  return await launchPlaywrightSession(makeSession(session_id), {
    headless: true,
  });
}

beforeAll(async () => {
  ensureChromiumInstalled();
  server = createServer((request, response) => {
    if (request.url === "/noisy") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(NOISY_PAGE);
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end(SHOP_PAGE);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address() as AddressInfo;
  origin = `http://127.0.0.1:${address.port}`;
}, HOOK_TIMEOUT_MS);

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
});

describe("spec016 p016-04 playwright adapter integration", () => {
  it("launches chromium and captures exact versions", async () => {
    const runtime = await launch("session-versions");
    try {
      expect(runtime.playwright_version).toBe("1.63.0");
      expect(runtime.browser_version).toMatch(/^\d+\./);
      expect(runtime.executable_path.toLowerCase()).toContain("chrom");
      expect(runtime.identity.session_id).toBe("session-versions");
      expect(runtime.isConnected()).toBe(true);
    } finally {
      await runtime.dispose();
    }
    expect(runtime.isConnected()).toBe(false);
  }, TEST_TIMEOUT_MS);

  it("starts every launch from a fresh page", async () => {
    const first = await launch("session-fresh-a");
    try {
      const navigate = createActionRequest({
        kind: "navigate",
        request_id: "req-nav-a",
        session_id: "session-fresh-a",
        target: "/noisy",
        timeout_ms: 30000,
        value: null,
      });
      const response = await first.executeAction(navigate, fixtureResolver);
      expect(response.status).toBe("ok");
      expect(first.currentUrl()).toBe(`${origin}/noisy`);
    } finally {
      await first.dispose();
    }
    const second = await launch("session-fresh-b");
    try {
      expect(second.currentUrl()).toBe("about:blank");
    } finally {
      await second.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("drives the fixture checkout flow end to end", async () => {
    const runtime = await launch("session-flow");
    try {
      const steps = [
        createActionRequest({
          kind: "navigate",
          request_id: "req-flow-nav",
          session_id: "session-flow",
          target: "/",
          timeout_ms: 30000,
          value: null,
        }),
        createActionRequest({
          kind: "fill",
          request_id: "req-flow-fill",
          session_id: "session-flow",
          target: "customer-name",
          timeout_ms: 30000,
          value: "Ada Lovelace",
        }),
        createActionRequest({
          kind: "select",
          request_id: "req-flow-select",
          session_id: "session-flow",
          target: "shipping-method",
          timeout_ms: 30000,
          value: "Express",
        }),
        createActionRequest({
          kind: "click",
          request_id: "req-flow-click",
          session_id: "session-flow",
          target: "place-order",
          timeout_ms: 30000,
          value: null,
        }),
      ];
      for (const step of steps) {
        const response = await runtime.executeAction(step, fixtureResolver);
        expect(response.status).toBe("ok");
      }
      const name = await runtime.readInputValue(
        {
          request_id: "req-flow-read-name",
          session_id: "session-flow",
          target: "customer-name",
          timeout_ms: 30000,
        },
        fixtureResolver,
      );
      expect(name).toBe("Ada Lovelace");
      const result = await runtime.readTargetText(
        {
          request_id: "req-flow-read-result",
          session_id: "session-flow",
          target: "order-result",
          timeout_ms: 30000,
        },
        fixtureResolver,
      );
      expect(result).toBe("Order for Ada Lovelace via Express");
    } finally {
      await runtime.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("treats hostile text as literal data, never code", async () => {
    const pwnPath = join(
      tmpdir(),
      `ascout-pwn-${process.pid}-${Date.now()}.txt`,
    );
    const payload = `x"; touch "${pwnPath}`;
    const runtime = await launch("session-hostile");
    try {
      const navigate = createActionRequest({
        kind: "navigate",
        request_id: "req-hostile-nav",
        session_id: "session-hostile",
        target: "/",
        timeout_ms: 30000,
        value: null,
      });
      expect(
        (await runtime.executeAction(navigate, fixtureResolver)).status,
      ).toBe("ok");
      const fill = createActionRequest({
        kind: "fill",
        request_id: "req-hostile-fill",
        session_id: "session-hostile",
        target: "customer-name",
        timeout_ms: 30000,
        value: payload,
      });
      expect((await runtime.executeAction(fill, fixtureResolver)).status).toBe(
        "ok",
      );
      const readBack = await runtime.readInputValue(
        {
          request_id: "req-hostile-read",
          session_id: "session-hostile",
          target: "customer-name",
          timeout_ms: 30000,
        },
        fixtureResolver,
      );
      expect(readBack).toBe(payload);
      expect(existsSync(pwnPath)).toBe(false);
      await expect(
        runtime.readTargetText(
          {
            request_id: "req-hostile-inject",
            session_id: "session-hostile",
            target: 'x"],[data-testid="order-result',
            timeout_ms: 5000,
          },
          fixtureResolver,
        ),
      ).rejects.toThrow();
    } finally {
      await runtime.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("maps an unmet navigation wait to timeout, not silence", async () => {
    const runtime = await launch("session-timeout");
    try {
      const wait = createActionRequest({
        kind: "wait_for_navigation",
        request_id: "req-wait",
        session_id: "session-timeout",
        target: `${origin}/never-navigates`,
        timeout_ms: 1000,
        value: null,
      });
      const response = await runtime.executeAction(wait, fixtureResolver);
      expect(response.status).toBe("timeout");
      expect(response.error?.code).toBe("E_TIMEOUT");
    } finally {
      await runtime.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("evaluates console cleanliness and fails on observed errors", async () => {
    const noisy = await launch("session-noisy");
    try {
      const navigate = createActionRequest({
        kind: "navigate",
        request_id: "req-noisy-nav",
        session_id: "session-noisy",
        target: "/noisy",
        timeout_ms: 30000,
        value: null,
      });
      expect(
        (await noisy.executeAction(navigate, fixtureResolver)).status,
      ).toBe("ok");
      const assertion = createAssertionRequest({
        kind: "console",
        request_id: "req-noisy-assert",
        session_id: "session-noisy",
        statement: "no console errors observed",
        timeout_ms: 5000,
      });
      const failed = await noisy.executeAssertion(assertion);
      expect(failed.status).toBe("failed");
      expect(failed.error?.code).toBe("E_CONSOLE_ERROR");
    } finally {
      await noisy.dispose();
    }
    const clean = await launch("session-clean");
    try {
      const navigate = createActionRequest({
        kind: "navigate",
        request_id: "req-clean-nav",
        session_id: "session-clean",
        target: "/",
        timeout_ms: 30000,
        value: null,
      });
      expect((await clean.executeAction(navigate, fixtureResolver)).status).toBe(
        "ok",
      );
      const assertion = createAssertionRequest({
        kind: "console",
        request_id: "req-clean-assert",
        session_id: "session-clean",
        statement: "no console errors observed",
        timeout_ms: 5000,
      });
      const passed = await clean.executeAssertion(assertion);
      expect(passed.status).toBe("passed");
    } finally {
      await clean.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("returns unavailable for deferred assertion kinds", async () => {
    const runtime = await launch("session-deferred");
    try {
      const dom = createAssertionRequest({
        kind: "dom",
        request_id: "req-deferred-dom",
        session_id: "session-deferred",
        statement: "order confirmation is visible",
        timeout_ms: 5000,
      });
      const response = await runtime.executeAssertion(dom);
      expect(response.status).toBe("unavailable");
      expect(response.error?.code).toBe("E_ASSERTION_KIND_DEFERRED");
      const odd = createAssertionRequest({
        kind: "console",
        request_id: "req-deferred-console",
        session_id: "session-deferred",
        statement: "the console feels lucky",
        timeout_ms: 5000,
      });
      const oddResponse = await runtime.executeAssertion(odd);
      expect(oddResponse.status).toBe("unavailable");
    } finally {
      await runtime.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("refuses value-setting actions without a value", async () => {
    const runtime = await launch("session-refused");
    try {
      const fill = createActionRequest({
        kind: "fill",
        request_id: "req-refused",
        session_id: "session-refused",
        target: "customer-name",
        timeout_ms: 5000,
        value: null,
      });
      const response = await runtime.executeAction(fill, fixtureResolver);
      expect(response.status).toBe("refused");
      expect(response.error?.code).toBe("E_MISSING_VALUE");
    } finally {
      await runtime.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("disposes reliably and refuses use after dispose", async () => {
    const runtime = await launch("session-dispose");
    expect(runtime.isConnected()).toBe(true);
    await runtime.dispose();
    expect(runtime.isConnected()).toBe(false);
    await runtime.dispose();
    await expect(
      runtime.executeAction(
        createActionRequest({
          kind: "click",
          request_id: "req-disposed",
          session_id: "session-disposed",
          target: "place-order",
          timeout_ms: 5000,
          value: null,
        }),
        fixtureResolver,
      ),
    ).rejects.toThrow("disposed");
  }, TEST_TIMEOUT_MS);
});
