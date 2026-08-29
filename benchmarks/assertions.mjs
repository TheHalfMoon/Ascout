#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { aggregateBenchmarkAssertions, evaluateCaseAssertions } from "./assertions-lib.mjs";
import { canonicalJson } from "./harness-lib.mjs";

function fail(message) {
  throw new Error(`benchmark assertions: ${message}`);
}

function parseArgs(argv) {
  const result = { input: null, output: null, aggregateInputs: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      const value = argv[index];
      if (!value) fail(`${arg} requires a value`);
      return value;
    };
    if (arg === "--input") result.input = resolve(next());
    else if (arg === "--output") result.output = resolve(next());
    else if (arg === "--aggregate-input") result.aggregateInputs.push(resolve(next()));
    else fail(`unknown argument: ${arg}`);
  }
  if (result.aggregateInputs.length > 0) {
    if (result.input !== null) fail("aggregate mode cannot be combined with --input");
  } else if (result.input === null) {
    fail("--input is required");
  }
  return result;
}

async function readJson(path) {
  try {
    return JSON.parse((await readFile(path)).toString("utf8"));
  } catch (error) {
    fail(`cannot read JSON input ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function emit(result, output) {
  const serialized = canonicalJson(result);
  if (output) {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, serialized);
  }
  process.stdout.write(serialized);
  if (result.status !== "ABSOLUTE_ASSERTIONS_SATISFIED") process.exitCode = 1;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.aggregateInputs.length > 0) {
    const cases = [];
    for (const path of options.aggregateInputs) cases.push(await readJson(path));
    await emit(aggregateBenchmarkAssertions(cases), options.output);
    return;
  }
  await emit(evaluateCaseAssertions(await readJson(options.input)), options.output);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
