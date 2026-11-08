import { describe, expect, it } from "vitest";
import { compareCodeUnitsV1 } from "../src/assurance/security/sentrdel-code-unit-order.js";

describe("shared UA-P06 code-unit comparator", () => {
  it("is a total, antisymmetric three-way comparison", () => {
    expect(compareCodeUnitsV1("a", "a")).toBe(0);
    expect(compareCodeUnitsV1("a", "b")).toBe(-1);
    expect(compareCodeUnitsV1("b", "a")).toBe(1);
    expect(compareCodeUnitsV1("", "a")).toBe(-1);
  });

  it("orders by UTF-16 code units, not by locale", () => {
    // Uppercase sorts before lowercase, and accented letters after ASCII, regardless of host ICU.
    expect(["b", "B", "a", "ä", "A"].sort(compareCodeUnitsV1)).toEqual(["A", "B", "a", "b", "ä"]);
    expect(compareCodeUnitsV1("Z", "a")).toBe(-1);
    expect(compareCodeUnitsV1("a", "Z")).toBe(1);
  });
});
