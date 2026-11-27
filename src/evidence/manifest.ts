import { randomBytes } from "node:crypto";
import { lstatSync, readdirSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  canonicalAssuranceJsonV1,
  canonicalAssuranceSha256V1,
} from "../assurance/contracts/canonical-serialization.js";
import { readGitHeadState, readTreeDigestV1 } from "../git.js";
import { acquireRunLock } from "../lock.js";
import { ASCOUT_PACKAGE_VERSION } from "../mcp/server.js";
import { validateReceiptForAcceptance } from "../receipt/json.js";
import type { ReceiptV1 } from "../receipt/model.js";
import { M1_RECOGNIZED_SECRET_ENV_NAMES, selectedSecretValues } from "../redact.js";
import {
  deleteCasObjectV1,
  ensureContainedPhysicalDirV1,
  EVIDENCE_DIR_NAME,
  EVIDENCE_MANIFESTS_SUBDIR,
  getCasObjectV1,
  isValidSha256HexV1,
  listCasDigestsV1,
  putCasObjectV1,
  readBoundedRegularFileV1,
  redactEvidenceTextV1,
  sha256HexV1,
  writeAtomicSafeRegularFileV1,
} from "./cas-store.js";

export const EVIDENCE_KINDS = [
  "check",
  "review",
  "security",
  "test",
  "browser",
  "runtime",
  "verify",
  "release",
  "benchmark",
] as const;

export type EvidenceKindV1 = (typeof EVIDENCE_KINDS)[number];

export interface EvidenceSourceIdentityV1 {
  readonly head_sha: string | null;
  readonly detached: boolean;
  readonly worktree_tree_digest: string | null;
  readonly dirty: boolean;
}

export interface EvidenceArtifactRefV1 {
  readonly role: string;
  readonly media_type: string;
  readonly sha256: string;
  readonly byte_length: number;
  readonly redacted: boolean;
}

export interface EvidenceManifestBodyV1 {
  readonly schema_version: 1;
  readonly evidence_id: string;
  readonly kind: EvidenceKindV1;
  readonly created_at: string;
  readonly ascout_version: string;
  readonly verdict: string;
  readonly exit_code: number;
  readonly source: EvidenceSourceIdentityV1;
  readonly parent_manifest_sha256: string | null;
  readonly summary: string;
  readonly payload_sha256: string;
  readonly artifacts: readonly EvidenceArtifactRefV1[];
  readonly integrity_scope: "local_content_hash_only";
}

export interface EvidenceManifestV1 extends EvidenceManifestBodyV1 {
  readonly manifest_sha256: string;
}

export interface EvidenceArtifactInputV1 {
  readonly role: string;
  readonly media_type: string;
  readonly content: Uint8Array | string;
  readonly is_text?: boolean;
}

export interface RecordEvidenceInputV1 {
  readonly kind: EvidenceKindV1;
  readonly verdict: string;
  readonly exit_code: number;
  readonly summary: string;
  readonly payload: unknown;
  readonly artifacts?: readonly EvidenceArtifactInputV1[];
  readonly source?: EvidenceSourceIdentityV1;
  readonly created_at?: string;
  readonly evidence_id?: string;
  readonly secrets?: readonly string[];
  readonly skipLock?: boolean;
}

export interface EvidenceListResultV1 {
  readonly manifests: readonly EvidenceManifestV1[];
  readonly corrupt_files: readonly string[];
}

export type ManifestLookupV1 =
  | { readonly state: "ok"; readonly manifest: EvidenceManifestV1 }
  | { readonly state: "missing" }
  | { readonly state: "corrupt"; readonly reason: string };

export interface EvidenceVerifyItemV1 {
  readonly evidence_id: string;
  readonly manifest_sha256: string | null;
  readonly status: "CONTENT_INTEGRITY_VERIFIED" | "TAMPERED" | "INCOMPLETE";
  readonly expected_digest_matched: boolean | null;
  readonly chain_status: "genesis" | "linked" | "parent_pruned" | "chain_tampered";
  readonly checked_objects: number;
  readonly issues: readonly string[];
}

export interface EvidenceVerifyReportV1 {
  readonly status: "CONTENT_INTEGRITY_VERIFIED" | "TAMPERED" | "INCOMPLETE";
  readonly integrity_scope: "local_content_hash_only";
  readonly disclosure: string;
  readonly items: readonly EvidenceVerifyItemV1[];
}

export interface EvidenceArtifactDeltaV1 {
  readonly role: string;
  readonly change: "added" | "removed" | "modified";
  readonly left_sha256: string | null;
  readonly right_sha256: string | null;
}

