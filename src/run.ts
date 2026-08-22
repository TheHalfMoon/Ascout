import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";
import {
  type FileHandle,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export const DEFAULT_COMPLETED_RUN_RETENTION = 20;

const MANIFEST_FILENAME = "manifest.json";
const ACTIVE_MARKER_FILENAME = ".active";
const RAW_DIRECTORY_NAME = "raw";
const MAX_MANIFEST_BYTES = 16 * 1024;

export type RunDirectoryErrorCode =
  | "run_directory_invalid"
  | "run_directory_exists"
  | "run_directory_unverifiable"
  | "run_directory_io";

export class RunDirectoryError extends Error {
  readonly code: RunDirectoryErrorCode;

  constructor(code: RunDirectoryErrorCode, message: string) {
    super(message);
    this.name = "RunDirectoryError";
    this.code = code;
  }
}

export interface RunManifestV1 {
  readonly version: 1;
  readonly run_id: string;
  readonly state: "active" | "completed";
  readonly started_at: string;
  readonly completed_at: string | null;
}

export interface RunRetentionResult {
  readonly removed_run_ids: readonly string[];
  readonly retained_completed_run_ids: readonly string[];
  readonly preserved_run_ids: readonly string[];
}

export interface RunDirectoryHandle {
  readonly run_id: string;
  readonly run_path: string;
  readonly raw_path: string;
  readonly manifest_path: string;
  complete(): Promise<RunRetentionResult>;
}

interface DirectoryIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

interface CompletedCandidate {
  readonly run_id: string;
  readonly run_path: string;
  readonly manifest: RunManifestV1;
  readonly identity: DirectoryIdentity;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalTimestampMilliseconds(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return null;
  return new Date(milliseconds).toISOString() === value ? milliseconds : null;
}

function compareTimestampsDescending(left: string, right: string): number {
  const leftMilliseconds = canonicalTimestampMilliseconds(left);
  const rightMilliseconds = canonicalTimestampMilliseconds(right);
  if (leftMilliseconds === null || rightMilliseconds === null) {
    throw new RunDirectoryError(
      "run_directory_unverifiable",
      "retention encountered a non-canonical timestamp after manifest validation",
    );
  }
  return leftMilliseconds > rightMilliseconds
    ? -1
    : leftMilliseconds < rightMilliseconds
      ? 1
      : 0;
}

function invalid(message: string): never {
  throw new RunDirectoryError("run_directory_invalid", message);
}

function validateRunId(runId: string): void {
  if (runId.length === 0) invalid("run_id must be non-empty");
  if (runId === "." || runId === "..") invalid("run_id must be a single safe path segment");
  if (runId.includes("/") || runId.includes("\\") || runId.includes("\0")) {
    invalid("run_id must be a single safe path segment");
  }
}

function validateRetentionCount(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    invalid("completed run retention must be a non-negative safe integer");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseManifest(text: string): RunManifestV1 | null {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return null;
  }

  if (!isRecord(value) || value.version !== 1 || typeof value.run_id !== "string") {
    return null;
  }

  const startedAt = value.started_at;
  const startedMilliseconds = canonicalTimestampMilliseconds(startedAt);
  if (typeof startedAt !== "string" || startedMilliseconds === null) return null;

  if (value.state === "active") {
    if (value.completed_at !== null) return null;
    return {
      version: 1,
      run_id: value.run_id,
      state: "active",
      started_at: startedAt,
      completed_at: null,
    };
  }

  const completedAt = value.completed_at;
  const completedMilliseconds = canonicalTimestampMilliseconds(completedAt);
  if (
    value.state === "completed" &&
    typeof completedAt === "string" &&
    completedMilliseconds !== null
  ) {
    if (completedMilliseconds < startedMilliseconds) return null;
    return {
      version: 1,
      run_id: value.run_id,
      state: "completed",
      started_at: startedAt,
      completed_at: completedAt,
    };
  }

  return null;
}

function serializeManifest(manifest: RunManifestV1): string {
  return `${JSON.stringify(manifest)}\n`;
}

function sameIdentity(left: DirectoryIdentity, right: DirectoryIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function sameCompletedManifest(left: RunManifestV1, right: RunManifestV1): boolean {
  return (
    left.state === "completed" &&
    right.state === "completed" &&
    left.version === right.version &&
    left.run_id === right.run_id &&
    left.started_at === right.started_at &&
    left.completed_at === right.completed_at
  );
}

async function canonicalRepositoryRoot(repositoryRoot: string): Promise<string> {
  if (repositoryRoot.length === 0 || repositoryRoot.includes("\0")) {
    throw new RunDirectoryError(
      "run_directory_unverifiable",
      "repository root must resolve to an existing directory",
    );
  }

  try {
    const canonicalRoot = await realpath(resolve(repositoryRoot));
    const rootStat = await stat(canonicalRoot);
    if (!rootStat.isDirectory()) {
      throw new RunDirectoryError(
        "run_directory_unverifiable",
        "repository root must resolve to an existing directory",
      );
    }
    return canonicalRoot;
  } catch (error) {
    if (error instanceof RunDirectoryError) throw error;
    throw new RunDirectoryError(
      "run_directory_unverifiable",
      "repository root must resolve to an existing directory",
    );
  }
}

async function physicalDirectoryIdentity(path: string): Promise<DirectoryIdentity | null> {
  try {
    const pathStat = await lstat(path, { bigint: true });
    if (!pathStat.isDirectory() || pathStat.isSymbolicLink()) return null;
    return { dev: pathStat.dev, ino: pathStat.ino };
  } catch {
    return null;
  }
}

async function ensureManagedDirectory(path: string): Promise<void> {
  try {
    await mkdir(path);
  } catch (error) {
    if (errorCode(error) !== "EEXIST") {
      throw new RunDirectoryError("run_directory_io", `failed to create ${path}`);
    }
  }

  const identity = await physicalDirectoryIdentity(path);
  if (identity === null) {
    throw new RunDirectoryError(
      "run_directory_unverifiable",
      `managed run path is not a physical directory: ${path}`,
    );
  }
}

async function ensureRunsRoot(canonicalRoot: string): Promise<string> {
  const ascoutPath = join(canonicalRoot, ".ascout");
  const runsPath = join(ascoutPath, "runs");
  await ensureManagedDirectory(ascoutPath);
  await ensureManagedDirectory(runsPath);
  return runsPath;
}

async function existingRunsRoot(canonicalRoot: string): Promise<string | null> {
  const ascoutPath = join(canonicalRoot, ".ascout");
  const runsPath = join(ascoutPath, "runs");

  for (const path of [ascoutPath, runsPath]) {
    try {
      const pathStat = await lstat(path, { bigint: true });
      if (!pathStat.isDirectory() || pathStat.isSymbolicLink()) {
        throw new RunDirectoryError(
          "run_directory_unverifiable",
          `managed run path is not a physical directory: ${path}`,
        );
      }
    } catch (error) {
      if (errorCode(error) === "ENOENT") return null;
      if (error instanceof RunDirectoryError) throw error;
      throw new RunDirectoryError(
        "run_directory_unverifiable",
        `cannot verify managed run directory: ${path}`,
      );
    }
  }

  return runsPath;
}

async function writeExclusiveFile(path: string, content: string): Promise<void> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(path, "wx", 0o600);
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle?.close();
  }
}

async function replaceManifestPortably(path: string, content: string): Promise<void> {
  const directory = dirname(path);
  const suffix = `${process.pid}.${randomBytes(8).toString("hex")}`;
  const temporaryPath = join(directory, `.manifest.${suffix}.tmp`);
  const backupPath = join(directory, `.manifest.${suffix}.bak`);
  let published = false;

  try {
    await writeExclusiveFile(temporaryPath, content);
    await rename(path, backupPath);

    try {
      await rename(temporaryPath, path);
      published = true;
    } catch (error) {
      try {
        await rename(backupPath, path);
      } catch {
        // The active marker remains present, so retention still preserves this run.
      }
      throw error;
    }
  } catch {
    throw new RunDirectoryError("run_directory_io", `failed to update ${path}`);
  } finally {
    try {
      await rm(temporaryPath, { force: true });
    } catch {
      // Temporary cleanup does not change lifecycle eligibility.
    }
    if (published) {
      try {
        await rm(backupPath, { force: true });
      } catch {
        // A leftover backup is inert; the completed manifest remains authoritative.
      }
    }
  }
}

async function readBoundedText(path: string): Promise<string | null> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(path, "r");
    const buffer = Buffer.alloc(MAX_MANIFEST_BYTES + 1);
    let offset = 0;

    while (offset < buffer.length) {
      const result = await handle.read(buffer, offset, buffer.length - offset, null);
      if (result.bytesRead === 0) break;
      offset += result.bytesRead;
    }

    if (offset > MAX_MANIFEST_BYTES) return null;
    return buffer.subarray(0, offset).toString("utf8");
  } catch {
    return null;
  } finally {
    try {
      await handle?.close();
    } catch {
      // A later lifecycle operation will treat unreadable state as unverifiable.
    }
  }
}

