import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo, Server } from "node:net";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createActionRequest,
  createAssertionRequest,
  createSessionIdentity,
} from "../src/browser/executor.js";
import type {
  BrowserActionRequest,
  BrowserActionResponse,
  BrowserSessionIdentity,
} from "../src/browser/executor.js";
import {
  ensureChromiumInstalled,
  launchPlaywrightSession,
} from "../src/browser/playwright-adapter.js";
import type { PlaywrightRuntime } from "../src/browser/playwright-adapter.js";
import {
  recordActionAttempt,
  createConsoleRecord,
  assembleEvidenceBundle,
} from "../src/browser/evidence.js";
import type { BrowserActionAttempt } from "../src/browser/evidence.js";
import {
  createLocatorCandidate,
  LOCATOR_AMBIGUOUS,
  requireResolved,
  resolveLocators,
} from "../src/browser/locators.js";
import {
  appendRecoveryAttempt,
  createRecoveryAttempt,
  createRecoveryBudget,
  createRecoveryHistory,
  evaluateRecoveryVerdict,
  measureRecoveryHistoryErasure,
} from "../src/browser/recovery.js";
import type { RecoveryHistory } from "../src/browser/recovery.js";
import {
  assembleBenchmarkReport,
  benchmarkReportDigest,
  createCaseResult,
  detectMissingSteps,
  parseBenchmarkManifest,
  SEMANTIC_DRIFT_DETECTED,
} from "../src/browser/benchmark.js";
import type { BenchmarkCaseResult } from "../src/browser/benchmark.js";

const SOURCE = "tree:bench000000000000000000000000000000000";
const HOOK_TIMEOUT_MS = 600000;
const TEST_TIMEOUT_MS = 120000;
// Synthetic fixture credential: matches secret-marker shape so the
// benchmark honestly proves Ascout-owned evidence excludes it. This
// value is invented for this fixture and is not a real credential.
const SYNTHETIC_SECRET = "ghp_syntheticFixture00000000000000000000";

const FIXTURES_URL = new URL("../benchmarks/browser/fixtures/", import.meta.url);
const MANIFEST_URL = new URL(
  "../benchmarks/browser/manifest.json",
  import.meta.url,
);

/** Fixture-only resolver: test ids with selector metacharacters escaped. */
function fixtureResolver(target: string): string {
  const escaped = target.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `[data-testid="${escaped}"]`;
}

/** Role/name resolver for the rename-equivalence case. */
function roleResolver(name: string): (target: string) => string {
  return () => `role=button[name="${name}"]`;
}

let server: Server;
let origin = "";
const pages = new Map<string, string>();
const results: BenchmarkCaseResult[] = [];

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

function note(value: unknown): string {
  return JSON.stringify(value);
}

/** Executes an action and records the attempt as evidence. */
async function act(
  runtime: PlaywrightRuntime,
  log: BrowserActionAttempt[],
  request: BrowserActionRequest,
  resolveTarget: (target: string) => string,
): Promise<BrowserActionResponse> {
  const response = await runtime.executeAction(request, resolveTarget);
  log.push(
    recordActionAttempt(
      log.length,
      { kind: request.kind, target: request.target },
      {
        duration_ms: response.duration_ms,
        error:
          response.error === null
            ? null
            : {
                code: response.error.code,
                message: response.error.message,
              },
        evidence_refs: [...response.evidence_refs],
        request_id: response.request_id,
        session_id: response.session_id,
        source_identity: response.source_identity,
        status: response.status,
      },
    ),
  );
  return response;
}

function action(
  session_id: string,
  request_id: string,
  kind: string,
  target: string,
  timeout_ms: number,
  value: string | null = null,
): BrowserActionRequest {
  return createActionRequest({
    kind,
    request_id,
    session_id,
    target,
    timeout_ms,
    value,
  });
}

function emptyHistory(session_id: string): RecoveryHistory {
  return createRecoveryHistory({
    budget: createRecoveryBudget({
      budget_id: `budget-${session_id}`,
      max_attempts: 3,
      session_id,
      source_identity: SOURCE,
    }),
    history_id: `history-${session_id}`,
    session_id,
    source_identity: SOURCE,
  });
}

