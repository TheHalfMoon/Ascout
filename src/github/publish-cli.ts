// The dependency-free entry point for the privileged publish step (C1): `node publish-cli.js <bundle>`.
// It always runs: importing it is running it. The logic lives in publish-run.ts.
import { runPrPublishMainV1 } from "./publish-run.js";

process.exitCode = await runPrPublishMainV1(process.argv.slice(2), { env: process.env, cwd: process.cwd(), out: process.stdout, err: process.stderr });
