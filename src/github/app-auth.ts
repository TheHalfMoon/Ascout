import { createPrivateKey, sign } from "node:crypto";

import { CHECK_RUN_NAME } from "./pr-evidence.js";

/**
 * C1 (specs/017-unified-assurance/C1_GITHUB_APP_GATE_DESIGN.md): publish the Ascout check as a
 * customer-registered GitHub App, so a branch ruleset can require it from that App alone. Uses only
 * Node built-ins: the job that holds the App key installs and builds nothing.
 *
 * The private key, the JWT, and the installation token never appear in any return value except
 * where they are the value, and never in an error message.
 */

export interface AppCredentialsV1 {
  /** The numeric App ID, used to check the installation belongs to this App and to read the pin. */
  readonly appId: number;
  /** The App's client ID: GitHub's preferred JWT issuer. */
  readonly clientId: string;
  readonly privateKeyPem: string;
}

/** Issued with no permission beyond what publishing needs. */
export const APP_TOKEN_PERMISSIONS = Object.freeze({ checks: "write", pull_requests: "write", metadata: "read" });

const MAX_RESPONSE_BYTES = 1024 * 1024;
/**
 * An installation token as GitHub issues it, including the longer ghs_<app>_<jwt> format. Anything
 * else, such as a value with a newline that could inject a workflow command, is refused.
 */
const TOKEN_SHAPE = /^[A-Za-z0-9_.-]{1,4096}$/u;

function base64url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

/** A GitHub App JWT: RS256, issued 60 seconds in the past, valid for 9 minutes (GitHub allows 10). */
export function signAppJwtV1(credentials: Pick<AppCredentialsV1, "clientId" | "privateKeyPem">, nowSeconds: number = Math.floor(Date.now() / 1000)): string {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iat: nowSeconds - 60, exp: nowSeconds + 9 * 60, iss: credentials.clientId }));
  const key = createPrivateKey(credentials.privateKeyPem);
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), key);
  return `${header}.${payload}.${base64url(signature)}`;
}

export type AppTokenResultV1 =
  | { readonly ok: true; readonly token: string; readonly botLogin: string; readonly expiresAt: string }
  | { readonly ok: false; readonly reason: string };

export interface MintInstallationTokenInputV1 {
  readonly apiOrigin: string;
  /** owner/name. */
  readonly repository: string;
  readonly credentials: AppCredentialsV1;
  /** Called with each secret value as soon as it exists, so the runner can mask it. */
  readonly mask: (secret: string) => void;
  readonly fetch?: typeof fetch;
  readonly nowSeconds?: number;
}

async function requestJson(doFetch: typeof fetch, method: string, url: string, bearer: string, body?: unknown): Promise<{ status: number; json: unknown; morePages: boolean }> {
  const response = await doFetch(url, {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${bearer}`,
      "x-github-api-version": "2022-11-28",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  const morePages = /rel="next"/u.test(response.headers.get("link") ?? "");
  if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) return { status: response.status, json: null, morePages };
  let json: unknown = null;
  try {
    json = text === "" ? null : JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, json, morePages };
}

/**
 * Mints an installation token for one repository with only the publishing permissions. Refuses an
 * installation that belongs to a different App. Every failure names the step, never a value.
 */
export async function mintInstallationTokenV1(input: MintInstallationTokenInputV1): Promise<AppTokenResultV1> {
  const doFetch = input.fetch ?? fetch;
  const [, name] = input.repository.split("/");
  let jwt: string;
  try {
    jwt = signAppJwtV1(input.credentials, input.nowSeconds);
  } catch {
    return { ok: false, reason: "the App private key could not be used to sign" };
  }
  input.mask(jwt);
  try {
    const installation = await requestJson(doFetch, "GET", `${input.apiOrigin}/repos/${input.repository}/installation`, jwt);
    if (installation.status !== 200) return { ok: false, reason: `finding the App installation failed: HTTP ${installation.status}` };
    const found = installation.json as { id?: unknown; app_id?: unknown; app_slug?: unknown } | null;
    if (found === null || typeof found !== "object" || !Number.isSafeInteger(found.id) || typeof found.app_slug !== "string" || !/^[a-z0-9][a-z0-9-]{0,99}$/u.test(found.app_slug)) {
      return { ok: false, reason: "the App installation response was malformed" };
    }
    if (found.app_id !== input.credentials.appId) return { ok: false, reason: "the installation on this repository belongs to a different App" };
    const created = await requestJson(doFetch, "POST", `${input.apiOrigin}/app/installations/${String(found.id)}/access_tokens`, jwt, {
      repositories: [name],
      permissions: APP_TOKEN_PERMISSIONS,
    });
    if (created.status !== 201) return { ok: false, reason: `creating the installation token failed: HTTP ${created.status}` };
    const token = (created.json as { token?: unknown; expires_at?: unknown } | null)?.token;
    const expiresAt = (created.json as { expires_at?: unknown } | null)?.expires_at;
    if (typeof token !== "string" || !TOKEN_SHAPE.test(token) || typeof expiresAt !== "string") return { ok: false, reason: "the installation token response was malformed" };
    input.mask(token);
    return { ok: true, token, botLogin: `${found.app_slug}[bot]`, expiresAt };
  } catch {
    return { ok: false, reason: "the GitHub API could not be reached while minting the App token" };
  }
}

export type GatePinV1 = "pinned" | "not_pinned" | "unknown";

/**
 * Whether the default branch's rulesets require the Ascout check from this App. Classic branch
 * protection and bypass actors are not read, so "not_pinned" means "not pinned in a ruleset", and
 * anything unreadable is "unknown". Never claims "pinned" without seeing the rule.
 */
export async function readGatePinV1(input: { apiOrigin: string; repository: string; branch: string; token: string; appId: number; fetch?: typeof fetch }): Promise<GatePinV1> {
  try {
    // Each path segment is encoded on its own, so a branch like release/x stays release/x.
    const branch = input.branch.split("/").map(encodeURIComponent).join("/");
    const rules = await requestJson(input.fetch ?? fetch, "GET", `${input.apiOrigin}/repos/${input.repository}/rules/branches/${branch}?per_page=100`, input.token);
    if (rules.status !== 200 || !Array.isArray(rules.json)) return "unknown";
    const pinned = (rules.json as { type?: unknown; parameters?: { required_status_checks?: unknown } }[]).some((rule) =>
      rule?.type === "required_status_checks" &&
      Array.isArray(rule.parameters?.required_status_checks) &&
      (rule.parameters.required_status_checks as { context?: unknown; integration_id?: unknown }[]).some(
        (check) => check?.context === CHECK_RUN_NAME && check.integration_id === input.appId,
      ));
    // A matching rule may sit on a later page; without reading it, "not pinned" can't be claimed.
    return pinned ? "pinned" : rules.morePages ? "unknown" : "not_pinned";
  } catch {
    return "unknown";
  }
}

/**
 * Revokes an installation token once publishing is done, so it can't be used for the rest of its
 * hour. Best effort: a failure changes nothing about the published result.
 */
export async function revokeInstallationTokenV1(input: { apiOrigin: string; token: string; fetch?: typeof fetch }): Promise<boolean> {
  try {
    return (await requestJson(input.fetch ?? fetch, "DELETE", `${input.apiOrigin}/installation/token`, input.token)).status === 204;
  } catch {
    return false;
  }
}
