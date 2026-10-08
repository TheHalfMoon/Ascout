import { describe, expect, it } from "vitest";
import { auditFd8Split } from "../scripts/planning/audit-fd8-root.mjs";

const a = "docs/strategy/ascout-v2/A.md";
const b = "docs/strategy/ascout-v2/B.md";
const BASE = "a".repeat(40);
const SOURCE = "b".repeat(40);
function inputs(aBody = "No link", bBody = "No link") {
  const manifest = {
    schema: "ascout.fd8.reslice-manifest/v1",
    review_state: "NOT_RATIFIED",
    base_head: BASE,
    source_head: SOURCE,
    groups: [
      { id: "FD8-B-R1", files: [a] },
      { id: "FD8-B-R2", files: [b] },
    ],
  };
  const changed = [
    { path: a, added: 10, deleted: 0 },
    { path: b, added: 20, deleted: 0 },
  ];
  return {
    manifest, changed,
    contents: new Map([[a, aBody], [b, bBody]]),
    basePaths: new Set<string>(),
  };
}

describe("FD8 root-plan source and link preflight (does not authorize a merge)", () => {
  it("detects broken forward links and bidirectional planning cycles", () => {
    const report = auditFd8Split(inputs("[B](B.md)", "[A](A.md)"));
    expect(report.state).toBe("BLOCKED_FORWARD_LINKS");
    expect(report.forwardLinks).toEqual([{ from: a, to: b }]);
    expect(report.crossGroupCycles).toEqual(["0>1"]);
    expect(report.counts).toEqual({
      source_files: 2, mapped_files: 2, source_added: 30,
    });
    expect(report.merge_authorized).toBe(false);
    expect(report.founder_decision).toBe("PENDING");
    expect(report.independently_reviewed).toBe(false);
  });

  it("does not treat a relative link to a pre-existing file as missing", () => {
    const fixture = inputs("[Guide](../README.md)");
    fixture.basePaths.add("docs/strategy/README.md");
    const report = auditFd8Split(fixture);
    expect(report.state).toBe("LINK_ORDER_READY_ONLY");
    expect(report.merge_authorized).toBe(false);
    expect(report.forwardLinks).toEqual([]);
    expect(report.missingLinks).toEqual([]);
  });

  it("rejects missing or unassigned plan pages and broken links", () => {
    const fixture = inputs("[Lost](missing.md)");
    const report = auditFd8Split(fixture);
    expect(report.state).toBe("INVALID_SOURCE_OR_LINKS");
    expect(report.missingLinks).toEqual([{ from: a, to: "docs/strategy/ascout-v2/missing.md" }]);

    const missingSource = inputs();
    missingSource.manifest.groups[1]!.files = [];
    expect(auditFd8Split(missingSource).errors.join(" ")).toMatch(/group|unassigned/);
  });

  it("refuses duplicate registration, scope overrun and a modified original blob", () => {
    const dup = inputs();
    dup.manifest.groups[1]!.files = [a];
    expect(auditFd8Split(dup).state).toBe("INVALID_SOURCE_OR_LINKS");
    expect(auditFd8Split(dup).errors.join(" ")).toMatch(/duplicated|unassigned/);

    const tooLarge = inputs();
    tooLarge.changed[0]!.added = 401;
    expect(auditFd8Split(tooLarge).errors.join(" ")).toContain("FD8-B-R1 exceeds scope");

    const deleted = inputs();
    deleted.changed[0]!.deleted = 1;
    expect(auditFd8Split(deleted).errors.join(" ")).toMatch(/invalid root diff/);
  });

  it("refuses a fake approval or an unknown source identity", () => {
    const bad = inputs();
    bad.manifest.review_state = "RATIFIED";
    expect(() => auditFd8Split(bad)).toThrow(/unratified/);
    bad.manifest.review_state = "NOT_RATIFIED";
    bad.manifest.source_head = "latest";
    expect(() => auditFd8Split(bad)).toThrow(/unratified/);
  });

  it("does not parse public web URLs as local documentation dependencies", () => {
    const report = auditFd8Split(inputs(
      "[Open](https://example.org/a) [ref](#section) [relative](B.md#title)",
      "[safe](https://github.com/repository)",
    ));
    expect(report.state).toBe("BLOCKED_FORWARD_LINKS");
    expect(report.forwardLinks).toEqual([{ from: a, to: b }]);
    expect(report.missingLinks).toEqual([]);
  });
});
