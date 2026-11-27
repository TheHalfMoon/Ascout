import { closeSync, constants as fsConstants, fstatSync, lstatSync, openSync, readdirSync, readSync } from "node:fs";
import { basename, extname, join } from "node:path";

export const SECURITY_MAX_FILE_BYTES = 512 * 1024;
export const SECURITY_MAX_FILES = 1_500;

export const SECURITY_EXCLUDED_DIRS = new Set<string>([
  ".git",
  ".ascout",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".venv",
  "venv",
  "__pycache__",
  ".next",
  ".turbo",
  "target",
  ".pytest_cache",
  "vendor",
]);

const OPEN_READ_FLAGS = [
  fsConstants.O_RDONLY,
  fsConstants.O_NOFOLLOW,
  fsConstants.O_NONBLOCK,
]
  .filter((flag): flag is number => typeof flag === "number")
  .reduce((acc, flag) => acc | flag, 0);

const READ_CHUNK_BYTES = 64 * 1024;

export type SecurityFileCategoryV1 =
  | "js_ts"
  | "python"
  | "shell"
  | "github_workflow"
  | "dockerfile"
  | "mcp_config"
  | "dependency_manifest"
  | "json_or_env";

export type AttackSurfaceKindV1 =
  | "http_server"
  | "process_exec"
  | "filesystem_io"
  | "database_query"
  | "auth_boundary"
  | "ci_workflow"
  | "container_definition"
  | "mcp_tool_config"
  | "dependency_manifest";

export interface ScannedSecurityFileV1 {
  readonly path: string;
  readonly category: SecurityFileCategoryV1;
  readonly bytes: number;
  readonly content: string;
}

export interface OmittedSecurityFileV1 {
  readonly path: string;
  readonly reason: "symlink" | "oversized" | "binary" | "file_limit_exceeded" | "unreadable";
}

export interface SecurityReconResultV1 {
  readonly scanned_files: readonly ScannedSecurityFileV1[];
  readonly unsupported_files: readonly string[];
  readonly omitted_files: readonly OmittedSecurityFileV1[];
  readonly excluded_directories: readonly string[];
  readonly attack_surfaces: readonly AttackSurfaceKindV1[];
}

