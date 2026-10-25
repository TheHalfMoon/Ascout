import { execFileSync } from "node:child_process";
import { lstatSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const control = vi.hoisted(() => ({
  calls: [] as string[][],
  intercept: null as ((argv: readonly string[], options: unknown) => unknown) | null,
}));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  const spawnSync = ((...args: unknown[]) => {
    const [file, argv, options] = args;
    if (file === "git" && Array.isArray(argv)) {
      control.calls.push([...argv]);
      if (control.intercept !== null) return control.intercept(argv, options);
    }
    return (actual.spawnSync as (...values: unknown[]) => unknown)(...args);
  }) as typeof actual.spawnSync;
  return { ...actual, spawnSync };
});

import { GitIdentityError, readTreeDigestV1, treeDigestV1FromState } from "../src/git.js";

const HEAD = "a".repeat(40);
const OID = "b".repeat(40);
const TEMP_ROOT = realpathSync.native(tmpdir());
const roots: string[] = [];
const INDEX = `100644 ${OID} 0\ttracked.txt\0`;

function root(): string {
  const value = mkdtempSync(join(TEMP_ROOT, "ascout-index-observation-"));
  roots.push(value);
  return value;
}

afterEach(() => {
  control.intercept = null;
  control.calls = [];
  for (const value of roots.splice(0)) {
    if (
      dirname(resolve(value)) !== TEMP_ROOT ||
      !basename(value).startsWith("ascout-index-observation-") ||
      lstatSync(value).isSymbolicLink() || realpathSync.native(value) !== resolve(value)
    ) throw new Error("Refusing cleanup outside owned temporary root");
    rmSync(value, { recursive: true });
  }
});

function mockIndex(records: readonly Buffer[], head = HEAD, diff = Buffer.alloc(0)): void {
  let reads = 0;
  control.intercept = (argv, options) => {
    const encoding = (options as { encoding?: unknown }).encoding;
    let output: string | Buffer;
    if (argv[0] === "rev-parse") output = `true\nfalse\n${head}\n`;
    else if (argv[0] === "symbolic-ref") output = "refs/heads/main\n";
    else if (argv[0] === "ls-files" && argv.includes("--stage")) {
      output = argv.includes("-v") ? records[Math.min(reads++, records.length - 1)]! : Buffer.from(INDEX);
    } else if (argv[0] === "ls-files" && argv.includes("-v")) output = Buffer.from("H tracked.txt\0");
    else if (argv[0] === "ls-files" && argv.includes("--others")) output = Buffer.alloc(0);
    else if (argv[0] === "diff-files") output = diff;
    else throw new Error("Unexpected Git query in collector boundary test");
    const stdout = encoding === "utf8" ? String(output) : Buffer.from(output);
    return { status: 0, stdout, stderr: encoding === "utf8" ? "" : Buffer.alloc(0) };
  };
}

function expectMetadataError(read: () => unknown): void {
  try {
    read();
    throw new Error("Collector accepted unqualified metadata");
  } catch (error) {
    expect(error).toBeInstanceOf(GitIdentityError);
    expect((error as GitIdentityError).code).toBe("git_metadata_error");
  }
}

