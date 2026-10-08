#!/usr/bin/env node
/**
 * Offline FD8 reslice preflight. Evidence only: never merges, checks out,
 * creates branches, fetches, changes repository files, or approves FD8.
 * Run ONLY inside an owner-trusted Ascout checkout containing both pins.
 */
import { readFileSync } from "node:fs";
import { dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SHA = /^[a-f0-9]{40}$/u;
const MAX_FILES = 12;
const MAX_ADDED = 400;

function safePath(p) {
  return typeof p === "string" && p.startsWith("docs/strategy/") &&
    !p.split("/").some(s => !s || s === "." || s === "..");
}
function linkTargets(content) {
  const links = [];
  for (const match of content.matchAll(/\]\(([^)\s]+)\)/gu)) {
    const target = match[1].split("#")[0].split("?")[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/iu.test(target) || target.startsWith("/")) continue;
    links.push(target);
  }
  return links;
}
export function auditFd8Split({ manifest, changed, contents, basePaths }) {
  const errors = [];
  const groups = [];
  const owners = new Map();
  const entries = new Map();
  if (manifest?.schema !== "ascout.fd8.reslice-manifest/v1" ||
      manifest?.review_state !== "NOT_RATIFIED" ||
      !SHA.test(manifest?.base_head ?? "") || !SHA.test(manifest?.source_head ?? "") ||
      !Array.isArray(manifest?.groups) || manifest.groups.length < 2) {
    throw new TypeError("manifest is not an explicitly unratified pinned FD8 manifest");
  }
  if (!Array.isArray(changed) || !(contents instanceof Map) || !(basePaths instanceof Set)) {
    throw new TypeError("audit input must include diff, content map and base path set");
  }
  for (const item of changed) {
    if (!safePath(item.path) || !Number.isSafeInteger(item.added) ||
        item.added < 0 || item.deleted !== 0 || entries.has(item.path)) {
      errors.push("invalid root diff entry: " + String(item.path));
    } else entries.set(item.path, item);
  }
  for (const [i, group] of manifest.groups.entries()) {
    if (typeof group.id !== "string" || !/^FD8-B-R[1-9][0-9]*$/u.test(group.id) ||
        !Array.isArray(group.files) || group.files.length === 0) {
      errors.push("invalid group at index " + i);
      continue;
    }
    let added = 0;
    for (const path of group.files) {
      if (!safePath(path) || owners.has(path)) {
        errors.push("duplicated or unsafe path " + String(path));
        continue;
      }
      owners.set(path, i);
      const row = entries.get(path);
      if (!row) errors.push("missing source diff entry " + path);
      else added += row.added;
    }
    if (group.files.length > MAX_FILES || added > MAX_ADDED) errors.push(group.id + " exceeds scope");
    groups.push({ id: group.id, files: group.files.length, added });
  }
  for (const path of entries.keys()) {
    if (!owners.has(path)) errors.push("unassigned source file " + path);
    if (!contents.has(path)) errors.push("unreadable pinned source file " + path);
  }

  const forwardLinks = [];
  const missingLinks = [];
  const crossings = new Set();
  for (const [from, fromGroup] of owners) {
    const body = contents.get(from);
    if (typeof body !== "string") continue;
    for (const ref of linkTargets(body)) {
      const to = posix.normalize(posix.join(posix.dirname(from), ref));
      if (!safePath(to)) {
        missingLinks.push({ from, to });
        continue;
      }
      const toGroup = owners.get(to);
      if (toGroup !== undefined) {
        if (toGroup !== fromGroup) crossings.add(fromGroup + ">" + toGroup);
        if (toGroup > fromGroup) forwardLinks.push({ from, to });
      } else if (!basePaths.has(to)) {
        missingLinks.push({ from, to });
      }
    }
  }
  const cycles = [...crossings].filter(edge => {
    const [from, to] = edge.split(">");
    return crossings.has(to + ">" + from) && Number(from) < Number(to);
  });
  const state = errors.length || missingLinks.length ? "INVALID_SOURCE_OR_LINKS" :
    forwardLinks.length ? "BLOCKED_FORWARD_LINKS" : "LINK_ORDER_READY_ONLY";
  return {
    schema: "ascout.fd8.reslice-audit/v1",
    source_head: manifest.source_head,
    base_head: manifest.base_head,
    state,
    founder_decision: "PENDING",
    independently_reviewed: false,
    merge_authorized: false,
    groups,
    counts: { source_files: entries.size, mapped_files: owners.size,
      source_added: [...entries.values()].reduce((n, x) => n + x.added, 0) },
    errors, missingLinks, forwardLinks, crossGroupCycles: cycles,
  };
}

function git(args) {
  // Read-only Git operations within a trusted owner checkout; not an
  // authorization to inspect attacker-controlled repositories.
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_/iu.test(k)));
  env.GIT_CONFIG_GLOBAL = "/dev/null";
  env.GIT_CONFIG_SYSTEM = "/dev/null";
  env.GIT_TERMINAL_PROMPT = "0";
  const p = spawnSync("git", ["-c", "core.hooksPath=/dev/null",
    "-c", "core.fsmonitor=false", "-c", "diff.external=", ...args],
    { encoding: "utf8", env, timeout: 15000, maxBuffer: 8 * 1024 * 1024, shell: false });
  if (p.status !== 0) throw new Error("read-only Git query failed: " + (p.stderr || p.error?.message || "unknown"));
  return p.stdout;
}
export function runPinnedFd8Audit(manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!SHA.test(manifest.base_head ?? "") || !SHA.test(manifest.source_head ?? "")) {
    throw new TypeError("invalid pinned root identity");
  }
  const rows = git(["diff", "--no-ext-diff", "--no-renames", "--numstat",
    manifest.base_head, manifest.source_head, "--"]).trim().split("\n").filter(Boolean);
  const changed = rows.map(row => {
    const [a, d, path] = row.split("\t");
    return { path, added: Number(a), deleted: Number(d) };
  });
  const basePaths = new Set(git(["ls-tree", "-r", "--name-only", manifest.base_head])
    .split("\n").filter(Boolean));
  const contents = new Map(changed.filter(x => safePath(x.path)).map(({ path }) =>
    [path, git(["show", manifest.source_head + ":" + path])]));
  return auditFd8Split({ manifest, changed, contents, basePaths });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const path = process.argv[2] ?? fileURLToPath(new URL("./fd8-root-manifest.json", import.meta.url));
    const report = runPinnedFd8Audit(path);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.state === "LINK_ORDER_READY_ONLY" ? 0 : 2;
  } catch (error) {
    console.error("FD8 audit error: " + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 3;
  }
}
