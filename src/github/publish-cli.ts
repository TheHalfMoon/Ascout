import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { mintInstallationTokenV1, readGatePinV1, revokeInstallationTokenV1, type GatePinV1 } from "./app-auth.js";
import { DEFAULT_POLICY_PATH } from "./policy.js";
import { apiOriginV1, preparePublishV1, publishPrEvidenceV1, type PublishInputV1 } from "./publish.js";

/**
 * The privileged publish step, runnable on its own: `node dist/github/publish-cli.js <bundle>`.
 * It imports only Node built-ins and Ascout's own GitHub modules, so a job that holds a GitHub App
 * key can run it without installing or building any third-party code (C1). `ascout pr-publish`
 * calls the same function.
 *
 * Every location comes from the trusted workflow event, passed through the environment; the bundle
 * is untrusted and validated. App mode needs ASCOUT_APP_ID, ASCOUT_APP_CLIENT_ID, and
 * ASCOUT_APP_PRIVATE_KEY together; any other mix is a configuration error and nothing is posted.
 */

export interface PrPublishRunV1 {
  readonly bundlePath: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly cwd: string;
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
  readonly fetch?: typeof fetch;
}

const APP_VARIABLES = ["ASCOUT_APP_ID", "ASCOUT_APP_CLIENT_ID", "ASCOUT_APP_PRIVATE_KEY"] as const;
const CONFIGURATION_ERROR = 2;

export async function runPrPublishFromEnvV1(run: PrPublishRunV1): Promise<number> {
  const { env } = run;
  const missing = (["GITHUB_REPOSITORY", "ASCOUT_PR_HEAD_SHA", "ASCOUT_PR_HEAD_REPOSITORY", "ASCOUT_PR_HEAD_BRANCH", "ASCOUT_PR_DETAILS_URL", "ASCOUT_PR_REQUIRED_BASE"] as const)
    .filter((name) => (env[name] ?? "") === "");
  if (missing.length > 0) {
    run.stderr(`ascout pr-publish: ${missing.join(", ")} not set`);
    return CONFIGURATION_ERROR;
  }
  const appSet = APP_VARIABLES.filter((name) => (env[name] ?? "") !== "");
  if (appSet.length !== 0 && appSet.length !== APP_VARIABLES.length) {
    run.stderr(`ascout pr-publish: GitHub App mode needs all of ${APP_VARIABLES.join(", ")}; only ${appSet.join(", ")} set`);
    return CONFIGURATION_ERROR;
  }
  const appMode = appSet.length === APP_VARIABLES.length;
  if (appMode && !/^[1-9][0-9]{0,15}$/u.test(env.ASCOUT_APP_ID as string)) {
    run.stderr("ascout pr-publish: ASCOUT_APP_ID must be the App's numeric ID");
    return CONFIGURATION_ERROR;
  }
  if (!appMode && (env.GITHUB_TOKEN ?? "") === "") {
    run.stderr("ascout pr-publish: GITHUB_TOKEN not set");
    return CONFIGURATION_ERROR;
  }
  let apiOrigin: string;
  try {
    apiOrigin = apiOriginV1(env.GITHUB_API_URL || "https://api.github.com");
  } catch (error) {
    run.stderr(`ascout pr-publish: ${(error as Error).message}`);
    return CONFIGURATION_ERROR;
  }
  const repository = env.GITHUB_REPOSITORY as string;
  const requiredBase = env.ASCOUT_PR_REQUIRED_BASE as string;
  const input: Omit<PublishInputV1, "token" | "botLogin"> = {
    bundlePath: run.bundlePath,
    repository,
    headSha: env.ASCOUT_PR_HEAD_SHA as string,
    headRepository: env.ASCOUT_PR_HEAD_REPOSITORY as string,
    headBranch: env.ASCOUT_PR_HEAD_BRANCH as string,
    detailsUrl: env.ASCOUT_PR_DETAILS_URL as string,
    apiUrl: apiOrigin,
    triggeringActor: env.ASCOUT_PR_TRIGGERING_ACTOR ?? "",
    trustedActors: (env.ASCOUT_PR_TRUSTED_ACTORS ?? "").split(",").map((name) => name.trim()).filter((name) => name !== ""),
    requiredBase,
    ...(/^[1-9][0-9]{0,9}$/u.test(env.ASCOUT_PR_NUMBER ?? "") ? { prNumber: Number(env.ASCOUT_PR_NUMBER) } : {}),
    // The policy comes from the publisher's own default-branch checkout, never from the PR.
    policyPath: resolve(run.cwd, DEFAULT_POLICY_PATH),
    ...(run.fetch === undefined ? {} : { fetch: run.fetch }),
  };
  const refuse = (reason: string): number => {
    run.stderr(`ascout pr-publish: ${reason}`);
    run.stdout(JSON.stringify({ kind: "refused", reason }));
    return CONFIGURATION_ERROR;
  };

  if (!appMode) return publishAndReport(run, { ...input, token: env.GITHUB_TOKEN as string, botLogin: env.ASCOUT_PR_BOT_LOGIN || "github-actions[bot]" });

  // Everything that needs no network is checked first, so a bad input never costs a credential.
  const prepared = preparePublishV1(input);
  if (!prepared.ok) return refuse(prepared.reason);
  const appId = Number(env.ASCOUT_APP_ID);
  const minted = await mintInstallationTokenV1({
    apiOrigin,
    repository,
    credentials: { appId, clientId: env.ASCOUT_APP_CLIENT_ID as string, privateKeyPem: env.ASCOUT_APP_PRIVATE_KEY as string },
    // GitHub masks the stored secret itself; values made at run time must be masked by hand, on the
    // output the runner reads for workflow commands.
    mask: (secret) => run.stdout(`::add-mask::${secret}`),
    ...(run.fetch === undefined ? {} : { fetch: run.fetch }),
  });
  if (!minted.ok) return refuse(minted.reason);
  try {
    const gatePin: GatePinV1 = await readGatePinV1({ apiOrigin, repository, branch: requiredBase, token: minted.token, appId, ...(run.fetch === undefined ? {} : { fetch: run.fetch }) });
    return await publishAndReport(run, { ...input, token: minted.token, botLogin: minted.botLogin, gatePin });
  } finally {
    // The token is useless once the check is posted; don't leave it valid for the rest of its hour.
    await revokeInstallationTokenV1({ apiOrigin, token: minted.token, ...(run.fetch === undefined ? {} : { fetch: run.fetch }) });
  }
}

