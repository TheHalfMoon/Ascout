import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { execFileSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readSync, realpathSync, rmSync, statSync, writeFileSync, writeSync } from "node:fs";
import { Agent, request } from "node:https";
import { isIP } from "node:net";
import { tmpdir, userInfo } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { isatty } from "node:tty";

import { trustedGitExecutable, type GitChangedFile } from "../../git.js";
import { runSecurityGitleaksV1 } from "../security/security-gitleaks.js";
import {
  REVIEW_INSTRUCTIONS,
  configPathForHomeV1,
  configPermissionProblemV1,
  parseReviewFindingsV1,
  unwrapJsonFenceV1,
  type LocalReviewConfigLocationV1,
} from "./local-review-provider.js";
import {
  buildLocalReviewPayloadV1,
  findingOnChangedLinesV1,
  isNeverSentPathV1,
  LOCAL_REVIEW_AUTHOR_FAMILY,
  LOCAL_REVIEW_CAPSULE_ID,
  LOCAL_REVIEW_LIMITS,
  LOCAL_REVIEW_PROFILE_ID,
  type LocalReviewCommandReportV1,
  type LocalReviewOutcomeV1,
} from "./local-review-run.js";
import { validateObservationLocationV1 } from "./location-validator.js";
import { pathKeyForPlatformV1 } from "./delegated-review.js";
import { buildReviewReportV1, type ReviewChangeV1 } from "./review-command.js";

/**
 * Remote review (E10c, founder-approved 2026-11-13): an operator-paid model on a third-party API.
 * This module holds the only code in Ascout that may open a connection beyond loopback. It is off by
 * default and needs two keys, neither of which the repository can supply: a version 2 config at the
 * account-derived location that lists this repository, and a per-run confirmation typed by a person
 * at the controlling terminal. The exact payload must pass a Gitleaks scan the repository can't
 * weaken. Ascout never pays: the operator's own credential is sent, by reference only.
 */
export const REMOTE_REVIEW_ENGINE_ID = "engine:review-remote" as const;
export const REMOTE_CONFIG_FILE = "review-remote.json" as const;
export const REMOTE_LIMITS = Object.freeze({
  max_payload_bytes: LOCAL_REVIEW_LIMITS.max_payload_bytes,
  max_output_tokens: 8000,
  timeout_ms: 5 * 60 * 1000,
  max_response_bytes: 1024 * 1024,
});

const CONFIG_KEYS = new Set(["version", "provider", "endpoint", "model", "model_family", "credential_env", "allow_remote_egress", "operator_authorized", "repositories", "limits", "exclude"]);
const MODEL_NAME = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,127}$/u;
const ENV_NAME = /^[A-Z][A-Z0-9_]{0,63}$/u;
const MAX_CONFIG_BYTES = 16 * 1024;
const GROUP_ID = "group:working-tree";

export interface RemoteReviewConfigV2 {
  readonly provider: "openai-compatible";
  readonly endpoint: RemoteEndpointV1;
  readonly model: string;
  readonly model_family: string;
  readonly credential_env: string;
  readonly repositories: readonly string[];
  readonly limits: { readonly max_payload_bytes: number; readonly max_output_tokens: number };
  readonly exclude: readonly string[];
}

export type RemoteReviewConfigResultV2 =
  | { readonly state: "absent"; readonly path: string }
  | { readonly state: "invalid"; readonly path: string; readonly reason: string }
  | { readonly state: "loaded"; readonly path: string; readonly config: RemoteReviewConfigV2 };

export interface RemoteEndpointV1 {
  readonly url: string;
  readonly hostname: string;
  readonly port: number;
  readonly path: string;
}

/**
 * A remote endpoint: HTTPS to a DNS name with no user info, query, fragment, or trailing dot. IP
 * literals are refused, so the certificate is always checked against a name. Internationalized
 * names are compared in punycode, as URL parsing yields.
 */
export function parseRemoteEndpointV1(endpoint: string): RemoteEndpointV1 | string {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return "the endpoint is not a URL";
  }
  if (url.protocol !== "https:") return "the endpoint must use https";
  if (url.username !== "" || url.password !== "") return "the endpoint must not hold user info";
  if (url.search !== "" || url.hash !== "" || endpoint.includes("?") || endpoint.includes("#")) return "the endpoint must not hold a query or fragment";
  const hostname = url.hostname.toLowerCase();
  if (hostname.endsWith(".") || hostname === "") return "the endpoint host must not end with a dot";
  if (isIP(hostname.replace(/^\[|\]$/gu, "")) !== 0) return "the endpoint must name a host, not an IP address";
  if (hostname === "localhost" || hostname.endsWith(".localhost") || !hostname.includes(".")) return "the endpoint must be a public host name";
  const port = url.port === "" ? 443 : Number(url.port);
  if (!Number.isSafeInteger(port) || port <= 0 || port > 65535) return "the endpoint port is invalid";
  const path = url.pathname.replace(/\/+$/u, "");
  return { url: `https://${hostname}${url.port === "" ? "" : `:${port}`}${path}`, hostname, port, path };
}

