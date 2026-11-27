/**
 * Pure, deterministic Git blob normalization, binary detection, zero-context line diffing, and
 * rename-similarity helpers. Running these in-process over single-open worktree file descriptors
 * and Git object-store blobs lets Ascout avoid every Git subprocess that reads working-tree files
 * (and could therefore invoke repository-controlled clean/process filters under concurrent mutation,
 * Issue #591).
 */

export type LineRange = readonly [number, number];

const BINARY_SNIFF_BYTES = 8000;
const MAX_MYERS_EDIT_DISTANCE = 1024;

/** Parses Git boolean config values (`true|yes|on|1|""` vs `false|no|off|0`). */
export function parseGitBoolean(rawValue: string, fallback: boolean): boolean {
  const value = rawValue.trim().toLowerCase();
  if (value === "" || value === "true" || value === "yes" || value === "on" || value === "1") return true;
  if (value === "false" || value === "no" || value === "off" || value === "0") return false;
  return fallback;
}

/** Matches Git's `buffer_is_binary`: any NUL byte in the first 8000 bytes marks binary data. */
export function isBinaryBytes(bytes: Buffer): boolean {
  const limit = Math.min(bytes.length, BINARY_SNIFF_BYTES);
  for (let index = 0; index < limit; index += 1) {
    if (bytes[index] === 0) return true;
  }
  return false;
}

/**
 * Matches Git's `crlf_to_git` normalization decision for regular files when no filter runs.
 * Explicit `-text` (`"unset"`) disables conversion; `text`, `text=auto`, `eol=lf`, `eol=crlf`,
 * or `core.autocrlf=true|input` enable CRLF->LF conversion for non-binary files.
 */
export function shouldNormalizeWorktreeEol(
  textAttr: string,
  eolAttr: string,
  coreAutocrlf: string,
): boolean {
  if (textAttr === "unset") return false;
  if (textAttr === "set" || textAttr === "auto" || eolAttr === "lf" || eolAttr === "crlf") {
    return true;
  }
  const normalizedAutocrlf = coreAutocrlf.trim().toLowerCase();
  return normalizedAutocrlf === "input" || parseGitBoolean(normalizedAutocrlf, false);
}

/** Converts `\r\n` sequences to `\n` with zero allocation when no `\r\n` exists. */
export function normalizeCrlfToLf(bytes: Buffer): Buffer {
  if (bytes.indexOf(0x0d) === -1) return bytes;
  let crlfCount = 0;
  for (let index = 0; index < bytes.length - 1; index += 1) {
    if (bytes[index] === 0x0d && bytes[index + 1] === 0x0a) crlfCount += 1;
  }
  if (crlfCount === 0) return bytes;
  const out = Buffer.allocUnsafe(bytes.length - crlfCount);
  let writePos = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index]!;
    if (byte === 0x0d && bytes[index + 1] === 0x0a) continue;
    out[writePos] = byte;
    writePos += 1;
  }
  return out;
}

/** Splits text bytes into 1-based diff lines, preserving exact trailing-newline differences. */
export function splitLinesForDiff(bytes: Buffer): readonly string[] {
  if (bytes.length === 0) return [];
  const text = bytes.toString("latin1");
  const lines: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 0x0a) {
      lines.push(text.slice(start, index + 1));
      start = index + 1;
    }
  }
  if (start < text.length) lines.push(text.slice(start));
  return lines;
}

function mergeLineRanges(lines: readonly number[]): readonly LineRange[] {
  if (lines.length === 0) return [];
  const ranges: LineRange[] = [];
  let start = lines[0]!;
  let end = start;
  for (let index = 1; index < lines.length; index += 1) {
    const current = lines[index]!;
    if (current === end + 1) {
      end = current;
    } else {
      ranges.push([start, end]);
      start = current;
      end = current;
    }
  }
  ranges.push([start, end]);
  return ranges;
}

/**
 * Computes exact 1-based inclusive changed new-line ranges (matching `git diff --unified=0`)
 * between `oldBytes` and `newBytes` using a bounded Myers O(ND) diff over the trimmed differing
 * middle window (storing only the active `[-d..+d]` diagonal slice per step to bound memory).
 * If a massive rewrite exceeds the edit-distance budget, falls back conservatively to the entire
 * differing new-line window so no changed line is ever dropped.
 */