async function readManifest(runPath: string): Promise<RunManifestV1 | null> {
  const text = await readBoundedText(join(runPath, MANIFEST_FILENAME));
  return text === null ? null : parseManifest(text);
}

async function markerState(runPath: string): Promise<"present" | "absent" | "unknown"> {
  try {
    await lstat(join(runPath, ACTIVE_MARKER_FILENAME));
    return "present";
  } catch (error) {
    if (errorCode(error) === "ENOENT") return "absent";
    return "unknown";
  }
}

async function markRunCompleted(runPath: string, runId: string): Promise<void> {
  const current = await readManifest(runPath);
  if (current === null || current.run_id !== runId) {
    throw new RunDirectoryError(
      "run_directory_unverifiable",
      "run manifest is missing, malformed, oversized, or mismatched",
    );
  }

  if (current.state === "active") {
    const completed: RunManifestV1 = {
      version: 1,
      run_id: runId,
      state: "completed",
      started_at: current.started_at,
      completed_at: new Date().toISOString(),
    };
    await replaceManifestPortably(join(runPath, MANIFEST_FILENAME), serializeManifest(completed));
  }

  try {
    await rm(join(runPath, ACTIVE_MARKER_FILENAME), { force: true });
  } catch {
    throw new RunDirectoryError(
      "run_directory_io",
      "run completed but active-marker cleanup failed; retention remains fail-closed",
    );
  }
}

