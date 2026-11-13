import { writeFileSync } from "node:fs";

import { readBoundedRegularFileV1 } from "../assurance/review/delegated-review.js";

import { composeSourceState } from "../check.js";
import { readContainedWorktreeText, readWorkingTreeComparison, worktreeMatchesCommitV1 } from "../git.js";
import { collectReviewChanges } from "../command-functions.js";
import { redactExactValues, selectedSecretValues } from "../redact.js";
import {
  defaultRemoteReviewDepsV1,
  parseRemoteEndpointV1,
  runRemoteReviewV1,
  type PayloadScanV1,
  type RemoteResolverV1,
  type RemoteTransportV1,
} from "../assurance/review/remote-review.js";
import { apiOriginV1, isTrustedActorV1 } from "./publish.js";

/**
 * AI review in pull requests (E10f, founder-approved as optional 2026-11-13). Two jobs in a workflow
 * that runs default-branch code on workflow_run:
 *
 * 1. `ascout pr-ai-review` holds the model key and a read-only token. It decides trust from GitHub's
 *    API (same repository, default-branch base, an allowlisted human author and triggering actor),
 *    reads the PR head as data (never installed or run), and sends it under every E10c rule except the
 *    terminal confirmation, which the trust check replaces. It writes a findings artifact.
 * 2. `ascout pr-ai-publish <artifact>` holds a token that can comment, and no model key. It validates
 *    the artifact strictly and keeps one advisory comment up to date. It never creates or changes a
 *    check run, so AI review can't affect any gate, and an incomplete result is never a pass.
 */
export const AI_REVIEW_SCHEMA = "ascout.pr-ai-review/v1" as const;
export const AI_REVIEW_CREDENTIAL_ENV = "ASCOUT_AI_API_KEY" as const;
export const AI_REVIEW_COMMENT_MARKER = "<!-- ascout:ai-review -->" as const;
const AI_LIMITS = Object.freeze({ max_artifact_bytes: 1024 * 1024, max_findings: 200, max_message_chars: 2000 });
const SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const PAYLOAD_SHA = /^[0-9a-f]{64}$/u;
const MODEL_NAME = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,127}$/u;
const HOST = /^[a-z0-9.-]{1,253}$/u;
const SEVERITIES = new Set(["info", "minor", "major", "critical", "unknown"]);
const CATEGORY = /^[a-z][a-z0-9_-]{0,31}$/u;
const ARTIFACT_KEYS = new Set(["schema", "head_sha", "pr", "outcome", "reason", "model", "model_family", "host", "payload_sha256", "advisory", "satisfies_human_r1", "findings"]);
const FINDING_KEYS = new Set(["path", "start_line", "end_line", "severity", "category", "message"]);
const OUTCOMES = new Set(["FINDINGS", "NO_FINDINGS", "INCOMPLETE", "NOT_RUN"]);

export interface AiFindingV1 {
  readonly path: string;
  readonly start_line: number;
  readonly end_line: number;
  readonly severity: string;
  readonly category: string;
  readonly message: string;
}

export interface AiReviewArtifactV1 {
  readonly schema: typeof AI_REVIEW_SCHEMA;
  readonly head_sha: string;
  readonly pr: number;
  readonly outcome: "FINDINGS" | "NO_FINDINGS" | "INCOMPLETE" | "NOT_RUN";
  readonly reason: string;
  readonly model: string;
  readonly model_family: string;
  readonly host: string;
  readonly payload_sha256: string | null;
  readonly advisory: true;
  readonly satisfies_human_r1: false;
  readonly findings: readonly AiFindingV1[];
}

type FetchLike = typeof fetch;

