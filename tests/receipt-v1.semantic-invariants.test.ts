import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

// T009 executable design oracle only. T025 adds the production validator.
const schemaUrl = new URL(
  "../specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json",
  import.meta.url,
);
const schema = JSON.parse(readFileSync(fileURLToPath(schemaUrl), "utf8")) as Record<string, any>;
const gitObjectId = new RegExp(schema.$defs.gitObjectId.pattern as string);
const canonicalPath = new RegExp(schema.$defs.canonicalRelativePath.pattern as string);

type Status = "PASS" | "FAIL" | "FLAKY" | "BLOCKED" | "ERROR" | "NOT_APPLICABLE" | "NOT_RUN";
type Admission = "normal" | "refused_changed_surface" | "explicit_changed_surface_override";
type Completeness = "complete" | "materially_incomplete" | "unknown_due_to_error";

function gitBindingValid(head: string, base: string): boolean {
  return gitObjectId.test(head) && gitObjectId.test(base) && head === base;
}

function countChangedLines(
  ranges: ReadonlyArray<readonly [number, number]>,
  arithmetic: (ranges: ReadonlyArray<readonly [number, number]>) => number,
): number {
  if (ranges.some(([start, end]) => start > end)) throw new Error("inverted_range");
  return arithmetic(ranges);
}

function acceptPath<T>(candidate: string, afterRawGuard: (value: string) => T): T {
  if (!canonicalPath.test(candidate)) throw new Error("noncanonical_original_path");
  return afterRawGuard(candidate);
}

interface Graph {
  runId: string;
  tasks: Array<{ id: string; evidence: string[]; artifacts: string[] }>;
  findings: Array<{ task: string; evidence: string[] }>;
  evidence: Array<{ id: string; run: string; task: string; artifact: string | null }>;
  artifacts: Array<{ id: string }>;
}

function refsValid(g: Graph): boolean {
  const unique = (values: string[]) => new Set(values).size === values.length;
  const taskIds = g.tasks.map((x) => x.id);
  const evidenceIds = g.evidence.map((x) => x.id);
  const artifactIds = g.artifacts.map((x) => x.id);
  if (!unique(taskIds) || !unique(evidenceIds) || !unique(artifactIds)) return false;
  const tasks = new Set(taskIds);
  const artifacts = new Set(artifactIds);
  const evidence = new Map(g.evidence.map((x) => [x.id, x]));
  if (g.evidence.some((x) => x.run !== g.runId || !tasks.has(x.task) || (x.artifact !== null && !artifacts.has(x.artifact)))) return false;
  for (const task of g.tasks) {
    if (task.artifacts.some((id) => !artifacts.has(id))) return false;
    if (task.evidence.some((id) => evidence.get(id)?.task !== task.id || evidence.get(id)?.run !== g.runId)) return false;
  }
  for (const finding of g.findings) {
    if (!tasks.has(finding.task)) return false;
    if (finding.evidence.some((id) => evidence.get(id)?.task !== finding.task || evidence.get(id)?.run !== g.runId)) return false;
  }
  return true;
}

function admissionValid(input: {
  changed: boolean;
  paths: string[];
  admission: Admission;
  status: Status;
  reason: string | null;
}): boolean {
  if (!input.changed) return input.admission === "normal" && input.paths.length === 0;
  if (input.paths.length === 0 || input.admission === "normal") return false;
  if (input.admission === "refused_changed_surface") {
    return input.status === "NOT_RUN" && input.reason === "command_surface_changed";
  }
  return input.admission === "explicit_changed_surface_override";
}

interface ExerciseRecord {
  path: string;
  state: "EXERCISED" | "NOT_EXERCISED" | "UNRESOLVED";
  count: number | null;
  reason?: string;
}

function exerciseValid(r: ExerciseRecord): boolean {
  if (r.state === "EXERCISED") return Number.isInteger(r.count) && (r.count ?? 0) > 0;
  if (r.state === "NOT_EXERCISED") return r.count === 0;
  return r.count === null && typeof r.reason === "string" && r.reason.length > 0;
}

