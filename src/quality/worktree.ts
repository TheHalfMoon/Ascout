/**
 * Spec 015 first-wedge slice 5: disposable isolated candidate worktree.
 *
 * Materializes candidate proposals into a disposable native git worktree
 * pinned to the exact source tree the proposal targets, so core product
 * source stays read-only while candidates are evaluated. Every boundary
 * fails closed: the worktree is verified at its exact tree before use,
 * proposals bound to another tree are refused materialization, writes
 * that escape the worktree are refused, and disposal removes the
 * worktree through git before anything else is touched. Candidate test
 * bodies remain caller-supplied model or template proposals; this module
 * binds them to isolated execution state without executing them.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import type { CandidateProposal } from "./candidate.js";

export interface CandidateWorktree {
  readonly path: string;
  readonly parent_dir: string;
  readonly repo_root: string;
  readonly tree_id: string;
}

const WORKTREE_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/u;
const EXACT_ID = /^[0-9a-f]{40}$/u;
const GIT_TIMEOUT_MS = 60_000;

function requireAbsoluteDir(value: string, field: string): void {
  if (value.length === 0 || !isAbsolute(value)) {
    throw new TypeError(`${field} must be an absolute path`);
  }
}

function runGit(cwd: string, args: readonly string[]): string {
  try {
    return execFileSync("git", [...args], {
      cwd,
      encoding: "utf8",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      stdio: ["ignore", "pipe", "pipe"],
      timeout: GIT_TIMEOUT_MS,
    });
  } catch {
    throw new Error(`git ${args[0] ?? "command"} failed`);
  }
}

/**
 * Resolves a repo-relative path strictly inside root. Absolute paths and
 * dot-segment escapes throw instead of resolving to surprising targets.
 */
function resolveInside(root: string, rel: string): string {
  if (rel.length === 0) {
    throw new TypeError("path must be non-empty");
  }
  if (isAbsolute(rel)) {
    throw new TypeError("path must be repo-relative");
  }
  const resolved = resolve(root, rel);
  if (resolved !== root && !resolved.startsWith(root + sep)) {
    throw new TypeError("path escapes its root");
  }
  return resolved;
}

/**
 * Creates a disposable worktree pinned to the exact source tree and
 * verifies its identity before returning. The target name must be
 * unused; nothing is ever overwritten.
 */
export function createCandidateWorktree(input: {
  readonly repo_root: string;
  readonly tree_id: string;
  readonly parent_dir: string;
  readonly name: string;
}): CandidateWorktree {
  requireAbsoluteDir(input.repo_root, "repo_root");
  requireAbsoluteDir(input.parent_dir, "parent_dir");
  if (!EXACT_ID.test(input.tree_id)) {
    throw new TypeError("tree_id must be an exact 40-hex source identity");
  }
  if (!WORKTREE_NAME.test(input.name)) {
    throw new TypeError("name must be a safe worktree slug");
  }
  if (!existsSync(input.parent_dir)) {
    throw new TypeError("parent_dir must exist");
  }
  const target = resolveInside(input.parent_dir, input.name);
  if (existsSync(target)) {
    throw new TypeError("worktree target already exists");
  }
  runGit(input.repo_root, [
    "worktree",
    "add",
    "--detach",
    target,
    input.tree_id,
  ]);
  const head = runGit(target, ["rev-parse", "HEAD"]).trim();
  if (head !== input.tree_id) {
    throw new Error("worktree identity mismatch after creation");
  }
  if (runGit(target, ["status", "--porcelain"]).trim() !== "") {
    throw new Error("fresh worktree is not clean");
  }
  return {
    parent_dir: input.parent_dir,
    path: target,
    repo_root: input.repo_root,
    tree_id: input.tree_id,
  };
}

/** Returns the verified HEAD or throws when the worktree drifted. */
export function verifyCandidateWorktreeIdentity(
  worktree: CandidateWorktree,
): string {
  const head = runGit(worktree.path, ["rev-parse", "HEAD"]).trim();
  if (head !== worktree.tree_id) {
    throw new Error("candidate worktree drifted from its pinned tree");
  }
  return head;
}

/**
 * Writes a proposed candidate into the worktree only. Refuses proposals
 * bound to another tree, rejected proposals, and any test file that does
 * not resolve strictly inside the worktree. Core source is never written.
 */
export function materializeProposal(
  worktree: CandidateWorktree,
  proposal: CandidateProposal,
): string {
  if (proposal.source_id !== worktree.tree_id) {
    throw new TypeError("proposal targets another source tree");
  }
  if (proposal.status !== "proposed") {
    throw new TypeError("only a proposed candidate may be materialized");
  }
  const destination = resolveInside(worktree.path, proposal.test_file);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, proposal.body, "utf8");
  return destination;
}

/**
 * Disposes the worktree through git and verifies it is gone. Refuses to
 * touch anything outside the recorded parent directory, and never the
 * parent directory itself or the core repository root.
 */
export function disposeCandidateWorktree(
  worktree: CandidateWorktree,
): void {
  const resolved = resolve(worktree.path);
  if (
    resolved === resolve(worktree.parent_dir) ||
    (!resolved.startsWith(resolve(worktree.parent_dir) + sep))
  ) {
    throw new TypeError("worktree path escapes its parent directory");
  }
  if (resolved === resolve(worktree.repo_root)) {
    throw new TypeError("refusing to dispose the repository root");
  }
  runGit(worktree.repo_root, [
    "worktree",
    "remove",
    "--force",
    worktree.path,
  ]);
  runGit(worktree.repo_root, ["worktree", "prune"]);
  if (existsSync(worktree.path)) {
    rmSync(worktree.path, { force: true, recursive: true });
  }
  if (existsSync(worktree.path)) {
    throw new Error("worktree disposal left state behind");
  }
}
