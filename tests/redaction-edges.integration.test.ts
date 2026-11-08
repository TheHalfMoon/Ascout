import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { redactCutTail, redactExactValues } from "../src/redact.js";

describe("redactExactValues", () => {
  it("removes a secret that the removal itself rejoins", () => {
    const secret = "abcdef";
    expect(redactExactValues(`x abc${secret}def y`, [secret])).toBe("x  y");
  });

  it("removes a longer secret rejoined by removing a shorter one", () => {
    const longer = "longsecretvalue";
    const shorter = "middle";
    expect(redactExactValues(`[longsec${shorter}retvalue]`, [longer, shorter])).toBe("[]");
  });

  it("leaves text without secrets unchanged", () => {
    expect(redactExactValues("nothing here", ["abcdef"])).toBe("nothing here");
  });
});

describe("redactCutTail", () => {
  const secret = "ghp_ABCDEFGHIJKL";

  it("removes a tail that begins a secret", () => {
    expect(redactCutTail("token=ghp_ABCD", [secret])).toEqual({ text: "token=", redacted: true });
  });

  it("keeps a tail too short to reveal anything", () => {
    expect(redactCutTail("token=ghp", [secret])).toEqual({ text: "token=ghp", redacted: false });
  });

  it("keeps text whose tail starts no secret", () => {
    expect(redactCutTail("all done", [secret])).toEqual({ text: "all done", redacted: false });
  });
});

function git(root: string, argv: readonly string[]): void {
  const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${argv.join(" ")} failed: ${result.stderr}`);
}

describe("check with a secret cut by the capture cap", () => {
  it("does not persist the start of the secret", async () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-redaction-cut-"));
    const secret = "ghp_cutCutCutCutCutCutCutCutCutCut0123";
    const saved = process.env.GITHUB_TOKEN;
    try {
      // 8 MiB is the task capture cap; the first 10 characters of the token land before it.
      const script = `process.stdout.write("x".repeat(8 * 1024 * 1024 - 10) + process.env.GITHUB_TOKEN + "\\n")`;
      writeFileSync(join(root, ".gitignore"), ".ascout/\n");
      writeFileSync(join(root, "ascout.config.json"), JSON.stringify({ version: 1, tasks: { typecheck: { command: [process.execPath, "-e", script] } } }));
      git(root, ["init", "-q"]);
      git(root, ["config", "user.name", "Ascout Redaction Fixture"]);
      git(root, ["config", "user.email", "redaction@example.invalid"]);
      git(root, ["add", "."]);
      git(root, ["commit", "-qm", "baseline"]);
      process.env.GITHUB_TOKEN = secret;

      const { receipt } = await runCheck(root);
      const stdout = receipt.artifacts.find(({ artifact_id }) => artifact_id === "typecheck.typecheck-stdout.log");
      expect(stdout).toMatchObject({ truncated: true, redacted: true });
      const persisted = readFileSync(join(root, ".ascout", "runs", receipt.run.run_id, stdout!.relative_run_path), "utf8");
      expect(persisted.endsWith(secret.slice(0, 4))).toBe(false);
      expect(persisted).not.toContain(secret.slice(0, 10));
    } finally {
      if (saved === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = saved;
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});
