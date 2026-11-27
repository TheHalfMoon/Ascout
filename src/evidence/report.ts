import { resolve } from "node:path";

import { ASCOUT_PACKAGE_VERSION } from "../mcp/server.js";
import { escapeTerminalText } from "../terminal-text.js";
import { writeAtomicSafeRegularFileV1 } from "./cas-store.js";
import {
  captureEvidenceSourceIdentityV1,
  findLatestCheckRunReceiptV1,
  listEvidenceManifestsV1,
  LOCAL_INTEGRITY_DISCLOSURE,
  readEvidenceManifestV1,
  verifyEvidenceV1,
  type EvidenceManifestV1,
  type EvidenceSourceIdentityV1,
  type EvidenceVerifyReportV1,
} from "./manifest.js";

export type ReportFormatV1 = "terminal" | "json" | "markdown";

export interface VerificationReportEntryV1 {
  readonly evidence_id: string;
  readonly kind: string;
  readonly verdict: string;
  readonly exit_code: number;
  readonly created_at: string;
  readonly summary: string;
  readonly manifest_sha256: string;
  readonly artifact_count: number;
}

export interface VerificationReportV1 {
  readonly schema_version: 1;
  readonly ascout_version: string;
  readonly source: EvidenceSourceIdentityV1;
  readonly overall_status: "PASS" | "FAIL" | "INCOMPLETE" | "TAMPERED";
  readonly exit_code: 0 | 1 | 4;
  readonly integrity_scope: "local_content_hash_only";
  readonly disclosure: string;
  readonly verified_entries: readonly VerificationReportEntryV1[];
  readonly integrity: EvidenceVerifyReportV1;
  readonly latest_check_run_id: string | null;
  readonly gaps: readonly string[];
}

function entryFromManifest(manifest: EvidenceManifestV1): VerificationReportEntryV1 {
  return {
    evidence_id: manifest.evidence_id,
    kind: manifest.kind,
    verdict: manifest.verdict,
    exit_code: manifest.exit_code,
    created_at: manifest.created_at,
    summary: manifest.summary,
    manifest_sha256: manifest.manifest_sha256,
    artifact_count: manifest.artifacts.length,
  };
}

function matchesCurrentSource(
  manifest: EvidenceManifestV1,
  current: EvidenceSourceIdentityV1,
): boolean {
  return (
    current.head_sha !== null &&
    current.worktree_tree_digest !== null &&
    manifest.source.head_sha === current.head_sha &&
    manifest.source.worktree_tree_digest === current.worktree_tree_digest
  );
}

function isFailingManifest(manifest: EvidenceManifestV1): boolean {
  return (
    manifest.exit_code === 1 ||
    manifest.verdict === "FAIL" ||
    manifest.verdict === "REFUTED" ||
    manifest.verdict === "BLOCKED"
  );
}

export function buildVerificationReportV1(
  repoRoot: string,
  options: { readonly evidenceId?: string } = {},
): VerificationReportV1 {
  const root = resolve(repoRoot);
  const currentSource = captureEvidenceSourceIdentityV1(root);
  const gaps: string[] = [];

  if (options.evidenceId === "all") {
    throw new Error("--id must name a single evidence id or 'latest', not 'all'.");
  }

  let manifests: readonly EvidenceManifestV1[];
  let integrity: EvidenceVerifyReportV1;
  if (options.evidenceId !== undefined) {
    const found = readEvidenceManifestV1(root, options.evidenceId);
    manifests = found === null ? [] : [found];
    integrity = verifyEvidenceV1(root, options.evidenceId);
  } else {
    const listed = listEvidenceManifestsV1(root);
    manifests = listed.manifests;
    integrity = verifyEvidenceV1(root, "all");
  }

  const latestCheck = findLatestCheckRunReceiptV1(root);
  const latestCheckRunId = latestCheck?.run_id ?? null;

  const sourceBound = currentSource.head_sha !== null && currentSource.worktree_tree_digest !== null;
  if (!sourceBound) {
    gaps.push("Current directory has no verifiable Git HEAD and worktree digest; cannot confirm source-bound verification.");
  }

  const currentManifests = manifests.filter((manifest) => matchesCurrentSource(manifest, currentSource));

  if (manifests.length === 0) {
    gaps.push(
      latestCheckRunId === null
        ? "No recorded CAS evidence manifests or completed check receipts were found in .ascout/."
        : `No CAS evidence manifests recorded yet (found completed check receipt ${latestCheckRunId}; run 'ascout evidence record --from-run latest' to store it in CAS).`,
    );
  } else if (sourceBound) {
    if (currentManifests.length === 0) {
      gaps.push("No recorded evidence manifests match the current repository HEAD/worktree state (existing evidence is stale).");
    } else {
      const coveredKinds = new Set(currentManifests.map((item) => item.kind));
      for (const expected of ["check", "review", "security"] as const) {
        if (!coveredKinds.has(expected)) {
          gaps.push(`No recorded '${expected}' evidence manifest matching the current source state.`);
        }
      }
    }
  }

  let overallStatus: VerificationReportV1["overall_status"];
  let exitCode: VerificationReportV1["exit_code"];
  const evaluated = options.evidenceId !== undefined ? manifests : currentManifests;
  if (integrity.status === "TAMPERED") {
    overallStatus = "TAMPERED";
    exitCode = 1;
    gaps.push("One or more evidence manifests or CAS objects failed content-integrity verification.");
  } else if (evaluated.length === 0) {
    overallStatus = "INCOMPLETE";
    exitCode = 4;
  } else if (evaluated.some(isFailingManifest)) {
    overallStatus = "FAIL";
    exitCode = 1;
  } else if (evaluated.some((item) => item.exit_code !== 0) || gaps.length > 0) {
    overallStatus = "INCOMPLETE";
    exitCode = 4;
  } else {
    overallStatus = "PASS";
    exitCode = 0;
  }

  return {
    schema_version: 1,
    ascout_version: ASCOUT_PACKAGE_VERSION,
    source: currentSource,
    overall_status: overallStatus,
    exit_code: exitCode,
    integrity_scope: "local_content_hash_only",
    disclosure: LOCAL_INTEGRITY_DISCLOSURE,
    verified_entries: evaluated.map(entryFromManifest),
    integrity,
    latest_check_run_id: latestCheckRunId,
    gaps,
  };
}

