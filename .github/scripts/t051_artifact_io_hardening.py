from pathlib import Path

path = Path("src/check.ts")
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one replacement, found {count}: {old[:120]!r}")
    text = text.replace(old, new, 1)


replace_once(
    'import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";',
    'import { closeSync, mkdirSync, openSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";',
)
replace_once(
    'import { join, resolve } from "node:path";',
    'import { join, resolve } from "node:path";',
)

replace_once(
'''  const persisted = Buffer.from(text, "utf8");
  writeFileSync(join(rawPath, fileName), persisted);

  const sha256 = createSha256(persisted);
''',
'''  const persisted = Buffer.from(text, "utf8");
  const capturePath = join(rawPath, fileName);
  let captureFd: number | null = null;
  try {
    captureFd = openSync(capturePath, "wx", 0o600);
    writeFileSync(captureFd, persisted);
  } finally {
    if (captureFd !== null) closeSync(captureFd);
  }

  const sha256 = createSha256(persisted);
''',
)

replace_once(
'''function persistGeneratedTextArtifact(
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
  const absolute = join(runPath, ...relativeRunPath.split("/"));
  const info = statSync(absolute);
  if (!info.isFile() || info.size > TASK_CAPTURE_CAP_BYTES) {
    throw new Error("Vitest generated artifact is missing, non-file, or exceeds the evidence size budget.");
  }
  const raw = readFileSync(absolute);
''',
'''export function resolveManagedGeneratedArtifactPath(
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
''',
)

path.write_text(text)
