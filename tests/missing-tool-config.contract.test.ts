import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  discoverProjectFromFiles,
  type LocalNodeToolDiscovery,
  type ProjectDiscovery,
} from "../src/discovery.js";
import type { TaskResultV1, TaskType } from "../src/receipt/model.js";

type BlockerKind = "missing_tool" | "missing_config";

interface CapabilityState {
  readonly tool_name: string;
  readonly local_executable_path: string | null;
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
    readonly reason_code: string;
    readonly reason_text: string;
  };
}

interface MissingCapabilityFixtureCatalog {
  readonly version: 1;
  readonly production_binding: {
    readonly state: "active";
    readonly task: "T034";
    readonly entry_point: "src/discovery.ts";
  };
  readonly cases: readonly MissingCapabilityFixtureCase[];
}

interface LaunchProbe {
  launchProcess(argv: readonly string[]): void;
}

const FIXTURE_CATALOG_URL = new URL("./fixtures/missing-capability/cases.json", import.meta.url);
const RECEIPT_SCHEMA_URL = new URL(
  "../specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json",
  import.meta.url,
);
const PRODUCTION_ENTRY_URL = new URL("../src/discovery.ts", import.meta.url);
const SUPPORTED_TASK_TYPES = ["typecheck", "lint", "test", "pytestBasic"] as const;
const SUPPORTED_BLOCKER_KINDS = ["missing_tool", "missing_config"] as const;
const TASK_SCRIPT_NAME: Readonly<Partial<Record<TaskType, string>>> = {
  typecheck: "typecheck",
  lint: "lint",
  test: "test",
};

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function nullableString(value: unknown, label: string): string | null {
  return value === null ? null : nonEmptyString(value, label);
}

function taskType(value: unknown, label: string): TaskType {
  const candidate = nonEmptyString(value, label);
  if (!SUPPORTED_TASK_TYPES.includes(candidate as TaskType)) {
    throw new Error(`${label} is not a supported task type`);
  }
  return candidate as TaskType;
}

function blockerKind(value: unknown, label: string): BlockerKind {
  const candidate = nonEmptyString(value, label);
  if (!SUPPORTED_BLOCKER_KINDS.includes(candidate as BlockerKind)) {
    throw new Error(`${label} is not a supported blocker kind`);
  }
  return candidate as BlockerKind;
}

function stringMap(value: unknown, label: string): Readonly<Record<string, string>> {
  const source = record(value, label);
  const result: Record<string, string> = {};
  for (const [path, content] of Object.entries(source)) {
    if (path.length === 0 || typeof content !== "string") {
      throw new Error(`${label} must map non-empty paths to string contents`);
    }
    result[path] = content;
  }
  return result;
}

function parseCatalog(value: unknown): MissingCapabilityFixtureCatalog {
  const root = record(value, "catalog");
  if (root.version !== 1) throw new Error("catalog.version must be 1");
  const productionBinding = record(root.production_binding, "catalog.production_binding");
  if (productionBinding.state !== "active") {
    throw new Error("catalog.production_binding.state must be active");
  }
  if (productionBinding.task !== "T034") {
    throw new Error("catalog.production_binding.task must be T034");
  }
  if (productionBinding.entry_point !== "src/discovery.ts") {
    throw new Error("catalog.production_binding.entry_point must be src/discovery.ts");
  }
  if (!Array.isArray(root.cases)) throw new Error("catalog.cases must be an array");

  const cases = root.cases.map((rawCase, index): MissingCapabilityFixtureCase => {
    const base = `catalog.cases[${index}]`;
    const candidate = record(rawCase, base);
    const capability = record(candidate.capability, `${base}.capability`);
    const blocker = record(candidate.blocker, `${base}.blocker`);
    const expected = record(candidate.expected, `${base}.expected`);
    if (expected.status !== "NOT_RUN") throw new Error(`${base}.expected.status must be NOT_RUN`);

    return {
      id: nonEmptyString(candidate.id, `${base}.id`),
      purpose: nonEmptyString(candidate.purpose, `${base}.purpose`),
      task_type: taskType(candidate.task_type, `${base}.task_type`),
      files: stringMap(candidate.files, `${base}.files`),
      capability: {
        tool_name: nonEmptyString(capability.tool_name, `${base}.capability.tool_name`),
        local_executable_path: nullableString(
          capability.local_executable_path,
          `${base}.capability.local_executable_path`,
        ),
        required_config_path: nullableString(
          capability.required_config_path,
          `${base}.capability.required_config_path`,
        ),
      },
      blocker: {
        kind: blockerKind(blocker.kind, `${base}.blocker.kind`),
        message: nonEmptyString(blocker.message, `${base}.blocker.message`),
      },
      expected: {
        status: "NOT_RUN",
        reason_code: nonEmptyString(expected.reason_code, `${base}.expected.reason_code`),
        reason_text: nonEmptyString(expected.reason_text, `${base}.expected.reason_text`),
      },
    };
  });

  return {
    version: 1,
    production_binding: {
      state: "active",
      task: "T034",
      entry_point: "src/discovery.ts",
    },
    cases,
  };
}