export interface EvidenceDiffReportV1 {
  readonly left_id: string;
  readonly right_id: string;
  readonly left_manifest_sha256: string;
  readonly right_manifest_sha256: string;
  readonly source_changed: boolean;
  readonly head_changed: boolean;
  readonly verdict_changed: boolean;
  readonly left_verdict: string;
  readonly right_verdict: string;
  readonly left_exit_code: number;
  readonly right_exit_code: number;
  readonly payload_changed: boolean;
  readonly artifact_deltas: readonly EvidenceArtifactDeltaV1[];
}

export interface EvidenceExportBundleV1 {
  readonly bundle_format: "ascout.evidence-bundle.v1";
  readonly exported_at: string;
  readonly integrity_scope: "local_content_hash_only";
  readonly disclosure: string;
  readonly manifest: EvidenceManifestV1;
  readonly objects: Readonly<Record<string, { readonly encoding: "base64"; readonly sha256: string; readonly data: string }>>;
  readonly bundle_sha256: string;
}

export interface EvidencePruneReportV1 {
  readonly keep_last: number;
  readonly dry_run: boolean;
  readonly kept_evidence_ids: readonly string[];
  readonly removed_evidence_ids: readonly string[];
  readonly removed_object_digests: readonly string[];
}

const MANIFEST_MAX_BYTES = 2 * 1024 * 1024;
const RECEIPT_MAX_BYTES = 8 * 1024 * 1024;
const RUN_MANIFEST_MAX_BYTES = 64 * 1024;

const EVIDENCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/u;
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const RESERVED_EVIDENCE_IDS = new Set(["all", "latest"]);

const MANIFEST_KEYS = [
  "artifacts",
  "ascout_version",
  "created_at",
  "evidence_id",
  "exit_code",
  "integrity_scope",
  "kind",
  "manifest_sha256",
  "parent_manifest_sha256",
  "payload_sha256",
  "schema_version",
  "source",
  "summary",
  "verdict",
].join(",");
const SOURCE_KEYS = ["detached", "dirty", "head_sha", "worktree_tree_digest"].join(",");
const ARTIFACT_KEYS = ["byte_length", "media_type", "redacted", "role", "sha256"].join(",");

export const LOCAL_INTEGRITY_DISCLOSURE =
  "Local SHA-256 content integrity only; verifies stored bytes have not changed since capture, and does not prove external authorship or non-repudiation unless anchored with --expected-digest.";

export function evidenceManifestsRootV1(repoRoot: string): string {
  return join(resolve(repoRoot), EVIDENCE_DIR_NAME, EVIDENCE_MANIFESTS_SUBDIR);
}

export function isValidEvidenceIdV1(value: string): boolean {
  return (
    EVIDENCE_ID_PATTERN.test(value) &&
    !value.endsWith(".") &&
    !RESERVED_EVIDENCE_IDS.has(value.toLowerCase()) &&
    !WINDOWS_RESERVED_NAME.test(value)
  );
}

