import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";
import { parseTestAssertionObservations } from "../src/test-reproduction.js";

const NEWLINE = String.fromCharCode(10);
// The segment check must see a ".." that follows a newline, where "." stops matching.
const ESCAPING = `a${NEWLINE}/../../x`;

describe("repository path validators with a newline before ..", () => {
  it("drop a test file name that escapes the repository (already caught by path resolution)", () => {
    const text = JSON.stringify({ testResults: [{ name: `/repo/${ESCAPING}`, assertionResults: [{ fullName: "t", status: "failed" }] }] });
    expect(parseTestAssertionObservations("/repo", text, "e1")).toEqual([]);
  });

  it("flag a receipt path that escapes the repository", async () => {
    const root = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-path-newline-")));
    try {
      writeFileSync(join(root, ".gitignore"), ".ascout/\n");
      for (const argv of [["init", "-q"], ["config", "user.name", "Ascout Path Fixture"], ["config", "user.email", "path@example.invalid"], ["add", "."], ["commit", "-qm", "baseline"]]) {
        const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
        if (result.status !== 0) throw new Error(result.stderr);
      }
      const { receipt } = await runCheck(root);
      expect(validateReceiptSemantics(receipt).valid).toBe(true);

      const tampered = {
        ...receipt,
        tasks: receipt.tasks.map((task, index) => index === 0 ? { ...task, changed_authority_paths: [ESCAPING] } : task),
      };
      const { issues } = validateReceiptSemantics(tampered);
      const flagged = issues.filter((issue) => issue.path === "tasks[0].changed_authority_paths[0]").map((issue) => issue.code);
      // Segment splitting already caught the escape as path_namespace_escape. The canonical-path
      // rule now rejects it first, as the producers' copies of that rule do.
      expect(flagged).toContain("noncanonical_original_path");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
