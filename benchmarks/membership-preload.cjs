"use strict";

const kind = process.env.ASCOUT_MEMBERSHIP_KIND;
const outputFile = process.env.ASCOUT_MEMBERSHIP_OUTPUT;
const alreadyInstrumented = process.env.ASCOUT_MEMBERSHIP_INSTRUMENTED === "1";

if (!alreadyInstrumented && (kind === "vitest" || kind === "jest") && outputFile) {
  const entry = (process.argv[1] ?? "").replaceAll("\\", "/");
  const basename = entry.slice(entry.lastIndexOf("/") + 1).toLowerCase();
  const isProjectLocalBin = entry.includes("/node_modules/.bin/");
  const isTargetRunner =
    (kind === "vitest" &&
      (basename === "vitest.mjs" || basename === "vitest.js" || (isProjectLocalBin && basename === "vitest"))) ||
    (kind === "jest" &&
      (basename === "jest.js" || basename === "jest.mjs" || (isProjectLocalBin && basename === "jest")));

  if (isTargetRunner) {
    const runnerArgs = process.argv.slice(2);
    const controlsReporter = runnerArgs.some(
      (value) =>
        value === "--json" ||
        value === "--reporter" ||
        value.startsWith("--reporter=") ||
        value === "--outputFile" ||
        value.startsWith("--outputFile="),
    );
    if (controlsReporter) {
      process.stderr.write("ascout_membership_preload: runner already controls reporter or output-file authority\n");
    } else {
      const boundary = process.argv.indexOf("--", 2);
      const insertAt = boundary === -1 ? process.argv.length : boundary;
      const reportFile = `${outputFile}.${process.pid}.json`;
      const instrumentation =
        kind === "vitest"
          ? ["--reporter=json", `--outputFile=${reportFile}`]
          : ["--json", `--outputFile=${reportFile}`];
      process.argv.splice(insertAt, 0, ...instrumentation);
      process.env.ASCOUT_MEMBERSHIP_INSTRUMENTED = "1";
    }
  }
}