function githubApi(apiUrl: string, token: string, doFetch: FetchLike) {
  const origin = apiOriginV1(apiUrl);
  return async (method: string, path: string, body?: unknown): Promise<unknown> => {
    const response = await doFetch(`${origin}${path}`, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    if (Buffer.byteLength(text) > 4 * 1024 * 1024) throw new Error(`GitHub API ${method} ${path}: response too large`);
    if (!response.ok) throw new Error(`GitHub API ${method} ${path}: HTTP ${response.status}`);
    return text === "" ? null : JSON.parse(text);
  };
}

type Pull = { number: number; state?: string; user: { login: string; type?: string } | null; base: { ref: string }; head: { sha: string; repo: { full_name: string } | null } };

export interface PrAiReviewInputV1 {
  readonly repository: string;
  readonly prNumber: number;
  readonly headSha: string;
  readonly headRepository: string;
  readonly requiredBase: string;
  readonly triggeringActor: string;
  readonly trustedActors: readonly string[];
  readonly token: string;
  readonly apiUrl: string;
  readonly root: string;
  readonly endpoint: string;
  readonly model: string;
  readonly modelFamily: string;
  readonly credential: string;
  readonly gitleaksPath: string | null;
  readonly signal?: AbortSignal;
  /** The GitHub API, the payload scan, DNS, and the network. The CLI passes the real ones. */
  readonly deps: PrAiDepsV1;
}

export interface PrAiDepsV1 {
  readonly fetch: FetchLike;
  readonly scan: (sections: readonly { path: string; text: string }[]) => Promise<PayloadScanV1>;
  readonly resolve: RemoteResolverV1;
  readonly transport: RemoteTransportV1;
}

/** The real dependencies, as the CLI uses them. */
export function defaultPrAiDepsV1(root: string, gitleaksPath: string | null, signal?: AbortSignal): PrAiDepsV1 {
  const remote = defaultRemoteReviewDepsV1(root, gitleaksPath, signal);
  return { fetch, scan: remote.scan, resolve: remote.resolve, transport: remote.transport };
}

/** Why remote review sent nothing, whatever kind of non-review result it returned. */
export function describeRemoteRefusalV1(result: { readonly kind: string; readonly reason?: string; readonly message?: string }): string {
  return result.reason ?? result.message ?? `remote review did not run (${result.kind})`;
}

export type PrAiReviewResultV1 =
  | { readonly kind: "artifact"; readonly artifact: AiReviewArtifactV1 }
  | { readonly kind: "stale"; readonly current_head: string }
  | { readonly kind: "error"; readonly message: string };

function notRunArtifact(input: Pick<PrAiReviewInputV1, "headSha" | "prNumber" | "model" | "modelFamily">, host: string, reason: string): AiReviewArtifactV1 {
  return {
    schema: AI_REVIEW_SCHEMA,
    head_sha: input.headSha,
    pr: input.prNumber,
    outcome: "NOT_RUN",
    reason,
    model: input.model,
    model_family: input.modelFamily,
    host,
    payload_sha256: null,
    advisory: true,
    satisfies_human_r1: false,
    findings: [],
  };
}

/**
 * Job 1. Nothing is sent unless the PR is trusted under the same rule the publisher uses, the
 * checkout holds exactly the PR head, and every E10c gate passes.
 */
export async function runPrAiReviewV1(input: PrAiReviewInputV1): Promise<PrAiReviewResultV1> {
  if (!SHA.test(input.headSha)) return { kind: "error", message: "the PR head is not a commit ID" };
  if (!MODEL_NAME.test(input.model) || !MODEL_NAME.test(input.modelFamily)) return { kind: "error", message: "the model and model family must be plain names" };
  const endpoint = parseRemoteEndpointV1(input.endpoint);
  if (typeof endpoint === "string") return { kind: "error", message: `the AI review endpoint is invalid: ${endpoint}` };
  if (input.credential === "") return { kind: "artifact", artifact: notRunArtifact(input, endpoint.hostname, `${AI_REVIEW_CREDENTIAL_ENV} is not set, so nothing was sent`) };

  let pr: Pull;
  try {
    pr = await githubApi(input.apiUrl, input.token, input.deps.fetch)("GET", `/repos/${input.repository}/pulls/${input.prNumber}`) as Pull;
  } catch (error) {
    return { kind: "error", message: (error as Error).message };
  }
  if (pr.state !== "open") return { kind: "artifact", artifact: notRunArtifact(input, endpoint.hostname, "the pull request is not open, so nothing was sent") };
  if (pr.head.sha !== input.headSha) return { kind: "stale", current_head: pr.head.sha };
  // Untrusted code may be anyone's: a fork, a bot, or an author not on the allowlist. Its source is
  // never sent with the operator's key.
  const trusted = input.headRepository === input.repository
    && pr.head.repo?.full_name === input.repository
    && pr.base.ref === input.requiredBase
    && isTrustedActorV1(input.triggeringActor, input.trustedActors)
    && isTrustedActorV1(pr.user?.login ?? "", input.trustedActors);
  if (!trusted) return { kind: "artifact", artifact: notRunArtifact(input, endpoint.hostname, "the pull request is not from a trusted maintainer on this repository, so nothing was sent") };

  if (!worktreeMatchesCommitV1(input.root, input.headSha)) {
    return { kind: "error", message: "the working tree does not hold exactly the pull request head's content" };
  }
  const state = composeSourceState(input.root);
  const comparison = readWorkingTreeComparison(input.root, state.head_sha);
  const changes = collectReviewChanges(input.root, state.head_sha, comparison.changed_files);
  const secrets = [...selectedSecretValues(process.env, { recognized_names: [], configured_names: [], minimum_value_bytes: 8 }), input.credential];
  const result = await runRemoteReviewV1({
    repositoryRoot: input.root,
    target_id: state.repository_id,
    head_sha: state.head_sha,
    config: {
      state: "loaded",
      path: "(workflow)",
      config: {
        provider: "openai-compatible",
        endpoint,
        model: input.model,
        model_family: input.modelFamily,
        credential_env: AI_REVIEW_CREDENTIAL_ENV,
        repositories: [input.root],
        limits: { max_payload_bytes: 120 * 1024, max_output_tokens: 8000 },
        exclude: [],
      },
    },
    changed_files: comparison.changed_files,
    changes,
    readText: (path, maxBytes) => readContainedWorktreeText(input.root, path, maxBytes),
    redact: (text) => redactExactValues(text, secrets),
    gitleaksPath: input.gitleaksPath,
    dryRun: false,
    env: { [AI_REVIEW_CREDENTIAL_ENV]: input.credential },
    ...(input.signal === undefined ? {} : { signal: input.signal }),
    scan: input.deps.scan,
    resolve: input.deps.resolve,
    transport: input.deps.transport,
    // The workflow's trust check, which only maintainers can change on the default branch, stands in
    // for the person at the terminal.
    confirm: () => endpoint.hostname,
  });
  if (result.kind !== "review") return { kind: "artifact", artifact: notRunArtifact(input, endpoint.hostname, describeRemoteRefusalV1(result as { kind: string })) };
  const findings: AiFindingV1[] = result.report.records
    .filter((record) => record.promotable && record.observation.location_hint !== null && record.observation.location_hint.start_line !== null)
    .slice(0, AI_LIMITS.max_findings)
    .map((record) => {
      const hint = record.observation.location_hint!;
      return {
        path: hint.path,
        start_line: hint.start_line!,
        end_line: hint.end_line ?? hint.start_line!,
        severity: record.observation.severity_hint,
        category: record.observation.category_hint,
        message: record.observation.body.slice(0, AI_LIMITS.max_message_chars),
      };
    });
  return {
    kind: "artifact",
    artifact: {
      schema: AI_REVIEW_SCHEMA,
      head_sha: input.headSha,
      pr: input.prNumber,
      outcome: result.report.outcome,
      reason: result.report.reason_text,
      model: input.model,
      model_family: input.modelFamily,
      host: endpoint.hostname,
      payload_sha256: result.report.remote.payload_sha256,
      advisory: true,
      satisfies_human_r1: false,
      findings,
    },
  };
}

function safePath(path: unknown): path is string {
  return typeof path === "string" && path.length > 0 && path.length <= 1024 && !path.includes("\\") && !path.startsWith("/") &&
    !/^[A-Za-z]:/u.test(path) && !/[\u0000-\u001f\u007f]/u.test(path) && path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

const line = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;

/** Reads and strictly checks an AI review artifact. Every problem refuses the whole artifact. */
export function readAiReviewArtifactV1(path: string, trustedHeadSha: string): AiReviewArtifactV1 {
  const text = readBoundedRegularFileV1(path, AI_LIMITS.max_artifact_bytes, "AI review artifact");
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new Error("the AI review artifact is not valid JSON");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("the AI review artifact is not a JSON object");
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) if (!ARTIFACT_KEYS.has(key)) throw new Error("the AI review artifact has an unknown key");
  if (record.schema !== AI_REVIEW_SCHEMA) throw new Error(`the AI review artifact's schema must be ${AI_REVIEW_SCHEMA}`);
  // The commit comes from the trusted event, never from the artifact.
  if (record.head_sha !== trustedHeadSha) throw new Error("the AI review artifact describes a different commit than the pull request head");
  if (!Number.isSafeInteger(record.pr) || (record.pr as number) <= 0) throw new Error("the AI review artifact names no pull request");
  if (typeof record.outcome !== "string" || !OUTCOMES.has(record.outcome)) throw new Error("the AI review artifact's outcome is unknown");
  if (typeof record.reason !== "string" || record.reason.length > 500) throw new Error("the AI review artifact's reason is invalid");
  if (typeof record.model !== "string" || !MODEL_NAME.test(record.model) || typeof record.model_family !== "string" || !MODEL_NAME.test(record.model_family)) throw new Error("the AI review artifact's model is invalid");
  if (typeof record.host !== "string" || !HOST.test(record.host)) throw new Error("the AI review artifact's host is invalid");
  if (record.payload_sha256 !== null && (typeof record.payload_sha256 !== "string" || !PAYLOAD_SHA.test(record.payload_sha256))) throw new Error("the AI review artifact's payload digest is invalid");
  if (record.advisory !== true || record.satisfies_human_r1 !== false) throw new Error("the AI review artifact must be advisory and never human review");
  if (!Array.isArray(record.findings) || record.findings.length > AI_LIMITS.max_findings) throw new Error("the AI review artifact's findings are invalid");
  if (record.outcome !== "FINDINGS" && record.findings.length > 0) throw new Error("the AI review artifact lists findings under an outcome without any");
  const findings = (record.findings as unknown[]).map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) throw new Error("an AI finding is not a JSON object");
    const finding = entry as Record<string, unknown>;
    for (const key of Object.keys(finding)) if (!FINDING_KEYS.has(key)) throw new Error("an AI finding has an unknown key");
    if (!safePath(finding.path) || !line(finding.start_line) || !line(finding.end_line) || (finding.end_line as number) < (finding.start_line as number)) throw new Error("an AI finding's location is invalid");
    if (typeof finding.severity !== "string" || !SEVERITIES.has(finding.severity) || typeof finding.category !== "string" || !(CATEGORY.test(finding.category) || finding.category === "unknown")) throw new Error("an AI finding's severity or category is invalid");
    if (typeof finding.message !== "string" || finding.message.length === 0 || finding.message.length > AI_LIMITS.max_message_chars) throw new Error("an AI finding's message is invalid");
    return finding as unknown as AiFindingV1;
  });
  return { ...(record as unknown as AiReviewArtifactV1), findings };
}

