import { lstatSync, opendirSync, readFileSync, realpathSync } from "node:fs";
import { join, relative, isAbsolute, sep } from "node:path";

import { composeSourceState } from "../check.js";
import type { CommandResultV1 } from "../command-functions.js";
import { DEFAULT_POLICY_PATH } from "../github/policy.js";
import { loadPrPolicyV1 } from "../github/publish.js";
import { validateReceiptJsonSchema } from "../receipt/json.js";
import { validateReceiptSemantics, type ReceiptV1, type SourceStateV1 } from "../receipt/model.js";
import { parseManifest } from "../run.js";

/**
 * E11a (specs/017-unified-assurance/E11_SAFE_MCP_EXPANSION_DESIGN.md): two read-only MCP tools.
 * They run no repository code (only the hardened Git that ascout_review already uses), write
 * nothing, take no arguments, and their assurance is always NONE: they describe configuration and
 * records, never verification.
 */

const NO_ANSWER = "the publisher reads the team policy from the default branch, not this working tree";

export interface PolicyToolReportV1 {
  readonly schema_version: 1;
  readonly kind: "policy";
  readonly state: "default" | "file" | "invalid";
  readonly required_checks: readonly string[];
  readonly reason: string | null;
  readonly scope: typeof NO_ANSWER;
}

function isInside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel !== "" && !rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel);
}

/** `ascout_policy`: the team policy as it stands in this working tree, read by the publisher's loader. */
export function computePolicyToolV1(root: string): CommandResultV1<PolicyToolReportV1> {
  const invalid = (reason: string): CommandResultV1<PolicyToolReportV1> => ({
    kind: "report",
    exit_code: 0,
    report: Object.freeze({ schema_version: 1, kind: "policy", state: "invalid", required_checks: Object.freeze([]), reason, scope: NO_ANSWER }),
  });
  try {
    if (lstatSync(join(root, ".github")).isSymbolicLink()) return invalid("the .github folder is a symbolic link");
  } catch {
    // No .github folder: the loader below reports the default policy.
  }
  const path = join(root, DEFAULT_POLICY_PATH);
  let exists = true;
  try {
    lstatSync(path);
  } catch {
    exists = false;
  }
  if (exists) {
    try {
      if (!isInside(realpathSync.native(root), realpathSync.native(path))) return invalid("the policy file resolves outside the repository");
    } catch {
      return invalid("the policy file could not be resolved");
    }
  }
  const loaded = loadPrPolicyV1(path);
  if (!loaded.ok) return invalid(loaded.reason);
  return {
    kind: "report",
    exit_code: 0,
    report: Object.freeze({
      schema_version: 1,
      kind: "policy",
      state: loaded.policy.source,
      required_checks: Object.freeze([...loaded.policy.required_checks]),
      reason: null,
      scope: NO_ANSWER,
    }),
  };
}

export const RUN_ID_PATTERN = /^[0-9]{15}-[0-9a-f]{12}$/u;
export const MAX_RUN_ENTRIES = 10_000;
const MAX_RECEIPT_BYTES = 1024 * 1024;
const MAX_MANIFEST_BYTES = 64 * 1024;

const RECORD_CAVEAT = "a record on disk, not re-verified; anyone with write access to the repository could have written it";
const DIGEST_SCOPE = "the tree digest covers tracked and non-ignored untracked files, excluding .ascout; changes to ignored files are not seen";

export type RecordedStateMatchV1 = true | false | "unknown";

export interface LastCheckToolReportV1 {
  readonly schema_version: 1;
  readonly kind: "last_check";
  readonly state: "none" | "found" | "invalid" | "refused";
  /** Set when state is found or invalid; always matches RUN_ID_PATTERN. */
  readonly run_id: string | null;
  /** Set when state is invalid: which check failed, and how many issues; never receipt text. */
  readonly invalid_layer: "json" | "schema" | "semantics" | "binding" | "file" | null;
  readonly invalid_issue_count: number | null;
  /** Set when state is refused or none: a fixed reason. */
  readonly reason: string | null;
  readonly recorded_exit_code: number | null;
  readonly recorded_completeness: string | null;
  readonly recorded_task_counts: Readonly<Record<string, number>> | null;
  readonly recorded_finding_count: number | null;
  readonly recorded_state_matches_now: RecordedStateMatchV1 | null;
  readonly recorded_state_reason: string | null;
  readonly caveats: readonly string[];
}

function lastCheck(fields: Partial<LastCheckToolReportV1> & Pick<LastCheckToolReportV1, "state">): CommandResultV1<LastCheckToolReportV1> {
  return {
    kind: "report",
    exit_code: 0,
    report: Object.freeze({
      schema_version: 1,
      kind: "last_check",
      run_id: null,
      invalid_layer: null,
      invalid_issue_count: null,
      reason: null,
      recorded_exit_code: null,
      recorded_completeness: null,
      recorded_task_counts: null,
      recorded_finding_count: null,
      recorded_state_matches_now: null,
      recorded_state_reason: null,
      caveats: Object.freeze([RECORD_CAVEAT, DIGEST_SCOPE]),
      ...fields,
    }),
  };
}

