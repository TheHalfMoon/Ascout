import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AUTHORITY_FILE_IGNORED_REASON_CODE, decideTaskAdmission, runCheck } from "../src/check.js";
import { readUntrackedIgnoredPaths } from "../src/git.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";

function git(root: string, argv: readonly string[]): void {
  const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${argv.join(" ")} failed: ${result.stderr}`);
}

describe("decideTaskAdmission with an ignored authority file", () => {
  it("does not launch a task whose authority file is untracked and ignored", () => {
    const decision = decideTaskAdmission("test", ["vitest.config.ts"], [], false, new Set(["vitest.config.ts"]));
    expect(decision).toMatchObject({
      launchAllowed: false,
      executionAdmission: "normal",
      commandSurfaceChanged: false,
      changedAuthorityPaths: [],
      refusal: { status: "NOT_RUN", reasonCode: AUTHORITY_FILE_IGNORED_REASON_CODE },
    });
  });

  it("is not admitted by the changed-surface override", () => {
    expect(decideTaskAdmission("test", ["vitest.config.ts"], [], true, new Set(["vitest.config.ts"])).launchAllowed).toBe(false);
  });

  it("leaves a task alone when the ignored file isn't its authority", () => {
    expect(decideTaskAdmission("test", ["vitest.config.ts"], [], false, new Set(["jest.config.js"])).launchAllowed).toBe(true);
  });

  it("reports a changed authority path as before when one exists", () => {
    const decision = decideTaskAdmission("test", ["package.json", "vitest.config.ts"], [{ path: "package.json" }], false, new Set(["vitest.config.ts"]));
    expect(decision).toMatchObject({ executionAdmission: "refused_changed_surface", changedAuthorityPaths: ["package.json"] });
  });
});

let root: string;

beforeEach(() => {
  root = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-ignored-authority-")));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Ascout Ignored Authority Fixture"]);
  git(root, ["config", "user.email", "ignored-authority@example.invalid"]);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("readUntrackedIgnoredPaths", () => {
  it("lists only paths that are untracked and ignored, matching them literally", () => {
    writeFileSync(join(root, ".gitignore"), "*.local\n\\[a\\].txt\na.txt\n");
    writeFileSync(join(root, "tracked.local"), "");
    git(root, ["add", ".gitignore"]);
    git(root, ["add", "-f", "tracked.local"]);
    git(root, ["commit", "-qm", "baseline"]);
    writeFileSync(join(root, "ignored.local"), "");
    writeFileSync(join(root, "untracked.txt"), "");
    writeFileSync(join(root, "[a].txt"), "");
    writeFileSync(join(root, "a.txt"), "");
    mkdirSync(join(root, "nested"));
    writeFileSync(join(root, "nested", "deep.local"), "");

    expect(readUntrackedIgnoredPaths(root, ["ignored.local", "tracked.local", "untracked.txt", "missing.local", "[a].txt", "nested/deep.local"]))
      .toEqual(["[a].txt", "ignored.local", "nested/deep.local"]);
    // As a glob, "[a].txt" would also match the ignored a.txt.
    expect(readUntrackedIgnoredPaths(root, ["[a].txt"])).toEqual(["[a].txt"]);
    expect(readUntrackedIgnoredPaths(root, [])).toEqual([]);
  });
});

describe("check with an ignored ascout.config.json", () => {
  it("does not run the command an untracked, ignored config supplies", async () => {
    const marker = join(root, "..", `${root.split(/[\\/]/u).pop()}-ran`);
    writeFileSync(join(root, ".gitignore"), ".ascout/\n");
    git(root, ["add", "."]);
    git(root, ["commit", "-qm", "baseline"]);
    writeFileSync(join(root, ".git", "info", "exclude"), "ascout.config.json\n");
    writeFileSync(join(root, "ascout.config.json"), JSON.stringify({
      version: 1,
      tasks: { typecheck: { command: [process.execPath, "-e", `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "ran")`] } },
    }));

    try {
      const { receipt } = await runCheck(root);
      expect(receipt.tasks.find(({ task_id }) => task_id === "typecheck")).toMatchObject({
        status: "NOT_RUN",
        reason_code: AUTHORITY_FILE_IGNORED_REASON_CODE,
        execution_admission: "normal",
        changed_authority_paths: [],
      });
      expect(existsSync(marker)).toBe(false);
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    } finally {
      rmSync(marker, { force: true });
    }
  }, 30_000);
});