export function evidenceManifestPathV1(repoRoot: string, evidenceId: string): string {
  if (!isValidEvidenceIdV1(evidenceId)) {
    throw new TypeError(`Invalid evidence id: ${JSON.stringify(evidenceId)}`);
  }
  return join(evidenceManifestsRootV1(repoRoot), `${evidenceId}.json`);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(record: Record<string, unknown>, expectedSortedCsv: string): boolean {
  return Object.keys(record).sort().join(",") === expectedSortedCsv;
}

export function captureEvidenceSourceIdentityV1(repoRoot: string): EvidenceSourceIdentityV1 {
  try {
    const head = readGitHeadState(repoRoot);
    const tree = readTreeDigestV1(repoRoot);
    return {
      head_sha: head.head_sha,
      detached: head.detached,
      worktree_tree_digest: tree.tree_digest,
      dirty: tree.unstaged_changed_count > 0 || tree.included_untracked_count > 0,
    };
  } catch {
    return {
      head_sha: null,
      detached: false,
      worktree_tree_digest: null,
      dirty: true,
    };
  }
}

export function parseEvidenceManifestV1(raw: string): EvidenceManifestV1 | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObjectRecord(parsed) || !hasExactKeys(parsed, MANIFEST_KEYS)) return null;
  if (
    parsed.schema_version !== 1 ||
    typeof parsed.evidence_id !== "string" ||
    !isValidEvidenceIdV1(parsed.evidence_id) ||
    typeof parsed.kind !== "string" ||
    !(EVIDENCE_KINDS as readonly string[]).includes(parsed.kind) ||
    typeof parsed.created_at !== "string" ||
    typeof parsed.ascout_version !== "string" ||
    typeof parsed.verdict !== "string" ||
    typeof parsed.exit_code !== "number" ||
    !Number.isSafeInteger(parsed.exit_code) ||
    typeof parsed.summary !== "string" ||
    typeof parsed.payload_sha256 !== "string" ||
    !isValidSha256HexV1(parsed.payload_sha256) ||
    typeof parsed.manifest_sha256 !== "string" ||
    !isValidSha256HexV1(parsed.manifest_sha256) ||
    parsed.integrity_scope !== "local_content_hash_only" ||
    (parsed.parent_manifest_sha256 !== null &&
      (typeof parsed.parent_manifest_sha256 !== "string" ||
        !isValidSha256HexV1(parsed.parent_manifest_sha256))) ||
    !isObjectRecord(parsed.source) ||
    !hasExactKeys(parsed.source, SOURCE_KEYS) ||
    (parsed.source.head_sha !== null && typeof parsed.source.head_sha !== "string") ||
    typeof parsed.source.detached !== "boolean" ||
    (parsed.source.worktree_tree_digest !== null && typeof parsed.source.worktree_tree_digest !== "string") ||
    typeof parsed.source.dirty !== "boolean" ||
    !Array.isArray(parsed.artifacts)
  ) {
    return null;
  }
  for (const artifact of parsed.artifacts) {
    if (
      !isObjectRecord(artifact) ||
      !hasExactKeys(artifact, ARTIFACT_KEYS) ||
      typeof artifact.role !== "string" ||
      typeof artifact.media_type !== "string" ||
      typeof artifact.sha256 !== "string" ||
      !isValidSha256HexV1(artifact.sha256) ||
      typeof artifact.byte_length !== "number" ||
      !Number.isSafeInteger(artifact.byte_length) ||
      artifact.byte_length < 0 ||
      typeof artifact.redacted !== "boolean"
    ) {
      return null;
    }
  }
  return parsed as unknown as EvidenceManifestV1;
}

export function manifestBodyOfV1(manifest: EvidenceManifestV1): EvidenceManifestBodyV1 {
  return {
    schema_version: manifest.schema_version,
    evidence_id: manifest.evidence_id,
    kind: manifest.kind,
    created_at: manifest.created_at,
    ascout_version: manifest.ascout_version,
    verdict: manifest.verdict,
    exit_code: manifest.exit_code,
    source: manifest.source,
    parent_manifest_sha256: manifest.parent_manifest_sha256,
    summary: manifest.summary,
    payload_sha256: manifest.payload_sha256,
    artifacts: manifest.artifacts,
    integrity_scope: manifest.integrity_scope,
  };
}

function compareManifestsNewestFirst(left: EvidenceManifestV1, right: EvidenceManifestV1): number {
  if (left.created_at !== right.created_at) {
    return left.created_at > right.created_at ? -1 : 1;
  }
  return right.evidence_id.localeCompare(left.evidence_id);
}

export function listEvidenceManifestsV1(repoRoot: string): EvidenceListResultV1 {
  const dir = ensureContainedPhysicalDirV1(
    repoRoot,
    [EVIDENCE_DIR_NAME, EVIDENCE_MANIFESTS_SUBDIR],
    false,
  );
  if (dir === null) {
    return { manifests: [], corrupt_files: [] };
  }
  const manifests: EvidenceManifestV1[] = [];
  const corruptFiles: string[] = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".json") || file.startsWith(".tmp-")) continue;
    const read = readBoundedRegularFileV1(join(dir, file), MANIFEST_MAX_BYTES);
    const parsed = read.kind === "ok" ? parseEvidenceManifestV1(read.bytes.toString("utf8")) : null;
    if (parsed === null || `${parsed.evidence_id}.json` !== file) {
      corruptFiles.push(file);
    } else {
      manifests.push(parsed);
    }
  }
  manifests.sort(compareManifestsNewestFirst);
  return { manifests, corrupt_files: corruptFiles };
}