async function rollbackQuarantine(quarantinePath: string, runPath: string): Promise<void> {
  try {
    await rename(quarantinePath, runPath);
  } catch {
    throw new RunDirectoryError(
      "run_directory_io",
      "retention identity check failed and quarantined run could not be restored",
    );
  }
}

async function deleteCompletedCandidateSafely(
  runsPath: string,
  candidate: CompletedCandidate,
): Promise<"removed" | "preserved"> {
  const freshIdentity = await physicalDirectoryIdentity(candidate.run_path);
  const freshMarker = await markerState(candidate.run_path);
  const freshManifest = await readManifest(candidate.run_path);

  if (
    freshIdentity === null ||
    !sameIdentity(candidate.identity, freshIdentity) ||
    freshMarker !== "absent" ||
    freshManifest === null ||
    !sameCompletedManifest(candidate.manifest, freshManifest)
  ) {
    return "preserved";
  }

  const quarantinePath = join(
    runsPath,
    `.retention.${process.pid}.${randomBytes(16).toString("hex")}.trash`,
  );

  try {
    await rename(candidate.run_path, quarantinePath);
  } catch {
    return "preserved";
  }

  const quarantinedIdentity = await physicalDirectoryIdentity(quarantinePath);
  const quarantinedMarker = await markerState(quarantinePath);
  const quarantinedManifest = await readManifest(quarantinePath);

  if (
    quarantinedIdentity === null ||
    !sameIdentity(candidate.identity, quarantinedIdentity) ||
    quarantinedMarker !== "absent" ||
    quarantinedManifest === null ||
    !sameCompletedManifest(candidate.manifest, quarantinedManifest)
  ) {
    await rollbackQuarantine(quarantinePath, candidate.run_path);
    return "preserved";
  }

  const finalIdentity = await physicalDirectoryIdentity(quarantinePath);
  if (finalIdentity === null || !sameIdentity(candidate.identity, finalIdentity)) {
    await rollbackQuarantine(quarantinePath, candidate.run_path);
    return "preserved";
  }

  try {
    await rm(quarantinePath, { recursive: true, force: false });
  } catch {
    throw new RunDirectoryError(
      "run_directory_io",
      `failed to remove completed run ${candidate.run_id}`,
    );
  }

  return "removed";
}