const JS_TS_EXTS = new Set<string>([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);

export function classifySecurityFileV1(relPath: string): SecurityFileCategoryV1 | null {
  const lower = relPath.toLowerCase();
  const base = basename(lower);
  const ext = extname(lower);
  if (lower.startsWith(".github/workflows/") && (ext === ".yml" || ext === ".yaml")) {
    return "github_workflow";
  }
  if (base === "dockerfile" || base.startsWith("dockerfile.") || base.endsWith(".dockerfile")) {
    return "dockerfile";
  }
  if (base === ".mcp.json" || base === "mcp.json" || base === "mcp-servers.json") {
    return "mcp_config";
  }
  if (
    base === "package.json" ||
    base === "package-lock.json" ||
    base === "requirements.txt" ||
    /^requirements-[a-z0-9_.-]+\.txt$/u.test(base)
  ) {
    return "dependency_manifest";
  }
  if (JS_TS_EXTS.has(ext)) return "js_ts";
  if (ext === ".py") return "python";
  if (ext === ".sh" || ext === ".bash") return "shell";
  if (base === ".env" || ext === ".json" || ext === ".env" || base.startsWith(".env.") || ext === ".yml" || ext === ".yaml" || ext === ".toml") {
    return "json_or_env";
  }
  return null;
}

export function isMatchingRegularFileV1(
  before: { readonly dev: bigint; readonly ino: bigint; isFile(): boolean },
  opened: { readonly dev: bigint; readonly ino: bigint; isFile(): boolean },
): boolean {
  return before.isFile() && opened.isFile() && opened.dev === before.dev && opened.ino === before.ino;
}

export interface ReadSafeSecurityFileOpsV1 {
  readonly lstat?: (path: string) => { readonly dev: bigint; readonly ino: bigint; isFile(): boolean } | undefined;
  readonly open?: (path: string, flags: number) => number;
  readonly fstat?: (fd: number) => { readonly dev: bigint; readonly ino: bigint; isFile(): boolean };
  readonly read?: (fd: number, buf: Buffer) => number;
  readonly close?: (fd: number) => void;
}

/**
 * Safely reads a regular, non-symlink file up to `maxBytes` using `lstatSync` + non-following
 * `openSync` + `fstatSync` `(dev, ino)` identity verification so leaf symlinks and TOCTOU swaps
 * fail closed on both POSIX and Windows.
 */
export function readSafeSecurityFileV1(
  absPath: string,
  maxBytes: number = SECURITY_MAX_FILE_BYTES,
  ops: ReadSafeSecurityFileOpsV1 = {},
):
  | { readonly kind: "ok"; readonly content: string; readonly bytes: number }
  | { readonly kind: "omitted"; readonly reason: "oversized" | "binary" | "unreadable" } {
  const lstatFn = ops.lstat ?? ((p: string) => lstatSync(p, { bigint: true, throwIfNoEntry: false }));
  const openFn = ops.open ?? openSync;
  const fstatFn = ops.fstat ?? ((fd: number) => fstatSync(fd, { bigint: true }));
  const readFn = ops.read ?? ((fd: number, buf: Buffer) => readSync(fd, buf, 0, buf.length, null));
  const closeFn = ops.close ?? closeSync;
  let fd: number | null = null;
  try {
    const before = lstatFn(absPath);
    if (before === undefined || !before.isFile()) {
      return { kind: "omitted", reason: "unreadable" };
    }
    fd = openFn(absPath, OPEN_READ_FLAGS);
    const opened = fstatFn(fd);
    if (!isMatchingRegularFileV1(before, opened)) return { kind: "omitted", reason: "unreadable" };
    const chunks: Buffer[] = [];
    const scratch = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, maxBytes + 1));
    let total = 0;
    for (;;) {
      const n = readFn(fd, scratch);
      if (n === 0) break;
      total += n;
      if (total > maxBytes) return { kind: "omitted", reason: "oversized" };
      chunks.push(Buffer.from(scratch.subarray(0, n)));
    }
    const merged = Buffer.concat(chunks, total);
    if (merged.includes(0)) return { kind: "omitted", reason: "binary" };
    return { kind: "ok", content: merged.toString("utf8"), bytes: total };
  } catch {
    return { kind: "omitted", reason: "unreadable" };
  } finally {
    if (fd !== null) closeFn(fd);
  }
}

function collectAttackSurfaces(
  category: SecurityFileCategoryV1,
  content: string,
  surfaces: Set<AttackSurfaceKindV1>,
): void {
  if (category === "github_workflow") surfaces.add("ci_workflow");
  else if (category === "dockerfile") surfaces.add("container_definition");
  else if (category === "mcp_config") surfaces.add("mcp_tool_config");
  else if (category === "dependency_manifest") surfaces.add("dependency_manifest");

  if (category === "js_ts" || category === "python") {
    if (/\b(?:node:http2?|express|fastify|koa|hono|flask|fastapi|django)\b/u.test(content)) {
      surfaces.add("http_server");
    }
    if (/\b(?:child_process|subprocess|os\.system)\b/u.test(content)) {
      surfaces.add("process_exec");
    }
    if (/\b(?:node:fs|pathlib|shutil)\b/u.test(content)) {
      surfaces.add("filesystem_io");
    }
    if (/\b(?:prisma|sqlalchemy|psycopg|mysql2?|sqlite3?|better-sqlite3)\b/u.test(content)) {
      surfaces.add("database_query");
    }
    if (/\b(?:jsonwebtoken|passport|oauth|bcrypt|argon2|express-session)\b/iu.test(content)) {
      surfaces.add("auth_boundary");
    }
  }
}