function exerciseSummary(records: ExerciseRecord[]) {
  const paths = new Map<string, ExerciseRecord[]>();
  for (const record of records) paths.set(record.path, [...(paths.get(record.path) ?? []), record]);
  return {
    changed_executable_lines: records.length,
    exercised_lines: records.filter((r) => r.state === "EXERCISED").length,
    not_exercised_lines: records.filter((r) => r.state === "NOT_EXERCISED").length,
    unresolved_lines: records.filter((r) => r.state === "UNRESOLVED").length,
    changed_files_with_zero_exercised_lines: [...paths.values()].filter((rs) => !rs.some((r) => r.state === "EXERCISED")).length,
  };
}

function stability(start: string, end: string | null, comparisonValid: boolean) {
  if (!comparisonValid || end === null) return "unknown" as const;
  return start === end ? ("stable" as const) : ("tree_drifted" as const);
}

function completeness(input: {
  tasks: Array<{ applicable: boolean; status: Status }>;
  selectionSafe: boolean;
  exerciseGap: boolean;
  integrityError: boolean;
}): Completeness {
  if (input.integrityError || input.tasks.some((t) => t.status === "ERROR")) return "unknown_due_to_error";
  const applicable = input.tasks.filter((t) => t.applicable);
  if (!applicable.some((t) => ["PASS", "FAIL", "FLAKY"].includes(t.status))) return "materially_incomplete";
  if (applicable.some((t) => ["NOT_RUN", "BLOCKED"].includes(t.status))) return "materially_incomplete";
  if (!input.selectionSafe || input.exerciseGap) return "materially_incomplete";
  return "complete";
}

function statusCounts(statuses: Status[]): Record<Status, number> {
  const out: Record<Status, number> = { PASS: 0, FAIL: 0, FLAKY: 0, BLOCKED: 0, ERROR: 0, NOT_APPLICABLE: 0, NOT_RUN: 0 };
  for (const status of statuses) out[status] += 1;
  return out;
}

function aggregatesValid(
  statuses: Status[],
  findingCount: number,
  summary: { task_status_counts: Record<Status, number>; finding_count: number },
): boolean {
  const expected = statusCounts(statuses);
  return (Object.keys(expected) as Status[]).every((status) => summary.task_status_counts[status] === expected[status])
    && summary.finding_count === findingCount;
}

function exitCode(error: boolean, drift: boolean, findingOrFlake: boolean, complete: boolean): 0 | 1 | 2 | 3 | 4 {
  if (error) return 2;
  if (drift) return 3;
  if (findingOrFlake) return 1;
  if (!complete) return 4;
  return 0;
}

function validGraph(): Graph {
  return {
    runId: "r1",
    tasks: [
      { id: "lint", evidence: ["e1"], artifacts: ["a1"] },
      { id: "test", evidence: ["e2"], artifacts: [] },
    ],
    findings: [{ task: "lint", evidence: ["e1"] }],
    evidence: [
      { id: "e1", run: "r1", task: "lint", artifact: "a1" },
      { id: "e2", run: "r1", task: "test", artifact: null },
    ],
    artifacts: [{ id: "a1" }],
  };
}

