/**
 * Spec 016 P016-04: qualified Playwright-backed browser executor.
 *
 * This module adapts the internal BrowserExecutor contract to the pinned
 * `playwright@1.63.0` dependency. It launches Chromium (Playwright's
 * default headless build), opens a fresh BrowserContext per session,
 * executes navigation/action primitives with bounded timeouts, evaluates a
 * constrained console/page-error assertion subset, and disposes every
 * context and browser it creates.
 *
 * Boundaries enforced here:
 *
 * - exact-pin self-enforcement: launch refuses unless the loaded Playwright
 *   package reports exactly `1.63.0`;
 * - no shell: browser provisioning invokes the Playwright CLI through
 *   `node <absolute cli.js> install ...` with fixed argv (never a shell,
 *   never test text);
 * - element targeting flows only through an injected resolver callback;
 *   the P016-06 locator policy provides the real one, tests inject fixture
 *   resolvers, and the adapter never invents selectors;
 * - assertion evaluation beyond the console/page-error subset returns
 *   `unavailable` with an explicit code instead of silently passing;
 * - versions (Playwright package, browser build, executable path) are
 *   captured on every session for evidence binding.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";
import {
  createActionResponse,
  createAssertionResponse,
} from "./executor.js";
import type {
  BrowserActionRequest,
  BrowserActionResponse,
  BrowserAssertionRequest,
  BrowserAssertionResponse,
  BrowserSessionIdentity,
} from "./executor.js";

export const PINNED_PLAYWRIGHT_VERSION = "1.63.0";
export const PLAYWRIGHT_INSTALL_TIMEOUT_MS = 600000;

const require = createRequire(import.meta.url);

/** Returns a Playwright selector for a user-facing target (P016-06 owns policy). */
export type TargetResolver = (target: string) => string;

export interface PlaywrightRuntime {
  readonly identity: BrowserSessionIdentity;
  readonly playwright_version: string;
  readonly browser_version: string;
  readonly executable_path: string;
  executeAction(
    request: BrowserActionRequest,
    resolveTarget: TargetResolver,
  ): Promise<BrowserActionResponse>;
  executeAssertion(
    request: BrowserAssertionRequest,
  ): Promise<BrowserAssertionResponse>;
  readTargetText(
    request: Pick<
      BrowserActionRequest,
      "request_id" | "session_id" | "target" | "timeout_ms"
    >,
    resolveTarget: TargetResolver,
  ): Promise<string>;
  readInputValue(
    request: Pick<
      BrowserActionRequest,
      "request_id" | "session_id" | "target" | "timeout_ms"
    >,
    resolveTarget: TargetResolver,
  ): Promise<string>;
  isConnected(): boolean;
  currentUrl(): string;
  dispose(): Promise<void>;
}

function loadedPlaywrightVersion(): unknown {
  const metadata = require("playwright/package.json") as {
    readonly version?: unknown;
  };
  return metadata.version;
}

/** Refuses any Playwright package except the exact authorized pin. */
export function assertPinnedPlaywrightVersion(actual: unknown): void {
  if (actual !== PINNED_PLAYWRIGHT_VERSION) {
    throw new Error(
      `refusing Playwright ${String(actual)}: this wedge pins exactly ${PINNED_PLAYWRIGHT_VERSION}`,
    );
  }
}

function playwrightCliPath(): string {
  const packageJsonPath = require.resolve("playwright/package.json");
  return join(dirname(packageJsonPath), "cli.js");
}

/**
 * Ensures the pinned Chromium build is installed, provisioning it with
 * fixed argv when the executable is missing. Never a shell, never test
 * text: argv is one of two literal tuples below.
 */
export function ensureChromiumInstalled(): string {
  const executablePath = chromium.executablePath();
  if (existsSync(executablePath)) {
    return executablePath;
  }
  const cliPath = playwrightCliPath();
  const args =
    process.platform === "linux"
      ? ["install", "--with-deps", "chromium"]
      : ["install", "chromium"];
  try {
    execFileSync(process.execPath, [cliPath, ...args], {
      stdio: "pipe",
      timeout: PLAYWRIGHT_INSTALL_TIMEOUT_MS,
    });
  } catch (error) {
    throw new Error(
      `Chromium provisioning failed (fixed argv: node cli.js ${args.join(" ")}): ${firstLine(error)}`,
    );
  }
  if (!existsSync(chromium.executablePath())) {
    throw new Error("Chromium provisioning reported success but no executable exists");
  }
  return chromium.executablePath();
}