export function lookupEvidenceManifestV1(repoRoot: string, idOrLatest: string): ManifestLookupV1 {
  if (idOrLatest === "latest") {
    const listed = listEvidenceManifestsV1(repoRoot);
    if (listed.corrupt_files.length > 0) {
      return {
        state: "corrupt",
        reason: `evidence directory contains corrupt manifest file(s): ${listed.corrupt_files.join(", ")}`,
      };
    }
    const newest = listed.manifests[0];
    return newest === undefined ? { state: "missing" } : { state: "ok", manifest: newest };
  }
  if (!isValidEvidenceIdV1(idOrLatest)) {
    return { state: "missing" };
  }
  const dir = ensureContainedPhysicalDirV1(
    repoRoot,
    [EVIDENCE_DIR_NAME, EVIDENCE_MANIFESTS_SUBDIR],
    false,
  );
  if (dir === null) return { state: "missing" };
  const read = readBoundedRegularFileV1(join(dir, `${idOrLatest}.json`), MANIFEST_MAX_BYTES);
  if (read.kind === "missing") return { state: "missing" };
  if (read.kind === "unsafe") {
    return { state: "corrupt", reason: `manifest file ${idOrLatest}.json is unsafe, linked, or exceeds size cap` };
  }
  const parsed = parseEvidenceManifestV1(read.bytes.toString("utf8"));
  if (parsed === null || parsed.evidence_id !== idOrLatest) {
    return { state: "corrupt", reason: `manifest file ${idOrLatest}.json is malformed or does not match its evidence_id` };
  }
  return { state: "ok", manifest: parsed };
}

export function readEvidenceManifestV1(repoRoot: string, idOrLatest: string): EvidenceManifestV1 | null {
  const lookup = lookupEvidenceManifestV1(repoRoot, idOrLatest);
  return lookup.state === "ok" ? lookup.manifest : null;
}

function redactJsonValue(
  value: unknown,
  secrets: readonly string[],
  repoRoot: string,
): unknown {
  if (typeof value === "string") {
    return redactEvidenceTextV1(value, secrets, { repoRoot }).text;
  }
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : redactJsonValue(item, secrets, repoRoot)));
  }
  if (isObjectRecord(value)) {
    const out = Object.create(null) as Record<string, unknown>;
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined) continue;
      const redactedKey = redactEvidenceTextV1(key, secrets, { repoRoot }).text;
      out[redactedKey] = redactJsonValue(entry, secrets, repoRoot);
    }
    return out;
  }
  return value;
}

function defaultSecretValues(): readonly string[] {
  return selectedSecretValues(process.env, {
    recognized_names: M1_RECOGNIZED_SECRET_ENV_NAMES,
    configured_names: [],
    minimum_value_bytes: 8,
  });
}

async function withOptionalRunLock<T>(
  repoRoot: string,
  skipLock: boolean,
  action: () => T,
): Promise<T> {
  if (skipLock) return action();
  const lock = await acquireRunLock(repoRoot);
  try {
    return action();
  } finally {
    await lock.release();
  }
}