async function pruneCompletedRunsFromRoot(
  canonicalRoot: string,
  completedRetention: number,
): Promise<RunRetentionResult> {
  validateRetentionCount(completedRetention);
  const runsPath = await existingRunsRoot(canonicalRoot);
  if (runsPath === null) {
    return {
      removed_run_ids: [],
      retained_completed_run_ids: [],
      preserved_run_ids: [],
    };
  }

  const entries = await (async () => {
    try {
      return await readdir(runsPath, { withFileTypes: true });
    } catch {
      throw new RunDirectoryError("run_directory_io", "failed to enumerate run directories");
    }
  })();

  const candidates: CompletedCandidate[] = [];
  const preserved = new Set<string>();

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      preserved.add(entry.name);
      continue;
    }

    const runPath = join(runsPath, entry.name);
    const identity = await physicalDirectoryIdentity(runPath);
    const marker = await markerState(runPath);
    const manifest = await readManifest(runPath);

    if (
      identity === null ||
      marker !== "absent" ||
      manifest === null ||
      manifest.run_id !== entry.name ||
      manifest.state !== "completed"
    ) {
      preserved.add(entry.name);
      continue;
    }

    candidates.push({
      run_id: entry.name,
      run_path: runPath,
      manifest,
      identity,
    });
  }

  candidates.sort((left, right) => {
    const completedOrder = compareTimestampsDescending(
      left.manifest.completed_at!,
      right.manifest.completed_at!,
    );
    if (completedOrder !== 0) return completedOrder;

    const startedOrder = compareTimestampsDescending(
      left.manifest.started_at,
      right.manifest.started_at,
    );
    if (startedOrder !== 0) return startedOrder;
    return compareOrdinal(left.run_id, right.run_id);
  });

  const retained = candidates.slice(0, completedRetention);
  const removalCandidates = candidates.slice(completedRetention);
  const removed: string[] = [];

  for (const candidate of removalCandidates) {
    const outcome = await deleteCompletedCandidateSafely(runsPath, candidate);
    if (outcome === "removed") {
      removed.push(candidate.run_id);
    } else {
      preserved.add(candidate.run_id);
    }
  }

  return {
    removed_run_ids: removed,
    retained_completed_run_ids: retained.map((candidate) => candidate.run_id),
    preserved_run_ids: [...preserved].sort(compareOrdinal),
  };
}

export async function pruneCompletedRuns(
  repositoryRoot: string,
  completedRetention = DEFAULT_COMPLETED_RUN_RETENTION,
): Promise<RunRetentionResult> {
  const canonicalRoot = await canonicalRepositoryRoot(repositoryRoot);
  return pruneCompletedRunsFromRoot(canonicalRoot, completedRetention);
}

export async function createRunDirectory(
  repositoryRoot: string,
  runId: string,
): Promise<RunDirectoryHandle> {
  validateRunId(runId);
  const canonicalRoot = await canonicalRepositoryRoot(repositoryRoot);
  const runsPath = await ensureRunsRoot(canonicalRoot);
  const runPath = join(runsPath, runId);
  const manifestPath = join(runPath, MANIFEST_FILENAME);
  const rawPath = join(runPath, RAW_DIRECTORY_NAME);

  try {
    await mkdir(runPath);
  } catch (error) {
    if (errorCode(error) === "EEXIST") {
      throw new RunDirectoryError(
        "run_directory_exists",
        `run directory already exists for ${runId}`,
      );
    }
    throw new RunDirectoryError("run_directory_io", `failed to create run ${runId}`);
  }

  try {
    await writeExclusiveFile(join(runPath, ACTIVE_MARKER_FILENAME), "active\n");
    await mkdir(rawPath);
    const manifest: RunManifestV1 = {
      version: 1,
      run_id: runId,
      state: "active",
      started_at: new Date().toISOString(),
      completed_at: null,
    };
    await writeExclusiveFile(manifestPath, serializeManifest(manifest));
  } catch (error) {
    try {
      await rm(runPath, { recursive: true, force: true });
    } catch {
      // Initialization failure remains visible as an error even if cleanup also fails.
    }
    if (error instanceof RunDirectoryError) throw error;
    throw new RunDirectoryError("run_directory_io", `failed to initialize run ${runId}`);
  }

  let completionInFlight: Promise<RunRetentionResult> | null = null;

  return {
    run_id: runId,
    run_path: runPath,
    raw_path: rawPath,
    manifest_path: manifestPath,
    complete(): Promise<RunRetentionResult> {
      if (completionInFlight !== null) return completionInFlight;

      const operation = (async () => {
        await markRunCompleted(runPath, runId);
        return pruneCompletedRunsFromRoot(
          canonicalRoot,
          DEFAULT_COMPLETED_RUN_RETENTION,
        );
      })();
      completionInFlight = operation;
      operation.then(
        () => {
          if (completionInFlight === operation) completionInFlight = null;
        },
        () => {
          if (completionInFlight === operation) completionInFlight = null;
        },
      );
      return operation;
    },
  };
}