function escapeMarkdownCell(value: string): string {
  return value.replaceAll("\r", " ").replaceAll("\n", " ").replaceAll("|", "\\|").replaceAll("`", "'");
}

export function renderVerificationReportTerminalV1(report: VerificationReportV1): string {
  const lines: string[] = [
    `Ascout Verification Report (${report.overall_status}, exit ${report.exit_code})`,
    `source: head=${report.source.head_sha ?? "none"} dirty=${report.source.dirty} tree=${report.source.worktree_tree_digest ?? "none"}`,
    `integrity: ${report.integrity.status} (${report.integrity_scope})`,
  ];
  if (report.verified_entries.length === 0) {
    lines.push("evidence: none matching current source state");
  } else {
    lines.push(`evidence (${report.verified_entries.length}):`);
    for (const entry of report.verified_entries) {
      lines.push(
        `  [${escapeTerminalText(entry.verdict)}] ${escapeTerminalText(entry.evidence_id)} (${escapeTerminalText(entry.kind)}) exit=${entry.exit_code} sha256=${entry.manifest_sha256.slice(0, 12)} - ${escapeTerminalText(entry.summary)}`,
      );
    }
  }
  if (report.gaps.length > 0) {
    lines.push("not verified / gaps:");
    for (const gap of report.gaps) lines.push(`  - ${escapeTerminalText(gap)}`);
  }
  lines.push(`note: ${report.disclosure}`);
  return `${lines.join("\n")}\n`;
}

export function renderVerificationReportMarkdownV1(report: VerificationReportV1): string {
  const lines: string[] = [
    "# Ascout Verification Report",
    "",
    `- **Status:** \`${report.overall_status}\` (exit \`${report.exit_code}\`)`,
    `- **Ascout Version:** \`${report.ascout_version}\``,
    `- **HEAD:** \`${report.source.head_sha ?? "none"}\` (dirty: \`${report.source.dirty}\`)`,
    `- **Worktree Digest:** \`${report.source.worktree_tree_digest ?? "none"}\``,
    `- **Evidence Integrity:** \`${report.integrity.status}\` (\`${report.integrity_scope}\`)`,
    "",
    "## Recorded Evidence",
    "",
  ];
  if (report.verified_entries.length === 0) {
    lines.push("_No CAS evidence records matching the current source state._");
  } else {
    lines.push("| Evidence ID | Kind | Verdict | Exit | Artifacts | Manifest SHA-256 | Summary |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");
    for (const entry of report.verified_entries) {
      lines.push(
        `| \`${escapeMarkdownCell(entry.evidence_id)}\` | ${escapeMarkdownCell(entry.kind)} | \`${escapeMarkdownCell(entry.verdict)}\` | ${entry.exit_code} | ${entry.artifact_count} | \`${entry.manifest_sha256.slice(0, 16)}\` | ${escapeMarkdownCell(entry.summary)} |`,
      );
    }
  }
  lines.push("", "## Not Verified / Gaps", "");
  if (report.gaps.length === 0) {
    lines.push("_No gaps detected across check, review, and security evidence for the current source state._");
  } else {
    for (const gap of report.gaps) lines.push(`- ${escapeMarkdownCell(gap)}`);
  }
  lines.push("", `> ${report.disclosure}`, "");
  return lines.join("\n");
}

export function formatVerificationReportV1(
  report: VerificationReportV1,
  format: ReportFormatV1,
): string {
  if (format === "json") return `${JSON.stringify(report, null, 2)}\n`;
  if (format === "markdown") return renderVerificationReportMarkdownV1(report);
  return renderVerificationReportTerminalV1(report);
}

export function writeReportToFileV1(outPath: string, content: string): string {
  const resolved = resolve(outPath);
  writeAtomicSafeRegularFileV1(resolved, content);
  return resolved;
}
