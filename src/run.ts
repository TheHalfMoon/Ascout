import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { join, resolve } from "node:path";

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

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
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

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return false;
  return new Date(milliseconds).toISOString() === value;
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
  if (!isCanonicalTimestamp(value.started_at)) return null;

  if (value.state === "active") {
    if (value.completed_at !== null) return null;
    return {
      version: 1,
      run_id: value.run_id,
      state: "active",
      started_at: value.started_at,
      completed_at: null,
    };
  }

  if (value.state === "completed" && isCanonicalTimestamp(value.completed_at)) {
    return {
      version: 1,
      run_id: value.run_id,
      state: "completed",
      started_at: value.started_at,
      completed_at: value.completed_at,
    };
  }

  return null;
}

function serializeManifest(manifest: RunManifestV1): string {
  return `${JSON.stringify(manifest)}\n`;
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

async function ensureManagedDirectory(path: string): Promise<void> {
  try {
    await mkdir(path);
  } catch (error) {
    if (errorCode(error) !== "EEXIST") {
      throw new RunDirectoryError("run_directory_io", `failed to create ${path}`);
    }
  }

  try {
    const pathStat = await lstat(path);
    if (!pathStat.isDirectory() || pathStat.isSymbolicLink()) {
      throw new RunDirectoryError(
        "run_directory_unverifiable",
        `managed run path is not a physical directory: ${path}`,
      );
    }
  } catch (error) {
    if (error instanceof RunDirectoryError) throw error;
    throw new RunDirectoryError(
      "run_directory_unverifiable",
      `cannot verify managed run directory: ${path}`,
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
      const pathStat = await lstat(path);
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
  let handle;
  try {
    handle = await open(path, "wx", 0o600);
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle?.close();
  }
}

async function replaceFileAtomically(path: string, content: string): Promise<void> {
  const directory = resolve(path, "..");
  const temporaryPath = join(
    directory,
    `.manifest.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
  );

  try {
    await writeExclusiveFile(temporaryPath, content);
    await rename(temporaryPath, path);
  } catch (error) {
    throw new RunDirectoryError("run_directory_io", `failed to update ${path}`);
  } finally {
    try {
      await rm(temporaryPath, { force: true });
    } catch {
      // A failed temporary-file cleanup must not alter lifecycle state.
    }
  }
}

async function readBoundedText(path: string): Promise<string | null> {
  let handle;
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
      // Treat close failures as unverifiable on the next lifecycle operation.
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
    await replaceFileAtomically(join(runPath, MANIFEST_FILENAME), serializeManifest(completed));
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

interface CompletedCandidate {
  readonly run_id: string;
  readonly run_path: string;
  readonly manifest: RunManifestV1;
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

  let entries;
  try {
    entries = await readdir(runsPath, { withFileTypes: true });
  } catch {
    throw new RunDirectoryError("run_directory_io", "failed to enumerate run directories");
  }

  const candidates: CompletedCandidate[] = [];
  const preserved = new Set<string>();

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      preserved.add(entry.name);
      continue;
    }

    const runPath = join(runsPath, entry.name);
    const marker = await markerState(runPath);
    const manifest = await readManifest(runPath);

    if (
      marker !== "absent" ||
      manifest === null ||
      manifest.run_id !== entry.name ||
      manifest.state !== "completed"
    ) {
      preserved.add(entry.name);
      continue;
    }

    candidates.push({ run_id: entry.name, run_path: runPath, manifest });
  }

  candidates.sort((left, right) => {
    const completedOrder = right.manifest.completed_at!.localeCompare(
      left.manifest.completed_at!,
    );
    if (completedOrder !== 0) return completedOrder;

    const startedOrder = right.manifest.started_at.localeCompare(left.manifest.started_at);
    if (startedOrder !== 0) return startedOrder;
    return left.run_id.localeCompare(right.run_id);
  });

  const retained = candidates.slice(0, completedRetention);
  const removalCandidates = candidates.slice(completedRetention);
  const removed: string[] = [];

  for (const candidate of removalCandidates) {
    const marker = await markerState(candidate.run_path);
    const freshManifest = await readManifest(candidate.run_path);

    if (
      marker !== "absent" ||
      freshManifest === null ||
      !sameCompletedManifest(candidate.manifest, freshManifest)
    ) {
      preserved.add(candidate.run_id);
      continue;
    }

    try {
      await rm(candidate.run_path, { recursive: true, force: false });
      removed.push(candidate.run_id);
    } catch {
      throw new RunDirectoryError(
        "run_directory_io",
        `failed to remove completed run ${candidate.run_id}`,
      );
    }
  }

  return {
    removed_run_ids: removed,
    retained_completed_run_ids: retained.map((candidate) => candidate.run_id),
    preserved_run_ids: [...preserved].sort(),
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