/** True only for globally routable unicast addresses; loopback, private, link-local, and the rest are refused. */
export function isPublicAddressV1(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b] = address.split(".").map(Number) as [number, number, number, number];
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // shared address space (CGNAT)
    if (a === 169 && b === 254) return false; // link-local, including cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    const c = Number(address.split(".")[2]);
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return false; // IETF protocol assignments, documentation
    if (a === 192 && b === 88 && c === 99) return false; // deprecated 6to4 relay
    if (a === 198 && b === 51 && c === 100) return false; // documentation
    if (a === 203 && b === 0 && c === 113) return false; // documentation
    if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
    return true;
  }
  if (family === 6) {
    const lower = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/u.exec(lower);
    if (mapped !== null) return isPublicAddressV1(mapped[1]!);
    const words = expandIPv6(lower);
    const [w0, w1] = words as [number, number];
    if (words.every((word) => word === 0)) return false; // unspecified
    if (words.slice(0, 7).every((word) => word === 0) && words[7] === 1) return false; // loopback
    if (words.slice(0, 5).every((word) => word === 0) && (words[5] === 0 || words[5] === 0xffff)) return false; // IPv4-compatible and -mapped
    if ((w0 & 0xfe00) === 0xfc00) return false; // unique local
    if ((w0 & 0xffc0) === 0xfe80) return false; // link-local
    if ((w0 & 0xff00) === 0xff00) return false; // multicast
    if (w0 === 0x0064 && w1 === 0xff9b) return false; // NAT64
    if (w0 === 0x2002) return false; // 6to4, which can embed a private IPv4 address
    if (w0 === 0x2001 && w1 === 0x0000) return false; // Teredo
    if (w0 === 0x2001 && (w1 & 0xfff0) === 0x0010) return false; // ORCHIDv2
    if (w0 === 0x2001 && w1 === 0x0db8) return false; // documentation
    if ((w0 & 0xfff0) === 0x3ff0) return false; // documentation, 3fff::/20
    return (w0 & 0xe000) === 0x2000; // global unicast 2000::/3
  }
  return false;
}

/** The eight 16-bit words of an address Node's isIP already accepted as IPv6. */
function expandIPv6(address: string): number[] {
  let text = address;
  // A trailing dotted IPv4 part (as in ::1.2.3.4) stands for the last two words.
  const dotted = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/u.exec(text);
  if (dotted !== null) {
    const [p, q, r, t] = dotted.slice(1).map(Number) as [number, number, number, number];
    text = `${text.slice(0, dotted.index)}${((p << 8) | q).toString(16)}:${((r << 8) | t).toString(16)}`;
  }
  const words = (part: string): number[] => (part === "" ? [] : part.split(":").map((word) => parseInt(word, 16)));
  const gap = text.indexOf("::");
  if (gap === -1) return words(text);
  const head = words(text.slice(0, gap));
  const tail = words(text.slice(gap + 2));
  return [...head, ...new Array<number>(8 - head.length - tail.length).fill(0), ...tail];
}

/** The remote config's path: next to review-provider.json, derived from the account, never from the environment. */
export function remoteReviewConfigPath(location: LocalReviewConfigLocationV1 = {}): string | null {
  if (location.configHome !== undefined) return join(location.configHome, REMOTE_CONFIG_FILE);
  let home: string;
  try {
    home = location.accountHome === undefined ? userInfo().homedir : location.accountHome();
  } catch {
    return null;
  }
  if (home === "") return null;
  return join(dirname(configPathForHomeV1(home, process.platform)), REMOTE_CONFIG_FILE);
}

function samePathKey(path: string): string {
  return pathKeyForPlatformV1(path, process.platform);
}

