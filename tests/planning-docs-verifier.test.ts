import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runCli, verifyPlanningDocs } from "../scripts/planning/verify-planning-docs-lib.mjs";

const roots: string[] = [];

function docs(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-planning-docs-"));
  roots.push(root);
  for (const [name, content] of Object.entries(files)) {
    const path = join(root, name);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, content);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("verifyPlanningDocs", () => {
  it("passes a package whose links resolve and identifiers are defined", () => {
    const root = docs({
      "a.md": "See [b](b.md). Tests ADV-01…ADV-02 and FD-1.\n",
      "b.md": "| ID | Test |\n|---|---|\n| ADV-01 | one |\n| ADV-02 | two |\n| FD-1 | decision | NEEDS-FOUNDER |\n",
    });
    const result = verifyPlanningDocs([root], { checkIds: true });
    expect(result.errors).toEqual([]);
    expect(result.summaries[0]).toMatchObject({ files: 2, links_checked: 1, referenced_ids: 3 });
  });

  it("reports broken relative links but ignores external URLs", () => {
    const root = docs({ "a.md": "[gone](missing.md) [web](https://example.com)\n" });
    const result = verifyPlanningDocs([root]);
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("broken link missing.md");
  });

  it("reports identifiers that are referenced but never defined, including expanded ranges", () => {
    const root = docs({ "a.md": "| SEC-01 | defined |\n\nRuns SEC-01…SEC-03.\n" });
    const result = verifyPlanningDocs([root], { checkIds: true });
    expect(result.errors.map((error) => error.split(": ").pop())).toEqual([
      "identifier SEC-02 is referenced but never defined in " + root,
      "identifier SEC-03 is referenced but never defined in " + root,
    ]);
  });

  it("does not read compound benchmark identifiers as acceptance identifiers", () => {
    const root = docs({ "a.md": "| ADV-01 | x |\n\nB-SEC-1 and B-REV-2 measure ADV-01.\n" });
    expect(verifyPlanningDocs([root], { checkIds: true }).errors).toEqual([]);
  });

  it("refuses to pass an identifier check that found no identifiers", () => {
    const root = docs({ "a.md": "No identifiers here.\n" });
    const result = verifyPlanningDocs([root], { checkIds: true });
    expect(result.errors).toEqual([`${root}: --ids found no identifier references; refusing to pass by omission`]);
  });

  it("flags founder decisions presented as approved and accepts negated or pending statements", () => {
    const root = docs({
      "a.md": [
        "FD-1 is APPROVED.",
        "FD-2: ratified by the founder.",
        "No FD is approved by this record (FD-3).",
        "| FD-4 | guidance | NEEDS-FOUNDER |",
        "FD-5 is not yet ratified.",
      ].join("\n"),
    });
    const result = verifyPlanningDocs([root]);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toMatch(/:1: a founder decision/);
    expect(result.errors[1]).toMatch(/:2: a founder decision/);
  });

  it("reports missing and empty roots", () => {
    const empty = docs({});
    const missing = join(empty, "absent");
    const result = verifyPlanningDocs([missing, empty]);
    expect(result.errors).toEqual([`${missing}: directory does not exist`, `${empty}: no markdown files found`]);
  });
});

describe("runCli", () => {
  it("returns 2 with usage when no directory is given", () => {
    const err: string[] = [];
    expect(runCli([], () => {}, (line: string) => err.push(line))).toBe(2);
    expect(err[0]).toContain("usage:");
  });

  it("returns 0 and prints PASS for a valid package", () => {
    const root = docs({ "a.md": "| ADV-01 | x |\n\nADV-01\n" });
    const out: string[] = [];
    expect(runCli(["--ids", root], (line: string) => out.push(line), () => {})).toBe(0);
    expect(out.at(-1)).toBe("verify-planning-docs: PASS");
  });

  it("returns 1 and prints each problem for an invalid package", () => {
    const root = docs({ "a.md": "[gone](missing.md)\n" });
    const err: string[] = [];
    expect(runCli([root], () => {}, (line: string) => err.push(line))).toBe(1);
    expect(err.at(-1)).toBe("verify-planning-docs: FAIL (1 problem(s))");
  });
});
