import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionIdentity, createTextAssertionRequest } from "../src/browser/executor.js";
import { launchPlaywrightSession } from "../src/browser/playwright-adapter.js";

// Synthetic handles prove public lifetime/error contracts, not native browser qualification.
const fake = vi.hoisted(() => ({
  page: { on: vi.fn(), url: vi.fn() },
  context: { newPage: vi.fn(), close: vi.fn() },
  browser: { version: vi.fn(), newContext: vi.fn(), close: vi.fn(), isConnected: vi.fn() },
  launch: vi.fn(),
}));
vi.mock("playwright", () => ({
  chromium: { launch: fake.launch, executablePath: () => process.execPath },
}));

const identity = createSessionIdentity({
  application_origin: "http://127.0.0.1:3100", browser_profile: "chromium-default",
  engine: { name: "chromium", channel: "bundled-chromium", version: "1.63.0" },
  environment: { arch: process.arch, os: process.platform, runtime: "node", runtime_version: process.versions.node },
  session_id: "session-cleanup", source_identity: "tree:cleanup-fixture",
});
const launch = () => launchPlaywrightSession(identity, { headless: true });
function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function observe(promise: Promise<void>) {
  const state = { settled: false };
  const outcome = promise.then<PromiseSettledResult<void>, PromiseSettledResult<void>>(
    (value) => { state.settled = true; return { status: "fulfilled", value }; },
    (reason: unknown) => { state.settled = true; return { status: "rejected", reason }; },
  );
  return { state, outcome };
}
async function advance() {
  for (let turn = 0; turn < 8; turn++) await Promise.resolve();
}
beforeEach(() => {
  vi.resetAllMocks();
  fake.page.on.mockReturnValue(fake.page);
  fake.browser.version.mockReturnValue("synthetic-browser");
  fake.browser.isConnected.mockReturnValue(true);
  fake.browser.newContext.mockResolvedValue(fake.context);
  fake.context.newPage.mockResolvedValue(fake.page);
  fake.context.close.mockResolvedValue(undefined);
  fake.browser.close.mockResolvedValue(undefined);
  fake.launch.mockResolvedValue(fake.browser);
});