function isInside(root: string, candidate: string): boolean {
  const rel = relative(samePathKey(root), samePathKey(candidate));
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

/** Reads the version 2 remote config. Both opt-in flags must be true, or nothing is ever sent. */
export function readRemoteReviewConfigV2(repositoryRoot: string, location: LocalReviewConfigLocationV1 = {}): RemoteReviewConfigResultV2 {
  const path = remoteReviewConfigPath(location);
  if (path === null) return { state: "absent", path: "(no home directory for this account)" };
  if (!existsSync(path)) return { state: "absent", path };
  const invalid = (reason: string): RemoteReviewConfigResultV2 => ({ state: "invalid", path, reason });
  if (isInside(realpathSync.native(resolve(repositoryRoot)), realpathSync.native(path))) return invalid("the remote review config lies inside the repository under review");
  const problem = configPermissionProblemV1(process.platform, statSync(path), statSync(dirname(path)).mode, () => (process.getuid as () => number)());
  if (problem !== null) return invalid(problem.replace("review-provider", "remote review"));
  let value: unknown;
  try {
    const raw = readFileSync(path);
    if (raw.byteLength > MAX_CONFIG_BYTES) return invalid("the remote review config is too large");
    value = JSON.parse(raw.toString("utf8")) as unknown;
  } catch {
    return invalid("the remote review config is not readable JSON");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return invalid("the remote review config is not an object");
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) if (!CONFIG_KEYS.has(key)) return invalid(`unknown key in the remote review config: ${JSON.stringify(key.slice(0, 40))}`);
  if (record.version !== 2) return invalid("the remote review config version must be 2");
  if (record.provider !== "openai-compatible") return invalid("the remote provider must be openai-compatible");
  if (record.allow_remote_egress !== true || record.operator_authorized !== true) return invalid("allow_remote_egress and operator_authorized must both be true");
  if (typeof record.endpoint !== "string") return invalid("the endpoint is missing");
  const endpoint = parseRemoteEndpointV1(record.endpoint);
  if (typeof endpoint === "string") return invalid(endpoint);
  if (typeof record.model !== "string" || !MODEL_NAME.test(record.model)) return invalid("the model name is invalid");
  if (typeof record.model_family !== "string" || !MODEL_NAME.test(record.model_family)) return invalid("the model family is invalid");
  if (typeof record.credential_env !== "string" || !ENV_NAME.test(record.credential_env)) return invalid("credential_env must name an environment variable, such as EXAMPLE_API_KEY");
  if (!Array.isArray(record.repositories) || record.repositories.length === 0 || record.repositories.length > 100 ||
    !record.repositories.every((entry) => typeof entry === "string" && isAbsolute(entry))) {
    return invalid("repositories must list the absolute paths of the repositories that may be sent");
  }
  const limits = (record.limits ?? {}) as Record<string, unknown>;
  if (typeof limits !== "object" || limits === null || Array.isArray(limits) || Object.keys(limits).some((key) => key !== "max_payload_bytes" && key !== "max_output_tokens")) {
    return invalid("limits may hold only max_payload_bytes and max_output_tokens");
  }
  const maxPayload = limits.max_payload_bytes ?? REMOTE_LIMITS.max_payload_bytes;
  const maxTokens = limits.max_output_tokens ?? REMOTE_LIMITS.max_output_tokens;
  if (!Number.isSafeInteger(maxPayload) || (maxPayload as number) < 1024 || (maxPayload as number) > REMOTE_LIMITS.max_payload_bytes) return invalid(`max_payload_bytes must be between 1024 and ${REMOTE_LIMITS.max_payload_bytes}`);
  if (!Number.isSafeInteger(maxTokens) || (maxTokens as number) < 1 || (maxTokens as number) > 32000) return invalid("max_output_tokens must be between 1 and 32000");
  const exclude = record.exclude ?? [];
  if (!Array.isArray(exclude) || exclude.length > 100 || !exclude.every((entry) => typeof entry === "string" && entry.length > 0 && !entry.startsWith("/") && !entry.includes(".."))) {
    return invalid("exclude must list repository-relative path prefixes");
  }
  return {
    state: "loaded",
    path,
    config: {
      provider: "openai-compatible",
      endpoint,
      model: record.model,
      model_family: record.model_family,
      credential_env: record.credential_env,
      repositories: record.repositories as string[],
      limits: { max_payload_bytes: maxPayload as number, max_output_tokens: maxTokens as number },
      exclude: exclude as string[],
    },
  };
}

/** Exact real-path equality, case-folded on Windows and macOS. A nested clone or a parent doesn't match. */
export function repositoryIsListedV1(repositoryRoot: string, listed: readonly string[]): boolean {
  const real = (path: string): string => {
    try {
      return realpathSync.native(path);
    } catch {
      return resolve(path);
    }
  };
  const root = samePathKey(real(repositoryRoot));
  return listed.some((entry) => samePathKey(real(entry)) === root);
}

/** What the operator is shown before anything is sent. */
export interface RemoteDisclosureV1 {
  readonly host: string;
  readonly endpoint: string;
  readonly model: string;
  readonly files: number;
  readonly bytes: number;
  readonly payload_sha256: string;
  readonly last_confirmed_host: string | null;
}

/** The controlling terminal's input and output on a platform: never standard input. */
export function terminalPathsV1(platform: NodeJS.Platform): readonly [string, string] {
  return platform === "win32" ? ["\\\\.\\CONIN$", "\\\\.\\CONOUT$"] : ["/dev/tty", "/dev/tty"];
}

/** Shows the disclosure and reads one line: the host the person typed. */
export function promptForHostV1(disclosure: RemoteDisclosureV1, read: (buffer: Buffer) => number, write: (text: string) => void): string {
  const changed = disclosure.last_confirmed_host !== null && disclosure.last_confirmed_host !== disclosure.host
    ? `\nThe host differs from the one last confirmed for this repository (${disclosure.last_confirmed_host}).`
    : "";
  write([
    "",
    "Ascout is about to send source code off this machine for an advisory AI review.",
    `  host:     ${disclosure.host}`,
    `  endpoint: ${disclosure.endpoint}`,
    `  model:    ${disclosure.model}`,
    `  files:    ${disclosure.files}`,
    `  bytes:    ${disclosure.bytes}`,
    `  sha256:   ${disclosure.payload_sha256}`,
    "Your own account with the provider is billed; Ascout pays nothing." + changed,
    "Type the host name to send, or anything else to cancel: ",
  ].join("\n"));
  const buffer = Buffer.alloc(512);
  let line = "";
  for (;;) {
    const count = read(buffer);
    if (count === 0) break;
    line += buffer.subarray(0, count).toString("utf8");
    if (line.includes("\n") || line.length >= 512) break;
  }
  return line.split(/\r?\n/u)[0]!.trim();
}

export interface TerminalDepsV1 {
  readonly open: (path: string, flags: string) => number;
  readonly isTerminal: (descriptor: number) => boolean;
}

/**
 * Asks the person at the controlling terminal to type the host. Reads /dev/tty (or CONIN$ on
 * Windows), never standard input, and refuses unless both reading and writing are a real terminal.
 * Returns what was typed, or null when there is no terminal.
 */
export function confirmAtTerminalV1(disclosure: RemoteDisclosureV1, deps: TerminalDepsV1 = { open: openSync, isTerminal: isatty }): string | null {
  const [inPath, outPath] = terminalPathsV1(process.platform);
  let input: number;
  let output: number;
  try {
    input = deps.open(inPath, "r");
    output = deps.open(outPath, "w");
  } catch {
    return null;
  }
  try {
    if (!deps.isTerminal(input) || !deps.isTerminal(output)) return null;
    return promptForHostV1(disclosure, (buffer) => readSync(input, buffer, 0, buffer.length, null), (text) => {
      writeSync(output, text);
    });
  } finally {
    closeSync(input);
    closeSync(output);
  }
}

/** Where the last host confirmed for each repository is kept: the operator's config folder, not the repository. */
function historyPath(configPath: string): string {
  return join(dirname(configPath), "review-remote-history.json");
}

function lastConfirmedHost(configPath: string, repositoryRoot: string): string | null {
  // No operator config file (the PR workflow): no history, so nothing is read from or written to the
  // current folder, which there is the pull request's checkout.
  if (!isAbsolute(configPath)) return null;
  try {
    const history = JSON.parse(readFileSync(historyPath(configPath), "utf8")) as Record<string, unknown>;
    const host = history[samePathKey(realpathSync.native(repositoryRoot))];
    return typeof host === "string" && /^[a-z0-9.-]{1,253}$/u.test(host) ? host : null;
  } catch {
    return null;
  }
}

function recordConfirmedHost(configPath: string, repositoryRoot: string, host: string): void {
  if (!isAbsolute(configPath)) return;
  try {
    let history: Record<string, unknown> = {};
    try {
      history = JSON.parse(readFileSync(historyPath(configPath), "utf8")) as Record<string, unknown>;
    } catch {
      // A missing or unreadable history starts over; it only drives a reminder.
    }
    history[samePathKey(realpathSync.native(repositoryRoot))] = host;
    writeFileSync(historyPath(configPath), `${JSON.stringify(history)}\n`, { mode: 0o600 });
  } catch {
    // The reminder is a convenience; failing to record it must not change the review.
  }
}

/** The outcome of scanning the exact payload. Anything other than a clean scan refuses the send. */
export type PayloadScanV1 =
  | { readonly kind: "clean" }
  | { readonly kind: "hits"; readonly files: readonly string[] }
  | { readonly kind: "unavailable"; readonly reason: string };

/**
 * Scans the exact payload with the qualified Gitleaks engine, on a copy in a new temporary
 * repository: the repository's .gitleaksignore and settings never apply, and inline gitleaks:allow
 * markers are removed first. Each file's section is scanned as its own file so a hit names it.
 */
export async function scanRemotePayloadV1(sections: readonly { readonly path: string; readonly text: string }[], gitleaksPath: string | null, signal?: AbortSignal, repositoryRoot: string = process.cwd()): Promise<PayloadScanV1> {
  if (gitleaksPath === null) return { kind: "unavailable", reason: "Gitleaks is not configured (ASCOUT_GITLEAKS_PATH), and remote review never sends an unscanned payload" };
  // The same Git lookup the rest of Ascout uses: never a PATH entry inside the reviewed repository.
  const gitExecutable = trustedGitExecutable(repositoryRoot);
  if (gitExecutable === null) return { kind: "unavailable", reason: "no trusted Git was found for the payload secret scan" };
  const workspace = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-remote-scan-")));
  try {
    const names = new Map<string, string>();
    sections.forEach(({ path, text }, index) => {
      // Each section keeps its file's own name in its own folder, so rules that key on a file name
      // or extension (Terraform, Kubernetes YAML, and others) still apply.
      const folder = `section-${String(index + 1).padStart(4, "0")}`;
      const name = basename(path).replace(/[^A-Za-z0-9._-]/gu, "_") || "file";
      names.set(`${folder}/${name}`, path);
      mkdirSync(join(workspace, folder));
      writeFileSync(join(workspace, folder, name), text.replace(/gitleaks:allow/giu, "gitleaks:removed"));
    });
    // Only PATH and (on Windows) SystemRoot carry over; no Git setting or identity from the caller does.
    const gitEnv: NodeJS.ProcessEnv = { GIT_CONFIG_NOSYSTEM: "1", HOME: workspace };
    for (const name of ["PATH", "SystemRoot"]) if (process.env[name] !== undefined) gitEnv[name] = process.env[name];
    const git = (args: readonly string[]): void => {
      execFileSync(gitExecutable, ["-c", "core.hooksPath=", "-c", "commit.gpgSign=false", "-c", "user.name=ascout", "-c", "user.email=ascout@invalid", ...args], { cwd: workspace, windowsHide: true, stdio: "ignore", env: gitEnv });
    };
    git(["init", "-q"]);
    git(["add", "--all"]);
    git(["commit", "-q", "-m", "payload"]);
    const outcome = await runSecurityGitleaksV1(workspace, gitleaksPath, { ...(signal === undefined ? {} : { signal }) });
    if (outcome.kind !== "report" || !outcome.report.engine.executed) {
      return { kind: "unavailable", reason: "the payload secret scan did not run, and remote review never sends an unscanned payload" };
    }
    if (outcome.report.findings.length > 0) {
      const hitNames = new Set(outcome.report.findings.map((finding) => String(finding.path).replaceAll("\\", "/")));
      return { kind: "hits", files: [...new Set([...names].filter(([name]) => hitNames.has(name)).map(([, path]) => path))].sort() };
    }
    // Clean has exactly one shape: Gitleaks ran to the end, wrote its report, and found nothing.
    // Every other result, such as output over the cap, cancellation, or a stray process, refuses.
    if (outcome.report.reason_code !== "COVERAGE_UNPROVEN") {
      return { kind: "unavailable", reason: `the payload secret scan did not complete (${outcome.report.reason_code}), and remote review never sends an unscanned payload` };
    }
    return { kind: "clean" };
  } catch {
    return { kind: "unavailable", reason: "the payload secret scan could not be prepared" };
  } finally {
    try {
      rmSync(workspace, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {
      // Holds only the payload copy, in this account's temporary folder.
    }
  }
}

/** One HTTPS exchange with the pinned address. No proxy, no redirects, a bounded reply. */
export interface RemoteExchangeV1 {
  readonly address: string;
  readonly family: 4 | 6;
  readonly endpoint: RemoteEndpointV1;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly timeoutMs: number;
  readonly maxBytes: number;
  readonly signal: AbortSignal;
}

export type RemoteTransportV1 = (exchange: RemoteExchangeV1) => Promise<{ readonly status: number; readonly text: string | null }>;

/** The real transport: Node's https with its own agent (so no proxy applies) and the resolved address pinned. */
export const httpsTransportV1: RemoteTransportV1 = (exchange) => new Promise((resolvePromise) => {
  const agent = new Agent({ keepAlive: false });
  const req = request({
    host: exchange.endpoint.hostname,
    servername: exchange.endpoint.hostname,
    port: exchange.endpoint.port,
    path: `${exchange.endpoint.path}/chat/completions`,
    method: "POST",
    agent,
    headers: exchange.headers,
    // The address was resolved and checked once; the connection uses exactly that address. Node asks
    // for every address (all: true) when it may try several families, so both forms are answered.
    lookup: (_host, options, callback) => {
      if ((options as { all?: boolean }).all === true) {
        (callback as (error: Error | null, addresses: { address: string; family: number }[]) => void)(null, [{ address: exchange.address, family: exchange.family }]);
      } else {
        (callback as (error: Error | null, address: string, family: number) => void)(null, exchange.address, exchange.family);
      }
    },
    // Explicit, so NODE_TLS_REJECT_UNAUTHORIZED in the environment can't turn certificate checks off.
    rejectUnauthorized: true,
    timeout: exchange.timeoutMs,
    signal: exchange.signal,
  }, (response) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    response.on("data", (chunk: Buffer) => {
      bytes += chunk.byteLength;
      if (bytes > exchange.maxBytes) {
        req.destroy();
        resolvePromise({ status: response.statusCode ?? 0, text: null });
        return;
      }
      chunks.push(chunk);
    });
    response.on("end", () => resolvePromise({ status: response.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8") }));
    response.on("error", () => resolvePromise({ status: 0, text: null }));
  });
  req.on("timeout", () => req.destroy(new Error("timeout")));
  // An overall deadline too: a server trickling bytes would otherwise keep resetting the idle timeout.
  const deadline = setTimeout(() => {
    req.destroy(new Error("deadline"));
    resolvePromise({ status: 0, text: null });
  }, exchange.timeoutMs);
  deadline.unref();
  req.on("close", () => clearTimeout(deadline));
  req.on("error", () => resolvePromise({ status: 0, text: null }));
  req.end(exchange.body);
});

export type RemoteResolverV1 = (hostname: string) => Promise<readonly { readonly address: string; readonly family: number }[]>;
export const dnsResolverV1: RemoteResolverV1 = (hostname) => lookup(hostname, { all: true, verbatim: true });

/** The real terminal, payload scan, DNS, and network, as the CLI uses them. */
export function defaultRemoteReviewDepsV1(repositoryRoot: string, gitleaksPath: string | null, signal?: AbortSignal): Pick<RemoteReviewInputV1, "confirm" | "scan" | "resolve" | "transport"> {
  return {
    confirm: (disclosure) => confirmAtTerminalV1(disclosure),
    scan: (sections) => scanRemotePayloadV1(sections, gitleaksPath, signal, repositoryRoot),
    resolve: dnsResolverV1,
    transport: httpsTransportV1,
  };
}

export type RemoteReviewResultV1 =
  | { readonly kind: "review"; readonly report: LocalReviewCommandReportV1 & { readonly remote: RemoteProvenanceV1 } }
  | { readonly kind: "not_run"; readonly reason: string; readonly disclosure: RemoteDisclosureV1 | null }
  | { readonly kind: "dry_run"; readonly disclosure: RemoteDisclosureV1; readonly payload: string }
  | { readonly kind: "error"; readonly message: string };

export interface RemoteProvenanceV1 {
  readonly egress: "REMOTE";
  readonly host: string;
  readonly payload_sha256: string;
  readonly cost: "OPERATOR_ACCOUNT";
  readonly node_extra_ca_certs: boolean;
}

export interface RemoteReviewInputV1 {
  readonly repositoryRoot: string;
  readonly target_id: string;
  readonly head_sha: string;
  readonly config: RemoteReviewConfigResultV2;
  readonly changed_files: readonly GitChangedFile[];
  readonly changes: readonly ReviewChangeV1[];
  readonly readText: (path: string, maxBytes: number) => string | null;
  readonly redact: (text: string) => string;
  readonly gitleaksPath: string | null;
  readonly dryRun: boolean;
  readonly env: NodeJS.ProcessEnv;
  readonly signal?: AbortSignal;
  /** The terminal, the payload scan, DNS, and the network. The CLI passes the real ones; tests pass recorders. */
  readonly confirm: (disclosure: RemoteDisclosureV1) => string | null;
  readonly scan: (sections: readonly { path: string; text: string }[]) => Promise<PayloadScanV1>;
  readonly resolve: RemoteResolverV1;
  readonly transport: RemoteTransportV1;
}

/** Splits a payload into its per-file sections, so a scan hit can name the file. */
function payloadSections(text: string, files: readonly string[]): { path: string; text: string }[] {
  const parts = text.split(/\n(?==== FILE: )/u);
  return parts.map((part, index) => ({ path: files[index]!, text: part }));
}

/**
 * Runs one remote review. Every refusal before sending is "not run" (exit 4); a malformed config is
 * an error (exit 2). Nothing is sent unless every gate passes, in this order: config and both opt-in
 * flags, this repository listed, a credential present, a non-empty payload within limits, a clean
 * Gitleaks scan of the exact payload, a public resolved address, and the host typed at a terminal.
 */
export async function runRemoteReviewV1(input: RemoteReviewInputV1): Promise<RemoteReviewResultV1> {
  const { config } = input;
  if (config.state === "absent") return { kind: "not_run", reason: `no remote review provider is configured; an operator authorizes one in ${config.path}`, disclosure: null };
  if (config.state === "invalid") return { kind: "error", message: `The remote review config at ${config.path} is invalid: ${config.reason}.` };
  const settings = config.config;
  if (!repositoryIsListedV1(input.repositoryRoot, settings.repositories)) {
    return { kind: "not_run", reason: "this repository is not listed in the remote review config, so nothing is sent", disclosure: null };
  }
  const credential = input.env[settings.credential_env] ?? "";
  if (credential === "") return { kind: "not_run", reason: `the credential variable ${settings.credential_env} is not set, so nothing is sent`, disclosure: null };
  // The credential joins the redaction set before anything can echo it.
  const redact = (text: string): string => input.redact(text).split(credential).join("[REDACTED]");

  const excludes = settings.exclude.map((prefix) => samePathKey(prefix.replaceAll("\\", "/").replace(/\/+$/u, "")));
  const excluded = (path: string): boolean => {
    const key = samePathKey(path);
    return isNeverSentPathV1(path) || excludes.some((prefix) => key === prefix || key.startsWith(`${prefix}/`));
  };
  const payload = buildLocalReviewPayloadV1(
    input.changed_files.filter((file) => !excluded(file.path)),
    input.readText,
    redact,
    { ...LOCAL_REVIEW_LIMITS, max_payload_bytes: settings.limits.max_payload_bytes },
  );
  if (payload.reviewed_files.length === 0) return { kind: "not_run", reason: "no changed file has text lines that may be sent", disclosure: null };
  const payloadSha = createHash("sha256").update(payload.text, "utf8").digest("hex");
  const configPath = config.path;
  const disclosure: RemoteDisclosureV1 = {
    host: settings.endpoint.hostname,
    endpoint: settings.endpoint.url,
    model: settings.model,
    files: payload.reviewed_files.length,
    bytes: Buffer.byteLength(payload.text, "utf8"),
    payload_sha256: payloadSha,
    last_confirmed_host: lastConfirmedHost(configPath, input.repositoryRoot),
  };
  if (input.dryRun) return { kind: "dry_run", disclosure, payload: payload.text };

  const scan = await input.scan(payloadSections(payload.text, payload.reviewed_files));
  if (scan.kind === "unavailable") return { kind: "not_run", reason: scan.reason, disclosure };
  if (scan.kind === "hits") return { kind: "not_run", reason: `the payload secret scan found possible secrets in ${scan.files.join(", ")}, so nothing was sent`, disclosure };

  let addresses: readonly { address: string; family: number }[];
  try {
    addresses = await input.resolve(settings.endpoint.hostname);
  } catch {
    return { kind: "not_run", reason: "the remote host could not be resolved, so nothing was sent", disclosure };
  }
  if (addresses.length === 0 || addresses.some((entry) => !isPublicAddressV1(entry.address))) {
    return { kind: "not_run", reason: "the remote host resolves to a private, loopback, link-local, or reserved address, so nothing was sent", disclosure };
  }
  const pinned = addresses[0]!;

  const typed = input.confirm(disclosure);
  if (typed === null) return { kind: "not_run", reason: "no terminal is available to confirm remote review, so nothing was sent", disclosure };
  if (typed.toLowerCase() !== settings.endpoint.hostname) return { kind: "not_run", reason: "the host was not confirmed, so nothing was sent", disclosure };
  recordConfirmedHost(configPath, input.repositoryRoot, settings.endpoint.hostname);

  const body = JSON.stringify({
    model: settings.model,
    stream: false,
    temperature: 0,
    max_tokens: settings.limits.max_output_tokens,
    messages: [
      { role: "system", content: REVIEW_INSTRUCTIONS },
      { role: "user", content: `Change to review (numbered excerpts of the changed files):\n<diff>\n${payload.text}\n</diff>` },
    ],
  });
  const reply = await input.transport({
    address: pinned.address,
    family: pinned.family === 6 ? 6 : 4,
    endpoint: settings.endpoint,
    headers: { "content-type": "application/json", authorization: `Bearer ${credential}`, host: settings.endpoint.hostname },
    body,
    timeoutMs: REMOTE_LIMITS.timeout_ms,
    maxBytes: REMOTE_LIMITS.max_response_bytes,
    signal: input.signal ?? new AbortController().signal,
  });
  if (reply.status >= 300 && reply.status < 400) return { kind: "not_run", reason: "the remote provider answered with a redirect, which is never followed", disclosure };
  if (reply.status !== 200 || reply.text === null) {
    return { kind: "not_run", reason: `the remote provider did not return a review (HTTP ${reply.status === 0 ? "no response" : reply.status})`, disclosure };
  }
  let content: string;
  try {
    const parsed = JSON.parse(reply.text) as { choices?: { message?: { content?: unknown } }[] };
    const raw = parsed.choices?.[0]?.message?.content;
    if (typeof raw !== "string") throw new Error("no content");
    content = unwrapJsonFenceV1(raw);
  } catch {
    return { kind: "not_run", reason: "the remote provider's reply was not the expected chat completion", disclosure };
  }

  const binding = {
    engine_id: REMOTE_REVIEW_ENGINE_ID,
    binary_name: "remote",
    observed_version: "unknown",
    profile_id: LOCAL_REVIEW_PROFILE_ID,
    capsule_id: LOCAL_REVIEW_CAPSULE_ID,
    head_sha: input.head_sha,
  };
  // The model can echo the credential or a secret back; both are removed before anything is reported.
  const findings = parseReviewFindingsV1(content, binding, redact);
  if (!findings.well_formed) return { kind: "not_run", reason: "the remote model's reply was not the expected findings object", disclosure };
  const context = { expected_head_sha: input.head_sha, known_files: payload.reviewed_files, file_line_counts: payload.line_counts };
  const changedRanges = new Map(input.changed_files.map((file) => [file.path, file.changed_new_line_ranges]));
  const review = buildReviewReportV1({
    target_id: input.target_id,
    head_sha: input.head_sha,
    profile_id: LOCAL_REVIEW_PROFILE_ID,
    capsule_id: LOCAL_REVIEW_CAPSULE_ID,
    groups: [{ group_id: GROUP_ID, files: input.changes.map((change) => change.path).sort() }],
    reviewed_files: payload.reviewed_files,
    entries: findings.observations.map((observation) => ({
      observation,
      validation: findingOnChangedLinesV1(observation, validateObservationLocationV1(observation, context), changedRanges),
    })),
  });
  const outcome: LocalReviewOutcomeV1 = review.counts.promotable > 0 ? "FINDINGS" : review.counts.complete ? "NO_FINDINGS" : "INCOMPLETE";
  const exit_code = outcome === "FINDINGS" ? 1 : 4;
  const independence = settings.model_family.toLowerCase() === LOCAL_REVIEW_AUTHOR_FAMILY ? "SAME_MODEL_FAMILY" : "INDEPENDENT_MODEL";
  const reason_text = {
    FINDINGS: "The remote model reported findings. They are advisory and untrusted; check each one.",
    NO_FINDINGS: "The remote model reported nothing it could place on the changed lines. That is advice, not a clean review, so the change still counts as unreviewed.",
    INCOMPLETE: "The remote model reviewed only part of the change, and the rest stays unreviewed.",
  }[outcome];
  return {
    kind: "review",
    report: Object.freeze({
      ...review,
      advisory: true as const,
      satisfies_human_r1: false as const,
      outcome,
      exit_code,
      reason_text,
      provider: Object.freeze({
        provider_identity: `remote:${settings.endpoint.hostname}:${settings.model}`.slice(0, 128),
        model: settings.model,
        model_family: settings.model_family,
        independence,
        server_version: "unknown",
        rejected_findings: findings.rejected,
      }),
      comparison: Object.freeze({ kind: "working_tree_vs_head" as const, base_ref: input.head_sha }),
      considered: "working_tree_and_index_only" as const,
      changes: Object.freeze(input.changes.map((change) => Object.freeze({ ...change }))),
      remote: Object.freeze({
        egress: "REMOTE" as const,
        host: settings.endpoint.hostname,
        payload_sha256: payloadSha,
        cost: "OPERATOR_ACCOUNT" as const,
        node_extra_ca_certs: (input.env.NODE_EXTRA_CA_CERTS ?? "") !== "",
      }),
    }),
  };
}