/**
 * Model text as an inline code span. GitHub renders nothing inside one: no HTML, no autolinked URL,
 * no mention, no issue reference. Backticks can't close the span (they become a different quote),
 * and inside a table a pipe is escaped so it can't start a new cell.
 */
function inert(text: string, inTable = false): string {
  const flat = text.replace(/[\u0000-\u001f\u007f\u2028\u2029]/gu, " ").replaceAll("`", "\u02bc").trim();
  const safe = inTable ? flat.replaceAll("\\", "\\\\").replaceAll("|", "\\|") : flat;
  return safe === "" ? "(none)" : `\`${safe}\``;
}

/** GitHub refuses comments over 65,536 characters; findings past this budget are counted, not shown. */
export const AI_REVIEW_COMMENT_MAX_CHARS = 60_000;

export function aiReviewCommentV1(artifact: AiReviewArtifactV1): string {
  const lines = [
    AI_REVIEW_COMMENT_MARKER,
    "### Ascout AI review (advisory)",
    "",
    `Model ${inert(artifact.model)} (${inert(artifact.model_family)}) at ${inert(artifact.host)}. This is advisory: it is not a human review, it never changes the **Ascout verification** check, and it can't make an incomplete result pass.`,
    "",
    `Outcome: **${artifact.outcome}**. ${inert(artifact.reason)}`,
  ];
  const footer = ["", `Reviewed commit ${artifact.head_sha}.`];
  if (artifact.findings.length > 0) {
    lines.push("", "| File | Lines | Severity | Finding |", "|---|---|---|---|");
    // Room for the footer and the omission note, so the whole comment stays under the limit.
    let used = lines.join("\n").length + 200;
    let shown = 0;
    for (const finding of artifact.findings) {
      const row = `| ${inert(finding.path, true)} | ${finding.start_line}-${finding.end_line} | ${inert(finding.severity, true)} | ${inert(finding.message, true)} |`;
      if (used + row.length + 1 > AI_REVIEW_COMMENT_MAX_CHARS) break;
      lines.push(row);
      used += row.length + 1;
      shown += 1;
    }
    if (shown < artifact.findings.length) lines.push("", `${artifact.findings.length - shown} more findings are not shown, to keep this comment within GitHub's size limit.`);
  }
  lines.push(...footer);
  return lines.join("\n");
}

