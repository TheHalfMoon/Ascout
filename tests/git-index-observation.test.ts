import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const control = vi.hoisted(() => ({
  calls: [] as string[][],
  prefixes: [] as string[][],
  envs: [] as NodeJS.ProcessEnv[],
  intercept: null as ((argv: readonly string[], options: unknown) => unknown) | null,
}));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  const spawnSync = ((...args: unknown[]) => {
    const [file, argv, options] = args;
    // Git launches by absolute path, so it is recognized by file name.
    if (typeof file === "string" && /(?:^|[\\/])git(?:\.exe)?$/u.test(file) && Array.isArray(argv)) {
      // Every Ascout Git call carries the hardening prefix; the query follows it.
      const query = argv.slice(argv.lastIndexOf("-c") + 2) as string[];
      control.prefixes.push(argv.slice(0, argv.length - query.length) as string[]);
      control.envs.push(((options as { env?: NodeJS.ProcessEnv }).env ?? {}) as NodeJS.ProcessEnv);
      control.calls.push(query);
      if (control.intercept !== null) return control.intercept(query, options);
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
  control.prefixes = [];
  control.envs = [];
  for (const value of roots.splice(0)) {
    if (
      dirname(resolve(value)) !== TEMP_ROOT ||
      !basename(value).startsWith("ascout-index-observation-") ||
      lstatSync(value).isSymbolicLink() || realpathSync.native(value) !== resolve(value)
    ) throw new Error("Refusing cleanup outside owned temporary root");
    rmSync(value, { recursive: true });
  }
});

function gitBlobOid(content: string, algorithm: "sha1" | "sha256" = "sha1"): string {
  const bytes = Buffer.from(content, "utf8");
  return createHash(algorithm).update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
}

function mockIndex(records: readonly Buffer[], head = HEAD): void {
  let reads = 0;
  control.intercept = (argv, options) => {
    const encoding = (options as { encoding?: unknown }).encoding;
    let output: string | Buffer;
    if (argv[0] === "rev-parse" && argv.includes("--show-prefix")) output = Buffer.from("\n");
    else if (argv[0] === "config") return { status: 1, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
    else if (argv[0] === "rev-parse") output = `true\nfalse\n${head}\n`;
    else if (argv[0] === "symbolic-ref") output = "refs/heads/main\n";
    else if (argv[0] === "ls-files" && argv.includes("--stage")) {
      output = argv.includes("-v") ? records[Math.min(reads++, records.length - 1)]! : Buffer.from(INDEX);
    } else if (argv[0] === "ls-files" && argv.includes("-v")) output = Buffer.from("H tracked.txt\0");
    else if (argv[0] === "ls-files" && argv.includes("--others")) output = Buffer.alloc(0);
    else if (argv[0] === "check-attr") output = Buffer.alloc(0);
    else throw new Error(`Unexpected Git query in collector boundary test: ${argv.join(" ")}`);
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
    { algorithm: "sha1" as const, path: "tracked.txt" },
    { algorithm: "sha256" as const, path: "src/space name.ts" },
    { algorithm: "sha1" as const, path: "\ufeffname.ts" },
  ])("preserves exact metadata for $path ($algorithm)", ({ algorithm, path }) => {
    const repository = root();
    const content = `content for ${path}\n`;
    const filePath = join(repository, ...path.split("/"));
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
    const oid = gitBlobOid(content, algorithm);
    const head = "a".repeat(oid.length);
    mockIndex([Buffer.from(`H 100644 ${oid} 0\t${path}\0`)], head);
    expect(readTreeDigestV1(repository)).toEqual(treeDigestV1FromState({
      head, index: [{ path, mode: "100644", oid, stage: 0 }], unstaged: [], untracked: [],
    }));
  });

  it.skipIf(process.platform === "win32")("preserves tab and newline paths in NUL-terminated index records", () => {
    const repository = root();
    const path = "src/space and\ttab\nname.ts";
    const content = "special path\n";
    mkdirSync(join(repository, "src"), { recursive: true });
    writeFileSync(join(repository, path), content);
    const oid = gitBlobOid(content, "sha256");
    const head = "a".repeat(64);
    mockIndex([Buffer.from(`H 100644 ${oid} 0\t${path}\0`)], head);
    expect(readTreeDigestV1(repository)).toEqual(treeDigestV1FromState({
      head, index: [{ path, mode: "100644", oid, stage: 0 }], unstaged: [], untracked: [],
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
    const repository = root();
    writeFileSync(join(repository, "tracked.txt"), "base\n");
    mockIndex([Buffer.from(`H ${INDEX}`), Buffer.from(`H 100644 ${"c".repeat(40)} 0\ttracked.txt\0`)]);
    expectMetadataError(() => readTreeDigestV1(repository));
  });

  it.each([1, 2, 3])("retains unmerged worktree refusal for stage %s without diff-files", (stage) => {
    mockIndex([Buffer.from(`M 100644 ${OID} ${stage}\ttracked.txt\0`)], HEAD);
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
  // Zero worktree-reading Git calls (#591): no diff-files, no hash-object, and check-attr runs on both passes.
  it.each([{ modified: false, budget: 10 }, { modified: true, budget: 10 }])(
    "uses at most $budget Git launches with modified=$modified and zero worktree-reading Git commands", ({ modified, budget }) => {
      const value = nativeRepository();
      if (modified) writeFileSync(join(value, "tracked.txt"), "changed\n");
      control.calls = [];
      const observed = readTreeDigestV1(value);
      expect(observed.tracked_index_entry_count).toBe(1);
      expect(observed.unstaged_changed_count).toBe(modified ? 1 : 0);
      expect(control.calls.length).toBeLessThanOrEqual(budget);
      const subcommands = control.calls.map((call) => call[0]);
      expect(subcommands.filter((cmd) => cmd === "check-attr")).toHaveLength(2);
      expect(subcommands).not.toContain("diff-files");
      expect(subcommands).not.toContain("hash-object");
      for (const env of control.envs) {
        expect(env).toMatchObject({ GIT_NO_LAZY_FETCH: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" });
        expect(Object.keys(env).filter((key) => key.toUpperCase().startsWith("GIT_")).sort()).toEqual(
          ["GIT_NO_LAZY_FETCH", "GIT_OPTIONAL_LOCKS", "GIT_TERMINAL_PROMPT"],
        );
      }
      for (const prefix of control.prefixes) {
        expect(prefix).toEqual(expect.arrayContaining(["-c", "core.fsmonitor=false", "core.hooksPath=/dev/null", "diff.external=", "submodule.recurse=false", "protocol.allow=never", "filter.unset.clean=", "filter.unspecified.process="]));
      }
    }, 15_000,
  );
});