export function changedNewLineRangesFromBytes(oldBytes: Buffer, newBytes: Buffer): readonly LineRange[] {
  const oldLines = splitLinesForDiff(oldBytes);
  const newLines = splitLinesForDiff(newBytes);

  let prefix = 0;
  const minLen = Math.min(oldLines.length, newLines.length);
  while (prefix < minLen && oldLines[prefix] === newLines[prefix]) {
    prefix += 1;
  }

  let oldEnd = oldLines.length;
  let newEnd = newLines.length;
  while (oldEnd > prefix && newEnd > prefix && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }

  const a = oldLines.slice(prefix, oldEnd);
  const b = newLines.slice(prefix, newEnd);
  const n = a.length;
  const m = b.length;

  if (m === 0) return [];
  if (n === 0) return [[prefix + 1, prefix + m]];

  const maxD = Math.min(n + m, MAX_MYERS_EDIT_DISTANCE);
  const offset = maxD;
  const v = new Int32Array(2 * maxD + 1);
  const trace: Int32Array[] = [];

  let foundD = -1;
  for (let d = 0; d <= maxD; d += 1) {
    trace.push(v.slice(offset - d, offset + d + 1));
    for (let k = -d; k <= d; k += 2) {
      const kIdx = offset + k;
      let x: number;
      if (k === -d || (k !== d && v[kIdx - 1]! < v[kIdx + 1]!)) {
        x = v[kIdx + 1]!;
      } else {
        x = v[kIdx - 1]! + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x += 1;
        y += 1;
      }
      v[kIdx] = x;
      if (x >= n && y >= m) {
        foundD = d;
        break;
      }
    }
    if (foundD >= 0) break;
  }

  if (foundD < 0) {
    return [[prefix + 1, prefix + m]];
  }

  // Backtrack Myers trace to collect inserted new-line indices (1-based).
  const inserted: number[] = [];
  let x = n;
  let y = m;
  for (let d = foundD; d > 0; d -= 1) {
    const prev = trace[d]!;
    const k = x - y;
    const prevK = (k === -d || (k !== d && prev[d + k - 1]! < prev[d + k + 1]!)) ? k + 1 : k - 1;
    const prevX = prev[d + prevK]!;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      x -= 1;
      y -= 1;
    }
    if (x === prevX) {
      inserted.push(prefix + y);
    }
    x = prevX;
    y = prevY;
  }
  inserted.reverse();
  return mergeLineRanges(inserted);
}

export interface GitCoreWorktreeConfig {
  readonly autocrlf: string;
  readonly fileMode: boolean;
  readonly symlinks: boolean;
}

/** Parses `git config --get-regexp ^core\.(autocrlf|filemode|symlinks)$` output. */
export function parseGitCoreWorktreeConfig(stdoutText: string): GitCoreWorktreeConfig {
  let autocrlf = "false";
  let fileMode = true;
  let symlinks = true;
  for (const line of stdoutText.split(/\r?\n/u)) {
    if (line === "") continue;
    const space = line.indexOf(" ");
    const key = (space < 0 ? line : line.slice(0, space)).toLowerCase();
    const value = space < 0 ? "true" : line.slice(space + 1).trim().toLowerCase();
    if (key === "core.autocrlf") autocrlf = value;
    else if (key === "core.filemode") fileMode = parseGitBoolean(value, true);
    else if (key === "core.symlinks") symlinks = parseGitBoolean(value, true);
  }
  return { autocrlf, fileMode, symlinks };
}

export interface OpenedWorktreeFileCheck {
  readonly contained: boolean;
  readonly beforeDev: bigint;
  readonly beforeIno: bigint;
  readonly openedIsFile: boolean;
  readonly openedDev: bigint;
  readonly openedIno: bigint;
  readonly afterDev: bigint;
  readonly afterIno: bigint;
}

/** True iff the opened descriptor is a regular in-repository file matching pre- and post-open identity. */
export function isConsistentOpenedWorktreeFile(check: OpenedWorktreeFileCheck): boolean {
  return check.openedIsFile &&
    check.contained &&
    check.openedDev === check.beforeDev &&
    check.openedIno === check.beforeIno &&
    check.afterDev === check.openedDev &&
    check.afterIno === check.openedIno;
}

