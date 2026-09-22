import { createHash } from "node:crypto";

import { MOBILE_ARTEMIS_DONOR_SHA } from "./descriptor.js";
import {
  MOBILE_COMPLETION_STATES,
  type MobileCompletionState,
} from "./protocol.js";

export const HIERARCHY_MAX_CHARS = 8000000 as const;
export const HIERARCHY_MAX_NODES = 50000 as const;
export const LOGCAT_MAX_LINES = 200000 as const;
export const LOGCAT_MAX_LINE_CHARS = 64000 as const;
export const REDACT_TOKEN = "[REDACTED]" as const;
export const REDACT_MAX_SECRETS = 50 as const;
export const SCREENSHOT_MAX_BYTES = 134217728 as const;
export const SCREENSHOT_MAX_DIMENSION = 16384 as const;

const DEVICE_IDENTITY_DOMAIN = "ascout-mobile-device:v1:" as const;

export function sha256HexBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha256HexText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function hashDeviceSerialV1(serial: string): string {
  if (typeof serial !== "string" || serial.length < 1 || serial.length > 256) {
    throw new TypeError("device serial must be 1..256 chars");
  }
  return sha256HexText(DEVICE_IDENTITY_DOMAIN + serial);
}

export interface HierarchyBoundsV1 {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface HierarchyNodeV1 {
  readonly index: number;
  readonly text: string;
  readonly resourceId: string;
  readonly className: string;
  readonly packageName: string;
  readonly contentDesc: string;
  readonly clickable: boolean;
  readonly bounds: HierarchyBoundsV1;
}

export interface HierarchyParseV1 {
  readonly nodes: readonly HierarchyNodeV1[];
  readonly skippedTags: number;
}

const ATTRIBUTE_PATTERN = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/gu;
const NODE_TAG_PATTERN = /<node\b[^>]*?\/>/gu;
const BOUNDS_PATTERN = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/u;

function decodeEntities(value: string): string | null {
  if (!value.includes("&")) return value;
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
  };
  let out = "";
  let rest = value;
  for (;;) {
    const amp = rest.indexOf("&");
    if (amp < 0) {
      out += rest;
      return out;
    }
    const semi = rest.indexOf(";", amp + 1);
    if (semi < 0 || semi - amp > 8) return null;
    const entity = rest.slice(amp, semi + 1);
    const decoded = entities[entity];
    if (decoded === undefined) return null;
    out += rest.slice(0, amp) + decoded;
    rest = rest.slice(semi + 1);
  }
}

function parseBounds(value: string): HierarchyBoundsV1 | null {
  const match = BOUNDS_PATTERN.exec(value);
  if (match === null || match.length < 5) return null;
  const parts = [match[1], match[2], match[3], match[4]].map((part) =>
    Number.parseInt(part as string, 10),
  );
  const x1 = parts[0] as number;
  const y1 = parts[1] as number;
  const x2 = parts[2] as number;
  const y2 = parts[3] as number;
  if (
    !Number.isInteger(x1) ||
    !Number.isInteger(y1) ||
    !Number.isInteger(x2) ||
    !Number.isInteger(y2)
  ) {
    return null;
  }
  if (x1 < 0 || y1 < 0 || x2 <= x1 || y2 <= y1) return null;
  if (x2 > 100000 || y2 > 100000) return null;
  return { x1, y1, x2, y2 };
}

function parseBooleanFlag(value: string | undefined): boolean {
  return value === "true";
}