export interface PrAiPublishInputV1 {
  readonly repository: string;
  readonly prNumber: number;
  readonly headSha: string;
  readonly artifactPath: string;
  readonly token: string;
  readonly apiUrl: string;
  readonly botLogin: string;
  readonly fetch: FetchLike;
}

export type PrAiPublishResultV1 =
  | { readonly kind: "commented"; readonly comment: "created" | "updated" }
  | { readonly kind: "stale"; readonly current_head: string }
  | { readonly kind: "refused"; readonly reason: string };

/** Job 2: validates the artifact and keeps one advisory comment on the PR. No check run is touched. */
export async function publishPrAiReviewV1(input: PrAiPublishInputV1): Promise<PrAiPublishResultV1> {
  let artifact: AiReviewArtifactV1;
  try {
    artifact = readAiReviewArtifactV1(input.artifactPath, input.headSha);
  } catch (error) {
    return { kind: "refused", reason: (error as Error).message };
  }
  if (artifact.pr !== input.prNumber) return { kind: "refused", reason: "the AI review artifact names a different pull request" };
  const api = githubApi(input.apiUrl, input.token, input.fetch);
  const pr = await api("GET", `/repos/${input.repository}/pulls/${input.prNumber}`) as Pull;
  if (pr.head.sha !== input.headSha) return { kind: "stale", current_head: pr.head.sha };
  const body = aiReviewCommentV1(artifact);
  let existing: { id: number } | undefined;
  for (let page = 1; page <= 10 && existing === undefined; page += 1) {
    const comments = await api("GET", `/repos/${input.repository}/issues/${input.prNumber}/comments?per_page=100&page=${page}`) as { id: number; user: { login: string } | null; body: string | null }[];
    existing = comments.find((comment) => comment.user?.login === input.botLogin && (comment.body ?? "").startsWith(AI_REVIEW_COMMENT_MARKER));
    if (comments.length < 100) break;
  }
  if (existing !== undefined) {
    await api("PATCH", `/repos/${input.repository}/issues/comments/${existing.id}`, { body });
    return { kind: "commented", comment: "updated" };
  }
  await api("POST", `/repos/${input.repository}/issues/${input.prNumber}/comments`, { body });
  return { kind: "commented", comment: "created" };
}