function firstLine(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  const line = text.split("\n")[0] ?? "";
  return line.length > 500 ? `${line.slice(0, 500)}…` : line;
}

/**
 * Pure mapping from a Playwright library failure to a contract status.
 * TimeoutError becomes `timeout`; everything else becomes `failed`.
 * Nothing here throws and nothing passes silently.
 */
export function mapPlaywrightError(error: unknown): {
  readonly status: "timeout" | "failed";
  readonly code: string;
  readonly message: string;
} {
  const name = error instanceof Error ? error.name : "";
  if (name === "TimeoutError") {
    return {
      code: "E_TIMEOUT",
      message: firstLine(error),
      status: "timeout",
    };
  }
  return {
    code: "E_ACTION_FAILED",
    message: firstLine(error),
    status: "failed",
  };
}

const VALUE_REQUIRED_KINDS = new Set(["fill", "type", "select", "press"]);

/**
 * Pure semantic check: kinds that set a value refuse null values with a
 * visible code instead of executing a meaningless action.
 */
export function actionSemanticError(
  kind: string,
  value: string | null,
): { readonly code: string; readonly message: string } | null {
  if (value === null && VALUE_REQUIRED_KINDS.has(kind)) {
    return {
      code: "E_MISSING_VALUE",
      message: `${kind} requires a value`,
    };
  }
  return null;
}

/** Pure origin join for origin-relative navigate targets. */
export function resolveNavigateTarget(
  application_origin: string,
  target: string,
): string {
  if (/^https?:\/\//.test(target)) {
    return target;
  }
  return `${application_origin}${target}`;
}

const CONSOLE_CLEAN_STATEMENTS = new Set([
  "no console errors observed",
  "no uncaught page error is observed",
]);

async function runAction(
  page: Page,
  request: BrowserActionRequest,
  resolveTarget: TargetResolver,
): Promise<void> {
  const locator = (target: string) => page.locator(resolveTarget(target));
  switch (request.kind) {
    case "navigate": {
      await page.goto(request.target, {
        timeout: request.timeout_ms,
        waitUntil: "load",
      });
      return;
    }
    case "click": {
      await locator(request.target).click({ timeout: request.timeout_ms });
      return;
    }
    case "fill": {
      await locator(request.target).fill(request.value ?? "", {
        timeout: request.timeout_ms,
      });
      return;
    }
    case "type": {
      await locator(request.target).pressSequentially(request.value ?? "", {
        timeout: request.timeout_ms,
      });
      return;
    }
    case "press": {
      await locator(request.target).press(request.value ?? "", {
        timeout: request.timeout_ms,
      });
      return;
    }
    case "select": {
      await locator(request.target).selectOption(request.value ?? "", {
        timeout: request.timeout_ms,
      });
      return;
    }
    case "wait_for_navigation": {
      await page.waitForURL(request.target, {
        timeout: request.timeout_ms,
        waitUntil: "load",
      });
      return;
    }
    case "assert": {
      await locator(request.target).waitFor({
        state: "visible",
        timeout: request.timeout_ms,
      });
      return;
    }
  }
}

/**
 * Launches a qualified session: exact-pin enforcement, Chromium
 * provisioning check, fresh browser, fresh BrowserContext, one page, and
 * console/page-error listeners for the constrained assertion subset.
 */