export function parseHierarchyXmlV1(xml: string): HierarchyParseV1 {
  if (typeof xml !== "string" || xml.length < 1 || xml.length > HIERARCHY_MAX_CHARS) {
    throw new TypeError("hierarchy xml must be 1..8000000 chars");
  }
  if (xml.includes("<!") || xml.includes("<?")) {
    throw new TypeError("hierarchy xml must not contain markup declarations");
  }
  if (!/<hierarchy[\s>]/u.test(xml)) {
    throw new TypeError("hierarchy xml must open a hierarchy element");
  }
  const openTags = xml.match(/<node\b/gu) ?? [];
  NODE_TAG_PATTERN.lastIndex = 0;
  const selfClosed: RegExpExecArray[] = [];
  for (;;) {
    const tag = NODE_TAG_PATTERN.exec(xml);
    if (tag === null) break;
    selfClosed.push(tag);
  }
  if (selfClosed.length !== openTags.length) {
    throw new TypeError("hierarchy xml must be a flat node list");
  }
  const nodes: HierarchyNodeV1[] = [];
  let skippedTags = 0;
  for (const tag of selfClosed) {
    if (nodes.length >= HIERARCHY_MAX_NODES) {
      throw new TypeError("hierarchy node bound exceeded");
    }
    const attributes = new Map<string, string>();
    const tagText = tag[0] as string;
    ATTRIBUTE_PATTERN.lastIndex = 0;
    let usable = true;
    for (;;) {
      const attribute = ATTRIBUTE_PATTERN.exec(tagText);
      if (attribute === null) break;
      const decoded = decodeEntities(attribute[2] as string);
      if (decoded === null) {
        usable = false;
        break;
      }
      attributes.set(attribute[1] as string, decoded);
    }
    const boundsRaw = attributes.get("bounds");
    const bounds = boundsRaw === undefined ? null : parseBounds(boundsRaw);
    if (!usable || bounds === null) {
      skippedTags += 1;
      continue;
    }
    const indexRaw = attributes.get("index");
    const index = indexRaw === undefined ? nodes.length : Number.parseInt(indexRaw, 10);
    nodes.push({
      index: Number.isInteger(index) ? (index as number) : nodes.length,
      text: attributes.get("text") ?? "",
      resourceId: attributes.get("resource-id") ?? "",
      className: attributes.get("class") ?? "",
      packageName: attributes.get("package") ?? "",
      contentDesc: attributes.get("content-desc") ?? "",
      clickable: parseBooleanFlag(attributes.get("clickable")),
      bounds,
    });
  }
  return { nodes, skippedTags };
}

export interface LogcatEntryV1 {
  readonly date: string;
  readonly time: string;
  readonly pid: number;
  readonly tid: number;
  readonly priority: string;
  readonly tag: string;
  readonly message: string;
}

export interface LogcatParseV1 {
  readonly entries: readonly LogcatEntryV1[];
  readonly skippedLines: number;
}