/** Parses `git cat-file --batch` stdout for an exact ordered list of expected blob OIDs. */
export function parseCatFileBatchOutput(
  stdout: Buffer,
  expectedOids: readonly string[],
): { readonly ok: true; readonly blobs: Map<string, Buffer> } | { readonly ok: false; readonly reason: string } {
  const blobs = new Map<string, Buffer>();
  let pos = 0;
  for (const expectedOid of expectedOids) {
    const newline = stdout.indexOf(0x0a, pos);
    if (newline < 0) return { ok: false, reason: "Git cat-file --batch returned a truncated header" };
    const header = stdout.subarray(pos, newline).toString("utf8");
    const parts = header.split(" ");
    if (parts.length !== 3 || parts[0] !== expectedOid || parts[1] !== "blob") {
      return { ok: false, reason: `Git object-store blob missing or invalid: ${expectedOid}` };
    }
    const size = Number(parts[2]);
    if (!Number.isSafeInteger(size) || size < 0) {
      return { ok: false, reason: `Git returned an invalid blob size for ${expectedOid}` };
    }
    const dataStart = newline + 1;
    const dataEnd = dataStart + size;
    if (dataEnd >= stdout.length || stdout[dataEnd] !== 0x0a) {
      return { ok: false, reason: `Git cat-file --batch returned truncated blob bytes for ${expectedOid}` };
    }
    blobs.set(expectedOid, stdout.subarray(dataStart, dataEnd));
    pos = dataEnd + 1;
  }
  if (pos !== stdout.length) {
    return { ok: false, reason: "Git cat-file --batch returned trailing bytes" };
  }
  return { ok: true, blobs };
}

export interface FuzzyRenameItem {
  readonly path: string;
  readonly bytes: Buffer;
}

/** Matches deleted and added non-binary text files with >= 50% similarity in deterministic order. */
export function matchFuzzyRenames(
  deleted: readonly FuzzyRenameItem[],
  added: readonly FuzzyRenameItem[],
  maxMatrixPairs: number = 2500,
): readonly { readonly oldPath: string; readonly newPath: string }[] {
  if (deleted.length === 0 || added.length === 0 || deleted.length * added.length > maxMatrixPairs) {
    return [];
  }
  const candidates: { oldPath: string; newPath: string; score: number }[] = [];
  for (const del of deleted) {
    if (isBinaryBytes(del.bytes)) continue;
    for (const add of added) {
      if (isBinaryBytes(add.bytes)) continue;
      const score = renameSimilarityScore(del.bytes, add.bytes);
      if (score >= 50) candidates.push({ oldPath: del.path, newPath: add.path, score });
    }
  }
  candidates.sort((a, b) =>
    b.score - a.score ||
    Buffer.compare(Buffer.from(a.oldPath, "utf8"), Buffer.from(b.oldPath, "utf8")) ||
    Buffer.compare(Buffer.from(a.newPath, "utf8"), Buffer.from(b.newPath, "utf8")));
  const usedOld = new Set<string>();
  const usedNew = new Set<string>();
  const pairs: { oldPath: string; newPath: string }[] = [];
  for (const candidate of candidates) {
    if (usedOld.has(candidate.oldPath) || usedNew.has(candidate.newPath)) continue;
    usedOld.add(candidate.oldPath);
    usedNew.add(candidate.newPath);
    pairs.push({ oldPath: candidate.oldPath, newPath: candidate.newPath });
  }
  return pairs;
}

/**
 * Computes a deterministic 0..100 byte-weighted line-overlap similarity score (matching Git's
 * 50% rename detection threshold) without spawning `git diff --find-renames` over the worktree.
 */
export function renameSimilarityScore(oldBytes: Buffer, newBytes: Buffer): number {
  if (oldBytes.length === 0 || newBytes.length === 0) return 0;
  if (oldBytes.equals(newBytes)) return 100;
  const maxBytes = Math.max(oldBytes.length, newBytes.length);
  const minBytes = Math.min(oldBytes.length, newBytes.length);
  if (minBytes * 2 < maxBytes) return 0;

  const oldCounts = new Map<string, number>();
  for (const line of splitLinesForDiff(oldBytes)) {
    oldCounts.set(line, (oldCounts.get(line) ?? 0) + 1);
  }
  let matchedBytes = 0;
  for (const line of splitLinesForDiff(newBytes)) {
    const remaining = oldCounts.get(line) ?? 0;
    if (remaining > 0) {
      oldCounts.set(line, remaining - 1);
      matchedBytes += line.length;
    }
  }
  return Math.floor((matchedBytes * 100) / maxBytes);
}
