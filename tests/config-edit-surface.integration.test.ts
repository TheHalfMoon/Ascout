import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { decideRunAdmissions, runCheck } from "../src/check.js";
import { discoverProjectFromFiles } from "../src/discovery.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";
import { writePackageNodeCommandShim } from "./helpers/native-command-shim.js";

const NL = String.fromCharCode(10);

const discovery = discoverProjectFromFiles({ "package.json": JSON.stringify({ devDependencies: { vitest: "4.1.10" } }), "vitest.config.ts": "" });

describe("decideRunAdmissions with an edited ascout.config.json", () => {
  it.each(["modified", "deleted", undefined])("refuses every task when an existing config is %s", (kind) => {
    const decisions = decideRunAdmissions(discovery, [{ path: "ascout.config.json", ...(kind === undefined ? {} : { change_kind: kind }) }]);
    for (const decision of Object.values(decisions)) {
      expect(decision).toMatchObject({ launchAllowed: false, changedAuthorityPaths: ["ascout.config.json"] });
    }
  });

  it("refuses every task when the config was renamed away", () => {
    const decisions = decideRunAdmissions(discovery, [{ path: "old.json", previous_path: "ascout.config.json", change_kind: "renamed" }]);
    expect(decisions.test.launchAllowed).toBe(false);
  });

  it("keeps the per-task rule for a newly added config, as ascout init writes", () => {
    const decisions = decideRunAdmissions(discovery, [{ path: "ascout.config.json", change_kind: "added" }], { tasks: { lint: { enabled: false } } });
    expect(decisions.lint.launchAllowed).toBe(false);
    expect(decisions.test.launchAllowed).toBe(true);
  });
});

function git(root: string, argv: readonly string[]): void {
  const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${argv.join(" ")} failed: ${result.stderr}`);
}

describe("check after a redactEnv name is removed", () => {
  it("refuses a discovered task the config never named", async () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-config-edit-"));
    try {
      mkdirSync(join(root, "src"), { recursive: true });
      mkdirSync(join(root, "node_modules", "vitest"), { recursive: true });
      mkdirSync(join(root, "node_modules", "@vitest", "coverage-v8"), { recursive: true });
      mkdirSync(join(root, "node_modules", "fake-runner"), { recursive: true });
      writeFileSync(join(root, ".gitignore"), ".ascout/" + NL + "node_modules/" + NL);
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "config-edit", private: true, type: "module", devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" } }));
      writeFileSync(join(root, "node_modules", "vitest", "package.json"), JSON.stringify({ name: "vitest", version: "4.1.10" }));
      writeFileSync(join(root, "node_modules", "@vitest", "coverage-v8", "package.json"), JSON.stringify({ name: "@vitest/coverage-v8", version: "4.1.10" }));
      writeFileSync(join(root, "node_modules", "fake-runner", "index.mjs"), "process.exit(0);" + NL);
      writePackageNodeCommandShim(join(root, "node_modules", ".bin"), "vitest", "../fake-runner/index.mjs");
      writeFileSync(join(root, "src", "used.js"), "export const used = 2;" + NL);
      writeFileSync(join(root, "ascout.config.json"), JSON.stringify({ version: 1, redactEnv: ["MY_DEPLOY_TOKEN"] }));
      git(root, ["init", "-q"]);
      git(root, ["config", "user.name", "Ascout Config Fixture"]);
      git(root, ["config", "user.email", "config@example.invalid"]);
      git(root, ["add", "."]);
      git(root, ["commit", "-qm", "baseline"]);
      writeFileSync(join(root, "ascout.config.json"), JSON.stringify({ version: 1 }));

      const { receipt } = await runCheck(root);
      expect(receipt.tasks.find(({ task_id }) => task_id === "test")).toMatchObject({
        status: "NOT_RUN",
        execution_admission: "refused_changed_surface",
        changed_authority_paths: ["ascout.config.json"],
      });
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