export async function recordEvidenceV1(
  repoRoot: string,
  input: RecordEvidenceInputV1,
): Promise<EvidenceManifestV1> {
  const root = resolve(repoRoot);
  return withOptionalRunLock(root, input.skipLock === true, () => {
    const secrets = input.secrets ?? defaultSecretValues();
    const createdAt = input.created_at ?? new Date().toISOString();
    const source = input.source ?? captureEvidenceSourceIdentityV1(root);
    const manifestsDir = ensureContainedPhysicalDirV1(
      root,
      [EVIDENCE_DIR_NAME, EVIDENCE_MANIFESTS_SUBDIR],
      true,
    )!;
    const existing = listEvidenceManifestsV1(root).manifests;
    const parentSha = existing[0]?.manifest_sha256 ?? null;

    const redactedPayload = redactJsonValue(input.payload, secrets, root);
    const canonicalPayload = canonicalAssuranceJsonV1(redactedPayload);
    const storedPayload = putCasObjectV1(root, canonicalPayload);

    const artifactRefs: EvidenceArtifactRefV1[] = [];
    for (const artifact of input.artifacts ?? []) {
      if (typeof artifact.content === "string" || artifact.is_text === true) {
        const text =
          typeof artifact.content === "string"
            ? artifact.content
            : Buffer.from(artifact.content).toString("utf8");
        const redacted = redactEvidenceTextV1(text, secrets, { repoRoot: root });
        const stored = putCasObjectV1(root, redacted.text);
        artifactRefs.push({
          role: artifact.role,
          media_type: artifact.media_type,
          sha256: stored.sha256,
          byte_length: stored.byte_length,
          redacted: redacted.redacted,
        });
      } else {
        const stored = putCasObjectV1(root, artifact.content);
        artifactRefs.push({
          role: artifact.role,
          media_type: artifact.media_type,
          sha256: stored.sha256,
          byte_length: stored.byte_length,
          redacted: false,
        });
      }
    }

    const summary = redactEvidenceTextV1(input.summary, secrets, { repoRoot: root }).text;
    const salt = sha256HexV1(
      `${input.kind}:${createdAt}:${storedPayload.sha256}:${parentSha ?? "genesis"}:${randomBytes(4).toString("hex")}`,
    );
    const evidenceId = input.evidence_id ?? `ev_${salt.slice(0, 16)}`;
    if (!isValidEvidenceIdV1(evidenceId)) {
      throw new TypeError(`Invalid evidence id: ${JSON.stringify(evidenceId)}`);
    }

    const body: EvidenceManifestBodyV1 = {
      schema_version: 1,
      evidence_id: evidenceId,
      kind: input.kind,
      created_at: createdAt,
      ascout_version: ASCOUT_PACKAGE_VERSION,
      verdict: input.verdict,
      exit_code: input.exit_code,
      source,
      parent_manifest_sha256: parentSha,
      summary,
      payload_sha256: storedPayload.sha256,
      artifacts: artifactRefs,
      integrity_scope: "local_content_hash_only",
    };
    const manifestSha = canonicalAssuranceSha256V1(body);
    const manifest: EvidenceManifestV1 = { ...body, manifest_sha256: manifestSha };
    const manifestPath = join(manifestsDir, `${evidenceId}.json`);
    if (lstatSync(manifestPath, { bigint: true, throwIfNoEntry: false }) !== undefined) {
      throw new Error(`Evidence manifest ${JSON.stringify(evidenceId)} already exists; refusing to overwrite append-only evidence chain.`);
    }
    writeAtomicSafeRegularFileV1(
      manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    return manifest;
  });
}

function safeManifestSha256(manifest: EvidenceManifestV1): string | null {
  try {
    return canonicalAssuranceSha256V1(manifestBodyOfV1(manifest));
  } catch {
    return null;
  }
}

interface VerifiedManifestWithObjectsV1 {
  readonly item: EvidenceVerifyItemV1;
  readonly objects: ReadonlyMap<string, Buffer>;
}

function verifySingleManifest(
  repoRoot: string,
  manifest: EvidenceManifestV1,
  allBySha: ReadonlyMap<string, EvidenceManifestV1>,
  collectObjects: boolean,
  expectedDigest?: string,
): VerifiedManifestWithObjectsV1 {
  const issues: string[] = [];
  const objects = new Map<string, Buffer>();
  let checkedObjects = 0;

  const recomputed = safeManifestSha256(manifest);
  if (recomputed === null || recomputed !== manifest.manifest_sha256) {
    issues.push(`manifest_sha256 mismatch: expected ${manifest.manifest_sha256}, computed ${recomputed ?? "invalid_canonical_json"}`);
  }

  let expectedMatched: boolean | null = null;
  if (expectedDigest !== undefined) {
    const normalized = expectedDigest.trim().toLowerCase();
    expectedMatched = recomputed !== null && normalized === recomputed && normalized === manifest.manifest_sha256;
    if (!expectedMatched) {
      issues.push(`--expected-digest ${normalized} does not match verified manifest digest ${recomputed ?? "invalid"}`);
    }
  }

  const payload = getCasObjectV1(repoRoot, manifest.payload_sha256);
  checkedObjects += 1;
  if (!payload.ok) {
    issues.push(`payload object ${manifest.payload_sha256}: ${payload.reason}`);
  } else if (collectObjects) {
    objects.set(manifest.payload_sha256, payload.bytes);
  }

  for (const artifact of manifest.artifacts) {
    const obj = getCasObjectV1(repoRoot, artifact.sha256);
    checkedObjects += 1;
    if (!obj.ok) {
      issues.push(`artifact ${artifact.role} (${artifact.sha256}): ${obj.reason}`);
    } else if (obj.byte_length !== artifact.byte_length) {
      issues.push(`artifact ${artifact.role} byte_length mismatch: manifest=${artifact.byte_length}, stored=${obj.byte_length}`);
    } else if (collectObjects) {
      objects.set(artifact.sha256, obj.bytes);
    }
  }

  let chainStatus: EvidenceVerifyItemV1["chain_status"] = "genesis";
  if (manifest.parent_manifest_sha256 !== null) {
    const parent = allBySha.get(manifest.parent_manifest_sha256);
    if (parent === undefined) {
      chainStatus = "parent_pruned";
    } else {
      const parentComputed = safeManifestSha256(parent);
      if (parentComputed !== manifest.parent_manifest_sha256) {
        chainStatus = "chain_tampered";
        issues.push(`parent manifest ${parent.evidence_id} failed hash-chain verification`);
      } else {
        chainStatus = "linked";
      }
    }
  }

  const status: EvidenceVerifyItemV1["status"] =
    issues.length === 0 ? "CONTENT_INTEGRITY_VERIFIED" : "TAMPERED";
  return {
    item: {
      evidence_id: manifest.evidence_id,
      manifest_sha256: manifest.manifest_sha256,
      status,
      expected_digest_matched: expectedMatched,
      chain_status: chainStatus,
      checked_objects: checkedObjects,
      issues,
    },
    objects,
  };
}

export function verifyEvidenceV1(
  repoRoot: string,
  target: string | "all" | "latest",
  options: { readonly expectedDigest?: string } = {},
): EvidenceVerifyReportV1 {
  if (target === "all" && options.expectedDigest !== undefined) {
    throw new Error("--expected-digest cannot be combined with target 'all'.");
  }
  const root = resolve(repoRoot);
  const listed = listEvidenceManifestsV1(root);
  const bySha = new Map<string, EvidenceManifestV1>();
  for (const manifest of listed.manifests) {
    bySha.set(manifest.manifest_sha256, manifest);
  }

  if (target === "all") {
    const items: EvidenceVerifyItemV1[] = listed.manifests.map((manifest) =>
      verifySingleManifest(root, manifest, bySha, false).item,
    );
    for (const file of listed.corrupt_files) {
      items.push({
        evidence_id: file,
        manifest_sha256: null,
        status: "TAMPERED",
        expected_digest_matched: null,
        chain_status: "genesis",
        checked_objects: 0,
        issues: [`manifest file ${file} is corrupt or non-conforming`],
      });
    }
    if (items.length === 0) {
      return {
        status: "INCOMPLETE",
        integrity_scope: "local_content_hash_only",
        disclosure: LOCAL_INTEGRITY_DISCLOSURE,
        items: [],
      };
    }
    const tampered = items.some((item) => item.status === "TAMPERED");
    return {
      status: tampered ? "TAMPERED" : "CONTENT_INTEGRITY_VERIFIED",
      integrity_scope: "local_content_hash_only",
      disclosure: LOCAL_INTEGRITY_DISCLOSURE,
      items,
    };
  }

  const lookup = lookupEvidenceManifestV1(root, target);
  if (lookup.state === "missing") {
    return {
      status: "INCOMPLETE",
      integrity_scope: "local_content_hash_only",
      disclosure: LOCAL_INTEGRITY_DISCLOSURE,
      items: [
        {
          evidence_id: target,
          manifest_sha256: null,
          status: "INCOMPLETE",
          expected_digest_matched: options.expectedDigest === undefined ? null : false,
          chain_status: "genesis",
          checked_objects: 0,
          issues: [`evidence manifest ${JSON.stringify(target)} was not found`],
        },
      ],
    };
  }
  if (lookup.state === "corrupt") {
    return {
      status: "TAMPERED",
      integrity_scope: "local_content_hash_only",
      disclosure: LOCAL_INTEGRITY_DISCLOSURE,
      items: [
        {
          evidence_id: target,
          manifest_sha256: null,
          status: "TAMPERED",
          expected_digest_matched: options.expectedDigest === undefined ? null : false,
          chain_status: "genesis",
          checked_objects: 0,
          issues: [lookup.reason],
        },
      ],
    };
  }

  const verified = verifySingleManifest(root, lookup.manifest, bySha, false, options.expectedDigest);
  return {
    status: verified.item.status,
    integrity_scope: "local_content_hash_only",
    disclosure: LOCAL_INTEGRITY_DISCLOSURE,
    items: [verified.item],
  };
}

function requireManifestForDiff(root: string, side: "Left" | "Right", id: string): EvidenceManifestV1 {
  const lookup = lookupEvidenceManifestV1(root, id);
  if (lookup.state === "corrupt") {
    throw new Error(`${side} evidence manifest is corrupt: ${lookup.reason}`);
  }
  if (lookup.state === "missing") {
    throw new Error(`${side} evidence manifest not found: ${JSON.stringify(id)}`);
  }
  return lookup.manifest;
}

export function diffEvidenceV1(
  repoRoot: string,
  leftId: string,
  rightId: string,
): EvidenceDiffReportV1 {
  const root = resolve(repoRoot);
  const left = requireManifestForDiff(root, "Left", leftId);
  const right = requireManifestForDiff(root, "Right", rightId);

  const leftByRole = new Map(left.artifacts.map((artifact) => [artifact.role, artifact.sha256]));
  const rightByRole = new Map(right.artifacts.map((artifact) => [artifact.role, artifact.sha256]));
  const roles = [...new Set([...leftByRole.keys(), ...rightByRole.keys()])].sort();

  const artifactDeltas: EvidenceArtifactDeltaV1[] = [];
  for (const role of roles) {
    const leftSha = leftByRole.get(role) ?? null;
    const rightSha = rightByRole.get(role) ?? null;
    if (leftSha === rightSha) continue;
    artifactDeltas.push({
      role,
      change: leftSha === null ? "added" : rightSha === null ? "removed" : "modified",
      left_sha256: leftSha,
      right_sha256: rightSha,
    });
  }

  return {
    left_id: left.evidence_id,
    right_id: right.evidence_id,
    left_manifest_sha256: left.manifest_sha256,
    right_manifest_sha256: right.manifest_sha256,
    source_changed:
      left.source.head_sha !== right.source.head_sha ||
      left.source.worktree_tree_digest !== right.source.worktree_tree_digest ||
      left.source.dirty !== right.source.dirty,
    head_changed: left.source.head_sha !== right.source.head_sha,
    verdict_changed: left.verdict !== right.verdict,
    left_verdict: left.verdict,
    right_verdict: right.verdict,
    left_exit_code: left.exit_code,
    right_exit_code: right.exit_code,
    payload_changed: left.payload_sha256 !== right.payload_sha256,
    artifact_deltas: artifactDeltas,
  };
}

/**
 * Verifies a single manifest and all its referenced CAS objects in one pass (no verify-then-reread
 * TOCTOU) and writes a self-contained portable JSON bundle safely.
 */
export function exportEvidenceBundleV1(
  repoRoot: string,
  idOrLatest: string,
  outPath: string,
  options: { readonly exportedAt?: string } = {},
): EvidenceExportBundleV1 {
  const root = resolve(repoRoot);
  const lookup = lookupEvidenceManifestV1(root, idOrLatest);
  if (lookup.state !== "ok") {
    throw new Error(
      `Refusing to export unverified evidence (${lookup.state === "missing" ? "INCOMPLETE" : "TAMPERED"}): ${lookup.state === "corrupt" ? lookup.reason : `evidence manifest ${JSON.stringify(idOrLatest)} not found`}`,
    );
  }
  const listed = listEvidenceManifestsV1(root);
  const bySha = new Map(listed.manifests.map((m) => [m.manifest_sha256, m]));
  const verified = verifySingleManifest(root, lookup.manifest, bySha, true);
  if (verified.item.status !== "CONTENT_INTEGRITY_VERIFIED") {
    throw new Error(`Refusing to export unverified evidence (${verified.item.status}): ${verified.item.issues.join("; ")}`);
  }

  const objects: Record<string, { readonly encoding: "base64"; readonly sha256: string; readonly data: string }> = {};
  for (const digest of [...verified.objects.keys()].sort()) {
    const bytes = verified.objects.get(digest)!;
    objects[digest] = {
      encoding: "base64",
      sha256: digest,
      data: bytes.toString("base64"),
    };
  }

  const bundleBody = {
    bundle_format: "ascout.evidence-bundle.v1" as const,
    exported_at: options.exportedAt ?? new Date().toISOString(),
    integrity_scope: "local_content_hash_only" as const,
    disclosure: LOCAL_INTEGRITY_DISCLOSURE,
    manifest: lookup.manifest,
    objects,
  };
  const bundleSha = canonicalAssuranceSha256V1(bundleBody);
  const bundle: EvidenceExportBundleV1 = { ...bundleBody, bundle_sha256: bundleSha };
  writeAtomicSafeRegularFileV1(outPath, `${JSON.stringify(bundle, null, 2)}\n`);
  return bundle;
}

export async function pruneEvidenceV1(
  repoRoot: string,
  options: { readonly keepLast: number; readonly dryRun?: boolean; readonly skipLock?: boolean },
): Promise<EvidencePruneReportV1> {
  if (!Number.isSafeInteger(options.keepLast) || options.keepLast < 0) {
    throw new TypeError("keepLast must be a non-negative integer");
  }
  const root = resolve(repoRoot);
  const dryRun = options.dryRun === true;
  return withOptionalRunLock(root, options.skipLock === true, () => {
    const listed = listEvidenceManifestsV1(root);
    if (listed.corrupt_files.length > 0) {
      throw new Error(
        `Refusing to prune while corrupt manifest file(s) exist: ${listed.corrupt_files.join(", ")}`,
      );
    }
    const manifestsDir = ensureContainedPhysicalDirV1(
      root,
      [EVIDENCE_DIR_NAME, EVIDENCE_MANIFESTS_SUBDIR],
      false,
    );
    const kept = listed.manifests.slice(0, options.keepLast);
    const toRemove = listed.manifests.slice(options.keepLast);

    const referenced = new Set<string>();
    for (const manifest of kept) {
      referenced.add(manifest.payload_sha256);
      for (const artifact of manifest.artifacts) referenced.add(artifact.sha256);
    }

    const removedIds: string[] = [];
    for (const manifest of toRemove) {
      removedIds.push(manifest.evidence_id);
      if (!dryRun && manifestsDir !== null) {
        unlinkSync(join(manifestsDir, `${manifest.evidence_id}.json`));
      }
    }

    const allObjects = listCasDigestsV1(root);
    const removedDigests: string[] = [];
    for (const digest of allObjects) {
      if (referenced.has(digest)) continue;
      removedDigests.push(digest);
      if (!dryRun) {
        deleteCasObjectV1(root, digest);
      }
    }

    return {
      keep_last: options.keepLast,
      dry_run: dryRun,
      kept_evidence_ids: kept.map((m) => m.evidence_id),
      removed_evidence_ids: removedIds,
      removed_object_digests: removedDigests,
    };
  });
}

function isCompletedRunDirectory(runPath: string, runId: string): boolean {
  if (lstatSync(join(runPath, ".active"), { bigint: true, throwIfNoEntry: false }) !== undefined) {
    return false;
  }
  const manifestRead = readBoundedRegularFileV1(join(runPath, "manifest.json"), RUN_MANIFEST_MAX_BYTES);
  if (manifestRead.kind !== "ok") return false;
  try {
    const parsed = JSON.parse(manifestRead.bytes.toString("utf8")) as unknown;
    return isObjectRecord(parsed) && parsed.state === "completed" && parsed.run_id === runId;
  } catch {
    return false;
  }
}

export function findLatestCheckRunReceiptV1(
  repoRoot: string,
  runId?: string,
): { readonly run_id: string; readonly receipt: ReceiptV1 } | null {
  const runsDir = ensureContainedPhysicalDirV1(repoRoot, [EVIDENCE_DIR_NAME, "runs"], false);
  if (runsDir === null) return null;

  let candidateIds: string[];
  if (runId !== undefined && runId !== "latest") {
    if (!isValidEvidenceIdV1(runId)) return null;
    candidateIds = [runId];
  } else {
    candidateIds = readdirSync(runsDir).sort().reverse();
  }
  for (const candidate of candidateIds) {
    if (!isValidEvidenceIdV1(candidate)) continue;
    const runPath = join(runsDir, candidate);
    const stat = lstatSync(runPath, { bigint: true, throwIfNoEntry: false });
    if (stat === undefined || !stat.isDirectory()) continue;
    if (!isCompletedRunDirectory(runPath, candidate)) continue;
    const read = readBoundedRegularFileV1(join(runPath, "receipt.json"), RECEIPT_MAX_BYTES);
    if (read.kind !== "ok") continue;
    try {
      const parsed = JSON.parse(read.bytes.toString("utf8")) as unknown;
      const receipt = validateReceiptForAcceptance(parsed);
      if (receipt.run.run_id !== candidate) continue;
      return { run_id: candidate, receipt };
    } catch {
      continue;
    }
  }
  return null;
}

export async function recordCheckRunAsEvidenceV1(
  repoRoot: string,
  runId?: string,
  options: { readonly skipLock?: boolean } = {},
): Promise<EvidenceManifestV1> {
  const found = findLatestCheckRunReceiptV1(repoRoot, runId);
  if (found === null) {
    throw new Error(`No readable completed Ascout check receipt found (${runId ?? "latest"}).`);
  }
  const { receipt } = found;
  const exitCode = receipt.summary.exit_code;
  const verdict = exitCode === 0 ? "PASS" : exitCode === 1 ? "FAIL" : "INCOMPLETE";
  const start = receipt.source.start;
  return recordEvidenceV1(repoRoot, {
    kind: "check",
    verdict,
    exit_code: exitCode,
    summary: `Ascout check run ${found.run_id}: ${verdict} (${receipt.summary.completeness}, stability=${receipt.stability}, exit ${exitCode})`,
    payload: receipt,
    source: {
      head_sha: start.head_sha,
      detached: start.detached,
      worktree_tree_digest: start.tree_digest,
      dirty: start.unstaged_changed_count > 0 || start.included_untracked_count > 0,
    },
    ...(options.skipLock === true ? { skipLock: true } : {}),
  });
}
