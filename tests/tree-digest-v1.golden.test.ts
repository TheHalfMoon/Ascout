import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

type WorktreeType = "file" | "symlink";
type UnstagedState = "modified" | "deleted" | "type_changed";

interface IndexEntry {
  readonly path: string;
  readonly mode: string;
  readonly oid: string;
  readonly stage: number;
}

interface UnstagedEntry {
  readonly path: string;
  readonly state: UnstagedState;
  readonly type?: WorktreeType;
  readonly mode?: string;
  readonly digest?: string;
}

interface UntrackedEntry {
  readonly path: string;
  readonly type: WorktreeType;
  readonly mode: string;
  readonly digest: string;
  readonly ignored: boolean;
}

interface TreeState {
  readonly head: string;
  readonly index: readonly IndexEntry[];
  readonly unstaged: readonly UnstagedEntry[];
  readonly untracked: readonly UntrackedEntry[];
}

const HEAD = "a".repeat(40);
const BASE_INDEX: readonly IndexEntry[] = [
  { path: "src/app.ts", mode: "100644", oid: "1".repeat(40), stage: 0 },
  { path: "tests/__snapshots__/ui.snap", mode: "100644", oid: "2".repeat(40), stage: 0 },
];

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function frame(value: string): Buffer {
  const bytes = Buffer.from(value, "utf8");
  return Buffer.concat([Buffer.from(`${bytes.length}:`, "ascii"), bytes]);
}

function isAscoutRuntimePath(path: string): boolean {
  return path === ".ascout" || path.startsWith(".ascout/");
}

// T010 executable design oracle only. T019 adds the production implementation.
// Each canonical UTF-8 field is encoded as <decimal-byte-length>:<field-bytes>.
// Variable-length sections are explicitly tagged and counted before sorted records.
function canonicalTreeFields(state: TreeState): string[] {
  const index = [...state.index].sort((a, b) =>
    a.path.localeCompare(b.path) ||
    a.stage - b.stage ||
    a.mode.localeCompare(b.mode) ||
    a.oid.localeCompare(b.oid),
  );
  const unstaged = [...state.unstaged].sort((a, b) => a.path.localeCompare(b.path));
  const untracked = state.untracked
    .filter((entry) => !entry.ignored && !isAscoutRuntimePath(entry.path))
    .sort((a, b) => a.path.localeCompare(b.path));

  const fields = ["ascout-tree-v1", state.head, "index", String(index.length)];

  for (const entry of index) {
    fields.push("index-entry", entry.mode, entry.oid, String(entry.stage), entry.path);
  }

  fields.push("unstaged", String(unstaged.length));
  for (const entry of unstaged) {
    fields.push("unstaged-entry", entry.path, entry.state);
    if (entry.state === "deleted") {
      fields.push("deleted");
      continue;
    }

    if (entry.type === undefined || entry.mode === undefined || entry.digest === undefined) {
      throw new Error(`incomplete unstaged entry: ${entry.path}`);
    }
    fields.push(entry.type, entry.mode, entry.digest);
  }

  fields.push("untracked", String(untracked.length));
  for (const entry of untracked) {
    fields.push("untracked-entry", entry.path, entry.type, entry.mode, entry.digest);
  }

  return fields;
}

function treeDigestV1(state: TreeState): string {
  const hash = createHash("sha256");
  for (const field of canonicalTreeFields(state)) hash.update(frame(field));
  return hash.digest("hex");
}

function cleanState(): TreeState {
  return { head: HEAD, index: BASE_INDEX, unstaged: [], untracked: [] };
}

const GOLDEN = {
  clean: "368364c24d47714d6645ff1b098160280d363451dd1bd594853e4ec3bdc3ad82",
  staged: "e4c8566d6ae1633dc8472974ad1ed0e524334c4b0f878e4ca99bab68fa8fa5d6",
  unstaged: "bd41af5b7e6c49b5dab8333428323143319b5425696cc04aa22f38a8e597e0a9",
  deletion: "d7f21bff1d9c29b0887654548ff1dc3c520e3109bbc93798a1a580cefae061fd",
  symlink: "a591e715c4dfcd9adc1e3edda7070959b847ea5fc3b46874bda1513e5d524353",
  mode: "42be8e0497be224db269b0f2da0f1a945b14f26661cdddfe82595cd3a48adb03",
  type: "018630f3aa90b43a1f0c9a6926dfbc2a1ce1e725754f57d49ea732f6c257c44d",
  untracked: "b1aab29b5e465e44224145254caa51b3f9f371f7e1414e3799a1f13ad9be6cc7",
  snapshot: "08ed4832503efb7087fc38de9558a20409fc692085eb694475abffa89ff7c59d",
} as const;

