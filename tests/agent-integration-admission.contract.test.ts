import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseCliArgs } from "../src/cli.js";

const ADMISSION_FLAG = "--allow-changed-command-surface";
const FIXTURE_PATH = fileURLToPath(
  new URL("./fixtures/agent-integration/cases.json", import.meta.url),
);

type IntegrationKind = "instruction" | "hook";

interface AgentIntegrationCase {
  readonly id: string;
  readonly kind: IntegrationKind;
  readonly instruction: string;
  readonly argv: readonly string[];
}

interface AgentIntegrationFixture {
  readonly schema_version: 1;
  readonly cases: readonly AgentIntegrationCase[];
}

function loadFixture(): AgentIntegrationFixture {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as AgentIntegrationFixture;
}

function assertGeneratedIntegrationDoesNotEscalate(
  candidate: AgentIntegrationCase,
): void {
  expect(candidate.argv[0]).toBe("ascout");
  expect(candidate.argv).not.toContain(ADMISSION_FLAG);
  expect(candidate.instruction).not.toContain(ADMISSION_FLAG);

  const invocation = parseCliArgs(candidate.argv.slice(1));
  expect(invocation).toEqual({
    command: "check",
    allowChangedCommandSurface: false,
  });
}

describe("T030 agent integration admission boundary", () => {
  it("keeps every generated instruction and hook on ordinary admission", () => {
    const fixture = loadFixture();

    expect(fixture.schema_version).toBe(1);
    expect(fixture.cases.map((candidate) => candidate.kind).sort()).toEqual([
      "hook",
      "instruction",
    ]);

    for (const candidate of fixture.cases) {
      assertGeneratedIntegrationDoesNotEscalate(candidate);
    }
  });

  it("rejects an integration candidate that auto-appends the admission override", () => {
    const [ordinary] = loadFixture().cases;
    expect(ordinary).toBeDefined();

    const escalated: AgentIntegrationCase = {
      ...ordinary!,
      id: `${ordinary!.id}-auto-escalated`,
      argv: [...ordinary!.argv, ADMISSION_FLAG],
    };

    expect(() => assertGeneratedIntegrationDoesNotEscalate(escalated)).toThrow();

    expect(parseCliArgs(escalated.argv.slice(1))).toEqual({
      command: "check",
      allowChangedCommandSurface: true,
    });
  });
});
