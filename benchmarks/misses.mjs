#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { canonicalJson } from "./harness-lib.mjs";
import { publishSelectorMisses } from "./misses-lib.mjs";

function fail(message) {
  throw new Error(`benchmark selector misses: ${message}`);
}

function parseArgs(argv) {
  const options = {
    input: null,
    output: null,
    qualificationRunId: null,
    t076AggregateSha256: null,
    t077AggregateSha256: null,
    aggregateArtifactDigest: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      const value = argv[index];
      if (!value) fail(`${arg} requires a value`);
      return value;
    };
    if (arg === "--input") options.input = resolve(next());
    else if (arg === "--output") options.output = resolve(next());
    else if (arg === "--qualification-run-id") options.qualificationRunId = next();
    else if (arg === "--t076-aggregate-sha256") options.t076AggregateSha256 = next();
    else if (arg === "--t077-aggregate-sha256") options.t077AggregateSha256 = next();
    else if (arg === "--aggregate-artifact-digest") options.aggregateArtifactDigest = next();
    else fail(`unknown argument: ${arg}`);
  }
  for (const [name, value] of [
    ["--input", options.input],
    ["--qualification-run-id", options.qualificationRunId],
    ["--t076-aggregate-sha256", options.t076AggregateSha256],
    ["--t077-aggregate-sha256", options.t077AggregateSha256],
    ["--aggregate-artifact-digest", options.aggregateArtifactDigest],
  ]) {
    if (value === null) fail(`${name} is required`);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const input = JSON.parse(await readFile(options.input, "utf8"));
  const result = publishSelectorMisses(input, {
    qualification_run_id: options.qualificationRunId,
    t076_aggregate_sha256: options.t076AggregateSha256,
    t077_aggregate_sha256: options.t077AggregateSha256,
    aggregate_artifact_digest: options.aggregateArtifactDigest,
  });
  const serialized = canonicalJson(result);
  if (options.output !== null) {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, serialized);
  }
  process.stdout.write(serialized);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
