import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import {
  EngineEnvelopeError,
  parseEngineEnvelopeV1,
  type EngineEnvelopeLocationV1,
  type EngineEnvelopeSourceV1,
  type EngineEnvelopeV1,
} from "./engine-envelope-v1.js";
import { ENGINE_PROTOCOL_V1, type EngineProfileV1 } from "./engine-profile-v1.js";

export interface GitleaksDecodeContextV1 {
  readonly request_id: string;
  readonly profile: EngineProfileV1;
  readonly profile_sha256: string;
  readonly source: EngineEnvelopeSourceV1;
  readonly capabilities: readonly string[];
  readonly started_at_epoch_ms: number;
  readonly ended_at_epoch_ms: number;
}

// Every key Gitleaks 8.30.1 writes for a finding. Any other key means a different report
// shape, so the decoder refuses it rather than guess. Only RuleID, Description, File, and
// the line numbers are carried over; the rest, Secret and Match included, are dropped.
const REQUIRED_KEYS = [
  "RuleID",
  "Description",
  "StartLine",
  "EndLine",
  "StartColumn",
  "EndColumn",
  "Match",
  "Secret",
  "File",
  "SymlinkFile",
  "Commit",
  "Entropy",
  "Author",
  "Email",
  "Date",
  "Message",
  "Tags",
  "Fingerprint",
] as const;
// Fragment would carry a whole file's raw text, so a report that includes one is refused.
const OPTIONAL_KEYS = ["Link"] as const;

export const GITLEAKS_SUPPRESSION_LIMITATION_V1 =
  "The source root held a .gitleaksignore, which Gitleaks always applies, so findings may be hidden.";

function holdsIgnoreFile(path: string): boolean {
  try {
    return statSync(path).isFile() || existsSync(join(path, ".gitleaksignore"));
  } catch {
    return false;
  }
}

/**
 * Which ignore files Gitleaks would read. The engine's own location must hold none, so the
 * broker refuses to start, or reports a changed artifact, when it does. The source root's
 * file always applies upstream and can only be reported.
 */
export function gitleaksIgnoreFilesV1(
  profile: EngineProfileV1,
  sourceRoot: string,
): { readonly engine: boolean; readonly source: boolean } {
  const index = profile.argv.indexOf("--gitleaks-ignore-path");
  const enginePath = index === -1 ? undefined : profile.argv[index + 1];
  return {
    engine: enginePath !== undefined && isAbsolute(enginePath) && holdsIgnoreFile(enginePath),
    source: existsSync(join(sourceRoot, ".gitleaksignore")),
  };
}
const REDACTED = "REDACTED";
const MAX_FINDINGS = 4_096;
const MAX_MESSAGE_LENGTH = 512;

export const GITLEAKS_COVERAGE_DIAGNOSTIC_V1 = Object.freeze({
  code: "coverage:unreported",
  message:
    "Gitleaks does not report which files it scanned, so coverage is partial and silence is not a clean result.",
});

function invalid(message: string): never {
  throw new EngineEnvelopeError("INVALID_ENVELOPE", message);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid(field + " must be an object");
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") invalid(field + " must be a string");
  return value;
}

function requireInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value)) invalid(field + " must be an integer");
  return value as number;
}

/** A path Gitleaks reports for `dir .`, rebased to the source root, or null when it isn't one. */
function relativeLocationPath(file: string, platform: EngineProfileV1["platform"]): string | null {
  // A backslash separates paths only on Windows. Elsewhere it is part of a file name.
  if (platform !== "win32" && file.includes("\\")) return null;
  let path = file.replaceAll("\\", "/");
  while (path.startsWith("./")) path = path.slice(2);
  if (
    path.length === 0 ||
    path.length > 4_096 ||
    /^[A-Za-z]:/u.test(path) ||
    /[\u0000-\u001f\u007f:]/u.test(path) ||
    path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    return null;
  }
  return path;
}

function location(
  record: Record<string, unknown>,
  index: number,
  platform: EngineProfileV1["platform"],
): EngineEnvelopeLocationV1 | null {
  const field = "findings[" + index + "]";
  const path = relativeLocationPath(requireString(record.File, field + ".File"), platform);
  const startLine = requireInteger(record.StartLine, field + ".StartLine");
  const endLine = requireInteger(record.EndLine, field + ".EndLine");
  // A finding without a usable location is kept, with the location stripped.
  if (path === null || startLine < 1 || endLine < startLine) return null;
  return { path, start_line: startLine, end_line: endLine };
}

