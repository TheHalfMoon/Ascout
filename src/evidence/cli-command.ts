import { escapeTerminalText } from "../terminal-text.js";
import {
  diffEvidenceV1,
  exportEvidenceBundleV1,
  listEvidenceManifestsV1,
  lookupEvidenceManifestV1,
  pruneEvidenceV1,
  recordCheckRunAsEvidenceV1,
  verifyEvidenceV1,
} from "./manifest.js";
import {
  buildVerificationReportV1,
  formatVerificationReportV1,
  writeReportToFileV1,
  type ReportFormatV1,
} from "./report.js";

export type EvidenceSubcommandV1 =
  | { readonly action: "list"; readonly json: boolean }
  | { readonly action: "show"; readonly id: string; readonly json: boolean }
  | {
      readonly action: "verify";
      readonly target: string;
      readonly expectedDigest?: string;
      readonly json: boolean;
    }
  | { readonly action: "diff"; readonly leftId: string; readonly rightId: string; readonly json: boolean }
  | { readonly action: "export"; readonly id: string; readonly outPath: string; readonly json: boolean }
  | { readonly action: "prune"; readonly keepLast: number; readonly dryRun: boolean; readonly json: boolean }
  | { readonly action: "record"; readonly fromRun: string; readonly json: boolean };

export interface ReportCommandOptionsV1 {
  readonly evidenceId?: string;
  readonly format: ReportFormatV1;
  readonly outPath?: string;
}

export interface EvidenceCliIoV1 {
  readonly writeStdout: (text: string) => void;
  readonly writeStderr: (text: string) => void;
}

function parseJsonFormatFlag(args: readonly string[], index: number): boolean {
  const value = args[index + 1];
  if (value === "json") return true;
  if (value === "terminal") return false;
  throw new Error("--format requires one of: json|terminal.");
}

export function parseEvidenceSubcommandArgsV1(args: readonly string[]): EvidenceSubcommandV1 {
  const [sub, ...rest] = args;
  if (sub === undefined) {
    throw new Error("ascout evidence requires a subcommand: list | show | verify | diff | export | prune | record.");
  }

  let json = false;
  let formatSeen = false;
  const positionals: string[] = [];
  let expectedDigest: string | undefined;
  let outPath: string | undefined;
  let keepLast: number | undefined;
  let dryRun = false;
  let allFlag = false;
  let fromRun: string | undefined;

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i]!;
    if (token === "--format") {
      if (formatSeen) throw new Error("--format may be supplied only once.");
      formatSeen = true;
      json = parseJsonFormatFlag(rest, i);
      i += 1;
      continue;
    }
    if (token === "--expected-digest") {
      if (sub !== "verify") throw new Error("--expected-digest is valid only with ascout evidence verify.");
      const value = rest[i + 1];
      if (value === undefined || !/^[0-9a-fA-F]{64}$/u.test(value)) {
        throw new Error("--expected-digest requires a 64-character hex SHA-256 digest.");
      }
      expectedDigest = value.toLowerCase();
      i += 1;
      continue;
    }
    if (token === "--all") {
      if (sub !== "verify") throw new Error("--all is valid only with ascout evidence verify.");
      allFlag = true;
      continue;
    }
    if (token === "--out") {
      if (sub !== "export") throw new Error("--out is valid only with ascout evidence export.");
      const value = rest[i + 1];
      if (value === undefined || value.trim() === "") throw new Error("--out requires a file path.");
      outPath = value;
      i += 1;
      continue;
    }
    if (token === "--keep") {
      if (sub !== "prune") throw new Error("--keep is valid only with ascout evidence prune.");
      const raw = rest[i + 1];
      const parsed = raw !== undefined && /^\d+$/u.test(raw) ? Number(raw) : NaN;
      if (!Number.isSafeInteger(parsed)) {
        throw new Error("--keep requires a non-negative safe integer.");
      }
      keepLast = parsed;
      i += 1;
      continue;
    }
    if (token === "--dry-run") {
      if (sub !== "prune") throw new Error("--dry-run is valid only with ascout evidence prune.");
      dryRun = true;
      continue;
    }
    if (token === "--from-run") {
      if (sub !== "record") throw new Error("--from-run is valid only with ascout evidence record.");
      const value = rest[i + 1];
      if (value === undefined || value.trim() === "") throw new Error("--from-run requires a run id or 'latest'.");
      fromRun = value;
      i += 1;
      continue;
    }
    if (token.startsWith("-")) {
      throw new Error(`Unknown option for ascout evidence ${sub}: ${token}`);
    }
    positionals.push(token);
  }

  if (sub === "list") {
    if (positionals.length > 0) throw new Error("ascout evidence list takes no positional arguments.");
    return { action: "list", json };
  }
  if (sub === "show") {
    if (positionals.length > 1) throw new Error("ascout evidence show accepts at most one evidence id.");
    const id = positionals[0] ?? "latest";
    if (id.toLowerCase() === "all") throw new Error("ascout evidence show requires a single evidence id or 'latest'.");
    return { action: "show", id, json };
  }
  if (sub === "verify") {
    if (allFlag && positionals.length > 0) throw new Error("ascout evidence verify --all cannot be combined with an evidence id.");
    if (allFlag && expectedDigest !== undefined) throw new Error("ascout evidence verify --all cannot be combined with --expected-digest.");
    if (positionals.length > 1) throw new Error("ascout evidence verify accepts at most one evidence id.");
    if (positionals[0]?.toLowerCase() === "all") {
      throw new Error("Use --all (not positional 'all') to verify all evidence manifests.");
    }
    const target = allFlag ? "all" : (positionals[0] ?? "latest");
    return {
      action: "verify",
      target,
      ...(expectedDigest === undefined ? {} : { expectedDigest }),
      json,
    };
  }
  if (sub === "diff") {
    if (positionals.length !== 2) throw new Error("ascout evidence diff requires two evidence ids: <left-id> <right-id>.");
    return { action: "diff", leftId: positionals[0]!, rightId: positionals[1]!, json };
  }
  if (sub === "export") {
    if (positionals.length > 1) throw new Error("ascout evidence export accepts at most one evidence id.");
    if (outPath === undefined) throw new Error("ascout evidence export requires --out <path>.");
    const id = positionals[0] ?? "latest";
    if (id.toLowerCase() === "all") throw new Error("ascout evidence export requires a single evidence id or 'latest'.");
    return { action: "export", id, outPath, json };
  }
  if (sub === "prune") {
    if (positionals.length > 0) throw new Error("ascout evidence prune takes no positional arguments.");
    return { action: "prune", keepLast: keepLast ?? 10, dryRun, json };
  }
  if (sub === "record") {
    if (positionals.length > 0) throw new Error("ascout evidence record takes no positional arguments.");
    return { action: "record", fromRun: fromRun ?? "latest", json };
  }
  throw new Error(`Unknown ascout evidence subcommand: ${sub}`);
}

