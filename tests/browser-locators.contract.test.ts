import { describe, expect, it } from "vitest";
import {
  createLocatorCandidate,
  disambiguate,
  LOCATOR_AMBIGUOUS,
  LOCATOR_UNRESOLVED,
  locatorCandidateFromJson,
  locatorCandidateToJson,
  locatorResolutionFromJson,
  locatorResolutionToJson,
  orderCandidates,
  PLAYWRIGHT_BINDING,
  requireResolved,
  resolveLocators,
} from "../src/browser/locators.js";

function roleCandidate(value = "Place order") {
  return createLocatorCandidate({
    reason: null,
    role: "button",
    strategy: "role",
    value,
  });
}

describe("spec016 p016-06 deterministic locator policy", () => {
  it("validates candidates per strategy", () => {
    expect(roleCandidate().strategy).toBe("role");
    expect(() =>
      createLocatorCandidate({
        reason: null,
        role: null,
        strategy: "role",
        value: "x",
      }),
    ).toThrow(TypeError);
    expect(() =>
      createLocatorCandidate({
        reason: null,
        role: "button",
        strategy: "text",
        value: "x",
      }),
    ).toThrow(TypeError);
    const structural = createLocatorCandidate({
      reason: "legacy table without semantics",
      role: null,
      strategy: "structural-fallback",
      value: "table.orders > tbody > tr:first-child",
    });
    expect(structural.reason).toBe("legacy table without semantics");
    expect(() =>
      createLocatorCandidate({
        reason: null,
        role: null,
        strategy: "structural-fallback",
        value: "div",
      }),
    ).toThrow(TypeError);
    expect(() =>
      createLocatorCandidate({
        reason: "not allowed",
        role: null,
        strategy: "label",
        value: "x",
      }),
    ).toThrow(TypeError);
    expect(() =>
      createLocatorCandidate({
        reason: null,
        role: null,
        strategy: "text",
        value: "",
      }),
    ).toThrow(TypeError);
  });

  it("accepts known ARIA roles and rejects unknown ones", () => {
    for (const role of [
      "button",
      "textbox",
      "heading",
      "img",
      "link",
      "generic",
      "graphics-document",
      "none",
    ]) {
      expect(
        createLocatorCandidate({
          reason: null,
          role,
          strategy: "role",
          value: "x",
        }).role,
      ).toBe(role);
    }
    expect(() =>
      createLocatorCandidate({
        reason: null,
        role: "vibes",
        strategy: "role",
        value: "x",
      }),
    ).toThrow(TypeError);
  });

  it("orders candidates by strategy priority, then value", () => {
    const testId = createLocatorCandidate({
      reason: null,
      role: null,
      strategy: "test-id",
      value: "place-order",
    });
    const text = createLocatorCandidate({
      reason: null,
      role: null,
      strategy: "text",
      value: "Place order",
    });
    const role = roleCandidate();
    const label = createLocatorCandidate({
      reason: null,
      role: null,
      strategy: "label",
      value: "Place order",
    });
    const structural = createLocatorCandidate({
      reason: "fallback",
      role: null,
      strategy: "structural-fallback",
      value: "button.primary",
    });
    const ordered = orderCandidates([structural, testId, text, role, label]);
    expect(ordered.map((entry) => entry.strategy)).toEqual([
      "role",
      "label",
      "text",
      "test-id",
      "structural-fallback",
    ]);
  });

  it("resolves the highest-priority exact match and records the trail", () => {
    const resolution = resolveLocators("place order button", [
      { candidate: roleCandidate(), match_count: 0 },
      {
        candidate: createLocatorCandidate({
          reason: null,
          role: null,
          strategy: "test-id",
          value: "place-order",
        }),
        match_count: 1,
      },
      {
        candidate: createLocatorCandidate({
          reason: null,
          role: null,
          strategy: "text",
          value: "Place order",
        }),
        match_count: 1,
      },
    ]);
    expect(resolution.outcome).toBe("resolved");
    expect(resolution.selected?.strategy).toBe("text");
    expect(resolution.error_code).toBeNull();
    expect(resolution.candidates_tried.map((entry) => entry.strategy)).toEqual(
      ["role", "text", "test-id"],
    );
    expect(requireResolved(resolution).strategy).toBe("text");
  });

  it("fails closed on ambiguity with a locator-layer code", () => {
    const resolution = resolveLocators("submit", [
      { candidate: roleCandidate("Submit"), match_count: 3 },
      {
        candidate: createLocatorCandidate({
          reason: null,
          role: null,
          strategy: "text",
          value: "Submit",
        }),
        match_count: 0,
      },
    ]);
    expect(resolution.outcome).toBe("ambiguous");
    expect(resolution.error_code).toBe(LOCATOR_AMBIGUOUS);
    expect(resolution.selected).toBeNull();
    expect(() => requireResolved(resolution)).toThrow(LOCATOR_AMBIGUOUS);
  });

  it("fails closed on zero matches with an unresolved code", () => {
    const resolution = resolveLocators("ghost", [
      { candidate: roleCandidate("Ghost"), match_count: 0 },
    ]);
    expect(resolution.outcome).toBe("unresolved");
    expect(resolution.error_code).toBe(LOCATOR_UNRESOLVED);
    expect(() => requireResolved(resolution)).toThrow(LOCATOR_UNRESOLVED);
  });

  it("rejects malformed resolution inputs", () => {
    expect(() => resolveLocators("x", [])).toThrow(TypeError);
    expect(() =>
      resolveLocators("x", [{ candidate: roleCandidate(), match_count: -1 }]),
    ).toThrow(TypeError);
    expect(() =>
      resolveLocators("x", [{ candidate: roleCandidate(), match_count: 1.5 }]),
    ).toThrow(TypeError);
    expect(() => resolveLocators("", [])).toThrow(TypeError);
  });

  it("records explicit disambiguation with bounds checks", () => {
    const target = disambiguate(roleCandidate("Row"), 4, 2);
    expect(target).toEqual({
      index: 2,
      match_count: 4,
      role: "button",
      strategy: "role",
      value: "Row",
    });
    expect(() => disambiguate(roleCandidate(), 2, 2)).toThrow(TypeError);
    expect(() => disambiguate(roleCandidate(), 2, -1)).toThrow(TypeError);
    expect(() => disambiguate(roleCandidate(), 0, 0)).toThrow(TypeError);
  });

  it("keeps locator codes disjoint from product assertion codes", () => {
    expect(LOCATOR_AMBIGUOUS.startsWith("E_LOCATOR_")).toBe(true);
    expect(LOCATOR_UNRESOLVED.startsWith("E_LOCATOR_")).toBe(true);
    const productCodes = [
      "E_TIMEOUT",
      "E_ACTION_FAILED",
      "E_CONSOLE_ERROR",
      "E_ASSERTION_KIND_DEFERRED",
    ];
    for (const code of [LOCATOR_AMBIGUOUS, LOCATOR_UNRESOLVED]) {
      expect(productCodes).not.toContain(code);
    }
  });

  it("documents a playwright binding for every strategy", () => {
    expect(Object.keys(PLAYWRIGHT_BINDING).sort()).toEqual(
      [
        "alt-text",
        "label",
        "placeholder",
        "role",
        "structural-fallback",
        "test-id",
        "text",
        "title",
      ].sort(),
    );
    expect(PLAYWRIGHT_BINDING.role).toBe("getByRole");
    expect(PLAYWRIGHT_BINDING.label).toBe("getByLabel");
  });

  it("round-trips candidates and resolutions strictly", () => {
    const candidate = roleCandidate();
    expect(locatorCandidateFromJson(locatorCandidateToJson(candidate))).toEqual(
      candidate,
    );
    expect(() => locatorCandidateFromJson("nope")).toThrow(TypeError);
    const resolution = resolveLocators("b", [
      { candidate, match_count: 1 },
    ]);
    const json = locatorResolutionToJson(resolution);
    expect(locatorResolutionFromJson(json)).toEqual(resolution);
    const tampered = JSON.stringify({
      ...(JSON.parse(json) as Record<string, unknown>),
      outcome: "ambiguous",
    });
    expect(() => locatorResolutionFromJson(tampered)).toThrow(TypeError);
  });

  it("resolves deterministically across repetitions", () => {
    const inputs = [
      { candidate: roleCandidate(), match_count: 0 },
      {
        candidate: createLocatorCandidate({
          reason: null,
          role: null,
          strategy: "test-id",
          value: "x",
        }),
        match_count: 1,
      },
    ];
    const first = locatorResolutionToJson(resolveLocators("t", inputs));
    const second = locatorResolutionToJson(resolveLocators("t", inputs));
    expect(second).toBe(first);
  });
});
