import { readFileSync } from "node:fs";

import {
  PR_EVIDENCE_MAX_BYTES,
  checkRunFromEvidenceV1,
  evidenceMatchesHeadV1,
  isOwnSummaryCommentV1,
  summaryCommentV1,
  validatePrEvidenceV1,
  type PublishContextV1,
} from "./pr-evidence.js";

/**
 * Publishes validated PR evidence to GitHub. This runs only in the privileged job (workflow_run),
 * from trusted default-branch code, and never runs pull request code. Every input that decides
 * where to write comes from the trusted workflow event, not from the bundle.
 */
export interface PublishInputV1 {
  readonly bundlePath: string;
  /** owner/name of the base repository, from GITHUB_REPOSITORY. */
  readonly repository: string;
  /** The PR head commit from the trusted event (workflow_run.head_sha). */
  readonly headSha: string;
  /** The PR head repository (workflow_run.head_repository.full_name). */
  readonly headRepository: string;
  /** The PR head branch (workflow_run.head_branch). */
  readonly headBranch: string;
  /** A link to the collecting run (workflow_run.html_url). */
  readonly detailsUrl: string;
  readonly token: string;
  readonly apiUrl: string;
  /** The login the publisher's comments are written as. */
  readonly botLogin: string;
  readonly fetch?: typeof fetch;
}

export type PublishOutcomeV1 =
  | { readonly kind: "published"; readonly pr: number; readonly conclusion: string; readonly check_run_id: number; readonly comment: "created" | "updated" }
  | { readonly kind: "stale"; readonly pr: number; readonly current_head: string }
  | { readonly kind: "refused"; readonly reason: string };

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

/** The API origin must be https, or loopback http for tests. Nothing else is ever contacted. */
export function apiOriginV1(apiUrl: string): string {
  const url = new URL(apiUrl);
  const loopback = url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "[::1]");
  if (url.protocol !== "https:" && !loopback) throw new Error("the GitHub API URL must use https");
  if (url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") throw new Error("the GitHub API URL must be a plain origin");
  return url.origin + url.pathname.replace(/\/+$/u, "");
}

export async function publishPrEvidenceV1(input: PublishInputV1): Promise<PublishOutcomeV1> {
  if (!REPO.test(input.repository) || !REPO.test(input.headRepository)) return { kind: "refused", reason: "invalid repository name" };
  if (!SHA.test(input.headSha)) return { kind: "refused", reason: "invalid head sha" };
  if (input.headBranch.length === 0 || input.headBranch.length > 255 || /[\u0000-\u001f]/u.test(input.headBranch)) return { kind: "refused", reason: "invalid head branch" };
  const detailsUrl = new URL(input.detailsUrl);
  if (detailsUrl.protocol !== "https:") return { kind: "refused", reason: "details URL must use https" };

  let text: string;
  try {
    const raw = readFileSync(input.bundlePath);
    if (raw.byteLength > PR_EVIDENCE_MAX_BYTES) return { kind: "refused", reason: "bundle is larger than its limit" };
    text = raw.toString("utf8");
  } catch {
    return { kind: "refused", reason: "bundle could not be read" };
  }
  const validated = validatePrEvidenceV1(text);
  if (!validated.ok) return { kind: "refused", reason: `bundle rejected: ${validated.reason}` };
  const evidence = validated.evidence;

  const origin = apiOriginV1(input.apiUrl);
  const doFetch = input.fetch ?? fetch;
  const api = async (method: string, path: string, body?: unknown): Promise<unknown> => {
    const response = await doFetch(`${origin}${path}`, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${input.token}`,
        "x-github-api-version": "2022-11-28",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const textBody = await response.text();
    if (Buffer.byteLength(textBody) > MAX_RESPONSE_BYTES) throw new Error(`GitHub API ${method} ${path}: response too large`);
    if (!response.ok) throw new Error(`GitHub API ${method} ${path}: HTTP ${response.status}`);
    return textBody === "" ? null : JSON.parse(textBody);
  };

  const [owner] = input.headRepository.split("/");
  const pulls = await api("GET", `/repos/${input.repository}/pulls?state=open&head=${encodeURIComponent(`${owner}:${input.headBranch}`)}&per_page=10`) as { number: number; head: { sha: string; repo: { full_name: string } | null } }[];
  const pr = pulls.find((candidate) => candidate.head.repo?.full_name === input.headRepository);
  if (pr === undefined) return { kind: "refused", reason: "no open pull request for that head branch" };
  // The trusted SHA must still be the PR head. If someone pushed since collection, this result is stale.
  if (pr.head.sha !== input.headSha) return { kind: "stale", pr: pr.number, current_head: pr.head.sha };

  const context: PublishContextV1 = {
    trusted_head_sha: input.headSha,
    evidence_trusted: input.headRepository === input.repository,
    details_url: detailsUrl.toString(),
  };
  if (!evidenceMatchesHeadV1(evidence, context)) return { kind: "refused", reason: "the evidence describes a different commit than the pull request head" };

  const run = checkRunFromEvidenceV1(evidence, context);
  const created = await api("POST", `/repos/${input.repository}/check-runs`, run) as { id: number };

  const body = summaryCommentV1(evidence);
  let existing: { id: number } | undefined;
  for (let page = 1; page <= 10 && existing === undefined; page += 1) {
    const comments = await api("GET", `/repos/${input.repository}/issues/${pr.number}/comments?per_page=100&page=${page}`) as { id: number; user: { login: string } | null; body: string | null }[];
    existing = comments.find((comment) => isOwnSummaryCommentV1(comment, input.botLogin));
    if (comments.length < 100) break;
  }
  if (existing !== undefined) {
    await api("PATCH", `/repos/${input.repository}/issues/comments/${existing.id}`, { body });
  } else {
    await api("POST", `/repos/${input.repository}/issues/${pr.number}/comments`, { body });
  }
  return { kind: "published", pr: pr.number, conclusion: run.conclusion, check_run_id: created.id, comment: existing === undefined ? "created" : "updated" };
}