export interface PrAiRunIoV1 {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly cwd: string;
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
  /** Tests only: replaces the GitHub API, the payload scan, DNS, and the network. The CLI never sets it. */
  readonly deps?: PrAiDepsV1;
}

function envValue(env: PrAiRunIoV1["env"], name: string): string {
  const value = env[name];
  return value === undefined ? "" : value;
}

function missing(env: PrAiRunIoV1["env"], names: readonly string[]): string[] {
  return names.filter((name) => envValue(env, name) === "");
}

/**
 * `ascout pr-ai-review`: job 1, driven by the workflow's environment. Writes the artifact to
 * ASCOUT_AI_OUTPUT (a new file). Exits 1 with findings, 4 for any other advisory outcome, 3 when the
 * PR head moved, and 2 for configuration or input errors. Nothing it does can make a check pass.
 */
export async function runPrAiReviewMainV1(argv: readonly string[], io: PrAiRunIoV1): Promise<number> {
  if (argv.length !== 0) {
    io.err("ascout pr-ai-review takes no arguments; it reads the workflow's environment.");
    return 2;
  }
  const required = ["GITHUB_REPOSITORY", "GITHUB_TOKEN", "ASCOUT_PR_NUMBER", "ASCOUT_PR_HEAD_SHA", "ASCOUT_PR_HEAD_REPOSITORY", "ASCOUT_PR_REQUIRED_BASE", "ASCOUT_PR_TRIGGERING_ACTOR", "ASCOUT_AI_ENDPOINT", "ASCOUT_AI_MODEL", "ASCOUT_AI_MODEL_FAMILY", "ASCOUT_AI_OUTPUT"];
  const absent = missing(io.env, required);
  if (absent.length > 0) {
    io.err(`ascout pr-ai-review: ${absent.join(", ")} not set`);
    return 2;
  }
  const prNumber = Number(envValue(io.env, "ASCOUT_PR_NUMBER"));
  if (!Number.isSafeInteger(prNumber) || prNumber <= 0) {
    io.err("ascout pr-ai-review: ASCOUT_PR_NUMBER must be a pull request number");
    return 2;
  }
  const gitleaksPath = envValue(io.env, "ASCOUT_GITLEAKS_PATH") || null;
  let result: PrAiReviewResultV1;
  try {
    result = await runPrAiReviewV1({
      repository: envValue(io.env, "GITHUB_REPOSITORY"),
      prNumber,
      headSha: envValue(io.env, "ASCOUT_PR_HEAD_SHA"),
      headRepository: envValue(io.env, "ASCOUT_PR_HEAD_REPOSITORY"),
      requiredBase: envValue(io.env, "ASCOUT_PR_REQUIRED_BASE"),
      triggeringActor: envValue(io.env, "ASCOUT_PR_TRIGGERING_ACTOR"),
      trustedActors: envValue(io.env, "ASCOUT_PR_TRUSTED_ACTORS").split(",").map((name) => name.trim()).filter((name) => name !== ""),
      token: envValue(io.env, "GITHUB_TOKEN"),
      apiUrl: envValue(io.env, "GITHUB_API_URL") || "https://api.github.com",
      root: io.cwd,
      endpoint: envValue(io.env, "ASCOUT_AI_ENDPOINT"),
      model: envValue(io.env, "ASCOUT_AI_MODEL"),
      modelFamily: envValue(io.env, "ASCOUT_AI_MODEL_FAMILY"),
      credential: envValue(io.env, AI_REVIEW_CREDENTIAL_ENV),
      gitleaksPath,
      deps: io.deps ?? defaultPrAiDepsV1(io.cwd, gitleaksPath),
    });
  } catch (error) {
    io.err(`ascout pr-ai-review: ${(error as Error).message}`);
    return 2;
  }
  if (result.kind === "error") {
    io.err(`ascout pr-ai-review: ${result.message}`);
    return 2;
  }
  if (result.kind === "stale") {
    io.err(`ascout pr-ai-review: the pull request head moved to ${result.current_head}; nothing was sent`);
    return 3;
  }
  try {
    writeFileSync(envValue(io.env, "ASCOUT_AI_OUTPUT"), `${JSON.stringify(result.artifact, null, 2)}\n`, { flag: "wx" });
  } catch (error) {
    io.err(`ascout pr-ai-review: the artifact could not be written: ${(error as Error).message}`);
    return 2;
  }
  io.out(JSON.stringify({ outcome: result.artifact.outcome, findings: result.artifact.findings.length, advisory: true }));
  return result.artifact.outcome === "FINDINGS" ? 1 : 4;
}