export function parseReportArgsV1(args: readonly string[]): ReportCommandOptionsV1 {
  let evidenceId: string | undefined;
  let format: ReportFormatV1 | undefined;
  let outPath: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i]!;
    if (token === "--id") {
      const value = args[i + 1];
      if (value === undefined || value.trim() === "" || value.toLowerCase() === "all") {
        throw new Error("--id requires a single evidence id or 'latest'.");
      }
      evidenceId = value;
      i += 1;
      continue;
    }
    if (token === "--format") {
      if (format !== undefined) throw new Error("--format may be supplied only once.");
      const value = args[i + 1];
      if (value !== "terminal" && value !== "json" && value !== "markdown") {
        throw new Error("--format requires one of: terminal|json|markdown.");
      }
      format = value;
      i += 1;
      continue;
    }
    if (token === "--out") {
      const value = args[i + 1];
      if (value === undefined || value.trim() === "") throw new Error("--out requires a file path.");
      outPath = value;
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument for ascout report: ${token}`);
  }
  return {
    ...(evidenceId === undefined ? {} : { evidenceId }),
    format: format ?? "terminal",
    ...(outPath === undefined ? {} : { outPath }),
  };
}

export async function runEvidenceCommandV1(
  repoRoot: string,
  subcommand: EvidenceSubcommandV1,
  io: EvidenceCliIoV1,
): Promise<number> {
  if (subcommand.action === "list") {
    const result = listEvidenceManifestsV1(repoRoot);
    if (subcommand.json) {
      io.writeStdout(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      if (result.manifests.length === 0) {
        io.writeStderr("No Ascout evidence records found.\n");
      } else {
        const lines = result.manifests.map(
          (m) => `${escapeTerminalText(m.evidence_id)}  ${escapeTerminalText(m.kind).padEnd(10)} ${escapeTerminalText(m.verdict).padEnd(10)} exit=${m.exit_code}  ${m.manifest_sha256.slice(0, 12)}  ${escapeTerminalText(m.created_at)}`,
        );
        io.writeStderr(`${lines.join("\n")}\n`);
      }
      if (result.corrupt_files.length > 0) {
        io.writeStderr(
          `corrupt_files (${result.corrupt_files.length}): ${result.corrupt_files.map((f) => escapeTerminalText(f)).join(", ")}\n`,
        );
      }
    }
    return result.corrupt_files.length > 0 ? 1 : 0;
  }

  if (subcommand.action === "show") {
    const lookup = lookupEvidenceManifestV1(repoRoot, subcommand.id);
    if (lookup.state === "corrupt") {
      io.writeStderr(`ascout evidence show: evidence record ${escapeTerminalText(JSON.stringify(subcommand.id))} is corrupt (${escapeTerminalText(lookup.reason)}).\n`);
      return 1;
    }
    if (lookup.state === "missing") {
      io.writeStderr(`ascout evidence show: evidence record ${escapeTerminalText(JSON.stringify(subcommand.id))} not found.\n`);
      return 4;
    }
    const manifest = lookup.manifest;
    if (subcommand.json) {
      io.writeStdout(`${JSON.stringify(manifest, null, 2)}\n`);
    } else {
      io.writeStderr(
        [
          `evidence: ${escapeTerminalText(manifest.evidence_id)} (${escapeTerminalText(manifest.kind)})`,
          `verdict: ${escapeTerminalText(manifest.verdict)} (exit ${manifest.exit_code})`,
          `manifest_sha256: ${manifest.manifest_sha256}`,
          `payload_sha256: ${manifest.payload_sha256}`,
          `parent_manifest_sha256: ${manifest.parent_manifest_sha256 ?? "genesis"}`,
          `artifacts: ${manifest.artifacts.length}`,
          `summary: ${escapeTerminalText(manifest.summary)}`,
        ].join("\n") + "\n",
      );
    }
    return 0;
  }

  if (subcommand.action === "verify") {
    const report = verifyEvidenceV1(
      repoRoot,
      subcommand.target,
      subcommand.expectedDigest === undefined ? {} : { expectedDigest: subcommand.expectedDigest },
    );
    if (subcommand.json) {
      io.writeStdout(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      const lines = [
        `evidence verify: ${report.status} (${report.integrity_scope})`,
        ...report.items.map(
          (item) =>
            `  [${item.status}] ${escapeTerminalText(item.evidence_id)} objects=${item.checked_objects} chain=${item.chain_status}${item.issues.length > 0 ? ` issues=${escapeTerminalText(item.issues.join("; "))}` : ""}`,
        ),
        `note: ${report.disclosure}`,
      ];
      io.writeStderr(`${lines.join("\n")}\n`);
    }
    return report.status === "CONTENT_INTEGRITY_VERIFIED" ? 0 : report.status === "TAMPERED" ? 1 : 4;
  }

  if (subcommand.action === "diff") {
    const diff = diffEvidenceV1(repoRoot, subcommand.leftId, subcommand.rightId);
    if (subcommand.json) {
      io.writeStdout(`${JSON.stringify(diff, null, 2)}\n`);
    } else {
      io.writeStderr(
        [
          `evidence diff: ${escapeTerminalText(diff.left_id)} -> ${escapeTerminalText(diff.right_id)}`,
          `verdict: ${escapeTerminalText(diff.left_verdict)} (${diff.left_exit_code}) -> ${escapeTerminalText(diff.right_verdict)} (${diff.right_exit_code})`,
          `source_changed=${diff.source_changed} head_changed=${diff.head_changed} payload_changed=${diff.payload_changed}`,
          `artifact_deltas=${diff.artifact_deltas.length}`,
        ].join("\n") + "\n",
      );
    }
    return 0;
  }

  if (subcommand.action === "export") {
    const bundle = exportEvidenceBundleV1(repoRoot, subcommand.id, subcommand.outPath);
    if (subcommand.json) {
      io.writeStdout(
        `${JSON.stringify({ evidence_id: bundle.manifest.evidence_id, bundle_sha256: bundle.bundle_sha256, objects: Object.keys(bundle.objects).length, out_path: subcommand.outPath }, null, 2)}\n`,
      );
    } else {
      io.writeStderr(
        `exported ${escapeTerminalText(bundle.manifest.evidence_id)} -> ${escapeTerminalText(subcommand.outPath)} (bundle_sha256=${bundle.bundle_sha256})\n`,
      );
    }
    return 0;
  }

  if (subcommand.action === "prune") {
    const report = await pruneEvidenceV1(repoRoot, { keepLast: subcommand.keepLast, dryRun: subcommand.dryRun });
    if (subcommand.json) {
      io.writeStdout(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      io.writeStderr(
        `evidence prune (keep=${report.keep_last}, dry_run=${report.dry_run}): kept=${report.kept_evidence_ids.length} removed_manifests=${report.removed_evidence_ids.length} removed_objects=${report.removed_object_digests.length}\n`,
      );
    }
    return 0;
  }

  const recorded = await recordCheckRunAsEvidenceV1(repoRoot, subcommand.fromRun);
  if (subcommand.json) {
    io.writeStdout(`${JSON.stringify(recorded, null, 2)}\n`);
  } else {
    io.writeStderr(
      `recorded ${escapeTerminalText(recorded.evidence_id)} from run ${escapeTerminalText(subcommand.fromRun)} (manifest_sha256=${recorded.manifest_sha256})\n`,
    );
  }
  return 0;
}

export function runReportCommandV1(
  repoRoot: string,
  options: ReportCommandOptionsV1,
  io: EvidenceCliIoV1,
): number {
  const report = buildVerificationReportV1(
    repoRoot,
    options.evidenceId === undefined ? {} : { evidenceId: options.evidenceId },
  );
  const rendered = formatVerificationReportV1(report, options.format);
  if (options.outPath !== undefined) {
    writeReportToFileV1(options.outPath, rendered);
  }
  if (options.format === "terminal") {
    io.writeStderr(rendered);
  } else {
    io.writeStdout(rendered);
  }
  return report.exit_code;
}
