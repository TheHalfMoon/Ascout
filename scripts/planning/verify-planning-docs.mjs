#!/usr/bin/env node
// Verifies planning documents before review:
// - every relative Markdown link resolves to an existing file;
// - with --ids, every referenced planning identifier is defined in the same root
//   (as the first cell of a table row or as a heading), and at least one
//   identifier is referenced, so the check cannot pass by finding nothing;
// - no line presents a founder decision (FD-n) as ratified or approved.
// Usage: node scripts/planning/verify-planning-docs.mjs [--ids] <dir>...
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const checkIds = args.includes("--ids");
const roots = args.filter((arg) => arg !== "--ids");
if (roots.length === 0) {
  console.error("usage: verify-planning-docs.mjs [--ids] <dir>...");
  process.exit(2);
}

const ID_PREFIXES = ["ADV", "SEC", "REV", "TST", "PROTO", "CON", "MCP", "REL", "PUB", "DUR", "DOC", "ASR", "E2E", "FMT", "FD", "G", "D", "R"];
const PREFIX_GROUP = `(${ID_PREFIXES.join("|")})`;
// The lookbehind keeps compound identifiers such as B-SEC-1 from matching SEC-1.
const ID_RE = new RegExp(String.raw`(?<![A-Za-z0-9-])${PREFIX_GROUP}-(\d{1,3})\b`, "g");
const RANGE_RE = new RegExp(String.raw`(?<![A-Za-z0-9-])${PREFIX_GROUP}-(\d{1,3})\s*(?:…|\.\.\.|–)\s*(?:\1-)?(\d{1,3})\b`, "g");
const TABLE_DEFINITION_RE = /^\|\s*\**([A-Z0-9]+-\d{1,3})\**\s*\|/;
const HEADING_DEFINITION_RE = /^#{2,4}\s+([A-Z0-9]+-\d{1,3})\b/;
const LINK_RE = /\]\(([^)#\s]+)(#[^)]*)?\)/g;
const FD_APPROVAL_RE = /\bFD-\d+\b.*\b(RATIFIED|APPROVED)\b/i;
// Negated or pending statements ("not approved", "No FD is approved", "None … ratified") are allowed.
const FD_SAFE_RE = /\b(not|no|none)\b[^|]*\b(ratified|approved)\b|NEEDS-FOUNDER|PROPOSED|recommend|must not|never mark/i;

function markdownFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...markdownFiles(path));
    else if (name.endsWith(".md")) out.push(path);
  }
  return out.sort();
}

const errors = [];
for (const root of roots) {
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    errors.push(`${root}: directory does not exist`);
    continue;
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
      if (FD_APPROVAL_RE.test(line) && !FD_SAFE_RE.test(line)) {
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
  console.log(JSON.stringify({ root, files: files.length, links_checked: links, defined_ids: defined.size, referenced_ids: referenced.size }));
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  console.error(`verify-planning-docs: FAIL (${errors.length} problem(s))`);
  process.exit(1);
}
console.log("verify-planning-docs: PASS");
