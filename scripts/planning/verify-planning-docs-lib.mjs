// Verifies planning documents before review:
// - every relative Markdown link resolves to an existing file;
// - with checkIds, every referenced planning identifier is defined in the same root
//   (as the first cell of a table row or as a heading), and at least one
//   identifier is referenced, so the check cannot pass by finding nothing;
// - no line presents a founder decision (FD-n) as ratified or approved.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const ID_PREFIXES = ["ADV", "SEC", "REV", "TST", "PROTO", "CON", "MCP", "REL", "PUB", "DUR", "DOC", "ASR", "E2E", "FMT", "FD", "G", "D", "R"];
const PREFIX_GROUP = `(${ID_PREFIXES.join("|")})`;
// The lookbehind keeps compound identifiers such as B-SEC-1 from matching SEC-1.
const ID_RE = new RegExp(String.raw`(?<![A-Za-z0-9-])${PREFIX_GROUP}-(\d{1,3})\b`, "g");
const RANGE_RE = new RegExp(String.raw`(?<![A-Za-z0-9-])${PREFIX_GROUP}-(\d{1,3})\s*(?:…|\.\.\.|–)\s*(?:\1-)?(\d{1,3})\b`, "g");
const TABLE_DEFINITION_RE = /^\|\s*\**([A-Z0-9]+-\d{1,3})\**\s*\|/;
const HEADING_DEFINITION_RE = /^#{2,4}\s+([A-Z0-9]+-\d{1,3})\b/;
const LINK_RE = /\]\(([^)#\s]+)(#[^)]*)?\)/g;
// Check approval predicates per *specific decision* and per status token.
// A pending or negated FD-2 must never sanitize "FD-1 APPROVED" on the same line.
const FD_ID_RE = /\bFD-\d+\b/giu;
const FD_APPROVAL_WORD_RE = /\b(?:RATIFIED|APPROVED)\b/giu;
const NEGATED_APPROVAL_PREFIX_RE = /\b(?:not|no|none|never)\b(?:\s+[a-z-]+){0,4}\s*$/iu;
function unqualifiedFdApproval(line) {
  const ids = [...line.matchAll(FD_ID_RE)];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const following = line.slice(id.index + id[0].length, ids[i + 1]?.index ?? line.length);
    let lastApprovalEnd = 0;
    let priorNegated = false;
    for (const word of following.matchAll(FD_APPROVAL_WORD_RE)) {
      const before = following.slice(lastApprovalEnd, word.index);
      const localClause = before.split(/[.;|,:!?]/u).at(-1) ?? before;
      const negated = NEGATED_APPROVAL_PREFIX_RE.test(localClause) ||
        (priorNegated && /^\s*(?:or|nor)\s*$/iu.test(before));
      if (!negated) return true;
      priorNegated = negated;
      lastApprovalEnd = word.index + word[0].length;
    }
  }
  return false;
}

function markdownFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...markdownFiles(path));
    else if (name.endsWith(".md")) out.push(path);
  }
  return out.sort();
}

function verifyRoot(root, checkIds, errors) {
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    errors.push(`${root}: directory does not exist`);
    return null;
  }
  const files = markdownFiles(root);
  if (files.length === 0) errors.push(`${root}: no markdown files found`);
  const defined = new Set();
  const referenced = new Map();
  let links = 0;
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      const where = `${file}:${index + 1}`;
      for (const match of line.matchAll(LINK_RE)) {
        const target = match[1];
        if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
        links += 1;
        if (!existsSync(resolve(dirname(file), target))) errors.push(`${where}: broken link ${target}`);
      }
      if (unqualifiedFdApproval(line)) {
        errors.push(`${where}: a founder decision appears to be marked ratified or approved`);
      }
      const tableDefinition = line.match(TABLE_DEFINITION_RE);
      if (tableDefinition) defined.add(tableDefinition[1]);
      const headingDefinition = line.match(HEADING_DEFINITION_RE);
      if (headingDefinition) defined.add(headingDefinition[1]);
      for (const match of line.matchAll(RANGE_RE)) {
        const [, prefix, from, to] = match;
        for (let n = Number(from); n <= Number(to); n += 1) {
          const id = `${prefix}-${String(n).padStart(from.length, "0")}`;
          if (!referenced.has(id)) referenced.set(id, where);
        }
      }
      for (const match of line.matchAll(ID_RE)) {
        if (!referenced.has(match[0])) referenced.set(match[0], where);
      }
    });
  }
  if (checkIds) {
    if (referenced.size === 0) errors.push(`${root}: --ids found no identifier references; refusing to pass by omission`);
    for (const [id, where] of referenced) {
      if (!defined.has(id)) errors.push(`${where}: identifier ${id} is referenced but never defined in ${root}`);
    }
  }
  return { root, files: files.length, links_checked: links, defined_ids: defined.size, referenced_ids: referenced.size };
}

export function verifyPlanningDocs(roots, { checkIds = false } = {}) {
  const errors = [];
  const summaries = [];
  for (const root of roots) {
    const summary = verifyRoot(root, checkIds, errors);
    if (summary !== null) summaries.push(summary);
  }
  return { ok: errors.length === 0, errors, summaries };
}

export function runCli(args, out = console.log, err = console.error) {
  const checkIds = args.includes("--ids");
  const roots = args.filter((arg) => arg !== "--ids");
  if (roots.length === 0) {
    err("usage: verify-planning-docs.mjs [--ids] <dir>...");
    return 2;
  }
  const result = verifyPlanningDocs(roots, { checkIds });
  for (const summary of result.summaries) out(JSON.stringify(summary));
  if (!result.ok) {
    for (const error of result.errors) err(error);
    err(`verify-planning-docs: FAIL (${result.errors.length} problem(s))`);
    return 1;
  }
  out("verify-planning-docs: PASS");
  return 0;
}