function loadCatalog(): MissingCapabilityFixtureCatalog {
  return parseCatalog(JSON.parse(readFileSync(FIXTURE_CATALOG_URL, "utf8")) as unknown);
}

function loadReceiptTaskRequiredFields(): readonly string[] {
  const schema = JSON.parse(readFileSync(fileURLToPath(RECEIPT_SCHEMA_URL), "utf8")) as {
    readonly $defs?: {
      readonly task?: {
        readonly required?: readonly string[];
      };
    };
  };
  const required = schema.$defs?.task?.required;
  if (required === undefined) throw new Error("receipt task schema required fields are unavailable");
  return required;
}

function packageJson(fixture: MissingCapabilityFixtureCase): Record<string, unknown> {
  const raw = fixture.files["package.json"];
  if (raw === undefined) throw new Error(`fixture ${fixture.id} is missing package.json`);
  return JSON.parse(raw) as Record<string, unknown>;
}

function packageScript(fixture: MissingCapabilityFixtureCase): string | undefined {
  const scriptName = TASK_SCRIPT_NAME[fixture.task_type];
  if (scriptName === undefined) return undefined;
  const scripts = packageJson(fixture).scripts;
  if (typeof scripts !== "object" || scripts === null || Array.isArray(scripts)) return undefined;
  const value = (scripts as Record<string, unknown>)[scriptName];
  return typeof value === "string" ? value : undefined;
}

function hasAscoutOverride(fixture: MissingCapabilityFixtureCase): boolean {
  const raw = fixture.files["ascout.config.json"];
  if (raw === undefined) return false;
  const config = JSON.parse(raw) as {
    readonly tasks?: Readonly<Record<string, { readonly command?: readonly string[] }>>;
  };
  return config.tasks?.[fixture.task_type]?.command !== undefined;
}

function capabilityTool(
  fixture: MissingCapabilityFixtureCase,
  discovery: ProjectDiscovery,
): LocalNodeToolDiscovery {
  if (fixture.capability.tool_name === "tsc") return discovery.tools.typescript;
  if (fixture.capability.tool_name === "eslint") return discovery.tools.eslint;
  if (fixture.capability.tool_name === "vitest") return discovery.tools.vitest;
  if (fixture.capability.tool_name === "jest") return discovery.tools.jest;
  throw new Error(`unsupported fixture tool ${fixture.capability.tool_name}`);
}

function hasLocalExecutable(fixture: MissingCapabilityFixtureCase): boolean {
  const discovery = discoverProjectFromFiles(fixture.files);
  const tool = capabilityTool(fixture, discovery);
  const declaredPath = fixture.capability.local_executable_path;
  if (declaredPath === null) return tool.localExecutablePaths.length > 0;
  return tool.localExecutablePaths.includes(declaredPath);
}

function hasRequiredConfig(fixture: MissingCapabilityFixtureCase): boolean {
  const path = fixture.capability.required_config_path;
  if (path === null) return true;
  return capabilityTool(fixture, discoverProjectFromFiles(fixture.files)).configPaths.includes(path);
}

