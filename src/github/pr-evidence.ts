/**
 * PR evidence for the customer-run GitHub integration.
 *
 * Collection runs Ascout on the PR head in an unprivileged job and writes an evidence bundle.
 * Publication runs later, in a privileged job that never executes PR code. It treats the bundle as
 * untrusted input: validates it strictly, checks the PR head has not moved, and maps it to one
 * GitHub Check Run plus one summary comment. Nothing here talks to the network.
 */
export const PR_EVIDENCE_SCHEMA = "ascout.pr-evidence/v1" as const;
export const PR_EVIDENCE_MAX_BYTES = 1024 * 1024;
export const PR_EVIDENCE_MAX_FINDINGS = 50;
export const CHECK_RUN_NAME = "Ascout verification";
export const SUMMARY_COMMENT_MARKER = "<!-- ascout:pr-summary:v1 -->";

export const CHECK_IDS = ["review", "security", "test"] as const;
export type CheckId = (typeof CHECK_IDS)[number];

/** The A07 states. Only COMPLETE is a pass. */
export const CHECK_STATES = ["COMPLETE", "FINDINGS", "ERROR", "SOURCE_DRIFT", "INCOMPLETE"] as const;
export type CheckState = (typeof CHECK_STATES)[number];

export interface PrFindingV1 {
  readonly check: CheckId;
  readonly path: string | null;
  readonly start_line: number | null;
  readonly end_line: number | null;
  readonly severity: "failure" | "warning" | "notice";
  readonly title: string;
  readonly message: string;
}

export interface PrCheckV1 {
  readonly id: CheckId;
  readonly exit_code: 0 | 1 | 2 | 3 | 4;
  readonly state: CheckState;
  readonly outcome: string;
  readonly reason: string;
}

export interface PrEvidenceV1 {
  readonly schema: typeof PR_EVIDENCE_SCHEMA;
  readonly ascout_version: string;
  readonly head_sha: string;
  readonly checks: readonly PrCheckV1[];
  readonly findings: readonly PrFindingV1[];
  readonly findings_truncated: boolean;
  readonly overall: { readonly state: CheckState; readonly exit_code: 0 | 1 | 2 | 3 | 4 };
}

const SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const STATE_BY_EXIT: Record<number, CheckState> = { 0: "COMPLETE", 1: "FINDINGS", 2: "ERROR", 3: "SOURCE_DRIFT", 4: "INCOMPLETE" };
/** A07 precedence: error, then drift, then findings, then incomplete, then complete. */
const PRECEDENCE: readonly CheckState[] = ["ERROR", "SOURCE_DRIFT", "FINDINGS", "INCOMPLETE", "COMPLETE"];
const EXIT_BY_STATE: Record<CheckState, 0 | 1 | 2 | 3 | 4> = { COMPLETE: 0, FINDINGS: 1, ERROR: 2, SOURCE_DRIFT: 3, INCOMPLETE: 4 };

export function stateForExitCode(exitCode: number): CheckState {
  return STATE_BY_EXIT[exitCode] ?? "ERROR";
}

/** The overall state is the most severe check state. Missing checks make it INCOMPLETE. */
export function overallStateV1(checks: readonly PrCheckV1[]): CheckState {
  if (checks.length === 0) return "INCOMPLETE";
  return PRECEDENCE.find((state) => checks.some((check) => check.state === state)) ?? "INCOMPLETE";
}

export interface BuildPrEvidenceInputV1 {
  readonly ascout_version: string;
  readonly head_sha: string;
  readonly checks: readonly PrCheckV1[];
  readonly findings: readonly PrFindingV1[];
}

export function buildPrEvidenceV1(input: BuildPrEvidenceInputV1): PrEvidenceV1 {
  const state = overallStateV1(input.checks);
  return {
    schema: PR_EVIDENCE_SCHEMA,
    ascout_version: input.ascout_version,
    head_sha: input.head_sha,
    checks: input.checks,
    findings: input.findings.slice(0, PR_EVIDENCE_MAX_FINDINGS),
    findings_truncated: input.findings.length > PR_EVIDENCE_MAX_FINDINGS,
    overall: { state, exit_code: EXIT_BY_STATE[state] },
  };
}

export type ValidationResultV1 = { readonly ok: true; readonly evidence: PrEvidenceV1 } | { readonly ok: false; readonly reason: string };

function boundedString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

function lineNumber(value: unknown): value is number | null {
  return value === null || (Number.isSafeInteger(value) && (value as number) > 0);
}

/** A repository-relative path with no traversal, no absolute root, and no control characters. */
export function safePath(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return false;
  if (/[\u0000-\u001f\u007f]/u.test(value) || value.startsWith("/") || /^[A-Za-z]:/u.test(value) || value.includes("\\")) return false;
  return !value.split("/").some((part) => part === ".." || part === "");
}

function exactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(record).sort();
  return actual.length === keys.length && [...keys].sort().every((key, index) => actual[index] === key);
}

/**
 * Validates an untrusted bundle. The publisher accepts nothing it cannot prove well formed,
 * including a bundle whose overall state disagrees with its own checks.
 */
