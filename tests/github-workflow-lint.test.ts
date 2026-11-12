import { readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

// C1b (specs/017-unified-assurance/C1_GITHUB_APP_GATE_DESIGN.md, section 2 and 3): rules for any
// workflow that can hold the GitHub App key. They are checked on this repository's workflows and on
// the template customers copy.
const ROOT = resolve(__dirname, "..");
const NL = String.fromCharCode(10);
const KEY_FILES = new Set(["ascout-pr-publish.yml", "ascout-pr-publish-app.yml"]);
const ALLOWED_ACTIONS = new Set(["actions/checkout", "actions/setup-node", "actions/download-artifact"]);

function workflowFiles(): string[] {
  const dirs = [join(ROOT, ".github", "workflows"), join(ROOT, "docs", "examples")];
  return dirs.flatMap((dir) => readdirSync(dir).filter((name) => /\.ya?ml$/u.test(name)).map((name) => join(dir, name)));
}

/** True for a workflow that can receive the App key. */
function holdsAppKey(text: string): boolean {
  return /environment:\s*['"]?ascout-publish\b/u.test(text) || /secrets\.ASCOUT_APP_/u.test(text);
}

/** The text of every `run:` script, inline or block. */
function runScripts(text: string): string[] {
  const lines = text.split(NL);
  const scripts: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(\s*)(?:-\s+)?run:\s*(.*)$/u.exec(lines[index] as string);
    if (match === null) continue;
    const indent = (match[1] as string).length;
    const rest = match[2] as string;
    if (rest !== "|" && rest !== ">" && rest !== "|-" && rest !== ">-") {
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
    scripts.push(body.join(NL));
  }
  return scripts;
}

/** The event names under the top-level `on:` key. */
function triggers(text: string): string[] {
  const lines = text.split(NL);
  const start = lines.findIndex((line) => /^on:\s*$/u.test(line));
  if (start === -1) return [];
  const names: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/u.test(line)) break;
    const match = /^ {2}([a-z_]+):/u.exec(line);
    if (match !== null) names.push(match[1] as string);
  }
  return names;
}

describe("workflows that can hold the GitHub App key", () => {
  const files = workflowFiles();

  it("the template exists and is the only App-key workflow besides the publish workflow", () => {
    const holders = files.filter((file) => holdsAppKey(readFileSync(file, "utf8"))).map((file) => basename(file));
    expect(holders).toContain("ascout-pr-publish-app.yml");
    for (const name of holders) expect(KEY_FILES.has(name)).toBe(true);
  });

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (!holdsAppKey(text)) continue;
    const name = basename(file);

    it(`${name}: installs and builds nothing`, () => {
      for (const script of runScripts(text)) expect(script).not.toMatch(/\b(?:npm|npx|yarn|pnpm|bun)\b/u);
    });

    it(`${name}: uses only pinned official actions`, () => {
      const uses = [...text.matchAll(/uses:\s*([^\s#]+)/gu)].map((match) => match[1] as string);
      expect(uses.length).toBeGreaterThan(0);
      for (const ref of uses) {
        const [action, version] = ref.split("@") as [string, string | undefined];
        expect(ALLOWED_ACTIONS.has(action)).toBe(true);
        expect(version).toMatch(/^[0-9a-f]{40}$/u);
      }
    });

    it(`${name}: runs only on workflow_run, so the default branch's copy always runs`, () => {
      expect(triggers(text)).toEqual(["workflow_run"]);
    });

    it(`${name}: passes event values through env, never into a script`, () => {
      for (const script of runScripts(text)) expect(script).not.toContain("${{");
    });

    it(`${name}: names the ascout-publish environment and verifies what it runs`, () => {
      expect(text).toMatch(/^\s+environment:\s*ascout-publish\s*$/mu);
      expect(text).toContain("sha256sum --check --strict");
      expect(text).toContain("dist/github/publish-cli.js");
    });
  }

  it("no workflow uses pull_request_target", () => {
    for (const file of files) expect(triggers(readFileSync(file, "utf8"))).not.toContain("pull_request_target");
  });
});

describe("the lint itself", () => {
  it("finds inline and block scripts, and the top-level triggers", () => {
    const sample = ["on:", "  workflow_run:", "    workflows: [x]", "jobs:", "  a:", "    steps:", "      - run: npm ci", "      - name: b", "        run: |", "          echo ${{ github.x }}", "          node y", "      - name: c"].join(NL);
    expect(triggers(sample)).toEqual(["workflow_run"]);
    expect(runScripts(sample)).toEqual(["npm ci", ["          echo ${{ github.x }}", "          node y"].join(NL)]);
    expect(holdsAppKey("environment: ascout-publish")).toBe(true);
    expect(holdsAppKey("x: ${{ secrets.ASCOUT_APP_PRIVATE_KEY }}")).toBe(true);
    expect(holdsAppKey("environment: release-attest")).toBe(false);
  });

  it("the published package contains the entry point the template runs", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { files?: string[]; type?: string };
    expect(pkg.type).toBe("module");
    expect(pkg.files?.some((entry) => entry === "dist" || entry.startsWith("dist/"))).toBe(true);
  });
});
