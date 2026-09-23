import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildEmptyReviewScopeV1,
  buildReviewAbsenceReportV1,
  buildReviewReportV1,
  defaultUnavailableExecutionV1,
  renderReviewJsonV1,
  renderReviewTerminalV1,
  type ReviewReportV1,
} from "../src/assurance/review/review-command.js";
import type { LocationValidationV1 } from "../src/assurance/review/location-validator.js";
import type { RawReviewObservationV1 } from "../src/assurance/review/raw-observation.js";
import { parseCliArgs, runCli, usageText } from "../src/cli.js";

const HEAD = "e".repeat(40);

function observation(id: string): RawReviewObservationV1 {
  return {
    schema_version: 1,
    authority: "NONE_UNTRUSTED",
    observation_id: id,
    producer_class: "MODEL",
    severity_hint: "major",
    category_hint: "correctness",
    body: "Unchecked return value.",
    location_hint: { path: "src/a.ts", start_line: 3, end_line: 5 },
    rule_id: null,
    confidence: 0.7,
    execution_binding: {
      engine_id: "engine:review-opencode-review",
      binary_name: "open-code-review",
      observed_version: "1.2.3",
      profile_id: "profile:t14",
      capsule_id: "capsule:t14",
      head_sha: HEAD,
    },
  };
}

function validation(id: string): LocationValidationV1 {
  return { schema_version: 1, observation_id: id, state: "VALID", reasons: [] };
}

function fullInput() {
  return {
    target_id: "target:t14",
    head_sha: HEAD,
    profile_id: "profile:t14",
    capsule_id: "capsule:t14",
    groups: [{ group_id: "group:src", files: ["src/a.ts", "src/b.ts"] }],
    reviewed_files: ["src/a.ts"],
    entries: [
      { observation: observation("observation:t14-1"), validation: validation("observation:t14-1") },
    ],
  };
}

const temporaryRoots: string[] = [];
const originalCwd = process.cwd();

function git(root: string, argv: readonly string[]): void {
  execFileSync("git", [...argv], { cwd: root, stdio: "ignore" });
}

function reviewFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-t14-review-"));
  temporaryRoots.push(root);
  writeFileSync(join(root, "a.txt"), "base\n");
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Ascout T14"]);
  git(root, ["config", "user.email", "t14@example.invalid"]);
  git(root, ["add", "a.txt"]);
  git(root, ["commit", "-qm", "baseline"]);
  writeFileSync(join(root, "a.txt"), "changed\n");
  return root;
}

afterEach(() => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("UA-P03-T14 review command library", () => {
  it("builds a full pipeline report with matching JSON and terminal semantics", () => {
    const report = buildReviewReportV1(fullInput());
    expect(report.kind).toBe("review");
    expect(report.counts.observations).toBe(1);
    expect(report.counts.promotable).toBe(1);
    expect(report.coverage.complete).toBe(false);

    const parsed = JSON.parse(renderReviewJsonV1(report)) as ReviewReportV1;
    expect(parsed).toEqual(JSON.parse(JSON.stringify(report)));

    const terminal = renderReviewTerminalV1(report);
    expect(terminal).toContain("target:t14");
    expect(terminal).toContain(HEAD);
    expect(terminal).toContain("promotable: 1");
    expect(terminal).toContain("unreviewed: src/b.ts");
  });

  it("renders absence and empty reports identically in both forms", () => {
    const absence = buildReviewAbsenceReportV1(
      "target:t14",
      HEAD,
      defaultUnavailableExecutionV1(HEAD, "profile:t14", "capsule:t14"),
      [{ group_id: "group:src", files: ["src/a.ts"] }],
    );
    expect(absence.kind).toBe("absence");
    const absenceJson = JSON.parse(renderReviewJsonV1(absence)) as AbsenceReviewReportV1Shape;
    expect(absenceJson.absence.outcome).toBe("NOT_RUN");
    const absenceTerminal = renderReviewTerminalV1(absence);
    expect(absenceTerminal).toContain("outcome: NOT_RUN");
    for (const reason of absence.absence.reasons) {
      expect(absenceTerminal).toContain(reason);
    }

    const empty = buildEmptyReviewScopeV1("target:t14", HEAD);
    expect(JSON.parse(renderReviewJsonV1(empty))).toMatchObject({
      kind: "empty",
      outcome: "NOT_RUN",
    });
    expect(renderReviewTerminalV1(empty)).toContain("outcome: NOT_RUN");
  });

  it("rejects malformed report input without producing output", () => {
    expect(() =>
      buildReviewReportV1({ ...fullInput(), head_sha: "bad" }),
    ).toThrow(/head sha invalid/u);
  });
});

interface AbsenceReviewReportV1Shape {
  readonly absence: { readonly outcome: string };
}

describe("UA-P03-T14 review CLI", () => {
  it("reports scope absence read-only with terminal and JSON parity", async () => {
    const root = reviewFixture();
    const before = readFileSync(join(root, "a.txt"), "utf8");
    process.chdir(root);

    const terminalError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const exitTerminal = await runCli(["review"]);
    expect(exitTerminal).toBe(0);
    const terminalOutput = terminalError.mock.calls
      .map((call) => String(call[0]))
      .join("\n");
    expect(terminalOutput).toContain("NOT_RUN");
    expect(terminalOutput).toContain("a.txt");

    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    terminalError.mockClear();
    const exitJson = await runCli(["review", "--format", "json"]);
    expect(exitJson).toBe(0);
    const jsonText = stdout.mock.calls
      .map((call) => String(call[0]))
      .join("");
    const parsed = JSON.parse(jsonText) as {
      readonly kind: string;
      readonly outcome?: string;
      readonly absence?: { readonly outcome: string };
      readonly reasons?: readonly string[];
    };
    expect(parsed.kind).toBe("absence");
    expect(parsed.absence?.outcome ?? parsed.outcome).toBe("NOT_RUN");
    expect(jsonText).toContain("a.txt");

    expect(readFileSync(join(root, "a.txt"), "utf8")).toBe(before);
  }, 60_000);

  it("refuses write and publication flags with read-only reasons", async () => {
    const terminalError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    for (const flag of ["--publish", "--write", "--push"]) {
      terminalError.mockClear();
      const exit = await runCli(["review", flag]);
      expect(exit).toBe(2);
      expect(
        terminalError.mock.calls.map((call) => String(call[0])).join("\n"),
      ).toMatch(/read-only/u);
    }
  });

  it("parses review formats and leaves the check surface unchanged", () => {
    expect(parseCliArgs(["review"])).toEqual({
      command: "review",
      allowChangedCommandSurface: false,
    });
    expect(parseCliArgs(["review", "--format", "json"])).toEqual({
      command: "review",
      allowChangedCommandSurface: false,
      format: "json",
    });
    expect(() =>
      parseCliArgs(["review", "--format", "agent"]),
    ).toThrow(/Unsupported review format/u);
    expect(parseCliArgs(["check", "--format", "json"])).toEqual({
      command: "check",
      allowChangedCommandSurface: false,
      format: "json",
    });
    expect(usageText()).toContain("ascout review");
  });
});
