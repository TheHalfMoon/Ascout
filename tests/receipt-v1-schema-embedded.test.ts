import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { RECEIPT_V1_SCHEMA } from "../src/receipt/receipt-v1-schema.js";

const PROJECT_ROOT = resolve(__dirname, "..");
const CANONICAL = join(PROJECT_ROOT, "specs", "001-changed-code-verification-receipt", "contracts", "receipt-v1.schema.json");

describe("embedded receipt v1 schema", () => {
  it("is exactly the canonical specs file", () => {
    const canonical = JSON.parse(readFileSync(CANONICAL, "utf8")) as unknown;
    // If this fails, regenerate src/receipt/receipt-v1-schema.ts from the specs file.
    expect(RECEIPT_V1_SCHEMA).toStrictEqual(canonical);
  });

  it("is what the receipt code loads, with no file read at run time", () => {
    const source = readFileSync(join(PROJECT_ROOT, "src", "receipt", "json.ts"), "utf8");
    expect(source).toContain('from "./receipt-v1-schema.js"');
    expect(source).not.toMatch(/readFileSync|import\.meta\.url|specs\//u);
  });
});