function countFailed(log: readonly BrowserActionAttempt[]): number {
  return log.filter((attempt) => attempt.status !== "ok").length;
}

function attemptOutputs(log: readonly BrowserActionAttempt[]): string[] {
  return log.map((attempt) =>
    note({
      error_code: attempt.error_code,
      kind: attempt.kind,
      status: attempt.status,
      target: attempt.target,
    }),
  );
}

const CHROMIUM_WAIT_MS = (() => {
  const raw = process.env.BENCHMARK_CHROMIUM_WAIT_MS;
  if (raw === undefined) {
    return 300000;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 300000;
})();
const CHROMIUM_POLL_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Coordinates Chromium provisioning with the P016-04 integration
 * file: if the executable is absent, another suite worker may be
 * provisioning it right now (concurrent `install --with-deps`
 * self-conflicts on OS package locks), so poll for its appearance
 * before provisioning here. Falls back to provisioning when nobody
 * else supplies the browser within the wait budget.
 */
async function waitForProvisionedChromium(): Promise<void> {
  const deadline = Date.now() + CHROMIUM_WAIT_MS;
  for (;;) {
    if (existsSync(chromium.executablePath())) {
      return;
    }
    if (Date.now() >= deadline) {
      break;
    }
    await sleep(
      Math.min(CHROMIUM_POLL_MS, Math.max(deadline - Date.now(), 0)),
    );
  }
  ensureChromiumInstalled();
}

beforeAll(async () => {
  await waitForProvisionedChromium();
  for (const name of [
    "happy-path.html",
    "rename-equivalent.html",
    "ambiguous.html",
    "overlay.html",
    "noisy-green.html",
    "duplicate-submit.html",
    "missing-step.html",
    "sensitive.html",
  ]) {
    pages.set(
      name,
      readFileSync(new URL(name, FIXTURES_URL), "utf8"),
    );
  }
  server = createServer((request, response) => {
    const routes: Record<string, string> = {
      "/ambiguous": "ambiguous.html",
      "/duplicate-submit": "duplicate-submit.html",
      "/happy-path": "happy-path.html",
      "/missing-step": "missing-step.html",
      "/noisy-green": "noisy-green.html",
      "/overlay": "overlay.html",
      "/rename": "rename-equivalent.html",
      "/sensitive": "sensitive.html",
      "/slow-navigation": "happy-path.html",
    };
    const pathname = (request.url ?? "").split("?")[0] ?? "";
    const fixture = routes[pathname];
    if (fixture === undefined) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("no fixture");
      return;
    }
    const isSlowRoute =
      request.url === "/slow-navigation" ||
      (request.url ?? "").startsWith("/slow-navigation?");
    const serve = (): void => {
      if (response.destroyed || response.writableEnded) {
        return;
      }
      response.writeHead(200, { "content-type": "text/html" });
      response.end(pages.get(fixture) ?? "");
    };
    if (isSlowRoute) {
      setTimeout(serve, 1500);
      return;
    }
    serve();
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

describe("spec016 p016-09 synthetic browser benchmark", () => {
  it("happy-path completes clean with no recovery", async () => {
    const session_id = "bench-happy";
    const runtime = await launch(session_id);
    const log: BrowserActionAttempt[] = [];
    try {
      for (const [id, kind, target, value] of [
        ["req-happy-nav", "navigate", "/happy-path", null],
        ["req-happy-fill", "fill", "customer-name", "Ada"],
        ["req-happy-click", "click", "place-order", null],
      ] as const) {
        const response = await act(
          runtime,
          log,
          action(session_id, id, kind, target, 30000, value),
          fixtureResolver,
        );
        expect(response.status).toBe("ok");
      }
      const text = await runtime.readTargetText(
        {
          request_id: "req-happy-read",
          session_id,
          target: "order-result",
          timeout_ms: 30000,
        },
        fixtureResolver,
      );
      expect(text).toBe("Order for Ada");
      const assertion = await runtime.executeAssertion(
        createAssertionRequest({
          kind: "console",
          request_id: "req-happy-assert",
          session_id,
          statement: "no console errors observed",
          timeout_ms: 5000,
        }),
      );
      expect(assertion.status).toBe("passed");
      const history = emptyHistory(session_id);
      results.push(
        createCaseResult({
          cache_pass_grants: 0,
          case_id: "happy-path",
          case_revision: 1,
          cross_tree_records: 0,
          drift_marker: null,
          failed_attempts_visible: countFailed(log),
          oracle: "clean",
          owned_outputs: [...attemptOutputs(log), note({ text })],
          recovery_attempts_visible: history.attempts.length,
          recovery_history_erasure: measureRecoveryHistoryErasure(history),
          semantic_unrevalidated: false,
          session_id,
          source_identity: SOURCE,
          unbound_records: 0,
          uncalibrated_model_passes: 0,
          verdict: "clean",
        }),
      );
    } finally {
      await runtime.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("locator-rename-equivalent recovers visibly", async () => {
    const session_id = "bench-rename";
    const runtime = await launch(session_id);
    const log: BrowserActionAttempt[] = [];
    try {
      const nav = await act(
        runtime,
        log,
        action(session_id, "req-rename-nav", "navigate", "/rename", 30000),
        fixtureResolver,
      );
      expect(nav.status).toBe("ok");
      const stale = await act(
        runtime,
        log,
        action(session_id, "req-rename-click", "click", "order-button", 3000),
        roleResolver("Place order"),
      );
      expect(stale.status).not.toBe("ok");
      const observed = await runtime.readTargetText(
        {
          request_id: "req-rename-read",
          session_id,
          target: "place-order",
          timeout_ms: 30000,
        },
        fixtureResolver,
      );
      expect(observed).toBe("Submit order");
      let history = emptyHistory(session_id);
      history = appendRecoveryAttempt(
        history,
        createRecoveryAttempt({
          attempt_index: 0,
          budget_id: `budget-${session_id}`,
          corrective_action: `re-resolve order button by role with observed name ${observed}`,
          evidence_refs: [],
          obligation_ref: null,
          outcome: "recovered",
          recovery_class: "resolver_recovery",
          recovery_id: "rec-rename-0",
          session_id,
          source_identity: SOURCE,
          trigger_attempt_index: 1,
          trigger_error_code: stale.error?.code ?? "E_UNKNOWN",
          trigger_error_message: "order button not found under stale name",
        }),
      );
      const retry = await act(
        runtime,
        log,
        action(
          session_id,
          "req-rename-retry",
          "click",
          "order-button",
          30000,
        ),
        roleResolver(observed),
      );
      expect(retry.status).toBe("ok");
      const facts = evaluateRecoveryVerdict(history, []);
      expect(facts.verdict).toBe("pass_with_recovery");
      results.push(
        createCaseResult({
          cache_pass_grants: 0,
          case_id: "locator-rename-equivalent",
          case_revision: 1,
          cross_tree_records: 0,
          drift_marker: null,
          failed_attempts_visible: countFailed(log),
          oracle: "recovery_visible",
          owned_outputs: [
            ...attemptOutputs(log),
            note({ observed_name: observed }),
          ],
          recovery_attempts_visible: history.attempts.length,
          recovery_history_erasure: measureRecoveryHistoryErasure(history),
          semantic_unrevalidated: facts.semantic_pending.length > 0,
          session_id,
          source_identity: SOURCE,
          unbound_records: 0,
          uncalibrated_model_passes: 0,
          verdict: "pass_with_recovery",
        }),
      );
    } finally {
      await runtime.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("ambiguous-locator fails closed without guessing", async () => {
    const session_id = "bench-ambiguous";
    const runtime = await launch(session_id);
    const log: BrowserActionAttempt[] = [];
    try {
      const nav = await act(
        runtime,
        log,
        action(session_id, "req-amb-nav", "navigate", "/ambiguous", 30000),
        fixtureResolver,
      );
      expect(nav.status).toBe("ok");
      const observed = await runtime.readTargetText(
        {
          request_id: "req-amb-read",
          session_id,
          target: "match-count",
          timeout_ms: 10000,
        },
        fixtureResolver,
      );
      const match_count = Number.parseInt(observed, 10);
      expect(match_count).toBe(2);
      const candidate = createLocatorCandidate({
        reason: null,
        role: null,
        strategy: "test-id",
        value: "place-order",
      });
      const resolution = resolveLocators("order button", [
        { candidate, match_count },
      ]);
      expect(resolution.outcome).toBe("ambiguous");
      expect(resolution.error_code).toBe(LOCATOR_AMBIGUOUS);
      expect(() => requireResolved(resolution)).toThrow(LOCATOR_AMBIGUOUS);
      const text = await runtime.readTargetText(
        {
          request_id: "req-amb-result",
          session_id,
          target: "order-result",
          timeout_ms: 10000,
        },
        fixtureResolver,
      );
      expect(text).toBe("");
      const history = emptyHistory(session_id);
      results.push(
        createCaseResult({
          cache_pass_grants: 0,
          case_id: "ambiguous-locator",
          case_revision: 1,
          cross_tree_records: 0,
          drift_marker: null,
          failed_attempts_visible: countFailed(log),
          oracle: "defect_detected",
          owned_outputs: [
            ...attemptOutputs(log),
            note({
              match_count,
              outcome: resolution.outcome,
              tried: resolution.candidates_tried,
            }),
          ],
          recovery_attempts_visible: 0,
          recovery_history_erasure: measureRecoveryHistoryErasure(history),
          semantic_unrevalidated: false,
          session_id,
          source_identity: SOURCE,
          unbound_records: 0,
          uncalibrated_model_passes: 0,
          verdict: "failed",
        }),
      );
    } finally {
      await runtime.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("transient-overlay recovers visibly", async () => {
    const session_id = "bench-overlay";
    const runtime = await launch(session_id);
    const log: BrowserActionAttempt[] = [];
    try {
      const nav = await act(
        runtime,
        log,
        action(session_id, "req-ov-nav", "navigate", "/overlay", 30000),
        fixtureResolver,
      );
      expect(nav.status).toBe("ok");
      const blocked = await act(
        runtime,
        log,
        action(session_id, "req-ov-click", "click", "place-order", 500),
        fixtureResolver,
      );
      expect(blocked.status).not.toBe("ok");
      let history = emptyHistory(session_id);
      history = appendRecoveryAttempt(
        history,
        createRecoveryAttempt({
          attempt_index: 0,
          budget_id: `budget-${session_id}`,
          corrective_action: "wait for overlay dismissal and retry click",
          evidence_refs: [],
          obligation_ref: null,
          outcome: "recovered",
          recovery_class: "execution_recovery",
          recovery_id: "rec-overlay-0",
          session_id,
          source_identity: SOURCE,
          trigger_attempt_index: 1,
          trigger_error_code: blocked.error?.code ?? "E_UNKNOWN",
          trigger_error_message: "click intercepted while overlay present",
        }),
      );
      const retry = await act(
        runtime,
        log,
        action(session_id, "req-ov-retry", "click", "place-order", 15000),
        fixtureResolver,
      );
      expect(retry.status).toBe("ok");
      const facts = evaluateRecoveryVerdict(history, []);
      expect(facts.verdict).toBe("pass_with_recovery");
      results.push(
        createCaseResult({
          cache_pass_grants: 0,
          case_id: "transient-overlay",
          case_revision: 1,
          cross_tree_records: 0,
          drift_marker: null,
          failed_attempts_visible: countFailed(log),
          oracle: "recovery_visible",
          owned_outputs: attemptOutputs(log),
          recovery_attempts_visible: history.attempts.length,
          recovery_history_erasure: measureRecoveryHistoryErasure(history),
          semantic_unrevalidated: facts.semantic_pending.length > 0,
          session_id,
          source_identity: SOURCE,
          unbound_records: 0,
          uncalibrated_model_passes: 0,
          verdict: "pass_with_recovery",
        }),
      );
    } finally {
      await runtime.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("slow-navigation recovers visibly after short-timeout failure", async () => {
    const session_id = "bench-slow";
    const runtime = await launch(session_id);
    const log: BrowserActionAttempt[] = [];
    try {
      const rushed = await act(
        runtime,
        log,
        action(session_id, "req-slow-nav", "navigate", "/slow-navigation", 500),
        fixtureResolver,
      );
      expect(rushed.status).not.toBe("ok");
      let history = emptyHistory(session_id);
      history = appendRecoveryAttempt(
        history,
        createRecoveryAttempt({
          attempt_index: 0,
          budget_id: `budget-${session_id}`,
          corrective_action: "retry navigation with adequate timeout budget",
          evidence_refs: [],
          obligation_ref: null,
          outcome: "recovered",
          recovery_class: "execution_recovery",
          recovery_id: "rec-slow-0",
          session_id,
          source_identity: SOURCE,
          trigger_attempt_index: 0,
          trigger_error_code: rushed.error?.code ?? "E_UNKNOWN",
          trigger_error_message: "navigation exceeded short timeout",
        }),
      );
      const retry = await act(
        runtime,
        log,
        action(
          session_id,
          "req-slow-retry",
          "navigate",
          "/slow-navigation?attempt=2",
          30000,
        ),
        fixtureResolver,
      );
      expect(retry.status).toBe("ok");
      expect(runtime.currentUrl()).toBe(
        `${origin}/slow-navigation?attempt=2`,
      );
      const facts = evaluateRecoveryVerdict(history, []);
      expect(facts.verdict).toBe("pass_with_recovery");
      results.push(
        createCaseResult({
          cache_pass_grants: 0,
          case_id: "slow-navigation",
          case_revision: 1,
          cross_tree_records: 0,
          drift_marker: null,
          failed_attempts_visible: countFailed(log),
          oracle: "recovery_visible",
          owned_outputs: attemptOutputs(log),
          recovery_attempts_visible: history.attempts.length,
          recovery_history_erasure: measureRecoveryHistoryErasure(history),
          semantic_unrevalidated: facts.semantic_pending.length > 0,
          session_id,
          source_identity: SOURCE,
          unbound_records: 0,
          uncalibrated_model_passes: 0,
          verdict: "pass_with_recovery",
        }),
      );
    } finally {
      await runtime.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("console-error-green-ui gates on the console oracle", async () => {
    const session_id = "bench-noisy";
    const runtime = await launch(session_id);
    const log: BrowserActionAttempt[] = [];
    try {
      for (const [id, kind, target, value] of [
        ["req-noisy-nav", "navigate", "/noisy-green", null],
        ["req-noisy-fill", "fill", "customer-name", "Ada"],
        ["req-noisy-click", "click", "place-order", null],
      ] as const) {
        const response = await act(
          runtime,
          log,
          action(session_id, id, kind, target, 30000, value),
          fixtureResolver,
        );
        expect(response.status).toBe("ok");
      }
      const text = await runtime.readTargetText(
        {
          request_id: "req-noisy-read",
          session_id,
          target: "order-result",
          timeout_ms: 30000,
        },
        fixtureResolver,
      );
      expect(text).toBe("Order for Ada");
      const assertion = await runtime.executeAssertion(
        createAssertionRequest({
          kind: "console",
          request_id: "req-noisy-assert",
          session_id,
          statement: "no console errors observed",
          timeout_ms: 5000,
        }),
      );
      expect(assertion.status).toBe("failed");
      expect(assertion.error?.code).toBe("E_CONSOLE_ERROR");
      const consoleRecord = createConsoleRecord({
        count: 1,
        message: assertion.error?.message ?? "console error observed",
        record_id: "console-noisy-0",
        session_id,
        source_identity: SOURCE,
        stream: "console-error",
      });
      const history = emptyHistory(session_id);
      results.push(
        createCaseResult({
          cache_pass_grants: 0,
          case_id: "console-error-green-ui",
          case_revision: 1,
          cross_tree_records: 0,
          drift_marker: null,
          failed_attempts_visible: countFailed(log),
          oracle: "defect_detected",
          owned_outputs: [
            ...attemptOutputs(log),
            note({ console_message: consoleRecord.message, text }),
          ],
          recovery_attempts_visible: 0,
          recovery_history_erasure: measureRecoveryHistoryErasure(history),
          semantic_unrevalidated: false,
          session_id,
          source_identity: SOURCE,
          unbound_records: 0,
          uncalibrated_model_passes: 0,
          verdict: "failed",
        }),
      );
    } finally {
      await runtime.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("duplicate-submit surfaces the double submission defect", async () => {
    const session_id = "bench-dup";
    const runtime = await launch(session_id);
    const log: BrowserActionAttempt[] = [];
    try {
      const nav = await act(
        runtime,
        log,
        action(
          session_id,
          "req-dup-nav",
          "navigate",
          "/duplicate-submit",
          30000,
        ),
        fixtureResolver,
      );
      expect(nav.status).toBe("ok");
      for (const id of ["req-dup-click-a", "req-dup-click-b"]) {
        const response = await act(
          runtime,
          log,
          action(session_id, id, "click", "place-order", 30000),
          fixtureResolver,
        );
        expect(response.status).toBe("ok");
      }
      const count = await runtime.readTargetText(
        {
          request_id: "req-dup-read",
          session_id,
          target: "submit-count",
          timeout_ms: 30000,
        },
        fixtureResolver,
      );
      expect(count).toBe("2");
      const history = emptyHistory(session_id);
      results.push(
        createCaseResult({
          cache_pass_grants: 0,
          case_id: "duplicate-submit",
          case_revision: 1,
          cross_tree_records: 0,
          drift_marker: null,
          failed_attempts_visible: countFailed(log),
          oracle: "defect_detected",
          owned_outputs: [...attemptOutputs(log), note({ submit_count: count })],
          recovery_attempts_visible: 0,
          recovery_history_erasure: measureRecoveryHistoryErasure(history),
          semantic_unrevalidated: false,
          session_id,
          source_identity: SOURCE,
          unbound_records: 0,
          uncalibrated_model_passes: 0,
          verdict: "failed",
        }),
      );
    } finally {
      await runtime.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("missing-required-step surfaces semantic drift and blocks pass", async () => {
    const session_id = "bench-drift";
    const runtime = await launch(session_id);
    const log: BrowserActionAttempt[] = [];
    try {
      const nav = await act(
        runtime,
        log,
        action(session_id, "req-drift-nav", "navigate", "/missing-step", 30000),
        fixtureResolver,
      );
      expect(nav.status).toBe("ok");
      const stepsText = await runtime.readTargetText(
        {
          request_id: "req-drift-read",
          session_id,
          target: "wizard-steps",
          timeout_ms: 30000,
        },
        fixtureResolver,
      );
      const observed = stepsText
        .split(/\s+/)
        .filter((entry) => entry.length > 0)
        .map((entry) => entry.toLowerCase());
      const decision = detectMissingSteps(
        ["cart", "review", "submit"],
        observed,
      );
      expect(decision.drift).toBe(true);
      expect(decision.marker).toBe(SEMANTIC_DRIFT_DETECTED);
      expect(decision.missing).toEqual(["review"]);
      const history = emptyHistory(session_id);
      results.push(
        createCaseResult({
          cache_pass_grants: 0,
          case_id: "missing-required-step",
          case_revision: 1,
          cross_tree_records: 0,
          drift_marker: decision.marker,
          failed_attempts_visible: countFailed(log),
          oracle: "semantic_drift",
          owned_outputs: [
            ...attemptOutputs(log),
            note({ missing: decision.missing, observed }),
          ],
          recovery_attempts_visible: 0,
          recovery_history_erasure: measureRecoveryHistoryErasure(history),
          semantic_unrevalidated: false,
          session_id,
          source_identity: SOURCE,
          unbound_records: 0,
          uncalibrated_model_passes: 0,
          verdict: "semantic_drift_detected",
        }),
      );
    } finally {
      await runtime.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("source-tree-mismatch rejects cross-tree assembly visibly", () => {
    const session_id = "bench-mismatch";
    const local = recordActionAttempt(
      0,
      { kind: "navigate", target: "/happy-path" },
      {
        duration_ms: 5,
        error: null,
        evidence_refs: [],
        request_id: "req-mismatch-local",
        session_id,
        source_identity: SOURCE,
        status: "ok",
      },
    );
    const foreign = recordActionAttempt(
      1,
      { kind: "click", target: "place-order" },
      {
        duration_ms: 7,
        error: null,
        evidence_refs: [],
        request_id: "req-mismatch-foreign",
        session_id,
        source_identity: "tree:foreign0000000000000000000000000000000",
        status: "ok",
      },
    );
    expect(() =>
      assembleEvidenceBundle({
        accessibility_facts: [],
        artifacts: [],
        assertions: [],
        attempts: [local, foreign],
        bundle_id: "bundle-mismatch",
        console_records: [],
        dom_facts: [],
        intent_digest: null,
        network_records: [],
        oracle_records: [],
        session_id,
        source_identity: SOURCE,
      }),
    ).toThrow(TypeError);
    const history = emptyHistory(session_id);
    results.push(
      createCaseResult({
        cache_pass_grants: 0,
        case_id: "source-tree-mismatch",
        case_revision: 1,
        cross_tree_records: 0,
        drift_marker: null,
        failed_attempts_visible: 0,
        oracle: "defect_detected",
        owned_outputs: [note({ rejection: "cross-tree assembly refused" })],
        recovery_attempts_visible: 0,
        recovery_history_erasure: measureRecoveryHistoryErasure(history),
        semantic_unrevalidated: false,
        session_id,
        source_identity: SOURCE,
        unbound_records: 0,
        uncalibrated_model_passes: 0,
        verdict: "blocked",
      }),
    );
  }, TEST_TIMEOUT_MS);

  it("sensitive-input keeps raw secrets out of owned evidence", async () => {
    const session_id = "bench-sensitive";
    const runtime = await launch(session_id);
    const log: BrowserActionAttempt[] = [];
    try {
      for (const [id, kind, target, value] of [
        ["req-sens-nav", "navigate", "/sensitive", null],
        ["req-sens-user", "fill", "login-user", "ada"],
        ["req-sens-pass", "fill", "login-password", SYNTHETIC_SECRET],
        ["req-sens-click", "click", "login-submit", null],
      ] as const) {
        const response = await act(
          runtime,
          log,
          action(session_id, id, kind, target, 30000, value),
          fixtureResolver,
        );
        expect(response.status).toBe("ok");
      }
      const text = await runtime.readTargetText(
        {
          request_id: "req-sens-read",
          session_id,
          target: "login-result",
          timeout_ms: 30000,
        },
        fixtureResolver,
      );
      expect(text).toBe("Welcome ada");
      const assertion = await runtime.executeAssertion(
        createAssertionRequest({
          kind: "console",
          request_id: "req-sens-assert",
          session_id,
          statement: "no console errors observed",
          timeout_ms: 5000,
        }),
      );
      expect(assertion.status).toBe("passed");
      const owned = [...attemptOutputs(log), note({ text })];
      for (const output of owned) {
        expect(output).not.toContain(SYNTHETIC_SECRET);
      }
      const history = emptyHistory(session_id);
      results.push(
        createCaseResult({
          cache_pass_grants: 0,
          case_id: "sensitive-input",
          case_revision: 1,
          cross_tree_records: 0,
          drift_marker: null,
          failed_attempts_visible: countFailed(log),
          oracle: "clean",
          owned_outputs: owned,
          recovery_attempts_visible: 0,
          recovery_history_erasure: measureRecoveryHistoryErasure(history),
          semantic_unrevalidated: false,
          session_id,
          source_identity: SOURCE,
          unbound_records: 0,
          uncalibrated_model_passes: 0,
          verdict: "clean",
        }),
      );
    } finally {
      await runtime.dispose();
    }
  }, TEST_TIMEOUT_MS);

  it("qualifies the v1 benchmark with zero gates and full acceptance", () => {
    const manifest = parseBenchmarkManifest(
      readFileSync(MANIFEST_URL, "utf8"),
    );
    expect(results).toHaveLength(manifest.cases.length);
    const report = assembleBenchmarkReport({
      manifest,
      report_id: "report-browser-v1",
      results,
      source_identity: SOURCE,
    });
    expect(report.gates).toEqual({
      cache_authority_escalation: 0,
      cross_tree_evidence_leakage: 0,
      fabricated_pass: 0,
      hidden_applicable_not_run: 0,
      recovery_history_erasure: 0,
      secret_leakage_from_ascout_owned_artifacts: 0,
      silent_semantic_heal: 0,
      source_binding_violation: 0,
      unqualified_model_only_pass: 0,
    });
    expect(report.acceptance_reasons).toEqual([]);
    expect(report.defect_recall).toBe(1);
    expect(report.qualifies).toBe(true);
    const again = assembleBenchmarkReport({
      manifest,
      report_id: "report-browser-v1",
      results,
      source_identity: SOURCE,
    });
    expect(benchmarkReportDigest(again)).toBe(benchmarkReportDigest(report));
  }, TEST_TIMEOUT_MS);
});
