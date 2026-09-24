import { describe, expect, it } from "vitest";

import { adaptCheckTaskStatusV1 } from "../src/assurance/test/check-adapter.js";
import { projectTestCoverageV1 } from "../src/assurance/test/coverage-projection.js";

function selected(status: "PASS" | "FAIL" = "PASS", id = "task:selected-a") {
  return adaptCheckTaskStatusV1({
    task_id: id,
    status,
    reason_code: null,
    reason_text: null,
    profile: "STANDARD",
  });
}

describe("UA-P05-T03 unified test coverage projection", () => {
  it("keeps selection execution and changed exercise visible", () => {
    const projection = projectTestCoverageV1({
      profile: "STANDARD",
      selected: [selected("PASS", "task:a"), selected("FAIL", "task:b")],
      deselected: [
        {
          task_id: "task:c",
          reason_code: "reason:over-budget",
          reason_text: "excluded by budget",
        },
      ],
      changed_lines: [
        { line_id: "src/a.ts:1", state: "EXERCISED", reason: null },
        {
          line_id: "src/a.ts:2",
          state: "NOT_EXERCISED",
          reason: "no covering test selected",
        },
      ],
      unknown_limitations: [],
    });
    expect(projection.scope).toBe("TEST");
    expect(projection.selected_count).toBe(2);
    expect(projection.deselected_count).toBe(1);
    expect(projection.selected_task_ids).toEqual(["task:a", "task:b"]);
    expect(projection.exercised_count).toBe(1);
    expect(projection.not_exercised_count).toBe(1);
    expect(projection.unresolved_count).toBe(0);
  });

  it("never presents deselected tests as passed", () => {
    const projection = projectTestCoverageV1({
      profile: "QUICK",
      selected: [selected("PASS", "task:a")],
      deselected: [
        {
          task_id: "task:b",
          reason_code: "reason:unsupported-scope",
          reason_text: "unsupported scope",
        },
      ],
      changed_lines: [],
      unknown_limitations: ["selection provenance partial"],
    });
    expect(projection.selected_task_ids).not.toContain("task:b");
    expect(projection.deselected[0]?.task_id).toBe("task:b");
    expect(projection.unknown_limitations).toEqual([
      "selection provenance partial",
    ]);
  });

  it("requires reasons for not exercised and unresolved lines", () => {
    expect(() =>
      projectTestCoverageV1({
        profile: "DEEP",
        selected: [],
        deselected: [],
        changed_lines: [
          { line_id: "src/a.ts:1", state: "NOT_EXERCISED", reason: null },
        ],
        unknown_limitations: [],
      }),
    ).toThrow(TypeError);
    expect(() =>
      projectTestCoverageV1({
        profile: "DEEP",
        selected: [],
        deselected: [],
        changed_lines: [
          { line_id: "src/a.ts:1", state: "UNRESOLVED", reason: null },
        ],
        unknown_limitations: [],
      }),
    ).toThrow(TypeError);
  });

  it("rejects selected and deselected overlap", () => {
    expect(() =>
      projectTestCoverageV1({
        profile: "RELEASE",
        selected: [selected("PASS", "task:a")],
        deselected: [
          {
            task_id: "task:a",
            reason_code: "reason:conflict",
            reason_text: "overlap",
          },
        ],
        changed_lines: [],
        unknown_limitations: [],
      }),
    ).toThrow(TypeError);
  });

  it("is deterministic with canonical ordering", () => {
    const input = {
      profile: "STANDARD" as const,
      selected: [selected("PASS", "task:b"), selected("PASS", "task:a")],
      deselected: [],
      changed_lines: [],
      unknown_limitations: [],
    };
    expect(() => projectTestCoverageV1(input)).toThrow(TypeError);
    const first = projectTestCoverageV1({
      profile: "STANDARD",
      selected: [selected("PASS", "task:a")],
      deselected: [],
      changed_lines: [],
      unknown_limitations: [],
    });
    const second = projectTestCoverageV1({
      profile: "STANDARD",
      selected: [selected("PASS", "task:a")],
      deselected: [],
      changed_lines: [],
      unknown_limitations: [],
    });
    expect(second).toEqual(first);
  });
});