/**
 * A regular file (never a link) no larger than maxBytes whose real path stays inside root, or null.
 * The containment check also catches a folder on the way being swapped for a link mid-read.
 */
export function readContainedRegularFileV1(root: string, path: string, maxBytes: number): string | null {
  try {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.size > maxBytes) return null;
    if (!isInside(realpathSync.native(root), realpathSync.native(path))) return null;
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function isRealDirectory(path: string): boolean | null {
  try {
    const stat = lstatSync(path);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return null;
  }
}

/** Completed by the CLI's own manifest rules, for this run id, with no .active marker. */
function isCompletedRun(root: string, runPath: string, runId: string): boolean {
  const text = readContainedRegularFileV1(root, join(runPath, "manifest.json"), MAX_MANIFEST_BYTES);
  const manifest = text === null ? null : parseManifest(text);
  if (manifest === null || manifest.state !== "completed" || manifest.run_id !== runId) return false;
  try {
    lstatSync(join(runPath, ".active"));
    return false;
  } catch {
    return true;
  }
}

function sameState(a: SourceStateV1, b: SourceStateV1): boolean {
  return a.repository_id === b.repository_id && a.head_sha === b.head_sha && a.tree_digest === b.tree_digest;
}

/**
 * Whether a receipt's recorded source state equals the working tree now. True only for a stable run
 * whose recorded start and end are equal and equal to now; unknown when now can't be read.
 */
export function recordedStateMatchesNowV1(
  receipt: Pick<ReceiptV1, "stability" | "source">,
  now: () => SourceStateV1,
): { readonly matches: RecordedStateMatchV1; readonly why: string } {
  const { start, end } = receipt.source;
  if (receipt.stability !== "stable" || end === null || !sameState(start, end)) {
    return { matches: false, why: "the recorded run was not stable, or its start and end states differ" };
  }
  try {
    const matches = sameState(end, now());
    return { matches, why: matches ? "the recorded state equals the working tree now" : "the working tree has changed since the recorded run" };
  } catch {
    return { matches: "unknown", why: "the current state could not be read with hardened Git" };
  }
}

/** `ascout_last_check`: what the newest completed check run recorded, never verified. */
export function computeLastCheckToolV1(root: string, now: () => SourceStateV1 = () => composeSourceState(root)): CommandResultV1<LastCheckToolReportV1> {
  const ascout = isRealDirectory(join(root, ".ascout"));
  const runs = isRealDirectory(join(root, ".ascout", "runs"));
  if (ascout === null || runs === null) return lastCheck({ state: "none", reason: "no check has been recorded here" });
  if (!ascout || !runs) return lastCheck({ state: "refused", reason: "the run directory is not a real directory" });

  // Read at most MAX_RUN_ENTRIES + 1 entries, so a huge directory can't stall the server.
  const names: string[] = [];
  let seen = 0;
  try {
    const dir = opendirSync(join(root, ".ascout", "runs"));
    try {
      for (let entry = dir.readSync(); entry !== null; entry = dir.readSync()) {
        seen += 1;
        if (seen > MAX_RUN_ENTRIES) break;
        if (entry.isDirectory() && RUN_ID_PATTERN.test(entry.name)) names.push(entry.name);
      }
    } finally {
      dir.closeSync();
    }
  } catch {
    return lastCheck({ state: "refused", reason: "the run directory could not be read" });
  }
  if (seen > MAX_RUN_ENTRIES) return lastCheck({ state: "refused", reason: "the run directory has too many entries" });
  const runId = names.sort().reverse().find((name) => isCompletedRun(root, join(root, ".ascout", "runs", name), name));
  if (runId === undefined) return lastCheck({ state: "none", reason: "no completed check run has been recorded here" });

  const invalid = (layer: NonNullable<LastCheckToolReportV1["invalid_layer"]>, count: number) =>
    lastCheck({ state: "invalid", run_id: runId, invalid_layer: layer, invalid_issue_count: count });
  const text = readContainedRegularFileV1(root, join(root, ".ascout", "runs", runId, "receipt.json"), MAX_RECEIPT_BYTES);
  if (text === null) return invalid("file", 1);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return invalid("json", 1);
  }
  const schema = validateReceiptJsonSchema(value);
  if (!schema.valid) return invalid("schema", schema.issues.length);
  const receipt = value as ReceiptV1;
  const semantics = validateReceiptSemantics(receipt);
  if (!semantics.valid) return invalid("semantics", semantics.issues.length);
  if (receipt.run.run_id !== runId) return invalid("binding", 1);

  const { matches, why } = recordedStateMatchesNowV1(receipt, now);
  return lastCheck({
    state: "found",
    run_id: runId,
    recorded_exit_code: receipt.summary.exit_code,
    recorded_completeness: receipt.summary.completeness,
    recorded_task_counts: Object.freeze({ ...receipt.summary.task_status_counts }),
    recorded_finding_count: receipt.summary.finding_count,
    recorded_state_matches_now: matches,
    recorded_state_reason: why,
  });
}
