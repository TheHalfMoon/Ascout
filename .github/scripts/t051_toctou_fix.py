from pathlib import Path

check = Path('src/check.ts')
text = check.read_text()
old_import = 'import { closeSync, mkdirSync, openSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";'
new_import = 'import { type BigIntStats, closeSync, fstatSync, fsyncSync, ftruncateSync, mkdirSync, openSync, readFileSync, readSync, realpathSync, statSync, writeFileSync, writeSync } from "node:fs";'
if text.count(old_import) != 1:
    raise SystemExit(f'expected exactly one fs import, found {text.count(old_import)}')
text = text.replace(old_import, new_import)

old = '''export function resolveManagedGeneratedArtifactPath(
  runPath: string,
  relativeRunPath: string,
): string {
  if (!CANONICAL_RUN_RELATIVE_PATH.test(relativeRunPath)) {
    throw new Error("generated artifact path is not canonical run-relative data");
  }
  const realRunPath = realpathSync(runPath);
  const expectedPath = resolve(realRunPath, ...relativeRunPath.split("/"));
  const realArtifactPath = realpathSync(expectedPath);
  if (realArtifactPath !== expectedPath) {
    throw new Error("generated artifact does not resolve to its exact managed run path");
  }
  return expectedPath;
}

function persistGeneratedTextArtifact(
  runId: string,
  taskId: SemanticTaskType,
  sequence: number,
  runPath: string,
  relativeRunPath: string,
  artifactId: string,
  artifactKind: string,
  evidenceKind: EvidenceV1["kind"],
  secrets: readonly string[],
): PersistedTextArtifact {
  const absolute = resolveManagedGeneratedArtifactPath(runPath, relativeRunPath);
  const info = statSync(absolute);
  if (!info.isFile() || info.size > TASK_CAPTURE_CAP_BYTES) {
    throw new Error("Vitest generated artifact is missing, non-file, or exceeds the evidence size budget.");
  }
  const raw = readFileSync(absolute);
  const rawText = raw.toString("utf8");
  const text = redactExactValues(rawText, secrets);
  const persisted = Buffer.from(text, "utf8");
  if (!persisted.equals(raw)) writeFileSync(absolute, persisted);
  const sha256 = createSha256(persisted);
  const redacted = secrets.some((secret) => rawText.includes(secret));
  return {
    text,
    artifact: {
      artifact_id: artifactId,
      task_id: taskId,
      relative_run_path: relativeRunPath,
      kind: artifactKind,
      sha256,
      byte_length: persisted.byteLength,
      redacted,
      truncated: false,
    },
    evidence: {
      evidence_id: `${taskId}.e${sequence}`,
      run_id: runId,
      task_id: taskId,
      sequence,
      kind: evidenceKind,
      sha256,
      artifact_id: artifactId,
      redacted,
      truncated: false,
    },
  };
}
'''