describe("T010 tree_digest_v1 golden contract", () => {
  it("pins the clean tree digest and is input-order invariant", () => {
    const clean = cleanState();
    expect(treeDigestV1(clean)).toBe(GOLDEN.clean);

    const reordered: TreeState = {
      ...clean,
      index: [...clean.index].reverse(),
    };
    expect(treeDigestV1(reordered)).toBe(GOLDEN.clean);
  });

  it("changes when the staged index object changes", () => {
    const staged: TreeState = {
      ...cleanState(),
      index: [
        { ...BASE_INDEX[0]!, oid: "3".repeat(40) },
        BASE_INDEX[1]!,
      ],
    };

    expect(treeDigestV1(staged)).toBe(GOLDEN.staged);
    expect(treeDigestV1(staged)).not.toBe(GOLDEN.clean);
  });

  it("changes for unstaged content and deletion state", () => {
    const unstaged: TreeState = {
      ...cleanState(),
      unstaged: [{
        path: "src/app.ts",
        state: "modified",
        type: "file",
        mode: "100644",
        digest: sha256Text("console.log('changed')\n"),
      }],
    };
    const deletion: TreeState = {
      ...cleanState(),
      unstaged: [{ path: "src/app.ts", state: "deleted" }],
    };

    expect(treeDigestV1(unstaged)).toBe(GOLDEN.unstaged);
    expect(treeDigestV1(deletion)).toBe(GOLDEN.deletion);
    expect(treeDigestV1(unstaged)).not.toBe(treeDigestV1(deletion));
  });

  it("binds symlink target, executable mode, and type-change state", () => {
    const targetDigest = sha256Text("../lib/app.ts");
    const symlink: TreeState = {
      ...cleanState(),
      unstaged: [{
        path: "src/app.ts",
        state: "modified",
        type: "symlink",
        mode: "120000",
        digest: targetDigest,
      }],
    };
    const modeChanged: TreeState = {
      ...cleanState(),
      unstaged: [{
        path: "src/app.ts",
        state: "modified",
        type: "file",
        mode: "100755",
        digest: sha256Text("console.log('base')\n"),
      }],
    };
    const normalModeSameContent: TreeState = {
      ...cleanState(),
      unstaged: [{
        path: "src/app.ts",
        state: "modified",
        type: "file",
        mode: "100644",
        digest: sha256Text("console.log('base')\n"),
      }],
    };
    const typeChanged: TreeState = {
      ...cleanState(),
      unstaged: [{
        path: "src/app.ts",
        state: "type_changed",
        type: "symlink",
        mode: "120000",
        digest: targetDigest,
      }],
    };

    expect(treeDigestV1(symlink)).toBe(GOLDEN.symlink);
    expect(treeDigestV1(modeChanged)).toBe(GOLDEN.mode);
    expect(treeDigestV1(typeChanged)).toBe(GOLDEN.type);
    expect(treeDigestV1(modeChanged)).not.toBe(treeDigestV1(normalModeSameContent));
    expect(treeDigestV1(typeChanged)).not.toBe(treeDigestV1(symlink));
  });

  it("includes every nonignored untracked path and excludes ignored plus .ascout runtime state", () => {
    const untracked: readonly UntrackedEntry[] = [
      { path: "notes.txt", type: "file", mode: "100644", digest: sha256Text("notes\n"), ignored: false },
      { path: "scratch.bin", type: "file", mode: "100644", digest: sha256Text("\u0000\u0001"), ignored: false },
      { path: "tmp/keep.json", type: "file", mode: "100644", digest: sha256Text("{}\n"), ignored: false },
      { path: "ignored.log", type: "file", mode: "100644", digest: sha256Text("ignored\n"), ignored: true },
      { path: ".ascout/runs/r1/out.txt", type: "file", mode: "100644", digest: sha256Text("run evidence\n"), ignored: false },
    ];
    const state: TreeState = { ...cleanState(), untracked };

    expect(treeDigestV1(state)).toBe(GOLDEN.untracked);
    expect(treeDigestV1({ ...state, untracked: [...untracked].reverse() })).toBe(GOLDEN.untracked);

    for (const path of ["notes.txt", "scratch.bin", "tmp/keep.json"]) {
      expect(treeDigestV1({
        ...state,
        untracked: untracked.filter((entry) => entry.path !== path),
      })).not.toBe(GOLDEN.untracked);
    }

    expect(treeDigestV1({
      ...state,
      untracked: untracked.filter((entry) => entry.path !== "ignored.log"),
    })).toBe(GOLDEN.untracked);
    expect(treeDigestV1({
      ...state,
      untracked: untracked.filter((entry) => !isAscoutRuntimePath(entry.path)),
    })).toBe(GOLDEN.untracked);
  });

  it("never omits a tracked snapshot mutation", () => {
    const snapshotMutation: TreeState = {
      ...cleanState(),
      unstaged: [{
        path: "tests/__snapshots__/ui.snap",
        state: "modified",
        type: "file",
        mode: "100644",
        digest: sha256Text('exports[`ui`] = `"changed"`;\n'),
      }],
    };

    expect(treeDigestV1(snapshotMutation)).toBe(GOLDEN.snapshot);
    expect(treeDigestV1(snapshotMutation)).not.toBe(GOLDEN.clean);
  });
});
