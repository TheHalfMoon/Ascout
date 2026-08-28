import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const preload = resolve(process.cwd(), "benchmarks/membership-preload.cjs");

async function fakeRunner(relativePath: string) {
  const root = await mkdtemp(join(tmpdir(), "ascout-membership-preload-"));
  roots.push(root);
  const runner = join(root, relativePath);
  await mkdir(resolve(runner, ".."), { recursive: true });
  await writeFile(
    runner,
    "process.stdout.write(JSON.stringify({ argv: process.argv.slice(2), instrumented: process.env.ASCOUT_MEMBERSHIP_INSTRUMENTED ?? null, pid: process.pid }));\n",
    "utf8",
  );
  return { root, runner };
}

function invoke(runner: string, kind: "vitest" | "jest", outputFile: string, args: string[]) {
  return spawnSync(process.execPath, [runner, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_OPTIONS: `--require=${preload}`,
      ASCOUT_MEMBERSHIP_KIND: kind,
      ASCOUT_MEMBERSHIP_OUTPUT: outputFile,
    },
  });
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("T075 membership preload runner authority", () => {
  it("instruments only a project-local Vitest shim and inserts reporter flags before the argument boundary", async () => {
    const { root, runner } = await fakeRunner("node_modules/.bin/vitest");
    const outputFile = join(root, "vitest-membership.json");
    const result = invoke(runner, "vitest", outputFile, ["run", "--", "tests/a.test.ts"]);

    expect(result.status).toBe(0);
    const observed = JSON.parse(result.stdout);
    expect(observed).toEqual({
      argv: ["run", "--reporter=json", `--outputFile=${outputFile}.${observed.pid}.json`, "--", "tests/a.test.ts"],
      instrumented: "1",
      pid: expect.any(Number),
    });
  });

  it("instruments only a project-local Jest shim with JSON output flags", async () => {
    const { root, runner } = await fakeRunner("node_modules/.bin/jest");
    const outputFile = join(root, "jest-membership.json");
    const result = invoke(runner, "jest", outputFile, ["--runInBand", "tests/a.test.ts"]);

    expect(result.status).toBe(0);
    const observed = JSON.parse(result.stdout);
    expect(observed).toEqual({
      argv: ["--runInBand", "tests/a.test.ts", "--json", `--outputFile=${outputFile}.${observed.pid}.json`],
      instrumented: "1",
      pid: expect.any(Number),
    });
  });

  it("does not trust a bare runner-shaped executable outside node_modules/.bin", async () => {
    const { root, runner } = await fakeRunner("tools/vitest");
    const outputFile = join(root, "should-not-exist.json");
    const result = invoke(runner, "vitest", outputFile, ["run", "tests/a.test.ts"]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      argv: ["run", "tests/a.test.ts"],
      instrumented: null,
      pid: expect.any(Number),
    });
  });
});
