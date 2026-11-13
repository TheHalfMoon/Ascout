import { readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

// C1b (specs/017-unified-assurance/C1_GITHUB_APP_GATE_DESIGN.md, sections 2 and 3): rules for any
// workflow that can hold the GitHub App key, checked on this repository's workflows and on the
// template customers copy. The lint is deliberately strict and fails closed: a file that mentions
// the key environment or the App secrets in *any* form must use the exact shapes below, or fail.
const ROOT = resolve(__dirname, "..");
const NL = String.fromCharCode(10);
const KEY_FILES = new Set(["ascout-pr-publish.yml", "ascout-pr-publish-app.yml"]);
const ALLOWED_ACTIONS = new Set(["actions/checkout", "actions/setup-node", "actions/download-artifact"]);
const VERIFY_LINE = 'echo "${ASCOUT_SHA256}  $RUNNER_TEMP/ascout.tgz" | sha256sum --check --strict -';
const PUBLISH_LINE ='node "$RUNNER_TEMP/package/dist/github/publish-cli.js" "$RUNNER_TEMP/evidence/ascout-pr-evidence.json"';

/** A workflow's text with line endings normalized, so a CRLF checkout (Windows) reads the same. */
function readWorkflow(file: string): string {
  return readFileSync(file, "utf8").split(String.fromCharCode(13) + NL).join(NL);
}

function workflowFiles(): string[] {
  const dirs = [join(ROOT, ".github", "workflows"), join(ROOT, "docs", "examples")];
  return dirs.flatMap((dir) => readdirSync(dir).filter((name) => /\.ya?ml$/u.test(name)).map((name) => join(dir, name)));
}

/** Any mention, in any form, of the key environment or the App secrets. */
function holdsAppKey(text: string): boolean {
  return /ascout-publish\b/u.test(text) || /ASCOUT_APP_/u.test(text);
}

/** The text of every `run:` script, inline or block, whatever the block header's suffix. */
function runScripts(text: string): string[] {
  const lines = text.split(NL);
  const scripts: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(\s*)(?:-\s+)?run:\s*(.*)$/u.exec(lines[index] as string);
    if (match === null) continue;
    const indent = (match[1] as string).length;
    const rest = match[2] as string;
    if (!/^[|>][+-]?[0-9]?\s*(?:#.*)?$/u.test(rest)) {
      scripts.push(rest);
      continue;
    }
    const body: string[] = [];
    for (index += 1; index < lines.length; index += 1) {
      const line = lines[index] as string;
      if (line.trim() !== "" && line.search(/\S/u) <= indent) {
        index -= 1;
        break;
      }
      body.push(line);
    }
    // Comment lines are not script: a check must never be satisfied by a comment.
    scripts.push(body.map((line) => line.trim()).filter((line) => line !== "" && !line.startsWith("#")).join(NL));
  }
  return scripts;
}

/**
 * The event names under a top-level `on:` written as a block. Any other way of writing `on`
 * (flow list, scalar, quoted key) returns null, which the key rules treat as a failure.
 */
function blockTriggers(text: string): string[] | null {
  const lines = text.split(NL);
  const keys = lines.filter((line) => /^["']?on["']?\s*:/u.test(line));
  if (keys.length !== 1 || !/^on:\s*$/u.test(keys[0] as string)) return null;
  const names: string[] = [];
  for (const line of lines.slice(lines.indexOf(keys[0] as string) + 1)) {
    if (/^\S/u.test(line)) break;
    const match = /^ {2}([a-z_]+):/u.exec(line);
    if (match !== null) names.push(match[1] as string);
  }
  return names;
}

/** The lines of the step that uses `action`, from its list item to the next step. */
function stepText(text: string, action: string): string {
  const lines = text.split(NL);
  const at = lines.findIndex((line) => line.includes(`uses: ${action}@`));
  if (at === -1) return "";
  let start = at;
  while (start > 0 && !/^\s*-\s/u.test(lines[start] as string)) start -= 1;
  const indent = (lines[start] as string).search(/-/u);
  let end = start + 1;
  while (end < lines.length && !((lines[end] as string).search(/\S/u) <= indent && (lines[end] as string).trim() !== "")) end += 1;
  return lines.slice(start, end).join(NL);
}

describe("every workflow", () => {
  for (const file of workflowFiles()) {
    const text = readWorkflow(file);
    it(`${basename(file)}: never uses pull_request_target, toJSON(secrets), or secrets: inherit`, () => {
      expect(text).not.toMatch(/pull_request_target|toJSON\(\s*secrets\s*\)|secrets:\s*inherit/u);
    });
  }
});

describe("workflows that can hold the GitHub App key", () => {
  const files = workflowFiles();

  it("the template exists, and only the publish workflows may mention the key", () => {
    const holders = files.filter((file) => holdsAppKey(readWorkflow(file))).map((file) => basename(file));
    expect(holders).toContain("ascout-pr-publish-app.yml");
    for (const name of holders) expect(KEY_FILES.has(name)).toBe(true);
  });

  for (const file of files) {
    const text = readWorkflow(file);
    if (!holdsAppKey(text)) continue;
    const name = basename(file);

    it(`${name}: requires App mode wherever it passes the App secrets`, () => {
      if (!/secrets\.ASCOUT_APP_/u.test(text)) return;
      expect(text).toMatch(/^ +ASCOUT_PUBLISH_MODE: app$/mu);
    });

    it(`${name}: names the environment exactly once, as a plain value`, () => {
      expect(text.match(/ascout-publish\b/gu)?.length).toBe(1);
      expect(text).toMatch(/^ {4}environment: ascout-publish$/mu);
    });

    it(`${name}: installs and builds nothing`, () => {
      for (const script of runScripts(text)) expect(script).not.toMatch(/\b(?:npm|npx|yarn|pnpm|bun|corepack)\b/u);
    });

    it(`${name}: uses only pinned official actions, and checkout can't fetch other code`, () => {
      const uses = [...text.matchAll(/uses:\s*([^\s#]+)/gu)].map((match) => match[1] as string);
      expect(uses.length).toBeGreaterThan(0);
      for (const ref of uses) {
        const [action, version] = ref.split("@") as [string, string | undefined];
        expect(ALLOWED_ACTIONS.has(action)).toBe(true);
        expect(version).toMatch(/^[0-9a-f]{40}$/u);
      }
      expect(stepText(text, "actions/checkout")).not.toMatch(/^\s+(?:ref|repository|lfs|token|ssh-key|submodules|path|fetch-depth):/mu);
    });

    it(`${name}: runs only on workflow_run, so the default branch's copy always runs`, () => {
      expect(blockTriggers(text)).toEqual(["workflow_run"]);
    });

    it(`${name}: passes event values through env, never into a script`, () => {
      for (const script of runScripts(text)) expect(script).not.toContain("${{");
      expect(text).not.toMatch(/^\s+(?:shell|working-directory):.*\$\{\{/mu);
    });

    it(`${name}: downloads the untrusted bundle first, then verifies, then runs the verified file`, () => {
      const scripts = runScripts(text);
      const verify = scripts.findIndex((script) => {
        const lines = script.split(NL);
        return lines[0] === "set -euo pipefail" && lines.includes(VERIFY_LINE);
      });
      expect(verify).toBeGreaterThanOrEqual(0);
      expect(scripts.filter((script) => script === PUBLISH_LINE)).toHaveLength(1);
      expect(scripts.indexOf(PUBLISH_LINE)).toBeGreaterThan(verify);
      const download = text.indexOf("uses: actions/download-artifact@");
      expect(download).toBeGreaterThanOrEqual(0);
      expect(download).toBeLessThan(text.indexOf(VERIFY_LINE));
    });
  }
});

describe("the lint itself", () => {
  it("reads inline and block scripts with any header, and only block-form triggers", () => {
    const sample = ["on:", "  workflow_run:", "    workflows: [x]", "jobs:", "  a:", "    steps:", "      - run: npm ci", "      - name: b", "        run: |+ # keep", "          echo ${{ github.x }}", "          node y", "      - name: c"].join(NL);
    expect(blockTriggers(sample)).toEqual(["workflow_run"]);
    expect(runScripts(sample)).toEqual(["npm ci", ["echo ${{ github.x }}", "node y"].join(NL)]);
    expect(runScripts(["      run: |", "        # sha256sum --check --strict", "        echo hi"].join(NL))).toEqual(["echo hi"]);
    expect(blockTriggers("on: [push, pull_request_target]")).toBeNull();
    expect(blockTriggers('"on":' + NL + "  push:")).toBeNull();
    expect(blockTriggers("on: workflow_run")).toBeNull();
  });

  it("treats any mention of the environment or App secrets as holding the key", () => {
    expect(holdsAppKey("environment: ascout-publish")).toBe(true);
    expect(holdsAppKey(["environment:", "  name: ascout-publish"].join(NL))).toBe(true);
    expect(holdsAppKey("environment: { name: ascout-publish }")).toBe(true);
    expect(holdsAppKey("x: ${{ secrets.ASCOUT_APP_PRIVATE_KEY }}")).toBe(true);
    expect(holdsAppKey("uses: ./.github/workflows/ascout-pr-publish.yml")).toBe(false);
    expect(holdsAppKey("environment: release-attest")).toBe(false);
  });

  it("the published package contains the entry point the template runs", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { files?: string[]; type?: string };
    expect(pkg.type).toBe("module");
    expect(pkg.files?.some((entry) => entry === "dist" || entry.startsWith("dist/"))).toBe(true);
  });
});
