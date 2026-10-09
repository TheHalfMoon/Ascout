/**
 * FD8 planning document dependency graph.
 *
 * This is a pure, non-authorizing graph computation. It does not implement
 * FD8, resolve Markdown links, review code, or grant a merge decision.
 */
export function analyzeFd8GroupGraph(groupCount, crossGroupEdges) {
  if (!Number.isSafeInteger(groupCount) || groupCount < 2 || groupCount > 64 ||
      !(crossGroupEdges instanceof Set) || crossGroupEdges.size > 4096) {
    throw new TypeError("invalid FD8 group graph boundary");
  }
  const adj = Array.from({ length: groupCount }, () => new Set());
  for (const edge of crossGroupEdges) {
    if (typeof edge !== "string" || !/^(0|[1-9][0-9]*)>(0|[1-9][0-9]*)$/u.test(edge)) {
      throw new TypeError("invalid FD8 dependency edge");
    }
    const [from, to] = edge.split(">").map(Number);
    if (from === to || from >= groupCount || to >= groupCount) {
      throw new TypeError("FD8 dependency is outside the declared groups");
    }
    adj[from].add(to);
  }
  const neighbors = adj.map(set => [...set].sort((a, b) => a - b));

  // Tarjan's SCC algorithm detects long cycles, not just reciprocal pairs.
  let serial = 0;
  const discovered = Array(groupCount).fill(-1);
  const low = Array(groupCount).fill(-1);
  const stack = [];
  const onStack = new Set();
  const components = [];
  function visit(v) {
    discovered[v] = low[v] = serial++;
    stack.push(v);
    onStack.add(v);
    for (const w of neighbors[v]) {
      if (discovered[w] === -1) {
        visit(w);
        low[v] = Math.min(low[v], low[w]);
      } else if (onStack.has(w)) {
        low[v] = Math.min(low[v], discovered[w]);
      }
    }
    if (low[v] !== discovered[v]) return;
    const component = [];
    let next;
    do {
      next = stack.pop();
      onStack.delete(next);
      component.push(next);
    } while (next !== v);
    components.push(component.sort((a, b) => a - b));
  }
  for (let v = 0; v < groupCount; v++) {
    if (discovered[v] === -1) visit(v);
  }
  const cyclicComponents = components.filter(c => c.length > 1)
    .sort((a, b) => a[0] - b[0]);
  if (cyclicComponents.length) {
    return Object.freeze({
      has_cycle: true,
      cyclic_components: cyclicComponents.map(c => Object.freeze(c)),
      candidate_order: null,
      merge_authorized: false,
    });
  }

  // A→B means A contains a reference to B; for link-safe introduction,
  // B must be introduced before A. Take dependency-first deterministic order.
  const indegree = Array(groupCount).fill(0);
  for (let from = 0; from < groupCount; from++) {
    for (const to of neighbors[from]) indegree[from]++;
  }
  const pending = [];
  for (let i = 0; i < groupCount; i++) if (indegree[i] === 0) pending.push(i);
  const candidate = [];
  while (pending.length) {
    pending.sort((a, b) => a - b);
    const completed = pending.shift();
    candidate.push(completed);
    for (let dependent = 0; dependent < groupCount; dependent++) {
      if (adj[dependent].has(completed)) {
        indegree[dependent]--;
        if (indegree[dependent] === 0) pending.push(dependent);
      }
    }
  }
  if (candidate.length !== groupCount) {
    throw new Error("FD8 graph inconsistent: unresolved dependency without SCC");
  }
  return Object.freeze({
    has_cycle: false,
    cyclic_components: Object.freeze([]),
    candidate_order: Object.freeze(candidate),
    merge_authorized: false,
  });
}
