import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { renderTerminalSummary } from "../src/receipt/build.js";
import { escapeTerminalText } from "../src/terminal-text.js";

const c = (code: number): string => String.fromCharCode(code);
const ESC = c(0x1b);
const U = (code: number): string => `${c(92)}u${code.toString(16).padStart(4, "0")}`;
const UNSAFE = [0x00, 0x07, 0x0a, 0x0d, 0x1b, 0x7f, 0x9b, 0x2028, 0x2029, 0x061c, 0x200e, 0x200f, 0x202a, 0x202e, 0x2066, 0x2069];

function hasUnsafe(text: string): boolean {
  return [...text].some((character) => UNSAFE.includes(character.charCodeAt(0)));
}

describe("escapeTerminalText", () => {
  it.each(UNSAFE)("escapes character code %i", (code) => {
    const escaped = escapeTerminalText(`a${c(code)}b`);
    expect(escaped).toBe(`a${U(code)}b`);
  });

  it("leaves ordinary text, including non-Latin letters, unchanged", () => {
    const text = `caf${c(0xe9)} ${c(0x4e2d)} path/to/file.ts [PASS] - ok`;
    expect(escapeTerminalText(text)).toBe(text);
  });
});

function git(root: string, argv: readonly string[]): void {
  const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${argv.join(" ")} failed: ${result.stderr}`);
}

describe("check terminal summary with hostile repository text", () => {
  it("escapes a disabled-task reason and changed authority paths", async () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-terminal-escape-"));
    try {
      const forged = `\r${ESC}[2K  [PASS] typecheck (typecheck)${ESC}[8m${c(0x202e)}`;
      writeFileSync(join(root, ".gitignore"), ".ascout/\n");
      writeFileSync(join(root, "ascout.config.json"), JSON.stringify({ version: 1, tasks: { typecheck: { enabled: false, disabledReason: forged } } }));
      git(root, ["init", "-q"]);
      git(root, ["config", "user.name", "Ascout Escape Fixture"]);
      git(root, ["config", "user.email", "escape@example.invalid"]);
      git(root, ["add", "."]);
      git(root, ["commit", "-qm", "baseline"]);

      const { receipt, terminalSummary } = await runCheck(root);
      expect(receipt.tasks.find(({ task_id }) => task_id === "typecheck")?.reason_text).toBe(forged);
      expect(hasUnsafe(terminalSummary.replaceAll("\n", ""))).toBe(false);
      expect(terminalSummary).toContain(`${U(0x0d)}${U(0x1b)}[2K  [PASS] typecheck`);

      const withPath = {
        ...receipt,
        tasks: receipt.tasks.map((task) => task.task_id === "typecheck" ? { ...task, status: "NOT_RUN" as const, reason_code: "disabled_by_config", changed_authority_paths: [`pkg/${ESC}]52;c;ZXZpbA==${c(0x07)}/package.json`] } : task),
      };
      const rendered = renderTerminalSummary(withPath);
      expect(hasUnsafe(rendered.replaceAll("\n", ""))).toBe(false);
      expect(rendered).toContain(`typecheck: NOT_RUN(disabled_by_config) ${U(0x0d)}${U(0x1b)}[2K`);
      expect(rendered).toContain(`changed authority: pkg/${U(0x1b)}]52;c;ZXZpbA==${U(0x07)}/package.json`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
