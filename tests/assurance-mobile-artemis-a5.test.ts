import { describe, expect, it } from "vitest";

import {
  bindLocatorEvidenceV1,
  classifyFrameworkV1,
  frameworkOfNodeV1,
  LOCATOR_STRATEGIES,
  matchDynamicTargetV1,
  parseDynamicTargetV1,
  planLocatorV1,
} from "../src/assurance/engines/mobile-artemis/locating.js";

describe("ARTEMIS-A5 accessibility-first strategy routing", () => {
  it("freezes the strategy catalog in accessibility-first order", () => {
    expect([...LOCATOR_STRATEGIES]).toEqual([
      "ACCESSIBILITY_ID",
      "RESOURCE_ID",
      "TEXT",
      "CONTENT_DESC",
      "CLASS_HIERARCHY",
      "OCR_TEXT",
      "VISION_REGION",
      "COORDINATE_FALLBACK",
    ]);
  });

  it("orders plans accessibility-first with fallback last", () => {
    const planned = planLocatorV1(
      ["COORDINATE_FALLBACK", "TEXT", "ACCESSIBILITY_ID"],
      "hierarchy empty on canvas screen",
    );
    expect(planned.ok).toBe(true);
    if (planned.ok) {
      expect(planned.value.steps.map((step) => step.strategy)).toEqual([
        "ACCESSIBILITY_ID",
        "TEXT",
        "COORDINATE_FALLBACK",
      ]);
      expect(planned.value.coordinateFallback).toBe(true);
      const fallback = planned.value.steps[2];
      expect(fallback?.fallback).toBe(true);
      expect(fallback?.fallbackReason).toBe("hierarchy empty on canvas screen");
    }
  });

  it("refuses fallback without reason, duplicates, and unknown strategies", () => {
    expect(planLocatorV1(["COORDINATE_FALLBACK"], "").ok).toBe(false);
    expect(planLocatorV1(["TEXT", "TEXT"], "reason").ok).toBe(false);
    expect(planLocatorV1(["XPATH"], "reason").ok).toBe(false);
    expect(planLocatorV1([], "reason").ok).toBe(false);
  });
});

describe("ARTEMIS-A5 literal dynamic-target matching", () => {
  it("matches exact, prefix, and contains rules without patterns-as-programs", () => {
    const candidates = ["Item 1 of 10", "Item 2 of 10", "Header"];
    const exact = matchDynamicTargetV1(
      { rule: "exact", pattern: "Header" },
      candidates,
    );
    expect(exact.ok).toBe(true);
    if (exact.ok) {
      expect(exact.value).toEqual([{ candidate: "Header", rule: "exact" }]);
    }

    const prefix = matchDynamicTargetV1(
      { rule: "prefix", pattern: "Item " },
      candidates,
    );
    expect(prefix.ok).toBe(true);
    if (prefix.ok) expect(prefix.value).toHaveLength(2);

    const contains = matchDynamicTargetV1(
      { rule: "contains", pattern: "of 10" },
      candidates,
    );
    expect(contains.ok).toBe(true);
    if (contains.ok) expect(contains.value).toHaveLength(2);

    expect(
      matchDynamicTargetV1({ rule: "regex", pattern: ".*" }, candidates).ok,
    ).toBe(false);
    expect(
      matchDynamicTargetV1({ rule: "exact", pattern: "" }, candidates).ok,
    ).toBe(false);
    expect(
      matchDynamicTargetV1(
        { rule: "exact", pattern: "Header", extra: 1 },
        candidates,
      ).ok,
    ).toBe(false);
  });

  it("validates dynamic targets with exact keys", () => {
    const parsed = parseDynamicTargetV1({ rule: "prefix", pattern: "Item " });
    expect(parsed.ok).toBe(true);
    expect(parseDynamicTargetV1({ rule: "prefix" }).ok).toBe(false);
    expect(parseDynamicTargetV1(null).ok).toBe(false);
  });
});

describe("ARTEMIS-A5 platform framework classification", () => {
  it("classifies Compose, Flutter, WebView, Canvas, native, and unknown", () => {
    expect(classifyFrameworkV1("androidx.compose.ui.View")).toBe("COMPOSE");
    expect(classifyFrameworkV1("io.flutter.embedding.View")).toBe("FLUTTER");
    expect(classifyFrameworkV1("android.webkit.WebView")).toBe("WEBVIEW");
    expect(classifyFrameworkV1("android.view.SurfaceView")).toBe("CANVAS");
    expect(classifyFrameworkV1("android.widget.Button")).toBe("NATIVE_VIEW");
    expect(classifyFrameworkV1("com.example.CustomView")).toBe("UNKNOWN_FRAMEWORK");
    expect(classifyFrameworkV1("")).toBe("UNKNOWN_FRAMEWORK");
    expect(
      frameworkOfNodeV1({
        index: 0,
        text: "",
        resourceId: "",
        className: "androidx.compose.ui.View",
        packageName: "com.example",
        contentDesc: "",
        clickable: false,
        bounds: { x1: 0, y1: 0, x2: 10, y2: 10 },
      }),
    ).toBe("COMPOSE");
  });
});

describe("ARTEMIS-A5 locator path evidence", () => {
  it("binds ordered attempts with winner and fallback flags", () => {
    const evidence = bindLocatorEvidenceV1([
      { strategy: "ACCESSIBILITY_ID", selector: "login", matched: false, nodeIndex: -1 },
      { strategy: "TEXT", selector: "Log in", matched: true, nodeIndex: 4 },
    ]);
    expect(evidence.ok).toBe(true);
    if (evidence.ok) {
      expect(evidence.value.winningStrategy).toBe("TEXT");
      expect(evidence.value.coordinateFallbackUsed).toBe(false);
      expect(evidence.value.attempts).toHaveLength(2);
      expect(Object.isFrozen(evidence.value)).toBe(true);
    }

    const fallback = bindLocatorEvidenceV1([
      { strategy: "TEXT", selector: "x", matched: false, nodeIndex: -1 },
      { strategy: "COORDINATE_FALLBACK", selector: "540,1200", matched: true, nodeIndex: -1 },
    ]);
    expect(fallback.ok).toBe(true);
    if (fallback.ok) {
      expect(fallback.value.winningStrategy).toBe("COORDINATE_FALLBACK");
      expect(fallback.value.coordinateFallbackUsed).toBe(true);
    }

    expect(bindLocatorEvidenceV1([]).ok).toBe(false);
    expect(
      bindLocatorEvidenceV1([
        { strategy: "XPATH", selector: "//x", matched: true, nodeIndex: 0 },
      ]).ok,
    ).toBe(false);
  });
});