export function validatePrEvidenceV1(text: string): ValidationResultV1 {
  if (Buffer.byteLength(text, "utf8") > PR_EVIDENCE_MAX_BYTES) return { ok: false, reason: "bundle is larger than its limit" };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, reason: "bundle is not JSON" };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { ok: false, reason: "bundle is not an object" };
  const record = value as Record<string, unknown>;
  if (!exactKeys(record, ["schema", "ascout_version", "head_sha", "checks", "findings", "findings_truncated", "overall"])) return { ok: false, reason: "bundle has unexpected keys" };
  if (record.schema !== PR_EVIDENCE_SCHEMA) return { ok: false, reason: "unsupported bundle schema" };
  if (!boundedString(record.ascout_version, 32) || !/^[0-9A-Za-z.+-]+$/u.test(record.ascout_version)) return { ok: false, reason: "invalid ascout version" };
  if (typeof record.head_sha !== "string" || !SHA.test(record.head_sha)) return { ok: false, reason: "invalid head sha" };
  // Every check must be present: a bundle that drops one could otherwise hide work that never ran.
  if (!Array.isArray(record.checks) || record.checks.length !== CHECK_IDS.length) return { ok: false, reason: "a bundle must report every check" };
  const seen = new Set<string>();
  for (const check of record.checks as unknown[]) {
    const c = check as Record<string, unknown>;
    if (typeof check !== "object" || check === null || !exactKeys(c, ["id", "exit_code", "state", "outcome", "reason"])) return { ok: false, reason: "invalid check" };
    if (!CHECK_IDS.includes(c.id as CheckId) || seen.has(c.id as string)) return { ok: false, reason: "invalid or duplicate check id" };
    seen.add(c.id as string);
    if (![0, 1, 2, 3, 4].includes(c.exit_code as number) || c.state !== stateForExitCode(c.exit_code as number)) return { ok: false, reason: "check state does not match its exit code" };
    if (!boundedString(c.outcome, 64) || !boundedString(c.reason, 500)) return { ok: false, reason: "invalid check text" };
  }
  if (!Array.isArray(record.findings) || record.findings.length > PR_EVIDENCE_MAX_FINDINGS) return { ok: false, reason: "invalid findings" };
  for (const finding of record.findings as unknown[]) {
    const f = finding as Record<string, unknown>;
    if (typeof finding !== "object" || finding === null || !exactKeys(f, ["check", "path", "start_line", "end_line", "severity", "title", "message"])) return { ok: false, reason: "invalid finding" };
    if (!CHECK_IDS.includes(f.check as CheckId) || !safePath(f.path) || !lineNumber(f.start_line) || !lineNumber(f.end_line)) return { ok: false, reason: "invalid finding location" };
    if (f.start_line !== null && f.end_line !== null && (f.end_line as number) < (f.start_line as number)) return { ok: false, reason: "invalid finding range" };
    if (!["failure", "warning", "notice"].includes(f.severity as string) || !boundedString(f.title, 200) || !boundedString(f.message, 2000)) return { ok: false, reason: "invalid finding text" };
  }
  if (typeof record.findings_truncated !== "boolean") return { ok: false, reason: "invalid truncation flag" };
  const overall = record.overall as Record<string, unknown> | null;
  if (typeof overall !== "object" || overall === null || !exactKeys(overall, ["state", "exit_code"])) return { ok: false, reason: "invalid overall" };
  const expected = overallStateV1(record.checks as PrCheckV1[]);
  if (overall.state !== expected || overall.exit_code !== EXIT_BY_STATE[expected]) return { ok: false, reason: "overall state does not match the checks" };
  return { ok: true, evidence: record as unknown as PrEvidenceV1 };
}

/** GitHub check-run conclusions. INCOMPLETE is action_required: never green, and never neutral, which branch protection counts as passing. */
export const CONCLUSION_BY_STATE: Record<CheckState, "success" | "failure" | "action_required"> = {
  COMPLETE: "success",
  FINDINGS: "failure",
  ERROR: "failure",
  SOURCE_DRIFT: "failure",
  INCOMPLETE: "action_required",
};

/**
 * Untrusted text in Markdown: no HTML or entities, no mentions, no links (bare URLs are broken so
 * GitHub can't autolink them), no code fences, and no control or bidirectional characters.
 */