export interface SecurityReconOptionsV1 {
  readonly maxFileBytes?: number;
  readonly maxFiles?: number;
  readonly readdir?: (absDir: string) => readonly string[];
  readonly lstat?: (absPath: string) => { isSymbolicLink(): boolean; isDirectory(): boolean; isFile(): boolean };
}

/**
 * Walks `root` deterministically in lexicographic order without following symlinks, enforcing
 * file-size and file-count caps while recording every skipped/unsupported/unreadable path honestly.
 */
export function runSecurityReconV1(
  root: string,
  options: SecurityReconOptionsV1 = {},
): SecurityReconResultV1 {
  const maxFileBytes = options.maxFileBytes ?? SECURITY_MAX_FILE_BYTES;
  const maxFiles = options.maxFiles ?? SECURITY_MAX_FILES;
  const readDirFn = options.readdir ?? ((absDir: string) => readdirSync(absDir));
  const lstatFn = options.lstat ?? ((absPath: string) => lstatSync(absPath, { bigint: true }));
  const scanned: ScannedSecurityFileV1[] = [];
  const unsupported: string[] = [];
  const omitted: OmittedSecurityFileV1[] = [];
  const excludedDirs: string[] = [];
  const surfaces = new Set<AttackSurfaceKindV1>();

  const stack: Array<{ readonly abs: string; readonly rel: string }> = [{ abs: root, rel: "" }];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries: string[];
    try {
      entries = [...readDirFn(current.abs)].sort();
    } catch {
      omitted.push({ path: current.rel === "" ? "." : current.rel, reason: "unreadable" });
      continue;
    }
    const subdirs: Array<{ readonly abs: string; readonly rel: string }> = [];
    for (const name of entries) {
      const abs = join(current.abs, name);
      const rel = current.rel === "" ? name : `${current.rel}/${name}`;
      let stat: { isSymbolicLink(): boolean; isDirectory(): boolean; isFile(): boolean };
      try {
        stat = lstatFn(abs);
      } catch {
        omitted.push({ path: rel, reason: "unreadable" });
        continue;
      }
      if (stat.isSymbolicLink()) {
        omitted.push({ path: rel, reason: "symlink" });
        continue;
      }
      if (stat.isDirectory()) {
        if (SECURITY_EXCLUDED_DIRS.has(name)) {
          excludedDirs.push(rel);
          continue;
        }
        subdirs.push({ abs, rel });
        continue;
      }
      if (!stat.isFile()) {
        omitted.push({ path: rel, reason: "unreadable" });
        continue;
      }
      const category = classifySecurityFileV1(rel);
      if (category === null) {
        unsupported.push(rel);
        continue;
      }
      if (scanned.length >= maxFiles) {
        omitted.push({ path: rel, reason: "file_limit_exceeded" });
        continue;
      }
      const read = readSafeSecurityFileV1(abs, maxFileBytes);
      if (read.kind === "omitted") {
        omitted.push({ path: rel, reason: read.reason });
        continue;
      }
      collectAttackSurfaces(category, read.content, surfaces);
      scanned.push({ path: rel, category, bytes: read.bytes, content: read.content });
    }
    // Push in reverse so pop() visits subdirectories in ascending lexicographic order.
    for (let i = subdirs.length - 1; i >= 0; i -= 1) {
      stack.push(subdirs[i]!);
    }
  }

  scanned.sort((a, b) => (a.path < b.path ? -1 : 1));
  unsupported.sort();
  omitted.sort((a, b) => (a.path < b.path ? -1 : 1));
  excludedDirs.sort();

  return {
    scanned_files: scanned,
    unsupported_files: unsupported,
    omitted_files: omitted,
    excluded_directories: excludedDirs,
    attack_surfaces: [...surfaces].sort(),
  };
}
