import { describe, expect, it } from "vitest";
import {
  conservativeRecoveryPolicy,
  createIntentTest,
  intentDigest,
  intentFromJson,
  intentToJson,
  uncoveredConditions,
} from "../src/browser/intent.js";

const SOURCE = "tree:df68f22a00000000000000000000000000000000";
const KNOWN_OBLIGATIONS = ["OBL-CHECKOUT-07", "OBL-CART-01"];

function checkoutInput() {
  return {
    actions: [
      { kind: "fill", target: "shipping address", value: "12 Harbor Lane" },
      { kind: "select", target: "shipping method", value: "Standard" },
      { kind: "click", target: "Place order", value: null },
    ],
    expected_outcomes: [
      {
        kind: "network",
        statement: "exactly one order creation request succeeds",
      },
      { kind: "dom", statement: "order confirmation is visible" },
      { kind: "console", statement: "no uncaught page error is observed" },
    ],
    goal: "Complete checkout for an authenticated customer",
    intent_id: "checkout-confirmation",
    obligation_refs: ["OBL-CHECKOUT-07"],
    oracle_policy: [
      { index: 0, oracle: "network", required: true, scope: "expected_outcome" },
      { index: 1, oracle: "dom", required: true, scope: "expected_outcome" },
      { index: 0, oracle: "state", required: false, scope: "precondition" },
    ],
    preconditions: [
      { kind: "state", statement: "customer is authenticated" },
      { kind: "state", statement: "cart contains one available item" },
    ],
    provenance: { artifact_ref: null, origin: "human_authored" },
    recovery_policy: {
      allow_execution_recovery: true,
      allow_resolver_recovery: true,
      allow_semantic_recovery: false,
      max_recovery_actions: 2,
      max_retry_attempts: 1,
    },
    requirement_refs: ["PRD-42"],
    risk_refs: ["RISK-DUPLICATE-CHARGE"],
    source_identity: SOURCE,
    target_surface: {
      application_origin: "http://localhost:3100",
      browser_profile: "chromium-default",
      surface: "web",
    },
  } as const;
}