export async function launchPlaywrightSession(
  session: BrowserSessionIdentity,
  options: { readonly headless: boolean } | null,
): Promise<PlaywrightRuntime> {
  assertPinnedPlaywrightVersion(loadedPlaywrightVersion());
  const executable_path = ensureChromiumInstalled();
  const browser: Browser = await chromium.launch({
    headless: options?.headless ?? true,
  });
  const browser_version = browser.version();
  const context: BrowserContext = await browser.newContext();
  const page: Page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error instanceof Error ? error.message : String(error));
  });
  let disposed = false;
  const requireActive = (): void => {
    if (disposed || !browser.isConnected()) {
      throw new Error("browser session is disposed");
    }
  };
  const now = (): number => Date.now();

  const runtime: PlaywrightRuntime = {
    browser_version,
    dispose: async (): Promise<void> => {
      if (disposed) {
        return;
      }
      disposed = true;
      try {
        await context.close();
      } finally {
        await browser.close();
      }
    },
    executable_path,
    executeAction: async (
      request: BrowserActionRequest,
      resolveTarget: TargetResolver,
    ): Promise<BrowserActionResponse> => {
      requireActive();
      if (request.session_id !== session.session_id) {
        throw new TypeError("action request is not bound to this session");
      }
      const started = now();
      const semantic = actionSemanticError(request.kind, request.value);
      if (semantic !== null) {
        return createActionResponse({
          duration_ms: now() - started,
          error: semantic,
          evidence_refs: [],
          request_id: request.request_id,
          session_id: session.session_id,
          source_identity: session.source_identity,
          status: "refused",
        });
      }
      const effective =
        request.kind === "navigate"
          ? {
              ...request,
              target: resolveNavigateTarget(
                session.application_origin,
                request.target,
              ),
            }
          : request;
      try {
        await runAction(page, effective, resolveTarget);
        return createActionResponse({
          duration_ms: now() - started,
          error: null,
          evidence_refs: [],
          request_id: request.request_id,
          session_id: session.session_id,
          source_identity: session.source_identity,
          status: "ok",
        });
      } catch (error) {
        const mapped = mapPlaywrightError(error);
        return createActionResponse({
          duration_ms: now() - started,
          error: { code: mapped.code, message: mapped.message },
          evidence_refs: [],
          request_id: request.request_id,
          session_id: session.session_id,
          source_identity: session.source_identity,
          status: mapped.status,
        });
      }
    },
    executeAssertion: async (
      request: BrowserAssertionRequest,
    ): Promise<BrowserAssertionResponse> => {
      requireActive();
      if (request.session_id !== session.session_id) {
        throw new TypeError("assertion request is not bound to this session");
      }
      const started = now();
      if (
        request.kind !== "console" ||
        !CONSOLE_CLEAN_STATEMENTS.has(request.statement)
      ) {
        return createAssertionResponse({
          duration_ms: now() - started,
          error: {
            code: "E_ASSERTION_KIND_DEFERRED",
            message: `assertion kind ${request.kind} evaluates with P016-05 oracle records`,
          },
          evidence_refs: [],
          oracle_ref: null,
          request_id: request.request_id,
          session_id: session.session_id,
          source_identity: session.source_identity,
          status: "unavailable",
        });
      }
      if (consoleErrors.length > 0) {
        const first = consoleErrors[0] ?? "";
        return createAssertionResponse({
          duration_ms: now() - started,
          error: {
            code: "E_CONSOLE_ERROR",
            message:
              first.length > 300 ? `${first.slice(0, 300)}…` : first,
          },
          evidence_refs: [],
          oracle_ref: null,
          request_id: request.request_id,
          session_id: session.session_id,
          source_identity: session.source_identity,
          status: "failed",
        });
      }
      return createAssertionResponse({
        duration_ms: now() - started,
        error: null,
        evidence_refs: [],
        oracle_ref: null,
        request_id: request.request_id,
        session_id: session.session_id,
        source_identity: session.source_identity,
        status: "passed",
      });
    },
    identity: session,
    currentUrl: (): string => {
      requireActive();
      return page.url();
    },
    isConnected: (): boolean => !disposed && browser.isConnected(),
    playwright_version: PINNED_PLAYWRIGHT_VERSION,
    readInputValue: async (
      request: Pick<
        BrowserActionRequest,
        "request_id" | "session_id" | "target" | "timeout_ms"
      >,
      resolveTarget: TargetResolver,
    ): Promise<string> => {
      requireActive();
      if (request.session_id !== session.session_id) {
        throw new TypeError("read request is not bound to this session");
      }
      return await page
        .locator(resolveTarget(request.target))
        .inputValue({ timeout: request.timeout_ms });
    },
    readTargetText: async (
      request: Pick<
        BrowserActionRequest,
        "request_id" | "session_id" | "target" | "timeout_ms"
      >,
      resolveTarget: TargetResolver,
    ): Promise<string> => {
      requireActive();
      if (request.session_id !== session.session_id) {
        throw new TypeError("read request is not bound to this session");
      }
      const text = await page
        .locator(resolveTarget(request.target))
        .textContent({ timeout: request.timeout_ms });
      if (text === null) {
        throw new Error("read target produced no text");
      }
      return text;
    },
  };
  return runtime;
}
