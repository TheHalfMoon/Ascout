import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { decideRunAdmissions, runCheck, symlinkTargetInRepository } from "../src/check.js";
import { discoverProjectFromFiles } from "../src/discovery.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";

const POSIX = process.platform !== "win32";

function git(root: string, argv: readonly string[]): void {
  const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${argv.join(" ")} failed: ${result.stderr}`);
}

describe("decideRunAdmissions with symlinked authority files", () => {
  const discovery = discoverProjectFromFiles({ "package.json": JSON.stringify({ devDependencies: { vitest: "4.1.10" } }), "vitest.config.ts": "" });

  it("refuses a task when its config's link target changed", () => {
    const decisions = decideRunAdmissions(discovery, [{ path: "shared/vitest.base.ts" }], {
      symlinkTargets: new Map([["vitest.config.ts", "shared/vitest.base.ts"]]),
    });
    expect(decisions.test).toMatchObject({
      launchAllowed: false,
      executionAdmission: "refused_changed_surface",
      changedAuthorityPaths: ["shared/vitest.base.ts"],
    });
  });

  it("still refuses a task when the link itself changed", () => {
    const decisions = decideRunAdmissions(discovery, [{ path: "vitest.config.ts" }], {
      symlinkTargets: new Map([["vitest.config.ts", "shared/vitest.base.ts"]]),
    });
    expect(decisions.test).toMatchObject({ launchAllowed: false, changedAuthorityPaths: ["vitest.config.ts"] });
  });

  it("admits the task when nothing it loads changed", () => {
    const decisions = decideRunAdmissions(discovery, [{ path: "src/other.ts" }], {
      symlinkTargets: new Map([["vitest.config.ts", "shared/vitest.base.ts"]]),
    });
    expect(decisions.test.launchAllowed).toBe(true);
  });

  it("refuses a task whose link target is untracked and ignored", () => {
    const decisions = decideRunAdmissions(discovery, [], {
      symlinkTargets: new Map([["vitest.config.ts", "local/vitest.base.ts"]]),
      untrackedIgnoredPaths: ["local/vitest.base.ts"],
    });
    expect(decisions.test).toMatchObject({ launchAllowed: false, refusal: { reasonCode: "authority_file_ignored" } });
  });
});

let scratch: string;
let root: string;

beforeEach(() => {
  scratch = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-symlinked-authority-")));
  root = join(scratch, "repo");
  mkdirSync(root);
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("symlinkTargetInRepository", () => {
  it("returns undefined for a regular file and a missing one", () => {
    writeFileSync(join(root, "a.json"), "{}");
    expect(symlinkTargetInRepository(root, "a.json")).toBeUndefined();
    expect(symlinkTargetInRepository(root, "missing.json")).toBeUndefined();
  });

  it.skipIf(!POSIX)("returns the target inside the repository, and null for one outside", () => {
    mkdirSync(join(root, "cfg"));
    writeFileSync(join(root, "cfg", "real.json"), "{}");
    writeFileSync(join(scratch, "outside.json"), "{}");
    symlinkSync("cfg/real.json", join(root, "inside.json"));
    symlinkSync(join(scratch, "outside.json"), join(root, "outside.json"));
    symlinkSync("cfg/missing.json", join(root, "dangling.json"));
    expect(symlinkTargetInRepository(root, "inside.json")).toBe("cfg/real.json");
    expect(symlinkTargetInRepository(root, "outside.json")).toBeNull();
    expect(symlinkTargetInRepository(root, "dangling.json")).toBeNull();
  });
});

function config(marker: string): string {
  return JSON.stringify({
    version: 1,
    tasks: { typecheck: { command: [process.execPath, "-e", `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "ran")`] } },
  });
}

describe("check with a symlinked ascout.config.json", () => {
  it.skipIf(!POSIX)("refuses the task when the link's target changes", async () => {
    const changedMarker = join(scratch, "changed-ran");
    mkdirSync(join(root, "cfg"));
    writeFileSync(join(root, ".gitignore"), ".ascout/\n");
    writeFileSync(join(root, "cfg", "ascout.json"), config(join(scratch, "baseline-ran")));
    symlinkSync("cfg/ascout.json", join(root, "ascout.config.json"));
    git(root, ["init", "-q"]);
    git(root, ["config", "user.name", "Ascout Symlink Fixture"]);
    git(root, ["config", "user.email", "symlink@example.invalid"]);
    git(root, ["add", "."]);
    git(root, ["commit", "-qm", "baseline"]);
    writeFileSync(join(root, "cfg", "ascout.json"), config(changedMarker));

    const { receipt } = await runCheck(root);
    expect(receipt.tasks.find(({ task_id }) => task_id === "typecheck")).toMatchObject({
      status: "NOT_RUN",
      execution_admission: "refused_changed_surface",
      changed_authority_paths: ["cfg/ascout.json"],
    });
    expect(existsSync(changedMarker)).toBe(false);
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
  }, 30_000);

  it.skipIf(!POSIX)("refuses a config that links outside the repository", async () => {
    writeFileSync(join(scratch, "outside.json"), config(join(scratch, "outside-ran")));
    symlinkSync(join(scratch, "outside.json"), join(root, "ascout.config.json"));
    writeFileSync(join(root, ".gitignore"), ".ascout/\n");
    git(root, ["init", "-q"]);
    git(root, ["config", "user.name", "Ascout Symlink Fixture"]);
    git(root, ["config", "user.email", "symlink@example.invalid"]);
    git(root, ["add", "."]);
    git(root, ["commit", "-qm", "baseline"]);

    await expect(runCheck(root)).rejects.toThrow(/resolves outside the repository/u);
    expect(existsSync(join(scratch, "outside-ran"))).toBe(false);
  }, 30_000);
});
