import { describe, expect, it } from "vitest";
import { analyzeFd8GroupGraph } from "../scripts/planning/fd8-link-graph.mjs";
import { auditFd8Split } from "../scripts/planning/audit-fd8-root.mjs";

describe("FD8 full dependency graph preflight", () => {
  it("finds a three-group cycle even if no two groups are directly reciprocal", () => {
    const graph = analyzeFd8GroupGraph(3, new Set(["0>1", "1>2", "2>0"]));
    expect(graph.has_cycle).toBe(true);
    expect(graph.cyclic_components).toEqual([[0, 1, 2]]);
    expect(graph.candidate_order).toBeNull();
    expect(graph.merge_authorized).toBe(false);
  });

  it("reports independent cyclic components with stable canonical order", () => {
    const edges = new Set(["3>2", "0>1", "2>3", "1>0"]);
    const graph = analyzeFd8GroupGraph(5, edges);
    expect(graph.cyclic_components).toEqual([[0, 1], [2, 3]]);
    expect(analyzeFd8GroupGraph(5, new Set([...edges].reverse()))).toEqual(graph);
  });

  it("calculates dependency-first order for an acyclic but forward-linked plan", () => {
    const graph = analyzeFd8GroupGraph(4, new Set(["0>1", "1>2"]));
    expect(graph.has_cycle).toBe(false);
    expect(graph.cyclic_components).toEqual([]);
    expect(graph.candidate_order).toEqual([2, 1, 0, 3]);
    expect(graph.merge_authorized).toBe(false);
    expect(Object.isFrozen(graph)).toBe(true);
  });

  it("does not pretend an empty graph is founder review or merge authority", () => {
    const graph = analyzeFd8GroupGraph(3, new Set());
    expect(graph.candidate_order).toEqual([0, 1, 2]);
    expect(graph.has_cycle).toBe(false);
    expect(graph.merge_authorized).toBe(false);
  });

  it("rejects out-of-bounds, unsafe, or ambiguous group edge descriptors", () => {
    for (const edges of [
      new Set(["0>2"]), new Set(["0>0"]), new Set(["1>01"]),
      new Set(["-1>0"]), new Set(["0>NaN"]), new Set(["__proto__>0"]),
      new Set(["0>1", "bad"]), new Set([0]),
    ]) {
      expect(() => analyzeFd8GroupGraph(2, edges)).toThrow(TypeError);
    }
    for (const count of [0, 1, 65, NaN, 2.4]) {
      expect(() => analyzeFd8GroupGraph(count, new Set())).toThrow(TypeError);
    }
    expect(() => analyzeFd8GroupGraph(3, [])).toThrow(TypeError);
  });

  it("integrates SCC detection into the actual pinned-plan audit response", () => {
    const root = "docs/strategy/ascout-v2/";
    const paths = ["A.md", "B.md", "C.md"].map(p => root + p);
    const manifest = {
      schema: "ascout.fd8.reslice-manifest/v1",
      base_head: "a".repeat(40),
      source_head: "b".repeat(40),
      review_state: "NOT_RATIFIED",
      groups: paths.map((path, i) => ({ id: "FD8-B-R" + (i + 1), files: [path] })),
    };
    const contents = new Map([
      [paths[0], "[B](B.md)"], [paths[1], "[C](C.md)"], [paths[2], "[A](A.md)"],
    ]);
    const audit = auditFd8Split({
      manifest,
      changed: paths.map(path => ({ path, added: 3, deleted: 0 })),
      contents,
      basePaths: new Set(),
    });
    expect(audit.state).toBe("BLOCKED_FORWARD_LINKS");
    expect(audit.crossGroupCycles).toEqual([]); // Old direct-pair detection misses the cycle.
    expect(audit.dependencyGraph.has_cycle).toBe(true);
    expect(audit.dependencyGraph.cyclic_components).toEqual([[0, 1, 2]]);
    expect(audit.dependencyGraph.candidate_order).toBeNull();
    expect(audit.merge_authorized).toBe(false);
  });
});