describe("browser cleanup ownership through the public runtime", () => {
  it("keeps all disposals pending through both closes and refuses immediate reuse", async () => {
    const context = deferred(), browser = deferred();
    fake.context.close.mockReturnValue(context.promise);
    fake.browser.close.mockReturnValue(browser.promise);
    const runtime = await launch();
    const first = observe(runtime.dispose()), second = observe(runtime.dispose());
    try {
      expect(runtime.isConnected()).toBe(false);
      expect(() => runtime.currentUrl()).toThrow("disposed");
      await expect(runtime.executeTextAssertion(createTextAssertionRequest({
        expected_text: "ready", kind: "exact_text", request_id: "after-dispose",
        session_id: identity.session_id, source_identity: identity.source_identity,
        target: "result", timeout_ms: 100,
      }), () => "#result")).rejects.toThrow("disposed");
      await advance();
      expect([first.state.settled, second.state.settled]).toEqual([false, false]);
      expect(fake.context.close).toHaveBeenCalledTimes(1);
      expect(fake.browser.close).not.toHaveBeenCalled();
      context.resolve();
      await advance();
      expect(fake.browser.close).toHaveBeenCalledTimes(1);
      expect([first.state.settled, second.state.settled]).toEqual([false, false]);
      browser.resolve();
      expect((await Promise.all([first.outcome, second.outcome])).map(({ status }) => status))
        .toEqual(["fulfilled", "fulfilled"]);
      await runtime.dispose();
      expect(fake.context.close).toHaveBeenCalledTimes(1);
      expect(fake.browser.close).toHaveBeenCalledTimes(1);
    } finally {
      context.resolve(); browser.resolve();
      await Promise.all([first.outcome, second.outcome]);
    }
  });

  it("retains ownership when a close callback reenters disposal", async () => {
    const gate = deferred();
    let nested: ReturnType<typeof observe> | undefined;
    const runtime = await launch();
    fake.context.close.mockImplementation(() => {
      nested = observe(runtime.dispose());
      return gate.promise;
    });
    const first = observe(runtime.dispose());
    try {
      await advance();
      expect(nested).toBeDefined();
      expect(nested?.state.settled).toBe(false);
      expect(fake.context.close).toHaveBeenCalledTimes(1);
    } finally {
      gate.resolve();
      await first.outcome;
      await nested?.outcome;
    }
    expect(fake.browser.close).toHaveBeenCalledTimes(1);
  });

  it("awaits browser closure after a context error and retains failure for every caller", async () => {
    const error = new Error("context close failed"), gate = deferred();
    fake.context.close.mockRejectedValue(error);
    fake.browser.close.mockReturnValue(gate.promise);
    const runtime = await launch();
    const first = observe(runtime.dispose()), second = observe(runtime.dispose());
    try {
      await advance();
      expect(fake.browser.close).toHaveBeenCalledTimes(1);
      expect([first.state.settled, second.state.settled]).toEqual([false, false]);
    } finally { gate.resolve(); }
    for (const result of await Promise.all([first.outcome, second.outcome, observe(runtime.dispose()).outcome])) {
      expect(result).toEqual({ status: "rejected", reason: error });
    }
    expect(fake.context.close).toHaveBeenCalledTimes(1);
    expect(fake.browser.close).toHaveBeenCalledTimes(1);
  });

  it("retains a browser close failure for concurrent and later callers", async () => {
    const error = new Error("browser close failed");
    fake.browser.close.mockRejectedValue(error);
    const runtime = await launch();
    const results = await Promise.all([observe(runtime.dispose()).outcome, observe(runtime.dispose()).outcome]);
    results.push(await observe(runtime.dispose()).outcome);
    for (const result of results) expect(result).toEqual({ status: "rejected", reason: error });
    expect(fake.context.close).toHaveBeenCalledTimes(1);
    expect(fake.browser.close).toHaveBeenCalledTimes(1);
  });

  it("preserves both ordered cleanup errors instead of masking the context error", async () => {
    const contextError = new Error("context failure"), browserError = new Error("browser failure");
    fake.context.close.mockRejectedValue(contextError);
    fake.browser.close.mockRejectedValue(browserError);
    const runtime = await launch();
    const results = await Promise.all([observe(runtime.dispose()).outcome, observe(runtime.dispose()).outcome]);
    results.push(await observe(runtime.dispose()).outcome);
    for (const result of results) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") {
        expect(result.reason).toBeInstanceOf(AggregateError);
        expect((result.reason as AggregateError).errors).toEqual([contextError, browserError]);
      }
    }
    expect(fake.browser.close).toHaveBeenCalledTimes(1);
  });

  it.each(["metadata", "context", "page", "listener"] as const)(
    "awaits owned browser cleanup on %s startup failure before preserving the error", async (phase) => {
      const error = new Error(phase + " startup failure"), gate = deferred();
      const method = { metadata: fake.browser.version, context: fake.browser.newContext,
        page: fake.context.newPage, listener: fake.page.on }[phase];
      method.mockImplementation(() => { throw error; });
      fake.browser.close.mockReturnValue(gate.promise);
      const startup = observe(launch().then(() => undefined));
      try {
        await advance();
        expect(fake.browser.close).toHaveBeenCalledTimes(1);
        expect(startup.state.settled).toBe(false);
      } finally { gate.resolve(); }
      expect(await startup.outcome).toEqual({ status: "rejected", reason: error });
      expect(fake.launch).toHaveBeenCalledTimes(1);
      expect(fake.browser.close).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["context", "page"] as const)("preserves %s startup and browser cleanup errors", async (phase) => {
    const startupError = new Error(phase + " startup failure"), closeError = new Error("cleanup failure");
    const method = phase === "context" ? fake.browser.newContext : fake.context.newPage;
    method.mockRejectedValue(startupError);
    fake.browser.close.mockRejectedValue(closeError);
    const result = await observe(launch().then(() => undefined)).outcome;
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBeInstanceOf(AggregateError);
      expect((result.reason as AggregateError).errors).toEqual([startupError, closeError]);
    }
    expect(fake.browser.close).toHaveBeenCalledTimes(1);
    expect(fake.launch).toHaveBeenCalledTimes(1);
  });

  it("preserves launch failure without inventing an owned browser", async () => {
    const error = new Error("launch failed before ownership");
    fake.launch.mockRejectedValue(error);
    expect(await observe(launch().then(() => undefined)).outcome).toEqual({ status: "rejected", reason: error });
    expect(fake.browser.newContext).not.toHaveBeenCalled();
    expect(fake.browser.close).not.toHaveBeenCalled();
  });
});
