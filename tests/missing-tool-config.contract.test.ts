import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { TaskResultV1, TaskType } from "../src/receipt/model.js";

type BlockerKind = "missing_tool" | "missing_config";

type MissingTaskDecision = Pick<
  TaskResultV1,
  | "task_type"
  | "argv"
  | "tool_name"
  | "tool_version"
  | "status"
  | "reason_code"
  | "reason_text"
  | "exit_code"
  | "started_at"
  | "finished_at"
  | "duration_ms"
  | "observations"
> & {
  readonly launch_allowed: false;
  readonly install_allowed: false;
};

interface CapabilityState {
  readonly tool_name: string;
  readonly tool_present: boolean;
  readonly required_config_path: string | null;
}

interface MissingCapabilityFixtureCase {
  readonly id: string;
  readonly purpose: string;
  readonly task_type: TaskType;
  readonly files: Readonly<Record<string, string>>;
  readonly capability: CapabilityState;
  readonly blocker: {
    readonly kind: BlockerKind;
    readonly message: string;
  };
  readonly expected: {
    readonly status: "NOT_RUN";
    readonly reason_code: "tool_missing" | "config_missing";
    readonly reason_text: string;
  };
}

interface MissingCapabilityFixtureCatalog {
  readonly version: 1;
  readonly cases: readonly MissingCapabilityFixtureCase[];
}

interface SideEffectProbes {
  launchProcess(argv: readonly string[]): void;
  installDependency(toolName: string): void;
}

const FIXTURE_CATALOG_URL = new URL("./fixtures/missing-capability/cases.json", import.meta.url);

function loadCatalog(): MissingCapabilityFixtureCatalog {
  return JSON.parse(readFileSync(FIXTURE_CATALOG_URL, "utf8")) as MissingCapabilityFixtureCatalog;
}

function expectedReasonCode(kind: BlockerKind): "tool_missing" | "config_missing" {
  return kind === "missing_tool" ? "tool_missing" : "config_missing";
}

function resolveUnavailableTask(
  fixture: MissingCapabilityFixtureCase,
  probes: SideEffectProbes,
): MissingTaskDecision {
  const configMissing =
    fixture.capability.required_config_path !== null
    && !(fixture.capability.required_config_path in fixture.files);

  const blockerIsReal = fixture.blocker.kind === "missing_tool"
    ? !fixture.capability.tool_present
    : configMissing;

  if (!blockerIsReal) {
    const inventedArgv = [fixture.capability.tool_name];
    probes.launchProcess(inventedArgv);
    probes.installDependency(fixture.capability.tool_name);
    throw new Error("fixture does not describe a real missing capability");
  }

  return {
    task_type: fixture.task_type,
    argv: [],
    tool_name: null,
    tool_version: null,
    status: "NOT_RUN",
    reason_code: expectedReasonCode(fixture.blocker.kind),
    reason_text: fixture.blocker.message,
    exit_code: null,
    started_at: null,
    finished_at: null,
    duration_ms: null,
    observations: { runs: 0, failures: 0 },
    launch_allowed: false,
    install_allowed: false,
  };
}

function assertHonestNotRun(decision: MissingTaskDecision): void {
  expect(decision.status).toBe("NOT_RUN");
  expect(decision.reason_code).toEqual(expect.any(String));
  expect(decision.reason_code?.length).toBeGreaterThan(0);
  expect(decision.reason_text).toEqual(expect.any(String));
  expect(decision.reason_text?.length).toBeGreaterThan(0);
  expect(decision.argv).toEqual([]);
  expect(decision.tool_name).toBeNull();
  expect(decision.tool_version).toBeNull();
  expect(decision.exit_code).toBeNull();
  expect(decision.started_at).toBeNull();
  expect(decision.finished_at).toBeNull();
  expect(decision.duration_ms).toBeNull();
  expect(decision.observations).toEqual({ runs: 0, failures: 0 });
  expect(decision.launch_allowed).toBe(false);
  expect(decision.install_allowed).toBe(false);
}

describe("T031 missing tool/config contract", () => {
  it("uses a versioned non-vacuous fixture corpus for both missing-tool and missing-config blockers", () => {
    const catalog = loadCatalog();
    expect(catalog.version).toBe(1);
    expect(catalog.cases.length).toBeGreaterThan(0);

    const ids = catalog.cases.map((fixture) => fixture.id);
    expect(new Set(ids).size).toBe(ids.length);

    const observedKinds = new Set<BlockerKind>();
    for (const fixture of catalog.cases) {
      expect(fixture.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(fixture.purpose.length).toBeGreaterThan(0);
      expect(Object.keys(fixture.files).length).toBeGreaterThan(0);
      expect(fixture.blocker.message.length).toBeGreaterThan(0);
      expect(fixture.expected.reason_text.length).toBeGreaterThan(0);
      expect(fixture.expected.reason_code).toBe(expectedReasonCode(fixture.blocker.kind));
      expect(fixture.expected.reason_text).toBe(fixture.blocker.message);
      observedKinds.add(fixture.blocker.kind);

      if (fixture.blocker.kind === "missing_tool") {
        expect(fixture.capability.tool_present).toBe(false);
      } else {
        expect(fixture.capability.tool_present).toBe(true);
        expect(fixture.capability.required_config_path).not.toBeNull();
        expect(fixture.files[fixture.capability.required_config_path!]).toBeUndefined();
      }
    }

    expect(observedKinds).toEqual(new Set<BlockerKind>(["missing_tool", "missing_config"]));
  });

  it("returns honest NOT_RUN before any launch or implicit install side effect", () => {
    const catalog = loadCatalog();

    for (const fixture of catalog.cases) {
      let launchCalls = 0;
      let installCalls = 0;
      const probes: SideEffectProbes = {
        launchProcess: () => {
          launchCalls += 1;
          throw new Error("process launch must not occur for a missing capability");
        },
        installDependency: () => {
          installCalls += 1;
          throw new Error("implicit dependency installation must never occur");
        },
      };

      const decision = resolveUnavailableTask(fixture, probes);
      assertHonestNotRun(decision);
      expect(decision).toMatchObject(fixture.expected);
      expect(launchCalls).toBe(0);
      expect(installCalls).toBe(0);
    }
  });

  it("rejects invented argv/tool identity or empty refusal reasons", () => {
    const fixture = loadCatalog().cases[0];
    expect(fixture).toBeDefined();

    const decision = resolveUnavailableTask(fixture!, {
      launchProcess: () => {
        throw new Error("unexpected launch");
      },
      installDependency: () => {
        throw new Error("unexpected install");
      },
    });

    expect(() => assertHonestNotRun({
      ...decision,
      argv: ["npx", fixture!.capability.tool_name],
      tool_name: fixture!.capability.tool_name,
    })).toThrow();

    expect(() => assertHonestNotRun({
      ...decision,
      reason_code: "",
      reason_text: "",
    })).toThrow();
  });
});