function deriveBlocker(fixture: MissingCapabilityFixtureCase): BlockerKind | null {
  if (!hasLocalExecutable(fixture)) return "missing_tool";
  if (!hasRequiredConfig(fixture)) return "missing_config";
  return null;
}

function missingTaskResult(fixture: MissingCapabilityFixtureCase): TaskResultV1 {
  return {
    task_id: fixture.id,
    task_type: fixture.task_type,
    authorized_by: "discovery",
    source_path: null,
    argv: [],
    argv_redacted: false,
    tool_name: null,
    tool_version: null,
    command_surface_changed: false,
    changed_authority_paths: [],
    execution_admission: "normal",
    status: "NOT_RUN",
    reason_code: fixture.expected.reason_code,
    reason_text: fixture.blocker.message,
    exit_code: null,
    started_at: null,
    finished_at: null,
    duration_ms: null,
    observations: { runs: 0, failures: 0 },
    cache_state: "not_applicable",
    evidence_ids: [],
    artifact_refs: [],
    output_truncated: false,
  };
}

function modelMissingCapabilityContract(
  fixture: MissingCapabilityFixtureCase,
  probe: LaunchProbe,
): TaskResultV1 {
  const blocker = deriveBlocker(fixture);
  if (blocker === null) {
    probe.launchProcess([fixture.capability.local_executable_path!]);
    throw new Error("fixture is runnable and does not belong in the missing-capability corpus");
  }
  if (blocker !== fixture.blocker.kind) {
    throw new Error(`fixture blocker mismatch: derived ${blocker}, declared ${fixture.blocker.kind}`);
  }
  return missingTaskResult(fixture);
}

function assertHonestNotRun(task: TaskResultV1): void {
  expect(task.status).toBe("NOT_RUN");
  expect(task.reason_code).toEqual(expect.any(String));
  expect(task.reason_code?.length).toBeGreaterThan(0);
  expect(task.reason_text).toEqual(expect.any(String));
  expect(task.reason_text?.length).toBeGreaterThan(0);
  expect(task.argv).toEqual([]);
  expect(task.tool_name).toBeNull();
  expect(task.tool_version).toBeNull();
  expect(task.exit_code).toBeNull();
  expect(task.started_at).toBeNull();
  expect(task.finished_at).toBeNull();
  expect(task.duration_ms).toBeNull();
  expect(task.observations).toEqual({ runs: 0, failures: 0 });
  expect(task.cache_state).toBe("not_applicable");
  expect(task.evidence_ids).toEqual([]);
  expect(task.artifact_refs).toEqual([]);
  expect(task.output_truncated).toBe(false);
}

