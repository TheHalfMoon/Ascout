import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const control = vi.hoisted(() => ({
  mode: "success" as "success" | "integrity_failure" | "unexpected_failure",
  order: [] as string[],
  observed: null as unknown,
  runProcess: vi.fn(),
}));

vi.mock("../src/environment.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/environment.js")>();
  return {
    ...actual,
    observeEnvironment: (...args: Parameters<typeof actual.observeEnvironment>) => {
      control.order.push("environment");
      if (control.mode === "integrity_failure") {
        throw new actual.EnvironmentIdentityIntegrityError(
          "authority_contradiction",
          `environment identity failed beneath ${process.cwd()}`,
          "package.json",
        );
      }
      if (control.mode === "unexpected_failure") {
        throw new Error(`unexpected environment failure beneath ${process.cwd()}`);
      }
      const observed = actual.observeEnvironment(...args);
      control.observed = observed;
      return observed;
    },
  };
});

vi.mock("../src/process.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/process.js")>();
  return { ...actual, runProcess: control.runProcess };
});

import { runCheck } from "../src/check.js";
import { runCli } from "../src/cli.js";
import { renderReceiptAgent } from "../src/receipt/agent.js";
import {
  renderReceiptJson,
  validateReceiptJsonSchema,
} from "../src/receipt/json.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";

const roots: string[] = [];
const originalCwd = process.cwd();

function run(root: string, file: string, args: readonly string[]): void {
  execFileSync(file, [...args], { cwd: root, stdio: "ignore" });
}

function initializeFixture(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "ascout-t106-")));
  roots.push(root);
  writeFileSync(
    join(root, "package.json"),
    `${JSON.stringify({
      name: "t106-fixture",
      private: true,
      packageManager: "npm@10.0.0",
      scripts: { typecheck: "tsc --noEmit" },
    }, null, 2)}\n`,
  );
  writeFileSync(join(root, "package-lock.json"), '{"lockfileVersion":3}\n');
  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.email", "ascout@example.invalid"]);
  run(root, "git", ["config", "user.name", "Ascout T106"]);
  run(root, "git", ["add", "package.json", "package-lock.json"]);
  run(root, "git", ["commit", "-qm", "baseline"]);
  return root;
}

function emptyCapture() {
  return {
    bytes: Buffer.alloc(0),
    captured_bytes: 0,
    observed_bytes: 0,
    truncated: false,
  };
}

beforeEach(() => {
  control.mode = "success";
  control.order.length = 0;
  control.observed = null;
  control.runProcess.mockReset();
  control.runProcess.mockImplementation(async () => {
    control.order.push("task");
    return {
      outcome: "exited",
      exit_code: 0,
      signal: null,
      timed_out: false,
      cleanup_complete: true,
      termination_target: process.platform === "win32" ? "native_process_tree" : "process_group",
      stdout: emptyCapture(),
      stderr: emptyCapture(),
    };
  });
});

afterEach(() => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("T106 environment publication", () => {
  it("observes before the first project task and publishes the same environment object in a valid receipt", async () => {
    const root = initializeFixture();
    const outcome = await runCheck(root);

    expect(control.order[0]).toBe("environment");
    expect(control.order).toContain("task");
    expect(control.order.indexOf("environment")).toBeLessThan(control.order.indexOf("task"));
    expect(control.runProcess).toHaveBeenCalledTimes(1);
    expect(outcome.receipt.environment).toBe(control.observed);
    expect(outcome.receipt.environment).toMatchObject({
      runtime_name: "node",
      runtime_version: process.versions.node,
      platform: process.platform,
      architecture: process.arch,
      package_manager: "npm",
      package_manager_version: "10.0.0",
      package_manager_source: "package_json",
      lockfile_path: "package-lock.json",
      lockfile_sha256: createHash("sha256")
        .update(readFileSync(join(root, "package-lock.json")))
        .digest("hex"),
    });

    expect(validateReceiptSemantics(outcome.receipt)).toEqual({ valid: true, issues: [] });
    expect(validateReceiptJsonSchema(outcome.receipt)).toEqual({ valid: true, issues: [] });

    const renderedJson = renderReceiptJson(outcome.receipt);
    expect(JSON.parse(renderedJson).environment).toEqual(outcome.receipt.environment);
    expect(renderedJson).not.toContain("environment_error");
    expect(renderReceiptAgent(outcome.receipt).length).toBeGreaterThan(0);
    expect(outcome.terminalSummary.length).toBeGreaterThan(0);
  }, 15_000);

  it("maps only the typed environment integrity failure to exit 2 before project tasks and emits no receipt", async () => {
    const root = initializeFixture();
    process.chdir(root);
    const diagnosticPath = process.cwd();
    control.mode = "integrity_failure";
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await runCli(["check", "--format", "json"])).toBe(2);
    expect(control.order).toEqual(["environment"]);
    expect(control.runProcess).not.toHaveBeenCalled();
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledTimes(1);
    const diagnostic = String(stderr.mock.calls[0]![0]);
    expect(diagnostic).toContain("EnvironmentIdentityIntegrityError");
    expect(diagnostic).toContain("<repository>");
    expect(diagnostic).not.toContain(diagnosticPath);
  });

  it("preserves generic unexpected CLI exception behavior at exit 1", async () => {
    const root = initializeFixture();
    process.chdir(root);
    const diagnosticPath = process.cwd();
    control.mode = "unexpected_failure";
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await runCli(["check", "--format", "agent"])).toBe(1);
    expect(control.order).toEqual(["environment"]);
    expect(control.runProcess).not.toHaveBeenCalled();
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledTimes(1);
    const diagnostic = String(stderr.mock.calls[0]![0]);
    expect(diagnostic).toContain("<repository>");
    expect(diagnostic).not.toContain(diagnosticPath);
  });
});
