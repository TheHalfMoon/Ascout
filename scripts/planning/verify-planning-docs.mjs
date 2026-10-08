#!/usr/bin/env node
// Usage: node scripts/planning/verify-planning-docs.mjs [--ids] <dir>...
import { runCli } from "./verify-planning-docs-lib.mjs";

process.exitCode = runCli(process.argv.slice(2));
