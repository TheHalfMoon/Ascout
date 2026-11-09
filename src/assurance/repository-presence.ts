import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Whether `start` or a parent holds a `.git` entry, the way Git finds a work tree. A command uses
 * this to tell "not in a repository" (nothing to verify, exit 4) from a Git failure inside one
 * (an error, exit 2). It reads no repository content and runs no Git.
 */
export function looksInsideGitWorkTreeV1(start: string): boolean {
  let current = resolve(start);
  while (true) {
    if (existsSync(join(current, ".git"))) return true;
    const parent = dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}