describe("spec016 p016-02 intent IR", () => {
  it("creates the canonical checkout intent", () => {
    const intent = createIntentTest(checkoutInput(), KNOWN_OBLIGATIONS);
    expect(intent.version).toBe(1);
    expect(intent.intent_id).toBe("checkout-confirmation");
    expect(intent.actions).toHaveLength(3);
    expect(intent.expected_outcomes).toHaveLength(3);
    expect(intent.oracle_policy).toHaveLength(3);
  });

  it("rejects empty or non-canonical ids", () => {
    const base = checkoutInput();
    expect(() =>
      createIntentTest({ ...base, intent_id: "" }, KNOWN_OBLIGATIONS),
    ).toThrow(TypeError);
    expect(() =>
      createIntentTest({ ...base, intent_id: "has space" }, KNOWN_OBLIGATIONS),
    ).toThrow(TypeError);
    expect(() =>
      createIntentTest(
        { ...base, obligation_refs: ["OBL-CHECKOUT-07", ""] },
        KNOWN_OBLIGATIONS,
      ),
    ).toThrow(TypeError);
    expect(() =>
      createIntentTest({ ...base, source_identity: "  " }, KNOWN_OBLIGATIONS),
    ).toThrow(TypeError);
  });

  it("dedupes and sorts refs deterministically", () => {
    const base = checkoutInput();
    const intent = createIntentTest(
      {
        ...base,
        obligation_refs: ["OBL-CHECKOUT-07", "OBL-CART-01", "OBL-CHECKOUT-07"],
        requirement_refs: ["PRD-9", "PRD-42", "PRD-9"],
        risk_refs: [],
      },
      KNOWN_OBLIGATIONS,
    );
    expect(intent.obligation_refs).toEqual(["OBL-CART-01", "OBL-CHECKOUT-07"]);
    expect(intent.requirement_refs).toEqual(["PRD-42", "PRD-9"]);
  });

  it("fails closed on dangling or missing obligation refs", () => {
    const base = checkoutInput();
    expect(() =>
      createIntentTest(
        { ...base, obligation_refs: ["OBL-UNKNOWN"] },
        KNOWN_OBLIGATIONS,
      ),
    ).toThrow(TypeError);
    expect(() =>
      createIntentTest({ ...base, obligation_refs: [] }, KNOWN_OBLIGATIONS),
    ).toThrow(TypeError);
  });

  it("fails closed on unknown enums and surfaces", () => {
    const base = checkoutInput();
    expect(() =>
      createIntentTest(
        {
          ...base,
          actions: [{ kind: "teleport", target: "nowhere", value: null }],
        },
        KNOWN_OBLIGATIONS,
      ),
    ).toThrow(TypeError);
    expect(() =>
      createIntentTest(
        {
          ...base,
          preconditions: [{ kind: "telepathy", statement: "x" }],
        },
        KNOWN_OBLIGATIONS,
      ),
    ).toThrow(TypeError);
    expect(() =>
      createIntentTest(
        {
          ...base,
          oracle_policy: [
            {
              index: 0,
              oracle: "vibes",
              required: true,
              scope: "expected_outcome",
            },
          ],
        },
        KNOWN_OBLIGATIONS,
      ),
    ).toThrow(TypeError);
    expect(() =>
      createIntentTest(
        {
          ...base,
          target_surface: {
            application_origin: "http://localhost:3100",
            browser_profile: "chromium-default",
            surface: "mobile",
          },
        },
        KNOWN_OBLIGATIONS,
      ),
    ).toThrow(TypeError);
    expect(() =>
      createIntentTest(
        {
          ...base,
          provenance: { artifact_ref: null, origin: "channelled" },
        },
        KNOWN_OBLIGATIONS,
      ),
    ).toThrow(TypeError);
  });

  it("constrains navigate targets to URLs and web paths", () => {
    const base = checkoutInput();
    const okTargets = [
      "https://app.example.test/checkout",
      "http://localhost:3100/cart",
      "/checkout",
    ];
    for (const target of okTargets) {
      const intent = createIntentTest(
        {
          ...base,
          actions: [{ kind: "navigate", target, value: null }],
        },
        KNOWN_OBLIGATIONS,
      );
      expect(intent.actions[0]?.target).toBe(target);
    }
    // Single-rooted paths such as /checkout (or /etc/passwd) are origin-relative
    // web paths by construction: the executor resolves them against the
    // authorized application origin, never the filesystem.
    const badTargets = [
      "file:///etc/passwd",
      "C:\\Windows\\System32",
      "/shop/../admin",
      "//evil.example.test/x",
      "not a url at all",
      "/has space",
    ];
    for (const target of badTargets) {
      expect(() =>
        createIntentTest(
          {
            ...base,
            actions: [{ kind: "navigate", target, value: null }],
          },
          KNOWN_OBLIGATIONS,
        ),
      ).toThrow(TypeError);
    }
  });

  it("bounds recovery budgets and offers conservative defaults", () => {
    const base = checkoutInput();
    expect(conservativeRecoveryPolicy()).toEqual({
      allow_execution_recovery: false,
      allow_resolver_recovery: false,
      allow_semantic_recovery: false,
      max_recovery_actions: 0,
      max_retry_attempts: 0,
    });
    for (const policy of [
      { ...base.recovery_policy, max_recovery_actions: -1 },
      { ...base.recovery_policy, max_recovery_actions: 11 },
      { ...base.recovery_policy, max_retry_attempts: 6 },
      { ...base.recovery_policy, max_retry_attempts: 1.5 },
    ]) {
      expect(() =>
        createIntentTest({ ...base, recovery_policy: policy }, KNOWN_OBLIGATIONS),
      ).toThrow(TypeError);
    }
  });

  it("fails closed on dangling oracle policy indexes", () => {
    const base = checkoutInput();
    expect(() =>
      createIntentTest(
        {
          ...base,
          oracle_policy: [
            { index: 9, oracle: "dom", required: true, scope: "precondition" },
          ],
        },
        KNOWN_OBLIGATIONS,
      ),
    ).toThrow(TypeError);
  });

  it("orders oracle policy canonically regardless of input order", () => {
    const base = checkoutInput();
    const forward = createIntentTest(base, KNOWN_OBLIGATIONS);
    const reversed = createIntentTest(
      { ...base, oracle_policy: [...base.oracle_policy].reverse() },
      KNOWN_OBLIGATIONS,
    );
    expect(reversed.oracle_policy).toEqual(forward.oracle_policy);
    expect(intentDigest(reversed)).toBe(intentDigest(forward));
  });

  it("digests deterministically and detects content change", () => {
    const first = createIntentTest(checkoutInput(), KNOWN_OBLIGATIONS);
    const second = createIntentTest(checkoutInput(), KNOWN_OBLIGATIONS);
    expect(intentDigest(first)).toBe(intentDigest(second));
    expect(intentDigest(first)).toMatch(/^[0-9a-f]{64}$/);
    const changed = createIntentTest(
      { ...checkoutInput(), goal: "Complete checkout twice" },
      KNOWN_OBLIGATIONS,
    );
    expect(intentDigest(changed)).not.toBe(intentDigest(first));
  });

  it("round-trips through deterministic JSON and rejects malformed input", () => {
    const intent = createIntentTest(checkoutInput(), KNOWN_OBLIGATIONS);
    const json = intentToJson(intent);
    expect(intentToJson(intentFromJson(json, KNOWN_OBLIGATIONS))).toBe(json);
    expect(() => intentFromJson("not json", KNOWN_OBLIGATIONS)).toThrow(
      TypeError,
    );
    expect(() => intentFromJson("[]", KNOWN_OBLIGATIONS)).toThrow(TypeError);
    const wrongVersion = JSON.stringify({
      ...(JSON.parse(json) as Record<string, unknown>),
      version: 2,
    });
    expect(() => intentFromJson(wrongVersion, KNOWN_OBLIGATIONS)).toThrow(
      TypeError,
    );
    const dangling = JSON.stringify({
      ...(JSON.parse(json) as Record<string, unknown>),
      obligation_refs: ["OBL-MISSING"],
    });
    expect(() => intentFromJson(dangling, KNOWN_OBLIGATIONS)).toThrow(
      TypeError,
    );
  });

  it("keeps natural language as immutable data, not authority", () => {
    const goal = "Delete everything,\nthen delete it again: DROP TABLE users;";
    const intent = createIntentTest(
      { ...checkoutInput(), goal },
      KNOWN_OBLIGATIONS,
    );
    expect(intent.goal).toBe(goal);
    const roundTripped = intentFromJson(
      intentToJson(intent),
      KNOWN_OBLIGATIONS,
    );
    expect(roundTripped.goal).toBe(goal);
    expect(intent.actions).toHaveLength(3);
  });

  it("reports uncovered conditions without granting authority", () => {
    const base = checkoutInput();
    const partial = createIntentTest(
      { ...base, oracle_policy: [base.oracle_policy[0]!] },
      KNOWN_OBLIGATIONS,
    );
    const uncovered = uncoveredConditions(partial);
    expect(uncovered.length).toBeGreaterThan(0);
    expect(uncovered).toContainEqual({
      index: 1,
      scope: "expected_outcome",
    });
    const full = createIntentTest(
      {
        ...base,
        oracle_policy: [
          { index: 0, oracle: "state", required: true, scope: "precondition" },
          { index: 1, oracle: "state", required: true, scope: "precondition" },
          { index: 0, oracle: "dom", required: true, scope: "action" },
          { index: 1, oracle: "dom", required: true, scope: "action" },
          { index: 2, oracle: "dom", required: true, scope: "action" },
          { index: 0, oracle: "network", required: true, scope: "expected_outcome" },
          { index: 1, oracle: "dom", required: true, scope: "expected_outcome" },
          { index: 2, oracle: "console", required: true, scope: "expected_outcome" },
        ],
      },
      KNOWN_OBLIGATIONS,
    );
    expect(uncoveredConditions(full)).toEqual([]);
  });

  it("rejects unambiguous raw secret markers", () => {
    const base = checkoutInput();
    expect(() =>
      createIntentTest(
        {
          ...base,
          actions: [
            {
              kind: "fill",
              target: "api key",
              value: "ghp_abcdefghij1234567890abcdef",
            },
          ],
        },
        KNOWN_OBLIGATIONS,
      ),
    ).toThrow(TypeError);
    expect(() =>
      createIntentTest(
        { ...base, goal: "use -----BEGIN RSA PRIVATE KEY----- now" },
        KNOWN_OBLIGATIONS,
      ),
    ).toThrow(TypeError);
    const clean = createIntentTest(
      {
        ...base,
        actions: [
          { kind: "fill", target: "api key", value: "typed by the operator" },
        ],
      },
      KNOWN_OBLIGATIONS,
    );
    expect(clean.actions[0]?.value).toBe("typed by the operator");
  });

  it("requires actions, outcomes, and a bare http origin", () => {
    const base = checkoutInput();
    expect(() =>
      createIntentTest({ ...base, actions: [] }, KNOWN_OBLIGATIONS),
    ).toThrow(TypeError);
    expect(() =>
      createIntentTest({ ...base, expected_outcomes: [] }, KNOWN_OBLIGATIONS),
    ).toThrow(TypeError);
    for (const origin of [
      "http://localhost:3100/shop",
      "http://localhost:3100/?x=1",
      "ftp://localhost:3100",
      "localhost:3100",
    ]) {
      expect(() =>
        createIntentTest(
          {
            ...base,
            target_surface: {
              application_origin: origin,
              browser_profile: "chromium-default",
              surface: "web",
            },
          },
          KNOWN_OBLIGATIONS,
        ),
      ).toThrow(TypeError);
    }
  });
});