export function neutralizeMarkdownV1(text: string, max = 500): string {
  const clipped = text.length > max ? `${text.slice(0, max)}…` : text;
  return clipped
    .replace(/[\p{Cc}\p{Bidi_Control}]/gu, " ")
    .replace(/&/gu, "&amp;")
    .replace(/[\\`*_{}[\]()#+!|~]/gu, (ch) => `\\${ch}`)
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/@/gu, "@​")
    .replace(/:\/\//gu, ":​//")
    .replace(/www\./giu, (m) => `${m.slice(0, 3)}​.`);
}

/**
 * Who produced the evidence. Collection runs PR code, so a bundle from a fork, or from any author
 * the publisher does not trust, may be forged and must never turn the check green.
 */
export interface PublishContextV1 {
  /** The PR head from the trusted workflow event, never from the bundle. */
  readonly trusted_head_sha: string;
  /** True only when the PR comes from the base repository itself, not a fork. */
  readonly evidence_trusted: boolean;
  /** A link to the run that produced the evidence. */
  readonly details_url: string;
}

/** True when the bundle describes the commit the publisher is about to annotate. */
export function evidenceMatchesHeadV1(evidence: PrEvidenceV1, context: PublishContextV1): boolean {
  return SHA.test(context.trusted_head_sha) && evidence.head_sha === context.trusted_head_sha;
}

/** The publisher's own summary comment: written by its bot, and starting with the marker. */
export function isOwnSummaryCommentV1(comment: { user?: { login?: string; type?: string } | null; body?: string | null }, botLogin: string): boolean {
  return comment.user?.login === botLogin && typeof comment.body === "string" && comment.body.startsWith(SUMMARY_COMMENT_MARKER);
}

export interface CheckRunPayloadV1 {
  readonly name: string;
  readonly head_sha: string;
  readonly details_url: string;
  readonly status: "completed";
  readonly conclusion: "success" | "failure" | "action_required";
  readonly output: {
    readonly title: string;
    readonly summary: string;
    readonly annotations: readonly {
      path: string;
      start_line: number;
      end_line: number;
      annotation_level: "failure" | "warning" | "notice";
      title: string;
      message: string;
    }[];
  };
}

const STATE_LABEL: Record<CheckState, string> = {
  COMPLETE: "complete",
  FINDINGS: "findings",
  ERROR: "error",
  SOURCE_DRIFT: "source changed during the run",
  INCOMPLETE: "incomplete: required work did not run",
};

function summaryTable(evidence: PrEvidenceV1): string {
  const rows = evidence.checks.map((check) => `| ${check.id} | ${STATE_LABEL[check.state]} | ${check.exit_code} | ${neutralizeMarkdownV1(check.reason, 200)} |`);
  return ["| Check | Result | Exit | Why |", "|---|---|---|---|", ...rows].join("\n");
}

/**
 * The Check Run for a validated bundle. The commit comes from the trusted context, never the
 * bundle, and a bundle that names another commit is refused. Evidence produced by untrusted PR
 * code is capped at action_required: it may report problems, but it can never vouch for a pass.
 */
export function checkRunFromEvidenceV1(evidence: PrEvidenceV1, context: PublishContextV1): CheckRunPayloadV1 {
  if (!evidenceMatchesHeadV1(evidence, context)) {
    throw new Error("the evidence describes a different commit than the pull request head");
  }
  const located = evidence.findings.filter((finding) => finding.path !== null && finding.start_line !== null);
  const reported = CONCLUSION_BY_STATE[evidence.overall.state];
  const capped = !context.evidence_trusted && reported === "success";
  return {
    name: CHECK_RUN_NAME,
    head_sha: context.trusted_head_sha,
    details_url: context.details_url,
    status: "completed",
    conclusion: capped ? "action_required" : reported,
    output: {
      title: capped ? "Ascout: needs a maintainer: evidence came from untrusted pull request code" : `Ascout: ${STATE_LABEL[evidence.overall.state]}`,
      summary: [
        ...(capped ? ["**This pull request comes from a fork, so its own code produced this evidence, and a pass cannot be trusted.** Re-run Ascout from a trusted context before relying on it.", ""] : []),
        summaryTable(evidence),
        "",
        `${evidence.findings.length} finding(s)${evidence.findings_truncated ? ", more not shown" : ""}. Exit codes: 0 complete, 1 findings, 2 error, 3 source changed, 4 incomplete. Only 0 passes.`,
        "AI review, where configured, is advisory and never makes this check pass.",
      ].join("\n"),
      annotations: located.map((finding) => ({
        path: finding.path as string,
        start_line: finding.start_line as number,
        end_line: (finding.end_line ?? finding.start_line) as number,
        annotation_level: finding.severity,
        title: finding.title.slice(0, 200),
        message: finding.message.slice(0, 2000),
      })),
    },
  };
}

/** One comment per PR, found again by its marker and updated in place, so it never piles up or goes stale. */
export function summaryCommentV1(evidence: PrEvidenceV1): string {
  const unlocated = evidence.findings.filter((finding) => finding.path === null || finding.start_line === null);
  return [
    SUMMARY_COMMENT_MARKER,
    `### Ascout verification: ${STATE_LABEL[evidence.overall.state]}`,
    "",
    `Commit \`${evidence.head_sha.slice(0, 12)}\` · Ascout ${neutralizeMarkdownV1(evidence.ascout_version, 32)}`,
    "",
    summaryTable(evidence),
    "",
    ...(unlocated.length > 0 ? ["**Findings without a line:**", ...unlocated.slice(0, 10).map((finding) => `- ${finding.check}: ${neutralizeMarkdownV1(finding.title, 200)}`), ""] : []),
    "Located findings are annotations on the **Ascout verification** check. Exit 4 means required work did not run, which is never a pass.",
  ].join("\n");
}