describe("T031 missing tool/config contract after T034 production binding", () => {
  it("binds the corpus to the active T034 production discovery entry point", () => {
    const catalog = loadCatalog();
    expect(catalog.production_binding).toEqual({
      state: "active",
      task: "T034",
      entry_point: "src/discovery.ts",
    });
    expect(PRODUCTION_ENTRY_URL.pathname.endsWith("src/discovery.ts")).toBe(true);
    expect(existsSync(fileURLToPath(PRODUCTION_ENTRY_URL))).toBe(true);

    const discovery = discoverProjectFromFiles(catalog.cases[0]!.files);
    expect(discovery.semanticTasks).toEqual(["typecheck", "lint", "test", "pytestBasic"]);
  });

  it("uses production discovery facts for concrete missing-tool and missing-config evidence", () => {
    const catalog = loadCatalog();
    expect(catalog.version).toBe(1);
    expect(new Set(catalog.cases.map(({ id }) => id)).size).toBe(catalog.cases.length);

    const observedKinds = new Set<BlockerKind>();
    for (const fixture of catalog.cases) {
      expect(fixture.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(fixture.purpose.length).toBeGreaterThan(0);
      expect(hasAscoutOverride(fixture)).toBe(false);
      expect(packageScript(fixture)).toBeUndefined();
      expect(fixture.expected.reason_text).toBe(fixture.blocker.message);
      expect(deriveBlocker(fixture)).toBe(fixture.blocker.kind);
      observedKinds.add(fixture.blocker.kind);

      if (fixture.blocker.kind === "missing_tool") {
        expect(fixture.expected.reason_code).toBe("tool_missing");
        expect(hasLocalExecutable(fixture)).toBe(false);
        expect(hasRequiredConfig(fixture)).toBe(true);
      } else {
        expect(hasLocalExecutable(fixture)).toBe(true);
        expect(fixture.capability.required_config_path).not.toBeNull();
        expect(hasRequiredConfig(fixture)).toBe(false);
      }
    }

    expect(observedKinds).toEqual(new Set<BlockerKind>(["missing_tool", "missing_config"]));
  });

  it("rejects malformed fixture task, capability, or production-binding metadata", () => {
    const valid = JSON.parse(readFileSync(FIXTURE_CATALOG_URL, "utf8")) as {
      version: number;
      production_binding: Record<string, unknown>;
      cases: Array<Record<string, unknown>>;
    };
    const first = valid.cases[0]!;

    expect(() => parseCatalog({
      ...valid,
      production_binding: { ...valid.production_binding, state: "deferred" },
    })).toThrow("catalog.production_binding.state must be active");

    expect(() => parseCatalog({
      ...valid,
      production_binding: { ...valid.production_binding, task: "T035" },
    })).toThrow("catalog.production_binding.task must be T034");

    expect(() => parseCatalog({
      ...valid,
      cases: [{ ...first, task_type: "build" }],
    })).toThrow("is not a supported task type");

    expect(() => parseCatalog({
      ...valid,
      cases: [{
        ...first,
        capability: {
          ...(first.capability as Record<string, unknown>),
          tool_name: "",
        },
      }],
    })).toThrow("must be a non-empty string");
  });

  it("keeps honest NOT_RUN shape and never launches for a missing capability", () => {
    const requiredFields = [...loadReceiptTaskRequiredFields()].sort();

    for (const fixture of loadCatalog().cases) {
      let launchCalls = 0;
      const probe: LaunchProbe = {
        launchProcess: () => {
          launchCalls += 1;
          throw new Error("process launch must not occur for a missing capability");
        },
      };

      expect("installDependency" in probe).toBe(false);
      const task = modelMissingCapabilityContract(fixture, probe);
      assertHonestNotRun(task);
      expect(task).toMatchObject(fixture.expected);
      expect(Object.keys(task).sort()).toEqual(requiredFields);
      expect(launchCalls).toBe(0);
    }
  });

  it("keeps the launch probe live while exposing no implicit-install capability", () => {
    const fixture = loadCatalog().cases.find(({ blocker }) => blocker.kind === "missing_config")!;
    const configPath = fixture.capability.required_config_path!;
    const runnableControl: MissingCapabilityFixtureCase = {
      ...fixture,
      files: { ...fixture.files, [configPath]: "{}" },
    };
    expect(deriveBlocker(runnableControl)).toBeNull();

    let launchCalls = 0;
    const probe: LaunchProbe = {
      launchProcess: () => {
        launchCalls += 1;
        throw new Error("live launch probe reached");
      },
    };
    expect("installDependency" in probe).toBe(false);
    expect(() => modelMissingCapabilityContract(runnableControl, probe)).toThrow(
      "live launch probe reached",
    );
    expect(launchCalls).toBe(1);
  });

  it("rejects invented argv/tool identity or empty refusal reasons", () => {
    const fixture = loadCatalog().cases[0]!;
    const task = modelMissingCapabilityContract(fixture, {
      launchProcess: () => {
        throw new Error("unexpected launch");
      },
    });

    expect(() => assertHonestNotRun({
      ...task,
      argv: ["npx", fixture.capability.tool_name],
      tool_name: fixture.capability.tool_name,
    })).toThrow();

    expect(() => assertHonestNotRun({
      ...task,
      reason_code: "",
      reason_text: "",
    })).toThrow();
  });
});
