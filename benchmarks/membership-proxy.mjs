#!/usr/bin/env node
import { spawn } from "node:child_process";
import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

function fail(message) {
  process.stderr.write(`ascout_membership_proxy: ${message}\n`);
  process.exit(2);
}

const argv = process.argv.slice(2);
let kind = null;
let outputFile = null;
let separator = -1;

for (let index = 0; index < argv.length; index += 1) {
  const arg = argv[index];
  if (arg === "--") {
    separator = index;
    break;
  }
  if (arg === "--kind") {
    kind = argv[index + 1] ?? null;
    index += 1;
    continue;
  }
  if (arg === "--output") {
    outputFile = argv[index + 1] ?? null;
    index += 1;
    continue;
  }
  fail(`unknown proxy option: ${arg}`);
}

if (separator === -1) fail("missing command separator");
if (kind !== "vitest" && kind !== "jest") fail(`unsupported runner kind: ${String(kind)}`);
if (typeof outputFile !== "string" || !isAbsolute(outputFile)) fail("output path must be absolute");
if (process.env.NODE_OPTIONS) fail("NODE_OPTIONS is already set in the reviewed command environment");
if (process.env.ASCOUT_MEMBERSHIP_KIND || process.env.ASCOUT_MEMBERSHIP_OUTPUT || process.env.ASCOUT_MEMBERSHIP_INSTRUMENTED) {
  fail("membership instrumentation environment is already controlled by the reviewed command");
}

const command = argv[separator + 1];
const commandArgv = argv.slice(separator + 2);
if (!command) fail("missing reviewed command executable");

const preload = fileURLToPath(new URL("./membership-preload.cjs", import.meta.url));
const nodeOptions = `--require=${JSON.stringify(preload)}`;
const child = spawn(command, commandArgv, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
    ASCOUT_MEMBERSHIP_KIND: kind,
    ASCOUT_MEMBERSHIP_OUTPUT: outputFile,
  },
  shell: false,
  stdio: "inherit",
  windowsHide: true,
});

child.once("error", (error) => {
  process.stderr.write(`ascout_membership_proxy: ${error.message}\n`);
  process.exitCode = 2;
});

child.once("close", (code, signal) => {
  if (signal) {
    process.stderr.write(`ascout_membership_proxy: reviewed command terminated by ${signal}\n`);
    process.exitCode = 2;
    return;
  }
  process.exitCode = code ?? 2;
});