const LOGCAT_PATTERN =
  /^(\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+([^:]{1,128}):\s(.*)$/u;

export function parseLogcatV1(text: string): LogcatParseV1 {
  if (typeof text !== "string") throw new TypeError("logcat text must be a string");
  const lines = text.split("\n");
  if (lines.length > LOGCAT_MAX_LINES) {
    throw new TypeError("logcat line bound exceeded");
  }
  const entries: LogcatEntryV1[] = [];
  let skippedLines = 0;
  for (const line of lines) {
    if (line.length === 0) continue;
    if (line.length > LOGCAT_MAX_LINE_CHARS) {
      skippedLines += 1;
      continue;
    }
    const match = LOGCAT_PATTERN.exec(line);
    if (match === null || match.length < 8) {
      skippedLines += 1;
      continue;
    }
    const pid = Number.parseInt(match[3] as string, 10);
    const tid = Number.parseInt(match[4] as string, 10);
    if (!Number.isInteger(pid) || !Number.isInteger(tid)) {
      skippedLines += 1;
      continue;
    }
    entries.push({
      date: match[1] as string,
      time: match[2] as string,
      pid: pid as number,
      tid: tid as number,
      priority: match[5] as string,
      tag: (match[6] as string).trim(),
      message: match[7] as string,
    });
  }
  return { entries, skippedLines };
}

export interface RedactionV1 {
  readonly text: string;
  readonly redactions: number;
}

export function redactSecretsV1(
  text: string,
  secrets: readonly string[],
): RedactionV1 {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (secrets.length > REDACT_MAX_SECRETS) {
    throw new TypeError("secret list bound exceeded");
  }
  const ordered = [...secrets]
    .filter((secret) => typeof secret === "string" && secret.length > 0 && secret.length <= 1024)
    .sort((left, right) => right.length - left.length);
  let out = text;
  let redactions = 0;
  for (const secret of ordered) {
    const parts = out.split(secret);
    redactions += parts.length - 1;
    out = parts.join(REDACT_TOKEN);
  }
  return { text: out, redactions };
}

export interface ScreenshotSummaryV1 {
  readonly format: "png";
  readonly width: number;
  readonly height: number;
  readonly byteLength: number;
  readonly sha256: string;
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;

function readUint32BE(bytes: Uint8Array, offset: number): number {
  const b0 = bytes[offset] as number;
  const b1 = bytes[offset + 1] as number;
  const b2 = bytes[offset + 2] as number;
  const b3 = bytes[offset + 3] as number;
  return b0 * 16777216 + b1 * 65536 + b2 * 256 + b3;
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += String.fromCharCode(bytes[offset + index] as number);
  }
  return out;
}

export function summarizeScreenshotV1(png: Uint8Array): ScreenshotSummaryV1 {
  if (!(png instanceof Uint8Array) || png.length < 33 || png.length > SCREENSHOT_MAX_BYTES) {
    throw new TypeError("screenshot must be 33..134217728 bytes");
  }
  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (png[index] !== PNG_SIGNATURE[index]) {
      throw new TypeError("screenshot must carry the PNG signature");
    }
  }
  if (readUint32BE(png, 8) !== 13 || readAscii(png, 12, 4) !== "IHDR") {
    throw new TypeError("screenshot must open with an IHDR chunk");
  }
  const width = readUint32BE(png, 16);
  const height = readUint32BE(png, 20);
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > SCREENSHOT_MAX_DIMENSION ||
    height > SCREENSHOT_MAX_DIMENSION
  ) {
    throw new TypeError("screenshot dimensions out of range");
  }
  return {
    format: "png",
    width,
    height,
    byteLength: png.length,
    sha256: sha256HexBytes(png),
  };
}

export interface EvidenceArtifactRefV1 {
  readonly artifact_id: string;
  readonly kind: string;
  readonly sha256: string;
  readonly byte_length: number;
}

export interface EvidenceObservationV1 {
  readonly kind: string;
  readonly ref: string;
}

export interface EvidenceReceiptV1 {
  readonly protocol_version: 1;
  readonly run_id: string;
  readonly source_digest: string;
  readonly engine_descriptor_digest: string;
  readonly donor_sha: string;
  readonly device_identity_hash: string;
  readonly completion_state: MobileCompletionState;
  readonly artifacts: readonly EvidenceArtifactRefV1[];
  readonly observations: readonly EvidenceObservationV1[];
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const GIT_SHA_HEX = /^[a-f0-9]{40}$/u;

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be an opaque id");
  }
  return value;
}