function boundedMessage(description: string, ruleId: string): string {
  const text = description.replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ").replace(/\s+/gu, " ").trim();
  const message = text.length === 0 ? "Gitleaks rule " + ruleId + " matched." : text;
  return message.length > MAX_MESSAGE_LENGTH ? message.slice(0, MAX_MESSAGE_LENGTH - 1) + "…" : message;
}

/** An identity for the finding that no secret byte contributes to. */
function observationId(index: number, ruleId: string, place: EngineEnvelopeLocationV1 | null): string {
  const digest = createHash("sha256")
    .update(JSON.stringify([index, ruleId, place?.path ?? null, place?.start_line ?? null, place?.end_line ?? null]))
    .digest("hex");
  return "gitleaks:" + digest.slice(0, 32);
}

function parseFindings(stdout: Uint8Array): readonly Record<string, unknown>[] {
  let parsed: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(stdout);
    parsed = JSON.parse(text);
  } catch {
    invalid("Gitleaks report must be UTF-8 JSON");
  }
  // Go encodes an empty finding list as null.
  if (parsed === null) return [];
  if (!Array.isArray(parsed)) invalid("Gitleaks report must be a JSON array");
  if (parsed.length > MAX_FINDINGS) invalid("Gitleaks report holds more findings than the envelope allows");
  return parsed.map((entry, index) => {
    const record = requireRecord(entry, "findings[" + index + "]");
    const keys = Object.keys(record);
    const known = new Set<string>([...REQUIRED_KEYS, ...OPTIONAL_KEYS]);
    if (!REQUIRED_KEYS.every((key) => keys.includes(key)) || keys.some((key) => !known.has(key))) {
      invalid("findings[" + index + "] does not have the Gitleaks 8.30.1 shape");
    }
    // The profile passes --redact. A Secret that isn't redacted means the flag didn't apply.
    if (record.Secret !== REDACTED) invalid("findings[" + index + "].Secret is not redacted");
    // `dir` scans files, not history. A commit means the report is not from this command.
    if (record.Commit !== "") invalid("findings[" + index + "].Commit must be empty for a directory scan");
    return record;
  });
}

/**
 * Turns Gitleaks' native JSON report into an ascout-engine/1 envelope.
 *
 * Gitleaks reports neither the source it saw nor the files it scanned, so the source binding
 * comes from the broker's own observation and coverage is always PARTIAL. The result is
 * checked by the same parser as a protocol engine's output.
 */
export function decodeGitleaksReportV1(
  stdout: Uint8Array,
  context: GitleaksDecodeContextV1,
): EngineEnvelopeV1 {
  const capabilityId = context.capabilities[0];
  if (capabilityId === undefined) invalid("a Gitleaks run needs one requested capability");
  const observations = parseFindings(stdout).map((record, index) => {
    const ruleId = requireString(record.RuleID, "findings[" + index + "].RuleID");
    const place = location(record, index, context.profile.platform);
    return {
      observation_id: observationId(index, ruleId, place),
      capability_id: capabilityId,
      rule_id: ruleId,
      location: place,
      message: boundedMessage(requireString(record.Description, "findings[" + index + "].Description"), ruleId),
    };
  });

  const envelope = {
    protocol: ENGINE_PROTOCOL_V1,
    request_id: context.request_id,
    engine: {
      id: context.profile.engine_id,
      version: context.profile.release_version,
      build: "sha256-" + context.profile.artifact.sha256.slice(0, 32),
    },
    profile_sha256: context.profile_sha256,
    source: context.source,
    execution: {
      state: "COMPLETED",
      started_at_epoch_ms: context.started_at_epoch_ms,
      ended_at_epoch_ms: context.ended_at_epoch_ms,
    },
    capabilities: context.capabilities.map((id) => ({ id, state: "EXECUTED", coverage: "PARTIAL" })),
    observations,
    diagnostics: [GITLEAKS_COVERAGE_DIAGNOSTIC_V1],
  };
  return parseEngineEnvelopeV1(Buffer.from(JSON.stringify(envelope), "utf8"), context.request_id);
}
