import { describe, expect, it } from "vitest";
import { simulateFd8Staging } from "../scripts/planning/fd8-staging-research.mjs";

const HEAD = "a".repeat(40);
const SOURCE = "b".repeat(40);
function input(counts = [4, 3, 4, 3, 7], adds = [326, 351, 367, 396, 381]) {
  const groups = counts.map((count, i) => ({
    id: "FD8-B-R" + (i + 1),
    files: Array.from({ length: count }, (_, j) =>
      "docs/strategy/ascout-v2/P" + i + "_" + j + ".md"),
  }));
  const sourceFiles = counts.reduce((a, b) => a + b, 0);
  const total = adds.reduce((a, b) => a + b, 0);
  return [
    {
      schema: "ascout.fd8.reslice-manifest/v1",
      review_state: "NOT_RATIFIED",
      base_head: HEAD,
      source_head: SOURCE,
      groups,
    },
    {
      schema: "ascout.fd8.reslice-audit/v1",
      base_head: HEAD,
      source_head: SOURCE,
      state: "BLOCKED_FORWARD_LINKS",
      errors: [],
      missingLinks: [],
      dependencyGraph: {
        has_cycle: true,
        cyclic_components: [[0, 1, 2, 3, 4]],
      },
      groups: groups.map((g, i) => ({
        id: g.id,
        files: g.files.length,
        added: adds[i],
      })),
      counts: {
        source_files: sourceFiles,
        mapped_files: sourceFiles,
        source_added: total,
      },
    },
  ] as const;
}

describe("FD8 research-only staging feasibility", () => {
  it("models the real 21-path, seven-grain proposal without authorizing it", () => {
    const result = simulateFd8Staging(...input());
    expect(result.status).toBe("SIMULATED_ONLY_BLOCKED_GOVERNANCE");
    expect(result.original_files).toBe(21);
    expect(result.original_added_lines).toBe(1821);
    expect(result.projected_steps.map(s => s.changed_files))
      .toEqual([11, 10, 4, 3, 4, 3, 7]);
    expect(result.projected_steps.map(s => s.projected_added_lines))
      .toEqual([11, 10, 326, 351, 367, 396, 381]);
    expect(result.projected_steps.at(-1)?.materialized_source_files).toBe(21);
    expect(result.projected_steps.every(s => s.non_effective && !s.merge_authorized)).toBe(true);
    expect(result.merge_authorized).toBe(false);
    expect(result.checks_not_run).toContain("GOVERNANCE_ADMISSION");
  });
  it("rejects stale, changed, or falsely ratified source identities", () => {
    const [m, a] = input();
    expect(() => simulateFd8Staging({ ...m, source_head: "c".repeat(40) }, a)).toThrow();
    expect(() => simulateFd8Staging({ ...m, review_state: "RATIFIED" }, a)).toThrow();
    expect(() => simulateFd8Staging(m, { ...a, state: "LINK_ORDER_READY_ONLY" })).toThrow();
    expect(() => simulateFd8Staging(m, { ...a, missingLinks: [{}] })).toThrow();
    expect(() => simulateFd8Staging(m, { ...a, dependencyGraph: { has_cycle: false } })).toThrow();
  });
  it("refuses oversized or miscounted projected stages", () => {
    const [m, a] = input();
    expect(() => simulateFd8Staging(m, { ...a, groups: a.groups.map((g, i) =>
      i === 0 ? { ...g, added: 401 } : g) })).toThrow();
    expect(() => simulateFd8Staging(m, { ...a, counts: { ...a.counts, mapped_files: 20 } })).toThrow();
    const [bigM, bigA] = input([13, 3], [200, 200]);
    expect(() => simulateFd8Staging(bigM, bigA)).toThrow();
  });
  it("rejects duplicate or unsafe path ownership", () => {
    const [m, a] = input();
    const groups = m.groups.map(g => ({ ...g, files: [...g.files] }));
    groups[1].files[0] = groups[0].files[0];
    expect(() => simulateFd8Staging({ ...m, groups }, a)).toThrow();
    groups[1].files[0] = "docs/strategy/../escape.md";
    expect(() => simulateFd8Staging({ ...m, groups }, a)).toThrow();
  });
});