new = '''function samePhysicalFile(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function assertSafeManagedDescriptor(info: BigIntStats): void {
  if (!info.isFile() || info.nlink !== 1n) {
    throw new Error("generated artifact must be a single-link physical file");
  }
}

function readBoundedDescriptor(fd: number): Buffer {
  const buffer = Buffer.alloc(TASK_CAPTURE_CAP_BYTES + 1);
  let offset = 0;
  while (offset < buffer.length) {
    const bytesRead = readSync(fd, buffer, offset, buffer.length - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  if (offset > TASK_CAPTURE_CAP_BYTES) {
    throw new Error("Vitest generated artifact exceeds the evidence size budget.");
  }
  return buffer.subarray(0, offset);
}

export interface ManagedGeneratedArtifactHandle {
  readonly expectedPath: string;
  readBounded(): Buffer;
  replace(contents: Buffer): void;
  assertStillBound(): void;
  close(): void;
}

export function openManagedGeneratedArtifact(
  runPath: string,
  relativeRunPath: string,
): ManagedGeneratedArtifactHandle {
  if (!CANONICAL_RUN_RELATIVE_PATH.test(relativeRunPath)) {
    throw new Error("generated artifact path is not canonical run-relative data");
  }

  const realRunPath = realpathSync(runPath);
  const expectedPath = resolve(realRunPath, ...relativeRunPath.split("/"));
  const fd = openSync(expectedPath, "r+");
  let closed = false;

  const descriptorInfo = (): BigIntStats => {
    if (closed) throw new Error("generated artifact descriptor is already closed");
    const info = fstatSync(fd, { bigint: true });
    assertSafeManagedDescriptor(info);
    return info;
  };

  const assertStillBound = (): void => {
    const opened = descriptorInfo();
    const realArtifactPath = realpathSync(expectedPath);
    if (realArtifactPath !== expectedPath) {
      throw new Error("generated artifact does not resolve to its exact managed run path");
    }
    const current = statSync(expectedPath, { bigint: true });
    if (!samePhysicalFile(opened, current) || current.nlink !== 1n) {
      throw new Error("generated artifact path no longer identifies the opened managed file");
    }
  };

  try {
    assertStillBound();
  } catch (error) {
    closeSync(fd);
    closed = true;
    throw error;
  }

  const readBounded = (): Buffer => {
    const before = descriptorInfo();
    if (before.size > BigInt(TASK_CAPTURE_CAP_BYTES)) {
      throw new Error("Vitest generated artifact exceeds the evidence size budget.");
    }
    const bytes = readBoundedDescriptor(fd);
    const after = descriptorInfo();
    if (
      !samePhysicalFile(before, after) ||
      before.size !== after.size ||
      after.size !== BigInt(bytes.byteLength) ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    ) {
      throw new Error("Vitest generated artifact changed while evidence was being captured.");
    }
    return bytes;
  };

  const replaceContents = (contents: Buffer): void => {
    if (contents.byteLength > TASK_CAPTURE_CAP_BYTES) {
      throw new Error("Vitest generated artifact exceeds the evidence size budget.");
    }
    descriptorInfo();
    ftruncateSync(fd, 0);
    let offset = 0;
    while (offset < contents.byteLength) {
      const written = writeSync(fd, contents, offset, contents.byteLength - offset, offset);
      if (written <= 0) throw new Error("failed to rewrite generated artifact through its bound descriptor");
      offset += written;
    }
    ftruncateSync(fd, contents.byteLength);
    fsyncSync(fd);
    const confirmed = readBounded();
    if (!confirmed.equals(contents)) {
      throw new Error("generated artifact rewrite could not be verified through its bound descriptor");
    }
  };

  return {
    expectedPath,
    readBounded,
    replace: replaceContents,
    assertStillBound,
    close(): void {
      if (closed) return;
      closeSync(fd);
      closed = true;
    },
  };
}

function persistGeneratedTextArtifact(
  runId: string,
  taskId: SemanticTaskType,
  sequence: number,
  runPath: string,
  relativeRunPath: string,
  artifactId: string,
  artifactKind: string,
  evidenceKind: EvidenceV1["kind"],
  secrets: readonly string[],
): PersistedTextArtifact {
  const handle = openManagedGeneratedArtifact(runPath, relativeRunPath);
  try {
    const raw = handle.readBounded();
    const rawText = raw.toString("utf8");
    const text = redactExactValues(rawText, secrets);
    const persisted = Buffer.from(text, "utf8");
    if (!persisted.equals(raw)) handle.replace(persisted);
    handle.assertStillBound();
    const sha256 = createSha256(persisted);
    const redacted = secrets.some((secret) => rawText.includes(secret));
    return {
      text,
      artifact: {
        artifact_id: artifactId,
        task_id: taskId,
        relative_run_path: relativeRunPath,
        kind: artifactKind,
        sha256,
        byte_length: persisted.byteLength,
        redacted,
        truncated: false,
      },
      evidence: {
        evidence_id: `${taskId}.e${sequence}`,
        run_id: runId,
        task_id: taskId,
        sequence,
        kind: evidenceKind,
        sha256,
        artifact_id: artifactId,
        redacted,
        truncated: false,
      },
    };
  } finally {
    handle.close();
  }
}
'''

if text.count(old) != 1:
    raise SystemExit(f'expected exactly one generated artifact block, found {text.count(old)}')
text = text.replace(old, new)
check.write_text(text)