describe("Task023 combined index boundary", () => {
  it.each([
    { oid: OID, path: "tracked.txt", stage: 0 },
    { oid: "c".repeat(64), path: "src/space and\ttab\nname.ts", stage: 0 },
    { oid: OID, path: "\ufeffname.ts", stage: 1 },
    { oid: OID, path: "src/other.ts", stage: 3 },
  ])("preserves exact metadata for $path at stage $stage", ({ oid, path, stage }) => {
    const head = "a".repeat(oid.length);
    mockIndex([Buffer.from(`H 100644 ${oid} ${stage}\t${path}\0`)], head);
    expect(readTreeDigestV1(root())).toEqual(treeDigestV1FromState({
      head, index: [{ path, mode: "100644", oid, stage }], unstaged: [], untracked: [],
    }));
  });

  it("preserves an empty index", () => {
    mockIndex([Buffer.alloc(0)]);
    expect(readTreeDigestV1(root())).toEqual(treeDigestV1FromState({
      head: HEAD, index: [], unstaged: [], untracked: [],
    }));
  });

  it.each(["S", "s", "h", "m", "z"])("refuses hidden visibility %s", (tag) => {
    mockIndex([Buffer.from(`${tag} ${INDEX}`)]);
    expectMetadataError(() => readTreeDigestV1(root()));
  });

  it.each([
    ["missing delimiter", Buffer.from(`H ${INDEX.slice(0, -1)}`)],
    ["empty record", Buffer.from(`H ${INDEX}\0`)],
    ["missing tag", Buffer.from(INDEX)],
    ["unknown tag", Buffer.from(`? ${INDEX}`)],
    ["wrong separator", Buffer.from(`H\t${INDEX}`)],
    ["uppercase object ID", Buffer.from(`H 100644 ${"B".repeat(40)} 0\ttracked.txt\0`)],
    ["invalid stage", Buffer.from(`H 100644 ${OID} 4\ttracked.txt\0`)],
    ["noncanonical path", Buffer.from(`H 100644 ${OID} 0\t../escape.txt\0`)],
    ["backslash path", Buffer.from(`H 100644 ${OID} 0\tsrc\\file.txt\0`)],
    ["invalid UTF8 path", Buffer.concat([Buffer.from(`H 100644 ${OID} 0\t`), Buffer.from([0xc3, 0x00])])],
  ] as const)("refuses %s", (_name, record) => {
    mockIndex([record]);
    expectMetadataError(() => readTreeDigestV1(root()));
  });

  it("refuses a changed second complete observation", () => {
    mockIndex([Buffer.from(`H ${INDEX}`), Buffer.from(`H 100644 ${"c".repeat(40)} 0\ttracked.txt\0`)]);
    expectMetadataError(() => readTreeDigestV1(root()));
  });

  it("retains unmerged worktree refusal after reading M index metadata", () => {
    mockIndex([Buffer.from(`M 100644 ${OID} 2\ttracked.txt\0`)], HEAD,
      Buffer.from(`:000000 100644 ${"0".repeat(40)} ${"0".repeat(40)} U\0tracked.txt\0`));
    expect(() => readTreeDigestV1(root())).toThrow(/unmerged/);
  });

  it("refuses a failed combined command", () => {
    mockIndex([Buffer.from(`H ${INDEX}`)]);
    const success = control.intercept!;
    control.intercept = (argv, options) => argv[0] === "ls-files" && argv.includes("--stage") && argv.includes("-v")
      ? { status: 1, stdout: Buffer.alloc(0), stderr: Buffer.from("failure") }
      : success(argv, options);
    expectMetadataError(() => readTreeDigestV1(root()));
  });
});

function nativeRepository(): string {
  const value = root();
  const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null", GIT_TERMINAL_PROMPT: "0" };
  const git = (argv: readonly string[]): void => {
    execFileSync("git", [...argv], { cwd: value, env, windowsHide: true, stdio: "pipe" });
  };
  git(["init", "-q"]);
  for (const [key, content] of [["user.name", "Ascout Test"], ["user.email", "ascout@example.invalid"], ["commit.gpgSign", "false"], ["core.autocrlf", "false"]]) {
    git(["config", key!, content!]);
  }
  const empty = join(value, ".git", "empty-attributes");
  writeFileSync(empty, "");
  git(["config", "core.attributesFile", empty]);
  writeFileSync(join(value, "tracked.txt"), "base\n");
  git(["add", "--all"]);
  git(["commit", "-q", "-m", "base"]);
  return value;
}

describe("Task023 actual native Git launch budgets", () => {
  it.each([{ modified: false, budget: 10 }, { modified: true, budget: 12 }])(
    "uses at most $budget Git launches with modified=$modified", ({ modified, budget }) => {
      const value = nativeRepository();
      if (modified) writeFileSync(join(value, "tracked.txt"), "changed\n");
      control.calls = [];
      const observed = readTreeDigestV1(value);
      expect(observed.tracked_index_entry_count).toBe(1);
      expect(observed.unstaged_changed_count).toBe(modified ? 1 : 0);
      expect(control.calls.length).toBeLessThanOrEqual(budget);
    }, 15_000,
  );
});