/**
 * `ascout pr-ai-publish <artifact>`: job 2. Exits 0 once the advisory comment is written, 3 when the
 * PR head moved, and 2 for a refused artifact or any error. It never touches a check run.
 */
export async function runPrAiPublishMainV1(argv: readonly string[], io: PrAiRunIoV1): Promise<number> {
  if (argv.length !== 1) {
    io.err("ascout pr-ai-publish takes one argument: the AI review artifact path.");
    return 2;
  }
  const absent = missing(io.env, ["GITHUB_REPOSITORY", "GITHUB_TOKEN", "ASCOUT_PR_NUMBER", "ASCOUT_PR_HEAD_SHA"]);
  if (absent.length > 0) {
    io.err(`ascout pr-ai-publish: ${absent.join(", ")} not set`);
    return 2;
  }
  const prNumber = Number(envValue(io.env, "ASCOUT_PR_NUMBER"));
  if (!Number.isSafeInteger(prNumber) || prNumber <= 0) {
    io.err("ascout pr-ai-publish: ASCOUT_PR_NUMBER must be a pull request number");
    return 2;
  }
  try {
    const result = await publishPrAiReviewV1({
      repository: envValue(io.env, "GITHUB_REPOSITORY"),
      prNumber,
      headSha: envValue(io.env, "ASCOUT_PR_HEAD_SHA"),
      artifactPath: argv[0]!,
      token: envValue(io.env, "GITHUB_TOKEN"),
      apiUrl: envValue(io.env, "GITHUB_API_URL") || "https://api.github.com",
      botLogin: envValue(io.env, "ASCOUT_PR_BOT_LOGIN") || "github-actions[bot]",
      fetch: io.deps?.fetch ?? fetch,
    });
    if (result.kind === "refused") {
      io.err(`ascout pr-ai-publish: ${result.reason}`);
      return 2;
    }
    if (result.kind === "stale") {
      io.err(`ascout pr-ai-publish: the pull request head moved to ${result.current_head}; nothing was posted`);
      return 3;
    }
    io.out(JSON.stringify(result));
    return 0;
  } catch (error) {
    io.err(`ascout pr-ai-publish: ${(error as Error).message}`);
    return 2;
  }
}
