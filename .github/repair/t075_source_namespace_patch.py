from __future__ import annotations

import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit("usage: t075_source_namespace_patch.py <candidate-root>")
root = Path(sys.argv[1]).resolve()


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one guarded replacement, found {count}")
    path.write_text(text.replace(old, new, 1))


harness = root / "benchmarks" / "harness-lib.mjs"
replace_once(
    harness,
    '''export function attestSourceStability(startDigest, endDigest, reported) {\n  if (typeof startDigest !== "string" || startDigest.length === 0 || typeof endDigest !== "string" || endDigest.length === 0) {\n    fail("binding_integrity", "independent source-state digests must be non-empty strings");\n  }\n  const actual = startDigest === endDigest ? "stable" : "tree_drifted";\n  if (reported !== actual) {\n    fail("binding_integrity", `Ascout reported source stability ${String(reported)} but independent Git state is ${actual}`);\n  }\n  return actual;\n}\n\nexport function sha256Bytes(bytes) {''',
    '''export function attestSourceStability(startDigest, endDigest, reported) {\n  if (typeof startDigest !== "string" || startDigest.length === 0 || typeof endDigest !== "string" || endDigest.length === 0) {\n    fail("binding_integrity", "independent source-state digests must be non-empty strings");\n  }\n  const actual = startDigest === endDigest ? "stable" : "tree_drifted";\n  if (reported !== actual) {\n    fail("binding_integrity", `Ascout reported source stability ${String(reported)} but independent Git state is ${actual}`);\n  }\n  return actual;\n}\n\nexport function filterAscoutRuntimeUntrackedStatus(statusBytes) {\n  if (!Buffer.isBuffer(statusBytes)) fail("binding_integrity", "source-state status must be a Buffer");\n  if (statusBytes.length === 0) return Buffer.alloc(0);\n  if (statusBytes[statusBytes.length - 1] !== 0) fail("binding_integrity", "source-state status must be NUL-terminated");\n  const prefix = Buffer.from("?? .ascout", "utf8");\n  const kept = [];\n  let start = 0;\n  for (let index = 0; index < statusBytes.length; index += 1) {\n    if (statusBytes[index] !== 0) continue;\n    const record = statusBytes.subarray(start, index);\n    start = index + 1;\n    const runtimeUntracked = record.length >= prefix.length\n      && record.subarray(0, prefix.length).equals(prefix)\n      && (record.length === prefix.length || record[prefix.length] === 0x2f);\n    if (runtimeUntracked) continue;\n    kept.push(record, Buffer.from([0]));\n  }\n  return Buffer.concat(kept);\n}\n\nexport function sha256Bytes(bytes) {''',
)

run = root / "benchmarks" / "run.mjs"
replace_once(
    run,
    '''  attestSourceStability,\n  assertControllerSecretsAbsent,''',
    '''  attestSourceStability,\n  filterAscoutRuntimeUntrackedStatus,\n  assertControllerSecretsAbsent,''',
)
replace_once(
    run,
    '''  const status = await runGit(repo, ["status", "--porcelain=v1", "-z", "--untracked-files=all"], env);\n  const unstaged = await runGit(repo, ["diff", "--binary", "--no-ext-diff", "HEAD", "--"], env);\n  const staged = await runGit(repo, ["diff", "--cached", "--binary", "--no-ext-diff", "HEAD", "--"], env);\n  return sha256Bytes(Buffer.concat([\n    Buffer.from("status\\0", "utf8"), status.stdout,''',
    '''  const status = await runGit(repo, ["status", "--porcelain=v1", "-z", "--untracked-files=all"], env);\n  const sourceStatus = filterAscoutRuntimeUntrackedStatus(status.stdout);\n  const unstaged = await runGit(repo, ["diff", "--binary", "--no-ext-diff", "HEAD", "--"], env);\n  const staged = await runGit(repo, ["diff", "--cached", "--binary", "--no-ext-diff", "HEAD", "--"], env);\n  return sha256Bytes(Buffer.concat([\n    Buffer.from("status\\0", "utf8"), sourceStatus,''',
)

tests = root / "tests" / "benchmark-harness.test.ts"
replace_once(
    tests,
    '''  attestSourceStability,\n  canonicalJson,''',
    '''  attestSourceStability,\n  filterAscoutRuntimeUntrackedStatus,\n  canonicalJson,''',
)
replace_once(
    tests,
    '''  it("attests reported source stability against independent Git-state digests", () => {\n    expect(attestSourceStability("same", "same", "stable")).toBe("stable");\n    expect(attestSourceStability("before", "after", "tree_drifted")).toBe("tree_drifted");\n    expect(() => attestSourceStability("before", "after", "stable")).toThrowError(/independent Git state is tree_drifted/);\n    expect(() => attestSourceStability("same", "same", "tree_drifted")).toThrowError(/independent Git state is stable/);\n  });\n\n  it("canonicalizes evidence objects independently of insertion order", () => {''',
    '''  it("attests reported source stability against independent Git-state digests", () => {\n    expect(attestSourceStability("same", "same", "stable")).toBe("stable");\n    expect(attestSourceStability("before", "after", "tree_drifted")).toBe("tree_drifted");\n    expect(() => attestSourceStability("before", "after", "stable")).toThrowError(/independent Git state is tree_drifted/);\n    expect(() => attestSourceStability("same", "same", "tree_drifted")).toThrowError(/independent Git state is stable/);\n  });\n\n  it("excludes only untracked Ascout runtime records from independent source status", () => {\n    const raw = Buffer.from(\n      " M src/a.ts\\0?? .ascout/runs/1/receipt.json\\0?? .ascout\\0?? notes.txt\\0 M .ascout/tracked.txt\\0",\n      "utf8",\n    );\n    expect(filterAscoutRuntimeUntrackedStatus(raw).toString("utf8")).toBe(\n      " M src/a.ts\\0?? notes.txt\\0 M .ascout/tracked.txt\\0",\n    );\n    expect(() => filterAscoutRuntimeUntrackedStatus(Buffer.from("?? .ascout/file", "utf8"))).toThrowError(/NUL-terminated/);\n  });\n\n  it("canonicalizes evidence objects independently of insertion order", () => {''',
)