describe("T009 receipt v1 semantic invariants", () => {
  it("requires full exact source/comparison Git identity", () => {
    const sha1 = "a".repeat(40);
    const sha256 = "b".repeat(64);
    expect(gitBindingValid(sha1, sha1)).toBe(true);
    expect(gitBindingValid(sha256, sha256)).toBe(true);
    const invalid: Array<[string, string]> = [
      ["a".repeat(12), "a".repeat(12)], ["a".repeat(39), "a".repeat(39)],
      ["HEAD", "HEAD"], ["main", "main"], ["A".repeat(40), "A".repeat(40)],
      ["a".repeat(40), "b".repeat(40)], ["a".repeat(64), "b".repeat(64)],
    ];
    for (const [head, base] of invalid) expect(gitBindingValid(head, base)).toBe(false);
  });

  it("rejects inverted changed-line ranges before arithmetic", () => {
    const arithmetic = vi.fn((ranges: ReadonlyArray<readonly [number, number]>) =>
      ranges.reduce((n, [start, end]) => n + end - start + 1, 0),
    );
    expect(() => countChangedLines([[10, 1]], arithmetic)).toThrow("inverted_range");
    expect(arithmetic).not.toHaveBeenCalled();
    expect(countChangedLines([[1, 1], [10, 12]], arithmetic)).toBe(4);
  });

  it("rejects original path spellings before any lossy repair", () => {
    const invalid: Array<[string, string]> = [
      ["/src/a.ts", "src/a.ts"], ["C:/repo/src/a.ts", "repo/src/a.ts"],
      ["\\\\server\\share\\a.ts", "server/share/a.ts"], ["file:///src/a.ts", "src/a.ts"],
      ["src\\a.ts", "src/a.ts"], ["./src/a.ts", "src/a.ts"], ["src/../a.ts", "a.ts"],
      ["src//a.ts", "src/a.ts"], ["src/", "src"],
    ];
    for (const [original, repaired] of invalid) {
      const afterGuard = vi.fn((value: string) => value);
      expect(() => acceptPath(original, afterGuard)).toThrow("noncanonical_original_path");
      expect(afterGuard).not.toHaveBeenCalled();
      expect(canonicalPath.test(repaired)).toBe(true);
    }
  });

  it("requires unique/resolvable current-run task/evidence/artifact references", () => {
    expect(refsValid(validGraph())).toBe(true);
    const mutations: Array<(g: Graph) => void> = [
      (g) => g.tasks.push({ ...g.tasks[0]!, evidence: [...g.tasks[0]!.evidence], artifacts: [...g.tasks[0]!.artifacts] }),
      (g) => g.evidence.push({ ...g.evidence[0]! }),
      (g) => g.artifacts.push({ ...g.artifacts[0]! }),
      (g) => { g.evidence[0]!.run = "r2"; },
      (g) => { g.evidence[0]!.task = "missing"; },
      (g) => { g.evidence[0]!.artifact = "missing"; },
      (g) => { g.tasks[0]!.evidence = ["missing"]; },
      (g) => { g.tasks[0]!.evidence = ["e2"]; },
      (g) => { g.tasks[0]!.artifacts = ["missing"]; },
      (g) => { g.findings[0]!.task = "missing"; },
      (g) => { g.findings[0]!.evidence = ["missing"]; },
      (g) => { g.findings[0]!.evidence = ["e2"]; },
    ];
    for (const mutate of mutations) {
      const graph = structuredClone(validGraph());
      mutate(graph);
      expect(refsValid(graph)).toBe(false);
    }
  });

  it("enforces admission and exercise invariants", () => {
    expect(admissionValid({ changed: false, paths: [], admission: "normal", status: "PASS", reason: null })).toBe(true);
    expect(admissionValid({ changed: true, paths: ["package.json"], admission: "refused_changed_surface", status: "NOT_RUN", reason: "command_surface_changed" })).toBe(true);
    expect(admissionValid({ changed: true, paths: ["package.json"], admission: "explicit_changed_surface_override", status: "PASS", reason: null })).toBe(true);
    expect(admissionValid({ changed: true, paths: [], admission: "explicit_changed_surface_override", status: "PASS", reason: null })).toBe(false);
    expect(admissionValid({ changed: true, paths: ["package.json"], admission: "normal", status: "PASS", reason: null })).toBe(false);
    expect(admissionValid({ changed: true, paths: ["package.json"], admission: "refused_changed_surface", status: "PASS", reason: "command_surface_changed" })).toBe(false);

    expect(exerciseValid({ path: "src/a.ts", state: "EXERCISED", count: 1 })).toBe(true);
    expect(exerciseValid({ path: "src/a.ts", state: "NOT_EXERCISED", count: 0 })).toBe(true);
    expect(exerciseValid({ path: "src/b.ts", state: "UNRESOLVED", count: null, reason: "no source map" })).toBe(true);
    expect(exerciseValid({ path: "src/a.ts", state: "EXERCISED", count: 0 })).toBe(false);
    expect(exerciseValid({ path: "src/b.ts", state: "UNRESOLVED", count: null })).toBe(false);
    expect(exerciseSummary([
      { path: "src/a.ts", state: "EXERCISED", count: 2 },
      { path: "src/a.ts", state: "NOT_EXERCISED", count: 0 },
      { path: "src/b.ts", state: "UNRESOLVED", count: null, reason: "no source map" },
    ])).toEqual({ changed_executable_lines: 3, exercised_lines: 1, not_exercised_lines: 1, unresolved_lines: 1, changed_files_with_zero_exercised_lines: 1 });
  });

  it("binds source stability and completeness", () => {
    const a = "a".repeat(64); const b = "b".repeat(64);
    expect(stability(a, a, true)).toBe("stable");
    expect(stability(a, b, true)).toBe("tree_drifted");
    expect(stability(a, null, false)).toBe("unknown");
    expect(stability(a, a, false)).toBe("unknown");

    expect(completeness({ tasks: [{ applicable: true, status: "PASS" }], selectionSafe: true, exerciseGap: false, integrityError: false })).toBe("complete");
    expect(completeness({ tasks: [{ applicable: true, status: "FAIL" }], selectionSafe: true, exerciseGap: false, integrityError: false })).toBe("complete");
    expect(completeness({ tasks: [{ applicable: true, status: "FLAKY" }], selectionSafe: true, exerciseGap: false, integrityError: false })).toBe("complete");
    expect(completeness({ tasks: [{ applicable: true, status: "NOT_RUN" }], selectionSafe: true, exerciseGap: false, integrityError: false })).toBe("materially_incomplete");
    expect(completeness({ tasks: [{ applicable: true, status: "BLOCKED" }], selectionSafe: true, exerciseGap: false, integrityError: false })).toBe("materially_incomplete");
    expect(completeness({ tasks: [{ applicable: true, status: "PASS" }], selectionSafe: false, exerciseGap: false, integrityError: false })).toBe("materially_incomplete");
    expect(completeness({ tasks: [{ applicable: true, status: "PASS" }], selectionSafe: true, exerciseGap: true, integrityError: false })).toBe("materially_incomplete");
    expect(completeness({ tasks: [{ applicable: true, status: "ERROR" }], selectionSafe: true, exerciseGap: false, integrityError: false })).toBe("unknown_due_to_error");
  });

  it("requires exact aggregates and exit precedence 2 > 3 > 1 > 4 > 0", () => {
    const statuses: Status[] = ["PASS", "PASS", "FAIL", "FLAKY", "BLOCKED", "ERROR", "NOT_APPLICABLE", "NOT_RUN"];
    const counts = statusCounts(statuses);
    expect(counts).toEqual({
      PASS: 2, FAIL: 1, FLAKY: 1, BLOCKED: 1, ERROR: 1, NOT_APPLICABLE: 1, NOT_RUN: 1,
    });
    expect(aggregatesValid(statuses, 2, { task_status_counts: counts, finding_count: 2 })).toBe(true);
    expect(aggregatesValid(statuses, 2, { task_status_counts: { ...counts, PASS: 1 }, finding_count: 2 })).toBe(false);
    expect(aggregatesValid(statuses, 2, { task_status_counts: counts, finding_count: 1 })).toBe(false);
    expect(exitCode(true, true, true, false)).toBe(2);
    expect(exitCode(false, true, true, false)).toBe(3);
    expect(exitCode(false, false, true, false)).toBe(1);
    expect(exitCode(false, false, false, false)).toBe(4);
    expect(exitCode(false, false, false, true)).toBe(0);
  });
});