export function bindEvidenceReceiptV1(input: {
  readonly run_id: string;
  readonly source_digest: string;
  readonly engine_descriptor_digest: string;
  readonly device_identity_hash: string;
  readonly completion_state: MobileCompletionState;
  readonly artifacts: readonly {
    readonly artifact_id: string;
    readonly kind: string;
    readonly sha256: string;
    readonly byte_length: number;
  }[];
  readonly observations: readonly { readonly kind: string; readonly ref: string }[];
}): EvidenceReceiptV1 {
  if (
    typeof input.device_identity_hash !== "string" ||
    !SHA256_HEX.test(input.device_identity_hash)
  ) {
    throw new TypeError("device_identity_hash must be sha256 hex");
  }
  if (
    !(MOBILE_COMPLETION_STATES as readonly string[]).includes(input.completion_state)
  ) {
    throw new TypeError("completion_state must be canonical");
  }
  if (input.artifacts.length > 1024 || input.observations.length > 1024) {
    throw new TypeError("evidence list bound exceeded");
  }
  const artifacts: EvidenceArtifactRefV1[] = [];
  for (const artifact of input.artifacts) {
    if (typeof artifact.sha256 !== "string" || !SHA256_HEX.test(artifact.sha256)) {
      throw new TypeError("artifact sha256 must be hex");
    }
    if (
      typeof artifact.byte_length !== "number" ||
      !Number.isInteger(artifact.byte_length) ||
      artifact.byte_length < 0
    ) {
      throw new TypeError("artifact byte_length must be a non-negative integer");
    }
    artifacts.push({
      artifact_id: requireOpaqueId(artifact.artifact_id, "artifact_id"),
      kind: requireOpaqueId(artifact.kind, "artifact kind"),
      sha256: artifact.sha256,
      byte_length: artifact.byte_length,
    });
  }
  const observations: EvidenceObservationV1[] = [];
  for (const observation of input.observations) {
    observations.push({
      kind: requireOpaqueId(observation.kind, "observation kind"),
      ref: requireOpaqueId(observation.ref, "observation ref"),
    });
  }
  if (typeof input.source_digest !== "string" || !SHA256_HEX.test(input.source_digest)) {
    throw new TypeError("source_digest must be sha256 hex");
  }
  if (
    typeof input.engine_descriptor_digest !== "string" ||
    !SHA256_HEX.test(input.engine_descriptor_digest)
  ) {
    throw new TypeError("engine_descriptor_digest must be sha256 hex");
  }
  const receipt: EvidenceReceiptV1 = {
    protocol_version: 1,
    run_id: requireOpaqueId(input.run_id, "run_id"),
    source_digest: input.source_digest,
    engine_descriptor_digest: input.engine_descriptor_digest,
    donor_sha: MOBILE_ARTEMIS_DONOR_SHA,
    device_identity_hash: input.device_identity_hash,
    completion_state: input.completion_state,
    artifacts,
    observations,
  };
  return Object.freeze(receipt);
}

export const READ_ONLY_ADB_COMMANDS = {
  DEVICE_PROPERTIES: ["shell", "getprop"],
  WINDOW_STATE: ["shell", "dumpsys", "window"],
  PACKAGE_STATE: ["shell", "dumpsys", "package"],
  SCREENSHOT_STDOUT: ["exec-out", "screencap", "-p"],
  LOGCAT_DUMP: ["logcat", "-d", "-v", "threadtime"],
} as const;

export type ReadOnlyAdbCommandKind = keyof typeof READ_ONLY_ADB_COMMANDS;

export const UIAUTOMATOR_DUMP_EXCLUDED_REASON =
  "uiautomator dump writes a device-side file and is not read-only; deferred past A3" as const;

const EXTRA_ARG_PATTERN = /^[A-Za-z0-9._:/-]+$/u;

export interface ReadOnlyAdbCommandV1 {
  readonly adb: "adb";
  readonly args: readonly string[];
}

export function buildReadOnlyAdbCommandV1(
  kind: ReadOnlyAdbCommandKind,
  extraArgs: readonly string[] = [],
): ReadOnlyAdbCommandV1 {
  const base = READ_ONLY_ADB_COMMANDS[kind];
  if (base === undefined) throw new TypeError("unknown read-only command kind");
  if (extraArgs.length > 8) throw new TypeError("extra argument bound exceeded");
  const args: string[] = [...base];
  for (const extra of extraArgs) {
    if (typeof extra !== "string" || !EXTRA_ARG_PATTERN.test(extra)) {
      throw new TypeError("extra argument rejected");
    }
    args.push(extra);
  }
  return { adb: "adb", args };
}
