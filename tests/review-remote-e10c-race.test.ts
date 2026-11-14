import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 180_000 });

// Source that changes while remote review lists the changes can't be timed in a test, so it is
// injected: the second of the two source reads that bracket the listing sees a different tree.
let driftOnSecondRead = false;
let sourceReads = 0;
vi.mock("../src/check.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/check.js")>();
  return {
    ...actual,
    composeSourceState: (root: string) => {
      const state = actual.composeSourceState(root);
      sourceReads += 1;
      return driftOnSecondRead && sourceReads % 2 === 0 ? { ...state, tree_digest: "f".repeat(64) } : state;
    },
  };
});

const { computeRemoteReviewV1 } = await import("../src/command-functions.js");

const roots: string[] = [];
afterEach(() => {
  driftOnSecondRead = false;
  sourceReads = 0;
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

it("reports source drift, and sends nothing, when the source changes while remote review reads it", async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "ascout-e10c-race-")));
  roots.push(root);
  const git = (args: string[]) => execFileSync("git", args, { cwd: root, windowsHide: true });
  git(["init", "-q"]);
  git(["config", "user.name", "Ascout Test"]);
  git(["config", "user.email", "ascout@example.invalid"]);
  git(["config", "commit.gpgSign", "false"]);
  writeFileSync(join(root, "a.ts"), "export const a = 1;\n");
  git(["add", "--all"]);
  git(["commit", "-q", "-m", "base"]);
  writeFileSync(join(root, "a.ts"), "export const a = 2;\n");
  const sent: unknown[] = [];
  driftOnSecondRead = true;
  const result = await computeRemoteReviewV1(root, {
    dryRun: false,
    deps: {
      confirm: () => "api.example.com",
      scan: async () => ({ kind: "clean" }),
      resolve: async () => [{ address: "93.184.216.34", family: 4 }],
      transport: async (exchange) => {
        sent.push(exchange);
        return { status: 200, text: "{}" };
      },
    },
  });
  expect(result).toMatchObject({ kind: "report", exit_code: 3 });
  expect(sent).toEqual([]);
});