/** Publishes and prints the outcome. An API failure is a refusal (exit 2), never a crash. */
async function publishAndReport(run: PrPublishRunV1, input: PublishInputV1): Promise<number> {
  let outcome;
  try {
    outcome = await publishPrEvidenceV1(input);
  } catch (error) {
    // Messages from publish name only the method and path, never a token.
    const reason = error instanceof Error ? error.message : "publishing failed";
    run.stderr(`ascout pr-publish: ${reason}`);
    run.stdout(JSON.stringify({ kind: "refused", reason }));
    return CONFIGURATION_ERROR;
  }
  run.stdout(JSON.stringify(outcome));
  return outcome.kind === "published" ? 0 : outcome.kind === "stale" ? 3 : CONFIGURATION_ERROR;
}

/** True when this file is the process entry point, not an import. */
function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  let self: string;
  try {
    self = realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
  // Node runs `node publish-cli` as publish-cli.js, but argv[1] keeps the name as typed.
  return [entry, `${entry}.js`].some((candidate) => {
    try {
      return realpathSync(resolve(candidate)) === self;
    } catch {
      return false;
    }
  });
}

if (isEntryPoint()) {
  const bundlePath = process.argv[2];
  if (bundlePath === undefined || process.argv.length !== 3) {
    process.stderr.write("usage: node publish-cli.js <bundle>\n");
    process.exitCode = CONFIGURATION_ERROR;
  } else {
    process.exitCode = await runPrPublishFromEnvV1({
      bundlePath,
      env: process.env,
      cwd: process.cwd(),
      stdout: (line) => process.stdout.write(`${line}\n`),
      stderr: (line) => process.stderr.write(`${line}\n`),
    });
  }
}
